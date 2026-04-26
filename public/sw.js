/**
 * NetOku service worker — offline cache for static assets + navigation fallback.
 *
 * Strategy:
 *  - Navigation requests: network-first, fall back to cached index.html when offline.
 *  - /assets/* (hashed by Vite, immutable): cache-first.
 *  - Same-origin GET (icons, manifest, og-image): stale-while-revalidate.
 *  - Everything else (Supabase, Sentry, PostHog, Stripe, cross-origin): pass through.
 *
 * Bump CACHE_VERSION to invalidate old caches on deploy.
 */

const CACHE_VERSION = 'netoku-v1';
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const NAV_FALLBACK = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      // Warm the navigation fallback so offline boot works.
      try {
        await cache.add(NAV_FALLBACK);
      } catch {
        // Non-fatal: cache on first navigation instead.
      }
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isAsset(pathname) {
  return pathname.startsWith('/assets/');
}

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const hit = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit ?? fetchPromise;
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(NAV_FALLBACK, res.clone());
    return res;
  } catch {
    const fallback = await cache.match(NAV_FALLBACK);
    if (fallback) return fallback;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return; // let browser handle cross-origin

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Same-origin static files (manifest, icons, og-image, favicon)
  if (/\.(?:png|jpg|jpeg|svg|webp|ico|webmanifest|woff2?)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  // default: pass through
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
