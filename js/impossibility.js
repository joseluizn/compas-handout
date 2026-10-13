/* Widget: dois grupos de 100 réus, mesmo desempenho preditivo, taxas de reincidência
   diferentes. Com PPV e NPV fixos, a taxa de reincidência do grupo determina sozinha
   quantas pessoas são marcadas como alto risco — e, portanto, as taxas de erro. */
(function () {
  "use strict";

  var slider = document.getElementById("slider-base");
  if (!slider) return;

  var COR = (window.COMPAS && window.COMPAS.COR) || { negros: "#0072b2", brancos: "#e69f00" };
  var PPV = 0.7;   // entre os de alto risco, 7 em 10 reincidem (nos dois grupos)
  var NPV = 0.8;   // entre os de baixo risco, 8 em 10 não reincidem (nos dois grupos)
  var N = 100;
  var BASE_G1 = 30;

  var saida = document.getElementById("saida-widget");
  var nota = document.getElementById("nota-widget");
  var valorBase = document.getElementById("valor-base");

  function tabela(reincidentes) {
    var r = reincidentes / N;
    // r = PPV*h + (1-NPV)*(1-h)  =>  h = (r - (1-NPV)) / (PPV - (1-NPV))
    var h = (r - (1 - NPV)) / (PPV - (1 - NPV));
    h = Math.min(1, Math.max(0, h));
    var alto = h * N;
    var tp = PPV * alto;
    var fp = alto - tp;
    var fn = reincidentes - tp;
    var tn = N - alto - fn;
    return {
      alto: alto, tp: tp, fp: fp, fn: fn, tn: tn,
      fpr: fp + tn > 0 ? fp / (fp + tn) : 0,
      fnr: fn + tp > 0 ? fn / (fn + tp) : 0
    };
  }

  function cartao(rotulo, valor, cor) {
    return '<div class="num"><div class="k">' + rotulo + '</div>' +
      '<div class="v" style="color:' + cor + '">' + valor + '</div></div>';
  }

  function fmt(x) { return (x * 100).toFixed(1).replace(".", ",") + "%"; }

  function render() {
    var base2 = parseInt(slider.value, 10);
    var g1 = tabela(BASE_G1);
    var g2 = tabela(base2);

    valorBase.textContent = base2;

    saida.innerHTML =
      cartao("Grupo 1 · de quem <em>não</em> reincidiu, marcados como alto risco " +
        "<small>(falso positivo)</small>", fmt(g1.fpr), COR.negros) +
      cartao("Grupo 2 · de quem <em>não</em> reincidiu, marcados como alto risco " +
        "<small>(falso positivo)</small>", fmt(g2.fpr), COR.brancos) +
      cartao("Grupo 1 · de quem reincidiu, marcados como baixo risco " +
        "<small>(falso negativo)</small>", fmt(g1.fnr), COR.negros) +
      cartao("Grupo 2 · de quem reincidiu, marcados como baixo risco " +
        "<small>(falso negativo)</small>", fmt(g2.fnr), COR.brancos);

    var difFpr = Math.abs(g1.fpr - g2.fpr) * 100;
    if (base2 === BASE_G1) {
      nota.innerHTML = "<strong>Os dois grupos têm agora a mesma taxa de reincidência — " +
        "e só agora as taxas de erro coincidem.</strong>";
    } else {
      nota.innerHTML = "Diferença de <strong>" +
        difFpr.toFixed(1).replace(".", ",") + " p.p.</strong> entre os dois grupos na fatia de " +
        "quem não reincidiu e mesmo assim foi marcado como alto risco, com as mesmas proporções " +
        "de acerto nos dois grupos (7 em 10 entre os de alto risco, 8 em 10 entre os de baixo risco).";
    }
  }

  slider.addEventListener("input", render);
  render();
})();
