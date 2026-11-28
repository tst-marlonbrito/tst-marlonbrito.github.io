/* Service worker do portfólio — offline básico e cache inteligente.
   Ao mudar arquivos estáticos importantes, suba o número da VERSAO. */
const VERSAO = "portfolio-v2";
const CACHE_PAGINAS = `${VERSAO}-paginas`;
const CACHE_ESTATICO = `${VERSAO}-estatico`;
const OFFLINE = "/static/offline.html";
const PRECACHE = [
  "/", "/projetos", "/livros", OFFLINE,
  "/static/css/main.css", "/static/css/premium.css",
  "/static/icons/icon-192.png", "/static/icons/icon.svg",
];
// rotas que nunca vão para o cache (área restrita e formulário)
const NUNCA = [/^\/admin/, /^\/auth/, /^\/login/, /^\/contato/, /^\/sw\.js$/];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_PAGINAS).then((c) =>
      Promise.all(PRECACHE.map((u) => c.add(u).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSAO)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;           // fontes e sites externos seguem direto
  if (NUNCA.some((r) => r.test(url.pathname))) return;

  // Páginas: rede primeiro (conteúdo sempre atualizado), cache se estiver sem internet
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const cp = res.clone(); caches.open(CACHE_PAGINAS).then((c) => c.put(req, cp)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true })
          .then((r) => r || caches.match(OFFLINE)))
    );
    return;
  }

  // Arquivos estáticos: responde do cache na hora e atualiza em segundo plano
  if (url.pathname.startsWith("/static/")) {
    e.respondWith(
      caches.open(CACHE_ESTATICO).then((c) =>
        c.match(req).then((cached) => {
          const rede = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; })
            .catch(() => cached);
          return cached || rede;
        })
      )
    );
  }
});
