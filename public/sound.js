/* Ortie — son : petite musique de verger et effets sonores, entièrement
 * synthétisés avec Web Audio (aucun fichier audio, fonctionne hors connexion).
 *
 *   OrtieSound.configure({ music, sfx, musicVol, sfxVol })   // réglages (0..1)
 *   OrtieSound.play('place' | 'select' | 'rotate' | 'bad' | 'undo' | 'hint'
 *                   | 'basket' | 'barrow' | 'squirrel' | 'turn' | 'start'
 *                   | 'recipe' | 'achievement' | 'win' | 'end' | 'ui' | 'test')
 *   OrtieSound.dice([valeurs])   // un petit son par dé posé ou augmenté
 *
 * Les navigateurs n'autorisent le son qu'après un premier geste du joueur :
 * le module se « déverrouille » tout seul au premier toucher / clic / touche.
 */
(function (root) {
  'use strict';
  const AC = root.AudioContext || root.webkitAudioContext;
  const st = { music: true, sfx: true, musicVol: 0.4, sfxVol: 0.7 };
  let ctx = null;
  let master, musicBus, musicFader, sfxBus, reverbIn, noiseBuf;
  let unlocked = false;

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function build() {
    if (ctx || !AC) return ctx;
    try { ctx = new AC(); } catch (e) { return null; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);

    // Petite réverbération (réponse impulsionnelle générée) pour l'ambiance du verger
    const conv = ctx.createConvolver();
    conv.buffer = impulse(2.4, 2.8);
    const wet = ctx.createGain(); wet.gain.value = 0.28;
    conv.connect(wet); wet.connect(master);
    reverbIn = conv;

    musicBus = ctx.createGain(); musicBus.connect(master);
    musicFader = ctx.createGain(); musicFader.gain.value = 0; musicFader.connect(musicBus);
    const mSend = ctx.createGain(); mSend.gain.value = 0.6; musicFader.connect(mSend); mSend.connect(reverbIn);

    sfxBus = ctx.createGain(); sfxBus.connect(master);
    const sSend = ctx.createGain(); sSend.gain.value = 0.25; sfxBus.connect(sSend); sSend.connect(reverbIn);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applyVolumes(true);
    return ctx;
  }

  function impulse(sec, decay) {
    const len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  // Courbes de volume « à l'oreille »
  const musicGain = () => (st.music ? 1.6 * Math.pow(st.musicVol, 1.6) : 0);
  const sfxGain = () => (st.sfx ? 0.95 * Math.pow(st.sfxVol, 1.5) : 0);

  function applyVolumes(now) {
    if (!ctx) return;
    const t = ctx.currentTime;
    if (now) { musicBus.gain.value = musicGain(); sfxBus.gain.value = sfxGain(); return; }
    musicBus.gain.setTargetAtTime(musicGain(), t, 0.08);
    sfxBus.gain.setTargetAtTime(sfxGain(), t, 0.05);
  }

  // ---------------------------------------------------------------- briques sonores
  function env(g, t, peak, attack, dur) {
    // Valeur de départ à 0 : sinon le gain vaut 1 (par défaut) pendant le tout
    // premier échantillon, ce qui produisait un petit « clic » sur les bruits.
    g.gain.value = 0;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function osc(type, f, t, dur, peak, attack, bus, opts) {
    opts = opts || {};
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + (opts.glide || dur));
    if (opts.detune) o.detune.value = opts.detune;
    const g = ctx.createGain();
    env(g, t, peak, attack, dur);
    let out = g;
    if (opts.lp) { const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = opts.lp; g.connect(f2); out = f2; }
    o.connect(g); out.connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  // Lame de bois (marimba / kalimba) : fondamentale + partiel aigu bref
  function pluck(f, t, peak, dec, bus) {
    osc('sine', f, t, dec, peak, 0.004, bus);
    osc('sine', f * 3.94, t, dec * 0.22, peak * 0.32, 0.002, bus);
    osc('triangle', f * 2, t, dec * 0.4, peak * 0.12, 0.003, bus);
  }

  // Clochette : partiels inharmoniques
  function bell(f, t, peak, dec, bus) {
    osc('sine', f, t, dec, peak, 0.003, bus);
    osc('sine', f * 2.76, t, dec * 0.55, peak * 0.42, 0.002, bus);
    osc('sine', f * 5.4, t, dec * 0.3, peak * 0.2, 0.002, bus);
  }

  function noise(t, dur, peak, bus, filter) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = filter.type || 'bandpass';
    f.frequency.setValueAtTime(filter.freq || 1000, t);
    if (filter.to) f.frequency.exponentialRampToValueAtTime(filter.to, t + dur);
    f.Q.value = filter.q || 1;
    const g = ctx.createGain();
    env(g, t, peak, filter.attack || 0.003, dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t, Math.random() * 1.5, dur + 0.05);
    return g;
  }

  // ---------------------------------------------------------------- effets
  const PENTA = [72, 74, 76, 79, 81, 84]; // do ré mi sol la do (aigu)

  function sfx(name, opt) {
    if (!st.sfx || !ready()) return;
    const B = sfxBus;
    const t = ctx.currentTime + 0.012;
    switch (name) {
      case 'select': // carte prise en main
        pluck(mtof(84), t, 0.16, 0.18, B);
        noise(t, 0.03, 0.05, B, { type: 'highpass', freq: 4000 });
        break;
      case 'ui':
        pluck(mtof(79), t, 0.08, 0.12, B);
        break;
      case 'rotate': // petit froissement de carte
        noise(t, 0.13, 0.12, B, { type: 'bandpass', freq: 900, to: 3200, q: 1.4 });
        pluck(mtof(76), t + 0.03, 0.06, 0.12, B);
        break;
      case 'place': // carte posée sur la table : « toc » de bois + papier
        osc('sine', 170, t, 0.2, 0.55, 0.003, B, { to: 68, glide: 0.14 });
        osc('triangle', 340, t, 0.06, 0.12, 0.002, B, { lp: 1200 });
        noise(t, 0.07, 0.22, B, { type: 'lowpass', freq: 1800 });
        break;
      case 'bad': // pose impossible
        osc('triangle', mtof(57), t, 0.12, 0.13, 0.005, B, { lp: 1400 });
        osc('triangle', mtof(53), t + 0.11, 0.18, 0.13, 0.005, B, { lp: 1200 });
        break;
      case 'undo':
        osc('sine', 900, t, 0.18, 0.09, 0.005, B, { to: 380 });
        noise(t, 0.14, 0.06, B, { type: 'bandpass', freq: 3000, to: 800, q: 1.2 });
        break;
      case 'hint': // étincelles
        [0, 2, 4].forEach((k, i) => bell(mtof(PENTA[k] + 12), t + i * 0.07, 0.06, 0.5, B));
        break;
      case 'basket': // Panier : arpège brillant
        [72, 76, 79, 84].forEach((m, i) => bell(mtof(m + 12), t + i * 0.075, 0.09, 0.9, B));
        noise(t + 0.25, 0.25, 0.04, B, { type: 'highpass', freq: 7000 });
        break;
      case 'barrow': { // Brouette : roue qui roule + fanfare
        const wheel = noise(t, 0.55, 0.16, B, { type: 'lowpass', freq: 520, attack: 0.05 });
        const lfo = ctx.createOscillator(); lfo.frequency.value = 17;
        const depth = ctx.createGain(); depth.gain.value = 0.08;
        lfo.connect(depth); depth.connect(wheel.gain); lfo.start(t); lfo.stop(t + 0.6);
        [60, 64, 67, 72, 76, 79].forEach((m, i) => pluck(mtof(m + 12), t + 0.35 + i * 0.07, 0.13, 0.5, B));
        bell(mtof(96), t + 0.8, 0.08, 1.4, B);
        bell(mtof(91), t + 0.8, 0.06, 1.4, B);
        break;
      }
      case 'recipe': // recette réussie : petite cloche montante
        [76, 79, 84].forEach((m, i) => pluck(mtof(m), t + i * 0.08, 0.11, 0.4, B));
        bell(mtof(88), t + 0.26, 0.07, 1.1, B);
        break;
      case 'achievement': // succès débloqué : petite fanfare de clochettes
        [72, 79, 84, 88].forEach((m, i) => bell(mtof(m), t + i * 0.09, 0.08, 0.9, B));
        [76, 84].forEach((m) => pluck(mtof(m), t + 0.42, 0.1, 0.8, B));
        noise(t + 0.4, 0.35, 0.03, B, { type: 'highpass', freq: 7500 });
        break;
      case 'squirrel': // petits cris d'écureuil
        [0, 0.1, 0.2].forEach((d) => osc('sine', 1700, t + d, 0.07, 0.07, 0.004, B, { to: 3400, glide: 0.05 }));
        break;
      case 'turn': // à l'autre joueur : ding-dong
        bell(mtof(76), t, 0.12, 0.9, B);
        bell(mtof(72), t + 0.22, 0.12, 1.2, B);
        break;
      case 'start':
        [67, 72, 76].forEach((m, i) => pluck(mtof(m), t + i * 0.09, 0.12, 0.45, B));
        break;
      case 'win': // victoire / objectif atteint
        [72, 76, 79, 84, 79, 84].forEach((m, i) => pluck(mtof(m), t + i * 0.11, 0.15, 0.6, B));
        [72, 76, 79, 84].forEach((m) => bell(mtof(m), t + 0.75, 0.06, 2.2, B));
        break;
      case 'end': // fin de partie
        [79, 76, 72].forEach((m, i) => bell(mtof(m), t + i * 0.16, 0.1, 1.4, B));
        break;
      case 'test':
        pluck(mtof(76), t, 0.16, 0.35, B);
        pluck(mtof(79), t + 0.1, 0.12, 0.35, B);
        break;
      default:
        break;
    }
    if (opt && opt.duck) duck(opt.duck);
  }

  // Dés : un « clac » + une note qui monte avec la valeur
  function dice(values) {
    if (!st.sfx || !ready() || !values || !values.length) return;
    const B = sfxBus;
    const t0 = ctx.currentTime + 0.11;
    values.slice(0, 6).forEach((v, i) => {
      const t = t0 + i * 0.075;
      noise(t, 0.035, 0.14, B, { type: 'highpass', freq: 2600 });
      const m = v >= 15 ? 96 : v >= 10 ? 91 : PENTA[Math.min(5, Math.max(0, v - 1))];
      pluck(mtof(m), t + 0.01, 0.11, 0.35, B);
    });
  }

  // ---------------------------------------------------------------- musique
  // Douce boucle générative en do majeur pentatonique, ~84 bpm.
  const BPM = 84;
  const EIGHTH = 60 / BPM / 2;
  const PROGS = [
    [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]], // Do – Lam – Fa – Sol
    [[41, 45, 48], [43, 47, 50], [40, 43, 47], [45, 48, 52]], // Fa – Sol – Mim – Lam
    [[48, 52, 55], [41, 45, 48], [45, 48, 52], [43, 47, 50]], // Do – Fa – Lam – Sol
    [[45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50]], // Lam – Fa – Do – Sol
  ];
  const SCALE = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81];
  const mus = { on: false, timer: 0, next: 0, step: 0, prog: PROGS[0], idx: 4, density: 1 };
  // Dosage de chaque instrument (sert aussi aux tests pour les écouter séparément)
  const MIX = { pad: 1, bass: 1, mel: 1, bell: 1, shaker: 1 };

  function chordAt(step) { return mus.prog[Math.floor(step / 16) % 4]; }

  function schedule(step, t) {
    const B = musicFader;
    const chord = chordAt(step);
    const inChord = step % 16;
    if (inChord === 0) {
      // nappe douce
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(B);
      const dur = EIGHTH * 16 + 0.9;
      chord.forEach((m) => {
        osc('triangle', mtof(m + 12), t, dur, 0.035 * MIX.pad, 1.1, lp, { detune: -5 });
        osc('sine', mtof(m + 12), t, dur, 0.03 * MIX.pad, 1.2, lp, { detune: 6 });
      });
      // basse
      osc('sine', mtof(chord[0] - 12), t, EIGHTH * 7, 0.16 * MIX.bass, 0.02, B);
      mus.density = 0.6 + Math.random() * 0.55;
      if (step % 64 === 0 && step > 0) mus.prog = PROGS[Math.floor(Math.random() * PROGS.length)];
    }
    if (inChord === 8) osc('sine', mtof(chord[0] - 12), t, EIGHTH * 6, 0.11 * MIX.bass, 0.02, B);

    // mélodie : petite marche aléatoire, notes de l'accord sur les temps forts
    const p = (step % 8 === 0 ? 0.85 : step % 4 === 0 ? 0.55 : step % 2 === 0 ? 0.32 : 0.16) * mus.density;
    if (Math.random() < p) {
      let idx = mus.idx + Math.round((Math.random() - 0.5) * 4);
      idx = Math.max(0, Math.min(SCALE.length - 1, idx));
      if (step % 8 === 0) {
        // se rapprocher d'une note de l'accord
        const pcs = chord.map((m) => m % 12);
        for (let k = 0; k < 3 && !pcs.includes(SCALE[idx] % 12); k++) idx = Math.max(0, Math.min(SCALE.length - 1, idx + (Math.random() < 0.5 ? -1 : 1)));
      }
      mus.idx = idx;
      const swing = step % 2 ? EIGHTH * 0.12 : 0;
      pluck(mtof(SCALE[idx]), t + swing, 0.075 * MIX.mel, 0.9, B);
      if (Math.random() < 0.08) bell(mtof(SCALE[idx] + 12), t + swing + EIGHTH, 0.025 * MIX.bell, 1.2, B);
    }
    // léger « shaker » (feuillage)
    if (step % 2 === 1 && Math.random() < 0.55) noise(t, 0.05, 0.012 * MIX.shaker, B, { type: 'highpass', freq: 6500 });
  }

  function tick() {
    if (!mus.on || !ctx || ctx.state !== 'running') return;
    if (mus.next < ctx.currentTime) mus.next = ctx.currentTime + 0.05;
    while (mus.next < ctx.currentTime + 0.3) {
      schedule(mus.step, mus.next);
      mus.step++;
      mus.next += EIGHTH;
    }
  }

  function startMusic() {
    if (!st.music || !ready() || mus.on) return;
    mus.on = true;
    mus.step = 0;
    mus.next = ctx.currentTime + 0.1;
    mus.prog = PROGS[Math.floor(Math.random() * PROGS.length)];
    const t = ctx.currentTime;
    musicFader.gain.cancelScheduledValues(t);
    musicFader.gain.setValueAtTime(Math.max(0.0001, musicFader.gain.value), t);
    musicFader.gain.linearRampToValueAtTime(1, t + 2.5);
    clearInterval(mus.timer);
    mus.timer = setInterval(tick, 60);
    tick();
  }

  function stopMusic() {
    if (!mus.on) return;
    mus.on = false;
    clearInterval(mus.timer);
    if (!ctx) return;
    const t = ctx.currentTime;
    musicFader.gain.cancelScheduledValues(t);
    musicFader.gain.setValueAtTime(musicFader.gain.value, t);
    musicFader.gain.linearRampToValueAtTime(0, t + 0.8);
  }

  // Baisse la musique le temps d'une petite fanfare
  function duck(sec) {
    if (!ctx || !mus.on) return;
    const t = ctx.currentTime;
    musicFader.gain.cancelScheduledValues(t);
    musicFader.gain.setValueAtTime(musicFader.gain.value, t);
    musicFader.gain.linearRampToValueAtTime(0.25, t + 0.15);
    musicFader.gain.setValueAtTime(0.25, t + sec);
    musicFader.gain.linearRampToValueAtTime(1, t + sec + 1.5);
  }

  // ---------------------------------------------------------------- déverrouillage
  function ready() { return !!ctx && unlocked && ctx.state === 'running'; }

  function unlock() {
    if (!build()) return;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    if (!unlocked) {
      // iOS : jouer un son vide pendant le geste pour ouvrir la sortie audio
      try { const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) { /* ignore */ }
      unlocked = true;
    }
    const go = () => { if (st.music && !document.hidden) startMusic(); };
    if (ctx.state === 'running') go(); else ctx.resume().then(go, () => {});
  }
  ['pointerdown', 'touchend', 'keydown', 'click'].forEach((ev) => document.addEventListener(ev, unlock, { capture: true, passive: true }));

  // Musique en pause quand l'appli passe en arrière-plan
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { if (ctx.state === 'running') ctx.suspend().catch(() => {}); }
    else if (unlocked) ctx.resume().then(() => { mus.next = ctx.currentTime + 0.1; if (st.music) startMusic(); }, () => {});
  });

  root.OrtieSound = {
    configure(o) {
      Object.assign(st, o || {});
      st.musicVol = Math.max(0, Math.min(1, Number(st.musicVol)));
      st.sfxVol = Math.max(0, Math.min(1, Number(st.sfxVol)));
      if (ctx) applyVolumes();
      if (!st.music) stopMusic(); else if (ready()) startMusic();
    },
    play: sfx,
    dice,
    get settings() { return Object.assign({}, st); },
    get playing() { return mus.on; },
    _mix: MIX,
  };
})(typeof self !== 'undefined' ? self : this);
