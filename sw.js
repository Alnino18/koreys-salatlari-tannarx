/**
 * Koreys Salatlari Tannarx Kalkulyatori - Service Worker (sw.js)
 * Offline rejim va PWA keshini boshqarish
 */

const CACHE_NAME = 'salat-calc-pwa-v3.0-premium-icon';

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

// 3. So'rovlarni tutish (Fetch - Stale-While-Revalidate & Cache Fallback)
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Faqat HTTP/HTTPS va GET so'rovlarni keshlaymiz (chrome-extension:// va boshqa sxemalarni o'tkazib yuboramiz)
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        // Fon orqali keshni yangilash (Stale-while-revalidate)
        fetch(request).then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse.clone());
            });
          }
        }).catch(() => {
          // Oflayn holatda xatolik e'tiborga olinmaydi
        });
        return cachedResponse;
      }

      // Keshda bo'lmasa, tarmoqdan yuklab keshga saqlash (Opaque CDN javoblarini ham qabul qiladi)
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque') || networkResponse.type === 'error') {
          return networkResponse;
        }

        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });

        return networkResponse;
      }).catch(() => {
        // Agar HTML so'rov bo'lsa va tarmoq bo'lmasa, keshdagi index.html ni qaytarish
        if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html', { ignoreSearch: true });
        }
      });
    })
  );
});
