'use strict';
const test = require('node:test');
const assert = require('node:assert');
const H = require('../public/core.js');

function blank() {
  return {
    seed: 't', cards: [], deck: [], hand: [], placed: [], board: {},
    reserve: { orange: 5, citron: 5, vert: 5 }, barrowFree: true, squirrelUsed: false,
    firstTurnDice: null, recipes: null, over: false, endReason: null,
  };
}
const tree = (t, f) => ({ k: 'tree', t, f: f || 1 });
const clear = () => ({ k: 'clear' });
const put = (s, x, y, cell, die) => { s.board[x + ',' + y] = { cell, die: die || null, squirrel: false }; };

test('18 vraies cartes : 5 arbres + 1 clairière, 7 fruits, 30 arbres et 42 fruits par essence', () => {
  assert.strictEqual(H.CARDS.length, 18);
  const trees = { orange: 0, citron: 0, vert: 0 };
  const fruits = { orange: 0, citron: 0, vert: 0 };
  for (const c of H.CARDS) {
    assert.strictEqual(c.cells.length, 6);
    assert.strictEqual(c.cells.filter((x) => x.k === 'clear').length, 1);
    let sum = 0;
    for (const x of c.cells) if (x.k === 'tree') { trees[x.t]++; fruits[x.t] += x.f; sum += x.f; }
    assert.strictEqual(sum, 7, 'carte ' + c.id);
  }
  assert.deepStrictEqual(trees, { orange: 30, citron: 30, vert: 30 });
  assert.deepStrictEqual(fruits, { orange: 42, citron: 42, vert: 42 });
});

test('18 recettes, une par carte', () => {
  assert.strictEqual(H.RECIPES.length, 18);
  assert.deepStrictEqual(H.RECIPES.map((r) => r.id).sort((a, b) => a - b), H.CARDS.map((c) => c.id));
});

test('rotation : empreinte 3x2 ↔ 2x3 et toutes les cases couvertes', () => {
  for (let r = 0; r < 4; r++) {
    const fp = H.footprint(H.CARDS[0], r);
    assert.deepStrictEqual([fp.w, fp.h], r % 2 ? [2, 3] : [3, 2]);
    const keys = new Set(fp.cells.map((c) => c.x + ',' + c.y));
    assert.strictEqual(keys.size, 6);
    for (const c of fp.cells) assert.ok(c.x >= 0 && c.x < fp.w && c.y >= 0 && c.y < fp.h);
  }
  const f2 = H.footprint(H.CARDS[0], 2);
  assert.deepStrictEqual([f2.cells[0].x, f2.cells[0].y], [2, 1]);
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

test('Recettes : 2 cartes retirées de la pioche, choix possible', () => {
  const g = H.newGame('77', { recipes: true });
  assert.strictEqual(g.recipes.length, 2);
  for (const r of g.recipes) assert.ok(!g.cards.includes(r));
  const g2 = H.newGame('77', { recipes: [7, 5] });
  assert.deepStrictEqual(g2.recipes, [7, 5]);
  assert.ok(!g2.cards.includes(7) && !g2.cards.includes(5));
  assert.strictEqual(H.score(g2).target, 75);
});

test('arbre sur arbre : total des fruits ; >6 = Panier ; Panier recouvert = Brouette', () => {
  const s = blank();
  const fp = H.footprint(H.cardById(1), 0);
  for (const c of fp.cells) put(s, c.x, c.y, c.cell.k === 'tree' ? tree(c.cell.t, 1) : clear());
  const ev = H.evaluate(s, 1, 0, 0, 0);
  assert.ok(ev.ok, ev.reason);
  for (const ch of ev.changes) {
    if (ch.cell.k === 'tree') assert.deepStrictEqual(ch.die, { t: ch.cell.t, v: ch.cell.f + 1 });
    else assert.strictEqual(ch.die, null);
  }
  assert.strictEqual(ev.gain, 12); // 7 fruits + 5 arbres recouverts

  const s2 = blank();
  const t0 = fp.cells.find((c) => c.cell.k === 'tree');
  for (const c of fp.cells) put(s2, c.x, c.y, clear());
  put(s2, t0.x, t0.y, tree(t0.cell.t), { t: t0.cell.t, v: 6 });
  let e = H.evaluate(s2, 1, 0, 0, 0);
  assert.strictEqual(e.changes.find((c) => c.k === t0.x + ',' + t0.y).die.v, 10);
  s2.board[t0.x + ',' + t0.y].die.v = 10;
  e = H.evaluate(s2, 1, 0, 0, 0);
  const d = e.changes.find((c) => c.k === t0.x + ',' + t0.y).die;
  assert.ok(d.barrow && d.v === 15);
  assert.strictEqual(e.barrowFree, false);
  s2.barrowFree = false;
  e = H.evaluate(s2, 1, 0, 0, 0);
  assert.strictEqual(e.changes.find((c) => c.k === t0.x + ',' + t0.y).die.v, 10);
});

test('essences différentes : conflit signalé par case ; Écureuil rend le dé et bloque la case', () => {
  const s = blank();
  const fp = H.footprint(H.cardById(1), 0);
  const t0 = fp.cells.find((c) => c.cell.k === 'tree');
  const other = H.TYPES.find((t) => t !== t0.cell.t);
  put(s, t0.x, t0.y, tree(other), { t: other, v: 3 });
  s.reserve[other] = 4;
  let e = H.evaluate(s, 1, 0, 0, 0);
  assert.ok(!e.ok && e.needsSquirrel);
  assert.strictEqual(e.conflicts.length, 1);
  e = H.evaluate(s, 1, 0, 0, 0, { allowSquirrel: true });
  assert.ok(e.ok && e.usesSquirrel);
  assert.strictEqual(e.reserve[other], 5);
  s.hand = [1, 2];
  s.placed = [{ id: 99, rot: 0, x: 0, y: 0 }, { id: 98, rot: 0, x: 0, y: 0 }];
  H.play(s, 1, 0, 0, 0, { allowSquirrel: true });
  assert.ok(s.squirrelUsed);
  assert.ok(s.board[t0.x + ',' + t0.y].squirrel);
  const e2 = H.evaluate(s, 2, 0, t0.x, t0.y, { allowSquirrel: true });
  assert.ok(!e2.ok);
});

test('clairière : déplace le dé sans changer sa valeur, dé perdu au score', () => {
  const s = blank();
  const fp = H.footprint(H.cardById(1), 0);
  const cl = fp.cells.find((c) => c.cell.k === 'clear');
  put(s, cl.x, cl.y, tree('orange'), { t: 'orange', v: 4 });
  const e = H.evaluate(s, 1, 0, 0, 0);
  assert.ok(e.ok);
  assert.deepStrictEqual(e.changes.find((c) => c.k === cl.x + ',' + cl.y).die, { t: 'orange', v: 4 });
  s.hand = [1];
  H.play(s, 1, 0, 0, 0);
  const sc = H.score(s);
  assert.strictEqual(sc.total, 0);
  assert.strictEqual(sc.lost, 4);
});

test('pose sans recouvrement interdite ; réserve vide = pas de dé', () => {
  const s = H.newGame('42');
  assert.ok(!H.evaluate(s, s.hand[0], 0, 10, 10).ok);

  const s2 = blank();
  const fp = H.footprint(H.cardById(1), 0);
  const t0 = fp.cells.find((c) => c.cell.k === 'tree');
  put(s2, t0.x, t0.y, tree(t0.cell.t));
  s2.reserve[t0.cell.t] = 0;
  const e2 = H.evaluate(s2, 1, 0, 0, 0);
  assert.ok(e2.ok);
  assert.strictEqual(e2.changes.find((c) => c.k === t0.x + ',' + t0.y).die, null);
});

test('recettes : conditions et multiplicateurs', () => {
  const s = blank();
  s.recipes = [18, 7]; // Liqueur à l'orange (x2 orange) + Punch (x2 fruit le plus faible)
  put(s, 0, 0, tree('orange'), { t: 'orange', v: 6 });
  put(s, 1, 0, tree('citron'), { t: 'citron', v: 3 });
  put(s, 2, 0, tree('vert'), { t: 'vert', v: 5 });
  let sc = H.score(s);
  assert.strictEqual(sc.target, 84);
  assert.strictEqual(sc.total, 6 * 2 + 3 * 2 + 5);

  const R = (id) => H.RECIPE_BY_ID[id];
  // Salade de fruits : 3 dés jaunes adjacents
  const s2 = blank();
  put(s2, 0, 0, tree('citron'), { t: 'citron', v: 2 });
  put(s2, 1, 0, clear(), { t: 'citron', v: 2 });
  put(s2, 1, 1, tree('citron'), { t: 'citron', v: 2 });
  assert.ok(H.recipeDone(s2, R(14)));
  delete s2.board['1,1'];
  assert.ok(!H.recipeDone(s2, R(14)));
  // Cake aux fruits : clairière entourée de 4 dés
  const s3 = blank();
  put(s3, 1, 1, clear());
  put(s3, 0, 1, tree('orange'), { t: 'orange', v: 2 });
  put(s3, 2, 1, tree('vert'), { t: 'vert', v: 2 });
  put(s3, 1, 0, tree('citron'), { t: 'citron', v: 2 });
  assert.ok(!H.recipeDone(s3, R(8)));
  put(s3, 1, 2, clear(), { t: 'citron', v: 3 });
  assert.ok(H.recipeDone(s3, R(8)));
  // Gelée : un dé de valeur exactement 6, même sur une clairière
  assert.ok(H.recipeDone({ board: { '0,0': { cell: clear(), die: { t: 'orange', v: 6 } } } }, R(6)));
  assert.ok(!H.recipeDone({ board: { '0,0': { cell: tree('orange'), die: { t: 'orange', v: 10 } } } }, R(6)));
  // Premier tour
  assert.ok(H.recipeDone({ board: {}, firstTurnDice: ['vert'] }, R(15)));
  assert.ok(!H.recipeDone({ board: {}, firstTurnDice: ['orange'] }, R(15)));
});

test('parties complètes aléatoires : dés conservés, fin à 9 cartes ou blocage', () => {
  for (let g = 0; g < 40; g++) {
    const s = H.newGame('sim' + g, { recipes: g % 2 === 0 });
    let guard = 0;
    while (!s.over && guard++ < 20) {
      const moves = s.hand.flatMap((id) => H.legalMoves(s, id));
      assert.ok(moves.length > 0);
      const m = g % 3 === 0 ? H.bestMove(s, s.hand) : moves[(g * 7 + guard * 13) % moves.length];
      const r = H.play(s, m.id, m.rot, m.x, m.y, { allowSquirrel: m.usesSquirrel });
      assert.ok(r.ok, r.reason);
      for (const t of H.TYPES) {
        const onBoard = Object.values(s.board).filter((e) => e.die && !e.die.barrow && e.die.t === t).length;
        assert.strictEqual(onBoard + s.reserve[t], 5);
      }
    }
    assert.ok(s.over);
    assert.ok(s.placed.length === 9 || s.endReason === 'blocked');
    assert.ok(Array.isArray(s.firstTurnDice));
    assert.ok(Number.isFinite(H.score(s).total));
  }
});

test('versions identiques : index.html (?v=), sw.js et app.js', () => {
  const fs = require('fs');
  const path = require('path');
  const pub = path.join(__dirname, '..', 'public');
  const html = fs.readFileSync(path.join(pub, 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(pub, 'sw.js'), 'utf8');
  const app = fs.readFileSync(path.join(pub, 'app.js'), 'utf8');
  const appV = /APP_VERSION = '([^']+)'/.exec(app)[1];
  const swV = /const VERSION = '([^']+)'/.exec(sw)[1];
  const htmlV = [...html.matchAll(/(?:style\.css|core\.js|achievements\.js|sound\.js|online\.js|app\.js|install\.js)\?v=([\w.]+)/g)].map((m) => m[1]);
  assert.strictEqual(htmlV.length, 7);
  for (const v of htmlV) assert.strictEqual(v, appV);
  assert.strictEqual(swV, appV);
});

test('Panier de fruits : un Panier OU la Brouette (Panier amélioré) valide la recette', () => {
  const R = H.RECIPE_BY_ID[13];
  const s = blank();
  put(s, 0, 0, tree('citron'), { t: 'citron', v: 6 });
  assert.ok(!H.recipeDone(s, R));
  s.board['0,0'].die = { t: 'citron', v: 10 };
  assert.ok(H.recipeDone(s, R));
  s.board['0,0'].die = { t: 'citron', v: 15, barrow: true }; // le Panier est devenu la Brouette
  assert.ok(H.recipeDone(s, R));
  s.recipes = [13, 9];
  const sc = H.score(s);
  assert.strictEqual(sc.bonus, 3);
  assert.strictEqual(sc.total, 15 * 2 + 3); // Liqueur au citron (x2) + bonus Panier de fruits
});

test('progression des recettes : texte lisible et résultat définitif', () => {
  const s = blank();
  s.placed = [{ id: 1 }];
  put(s, 0, 0, tree('orange'), { t: 'orange', v: 3 });
  put(s, 1, 0, tree('orange'), { t: 'orange', v: 6 });
  const p1 = H.recipeProgress(s, H.RECIPE_BY_ID[11]); // Jus d'orange
  assert.strictEqual(p1.text, '2/5 dés orange en jeu');
  assert.strictEqual(p1.final, false);
  const p2 = H.recipeProgress(s, H.RECIPE_BY_ID[15]); // Citron vert confit, avant le 1er coup
  assert.ok(/1re carte/.test(p2.text) && !p2.final);
  s.placed.push({ id: 2 });
  s.firstTurnDice = ['orange'];
  const p3 = H.recipeProgress(s, H.RECIPE_BY_ID[15]);
  assert.ok(p3.final && /pas de dé vert/.test(p3.text));
  assert.ok(H.recipeProgress(s, H.RECIPE_BY_ID[4]).text.startsWith('fait')); // Confiture d'oranges réussie
  s.over = true;
  assert.ok(H.recipeProgress(s, H.RECIPE_BY_ID[11]).final);
});

test('progression courte (barre Recettes du plateau)', () => {
  const s = blank();
  s.placed = [{ id: 1 }];
  put(s, 0, 0, tree('orange'), { t: 'orange', v: 3 });
  put(s, 1, 0, tree('orange'), { t: 'orange', v: 5 });
  put(s, 2, 0, tree('citron'), { t: 'citron', v: 6 });
  const short = (id) => H.recipeProgress(s, H.RECIPE_BY_ID[id]).short;
  assert.strictEqual(short(11), '2/5'); // Jus d'orange
  assert.strictEqual(short(6), '5/6'); // Gelée à l'orange : meilleur dé orange
  assert.strictEqual(short(16), '6/6'); // Tarte au citron meringuée
  assert.strictEqual(short(10), '0/6'); // aucun dé vert
  assert.strictEqual(short(2), '3/15'); // Cocktail de fruits
  assert.strictEqual(short(5), '0/4'); // Tutti Frutti : la couleur la moins avancée
  assert.strictEqual(short(14), '2/3'); // Salade : 2 oranges côte à côte
  assert.strictEqual(short(13), '0/1'); // Panier de fruits
  assert.strictEqual(short(15), '1er tour');
  assert.strictEqual(short(7), '×2'); // Punch
  // le score transmet aussi la version courte
  const sc = H.score(Object.assign(s, { recipes: [11, 7] }));
  assert.deepStrictEqual(sc.recipes.map((r) => r.short), ['2/5', '×2']);
});

test('Cake aux fruits : la progression désigne la clairière et le côté où il manque un dé', () => {
  // La situation signalée par un joueur : clairière de la carte 5 avec un dé
  // au-dessus, à gauche et en dessous, mais un arbre SANS dé à droite.
  const s = blank();
  put(s, 1, 1, clear());
  s.board['1,1'].card = 5;
  put(s, 1, 0, tree('vert'), { t: 'vert', v: 3 });
  put(s, 0, 1, tree('orange'), { t: 'orange', v: 5 });
  put(s, 1, 2, tree('orange'), { t: 'orange', v: 4 });
  put(s, 2, 1, tree('vert')); // arbre sans dé : ne compte pas
  put(s, 3, 3, clear()); // autre clairière, moins avancée
  s.board['3,3'].card = 18;
  const R = H.RECIPE_BY_ID[8];
  assert.ok(!H.recipeDone(s, R));
  let p = H.recipeProgress(s, R);
  assert.strictEqual(p.short, '3/4');
  assert.strictEqual(p.text, 'la clairière n° 5 : 3/4 dés autour · il manque un dé à droite');
  s.board['2,1'].die = { t: 'vert', v: 2 };
  assert.ok(H.recipeDone(s, R));
  p = H.recipeProgress(s, R);
  assert.strictEqual(p.text, 'la clairière n° 5 est entourée de 4 dés');
  // plusieurs côtés manquants ; clairière recouverte d'un dé
  const s2 = blank();
  put(s2, 0, 0, clear(), { t: 'citron', v: 3 });
  put(s2, 0, 1, tree('vert'), { t: 'vert', v: 1 });
  assert.strictEqual(H.recipeProgress(s2, R).text, 'la clairière sous le dé jaune : 1/4 dés autour · il manque des dés à droite, à gauche et au-dessus');
});
