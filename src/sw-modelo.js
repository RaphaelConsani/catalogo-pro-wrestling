// Service worker do app (modelo: o build preenche a versão e a lista de arquivos; ver vite.config.js).
// - Na instalação, guarda todos os arquivos do app no cache: abre offline.
// - Versão nova espera todas as janelas do app fecharem pra assumir (sem skipWaiting):
//   uma janela aberta ainda pode carregar gráficos/Excel da versão antiga, cujo cache
//   só é apagado quando a nova assume.
// - Página (index.html): tenta a rede primeiro (pega a versão nova), cai no cache sem internet.
//   Pede sempre a versão do servidor (cache: 'no-cache'): o GitHub Pages manda guardar a página
//   por 10 min, e sem isso o app reaberto logo depois de publicar ainda abria a versão antiga.
// - Demais arquivos têm hash no nome e nunca mudam: cache primeiro.
// Os dados do usuário ficam no IndexedDB e não passam por aqui.

const VERSAO = '__VERSAO__';
const CACHE = `catalogo-pw-${VERSAO}`;
const ARQUIVOS = __ARQUIVOS__;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith('catalogo-pw-') && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
        .then((resp) => {
          // Só guarda página que veio certa: um 404/500 não pode virar a cópia offline.
          if (resp.ok) {
            const copia = resp.clone();
            caches.open(CACHE).then((c) => c.put('./', copia));
          }
          return resp;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r ?? fetch(req)));
});
