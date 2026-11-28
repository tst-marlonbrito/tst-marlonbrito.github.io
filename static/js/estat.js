/* Estatísticas do site: sem cookies, sem IP e sem identificador pessoal (LGPD).
   Envia o caminho da página, a origem da visita, o fuso horário (para saber o país),
   o tempo em que a página ficou visível, a rolagem e interações importantes. */
(function () {
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;
  var app = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;

  function enviar(dados) {
    dados.p = location.pathname;
    dados.app = app;
    var corpo = JSON.stringify(dados);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon("/a/e", corpo)) return;
    } catch (e) {}
    try { fetch("/a/e", { method: "POST", body: corpo, keepalive: true }); } catch (e) {}
  }
  window.mmEstat = enviar;   // usado pelo player "Ouça este artigo"

  // Visitante novo ou recorrente: só uma marca local com a data da última visita (nada é enviado além de 0/1)
  var rec = 0;
  try {
    var ult = localStorage.getItem("mm_ult_visita"), hoje = new Date().toISOString().slice(0, 10);
    rec = ult && ult !== hoje ? 1 : (ult === hoje ? (localStorage.getItem("mm_rec") === "1" ? 1 : 0) : 0);
    if (ult && ult !== hoje) localStorage.setItem("mm_rec", "1");
    localStorage.setItem("mm_ult_visita", hoje);
  } catch (e) { rec = null; }
  var tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}

  // 1) Visita à página
  enviar({ t: "view", r: document.referrer || "", q: location.search || "", tz: tz,
           l: (navigator.language || "").slice(0, 12), rec: rec });

  // 2) Rolagem (todas as páginas) e leitura do artigo (25, 50, 75 e 100%)
  var maxRolagem = 0, corpoArtigo = document.querySelector(".art-corpo"), marcos = [25, 50, 75, 100], enviados = {};
  function medir() {
    var doc = document.documentElement, alt = Math.max(doc.scrollHeight - window.innerHeight, 1);
    maxRolagem = Math.max(maxRolagem, Math.min(100, Math.round(window.scrollY / alt * 100)));
    if (corpoArtigo) {
      var r = corpoArtigo.getBoundingClientRect(), lido = (window.innerHeight - r.top) / r.height * 100;
      marcos.forEach(function (m) {
        if (lido >= m && !enviados[m]) { enviados[m] = 1; enviar({ t: "read", v: m }); }
      });
    }
  }
  window.addEventListener("scroll", medir, { passive: true });
  setTimeout(medir, 1500);

  // 3) Tempo em que a página ficou visível (enviado ao sair ou trocar de aba)
  var visivelDesde = document.visibilityState === "visible" ? Date.now() : 0, acumulado = 0, tempoEnviado = false;
  function pausar() { if (visivelDesde) { acumulado += Date.now() - visivelDesde; visivelDesde = 0; } }
  function enviarTempo() {
    pausar();
    var s = Math.round(acumulado / 1000);
    if (!tempoEnviado && s >= 2) { tempoEnviado = true; enviar({ t: "tempo", v: Math.min(s, 1800), a: String(maxRolagem) }); }
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") enviarTempo();
    else { visivelDesde = Date.now(); if (tempoEnviado) { tempoEnviado = false; acumulado = 0; } }
  });
  window.addEventListener("pagehide", enviarTempo);

  // 4) Cliques que importam para o negócio
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest("a");
    if (!a) return;
    var h = a.getAttribute("href") || "", alvo = null;
    if (h.indexOf("orcamento=") > -1) alvo = "orcamento";
    else if (/amazon\.|a\.co\/|clubedeautores/.test(h)) alvo = "livro";
    else if (/wa\.me|linkedin\.com\/sharing/.test(h)) alvo = "compartilhar";
    else if (/Abrir demo/i.test(a.textContent || "")) alvo = "demo";
    if (alvo) enviar({ t: "click", a: alvo });
  }, true);

  // 5) Formulário de contato enviado
  var form = document.querySelector('form[action$="/contato"]');
  if (form) form.addEventListener("submit", function () { enviar({ t: "contato" }); });

  // 6) App instalado: conta uma vez por aparelho (na instalação ou na 1ª abertura pelo ícone)
  function marcar() { try { localStorage.setItem("mm_app_inst", "1"); } catch (e) {} }
  function jaContado() { try { return localStorage.getItem("mm_app_inst") === "1"; } catch (e) { return true; } }
  window.addEventListener("appinstalled", function () { if (!jaContado()) { enviar({ t: "install" }); marcar(); } });
  if (app && !jaContado()) { enviar({ t: "install" }); marcar(); }
})();
