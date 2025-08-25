const CACHE_NAME = 'trivia-llm-cache-v1';
const urlsToCache = [
  '/',
  '/trivia.html',
  '/style.css',
  '/js/main.js',
  '/js/adapter.js',
  '/js/board.js',
  '/js/config.js',
  '/js/dom.js',
  '/js/game.js',
  '/js/persistence.js',
  '/js/state.js',
  '/js/theme.js',
  '/js/ui.js',
  '/js/utils.js',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});