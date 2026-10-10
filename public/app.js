/* Ortie — interface (rendu SVG + interactions). */
(function () {
  'use strict';
  const H = window.OrtieCore;
  const S = 100; // taille d'une case en unités SVG
  const CW = H.CARD_W * S, CH = H.CARD_H * S;
  const APP_VERSION = '1.14';
  const STORE_KEY = 'ortie.save.v3';
  const OLD_STORE_KEY = 'ortie.save.v2';
  const SEEN_KEY = 'ortie.seenRules';
  const PREFS_KEY = 'ortie.prefs';

  // Design des cartes (prairie + buissons). Les fruits gardent toujours leurs couleurs.
  const CARD_THEMES = {
    classic: { name: 'Classique', base: '#9acd47', blobs: ['#a6d653', '#8ec23f', '#a3d250', '#8fc341', '#a9d958'], star: '#f4e45a', dot: '#f39b84', border: '#6c9f2f', hi: '#c6ea7d', num: '#2b6a2b',
      bush: { back: '#1d5527', l1: '#2c7a36', l2: '#3a8c3e', l3: '#4b9f45', stroke: '#17451f', r1: '#78b866', r2: '#8cc874', r3: '#a2d688' } },
    spring: { name: 'Printemps', base: '#bfe58a', blobs: ['#cdeda0', '#b1db76', '#c8ea96', '#b6df7e', '#d6f2ad'], star: '#ffffff', dot: '#f27aa6', border: '#8dbd52', hi: '#eefad8', num: '#3d7a2f',
      bush: { back: '#2a6a31', l1: '#3c8f44', l2: '#4fa453', l3: '#69bb62', stroke: '#1f5226', r1: '#9bd68c', r2: '#b2e3a0', r3: '#c8edb8' } },
    autumn: { name: 'Automne', base: '#dcb45a', blobs: ['#e5c26b', '#d0a549', '#e0bb62', '#c99c43', '#ead07c'], star: '#fff4b8', dot: '#c2502a', border: '#a8823a', hi: '#f5e2a6', num: '#7a4a14',
      bush: { back: '#3b4f1e', l1: '#55702a', l2: '#6a8534', l3: '#82993f', stroke: '#283612', r1: '#a7bb6a', r2: '#b9c97e', r3: '#cbd893' } },
    night: { name: 'Nuit', base: '#2c5a49', blobs: ['#346753', '#275243', '#31624f', '#244c3e', '#3a6f59'], star: '#ffe86f', dot: '#8fd0ff', border: '#173a2e', hi: '#5c977d', num: '#dff3c8',
      bush: { back: '#0f3020', l1: '#1d4f31', l2: '#26603c', l3: '#31744a', stroke: '#08200f', r1: '#5f9e72', r2: '#74b285', r3: '#8cc69a' } },
    winter: { name: 'Hiver', base: '#e2eef1', blobs: ['#f3f9fa', '#d2e3e8', '#ebf4f6', '#d8e7eb', '#f8fcfc'], star: '#ffffff', dot: '#93bfd2', border: '#a6c2cc', hi: '#ffffff', num: '#2e5a6b',
      bush: { back: '#1c473a', l1: '#2a644f', l2: '#357860', l3: '#468d72', stroke: '#133429', r1: '#8fc9b4', r2: '#a6d6c4', r3: '#c0e5d6' } },
  };
  const BOARDS = { oak: 'Chêne clair', walnut: 'Noyer', felt: 'Tapis bleu', linen: 'Lin', slate: 'Ardoise', terracotta: 'Tomettes' };
  const PLAYER_COLORS = ['#f06a32', '#3b7fc4'];
  const THEMES = { auto: 'Automatique', light: 'Clair', dark: 'Sombre' };
  const prefs = { theme: 'auto', board: 'oak', cards: 'classic', names: ['', ''], sound: { music: true, sfx: true, musicVol: 0.4, sfxVol: 0.7 } };
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    Object.assign(prefs, saved, { sound: Object.assign({}, prefs.sound, saved.sound || {}) });
  } catch (e) { /* ignore */ }
  // Son (sound.js) : musique et effets, désactivables et réglables dans les Paramètres
  const snd = window.OrtieSound || { configure() {}, play() {}, dice() {} };
  snd.configure(prefs.sound);
  const sfx = (name, opt) => { try { snd.play(name, opt); } catch (e) { /* le son ne doit jamais bloquer le jeu */ } };
  if (!BOARDS[prefs.board]) prefs.board = 'oak';
  if (!THEMES[prefs.theme]) prefs.theme = 'auto';
  if (!CARD_THEMES[prefs.cards]) prefs.cards = 'classic';
  function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ } }

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
    btnUndo: $('btn-undo'), btnNew: $('btn-new'), btnPlace: $('btn-place'),
    placeLabel: $('place-label'), placeGain: $('place-gain'),
    btnRotL: $('btn-rot-l'), btnRotR: $('btn-rot-r'), btnHint: $('btn-hint'),
    dlgNew: $('dlg-new'), dlgEnd: $('dlg-end'), dlgRules: $('dlg-rules'), dlgSquirrel: $('dlg-squirrel'),
    inSeed: $('in-seed'), inRecipes: $('in-recipes'), inR1: $('in-r1'), inR2: $('in-r2'), recipePick: $('recipe-pick'),
    endTitle: $('end-title'), endBody: $('end-body'), legend: $('legend'), defs: $('defs'),
    btnMenu: $('btn-menu'), dlgMenu: $('dlg-menu'), menuInstall: $('menu-install'),
    dlgCustom: $('dlg-custom'), optBoards: $('opt-boards'), optCards: $('opt-cards'), optThemes: $('opt-themes'), dlgSettings: $('dlg-settings'),
    dlgTurn: $('dlg-turn'), turnBody: $('turn-body'),
    inModeSolo: $('in-mode-solo'), inModeDuo: $('in-mode-duo'), duoNames: $('duo-names'), inP1: $('in-p1'), inP2: $('in-p2'),
    players: $('players'), playersList: $('players-list'), playerPill: $('player-pill'), whoChip: $('who-chip'), whoMini: $('who-mini'),
  };

  // match.players[i].state est un état de partie du moteur ; `state` désigne
  // toujours celui du joueur affiché.
  let match = null;
  let state = null;
  let history = [];
  const isDuo = () => !!match && match.mode === 'duo';
  const curPlayer = () => match.players[match.cur];
  function syncState() { state = match.players[match.cur].state; }
  const ui = { locked: false, sel: null, rot: 0, pos: null, anchor: null, spin: null, lastTap: null, lastHandTap: null, drag: null, handDrag: null, dragEndAt: -1e9, fresh: null, popKeys: [], view: null, endShown: false };

  // ------------------------------------------------------------- Graphismes
  // Buisson en rosette de feuilles, comme sur les cartes.
  function buildDefs() {
    const leaf = (r0, r1, w) => {
      const a = r0 + (r1 - r0) * 0.35, b = r0 + (r1 - r0) * 0.8;
      return `M0 ${-r0}C${w} ${-a} ${w * 0.75} ${-b} 0 ${-r1}C${-w * 0.75} ${-b} ${-w} ${-a} 0 ${-r0}Z`;
    };
    const ring = (n, off, r0, r1, w, fill, rib, stroke) => {
      let s = '';
      for (let i = 0; i < n; i++) {
        const ang = off + (i * 360) / n;
        s += `<g transform="rotate(${ang.toFixed(1)})"><path d="${leaf(r0, r1, w)}" fill="${fill}" stroke="${stroke}" stroke-width="1.1"/><path d="M0 ${-r0 - 2}L0 ${-r1 + 4}" stroke="${rib}" stroke-width="1" opacity=".55"/></g>`;
      }
      return s;
    };
    const star = (x, y, sc, c) => `<path transform="translate(${x} ${y}) scale(${sc})" d="M0-4L1-1L4 0L1 1L0 4L-1 1L-4 0L-1-1Z" fill="${c}"/>`;
    let out = '';
    for (const [id, T] of Object.entries(CARD_THEMES)) {
      // Buisson en rosette de feuilles, comme sur les cartes
      const B = T.bush;
      out += `<g id="bush-${id}"><circle r="38" fill="${B.back}"/>`;
      out += ring(17, 0, 16, 45, 10.5, B.l1, B.r1, B.stroke);
      out += ring(13, 12, 9, 35, 10, B.l2, B.r2, B.stroke);
      out += ring(9, 5, 3, 24, 8.5, B.l3, B.r3, B.stroke);
      out += `<circle r="9" fill="${B.l2}"/></g>`;
      // Prairie mouchetée (fleurs et pétales)
      out += `<pattern id="p-meadow-${id}" width="64" height="64" patternUnits="userSpaceOnUse"><rect width="64" height="64" fill="${T.base}"/>`;
      [[8, 12, 9], [40, 6, 7], [30, 34, 10], [54, 44, 8], [12, 50, 7]].forEach(([x, y, r], i) => { out += `<circle cx="${x}" cy="${y}" r="${r}" fill="${T.blobs[i]}" opacity=".7"/>`; });
      out += star(6, 6, 0.8, T.star) + star(26, 18, 0.6, T.star) + star(48, 26, 0.8, T.star) + star(18, 40, 0.7, T.star) + star(58, 58, 0.6, T.star) + star(38, 54, 0.75, T.star);
      for (const [x, y] of [[14, 26], [34, 10], [52, 14], [44, 40], [6, 36], [26, 58], [60, 32]]) out += `<circle cx="${x}" cy="${y}" r="1.3" fill="${T.dot}"/>`;
      out += '</pattern>';
    }
    out += '<g id="bush"><use href="#bush-classic"/></g>';
    els.defs.insertAdjacentHTML('beforeend', out);
  }

  function fruitsSvg(cell) {
    const use = (dx, dy, s) => `<use href="#fruit-${cell.t}" transform="translate(${dx} ${dy}) rotate(${cell.t === 'citron' ? -28 : 0}) scale(${s})"/>`;
    return cell.f === 2 ? use(-10, -9, 0.95) + use(10, 9, 0.95) : use(0, 0, 1.05);
  }

  function cellSvg(cell, cx, cy, cardId, theme) {
    const th = theme || prefs.cards;
    if (cell.k === 'tree') {
      return `<g transform="translate(${cx} ${cy})"><use href="#bush-${th}" filter="url(#f-soft)"/>${fruitsSvg(cell)}</g>`;
    }
    return `<text x="${cx}" y="${cy}" transform="rotate(-90 ${cx} ${cy})" dy="8" text-anchor="middle" class="card-num" fill="${CARD_THEMES[th].num}">${cardId}</text>`;
  }

  // Carte dans son orientation de base (300 × 200), coin haut-gauche en (0,0).
  function cardArt(card, theme) {
    const th = theme || prefs.cards;
    const T = CARD_THEMES[th];
    let g = `<rect x="2" y="2" width="${CW - 4}" height="${CH - 4}" rx="14" fill="url(#p-meadow-${th})" stroke="${T.border}" stroke-width="2.5"/>`;
    g += `<rect x="6" y="6" width="${CW - 12}" height="${CH - 12}" rx="11" fill="none" stroke="${T.hi}" stroke-width="1.5" opacity=".6"/>`;
    card.cells.forEach((cell, i) => {
      g += cellSvg(cell, (i % H.CARD_W) * S + S / 2, Math.floor(i / H.CARD_W) * S + S / 2, card.id, th);
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
      const edge = DIE_EDGE[die.t] || '#6e4317';
      return `<g transform="translate(${cx} ${cy}) scale(${sc})"><g class="${cls}" filter="url(#f-shadow)"><g transform="translate(-31 -31) scale(.97)">${barrowArt(die.t)}</g><g transform="translate(22 22)"><circle r="13" fill="#fffaf0" stroke="${edge}" stroke-width="2"/><text y="5" text-anchor="middle" class="die-num">15</text></g></g></g>`;
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

  // Jeton Brouette (64 × 64) : fond de la couleur du fruit qui l'a remplie,
  // brouette en bois (jamais verte, pour rester lisible sur un fond vert).
  // Sans fruit (`t` absent) : jeton générique en bois, avec les trois fruits.
  function barrowArt(t) {
    const fill = t ? DIE_FILL[t] : 'url(#g-wood)';
    const edge = t ? DIE_EDGE[t] : '#6e4317';
    const fr = t ? [t, t, t] : ['orange', 'citron', 'vert'];
    const fruit = (f, x, y, sc) => `<use href="#fruit-${f}" transform="translate(${x} ${y}) rotate(${f === 'citron' ? -24 : 0}) scale(${sc})"/>`;
    let g = `<circle cx="32" cy="32" r="30" fill="${fill}" stroke="#fffaf0" stroke-width="3.5"/>`;
    g += `<circle cx="32" cy="32" r="31.5" fill="none" stroke="${edge}" stroke-width="1.6"/>`;
    g += '<circle cx="32" cy="32" r="25.5" fill="none" stroke="#fff" stroke-width="1.2" opacity=".35"/>';
    g += '<ellipse cx="25" cy="16" rx="12" ry="5" fill="#fff" opacity=".18"/>';
    // fruits qui dépassent de la caisse
    g += fruit(fr[0], 21, 22, 0.58) + fruit(fr[1], 31, 19, 0.58) + fruit(fr[2], 41, 22, 0.58);
    // caisse en bois
    g += '<path d="M11 25h36l-5.5 15H16.5z" fill="#b97a3d" stroke="#5a3515" stroke-width="2" stroke-linejoin="round"/>';
    g += '<path d="M13.5 30.5h31M15.5 35.5h27" stroke="#8a5424" stroke-width="1.4"/>';
    g += '<path d="M12.5 26.5h33" stroke="#e2a96a" stroke-width="1.2" opacity=".8"/>';
    // poignées, pieds et roue
    g += '<path d="M46 27l9.5-5.5M18 40l-3 8.5M40.5 40l3 8.5" stroke="#4a2b10" stroke-width="2.8" stroke-linecap="round"/>';
    g += '<circle cx="29" cy="46.5" r="6.2" fill="#3a2a1a" stroke="#1d140c" stroke-width="2"/><circle cx="29" cy="46.5" r="2" fill="#c9a77a"/>';
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
    let prog = '';
    if (status) {
      if (r.mult) st = `<span class="rstate on">${status.detail || 'actif'}</span>`;
      else if (status.done) st = '<span class="rstate ok">✔ réussie</span>';
      else if (status.final) st = '<span class="rstate ko">✘ ratée</span>';
      else st = '<span class="rstate">en cours</span>';
      if (!r.mult && status.progress) prog = `<div class="rprog">${status.progress}</div>`;
    }
    return `<div class="rcard${status && status.done && !r.mult ? ' done' : status && status.final && !r.mult ? ' ko' : ''}">
      ${recipeBadge(r)}
      <div class="rbody">
        <div class="rname" style="color:${ink}">${r.name}</div>
        <div class="rtext">${r.text}${r.small ? ` <small>(${r.small})</small>` : ''}</div>
        ${prog}
        <div class="rfoot"><span class="rbonus">${bonus}</span>${st}</div>
      </div>
      <svg viewBox="0 0 80 80" class="ricon" aria-hidden="true">${recipeIcon(r)}</svg>
    </div>`;
  }

  // ----------------------------------------------------------------- Rendu
  // Cadrage du plateau. En cours de partie, il ne fait que s'agrandir quand la
  // place manque (les cartes déjà posées ne sautent pas d'un tour à l'autre).
  function computeView(keep) {
    const b = H.bounds(state);
    let minX = b.minX - 2, minY = b.minY - 2, maxX = b.maxX + 3, maxY = b.maxY + 3;
    const minW = 7, minH = 7;
    if (maxX - minX < minW) { const d = minW - (maxX - minX); minX -= Math.floor(d / 2); maxX += Math.ceil(d / 2); }
    if (maxY - minY < minH) { const d = minH - (maxY - minY); minY -= Math.floor(d / 2); maxY += Math.ceil(d / 2); }
    const old = ui.view;
    if (keep && old) {
      minX = Math.min(minX, old.minX); minY = Math.min(minY, old.minY);
      maxX = Math.max(maxX, old.maxX); maxY = Math.max(maxY, old.maxY);
    }
    ui.view = { minX, minY, maxX, maxY };
    ui.animateView = !!keep;
  }

  let viewAnim = 0;
  function setViewBox(target) {
    cancelAnimationFrame(viewAnim);
    const cur = (els.board.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!ui.animateView || reduce || cur.length !== 4 || cur.some(isNaN) || cur.every((v, i) => v === target[i])) {
      els.board.setAttribute('viewBox', target.join(' '));
      return;
    }
    // Transition douce au lieu d'un saut quand le plateau s'agrandit.
    const t0 = performance.now(), dur = 420;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const k = 1 - Math.pow(1 - t, 3);
      els.board.setAttribute('viewBox', cur.map((v, i) => (v + (target[i] - v) * k).toFixed(2)).join(' '));
      if (t < 1) viewAnim = requestAnimationFrame(step);
    };
    viewAnim = requestAnimationFrame(step);
  }

  function renderBoard() {
    const v = ui.view;
    setViewBox([v.minX * S, v.minY * S, (v.maxX - v.minX) * S, (v.maxY - v.minY) * S]);
    ui.animateView = false;
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
    let g = `<g class="ghost-card ${status} ${ui.spin || ''}">${placedCardSvg(ui.sel, ui.rot, ui.pos.x, ui.pos.y)}</g>`;
    ui.spin = null;
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
    else if (!ev) msg = touchMode() ? 'Touchez le verger (ou glissez la carte) pour la placer.' : 'Survolez le verger pour placer la carte.';
    else if (ev.ok) {
      if (ev.usesSquirrel) msg = 'Possible avec l’Écureuil (une seule fois par partie).';
      else msg = touchMode() ? 'Pose valide : touchez « Poser ».' : 'Pose valide : cliquez pour poser.';
      if (ev.notes.length) msg += ' ' + ev.notes.join(' ');
      cls = ev.usesSquirrel ? 'warn' : 'ok';
    } else { msg = ev.reason; cls = 'bad'; }
    els.hint.textContent = msg;
    els.hint.className = 'hint ' + cls;
    els.boardHelp.textContent = !sel ? '' : !ui.pos ? (touchMode() ? 'Touchez le verger pour y placer la carte' : 'Survolez le verger pour placer la carte')
      : (touchMode() ? 'Glissez la carte du doigt · touchez 2 fois pour tourner' : 'Survolez pour déplacer · molette pour tourner · clic pour poser');
    els.boardHelp.classList.toggle('show', sel);
    fitTexts();
  }

  // Les textes de la barre du bas tiennent toujours sur une ligne : si besoin,
  // la police rétrécit (au lieu de passer à la ligne et de faire sauter l'écran).
  function fitText(el, max, min) {
    el.style.fontSize = max + 'px';
    if (!el.clientWidth) return;
    let size = max;
    while (size > min && el.scrollWidth > el.clientWidth + 1) {
      size = Math.max(min, size - 0.5);
      el.style.fontSize = size + 'px';
    }
  }
  function fitTexts() {
    const narrow = window.matchMedia('(max-width: 820px)').matches;
    fitText(els.hint, narrow ? 13 : 14, 9);
    const L = els.placeLabel;
    const clipped = () => L.scrollWidth > L.clientWidth + 1;
    els.placeGain.style.display = '';
    fitText(L, narrow ? 16 : 17, 11);
    // Écran très étroit : libellé court, puis gain masqué (il reste affiché sur la carte),
    // plutôt qu'un texte coupé ou un bouton qui change de taille.
    if (clipped() && L.textContent === 'Poser avec l’Écureuil') {
      L.textContent = 'Poser (Écureuil)';
      fitText(L, narrow ? 16 : 17, 10);
    }
    if (clipped()) {
      els.placeGain.style.display = 'none';
      fitText(L, narrow ? 16 : 17, 10);
    }
    fitText(els.boardHelp, narrow ? 12 : 13, 9);
  }
  let fitTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitTexts, 80); });

  let lastPointerType = 'mouse';
  const touchMode = () => lastPointerType !== 'mouse' || window.matchMedia('(hover: none)').matches;
  let lastTouchAt = -1e9;
  let lastTouchEnd = -1e9;
  function noteTouch() { lastTouchAt = performance.now(); lastPointerType = 'touch'; }
  const recentTouch = () => performance.now() - lastTouchAt < 900;
  function findTouch(list, id) {
    for (let i = 0; i < list.length; i++) if (list[i].identifier === id) return list[i];
    return null;
  }

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
      // Souris / clavier
      b.addEventListener('click', () => {
        if (recentTouch() || performance.now() - ui.dragEndAt < 80) return;
        selectCard(id);
      });
      b.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch' && !recentTouch()) startHandDrag(e, id); });
      // Doigt (iPhone / Android) : évènements tactiles natifs
      b.addEventListener('touchstart', (e) => {
        noteTouch();
        if (e.cancelable) e.preventDefault(); // pas de zoom, de défilement ni de menu
        if (state.over || e.touches.length > 1) return;
        const t = e.changedTouches[0];
        ui.handDrag = { id, touchId: t.identifier, x: t.clientX, y: t.clientY, moved: false };
      }, { passive: false });
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
    const bw = Object.values(state.board).find((e) => e.die && e.die.barrow);
    els.barrow.className = 'token';
    els.barrow.innerHTML = `<svg viewBox="0 0 64 64">${barrowArt(bw ? bw.die.t : null)}</svg><span><b>Brouette</b><small>${bw ? 'en jeu · ' + H.FRUIT_LABEL[bw.die.t].toLowerCase() : state.barrowFree ? 'libre · 15 fruits' : 'en jeu'}</small></span>`;
    els.squirrel.className = 'token' + (state.squirrelUsed ? ' used' : '');
    els.squirrel.innerHTML = `<svg viewBox="0 0 64 64"><use href="#squirrel"/></svg><span><b>Écureuil</b><small>${state.squirrelUsed ? 'utilisé' : '1 fois / partie'}</small></span>`;

    if (sc.recipes.length) {
      els.recipes.hidden = false;
      els.recipeList.innerHTML = sc.recipes.map((x) => recipeCardHtml(H.RECIPE_BY_ID[x.id], x)).join('');
    } else els.recipes.hidden = true;

    els.btnUndo.disabled = history.length === 0;
    renderPlayers();
  }

  function renderPlayers() {
    const duo = isDuo();
    document.body.classList.toggle('duo', duo);
    els.players.hidden = !duo;
    els.playerPill.hidden = !duo;
    els.whoChip.hidden = !duo;
    els.whoMini.hidden = !duo;
    if (!duo) return;
    const vi = viewedIndex();
    const vp = match.players[vi];
    const over = allOver();
    els.whoChip.innerHTML = `<i class="who-dot" style="background:${vp.color}"></i>${esc(vp.name)} · `;
    els.whoMini.style.background = vp.color;
    const n = Math.min(vp.state.placed.length + (vp.state.over ? 0 : 1), H.GAME_CARDS);
    els.playerPill.innerHTML = `<i class="who-dot" style="background:${vp.color}"></i><b>${esc(vp.name)}</b><span>${over ? 'voir l’autre verger ⇄' : vp.state.over ? 'terminé' : 'carte ' + n + '/' + H.GAME_CARDS}</span>`;
    els.playerPill.classList.toggle('can-switch', over);
    els.playerPill.style.setProperty('--pc', vp.color);
    els.playersList.innerHTML = match.players.map((p, i) => {
      const sc = H.score(p.state);
      const cards = Math.min(p.state.placed.length, H.GAME_CARDS);
      const tag = over ? (i === vi ? 'affiché' : 'voir') : p.state.over ? 'terminé' : i === match.cur ? 'à jouer' : '';
      return `<button type="button" class="pl${i === vi ? ' on' : ''}" data-player="${i}" ${over ? '' : 'disabled'}><i class="who-dot" style="background:${p.color}"></i><span class="pl-name">${esc(p.name)}</span><span class="pl-tag">${tag}</span><span class="pl-cards">${cards}/${H.GAME_CARDS}</span><b>${sc.total}</b></button>`;
    }).join('');
  }

  // Fin de partie à deux : on peut regarder le verger de chaque joueur.
  function viewPlayer(i) {
    if (!isDuo() || !allOver() || i === viewedIndex()) return;
    match.cur = i;
    syncState();
    ui.sel = null; ui.pos = null;
    computeView();
    save();
    renderAll();
  }

  function renderAll() {
    renderBoard();
    renderHand();
    renderDeck();
    renderSide();
  }

  // ------------------------------------------------------------ Interactions
  // Choisir une carte ne la pose pas sur le verger : elle n'apparaît que là où
  // le joueur touche, glisse ou survole le plateau.
  function selectCard(id) {
    if (state.over || ui.locked) return;
    if (ui.sel === id) { ui.sel = null; ui.pos = null; }
    else { ui.sel = id; ui.rot = 0; ui.pos = null; ui.anchor = null; sfx('select'); }
    renderHand();
    renderGhost();
  }

  // Glisser une carte de la main directement sur le plateau (doigt ou souris).
  function startHandDrag(e, id) {
    if (state.over || ui.locked || (e.pointerType === 'mouse' && e.button !== 0)) return;
    lastPointerType = e.pointerType;
    ui.handDrag = { id, pointerId: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }

  function overBoard(e) {
    const r = els.board.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }

  function handDragMove(d, pt, finger) {
    if (!d.moved) {
      if (Math.hypot(pt.clientX - d.x, pt.clientY - d.y) < 10) return;
      d.moved = true;
      document.body.classList.add('dragging');
      if (ui.sel !== d.id) { ui.sel = d.id; ui.rot = 0; ui.pos = null; ui.anchor = null; sfx('select'); }
      // pas de re-rendu de la main pendant le geste (l'élément touché doit rester en place)
      for (const btn of els.hand.querySelectorAll('.hand-card')) btn.classList.toggle('selected', btn.getAttribute('aria-label') === 'Carte n°' + d.id);
    }
    if (!overBoard(pt)) return;
    const p = boardPoint(pt);
    if (!p) return;
    // au doigt, la carte apparaît un peu au-dessus pour rester visible
    if (finger) p.y -= 0.9;
    setPos(centerAt(p));
  }

  function finishHandDrag(d) {
    ui.handDrag = null;
    document.body.classList.remove('dragging');
    if (!d.moved) return false;
    ui.dragEndAt = performance.now();
    renderHand();
    renderGhost();
    return true;
  }

  // Souris
  document.addEventListener('pointermove', (e) => {
    const d = ui.handDrag;
    if (!d || d.pointerId == null || d.pointerId !== e.pointerId) return;
    handDragMove(d, e, false);
  });
  const endMouseHandDrag = (e) => {
    const d = ui.handDrag;
    if (d && d.pointerId != null && d.pointerId === e.pointerId) finishHandDrag(d);
  };
  document.addEventListener('pointerup', endMouseHandDrag);
  document.addEventListener('pointercancel', endMouseHandDrag);

  // Toucher simple / double sur une carte de la main
  function handTap(id) {
    const now = performance.now();
    const prev = ui.lastHandTap;
    if (prev && prev.id === id && now - prev.t < DOUBLE_TAP_MS) {
      // double toucher : on annule l'effet du 1er toucher, puis on tourne
      ui.lastHandTap = null;
      ui.sel = id; ui.rot = prev.rot; ui.pos = prev.pos; ui.anchor = prev.anchor;
      tapRotate();
      return;
    }
    if (ui.sel === id) {
      ui.lastHandTap = { id, t: now, rot: ui.rot, pos: ui.pos, anchor: ui.anchor };
      selectCard(id); // toucher lent sur la carte choisie : désélection
    } else {
      selectCard(id);
      ui.lastHandTap = { id, t: now, rot: ui.rot, pos: ui.pos, anchor: null };
    }
  }

  function suggest() {
    if (state.over || ui.locked) return;
    const m = H.bestMove(state, ui.sel != null ? [ui.sel] : state.hand);
    if (!m) { toast('Aucune pose possible avec cette carte.', 'bad'); sfx('bad'); return; }
    sfx('hint');
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
      // Le centre exact de la carte est conservé d'une rotation à l'autre :
      // tourner plusieurs fois ne fait pas « glisser » la carte.
      let a = ui.anchor;
      if (!a || Math.round(a.x - oldFp.w / 2) !== ui.pos.x || Math.round(a.y - oldFp.h / 2) !== ui.pos.y) {
        a = { x: ui.pos.x + oldFp.w / 2, y: ui.pos.y + oldFp.h / 2 };
      }
      ui.anchor = a;
      const nf = H.footprint(H.cardById(ui.sel), ui.rot);
      ui.pos = { x: Math.round(a.x - nf.w / 2), y: Math.round(a.y - nf.h / 2) };
    }
    ui.spin = d > 0 ? 'spin-r' : 'spin-l';
    sfx('rotate');
    renderHand();
    renderGhost();
  }

  // Double toucher (doigt) : la carte tourne d'un quart de tour.
  const DOUBLE_TAP_MS = 420;
  function isDoubleTap(e, where) {
    const now = performance.now();
    const t = ui.lastTap;
    const dbl = !!t && t.where === where && now - t.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 45;
    ui.lastTap = dbl ? null : { t: now, x: e.clientX, y: e.clientY, where };
    return dbl;
  }
  function tapRotate() {
    rotate(1);
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (err) { /* ignore */ }
  }

  function insideGhost(p) {
    if (!ui.pos || ui.sel == null) return false;
    const fp = H.footprint(H.cardById(ui.sel), ui.rot);
    return p.x >= ui.pos.x && p.x < ui.pos.x + fp.w && p.y >= ui.pos.y && p.y < ui.pos.y + fp.h;
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
      sfx('bad');
      const ghost = els.board.querySelector('.ghost-frame');
      if (ghost) { ghost.classList.remove('shake'); void ghost.getBBox(); ghost.classList.add('shake'); }
      return;
    }
    if (ev.usesSquirrel) { openDialog(els.dlgSquirrel); return; }
    doPlace(false);
  }

  const allOver = () => match.players.every((p) => p.state.over);
  const viewedIndex = () => Math.max(0, match.players.findIndex((p) => p.state === state));
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function openDialog(d) {
    d.returnValue = ''; // sinon Échap rejouerait le dernier choix (ex. « Planter le verger »)
    if (!d.open) d.showModal();
  }

  function doPlace(withSquirrel) {
    if (ui.locked) return;
    const before = JSON.stringify(match);
    const res = H.play(state, ui.sel, ui.rot, ui.pos.x, ui.pos.y, { allowSquirrel: withSquirrel });
    if (!res.ok) { toast(res.reason, 'bad'); return; }
    history.push(before);
    if (history.length > 30) history.shift();
    const evs = res.changes.map((c) => c.event);
    ui.popKeys = res.changes.filter((c) => c.die && ['new', 'up', 'basket', 'barrow'].includes(c.event)).map((c) => c.k);
    sfx('place');
    try { snd.dice(res.changes.filter((c) => c.die && ['new', 'up', 'basket', 'barrow'].includes(c.event)).map((c) => c.die.v)); } catch (e) { /* ignore */ }
    const special = evs.includes('barrow') ? 'barrow' : evs.includes('basket') ? 'basket' : evs.includes('squirrel') ? 'squirrel' : null;
    if (special) setTimeout(() => sfx(special, special === 'barrow' ? { duck: 2 } : null), 220);
    if (evs.includes('barrow')) toast('La Brouette entre en jeu : 15 fruits !', 'gold');
    else if (evs.includes('basket')) toast('Panier ! Ce dé vaut désormais 10.', 'gold');
    else if (evs.includes('squirrel')) toast('L’Écureuil garde désormais cet arbre.');
    else if (res.gain > 0) toast(`+${res.gain} fruits`, 'ok');
    ui.fresh = true;
    ui.sel = null; ui.pos = null;
    computeView(true);
    // À deux : on passe la main à l'autre joueur s'il lui reste des cartes.
    let next = match.cur;
    if (isDuo() && !match.players[1 - match.cur].state.over) next = 1 - match.cur;
    const switching = next !== match.cur;
    if (switching) { match.cur = next; ui.locked = true; } // le coup reste affiché un instant
    save();
    renderAll();
    clearTimeout(ui.turnTimer);
    if (switching) ui.turnTimer = setTimeout(showTurn, 800);
    else if (allOver()) ui.turnTimer = setTimeout(showEnd, 650);
  }

  // Écran « À X de jouer » (on se passe l'appareil).
  function showTurn() {
    const p = curPlayer();
    const prev = match.players[1 - match.cur];
    const sc = H.score(p.state);
    let h = `<div class="turn-head"><span class="big-dot" style="background:${p.color}"></span><div><h2>À ${esc(p.name)} de jouer !</h2>`;
    h += `<p>${p.state.placed.length <= 1 ? 'Premier coup' : 'Carte ' + Math.min(p.state.placed.length + 1, H.GAME_CARDS) + '/' + H.GAME_CARDS} · ${sc.total} fruits</p></div></div>`;
    if (prev.state.over) h += `<p class="note">Le verger de ${esc(prev.name)} est terminé (${H.score(prev.state).total} fruits) : ${esc(p.name)} joue ses dernières cartes.</p>`;
    h += scoreboardHtml();
    els.turnBody.innerHTML = h;
    sfx('turn');
    openDialog(els.dlgTurn);
  }

  function scoreboardHtml() {
    return '<div class="mini-board">' + match.players.map((p, i) => {
      const sc = H.score(p.state);
      const n = Math.min(p.state.placed.length, H.GAME_CARDS);
      return `<div class="mb-row${i === match.cur && !allOver() ? ' on' : ''}"><i class="who-dot" style="background:${p.color}"></i><span class="mb-name">${esc(p.name)}</span><span class="mb-cards">${n}/${H.GAME_CARDS}</span><b>${sc.total}</b></div>`;
    }).join('') + '</div>';
  }

  function afterTurnDialog() {
    if (ui.skipTurnClose) { ui.skipTurnClose = false; return; }
    ui.locked = false;
    syncState();
    ui.sel = null; ui.pos = null; ui.fresh = false;
    computeView();
    renderAll();
  }

  function undo() {
    if (!history.length) return;
    clearTimeout(ui.turnTimer);
    if (els.dlgTurn.open) { ui.skipTurnClose = true; els.dlgTurn.close(); }
    match = JSON.parse(history.pop());
    syncState();
    ui.locked = false;
    ui.sel = null; ui.pos = null; ui.endShown = false;
    if (els.dlgEnd.open) els.dlgEnd.close();
    computeView();
    save();
    renderAll();
    sfx('undo');
    toast(isDuo() ? `Coup annulé · à ${curPlayer().name} de jouer.` : 'Coup annulé.');
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
    if (isDuo()) { showDuoEnd(); sfx('win', { duck: 3 }); return; }
    const sc = H.score(state);
    sfx(state.endReason === 'blocked' || sc.won === false ? 'end' : 'win', { duck: 3 });
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
      const why = !r.mult && !r.done && r.progress ? ` <small>(${r.progress})</small>` : '';
      b += `<tr><td>${r.done || r.mult ? '✔' : '✘'} ${r.name}${why}</td><td>${val}</td></tr>`;
    }
    b += `<tr class="tot"><td>Total</td><td>${sc.total}</td></tr></table>`;
    if (sc.target != null) b += `<p class="verdict ${sc.won ? 'win' : 'lose'}">${sc.won ? `Objectif de ${sc.target} atteint : victoire !` : `Objectif de ${sc.target} manqué de ${sc.target - sc.total}.`}</p>`;
    b += `<p class="small-note">Partie n° <b>${state.seed}</b> · ${sc.dice} dé(s) en jeu · cartes ${state.cards.join(', ')}</p>`;
    b += '<button type="button" id="btn-share" class="btn ghost share">Copier le défi pour un ami</button>';
    els.endBody.innerHTML = b;
    $('btn-share').addEventListener('click', () => share(sc));
    openDialog(els.dlgEnd);
  }

  function showDuoEnd() {
    const rows = match.players.map((p, i) => ({ p, i, sc: H.score(p.state) }));
    const [a, b] = rows;
    let win = null, byDice = false;
    if (a.sc.total !== b.sc.total) win = a.sc.total > b.sc.total ? a : b;
    else if (a.sc.dice !== b.sc.dice) { win = a.sc.dice > b.sc.dice ? a : b; byDice = true; }
    els.endTitle.textContent = win ? `Victoire de ${win.p.name} !` : 'Égalité parfaite !';
    let h = '<div class="duo-end">';
    for (const r of rows) {
      const sc = r.sc;
      h += `<div class="duo-col${win && win.i === r.i ? ' win' : ''}" style="--pc:${r.p.color}">`;
      h += `<div class="duo-name"><i class="who-dot" style="background:${r.p.color}"></i>${esc(r.p.name)}${win && win.i === r.i ? ' 🏆' : ''}</div>`;
      h += `<div class="duo-score">${sc.total}<small> fruits</small></div>`;
      h += '<div class="duo-detail">' + H.TYPES.map((t) => `<span><i class="dot" style="background:${DIE_FILL[t]}"></i>${sc.scored[t]}</span>`).join('') + '</div>';
      h += `<div class="duo-sub">${sc.dice} dé(s) en jeu${sc.bonus ? ' · bonus +' + sc.bonus : ''}${sc.lost ? ' · ' + sc.lost + ' pourris' : ''}</div>`;
      if (sc.target != null) h += `<div class="duo-sub">${sc.won ? '✔ objectif ' + sc.target + ' atteint' : '✘ objectif ' + sc.target}</div>`;
      h += '</div>';
    }
    h += '</div>';
    if (byDice) h += '<p class="small-note">Égalité de fruits : la victoire va à celui qui a le plus de dés en jeu.</p>';
    h += `<p class="small-note">Partie n° <b>${esc(state.seed)}</b> · mêmes cartes pour les deux joueurs. Touchez le nom d’un joueur (en haut du verger) pour voir son verger.</p>`;
    els.endBody.innerHTML = h;
    openDialog(els.dlgEnd);
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

  function start(seed, recipes, mode, names) {
    mode = mode === 'duo' ? 'duo' : 'solo';
    seed = String(seed || H.randomSeed());
    const mk = () => H.newGame(seed, { recipes });
    match = {
      mode,
      cur: 0,
      players: mode === 'duo'
        ? [0, 1].map((i) => ({ name: (names && names[i]) || 'Joueur ' + (i + 1), color: PLAYER_COLORS[i], state: mk() }))
        : [{ name: 'Vous', color: PLAYER_COLORS[0], state: mk() }],
    };
    syncState();
    history = [];
    clearTimeout(ui.turnTimer);
    ui.locked = false;
    ui.sel = null; ui.pos = null; ui.rot = 0; ui.endShown = false; ui.fresh = true;
    computeView();
    save();
    renderAll();
    try { if (location.search) window.history.replaceState(null, '', location.pathname); } catch (e) { /* ignore */ }
    if (mode === 'duo') showTurn(); else sfx('start');
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ match, history: history.slice(-15) })); } catch (e) { /* stockage indisponible */ }
  }
  const validState = (st) => st && st.board && Array.isArray(st.placed) && Array.isArray(st.hand);
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (d && d.match && Array.isArray(d.match.players) && d.match.players.length && d.match.players.every((p) => validState(p.state))) {
        match = d.match;
        history = Array.isArray(d.history) ? d.history : [];
      } else {
        // ancienne sauvegarde (solo)
        const o = JSON.parse(localStorage.getItem(OLD_STORE_KEY) || 'null');
        if (!o || !validState(o.state)) return false;
        match = { mode: 'solo', cur: 0, players: [{ name: 'Vous', color: PLAYER_COLORS[0], state: o.state }] };
        history = [];
      }
      if (!(match.cur >= 0 && match.cur < match.players.length)) match.cur = 0;
      syncState();
      return true;
    } catch (e) { return false; }
  }

  // ---------------------------------------------------- Légende des règles
  function renderLegend() {
    const tile = (inner, label) => `<figure><svg viewBox="0 0 100 100"><rect x="2" y="2" width="96" height="96" rx="14" fill="url(#p-meadow-${prefs.cards})"/>${inner}</svg><figcaption>${label}</figcaption></figure>`;
    let h = '';
    h += tile(cellSvg({ k: 'tree', t: 'orange', f: 1 }, 50, 50), 'Oranger · 1 fruit');
    h += tile(cellSvg({ k: 'tree', t: 'citron', f: 2 }, 50, 50), 'Citronnier · 2 fruits');
    h += tile(cellSvg({ k: 'tree', t: 'vert', f: 1 }, 50, 50), 'Citronnier vert');
    h += tile(cellSvg({ k: 'clear' }, 50, 50, 7), 'Clairière');
    h += `<figure><svg viewBox="-50 -50 100 100">${dieSvg({ t: 'orange', v: 3 }, 0, 0, { scale: 1.3 })}</svg><figcaption>Dé de fruits</figcaption></figure>`;
    h += `<figure><svg viewBox="-50 -50 100 100">${dieSvg({ t: 'citron', v: 10 }, 0, 0, { scale: 1.3 })}</svg><figcaption>Panier · 10</figcaption></figure>`;
    h += `<figure><svg viewBox="-50 -50 100 100">${dieSvg({ t: 'orange', v: 15, barrow: true }, 0, 0, { scale: 1.2 })}</svg><figcaption>Brouette · 15</figcaption></figure>`;
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
  // Souris / stylet : survoler pour déplacer, cliquer pour poser.
  els.board.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || recentTouch()) return;
    lastPointerType = 'mouse';
    if (ui.sel == null || state.over) return;
    const p = boardPoint(e);
    if (p) setPos(centerAt(p));
  });
  els.board.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch' || recentTouch()) return;
    if (ui.sel == null || state.over || e.button !== 0) return;
    const p = boardPoint(e);
    if (p) setPos(centerAt(p));
    tryPlace();
  });

  // Doigt : glisser = déplacer la carte, toucher = l'amener ici, double toucher = tourner.
  els.boardWrap.addEventListener('touchstart', (e) => {
    if (e.target.closest && e.target.closest('.player-pill')) return;
    noteTouch();
    if (e.cancelable) e.preventDefault();
    if (e.touches.length > 1) { ui.drag = null; return; }
    if (ui.sel == null || state.over) return;
    const t = e.changedTouches[0];
    const p = boardPoint(t);
    if (!p) return;
    ui.drag = { id: t.identifier, start: p, startPos: ui.pos ? Object.assign({}, ui.pos) : centerAt(p), moved: false, sx: t.clientX, sy: t.clientY };
  }, { passive: false });
  els.boardWrap.addEventListener('touchmove', (e) => {
    if (e.target.closest && e.target.closest('.player-pill')) return;
    if (e.cancelable) e.preventDefault();
    const d = ui.drag;
    if (!d) return;
    const t = findTouch(e.changedTouches, d.id);
    if (!t) return;
    if (!d.moved && Math.hypot(t.clientX - d.sx, t.clientY - d.sy) > 8) d.moved = true;
    if (!d.moved) return;
    const p = boardPoint(t);
    if (p) setPos({ x: d.startPos.x + Math.round(p.x - d.start.x), y: d.startPos.y + Math.round(p.y - d.start.y) });
  }, { passive: false });
  els.boardWrap.addEventListener('touchend', (e) => {
    if (e.target.closest && e.target.closest('.player-pill')) return;
    noteTouch();
    if (e.cancelable) e.preventDefault();
    const d = ui.drag;
    if (!d) return;
    const t = findTouch(e.changedTouches, d.id);
    if (!t) return;
    ui.drag = null;
    if (ui.sel == null || state.over) return;
    if (d.moved) ui.lastTap = null;
    else if (isDoubleTap(t, 'board')) tapRotate();
    else { const p = boardPoint(t); if (p && !insideGhost(p)) setPos(centerAt(p)); }
    updateControls(currentEval());
  }, { passive: false });
  els.boardWrap.addEventListener('touchcancel', () => { ui.drag = null; });

  els.board.addEventListener('contextmenu', (e) => { if (ui.sel != null) { e.preventDefault(); rotate(1); } });
  els.board.addEventListener('wheel', (e) => {
    if (ui.sel == null) return;
    e.preventDefault();
    rotate(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  // ---- Écran fixe sur téléphone : la page ne défile, ne rebondit et ne zoome jamais.
  // (Safari iOS ignore souvent touch-action ; on bloque donc les gestes nous-mêmes.)
  function canScroll(el) {
    for (let n = el; n && n !== document.body && n.nodeType === 1; n = n.parentElement) {
      if (n.matches('input, select, textarea')) return true;
      if (n.matches('.rules-body, .side, dialog') && n.scrollHeight > n.clientHeight + 1) return true;
    }
    return false;
  }
  document.addEventListener('touchmove', (e) => {
    const d = ui.handDrag;
    if (d && d.touchId != null) {
      if (e.cancelable) e.preventDefault();
      const t = findTouch(e.changedTouches, d.touchId);
      if (t) handDragMove(d, t, true);
      return;
    }
    if (e.cancelable && (e.touches.length > 1 || !canScroll(e.target))) e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', (e) => {
    const d = ui.handDrag;
    if (d && d.touchId != null) {
      const t = findTouch(e.changedTouches, d.touchId);
      if (t) {
        noteTouch();
        if (e.cancelable) e.preventDefault();
        if (!finishHandDrag(d)) handTap(d.id);
      }
      return;
    }
    // Deux touchers rapides ailleurs (boutons…) : pas de zoom, mais le 2e toucher compte.
    const now = performance.now();
    const inGame = els.boardWrap.contains(e.target) || els.hand.contains(e.target);
    if (!inGame && now - lastTouchEnd < 380 && e.cancelable && !e.target.closest('input, select, textarea')) {
      e.preventDefault();
      const btn = e.target.closest('button, label, summary');
      if (btn && !btn.disabled) btn.click();
    }
    lastTouchEnd = now;
  }, { passive: false });
  document.addEventListener('touchcancel', () => {
    if (ui.handDrag && ui.handDrag.touchId != null) finishHandDrag(ui.handDrag);
    ui.drag = null;
  });
  const stopGesture = (e) => { if (e.cancelable) e.preventDefault(); };
  document.addEventListener('gesturestart', stopGesture, { passive: false });
  document.addEventListener('gesturechange', stopGesture, { passive: false });
  document.addEventListener('dblclick', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });

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

  function openNew(mode) {
    els.inSeed.value = '';
    els.inRecipes.checked = !!state.recipes;
    els.recipePick.hidden = !els.inRecipes.checked;
    els.inR1.value = ''; els.inR2.value = '';
    (mode === 'duo' ? els.inModeDuo : els.inModeSolo).checked = true;
    els.duoNames.hidden = mode !== 'duo';
    const names = isDuo() ? match.players.map((p) => p.name) : prefs.names;
    els.inP1.value = (names && names[0]) || '';
    els.inP2.value = (names && names[1]) || '';
    openDialog(els.dlgNew);
  }
  els.btnNew.addEventListener('click', () => openNew(match.mode));
  els.inRecipes.addEventListener('change', () => { els.recipePick.hidden = !els.inRecipes.checked; });
  for (const r of [els.inModeSolo, els.inModeDuo]) r.addEventListener('change', () => { els.duoNames.hidden = !els.inModeDuo.checked; });
  els.dlgNew.addEventListener('close', () => {
    if (els.dlgNew.returnValue !== 'start') return;
    let rec = false;
    if (els.inRecipes.checked) {
      const picks = [els.inR1.value, els.inR2.value].filter(Boolean).map(Number);
      rec = picks.length ? Array.from(new Set(picks)) : true;
    }
    const mode = els.inModeDuo.checked ? 'duo' : 'solo';
    const names = [els.inP1.value.trim(), els.inP2.value.trim()];
    if (mode === 'duo') { prefs.names = names; savePrefs(); }
    start(els.inSeed.value.trim(), rec, mode, names);
  });
  els.dlgSquirrel.addEventListener('close', () => {
    if (els.dlgSquirrel.returnValue === 'ok') doPlace(true);
  });
  els.dlgTurn.addEventListener('close', afterTurnDialog);
  els.dlgEnd.addEventListener('close', () => {
    const v = els.dlgEnd.returnValue;
    const names = match.players.map((p) => p.name);
    if (v === 'again') start(state.seed, state.recipes ? state.recipes.slice() : false, match.mode, names);
    else if (v === 'next') start(null, state.recipes ? true : false, match.mode, names);
  });

  // Pastille du joueur / liste des joueurs : après la partie, voir chaque verger.
  els.playerPill.addEventListener('click', () => {
    if (allOver()) viewPlayer(1 - viewedIndex());
    else toast(`C’est au tour de ${curPlayer().name}.`);
  });
  els.playersList.addEventListener('click', (e) => {
    const b = e.target.closest('[data-player]');
    if (b) viewPlayer(Number(b.dataset.player));
  });

  // Menu (logo en haut à gauche)
  els.btnMenu.addEventListener('click', () => { sfx('ui'); openDialog(els.dlgMenu); });
  els.dlgMenu.addEventListener('close', () => {
    const v = els.dlgMenu.returnValue;
    if (v === 'solo') openNew('solo');
    else if (v === 'duo') openNew('duo');
    else if (v === 'custom') openCustom();
    else if (v === 'settings') openSettings();
    else if (v === 'rules') openDialog(els.dlgRules);
  });
  els.menuInstall.addEventListener('click', () => { if (els.dlgMenu.open) els.dlgMenu.close(); });

  // Personnalisation : fond du terrain et design des cartes
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  function applyPrefs() {
    document.body.dataset.board = prefs.board;
    const root = document.documentElement;
    if (prefs.theme === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = prefs.theme;
    const dark = prefs.theme === 'dark' || (prefs.theme === 'auto' && darkQuery.matches);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#171b14' : '#2f6b3a');
  }
  try { darkQuery.addEventListener('change', applyPrefs); } catch (e) { /* ancien Safari */ }
  function renderCustom() {
    els.optThemes.innerHTML = Object.entries(THEMES).map(([id, name]) =>
      `<button type="button" class="opt${prefs.theme === id ? ' on' : ''}" data-theme-opt="${id}" aria-pressed="${prefs.theme === id}"><span class="theme-swatch" data-t="${id}"><i></i><i></i><i></i></span><span class="opt-name">${name}</span></button>`).join('');
    els.optBoards.innerHTML = Object.entries(BOARDS).map(([id, name]) =>
      `<button type="button" class="opt${prefs.board === id ? ' on' : ''}" data-board-opt="${id}" aria-pressed="${prefs.board === id}"><span class="swatch" data-board="${id}"></span><span class="opt-name">${name}</span></button>`).join('');
    els.optCards.innerHTML = Object.entries(CARD_THEMES).map(([id, T]) =>
      `<button type="button" class="opt${prefs.cards === id ? ' on' : ''}" data-card-opt="${id}" aria-pressed="${prefs.cards === id}"><svg viewBox="-6 -4 312 212" aria-hidden="true">${cardArt(H.cardById(9), id)}</svg><span class="opt-name">${T.name}</span></button>`).join('');
  }
  function openCustom() { renderCustom(); openDialog(els.dlgCustom); }
  function openSettings() { renderSound(); openDialog(els.dlgSettings); }

  const sndEls = { music: $('in-music'), sfx: $('in-sfx'), musicVol: $('in-music-vol'), sfxVol: $('in-sfx-vol'), musicVal: $('music-val'), sfxVal: $('sfx-val') };
  function renderSound() {
    const so = prefs.sound;
    sndEls.music.checked = !!so.music;
    sndEls.sfx.checked = !!so.sfx;
    sndEls.musicVol.value = Math.round(so.musicVol * 100);
    sndEls.sfxVol.value = Math.round(so.sfxVol * 100);
    sndEls.musicVol.disabled = !so.music;
    sndEls.sfxVol.disabled = !so.sfx;
    sndEls.musicVal.textContent = so.music ? Math.round(so.musicVol * 100) + ' %' : '—';
    sndEls.sfxVal.textContent = so.sfx ? Math.round(so.sfxVol * 100) + ' %' : '—';
  }
  function soundChanged() {
    savePrefs();
    snd.configure(prefs.sound);
    renderSound();
  }
  sndEls.music.addEventListener('change', () => { prefs.sound.music = sndEls.music.checked; soundChanged(); });
  sndEls.sfx.addEventListener('change', () => { prefs.sound.sfx = sndEls.sfx.checked; soundChanged(); if (prefs.sound.sfx) sfx('test'); });
  sndEls.musicVol.addEventListener('input', () => { prefs.sound.musicVol = sndEls.musicVol.value / 100; soundChanged(); });
  let testAt = 0;
  sndEls.sfxVol.addEventListener('input', () => {
    prefs.sound.sfxVol = sndEls.sfxVol.value / 100;
    soundChanged();
    const now = performance.now();
    if (now - testAt > 180) { testAt = now; sfx('test'); }
  });
  const btnClear = $('btn-clear-cache');
  if (btnClear) btnClear.addEventListener('click', () => {
    btnClear.disabled = true;
    btnClear.textContent = 'Rechargement…';
    save();
    if (window.ortieClearCache) window.ortieClearCache(); else location.reload();
  });
  els.optThemes.addEventListener('click', (e) => {
    const b = e.target.closest('[data-theme-opt]');
    if (!b) return;
    prefs.theme = b.dataset.themeOpt;
    savePrefs(); applyPrefs(); renderCustom();
  });
  els.optBoards.addEventListener('click', (e) => {
    const b = e.target.closest('[data-board-opt]');
    if (!b) return;
    prefs.board = b.dataset.boardOpt;
    savePrefs(); applyPrefs(); renderCustom();
  });
  els.optCards.addEventListener('click', (e) => {
    const b = e.target.closest('[data-card-opt]');
    if (!b) return;
    prefs.cards = b.dataset.cardOpt;
    savePrefs(); renderCustom(); renderAll(); renderLegend();
  });
  els.dlgRules.addEventListener('close', () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* ignore */ } });

  // Contour de focus du logo seulement quand on navigue au clavier (jamais au doigt).
  document.addEventListener('keydown', (e) => { if (e.key === 'Tab') document.body.classList.add('kbd'); }, true);
  document.addEventListener('pointerdown', () => document.body.classList.remove('kbd'), true);
  document.addEventListener('touchstart', () => document.body.classList.remove('kbd'), { capture: true, passive: true });

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('dialog[open]')) return;
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
    const k = e.key.toLowerCase();
    if (k === '?') { openDialog(els.dlgRules); return; }
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
  applyPrefs();
  for (const el of document.querySelectorAll('.app-version')) el.textContent = APP_VERSION;
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
    if (allOver()) ui.endShown = true;
  } else {
    start(null, false);
  }
  window.__ortieReady = true; // le jeu a démarré (voir le garde-fou dans index.html)
  try { sessionStorage.removeItem('ortie.autofix'); } catch (e) { /* ignore */ }
  let seen = false;
  try { seen = !!localStorage.getItem(SEEN_KEY); } catch (e) { seen = true; }
  if (!seen && !els.dlgTurn.open) openDialog(els.dlgRules);
})();
