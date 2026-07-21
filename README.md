# O caso COMPAS — hand-out visual

Site estático em pt-BR que acompanha a atividade em grupo sobre o conflito
ProPublica × Northpointe (COMPAS, Broward County).

**Site:** https://joseluizn.github.io/compas-handout/

## Estrutura

```
index.html              narrativa principal (scroll)
mais-informacoes.html   calibração, matrizes de confusão, metodologia
css/style.css
js/story.js             gráficos SVG gerados a partir dos dados
js/impossibility.js     widget do slider de taxa-base
js/metrics-data.js      números (gerado — não editar à mão)
data/metrics.json       números (gerado)
data/compas-derived.csv subconjunto usado, id anonimizado
analysis/build_metrics.py  script de reprodução
```

Sem framework, sem build, sem CDN: todos os assets são locais.

Nenhum número está escrito no HTML — tudo vem de `data/metrics.json`, produzido por
`analysis/build_metrics.py`. Ver `analysis/README.md` para os critérios e como rodar.

## Dados

Dados originais: [propublica/compas-analysis](https://github.com/propublica/compas-analysis),
publicados em domínio público pela ProPublica. Uso acadêmico, com crédito à reportagem
Angwin, J., Larson, J., Mattu, S., & Kirchner, L. (2016). "Machine Bias." ProPublica.

Código deste repositório: MIT.
