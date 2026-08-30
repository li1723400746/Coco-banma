const CACHE = 'dse-v1';
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(['./manifest.json', './icon.svg']).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // 不管第三方 CDN
  // 首页 index.html：网络优先，保证最新
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(req).then(res => {
        const cl = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', cl));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  // 音频 / 图标 / manifest：缓存优先 + 后台更新
  e.respondWith(
    caches.match(req).then(hit => {
      const fp = fetch(req).then(res => {
        if (res.ok) { const cl = res.clone(); caches.open(CACHE).then(c => c.put(req, cl)); }
        return res;
      }).catch(() => hit);
      return hit || fp;
    })
  );
});
