// Serveur minimal pour Ortie (aucune dépendance) : fichiers du jeu + parties à distance.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const rooms = require('./rooms'); // parties à distance (/api/…)

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = path.join(__dirname, 'public');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/') && rooms.handle(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }
  let pathname;
  let versioned = false;
  try {
    const u = new URL(req.url, 'http://localhost');
    pathname = decodeURIComponent(u.pathname);
    versioned = u.searchParams.has('v');
  } catch (e) {
    res.writeHead(400);
    return res.end('Bad request');
  }
  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = path.normalize(path.join(ROOT, pathname));
  if (!file.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Introuvable');
    }
    const ext = path.extname(file).toLowerCase();
    fs.readFile(file, (rerr, body) => {
      if (rerr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Erreur');
      }
      // ETag calculé sur le contenu : fiable même si l'hébergeur remet toutes
      // les dates de fichiers à la même valeur (ce qui faisait garder d'anciens
      // fichiers au téléphone).
      const etag = '"' + crypto.createHash('sha1').update(body).digest('base64url').slice(0, 27) + '"';
      let cache = 'no-cache';
      if (versioned) cache = 'public, max-age=31536000, immutable'; // style.css?v=…, app.js?v=…
      else if (ext === '.png') cache = 'public, max-age=604800';
      const headers = {
        'Content-Type': TYPES[ext] || 'application/octet-stream',
        'Cache-Control': cache,
        ETag: etag,
        'X-Content-Type-Options': 'nosniff',
      };
      if (path.basename(file) === 'sw.js') headers['Service-Worker-Allowed'] = '/';
      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, headers);
        return res.end();
      }
      headers['Content-Length'] = body.length;
      res.writeHead(200, headers);
      res.end(req.method === 'HEAD' ? undefined : body);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Ortie prêt sur http://${HOST}:${PORT}`);
});
