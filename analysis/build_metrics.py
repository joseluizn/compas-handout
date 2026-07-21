"""Reproduz a análise da ProPublica (Broward County, COMPAS) e emite data/metrics.json.

Uso:
    source ~/miniconda3/etc/profile.d/conda.sh && conda activate eda
    python analysis/build_metrics.py

Determinístico: mesma entrada -> mesma saída.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "analysis" / "raw" / "compas-scores-two-years.csv"
OUT_JSON = ROOT / "data" / "metrics.json"
OUT_CSV = ROOT / "data" / "compas-derived.csv"
OUT_JS = ROOT / "js" / "metrics-data.js"

GROUPS = {"African-American": "negros", "Caucasian": "brancos"}
CUTOFF = 5  # decile_score >= 5 => "alto risco" (Medium/High no score_text)

# Números publicados no hand-out / na reportagem, para conferência.
HANDOUT = {
    "African-American": {"fpr": 44.9, "fnr": 28.0},
    "Caucasian": {"fpr": 23.5, "fnr": 47.7},
}


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    """IC de Wilson 95% para proporção."""
    if n == 0:
        return (float("nan"), float("nan"))
    p = k / n
    denom = 1 + z**2 / n
    center = (p + z**2 / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z**2 / (4 * n**2)) / denom
    return (max(0.0, center - half), min(1.0, center + half))


def load(strict_days_b: bool = False) -> pd.DataFrame:
    """Carrega a amostra da ProPublica.

    O arquivo `compas-scores-two-years.csv` já é distribuído com os filtros de
    qualidade da ProPublica aplicados (`is_recid != -1`, `c_charge_degree != 'O'`,
    `score_text != 'N/A'` são no-ops nele). A tabela de taxas de erro publicada na
    reportagem usa esse arquivo como está.

    `strict_days_b=True` aplica ainda o corte `days_b_screening_arrest` entre -30 e
    30 (usado pela ProPublica nas análises de regressão/sobrevivência) — reportado
    como análise de sensibilidade.
    """
    df = pd.read_csv(RAW)
    n_raw = len(df)
    df = df[
        (df["is_recid"] != -1)
        & (df["c_charge_degree"] != "O")
        & (df["score_text"] != "N/A")
    ]
    if strict_days_b:
        df = df[df["days_b_screening_arrest"].between(-30, 30)]
    n_propublica = len(df)
    df = df[df["race"].isin(GROUPS)].copy()
    df.attrs["n_raw"] = n_raw
    df.attrs["n_propublica"] = n_propublica
    return df


def group_block(g: pd.DataFrame) -> dict:
    high = g["decile_score"] >= CUTOFF
    recid = g["two_year_recid"] == 1
    tp = int((high & recid).sum())
    fp = int((high & ~recid).sum())
    fn = int((~high & recid).sum())
    tn = int((~high & ~recid).sum())
    n = tp + fp + fn + tn

    deciles = []
    for d in range(1, 11):
        cell = g[g["decile_score"] == d]
        k = int((cell["two_year_recid"] == 1).sum())
        nd = int(len(cell))
        lo, hi = wilson(k, nd)
        deciles.append(
            {
                "decile": d,
                "n": nd,
                "share": nd / n if n else 0.0,
                "recid_n": k,
                "recid_rate": (k / nd) if nd else None,
                "ci_low": None if nd == 0 else lo,
                "ci_high": None if nd == 0 else hi,
            }
        )

    return {
        "n": n,
        "base_rate": (tp + fn) / n,
        "confusion": {"tp": tp, "fp": fp, "fn": fn, "tn": tn},
        "fpr": fp / (fp + tn),
        "fnr": fn / (fn + tp),
        "ppv": tp / (tp + fp),
        "npv": tn / (tn + fn),
        "accuracy": (tp + tn) / n,
        "high_risk_share": (tp + fp) / n,
        "deciles": deciles,
    }


def main() -> None:
    df = load()
    metrics: dict = {
        "meta": {
            "source": "propublica/compas-analysis - compas-scores-two-years.csv",
            "n_raw": df.attrs["n_raw"],
            "n_after_propublica_filters": df.attrs["n_propublica"],
            "n_analysis": int(len(df)),
            "cutoff": CUTOFF,
            "outcome": "two_year_recid",
            "filters": [
                "is_recid != -1",
                "c_charge_degree != 'O'",
                "score_text != 'N/A'",
                "race em {African-American, Caucasian}",
            ],
        },
        "groups": {},
    }

    for race, label in GROUPS.items():
        metrics["groups"][label] = group_block(df[df["race"] == race])

    # Conferência contra o hand-out.
    check = []
    for race, label in GROUPS.items():
        for key in ("fpr", "fnr"):
            got = metrics["groups"][label][key] * 100
            want = HANDOUT[race][key]
            check.append(
                {
                    "group": label,
                    "metric": key,
                    "computed_pct": round(got, 2),
                    "handout_pct": want,
                    "diff_pp": round(got - want, 2),
                    "ok": abs(got - want) <= 0.5,
                }
            )
    metrics["handout_check"] = check

    # Sensibilidade: mesmo cálculo restringindo days_b_screening_arrest a [-30, 30].
    strict = load(strict_days_b=True)
    metrics["sensitivity_days_b_30"] = {
        "n_analysis": int(len(strict)),
        "groups": {
            label: {
                k: v
                for k, v in group_block(strict[strict["race"] == race]).items()
                if k in ("n", "base_rate", "fpr", "fnr", "ppv")
            }
            for race, label in GROUPS.items()
        },
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(metrics, indent=2, ensure_ascii=False)
    OUT_JSON.write_text(payload + "\n", encoding="utf-8")
    # Mesmo conteúdo como JS, para o site funcionar sem servidor HTTP (file://).
    OUT_JS.write_text(
        "// Gerado por analysis/build_metrics.py — não editar à mão.\n"
        f"window.METRICS = {payload};\n",
        encoding="utf-8",
    )

    derived = df[["id", "race", "decile_score", "score_text", "two_year_recid", "c_charge_degree"]].copy()
    derived["id"] = derived["id"].astype(str).map(
        lambda s: hashlib.sha256(("compas-handout:" + s).encode()).hexdigest()[:12]
    )
    derived = derived.rename(columns={"id": "id_anon"}).sort_values("id_anon")
    derived.to_csv(OUT_CSV, index=False)

    for row in check:
        flag = "OK " if row["ok"] else "DIVERGE"
        print(
            f"{flag} {row['group']:8s} {row['metric']}: "
            f"calculado {row['computed_pct']}% vs hand-out {row['handout_pct']}% "
            f"({row['diff_pp']:+} p.p.)"
        )
    print(f"\nn analise = {metrics['meta']['n_analysis']} "
          f"(apos filtros ProPublica: {metrics['meta']['n_after_propublica_filters']})")
    for label, blk in metrics["groups"].items():
        print(f"  {label}: n={blk['n']} base={blk['base_rate']:.3f} ppv={blk['ppv']:.3f}")


if __name__ == "__main__":
    main()
