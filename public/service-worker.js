const CACHE_NAME = 'efootball-v3';

const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// ── Install: pre-cache statics + measure update size ──────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // Measure total size of assets to download (for the update prompt)
      let totalBytes = 0;
      let loadedBytes = 0;

      const measureAndCache = async () => {
        const cache = await caches.open(CACHE_NAME);

        // Get all URLs currently cached (old version)
        const oldCache = await caches.keys().then(keys =>
          keys.filter(k => k !== CACHE_NAME)
        );
        const oldUrls = new Set();
        for (const name of oldCache) {
          const c = await caches.open(name);
          const reqs = await c.keys();
          reqs.forEach(r => oldUrls.add(r.url));
        }

        // Fetch static assets and track bytes
        const responses = await Promise.all(
          STATIC_ASSETS.map(url => fetch(url))
        );

        // Calculate total size from Content-Length headers
        for (const res of responses) {
          const len = parseInt(res.headers.get('content-length') || '0');
          totalBytes += len;
        }

        // Notify all clients about total size before we start caching
        const clients = await self.clients.matchAll();
        clients.forEach(client =>
          client.postMessage({ type: 'UPDATE_SIZE', bytes: totalBytes })
        );

        // Cache each asset while reporting progress
        for (let i = 0; i < responses.length; i++) {
          const res = responses[i];
          const clone = res.clone();
          const len = parseInt(res.headers.get('content-length') || '0');

          // Stream body to count actual bytes
          const reader = res.body?.getReader();
          if (reader) {
            const chunks = [];
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
              loadedBytes += value.byteLength;
              const pct = totalBytes > 0
                ? Math.round((loadedBytes / totalBytes) * 100)
                : Math.round(((i + 1) / STATIC_ASSETS.length) * 100);
              const clients = await self.clients.matchAll();
              clients.forEach(c =>
                c.postMessage({ type: 'UPDATE_PROGRESS', percent: pct, loaded: loadedBytes, total: totalBytes })
              );
            }
            const blob = new Blob(chunks);
            const finalRes = new Response(blob, { headers: res.headers, status: res.status });
            await cache.put(STATIC_ASSETS[i], finalRes);
          } else {
            await cache.put(STATIC_ASSETS[i], clone);
            loadedBytes += len;
            const pct = totalBytes > 0
              ? Math.round((loadedBytes / totalBytes) * 100)
              : Math.round(((i + 1) / STATIC_ASSETS.length) * 100);
            const clients = await self.clients.matchAll();
            clients.forEach(c =>
              c.postMessage({ type: 'UPDATE_PROGRESS', percent: pct, loaded: loadedBytes, total: totalBytes })
            );
          }
        }

        // Signal complete
        const allClients = await self.clients.matchAll();
        allClients.forEach(c =>
          c.postMessage({ type: 'UPDATE_COMPLETE' })
        );
      };

      await measureAndCache();
      // Do NOT call skipWaiting here — wait for user confirmation
    })()
  );
});

// ── Message: user approved update ─────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Activate: delete old caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('firebaseio') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('imgbb') ||
    url.hostname.includes('ibb.co') ||
    url.hostname.includes('groq')
  ) return;

  // Images — cache-first
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request).then((response) => {
          if (response?.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
      )
    );
    return;
  }

  // HTML/JS/CSS — network-first
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response?.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) =>
          cached || caches.match('/index.html')
        )
      )
  );
});
