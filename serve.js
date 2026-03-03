#!/usr/bin/env node
// serve.js — Local network server for Code Stroke Triage App
// Run: node serve.js
// Then open the Network URL on your phone (same WiFi)

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const PORT = 8080;
const DIR  = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function localIP() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return '127.0.0.1';
}

http.createServer((req, res) => {
  const urlPath  = req.url.split('?')[0];
  const filePath = path.join(DIR, urlPath === '/' ? 'index.html' : urlPath);

  // Prevent path traversal outside DIR
  if (!filePath.startsWith(DIR + path.sep) && filePath !== DIR) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });

}).listen(PORT, '0.0.0.0', () => {
  const ip     = localIP();
  const netUrl = `http://${ip}:${PORT}`;

  console.log();
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║   Code Stroke — Local Network Server  ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log(`  ║  Local:    http://localhost:${PORT}        ║`);
  console.log(`  ║  Network:  ${netUrl.padEnd(27)}║`);
  console.log('  ╠══════════════════════════════════════╣');
  console.log('  ║  On your phone (same WiFi network):   ║');
  console.log(`  ║  1. Open browser → ${netUrl.padEnd(19)}║`);
  console.log('  ║  2. Tap ⋮ → "Add to Home Screen"      ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log();
  console.log('  Ctrl+C to stop.');
  console.log();
});
