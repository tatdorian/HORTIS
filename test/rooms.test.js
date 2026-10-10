// Parties à distance : salons, coups vérifiés, flux en direct, revanche.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const H = require('../public/core.js');
const rooms = require('../rooms.js');

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => { if (!rooms.handle(req, res)) { res.writeHead(404); res.end(); } });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}
const base = (srv) => 'http://127.0.0.1:' + srv.address().port + '/api/';
async function post(srv, path, body) {
  const r = await fetch(base(srv) + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json() };
}

// Lit les événements « room » d'un flux SSE.
function listen(srv, code, token) {
  const events = [];
  const waiters = [];
  const ctrl = new AbortController();
  fetch(base(srv) + 'rooms/' + code + '/events?t=' + encodeURIComponent(token), { signal: ctrl.signal }).then(async (r) => {
    const dec = new TextDecoder();
    let buf = '';
    for await (const chunk of r.body) {
      buf += dec.decode(chunk, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, i);
        buf = buf.slice(i + 2);
        const data = block.split('\n').find((l) => l.startsWith('data: '));
        if (block.includes('event: room') && data) {
          events.push(JSON.parse(data.slice(6)));
          while (waiters.length) waiters.shift()();
        }
      }
    }
  }).catch(() => {});
  return {
    events,
    async until(pred) {
      for (let k = 0; k < 50; k++) {
        const hit = events.find(pred);
        if (hit) return hit;
        await new Promise((res) => { waiters.push(res); setTimeout(res, 100); });
      }
      throw new Error('événement attendu non reçu');
    },
    close: () => ctrl.abort(),
  };
}

// Premier coup légal (le meilleur selon le moteur) depuis un état.
function bestMoves(seed, recipes, n) {
  const st = H.newGame(seed, { recipes: recipes || false });
  const out = [];
  for (let i = 0; i < n; i++) {
    const m = H.bestMove(st, st.hand);
    if (!m) break;
    H.play(st, m.id, m.rot, m.x, m.y, { allowSquirrel: true });
    out.push({ id: m.id, rot: m.rot, x: m.x, y: m.y });
  }
  return out;
}

test('salon : créer, rejoindre avec le code, jouer, revanche, quitter', async () => {
  const srv = await serve();
  try {
    const a = await post(srv, 'rooms', { name: 'Léa', recipes: true });
    assert.strictEqual(a.status, 200);
    assert.match(a.data.code, /^[A-HJ-NP-Z2-9]{4}$/);
    assert.strictEqual(a.data.seat, 0);
    assert.strictEqual(a.data.room.recipes.length, 2);
    const code = a.data.code;

    // code inconnu, puis code en minuscules accepté
    assert.strictEqual((await post(srv, 'rooms/ZZZZ/join', { name: 'Tom' })).status, 404);
    const sa = listen(srv, code, a.data.token);
    const b = await post(srv, 'rooms/' + code.toLowerCase() + '/join', { name: 'Tom' });
    assert.strictEqual(b.status, 200);
    assert.strictEqual(b.data.seat, 1);
    // l'hôte apprend en direct que Tom est arrivé
    const joined = await sa.until((s) => s.players.length === 2);
    assert.deepStrictEqual(joined.players.map((p) => p.name), ['Léa', 'Tom']);
    // un 3e joueur est refusé ; Tom retrouve sa place avec son jeton
    assert.strictEqual((await post(srv, 'rooms/' + code + '/join', { name: 'Zoé' })).status, 409);
    const again = await post(srv, 'rooms/' + code + '/join', { name: 'Tom', t: b.data.token });
    assert.strictEqual(again.data.seat, 1);

    // coups de Tom : vérifiés par le moteur puis relayés
    const room = a.data.room;
    const moves = bestMoves(room.seed, room.recipes, 3);
    const ok = await post(srv, 'rooms/' + code + '/moves', { t: b.data.token, round: room.round, moves });
    assert.strictEqual(ok.status, 200);
    const seen = await sa.until((s) => s.players[1] && s.players[1].moves.length === 3);
    assert.deepStrictEqual(seen.players[1].moves, moves);
    // coup impossible, mauvaise manche, jeton inconnu : refusés
    const bad = moves.slice(0, 1).concat([{ id: moves[0].id, rot: 0, x: 0, y: 0 }]);
    assert.strictEqual((await post(srv, 'rooms/' + code + '/moves', { t: b.data.token, round: room.round, moves: bad })).status, 422);
    assert.strictEqual((await post(srv, 'rooms/' + code + '/moves', { t: b.data.token, round: room.round + 1, moves })).status, 409);
    assert.strictEqual((await post(srv, 'rooms/' + code + '/moves', { t: 'faux', round: room.round, moves })).status, 403);

    // revanche : nouvelle manche, coups remis à zéro ; un 2e clic simultané ne relance pas
    await post(srv, 'rooms/' + code + '/rematch', { t: a.data.token, round: room.round, same: true });
    await post(srv, 'rooms/' + code + '/rematch', { t: b.data.token, round: room.round, same: true });
    const r2 = await sa.until((s) => s.round === room.round + 1);
    assert.strictEqual(r2.seed, room.seed);
    assert.deepStrictEqual(r2.players.map((p) => p.moves.length), [0, 0]);
    assert.strictEqual(rooms.rooms.get(code).round, room.round + 1);

    // Tom quitte : l'hôte le voit ; quand les deux sont partis, le salon disparaît
    await post(srv, 'rooms/' + code + '/leave', { t: b.data.token });
    await sa.until((s) => s.players[1] && s.players[1].left);
    sa.close();
    await post(srv, 'rooms/' + code + '/leave', { t: a.data.token });
    assert.ok(!rooms.rooms.has(code));
  } finally {
    srv.close();
    srv.closeAllConnections && srv.closeAllConnections();
  }
});

test('salon : les coups rejoués donnent le même verger chez les deux joueurs', () => {
  const seed = '4242';
  const recipes = [13, 2];
  const moves = bestMoves(seed, recipes, 8);
  const room = { seed, recipes };
  assert.deepStrictEqual(rooms._replay(room, moves), moves);
  assert.strictEqual(rooms._replay(room, moves.concat(moves)), null); // trop de coups
  assert.strictEqual(rooms._replay(room, [{ id: 'x' }]), null);
});
