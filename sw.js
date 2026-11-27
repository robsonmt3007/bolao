// Service worker do Bolão dos Amigos
// IMPORTANTE: mude a VERSAO sempre que publicar um index.html novo
const VERSAO = 'bolao-v6';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './favicon.ico'];
const HOSTS_CDN = ['cdn.tailwindcss.com', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  // Baixa cada arquivo sem usar o cache do navegador e sem travar a instalação
  // se algum arquivo (ex.: favicon.ico) não existir no servidor
  e.waitUntil(
    caches.open(VERSAO)
      .then(c => Promise.all(SHELL.map(u =>
        fetch(u, { cache: 'no-store' })
          .then(r => { if (r && r.ok) return c.put(u, r); })
          .catch(() => {})
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Permite que o index.html peça a ativação imediata da versão nova
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Dados do bolão (nuvem) e demais APIs: sempre direto da rede, nunca em cache
  if (url.origin !== location.origin && !HOSTS_CDN.includes(url.hostname)) return;

  // Arquivos do próprio app: rede primeiro, ignorando o cache do navegador; cache só se estiver offline
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(r => {
          if (r && r.ok) { const copia = r.clone(); caches.open(VERSAO).then(c => c.put(req, copia)); }
          return r;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Bibliotecas externas (Tailwind, ícones, fontes, gerador de imagem): cache com atualização em segundo plano
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
