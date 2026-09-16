'use strict';
const fs = require('fs');
const path = require('path');

const apiKey = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8').match(/REACT_APP_RR_API_KEY=(\S+)/)[1];
const SERVER = 'events.raceresult.com';
const eventId = 376174;

async function login() {
  const body = new URLSearchParams({ apikey: apiKey });
  const r = await fetch(`https://${SERVER}/api/public/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString(),
  });
  return (await r.text()).trim();
}

async function dataList(sessionId, fields, filter = '', limit = 5) {
  const params = new URLSearchParams();
  params.append('fields', JSON.stringify(fields));
  params.append('listFormat', 'JSON');
  if (filter) params.append('filter', filter);
  params.append('limitFrom', '0');
  params.append('limitTo', String(limit));
  const r = await fetch(`https://${SERVER}/_${eventId}/api/data/list?${params}`, {
    headers: { Authorization: `Bearer ${sessionId}` }
  });
  return r.json();
}

async function run() {
  const sessionId = await login();
  console.log('Logged in\n');

  // Known mixed pair from Open Domingo: bib 1173 (Marc + Tere = male + female)
  const mixedBib = 1173;
  const femBib   = 1511; // Cabras locas: Rebeca + Silvia, Sex=f (Femenina)
  const masBib   = 1521; // AGR: Luis + Petra, Sex=m (Masculina)

  // 1. Try part/getfields with a huge list of candidates
  const candidates = [
    // Standard RaceResult fields
    'Sex', 'Sex1', 'Sex2', 'Sex3',
    'GroupSex', 'TeamSex', 'PairSex',
    'Sexo', 'Sexo1', 'Sexo2',
    'Gender', 'Gender1', 'Gender2',
    'Genero', 'Genero1', 'Genero2',
    'GeneroPareja', 'MasculinoFemenino',
    // Group/team registration fields
    'GroupID', 'GroupRegPos', 'GroupPos',
    'ForeignID', 'ForeignKey',
    // AgeGroup
    'AgeGroup1', 'AgeGroup2', 'AgeGroup3',
    // Registration category
    'Modalidad', 'Modal', 'Categoria', 'Category',
    'TipoPareja', 'TipoParejas', 'TipoEquipo',
    'ModalidadPareja', 'CategoriaPareja',
    // More possible sex fields
    'PersonSex1', 'PersonSex2',
    'MemberSex1', 'MemberSex2',
    'Sex_1', 'Sex_2',
    'Booleans', 'Status',
    // Custom fields the organizer might have added
    'Custom1', 'Custom2', 'Custom3', 'Custom4', 'Custom5',
    'CF1', 'CF2', 'CF3',
  ];

  console.log('=== part/getfields for MIXED pair bib', mixedBib, '===');
  const resp1 = await fetch(
    `https://${SERVER}/_${eventId}/api/part/getfields?bib=${mixedBib}&fields=${encodeURIComponent(JSON.stringify(candidates))}`,
    { headers: { Authorization: `Bearer ${sessionId}` } }
  );
  const fields1 = await resp1.json();
  // Show only non-zero / non-empty values
  const interesting = Object.entries(fields1).filter(([k,v]) => v !== 0 && v !== '' && v !== null && v !== '0');
  console.log('Non-empty fields:', interesting.length ? interesting : '(none)');
  console.log('All sex-related:', Object.entries(fields1).filter(([k]) => /sex|gen|mod|categ|tipo/i.test(k)));

  // 2. Compare Femenina and Masculina bibs
  console.log('\n=== Femenina bib', femBib, '===');
  const resp2 = await fetch(
    `https://${SERVER}/_${eventId}/api/part/getfields?bib=${femBib}&fields=${encodeURIComponent(JSON.stringify(candidates))}`,
    { headers: { Authorization: `Bearer ${sessionId}` } }
  );
  const fields2 = await resp2.json();
  const interesting2 = Object.entries(fields2).filter(([k,v]) => v !== 0 && v !== '' && v !== null && v !== '0');
  console.log('Non-empty fields:', interesting2);

  console.log('\n=== Masculina bib', masBib, '===');
  const resp3 = await fetch(
    `https://${SERVER}/_${eventId}/api/part/getfields?bib=${masBib}&fields=${encodeURIComponent(JSON.stringify(candidates))}`,
    { headers: { Authorization: `Bearer ${sessionId}` } }
  );
  const fields3 = await resp3.json();
  const interesting3 = Object.entries(fields3).filter(([k,v]) => v !== 0 && v !== '' && v !== null && v !== '0');
  console.log('Non-empty fields:', interesting3);

  // 3. Check if individual member participants exist (group registration)
  // Try querying for participants whose GroupID matches the team bib
  console.log('\n=== Looking for individual member records (GroupID) ===');
  const groupData = await dataList(sessionId,
    ['Bib', 'Firstname', 'Lastname', 'Sex', 'GroupID', 'GroupRegPos', 'Contest'],
    `{GroupID}=${mixedBib}`, 10
  );
  console.log('GroupID=' + mixedBib + ':', JSON.stringify(groupData));

  // 4. Try getting ALL contests participants to find per-member records
  console.log('\n=== Try fetching per-person records linked to team ===');
  const memberData = await dataList(sessionId,
    ['Bib', 'Firstname', 'Lastname', 'Sex', 'ForeignKey', 'ForeignID'],
    `{ForeignKey}="${mixedBib}" OR {ForeignID}=${mixedBib}`, 10
  );
  console.log('ForeignKey/ID results:', JSON.stringify(memberData));

  // 5. Try the AgeGroups endpoint to see if sex is embedded there
  console.log('\n=== AgeGroups ===');
  const agResp = await fetch(`https://${SERVER}/_${eventId}/api/agegroups/get`, {
    headers: { Authorization: `Bearer ${sessionId}` }
  });
  const agText = await agResp.text();
  console.log('AgeGroups (first 800):', agText.slice(0, 800));
}
run().catch(e => console.error(e));
