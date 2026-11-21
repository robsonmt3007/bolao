// Service worker do Bolão dos Amigos
const VERSAO = 'bolao-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const HOSTS_CDN = ['cdn.tailwindcss.com', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Dados do bolão (nuvem) e demais APIs: sempre direto da rede, nunca em cache
  if (url.origin !== location.origin && !HOSTS_CDN.includes(url.hostname)) return;

  // Arquivos do próprio app: rede primeiro (sempre a versão mais nova), cache se estiver offline
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then(r => {
          if (r && r.ok) { const copia = r.clone(); caches.open(VERSAO).then(c => c.put(req, copia)); }
          return r;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Bibliotecas externas (Tailwind, ícones, fontes): cache com atualização em segundo plano
  e.respondWith(
    caches.match(req).then(emCache => {
      const rede = fetch(req).then(r => {
        if (r && (r.ok || r.type === 'opaque')) { const copia = r.clone(); caches.open(VERSAO).then(c => c.put(req, copia)); }
        return r;
      }).catch(() => emCache);
      return emCache || rede;
    })
  );
});
