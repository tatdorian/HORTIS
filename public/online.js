/* Ortie — liaison avec le serveur pour jouer à distance (voir rooms.js).
 *
 *   OrtieOnline.create(name, recipes)       → { code, token, seat, room }
 *   OrtieOnline.join(code, name, token?)    → { token, seat, room }
 *   OrtieOnline.connect(code, token, { room, status, gone })   // flux en direct
 *   OrtieOnline.pusher(code, token, onReject)                   // envoi des coups
 *   OrtieOnline.rematch(code, token, round, same) / leave(code, token)
 */
(function (root) {
  'use strict';
  const api = (p) => new URL('api/' + p, document.baseURI).toString();

  async function call(method, path, body) {
    let res;
    try {
      res = await fetch(api(path), {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      });
    } catch (e) {
      const err = new Error('Pas de connexion au serveur. Vérifiez votre connexion internet.');
      err.status = 0;
      throw err;
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* réponse vide */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || 'Le serveur ne répond pas (' + res.status + ').');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  const create = (name, recipes) => call('POST', 'rooms', { name, recipes });
  const join = (code, name, token) => call('POST', 'rooms/' + code + '/join', { name, t: token });
  const rematch = (code, token, round, same) => call('POST', 'rooms/' + code + '/rematch', { t: token, round, same: !!same });
  const leave = (code, token) => call('POST', 'rooms/' + code + '/leave', { t: token }).catch(() => {});

  // Flux en direct ; se reconnecte tout seul. `gone` : le salon n'existe plus.
  function connect(code, token, on) {
    let es = null;
    let closed = false;
    let timer = 0;
    const url = api('rooms/' + code + '/events?t=' + encodeURIComponent(token));
    function open() {
      if (closed) return;
      es = new EventSource(url);
      es.addEventListener('room', (e) => {
        let snap = null;
        try { snap = JSON.parse(e.data); } catch (err) { return; }
        on.room(snap);
      });
      es.onopen = () => { if (on.status) on.status(true); };
      es.onerror = () => {
        if (closed) return;
        if (on.status) on.status(false);
        if (es.readyState !== EventSource.CLOSED) return; // le navigateur réessaie de lui-même
        // Refus définitif : salon disparu (serveur redémarré…) ou simple coupure ?
        es.close();
        call('GET', 'rooms/' + code + '?t=' + encodeURIComponent(token)).then(
          () => { timer = setTimeout(open, 2000); },
          (err) => {
            if (err.status === 404 || err.status === 403) { closed = true; if (on.gone) on.gone(err.message); }
            else timer = setTimeout(open, 3000);
          }
        );
      };
    }
    open();
    return {
      close() { closed = true; clearTimeout(timer); if (es) es.close(); },
    };
  }

  // Envoie la liste de mes coups ; en cas de coupure, réessaie avec la plus récente.
  function pusher(code, token, onReject) {
    let want = null;
    let busy = false;
    let timer = 0;
    let stopped = false;
    async function flush() {
      if (busy || !want || stopped) return;
      busy = true;
      const body = want;
      try {
        await call('POST', 'rooms/' + code + '/moves', { t: token, round: body.round, moves: body.moves });
        if (want === body) want = null;
      } catch (err) {
        if (err.status >= 400 && err.status < 500) { // refusé : inutile d'insister
          if (want === body) want = null;
          if (onReject) onReject(err);
        } else {
          clearTimeout(timer);
          timer = setTimeout(flush, 3000);
        }
      }
      busy = false;
      if (want && want !== body) flush();
    }
    return {
      send(round, moves) { want = { round, moves }; flush(); },
      retry() { clearTimeout(timer); flush(); },
      pending: () => !!want,
      stop() { stopped = true; clearTimeout(timer); want = null; },
    };
  }

  root.OrtieOnline = { create, join, connect, pusher, rematch, leave };
})(typeof self !== 'undefined' ? self : this);
