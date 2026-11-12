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

/**
 * Override the contestName stored in the index for specific contests.
 * Useful when multiple contests (e.g. same category split across two days)
 * should share the same display name and be grouped by gender in the selector.
 * Format: { '<eventId>': { '<contestId>': 'New Display Name' } }
 */
const CONTEST_NAME_OVERRIDES = {
  '376174': {
    '2': 'Open',   // "Open Sábado" → "Open"
    '3': 'Open',   // "Open Domingo" → "Open"
  },
};

/**
 * Forzar manualmente genderCategories para contests donde la detección automática
 * falla (p.ej. la lista de resultados no tiene _pairGender ni Gender útil).
 * Format: { '<eventId>': { '<contestId>': ['Femenina', 'Masculina', ...] } }
 */
const CONTEST_GENDER_CATEGORIES = {
  '376174': {
    '2': ['Femenina', 'Masculina'],  // Open Sábado: 01.LIVE vacío; forzar categorías
  },
};

/**
 * Contests that should NOT be split by gender in the results selector.
 * They appear as a single combined entry regardless of genderCategories.
 * Format: { '<eventId>': [contestId1, contestId2, ...] }
 */
const CONTEST_NO_GENDER_SPLIT = {
  '376174': [4],   // Strong Kids: show as single combined entry
};

/**
 * fileKeys cuyo fichero de datos se conserva tal cual (no se borra ni se re-descarga).
 * Útil cuando el listado 01.LIVE ya no devuelve resultados tras el evento
 * pero tenemos los datos históricos guardados en git.
 * Formato: Set de fileKey strings, ej. '376174_2'
 */
const CONTEST_PRESERVE_DATA = new Set([
  '376174_2',  // Open Sábado: 01.LIVE vacío tras el evento; datos históricos en git
]);

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
const SKIP_LIST_PATTERN = /DETAIL LIST|^Checks\||^Presenter\||^Otros\||^Participantes\||^Listas de|PODIUM|PHOTOCALL|VIDEO|CHIP|SPLITS|Pr\u00f3ximas|Llegadas|Desglose/i;

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

// ─── Matching helpers ─────────────────────────────────────────────────────────

/** Normalise a name for matching: lower-case, no accents, single spaces. */
function normalizeName(n) {
  return String(n ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase().replace(/\s+/g, ' ');
}

/** "1:02:03" / "02:03" / "00:20:32" → seconds; null when it is not a time. */
function timeToSeconds(t) {
  const parts = String(t ?? '').trim().split(':');
  if (parts.length < 2 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null;
  return Math.round(parts.reduce((acc, p) => acc * 60 + Number(p), 0));
}

/** Bib shown in a list row, without leading zeros ('' when the list has no bib column). */
function rowBib(row) {
  return String(row['Dorsal'] ?? row['Bib'] ?? row['Startnr.'] ?? '').replace(/\D/g, '').replace(/^0+/, '');
}

function rowTime(row) {
  return timeToSeconds(row['Tiempo'] ?? row['Time'] ?? '');
}

/**
 * Pick the first candidate not used yet, preferring the one whose finish time
 * matches: several teams in the same contest can share a name ("Iron Queens").
 */
function pickCandidate(candidates, time, used) {
  const free = (candidates ?? []).filter((c) => !used.has(c));
  return free.find((c) => time != null && c.time === time) ?? free[0] ?? null;
}

// ─── Detail-list helpers (split times per participant) ────────────────────────

/**
 * Scan the available list names for a "detail" list that contains per-sector
 * split times.  Returns the full list name or null if none found.
 */
function findDetailListName(allListNames) {
  return allListNames.find((n) => n.toUpperCase().includes('DETAIL LIST')) ?? null;
}

/**
 * Fetch the detail list for a contest and build a map  name → [{ time, splits }].
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
    const add = (key, entry) => { (map[key] = map[key] ?? []).push(entry); };
    for (const row of detailRows) {
      // The name column value has two formats:
      //   Individual: "Paulo Andres Cano Jimenez: 0"  → key = part before ": " (name)
      //   Pairs:      "TeamName: Member1 / Member2"   → key = part before ": " (team name)
      //                                                 AND part after ": " (member names,
      //                                                 which is what results list Nombre holds)
      const nameRaw = String(row[nameKey] ?? '');
      const colonIdx = nameRaw.indexOf(': ');
      const name = normalizeName(colonIdx >= 0 ? nameRaw.slice(0, colonIdx) : nameRaw);
      if (!name) continue;
      const nameAfter = colonIdx >= 0 ? normalizeName(nameRaw.slice(colonIdx + 2)) : null;

      const splits = [];
      for (let n = 1; n <= 10; n++) {
        // Some events leave the label of the last sectors empty while the times are there
        const runSector = String(row[`TIME${2000 + n}`] ?? '');
        const runAcc    = String(row[`TIME${1000 + n}`] ?? '');
        const runLabel  = String(row[`Running${n}.LABEL`] ?? '').trim() || ((runSector || runAcc) ? `Carrera ${n}` : '');
        if (runLabel) splits.push({ label: runLabel, sector: runSector, acc: runAcc });

        const trackSector = String(row[`TIME${2010 + n}`] ?? '');
        const trackAcc    = String(row[`TIME${1010 + n}`] ?? '');
        const trackLabel  = String(row[`Track${n}.LABEL`] ?? '').trim() || ((trackSector || trackAcc) ? `Zona ${n}` : '');
        if (trackLabel) splits.push({ label: trackLabel, sector: trackSector, acc: trackAcc });
      }
      const entry = { time: timeToSeconds(row['TIME1']), splits };
      add(name, entry);
      // For pairs events the value after ": " holds the member names, which is
      // what the results list "Nombre" column contains.  Index by those too so
      // attachSplits can match regardless of whether it has team name or members.
      if (nameAfter && !/^\d+$/.test(nameAfter.trim())) add(nameAfter, entry);
    }
    return map;
  } catch (e) {
    console.log(`  (detail list error: ${e.message})`);
    return {};
  }
}

/**
 * Attach split data (from the detail list) to each row in-place.
 * Matching is done by normalised participant name and, between namesakes, by finish time.
 */
function attachSplits(rows, splitsMap) {
  if (!splitsMap || Object.keys(splitsMap).length === 0) return;
  const used = new Set();
  for (const row of rows) {
    const nombre = normalizeName(row['Nombre'] ?? row['Name'] ?? '');
    if (!nombre) continue;
    const entry = pickCandidate(splitsMap[nombre], rowTime(row), used) ?? splitsMap[nombre]?.[0];
    if (entry) used.add(entry);
    row._splits = entry ? entry.splits : null;
  }
}

// ─── Participant data (members, gender, category, PID) ────────────────────────

/**
 * Fields read for every participant through data/list.
 *   Firstname            = team/group name for pairs/teams (e.g. "Joan Miquel y Joan Andreu")
 *   Firstname1..3 / Lastname1..3 / Club1..3 = members of a pair/team
 *   Categoria            = category / age group (e.g. "GGEE 30-39")
 *   TipoPareja           = registration field "Pareja Femenina/Masculina/Mixta" (most accurate)
 *   GeneroPareja         = user-defined field, e.g. "Parejas Femeninas"
 *   Sex                  = f/m (unreliable for pairs in some events, used as last resort)
 *   TIME1.TEXT           = finish time, to tell apart teams that share a name
 * Unknown fields come back as 0, so events that lack some of them still work.
 */
const PARTICIPANT_FIELDS = [
  'ID', 'Bib', 'Contest', 'Firstname', 'Lastname',
  'Firstname1', 'Lastname1', 'Firstname2', 'Lastname2', 'Firstname3', 'Lastname3',
  'Club', 'Club1', 'Club2', 'Club3',
  'Categoria', 'Sex', 'GeneroPareja', 'TipoPareja', 'AgeGroup1', 'TIME1.TEXT',
];

/** "Pareja Femenina" / "Parejas Masculinas" / "Equipo Mixto" → Femenina / Masculina / Mixta. */
function genderLabel(s) {
  const t = String(s ?? '').toLowerCase();
  if (t.includes('femen')) return 'Femenina';
  if (t.includes('mascul')) return 'Masculina';
  if (t.includes('mixt')) return 'Mixta';
  return '';
}

/** Age-group definitions of the event: ID → short name (e.g. "M30-34"). */
async function fetchAgeGroupNames(sessionId, eventId) {
  try {
    const resp = await fetch(
      `https://${SERVER}/_${eventId}/api/agegroups/get?contest=0`,
      { headers: { Authorization: `Bearer ${sessionId}` } },
    );
    if (!resp.ok) return {};
    const defs = await resp.json();
    const idToName = {};
    for (const ag of Array.isArray(defs) ? defs : []) {
      if (ag.ID && (ag.Name || ag.NameShort)) idToName[ag.ID] = ag.NameShort || ag.Name;
    }
    return idToName;
  } catch {
    return {};
  }
}

function toParticipant(f, ageGroupNames) {
  // RaceResult returns integer 0 for empty fields — treat "0" as empty.
  const clean = (v) => {
    const s = String(v ?? '').trim();
    return s === '0' ? '' : s;
  };
  const join = (...parts) => parts.map(clean).filter(Boolean).join(' ');

  const members = [
    { name: join(f.Firstname1, f.Lastname1), club: clean(f.Club1) || undefined },
    { name: join(f.Firstname2, f.Lastname2), club: clean(f.Club2) || undefined },
    { name: join(f.Firstname3, f.Lastname3), club: clean(f.Club3) || undefined },
  ].filter((m) => m.name);
  const isGroup = members.length >= 2;

  const name = isGroup
    ? (clean(f.Firstname) || members.map((m) => m.name).join(' / '))
    : join(f.Firstname, f.Lastname);

  // Gender priority: TipoPareja → GeneroPareja → Sex (f/m; anything else is a mixed team)
  const sex = clean(f.Sex).toLowerCase();
  const gender = genderLabel(f.TipoPareja) || genderLabel(f.GeneroPareja) ||
    (sex === 'f' || sex === 'w' ? 'Femenina' : sex === 'm' ? 'Masculina' : sex && isGroup ? 'Mixta' : '');

  const club = isGroup
    ? ([...new Set(members.map((m) => m.club).filter(Boolean))].join(' / ') || clean(f.Club))
    : (clean(f.Club) || clean(f.Club1));

  const nameKeys = new Set([name, join(f.Firstname, f.Lastname), join(f.Lastname, f.Firstname)]);
  if (clean(f.Lastname)) nameKeys.add(`${clean(f.Lastname)}, ${clean(f.Firstname)}`);
  if (isGroup) for (const sep of [' / ', ' & ', ' y ']) nameKeys.add(members.map((m) => m.name).join(sep));

  return {
    pid:      String(f.ID ?? ''),
    bib:      clean(f.Bib).replace(/^0+/, ''),
    contest:  Number(f.Contest) || 0,
    name,
    nameKeys: [...nameKeys].map(normalizeName).filter(Boolean),
    members:  isGroup ? members : null,
    gender,
    club,
    category: clean(f.Categoria),
    ageGroup: ageGroupNames[f.AgeGroup1] ?? '',
    time:     timeToSeconds(f['TIME1.TEXT']),
  };
}

/**
 * Fetch every participant of an event (all contests) with its PID, bib, contest,
 * names, members, gender, club and category.  Returns [] silently on any error.
 */
const _participantsCache = {};
async function fetchParticipants(sessionId, eventId) {
  if (_participantsCache[eventId]) return _participantsCache[eventId];
  let participants = [];
  try {
    const ageGroupNames = await fetchAgeGroupNames(sessionId, eventId);
    const params = new URLSearchParams();
    params.append('fields', JSON.stringify(PARTICIPANT_FIELDS));
    params.append('listFormat', 'JSON');
    const resp = await fetch(
      `https://${SERVER}/_${eventId}/api/data/list?${params}`,
      { headers: { Authorization: `Bearer ${sessionId}` } },
    );
    const raw = resp.ok ? await resp.json() : [];
    participants = (Array.isArray(raw) ? raw : [])
      .filter(Array.isArray)
      .map((r) => toParticipant(Object.fromEntries(PARTICIPANT_FIELDS.map((f, i) => [f, r[i]])), ageGroupNames));
  } catch (e) {
    console.log(`  (participants error: ${e.message})`);
  }
  const groups = participants.filter((p) => p.members).length;
  if (participants.length > 0) process.stdout.write(` [Participants: ${participants.length}, pairs/teams: ${groups}]`);
  _participantsCache[eventId] = participants;
  return participants;
}

/**
 * Attach participant data (PID, members, gender, club, category, age group) to
 * list rows, only looking at participants of the same contest.
 *
 * The bib in results lists is not always RaceResult's Bib (some lists show a
 * custom number, others have no bib column at all), so rows are matched by:
 *   1. Bib, when the name agrees
 *   2. Name (team name / full name / member names), finish time between namesakes
 *   3. Bib alone, when the name finds nothing
 *   4. A single member's name — lists with one row per member: only the first
 *      row of each pair/team is kept, renamed to the team name.
 *
 * Returns (possibly shorter) array of rows.
 */
function attachParticipants(rows, participants, contest) {
  const pool = Number(contest) ? participants.filter((p) => p.contest === Number(contest)) : participants;
  if (pool.length === 0) return rows;

  const byBib = new Map();
  const byName = new Map();
  const byMember = new Map();
  const add = (map, key, p) => {
    if (!key) return;
    const list = map.get(key) ?? [];
    if (!list.includes(p)) list.push(p);
    map.set(key, list);
  };
  for (const p of pool) {
    add(byBib, p.bib, p);
    for (const k of p.nameKeys) add(byName, k, p);
    for (const m of p.members ?? []) add(byMember, normalizeName(m.name), p);
  }

  const apply = (row, p, perMemberRow) => {
    row['_pid'] = p.pid;
    if (p.bib && (perMemberRow || !rowBib(row))) row['Dorsal'] = Number(p.bib) || p.bib;
    if (p.members) {
      row['_members'] = p.members;
      row['Nombre']   = p.name;
    }
    if (p.gender)                                       row['_pairGender'] = p.gender;
    if (p.club && !row['Club'])                         row['_club']       = p.club;
    if (p.category && !row['Categoria'] && !row['Categoría']) row['_category'] = p.category;
    if (p.ageGroup)                                     row['_ageGroup']   = p.ageGroup;
  };

  const used = new Set();
  const out = [];
  for (const row of rows) {
    const name = normalizeName(row['Nombre'] ?? row['Name'] ?? '');
    const bib  = rowBib(row);
    const time = rowTime(row);

    const bibHit = bib ? pickCandidate(byBib.get(bib), time, used) : null;
    let p = bibHit && (!name || bibHit.nameKeys.includes(name)) ? bibHit : null;
    if (!p && name) p = pickCandidate(byName.get(name), time, used);
    if (!p) p = bibHit;
    if (p) {
      used.add(p);
      apply(row, p, false);
      out.push(row);
      continue;
    }

    const teams = name ? byMember.get(name) : null;
    if (teams) {
      const team = pickCandidate(teams, time, used);
      if (!team) continue; // another member of a team already listed
      used.add(team);
      apply(row, team, true);
      out.push(row);
      continue;
    }

    out.push(row);
  }
  return out;
}

// ─── Official certificate ─────────────────────────────────────────────────────

/**
 * Certificate configured in RaceResult; it is published at a fixed URL per participant:
 *   https://my.raceresult.com/{eventId}/details0/certificate/{pid}/{CERTIFICATE_NAME}
 * Events created before it existed answer 404, so it is checked per event.
 */
const CERTIFICATE_NAME = 'Certificados Hibridas';

const _certificateCache = {};
async function detectCertificateUrl(eventId, rows) {
  if (_certificateCache[eventId] !== undefined) return _certificateCache[eventId];
  const pid = rows.find((r) => r._pid)?._pid;
  if (!pid) return null;
  const template = `https://my.raceresult.com/${eventId}/details0/certificate/{pid}/${encodeURIComponent(CERTIFICATE_NAME)}`;
  let available = false;
  try {
    const resp = await fetch(template.replace('{pid}', pid));
    available = resp.ok && /pdf/i.test(resp.headers.get('content-type') ?? '');
    await resp.body?.cancel();
  } catch { /* no certificate */ }
  if (available) process.stdout.write(' [Certificate]');
  _certificateCache[eventId] = available ? template : null;
  return _certificateCache[eventId];
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

/**
 * Extrae la categoría de género de una fila: usa _pairGender si está presente;
 * si no, intenta leerlo del campo "Gender" (ej. "Parejas Masculinas" → "Masculina").
 */
function extractPairGender(row) {
  if (row._pairGender) return row._pairGender;
  const g = String(row['Gender'] ?? row['Género'] ?? '').toLowerCase();
  if (g.includes('femen')) return 'Femenina';
  if (g.includes('mascul')) return 'Masculina';
  if (g.includes('mixt')) return 'Mixta';
  return null;
}

/**
 * Gender categories present in a contest, used to split it into one selector entry per gender.
 * Empty when some row has no gender: splitting would hide those participants.
 */
function genderCategoriesOf(rows) {
  const genders = rows.map(extractPairGender);
  if (genders.some((g) => !g)) return [];
  return [...new Set(genders)].sort();
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

  // Remove stale per-event files from a previous run (skip preserved files)
  for (const f of fs.readdirSync(path.join(ROOT, 'public'))) {
    if (f.startsWith('race-data-') && f.endsWith('.json') && f !== 'race-data-index.json') {
      const fKey = f.replace('race-data-', '').replace('.json', '');
      if (!CONTEST_PRESERVE_DATA.has(fKey)) {
        fs.unlinkSync(path.join(ROOT, 'public', f));
      }
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
          rows = attachParticipants(rows, await fetchParticipants(sessionId, eventId), variant.contest);
          const certificateUrl = await detectCertificateUrl(eventId, rows);
          const resolvedFormat = detectFormatFromMembers(rows, variant.format);
          const genderCategories = genderCategoriesOf(rows);
          const info = {
            id: String(eventId), fileKey,
            name: ev.EventName,
            date: ev.EventDate ? ev.EventDate.slice(0, 10) : '',
            location: ev.EventLocation ?? '',
            listName: usedListName, contest: variant.contest,
            format: resolvedFormat,
            ...(genderCategories.length > 0 && { genderCategories }),
            ...(certificateUrl && { certificateUrl }),
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

        // Preserved contest: leer datos guardados en git, no descargar de la API
        if (CONTEST_PRESERVE_DATA.has(fileKey)) {
          process.stdout.write(`  → contest ${c.ID} "${c.Name}" (preserved, key: ${fileKey}) — `);
          try {
            const existing = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', `race-data-${fileKey}.json`), 'utf8'));
            const contestDisplayNameP = (CONTEST_NAME_OVERRIDES[String(eventId)] ?? {})[String(c.ID)] ?? c.Name;
            const forcedCatsP = (CONTEST_GENDER_CATEGORIES[String(eventId)] ?? {})[String(c.ID)];
            const autoCatsP = [...new Set(existing.rows.map(extractPairGender).filter(Boolean))].sort();
            const genderCategoriesP = forcedCatsP ?? autoCatsP;
            const isNoGenderSplitP = (CONTEST_NO_GENDER_SPLIT[String(eventId)] ?? []).includes(c.ID);
            const infoP = {
              ...existing.info,
              contestName: contestDisplayNameP,
              ...(genderCategoriesP.length > 0 ? { genderCategories: genderCategoriesP } : {}),
              ...(isNoGenderSplitP ? { noGenderSplit: true } : {}),
            };
            delete infoP.noResults;
            fs.writeFileSync(path.join(ROOT, 'public', `race-data-${fileKey}.json`), JSON.stringify({ info: infoP, rows: existing.rows }, null, 2), 'utf8');
            console.log(`${existing.rows.length} rows (preserved)`);
            index.events.push(infoP);
            saved++;
          } catch (e) { console.log(`FAILED to read preserved data — ${e.message}`); }
          continue;
        }

        process.stdout.write(`  → contest ${c.ID} "${c.Name}" (${format}, key: ${fileKey}) — fetching... `);
        try {
          let { rows, usedListName } = await fetchListWithFallback(sessionId, eventId, defaultList, c.ID, allListNames);
          if (rows.length === 0) {
            console.log('0 rows — added to index (no results yet).');
            const contestDisplayName0 = (CONTEST_NAME_OVERRIDES[String(eventId)] ?? {})[String(c.ID)] ?? c.Name;
            const forcedGenderCats0 = (CONTEST_GENDER_CATEGORIES[String(eventId)] ?? {})[String(c.ID)];
            const isNoGenderSplit0 = (CONTEST_NO_GENDER_SPLIT[String(eventId)] ?? []).includes(c.ID);
            const info = {
              id: String(eventId), fileKey,
              name:        ev.EventName,
              contestName: contestDisplayName0,
              date:        ev.EventDate ? ev.EventDate.slice(0, 10) : '',
              location:    ev.EventLocation ?? '',
              listName:    usedListName,
              contest:     c.ID,
              format,
              noResults:   true,
              ...(forcedGenderCats0 && { genderCategories: forcedGenderCats0 }),
              ...(isNoGenderSplit0 && { noGenderSplit: true }),
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
          rows = attachParticipants(rows, await fetchParticipants(sessionId, eventId), c.ID);
          const certificateUrl = await detectCertificateUrl(eventId, rows);
          const resolvedFormat = detectFormatFromMembers(rows, format);
          const autoCats = genderCategoriesOf(rows);
          const forcedCats = (CONTEST_GENDER_CATEGORIES[String(eventId)] ?? {})[String(c.ID)];
          const genderCategories = forcedCats ?? autoCats;
          const contestDisplayName = (CONTEST_NAME_OVERRIDES[String(eventId)] ?? {})[String(c.ID)] ?? c.Name;
          const isNoGenderSplit = (CONTEST_NO_GENDER_SPLIT[String(eventId)] ?? []).includes(c.ID);
          const info = {
            id: String(eventId), fileKey,
            name:        ev.EventName,
            contestName: contestDisplayName,
            date:        ev.EventDate ? ev.EventDate.slice(0, 10) : '',
            location:    ev.EventLocation ?? '',
            listName:    usedListName,
            contest:     c.ID,
            format:      resolvedFormat,
            ...(genderCategories.length > 0 && { genderCategories }),
            ...(isNoGenderSplit && { noGenderSplit: true }),
            ...(certificateUrl && { certificateUrl }),
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
          rows = attachParticipants(rows, await fetchParticipants(sessionId, eventId), 0);
          const certificateUrl = await detectCertificateUrl(eventId, rows);
          const resolvedFormat = detectFormatFromMembers(rows, format);
          const genderCategories = genderCategoriesOf(rows);
          const info = {
            id:       String(eventId),
            name:     ev.EventName,
            date:     ev.EventDate ? ev.EventDate.slice(0, 10) : '',
            location: ev.EventLocation ?? '',
            listName: usedListName,
            contest:  0,
            format:   resolvedFormat,
            ...(genderCategories.length > 0 && { genderCategories }),
            ...(certificateUrl && { certificateUrl }),
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