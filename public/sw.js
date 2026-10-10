/* Ortie — service worker : fonctionne hors connexion une fois installé.
 *
 * VERSION doit être identique au « ?v= » des fichiers dans index.html et à
 * APP_VERSION dans app.js (un test le vérifie). Ainsi, une page neuve charge
 * toujours le style et le code de sa propre version, jamais un ancien fichier
 * resté en cache.
 */
const VERSION = '1.18';
const CACHE = 'ortie-' + VERSION;
const ASSETS = [
  './',
  'index.html',
  'style.css?v=' + VERSION,
  'core.js?v=' + VERSION,
  'sound.js?v=' + VERSION,
  'online.js?v=' + VERSION,
  'app.js?v=' + VERSION,
  'install.js?v=' + VERSION,
  'manifest.webmanifest',
  'favicon.svg',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // cache: 'reload' : on télécharge vraiment, sans passer par le cache HTTP
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fromNetwork(req, init) {
  return fetch(req, init).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Polices Google : cache d'abord (elles ne changent pas).
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') c.put(req, res.clone());
        return res;
      })))
    );
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/')) return; // parties à distance : toujours en direct, jamais en cache

  // Page : toujours la plus récente (sans cache HTTP), sinon la copie hors connexion.
  if (req.mode === 'navigate') {
    event.respondWith(
      fromNetwork(req, { cache: 'no-store' }).catch(() =>
        caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))
      )
    );
    return;
  }

  // Fichiers versionnés (?v=…) : leur contenu ne change jamais → cache d'abord.
  if (url.searchParams.has('v')) {
    event.respondWith(caches.match(req).then((hit) => hit || fromNetwork(req)));
    return;
  }

  // Autres fichiers (icônes, manifeste…) : réseau d'abord, cache si hors connexion.
  event.respondWith(
    fromNetwork(req, { cache: 'no-cache' }).catch(() =>
      caches.match(req).then((hit) => hit || Response.error())
    )
  );
});
