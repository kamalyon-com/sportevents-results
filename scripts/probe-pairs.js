'use strict';
/**
 * probe-pairs.js  — diagnostico de contests de parejas/equipos.
 *
 * Para cada evento con format='pairs' o 'teams' en el índice:
 *   1. Llama a data/list con campos candidatos (GroupID, GroupName, etc.)
 *   2. Llama a agegroups/get para ver las categorías disponibles
 *   3. Imprime los primeros 6 registros raw para entender la estructura
 *
 * Uso:
 *   node scripts/probe-pairs.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT    = path.resolve(__dirname, '..');
const envText = fs.existsSync(path.join(ROOT, '.env.local'))
  ? fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
  : '';
const API_KEY = envText.split('\n').find(l => l.startsWith('REACT_APP_RR_API_KEY'))
  ?.split('=').slice(1).join('=').trim()
  || process.env.REACT_APP_RR_API_KEY || '';

if (!API_KEY) {
  console.error('ERROR: REACT_APP_RR_API_KEY no encontrada en .env.local');
  process.exit(1);
}

const SERVER = 'events.raceresult.com';

async function login() {
  const body = new URLSearchParams({ apikey: API_KEY });
  const r = await fetch(`https://${SERVER}/api/public/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!r.ok) throw new Error(`Login failed: ${r.status} — ${await r.text()}`);
  return (await r.text()).trim();
}

async function dataList(session, eventId, fields, filter = '', contest = 0) {
  const params = new URLSearchParams();
  params.append('fields', JSON.stringify(fields));
  params.append('listFormat', 'JSON');
  if (filter) params.append('filter', filter);
  if (contest) params.append('contest', String(contest));
  const r = await fetch(`https://${SERVER}/_${eventId}/api/data/list?${params}`, {
    headers: { Authorization: `Bearer ${session}` },
  });
  if (!r.ok) return { error: r.status };
  return r.json();
}

async function getAgeGroups(session, eventId, contest = 0) {
  const r = await fetch(`https://${SERVER}/_${eventId}/api/agegroups/get?contest=${contest}`, {
    headers: { Authorization: `Bearer ${session}` },
  });
  if (!r.ok) return [];
  return r.json();
}

async function getContests(session, eventId) {
  const r = await fetch(`https://${SERVER}/_${eventId}/api/contests/get`, {
    headers: { Authorization: `Bearer ${session}` },
  });
  if (!r.ok) return [];
  return r.json();
}

async function listNames(session, eventId) {
  const r = await fetch(`https://${SERVER}/_${eventId}/api/lists/names`, {
    headers: { Authorization: `Bearer ${session}` },
  });
  if (!r.ok) return [];
  return r.json();
}

async function fetchList(session, eventId, listName, contest = 0) {
  const params = new URLSearchParams({ name: listName, format: 'JSON', contest: String(contest), lang: 'es' });
  const r = await fetch(`https://${SERVER}/_${eventId}/api/lists/create?${params}`, {
    headers: { Authorization: `Bearer ${session}` },
  });
  if (!r.ok) return [];
  return r.json();
}

// Candidate fields to probe for team/group information
const PROBE_FIELDS = [
  'Bib', 'GroupID', 'GroupRegPos',
  'GroupName',          // may or may not exist
  'TeamName',           // custom field?
  'Firstname', 'Lastname',
  'Club',
  'AgeGroup1',          // numeric ID → cross-ref with agegroups/get
  'Contest',
  'Sex',
];

// Extended fields for member names in pairs/relay
const PAIRS_FIELDS = [
  'Bib', 'Contest', 'GroupID', 'GroupRegPos',
  'Firstname', 'Lastname',       // pair/team name
  'Firstname1', 'Lastname1',     // member 1
  'Firstname2', 'Lastname2',     // member 2
  'Firstname3', 'Lastname3',     // member 3 (teams of 3)
  'Club', 'Club1', 'Club2',      // clubs
  'Sex',
];

(async () => {
  console.log('Iniciando sesión...');
  const session = await login();
  console.log('OK\n');

  const indexPath = path.join(ROOT, 'public', 'race-data-index.json');
  if (!fs.existsSync(indexPath)) {
    console.error('Primero ejecuta "npm run prefetch"');
    process.exit(1);
  }
  const { events } = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

  // Deduplicate by eventId so we probe each event once
  const seenEventIds = new Set();
  const pairsEvents = events.filter(ev => {
    if (seenEventIds.has(ev.id)) return false;
    seenEventIds.add(ev.id);
    return true; // probe all events — let the data tell us which are pairs
  });

  for (const ev of pairsEvents) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`EVENTO: [${ev.id}] ${ev.name}`);
    console.log(`${'═'.repeat(70)}`);

    // ── 1. Contests ──────────────────────────────────────────────────────
    const contests = await getContests(session, ev.id);
    console.log(`\nContests (${contests.length}):`);
    for (const c of contests) {
      console.log(`  [${c.ID}] ${c.Name}  Sex=${c.Sex || '—'}  Color=${c.Color || '—'}`);
    }

    // ── 2. Age groups per contest ────────────────────────────────────────
    for (const c of contests.slice(0, 6)) {
      const ags = await getAgeGroups(session, ev.id, c.ID);
      if (ags.length > 0) {
        console.log(`\nAge groups para contest ${c.ID} "${c.Name}" (${ags.length}):`);
        for (const ag of ags) {
          console.log(`  [${ag.ID}] "${ag.Name}" / short="${ag.NameShort}"  Sex=${ag.Sex || '—'}`);
        }
      }
    }

    // ── 3. data/list probe ───────────────────────────────────────────────
    console.log(`\ndata/list probe (primeros 6 rows, contest=0):`);
    const rows = await dataList(session, ev.id, PROBE_FIELDS, '', 0);
    if (rows.error) {
      console.log(`  ERROR ${rows.error}`);
    } else if (!Array.isArray(rows) || rows.length === 0) {
      console.log('  Sin datos');
    } else {
      // rows is array of arrays (one sub-array per field, one element per participant)
      // OR array of objects depending on listFormat
      const sample = Array.isArray(rows[0]) ? rows.slice(0, 6) : rows.slice(0, 6);
      console.log(`  Total rows: ${rows.length}`);
      console.log(`  Campos solicitados: ${PROBE_FIELDS.join(', ')}`);
      console.log(`  Estructura de la respuesta: ${Array.isArray(rows[0]) ? 'array de arrays (columnar)' : 'array de objetos'}`);
      console.log('\n  Primeros 6 registros:');
      for (const row of sample) {
        if (Array.isArray(row)) {
          // Columnar format: one sub-array per field
          // Actually data/list returns one array per COLUMN, each of length N
          // Let's handle both formats
          console.log('  ', JSON.stringify(row));
        } else {
          console.log('  ', JSON.stringify(row));
        }
      }
    }

    // ── 4. List names ────────────────────────────────────────────────────
    const names = await listNames(session, ev.id);
    console.log(`\nOutput lists disponibles (${names.length}):`);
    for (const n of names) {
      console.log(`  "${n}"`);
    }

    // ── 5. Fetch "Resultados de Equipo" list AND detailed data/list for pairs ─
    const pairsContests = contests.filter(c =>
      /pareja|duo|doble|team|relay|equipo/i.test(c.Name)
    );
    if (pairsContests.length > 0) {
      console.log(`\nContests de parejas detectados: ${pairsContests.map(c => c.Name).join(', ')}`);

      for (const c of pairsContests.slice(0, 2)) {
        // --- data/list con campos de miembros ---
        console.log(`\n  [data/list pairs fields] contest ${c.ID} "${c.Name}":`);
        const pairsRows = await dataList(session, ev.id, PAIRS_FIELDS, '', c.ID);
        if (!pairsRows.error && Array.isArray(pairsRows) && pairsRows.length > 0) {
          console.log(`  Total rows: ${pairsRows.length}`);
          console.log(`  Campos: ${PAIRS_FIELDS.join(', ')}`);
          console.log('  Primeros 4:');
          for (const row of pairsRows.slice(0, 4)) {
            const obj = {};
            PAIRS_FIELDS.forEach((f, i) => { if (row[i] !== 0 && row[i] !== '') obj[f] = row[i]; });
            console.log('   ', JSON.stringify(obj));
          }
        }

        // --- "Listas de Resultados|Resultados de Equipo" ---
        const teamListName = names.find(n => n.includes('Resultados de Equipo') && !n.includes('m/f'));
        if (teamListName) {
          const tRows = await fetchList(session, ev.id, teamListName, c.ID);
          if (Array.isArray(tRows) && tRows.length > 0) {
            console.log(`\n  Lista "${teamListName}", contest ${c.ID} → ${tRows.length} rows`);
            console.log('  Columnas:', Object.keys(tRows[0]).join(', '));
            console.log('  Primeros 4:');
            for (const row of tRows.slice(0, 4)) {
              console.log('   ', JSON.stringify(row));
            }
          }
        }

        // --- "Resultados|Resultados" list ---
        const resListName = names.find(n => n === 'Resultados|Resultados' || n === 'Resultados|01.LIVE');
        if (resListName) {
          const rRows = await fetchList(session, ev.id, resListName, c.ID);
          if (Array.isArray(rRows) && rRows.length > 0) {
            console.log(`\n  Lista "${resListName}", contest ${c.ID} → ${rRows.length} rows`);
            console.log('  Columnas:', Object.keys(rRows[0]).join(', '));
            console.log('  Primeros 6:');
            for (const row of rRows.slice(0, 6)) {
              console.log('   ', JSON.stringify(row));
            }
          }
        }
      }
    }
  }

  console.log('\n\nDiagnóstico completado.');
})().catch(e => { console.error(e); process.exit(1); });
