/* Ortie — interface (rendu SVG + interactions). */
(function () {
  'use strict';
  const H = window.OrtieCore;
  const S = 100; // taille d'une case en unités SVG
  const CW = H.CARD_W * S, CH = H.CARD_H * S;
  const APP_VERSION = '1.26';
  const STORE_KEY = 'ortie.save.v3';
  const OLD_STORE_KEY = 'ortie.save.v2';
  const SEEN_KEY = 'ortie.seenRules';
  const PREFS_KEY = 'ortie.prefs';
  const TOKENS_KEY = 'ortie.online.tokens'; // place gardée dans chaque partie à distance

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
    cherry: { name: 'Cerisier', base: '#f2c7d3', blobs: ['#f7d6df', '#ebb6c6', '#f4cfda', '#e8afc0', '#fae0e7'], star: '#ffffff', dot: '#d9487a', border: '#cf8aa1', hi: '#fff0f4', num: '#8a2f50',
      bush: { back: '#264f2b', l1: '#367039', l2: '#448345', l3: '#579a54', stroke: '#193b1d', r1: '#f0a9be', r2: '#f5bfcf', r3: '#f9d3de' } },
    lavender: { name: 'Lavande', base: '#cdc2e8', blobs: ['#d8cff0', '#c0b3df', '#d3c9ed', '#b9abda', '#e0d8f4'], star: '#ffffff', dot: '#7b55c7', border: '#9a88c9', hi: '#f1ecfc', num: '#4a3680',
      bush: { back: '#2a4736', l1: '#3b674a', l2: '#487a57', l3: '#5a8f67', stroke: '#1b3125', r1: '#b6a2e4', r2: '#c7b6ec', r3: '#d8ccf3' } },
    tropical: { name: 'Tropical', base: '#52c3a7', blobs: ['#62ceb3', '#43b498', '#5bc9ae', '#3daa90', '#6dd6bc'], star: '#fff6a0', dot: '#ff7a59', border: '#2b8f78', hi: '#aaeedb', num: '#0f5446',
      bush: { back: '#0e4634', l1: '#156b4a', l2: '#1c8056', l3: '#259a63', stroke: '#07301e', r1: '#7fe0b0', r2: '#98e9c0', r3: '#b3f1d1' } },
    vintage: { name: 'Vintage', base: '#cbc291', blobs: ['#d5cd9e', '#beb581', '#d0c899', '#b8ae7a', '#dad3a8'], star: '#fff3cf', dot: '#a0522d', border: '#8f8455', hi: '#eee7c4', num: '#5a4a22',
      bush: { back: '#3b4223', l1: '#535d2f', l2: '#636e39', l3: '#778245', stroke: '#252a13', r1: '#a6b07a', r2: '#b5be8b', r3: '#c5cc9e' } },
    // Récompenses d'achievements (verrouillés tant que l'achievement n'est pas réussi)
    ember: { name: 'Braises', base: '#5a2a1c', blobs: ['#6b3020', '#4f2418', '#663022', '#4a2016', '#743626'], star: '#ffb347', dot: '#ff6a2b', border: '#2e140c', hi: '#8a4a30', num: '#ffd2a8',
      bush: { back: '#1d2a14', l1: '#2e4220', l2: '#3a5228', l3: '#486432', stroke: '#0f1a0a', r1: '#ff8a3d', r2: '#ffa65e', r3: '#ffc38a' } },
    frost: { name: 'Givre', base: '#cfe6f2', blobs: ['#ddeff8', '#bcdcec', '#d6ebf5', '#b5d6e8', '#e6f4fb'], star: '#ffffff', dot: '#7fb4d6', border: '#8fb8d0', hi: '#f4fbff', num: '#2c5c78',
      bush: { back: '#1f4a4a', l1: '#2c6464', l2: '#377575', l3: '#468a8a', stroke: '#143434', r1: '#bfe8f0', r2: '#d2f0f5', r3: '#e5f8fb' } },
    golden: { name: 'Verger doré', base: '#e6c157', blobs: ['#efcf6f', '#d8ad3e', '#ebc865', '#d1a536', '#f4d985'], star: '#fffbe0', dot: '#a8740b', border: '#a8801c', hi: '#fff1b8', num: '#6b4a00',
      bush: { back: '#2c4a1c', l1: '#3f6a26', l2: '#4d7d2e', l3: '#5f9238', stroke: '#1c3010', r1: '#e8c25a', r2: '#f0d27a', r3: '#f7e3a3' } },
    rainbow: { name: 'Arc-en-ciel', base: '#c6e8b8', blobs: ['#ffc9d6', '#ffe6a3', '#bff0b5', '#b8dcff', '#e0c7ff'], star: '#ffffff', dot: '#ff5f9e', border: '#8fbf86', hi: '#f6fff2', num: '#3d6b35',
      bush: { back: '#1d5527', l1: '#2c7a36', l2: '#3a8c3e', l3: '#4b9f45', stroke: '#17451f', r1: '#ffb3c8', r2: '#ffe08a', r3: '#a8d8ff' } },
    diamond: { name: 'Diamant', base: '#d9e4f5', blobs: ['#e9effa', '#c9d7ee', '#e2eaf8', '#c1d1ea', '#f0f4fc'], star: '#ffffff', dot: '#8fa9e0', border: '#7f97c7', hi: '#ffffff', num: '#3a4f80',
      bush: { back: '#22344f', l1: '#30486a', l2: '#3a557b', l3: '#486690', stroke: '#141f30', r1: '#cfe0ff', r2: '#dfeaff', r3: '#eef4ff' } },
    winter: { name: 'Hiver', base: '#e2eef1', blobs: ['#f3f9fa', '#d2e3e8', '#ebf4f6', '#d8e7eb', '#f8fcfc'], star: '#ffffff', dot: '#93bfd2', border: '#a6c2cc', hi: '#ffffff', num: '#2e5a6b',
      bush: { back: '#1c473a', l1: '#2a644f', l2: '#357860', l3: '#468d72', stroke: '#133429', r1: '#8fc9b4', r2: '#a6d6c4', r3: '#c0e5d6' } },
  };
  const BOARDS = {
    oak: 'Chêne clair', walnut: 'Noyer', felt: 'Tapis bleu', linen: 'Lin', slate: 'Ardoise', terracotta: 'Tomettes',
    grass: 'Pelouse', marble: 'Marbre', sand: 'Sable', night: 'Nuit étoilée', velvet: 'Velours',
    // récompenses d'achievements
    checker: 'Damier', goldleaf: 'Feuille d’or', aurora: 'Aurore boréale', royalvelvet: 'Velours royal', cosmos: 'Cosmos',
  };
  // Couleurs de l'interface (titres, boutons, score). Les couleurs sombres sont dans style.css.
  const ACCENTS = {
    verger: { name: 'Verger', brand: '#2f6b3a', accent: '#f06a32' },
    ocean: { name: 'Océan', brand: '#1f5f8b', accent: '#e2603f' },
    prune: { name: 'Prune', brand: '#5b3a7a', accent: '#c47f0e' },
    framboise: { name: 'Framboise', brand: '#9b2c4f', accent: '#2a8f82' },
    cacao: { name: 'Cacao', brand: '#6b4a2b', accent: '#3f8f3a' },
    // récompenses d'achievements
    emeraude: { name: 'Émeraude', brand: '#0f6b4f', accent: '#e24f6a' },
    royal: { name: 'Royal', brand: '#4b2a7a', accent: '#c9a227' },
    minuit: { name: 'Minuit', brand: '#1d2f5c', accent: '#22a6c7' },
    diamant: { name: 'Diamant', brand: '#3a5a8c', accent: '#9b6bff' },
  };
  // Style des dés : la couleur du fruit reste toujours reconnaissable.
  const DICE_STYLES = { classic: 'Classique', numbers: 'Chiffres', pastel: 'Pastel', outline: 'Contour', gem: 'Bonbon', wood: 'Bois', crystal: 'Cristal', gold: 'Or massif', obsidian: 'Obsidienne' };
  const PLAYER_COLORS = ['#f06a32', '#3b7fc4'];
  const THEMES = { auto: 'Automatique', light: 'Clair', dark: 'Sombre' };
  const PREF_DEFAULTS = { theme: 'auto', board: 'oak', cards: 'classic', accent: 'verger', dice: 'classic' };
  const prefs = { theme: 'auto', board: 'oak', cards: 'classic', accent: 'verger', dice: 'classic', names: ['', ''], onlineName: '', sound: { music: true, sfx: true, musicVol: 0.4, sfxVol: 0.7 } };
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
  if (!ACCENTS[prefs.accent]) prefs.accent = 'verger';
  if (!DICE_STYLES[prefs.dice]) prefs.dice = 'classic';
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
    recipes: $('recipes'), recipeList: $('recipe-list'), recipeBar: $('recipe-bar'), recipePop: $('recipe-pop'), seed: $('seed-label'), turn: $('turn-label'),
    hint: $('hint'), toast: $('toast'),
    btnNew: $('btn-new'), btnPlace: $('btn-place'),
    placeLabel: $('place-label'), placeGain: $('place-gain'),
    btnRotL: $('btn-rot-l'), btnRotR: $('btn-rot-r'),
    dlgNew: $('dlg-new'), dlgEnd: $('dlg-end'), dlgRules: $('dlg-rules'), dlgSquirrel: $('dlg-squirrel'),
    inSeed: $('in-seed'), inRecipes: $('in-recipes'), inR1: $('in-r1'), inR2: $('in-r2'), recipePick: $('recipe-pick'),
    endTitle: $('end-title'), endBody: $('end-body'), legend: $('legend'), defs: $('defs'),
    btnMenu: $('btn-menu'), dlgMenu: $('dlg-menu'), menuInstall: $('menu-install'),
    dlgCustom: $('dlg-custom'), optBoards: $('opt-boards'), optCards: $('opt-cards'), optThemes: $('opt-themes'), optAccents: $('opt-accents'), optDice: $('opt-dice'), dlgSettings: $('dlg-settings'),
    dlgTurn: $('dlg-turn'), turnBody: $('turn-body'),
    inModeSolo: $('in-mode-solo'), inModeDuo: $('in-mode-duo'), duoNames: $('duo-names'), inP1: $('in-p1'), inP2: $('in-p2'),
    players: $('players'), playersList: $('players-list'), playerPill: $('player-pill'), whoChip: $('who-chip'), whoMini: $('who-mini'),
    dlgAch: $('dlg-ach'), achSummary: $('ach-summary'), achList: $('ach-list'), achStats: $('ach-stats'), achToast: $('ach-toast'),
    menuAchSub: $('menu-ach-sub'), menuAchNew: $('menu-ach-new'),
    dlgOnline: $('dlg-online'), onlineForm: $('online-form'), onlineWait: $('online-wait'), onlineCreate: $('online-create'), onlineJoin: $('online-join'),
    inOCreate: $('in-o-create'), inOJoin: $('in-o-join'), inOName: $('in-oname'), inORecipes: $('in-orecipes'), inOCode: $('in-ocode'),
    btnEndNext: $('btn-end-next'), onlineError: $('online-error'), onlineCode: $('online-code'), btnOnlineGo: $('btn-online-go'), btnOnlineShare: $('btn-online-share'),
  };

  // match.players[i].state est un état de partie du moteur ; `state` désigne
  // toujours celui du joueur affiché.
  let match = null;
  let state = null;
  const isDuo = () => !!match && match.mode === 'duo';
  // À distance : chacun joue sur son appareil ; match.me = ma place (0 ou 1).
  const isOnline = () => !!match && match.mode === 'online';
  const isMulti = () => isDuo() || isOnline();
  const myPlayer = () => match.players[match.me];
  const oppPlayer = () => match.players[1 - match.me];
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

  // Couleurs d'un dé selon le style choisi (Personnaliser → Style des dés).
  const PASTEL = {
    orange: { fill: '#f9bb92', edge: '#d98a5c', pip: '#6b3a17' },
    citron: { fill: '#f8e48c', edge: '#cdb14a', pip: '#5e4b07' },
    vert: { fill: '#b4e09f', edge: '#7fb468', pip: '#2f5a22' },
  };
  const OUTLINE = { orange: '#fff1e6', citron: '#fff9db', vert: '#eef8e8' };
  const OUTLINE_PIP = { orange: '#e8641f', citron: '#c99a00', vert: '#3f9a2e' };
  function dieLook(t, style) {
    switch (style) {
      case 'pastel': return Object.assign({ sw: 2.5, shine: 0.3 }, PASTEL[t]);
      case 'outline': return { fill: OUTLINE[t], edge: DIE_EDGE[t], pip: OUTLINE_PIP[t], sw: 4, shine: 0 };
      case 'gem': return { fill: `url(#g-die-${t})`, edge: DIE_EDGE[t], pip: DIE_PIP[t], sw: 2, shine: 0.5, gem: true };
      // récompenses : la couleur du fruit reste sur le bord et les points
      case 'wood': return { fill: 'url(#g-die-wood)', edge: DIE_FILL[t], pip: DIE_FILL[t], pipStroke: '#3a2410', sw: 4, shine: 0.12 };
      case 'crystal': return { fill: DIE_FILL[t], fillOpacity: 0.42, edge: DIE_EDGE[t], pip: DIE_EDGE[t], sw: 2.5, shine: 0.6, gem: true };
      case 'gold': return { fill: DIE_FILL[t], edge: '#c9a227', pip: 'url(#g-die-goldpip)', pipStroke: '#6b4d00', sw: 4.5, shine: 0.3 };
      case 'obsidian': return { fill: 'url(#g-die-obsidian)', edge: DIE_FILL[t], pip: DIE_FILL[t], sw: 3.5, shine: 0.1 };
      default: return { fill: DIE_FILL[t], edge: DIE_EDGE[t], pip: DIE_PIP[t], sw: 2.5, shine: 0.2 };
    }
  }

  function dieSvg(die, cx, cy, opts) {
    opts = opts || {};
    const style = opts.style || prefs.dice;
    const sc = opts.scale || 1;
    const cls = 'die' + (opts.cls ? ' ' + opts.cls : '');
    if (die.barrow) {
      const edge = DIE_EDGE[die.t] || '#6e4317';
      return `<g transform="translate(${cx} ${cy}) scale(${sc})"><g class="${cls}" filter="url(#f-shadow)"><g transform="translate(-31 -31) scale(.97)">${barrowArt(die.t)}</g><g transform="translate(22 22)"><circle r="13" fill="#fffaf0" stroke="${edge}" stroke-width="2"/><text y="5" text-anchor="middle" class="die-num">15</text></g></g></g>`;
    }
    const sz = 52;
    const L = dieLook(die.t, style);
    let g = `<g transform="translate(${cx} ${cy}) scale(${sc})"><g class="${cls}" filter="url(#f-shadow)">`;
    if (L.fillOpacity) g += `<rect x="${-sz / 2}" y="${-sz / 2}" width="${sz}" height="${sz}" rx="14" fill="#fff" opacity=".55"/>`;
    g += `<rect x="${-sz / 2}" y="${-sz / 2}" width="${sz}" height="${sz}" rx="${L.gem ? 14 : 11}" fill="${L.fill}"${L.fillOpacity ? ` fill-opacity="${L.fillOpacity}"` : ''} stroke="${L.edge}" stroke-width="${L.sw}"/>`;
    if (L.gem) g += `<ellipse cx="-9" cy="-13" rx="12" ry="6" fill="#fff" opacity="${L.shine}" transform="rotate(-20 -9 -13)"/>`;
    else if (L.shine) g += `<rect x="${-sz / 2 + 4}" y="${-sz / 2 + 3}" width="${sz - 8}" height="${sz / 2 - 6}" rx="8" fill="#fff" opacity="${L.shine}"/>`;
    if (die.v >= H.BASKET) {
      g += `<g transform="translate(0 4)"><use href="#basket"/></g>`;
      g += `<g transform="translate(18 -18)"><circle r="11" fill="#fffaf0" stroke="${L.edge}" stroke-width="2"/><text y="4.5" text-anchor="middle" class="die-num small">10</text></g>`;
    } else if (style === 'numbers') {
      g += `<text y="11.5" text-anchor="middle" class="die-big" fill="${L.pip}">${die.v}</text>`;
    } else {
      const ps = L.pipStroke ? ` stroke="${L.pipStroke}" stroke-width="1.3"` : '';
      for (const [px, py] of PIPS[die.v] || []) g += `<circle cx="${px * 12.5}" cy="${py * 12.5}" r="5.2" fill="${L.pip}"${ps}/>`;
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
    let g = ''; // fond du terrain uni : pas de points de repère
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
  window.addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(() => { fitTexts(); layoutOverlays(); }, 80); });

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

    renderPlayers();
    renderRecipeBar(sc);
  }

  // Barre Recettes sur le plateau (téléphone) : où en est chaque recette d'un
  // coup d'œil ; un toucher ouvre les cartes complètes par-dessus le plateau.
  function renderRecipeBar(sc) {
    const on = sc.recipes.length > 0;
    document.body.classList.toggle('has-recipes', on);
    els.recipeBar.hidden = !on;
    if (!on) { closeRecipePop(); layoutOverlays(); return; }
    const flash = ui.recipeFlash || [];
    ui.recipeFlash = null;
    els.recipeBar.innerHTML = sc.recipes.map((x) => {
      const r = H.RECIPE_BY_ID[x.id];
      let cls = 'rb-chip';
      let mark = '';
      let txt = x.short;
      if (r.mult) {
        cls += ' x2';
        // Punch : le fruit doublé change en cours de partie, on le montre.
        if (r.kind === 'punch') {
          const low = H.TYPES.slice().sort((a, b) => sc.byType[a] - sc.byType[b])[0];
          mark = `<i class="rb-dot" style="background:${DIE_FILL[low]}"></i>`;
        }
      } else if (x.done) { cls += ' ok'; mark = '<span class="rb-mark">✔</span>'; }
      else if (x.final) { cls += ' ko'; mark = '<span class="rb-mark">✘</span>'; }
      if (flash.includes(x.id)) cls += ' flash';
      const label = `${r.name} : ${r.mult ? x.detail || 'compte double' : x.progress}`;
      return `<button type="button" class="${cls}" aria-label="${esc(label)}" title="${esc(label)}"><svg viewBox="0 0 80 80" class="rb-ico" aria-hidden="true">${recipeIcon(r)}</svg><span class="rb-txt">${txt}</span>${mark}</button>`;
    }).join('');
    els.recipeBar.classList.toggle('open', !els.recipePop.hidden);
    layoutOverlays();
    if (!els.recipePop.hidden) fillRecipePop(sc);
  }

  // À deux, la pastille du joueur et la barre Recettes restent sur une seule
  // ligne : on raccourcit le texte de la pastille (puis on resserre les
  // pastilles Recettes) jusqu'à ce que tout tienne ; en dernier recours, le nom
  // est coupé par « … ». La barre ne passe jamais en dessous.
  function layoutOverlays() {
    const pill = els.playerPill;
    const bar = els.recipeBar;
    bar.classList.remove('tight');
    const variants = ui.pillVariants;
    if (pill.hidden || !variants) return;
    const nameEl = pill.querySelector('.pp-name');
    const stEl = pill.querySelector('.pp-st');
    pill.style.maxWidth = '';
    const barOn = !bar.hidden && bar.getBoundingClientRect().width > 0;
    const fits = () => pill.scrollWidth <= pill.clientWidth + 1 && nameEl.scrollWidth <= nameEl.clientWidth + 1 && (!barOn || pill.getBoundingClientRect().right + 8 <= bar.getBoundingClientRect().left);
    for (const [v, tight] of [[0, false], [1, false], [1, true], [2, true], [3, true]]) {
      const x = variants[Math.min(v, variants.length - 1)];
      nameEl.textContent = x.name;
      stEl.textContent = x.st;
      stEl.hidden = !x.st;
      bar.classList.toggle('tight', tight);
      if (fits()) return;
    }
    if (barOn) pill.style.maxWidth = Math.max(64, bar.getBoundingClientRect().left - pill.getBoundingClientRect().left - 8) + 'px';
  }

  function fillRecipePop(sc) {
    const obj = sc.target != null ? `<span class="rp-obj${sc.won ? ' won' : ''}">Objectif <b>${sc.total} / ${sc.target}</b></span>` : '';
    els.recipePop.innerHTML = `<div class="rp-head"><h2>Recettes</h2>${obj}<button type="button" class="btn icon rp-close" aria-label="Fermer">✕</button></div>`
      + `<div class="recipe-list">${sc.recipes.map((x) => recipeCardHtml(H.RECIPE_BY_ID[x.id], x)).join('')}</div>`;
  }
  function openRecipePop() {
    fillRecipePop(H.score(state));
    els.recipePop.hidden = false;
    els.recipePop.scrollTop = 0;
    els.recipeBar.classList.add('open');
    sfx('ui');
  }
  function closeRecipePop() {
    if (els.recipePop.hidden) return;
    els.recipePop.hidden = true;
    els.recipeBar.classList.remove('open');
  }

  // Voir le verger de l'autre : à deux, une fois la partie finie ; à distance,
  // dès que mon verger est terminé (je peux alors suivre l'autre en direct).
  const canSwitchView = () => (isDuo() ? allOver() : isOnline() ? myPlayer().state.over : false);
  const cardOf = (st) => Math.min(st.placed.length + (st.over ? 0 : 1), H.GAME_CARDS);

  function renderPlayers() {
    const multi = isMulti();
    document.body.classList.toggle('duo', multi);
    els.players.hidden = !multi;
    els.playerPill.hidden = !multi;
    els.whoChip.hidden = !multi;
    els.whoMini.hidden = !multi;
    if (!multi) return;
    const vi = viewedIndex();
    const vp = match.players[vi];
    const over = allOver();
    const sw = canSwitchView();
    els.whoChip.innerHTML = `<i class="who-dot" style="background:${vp.color}"></i>${esc(vp.name)} · `;
    els.whoMini.style.background = vp.color;
    // Textes de la pastille, du plus complet au plus court (voir layoutOverlays).
    const of = (name, sts) => sts.map((st) => ({ name, st }));
    let color, variants, net = '';
    if (isOnline()) {
      // La pastille montre toujours l'adversaire : où il en est, en direct.
      const op = oppPlayer();
      const pts = H.score(op.state).total;
      const arrow = sw ? ' ⇄' : '';
      color = op.color;
      if (vi !== match.me) variants = [{ name: 'Verger de ' + op.name, st: 'revenir à mon verger ⇄' }, { name: 'Verger de ' + op.name, st: 'mon verger ⇄' }, { name: op.name, st: '⇄ mon verger' }, { name: op.name, st: '⇄' }];
      else if (op.left) variants = of(op.name, ['a quitté la partie', 'a quitté', 'parti', 'parti']);
      else if (!ui.linkOk) variants = of(op.name, ['connexion…', 'connexion…', '…', '…']);
      else {
        const n = cardOf(op.state) + '/' + H.GAME_CARDS;
        variants = of(op.name, op.state.over
          ? [`terminé · ${pts} fruits${sw ? ' · voir ⇄' : ''}`, `fini · ${pts} fruits${arrow}`, `${pts} fruits${arrow}`, `${pts}${arrow}`]
          : [`carte ${n} · ${pts} fruits${sw ? ' · voir ⇄' : ''}`, `${n} · ${pts} fruits${arrow}`, `${pts} fruits${arrow}`, `${pts}${arrow}`]);
      }
      const live = ui.linkOk && op.online && !op.left;
      net = `<i class="net-dot${live ? ' on' : ''}" title="${live ? 'En ligne' : 'Hors ligne'}"></i>`;
    } else {
      color = vp.color;
      const n = cardOf(vp.state) + '/' + H.GAME_CARDS;
      variants = of(vp.name, over ? ['voir l’autre verger ⇄', 'autre verger ⇄', '⇄', '⇄'] : vp.state.over ? ['terminé', 'terminé', 'fini', ''] : ['carte ' + n, n, n, '']);
    }
    ui.pillVariants = variants;
    els.playerPill.innerHTML = `<i class="who-dot" style="background:${color}"></i><b class="pp-name"></b><span class="pp-st"></span>${net}`;
    els.playerPill.style.setProperty('--pc', color);
    els.playerPill.classList.toggle('can-switch', sw);
    els.playerPill.setAttribute('aria-label', variants[0].name + ' · ' + variants[0].st);
    els.playersList.innerHTML = match.players.map((p, i) => {
      const sc = H.score(p.state);
      const cards = Math.min(p.state.placed.length, H.GAME_CARDS);
      let tag;
      if (sw) tag = i === vi ? 'affiché' : 'voir';
      else if (p.state.over) tag = 'terminé';
      else if (isOnline()) tag = i === match.me ? 'vous' : p.left ? 'parti' : p.online ? 'en ligne' : 'hors ligne';
      else tag = i === match.cur ? 'à jouer' : '';
      return `<button type="button" class="pl${i === vi ? ' on' : ''}" data-player="${i}" ${sw ? '' : 'disabled'}><i class="who-dot" style="background:${p.color}"></i><span class="pl-name">${esc(nameOf(i))}</span><span class="pl-tag">${tag}</span><span class="pl-cards">${cards}/${H.GAME_CARDS}</span><b>${sc.total}</b></button>`;
    }).join('');
    layoutOverlays();
  }
  const nameOf = (i) => match.players[i].name + (isOnline() && i === match.me ? ' (vous)' : '');

  // Regarder le verger d'un autre joueur (en lecture seule).
  function viewPlayer(i) {
    if (!canSwitchView() || i === viewedIndex()) return;
    match.cur = i;
    syncState();
    ui.locked = isOnline() && i !== match.me;
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
    ui.turns = (ui.turns || 0) + 1; // achievement secret « Hésitant »
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
    achRaise(); // l'annonce d'un achievement reste au premier plan
  }

  const recipesDone = (s) => (s.recipes ? H.score(s).recipes.filter((x) => x.done && !x.mult).map((x) => x.id) : []);

  function doPlace(withSquirrel) {
    if (ui.locked) return;
    const doneBefore = recipesDone(state);
    const res = H.play(state, ui.sel, ui.rot, ui.pos.x, ui.pos.y, { allowSquirrel: withSquirrel });
    if (!res.ok) { toast(res.reason, 'bad'); return; }
    achSaved(A.onMove(ach, { state, res, now: Date.now() }));
    if (ui.turns >= 20) achSaved(A.onEvent(ach, 'hesitant'));
    ui.turns = 0;
    const evs = res.changes.map((c) => c.event);
    ui.popKeys = res.changes.filter((c) => c.die && ['new', 'up', 'basket', 'barrow'].includes(c.event)).map((c) => c.k);
    sfx('place');
    try { snd.dice(res.changes.filter((c) => c.die && ['new', 'up', 'basket', 'barrow'].includes(c.event)).map((c) => c.die.v)); } catch (e) { /* ignore */ }
    const special = evs.includes('barrow') ? 'barrow' : evs.includes('basket') ? 'basket' : evs.includes('squirrel') ? 'squirrel' : null;
    if (special) setTimeout(() => sfx(special, special === 'barrow' ? { duck: 2 } : null), 220);
    const newly = recipesDone(state).filter((id) => !doneBefore.includes(id));
    if (newly.length) {
      const r = H.RECIPE_BY_ID[newly[0]];
      ui.recipeFlash = newly;
      toast(`Recette ✔ ${r.name} +${r.pts}`, 'gold');
      setTimeout(() => sfx('recipe'), special ? 700 : 240);
    } else if (evs.includes('barrow')) toast('La Brouette entre en jeu : 15 fruits !', 'gold');
    else if (evs.includes('basket')) toast('Panier ! Ce dé vaut désormais 10.', 'gold');
    else if (evs.includes('squirrel')) toast('L’Écureuil garde désormais cet arbre.');
    else if (res.gain > 0) toast(`+${res.gain} fruits`, 'ok');
    ui.fresh = true;
    ui.sel = null; ui.pos = null;
    computeView(true);
    if (isOnline()) {
      save();
      renderAll();
      pushMoves();
      clearTimeout(ui.turnTimer);
      if (onlineFinished()) ui.turnTimer = setTimeout(showEnd, 650);
      else if (state.over) ui.turnTimer = setTimeout(() => toast(`Verger terminé ! Touchez ${oppPlayer().name} pour le suivre.`), 1500);
      return;
    }
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
      return `<div class="mb-row${i === match.cur && !allOver() ? ' on' : ''}"><i class="who-dot" style="background:${p.color}"></i><span class="mb-name">${esc(nameOf(i))}</span><span class="mb-cards">${n}/${H.GAME_CARDS}</span><b>${sc.total}</b></div>`;
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

  let toastTimer = null;
  function toast(msg, kind) {
    els.toast.textContent = msg;
    els.toast.className = 'toast show ' + (kind || '');
    // une seule ligne, police réduite si besoin ; deux lignes seulement en dernier recours
    els.toast.style.whiteSpace = 'nowrap';
    fitText(els.toast, window.matchMedia('(max-width: 820px)').matches ? 14 : 15, 11);
    if (els.toast.scrollWidth > els.toast.clientWidth + 1) els.toast.style.whiteSpace = 'normal';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { els.toast.className = 'toast'; }, 2400);
  }

  function showEnd() {
    if (ui.endShown) return;
    ui.endShown = true;
    els.btnEndNext.textContent = isOnline() ? 'Revanche' : 'Nouvelle partie';
    const won = achGameEnd();
    if (isMulti()) { showDuoEnd(won); return; }
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
    b += achEndHtml(won);
    b += '<button type="button" id="btn-share" class="btn ghost share">Copier le défi pour un ami</button>';
    els.endBody.innerHTML = b;
    $('btn-share').addEventListener('click', () => share(sc));
    openDialog(els.dlgEnd);
  }

  function showDuoEnd(won) {
    const rows = match.players.map((p, i) => ({ p, i, sc: H.score(p.state) }));
    const [a, b] = rows;
    let win = null, byDice = false;
    if (a.sc.total !== b.sc.total) win = a.sc.total > b.sc.total ? a : b;
    else if (a.sc.dice !== b.sc.dice) { win = a.sc.dice > b.sc.dice ? a : b; byDice = true; }
    if (isOnline() && oppPlayer().left && !oppPlayer().state.over) { win = rows[match.me]; els.endTitle.textContent = 'Victoire par forfait !'; }
    else if (isOnline()) els.endTitle.textContent = !win ? 'Égalité parfaite !' : win.i === match.me ? 'Vous avez gagné !' : `${win.p.name} a gagné !`;
    else els.endTitle.textContent = win ? `Victoire de ${win.p.name} !` : 'Égalité parfaite !';
    sfx(isOnline() && win && win.i !== match.me ? 'end' : 'win', { duck: 3 });
    let h = '<div class="duo-end">';
    for (const r of rows) {
      const sc = r.sc;
      h += `<div class="duo-col${win && win.i === r.i ? ' win' : ''}" style="--pc:${r.p.color}">`;
      h += `<div class="duo-name"><i class="who-dot" style="background:${r.p.color}"></i>${esc(nameOf(r.i))}${win && win.i === r.i ? ' 🏆' : ''}</div>`;
      h += `<div class="duo-score">${sc.total}<small> fruits</small></div>`;
      h += '<div class="duo-detail">' + H.TYPES.map((t) => `<span><i class="dot" style="background:${DIE_FILL[t]}"></i>${sc.scored[t]}</span>`).join('') + '</div>';
      h += `<div class="duo-sub">${sc.dice} dé(s) en jeu${sc.bonus ? ' · bonus +' + sc.bonus : ''}${sc.lost ? ' · ' + sc.lost + ' pourris' : ''}</div>`;
      if (sc.target != null) h += `<div class="duo-sub">${sc.won ? '✔ objectif ' + sc.target + ' atteint' : '✘ objectif ' + sc.target}</div>`;
      h += '</div>';
    }
    h += '</div>';
    if (byDice) h += '<p class="small-note">Égalité de fruits : la victoire va à celui qui a le plus de dés en jeu.</p>';
    h += `<p class="small-note">Partie n° <b>${esc(state.seed)}</b> · mêmes cartes pour les deux joueurs. Touchez le nom d’un joueur (en haut du verger) pour voir son verger.${isOnline() ? ' « Revanche » : nouvelles cartes, même adversaire.' : ''}</p>`;
    h += achEndHtml(won);
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
    if (isOnline()) onlineQuit();
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
    clearTimeout(ui.turnTimer);
    ui.locked = false;
    ui.sel = null; ui.pos = null; ui.rot = 0; ui.endShown = false; ui.fresh = true;
    closeRecipePop();
    computeView();
    save();
    renderAll();
    try { if (location.search) window.history.replaceState(null, '', location.pathname); } catch (e) { /* ignore */ }
    if (mode === 'duo') showTurn(); else sfx('start');
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ match })); } catch (e) { /* stockage indisponible */ }
  }
  const validState = (st) => st && st.board && Array.isArray(st.placed) && Array.isArray(st.hand);
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (d && d.match && Array.isArray(d.match.players) && d.match.players.length && d.match.players.every((p) => validState(p.state))) {
        match = d.match;
      } else {
        // ancienne sauvegarde (solo)
        const o = JSON.parse(localStorage.getItem(OLD_STORE_KEY) || 'null');
        if (!o || !validState(o.state)) return false;
        match = { mode: 'solo', cur: 0, players: [{ name: 'Vous', color: PLAYER_COLORS[0], state: o.state }] };
      }
      if (!(match.cur >= 0 && match.cur < match.players.length)) match.cur = 0;
      if (match.mode === 'online' && !(match.code && match.token && (match.me === 0 || match.me === 1) && match.players.length === 2)) match.mode = 'duo';
      if (match.mode === 'online') match.cur = match.me; // on revient toujours sur son propre verger
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
    if (ui.swallowBoard) { ui.swallowBoard = false; return; } // ce clic a fermé les recettes
    if (ui.sel == null || state.over || e.button !== 0) return;
    const p = boardPoint(e);
    if (p) setPos(centerAt(p));
    tryPlace();
  });

  // Recettes : la barre ouvre / ferme la fenêtre ; toucher ailleurs la ferme
  // (ce toucher-là ne déplace pas la carte).
  els.recipeBar.addEventListener('click', () => { if (els.recipePop.hidden) openRecipePop(); else closeRecipePop(); });
  els.recipePop.addEventListener('click', (e) => { if (e.target.closest('.rp-close')) closeRecipePop(); });
  document.addEventListener('pointerdown', (e) => {
    if (els.recipePop.hidden || !e.target.closest || e.target.closest('.recipe-pop, .recipe-bar')) return;
    closeRecipePop();
    if (e.target.closest('.board-wrap')) ui.swallowBoard = true;
  }, true);
  const OVERLAY = '.player-pill, .recipe-bar, .recipe-pop';

  // Doigt : glisser = déplacer la carte, toucher = l'amener ici, double toucher = tourner.
  els.boardWrap.addEventListener('touchstart', (e) => {
    if (e.target.closest && e.target.closest(OVERLAY)) return;
    noteTouch();
    if (e.cancelable) e.preventDefault();
    if (ui.swallowBoard || !els.recipePop.hidden) { ui.swallowBoard = false; closeRecipePop(); ui.drag = null; return; }
    if (e.touches.length > 1) { ui.drag = null; return; }
    if (ui.sel == null || state.over) return;
    const t = e.changedTouches[0];
    const p = boardPoint(t);
    if (!p) return;
    ui.drag = { id: t.identifier, start: p, startPos: ui.pos ? Object.assign({}, ui.pos) : centerAt(p), moved: false, sx: t.clientX, sy: t.clientY };
  }, { passive: false });
  els.boardWrap.addEventListener('touchmove', (e) => {
    if (e.target.closest && e.target.closest(OVERLAY)) return;
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
    if (e.target.closest && e.target.closest(OVERLAY)) return;
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
      if (n.matches('.rules-body, .side, dialog, .recipe-pop') && n.scrollHeight > n.clientHeight + 1) return true;
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
    const inGame = (els.boardWrap.contains(e.target) && !e.target.closest(OVERLAY)) || els.hand.contains(e.target);
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
    if (isOnline()) { if (v === 'again' || v === 'next') onlineRematch(v === 'again'); return; }
    const names = match.players.map((p) => p.name);
    if (v === 'again') start(state.seed, state.recipes ? state.recipes.slice() : false, match.mode, names);
    else if (v === 'next') start(null, state.recipes ? true : false, match.mode, names);
  });

  // ---------------------------------------------------------------- Succès
  // Logique dans achievements.js ; ici : sauvegarde, bandeau, liste.
  const A = window.OrtieAchievements;
  const ACH_KEY = 'ortie.achievements';
  let ach = A.newData();
  try { ach = A.normalize(JSON.parse(localStorage.getItem(ACH_KEY) || 'null')); } catch (e) { /* ignore */ }
  const fmt = (n) => Number(n).toLocaleString('fr-FR');

  // Enregistre et annonce les succès qui viennent d'être débloqués.
  function achSaved(ids) {
    try { localStorage.setItem(ACH_KEY, JSON.stringify(ach)); } catch (e) { /* stockage indisponible */ }
    if (ids && ids.length) { achNotify(ids); achBadge(); }
  }

  function achGameEnd() {
    const first = !match.achDone;
    match.achDone = true;
    let result = null;
    let margin = null;
    if (isMulti()) {
      const [a, b] = match.players.map((p) => H.score(p.state));
      const tie = a.total === b.total && a.dice === b.dice;
      if (isOnline() && oppPlayer().left && !oppPlayer().state.over) result = 'win';
      else if (tie) result = 'tie';
      else if (isOnline()) {
        const [mine, other] = match.me === 0 ? [a, b] : [b, a];
        result = mine.total > other.total || (mine.total === other.total && mine.dice > other.dice) ? 'win' : 'lose';
        margin = mine.total - other.total;
      }
    }
    const d = new Date();
    const day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const ids = A.onGameEnd(ach, {
      mode: isOnline() ? 'online' : isDuo() ? 'duo' : 'solo',
      states: isOnline() ? [myPlayer().state] : match.players.map((p) => p.state),
      result, margin, first, now: d.getTime(), hour: d.getHours(), day,
    });
    save();
    achSaved(ids);
    return ids;
  }

  function achIcon(a, locked) {
    if (locked && a.secret) return '<span class="ach-ico">❓</span>';
    if (a.icon === 'svg:basket') return '<svg viewBox="-19 -21 38 38" class="ach-svg" aria-hidden="true"><use href="#basket"/></svg>';
    if (a.icon === 'svg:barrow') return `<svg viewBox="0 0 64 64" class="ach-svg" aria-hidden="true">${barrowArt(null)}</svg>`;
    if (a.icon === 'svg:squirrel') return '<svg viewBox="0 0 64 64" class="ach-svg" aria-hidden="true"><use href="#squirrel"/></svg>';
    return `<span class="ach-ico">${a.icon}</span>`;
  }

  const KIND_NAME = { board: 'Fond', cards: 'Cartes', dice: 'Dés', accent: 'Couleurs' };
  const rewardText = (a) => (a.reward || []).map((r) => `${KIND_NAME[r.kind]} « ${r.name} »`).join(' + ');

  function achEndHtml(ids) {
    if (!ids || !ids.length) return '';
    return `<div class="ach-end"><h3>🏆 ${ids.length > 1 ? 'Nouveaux achievements' : 'Nouvel achievement'}</h3>` + ids.map((id) => {
      const a = A.BY_ID[id];
      return `<div class="ach-chip tier-${a.tier}"><span class="ach-medal">${achIcon(a)}</span><span><b>${a.name}</b><small>${a.desc}</small>${a.reward ? `<small class="ach-gift">🎁 Récompense : ${rewardText(a)}</small>` : ''}</span></div>`;
    }).join('') + '</div>';
  }

  // Fenêtre surgissante « Achievement débloqué » sur l'écran principal. Elle
  // est dans la couche supérieure (popover) : visible même par-dessus une
  // fenêtre ouverte. Plusieurs achievements obtenus d'un coup sont annoncés
  // ensemble. Un toucher ouvre la liste.
  const achQueue = [];
  let achShowing = false;
  let achTimer = 0;
  const TIER_ORDER = ['platine', 'or', 'argent', 'bronze'];
  const popOpen = (el) => { try { return el.matches(':popover-open'); } catch (e) { return false; } };
  function achNotify(ids) {
    achQueue.push(ids.slice());
    if (!achShowing) achNext();
  }
  // Une fenêtre vient de s'ouvrir par-dessus : on remet l'annonce au premier plan.
  function achRaise() {
    const el = els.achToast;
    if (!achShowing || !popOpen(el)) return;
    try { el.hidePopover(); el.showPopover(); } catch (e) { /* ignore */ }
  }
  function achHide() {
    const el = els.achToast;
    achShowing = false;
    el.classList.remove('show');
    try { if (popOpen(el)) el.hidePopover(); } catch (e) { /* ignore */ }
  }
  function achNext() {
    clearTimeout(achTimer);
    const el = els.achToast;
    const batch = achQueue.shift();
    if (!batch) { achHide(); return; }
    achShowing = true;
    const list = batch.map((id) => A.BY_ID[id]).filter(Boolean);
    const best = list.slice().sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))[0];
    el.className = 'ach-toast tier-' + best.tier + (list.length > 1 ? ' multi' : '');
    if (list.length === 1) {
      el.innerHTML = `<span class="ach-medal">${achIcon(best)}</span><span class="at-txt"><small>🏆 Achievement débloqué ! · ${A.TIERS[best.tier].name}</small><b>${best.name}</b><span class="at-desc">${best.desc}</span>${best.reward ? `<span class="at-gift">🎁 Récompense : ${rewardText(best)}</span>` : ''}</span>`;
    } else {
      const more = list.length - 3;
      const names = list.slice(0, 3).map((a) => a.name).join(', ') + (more > 0 ? ` et ${more} autre${more > 1 ? 's' : ''}` : '');
      const gifts = list.reduce((n, a) => n + (a.reward || []).length, 0);
      el.innerHTML = `<span class="at-txt"><small>🏆 ${list.length} achievements débloqués !</small><span class="at-medals">${list.slice(0, 7).map((a) => `<span class="ach-medal tier-${a.tier}">${achIcon(a)}</span>`).join('')}</span><span class="at-desc">${names}</span>${gifts ? `<span class="at-gift">🎁 ${gifts} récompense${gifts > 1 ? 's' : ''} à découvrir dans Personnaliser</span>` : ''}</span>`;
    }
    el.setAttribute('aria-label', list.length === 1 ? 'Achievement débloqué : ' + best.name : list.length + ' achievements débloqués');
    try { if (el.showPopover && !popOpen(el)) el.showPopover(); } catch (e) { /* navigateur sans popover */ }
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
    sfx('achievement');
    achTimer = setTimeout(() => { el.classList.remove('show'); achTimer = setTimeout(achNext, 380); }, list.length > 1 ? 4800 : 3800);
  }
  els.achToast.addEventListener('click', () => {
    clearTimeout(achTimer);
    achQueue.length = 0;
    achHide();
    openAch();
  });

  function achBadge() {
    const s = A.summary(ach);
    els.menuAchSub.innerHTML = `${s.count} / ${s.total} réussis · ${fmt(s.pts)} points · 🎁 ${s.rewards} / ${s.rewardsTotal}<span class="mi-bar"><i style="width:${Math.round((100 * s.count) / s.total)}%"></i></span>`;
    els.menuAchNew.hidden = !s.fresh;
    els.menuAchNew.textContent = s.fresh + (s.fresh > 1 ? ' nouveaux' : ' nouveau');
    const badge = document.querySelector('.menu-badge');
    if (badge) badge.classList.toggle('has-new', s.fresh > 0);
  }

  let achSeen = 0; // « nouveau » : débloqué depuis la dernière visite de la liste
  function renderAch() {
    const s = A.summary(ach);
    const f = (els.dlgAch.querySelector('input[name=achf]:checked') || {}).value || 'all';
    const pct = Math.round((100 * s.count) / s.total);
    els.achSummary.innerHTML = `<div class="as-top"><div class="as-main"><b>${s.count}</b><span>/ ${s.total} réussis</span></div><div class="as-pts"><b>${fmt(s.pts)}</b> / ${fmt(s.max)} points</div></div>`
      + `<div class="bar"><span style="width:${pct}%"></span></div>`
      + `<div class="as-tiers">${Object.entries(A.TIERS).map(([t, T]) => `<span class="tier-${t}"><i></i>${s.tiers[t]} ${T.name.toLowerCase()}</span>`).join('')}<span class="as-gifts">🎁 ${s.rewards} / ${s.rewardsTotal} récompenses</span></div>`;
    let h = '';
    for (const [cat, title] of A.CATEGORIES) {
      const inCat = A.LIST.filter((a) => a.cat === cat);
      const items = inCat.filter((a) => (f === 'all' ? true : f === 'secret' ? a.secret : (f === 'done') === !!ach.unlocked[a.id]));
      if (!items.length) continue;
      h += `<h4 class="ach-cat">${title}<span>${inCat.filter((a) => ach.unlocked[a.id]).length} / ${inCat.length}</span></h4><div class="ach-grid">`;
      for (const a of items) {
        const t = ach.unlocked[a.id];
        const hidden = a.secret && !t;
        const p = A.progress(ach, a);
        let foot = '';
        if (t) foot = `<em class="ach-date">Débloqué le ${new Date(t).toLocaleDateString('fr-FR')}</em>`;
        else if (p) foot = `<span class="ach-prog"><i style="width:${Math.round((100 * p.cur) / p.goal)}%"></i></span><em>${fmt(p.cur)} / ${fmt(p.goal)}</em>`;
        h += `<div class="ach-card tier-${a.tier}${t ? ' done' : ''}${t && t > achSeen ? ' new' : ''}">`
          + `<span class="ach-medal">${achIcon(a, !t)}</span>`
          + `<div class="ach-txt"><b>${hidden ? 'Achievement secret' : a.name}</b><small>${hidden ? 'Continuez à jouer pour le découvrir…' : a.desc}</small>${a.reward ? `<small class="ach-gift">🎁 ${t ? 'Obtenu' : 'Récompense'} : ${hidden ? 'surprise' : rewardText(a)}</small>` : ''}${foot}</div>`
          + `<span class="ach-tier">${A.TIERS[a.tier].name}</span></div>`;
      }
      h += '</div>';
    }
    els.achList.innerHTML = h || '<p class="small-note">Aucun achievement ici pour le moment : à vous de jouer !</p>';
    const st = ach.stats;
    const rows = [
      ['Parties terminées', fmt(st.games)],
      ['Meilleur score', st.best ? st.best + ' fruits' : '—'],
      ['Moyenne par verger', st.orchards ? Math.round(st.fruits / st.orchards) + ' fruits' : '—'],
      ['Fruits récoltés', fmt(st.fruits)],
      ['Recettes réussies', fmt(st.recipes)],
      ['Recettes différentes', st.recipeSet.length + ' / ' + A.BONUS_RECIPES.length],
      ['Paniers en fin de partie', fmt(st.baskets)],
      ['Jours de jeu', fmt(st.days)],
      ['Parties à deux', fmt(st.duoGames)],
      ['Parties à distance', fmt(st.onlineGames)],
      ['Victoires à distance', fmt(st.onlineWins)],
    ];
    els.achStats.innerHTML = rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
  }
  function openAch() {
    achSeen = ach.seenAt;
    renderAch();
    openDialog(els.dlgAch);
    els.dlgAch.scrollTop = 0;
    ach.seenAt = Date.now();
    achSaved();
    achBadge();
  }
  for (const r of els.dlgAch.querySelectorAll('input[name=achf]')) r.addEventListener('change', renderAch);

  // ------------------------------------------------------- Jouer à distance
  // Chacun joue sur son appareil, en même temps, avec les mêmes cartes. Le
  // serveur (rooms.js) relaie la liste des coups de chacun ; on reconstruit le
  // verger de l'autre en rejouant ses coups avec le moteur.
  const O = window.OrtieOnline;
  let net = null; // liaison en cours : { code, token, conn, push }
  let lobby = null; // partie créée ou rejointe, en attente du 2e joueur : { code, token, seat }
  ui.linkOk = false;

  const movesOf = (st) => st.placed.slice(1).map((m) => ({ id: m.id, rot: m.rot, x: m.x, y: m.y }));
  const sameMoves = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function replayState(seed, recipes, moves) {
    const st = H.newGame(seed, { recipes: recipes || false });
    for (const m of moves || []) if (!H.play(st, m.id, m.rot, m.x, m.y, { allowSquirrel: true }).ok) break;
    return st;
  }

  function loadTokens() { try { return JSON.parse(localStorage.getItem(TOKENS_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function rememberToken(code, token) {
    const t = loadTokens();
    delete t[code];
    t[code] = token;
    const keys = Object.keys(t);
    while (keys.length > 12) delete t[keys.shift()];
    try { localStorage.setItem(TOKENS_KEY, JSON.stringify(t)); } catch (e) { /* ignore */ }
  }

  function netOpen(code, token) {
    netClose();
    ui.linkOk = false;
    const conn = O.connect(code, token, {
      room: onRoom,
      status: (ok) => { if (ui.linkOk === ok) return; ui.linkOk = ok; if (isOnline()) renderPlayers(); },
      gone: onGone,
    });
    const push = O.pusher(code, token, onPushRejected);
    net = { code, token, conn, push };
  }
  function netClose() {
    if (!net) return;
    net.conn.close();
    net.push.stop();
    net = null;
    ui.linkOk = false;
  }
  function pushMoves() {
    if (isOnline() && net) net.push.send(match.round, movesOf(myPlayer().state));
  }

  // Quitter une partie à distance (nouvelle partie locale, autre salon…).
  function onlineQuit() {
    if (!isOnline()) return;
    O.leave(match.code, match.token);
    netClose();
    toLocal();
  }
  // Mon verger continue en partie solo (salon quitté ou disparu).
  function toLocal() {
    const mine = myPlayer();
    match = { mode: 'solo', cur: 0, players: [{ name: 'Vous', color: PLAYER_COLORS[0], state: mine.state }] };
    syncState();
    ui.locked = false;
  }

  function onGone() {
    netClose();
    if (lobby) {
      lobby = null;
      if (els.dlgOnline.open) { setOnlineStep('form'); showOnlineError('Cette partie n’existe plus.'); }
      return;
    }
    if (!isOnline()) return;
    toLocal();
    computeView();
    save();
    renderAll();
    toast('La partie à distance n’existe plus : vous continuez seul.', 'bad');
  }

  function onPushRejected(err) {
    // Le serveur refuse mes coups (manche finie, verger désynchronisé) : on reprend sa version.
    const snap = err && err.data && err.data.room;
    if (!isOnline() || !snap || snap.code !== match.code) return;
    if (snap.round !== match.round) { onRoom(snap); return; }
    match.cur = match.me;
    myPlayer().state = replayState(match.seed, match.recipes, (snap.players[match.me] || {}).moves);
    syncState();
    computeView();
    save();
    renderAll();
    toast('Partie resynchronisée avec le serveur.', 'bad');
  }

  function onRoom(snap) {
    if (!snap || !Array.isArray(snap.players)) return;
    if (!isOnline() || match.code !== snap.code) {
      // Salle d'attente : la partie démarre dès que le 2e joueur est là.
      if (!lobby || lobby.code !== snap.code) return;
      if (snap.players.length < 2) return;
      const { seat, token } = lobby;
      lobby = null;
      if (els.dlgOnline.open) els.dlgOnline.close('started');
      startOnline(snap, seat, token);
      return;
    }
    if (snap.round !== match.round) { startOnline(snap, match.me, match.token); return; } // revanche
    syncOnline(snap);
  }

  function startOnline(snap, seat, token) {
    if (isOnline() && match.code !== snap.code) onlineQuit();
    match = {
      mode: 'online', code: snap.code, token, me: seat, round: snap.round, seed: snap.seed, recipes: snap.recipes, cur: seat,
      players: snap.players.slice(0, 2).map((p, i) => ({
        name: p.name, color: PLAYER_COLORS[i], online: p.online, left: p.left,
        state: replayState(snap.seed, snap.recipes, p.moves),
      })),
    };
    syncState();
    clearTimeout(ui.turnTimer);
    ui.locked = false;
    ui.sel = null; ui.pos = null; ui.rot = 0; ui.fresh = true;
    ui.endShown = allOver();
    closeRecipePop();
    if (els.dlgEnd.open) els.dlgEnd.close();
    if (!net || net.code !== snap.code) netOpen(snap.code, token);
    computeView();
    save();
    renderAll();
    if (snap.round > 1) achSaved(A.onEvent(ach, 'revanche'));
    // Écran d'accueil de la manche
    const op = oppPlayer();
    let h = `<div class="turn-head"><span class="big-dot" style="background:${myPlayer().color}"></span><div><h2>${snap.round > 1 ? 'Revanche' : 'Partie'} contre ${esc(op.name)} !</h2>`;
    h += `<p>Mêmes cartes pour les deux · chacun joue à son rythme</p></div></div>`;
    h += scoreboardHtml();
    h += '<p class="small-note">Le score de votre adversaire s’affiche en direct en haut du verger.</p>';
    els.turnBody.innerHTML = h;
    if (els.dlgTurn.open) els.dlgTurn.close();
    sfx('turn');
    openDialog(els.dlgTurn);
  }

  function syncOnline(snap) {
    let changed = false;
    snap.players.slice(0, 2).forEach((sp, i) => {
      const p = match.players[i];
      if (!p) return;
      if (i !== match.me && sp.left && !p.left) toast(`${sp.name} a quitté la partie.`, 'bad');
      p.name = sp.name;
      p.online = sp.online;
      p.left = sp.left;
      if (sameMoves(movesOf(p.state), sp.moves)) return;
      // Mes coups : c'est mon appareil qui fait foi (le serveur peut être en retard).
      if (i === match.me) { pushMoves(); return; }
      const wasOver = p.state.over;
      p.state = replayState(match.seed, match.recipes, sp.moves);
      changed = true;
      if (!wasOver && p.state.over && !myPlayer().state.over) toast(`${p.name} a terminé son verger : ${H.score(p.state).total} fruits.`);
    });
    syncState();
    if (changed && viewedIndex() !== match.me) computeView(true);
    save();
    if (changed && viewedIndex() !== match.me) renderAll(); else renderSide();
    if (onlineFinished() && !ui.endShown) { clearTimeout(ui.turnTimer); ui.turnTimer = setTimeout(showEnd, 900); }
  }

  // Fin de partie à distance : les deux vergers terminés, ou l'adversaire est parti.
  const onlineFinished = () => allOver() || (myPlayer().state.over && oppPlayer().left);

  function onlineRematch(same) {
    if (!isOnline()) return;
    if (oppPlayer().left) { toast(`${oppPlayer().name} a quitté la partie.`, 'bad'); return; }
    toast(same ? 'On rejoue les mêmes cartes…' : 'Revanche : nouvelles cartes…');
    O.rematch(match.code, match.token, match.round, same).catch((e) => toast(e.message, 'bad'));
  }

  // Fenêtre « Jouer à distance » : créer (code à partager) ou rejoindre.
  // fromLink : ouvert par un lien d'invitation (dans le navigateur, on
  // propose alors de continuer dans l'appli installée).
  function openOnline(mode, code, fromLink) {
    lobby = null;
    els.inOName.value = prefs.onlineName || (prefs.names && prefs.names[0]) || '';
    els.inORecipes.checked = !!(state && state.recipes);
    (mode === 'join' ? els.inOJoin : els.inOCreate).checked = true;
    els.inOCode.value = code || '';
    setOnlineStep('form');
    updateOnlineMode();
    renderAppBanner(fromLink ? code : null);
    $('btn-ocode-paste').hidden = !(navigator.clipboard && navigator.clipboard.readText);
    openDialog(els.dlgOnline);
  }

  // ---- Lien d'invitation → appli installée en priorité
  // Android : le manifeste (handle_links, launch_handler) fait ouvrir le lien
  // dans l'appli installée ; si le navigateur l'a quand même ouvert, un bouton
  // la lance. iPhone : Apple ne laisse aucun lien ouvrir une appli de l'écran
  // d'accueil ; on copie le code, à « Coller » dans l'appli.
  const UA = navigator.userAgent || '';
  const IS_IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const IS_ANDROID = /Android/i.test(UA);
  const IN_APP = ['standalone', 'fullscreen', 'window-controls-overlay'].some((m) => window.matchMedia('(display-mode: ' + m + ')').matches) || navigator.standalone === true;
  async function appInstalled() {
    try { if (localStorage.getItem('ortie.installed') === '1') return true; } catch (e) { /* ignore */ }
    try { if (navigator.getInstalledRelatedApps) return (await navigator.getInstalledRelatedApps()).length > 0; } catch (e) { /* ignore */ }
    return false;
  }
  function inviteUrl(code) {
    const u = new URL(location.href);
    u.search = '';
    u.hash = '';
    u.searchParams.set('rejoindre', code);
    return u;
  }
  async function renderAppBanner(code) {
    const box = $('online-app');
    box.hidden = true;
    if (!code || IN_APP) return;
    if (IS_IOS) {
      box.innerHTML = `<p>📲 Vous jouez avec l’appli Ortie de l’écran d’accueil ? Copiez le code, ouvrez l’appli, puis <b>Jouer à distance → Rejoindre → Coller</b>.</p><button type="button" class="btn primary" id="btn-ocode-copy">Copier le code ${code}</button>`;
      box.hidden = false;
      $('btn-ocode-copy').addEventListener('click', (e) => {
        const b = e.currentTarget;
        const ok = () => { b.textContent = 'Code copié ✔ — ouvrez l’appli Ortie'; };
        try { navigator.clipboard.writeText(code).then(ok, () => window.prompt('Copiez ce code :', code)); } catch (err) { window.prompt('Copiez ce code :', code); }
      });
      return;
    }
    if (IS_ANDROID && await appInstalled()) {
      const u = inviteUrl(code);
      const intent = `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(':', '')};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(u.toString())};end`;
      box.innerHTML = `<p>📲 L’appli Ortie est installée sur ce téléphone.</p><a class="btn primary" id="btn-open-app" href="${esc(intent)}">Ouvrir dans l’appli</a><small>ou continuez ici, dans le navigateur.</small>`;
      box.hidden = false;
    }
  }
  // « Coller » : retrouve le code dans le presse-papiers (code seul, message ou lien d'invitation).
  function codeFromText(t) {
    const txt = String(t || '');
    const m = /[?&]rejoindre=([A-Za-z0-9]{4})/.exec(txt) || /code\s*(?:de la partie)?\s*:?\s*([A-Za-z0-9]{4})\b/i.exec(txt) || /\b([A-HJ-NP-Z2-9]{4})\b/.exec(txt) || /^\s*([A-Za-z0-9]{4})\s*$/.exec(txt);
    return m ? cleanCode(m[1]) : '';
  }
  $('btn-ocode-paste').addEventListener('click', async () => {
    let txt = '';
    try { txt = await navigator.clipboard.readText(); } catch (e) { showOnlineError('Impossible de lire le presse-papiers : tapez le code.'); return; }
    const code = codeFromText(txt);
    if (!code) { showOnlineError('Aucun code de partie dans le presse-papiers.'); return; }
    els.inOCode.value = code;
    els.onlineError.hidden = true;
    sfx('ui');
  });

  // Appli déjà ouverte : un lien d'invitation (ou de défi) arrive ici sans
  // recharger la page, la partie en cours n'est pas perdue (launch_handler).
  function handleAppLink(href) {
    let u;
    try { u = new URL(href); } catch (e) { return; }
    const code = cleanCode(u.searchParams.get('rejoindre'));
    if (code) {
      if (isOnline() && match.code === code) toast('Vous êtes déjà dans cette partie.');
      else openOnline('join', code, true);
      return;
    }
    const seed = u.searchParams.get('partie');
    if (seed) { // défi : on prépare la partie, le joueur confirme
      const rp = u.searchParams.get('recettes');
      const ids = rp ? rp.split(',').map(Number).filter(Boolean) : [];
      openNew('solo');
      els.inSeed.value = seed;
      els.inRecipes.checked = rp != null;
      els.recipePick.hidden = !els.inRecipes.checked;
      els.inR1.value = ids[0] || '';
      els.inR2.value = ids[1] || '';
    }
  }
  function updateOnlineMode() {
    const join = els.inOJoin.checked;
    els.onlineCreate.hidden = join;
    els.onlineJoin.hidden = !join;
    els.btnOnlineGo.textContent = join ? 'Rejoindre' : 'Créer la partie';
    els.onlineError.hidden = true;
  }
  function setOnlineStep(step, code) {
    els.onlineForm.hidden = step !== 'form';
    els.onlineWait.hidden = step !== 'wait';
    els.btnOnlineGo.hidden = step !== 'form';
    if (code) els.onlineCode.textContent = code;
    els.onlineError.hidden = true;
  }
  function showOnlineError(msg) {
    els.onlineError.textContent = msg;
    els.onlineError.hidden = false;
  }
  const cleanCode = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);

  async function onlineGo() {
    if (ui.onlineBusy) return;
    const join = els.inOJoin.checked;
    const name = els.inOName.value.trim();
    const code = cleanCode(els.inOCode.value);
    if (join && code.length !== 4) { showOnlineError('Le code de la partie fait 4 caractères.'); sfx('bad'); els.inOCode.focus(); return; }
    prefs.onlineName = name;
    savePrefs();
    ui.onlineBusy = true;
    els.btnOnlineGo.disabled = true;
    els.onlineError.hidden = true;
    try {
      const r = join ? await O.join(code, name, loadTokens()[code]) : await O.create(name, els.inORecipes.checked);
      const c = join ? code : r.code;
      if (isOnline() && match.code !== c) onlineQuit(); // on quitte l'ancienne partie à distance
      rememberToken(c, r.token);
      if (isOnline() && match.code === c) { // déjà dans cette partie : on y retourne
        els.dlgOnline.close('started');
        onRoom(r.room);
      } else {
        lobby = { code: c, token: r.token, seat: r.seat };
        netOpen(c, r.token);
        if (r.room.players.length >= 2) onRoom(r.room);
        else { setOnlineStep('wait', c); sfx('ui'); }
      }
    } catch (e) {
      showOnlineError(e.message);
      sfx('bad');
    }
    ui.onlineBusy = false;
    els.btnOnlineGo.disabled = false;
  }
  els.btnOnlineGo.addEventListener('click', onlineGo);
  for (const r of [els.inOCreate, els.inOJoin]) r.addEventListener('change', updateOnlineMode);
  els.inOCode.addEventListener('input', () => { const v = cleanCode(els.inOCode.value); if (v !== els.inOCode.value) els.inOCode.value = v; });
  // Entrée valide (et n'appuie pas sur « Annuler », premier bouton du formulaire)
  for (const inp of [els.inOName, els.inOCode]) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); onlineGo(); } });
  els.dlgOnline.addEventListener('close', () => {
    if (!lobby) return; // la partie a démarré
    O.leave(lobby.code, lobby.token); // annulé pendant l'attente
    lobby = null;
    netClose();
  });
  els.btnOnlineShare.addEventListener('click', () => {
    const code = els.onlineCode.textContent;
    const u = inviteUrl(code);
    const text = `Viens jouer à Ortie avec moi ! Dans l’appli : Jouer à distance → Rejoindre → code ${code}. Ou touche ce lien :`;
    const copied = () => {
      els.btnOnlineShare.textContent = 'Lien copié ✔';
      setTimeout(() => { els.btnOnlineShare.textContent = 'Envoyer le lien d’invitation'; }, 2000);
    };
    if (navigator.share) { navigator.share({ title: 'Ortie', text, url: u.toString() }).catch(() => {}); return; }
    try {
      if (navigator.clipboard) navigator.clipboard.writeText(text + ' ' + u).then(copied, () => window.prompt('Copiez ce lien :', u.toString()));
      else window.prompt('Copiez ce lien :', u.toString());
    } catch (e) { window.prompt('Copiez ce lien :', u.toString()); }
  });
  // Retour sur l'appli (téléphone verrouillé, autre appli…) : on se reconnecte.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !net) return;
    const n = net;
    const keep = lobby;
    netOpen(n.code, n.token);
    lobby = keep;
    pushMoves();
  });

  // Pastille du joueur / liste des joueurs : après la partie, voir chaque verger.
  els.playerPill.addEventListener('click', () => {
    if (canSwitchView()) viewPlayer(1 - viewedIndex());
    else if (isOnline()) toast(`${oppPlayer().name} : ${H.score(oppPlayer().state).total} fruits. Son verger sera visible quand le vôtre sera terminé.`);
    else toast(`C’est au tour de ${curPlayer().name}.`);
  });
  els.playersList.addEventListener('click', (e) => {
    const b = e.target.closest('[data-player]');
    if (b) viewPlayer(Number(b.dataset.player));
  });

  // Menu (logo en haut à gauche)
  els.btnMenu.addEventListener('click', () => { sfx('ui'); achBadge(); openDialog(els.dlgMenu); });
  els.dlgMenu.addEventListener('close', () => {
    const v = els.dlgMenu.returnValue;
    if (v === 'solo') openNew('solo');
    else if (v === 'duo') openNew('duo');
    else if (v === 'online') openOnline('create');
    else if (v === 'ach') openAch();
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
    if (prefs.accent === 'verger') root.removeAttribute('data-accent'); else root.dataset.accent = prefs.accent;
    if (meta) meta.setAttribute('content', dark ? '#171b14' : ACCENTS[prefs.accent].brand);
  }
  try { darkQuery.addEventListener('change', applyPrefs); } catch (e) { /* ancien Safari */ }
  // Objets exclusifs : verrouillés tant que l'achievement qui les donne n'est pas réussi.
  const KIND_PREF = { board: 'board', cards: 'cards', dice: 'dice', accent: 'accent' };
  const isLocked = (kind, id) => A.rewardLocked(ach, kind, id);
  function lockBadge(kind, id) {
    if (!isLocked(kind, id)) return A.rewardOwner(kind, id) ? '<span class="opt-badge" title="Récompense d’achievement">🏆</span>' : '';
    return '<span class="opt-badge lock" aria-hidden="true">🔒</span>';
  }
  const prev = (inner, badge) => `<span class="opt-prev">${inner}${badge || ''}</span>`;
  function optAttrs(kind, id, on) {
    const locked = isLocked(kind, id);
    return `class="opt${on ? ' on' : ''}${locked ? ' locked' : ''}" aria-pressed="${on}"${locked ? ' aria-disabled="true"' : ''}`;
  }
  // Toucher un objet verrouillé : on explique comment l'obtenir.
  function lockedHint(kind, id) {
    if (!isLocked(kind, id)) return false;
    const a = A.BY_ID[A.rewardOwner(kind, id)];
    const el = $('custom-lock');
    el.innerHTML = `🔒 Récompense de l’achievement <b>${a.secret ? 'secret' : '« ' + a.name + ' »'}</b>${a.secret ? '' : ' : ' + a.desc}`;
    el.hidden = false;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    clearTimeout(lockedHint.timer);
    lockedHint.timer = setTimeout(() => { el.hidden = true; }, 6000); // l'explication s'efface toute seule
    sfx('bad');
    return true;
  }
  // Données effacées ou objet pas (encore) obtenu : retour au style par défaut.
  function checkLockedPrefs() {
    let changed = false;
    for (const k of Object.keys(KIND_PREF)) if (isLocked(k, prefs[KIND_PREF[k]])) { prefs[KIND_PREF[k]] = PREF_DEFAULTS[KIND_PREF[k]]; changed = true; }
    if (changed) savePrefs();
    return changed;
  }

  function renderCustom() {
    $('custom-lock').hidden = true;
    els.optThemes.innerHTML = Object.entries(THEMES).map(([id, name]) =>
      `<button type="button" class="opt${prefs.theme === id ? ' on' : ''}" data-theme-opt="${id}" aria-pressed="${prefs.theme === id}">${prev(`<span class="theme-swatch" data-t="${id}"><i></i><i></i><i></i></span>`)}<span class="opt-name">${id === 'auto' ? '<span class="nm-full">Automatique</span><span class="nm-short">Auto</span>' : name}</span></button>`).join('');
    els.optBoards.innerHTML = Object.entries(BOARDS).map(([id, name]) =>
      `<button type="button" ${optAttrs('board', id, prefs.board === id)} data-board-opt="${id}">${prev(`<span class="swatch" data-board="${id}"></span>`, lockBadge('board', id))}<span class="opt-name">${name}</span></button>`).join('');
    els.optCards.innerHTML = Object.entries(CARD_THEMES).map(([id, T]) =>
      `<button type="button" ${optAttrs('cards', id, prefs.cards === id)} data-card-opt="${id}">${prev(`<svg viewBox="-6 -4 312 212" aria-hidden="true">${cardArt(H.cardById(9), id)}</svg>`, lockBadge('cards', id))}<span class="opt-name">${T.name}</span></button>`).join('');
    els.optAccents.innerHTML = Object.entries(ACCENTS).map(([id, C]) =>
      `<button type="button" ${optAttrs('accent', id, prefs.accent === id)} data-accent-opt="${id}">${prev(`<span class="accent-swatch" style="--b:${C.brand};--a:${C.accent}"><i></i><i></i></span>`, lockBadge('accent', id))}<span class="opt-name">${C.name}</span></button>`).join('');
    const dice = (st) => [['orange', 5, -58], ['citron', 3, 0], ['vert', 6, 58]].map(([t, v, x]) => dieSvg({ t, v }, x, 0, { scale: 0.92, style: st })).join('');
    els.optDice.innerHTML = Object.entries(DICE_STYLES).map(([id, name]) =>
      `<button type="button" ${optAttrs('dice', id, prefs.dice === id)} data-dice-opt="${id}">${prev(`<svg viewBox="-92 -34 184 70" aria-hidden="true">${dice(id)}</svg>`, lockBadge('dice', id))}<span class="opt-name">${name}</span></button>`).join('');
  }
  function customChanged() {
    savePrefs(); applyPrefs(); renderCustom(); renderAll(); renderLegend(); achStyle();
  }
  function achStyle() {
    if (prefs.board !== 'oak' && prefs.cards !== 'classic' && prefs.dice !== 'classic' && prefs.accent !== 'verger') achSaved(A.onEvent(ach, 'styliste'));
  }
  // Onglets de Personnaliser : une catégorie à la fois (moins de défilement).
  function showCustomTab(tab) {
    for (const el of els.dlgCustom.querySelectorAll('.ctab')) el.hidden = el.dataset.tab !== tab;
    const r = els.dlgCustom.querySelector(`input[name=ctab][value="${tab}"]`);
    if (r) r.checked = true;
    ui.customTab = tab;
    els.dlgCustom.scrollTop = 0;
  }
  for (const r of document.querySelectorAll('#dlg-custom input[name=ctab]')) r.addEventListener('change', () => { $('custom-lock').hidden = true; showCustomTab(r.value); });
  function openCustom() { renderCustom(); showCustomTab(ui.customTab || 'general'); openDialog(els.dlgCustom); }
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
    if (!b || lockedHint('board', b.dataset.boardOpt)) return;
    prefs.board = b.dataset.boardOpt;
    savePrefs(); applyPrefs(); renderCustom(); achStyle();
  });
  els.optCards.addEventListener('click', (e) => {
    const b = e.target.closest('[data-card-opt]');
    if (!b || lockedHint('cards', b.dataset.cardOpt)) return;
    prefs.cards = b.dataset.cardOpt;
    savePrefs(); renderCustom(); renderAll(); renderLegend(); achStyle();
  });
  els.optAccents.addEventListener('click', (e) => {
    const b = e.target.closest('[data-accent-opt]');
    if (!b || lockedHint('accent', b.dataset.accentOpt)) return;
    prefs.accent = b.dataset.accentOpt;
    customChanged();
  });
  els.optDice.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dice-opt]');
    if (!b || lockedHint('dice', b.dataset.diceOpt)) return;
    prefs.dice = b.dataset.diceOpt;
    customChanged();
  });
  // Au hasard : nouvelle combinaison (le thème clair / sombre ne change pas).
  const pickOther = (kind, obj, cur) => { const k = Object.keys(obj).filter((x) => x !== cur && !isLocked(kind, x)); return k[Math.floor(Math.random() * k.length)] || cur; };
  $('btn-custom-random').addEventListener('click', () => {
    prefs.board = pickOther('board', BOARDS, prefs.board);
    prefs.cards = pickOther('cards', CARD_THEMES, prefs.cards);
    prefs.accent = pickOther('accent', ACCENTS, prefs.accent);
    prefs.dice = pickOther('dice', DICE_STYLES, prefs.dice);
    customChanged();
    sfx('rotate');
  });
  $('btn-custom-reset').addEventListener('click', () => {
    Object.assign(prefs, PREF_DEFAULTS);
    customChanged();
    sfx('ui');
  });
  els.dlgRules.addEventListener('close', () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* ignore */ } });

  // Contour de focus du logo seulement quand on navigue au clavier (jamais au doigt).
  document.addEventListener('keydown', (e) => { if (e.key === 'Tab') document.body.classList.add('kbd'); }, true);
  document.addEventListener('pointerdown', () => document.body.classList.remove('kbd'), true);
  document.addEventListener('touchstart', () => document.body.classList.remove('kbd'), { capture: true, passive: true });

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('dialog[open]')) return;
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === '?') { openDialog(els.dlgRules); return; }
    if (k === '1' || k === '2') { const id = state.hand[Number(k) - 1]; if (id) selectCard(id); }
    else if (k === 'r' || k === 'e') rotate(1);
    else if (k === 'q') rotate(-1);
    else if (k === 'enter') { if (ui.sel != null) { e.preventDefault(); tryPlace(); } }
    else if (k === 'escape') {
      if (!els.recipePop.hidden) { closeRecipePop(); return; }
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
  const BOOT_URL = location.href;
  const params = new URLSearchParams(location.search);
  if (params.get('partie')) {
    const rp = params.get('recettes');
    const rec = rp == null ? false : rp ? rp.split(',').map(Number).filter(Boolean) : true;
    start(params.get('partie'), rec && rec.length === 0 ? true : rec);
  } else if (load()) {
    computeView();
    renderAll();
    if (allOver()) ui.endShown = true;
    if (isOnline()) netOpen(match.code, match.token); // on retrouve la partie à distance
    // partie finie juste avant une fermeture de l'appli : succès comptés quand même
    if ((isOnline() ? onlineFinished() : allOver()) && !match.achDone) achGameEnd();
  } else {
    start(null, false);
  }
  const invite = cleanCode(params.get('rejoindre'));
  if (invite) {
    try { window.history.replaceState(null, '', location.pathname); } catch (e) { /* ignore */ }
    if (!(isOnline() && match.code === invite)) openOnline('join', invite, true);
  }
  // Appli installée et déjà ouverte : les liens suivants arrivent par launchQueue
  if (window.launchQueue && typeof window.launchQueue.setConsumer === 'function') {
    let firstLaunch = true;
    window.launchQueue.setConsumer((lp) => {
      const target = lp && lp.targetURL;
      const already = firstLaunch && target === BOOT_URL; // lien de démarrage : déjà traité ci-dessus
      firstLaunch = false;
      if (target && !already) handleAppLink(target);
    });
  }
  if (checkLockedPrefs()) { applyPrefs(); renderAll(); renderLegend(); }
  achBadge();
  achStyle();
  // Outils de test (jamais visibles pour le joueur) : localStorage « ortie.debug » = 1
  try { if (localStorage.getItem('ortie.debug') === '1') window.OrtieDebug = { suggest, place: tryPlace }; } catch (e) { /* ignore */ }
  // largeurs exactes une fois la police du jeu chargée
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fitTexts(); layoutOverlays(); });
  window.__ortieReady = true; // le jeu a démarré (voir le garde-fou dans index.html)
  try { sessionStorage.removeItem('ortie.autofix'); } catch (e) { /* ignore */ }
  let seen = false;
  try { seen = !!localStorage.getItem(SEEN_KEY); } catch (e) { seen = true; }
  if (!seen && !els.dlgTurn.open) openDialog(els.dlgRules);
})();
