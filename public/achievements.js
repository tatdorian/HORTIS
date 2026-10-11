/* Ortie — succès : liste, progression et déblocage.
 *
 * Logique pure, sans interface (testée dans test/achievements.test.js).
 *   A.onMove(data, { state, res, now })   → succès débloqués par un coup posé
 *   A.onGameEnd(data, partie)             → succès débloqués en fin de partie
 *   A.onEvent(data, id, now)              → succès d'un évènement (revanche, style…)
 * `data` (gardé par l'appli) contient les succès débloqués et les statistiques.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.OrtieAchievements = factory(root.OrtieCore);
})(typeof self !== 'undefined' ? self : this, function (H) {
  'use strict';

  const TIERS = {
    bronze: { name: 'Bronze', pts: 10 },
    argent: { name: 'Argent', pts: 25 },
    or: { name: 'Or', pts: 50 },
    platine: { name: 'Platine', pts: 100 },
  };
  const CATEGORIES = [
    ['debut', 'Premiers pas'],
    ['recolte', 'Belles récoltes'],
    ['recettes', 'Recettes'],
    ['assiduite', 'Assiduité'],
    ['multi', 'À plusieurs'],
    ['secrets', 'Secrets'],
    ['legende', 'Légende'],
  ];
  // Recettes « à bonus » (les recettes ×2 sont toujours appliquées)
  const BONUS_RECIPES = H.RECIPES.filter((r) => !r.mult).map((r) => r.id);

  // icon : émoji, ou « svg:… » pour un dessin du jeu (panier, brouette, écureuil).
  // stat / goal : compteur cumulé, affiché comme une progression.
  // reward : objets exclusifs de Personnaliser, débloqués avec l'achievement
  //          (kind : board = fond, cards = design des cartes, dice = dés, accent = couleurs).
  const R = (kind, id, name) => ({ kind, id, name });
  const LIST = [
    { id: 'premier_verger', cat: 'debut', tier: 'bronze', icon: '🌱', name: 'Premier verger', desc: 'Terminer une partie.', reward: [R('board', 'checker', 'Damier')] },
    { id: 'verger_complet', cat: 'debut', tier: 'bronze', icon: '🌳', name: 'Verger complet', desc: 'Poser les 9 cartes d’une partie.' },
    { id: 'premier_panier', cat: 'debut', tier: 'bronze', icon: 'svg:basket', name: 'Premier panier', desc: 'Transformer un dé en Panier (10 fruits).' },
    { id: 'brouette', cat: 'debut', tier: 'bronze', icon: 'svg:barrow', name: 'En brouette !', desc: 'Faire entrer la Brouette en jeu.' },
    { id: 'ecureuil', cat: 'debut', tier: 'bronze', icon: 'svg:squirrel', name: 'Ami des écureuils', desc: 'Utiliser l’Écureuil.' },
    { id: 'premiere_recette', cat: 'debut', tier: 'bronze', icon: '🍰', name: 'Premier dessert', desc: 'Réussir une recette.' },
    { id: 'styliste', cat: 'debut', tier: 'bronze', icon: '🎨', name: 'Styliste', desc: 'Changer à la fois le fond, les cartes, les dés et les couleurs (Personnaliser).' },

    { id: 'score_30', cat: 'recolte', tier: 'bronze', icon: '🍊', name: 'Bonne récolte', desc: 'Finir une partie avec 30 fruits ou plus.', score: 30 },
    { id: 'score_45', cat: 'recolte', tier: 'argent', icon: '🍋', name: 'Belle récolte', desc: 'Finir une partie avec 45 fruits ou plus.', score: 45 },
    { id: 'score_55', cat: 'recolte', tier: 'argent', icon: '✨', name: 'Récolte d’exception', desc: 'Finir une partie avec 55 fruits ou plus.', score: 55 },
    { id: 'score_65', cat: 'recolte', tier: 'or', icon: '🌟', name: 'Corne d’abondance', desc: 'Finir une partie avec 65 fruits ou plus.', score: 65, reward: [R('board', 'goldleaf', 'Feuille d’or')] },
    { id: 'score_80', cat: 'recolte', tier: 'or', icon: '👑', name: 'Légende du verger', desc: 'Finir une partie avec 80 fruits ou plus.', score: 80, reward: [R('cards', 'golden', 'Verger doré')] },
    { id: 'coup_maitre', cat: 'recolte', tier: 'argent', icon: '⚡', name: 'Coup de maître', desc: 'Gagner 15 fruits ou plus en un seul coup.', reward: [R('cards', 'ember', 'Braises')] },
    { id: 'trois_six', cat: 'recolte', tier: 'argent', icon: '🎲', name: 'Triple six', desc: 'Avoir 3 dés de valeur 6 en jeu en même temps.' },
    { id: 'panier_garni', cat: 'recolte', tier: 'or', icon: '🧺', name: 'Panier garni', desc: 'Avoir 3 Paniers en jeu en même temps (la Brouette compte).', reward: [R('dice', 'gold', 'Or massif')] },
    { id: 'quinze_des', cat: 'recolte', tier: 'or', icon: '🧮', name: 'Rien ne se perd', desc: 'Finir une partie avec les 15 dés en jeu.' },
    { id: 'score_90', cat: 'recolte', tier: 'or', icon: '🌋', name: 'Verger mythique', desc: 'Finir une partie avec 90 fruits ou plus.', score: 90, reward: [R('dice', 'obsidian', 'Obsidienne')] },
    { id: 'quatre_six', cat: 'recolte', tier: 'or', icon: '🎰', name: 'Carré de six', desc: 'Avoir 4 dés de valeur 6 en jeu en même temps.' },
    { id: 'cinq_paniers', cat: 'recolte', tier: 'or', icon: '🏺', name: 'Corbeille royale', desc: 'Avoir 5 Paniers en jeu en même temps (la Brouette compte).' },
    { id: 'zero_pourri', cat: 'recolte', tier: 'argent', icon: '🍃', name: 'Rien ne pourrit', desc: 'Poser les 9 cartes sans laisser de dé sur une clairière.' },

    { id: 'objectif', cat: 'recettes', tier: 'argent', icon: '🎯', name: 'Chef pâtissier', desc: 'Atteindre l’objectif d’une partie avec Recettes.' },
    { id: 'deux_etoiles', cat: 'recettes', tier: 'or', icon: '⭐', name: 'Deux étoiles', desc: 'Réussir les deux recettes à bonus d’une même partie.', reward: [R('dice', 'crystal', 'Cristal')] },
    { id: 'objectif_80', cat: 'recettes', tier: 'or', icon: '🏔️', name: 'Objectif ambitieux', desc: 'Atteindre un objectif de 80 ou plus.', reward: [R('accent', 'minuit', 'Minuit')] },
    { id: 'grand_cru', cat: 'recettes', tier: 'or', icon: '🍾', name: 'Grand cru', desc: 'Réussir les deux recettes à bonus et dépasser l’objectif de 15 fruits ou plus.' },
    { id: 'serie_recettes', cat: 'recettes', tier: 'or', icon: '🔥', name: 'Série étoilée', desc: 'Atteindre l’objectif de 5 parties avec Recettes d’affilée.', stat: 'recipeStreakBest', goal: 5 },
    { id: 'livre_recettes', cat: 'recettes', tier: 'argent', icon: '📖', name: 'Livre de recettes', desc: 'Réussir 10 recettes.', stat: 'recipes', goal: 10 },
    { id: 'grand_chef', cat: 'recettes', tier: 'or', icon: '🎂', name: 'Grand chef', desc: 'Réussir chacune des 14 recettes à bonus au moins une fois.', stat: 'recipeSet', goal: BONUS_RECIPES.length, reward: [R('cards', 'rainbow', 'Arc-en-ciel')] },

    { id: 'parties_10', cat: 'assiduite', tier: 'bronze', icon: '🌿', name: 'Jardinier assidu', desc: 'Terminer 10 parties.', stat: 'games', goal: 10, reward: [R('dice', 'wood', 'Bois')] },
    { id: 'parties_50', cat: 'assiduite', tier: 'argent', icon: '🏡', name: 'Arboriculteur passionné', desc: 'Terminer 50 parties.', stat: 'games', goal: 50, reward: [R('accent', 'royal', 'Royal')] },
    { id: 'parties_100', cat: 'assiduite', tier: 'or', icon: '🏆', name: 'Une vie au verger', desc: 'Terminer 100 parties.', stat: 'games', goal: 100 },
    { id: 'fruits_1000', cat: 'assiduite', tier: 'argent', icon: '📦', name: 'Mille fruits', desc: 'Récolter 1 000 fruits au total.', stat: 'fruits', goal: 1000 },
    { id: 'fruits_5000', cat: 'assiduite', tier: 'or', icon: '🚜', name: 'Cinq mille fruits', desc: 'Récolter 5 000 fruits au total.', stat: 'fruits', goal: 5000 },
    { id: 'parties_250', cat: 'assiduite', tier: 'or', icon: '🗿', name: 'Gardien éternel', desc: 'Terminer 250 parties.', stat: 'games', goal: 250 },
    { id: 'fruits_10000', cat: 'assiduite', tier: 'or', icon: '⛰️', name: 'Dix mille fruits', desc: 'Récolter 10 000 fruits au total.', stat: 'fruits', goal: 10000 },
    { id: 'jours_30', cat: 'assiduite', tier: 'or', icon: '🗓️', name: 'Un mois au verger', desc: 'Jouer 30 jours différents.', stat: 'days', goal: 30 },
    { id: 'vannier', cat: 'assiduite', tier: 'argent', icon: 'svg:basket', name: 'Vannier', desc: 'Finir des parties avec 25 Paniers en jeu au total (la Brouette compte).', stat: 'baskets', goal: 25 },
    { id: 'jours_7', cat: 'assiduite', tier: 'argent', icon: '📅', name: 'Fidèle au verger', desc: 'Jouer 7 jours différents.', stat: 'days', goal: 7, reward: [R('board', 'aurora', 'Aurore boréale')] },
    { id: 'sans_filet', cat: 'assiduite', tier: 'argent', icon: '🤸', name: 'Sans filet', desc: 'Finir les 9 cartes avec 45 fruits ou plus, sans l’aide de l’Écureuil.', reward: [R('accent', 'emeraude', 'Émeraude')] },
    { id: 'defi_releve', cat: 'assiduite', tier: 'argent', icon: '🔁', name: 'Défi relevé', desc: 'Rejouer les mêmes cartes et battre son propre score.' },

    { id: 'duo', cat: 'multi', tier: 'bronze', icon: '👥', name: 'En famille', desc: 'Terminer une partie à deux sur le même appareil.' },
    { id: 'distance', cat: 'multi', tier: 'bronze', icon: '🌍', name: 'Par-delà les haies', desc: 'Terminer une partie à distance.' },
    { id: 'revanche', cat: 'multi', tier: 'bronze', icon: '🤝', name: 'Revanche !', desc: 'Jouer une revanche à distance.' },
    { id: 'victoire_distance', cat: 'multi', tier: 'argent', icon: '🥇', name: 'Champion du verger', desc: 'Gagner une partie à distance.', reward: [R('board', 'royalvelvet', 'Velours royal')] },
    { id: 'imbattable', cat: 'multi', tier: 'or', icon: '🛡️', name: 'Imbattable', desc: 'Gagner 5 parties à distance d’affilée.', stat: 'onlineStreakBest', goal: 5 },
    { id: 'victoires_10', cat: 'multi', tier: 'or', icon: '🏅', name: 'Grand champion', desc: 'Gagner 10 parties à distance.', stat: 'onlineWins', goal: 10 },

    { id: 'impasse', cat: 'secrets', tier: 'bronze', icon: '🚧', name: 'Impasse', desc: 'Finir une partie bloquée : plus aucune carte ne peut être posée.', secret: true },
    { id: 'jardin_zen', cat: 'secrets', tier: 'argent', icon: '🧘', name: 'Jardin zen', desc: 'Poser les 9 cartes avec moins de 20 fruits.', secret: true, reward: [R('cards', 'frost', 'Givre')] },
    { id: 'oiseau_nuit', cat: 'secrets', tier: 'bronze', icon: '🦉', name: 'Oiseau de nuit', desc: 'Terminer une partie entre minuit et 5 h du matin.', secret: true, reward: [R('board', 'cosmos', 'Cosmos')] },
    { id: 'egalite', cat: 'secrets', tier: 'argent', icon: '⚖️', name: 'Ex aequo', desc: 'Finir une partie à deux à égalité parfaite.', secret: true },

    { id: 'score_100', cat: 'secrets', tier: 'or', icon: '💯', name: 'Centenaire', desc: 'Finir une partie avec 100 fruits ou plus.', score: 100, secret: true },
    { id: 'monochrome', cat: 'secrets', tier: 'or', icon: '🎨', name: 'Monochrome', desc: 'Qu’un seul fruit rapporte 40 fruits ou plus dans une partie.', secret: true },
    { id: 'coup_de_chance', cat: 'secrets', tier: 'argent', icon: '🍀', name: 'Coup de chance', desc: 'Former un Panier avec l’une de vos 3 premières cartes posées.', secret: true },
    { id: 'duo_choc', cat: 'secrets', tier: 'argent', icon: '🐿️', name: 'Duo de choc', desc: 'Dans une même partie, utiliser l’Écureuil et faire entrer la Brouette.', secret: true },
    { id: 'sur_le_fil', cat: 'secrets', tier: 'argent', icon: '🪡', name: 'Sur le fil', desc: 'Finir une partie avec Recettes pile sur l’objectif.', secret: true },
    { id: 'photo_finish', cat: 'secrets', tier: 'argent', icon: '📸', name: 'Photo-finish', desc: 'Gagner une partie à distance d’un seul fruit.', secret: true },
    { id: 'hesitant', cat: 'secrets', tier: 'bronze', icon: '🤔', name: 'Hésitant', desc: 'Tourner une carte 20 fois avant de la poser.', secret: true },
    { id: 'leve_tot', cat: 'secrets', tier: 'bronze', icon: '🌅', name: 'Lève-tôt', desc: 'Terminer une partie entre 5 h et 7 h du matin.', secret: true },

    { id: 'maitre', cat: 'legende', tier: 'platine', icon: '💎', name: 'Maître d’Ortie', desc: 'Réussir tous les autres achievements.', reward: [R('cards', 'diamond', 'Diamant'), R('accent', 'diamant', 'Diamant')] },
  ];
  const BY_ID = {};
  for (const a of LIST) BY_ID[a.id] = a;

  function newData() {
    return {
      v: 1,
      unlocked: {}, // id → date du déblocage (ms)
      seenAt: 0, // dernière ouverture de la liste (pour les « nouveaux »)
      stats: {
        games: 0, orchards: 0, fruits: 0, best: 0, recipes: 0, baskets: 0, days: 0, lastDay: '', duoGames: 0, onlineGames: 0, onlineWins: 0,
        recipeStreak: 0, recipeStreakBest: 0, onlineStreak: 0, onlineStreakBest: 0, recipeSet: [], bestBySeed: {},
      },
    };
  }

  // Données lues sur l'appareil : on complète ce qui manque, on ignore le reste.
  function normalize(raw) {
    const d = newData();
    if (!raw || typeof raw !== 'object') return d;
    if (raw.unlocked && typeof raw.unlocked === 'object') for (const [id, t] of Object.entries(raw.unlocked)) if (BY_ID[id]) d.unlocked[id] = Number(t) || 1;
    d.seenAt = Number(raw.seenAt) || 0;
    const s = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
    for (const k of Object.keys(d.stats)) {
      if (k === 'recipeSet') d.stats.recipeSet = Array.isArray(s.recipeSet) ? s.recipeSet.filter((id) => BONUS_RECIPES.includes(id)) : [];
      else if (k === 'bestBySeed') d.stats.bestBySeed = s.bestBySeed && typeof s.bestBySeed === 'object' ? s.bestBySeed : {};
      else if (k === 'lastDay') d.stats.lastDay = typeof s.lastDay === 'string' ? s.lastDay : '';
      else d.stats[k] = Math.max(0, Number(s[k]) || 0);
    }
    return d;
  }

  function progress(d, a) {
    if (!a.stat) return null;
    const cur = a.stat === 'recipeSet' ? d.stats.recipeSet.length : d.stats[a.stat] || 0;
    return { cur: Math.min(cur, a.goal), goal: a.goal };
  }

  // Débloque (une seule fois) ; le succès platine suit quand tous les autres sont là.
  function unlock(d, ids, now) {
    const out = [];
    const t = now || Date.now();
    for (const a of LIST) if (a.stat && !d.unlocked[a.id] && progress(d, a).cur >= a.goal) ids.push(a.id);
    for (const id of ids) if (BY_ID[id] && !d.unlocked[id]) { d.unlocked[id] = t; out.push(id); }
    if (!d.unlocked.maitre && LIST.every((a) => a.id === 'maitre' || d.unlocked[a.id])) { d.unlocked.maitre = t; out.push('maitre'); }
    return out;
  }

  const basketsOf = (st) => Object.values(st.board).filter((e) => e.die && (e.die.barrow || e.die.v === H.BASKET)).length;

  function onMove(d, m) {
    const ids = [];
    const evs = ((m.res && m.res.changes) || []).map((c) => c.event);
    if (evs.includes('basket')) ids.push('premier_panier');
    if (evs.includes('barrow')) ids.push('brouette');
    if (evs.includes('squirrel')) ids.push('ecureuil');
    if (m.res && m.res.gain >= 15) ids.push('coup_maitre');
    const dice = Object.values(m.state.board).filter((e) => e.die && !e.die.barrow);
    const sixes = dice.filter((e) => e.die.v === 6).length;
    if (sixes >= 3) ids.push('trois_six');
    if (sixes >= 4) ids.push('quatre_six');
    const baskets = basketsOf(m.state);
    if (baskets >= 3) ids.push('panier_garni');
    if (baskets >= 5) ids.push('cinq_paniers');
    if (evs.includes('basket') && (m.state.placed || []).length <= 4) ids.push('coup_de_chance'); // la 1re carte est posée d'office
    if (m.state.squirrelUsed && !m.state.barrowFree) ids.push('duo_choc');
    return unlock(d, ids, m.now);
  }

  /* Fin de partie.
   *   mode   : 'solo' | 'duo' | 'online'
   *   states : vergers joués sur cet appareil (les deux à deux sur le même appareil)
   *   result : 'win' | 'lose' | 'tie' | null (à distance : pour moi ; à deux : 'tie' ou null)
   *   first  : première fois que cette partie se termine (les compteurs ne
   *            comptent qu'une fois, même si la fin est revue après un rechargement)
   *   now, hour, day ('AAAA-MM-JJ')
   */
  function onGameEnd(d, g) {
    const s = d.stats;
    const ids = ['premier_verger'];
    let fruits = 0;
    for (const st of g.states) {
      const sc = H.score(st);
      const complete = st.endReason === 'complete';
      fruits += sc.total;
      s.best = Math.max(s.best, sc.total);
      if (complete) ids.push('verger_complet');
      for (const a of LIST) if (a.score && sc.total >= a.score) ids.push(a.id);
      if (sc.dice >= H.DICE_PER_TYPE * H.TYPES.length) ids.push('quinze_des');
      if (complete && !Object.values(st.board).some((e) => e.die && e.cell.k === 'clear')) ids.push('zero_pourri');
      if (complete && sc.total < 20) ids.push('jardin_zen');
      if (st.endReason === 'blocked') ids.push('impasse');
      if (complete && !st.squirrelUsed && sc.total >= 45) ids.push('sans_filet');
      const bonus = sc.recipes.filter((r) => !r.mult);
      const done = bonus.filter((r) => r.done);
      if (done.length) ids.push('premiere_recette');
      if (bonus.length === 2 && done.length === 2) ids.push('deux_etoiles');
      if (sc.target != null && sc.won) {
        ids.push('objectif');
        if (sc.target >= 80) ids.push('objectif_80');
        if (done.length === 2 && bonus.length === 2 && sc.total >= sc.target + 15) ids.push('grand_cru');
      }
      if (sc.target != null && sc.total === sc.target) ids.push('sur_le_fil');
      if (H.TYPES.some((t) => sc.scored[t] >= 40)) ids.push('monochrome');
      if (g.first) {
        if (sc.target != null) { // série d'objectifs atteints avec Recettes
          s.recipeStreak = sc.won ? s.recipeStreak + 1 : 0;
          s.recipeStreakBest = Math.max(s.recipeStreakBest, s.recipeStreak);
        }
        s.recipes += done.length;
        for (const r of done) if (!s.recipeSet.includes(r.id)) s.recipeSet.push(r.id);
        s.baskets += basketsOf(st);
        // Mêmes cartes rejouées en solo : a-t-on battu son meilleur score ?
        if (g.mode === 'solo') {
          const key = st.seed + '|' + (st.recipes || []).join(',');
          const prev = s.bestBySeed[key];
          if (prev != null && sc.total > prev) ids.push('defi_releve');
          if (prev == null || sc.total > prev) {
            delete s.bestBySeed[key];
            s.bestBySeed[key] = sc.total;
            const keys = Object.keys(s.bestBySeed);
            for (let i = 0; i < keys.length - 300; i++) delete s.bestBySeed[keys[i]];
          }
        }
      }
    }
    if (g.first) {
      s.games++;
      s.orchards += g.states.length;
      s.fruits += fruits;
      if (g.day && s.lastDay !== g.day) { s.days++; s.lastDay = g.day; }
      if (g.mode === 'duo') s.duoGames++;
      if (g.mode === 'online') {
        s.onlineGames++;
        if (g.result === 'win') s.onlineWins++;
        s.onlineStreak = g.result === 'win' ? s.onlineStreak + 1 : 0;
        s.onlineStreakBest = Math.max(s.onlineStreakBest, s.onlineStreak);
      }
    }
    if (g.mode === 'duo') ids.push('duo');
    if (g.mode === 'online') ids.push('distance');
    if (g.mode === 'online' && g.result === 'win') ids.push('victoire_distance');
    if (g.mode === 'online' && g.result === 'win' && g.margin === 1) ids.push('photo_finish');
    if (g.mode !== 'solo' && g.result === 'tie') ids.push('egalite');
    if (g.hour != null && g.hour < 5) ids.push('oiseau_nuit');
    if (g.hour === 5 || g.hour === 6) ids.push('leve_tot');
    return unlock(d, ids, g.now);
  }

  const onEvent = (d, id, now) => unlock(d, [id], now);

  // Récompenses : « kind:id » → achievement qui la donne
  const REWARD_OWNER = {};
  const REWARDS = [];
  for (const a of LIST) for (const r of a.reward || []) { REWARD_OWNER[r.kind + ':' + r.id] = a.id; REWARDS.push(Object.assign({ by: a.id }, r)); }
  const rewardOwner = (kind, id) => REWARD_OWNER[kind + ':' + id] || null;
  const rewardLocked = (d, kind, id) => { const o = rewardOwner(kind, id); return !!o && !d.unlocked[o]; };

  function summary(d) {
    let pts = 0, max = 0, count = 0;
    const tiers = { bronze: 0, argent: 0, or: 0, platine: 0 };
    for (const a of LIST) {
      max += TIERS[a.tier].pts;
      if (d.unlocked[a.id]) { pts += TIERS[a.tier].pts; count++; tiers[a.tier]++; }
    }
    const rewards = REWARDS.filter((r) => d.unlocked[r.by]).length;
    return { count, total: LIST.length, pts, max, tiers, rewards, rewardsTotal: REWARDS.length, fresh: LIST.filter((a) => d.unlocked[a.id] > d.seenAt).length };
  }

  return { TIERS, CATEGORIES, LIST, BY_ID, BONUS_RECIPES, REWARDS, newData, normalize, progress, onMove, onGameEnd, onEvent, summary, rewardOwner, rewardLocked };
});
