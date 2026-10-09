/*
 * Hortis — moteur de règles (partagé navigateur / Node).
 *
 * Règles implémentées (jeu solo de 9 cartes de Mark Tuck, éd. Origames) :
 *  - 18 cartes Verger de 2 × 3 cases : 5 arbres (orangers, citronniers,
 *    citronniers verts ; 1 ou 2 fruits) et 1 clairière.
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
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HortisCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TYPES = ['orange', 'citron', 'vert'];
  const TYPE_LABEL = { orange: 'Oranger', citron: 'Citronnier', vert: 'Citronnier vert' };
  const FRUIT_LABEL = { orange: 'Oranges', citron: 'Citrons jaunes', vert: 'Citrons verts' };
  const DICE_PER_TYPE = 5;
  const BASKET = 10;
  const BARROW = 15;
  const CARD_W = 2;
  const CARD_H = 3;
  const GAME_CARDS = 9;
  const HAND_SIZE = 2;

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

  // Les 18 cartes Verger : chaque essence est présente 30 fois (6 cartes avec
  // 1 arbre d'une essence, 12 avec 2), une clairière et un arbre double par carte.
  function buildCards() {
    const rng = mulberry32(20230127);
    const clearPositions = [5, 0, 3, 2, 4, 1];
    const cards = [];
    for (let i = 0; i < 18; i++) {
      const single = TYPES[i % 3];
      const others = TYPES.filter((t) => t !== single);
      const trees = shuffle([single, others[0], others[0], others[1], others[1]], rng);
      const dbl = Math.floor(rng() * 5);
      const cells = trees.map((t, j) => ({ k: 'tree', t, f: j === dbl ? 2 : 1 }));
      cells.splice(clearPositions[(i + Math.floor(i / 6)) % 6], 0, { k: 'clear' });
      cards.push({ id: i + 1, cells });
    }
    return cards;
  }

  const CARDS = buildCards();

  function cardById(id) {
    return CARDS[id - 1];
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
  // Variante « Recettes » : deux cartes, objectif = somme des deux nombres,
  // bonus si la condition est remplie en fin de partie.
  const RECIPES = [
    { id: 1, name: 'Marmelade', target: 22, bonus: 5, text: 'Avoir au moins un Panier d’oranges.', check: (s) => diceOf(s).some((d) => d.t === 'orange' && d.v >= BASKET) },
    { id: 2, name: 'Tarte au citron', target: 22, bonus: 5, text: 'Avoir au moins un Panier de citrons jaunes.', check: (s) => diceOf(s).some((d) => d.t === 'citron' && d.v >= BASKET) },
    { id: 3, name: 'Mojito', target: 22, bonus: 5, text: 'Avoir au moins un Panier de citrons verts.', check: (s) => diceOf(s).some((d) => d.t === 'vert' && d.v >= BASKET) },
    { id: 4, name: 'Jus pressé', target: 25, bonus: 6, text: 'Avoir 5 dés d’une même couleur dans le Verger.', check: (s) => TYPES.some((t) => diceOf(s).filter((d) => d.t === t && !d.barrow).length >= 5) },
    { id: 5, name: 'Corbeille variée', target: 20, bonus: 5, text: 'Avoir au moins 3 dés de chaque couleur.', check: (s) => TYPES.every((t) => diceOf(s).filter((d) => d.t === t).length >= 3) },
    { id: 6, name: 'Grande récolte', target: 28, bonus: 8, text: 'Placer le jeton Brouette.', check: (s) => diceOf(s).some((d) => d.barrow) },
    { id: 7, name: 'Pique-nique', target: 18, bonus: 4, text: 'Aucun dé perdu sur une clairière.', check: (s) => lostDice(s).length === 0 },
    { id: 8, name: 'Sorbet', target: 24, bonus: 5, text: 'Avoir 2 Paniers ou plus.', check: (s) => diceOf(s).filter((d) => d.v === BASKET).length >= 2 },
    { id: 9, name: 'Confiture', target: 20, bonus: 4, text: 'Ne pas utiliser l’Écureuil.', check: (s) => !s.squirrelUsed },
    { id: 10, name: 'Zeste', target: 18, bonus: 4, text: 'Avoir au moins 4 dés de valeur 6 ou plus.', check: (s) => diceOf(s).filter((d) => d.v >= 6).length >= 4 },
    { id: 11, name: 'Agrumes confits', target: 21, bonus: 5, text: 'Avoir au moins 10 dés dans le Verger.', check: (s) => diceOf(s).length >= 10 },
    { id: 12, name: 'Limonade', target: 23, bonus: 5, text: 'Les dés jaunes totalisent 20 ou plus.', check: (s) => sumType(s, 'citron') >= 20 },
    { id: 13, name: 'Orangeade', target: 23, bonus: 5, text: 'Les dés orange totalisent 20 ou plus.', check: (s) => sumType(s, 'orange') >= 20 },
    { id: 14, name: 'Citronnade verte', target: 23, bonus: 5, text: 'Les dés verts totalisent 20 ou plus.', check: (s) => sumType(s, 'vert') >= 20 },
    { id: 15, name: 'Verger compact', target: 19, bonus: 5, text: 'Le Verger tient dans un carré de 5 × 5 cases.', check: (s) => { const b = bounds(s); return b.maxX - b.minX < 5 && b.maxY - b.minY < 5; } },
    { id: 16, name: 'Grand verger', target: 19, bonus: 4, text: 'Le Verger s’étend sur au moins 8 cases dans une direction.', check: (s) => { const b = bounds(s); return b.maxX - b.minX >= 7 || b.maxY - b.minY >= 7; } },
    { id: 17, name: 'Clairières fleuries', target: 17, bonus: 4, text: 'Au moins 4 clairières visibles dans le Verger.', check: (s) => Object.values(s.board).filter((e) => e.cell.k === 'clear').length >= 4 },
    { id: 18, name: 'Salade de fruits', target: 26, bonus: 6, text: 'Avoir un dé de 6 ou plus dans chaque couleur.', check: (s) => TYPES.every((t) => diceOf(s).some((d) => d.t === t && d.v >= 6)) },
  ];

  function diceOf(state) {
    const out = [];
    for (const e of Object.values(state.board)) if (e.die && e.cell.k === 'tree') out.push(e.die);
    return out;
  }
  function lostDice(state) {
    const out = [];
    for (const e of Object.values(state.board)) if (e.die && e.cell.k === 'clear') out.push(e.die);
    return out;
  }
  function sumType(state, t) {
    return diceOf(state).filter((d) => d.t === t).reduce((a, d) => a + d.v, 0);
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
  function newGame(seed, opts) {
    opts = opts || {};
    seed = String(seed || randomSeed());
    const rng = mulberry32(hashSeed(seed));
    const ids = shuffle(CARDS.map((c) => c.id), rng).slice(0, GAME_CARDS);
    let recipes = null;
    if (opts.recipes) {
      const r = shuffle(RECIPES.map((x) => x.id), rng).slice(0, 2);
      recipes = r;
    }
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
      recipes,
      over: false,
      endReason: null,
      log: [],
    };
    // Carte de départ
    const start = footprint(cardById(ids[0]), 0);
    for (const c of start.cells) {
      state.board[key(c.x, c.y)] = { cell: c.cell, card: ids[0], die: null, squirrel: false };
    }
    state.placed.push({ id: ids[0], rot: 0, x: 0, y: 0 });
    state.log.push('Carte de départ n°' + ids[0] + ' posée.');
    return state;
  }

  function randomSeed() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  /**
   * Évalue la pose de la carte `id` (rotation `rot`) avec son coin haut-gauche
   * en (x, y). Ne modifie pas l'état.
   * Retourne { ok, reason, needsSquirrel, changes, reserve, barrowFree, overlaps }.
   */
  function evaluate(state, id, rot, x, y, opts) {
    opts = opts || {};
    const allowSquirrel = !!opts.allowSquirrel && !state.squirrelUsed;
    const fp = footprint(cardById(id), rot);
    const reserve = Object.assign({}, state.reserve);
    let barrowFree = state.barrowFree;
    let overlaps = 0;
    let squirrelAt = null;
    const changes = [];
    const notes = [];
    const fail = (reason, extra) => Object.assign({ ok: false, reason, changes, overlaps }, extra || {});

    for (const c of fp.cells) {
      const X = x + c.x, Y = y + c.y, k = key(X, Y);
      const ex = state.board[k];
      const nc = c.cell;
      let die = null;
      let squirrel = false;
      let event = null;
      if (ex) {
        overlaps++;
        if (ex.squirrel) return fail('L’Écureuil garde cet arbre : il ne peut plus être recouvert.');
        if (nc.k === 'clear') {
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
              else { event = 'nodie'; notes.push('Plus de dé ' + FRUIT_LABEL[nc.t].toLowerCase() + ' en réserve.'); }
            }
          } else {
            if (squirrelAt) return fail('L’Écureuil ne peut aider que sur un seul arbre.');
            if (!allowSquirrel) {
              return fail(
                state.squirrelUsed
                  ? 'Un ' + TYPE_LABEL[nc.t].toLowerCase() + ' ne peut pas recouvrir ' + (ex.cell.k === 'tree' ? 'un ' + TYPE_LABEL[below].toLowerCase() : 'un dé ' + below) + '.'
                  : 'Essences différentes : il faudrait l’aide de l’Écureuil.',
                { needsSquirrel: !state.squirrelUsed }
              );
            }
            squirrelAt = k;
            if (ex.die) {
              if (ex.die.barrow) barrowFree = true;
              else reserve[ex.die.t]++;
            }
            squirrel = true;
            event = 'squirrel';
          }
        }
      }
      changes.push({ k, x: X, y: Y, cell: nc, die, squirrel, covered: !!ex, event });
    }
    if (overlaps === 0) return fail('La carte doit recouvrir au moins une case de votre Verger.');
    return { ok: true, changes, reserve, barrowFree, overlaps, usesSquirrel: !!squirrelAt, notes };
  }

  function play(state, id, rot, x, y, opts) {
    if (state.over) return { ok: false, reason: 'La partie est terminée.' };
    if (!state.hand.includes(id)) return { ok: false, reason: 'Cette carte n’est pas dans votre main.' };
    const ev = evaluate(state, id, rot, x, y, opts);
    if (!ev.ok) return ev;
    for (const ch of ev.changes) {
      state.board[ch.k] = { cell: ch.cell, card: id, die: ch.die, squirrel: ch.squirrel };
    }
    state.reserve = ev.reserve;
    state.barrowFree = ev.barrowFree;
    if (ev.usesSquirrel) state.squirrelUsed = true;
    state.placed.push({ id, rot: rot & 3, x, y });
    state.hand = state.hand.filter((h) => h !== id);
    if (state.deck.length) state.hand.push(state.deck.shift());
    state.log.push('Carte n°' + id + ' posée.' + (ev.usesSquirrel ? ' (Écureuil)' : ''));
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
            out.push({ id, rot, x, y, usesSquirrel: ev.usesSquirrel });
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

  function score(state) {
    const byType = { orange: 0, citron: 0, vert: 0 };
    let barrow = 0;
    let lost = 0;
    for (const e of Object.values(state.board)) {
      if (!e.die) continue;
      if (e.cell.k === 'clear') { lost += e.die.v; continue; }
      if (e.die.barrow) barrow += e.die.v;
      else byType[e.die.t] += e.die.v;
    }
    const base = byType.orange + byType.citron + byType.vert + barrow;
    let bonus = 0;
    let target = null;
    const recipes = [];
    if (state.recipes) {
      target = 0;
      for (const rid of state.recipes) {
        const r = RECIPES[rid - 1];
        const done = !!r.check(state);
        target += r.target;
        if (done) bonus += r.bonus;
        recipes.push({ id: r.id, name: r.name, text: r.text, target: r.target, bonus: r.bonus, done });
      }
    }
    const total = base + bonus;
    return { byType, barrow, lost, base, bonus, total, target, recipes, won: target === null ? null : total >= target };
  }

  const RANKS = [
    { min: 0, title: 'Jeune pousse' },
    { min: 25, title: 'Jardinier du dimanche' },
    { min: 35, title: 'Arboriculteur' },
    { min: 45, title: 'Maître agrumiculteur' },
    { min: 55, title: 'Gardien d’Hortis' },
    { min: 65, title: 'Légende du verger' },
  ];
  function rank(total) {
    let r = RANKS[0];
    for (const x of RANKS) if (total >= x.min) r = x;
    return r.title;
  }

  return {
    TYPES, TYPE_LABEL, FRUIT_LABEL, DICE_PER_TYPE, BASKET, BARROW, CARD_W, CARD_H, GAME_CARDS,
    CARDS, RECIPES, RANKS,
    cardById, footprint, key, bounds, newGame, evaluate, play, legalMoves, hasAnyMove, score, rank,
    randomSeed, diceOf, lostDice,
  };
});
