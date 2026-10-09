/* Ortie — interface (rendu SVG + interactions). */
(function () {
  'use strict';
  const H = window.OrtieCore;
  const S = 100; // taille d'une case en unités SVG
  const CW = H.CARD_W * S, CH = H.CARD_H * S;
  const STORE_KEY = 'ortie.save.v2';
  const SEEN_KEY = 'ortie.seenRules';

  const COLOR = { orange: '#f06a32', citron: '#f4cf22', vert: '#5fbf4a' };
  const INK = { orange: '#d4511f', citron: '#b38900', vert: '#3d8a2f', none: '#2f5a35' };
  const DIE_FILL = { orange: '#f2762e', citron: '#f5d02a', vert: '#5cb544' };
  const DIE_EDGE = { orange: '#a8461a', citron: '#a88405', vert: '#2f7426' };
  const DIE_PIP = { orange: '#fffaf0', citron: '#4a3a06', vert: '#fffaf0' };

  const $ = (id) => document.getElementById(id);
  const els = {
    board: $('board'), boardHelp: $('board-help'), hand: $('hand'), deck: $('deck'),
    reserve: $('reserve'), barrow: $('tok-barrow'), squirrel: $('tok-squirrel'),
    scoreTotal: $('score-total'), scoreMini: $('score-mini'), objMini: $('obj-mini'), resMini: $('res-mini'),
    btnDetails: $('btn-details'), btnSideClose: $('btn-side-close'), sideBackdrop: $('side-backdrop'), boardWrap: document.querySelector('.board-wrap'), scoreRank: $('score-rank'), scoreRows: $('score-rows'), objective: $('objective'),
    recipes: $('recipes'), recipeList: $('recipe-list'), seed: $('seed-label'), turn: $('turn-label'),
    hint: $('hint'), toast: $('toast'),
    btnUndo: $('btn-undo'), btnNew: $('btn-new'), btnRules: $('btn-rules'), btnPlace: $('btn-place'),
    placeLabel: $('place-label'), placeGain: $('place-gain'),
    btnRotL: $('btn-rot-l'), btnRotR: $('btn-rot-r'), btnHint: $('btn-hint'),
    dlgNew: $('dlg-new'), dlgEnd: $('dlg-end'), dlgRules: $('dlg-rules'), dlgSquirrel: $('dlg-squirrel'),
    inSeed: $('in-seed'), inRecipes: $('in-recipes'), inR1: $('in-r1'), inR2: $('in-r2'), recipePick: $('recipe-pick'),
    endTitle: $('end-title'), endBody: $('end-body'), legend: $('legend'), defs: $('defs'),
  };

  let state = null;
  let history = [];
  const ui = { sel: null, rot: 0, pos: null, drag: null, handDrag: null, dragEndAt: -1e9, fresh: null, popKeys: [], view: null, endShown: false };

  // ------------------------------------------------------------- Graphismes
  // Buisson en rosette de feuilles, comme sur les cartes.
  function buildDefs() {
    const leaf = (r0, r1, w) => {
      const a = r0 + (r1 - r0) * 0.35, b = r0 + (r1 - r0) * 0.8;
      return `M0 ${-r0}C${w} ${-a} ${w * 0.75} ${-b} 0 ${-r1}C${-w * 0.75} ${-b} ${-w} ${-a} 0 ${-r0}Z`;
    };
    const ring = (n, off, r0, r1, w, fill, rib) => {
      let s = '';
      for (let i = 0; i < n; i++) {
        const ang = off + (i * 360) / n;
        s += `<g transform="rotate(${ang.toFixed(1)})"><path d="${leaf(r0, r1, w)}" fill="${fill}" stroke="#17451f" stroke-width="1.1"/><path d="M0 ${-r0 - 2}L0 ${-r1 + 4}" stroke="${rib}" stroke-width="1" opacity=".55"/></g>`;
      }
      return s;
    };
    let bush = '<g id="bush"><circle r="38" fill="#1d5527"/>';
    bush += ring(17, 0, 16, 45, 10.5, '#2c7a36', '#78b866');
    bush += ring(13, 12, 9, 35, 10, '#3a8c3e', '#8cc874');
    bush += ring(9, 5, 3, 24, 8.5, '#4b9f45', '#a2d688');
    bush += '<circle r="9" fill="#3a8c3e"/></g>';

    // Prairie mouchetée (fleurs jaunes et pétales roses)
    let pat = '<pattern id="p-meadow" width="64" height="64" patternUnits="userSpaceOnUse">';
    pat += '<rect width="64" height="64" fill="#9acd47"/>';
    const blobs = [[8, 12, 9, '#a6d653'], [40, 6, 7, '#8ec23f'], [30, 34, 10, '#a3d250'], [54, 44, 8, '#8fc341'], [12, 50, 7, '#a9d958']];
    for (const [x, y, r, c] of blobs) pat += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity=".7"/>`;
    const star = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0-4L1-1L4 0L1 1L0 4L-1 1L-4 0L-1-1Z" fill="#f4e45a"/>`;
    pat += star(6, 6, 0.8) + star(26, 18, 0.6) + star(48, 26, 0.8) + star(18, 40, 0.7) + star(58, 58, 0.6) + star(38, 54, 0.75);
    const dots = [[14, 26], [34, 10], [52, 14], [44, 40], [6, 36], [26, 58], [60, 32]];
    for (const [x, y] of dots) pat += `<circle cx="${x}" cy="${y}" r="1.3" fill="#f39b84"/>`;
    pat += '</pattern>';
    els.defs.insertAdjacentHTML('beforeend', bush + pat);
  }

  function fruitsSvg(cell) {
    const use = (dx, dy, s) => `<use href="#fruit-${cell.t}" transform="translate(${dx} ${dy}) rotate(${cell.t === 'citron' ? -28 : 0}) scale(${s})"/>`;
    return cell.f === 2 ? use(-10, -9, 0.95) + use(10, 9, 0.95) : use(0, 0, 1.05);
  }

  function cellSvg(cell, cx, cy, cardId) {
    if (cell.k === 'tree') {
      return `<g transform="translate(${cx} ${cy})"><use href="#bush" filter="url(#f-soft)"/>${fruitsSvg(cell)}</g>`;
    }
    return `<text x="${cx}" y="${cy}" transform="rotate(-90 ${cx} ${cy})" dy="8" text-anchor="middle" class="card-num">${cardId}</text>`;
  }

  // Carte dans son orientation de base (300 × 200), coin haut-gauche en (0,0).
  function cardArt(card) {
    let g = `<rect x="2" y="2" width="${CW - 4}" height="${CH - 4}" rx="14" fill="url(#p-meadow)" stroke="#6c9f2f" stroke-width="2.5"/>`;
    g += `<rect x="6" y="6" width="${CW - 12}" height="${CH - 12}" rx="11" fill="none" stroke="#c6ea7d" stroke-width="1.5" opacity=".6"/>`;
    card.cells.forEach((cell, i) => {
      g += cellSvg(cell, (i % H.CARD_W) * S + S / 2, Math.floor(i / H.CARD_W) * S + S / 2, card.id);
    });
    return g;
  }

  function placedCardSvg(id, rot, x, y, cls) {
    const fp = H.footprint(H.cardById(id), rot);
    const cx = (x + fp.w / 2) * S, cy = (y + fp.h / 2) * S;
    return `<g class="${cls || ''}"><g transform="translate(${cx} ${cy}) rotate(${rot * 90}) translate(${-CW / 2} ${-CH / 2})" filter="url(#f-shadow)">${cardArt(H.cardById(id))}</g></g>`;
  }

  function cardSvgStandalone(id, rot) {
    const fp = H.footprint(H.cardById(id), rot);
    return `<svg viewBox="-8 -6 ${fp.w * S + 16} ${fp.h * S + 16}" xmlns="http://www.w3.org/2000/svg">${placedCardSvg(id, rot, 0, 0)}</svg>`;
  }

  const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };

  function dieSvg(die, cx, cy, opts) {
    opts = opts || {};
    const sc = opts.scale || 1;
    const cls = 'die' + (opts.cls ? ' ' + opts.cls : '');
    if (die.barrow) {
      return `<g transform="translate(${cx} ${cy}) scale(${sc})"><g class="${cls}" filter="url(#f-shadow)"><g transform="translate(-31 -31) scale(.97)"><use href="#barrow"/></g><g transform="translate(22 22)"><circle r="13" fill="#fffaf0" stroke="#6e4317" stroke-width="2"/><text y="5" text-anchor="middle" class="die-num">15</text></g></g></g>`;
    }
    const sz = 52;
    let g = `<g transform="translate(${cx} ${cy}) scale(${sc})"><g class="${cls}" filter="url(#f-shadow)">`;
    g += `<rect x="${-sz / 2}" y="${-sz / 2}" width="${sz}" height="${sz}" rx="11" fill="${DIE_FILL[die.t]}" stroke="${DIE_EDGE[die.t]}" stroke-width="2.5"/>`;
    g += `<rect x="${-sz / 2 + 4}" y="${-sz / 2 + 3}" width="${sz - 8}" height="${sz / 2 - 6}" rx="8" fill="#fff" opacity=".2"/>`;
    if (die.v >= H.BASKET) {
      g += `<g transform="translate(0 4)"><use href="#basket"/></g>`;
      g += `<g transform="translate(18 -18)"><circle r="11" fill="#fffaf0" stroke="${DIE_EDGE[die.t]}" stroke-width="2"/><text y="4.5" text-anchor="middle" class="die-num small">10</text></g>`;
    } else {
      for (const [px, py] of PIPS[die.v] || []) g += `<circle cx="${px * 12.5}" cy="${py * 12.5}" r="5.2" fill="${DIE_PIP[die.t]}"/>`;
    }
    if (opts.lost) g += `<path d="M-20-20L20 20M20-20L-20 20" stroke="#7a2e1a" stroke-width="5" stroke-linecap="round" opacity=".7"/>`;
    g += `</g></g>`;
    return g;
  }

  function squirrelSvg(cx, cy, sc) {
    return `<g transform="translate(${cx} ${cy}) scale(${sc || 1})" filter="url(#f-shadow)"><g transform="translate(-28 -28) scale(.875)"><use href="#squirrel"/></g></g>`;
  }

  function cardBackSvg() {
    return `<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="196" height="296" rx="14" fill="#fffdf6" stroke="#d8ccb0" stroke-width="2"/><g transform="translate(36 36) scale(1.05)"><use href="#bush"/></g><g transform="translate(100 168)"><circle r="46" fill="#2f6b3a"/><use href="#bush" transform="scale(.9)"/><use href="#fruit-orange" transform="translate(-12 -8)"/><use href="#fruit-citron" transform="translate(14 -2) rotate(-28)"/><use href="#fruit-vert" transform="translate(-2 16)"/></g><text x="100" y="268" text-anchor="middle" class="back-title">ORTIE</text></svg>`;
  }

  // ------------------------------------------------------------- Recettes
  function recipeIcon(r) {
    const c = r.color ? COLOR[r.color] : '#f2a03a';
    const light = { orange: '#ffc29a', citron: '#fff1a0', vert: '#c7ec9e' }[r.color] || '#fff';
    const plate = '<ellipse cx="40" cy="70" rx="32" ry="6" fill="#eef4fb" stroke="#4b86c7" stroke-width="2"/>';
    switch (r.icon) {
      case 'jar':
        return `<rect x="20" y="28" width="40" height="44" rx="10" fill="${c}"/><circle cx="32" cy="48" r="6" fill="${light}" opacity=".8"/><circle cx="48" cy="58" r="5" fill="${light}" opacity=".8"/><circle cx="45" cy="40" r="4" fill="${light}" opacity=".7"/><rect x="18" y="18" width="44" height="12" rx="3" fill="#fbf2df" stroke="#d07a3a" stroke-width="1.5"/><path d="M22 18v12M30 18v12M38 18v12M46 18v12M54 18v12M18 24h44" stroke="#e59a5a" stroke-width="2"/>`;
      case 'glass': {
        const straw = r.kind === 'all5' && r.t === 'vert' ? '' : '<path d="M44 34L52 6h8" stroke="#7fae3a" stroke-width="3" fill="none" stroke-linecap="round"/>';
        const bubbles = r.t === 'citron' ? '<circle cx="34" cy="50" r="2" fill="#fff" opacity=".8"/><circle cx="44" cy="60" r="1.6" fill="#fff" opacity=".8"/><circle cx="38" cy="40" r="1.4" fill="#fff" opacity=".8"/>' : '';
        const fill = r.t === 'vert' ? '#4d8f2a' : c;
        return `<path d="M22 16h36l-5 58H27z" fill="#eef7fb" stroke="#8fb3c4" stroke-width="2"/><path d="M24 30h32l-4 42H28z" fill="${fill}"/>${bubbles}${straw}`;
      }
      case 'bottle':
        return `<rect x="34" y="6" width="12" height="8" rx="2" fill="#3a3a3a"/><path d="M34 14h12v12c8 4 11 10 11 16v30H23V42c0-6 3-12 11-16z" fill="${c}"/><rect x="29" y="44" width="22" height="18" rx="2" fill="#fffaf0"/><circle cx="40" cy="53" r="5" fill="${r.t === 'citron' ? '#7cb342' : '#e8452a'}"/><path d="M27 34c2-3 4-5 7-6" stroke="#fff" stroke-width="2" opacity=".5" fill="none"/>`;
      case 'pie': {
        const top = r.kind === 'six'
          ? '<path d="M14 46c4-12 10-8 14-14 4 6 8 0 12-8 4 6 10 2 14-6 2 6 8 4 12-2v8L14 50z" fill="#fff8ee" stroke="#e2c49a" stroke-width="1.5"/><path d="M24 40c3-3 5-2 6-6M40 32c2-3 4-3 5-6M56 24c2-2 4-2 5-5" stroke="#c9884a" stroke-width="2" fill="none"/>'
          : '<path d="M52 24c-6-10 8-14 10-6 6-2 8 8 0 9z" fill="#fffdf8" stroke="#e5ddd0" stroke-width="1.5"/>';
        return `<path d="M10 56L70 28v14L14 68z" fill="#e8b066"/><path d="M12 52L70 26v12L14 62z" fill="${c}"/>${top}`;
      }
      case 'jelly':
        return `${plate}<path d="M16 68c0-24 8-44 24-44s24 20 24 44z" fill="${c}"/><path d="M28 68c0-20 4-38 12-42M52 68c0-20-4-38-12-42M40 68V26" stroke="${light}" stroke-width="2.5" opacity=".8" fill="none"/><ellipse cx="40" cy="26" rx="7" ry="3" fill="${light}" opacity=".9"/>`;
      case 'cake':
        return `${plate}<rect x="8" y="34" width="40" height="30" rx="7" fill="#a45f2c"/><rect x="8" y="34" width="40" height="8" rx="4" fill="#7e4520"/><path d="M44 40l22-4v26l-22 4z" fill="#f6d77a" stroke="#c68a3a" stroke-width="2"/><circle cx="52" cy="46" r="2" fill="#e8452a"/><circle cx="58" cy="52" r="2" fill="#5fbf4a"/><circle cx="50" cy="56" r="2" fill="#f4b400"/><circle cx="60" cy="44" r="1.8" fill="#5fbf4a"/>`;
      case 'basket':
        return `<g transform="translate(40 46) scale(2)"><use href="#basket"/></g>`;
      case 'bowl':
        return `<circle cx="28" cy="36" r="9" fill="#f6d52b"/><circle cx="42" cy="32" r="10" fill="#f06a32"/><circle cx="54" cy="38" r="8" fill="#5fbf4a"/><circle cx="36" cy="40" r="7" fill="#ffb27a"/><path d="M10 40h60c0 18-14 30-30 30S10 58 10 40z" fill="#5aa7de"/><path d="M14 44h52" stroke="#8cc6ec" stroke-width="3"/>`;
      case 'cone':
        return `<path d="M24 38h32L40 76z" fill="#e8a65a"/><path d="M28 44l18 18M34 40l16 16M46 40L32 66M52 42L36 70" stroke="#c07a32" stroke-width="1.5"/><circle cx="40" cy="28" r="19" fill="#fbe2a0"/><circle cx="32" cy="22" r="2.4" fill="#f06a32"/><circle cx="44" cy="20" r="2.4" fill="#5fbf4a"/><circle cx="48" cy="32" r="2.4" fill="#f4b400"/><circle cx="34" cy="34" r="2.4" fill="#5fbf4a"/><circle cx="40" cy="27" r="2.4" fill="#f06a32"/>`;
      case 'cocktail':
        return `<path d="M26 22c-6 14 2 28 10 32v12h-8v4h24v-4h-8V54c8-4 16-18 10-32z" fill="#eef7fb" stroke="#8fb3c4" stroke-width="2"/><path d="M25 34c0 10 5 17 15 18 10-1 15-8 15-18z" fill="#f6a23a"/><circle cx="26" cy="22" r="8" fill="#f06a32" stroke="#fff" stroke-width="2"/><path d="M44 30L62 10" stroke="#7a5a2a" stroke-width="2"/><path d="M50 10l16 4-8 8z" fill="#f4cf22"/><path d="M36 28L44 4" stroke="#7fae3a" stroke-width="3"/>`;
      case 'punch':
        return `<path d="M12 30h56c0 16-12 28-28 28S12 46 12 30z" fill="#f6a23a" stroke="#4b86c7" stroke-width="2"/><path d="M34 58h12l4 10H30z" fill="#eef4fb" stroke="#4b86c7" stroke-width="2"/><circle cx="30" cy="40" r="5" fill="#5fbf4a" stroke="#fff" stroke-width="1.5"/><circle cx="48" cy="44" r="5" fill="#f4cf22" stroke="#fff" stroke-width="1.5"/><path d="M52 34L62 6" stroke="#4b86c7" stroke-width="2.5"/><ellipse cx="44" cy="34" rx="7" ry="4" fill="#4b86c7"/>`;
      default:
        return '';
    }
  }

  function recipeBadge(r) {
    let tok = '';
    if (r.color === 'citron') tok = `<g transform="scale(1.45) rotate(-20)"><use href="#fruit-citron"/></g>`;
    else if (r.color) tok = `<circle r="15" fill="${COLOR[r.color]}" stroke="${DIE_EDGE[r.color]}" stroke-width="1.5"/>`;
    const txt = r.color === 'citron' ? '#5a4500' : '#fff';
    return `<svg viewBox="-34 -34 68 68" class="rbadge"><use href="#bush" transform="scale(.72)"/>${tok}<text y="6" text-anchor="middle" class="rnum" fill="${txt}">${r.target}</text></svg>`;
  }

  function recipeCardHtml(r, status) {
    const ink = INK[r.color || 'none'];
    const bonus = r.mult ? `Bonus <b>×${r.mult}</b>` : `Bonus <b>${r.pts}</b> pt${r.pts > 1 ? 's' : ''}`;
    let st = '';
    if (status) {
      if (r.mult) st = `<span class="rstate on">${status.detail || 'actif'}</span>`;
      else st = status.done ? '<span class="rstate ok">✔ réussie</span>' : '<span class="rstate">en cours</span>';
    }
    return `<div class="rcard${status && status.done && !r.mult ? ' done' : ''}">
      ${recipeBadge(r)}
      <div class="rbody">
        <div class="rname" style="color:${ink}">${r.name}</div>
        <div class="rtext">${r.text}${r.small ? ` <small>(${r.small})</small>` : ''}</div>
        <div class="rfoot"><span class="rbonus">${bonus}</span>${st}</div>
      </div>
      <svg viewBox="0 0 80 80" class="ricon" aria-hidden="true">${recipeIcon(r)}</svg>
    </div>`;
  }

  // ----------------------------------------------------------------- Rendu
  function computeView() {
    const b = H.bounds(state);
    let minX = b.minX - 2, minY = b.minY - 2, maxX = b.maxX + 3, maxY = b.maxY + 3;
    const minW = 7, minH = 7;
    if (maxX - minX < minW) { const d = minW - (maxX - minX); minX -= Math.floor(d / 2); maxX += Math.ceil(d / 2); }
    if (maxY - minY < minH) { const d = minH - (maxY - minY); minY -= Math.floor(d / 2); maxY += Math.ceil(d / 2); }
    ui.view = { minX, minY, maxX, maxY };
  }

  function renderBoard() {
    const v = ui.view;
    els.board.setAttribute('viewBox', [v.minX * S, v.minY * S, (v.maxX - v.minX) * S, (v.maxY - v.minY) * S].join(' '));
    let g = '<g class="grid">';
    for (let y = v.minY; y <= v.maxY; y++) for (let x = v.minX; x <= v.maxX; x++) g += `<circle cx="${x * S}" cy="${y * S}" r="3.5"/>`;
    g += '</g>';
    state.placed.forEach((p, i) => {
      const fresh = ui.fresh && i === state.placed.length - 1;
      g += placedCardSvg(p.id, p.rot, p.x, p.y, fresh ? 'fresh' : '');
    });
    if (state.placed.length > 1 && !state.over) {
      const last = state.placed[state.placed.length - 1];
      const fp = H.footprint(H.cardById(last.id), last.rot);
      g += `<rect class="last" x="${last.x * S + 3}" y="${last.y * S + 3}" width="${fp.w * S - 6}" height="${fp.h * S - 6}" rx="14"/>`;
    }
    for (const [k, e] of Object.entries(state.board)) {
      const [x, y] = k.split(',').map(Number);
      const cx = x * S + S / 2, cy = y * S + S / 2;
      const onClear = e.cell.k === 'clear';
      if (e.die) g += dieSvg(e.die, cx, cy, { scale: onClear ? 0.8 : 1, lost: onClear && state.over, cls: (ui.popKeys.includes(k) ? 'pop' : '') + (onClear ? ' on-clear' : '') });
      if (e.squirrel) g += squirrelSvg(cx, cy, 1);
    }
    g += '<g id="ghost"></g>';
    els.board.innerHTML = g;
    ui.fresh = null;
    ui.popKeys = [];
    renderGhost();
  }

  function currentEval() {
    if (ui.sel == null || !ui.pos) return null;
    return H.evaluate(state, ui.sel, ui.rot, ui.pos.x, ui.pos.y, { allowSquirrel: true });
  }

  function renderGhost() {
    const host = els.board.querySelector('#ghost');
    if (!host) return;
    if (ui.sel == null || !ui.pos || state.over) { host.innerHTML = ''; updateControls(null); return; }
    const ev = currentEval();
    const fp = H.footprint(H.cardById(ui.sel), ui.rot);
    const status = !ev.ok ? 'bad' : ev.usesSquirrel ? 'warn' : 'ok';
    let g = `<g class="ghost-card ${status}">${placedCardSvg(ui.sel, ui.rot, ui.pos.x, ui.pos.y)}</g>`;
    g += `<rect class="ghost-frame ${status}" x="${ui.pos.x * S}" y="${ui.pos.y * S}" width="${fp.w * S}" height="${fp.h * S}" rx="16"/>`;
    for (const ch of ev.changes) {
      if (!ch.covered) continue;
      const cx = ch.x * S + S / 2, cy = ch.y * S + S / 2;
      if (ch.conflict) {
        g += `<g class="mark bad" transform="translate(${cx} ${cy})"><circle r="22"/><path d="M-9-9L9 9M9-9L-9 9"/></g>`;
      } else if (ch.die && ev.ok) {
        g += dieSvg(ch.die, cx, cy, { scale: ch.cell.k === 'clear' ? 0.6 : 0.72, cls: 'ghost-die' });
      } else if (ch.squirrel) {
        g += `<g class="ghost-die">${squirrelSvg(cx, cy, 0.8)}</g>`;
      } else if (ch.event === 'nodie') {
        g += `<g class="mark none" transform="translate(${cx} ${cy})"><circle r="18"/><path d="M-12 12L12-12"/></g>`;
      }
    }
    if (ev.ok) {
      const gx = (ui.pos.x + fp.w) * S - 8, gy = ui.pos.y * S + 8;
      g += `<g class="gain-pill ${ev.gain > 0 ? 'pos' : ''}" transform="translate(${gx} ${gy})"><rect x="-56" y="-20" width="64" height="40" rx="20"/><text x="-24" y="8" text-anchor="middle">${ev.gain > 0 ? '+' : ''}${ev.gain}</text></g>`;
    }
    host.innerHTML = g;
    updateControls(ev);
  }

  function updateControls(ev) {
    const sel = ui.sel != null && !state.over;
    els.btnRotL.disabled = els.btnRotR.disabled = !sel;
    els.btnHint.disabled = state.over;
    els.btnPlace.disabled = !(ev && ev.ok);
    els.btnPlace.classList.toggle('warn', !!(ev && ev.ok && ev.usesSquirrel));
    els.placeLabel.textContent = ev && ev.ok && ev.usesSquirrel ? 'Poser avec l’Écureuil' : 'Poser';
    els.placeGain.textContent = ev && ev.ok ? (ev.gain > 0 ? '+' : '') + ev.gain : '';
    let msg, cls = '';
    if (state.over) msg = 'Partie terminée. Lancez une nouvelle partie quand vous voulez.';
    else if (!sel) msg = state.placed.length === 1 ? 'Choisissez une carte de votre main pour commencer.' : 'Choisissez votre prochaine carte.';
    else if (!ev) msg = 'Placez la carte sur le verger.';
    else if (ev.ok) {
      msg = ev.usesSquirrel ? 'Pose possible avec l’Écureuil (une seule fois par partie).' : 'Pose valide.';
      if (ev.notes.length) msg += ' ' + ev.notes.join(' ');
      msg += touchMode() ? ' Touchez « Poser » pour valider.' : ' Cliquez pour poser.';
      cls = ev.usesSquirrel ? 'warn' : 'ok';
    } else { msg = ev.reason; cls = 'bad'; }
    els.hint.textContent = msg;
    els.hint.className = 'hint ' + cls;
    els.boardHelp.textContent = sel ? (touchMode() ? 'Glissez la carte du doigt · ⟲ ⟳ pour tourner' : 'Survolez pour déplacer · molette pour tourner · clic pour poser') : '';
    els.boardHelp.classList.toggle('show', sel);
  }

  let lastPointerType = 'mouse';
  const touchMode = () => lastPointerType !== 'mouse' || window.matchMedia('(hover: none)').matches;

  function renderHand() {
    els.hand.innerHTML = '';
    if (!state.hand.length) {
      els.hand.innerHTML = '<div class="empty-hand">Toutes les cartes sont jouées.</div>';
      return;
    }
    state.hand.forEach((id, i) => {
      const b = document.createElement('button');
      const selected = ui.sel === id;
      b.className = 'hand-card' + (selected ? ' selected' : '');
      b.setAttribute('aria-pressed', selected ? 'true' : 'false');
      b.setAttribute('aria-label', 'Carte n°' + id);
      b.innerHTML = cardSvgStandalone(id, selected ? ui.rot : 0) + `<span class="key">${i + 1}</span>`;
      b.addEventListener('click', () => {
        if (performance.now() - ui.dragEndAt < 80) return; // clic émis à la fin d'un glisser
        selectCard(id);
      });
      b.addEventListener('pointerdown', (e) => startHandDrag(e, id));
      els.hand.appendChild(b);
    });
  }

  function renderDeck() {
    const n = state.deck.length;
    let h = '<div class="deck-stack">';
    for (let i = Math.min(n, 3) - 1; i >= 0; i--) h += `<div class="back" style="--i:${i}">${cardBackSvg()}</div>`;
    if (!n) h += '<div class="deck-empty"></div>';
    h += `</div><div class="deck-count"><b>${n}</b><span>pioche</span></div>`;
    els.deck.innerHTML = h;
  }

  function miniDie(t, v, used) {
    return `<svg viewBox="-30 -30 60 60" class="mdie${used ? ' used' : ''}">${dieSvg({ t, v }, 0, 0)}</svg>`;
  }

  function renderSide() {
    const sc = H.score(state);
    els.scoreTotal.textContent = sc.total;
    els.scoreMini.textContent = sc.total;
    els.objMini.textContent = sc.target != null ? ' / ' + sc.target : '';
    els.resMini.innerHTML = H.TYPES.map((t) => `<i style="--c:${DIE_FILL[t]}" title="${H.FRUIT_LABEL[t]} en réserve">${state.reserve[t]}</i>`).join('');
    els.scoreRank.textContent = H.rank(sc.total);
    els.seed.textContent = state.seed;
    els.turn.textContent = Math.min(state.placed.length + (state.over ? 0 : 1), H.GAME_CARDS);

    let rows = '';
    for (const t of H.TYPES) {
      const m = sc.mult[t] > 1 ? `<em>×${sc.mult[t]}</em>` : '';
      rows += `<div class="srow"><span class="dot" style="background:${DIE_FILL[t]}"></span><span class="sl">${H.FRUIT_LABEL[t]}</span>${m}<b>${sc.scored[t]}</b></div>`;
    }
    if (sc.barrow) rows += `<div class="srow sub"><span class="dot wood"></span><span class="sl">dont Brouette</span><b>${sc.barrow}</b></div>`;
    if (sc.lost) rows += `<div class="srow lost"><span class="dot rot"></span><span class="sl">Sur clairière (perdus à la fin)</span><b>${sc.lost}</b></div>`;
    if (sc.bonus) rows += `<div class="srow"><span class="dot star"></span><span class="sl">Bonus Recettes</span><b>+${sc.bonus}</b></div>`;
    els.scoreRows.innerHTML = rows;

    if (sc.target != null) {
      const pct = Math.min(100, Math.round((sc.total / sc.target) * 100));
      els.objective.hidden = false;
      els.objective.innerHTML = `<div class="obj-line"><span>Objectif</span><b>${sc.total} / ${sc.target}</b></div><div class="bar"><span style="width:${pct}%" class="${sc.won ? 'won' : ''}"></span></div>`;
    } else els.objective.hidden = true;

    let r = '';
    for (const t of H.TYPES) {
      let dice = '';
      for (let i = 0; i < H.DICE_PER_TYPE; i++) dice += miniDie(t, 1 + (i % 6), i >= state.reserve[t]);
      r += `<div class="res-row" title="${H.FRUIT_LABEL[t]} : ${state.reserve[t]} dé(s) en réserve"><div class="dice">${dice}</div><span class="cnt">${state.reserve[t]}/${H.DICE_PER_TYPE}</span></div>`;
    }
    els.reserve.innerHTML = r;
    els.barrow.className = 'token' + (state.barrowFree ? '' : ' used');
    els.barrow.innerHTML = `<svg viewBox="0 0 64 64"><use href="#barrow"/></svg><span><b>Brouette</b><small>${state.barrowFree ? 'libre · 15 fruits' : 'en jeu'}</small></span>`;
    els.squirrel.className = 'token' + (state.squirrelUsed ? ' used' : '');
    els.squirrel.innerHTML = `<svg viewBox="0 0 64 64"><use href="#squirrel"/></svg><span><b>Écureuil</b><small>${state.squirrelUsed ? 'utilisé' : '1 fois / partie'}</small></span>`;

    if (sc.recipes.length) {
      els.recipes.hidden = false;
      els.recipeList.innerHTML = sc.recipes.map((x) => recipeCardHtml(H.RECIPE_BY_ID[x.id], x)).join('');
    } else els.recipes.hidden = true;

    els.btnUndo.disabled = history.length === 0;
  }

  function renderAll() {
    renderBoard();
    renderHand();
    renderDeck();
    renderSide();
  }

  // ------------------------------------------------------------ Interactions
  function selectCard(id) {
    if (state.over) return;
    if (ui.sel === id) { ui.sel = null; ui.pos = null; }
    else {
      ui.sel = id;
      const m = H.bestMove(state, [id]);
      if (m) { ui.rot = m.rot; ui.pos = { x: m.x, y: m.y }; }
      else { ui.rot = 0; ui.pos = null; }
    }
    renderHand();
    renderGhost();
  }

  // Glisser une carte de la main directement sur le plateau (doigt ou souris).
  function startHandDrag(e, id) {
    if (state.over || (e.pointerType === 'mouse' && e.button !== 0)) return;
    lastPointerType = e.pointerType;
    ui.handDrag = { id, pointerId: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }

  function overBoard(e) {
    const r = els.board.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }

  document.addEventListener('pointermove', (e) => {
    const d = ui.handDrag;
    if (!d || d.pointerId !== e.pointerId) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 10) return;
      d.moved = true;
      document.body.classList.add('dragging');
      if (ui.sel !== d.id) {
        ui.sel = d.id;
        const m = H.bestMove(state, [d.id]);
        ui.rot = m ? m.rot : 0;
        ui.pos = null;
      }
      for (const btn of els.hand.querySelectorAll('.hand-card')) btn.classList.toggle('selected', btn.getAttribute('aria-label') === 'Carte n°' + d.id);
    }
    if (e.cancelable) e.preventDefault();
    if (!overBoard(e)) return;
    const p = boardPoint(e);
    if (!p) return;
    // au doigt, la carte apparaît un peu au-dessus pour rester visible
    if (e.pointerType !== 'mouse') p.y -= 0.9;
    setPos(centerAt(p));
  }, { passive: false });

  function endHandDrag(e) {
    const d = ui.handDrag;
    if (!d || d.pointerId !== e.pointerId) return;
    ui.handDrag = null;
    document.body.classList.remove('dragging');
    if (!d.moved) return; // simple toucher : géré par « click »
    ui.dragEndAt = performance.now();
    renderHand();
    renderGhost();
  }
  document.addEventListener('pointerup', endHandDrag);
  document.addEventListener('pointercancel', endHandDrag);

  function suggest() {
    if (state.over) return;
    const m = H.bestMove(state, ui.sel != null ? [ui.sel] : state.hand);
    if (!m) { toast('Aucune pose possible avec cette carte.', 'bad'); return; }
    ui.sel = m.id; ui.rot = m.rot; ui.pos = { x: m.x, y: m.y };
    renderHand();
    renderGhost();
    toast(m.gain > 0 ? `Conseil : +${m.gain} fruits avec la carte n°${m.id}.` : `Conseil : carte n°${m.id} (aucun fruit possible ce tour-ci).`);
  }

  function rotate(d) {
    if (ui.sel == null || state.over) return;
    const oldFp = H.footprint(H.cardById(ui.sel), ui.rot);
    ui.rot = (ui.rot + d + 4) & 3;
    if (ui.pos) {
      const nf = H.footprint(H.cardById(ui.sel), ui.rot);
      const cx = ui.pos.x + oldFp.w / 2, cy = ui.pos.y + oldFp.h / 2;
      ui.pos = { x: Math.round(cx - nf.w / 2), y: Math.round(cy - nf.h / 2) };
    }
    renderHand();
    renderGhost();
  }

  function boardPoint(evt) {
    const m = els.board.getScreenCTM();
    if (!m) return null;
    const pt = new DOMPoint(evt.clientX, evt.clientY).matrixTransform(m.inverse());
    return { x: pt.x / S, y: pt.y / S };
  }

  function centerAt(p) {
    const fp = H.footprint(H.cardById(ui.sel), ui.rot);
    return { x: Math.round(p.x - fp.w / 2), y: Math.round(p.y - fp.h / 2) };
  }

  function setPos(pos) {
    if (ui.pos && ui.pos.x === pos.x && ui.pos.y === pos.y) return;
    ui.pos = pos;
    renderGhost();
  }

  function tryPlace() {
    if (ui.sel == null || !ui.pos || state.over) return;
    const ev = currentEval();
    if (!ev.ok) {
      toast(ev.reason, 'bad');
      const ghost = els.board.querySelector('.ghost-frame');
      if (ghost) { ghost.classList.remove('shake'); void ghost.getBBox(); ghost.classList.add('shake'); }
      return;
    }
    if (ev.usesSquirrel) { els.dlgSquirrel.showModal(); return; }
    doPlace(false);
  }

  function doPlace(withSquirrel) {
    const before = JSON.stringify(state);
    const res = H.play(state, ui.sel, ui.rot, ui.pos.x, ui.pos.y, { allowSquirrel: withSquirrel });
    if (!res.ok) { toast(res.reason, 'bad'); return; }
    history.push(before);
    if (history.length > 30) history.shift();
    const evs = res.changes.map((c) => c.event);
    ui.popKeys = res.changes.filter((c) => c.die && ['new', 'up', 'basket', 'barrow'].includes(c.event)).map((c) => c.k);
    if (evs.includes('barrow')) toast('La Brouette entre en jeu : 15 fruits !', 'gold');
    else if (evs.includes('basket')) toast('Panier ! Ce dé vaut désormais 10.', 'gold');
    else if (evs.includes('squirrel')) toast('L’Écureuil garde désormais cet arbre.');
    else if (res.gain > 0) toast(`+${res.gain} fruits`, 'ok');
    ui.fresh = true;
    ui.sel = null; ui.pos = null;
    computeView();
    save();
    renderAll();
    if (state.over) setTimeout(showEnd, 650);
  }

  function undo() {
    if (!history.length) return;
    state = JSON.parse(history.pop());
    ui.sel = null; ui.pos = null; ui.endShown = false;
    if (els.dlgEnd.open) els.dlgEnd.close();
    computeView();
    save();
    renderAll();
    toast('Coup annulé.');
  }

  let toastTimer = null;
  function toast(msg, kind) {
    els.toast.textContent = msg;
    els.toast.className = 'toast show ' + (kind || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { els.toast.className = 'toast'; }, 2400);
  }

  function showEnd() {
    if (ui.endShown) return;
    ui.endShown = true;
    const sc = H.score(state);
    els.endTitle.textContent = state.endReason === 'blocked' ? 'Le verger est bloqué !' : 'Récolte terminée !';
    let b = '';
    if (state.endReason === 'blocked') b += '<p class="note">Aucune carte de votre main ne peut plus être posée : la partie s’arrête.</p>';
    b += `<div class="end-score"><span>${sc.total}</span>fruits</div><div class="rank">${H.rank(sc.total)}</div>`;
    b += '<table class="end-table">';
    for (const t of H.TYPES) {
      const m = sc.mult[t] > 1 ? ` <small>(${sc.byType[t]} × ${sc.mult[t]})</small>` : '';
      b += `<tr><td><span class="dot" style="background:${DIE_FILL[t]}"></span>${H.FRUIT_LABEL[t]}${m}</td><td>${sc.scored[t]}</td></tr>`;
    }
    if (sc.lost) b += `<tr class="lost"><td><span class="dot rot"></span>Fruits pourris sur les clairières</td><td>0 <small>(${sc.lost})</small></td></tr>`;
    for (const r of sc.recipes) {
      const val = r.mult ? r.detail : r.done ? '+' + r.pts : '0';
      b += `<tr><td>${r.done || r.mult ? '✔' : '✘'} ${r.name}</td><td>${val}</td></tr>`;
    }
    b += `<tr class="tot"><td>Total</td><td>${sc.total}</td></tr></table>`;
    if (sc.target != null) b += `<p class="verdict ${sc.won ? 'win' : 'lose'}">${sc.won ? `Objectif de ${sc.target} atteint : victoire !` : `Objectif de ${sc.target} manqué de ${sc.target - sc.total}.`}</p>`;
    b += `<p class="small-note">Partie n° <b>${state.seed}</b> · ${sc.dice} dé(s) en jeu · cartes ${state.cards.join(', ')}</p>`;
    b += '<button type="button" id="btn-share" class="btn ghost share">Copier le défi pour un ami</button>';
    els.endBody.innerHTML = b;
    $('btn-share').addEventListener('click', () => share(sc));
    els.dlgEnd.showModal();
  }

  function shareUrl() {
    const u = new URL(location.href);
    u.search = '';
    u.searchParams.set('partie', state.seed);
    if (state.recipes) u.searchParams.set('recettes', state.recipes.join(','));
    return u.toString();
  }

  function share(sc) {
    const txt = `J’ai récolté ${sc.total} fruits à Ortie (partie n° ${state.seed}). À toi de jouer : ${shareUrl()}`;
    const done = () => toast('Défi copié !', 'ok');
    try {
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, () => window.prompt('Copiez ce texte :', txt));
      else window.prompt('Copiez ce texte :', txt);
    } catch (e) { window.prompt('Copiez ce texte :', txt); }
  }

  function start(seed, recipes) {
    state = H.newGame(seed || H.randomSeed(), { recipes });
    history = [];
    ui.sel = null; ui.pos = null; ui.rot = 0; ui.endShown = false; ui.fresh = true;
    computeView();
    save();
    renderAll();
    try { if (location.search) window.history.replaceState(null, '', location.pathname); } catch (e) { /* ignore */ }
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ state, history: history.slice(-15) })); } catch (e) { /* stockage indisponible */ }
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (!d || !d.state || !d.state.board || !Array.isArray(d.state.placed)) return false;
      state = d.state; history = d.history || [];
      return true;
    } catch (e) { return false; }
  }

  // ---------------------------------------------------- Légende des règles
  function renderLegend() {
    const tile = (inner, label) => `<figure><svg viewBox="0 0 100 100"><rect x="2" y="2" width="96" height="96" rx="14" fill="url(#p-meadow)"/>${inner}</svg><figcaption>${label}</figcaption></figure>`;
    let h = '';
    h += tile(cellSvg({ k: 'tree', t: 'orange', f: 1 }, 50, 50), 'Oranger · 1 fruit');
    h += tile(cellSvg({ k: 'tree', t: 'citron', f: 2 }, 50, 50), 'Citronnier · 2 fruits');
    h += tile(cellSvg({ k: 'tree', t: 'vert', f: 1 }, 50, 50), 'Citronnier vert');
    h += tile(cellSvg({ k: 'clear' }, 50, 50, 7), 'Clairière');
    h += `<figure><svg viewBox="-50 -50 100 100">${dieSvg({ t: 'orange', v: 3 }, 0, 0, { scale: 1.3 })}</svg><figcaption>Dé de fruits</figcaption></figure>`;
    h += `<figure><svg viewBox="-50 -50 100 100">${dieSvg({ t: 'citron', v: 10 }, 0, 0, { scale: 1.3 })}</svg><figcaption>Panier · 10</figcaption></figure>`;
    h += `<figure><svg viewBox="-50 -50 100 100">${dieSvg({ t: 'vert', v: 15, barrow: true }, 0, 0, { scale: 1.2 })}</svg><figcaption>Brouette · 15</figcaption></figure>`;
    h += `<figure><svg viewBox="-50 -50 100 100">${squirrelSvg(0, 0, 1.3)}</svg><figcaption>Écureuil</figcaption></figure>`;
    els.legend.innerHTML = h;
  }

  function fillRecipeSelects() {
    const opts = '<option value="">Au hasard</option>' + H.RECIPES.slice().sort((a, b) => a.target - b.target || a.name.localeCompare(b.name))
      .map((r) => `<option value="${r.id}">${r.target} · ${r.name}</option>`).join('');
    els.inR1.innerHTML = opts;
    els.inR2.innerHTML = opts;
  }

  // ------------------------------------------------------------- Évènements
  els.board.addEventListener('pointerdown', (e) => {
    lastPointerType = e.pointerType;
    if (ui.sel == null || state.over) return;
    if (e.pointerType === 'mouse') return;
    e.preventDefault();
    const p = boardPoint(e);
    if (!p) return;
    try { els.board.setPointerCapture(e.pointerId); } catch (err) { /* pointeur synthétique */ }
    ui.drag = { id: e.pointerId, start: p, startPos: ui.pos ? Object.assign({}, ui.pos) : centerAt(p), moved: false };
  });
  els.board.addEventListener('pointermove', (e) => {
    if (ui.sel == null || state.over) return;
    const p = boardPoint(e);
    if (!p) return;
    if (e.pointerType === 'mouse') {
      lastPointerType = 'mouse';
      setPos(centerAt(p));
      return;
    }
    const d = ui.drag;
    if (!d || d.id !== e.pointerId) return;
    const dx = p.x - d.start.x, dy = p.y - d.start.y;
    if (Math.abs(dx) > 0.25 || Math.abs(dy) > 0.25) d.moved = true;
    if (d.moved) setPos({ x: d.startPos.x + Math.round(dx), y: d.startPos.y + Math.round(dy) });
  });
  els.board.addEventListener('pointerup', (e) => {
    if (ui.sel == null || state.over) return;
    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return;
      const p = boardPoint(e);
      if (p) setPos(centerAt(p));
      tryPlace();
      return;
    }
    const d = ui.drag;
    ui.drag = null;
    if (d && !d.moved) { const p = boardPoint(e); if (p) setPos(centerAt(p)); }
    updateControls(currentEval());
  });
  els.board.addEventListener('pointercancel', () => { ui.drag = null; });
  els.board.addEventListener('contextmenu', (e) => { if (ui.sel != null) { e.preventDefault(); rotate(1); } });
  els.board.addEventListener('wheel', (e) => {
    if (ui.sel == null) return;
    e.preventDefault();
    rotate(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  // Le plateau ne doit jamais faire défiler ni zoomer la page : on capte les gestes tactiles.
  const stopScroll = (e) => { if (e.cancelable) e.preventDefault(); };
  els.boardWrap.addEventListener('touchstart', stopScroll, { passive: false });
  els.boardWrap.addEventListener('touchmove', stopScroll, { passive: false });
  els.boardWrap.addEventListener('gesturestart', stopScroll, { passive: false });
  document.addEventListener('dblclick', (e) => { if (els.boardWrap.contains(e.target)) e.preventDefault(); }, { passive: false });

  // Panneau « Détails » (mobile)
  function setSide(open) {
    document.body.classList.toggle('side-open', open);
    els.btnDetails.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  els.btnDetails.addEventListener('click', () => setSide(!document.body.classList.contains('side-open')));
  els.btnSideClose.addEventListener('click', () => setSide(false));
  els.sideBackdrop.addEventListener('click', () => setSide(false));

  els.btnRotL.addEventListener('click', () => rotate(-1));
  els.btnRotR.addEventListener('click', () => rotate(1));
  els.btnPlace.addEventListener('click', tryPlace);
  els.btnHint.addEventListener('click', suggest);
  els.btnUndo.addEventListener('click', undo);
  els.btnRules.addEventListener('click', () => els.dlgRules.showModal());
  els.btnNew.addEventListener('click', () => {
    els.inSeed.value = '';
    els.inRecipes.checked = !!state.recipes;
    els.recipePick.hidden = !els.inRecipes.checked;
    els.inR1.value = ''; els.inR2.value = '';
    els.dlgNew.showModal();
  });
  els.inRecipes.addEventListener('change', () => { els.recipePick.hidden = !els.inRecipes.checked; });
  els.dlgNew.addEventListener('close', () => {
    if (els.dlgNew.returnValue !== 'start') return;
    let rec = false;
    if (els.inRecipes.checked) {
      const picks = [els.inR1.value, els.inR2.value].filter(Boolean).map(Number);
      rec = picks.length ? Array.from(new Set(picks)) : true;
    }
    start(els.inSeed.value.trim(), rec);
  });
  els.dlgSquirrel.addEventListener('close', () => {
    if (els.dlgSquirrel.returnValue === 'ok') doPlace(true);
  });
  els.dlgEnd.addEventListener('close', () => {
    const v = els.dlgEnd.returnValue;
    if (v === 'again') start(state.seed, state.recipes ? state.recipes.slice() : false);
    else if (v === 'next') start(null, state.recipes ? true : false);
  });
  els.dlgRules.addEventListener('close', () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* ignore */ } });

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('dialog[open]')) return;
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
    const k = e.key.toLowerCase();
    if (k === '1' || k === '2') { const id = state.hand[Number(k) - 1]; if (id) selectCard(id); }
    else if (k === 'r' || k === 'e') rotate(1);
    else if (k === 'q') rotate(-1);
    else if (k === 'h') suggest();
    else if (k === 'enter') { if (ui.sel != null) { e.preventDefault(); tryPlace(); } }
    else if (k === 'escape') {
      if (document.body.classList.contains('side-open')) { setSide(false); return; }
      ui.sel = null; ui.pos = null; renderHand(); renderGhost();
    }
    else if (k.startsWith('arrow')) {
      if (ui.sel == null) return;
      e.preventDefault();
      const p = ui.pos ? Object.assign({}, ui.pos) : { x: 0, y: 0 };
      if (k === 'arrowleft') p.x--; if (k === 'arrowright') p.x++;
      if (k === 'arrowup') p.y--; if (k === 'arrowdown') p.y++;
      setPos(p);
    }
  });

  // ---------------------------------------------------------------- Démarrage
  buildDefs();
  renderLegend();
  fillRecipeSelects();
  const params = new URLSearchParams(location.search);
  if (params.get('partie')) {
    const rp = params.get('recettes');
    const rec = rp == null ? false : rp ? rp.split(',').map(Number).filter(Boolean) : true;
    start(params.get('partie'), rec && rec.length === 0 ? true : rec);
  } else if (load()) {
    computeView();
    renderAll();
    if (state.over) ui.endShown = true;
  } else {
    start(null, false);
  }
  let seen = false;
  try { seen = !!localStorage.getItem(SEEN_KEY); } catch (e) { seen = true; }
  if (!seen) els.dlgRules.showModal();
})();
