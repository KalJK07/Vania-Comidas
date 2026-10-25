const CACHE = 'comidas-v4';
const FILES = ['./', './index.html', './styles.css', './app.js', './config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './badge-96.png', './alerta.png', './ansioso.gif'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request)));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type: 'window'}).then(l => l.length ? l[0].focus() : clients.openWindow('./')));
});
