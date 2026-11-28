/* "Ouça este artigo": narração em voz neural (MP3 gerado pelo robô de áudio).
   Toca com a tela desligada e em segundo plano, com controles na tela de bloqueio,
   velocidade, seções e "continuar de onde parou". */
(function () {
  var botao = document.getElementById("ouvir-artigo");
  var dadosEl = document.getElementById("ouvir-dados");
  if (!botao || !dadosEl) return;
  var dados = JSON.parse(dadosEl.textContent || "{}"), secoes = dados.secoes || [];
  var chave = "mm_audio_" + location.pathname, audio, barra, el = {}, marcos = {}, iniciado = false,
      velocidades = [1, 1.15, 1.3, 1.5, 0.9], vIdx = 0;
  var titulos = document.querySelectorAll(".art-corpo h2");

  function fmt(s) { s = Math.max(0, Math.floor(s || 0)); var m = Math.floor(s / 60); return m + ":" + String(s % 60).padStart(2, "0"); }
  function secaoAtual(t) { var i = 0; secoes.forEach(function (s, k) { if (t >= s.inicio) i = k; }); return i; }
  function estat(v) { if (window.mmEstat) window.mmEstat({ t: "audio", v: v }); }

  function atualizar() {
    var t = audio.currentTime, d = audio.duration || dados.duracao || 1, i = secaoAtual(t);
    el.tempo.textContent = fmt(t) + " / " + fmt(d);
    el.secao.textContent = secoes[i] ? secoes[i].titulo : "";
    el.prog.value = Math.round(t / d * 1000);
    document.querySelectorAll(".ouvindo-agora").forEach(function (h) { h.classList.remove("ouvindo-agora"); });
    if (i > 0 && titulos[i - 1]) titulos[i - 1].classList.add("ouvindo-agora");
    var pct = Math.floor(t / d * 100);
    [25, 50, 75, 100].forEach(function (m) { if (pct >= (m === 100 ? 98 : m) && !marcos[m]) { marcos[m] = 1; estat(m); } });
    try { localStorage.setItem(chave, String(Math.floor(t))); } catch (e) {}
    if ("mediaSession" in navigator && navigator.mediaSession.setPositionState && isFinite(d)) {
      try { navigator.mediaSession.setPositionState({ duration: d, playbackRate: audio.playbackRate, position: Math.min(t, d) }); } catch (e) {}
    }
  }

  function irPara(t) { audio.currentTime = Math.max(0, Math.min(t, (audio.duration || dados.duracao) - 1)); atualizar(); }
  function pularSecao(dir) {
    var i = secaoAtual(audio.currentTime);
    if (dir < 0 && audio.currentTime - (secoes[i] ? secoes[i].inicio : 0) > 4) return irPara(secoes[i].inicio);
    var alvo = secoes[Math.max(0, Math.min(secoes.length - 1, i + dir))];
    if (alvo) irPara(alvo.inicio);
  }
  function estadoBotao() {
    el.play.textContent = audio.paused ? "▶" : "⏸";
    el.play.setAttribute("aria-label", audio.paused ? "Tocar" : "Pausar");
  }

  function sessaoDeMidia() {
    if (!("mediaSession" in navigator)) return;
    var icone = (document.querySelector('link[rel="apple-touch-icon"]') || {}).href || "/static/icons/icon-512.png";
    navigator.mediaSession.metadata = new MediaMetadata({
      title: botao.dataset.titulo || document.title, artist: "Marlon Brito",
      album: botao.dataset.serie || "Artigos", artwork: [{ src: icone, sizes: "512x512", type: "image/png" }]
    });
    var h = {
      play: function () { audio.play(); }, pause: function () { audio.pause(); },
      seekbackward: function (e) { irPara(audio.currentTime - ((e && e.seekOffset) || 15)); },
      seekforward: function (e) { irPara(audio.currentTime + ((e && e.seekOffset) || 15)); },
      previoustrack: function () { pularSecao(-1); }, nexttrack: function () { pularSecao(1); },
      seekto: function (e) { if (e && e.seekTime != null) irPara(e.seekTime); }
    };
    Object.keys(h).forEach(function (k) { try { navigator.mediaSession.setActionHandler(k, h[k]); } catch (e) {} });
  }

  function criar() {
    audio = new Audio();
    audio.preload = "metadata";
    var origemLocal = botao.dataset.src, origemCdn = botao.dataset.cdn || "";
    audio.src = origemCdn || origemLocal;
    if (origemCdn) {
      audio.addEventListener("error", function reserva(ev) {      // Pages indisponível: usa o Render
        if (audio.src.indexOf(origemCdn) === -1) return;
        ev.stopImmediatePropagation();
        audio.removeEventListener("error", reserva, true);
        var tocar = iniciado || !audio.paused, t = audio.currentTime || 0;
        audio.src = origemLocal;
        audio.addEventListener("loadedmetadata", function () { if (t) audio.currentTime = t; }, { once: true });
        if (tocar) audio.play().catch(function () {});
      }, true);
    }
    barra = document.createElement("div");
    barra.className = "ouvir-barra ouvir-neural";
    barra.setAttribute("role", "region");
    barra.setAttribute("aria-label", "Player de áudio do artigo");
    barra.innerHTML =
      '<div class="ouvir-linha1"><span class="ouvir-secao"></span><span class="ouvir-tempo">0:00</span></div>' +
      '<input class="ouvir-prog" type="range" min="0" max="1000" value="0" aria-label="Posição do áudio">' +
      '<div class="ouvir-linha2">' +
      '<button type="button" data-a="ant" aria-label="Seção anterior">⏮</button>' +
      '<button type="button" data-a="menos" aria-label="Voltar 15 segundos">↺15</button>' +
      '<button type="button" data-a="play" class="ouvir-play" aria-label="Pausar">⏸</button>' +
      '<button type="button" data-a="mais" aria-label="Avançar 15 segundos">15↻</button>' +
      '<button type="button" data-a="prox" aria-label="Próxima seção">⏭</button>' +
      '<button type="button" data-a="vel" class="ouvir-vel" aria-label="Velocidade">1x</button>' +
      '<button type="button" data-a="fechar" aria-label="Fechar o player">✕</button></div>';
    document.body.appendChild(barra);
    document.body.classList.add("com-player");
    ["secao", "tempo", "prog", "play", "vel"].forEach(function (n) { el[n] = barra.querySelector(".ouvir-" + n); });
    el.play = barra.querySelector(".ouvir-play");

    barra.addEventListener("click", function (ev) {
      var b = ev.target.closest("button"); if (!b) return;
      var a = b.getAttribute("data-a");
      if (a === "play") audio.paused ? audio.play() : audio.pause();
      else if (a === "menos") irPara(audio.currentTime - 15);
      else if (a === "mais") irPara(audio.currentTime + 15);
      else if (a === "ant") pularSecao(-1);
      else if (a === "prox") pularSecao(1);
      else if (a === "vel") {
        vIdx = (vIdx + 1) % velocidades.length;
        audio.playbackRate = velocidades[vIdx];
        el.vel.textContent = String(velocidades[vIdx]).replace(".", ",") + "x";
      } else if (a === "fechar") {
        audio.pause(); barra.remove(); barra = null; audio = null;
        document.body.classList.remove("com-player");
        document.querySelectorAll(".ouvindo-agora").forEach(function (h) { h.classList.remove("ouvindo-agora"); });
      }
    });
    el.prog.addEventListener("input", function () { irPara(el.prog.value / 1000 * (audio.duration || dados.duracao)); });
    audio.addEventListener("timeupdate", atualizar);
    audio.addEventListener("play", function () { estadoBotao(); if (!iniciado) { iniciado = true; estat(0); } });
    audio.addEventListener("pause", estadoBotao);
    audio.addEventListener("ended", function () { estadoBotao(); try { localStorage.removeItem(chave); } catch (e) {} });
    audio.addEventListener("error", function () { el.secao.textContent = "Não foi possível carregar o áudio agora."; });
    audio.addEventListener("loadedmetadata", function () {
      var salvo = 0;
      try { salvo = parseInt(localStorage.getItem(chave) || "0", 10); } catch (e) {}
      if (salvo > 10 && salvo < audio.duration - 10) audio.currentTime = salvo;   // continua de onde parou
      atualizar();
    }, { once: true });
    sessaoDeMidia();
  }

  botao.addEventListener("click", function () {
    if (!barra) criar();
    audio.play().catch(function () { estadoBotao(); });
  });
})();
