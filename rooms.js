// Ortie — parties à distance : salons rejoints avec un code, sans dépendance.
//
// Chaque joueur envoie la liste complète de ses coups ; le serveur la rejoue
// avec le moteur du jeu (public/core.js) pour la vérifier, puis prévient les
// deux joueurs en direct (Server-Sent Events). Les deux vergers partent du
// même numéro de partie : les mêmes cartes, dans le même ordre.
//
//   POST /api/rooms                 { name, recipes }      → { code, token, seat, room }
//   POST /api/rooms/:code/join      { name, t? }           → { token, seat, room }
//   GET  /api/rooms/:code/events?t= (flux d'événements « room »)
//   GET  /api/rooms/:code?t=        → { room }
//   POST /api/rooms/:code/moves     { t, round, moves }
//   POST /api/rooms/:code/rematch   { t, same }            (revanche : nouvelle manche)
//   POST /api/rooms/:code/leave     { t }
//
// Les salons vivent en mémoire : un redémarrage du serveur les efface.
'use strict';
const crypto = require('crypto');
const H = require('./public/core.js');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans 0/O ni 1/I
const CODE_LEN = 4;
const MAX_ROOMS = 3000;
const ROOM_TTL = 6 * 3600e3; // salon oublié après 6 h sans joueur connecté
const MAX_BODY = 8 * 1024;
const MAX_CONNS = 4; // flux ouverts par joueur (onglets, reconnexions)

const rooms = new Map();

function newCode() {
  for (let i = 0; i < 50; i++) {
    const b = crypto.randomBytes(CODE_LEN);
    let c = '';
    for (let j = 0; j < CODE_LEN; j++) c += CODE_CHARS[b[j] % CODE_CHARS.length];
    if (!rooms.has(c)) return c;
  }
  return null;
}

const cleanName = (n, fallback) => String(n == null ? '' : n).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 14) || fallback;

function player(name, fallback) {
  return { token: crypto.randomBytes(18).toString('base64url'), name: cleanName(name, fallback), moves: [], conns: new Set(), left: false };
}

// Nouvelle manche : nouveau numéro de partie (ou le même pour rejouer ces cartes).
function deal(room, seed, recipes) {
  const g = H.newGame(seed ? String(seed).replace(/[^\w-]/g, '').slice(0, 12) || null : null, { recipes });
  room.seed = g.seed;
  room.recipes = g.recipes; // null, ou les deux recettes tirées
  room.round = (room.round || 0) + 1;
  for (const p of room.players) p.moves = [];
}

// Rejoue des coups depuis le début ; null si l'un d'eux est impossible.
function replay(room, moves) {
  if (!Array.isArray(moves) || moves.length > H.GAME_CARDS - 1) return null;
  const st = H.newGame(room.seed, { recipes: room.recipes || false });
  const out = [];
  for (const m of moves) {
    if (!m || typeof m !== 'object') return null;
    const mv = { id: Number(m.id), rot: Number(m.rot) & 3, x: Number(m.x), y: Number(m.y) };
    if (![mv.id, mv.x, mv.y].every(Number.isInteger)) return null;
    if (!H.play(st, mv.id, mv.rot, mv.x, mv.y, { allowSquirrel: true }).ok) return null;
    out.push(mv);
  }
  return out;
}

function snapshot(room) {
  return {
    code: room.code, seed: room.seed, recipes: room.recipes, round: room.round,
    players: room.players.map((p) => ({ name: p.name, moves: p.moves, online: p.conns.size > 0, left: p.left })),
  };
}

function broadcast(room) {
  if (rooms.get(room.code) !== room) return;
  const data = 'event: room\ndata: ' + JSON.stringify(snapshot(room)) + '\n\n';
  for (const p of room.players) for (const res of p.conns) res.write(data);
}

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function readJson(req, cb) {
  const chunks = [];
  let size = 0;
  let done = false;
  req.on('data', (c) => {
    size += c.length;
    if (size > MAX_BODY && !done) { done = true; cb(null); req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => {
    if (done) return;
    done = true;
    let data = null;
    try { data = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { data = null; }
    cb(data && typeof data === 'object' ? data : null);
  });
}

const seatOf = (room, token) => (token ? room.players.findIndex((p) => p.token === String(token)) : -1);
const touch = (room) => { room.touched = Date.now(); };

// Renvoie true si la requête concernait l'API (et y a été répondu).
function handle(req, res) {
  let u;
  try { u = new URL(req.url, 'http://localhost'); } catch (e) { return false; }
  if (!u.pathname.startsWith('/api/')) return false;
  const parts = u.pathname.split('/').filter(Boolean); // ['api', 'rooms', code, action]
  if (parts[1] !== 'rooms' || parts.length > 4) { send(res, 404, { error: 'Introuvable.' }); return true; }

  // Créer un salon
  if (parts.length === 2) {
    if (req.method !== 'POST') { send(res, 405, { error: 'Méthode non permise.' }); return true; }
    readJson(req, (body) => {
      if (!body) return send(res, 400, { error: 'Requête invalide.' });
      if (rooms.size >= MAX_ROOMS) return send(res, 503, { error: 'Trop de parties en cours, réessayez dans un moment.' });
      const code = newCode();
      if (!code) return send(res, 503, { error: 'Réessayez dans un moment.' });
      const room = { code, players: [player(body.name, 'Joueur 1')], created: Date.now(), touched: Date.now() };
      deal(room, body.seed, body.recipes === true || Array.isArray(body.recipes) ? body.recipes : false);
      rooms.set(code, room);
      send(res, 200, { code, token: room.players[0].token, seat: 0, room: snapshot(room) });
    });
    return true;
  }

  const code = String(parts[2]).toUpperCase();
  const room = rooms.get(code);
  const action = parts[3] || '';
  if (!room) { send(res, 404, { error: 'Aucune partie avec ce code.' }); return true; }

  // Flux en direct
  if (action === 'events' && req.method === 'GET') {
    const seat = seatOf(room, u.searchParams.get('t'));
    if (seat < 0) { send(res, 403, { error: 'Vous ne faites pas partie de ce salon.' }); return true; }
    const p = room.players[seat];
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // pas de mise en tampon derrière un proxy nginx
    });
    res.write('retry: 2500\n\n');
    if (p.conns.size >= MAX_CONNS) { const old = p.conns.values().next().value; p.conns.delete(old); old.end(); }
    p.conns.add(res);
    p.left = false;
    touch(room);
    broadcast(room);
    req.on('close', () => {
      p.conns.delete(res);
      touch(room);
      // court délai : un simple rechargement de page ne s'affiche pas « hors ligne »
      setTimeout(() => { if (!p.conns.size) broadcast(room); }, 4000).unref();
    });
    return true;
  }

  if (action === '' && req.method === 'GET') {
    if (seatOf(room, u.searchParams.get('t')) < 0) { send(res, 403, { error: 'Vous ne faites pas partie de ce salon.' }); return true; }
    send(res, 200, { room: snapshot(room) });
    return true;
  }

  if (req.method !== 'POST' || !['join', 'moves', 'rematch', 'leave'].includes(action)) {
    send(res, 404, { error: 'Introuvable.' });
    return true;
  }
  readJson(req, (body) => {
    if (!body) return send(res, 400, { error: 'Requête invalide.' });
    if (rooms.get(code) !== room) return send(res, 404, { error: 'Aucune partie avec ce code.' });
    const seat = seatOf(room, body.t);
    touch(room);

    if (action === 'join') {
      if (seat >= 0) return send(res, 200, { token: room.players[seat].token, seat, room: snapshot(room) }); // retour dans la partie
      if (room.players.length >= 2) return send(res, 409, { error: 'Cette partie a déjà deux joueurs.' });
      const p = player(body.name, 'Joueur 2');
      room.players.push(p);
      broadcast(room);
      return send(res, 200, { token: p.token, seat: 1, room: snapshot(room) });
    }

    if (seat < 0) return send(res, 403, { error: 'Vous ne faites pas partie de ce salon.' });

    if (action === 'moves') {
      if (Number(body.round) !== room.round) return send(res, 409, { error: 'Cette manche est terminée.', room: snapshot(room) });
      const moves = replay(room, body.moves);
      if (!moves) return send(res, 422, { error: 'Coup refusé.', room: snapshot(room) });
      room.players[seat].moves = moves;
      broadcast(room);
      return send(res, 200, { ok: true });
    }

    if (action === 'rematch') {
      if (Number(body.round) !== room.round) return send(res, 200, { ok: true }); // l'autre joueur l'a déjà lancée
      deal(room, body.same ? room.seed : null, room.recipes ? (body.same ? room.recipes : true) : false);
      broadcast(room);
      return send(res, 200, { ok: true });
    }

    // leave
    room.players[seat].left = true;
    for (const r of room.players[seat].conns) r.end();
    room.players[seat].conns.clear();
    if (room.players.every((p) => p.left)) rooms.delete(code);
    else broadcast(room);
    return send(res, 200, { ok: true });
  });
  return true;
}

// Battement régulier (garde les flux ouverts derrière les proxys) et ménage.
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    let conns = 0;
    for (const p of room.players) for (const r of p.conns) { r.write(': ping\n\n'); conns++; }
    if (!conns && now - room.touched > ROOM_TTL) rooms.delete(code);
  }
}, 25000).unref();

module.exports = { handle, rooms, _replay: replay };
