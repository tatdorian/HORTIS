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
const end = (d, g) => A.onGameEnd(d, Object.assign({ mode: 'solo', result: null, first: true, now: 1000, hour: 14, day: '2026-10-10' }, g));

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
  const st = { board: {}, placed: [1, 2, 3, 4, 5, 6], barrowFree: true, squirrelUsed: false };
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
  if (st.endReason === 'complete') assert.ok(got.includes('verger_complet'));
  assert.strictEqual(got.includes('sans_filet'), st.endReason === 'complete' && !st.squirrelUsed && total >= 45);
  for (const a of A.LIST.filter((x) => x.score)) assert.strictEqual(!!d.unlocked[a.id], total >= a.score, a.id);
  assert.strictEqual(d.stats.games, 1);
  assert.strictEqual(d.stats.fruits, total);
  assert.strictEqual(d.stats.best, total);
  // même fin revue (rechargement juste après la fin) : pas de double comptage
  end(d, { states: [st], first: false });
  assert.strictEqual(d.stats.games, 1);
  assert.strictEqual(d.stats.fruits, total);
});

test('Sans filet, Impasse, Jardin zen, Oiseau de nuit, jours de jeu', () => {
  const d = A.newData();
  const st = playGame('17');
  end(d, { states: [st], hour: 3, day: '2026-10-10' });
  assert.ok(d.unlocked.oiseau_nuit);
  // Sans filet : 9 cartes, 45 fruits ou plus, sans l'Écureuil
  const fort = Object.assign({}, playGame('4242'));
  const okFort = fort.endReason === 'complete' && H.score(fort).total >= 45;
  assert.strictEqual(end(A.newData(), { states: [Object.assign({}, fort, { squirrelUsed: false })] }).includes('sans_filet'), okFort);
  assert.ok(!end(A.newData(), { states: [Object.assign({}, fort, { squirrelUsed: true })] }).includes('sans_filet'));
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

test('achievements difficiles et secrets : carré de six, corbeille royale, coup de chance, duo de choc', () => {
  const d = A.newData();
  const six = (t) => ({ die: { t, v: 6 } });
  let st = { board: { a: six('orange'), b: six('vert'), c: six('citron'), e: six('orange') }, placed: [1, 2, 3, 4, 5, 6], squirrelUsed: false, barrowFree: true };
  assert.deepStrictEqual(A.onMove(d, { state: st, res: { gain: 0, changes: [] } }).sort(), ['quatre_six', 'trois_six']);
  const bk = (t) => ({ die: { t, v: 10 } });
  st = { board: { a: bk('orange'), b: bk('vert'), c: bk('citron'), e: bk('orange'), f: { die: { t: 'vert', v: 15, barrow: true } } }, placed: [1, 2, 3], squirrelUsed: true, barrowFree: false };
  const got = A.onMove(d, { state: st, res: { gain: 4, changes: [{ event: 'basket' }] } });
  for (const id of ['cinq_paniers', 'panier_garni', 'coup_de_chance', 'duo_choc', 'premier_panier']) assert.ok(got.includes(id), id);
  // Panier formé à la 5e carte : pas de « coup de chance »
  const d2 = A.newData();
  assert.ok(!A.onMove(d2, { state: { board: {}, placed: [1, 2, 3, 4, 5], squirrelUsed: false, barrowFree: true }, res: { gain: 1, changes: [{ event: 'basket' }] } }).includes('coup_de_chance'));
});

test('fin de partie : sur le fil, monochrome, hésitant, lève-tôt, photo-finish, séries', () => {
  const st = playGame('4242', [13, 2]);
  const sc = H.score(st);
  // pile sur l'objectif : on ajuste l'objectif de la partie à son score
  const d = A.newData();
  const exact = Object.assign({}, st);
  const r1 = H.RECIPE_BY_ID[13];
  const keep = r1.target;
  r1.target = keep + (sc.total - sc.target);
  assert.ok(end(d, { states: [exact] }).includes('sur_le_fil'));
  r1.target = keep;
  // lève-tôt (6 h) ; hésitant (20 rotations) est un évènement de l'appli
  const got = end(A.newData(), { states: [st], hour: 6 });
  assert.ok(got.includes('leve_tot') && !got.includes('hesitant'));
  assert.deepStrictEqual(A.onEvent(A.newData(), 'hesitant', 1), ['hesitant']);
  // monochrome : un fruit à 40 ou plus
  assert.strictEqual(end(A.newData(), { states: [st] }).includes('monochrome'), H.TYPES.some((t) => sc.scored[t] >= 40));
  // photo-finish : victoire à distance d'un seul fruit
  assert.ok(end(A.newData(), { mode: 'online', states: [st], result: 'win', margin: 1 }).includes('photo_finish'));
  assert.ok(!end(A.newData(), { mode: 'online', states: [st], result: 'win', margin: 3 }).includes('photo_finish'));
  // séries : 5 victoires à distance d'affilée ; une défaite remet à zéro
  const d3 = A.newData();
  for (let i = 0; i < 4; i++) end(d3, { mode: 'online', states: [st], result: 'win' });
  end(d3, { mode: 'online', states: [st], result: 'lose' });
  assert.strictEqual(d3.stats.onlineStreak, 0);
  assert.ok(!d3.unlocked.imbattable);
  for (let i = 0; i < 5; i++) end(d3, { mode: 'online', states: [st], result: 'win' });
  assert.ok(d3.unlocked.imbattable);
  assert.strictEqual(d3.stats.onlineStreakBest, 5);
});

test('récompenses : chaque objet exclusif appartient à un achievement et se débloque avec lui', () => {
  const d = A.newData();
  assert.ok(A.REWARDS.length >= 15);
  const keys = new Set();
  for (const r of A.REWARDS) {
    assert.ok(['board', 'cards', 'dice', 'accent'].includes(r.kind), r.id);
    assert.ok(!keys.has(r.kind + ':' + r.id), 'doublon ' + r.id);
    keys.add(r.kind + ':' + r.id);
    assert.strictEqual(A.rewardOwner(r.kind, r.id), r.by);
    assert.ok(A.rewardLocked(d, r.kind, r.id));
  }
  assert.strictEqual(A.rewardOwner('board', 'oak'), null); // objets de base : jamais verrouillés
  assert.ok(!A.rewardLocked(d, 'board', 'oak'));
  end(d, { states: [playGame('4242')] }); // premier verger → fond « Damier »
  assert.ok(!A.rewardLocked(d, 'board', 'checker'));
  assert.strictEqual(A.summary(d).rewards >= 1, true);
});
