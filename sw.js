// Deixa o app abrir mesmo sem internet. Sempre tenta a versão nova primeiro.
const CACHE = 'tarefas-v2';
const ARQUIVOS = [
  './', 'index.html', 'estilo.css', 'app.js', 'regras.js', 'armazenamento.js',
  'config-firebase.js', 'premios.js', 'cripto.js', 'mascote-svg.js', 'manifest.webmanifest', 'icone.svg', 'icone-180.png', 'icone-192.png', 'icone-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return; // Firebase cuida do resto
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const copia = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
