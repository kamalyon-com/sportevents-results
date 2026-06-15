'use strict';
/**
 * check-contests.js  -  helper to discover contest numbers for your events.
 *
 * Run: node scripts/check-contests.js
 *
 * For each event it tries contest 0, 1, 2 ... 10 and shows how many rows each
 * returns.  Use the output to fill in EVENT_VARIANTS in prefetch-results.js.
 */
const fs = require('fs');
const path = require('path');

const ROOT    = path.resolve(__dirname, '..');
const env     = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
const API_KEY = env.split('\n').find(l => l.startsWith('REACT_APP_RR_API_KEY')).split('=').slice(1).join('=').trim();
const SERVER  = 'events.raceresult.com';

(async () => {
  const r = await fetch(`https://${SERVER}/api/public/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'apikey=' + API_KEY,
  });
  const session = (await r.text()).trim();
  console.log('Logged in.\n');

  const indexPath = path.join(ROOT, 'public', 'race-data-index.json');
  if (!fs.existsSync(indexPath)) {
    console.error('Run "npm run prefetch" first');
    process.exit(1);
  }
  const { events } = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

  for (const ev of events) {
    if (ev.fileKey && ev.fileKey !== ev.id) continue;
    console.log('[' + ev.id + '] ' + ev.name + '  --  list: "' + ev.listName + '"');
    for (let c = 0; c <= 10; c++) {
      const params = new URLSearchParams({ name: ev.listName, format: 'JSON', contest: String(c), lang: 'es' });
      const resp = await fetch('https://' + SERVER + '/_' + ev.id + '/api/lists/create?' + params, {
        headers: { Authorization: 'Bearer ' + session },
      });
      const rows = await resp.json();
      const count = Array.isArray(rows) ? rows.length : 0;
      if (c === 0 && count > 0) console.log('  columns: ' + Object.keys(rows[0]).join(', '));
      if (count > 0) {
        const cats = [...new Set(rows.map(r => r['Modalidad'] || r['Categoria'] || '').filter(Boolean))].slice(0, 5);
        console.log('  contest ' + c + ': ' + count + ' rows' + (cats.length ? '  categories: ' + cats.join(', ') : ''));
      } else {
        console.log('  contest ' + c + ': 0 rows');
        if (c > 2) break;
      }
    }
    console.log();
  }
})().catch(e => { console.error(e); process.exit(1); });
