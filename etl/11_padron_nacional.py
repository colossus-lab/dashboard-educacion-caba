"""ETL Padrón Nacional → agregados por jurisdicción para comparativa CABA vs país.

Input: datos_abiertos/.../padrón-oficial-de-establecimientos-educativos.xlsx (~64K filas)
Output: data/processed/padron_jurisdiccional.json
  {
    total_pais: int,
    por_jurisdiccion: [
      {jurisdiccion, total, estatal, privado, urbano, rural, pct_estatal}
    ]
  }
"""
from __future__ import annotations
import json
import sys
from collections import defaultdict
from pathlib import Path
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(r"C:\Users\dante\Desktop\Laboratorio Colossus\Pipeline OpenArg\datos_abiertos\datasets\educacion\educacion-padron-oficial-establecimientos-educativos\padrón-oficial-de-establecimientos-educativos.xlsx")
OUT = ROOT / "data" / "processed" / "padron_jurisdiccional.json"


def main():
    print("Leyendo padrón nacional (puede tardar 30s)...")
    df = pd.read_excel(SRC, sheet_name="padron", header=12, dtype=str)
    df.columns = [c.strip() if isinstance(c, str) else c for c in df.columns]
    juris_col = next(c for c in df.columns if isinstance(c, str) and "jurisdic" in c.lower())
    sector_col = next(c for c in df.columns if isinstance(c, str) and c.lower() == "sector")
    ambito_col = next(c for c in df.columns if isinstance(c, str) and ("ámbito" in c.lower() or "ambito" in c.lower()))
    depto_col = next(c for c in df.columns if isinstance(c, str) and c.lower().startswith("departamento"))

    print(f"Filas: {len(df):,}")
    print(f"Cols: {juris_col!r} {sector_col!r} {ambito_col!r}")

    summary = defaultdict(lambda: {"total": 0, "estatal": 0, "privado": 0, "urbano": 0, "rural": 0})
    for _, row in df.iterrows():
        j = str(row.get(juris_col, "")).strip()
        if not j or j == "nan": continue
        s = str(row.get(sector_col, "")).strip().lower()
        a = str(row.get(ambito_col, "")).strip().lower()
        d = summary[j]
        d["total"] += 1
        if "estatal" in s: d["estatal"] += 1
        elif "privad" in s: d["privado"] += 1
        if "urbano" in a: d["urbano"] += 1
        elif "rural" in a: d["rural"] += 1

    rows = []
    for j, d in summary.items():
        rows.append({
            "jurisdiccion": j,
            **d,
            "pct_estatal": round(d["estatal"] / d["total"] * 100, 2) if d["total"] else 0,
            "pct_urbano": round(d["urbano"] / d["total"] * 100, 2) if d["total"] else 0,
        })
    rows.sort(key=lambda r: -r["total"])

    out = {"total_pais": sum(r["total"] for r in rows), "por_jurisdiccion": rows}
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nJurisdicciones: {len(rows)}")
    print(f"Total país: {out['total_pais']:,}")
    print(f"Top 3: {[r['jurisdiccion'] for r in rows[:3]]}")
    caba = next((r for r in rows if "buenos aires" in r["jurisdiccion"].lower() and "ciudad" in r["jurisdiccion"].lower()), None)
    if caba:
        rank = rows.index(caba) + 1
        print(f"CABA rank #{rank}: {caba['total']:,} estab ({caba['pct_estatal']}% estatal)")
    print(f"Output: {OUT}")


if __name__ == "__main__":
    main()
