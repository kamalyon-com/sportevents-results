require('dotenv').config({ path: '.env.local' });
const API_KEY = process.env.REACT_APP_RR_API_KEY;
const SERVER = 'events.raceresult.com';
const EVENT_ID = 376174; // Strong Race

async function login() {
  const body = new URLSearchParams({ apikey: API_KEY });
  const resp = await fetch(`https://${SERVER}/api/public/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  return (await resp.text()).trim();
}

async function main() {
  const sessionId = await login();
  console.log('Logged in');

  // Get ALL registration rows with Bib, Sex, and member name info
  const fields = ['Bib', 'Sex', 'Firstname1', 'Firstname2'];
  const p = new URLSearchParams();
  p.append('fields', JSON.stringify(fields));
  p.append('listFormat', 'JSON');
  const resp = await fetch(`https://${SERVER}/_${EVENT_ID}/api/data/list?${p}`, {
    headers: { Authorization: `Bearer ${sessionId}` },
  });
  const rows = await resp.json();

  // Build bib→sex map
  const bibSex = {};
  rows.forEach(r => {
    const bib = String(r[0]);
    const sex = String(r[1] ?? '').trim();
    if (sex && sex !== '0') bibSex[bib] = sex;
  });

  // Check known result bibs
  const knownBibs = ['443','471','494','539','626','448','500','501','502','503'];
  knownBibs.forEach(b => console.log(`Bib ${b}: sex=${bibSex[b] ?? '(none)'}`));

  // Overall distribution
  const dist = {};
  Object.values(bibSex).forEach(s => { dist[s] = (dist[s]||0)+1; });
  console.log('\nSex distribution in registration DB:', dist);
  console.log('Total with sex data:', Object.keys(bibSex).length, '/', rows.length);
}

main().catch(console.error);
