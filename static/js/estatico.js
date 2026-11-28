/* Versão estática do site (GitHub Pages): troca o que dependia do servidor.
   - Contato e newsletter: enviados a um serviço de formulários (se configurado)
     ou abertos no aplicativo de e-mail do visitante, com a mensagem pronta.
   - ?orcamento=...: preenche a mensagem de orçamento, como o servidor fazia. */
(function () {
  var cfg = window.MM_ESTATICO || {};

  // estilo dos avisos (o da newsletter só existia nas páginas com a caixa de inscrição)
  var css = document.createElement("style");
  css.textContent = ".news-status{flex-basis:100%;margin:.4rem 0 0;padding:.75rem 1rem;border-radius:10px;font-weight:600;line-height:1.45}" +
    ".news-status.ok{background:#e8f7ee;color:#14633a;border:1px solid #a7e3bf}" +
    ".news-status.erro{background:#fdecec;color:#9b1c1c;border:1px solid #f5b5b5}.news-status a{color:inherit;text-decoration:underline}";
  document.head.appendChild(css);

  function aviso(el, ok, html) {
    el.hidden = false;
    el.className = (el.dataset.base || "news-status") + " " + (ok ? "ok" : "erro");
    el.innerHTML = html;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function emailValido(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }
  function linkEmail(assunto, corpo) {
    return "mailto:" + cfg.email + "?subject=" + encodeURIComponent(assunto) + "&body=" + encodeURIComponent(corpo);
  }
  var reserva = function () {
    return 'Se preferir, escreva direto para <a href="mailto:' + esc(cfg.email) + '">' + esc(cfg.email) +
      '</a> ou fale comigo no <a href="' + esc(cfg.linkedin) + '" target="_blank" rel="noopener">LinkedIn</a>.';
  };

  function enviar(form, dados, assunto, corpo, status, depois) {
    var bt = form.querySelector("button[type=submit]");
    if (form.querySelector("[name=website]") && form.querySelector("[name=website]").value) {   // robô
      aviso(status, true, "Recebido. Obrigado!"); return;
    }
    if (cfg.form && window.fetch) {
      var fd = new FormData();
      Object.keys(dados).forEach(function (k) { fd.append(k, dados[k]); });
      fd.append("_subject", assunto);
      if (dados.email) fd.append("_replyto", dados.email);
      var txt = bt.textContent; bt.disabled = true; bt.textContent = "Enviando...";
      fetch(cfg.form, { method: "POST", body: fd, headers: { "Accept": "application/json" } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function () { aviso(status, true, depois); form.reset(); })
        .catch(function () {
          aviso(status, false, 'Não consegui enviar agora. <a href="' + linkEmail(assunto, corpo) +
            '">Toque aqui para enviar pelo seu e-mail</a>. ' + reserva());
        })
        .finally(function () { bt.disabled = false; bt.textContent = txt; });
      return;
    }
    window.location.href = linkEmail(assunto, corpo);
    aviso(status, true, "Abri o seu aplicativo de e-mail com a mensagem pronta. É só tocar em enviar. " + reserva());
  }

  // Captura antes dos scripts originais (que enviavam ao servidor)
  document.addEventListener("submit", function (ev) {
    var f = ev.target;
    if (!(f instanceof HTMLFormElement)) return;
    var acao = f.getAttribute("action") || "";

    if (f.classList.contains("news-form")) {
      ev.preventDefault(); ev.stopImmediatePropagation();
      var st = f.querySelector(".news-status");
      var nome = (f.querySelector("[name=nome]") || {}).value || "", email = (f.querySelector("[name=email]") || {}).value || "";
      email = email.trim();
      if (!emailValido(email)) { aviso(st, false, "Confira o seu e-mail."); return; }
      enviar(f, { tipo: "newsletter", nome: nome.trim(), email: email },
        "Newsletter: quero receber os artigos",
        "Olá, Marlon! Quero receber os próximos capítulos por e-mail.\n\nNome: " + nome.trim() + "\nE-mail: " + email,
        st, "Inscrição recebida! Você vai receber os próximos capítulos por e-mail.");
      return;
    }

    if (/\/contato\/?$/.test(acao) || f.closest("#contato")) {
      ev.preventDefault(); ev.stopImmediatePropagation();
      var stc = f.querySelector(".contato-status");
      if (!stc) {
        stc = document.createElement("p");
        stc.className = "news-status contato-status"; stc.dataset.base = "news-status contato-status";
        stc.setAttribute("role", "status"); stc.setAttribute("aria-live", "polite");
        f.appendChild(stc);
      }
      var n = f.querySelector("[name=nome]").value.trim(), e = f.querySelector("[name=email]").value.trim(),
          m = f.querySelector("[name=mensagem]").value.trim();
      if (!n || !e || !m) { aviso(stc, false, "Preencha nome, e-mail e mensagem."); return; }
      if (!emailValido(e) || m.length > 5000) { aviso(stc, false, "Confira o e-mail e escreva uma mensagem de até 5.000 caracteres."); return; }
      enviar(f, { tipo: "contato", nome: n, email: e, mensagem: m },
        "Contato pelo site: " + n, m + "\n\n— " + n + " (" + e + ")",
        stc, "Mensagem enviada! Obrigado pelo contato. Respondo o quanto antes.");
    }
  }, true);

  // ?orcamento=<projeto>: mensagem pronta no formulário de contato
  try {
    var o = new URLSearchParams(location.search).get("orcamento");
    var msg = o && cfg.orcamentos && cfg.orcamentos[o];
    var ta = document.getElementById("mensagem");
    if (msg && ta && !ta.value) {
      ta.value = msg; ta.rows = 9;
      if (location.hash === "#contato") { var c = document.getElementById("contato"); if (c) c.scrollIntoView(); }
    }
  } catch (e) {}

  // Inscrição confirmada (?inscrito=1) não existe no site estático: limpa o endereço
  if (/[?&]inscrito=/.test(location.search) && history.replaceState) {
    history.replaceState(null, "", location.pathname + location.hash);
  }
})();
