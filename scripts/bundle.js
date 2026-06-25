/**
 * Post-build bundler
 * Merges all CRA output (CSS + JS chunks + main) into a single
 * `build/sportevents-results.js` file suitable for a one-liner WordPress embed:
 *
 *   <div id="sportevents-results"></div>
 *   <script src="https://your-server.com/results/sportevents-results.js"></script>
 *
 * The generated file automatically detects its own URL and uses it as the base
 * for fetching race-data-*.json files, so the data files just need to live in
 * the same folder on the server.
 */

const fs   = require('fs');
const path = require('path');

const buildDir  = path.resolve(__dirname, '../build');
const manifest  = JSON.parse(fs.readFileSync(path.join(buildDir, 'asset-manifest.json'), 'utf8'));
const outFile   = path.join(buildDir, 'sportevents-results.js');

const allFiles  = Object.values(manifest.files);
const cssFiles  = allFiles.filter(f => f.endsWith('.css'));
const jsFiles   = allFiles.filter(f => f.endsWith('.js') && !f.endsWith('.js.map'));

// Load order: chunks first, then main bundle
const mainFile   = jsFiles.find(f => f.includes('/main.'));
const chunkFiles = jsFiles.filter(f => !f.includes('/main.'));

const ordered = [...chunkFiles, mainFile].filter(Boolean);

const parts = [];

// ── Preamble: detect own URL and set window.__SPORT_EVENTS_BASE_URL__ ──────
parts.push(`(function(){
  var scripts = document.querySelectorAll('script[src]');
  var me = null;
  for (var i = scripts.length - 1; i >= 0; i--) {
    if (scripts[i].src.indexOf('sportevents-results') !== -1) { me = scripts[i]; break; }
  }
  window.__SPORT_EVENTS_BASE_URL__ = me ? me.src.replace(/[^\\/]+$/, '') : './';
})();`);

// ── Panton Bold @font-face: inject using the detected base URL ──────────────
parts.push(`(function(){
  var id='sport-events-panton-font';
  if(!document.getElementById(id)){
    var base=(window.__SPORT_EVENTS_BASE_URL__||'./').replace(/\/$/,'');
    var s=document.createElement('style');
    s.id=id;
    s.textContent='@font-face{font-family:\'Panton\';src:url(\'' + base + '/fonts/Panton%20Bold.ttf\') format(\'truetype\');font-weight:700;font-style:normal;font-display:swap;}';
    document.head.appendChild(s);
  }
})();`);
for (const rel of cssFiles) {
  const abs = path.join(buildDir, rel.replace(/^\.\//, ''));
  if (!fs.existsSync(abs)) continue;
  const css = fs.readFileSync(abs, 'utf8').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
  parts.push(`(function(){var s=document.createElement('style');s.textContent=\`${css}\`;document.head.appendChild(s);})();`);
}

// ── JS bundles ───────────────────────────────────────────────────────────────
for (const rel of ordered) {
  const abs = path.join(buildDir, rel.replace(/^\.\//, ''));
  if (!fs.existsSync(abs)) { console.warn('Missing:', abs); continue; }
  parts.push(fs.readFileSync(abs, 'utf8'));
}

// ── Hardening CSS: injected LAST so it wins over any WordPress/theme overrides ──
const hardeningCSS = `
/* Sport Events Widget — CSS isolation hardening (injected last) */
#sportevents-results,#kamalyon-race-results{font-family:'Panton','Barlow Condensed','Roboto',Helvetica,Arial,sans-serif!important;background:transparent!important;}
#sportevents-results h1,#sportevents-results h2,#sportevents-results h3,#sportevents-results h4,#sportevents-results h5,#sportevents-results h6,#kamalyon-race-results h1,#kamalyon-race-results h2,#kamalyon-race-results h3,#kamalyon-race-results h4,#kamalyon-race-results h5,#kamalyon-race-results h6{color:inherit!important;font-family:'Panton','Barlow Condensed','Roboto',Helvetica,Arial,sans-serif!important;}
#sportevents-results fieldset,#kamalyon-race-results fieldset{border-color:rgba(128,128,128,0.3)!important;}
#sportevents-results [class*="Mui-focused"] fieldset,#kamalyon-race-results [class*="Mui-focused"] fieldset{border-color:#00A3E0!important;}
#sportevents-results hr,#kamalyon-race-results hr{background-color:transparent!important;border-top-style:solid!important;border-top-width:thin!important;}
#sportevents-results table,#sportevents-results td,#sportevents-results th,#kamalyon-race-results table,#kamalyon-race-results td,#kamalyon-race-results th{border:none!important;}
#sportevents-results [class*="MuiTableCell-root"],#kamalyon-race-results [class*="MuiTableCell-root"]{border-bottom:1px solid rgba(255,255,255,0.06)!important;}
[class*="MuiPopover-root"] [class*="MuiMenuItem-root"],[class*="MuiMenu-root"] [class*="MuiMenuItem-root"],[class*="MuiAutocomplete-popper"] [class*="MuiAutocomplete-option"]{font-family:'Panton','Barlow Condensed','Roboto',Helvetica,Arial,sans-serif!important;}
[class*="MuiPopover-root"] [class*="MuiMenuItem-root"] *,[class*="MuiMenu-root"] [class*="MuiMenuItem-root"] *{font-family:'Panton','Barlow Condensed','Roboto',Helvetica,Arial,sans-serif!important;}
#sportevents-results input,#kamalyon-race-results input{border:none!important;outline:none!important;box-shadow:none!important;background:transparent!important;box-sizing:content-box!important;font-family:'Panton','Barlow Condensed','Roboto',Helvetica,Arial,sans-serif!important;}
#sportevents-results button,#kamalyon-race-results button{font-family:'Panton','Barlow Condensed','Roboto',Helvetica,Arial,sans-serif!important;}
#sportevents-results select,#kamalyon-race-results select,#sportevents-results textarea,#kamalyon-race-results textarea{font-family:'Panton','Barlow Condensed','Roboto',Helvetica,Arial,sans-serif!important;}
#sportevents-results [class*="MuiInputBase-input"],#kamalyon-race-results [class*="MuiInputBase-input"]{padding:16.5px 14px!important;}
#sportevents-results [class*="MuiInputBase-sizeSmall"] [class*="MuiInputBase-input"],#kamalyon-race-results [class*="MuiInputBase-sizeSmall"] [class*="MuiInputBase-input"]{padding:8.5px 14px!important;}
#sportevents-results a,#kamalyon-race-results a{color:inherit!important;text-decoration:none!important;}
#sportevents-results img,#kamalyon-race-results img{max-width:none!important;}
#sportevents-results li,#kamalyon-race-results li{list-style:none!important;margin:0!important;padding:0!important;}
`.trim();
parts.push(`(function(){var s=document.createElement('style');s.textContent=${JSON.stringify(hardeningCSS)};document.head.appendChild(s);})();`);

fs.writeFileSync(outFile, parts.join('\n'), 'utf8');

const kb = (fs.statSync(outFile).size / 1024).toFixed(1);
console.log(`\n✔  sportevents-results.js  (${kb} KB)  →  ${outFile}\n`);
console.log('Embed snippet:');
console.log('  <div id="sportevents-results"></div>');
console.log('  <script src="https://YOUR-SERVER/path/to/sportevents-results.js"></script>\n');
