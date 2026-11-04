// Офлайн-режим: игра сохраняется в телефоне и запускается без интернета (онлайн-бои, конечно, нет)
const CACHE = 'pml-v1';
const CORE = ['./', 'index.html', 'style.css', 'manifest.json', 'icon-192.png', 'icon-512.png',
  'js/audio.js', 'js/fighters.js', 'js/stages.js', 'js/sprite.js', 'js/game.js', 'js/ui.js',
  'music/menu.m4a', 'music/fight.m4a', 'music/career.m4a'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') return;
  const music = url.pathname.includes('/music/');
  // музыка — из памяти, если уже скачана; остальное — сначала свежее из сети, без сети — из памяти
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (music) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
    }
    try {
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone()).catch(() => {});
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' && await cache.match('index.html'));
      if (hit) return hit;
      throw err;
    }
  })());
});
