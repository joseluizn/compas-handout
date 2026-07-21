# Plano: site de storytelling visual — Caso COMPAS

## Context

O hand-out `handout-caso-compas.md` (em `~/reps/etica_manipulacao_dados/`) sustenta uma atividade em grupo de ~15 min sobre o conflito ProPublica × Northpointe. Hoje os números vivem só como texto ("44,9% contra 23,5%"), o que é fraco para alunos entenderem *como são os dados por trás das afirmações*. O objetivo é um site estático de scrollytelling em pt-BR, hospedado em GitHub Pages, com gráficos gerados a partir dos dados reais da ProPublica (Broward County), acessível em aula via QR code projetado num slide.

Repositório de destino já existe e está vazio: `~/reps/compas-handout` (remote `git@github.com:joseluizn/compas-handout.git`, branch `main`, zero commits). URL final: `https://joseluizn.github.io/compas-handout/`.

Decisões já tomadas com o usuário:
- Site em **pt-BR** (fontes em inglês, com link).
- **Scrollytelling estático + 1 widget interativo** (slider de taxa-base ilustrando a impossibilidade de Chouldechova). Vanilla JS, sem build step.
- Narrativa principal: distribuição de decis por raça + waffle de taxas de erro. **Curva de calibração e matrizes de confusão vão para uma aba/seção separada "Mais informações"** (conteúdo mais técnico, fora do fluxo principal).

## Arquitetura

Sem framework, sem build, sem CDN externo (tudo self-contained → funciona mesmo com wifi ruim na sala e não quebra por CSP/CDN fora do ar).

```
~/reps/compas-handout/
├── index.html              # narrativa principal (scroll)
├── mais-informacoes.html   # aba técnica: calibração + matrizes de confusão + metodologia
├── css/style.css
├── js/story.js             # scroll reveal + render dos gráficos a partir de data/metrics.json
├── js/impossibility.js     # widget do slider de taxa-base
├── data/
│   ├── metrics.json        # TODOS os números derivados (única fonte de verdade do site)
│   └── compas-derived.csv  # subset derivado, colunas usadas na análise (asset citável)
├── assets/qr-compas-handout.png  (+ .svg)
├── analysis/
│   ├── build_metrics.py    # script reprodutível (env eda)
│   └── README.md           # critérios de filtro + como rodar
├── .nojekyll
└── README.md               # créditos, licença dos dados, link do site
```

`metrics.json` é o contrato: o subagente de análise o produz, o front-end só o consome. Nenhum número hard-coded no HTML.

## Etapa 1 — Análise de dados (subagente **Sonnet**, env conda `eda`)

Briefing completo para o subagente (uma única chamada, não fatiar):

- Ativar env: `source ~/miniconda3/etc/profile.d/conda.sh && conda activate eda` (pandas 2.2.1, numpy, matplotlib, seaborn já presentes — confirmado).
- Baixar `https://raw.githubusercontent.com/propublica/compas-analysis/master/compas-scores-two-years.csv` (HTTP 200 confirmado) para `analysis/raw/` (gitignored).
- Reproduzir **exatamente** os filtros da ProPublica: `days_b_screening_arrest` entre −30 e 30, `is_recid != -1`, `c_charge_degree != 'O'`, `score_text != 'N/A'`. Restringir a `race in {African-American, Caucasian}`.
- Ponto de corte: `decile_score >= 5` = "alto risco" (equivale a `score_text` Medium/High), como na ProPublica. Desfecho = `two_year_recid`.
- Escrever `analysis/build_metrics.py` (determinístico, roda de ponta a ponta) que emite `data/metrics.json` com:
  - `n` por grupo racial; taxa-base de reincidência por grupo;
  - contagem e proporção por decil 1–10, por grupo (gráfico 1);
  - matriz de confusão 2×2 por grupo (TP/FP/TN/FN, contagens brutas);
  - FPR, FNR, PPV, NPV, acurácia por grupo;
  - calibração: taxa observada de reincidência em 2 anos por decil, por grupo, com n por célula e IC de Wilson 95%;
  - bloco `handout_check` comparando FPR/FNR calculados com os do hand-out (44,9 / 23,5 / 47,7 / 28,0).
- Emitir também `data/compas-derived.csv` (só colunas usadas: id anonimizado, race, decile_score, two_year_recid, c_charge_degree).
- **Reportar explicitamente** se algum número divergir do hand-out em mais de 0,5 p.p., com o valor obtido — não "consertar" filtros para bater. Se divergir de verdade, o hand-out é que será ajustado, não o contrário.
- Escrever `analysis/README.md` com critérios e comando de execução.

## Etapa 2 — Site (thread principal)

Antes de escrever qualquer código de gráfico, carregar as skills `dataviz` e `datavis` (paleta, tipografia, o que remover). Sem `sns.set_theme()`, sem rcParams inline — style global já configurado.

Gráficos: **SVG inline gerado por JS** a partir do `metrics.json` (nítido em projetor, escala em celular, tema claro/escuro). Sem biblioteca de charting — são 4 formas simples, escritas à mão.

### `index.html` — narrativa

1. **Hero** — "Um algoritmo pode ser justo e injusto ao mesmo tempo?" + subtítulo com contexto de 1 frase.
2. **O que é o COMPAS** — questionário → escore 1–10 → fiança/liberdade/sentença. Destaque: *raça não é uma das perguntas*.
3. **Os dados** — 7.214 réus de Broward County, o que a ProPublica fez: comparou escore com o que aconteceu 2 anos depois. Aqui entra o link para a análise metodológica da ProPublica.
4. **Gráfico 1 — distribuição dos decis por raça.** Barras espelhadas / duas séries lado a lado, decis 1–10. Leitura óbvia: réus brancos concentram nos escores baixos, réus negros espalham quase uniformemente. Anotação em texto no próprio gráfico dizendo o que olhar.
5. **A acusação — waffle de 100 pessoas.** Dois pares de icon arrays: entre quem **não** reincidiu, quantos foram marcados alto risco (44,9% vs 23,5%); entre quem reincidiu, quantos foram marcados baixo risco (28,0% vs 47,7%). Ícones de pessoa, cor só na categoria de erro, resto em cinza. Rótulos em número absoluto e %, ambos.
6. **A defesa da Northpointe** — em prosa, com o número-chave (entre os classificados alto risco, ~7 em 10 reincidem, igual nos dois grupos). Link "veja a curva de calibração →" para `mais-informacoes.html`.
7. **Widget interativo — por que os dois estão certos.** Slider de taxa-base do Grupo 2 (10%→70%), mantendo calibração fixa em 70% de PPV; atualiza em tempo real FPR e FNR dos dois grupos e mostra que só coincidem quando as taxas-base coincidem. Uma frase de legenda: "calibração igual + taxas-base diferentes ⇒ taxas de erro necessariamente diferentes". Estado inicial = os 30/100 e 60/100 do hand-out.
8. **Tarefa em grupo** — as 3 perguntas do hand-out, formatadas para leitura no celular.
9. **Fontes** (rodapé, em ordem):
   - Reportagem: https://www.propublica.org/article/machine-bias-risk-assessments-in-criminal-sentencing
   - Metodologia: https://www.propublica.org/article/how-we-analyzed-the-compas-recidivism-algorithm
   - Resposta da Northpointe: https://embed.documentcloud.org/documents/2998391-ProPublica-Commentary-Final-070616/
   - Dados: repo `propublica/compas-analysis`.
   - Citação: Angwin, Larson, Mattu & Kirchner (2016).

### `mais-informacoes.html` — aba técnica

Mesmo CSS, link de volta para a narrativa.
- **Curva de calibração**: taxa observada de reincidência (eixo y) por decil (eixo x), duas linhas + faixa de IC. Ponto: as linhas praticamente se sobrepõem.
- **Matrizes de confusão** lado a lado, contagens brutas, com FPR/FNR/PPV derivados anotados abaixo de cada uma.
- **Metodologia**: filtros aplicados, ponto de corte, limitações (proxy de reincidência = nova prisão, não novo crime; viés de policiamento).
- Link para `analysis/build_metrics.py` e para o CSV derivado.

## Etapa 3 — QR code

- `pip install segno` no env `eda` (ausente hoje; `qrencode` e `qrcode` também ausentes).
- Gerar `assets/qr-compas-handout.png` (alta resolução, ~1200px, quiet zone default, correção de erro **M**) e `.svg`, apontando para `https://joseluizn.github.io/compas-handout/`.
- Script `analysis/make_qr.py` para regenerar.
- Entregar o PNG ao usuário via SendUserFile, junto com a URL em texto. **Nenhum slide é editado** — o usuário insere o QR no deck depois. Recomendação: colocar a URL escrita ao lado do QR no slide, como fallback para quem não conseguir escanear.

## Etapa 4 — Publicação

1. Verificar visibilidade do repo: `gh repo view joseluizn/compas-handout --json visibility`. GitHub Pages em repo privado exige plano pago → se privado, **confirmar com o usuário** antes de tornar público.
2. Commit inicial em `main` (mensagem em inglês, Conventional Commits) e push. `.nojekyll` incluído.
3. Habilitar Pages a partir de `main` / raiz:
   `gh api repos/joseluizn/compas-handout/pages -X POST -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/'`
4. Aguardar o build e confirmar HTTP 200 na URL final. **Só gerar o QR definitivo depois da URL responder 200.**

## Etapa 5 — Verificação (subagente **Haiku**)

Checklist mecânico, um subagente, retorna PASS/FAIL por item:
- Todo número exibido no HTML existe em `data/metrics.json` (nada hard-coded divergente).
- FPR/FNR do `metrics.json` batem com o hand-out dentro de 0,5 p.p.; matrizes de confusão são internamente consistentes (TP+FP+TN+FN = n; FPR = FP/(FP+TN); etc.).
- Zero referências a hosts externos no HTML/CSS/JS (grep por `http://`, `https://`, `//cdn`) exceto os 4 links de fonte no rodapé — nenhum `src`/`href` de asset apontando para fora.
- Todos os links de fonte respondem 200 (curl -I).
- QR decodifica para a URL exata: `pip install opencv-python-headless` no `eda`, `cv2.QRCodeDetector` (evita dependência de sistema do zbar).
- Página carrega sem erro de console e sem 404 de asset em caminhos relativos (paths relativos, não absolutos — subpath `/compas-handout/` quebra paths com `/` inicial).
- Legibilidade em viewport de celular (375px): sem scroll horizontal.

## Verificação manual (usuário)

1. Abrir `https://joseluizn.github.io/compas-handout/` no celular e escanear o QR do slide.
2. Conferir os 4 gráficos e mexer no slider.
3. Abrir "Mais informações" e voltar.
4. Testar em modo escuro.

## Riscos / notas

- Números do hand-out são os da ProPublica; se a reprodução divergir, o plano é reportar, não mascarar.
- Reprodução dos dados é uso acadêmico; dados originais são públicos (repo da ProPublica) — creditar explicitamente no README e no rodapé.
- Nota de escopo: este arquivo de plano vive em `~/.claude/plans/` (única gravação permitida em plan mode). Na execução, copio o plano para `~/reps/compas-handout/plan.md` conforme pedido.
