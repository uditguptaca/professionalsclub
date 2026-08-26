/**
 * Service worker for the installable web app.
 *
 * Deliberately minimal: every portal page is personalised and force-dynamic,
 * so caching HTML would show one member another member's cached shell in the
 * worst case and stale data in the best. The worker therefore caches exactly
 * one thing - a tiny offline fallback - and passes everything else straight
 * through to the network. Next already fingerprints /_next/static assets with
 * immutable cache headers, so the browser's HTTP cache handles those better
 * than a SW ever would.
 *
 * The Capacitor apps never register this file (see RegisterSW): the shells
 * have their own offline page and their own lifecycle.
 */
const OFFLINE_CACHE = 'pc-offline-v1';

const OFFLINE_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Offline - Professionals Club</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center;
         background:#FFF7ED; color:#0c0c0e;
         font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
  main { text-align:center; padding:2rem; }
  svg  { width:56px; height:56px; }
  h1   { font-size:1.35rem; margin:.9rem 0 .3rem; }
  p    { color:#78716c; margin:0 0 1.2rem; }
  button { min-height:48px; padding:.7rem 1.6rem; border:0; border-radius:12px;
           background:#C2410C; color:#fff; font:inherit; font-weight:700; }
</style></head><body><main>
<svg viewBox="0 0 512 512" aria-hidden="true"><path fill="#E85D04" d="M256 24l-30 56c-3 6-9 5-16 1l-38-20 21 100c4 20-9 20-17 11l-59-63-15 41c-2 4-6 4-13 3l-73-15 20 68c4 15 7 21-5 25l-31 15 137 111c6 5 8 13 5 21l-12 39 132-17c4 0 7 3 6 7l-6 100h34l-6-100c-1-4 2-7 6-7l132 17-12-39c-3-8-1-16 5-21l137-111-31-15c-12-4-9-10-5-25l20-68-73 15c-7 1-11 1-13-3l-15-41-59 63c-8 9-21 9-17-11l21-100-38 20c-7 4-13 5-16-1l-30-56z"/></svg>
<h1>You're offline</h1>
<p>Professionals Club needs a connection. We'll be right here.</p>
<button onclick="location.reload()">Try again</button>
</main></body></html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) =>
      cache.put('/__offline', new Response(OFFLINE_HTML, { headers: { 'content-type': 'text/html; charset=utf-8' } }))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only page navigations get the offline fallback; every other request
  // (actions, assets, API) behaves exactly as if no worker existed.
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match('/__offline'))
  );
});
