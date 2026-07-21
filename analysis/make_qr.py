"""Gera o QR code do site (PNG alta resolução + SVG).

Uso:
    source ~/miniconda3/etc/profile.d/conda.sh && conda activate eda
    python analysis/make_qr.py
"""

from pathlib import Path

import segno

URL = "https://joseluizn.github.io/compas-handout/"
OUT = Path(__file__).resolve().parent.parent / "assets"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    qr = segno.make(URL, error="m")
    qr.save(OUT / "qr-compas-handout.png", scale=40, border=4, dark="#000000", light="#ffffff")
    qr.save(OUT / "qr-compas-handout.svg", scale=10, border=4)
    print("QR gerado para", URL, "->", qr.designator)


if __name__ == "__main__":
    main()
