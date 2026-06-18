/**
 * prefetch-results.js
 *
 * Automatically discovers all events accessible with your RaceResult API key,
 * downloads their result lists, and saves them as split files:
 *
 *   public/race-data-index.json          — tiny index with event metadata only
 *   public/race-data-{eventId}.json      — full results for each event
 *
 * The widget loads the index on startup (~2 KB) and fetches a per-event file
 * only when the user selects that event — so visitors never download data they
 * don't need.
 *
 * Usage:
 *   npm run prefetch
 *
 * Re-run any time you want to refresh results (e.g. after a new race finishes).
 * Then run "npm run build" to include the updated data.
 *
 * Configuration (edit below):
 *   LIST_PATTERN  - prefix of the output list name to use (default: "Resultados")
 *   SERVER        - RaceResult server hostname
 *   EVENT_VARIANTS - optional per-event format configuration (see examples below)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Configuration ────────────────────────────────────────────────────────────

const SERVER        = 'events.raceresult.com';
const LIST_PATTERN  = 'Resultados'; // use lists whose name starts with this
const LIST_PRIMARY  = ['01.LIVE', '01.', 'LIVE'];   // preferred sub-labels for the default list

/**
 * Per-event format variants.
 *
 * RaceResult uses "contests" (modalidades) to separate event formats.
 * contest: 0 = all combined (default), 1 = first contest, 2 = second, etc.
 *
 * If an event ID is listed here, it will create one dropdown entry per variant
 * instead of a single combined entry.  Leave empty ({}) to use auto-detection
 * (which works when the list name itself contains "Individual", "Parejas", etc.)
 *
 * Format: { '<eventId>': [ { contest, format, suffix }, ... ] }
 *   contest  — RaceResult contest number (0 = all)
 *   format   — chip label shown in the dropdown: 'individual' | 'pairs' | 'teams'
 *   suffix   — appended to the event name in the dropdown (e.g. ' Individual')
 *
 * Example (uncomment and adjust to your events):
 *
 *   376174: [                              // Strong Race Abril 2026
 *     { contest: 1, format: 'individual', suffix: ' Individual' },
 *     { contest: 2, format: 'pairs',      suffix: ' Parejas' },
 *   ],
 *   398871: [                              // Cobra Race Mayo 2026
 *     { contest: 1, format: 'individual', suffix: ' Individual' },
 *     { contest: 2, format: 'pairs',      suffix: ' Parejas' },
 *   ],
 *   403612: [                              // SAC Series Junio 2026
 *     { contest: 1, format: 'individual', suffix: ' Individual' },
 *     { contest: 2, format: 'pairs',      suffix: ' Parejas' },
 *   ],
 */
const EVENT_VARIANTS = {
  // Uncomment and fill in for events with multiple formats (see example above)
};

// ─── Contest-based format detection ──────────────────────────────────────────
// Each event's contests are fetched from the API.  The contest NAME determines
// the format.  Contest names containing 'pareja/duo/doble' → 'pairs';
// 'equipo/team/relay/relevo' → 'teams'; everything else (Élite, Open, Individual,
// etc.) → 'individual'.
//
// If an event has MORE than one distinct format among its contests, one dropdown
// entry (and one cache file) is created PER format.  Otherwise a single combined
// entry with contest=0 is used.
const FORMAT_REGEXES = {
  pairs: /pareja|duo|doble/i,
  teams: /equipo|team|relay|relevo/i,
};

function contestFormat(name) {
  if (FORMAT_REGEXES.pairs.test(name)) return 'pairs';
  if (FORMAT_REGEXES.teams.test(name)) return 'teams';
  return 'individual';
}

// ─── Read .env.local ──────────────────────────────────────────────────────────

function loadEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    env[k] = v;
  }
  return env;
}

const ROOT    = path.resolve(__dirname, '..');
const env     = loadEnv(path.join(ROOT, '.env.local'));
const API_KEY = env.REACT_APP_RR_API_KEY || process.env.REACT_APP_RR_API_KEY || '';

if (!API_KEY) {
  console.error('ERROR: REACT_APP_RR_API_KEY not found in .env.local');
  process.exit(1);
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function login() {
  const body = new URLSearchParams({ apikey: API_KEY });
  const resp = await fetch(`https://${SERVER}/api/public/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!resp.ok) throw new Error(`Login failed (${resp.status}): ${await resp.text()}`);
  return (await resp.text()).trim();
}

async function getEventList(sessionId) {
  const resp = await fetch(
    `https://${SERVER}/api/public/eventlist?year=0&filter=&addsettings=EventName,EventDate,EventLocation`,
    { headers: { Authorization: `Bearer ${sessionId}` } },
  );
  if (!resp.ok) throw new Error(`Event list failed (${resp.status})`);
  return resp.json(); // [{ ID, EventName, EventDate, EventLocation }, ...]
}

async function getListNames(sessionId, eventId) {
  const resp = await fetch(
    `https://${SERVER}/_${eventId}/api/lists/names`,
    { headers: { Authorization: `Bearer ${sessionId}` } },
  );
  if (!resp.ok) return [];
  return resp.json(); // string[]
}

async function getContests(sessionId, eventId) {
  try {
    const resp = await fetch(
      `https://${SERVER}/_${eventId}/api/contests/get`,
      { headers: { Authorization: `Bearer ${sessionId}` } },
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchList(sessionId, eventId, listName, contest = 0) {
  const params = new URLSearchParams({ name: listName, format: 'JSON', contest: String(contest), lang: 'es' });
  const resp = await fetch(
    `https://${SERVER}/_${eventId}/api/lists/create?${params}`,
    { headers: { Authorization: `Bearer ${sessionId}` } },
  );
  if (!resp.ok) throw new Error(`List fetch failed (${resp.status}): ${await resp.text()}`);
  return resp.json();
}

/**
 * Patterns that identify non-result lists (detail, check, presenter, podium, etc.)
 * These are skipped when looking for a fallback results list.
 */
const SKIP_LIST_PATTERN = /DETAIL LIST|^Checks\||^Presenter\||^Otros\||^Participantes\||^Listas de|PODIUM|PHOTOCALL|VIDEO|CHIP|SPLITS|Pr\u00f3ximas|Llegadas/i;

/**
 * Try to fetch a contest's results from the primary list.
 * If it returns 0 rows, scan all available list names for a fallback that has data.
 * Only considers lists starting with "Resultados" (not "Listas de Resultados",
 * which are participant/display lists that may return rows with empty times).
 * Returns { rows, usedListName }.
 */
async function fetchListWithFallback(sessionId, eventId, primaryList, contest, allListNames) {
  const rows = await fetchList(sessionId, eventId, primaryList, contest);
  if (rows.length > 0) return { rows, usedListName: primaryList };

  // Build fallback candidates: only proper "Resultados|..." lists, excluding non-result patterns
  const candidates = allListNames.filter((n) =>
    n !== primaryList &&
    n.startsWith('Resultados') &&
    !SKIP_LIST_PATTERN.test(n),
  );

  for (const candidate of candidates) {
    try {
      const fallbackRows = await fetchList(sessionId, eventId, candidate, contest);
      if (fallbackRows.length > 0) {
        process.stdout.write(` [fallback: "${candidate}"] `);
        return { rows: fallbackRows, usedListName: candidate };
      }
    } catch { /* try next */ }
  }

  return { rows: [], usedListName: primaryList };
}

// ─── Detail-list helpers (split times per participant) ────────────────────────

/** Normalise a participant name for fuzzy matching. */
function normalizeName(n) {
  return String(n).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Scan the available list names for a "detail" list that contains per-sector
 * split times.  Returns the full list name or null if none found.
 */
function findDetailListName(allListNames) {
  return allListNames.find((n) => n.toUpperCase().includes('DETAIL LIST')) ?? null;
}

/**
 * Fetch the detail list for a contest and build a map  name → split array.
 *
 * Each split is { label, sector, acc } where:
 *   label  — human-readable sector name, e.g. "Carrera 1" / "Zona 1 – Reverse Lounge"
 *   sector — time for this sector alone, e.g. "02:26"
 *   acc    — accumulated time from start, e.g. "06:16"
 *
 * The detail list uses a fixed column naming convention:
 *   Running{n}.LABEL  / TIME{2000+n} (sector) / TIME{1000+n} (acc)   for run sectors
 *   Track{n}.LABEL    / TIME{2010+n} (sector) / TIME{1010+n} (acc)   for obstacle zones
 */
async function fetchDetailSplitsMap(sessionId, eventId, detailListName, contest) {
  try {
    const detailRows = await fetchList(sessionId, eventId, detailListName, contest);
    if (!Array.isArray(detailRows) || detailRows.length === 0) return {};

    // The name column is a RaceResult expression containing "FIRSTNAME"
    const firstRow = detailRows[0];
    const nameKey = Object.keys(firstRow).find((k) => k.includes('FIRSTNAME'));
    if (!nameKey) return {};

    const map = {};
    for (const row of detailRows) {
      // The name column value has two formats:
      //   Individual: "Paulo Andres Cano Jimenez: 0"  → key = part before ": " (name)
      //   Pairs:      "TeamName: Member1 / Member2"   → key = part before ": " (team name)
      //                                                 AND part after ": " (member names,
      //                                                 which is what results list Nombre holds)
      const nameRaw = String(row[nameKey] ?? '');
      const colonIdx = nameRaw.indexOf(': ');
      const nameBefore = normalizeName(colonIdx >= 0 ? nameRaw.slice(0, colonIdx) : nameRaw);
      if (!nameBefore) continue;
      // Alias used for map key (pairs: also index by member names after ": ")
      const nameAfter = colonIdx >= 0 ? normalizeName(nameRaw.slice(colonIdx + 2)) : null;
      const name = nameBefore; // kept for the splits-building block below

      const splits = [];
      for (let n = 1; n <= 10; n++) {
        const runLabel = String(row[`Running${n}.LABEL`] ?? '').trim();
        if (runLabel) {
          splits.push({
            label:  runLabel,
            sector: String(row[`TIME${2000 + n}`] ?? ''),
            acc:    String(row[`TIME${1000 + n}`] ?? ''),
          });
        }
        const trackLabel = String(row[`Track${n}.LABEL`] ?? '').trim();
        if (trackLabel) {
          splits.push({
            label:  trackLabel,
            sector: String(row[`TIME${2010 + n}`] ?? ''),
            acc:    String(row[`TIME${1010 + n}`] ?? ''),
          });
        }
      }
      map[name] = splits;
      // For pairs events the value after ": " holds the member names, which is
      // what the results list "Nombre" column contains.  Index by those too so
      // attachSplits can match regardless of whether it has team name or members.
      if (nameAfter && !/^\d+$/.test(nameAfter.trim())) {
        map[nameAfter] = splits;
      }
    }
    return map;
  } catch (e) {
    console.log(`  (detail list error: ${e.message})`);
    return {};
  }
}

/**
 * Fetch a map of bib → age-group name for a given contest using data/list.
 * Returns {} silently on any error (age groups are optional).
 *
 * RaceResult stores the assigned age-group name in "AK.Name.1"
 * (first age-group set).  We also try "AK.ShortName.1" as fallback.
 */
/**
 * Fetch a map of bib → age-group name for an event using:
 *   1. agegroups/get         → age-group ID → Name map
 *   2. data/list             → bib → AgeGroup1 ID
 *
 * Note: fields for data/list MUST be serialised as a JSON array string.
 * Returns {} silently on any error.
 */
const _ageGroupMapCache = {};
async function fetchAgeGroupMap(sessionId, eventId) {
  if (_ageGroupMapCache[eventId] !== undefined) return _ageGroupMapCache[eventId];
  try {
    // Step 1: get age group definitions (ID → Name)
    const agResp = await fetch(
      `https://${SERVER}/_${eventId}/api/agegroups/get?contest=0`,
      { headers: { Authorization: `Bearer ${sessionId}` } },
    );
    if (!agResp.ok) return {};
    const agDefs = await agResp.json();
    if (!Array.isArray(agDefs) || agDefs.length === 0) return {};
    const idToName = {};
    for (const ag of agDefs) {
      if (ag.ID && (ag.Name || ag.NameShort)) {
        idToName[ag.ID] = ag.NameShort || ag.Name;
      }
    }

    // Step 2: get per-participant AgeGroup1 ID via data/list
    const params = new URLSearchParams();
    params.append('fields', JSON.stringify(['Bib', 'AgeGroup1']));
    params.append('listFormat', 'JSON');
    const partResp = await fetch(
      `https://${SERVER}/_${eventId}/api/data/list?${params}`,
      { headers: { Authorization: `Bearer ${sessionId}` } },
    );
    if (!partResp.ok) return {};
    const rows = await partResp.json();
    if (!Array.isArray(rows)) return {};

    // Step 3: build bib → age-group name
    const map = {};
    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 2) continue;
      const bib  = row[0];
      const agId = row[1];
      if (bib != null && agId && idToName[agId]) {
        map[String(bib)] = idToName[agId];
      }
    }
    if (Object.keys(map).length > 0) {
      const sample = Object.values(map).slice(0, 2).join(', ');
      process.stdout.write(` [AgeGroups: ${Object.keys(map).length} athletes, e.g. "${sample}"]`);
    }
    _ageGroupMapCache[eventId] = map;
    return map;
  } catch {
    _ageGroupMapCache[eventId] = {};
    return {};
  }
}

/**
 * Attach age-group data to each row in-place.
 * The bib is matched against "Dorsal", "Bib", or "Startnr." columns.
 */
function attachAgeGroups(rows, ageGroupMap) {
  if (!ageGroupMap || Object.keys(ageGroupMap).length === 0) return;
  for (const row of rows) {
    const bib = String(row['Dorsal'] ?? row['Bib'] ?? row['Startnr.'] ?? '').replace(/\D/g, '');
    if (bib && ageGroupMap[bib]) {
      row['_ageGroup'] = ageGroupMap[bib];
    }
  }
}

/**
 * Attach split data (from the detail list) to each row in-place.
 * Matching is done by normalised participant name.
 */
function attachSplits(rows, splitsMap) {
  if (!splitsMap || Object.keys(splitsMap).length === 0) return;
  for (const row of rows) {
    const nombre = normalizeName(String(row['Nombre'] ?? row['Name'] ?? ''));
    if (nombre) row._splits = splitsMap[nombre] ?? null;
  }
}

// ─── Member-names helpers (pairs / teams) ────────────────────────────────────

/**
 * Fetch a map of bib → string[] of member full names for all participants in
 * an event.  Uses data/list with Firstname1..3 / Lastname1..3 fields.
 *
 * A record only appears when Firstname2 is non-empty (pareja/team).
 * Returns empty maps silently on any error.
 */
const _membersMapCache = {};
async function fetchMembersMap(sessionId, eventId) {
  if (_membersMapCache[eventId] !== undefined) return _membersMapCache[eventId];
  const empty = { bibMap: {}, memberNameMap: {} };
  try {
    // Firstname = team/group name (e.g. "Joan Miquel y Joan Andreu")
    // Firstname1/Lastname1 = member 1, Firstname2/Lastname2 = member 2, etc.
    // Club = individual club; Club1/Club2/Club3 = per-member clubs for pairs/teams
    // Categoria = category/age-group name; Sex = team sex category (f/m/x set by organizer)
    // GeneroPareja = user-defined field (if defined by organizer): "Parejas Femeninas" / "Parejas Masculinas" / "Parejas Mixtas"
    // TipoPareja   = registration field: "Pareja Femenina" / "Pareja Masculina" / "Pareja Mixta" (most accurate)
    const fields = [
      'Bib', 'Firstname',
      'Firstname1', 'Lastname1',
      'Firstname2', 'Lastname2',
      'Firstname3', 'Lastname3',
      'Club',
      'Categoria',
      'Club1', 'Club2', 'Club3',
      'Sex',
      'GeneroPareja',
      'TipoPareja',
    ];
    // Index map:
    //  0=Bib  1=Firstname  2=Firstname1  3=Lastname1
    //  4=Firstname2  5=Lastname2  6=Firstname3  7=Lastname3
    //  8=Club  9=Categoria  10=Club1  11=Club2  12=Club3
    //  13=Sex  14=GeneroPareja  15=TipoPareja
    const params = new URLSearchParams();
    params.append('fields', JSON.stringify(fields));
    params.append('listFormat', 'JSON');
    const resp = await fetch(
      `https://${SERVER}/_${eventId}/api/data/list?${params}`,
      { headers: { Authorization: `Bearer ${sessionId}` } },
    );
    if (!resp.ok) { _membersMapCache[eventId] = empty; return empty; }
    const rows = await resp.json();
    if (!Array.isArray(rows) || rows.length === 0) { _membersMapCache[eventId] = empty; return empty; }

    // Index: 0=Bib, 1=Firstname(teamName), 2=Firstname1, 3=Lastname1,
    //        4=Firstname2, 5=Lastname2, 6=Firstname3, 7=Lastname3, 8=Club
    //        9=Categoria, 10=Club1, 11=Club2, 12=Club3
    // RaceResult returns integer 0 for empty fields — treat "0" as empty.
    const clean = (v) => {
      const s = String(v ?? '').trim();
      return s === '0' ? '' : s;
    };
    const buildName = (f, l) => [clean(f), clean(l)].filter(Boolean).join(' ');

    const bibMap = {};
    const bibClubMap = {};
    const bibCategoryMap = {};
    const memberNameMap = {};
    let pairsCount = 0;

    for (const row of rows) {
      const bib       = String(row[0] ?? '');
      const teamName  = clean(row[1]);
      const club      = clean(row[8]);   // Club (individual or team)
      const categoria = clean(row[9]);   // Categoria
      const club1     = clean(row[10]);  // Club1 (member 1)
      const club2     = clean(row[11]);  // Club2 (member 2)
      const club3     = clean(row[12]);  // Club3 (member 3)
      const sexRaw       = clean(row[13]).toLowerCase();  // Sex (f/m/x assigned by organizer)
      const generoPareja = clean(row[14]);                 // User-defined field (e.g. "Parejas Femeninas")
      const tipoPareja   = clean(row[15]);                 // Registration field: "Pareja Femenina/Masculina/Mixta"
      const f2           = clean(row[4]);

      // Compute pair gender label — priority:
      // 1. TipoPareja registration field (most accurate: "Pareja Femenina"/"Pareja Masculina"/"Pareja Mixta")
      // 2. GeneroPareja user-defined field (strip "Parejas " prefix + trailing s)
      // 3. Sex field: f→Femenina, m→Masculina, x/other→Mixta
      const pairGender = (() => {
        if (tipoPareja) return tipoPareja.replace(/^Pareja[s]?\s+/i, '').trim();
        if (generoPareja) return generoPareja.replace(/^Parejas\s+/i, '').replace(/s$/i, '').trim();
        if (sexRaw === 'f') return 'Femenina';
        if (sexRaw === 'm') return 'Masculina';
        if (sexRaw) return 'Mixta';
        return '';
      })();

      // Club for individual: prefer Club, fall back to Club1
      // Club for pairs: smart-merge Club1/Club2 (show unique clubs only)
      const effectiveClub = (() => {
        if (!f2) return club || club1; // individual
        // pairs/teams: collect unique non-empty clubs
        const clubs = [...new Set([club1, club2, club3].filter(Boolean))];
        return clubs.length ? clubs.join(' / ') : (club || '');
      })();

      if (bib && effectiveClub) bibClubMap[bib] = effectiveClub;
      if (bib && categoria) bibCategoryMap[bib] = categoria;

      if (!f2) continue; // individual — skip pairs logic

      const m1 = buildName(row[2], row[3]);
      const m2 = buildName(row[4], row[5]);
      const m3 = buildName(row[6], row[7]);
      // Build per-member objects so the UI can show each member's club inline
      const memberObjs = [
        m1 ? { name: m1, club: club1 || undefined } : null,
        m2 ? { name: m2, club: club2 || undefined } : null,
        m3 ? { name: m3, club: club3 || undefined } : null,
      ].filter(Boolean);
      if (memberObjs.length < 2) continue;

      const entry = { teamName: teamName || memberObjs.map(mo => mo.name).join(' / '), members: memberObjs, club: effectiveClub, category: categoria, pairGender };
      bibMap[bib] = entry;

      // Reverse lookup: normalised member name → team entry
      for (const mo of memberObjs) {
        const key = normalizeName(mo.name);
        if (key) memberNameMap[key] = { bib, ...entry };
      }
      pairsCount++;
    }
    if (pairsCount > 0) {
      process.stdout.write(` [Members: ${pairsCount} pairs/teams]`);
    }
    const result = { bibMap, bibClubMap, bibCategoryMap, memberNameMap };
    _membersMapCache[eventId] = result;
    return result;
  } catch (e) {
    console.log(`  (members map error: ${e.message})`);
    _membersMapCache[eventId] = empty;
    return empty;
  }
}

/**
 * Attach member names to rows and, for per-member lists (no Dorsal), collapse
 * duplicate team rows down to one.
 *
 * Two matching strategies:
 *   1. Bib (Dorsal) match  — lists like Hybiza/Cobra where one row = one team
 *   2. Member-name match   — lists like SAC where one row = one member
 *      → deduplicates so only the first row per team survives;
 *        replaces Nombre with the team name and injects a Dorsal.
 *
 * Returns (possibly shorter) array of rows.
 */
function attachMembers(rows, mapsResult) {
  const { bibMap, memberNameMap } = mapsResult;
  if (Object.keys(bibMap).length === 0 && Object.keys(memberNameMap).length === 0) return rows;

  const seenBibs = new Set();
  const out = [];

  for (const row of rows) {
    // ── Strategy 1: match by Dorsal ───────────────────────────────────────
    const bibRaw = String(row['Dorsal'] ?? row['Bib'] ?? row['Startnr.'] ?? '').replace(/\D/g, '');
    if (bibRaw && bibMap[bibRaw]) {
      const entry = bibMap[bibRaw];
      row['_members'] = entry.members;
      if (entry.teamName)              row['Nombre']      = entry.teamName;
      if (entry.pairGender)            row['_pairGender'] = entry.pairGender;
      if (entry.club     && !row['Club'])      row['_club']     = entry.club;
      if (entry.category && !row['Categoria']) row['_category'] = entry.category;
      out.push(row);
      continue;
    }

    // ── Strategy 2: match by member name (per-member list) ────────────────
    const nombre = normalizeName(String(row['Nombre'] ?? row['Name'] ?? ''));
    const teamEntry = nombre ? memberNameMap[nombre] : null;
    if (teamEntry) {
      if (seenBibs.has(teamEntry.bib)) continue; // deduplicate
      seenBibs.add(teamEntry.bib);
      row['Nombre']    = teamEntry.teamName;
      row['Dorsal']    = Number(teamEntry.bib) || teamEntry.bib;
      row['_members']  = teamEntry.members;
      if (teamEntry.pairGender)                        row['_pairGender'] = teamEntry.pairGender;
      if (teamEntry.club     && !row['Club'])     row['_club']     = teamEntry.club;
      if (teamEntry.category && !row['Categoria']) row['_category'] = teamEntry.category;
      out.push(row);
      continue;
    }

    out.push(row);
  }
  return out;
}

/**
 * Attach club names to rows that have a Dorsal/Bib but no Club column.
 * Uses the bibClubMap built in fetchMembersMap.
 */
function attachClub(rows, bibClubMap) {
  if (!bibClubMap || Object.keys(bibClubMap).length === 0) return;
  for (const row of rows) {
    if (row['Club'] || row['_club']) continue; // already set
    const bib = String(row['Dorsal'] ?? row['Bib'] ?? row['Startnr.'] ?? '').replace(/\D/g, '');
    if (bib && bibClubMap[bib]) row['_club'] = bibClubMap[bib];
  }
}

/**
 * Attach category names to rows that have no Categoria column.
 * Uses the bibCategoryMap built in fetchMembersMap.
 */
function attachCategory(rows, bibCategoryMap) {
  if (!bibCategoryMap || Object.keys(bibCategoryMap).length === 0) return;
  for (const row of rows) {
    if (row['Categoria'] || row['Categoría'] || row['_category']) continue; // already set
    const bib = String(row['Dorsal'] ?? row['Bib'] ?? row['Startnr.'] ?? '').replace(/\D/g, '');
    if (bib && bibCategoryMap[bib]) row['_category'] = bibCategoryMap[bib];
  }
}

/**
 * Derive format from rows that have _members attached.
 * Returns 'teams' if any row has 3+ members, 'pairs' if 2, otherwise falls
 * back to the name-based detection.
 */
function detectFormatFromMembers(rows, fallbackFormat) {
  for (const row of rows) {
    const m = row['_members'];
    if (Array.isArray(m) && m.length >= 3) return 'teams';
    if (Array.isArray(m) && m.length >= 2) return 'pairs';
  }
  return fallbackFormat;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Logging in to RaceResult API...');
  const sessionId = await login();
  console.log('  Logged in.\n');

  console.log('Discovering events...');
  const eventList = await getEventList(sessionId);
  console.log(`  Found ${eventList.length} event(s).\n`);

  const fetchedAt = new Date().toISOString();
  const index = { fetchedAt, events: [] };
  let saved = 0;

  // Remove stale per-event files from a previous run
  for (const f of fs.readdirSync(path.join(ROOT, 'public'))) {
    if (f.startsWith('race-data-') && f.endsWith('.json') && f !== 'race-data-index.json') {
      fs.unlinkSync(path.join(ROOT, 'public', f));
    }
  }

  for (const ev of eventList) {
    const eventId = ev.ID;
    console.log(`[${eventId}] ${ev.EventName}`);

    // Enumerate all available lists for this event
    const allListNames = await getListNames(sessionId, eventId);
    if (allListNames.length === 0) {
      console.log('  → no lists found, skipping.');
      continue;
    }

    // All lists starting with LIST_PATTERN
    const matchingLists = allListNames.filter((n) => n.startsWith(LIST_PATTERN));
    if (matchingLists.length === 0) matchingLists.push(allListNames[0]);

    // Default list: prefer one that contains a LIST_PRIMARY hint; otherwise first match.
    const defaultList = matchingLists.find((n) =>
      LIST_PRIMARY.some((hint) => n.toLowerCase().includes(hint.toLowerCase()))
    ) ?? matchingLists[0];

    // ── EVENT_VARIANTS override (manual config, rarely needed) ──────────────
    const variants = EVENT_VARIANTS[String(eventId)];
    if (variants && variants.length > 0) {
      console.log(`  → ${variants.length} manually configured variants`);
      for (const variant of variants) {
        const slug    = variant.suffix ? variant.suffix.trim().toLowerCase().replace(/[^a-z0-9]/g, '') : String(variant.contest);
        const fileKey = `${eventId}_${slug}`;
        process.stdout.write(`  → contest ${variant.contest} "${variant.format}" (key: ${fileKey}) — fetching... `);
        try {
          let { rows, usedListName } = await fetchListWithFallback(sessionId, eventId, defaultList, variant.contest, allListNames);
          if (rows.length === 0) {
            console.log('0 rows — added to index (no results yet).');
            const info = {
              id: String(eventId), fileKey,
              name: ev.EventName,
              date: ev.EventDate ? ev.EventDate.slice(0, 10) : '',
              location: ev.EventLocation ?? '',
              listName: usedListName, contest: variant.contest,
              format: variant.format,
              noResults: true,
            };
            index.events.push(info);
            saved++;
            continue;
          }
          const detailListName = findDetailListName(allListNames);
          if (detailListName) {
            const splitsMap = await fetchDetailSplitsMap(sessionId, eventId, detailListName, variant.contest);
            attachSplits(rows, splitsMap);
          }
          rows = attachMembers(rows, await fetchMembersMap(sessionId, eventId));
          attachClub(rows, (await fetchMembersMap(sessionId, eventId)).bibClubMap);
          attachCategory(rows, (await fetchMembersMap(sessionId, eventId)).bibCategoryMap);
          attachAgeGroups(rows, await fetchAgeGroupMap(sessionId, eventId));
          const resolvedFormat = detectFormatFromMembers(rows, variant.format);
          const genderCategories = [...new Set(rows.map(r => r._pairGender).filter(Boolean))].sort();
          const info = {
            id: String(eventId), fileKey,
            name: ev.EventName,
            date: ev.EventDate ? ev.EventDate.slice(0, 10) : '',
            location: ev.EventLocation ?? '',
            listName: usedListName, contest: variant.contest,
            format: resolvedFormat,
            ...(genderCategories.length > 0 && { genderCategories }),
          };
          const eventPath = path.join(ROOT, 'public', `race-data-${fileKey}.json`);
          fs.writeFileSync(eventPath, JSON.stringify({ info, rows }, null, 2), 'utf8');
          const sizeKB = (fs.statSync(eventPath).size / 1024).toFixed(1);
          console.log(`${rows.length} rows — ${sizeKB} KB`);
          index.events.push(info);
          saved++;
        } catch (e) { console.log(`FAILED — ${e.message}`); }
      }
      continue;
    }

    // ── Auto-detect: one entry per contest when there are 2+, else combined ─
    const allContests = await getContests(sessionId, eventId);

    if (allContests.length >= 2) {
      // ── One entry per contest — always, regardless of format ────────────
      console.log(`  → ${allContests.length} contests: ${allContests.map((c) => `"${c.Name}"`).join(', ')}`);
      for (const c of allContests) {
        const fileKey = `${eventId}_${c.ID}`;
        const format  = contestFormat(c.Name);
        process.stdout.write(`  → contest ${c.ID} "${c.Name}" (${format}, key: ${fileKey}) — fetching... `);
        try {
          let { rows, usedListName } = await fetchListWithFallback(sessionId, eventId, defaultList, c.ID, allListNames);
          if (rows.length === 0) {
            console.log('0 rows — added to index (no results yet).');
            const info = {
              id: String(eventId), fileKey,
              name:        ev.EventName,
              contestName: c.Name,
              date:        ev.EventDate ? ev.EventDate.slice(0, 10) : '',
              location:    ev.EventLocation ?? '',
              listName:    usedListName,
              contest:     c.ID,
              format,
              noResults:   true,
            };
            index.events.push(info);
            saved++;
            continue;
          }
          const detailListName = findDetailListName(allListNames);
          if (detailListName) {
            const splitsMap = await fetchDetailSplitsMap(sessionId, eventId, detailListName, c.ID);
            attachSplits(rows, splitsMap);
          }
          rows = attachMembers(rows, await fetchMembersMap(sessionId, eventId));
          attachClub(rows, (await fetchMembersMap(sessionId, eventId)).bibClubMap);
          attachCategory(rows, (await fetchMembersMap(sessionId, eventId)).bibCategoryMap);
          attachAgeGroups(rows, await fetchAgeGroupMap(sessionId, eventId));
          const resolvedFormat = detectFormatFromMembers(rows, format);
          const genderCategories = [...new Set(rows.map(r => r._pairGender).filter(Boolean))].sort();
          const info = {
            id: String(eventId), fileKey,
            name:        ev.EventName,
            contestName: c.Name,
            date:        ev.EventDate ? ev.EventDate.slice(0, 10) : '',
            location:    ev.EventLocation ?? '',
            listName:    usedListName,
            contest:     c.ID,
            format:      resolvedFormat,
            ...(genderCategories.length > 0 && { genderCategories }),
          };
          const eventPath = path.join(ROOT, 'public', `race-data-${fileKey}.json`);
          fs.writeFileSync(eventPath, JSON.stringify({ info, rows }, null, 2), 'utf8');
          const sizeKB = (fs.statSync(eventPath).size / 1024).toFixed(1);
          console.log(`${rows.length} rows — ${sizeKB} KB`);
          index.events.push(info);
          saved++;
        } catch (e) { console.log(`FAILED — ${e.message}`); }
      }
    } else {
      // ── Single contest or none: one combined entry (contest=0) ──────────
      const format  = allContests.length === 1 ? contestFormat(allContests[0].Name) : 'individual';
      const fileKey = String(eventId);
      process.stdout.write(`  → "${defaultList}" [all, format=${format}] — fetching... `);
      try {
        let { rows, usedListName } = await fetchListWithFallback(sessionId, eventId, defaultList, 0, allListNames);
        if (rows.length === 0) {
          console.log('0 rows — added to index (no results yet).');
          const info = {
            id:       String(eventId),
            name:     ev.EventName,
            date:     ev.EventDate ? ev.EventDate.slice(0, 10) : '',
            location: ev.EventLocation ?? '',
            listName: usedListName,
            contest:  0,
            format,
            noResults: true,
          };
          index.events.push(info);
          saved++;
        }
        else {
          const detailListName = findDetailListName(allListNames);
          if (detailListName) {
            const splitsMap = await fetchDetailSplitsMap(sessionId, eventId, detailListName, 0);
            attachSplits(rows, splitsMap);
          }
          rows = attachMembers(rows, await fetchMembersMap(sessionId, eventId));
          attachClub(rows, (await fetchMembersMap(sessionId, eventId)).bibClubMap);
          attachCategory(rows, (await fetchMembersMap(sessionId, eventId)).bibCategoryMap);
          attachAgeGroups(rows, await fetchAgeGroupMap(sessionId, eventId));
          const resolvedFormat = detectFormatFromMembers(rows, format);
          const genderCategories = [...new Set(rows.map(r => r._pairGender).filter(Boolean))].sort();
          const info = {
            id:       String(eventId),
            name:     ev.EventName,
            date:     ev.EventDate ? ev.EventDate.slice(0, 10) : '',
            location: ev.EventLocation ?? '',
            listName: usedListName,
            contest:  0,
            format:   resolvedFormat,
            ...(genderCategories.length > 0 && { genderCategories }),
          };
          const eventPath = path.join(ROOT, 'public', `race-data-${fileKey}.json`);
          fs.writeFileSync(eventPath, JSON.stringify({ info, rows }, null, 2), 'utf8');
          const sizeKB = (fs.statSync(eventPath).size / 1024).toFixed(1);
          console.log(`${rows.length} rows — ${sizeKB} KB`);
          index.events.push(info);
          saved++;
        }
      } catch (e) { console.log(`FAILED — ${e.message}`); }
    }
  }

  if (saved === 0) {
    console.error('\nNo events were saved. Check your API key and LIST_PATTERN setting.');
    process.exit(1);
  }

  // Write index
  const indexPath = path.join(ROOT, 'public', 'race-data-index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
  const indexKB = (fs.statSync(indexPath).size / 1024).toFixed(1);

  console.log(`\nSaved ${saved} event(s).`);
  console.log(`  Index:  race-data-index.json (${indexKB} KB)`);
  console.log(`  Events: race-data-{id}.json (loaded on demand)`);
  console.log('\nRun "npm run build" to bundle it.');
}

main().catch((e) => { console.error(e); process.exit(1); });