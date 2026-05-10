"""ETL Boleto Estudiantil 2024 → JSON.

Beneficiarios por nivel + total.
"""
from __future__ import annotations
import json
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "raw" / "caba" / "boleto-estudiantil" / "beneficiarios_boleto_estudiantil_2024.xlsx"
OUT = ROOT / "data" / "processed" / "boleto_estudiantil.json"


def main():
    # Layout: col 1 = Nivel, col 2 = Beneficiarios; data starts at row 4 (0-indexed)
    df = pd.read_excel(SRC, header=None)
    rows = []
    total_xlsx = None
    for i in range(4, len(df)):
        nivel = df.iloc[i, 1]
        ben = df.iloc[i, 2]
        if pd.isna(nivel) or pd.isna(ben):
            continue
        nivel_s = str(nivel).strip()
        try: ben_int = int(ben)
        except (ValueError, TypeError): continue
        if nivel_s.upper() == "TOTAL":
            total_xlsx = ben_int
            continue
        rows.append({"nivel": nivel_s, "beneficiarios": ben_int})

    total = total_xlsx if total_xlsx else sum(r["beneficiarios"] for r in rows)
    data = {"anio": 2024, "total": total, "por_nivel": rows}
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Total beneficiarios: {total:,}")
    print(f"Niveles: {[(r['nivel'], r['beneficiarios']) for r in rows]}")
    print(f"Output: {OUT}")


if __name__ == "__main__":
    main()
