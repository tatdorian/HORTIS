/* Ortie — installation de l'application (PWA) sur iOS, Android et ordinateur. */
(function () {
  'use strict';
  const btn = document.getElementById('btn-install');
  const dlg = document.getElementById('dlg-install');
  const body = document.getElementById('install-body');

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }

  const standalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches || window.navigator.standalone === true;
  if (standalone || !btn) return; // déjà installée : pas de bouton

  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios|edg|android/i.test(ua);
  const isFirefox = /firefox|fxios/i.test(ua);
  let deferred = null;

  btn.hidden = false;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    btn.hidden = true;
    if (dlg.open) dlg.close();
  });

  const shareIcon = '<svg class="ios-share" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';

  function steps() {
    if (isIOS) {
      return [
        isSafari ? 'Vous êtes dans Safari : parfait.' : 'Ouvrez cette page dans <b>Safari</b> (ou utilisez le bouton Partager de votre navigateur).',
        `Touchez le bouton <b>Partager</b> ${shareIcon} en bas (ou en haut sur iPad).`,
        'Faites défiler puis choisissez <b>« Sur l’écran d’accueil »</b>.',
        'Touchez <b>« Ajouter »</b> : l’icône Ortie apparaît sur votre écran d’accueil.',
      ];
    }
    if (isAndroid) {
      return [
        'Ouvrez le menu <b>⋮</b> de votre navigateur (Chrome, Edge, Samsung Internet…).',
        'Touchez <b>« Installer l’application »</b> ou <b>« Ajouter à l’écran d’accueil »</b>.',
        'Confirmez : Ortie s’ouvre ensuite comme une vraie application.',
      ];
    }
    if (isSafari) {
      return [
        'Dans Safari, ouvrez le menu <b>Fichier</b>.',
        'Choisissez <b>« Ajouter au Dock… »</b> puis <b>« Ajouter »</b>.',
      ];
    }
    if (isFirefox) {
      return [
        'Firefox sur ordinateur ne sait pas installer les applications web.',
        'Ouvrez cette page dans <b>Chrome</b> ou <b>Edge</b>, puis cliquez sur le bouton <b>Télécharger</b>.',
      ];
    }
    return [
      'Cliquez sur l’icône d’installation <b>⊕</b> à droite de la barre d’adresse,',
      'ou ouvrez le menu <b>⋮</b> puis <b>« Installer Ortie »</b> (Chrome) / <b>« Applications → Installer »</b> (Edge).',
      'Ortie s’ouvre ensuite dans sa propre fenêtre, depuis le menu Démarrer ou le Launchpad.',
    ];
  }

  function openGuide() {
    let h = '<ol class="install-steps">' + steps().map((s) => `<li><span>${s}</span></li>`).join('') + '</ol>';
    h += '<p class="small-note">Une fois installée, Ortie se lance depuis votre écran d’accueil, en plein écran, et fonctionne même sans connexion.</p>';
    if (!window.isSecureContext) h += '<p class="note">L’installation demande une adresse sécurisée (https). Ouvrez le jeu depuis son adresse https.</p>';
    body.innerHTML = h;
    dlg.showModal();
  }

  btn.addEventListener('click', async () => {
    if (deferred) {
      const ev = deferred;
      deferred = null;
      ev.prompt();
      try {
        const choice = await ev.userChoice;
        if (choice && choice.outcome === 'accepted') btn.hidden = true;
      } catch (e) { /* ignore */ }
      return;
    }
    openGuide();
  });
})();
