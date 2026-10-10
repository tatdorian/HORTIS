/*
 * Ortie — moteur de règles (partagé navigateur / Node).
 *
 * Jeu solo de 9 cartes de Mark Tuck (éd. Origames) :
 *  - 18 cartes Verger de 3 × 2 cases : 5 arbres (orangers, citronniers jaunes,
 *    citronniers verts ; 1 ou 2 fruits) et 1 clairière portant le numéro.
 *  - Partie : 9 cartes. 1 carte de départ, 2 cartes en main, pioche de 6.
 *  - Tour : poser une carte (orientable à 90° / 180°) alignée sur la grille,
 *    qui recouvre au moins une case du Verger, puis piocher.
 *  - Arbre sur arbre de même essence : dé de la valeur des fruits des deux
 *    arbres (ou valeur du dé + fruits du nouvel arbre). Au-delà de 6 → Panier (10).
 *    Panier recouvert par la même essence → jeton Brouette (15), s'il est libre.
 *  - Clairière : recouvre n'importe quoi ; un dé recouvert y est déplacé sans
 *    changer de valeur. Une clairière vide accepte n'importe quel arbre.
 *    Un arbre peut recouvrir une clairière portant un dé de sa couleur.
 *  - Écureuil (1 fois) : recouvrir un arbre / dé d'une autre essence ; le dé
 *    retourne à la réserve et l'arbre ne pourra plus être recouvert.
 *  - Plus de dé en réserve → aucun dé placé.
 *  - Fin : 9e carte posée (ou aucun coup possible). Score = somme des dés sur
 *    des arbres ; un dé sur une clairière ne rapporte rien.
 *  - Recettes (verso des cartes) : 2 cartes, objectif = somme des nombres.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OrtieCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TYPES = ['orange', 'citron', 'vert'];
  const TYPE_LABEL = { orange: 'Oranger', citron: 'Citronnier', vert: 'Citronnier vert' };
  const FRUIT_LABEL = { orange: 'Oranges', citron: 'Citrons jaunes', vert: 'Citrons verts' };
  const DIE_LABEL = { orange: 'orange', citron: 'jaune', vert: 'vert' };
  const DICE_PER_TYPE = 5;
  const BASKET = 10;
  const BARROW = 15;
  const CARD_W = 3;
  const CARD_H = 2;
  const GAME_CARDS = 9;
  const HAND_SIZE = 2;

  // Les 18 cartes Verger, relevées sur le jeu : rangée du haut puis rangée du bas.
  // O = oranger, Y = citronnier jaune, G = citronnier vert, chiffre = nombre de fruits,
  // C = clairière (où est imprimé le numéro de la carte).
  const CARD_DATA = {
    1: 'Y2 C G1 / G1 O2 O1',
    2: 'G2 O1 O1 / C G1 Y2',
    3: 'O1 O2 Y1 / C G2 Y1',
    4: 'C Y1 G2 / Y1 G1 O2',
    5: 'O2 Y1 Y1 / C O1 G2',
    6: 'G2 O1 G1 / O1 C Y2',
    7: 'C G1 O1 / O2 Y2 G1',
    8: 'Y2 G1 G1 / C Y1 O2',
    9: 'O2 C Y1 / Y1 G2 G1',
    10: 'O2 C G1 / Y1 G1 Y2',
    11: 'G1 O2 C / G1 Y2 Y1',
    12: 'Y2 O1 G1 / O2 G1 C',
    13: 'C O1 Y1 / Y2 G2 O1',
    14: 'Y1 O2 G2 / G1 Y1 C',
    15: 'G2 Y1 O1 / Y2 O1 C',
    16: 'O2 Y1 O1 / Y1 C G2',
    17: 'O1 Y2 C / O1 G2 G1',
    18: 'G2 C O1 / O1 Y2 Y1',
  };
  const LETTER = { O: 'orange', Y: 'citron', G: 'vert' };

  const CARDS = Object.keys(CARD_DATA).map(Number).sort((a, b) => a - b).map((id) => ({
    id,
    cells: CARD_DATA[id].replace('/', ' ').split(/\s+/).filter(Boolean).map((c) =>
      c === 'C' ? { k: 'clear' } : { k: 'tree', t: LETTER[c[0]], f: Number(c[1]) }
    ),
  }));

  function cardById(id) {
    return CARDS[id - 1];
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }

  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Cases d'une carte après rotation (rot : 0..3, quarts de tour horaires).
  function footprint(card, rot) {
    const out = [];
    for (let oy = 0; oy < CARD_H; oy++) {
      for (let ox = 0; ox < CARD_W; ox++) {
        let x, y;
        switch (rot & 3) {
          case 0: x = ox; y = oy; break;
          case 1: x = CARD_H - 1 - oy; y = ox; break;
          case 2: x = CARD_W - 1 - ox; y = CARD_H - 1 - oy; break;
          default: x = oy; y = CARD_W - 1 - ox; break;
        }
        out.push({ x, y, cell: card.cells[oy * CARD_W + ox] });
      }
    }
    const odd = rot & 1;
    return { w: odd ? CARD_H : CARD_W, h: odd ? CARD_W : CARD_H, cells: out };
  }

  const key = (x, y) => x + ',' + y;

  // ---------------------------------------------------------------- Recettes
  // Recto/verso relevé sur le jeu : le numéro est celui de la carte Verger.
  // color : couleur de la pastille (null = recette commune).
  const RECIPES = [
    { id: 15, name: 'Citron vert confit', target: 26, color: 'vert', icon: 'jar', kind: 'first', t: 'vert', pts: 1, text: 'Jouez un <b>dé vert</b> lors de votre premier tour' },
    { id: 4, name: 'Confiture d’oranges', target: 26, color: 'orange', icon: 'jar', kind: 'first', t: 'orange', pts: 1, text: 'Jouez un <b>dé orange</b> lors de votre premier tour' },
    { id: 12, name: 'Crème de citron jaune', target: 26, color: 'citron', icon: 'jar', kind: 'first', t: 'citron', pts: 1, text: 'Jouez un <b>dé jaune</b> lors de votre premier tour' },
    { id: 11, name: 'Jus d’orange', target: 30, color: 'orange', icon: 'glass', kind: 'all5', t: 'orange', pts: 5, text: 'Les <b>5 dés orange</b> doivent être en jeu', small: 'sur des arbres ou des clairières' },
    { id: 17, name: 'Soda au citron', target: 30, color: 'citron', icon: 'glass', kind: 'all5', t: 'citron', pts: 5, text: 'Les <b>5 dés jaunes</b> doivent être en jeu', small: 'sur des arbres ou des clairières' },
    { id: 3, name: 'Sirop de citron vert', target: 30, color: 'vert', icon: 'glass', kind: 'all5', t: 'vert', pts: 5, text: 'Les <b>5 dés verts</b> doivent être en jeu', small: 'sur des arbres ou des clairières' },
    { id: 6, name: 'Gelée à l’orange', target: 31, color: 'orange', icon: 'jelly', kind: 'six', t: 'orange', pts: 6, text: 'Au moins <b>1 dé orange</b> doit avoir une valeur de 6', small: 'sur un arbre ou une clairière' },
    { id: 16, name: 'Tarte au citron meringuée', target: 31, color: 'citron', icon: 'pie', kind: 'six', t: 'citron', pts: 6, text: 'Au moins <b>1 dé jaune</b> doit avoir une valeur de 6', small: 'sur un arbre ou une clairière' },
    { id: 10, name: 'Gelée au citron vert', target: 31, color: 'vert', icon: 'jelly', kind: 'six', t: 'vert', pts: 6, text: 'Au moins <b>1 dé vert</b> doit avoir une valeur de 6', small: 'sur un arbre ou une clairière' },
    { id: 18, name: 'Liqueur à l’orange', target: 44, color: 'orange', icon: 'bottle', kind: 'double', t: 'orange', mult: 2, text: 'Tous <b>les dés orange</b> comptent double' },
    { id: 9, name: 'Liqueur au citron', target: 44, color: 'citron', icon: 'bottle', kind: 'double', t: 'citron', mult: 2, text: 'Tous <b>les dés jaunes</b> comptent double' },
    { id: 1, name: 'Tarte au citron vert', target: 44, color: 'vert', icon: 'pie', kind: 'double', t: 'vert', mult: 2, text: 'Tous <b>les dés verts</b> comptent double' },
    { id: 7, name: 'Punch', target: 40, color: null, icon: 'punch', kind: 'punch', mult: 2, text: '<b>Le fruit rapportant le moins de points</b> (avant application des bonus) compte double' },
    { id: 8, name: 'Cake aux fruits', target: 26, color: null, icon: 'cake', kind: 'cake', pts: 4, text: 'Au moins <b>1 clairière</b> doit être entourée <b>de 4 dés</b>', small: 'sur des arbres ou des clairières' },
    { id: 13, name: 'Panier de fruits', target: 27, color: null, icon: 'basket', kind: 'basket', pts: 3, text: 'Au moins <b>1 panier</b> doit être en jeu', small: 'sur un arbre ou une clairière · la Brouette compte aussi' },
    { id: 14, name: 'Salade de fruits', target: 28, color: null, icon: 'bowl', kind: 'salad', pts: 6, text: 'Au moins <b>3 dés d’un même fruit</b> doivent être placés sur des arbres/clairières adjacents' },
    { id: 2, name: 'Cocktail de fruits', target: 29, color: null, icon: 'cocktail', kind: 'cocktail', pts: 5, text: 'Les <b>15 dés</b> doivent être en jeu', small: 'sur des arbres ou des clairières' },
    { id: 5, name: 'Tutti Frutti', target: 35, color: null, icon: 'cone', kind: 'tutti', pts: 10, text: 'Au moins <b>4 dés de chaque couleur</b> doivent être en jeu', small: 'sur des arbres ou des clairières' },
  ];
  const RECIPE_BY_ID = {};
  for (const r of RECIPES) RECIPE_BY_ID[r.id] = r;

  // Dés en jeu (arbres et clairières). La Brouette est un jeton, pas un dé.
  function diceInPlay(state) {
    const out = [];
    for (const [k, e] of Object.entries(state.board)) if (e.die && !e.die.barrow) out.push(Object.assign({ k }, e.die));
    return out;
  }

  function neighbours(k) {
    const [x, y] = k.split(',').map(Number);
    return [key(x + 1, y), key(x - 1, y), key(x, y + 1), key(x, y - 1)];
  }

  function recipeDone(state, r) {
    const dice = diceInPlay(state);
    switch (r.kind) {
      case 'first': return (state.firstTurnDice || []).includes(r.t);
      case 'all5': return dice.filter((d) => d.t === r.t).length >= DICE_PER_TYPE;
      case 'six': return dice.some((d) => d.t === r.t && d.v === 6);
      // La Brouette est un Panier amélioré (Panier recouvert) : elle compte aussi.
      case 'basket': return Object.values(state.board).some((e) => e.die && (e.die.barrow || e.die.v === BASKET));
      case 'cocktail': return dice.length >= DICE_PER_TYPE * TYPES.length;
      case 'tutti': return TYPES.every((t) => dice.filter((d) => d.t === t).length >= 4);
      case 'cake':
        return Object.entries(state.board).some(([k, e]) =>
          e.cell.k === 'clear' && neighbours(k).every((n) => state.board[n] && state.board[n].die));
      case 'salad': {
        // groupe orthogonal d'au moins 3 dés de la même couleur
        const seen = new Set();
        for (const [k, e] of Object.entries(state.board)) {
          if (!e.die || seen.has(k)) continue;
          const t = e.die.t;
          let size = 0;
          const stack = [k];
          seen.add(k);
          while (stack.length) {
            const c = stack.pop();
            size++;
            for (const n of neighbours(c)) {
              const ne = state.board[n];
              if (ne && ne.die && ne.die.t === t && !seen.has(n)) { seen.add(n); stack.push(n); }
            }
          }
          if (size >= 3) return true;
        }
        return false;
      }
      default: return true; // recettes « compte double » : toujours appliquées
    }
  }

  // Où en est une recette : texte court + « final » quand le résultat ne peut plus changer.
  const COLOR_WORD = { orange: 'orange', citron: 'jaunes', vert: 'verts' };
  function recipeProgress(state, r) {
    const dice = diceInPlay(state);
    const of = (t) => dice.filter((d) => d.t === t);
    const final = !!state.over || (r.kind === 'first' && state.placed.length > 1);
    let text = '';
    let short = ''; // version très courte, pour la barre Recettes du plateau
    switch (r.kind) {
      case 'first':
        text = state.placed.length <= 1 ? 'à faire avec votre 1re carte posée' : (state.firstTurnDice || []).includes(r.t) ? 'fait au 1er tour' : 'pas de dé ' + DIE_LABEL[r.t] + ' au 1er tour';
        short = state.placed.length <= 1 ? '1er tour' : (state.firstTurnDice || []).includes(r.t) ? 'fait' : 'raté';
        break;
      case 'all5': text = of(r.t).length + '/5 dés ' + COLOR_WORD[r.t] + ' en jeu'; short = Math.min(of(r.t).length, 5) + '/5'; break;
      case 'six': {
        const vals = of(r.t).map((d) => d.v).sort((a, b) => a - b);
        text = vals.length ? 'dés ' + COLOR_WORD[r.t] + ' : ' + vals.map((v) => (v >= BASKET ? 'panier' : v)).join(', ') : 'aucun dé ' + DIE_LABEL[r.t] + ' en jeu';
        short = (vals.includes(6) ? 6 : Math.max(0, ...vals.filter((v) => v < 6))) + '/6';
        break;
      }
      case 'basket': {
        const n = Object.values(state.board).filter((e) => e.die && (e.die.barrow || e.die.v === BASKET)).length;
        text = n ? n + ' panier' + (n > 1 ? 's' : '') + ' en jeu (Brouette comprise)' : 'aucun panier en jeu';
        short = Math.min(n, 1) + '/1';
        break;
      }
      case 'cocktail': text = dice.length + '/15 dés en jeu'; short = Math.min(dice.length, 15) + '/15'; break;
      case 'tutti':
        text = TYPES.map((t) => DIE_LABEL[t] + ' ' + Math.min(of(t).length, 4) + '/4').join(' · ');
        short = Math.min(...TYPES.map((t) => Math.min(of(t).length, 4))) + '/4';
        break;
      case 'cake': {
        let best = 0;
        for (const [k, e] of Object.entries(state.board)) {
          if (e.cell.k !== 'clear') continue;
          best = Math.max(best, neighbours(k).filter((n) => state.board[n] && state.board[n].die).length);
        }
        text = 'meilleure clairière : ' + best + '/4 dés autour';
        short = best + '/4';
        break;
      }
      case 'salad': {
        let best = 0;
        const seen = new Set();
        for (const [k, e] of Object.entries(state.board)) {
          if (!e.die || seen.has(k)) continue;
          let size = 0; const stack = [k]; seen.add(k);
          while (stack.length) {
            const c = stack.pop(); size++;
            for (const n of neighbours(c)) { const ne = state.board[n]; if (ne && ne.die && ne.die.t === e.die.t && !seen.has(n)) { seen.add(n); stack.push(n); } }
          }
          best = Math.max(best, size);
        }
        text = 'plus grand groupe : ' + Math.min(best, 3) + '/3 dés';
        short = Math.min(best, 3) + '/3';
        break;
      }
      default: text = 'toujours appliquée'; short = '×2'; break;
    }
    return { text, short, final };
  }

  function bounds(state) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const k of Object.keys(state.board)) {
      const [x, y] = k.split(',').map(Number);
      if (x < minX) minX = x; if (y < minY) minY = y;
      if (x > maxX) maxX = x; if (y > maxY) maxY = y;
    }
    if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    return { minX, minY, maxX, maxY };
  }

  // ------------------------------------------------------------------- Partie
  /**
   * opts.recipes : true (tirage au hasard) ou tableau d'identifiants de cartes.
   * Les cartes servant de Recettes sont retirées de la pioche.
   */
  function newGame(seed, opts) {
    opts = opts || {};
    seed = String(seed || randomSeed());
    const rng = mulberry32(hashSeed(seed));
    let recipes = null;
    let pool = CARDS.map((c) => c.id);
    if (opts.recipes) {
      if (Array.isArray(opts.recipes) && opts.recipes.length) {
        recipes = opts.recipes.map(Number).filter((id) => RECIPE_BY_ID[id]).slice(0, 2);
      } else recipes = [];
      const rest = shuffle(pool.filter((id) => !recipes.includes(id)), mulberry32(hashSeed(seed + '#r')));
      while (recipes.length < 2) recipes.push(rest.shift());
      pool = pool.filter((id) => !recipes.includes(id));
    }
    const ids = shuffle(pool, rng).slice(0, GAME_CARDS);
    const state = {
      seed,
      cards: ids.slice(),
      deck: ids.slice(1 + HAND_SIZE),
      hand: ids.slice(1, 1 + HAND_SIZE),
      placed: [],
      board: {},
      reserve: { orange: DICE_PER_TYPE, citron: DICE_PER_TYPE, vert: DICE_PER_TYPE },
      barrowFree: true,
      squirrelUsed: false,
      firstTurnDice: null,
      recipes,
      over: false,
      endReason: null,
    };
    const start = footprint(cardById(ids[0]), 0);
    for (const c of start.cells) {
      state.board[key(c.x, c.y)] = { cell: c.cell, card: ids[0], die: null, squirrel: false };
    }
    state.placed.push({ id: ids[0], rot: 0, x: 0, y: 0 });
    return state;
  }

  function randomSeed() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  function describeTop(ex) {
    if (ex.cell.k === 'tree') return 'un ' + TYPE_LABEL[ex.cell.t].toLowerCase();
    return 'un dé ' + DIE_LABEL[ex.die.t];
  }

  /**
   * Évalue la pose de la carte `id` (rotation `rot`) avec son coin haut-gauche
   * en (x, y). Ne modifie pas l'état. Chaque case renvoie son effet ou son conflit.
   */
  function evaluate(state, id, rot, x, y, opts) {
    opts = opts || {};
    const allowSquirrel = !!opts.allowSquirrel && !state.squirrelUsed;
    const fp = footprint(cardById(id), rot);
    const reserve = Object.assign({}, state.reserve);
    let barrowFree = state.barrowFree;
    let overlaps = 0;
    let squirrelAt = null;
    let mismatches = 0;
    const changes = [];
    const conflicts = [];
    const notes = [];

    for (const c of fp.cells) {
      const X = x + c.x, Y = y + c.y, k = key(X, Y);
      const ex = state.board[k];
      const nc = c.cell;
      let die = null;
      let squirrel = false;
      let event = null;
      let conflict = null;
      if (ex) {
        overlaps++;
        if (ex.squirrel) {
          conflict = 'L’Écureuil garde cet arbre : il ne peut plus être recouvert.';
        } else if (nc.k === 'clear') {
          if (ex.die) { die = Object.assign({}, ex.die); event = 'move'; }
        } else {
          const below = ex.cell.k === 'tree' ? ex.cell.t : ex.die ? ex.die.t : null;
          if (below === null) {
            event = 'free';
          } else if (below === nc.t) {
            if (ex.die && ex.die.v >= BASKET) {
              if (ex.die.barrow) { die = Object.assign({}, ex.die); event = 'barrow-keep'; }
              else if (barrowFree) {
                barrowFree = false;
                reserve[ex.die.t]++;
                die = { t: nc.t, v: BARROW, barrow: true };
                event = 'barrow';
              } else { die = Object.assign({}, ex.die); event = 'basket-keep'; }
            } else {
              const base = ex.die ? ex.die.v : ex.cell.f;
              let v = base + nc.f;
              if (v > 6) v = BASKET;
              if (ex.die) { die = { t: nc.t, v }; event = v === BASKET ? 'basket' : 'up'; }
              else if (reserve[nc.t] > 0) { reserve[nc.t]--; die = { t: nc.t, v }; event = v === BASKET ? 'basket' : 'new'; }
              else { event = 'nodie'; notes.push('Plus de dé ' + DIE_LABEL[nc.t] + ' en réserve.'); }
            }
          } else {
            mismatches++;
            if (allowSquirrel && !squirrelAt) {
              squirrelAt = k;
              if (ex.die) {
                if (ex.die.barrow) barrowFree = true;
                else reserve[ex.die.t]++;
              }
              squirrel = true;
              event = 'squirrel';
            } else if (squirrelAt) {
              conflict = 'L’Écureuil ne peut aider que pour un seul arbre.';
            } else {
              conflict = 'Un ' + TYPE_LABEL[nc.t].toLowerCase() + ' ne peut pas recouvrir ' + describeTop(ex) + '.';
            }
          }
        }
      }
      if (conflict) conflicts.push({ k, x: X, y: Y, reason: conflict });
      changes.push({ k, x: X, y: Y, cell: nc, die, squirrel, covered: !!ex, event, conflict });
    }

    const base = { changes, overlaps, conflicts };
    if (overlaps === 0) return Object.assign(base, { ok: false, reason: 'La carte doit recouvrir au moins une case de votre Verger.' });
    if (conflicts.length) {
      const needsSquirrel = !allowSquirrel && !state.squirrelUsed && mismatches === 1 && conflicts.length === 1;
      return Object.assign(base, {
        ok: false,
        needsSquirrel,
        reason: needsSquirrel ? 'Essences différentes : il faudrait l’aide de l’Écureuil.' : conflicts[0].reason,
      });
    }
    return Object.assign(base, { ok: true, reserve, barrowFree, usesSquirrel: !!squirrelAt, notes, gain: gainOf(state, changes) });
  }

  // Fruits gagnés (dés sur des arbres) par une pose, sans les Recettes.
  function gainOf(state, changes) {
    let d = 0;
    for (const ch of changes) {
      const ex = state.board[ch.k];
      if (ex && ex.die && ex.cell.k === 'tree') d -= ex.die.v;
      if (ch.die && ch.cell.k === 'tree') d += ch.die.v;
    }
    return d;
  }

  const DIE_EVENTS = ['new', 'up', 'basket', 'barrow'];

  function play(state, id, rot, x, y, opts) {
    if (state.over) return { ok: false, reason: 'La partie est terminée.' };
    if (!state.hand.includes(id)) return { ok: false, reason: 'Cette carte n’est pas dans votre main.' };
    const ev = evaluate(state, id, rot, x, y, opts);
    if (!ev.ok) return ev;
    const firstTurn = state.placed.length === 1;
    for (const ch of ev.changes) {
      state.board[ch.k] = { cell: ch.cell, card: id, die: ch.die, squirrel: ch.squirrel };
    }
    if (firstTurn) {
      state.firstTurnDice = ev.changes.filter((c) => c.die && DIE_EVENTS.includes(c.event)).map((c) => c.die.t);
    }
    state.reserve = ev.reserve;
    state.barrowFree = ev.barrowFree;
    if (ev.usesSquirrel) state.squirrelUsed = true;
    state.placed.push({ id, rot: rot & 3, x, y });
    state.hand = state.hand.filter((h) => h !== id);
    if (state.deck.length) state.hand.push(state.deck.shift());
    if (state.placed.length >= GAME_CARDS || state.hand.length === 0) {
      state.over = true;
      state.endReason = 'complete';
    } else if (!hasAnyMove(state)) {
      state.over = true;
      state.endReason = 'blocked';
    }
    return ev;
  }

  function legalMoves(state, id, limit) {
    const b = bounds(state);
    const out = [];
    for (let rot = 0; rot < 4; rot++) {
      const fp = footprint(cardById(id), rot);
      for (let y = b.minY - fp.h + 1; y <= b.maxY; y++) {
        for (let x = b.minX - fp.w + 1; x <= b.maxX; x++) {
          const ev = evaluate(state, id, rot, x, y, { allowSquirrel: true });
          if (ev.ok) {
            out.push({ id, rot, x, y, usesSquirrel: ev.usesSquirrel, gain: ev.gain });
            if (limit && out.length >= limit) return out;
          }
        }
      }
    }
    return out;
  }

  function hasAnyMove(state) {
    return state.hand.some((id) => legalMoves(state, id, 1).length > 0);
  }

  // Meilleur coup immédiat (aide de jeu) : maximise les fruits, garde l'Écureuil.
  function bestMove(state, ids, rotFilter) {
    const b = bounds(state);
    const cx = (b.minX + b.maxX + 1) / 2, cy = (b.minY + b.maxY + 1) / 2;
    let best = null;
    for (const id of ids) {
      for (const m of legalMoves(state, id)) {
        if (rotFilter != null && m.rot !== rotFilter) continue;
        const fp = footprint(cardById(id), m.rot);
        const dist = Math.hypot(m.x + fp.w / 2 - cx, m.y + fp.h / 2 - cy);
        const val = m.gain - (m.usesSquirrel ? 6 : 0) - dist * 0.01;
        if (!best || val > best.val) best = Object.assign({ val }, m);
      }
    }
    return best;
  }

  function score(state) {
    const byType = { orange: 0, citron: 0, vert: 0 };
    let barrow = 0;
    let lost = 0;
    for (const e of Object.values(state.board)) {
      if (!e.die) continue;
      if (e.cell.k === 'clear') { lost += e.die.v; continue; }
      byType[e.die.t] += e.die.v;
      if (e.die.barrow) barrow += e.die.v;
    }
    const base = byType.orange + byType.citron + byType.vert;
    const mult = { orange: 1, citron: 1, vert: 1 };
    const recipes = [];
    let bonus = 0;
    let target = null;
    if (state.recipes) {
      target = 0;
      for (const rid of state.recipes) {
        const r = RECIPE_BY_ID[rid];
        target += r.target;
        const done = recipeDone(state, r);
        let effect = 0;
        let detail = '';
        if (r.kind === 'double') {
          mult[r.t] *= 2;
          detail = FRUIT_LABEL[r.t] + ' × 2';
        } else if (r.kind === 'punch') {
          const low = TYPES.slice().sort((a, b) => byType[a] - byType[b])[0];
          mult[low] *= 2;
          detail = FRUIT_LABEL[low] + ' × 2';
        } else if (done) {
          bonus += r.pts;
          effect = r.pts;
        }
        const prog = recipeProgress(state, r);
        recipes.push(Object.assign({}, r, { done, effect, detail, progress: prog.text, short: prog.short, final: prog.final }));
      }
    }
    const scored = {};
    let multiplied = 0;
    for (const t of TYPES) { scored[t] = byType[t] * mult[t]; multiplied += scored[t]; }
    const total = multiplied + bonus;
    return {
      byType, scored, mult, barrow, lost, base, bonus, total, target, recipes,
      won: target === null ? null : total >= target,
      dice: diceInPlay(state).length,
    };
  }

  const RANKS = [
    { min: 0, title: 'Jeune pousse' },
    { min: 20, title: 'Jardinier du dimanche' },
    { min: 30, title: 'Arboriculteur' },
    { min: 40, title: 'Maître agrumiculteur' },
    { min: 50, title: 'Gardien d’Ortie' },
    { min: 60, title: 'Légende du verger' },
  ];
  function rank(total) {
    let r = RANKS[0];
    for (const x of RANKS) if (total >= x.min) r = x;
    return r.title;
  }

  return {
    TYPES, TYPE_LABEL, FRUIT_LABEL, DIE_LABEL, DICE_PER_TYPE, BASKET, BARROW, CARD_W, CARD_H, GAME_CARDS,
    CARDS, RECIPES, RECIPE_BY_ID, RANKS,
    cardById, footprint, key, bounds, newGame, evaluate, play, legalMoves, hasAnyMove, bestMove, score, rank,
    randomSeed, diceInPlay, recipeDone, recipeProgress, gainOf,
  };
});
