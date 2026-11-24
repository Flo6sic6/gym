const CACHE = 'gym-v2';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const FILES = ['./', './index.html', './manifest.json', './apple-touch-icon.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Nur eigene Dateien: sofort aus dem Cache (schnell auch bei schlechtem Empfang),
// im Hintergrund aktualisieren. Anfragen an Google laufen nie über den Cache.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Schriften von Google Fonts einmal laden und dauerhaft offline vorhalten
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      c.put(e.request, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async c => {
      const cached = await c.match(e.request, { ignoreSearch: true });
      const net = fetch(e.request)
        .then(res => { if (res.ok) c.put(e.request, res.clone()); return res; })
        .catch(() => null);
      return cached || (await net) || c.match('./index.html');
    })
  );
});
