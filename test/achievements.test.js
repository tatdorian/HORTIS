// Succès : liste, déblocage pendant la partie et en fin de partie, compteurs.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const H = require('../public/core.js');
const A = require('../public/achievements.js');

// Partie jouée au meilleur coup jusqu'au bout.
function playGame(seed, recipes) {
  const st = H.newGame(seed, { recipes: recipes || false });
  while (!st.over) {
    const m = H.bestMove(st, st.hand);
    if (!m) break;
    H.play(st, m.id, m.rot, m.x, m.y, { allowSquirrel: true });
  }
  return st;
}
const end = (d, g) => A.onGameEnd(d, Object.assign({ mode: 'solo', result: null, undos: 0, first: true, now: 1000, hour: 14, day: '2026-10-10' }, g));

test('liste des succès : identifiants uniques, catégories, paliers et objectifs cohérents', () => {
  const ids = new Set(A.LIST.map((a) => a.id));
  assert.strictEqual(ids.size, A.LIST.length);
  assert.ok(A.LIST.length >= 40);
  const cats = new Set(A.CATEGORIES.map((c) => c[0]));
  for (const a of A.LIST) {
    assert.ok(cats.has(a.cat), a.id);
    assert.ok(A.TIERS[a.tier], a.id);
    assert.ok(a.name && a.desc && a.icon, a.id);
    if (a.stat) assert.ok(a.goal > 0, a.id);
  }
  assert.strictEqual(A.BONUS_RECIPES.length, 14);
  assert.strictEqual(A.BY_ID.grand_chef.goal, 14);
  assert.strictEqual(A.LIST.filter((a) => a.tier === 'platine').length, 1);
});

test('données abîmées ou anciennes : on repart proprement', () => {
  const d = A.normalize({ unlocked: { score_30: 5, inconnu: 3 }, stats: { games: '4', fruits: -2, recipeSet: [13, 99, 9] } });
  assert.deepStrictEqual(Object.keys(d.unlocked), ['score_30']);
  assert.strictEqual(d.stats.games, 4);
  assert.strictEqual(d.stats.fruits, 0);
  assert.deepStrictEqual(d.stats.recipeSet, [13]); // 9 est une recette ×2, 99 n'existe pas
  assert.deepStrictEqual(A.normalize('nimporte').unlocked, {});
});

test('pendant la partie : panier, brouette, écureuil, gros coup, triple six, panier garni', () => {
  const d = A.newData();
  const st = { board: {} };
  let got = A.onMove(d, { state: st, res: { gain: 3, changes: [{ event: 'basket' }] }, now: 1 });
  assert.deepStrictEqual(got, ['premier_panier']);
  got = A.onMove(d, { state: st, res: { gain: 16, changes: [{ event: 'barrow' }, { event: 'squirrel' }] }, now: 2 });
  assert.deepStrictEqual(got.sort(), ['brouette', 'coup_maitre', 'ecureuil']);
  const six = { t: 'orange', v: 6 };
  st.board = { a: { die: six }, b: { die: six }, c: { die: Object.assign({}, six, { t: 'vert' }) } };
  assert.deepStrictEqual(A.onMove(d, { state: st, res: { gain: 0, changes: [] } }), ['trois_six']);
  st.board = { a: { die: { t: 'orange', v: 10 } }, b: { die: { t: 'vert', v: 10 } }, c: { die: { t: 'citron', v: 15, barrow: true } } };
  assert.deepStrictEqual(A.onMove(d, { state: st, res: { gain: 0, changes: [] } }), ['panier_garni']);
  // déjà débloqués : rien de nouveau
  assert.deepStrictEqual(A.onMove(d, { state: st, res: { gain: 20, changes: [{ event: 'basket' }] } }), []);
});

test('fin de partie solo : succès de score, compteurs comptés une seule fois', () => {
  const d = A.newData();
  const st = playGame('4242');
  const total = H.score(st).total;
  const got = end(d, { states: [st] });
  assert.ok(got.includes('premier_verger'));
  if (st.endReason === 'complete') assert.ok(got.includes('verger_complet') && got.includes('sans_filet'));
  for (const a of A.LIST.filter((x) => x.score)) assert.strictEqual(!!d.unlocked[a.id], total >= a.score, a.id);
  assert.strictEqual(d.stats.games, 1);
  assert.strictEqual(d.stats.fruits, total);
  assert.strictEqual(d.stats.best, total);
  // même partie terminée à nouveau (après « Annuler ») : pas de double comptage
  end(d, { states: [st], first: false });
  assert.strictEqual(d.stats.games, 1);
  assert.strictEqual(d.stats.fruits, total);
});

test('Sans filet, Impasse, Jardin zen, Oiseau de nuit, jours de jeu', () => {
  const d = A.newData();
  const st = playGame('17');
  end(d, { states: [st], undos: 2, hour: 3, day: '2026-10-10' });
  assert.ok(!d.unlocked.sans_filet);
  assert.ok(d.unlocked.oiseau_nuit);
  end(d, { states: [st], day: '2026-10-10' });
  end(d, { states: [st], day: '2026-10-11' });
  assert.strictEqual(d.stats.days, 2);
  const blocked = Object.assign({}, st, { endReason: 'blocked' });
  assert.ok(end(d, { states: [blocked] }).includes('impasse'));
  const zen = H.newGame('1');
  zen.over = true;
  zen.endReason = 'complete';
  assert.ok(end(A.newData(), { states: [zen] }).includes('jardin_zen'));
});

test('Défi relevé : rejouer les mêmes cartes et faire mieux', () => {
  const d = A.newData();
  const good = playGame('555');
  const weak = H.newGame('555');
  weak.over = true;
  weak.endReason = 'blocked';
  assert.ok(!end(d, { states: [weak] }).includes('defi_releve')); // 1re fois sur ces cartes
  assert.ok(end(d, { states: [good] }).includes('defi_releve'));
});

test('recettes : premier dessert, deux étoiles, objectif, collection et compteur', () => {
  const d = A.newData();
  const st = playGame('4242', [13, 2]); // Panier de fruits + Cocktail de fruits
  const sc = H.score(st);
  const done = sc.recipes.filter((r) => !r.mult && r.done).map((r) => r.id);
  end(d, { states: [st] });
  assert.strictEqual(!!d.unlocked.premiere_recette, done.length > 0);
  assert.strictEqual(!!d.unlocked.deux_etoiles, done.length === 2);
  assert.strictEqual(!!d.unlocked.objectif, !!sc.won);
  assert.strictEqual(d.stats.recipes, done.length);
  assert.deepStrictEqual(d.stats.recipeSet.sort(), done.sort());
  // le compteur « Livre de recettes » se débloque à 10
  d.stats.recipes = 9;
  d.stats.recipeSet = [];
  assert.ok(!d.unlocked.livre_recettes);
  end(d, { states: [st] });
  assert.strictEqual(!!d.unlocked.livre_recettes, done.length > 0);
});

test('à plusieurs : à deux, à distance, victoire, égalité, revanche', () => {
  const d = A.newData();
  const a = playGame('31');
  assert.ok(end(d, { mode: 'duo', states: [a, a], result: 'tie' }).includes('egalite'));
  assert.ok(d.unlocked.duo);
  assert.strictEqual(d.stats.duoGames, 1);
  assert.strictEqual(d.stats.orchards, 2);
  let got = end(d, { mode: 'online', states: [a], result: 'lose' });
  assert.ok(got.includes('distance') && !got.includes('victoire_distance'));
  got = end(d, { mode: 'online', states: [a], result: 'win' });
  assert.ok(got.includes('victoire_distance'));
  assert.strictEqual(d.stats.onlineWins, 1);
  d.stats.onlineWins = 9;
  assert.ok(end(d, { mode: 'online', states: [a], result: 'win' }).includes('victoires_10'));
  assert.deepStrictEqual(A.onEvent(d, 'revanche', 5), ['revanche']);
  assert.deepStrictEqual(A.onEvent(d, 'revanche', 6), []);
});

test('platine : tous les autres succès débloquent « Maître d’Ortie » ; points', () => {
  const d = A.newData();
  for (const a of A.LIST) if (a.id !== 'maitre' && a.id !== 'styliste') d.unlocked[a.id] = 1;
  assert.ok(!d.unlocked.maitre);
  assert.deepStrictEqual(A.onEvent(d, 'styliste', 9), ['styliste', 'maitre']);
  const s = A.summary(d);
  assert.strictEqual(s.count, s.total);
  assert.strictEqual(s.pts, s.max);
  d.seenAt = 5;
  assert.strictEqual(A.summary(d).fresh, 2); // styliste et maitre, débloqués après la dernière visite
});
