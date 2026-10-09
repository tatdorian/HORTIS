'use strict';
const test = require('node:test');
const assert = require('node:assert');
const H = require('../public/core.js');

function blank() {
  return {
    seed: 't', cards: [], deck: [], hand: [], placed: [], board: {},
    reserve: { orange: 5, citron: 5, vert: 5 }, barrowFree: true, squirrelUsed: false,
    recipes: null, over: false, endReason: null, log: [],
  };
}
const tree = (t, f) => ({ k: 'tree', t, f: f || 1 });
const clear = () => ({ k: 'clear' });

test('18 cartes de 5 arbres + 1 clairière, 30 arbres par essence', () => {
  assert.strictEqual(H.CARDS.length, 18);
  const count = { orange: 0, citron: 0, vert: 0 };
  for (const c of H.CARDS) {
    assert.strictEqual(c.cells.length, 6);
    assert.strictEqual(c.cells.filter((x) => x.k === 'clear').length, 1);
    for (const x of c.cells) if (x.k === 'tree') count[x.t]++;
  }
  assert.deepStrictEqual(count, { orange: 30, citron: 30, vert: 30 });
});

test('rotation : empreinte 2x3 ↔ 3x2 et toutes les cases couvertes', () => {
  for (let r = 0; r < 4; r++) {
    const fp = H.footprint(H.CARDS[0], r);
    const keys = new Set(fp.cells.map((c) => c.x + ',' + c.y));
    assert.strictEqual(keys.size, 6);
    for (const c of fp.cells) assert.ok(c.x >= 0 && c.x < fp.w && c.y >= 0 && c.y < fp.h);
  }
  // 4 quarts de tour = identité ; 180° inverse la carte
  const f2 = H.footprint(H.CARDS[0], 2);
  assert.strictEqual(f2.cells[0].x, 1);
  assert.strictEqual(f2.cells[0].y, 2);
});

test('mise en place : 9 cartes, 2 en main, 6 en pioche, partie reproductible', () => {
  const a = H.newGame('1234');
  const b = H.newGame('1234');
  assert.deepStrictEqual(a.cards, b.cards);
  assert.strictEqual(a.cards.length, 9);
  assert.strictEqual(a.hand.length, 2);
  assert.strictEqual(a.deck.length, 6);
  assert.strictEqual(Object.keys(a.board).length, 6);
});

test('arbre sur arbre de même essence : dé = total des fruits ; >6 = Panier ; Panier recouvert = Brouette', () => {
  const s = blank();
  const id = 1;
  const card = H.cardById(id);
  const fp = H.footprint(card, 0);
  // place sous chaque case un arbre de même essence avec 1 fruit
  for (const c of fp.cells) s.board[c.x + ',' + c.y] = { cell: c.cell.k === 'tree' ? tree(c.cell.t, 1) : clear(), die: null, squirrel: false };
  const ev = H.evaluate(s, id, 0, 0, 0);
  assert.ok(ev.ok, ev.reason);
  for (const ch of ev.changes) {
    if (ch.cell.k === 'tree') assert.deepStrictEqual(ch.die, { t: ch.cell.t, v: ch.cell.f + 1 });
    else assert.strictEqual(ch.die, null);
  }

  const s2 = blank();
  const t0 = fp.cells.find((c) => c.cell.k === 'tree');
  // les autres cases : clairières vides (toujours recouvrables)
  for (const c of fp.cells) s2.board[c.x + ',' + c.y] = { cell: clear(), die: null, squirrel: false };
  s2.board[t0.x + ',' + t0.y] = { cell: tree(t0.cell.t), die: { t: t0.cell.t, v: 6 }, squirrel: false };
  let e = H.evaluate(s2, id, 0, 0, 0);
  assert.strictEqual(e.changes.find((c) => c.x === t0.x && c.y === t0.y).die.v, 10);
  s2.board[t0.x + ',' + t0.y].die.v = 10;
  e = H.evaluate(s2, id, 0, 0, 0);
  const d = e.changes.find((c) => c.x === t0.x && c.y === t0.y).die;
  assert.ok(d.barrow && d.v === 15);
  assert.strictEqual(e.barrowFree, false);
  s2.barrowFree = false;
  e = H.evaluate(s2, id, 0, 0, 0);
  assert.strictEqual(e.changes.find((c) => c.x === t0.x && c.y === t0.y).die.v, 10);
});

test('essences différentes interdites sans Écureuil ; Écureuil rend le dé et bloque la case', () => {
  const s = blank();
  const id = 1;
  const fp = H.footprint(H.cardById(id), 0);
  const t0 = fp.cells.find((c) => c.cell.k === 'tree');
  const other = H.TYPES.find((t) => t !== t0.cell.t);
  s.board[t0.x + ',' + t0.y] = { cell: tree(other), die: { t: other, v: 3 }, squirrel: false };
  s.reserve[other] = 4;
  let e = H.evaluate(s, id, 0, 0, 0);
  assert.ok(!e.ok && e.needsSquirrel);
  e = H.evaluate(s, id, 0, 0, 0, { allowSquirrel: true });
  assert.ok(e.ok && e.usesSquirrel);
  assert.strictEqual(e.reserve[other], 5);
  s.hand = [id, 2];
  H.play(s, id, 0, 0, 0, { allowSquirrel: true });
  assert.ok(s.squirrelUsed);
  assert.ok(s.board[t0.x + ',' + t0.y].squirrel);
  const e2 = H.evaluate(s, 2, 0, t0.x, t0.y);
  assert.ok(!e2.ok);
});

test('clairière : déplace le dé sans changer sa valeur, dé perdu au score', () => {
  const s = blank();
  const id = 1;
  const fp = H.footprint(H.cardById(id), 0);
  const cl = fp.cells.find((c) => c.cell.k === 'clear');
  s.board[cl.x + ',' + cl.y] = { cell: tree('orange'), die: { t: 'orange', v: 4 }, squirrel: false };
  const e = H.evaluate(s, id, 0, 0, 0);
  assert.ok(e.ok);
  assert.deepStrictEqual(e.changes.find((c) => c.k === cl.x + ',' + cl.y).die, { t: 'orange', v: 4 });
  s.hand = [id];
  H.play(s, id, 0, 0, 0);
  const sc = H.score(s);
  assert.strictEqual(sc.total, 0);
  assert.strictEqual(sc.lost, 4);
});

test('pose sans recouvrement interdite ; réserve vide = pas de dé', () => {
  const s = H.newGame('42');
  const e = H.evaluate(s, s.hand[0], 0, 10, 10);
  assert.ok(!e.ok);

  const s2 = blank();
  const fp = H.footprint(H.cardById(1), 0);
  const t0 = fp.cells.find((c) => c.cell.k === 'tree');
  s2.board[t0.x + ',' + t0.y] = { cell: tree(t0.cell.t), die: null, squirrel: false };
  s2.reserve[t0.cell.t] = 0;
  const e2 = H.evaluate(s2, 1, 0, 0, 0);
  assert.ok(e2.ok);
  assert.strictEqual(e2.changes.find((c) => c.x === t0.x && c.y === t0.y).die, null);
});

test('parties complètes aléatoires : jamais plus de 5 dés par couleur, fin à 9 cartes ou blocage', () => {
  for (let g = 0; g < 40; g++) {
    const s = H.newGame('sim' + g, { recipes: g % 2 === 0 });
    let guard = 0;
    while (!s.over && guard++ < 20) {
      const moves = s.hand.flatMap((id) => H.legalMoves(s, id));
      assert.ok(moves.length > 0);
      const m = moves[(g * 7 + guard * 13) % moves.length];
      const r = H.play(s, m.id, m.rot, m.x, m.y, { allowSquirrel: m.usesSquirrel });
      assert.ok(r.ok, r.reason);
      for (const t of H.TYPES) {
        const onBoard = Object.values(s.board).filter((e) => e.die && !e.die.barrow && e.die.t === t).length;
        assert.strictEqual(onBoard + s.reserve[t], 5);
      }
    }
    assert.ok(s.over);
    assert.ok(s.placed.length === 9 || s.endReason === 'blocked');
    const sc = H.score(s);
    assert.ok(Number.isFinite(sc.total));
  }
});
