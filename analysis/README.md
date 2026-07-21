# Análise — reprodução dos números da ProPublica

## Como rodar

```bash
source ~/miniconda3/etc/profile.d/conda.sh && conda activate eda
curl -o analysis/raw/compas-scores-two-years.csv \
  https://raw.githubusercontent.com/propublica/compas-analysis/master/compas-scores-two-years.csv
python analysis/build_metrics.py
```

Saídas (todas versionadas):

- `data/metrics.json` — todos os números usados no site (única fonte de verdade).
- `js/metrics-data.js` — mesmo conteúdo como `window.METRICS`, para o site funcionar sem
  servidor HTTP (`fetch` de JSON local é bloqueado em `file://`).
- `data/compas-derived.csv` — subconjunto das colunas usadas, com `id` anonimizado (SHA-256
  truncado).

`analysis/raw/` é gitignored.

## Critérios da análise

Reproduzem os da ProPublica ("How We Analyzed the COMPAS Recidivism Algorithm").

| Item | Critério |
|---|---|
| Fonte | `compas-scores-two-years.csv` do repo `propublica/compas-analysis` (7.214 registros) |
| Filtros | `is_recid != -1`, `c_charge_degree != 'O'`, `score_text != 'N/A'` |
| Grupos | `race in {African-American, Caucasian}` → 6.150 pessoas |
| "Alto risco" | `decile_score >= 5` (faixas Medium/High do próprio COMPAS) |
| Desfecho | `two_year_recid` — nova prisão em até dois anos |
| Erros | FPR = FP/(FP+TN) condicionando em quem **não** reincidiu; FNR = FN/(FN+TP) condicionando em quem reincidiu |
| Calibração | taxa observada de reincidência por decil, com IC de Wilson 95% |

## Sobre o filtro `days_b_screening_arrest`

A ProPublica descreve um corte de ±30 dias entre a avaliação e a prisão correspondente. Esse corte
é usado nas análises de regressão/sobrevivência, **não** na tabela de taxas de erro publicada na
reportagem. Aplicando-o, a amostra cai para 5.278 pessoas e as taxas ficam FPR 42,3% / 22,0% e
FNR 28,5% / 49,6% — mesmo padrão, números um a dois pontos diferentes.

Sem o corte, a reprodução bate com os números publicados dentro de 0,05 p.p.:

```
OK  negros   fpr: 44,85% vs publicado 44,9%
OK  negros   fnr: 27,99% vs publicado 28,0%
OK  brancos  fpr: 23,45% vs publicado 23,5%
OK  brancos  fnr: 47,72% vs publicado 47,7%
```

O bloco `handout_check` do `metrics.json` refaz essa conferência a cada execução; o bloco
`sensitivity_days_b_30` guarda a variante com o corte.
