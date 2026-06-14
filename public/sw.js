const CACHE = 'smart-rdj-v1';
const SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/index.html')));
    return;
  }
  const url = new URL(e.request.url);
  if (url.hostname.includes('googleapis') || url.hostname.includes('firebaseio') ||
      url.hostname.includes('firestore') || url.hostname.includes('firebase')) return;
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});

self.addEventListener('message', e => {
  if (e.data?.type === 'REMIND') {
    self.registration.showNotification('📋 Rapport RDJ — CNSSAP', {
      body: e.data.body ?? "N'oubliez pas de soumettre votre rapport journalier !",
      icon: '/logo.jpeg',
      badge: '/logo.jpeg',
      tag: 'rdj-reminder',
    });
  }
});
