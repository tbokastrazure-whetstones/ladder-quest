// CIRCUIT ISLES — オフライン用サービスワーカー
// 方針: ネット優先(更新をすぐ反映)。つながらないときは前回保存した版を使う。
const CACHE = 'ladder-quest-v34';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './js/ext-instr.js', './js/area6.js', './js/demo.js', './js/mem.js', './js/mobile.js', './js/lesson.js', './js/pin.js', './js/mission.js', './js/practice.js', './js/usability.js', './js/bridge.js', './js/story.js', './js/wrap.js', './js/bgm-tracks.js', './js/bgm.js',
  './img/island1.webp', './img/island2.webp', './img/island3.webp', './img/island4.webp', './img/island5.webp', './img/island6.webp', './img/island7.webp',
  './img/island1_hd.webp', './img/cloud_bank.webp', './img/cloud_tower.webp', './img/cloud_s1.webp', './img/cloud_s2.webp', './img/cloud_s3.webp', './img/cloud_s4.webp'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
