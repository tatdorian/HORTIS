/* Hortis — interface (rendu SVG + interactions). */
(function () {
  'use strict';
  const H = window.HortisCore;
  const S = 100; // taille d'une case en unités SVG
  const SVGNS = 'http://www.w3.org/2000/svg';
  const STORE_KEY = 'hortis.save.v1';

  const TYPE_BG = { orange: '#fde3c2', citron: '#fbf1b6', vert: '#e0f0c2' };
  const TYPE_GROUND = { orange: '#e9c391', citron: '#e5d58a', vert: '#b9d68f' };
  const DIE_FILL = { orange: '#f28a1a', citron: '#f4cf1c', vert: '#76b83a' };
  const DIE_EDGE = { orange: '#a5520a', citron: '#a88a05', vert: '#3f7417' };
  const DIE_PIP = { orange: '#fffaf0', citron: '#4a3a06', vert: '#fffaf0' };

  const $ = (id) => document.getElementById(id);
  const els = {
    board: $('board'), hand: $('hand'), deck: $('deck'), deckCount: $('deck-count'), turnInfo: $('turn-info'),
    reserve: $('reserve'), barrow: $('tok-barrow'), squirrel: $('tok-squirrel'),
    scoreTotal: $('score-total'), scoreDetail: $('score-detail'), objective: $('objective'),
    recipes: $('recipes'), recipeList: $('recipe-list'), seed: $('seed-label'),
    hint: $('hint'), toast: $('toast'),
    btnUndo: $('btn-undo'), btnNew: $('btn-new'), btnRules: $('btn-rules'), btnPlace: $('btn-place'),
    btnRotL: $('btn-rot-l'), btnRotR: $('btn-rot-r'), btnSquirrel: $('btn-squirrel'),
    dlgNew: $('dlg-new'), dlgEnd: $('dlg-end'), dlgRules: $('dlg-rules'),
    inSeed: $('in-seed'), inRecipes: $('in-recipes'), endTitle: $('end-title'), endBody: $('end-body'),
  };

  let state = null;
  let history = [];
  const ui = { sel: null, rot: 0, pos: null, squirrel: false, view: null, endShown: false };

  // ------------------------------------------------------------- Graphismes
  function fruitUse(t, x, y, s) {
    return `<use href="#fruit-${t}" transform="translate(${x} ${y}) scale(${s})"/>`;
  }

  function treeArt(cell, uid) {
    const t = cell.t;
    const dbl = cell.f === 2;
    let g = `<rect x="3" y="3" width="94" height="94" rx="9" fill="${TYPE_BG[t]}"/>`;
    g += `<ellipse cx="50" cy="86" rx="${dbl ? 36 : 28}" ry="7" fill="${TYPE_GROUND[t]}"/>`;
    // petites touffes d'herbe
    g += `<path d="M14 88q2-6 4 0M19 89q1-5 3 0M80 88q2-6 4 0M85 89q1-4 3 0" stroke="#6b9a3c" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    // tronc
    g += `<path d="M45 86 C46 72 46 64 44 54 L56 54 C54 64 54 72 55 86 Z" fill="#8a5a2b" stroke="#5a3515" stroke-width="1.2"/>`;
    g += `<path d="M50 62 l-8 -8 M50 66 l7 -7" stroke="#5a3515" stroke-width="2.2" stroke-linecap="round"/>`;
    // couronne
    const crown = dbl ? 'url(#g-crown2)' : 'url(#g-crown)';
    const r = dbl ? 1.12 : 1;
    g += `<g transform="translate(50 40) scale(${r}) translate(-50 -40)" filter="url(#f-soft)">`;
    g += `<circle cx="34" cy="44" r="15" fill="${crown}"/><circle cx="66" cy="44" r="15" fill="${crown}"/>`;
    g += `<circle cx="50" cy="28" r="20" fill="${crown}"/><circle cx="50" cy="46" r="17" fill="${crown}"/>`;
    g += `<path d="M36 30q4-6 10-4M58 22q5 0 8 5" stroke="#9fd18a" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>`;
    g += `</g>`;
    if (dbl) {
      g += fruitUse(t, 37, 38, 1.55) + fruitUse(t, 63, 38, 1.55);
    } else {
      g += fruitUse(t, 50, 38, 1.75);
    }
    // nombre de fruits
    g += `<g transform="translate(84 15)"><circle r="9" fill="#fffaf0" stroke="${DIE_EDGE[t]}" stroke-width="1.6"/><text y="4" text-anchor="middle" class="fcount" fill="${DIE_EDGE[t]}">${cell.f}</text></g>`;
    return g;
  }

  function clearingArt(seed) {
    let g = `<rect x="3" y="3" width="94" height="94" rx="9" fill="url(#g-meadow)"/>`;
    g += `<rect x="9" y="9" width="82" height="82" rx="40" fill="none" stroke="#9cc46f" stroke-width="1.4" stroke-dasharray="3 5" opacity=".9"/>`;
    // touffes
    const tufts = [[22, 30], [72, 26], [30, 72], [76, 70], [52, 50]];
    for (const [x, y] of tufts) g += `<path d="M${x - 5} ${y + 4}q2-9 4-1q1-8 3 0q2-9 4 1" stroke="#5f8f33" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    // fleurs
    const flowers = [[38, 28, '#ffffff'], [64, 40, '#f8c2d6'], [24, 54, '#fff1a8'], [58, 74, '#ffffff'], [80, 52, '#c9d8ff']];
    flowers.forEach(([x, y, c], i) => {
      if ((seed + i) % 5 === 4) return;
      g += `<g transform="translate(${x} ${y})"><circle cx="0" cy="-3" r="2.6" fill="${c}"/><circle cx="3" cy="0" r="2.6" fill="${c}"/><circle cx="0" cy="3" r="2.6" fill="${c}"/><circle cx="-3" cy="0" r="2.6" fill="${c}"/><circle r="1.8" fill="#f2b31c"/></g>`;
    });
    g += `<ellipse cx="44" cy="84" rx="5" ry="3" fill="#b8ad98"/><ellipse cx="51" cy="86" rx="3.5" ry="2.2" fill="#a59a84"/>`;
    g += `<g transform="translate(70 84)"><rect x="-1.4" y="-4" width="2.8" height="6" fill="#f3e6cc"/><path d="M-6-4a6 5 0 0 1 12 0z" fill="#c94a3a"/><circle cx="-2" cy="-6" r=".9" fill="#fff"/><circle cx="2" cy="-5" r=".8" fill="#fff"/></g>`;
    g += `<text x="50" y="18" text-anchor="middle" class="clear-label">clairière</text>`;
    return g;
  }

  // Carte entière dans son orientation de base (200 × 300), coin haut-gauche en (0,0).
  function cardArt(card) {
    let g = `<rect x="1" y="1" width="198" height="298" rx="12" fill="url(#g-paper)" stroke="#8f7a55" stroke-width="2"/>`;
    card.cells.forEach((cell, i) => {
      const cx = (i % 2) * S, cy = Math.floor(i / 2) * S;
      g += `<g transform="translate(${cx} ${cy})">${cell.k === 'tree' ? treeArt(cell) : clearingArt(card.id + i)}</g>`;
    });
    g += `<g transform="translate(14 14)"><circle r="10" fill="#2f6b4f" stroke="#fffaf0" stroke-width="1.6"/><text y="4" text-anchor="middle" class="card-num">${card.id}</text></g>`;
    return g;
  }

  // Carte posée : (x, y) en cases, rotation en quarts de tour.
  function placedCardSvg(id, rot, x, y, extra) {
    const fp = H.footprint(H.cardById(id), rot);
    const cx = (x + fp.w / 2) * S, cy = (y + fp.h / 2) * S;
    return `<g class="card ${extra || ''}" transform="translate(${cx} ${cy}) rotate(${rot * 90}) translate(-100 -150)" filter="url(#f-shadow)">${cardArt(H.cardById(id))}</g>`;
  }

  function pips(v) {
    const p = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
    return p[v] || [];
  }

  function dieSvg(die, cx, cy, opts) {
    opts = opts || {};
    const sc = opts.scale || 1;
    if (die.barrow) {
      return `<g class="die" transform="translate(${cx} ${cy}) scale(${sc})" filter="url(#f-shadow)"><g transform="translate(-30 -30) scale(.94)"><use href="#barrow"/></g><g transform="translate(20 22)"><circle r="12" fill="#fffaf0" stroke="#6e4317" stroke-width="2"/><text y="5" text-anchor="middle" class="die-num">15</text></g></g>`;
    }
    const sz = 50;
    let g = `<g class="die${opts.lost ? ' lost' : ''}" transform="translate(${cx} ${cy}) scale(${sc})" filter="url(#f-shadow)">`;
    g += `<rect x="${-sz / 2}" y="${-sz / 2}" width="${sz}" height="${sz}" rx="10" fill="${DIE_FILL[die.t]}" stroke="${DIE_EDGE[die.t]}" stroke-width="2.5"/>`;
    g += `<rect x="${-sz / 2 + 4}" y="${-sz / 2 + 3}" width="${sz - 8}" height="${sz / 2 - 6}" rx="7" fill="#fff" opacity=".18"/>`;
    if (die.v >= H.BASKET) {
      g += `<g transform="translate(0 4) scale(.95)"><use href="#basket"/></g>`;
      g += `<g transform="translate(17 -17)"><circle r="10" fill="#fffaf0" stroke="${DIE_EDGE[die.t]}" stroke-width="1.8"/><text y="4.5" text-anchor="middle" class="die-num small">10</text></g>`;
    } else {
      for (const [px, py] of pips(die.v)) g += `<circle cx="${px * 12}" cy="${py * 12}" r="5" fill="${DIE_PIP[die.t]}"/>`;
    }
    if (opts.lost) g += `<path d="M-20-20L20 20M20-20L-20 20" stroke="#7a2e1a" stroke-width="5" stroke-linecap="round" opacity=".75"/>`;
    g += `</g>`;
    return g;
  }

  function squirrelSvg(cx, cy, sc) {
    return `<g class="tok" transform="translate(${cx} ${cy}) scale(${sc || 1})" filter="url(#f-shadow)"><g transform="translate(-26 -26) scale(.82)"><use href="#squirrel"/></g></g>`;
  }

  function cardBackSvg() {
    return `<rect x="1" y="1" width="198" height="298" rx="12" fill="url(#g-back)" stroke="#173a2b" stroke-width="2"/><rect x="12" y="12" width="176" height="276" rx="8" fill="url(#p-back)" stroke="#e9d9b0" stroke-width="2"/><g transform="translate(100 150)"><circle r="44" fill="#fffaf0" stroke="#e9d9b0" stroke-width="3"/><g transform="translate(-32 -34)"><use href="#logo-mark"/></g></g><text x="100" y="236" text-anchor="middle" class="back-title">HORTIS</text>`;
  }

  // ----------------------------------------------------------------- Rendu
  function computeView() {
    const b = H.bounds(state);
    let minX = b.minX - 2, minY = b.minY - 2, maxX = b.maxX + 3, maxY = b.maxY + 3;
    const minW = 8, minH = 7;
    if (maxX - minX < minW) { const d = minW - (maxX - minX); minX -= Math.floor(d / 2); maxX += Math.ceil(d / 2); }
    if (maxY - minY < minH) { const d = minH - (maxY - minY); minY -= Math.floor(d / 2); maxY += Math.ceil(d / 2); }
    ui.view = { minX, minY, maxX, maxY };
  }

  function renderBoard() {
    const v = ui.view;
    const vb = [v.minX * S, v.minY * S, (v.maxX - v.minX) * S, (v.maxY - v.minY) * S];
    els.board.setAttribute('viewBox', vb.join(' '));
    let g = '';
    // points de grille
    g += `<g class="grid">`;
    for (let y = v.minY; y <= v.maxY; y++) for (let x = v.minX; x <= v.maxX; x++) g += `<circle cx="${x * S}" cy="${y * S}" r="3"/>`;
    g += `</g>`;
    for (const p of state.placed) g += placedCardSvg(p.id, p.rot, p.x, p.y);
    // jetons au-dessus des cartes
    for (const [k, e] of Object.entries(state.board)) {
      const [x, y] = k.split(',').map(Number);
      const cx = x * S + S / 2, cy = y * S + S / 2;
      if (e.die) g += dieSvg(e.die, cx, cy, { lost: e.cell.k === 'clear' && state.over, scale: e.cell.k === 'clear' ? 0.8 : 1 });
      if (e.squirrel) g += squirrelSvg(cx, cy, 1);
    }
    // dernière carte posée
    if (state.placed.length > 1) {
      const last = state.placed[state.placed.length - 1];
      const fp = H.footprint(H.cardById(last.id), last.rot);
      g += `<rect class="last" x="${last.x * S + 2}" y="${last.y * S + 2}" width="${fp.w * S - 4}" height="${fp.h * S - 4}" rx="12"/>`;
    }
    g += `<g id="ghost"></g>`;
    els.board.innerHTML = g;
    renderGhost();
  }

  function currentEval() {
    if (ui.sel == null || !ui.pos) return null;
    return H.evaluate(state, ui.sel, ui.rot, ui.pos.x, ui.pos.y, { allowSquirrel: ui.squirrel });
  }

  const EVENT_TXT = { new: 'Nouveau dé', up: '+', basket: 'Panier !', barrow: 'Brouette !', move: 'Dé déplacé', 'basket-keep': 'Panier', 'barrow-keep': 'Brouette', nodie: 'Plus de dé', squirrel: 'Écureuil' };

  function renderGhost() {
    const host = els.board.querySelector('#ghost');
    if (!host) return;
    if (ui.sel == null || !ui.pos || state.over) { host.innerHTML = ''; updateHint(null); return; }
    const ev = currentEval();
    const fp = H.footprint(H.cardById(ui.sel), ui.rot);
    let g = `<g class="ghost-card">${placedCardSvg(ui.sel, ui.rot, ui.pos.x, ui.pos.y)}</g>`;
    g += `<rect class="ghost-frame ${ev.ok ? 'ok' : 'bad'}" x="${ui.pos.x * S}" y="${ui.pos.y * S}" width="${fp.w * S}" height="${fp.h * S}" rx="12"/>`;
    for (const ch of ev.changes) {
      if (!ch.covered) continue;
      const cx = ch.x * S + S / 2, cy = ch.y * S + S / 2;
      if (ch.die) g += `<g class="ghost-die">${dieSvg(ch.die, cx, cy, { scale: ch.cell.k === 'clear' ? 0.62 : 0.72 })}</g>`;
      if (ch.squirrel) g += `<g class="ghost-die">${squirrelSvg(cx, cy, 0.8)}</g>`;
      const label = ch.event && ch.event !== 'free' ? EVENT_TXT[ch.event] : null;
      if (label && ev.ok) {
        const txt = ch.event === 'up' ? '→ ' + ch.die.v : label;
        g += `<g class="bubble" transform="translate(${cx} ${ch.y * S + 14})"><rect x="-46" y="-11" width="92" height="22" rx="11"/><text y="4" text-anchor="middle">${txt}</text></g>`;
      }
    }
    host.innerHTML = g;
    updateHint(ev);
  }

  function updateHint(ev) {
    els.btnPlace.disabled = !(ev && ev.ok);
    if (state.over) { els.hint.textContent = 'Partie terminée.'; els.hint.className = 'hint'; return; }
    if (ui.sel == null) { els.hint.textContent = 'Choisissez une carte de votre main (touche 1 ou 2).'; els.hint.className = 'hint'; return; }
    if (!ev) { els.hint.textContent = 'Placez la carte sur le verger. R / Q ou la molette pour la pivoter.'; els.hint.className = 'hint'; return; }
    if (ev.ok) {
      const gain = ev.changes.filter((c) => c.covered && c.die && c.cell.k === 'tree').length;
      let msg = 'Pose valide';
      msg += ev.usesSquirrel ? ' avec l’Écureuil.' : '.';
      if (ev.notes && ev.notes.length) msg += ' ' + ev.notes.join(' ');
      const delta = previewDelta(ev);
      msg += `  Récolte : ${delta >= 0 ? '+' : ''}${delta}`;
      els.hint.textContent = msg + (gain ? '' : '');
      els.hint.className = 'hint ok';
    } else {
      els.hint.textContent = ev.reason;
      els.hint.className = 'hint bad';
    }
  }

  function previewDelta(ev) {
    const before = H.score(state).base;
    const tmp = JSON.parse(JSON.stringify(state));
    for (const ch of ev.changes) tmp.board[ch.k] = { cell: ch.cell, card: ui.sel, die: ch.die, squirrel: ch.squirrel };
    return H.score(tmp).base - before;
  }

  function miniCardSvg(id, rot, cls) {
    const fp = H.footprint(H.cardById(id), rot);
    return `<svg class="${cls || ''}" viewBox="-6 -6 ${fp.w * S + 12} ${fp.h * S + 12}" xmlns="${SVGNS}">${placedCardSvg(id, rot, 0, 0)}</svg>`;
  }

  function renderHand() {
    els.hand.innerHTML = '';
    state.hand.forEach((id, i) => {
      const b = document.createElement('button');
      b.className = 'hand-card' + (ui.sel === id ? ' selected' : '');
      b.setAttribute('aria-label', 'Carte n°' + id);
      const rot = ui.sel === id ? ui.rot : 0;
      b.innerHTML = miniCardSvg(id, rot) + `<span class="key">${i + 1}</span>`;
      b.addEventListener('click', () => selectCard(id));
      els.hand.appendChild(b);
    });
    if (!state.hand.length) els.hand.innerHTML = '<div class="empty-hand">Toutes les cartes sont jouées.</div>';
  }

  function renderSide() {
    const sc = H.score(state);
    els.scoreTotal.textContent = sc.total;
    els.seed.textContent = state.seed;
    const row = (t) => `<div class="srow"><span class="sw" style="background:${DIE_FILL[t]}"></span>${H.FRUIT_LABEL[t]}<b>${sc.byType[t]}</b></div>`;
    let d = H.TYPES.map(row).join('');
    if (sc.barrow) d += `<div class="srow"><span class="sw wood"></span>Brouette<b>${sc.barrow}</b></div>`;
    if (sc.lost) d += `<div class="srow lost"><span class="sw rot"></span>Sur clairière (perdu si la partie s’arrête)<b>${sc.lost}</b></div>`;
    if (sc.bonus) d += `<div class="srow"><span class="sw star"></span>Bonus Recettes<b>+${sc.bonus}</b></div>`;
    els.scoreDetail.innerHTML = d;
    if (sc.target != null) {
      els.objective.hidden = false;
      els.objective.innerHTML = `Objectif : <b>${sc.target}</b> fruits ${sc.total >= sc.target ? '✔' : ''}`;
    } else els.objective.hidden = true;

    // réserve
    let r = '';
    const onBoard = { orange: 0, citron: 0, vert: 0 };
    for (const e of Object.values(state.board)) if (e.die && !e.die.barrow) onBoard[e.die.t]++;
    for (const t of H.TYPES) {
      r += `<div class="res-row" title="${H.FRUIT_LABEL[t]} : ${state.reserve[t]} dé(s) en réserve"><svg viewBox="0 0 330 60">`;
      for (let i = 0; i < H.DICE_PER_TYPE; i++) {
        const used = i >= state.reserve[t];
        r += `<g opacity="${used ? 0.22 : 1}">${dieSvg({ t, v: 1 + (i % 6) }, 34 + i * 62, 30, { scale: 0.92 })}</g>`;
      }
      r += `</svg></div>`;
    }
    els.reserve.innerHTML = r;
    els.barrow.innerHTML = `<svg viewBox="0 0 64 64" class="${state.barrowFree ? '' : 'used'}"><use href="#barrow"/></svg><span>Brouette<br><small>${state.barrowFree ? 'disponible' : 'en jeu'}</small></span>`;
    els.squirrel.innerHTML = `<svg viewBox="0 0 64 64" class="${state.squirrelUsed ? 'used' : ''}"><use href="#squirrel"/></svg><span>Écureuil<br><small>${state.squirrelUsed ? 'utilisé' : 'disponible'}</small></span>`;
    els.btnSquirrel.disabled = state.squirrelUsed || state.over;
    if (state.squirrelUsed) ui.squirrel = false;
    els.btnSquirrel.setAttribute('aria-pressed', ui.squirrel ? 'true' : 'false');

    // pioche
    const n = state.deck.length;
    els.deckCount.textContent = n;
    let dk = '';
    for (let i = Math.min(n, 4) - 1; i >= 0; i--) dk += `<svg class="back" style="--i:${i}" viewBox="0 0 200 300">${cardBackSvg()}</svg>`;
    els.deck.innerHTML = dk || '<div class="deck-empty">vide</div>';
    els.turnInfo.textContent = `Carte ${Math.min(state.placed.length + 1, H.GAME_CARDS)} / ${H.GAME_CARDS}`;

    // recettes
    if (sc.recipes.length) {
      els.recipes.hidden = false;
      els.recipeList.innerHTML = sc.recipes.map((r) => `<div class="recipe ${r.done ? 'done' : ''}"><div class="rhead"><b>${r.name}</b><span class="rt">${r.target}</span></div><p>${r.text}</p><div class="rb">Bonus +${r.bonus} ${r.done ? '✔' : ''}</div></div>`).join('');
    } else els.recipes.hidden = true;

    els.btnUndo.disabled = history.length === 0;
  }

  function renderAll() {
    renderBoard();
    renderHand();
    renderSide();
  }

  // ------------------------------------------------------------ Interactions
  function selectCard(id) {
    if (state.over) return;
    if (ui.sel === id) { ui.sel = null; ui.pos = null; }
    else { ui.sel = id; ui.rot = 0; }
    renderHand();
    renderGhost();
  }

  function rotate(d) {
    if (ui.sel == null) return;
    const oldFp = H.footprint(H.cardById(ui.sel), ui.rot);
    ui.rot = (ui.rot + d + 4) & 3;
    if (ui.pos) {
      // garder la carte centrée au même endroit
      const nf = H.footprint(H.cardById(ui.sel), ui.rot);
      const cx = ui.pos.x + oldFp.w / 2, cy = ui.pos.y + oldFp.h / 2;
      ui.pos = { x: Math.round(cx - nf.w / 2), y: Math.round(cy - nf.h / 2) };
    }
    renderHand();
    renderGhost();
  }

  function boardPoint(evt) {
    const pt = els.board.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const m = els.board.getScreenCTM();
    if (!m) return null;
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x / S, y: p.y / S };
  }

  function setPosFromEvent(evt) {
    if (ui.sel == null) return false;
    const p = boardPoint(evt);
    if (!p) return false;
    const fp = H.footprint(H.cardById(ui.sel), ui.rot);
    const pos = { x: Math.round(p.x - fp.w / 2), y: Math.round(p.y - fp.h / 2) };
    if (ui.pos && ui.pos.x === pos.x && ui.pos.y === pos.y) return false;
    ui.pos = pos;
    renderGhost();
    return true;
  }

  function place() {
    if (ui.sel == null || !ui.pos || state.over) return;
    const ev = currentEval();
    if (!ev.ok) { toast(ev.reason, 'bad'); return; }
    history.push(JSON.stringify({ state, ui: { rot: ui.rot } }));
    const res = H.play(state, ui.sel, ui.rot, ui.pos.x, ui.pos.y, { allowSquirrel: ui.squirrel });
    const evs = res.changes.map((c) => c.event);
    if (evs.includes('barrow')) toast('La Brouette entre en jeu : 15 fruits !', 'gold');
    else if (evs.includes('basket')) toast('Panier ! Ce dé vaut désormais 10.', 'gold');
    else if (evs.includes('squirrel')) toast('L’Écureuil garde désormais cet arbre.', '');
    ui.sel = null; ui.pos = null; ui.squirrel = false;
    computeView();
    save();
    renderAll();
    if (state.over) setTimeout(showEnd, 450);
  }

  function undo() {
    if (!history.length) return;
    const snap = JSON.parse(history.pop());
    state = snap.state;
    ui.sel = null; ui.pos = null; ui.squirrel = false; ui.endShown = false;
    computeView();
    save();
    renderAll();
  }

  let toastTimer = null;
  function toast(msg, kind) {
    els.toast.textContent = msg;
    els.toast.className = 'toast show ' + (kind || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { els.toast.className = 'toast'; }, 2600);
  }

  function showEnd() {
    if (ui.endShown) return;
    ui.endShown = true;
    const sc = H.score(state);
    els.endTitle.textContent = state.endReason === 'blocked' ? 'Le verger est bloqué !' : 'Récolte terminée !';
    let b = '';
    if (state.endReason === 'blocked') b += `<p class="note">Aucune carte de votre main ne peut plus être posée : la partie s’arrête.</p>`;
    b += `<div class="end-score"><span>${sc.total}</span> fruits</div>`;
    b += `<div class="rank">${H.rank(sc.total)}</div>`;
    b += `<table class="end-table">`;
    for (const t of H.TYPES) b += `<tr><td><span class="sw" style="background:${DIE_FILL[t]}"></span>${H.FRUIT_LABEL[t]}</td><td>${sc.byType[t]}</td></tr>`;
    if (sc.barrow) b += `<tr><td><span class="sw wood"></span>Brouette</td><td>${sc.barrow}</td></tr>`;
    if (sc.lost) b += `<tr class="lost"><td><span class="sw rot"></span>Fruits pourris sur les clairières</td><td>0 <small>(${sc.lost})</small></td></tr>`;
    for (const r of sc.recipes) b += `<tr><td>Recette « ${r.name} » ${r.done ? '✔' : '✘'}</td><td>${r.done ? '+' + r.bonus : '0'}</td></tr>`;
    b += `<tr class="tot"><td>Total</td><td>${sc.total}</td></tr></table>`;
    if (sc.target != null) b += `<p class="verdict ${sc.won ? 'win' : 'lose'}">${sc.won ? 'Objectif atteint : victoire !' : 'Objectif de ' + sc.target + ' non atteint.'}</p>`;
    const dice = H.diceOf(state).length;
    b += `<p class="small-note">Partie n° <b>${state.seed}</b> · ${dice} dé(s) utilisé(s) · Cartes : ${state.cards.join(', ')}</p>`;
    els.endBody.innerHTML = b;
    els.dlgEnd.showModal();
  }

  function start(seed, recipes) {
    state = H.newGame(seed || H.randomSeed(), { recipes });
    history = [];
    ui.sel = null; ui.pos = null; ui.rot = 0; ui.squirrel = false; ui.endShown = false;
    computeView();
    save();
    renderAll();
    if (state.over) setTimeout(showEnd, 300);
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ state, history: history.slice(-20) })); } catch (e) { /* stockage indisponible */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (!d || !d.state || !d.state.board) return false;
      state = d.state; history = d.history || [];
      return true;
    } catch (e) { return false; }
  }

  // Évènements
  els.board.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' || e.buttons) setPosFromEvent(e);
  });
  els.board.addEventListener('pointerup', (e) => {
    if (ui.sel == null) return;
    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return;
      setPosFromEvent(e);
      place();
    } else {
      setPosFromEvent(e);
    }
  });
  els.board.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse' && ui.pos) { ui.pos = null; renderGhost(); }
  });
  els.board.addEventListener('contextmenu', (e) => { if (ui.sel != null) { e.preventDefault(); rotate(1); } });
  els.board.addEventListener('wheel', (e) => {
    if (ui.sel == null) return;
    e.preventDefault();
    rotate(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  els.btnRotL.addEventListener('click', () => rotate(-1));
  els.btnRotR.addEventListener('click', () => rotate(1));
  els.btnPlace.addEventListener('click', place);
  els.btnUndo.addEventListener('click', undo);
  els.btnSquirrel.addEventListener('click', () => {
    if (state.squirrelUsed) return;
    ui.squirrel = !ui.squirrel;
    els.btnSquirrel.setAttribute('aria-pressed', ui.squirrel ? 'true' : 'false');
    renderGhost();
  });
  els.btnRules.addEventListener('click', () => els.dlgRules.showModal());
  els.btnNew.addEventListener('click', () => {
    els.inSeed.value = '';
    els.inRecipes.checked = !!state.recipes;
    els.dlgNew.showModal();
  });
  els.dlgNew.addEventListener('close', () => {
    if (els.dlgNew.returnValue === 'start') start(els.inSeed.value.trim(), els.inRecipes.checked);
  });
  els.dlgEnd.addEventListener('close', () => {
    const v = els.dlgEnd.returnValue;
    if (v === 'again') start(state.seed, !!state.recipes);
    else if (v === 'next') start(null, !!state.recipes);
  });

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('dialog[open]')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
    const k = e.key.toLowerCase();
    if (k === '1' || k === '2') { const id = state.hand[Number(k) - 1]; if (id) selectCard(id); }
    else if (k === 'r' || k === 'e') rotate(1);
    else if (k === 'q') rotate(-1);
    else if (k === 'enter') place();
    else if (k === 'escape') { ui.sel = null; ui.pos = null; renderHand(); renderGhost(); }
    else if (k === 'arrowleft' || k === 'arrowright' || k === 'arrowup' || k === 'arrowdown') {
      if (ui.sel == null) return;
      e.preventDefault();
      if (!ui.pos) { const b = H.bounds(state); ui.pos = { x: b.minX, y: b.minY }; }
      if (k === 'arrowleft') ui.pos.x--; if (k === 'arrowright') ui.pos.x++;
      if (k === 'arrowup') ui.pos.y--; if (k === 'arrowdown') ui.pos.y++;
      renderGhost();
    }
  });

  // Démarrage : ?partie=1234 permet de partager une partie.
  const params = new URLSearchParams(location.search);
  const urlSeed = params.get('partie');
  if (urlSeed) start(urlSeed, params.has('recettes'));
  else if (load()) { computeView(); renderAll(); if (state.over) ui.endShown = true; }
  else { start(null, false); try { if (!localStorage.getItem('hortis.seenRules')) { localStorage.setItem('hortis.seenRules', '1'); els.dlgRules.showModal(); } } catch (e) { /* ignore */ } }
})();
