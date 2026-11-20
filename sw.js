/**
 * Koreys Salatlari Tannarx Kalkulyatori - Service Worker (sw.js)
 * Offline rejim va PWA keshini boshqarish
 */

const CACHE_NAME = 'salat-calc-pwa-v3.2-octane-3d';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './app.js',
  './data.js',
  './style.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png',
  './icons/logo-round.png',
  './icons/app-logo-master.png'
];

// 1. O'rnatish (Install)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// 2. Faollashtirish va eski keshni tozalash (Activate)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. So'rovlarni tutish (Fetch - Network-First for HTML, Stale-While-Revalidate for Assets)
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Faqat HTTP/HTTPS va GET so'rovlarni keshlaymiz
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) return;

  // HTML sahifa yuklashda (Navigation) -> Network-First (eng yangi versiyani olish, oflaynda esa keshga qaytish)
  const isHtmlRequest = request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'));
  if (isHtmlRequest) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match('./index.html', { ignoreSearch: true }))
    );
    return;
  }

  // Statik fayllar (rasm, css, js) -> Stale-While-Revalidate
  event.respondWith(
    caches.match(request, { ignoreSearch: false }).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        // Oflayn holatda xatolik e'tiborga olinmaydi
      });

      return cachedResponse || fetchPromise;
    })
  );
});
