#!/usr/bin/env node
// bundle.js — builds a single self-contained bundle.html
// Everything (CSS, JS, image) is inlined — no server needed.
// Usage: node bundle.js

const fs   = require('fs');
const path = require('path');
const DIR  = __dirname;

function read(file) { return fs.readFileSync(path.join(DIR, file), 'utf8'); }

console.log('  Building bundle.html…');

let html = read('index.html');

// ── Inline CSS ────────────────────────────────────────────────
const css = read('style.css');
html = html.replace(
  '<link rel="stylesheet" href="style.css">',
  `<style>\n${css}\n</style>`
);

// ── Inline scripts ────────────────────────────────────────────
const dataJs = read('data.js');
html = html.replace(
  '<script src="data.js"></script>',
  `<script>\n${dataJs}\n</script>`
);

const appJs = read('app.js');
html = html.replace(
  '<script src="app.js"></script>',
  `<script>\n${appJs}\n</script>`
);

// ── Inline aphasia image as base64 ────────────────────────────
const imgB64 = fs.readFileSync(path.join(DIR, 'aphasia-image.png')).toString('base64');
const imgUri = `data:image/png;base64,${imgB64}`;

// Replace the path in app.js that was just inlined
html = html.replace(
  "window.COOKIE_THEFT_IMG = 'aphasia-image.png';",
  `window.COOKIE_THEFT_IMG = '${imgUri}';`
);

// ── Embed paper form as a full-screen iframe overlay ──────────
const paperFormHtml = read('paper-form.html');

// Replace the "Back to App" link in the paper form so it closes the overlay
const paperFormPatched = paperFormHtml.replace(
  '<a href="index.html">← Back to App</a>',
  '<a href="#" onclick="window.parent.__closePaperForm(); return false;">← Back to App</a>'
);

const paperModal = `
<div id="paper-modal" style="display:none; position:fixed; inset:0; z-index:9999; background:#fff; flex-direction:column;">
  <div style="padding:8px 12px; background:#1a3a5c; color:#fff; display:flex; gap:10px; align-items:center; flex-shrink:0;" class="no-print">
    <button onclick="__closePaperForm()" style="background:rgba(255,255,255,0.15); border:none; color:#fff; padding:6px 14px; border-radius:4px; cursor:pointer; font-size:14px;">← Back to App</button>
    <button onclick="document.getElementById('paper-iframe').contentWindow.print()" style="background:rgba(255,255,255,0.15); border:none; color:#fff; padding:6px 14px; border-radius:4px; cursor:pointer; font-size:14px;">🖨 Print</button>
  </div>
  <iframe id="paper-iframe" style="flex:1; border:none; width:100%; height:100%;"></iframe>
</div>
<script>
  function __openPaperForm() {
    var modal = document.getElementById('paper-modal');
    var iframe = document.getElementById('paper-iframe');
    modal.style.display = 'flex';
    iframe.srcdoc = ${JSON.stringify(paperFormPatched)};
  }
  function __closePaperForm() {
    document.getElementById('paper-modal').style.display = 'none';
  }
</script>`;

html = html.replace('</body>', paperModal + '\n</body>');

// Wire up the Paper Backup Form button to open the overlay
html = html.replace(
  'href="paper-form.html"',
  'href="#" onclick="__openPaperForm(); return false;"'
);

// ── Remove PWA-only bits (not needed for a single file) ───────
// manifest
html = html.replace(/\n\s*<link rel="manifest" href="manifest\.json">/, '');
// apple-touch-icon
html = html.replace(/\n\s*<link rel="apple-touch-icon"[^>]*>/, '');
// service worker registration block
html = html.replace(
  /\n\s*\/\/ Register service worker\n\s*if \('serviceWorker'[\s\S]*?\}\s*\}/,
  ''
);

// ── Write output ──────────────────────────────────────────────
const outPath = path.join(DIR, 'bundle.html');
fs.writeFileSync(outPath, html, 'utf8');

const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
console.log(`  ✓ bundle.html created (${kb} KB)`);
console.log('');
console.log('  To get it on your phone:');
console.log('  • Email it to yourself, open the attachment on your phone');
console.log('  • AirDrop it (iPhone/Mac)');
console.log('  • Transfer via USB / Files app');
console.log('  • Drag it to Google Drive / Dropbox, download on phone');
console.log('');
console.log('  Once open in your phone\'s browser, tap Share → "Add to Home Screen"');
console.log('');
