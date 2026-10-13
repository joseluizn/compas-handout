# O caso COMPAS — hand-out visual

Site estático em pt-BR que acompanha a atividade em grupo sobre o conflito
ProPublica × Northpointe (COMPAS, Broward County).

**Site:** https://joseluizn.github.io/compas-handout/

## Estrutura

```
index.html              1. O caso: o COMPAS e a acusação da ProPublica
metodologia.html        2. Metodologia: como a ProPublica montou a análise
dados.html              3. Dados: distribuição dos escores e taxas de erro por grupo
defesa.html             4. Defesa: a resposta da Northpointe (calibração)
painel.html             5. Painel de experimento: slider de taxa-base
mais-informacoes.html   calibração, matrizes de confusão, metodologia (linkada em todas as páginas)
css/style.css
js/story.js             gráficos SVG e números do texto, a partir dos dados
js/impossibility.js     widget do slider de taxa-base (painel.html)
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
