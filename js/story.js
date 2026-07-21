/* Renderiza os gráficos e números a partir de window.METRICS (js/metrics-data.js).
   SVG escrito à mão, sem biblioteca. Paleta Okabe-Ito. */
(function () {
  "use strict";

  var M = window.METRICS;
  if (!M) return;

  var COR = { negros: "#0072b2", brancos: "#e69f00", erro: "#d55e00", cinza: "#b9bec6" };
  var NOME = { negros: "réus negros", brancos: "réus brancos" };
  var SVGNS = "http://www.w3.org/2000/svg";

  function el(nome, attrs, texto) {
    var n = document.createElementNS(SVGNS, nome);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  function pct(x, casas) {
    return (x * 100).toFixed(casas === undefined ? 1 : casas).replace(".", ",") + "%";
  }

  function num(x) {
    return x.toLocaleString("pt-BR");
  }

  function setTexto(id, valor) {
    var n = document.getElementById(id);
    if (n) n.textContent = valor;
  }

  /* ---------- números soltos no texto ---------- */

  function preencherTextos() {
    setTexto("n-total", num(M.meta.n_analysis));
    setTexto("n-negros", num(M.groups.negros.n));
    setTexto("n-brancos", num(M.groups.brancos.n));
    setTexto("ppv-negros", pct(M.groups.negros.ppv, 0));
    setTexto("ppv-brancos", pct(M.groups.brancos.ppv, 0));
  }

  /* ---------- legenda ---------- */

  function legenda(alvo, itens) {
    var n = document.getElementById(alvo);
    if (!n) return;
    n.innerHTML = "";
    itens.forEach(function (it) {
      var s = document.createElement("span");
      var c = document.createElement("i");
      c.className = "chip";
      c.style.background = it.cor;
      s.appendChild(c);
      s.appendChild(document.createTextNode(it.texto));
      n.appendChild(s);
    });
  }

  /* ---------- gráfico 1: distribuição dos decis ---------- */

  function graficoDecis(alvo) {
    var host = document.getElementById(alvo);
    if (!host) return;

    var W = 680, H = 340;
    var m = { t: 18, r: 12, b: 46, l: 46 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;

    var grupos = ["negros", "brancos"];
    var maxShare = 0;
    grupos.forEach(function (g) {
      M.groups[g].deciles.forEach(function (d) { if (d.share > maxShare) maxShare = d.share; });
    });
    var topo = Math.ceil(maxShare * 100 / 5) * 5 / 100;

    var svg = el("svg", {
      viewBox: "0 0 " + W + " " + H,
      role: "img",
      "aria-label": "Distribuição dos escores de risco do COMPAS por grupo racial",
      style: "min-width:520px"
    });

    var y = function (v) { return m.t + ih - (v / topo) * ih; };
    var passo = iw / 10;
    var larguraBarra = passo * 0.36;

    // gridlines horizontais + eixo y
    for (var v = 0; v <= topo + 1e-9; v += 0.05) {
      svg.appendChild(el("line", {
        x1: m.l, x2: m.l + iw, y1: y(v), y2: y(v),
        stroke: "currentColor", "stroke-opacity": v === 0 ? 0.35 : 0.13, "stroke-width": 1
      }));
      svg.appendChild(el("text", {
        x: m.l - 8, y: y(v) + 4, "text-anchor": "end",
        "font-size": 12, fill: "currentColor", "fill-opacity": .65
      }, Math.round(v * 100) + "%"));
    }

    for (var d = 1; d <= 10; d++) {
      var cx = m.l + (d - 0.5) * passo;
      grupos.forEach(function (g, i) {
        var s = M.groups[g].deciles[d - 1];
        var x = cx - larguraBarra + i * larguraBarra;
        var alt = Math.max(0, m.t + ih - y(s.share));
        var r = el("rect", {
          x: x, y: y(s.share), width: larguraBarra - 2, height: alt,
          fill: COR[g], rx: 2
        });
        r.appendChild(el("title", {}, NOME[g] + ", escore " + d + ": " + pct(s.share) +
          " (" + num(s.n) + " pessoas)"));
        svg.appendChild(r);
      });
      svg.appendChild(el("text", {
        x: cx, y: m.t + ih + 20, "text-anchor": "middle",
        "font-size": 13, fill: "currentColor", "fill-opacity": .75
      }, d));
    }

    svg.appendChild(el("text", {
      x: m.l, y: H - 8, "font-size": 13, fill: "currentColor", "fill-opacity": .65
    }, "escore de risco do COMPAS (1 = mais baixo, 10 = mais alto)"));

    // anotação
    var xAnot = m.l + 0.5 * passo + 6;
    svg.appendChild(el("text", {
      x: xAnot, y: y(M.groups.brancos.deciles[0].share) - 10,
      "font-size": 13, "font-weight": 700, fill: COR.brancos
    }, "1 em cada 4 réus brancos recebe o escore mínimo"));

    host.innerHTML = "";
    host.appendChild(svg);

    legenda("legenda-decis", [
      { cor: COR.negros, texto: "Réus negros (n = " + num(M.groups.negros.n) + ")" },
      { cor: COR.brancos, texto: "Réus brancos (n = " + num(M.groups.brancos.n) + ")" }
    ]);
  }

  /* ---------- waffles ---------- */

  var CAMINHO_PESSOA =
    "M8 0a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm-5 8h10a2 2 0 0 1 2 2v7a1.2 1.2 0 0 1-2.4 0v-5h-.8v11a1.4 1.4 0 0 1-2.8 0v-6.6h-.8v6.6a1.4 1.4 0 0 1-2.8 0v-11h-.8v5a1.2 1.2 0 0 1-2.4 0v-7a2 2 0 0 1 2-2z";

  function waffle(taxa, cor) {
    var cols = 10, lado = 22, altura = 30;
    var marcados = Math.round(taxa * 100);
    var W = cols * lado, H = 10 * altura;
    var svg = el("svg", {
      viewBox: "0 0 " + W + " " + H, role: "img",
      "aria-label": marcados + " de cada 100 pessoas classificadas de forma errada",
      style: "max-width:230px"
    });
    for (var i = 0; i < 100; i++) {
      var c = i % cols, r = Math.floor(i / cols);
      var p = el("path", {
        d: CAMINHO_PESSOA,
        transform: "translate(" + (c * lado + 2) + "," + (r * altura + 2) + ") scale(1.05)",
        fill: i < marcados ? cor : COR.cinza,
        "fill-opacity": i < marcados ? 1 : 0.55
      });
      svg.appendChild(p);
    }
    return svg;
  }

  function blocoWaffle(grupo, taxa, contagem, denominador, rotulo) {
    var div = document.createElement("div");
    div.className = "waffle";
    var h = document.createElement("h3");
    h.textContent = NOME[grupo].charAt(0).toUpperCase() + NOME[grupo].slice(1);
    var v = document.createElement("p");
    v.className = "valor";
    v.style.color = COR.erro;
    v.textContent = Math.round(taxa * 100) + " em cada 100";
    var det = document.createElement("p");
    det.className = "detalhe";
    det.textContent = rotulo + ": " + num(contagem) + " de " + num(denominador) +
      " pessoas (" + pct(taxa) + ")";
    div.appendChild(h);
    div.appendChild(v);
    div.appendChild(det);
    div.appendChild(waffle(taxa, COR.erro));
    return div;
  }

  function waffles() {
    var alvoFPR = document.getElementById("waffles-fpr");
    var alvoFNR = document.getElementById("waffles-fnr");
    if (!alvoFPR || !alvoFNR) return;
    ["negros", "brancos"].forEach(function (g) {
      var b = M.groups[g], c = b.confusion;
      alvoFPR.appendChild(blocoWaffle(g, b.fpr, c.fp, c.fp + c.tn, "marcados como alto risco"));
      alvoFNR.appendChild(blocoWaffle(g, b.fnr, c.fn, c.fn + c.tp, "marcados como baixo risco"));
    });
  }

  /* ---------- curva de calibração (mais-informacoes.html) ---------- */

  function graficoCalibracao(alvo) {
    var host = document.getElementById(alvo);
    if (!host) return;

    var W = 680, H = 380;
    var m = { t: 18, r: 14, b: 48, l: 50 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var x = function (d) { return m.l + ((d - 1) / 9) * iw; };
    var y = function (v) { return m.t + ih - v * ih; };

    var svg = el("svg", {
      viewBox: "0 0 " + W + " " + H, role: "img",
      "aria-label": "Taxa observada de reincidência por escore, por grupo racial",
      style: "min-width:520px"
    });

    for (var v = 0; v <= 1.0001; v += 0.2) {
      svg.appendChild(el("line", {
        x1: m.l, x2: m.l + iw, y1: y(v), y2: y(v),
        stroke: "currentColor", "stroke-opacity": v === 0 ? 0.35 : 0.13
      }));
      svg.appendChild(el("text", {
        x: m.l - 8, y: y(v) + 4, "text-anchor": "end", "font-size": 12,
        fill: "currentColor", "fill-opacity": .65
      }, Math.round(v * 100) + "%"));
    }

    ["negros", "brancos"].forEach(function (g) {
      var pts = M.groups[g].deciles.filter(function (d) { return d.recid_rate !== null; });

      // faixa de IC
      var cima = pts.map(function (d) { return x(d.decile) + "," + y(d.ci_high); });
      var baixo = pts.slice().reverse().map(function (d) { return x(d.decile) + "," + y(d.ci_low); });
      svg.appendChild(el("polygon", {
        points: cima.concat(baixo).join(" "),
        fill: COR[g], "fill-opacity": .16
      }));

      svg.appendChild(el("polyline", {
        points: pts.map(function (d) { return x(d.decile) + "," + y(d.recid_rate); }).join(" "),
        fill: "none", stroke: COR[g], "stroke-width": 2.5,
        "stroke-linejoin": "round"
      }));

      pts.forEach(function (d) {
        var c = el("circle", { cx: x(d.decile), cy: y(d.recid_rate), r: 4, fill: COR[g] });
        c.appendChild(el("title", {}, NOME[g] + ", escore " + d.decile + ": " +
          pct(d.recid_rate) + " reincidiram (n = " + num(d.n) + ")"));
        svg.appendChild(c);
      });
    });

    for (var d = 1; d <= 10; d++) {
      svg.appendChild(el("text", {
        x: x(d), y: m.t + ih + 20, "text-anchor": "middle", "font-size": 13,
        fill: "currentColor", "fill-opacity": .75
      }, d));
    }
    svg.appendChild(el("text", {
      x: m.l, y: H - 8, "font-size": 13, fill: "currentColor", "fill-opacity": .65
    }, "escore de risco do COMPAS"));

    host.innerHTML = "";
    host.appendChild(svg);

    legenda("legenda-calibracao", [
      { cor: COR.negros, texto: "Réus negros" },
      { cor: COR.brancos, texto: "Réus brancos" }
    ]);
  }

  /* ---------- matrizes de confusão ---------- */

  function matrizes(alvo) {
    var host = document.getElementById(alvo);
    if (!host) return;
    host.innerHTML = "";

    ["negros", "brancos"].forEach(function (g) {
      var b = M.groups[g], c = b.confusion;
      var div = document.createElement("div");
      div.className = "matriz";
      div.innerHTML =
        "<h3>" + NOME[g].charAt(0).toUpperCase() + NOME[g].slice(1) +
        " <span style=\"color:" + COR[g] + "\">■</span></h3>" +
        "<table><thead><tr><th></th><th class=\"n\">Não reincidiu</th><th class=\"n\">Reincidiu</th></tr></thead>" +
        "<tbody>" +
        "<tr><th>Alto risco (escore ≥ 5)</th><td class=\"cell\">" + num(c.fp) +
        "</td><td class=\"cell\">" + num(c.tp) + "</td></tr>" +
        "<tr><th>Baixo risco (escore &lt; 5)</th><td class=\"cell\">" + num(c.tn) +
        "</td><td class=\"cell\">" + num(c.fn) + "</td></tr>" +
        "</tbody></table>" +
        "<p class=\"derivadas\">n = " + num(b.n) +
        " · taxa real de reincidência = " + pct(b.base_rate) +
        "<br>falso positivo (FPR) = " + num(c.fp) + "/" + num(c.fp + c.tn) + " = " + pct(b.fpr) +
        "<br>falso negativo (FNR) = " + num(c.fn) + "/" + num(c.fn + c.tp) + " = " + pct(b.fnr) +
        "<br>acerto entre os de alto risco (PPV) = " + num(c.tp) + "/" + num(c.tp + c.fp) +
        " = " + pct(b.ppv) +
        "<br>acurácia geral = " + pct(b.accuracy) + "</p>";
      host.appendChild(div);
    });
  }

  /* ---------- tabela de calibração ---------- */

  function tabelaCalibracao(alvo) {
    var host = document.getElementById(alvo);
    if (!host) return;
    var linhas = "";
    for (var d = 0; d < 10; d++) {
      var a = M.groups.negros.deciles[d], b = M.groups.brancos.deciles[d];
      linhas += "<tr><th>" + (d + 1) + "</th>" +
        "<td class=\"n\">" + num(a.n) + "</td><td class=\"n\">" +
        (a.recid_rate === null ? "—" : pct(a.recid_rate)) + "</td>" +
        "<td class=\"n\">" + num(b.n) + "</td><td class=\"n\">" +
        (b.recid_rate === null ? "—" : pct(b.recid_rate)) + "</td></tr>";
    }
    host.innerHTML =
      "<table><thead><tr><th>Escore</th><th class=\"n\">n (negros)</th>" +
      "<th class=\"n\">reincidiram</th><th class=\"n\">n (brancos)</th>" +
      "<th class=\"n\">reincidiram</th></tr></thead><tbody>" + linhas + "</tbody></table>";
  }

  /* ---------- metadados da metodologia ---------- */

  function metodologia() {
    setTexto("meta-n-bruto", num(M.meta.n_raw));
    setTexto("meta-n-analise", num(M.meta.n_analysis));
    setTexto("meta-n-analise-2", num(M.meta.n_analysis));
    setTexto("meta-corte", M.meta.cutoff);
    var ul = document.getElementById("meta-filtros");
    if (ul) {
      ul.innerHTML = "";
      M.meta.filters.forEach(function (f) {
        var li = document.createElement("li");
        li.innerHTML = "<code>" + f + "</code>";
        ul.appendChild(li);
      });
    }
    var s = M.sensitivity_days_b_30;
    if (s) {
      setTexto("sens-n", num(s.n_analysis));
      setTexto("sens-fpr-negros", pct(s.groups.negros.fpr));
      setTexto("sens-fpr-brancos", pct(s.groups.brancos.fpr));
      setTexto("sens-fnr-negros", pct(s.groups.negros.fnr));
      setTexto("sens-fnr-brancos", pct(s.groups.brancos.fnr));
    }
  }

  /* ---------- scroll reveal ---------- */

  function revelar() {
    var passos = document.querySelectorAll(".passo");
    if (!("IntersectionObserver" in window)) {
      passos.forEach(function (p) { p.classList.add("visivel"); });
      return;
    }
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("visivel");
          obs.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    passos.forEach(function (p) { obs.observe(p); });
  }

  window.COMPAS = { COR: COR, pct: pct, num: num };

  preencherTextos();
  graficoDecis("grafico-decis");
  waffles();
  graficoCalibracao("grafico-calibracao");
  matrizes("matrizes");
  tabelaCalibracao("tabela-calibracao");
  metodologia();
  revelar();
})();
