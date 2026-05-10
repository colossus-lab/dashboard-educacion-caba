"""ETL Anuarios Estadísticos Educativos 2017-2023 → matrícula CABA por comuna y nivel.

Cada Anuario tiene un Capítulo 5 "Síntesis Jurisdiccional" con hoja "CABA" que contiene:
- Bloques por nivel (TOTAL educación común, Inicial, Primario, Secundario, Superior)
- Filas por jurisdicción CABA: TOTAL + Comuna 1-15
- Columnas: Unidades educativas, Unidades de servicio, Alumnos, %Estatal, Cargos, Horas

Output: data/processed/anuarios_caba.json
  {
    años: [2017, 2018, 2019, 2020, 2022, 2023],
    serie_jurisdiccional: [{anio, nivel, alumnos, unidades, pct_estatal, cargos}],
    serie_por_comuna: [{anio, nivel, comuna, alumnos, unidades, pct_estatal}],
  }
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent.parent
BASE = Path(r"C:\Users\dante\Desktop\Laboratorio Colossus\Pipeline OpenArg\datos_abiertos\datasets\educacion\educacion-anuario-estadisticos-educativos")
OUT = ROOT / "data" / "processed" / "anuarios_caba.json"

YEARS = [2017, 2018, 2019, 2020, 2022, 2023]  # 2021 no tiene síntesis jurisdiccional

NIVEL_KEYWORDS = {
    "Total Común": ["resumen jurisdiccional", "5.2.1. caba"],  # Header del bloque general
    "Inicial": ["nivel inicial"],
    "Primario": ["nivel primario"],
    "Secundario": ["nivel secundario"],
    "Superior": ["nivel superior", "snu", "superior no universitario"],
}


def find_sintesis_file(year: int) -> Path | None:
    base = BASE / f"anuario-estadístico-educativo-{year}_extracted"
    if not base.exists(): return None
    cands = list(base.rglob("*.xlsx"))
    cands = [p for p in cands if "MACOSX" not in str(p) and not p.name.startswith("._")]
    for p in cands:
        n = p.name.lower()
        if ("síntesis" in n or "sintesis" in n or "íntesis" in n or "ntesis" in n) and "jurisdic" in n:
            return p
    # fallback: último .xlsx con "5." y "jurisdic" o nombre que arranca con "5."
    for p in cands:
        if (p.name.startswith("5.") or " 5_" in str(p) or "Capítulo 5" in str(p)) and p.suffix == ".xlsx":
            return p
    return None


def to_num(v):
    if pd.isna(v): return None
    if isinstance(v, (int, float)): return float(v)
    s = str(v).strip().replace(",", ".")
    if not s or s in ("-", "."): return None
    try: return float(s)
    except ValueError: return None


def detect_blocks(df: pd.DataFrame) -> list[tuple[str, int]]:
    """Detecta bloques por nivel. Retorna [(nivel, header_row), ...]."""
    blocks = []
    for i, val in enumerate(df.iloc[:, 0]):
        if not isinstance(val, str): continue
        v = val.lower().strip()
        if "resumen jurisdiccional" in v:
            blocks.append(("Total Común", i))
        elif "nivel inicial" in v:
            blocks.append(("Inicial", i))
        elif "nivel primario" in v:
            blocks.append(("Primario", i))
        elif "nivel secundario" in v:
            blocks.append(("Secundario", i))
        elif "nivel superior" in v or "snu" in v:
            blocks.append(("Superior", i))
    return blocks


def parse_caba_sheet(path: Path, year: int) -> tuple[list, list]:
    df = pd.read_excel(path, sheet_name="CABA", header=None)
    blocks = detect_blocks(df)
    juris_rows = []
    comuna_rows = []
    for nivel, anchor_row in blocks:
        # buscar header en las próximas 5 filas
        header_row = None
        for j in range(anchor_row, min(anchor_row + 6, len(df))):
            cell = df.iloc[j, 0]
            if isinstance(cell, str) and "jurisdic" in cell.lower():
                header_row = j; break
        if header_row is None: continue
        # Las filas de datos son: TOTAL + Comuna 1..15 (16 filas)
        for k in range(header_row + 1, min(header_row + 17, len(df))):
            label = df.iloc[k, 0]
            if not isinstance(label, str): continue
            label = label.strip()
            unidades = to_num(df.iloc[k, 1]) if df.shape[1] > 1 else None
            alumnos = to_num(df.iloc[k, 3]) if df.shape[1] > 3 else None
            pct_estatal = to_num(df.iloc[k, 4]) if df.shape[1] > 4 else None
            cargos = to_num(df.iloc[k, 5]) if df.shape[1] > 5 else None
            if alumnos is None: continue
            row = {
                "anio": year,
                "nivel": nivel,
                "alumnos": int(alumnos),
                "unidades": int(unidades) if unidades else None,
                "pct_estatal": pct_estatal,
                "cargos": int(cargos) if cargos else None,
            }
            if label.upper() == "TOTAL":
                juris_rows.append(row)
            else:
                m = re.search(r"comuna\s*(\d+)", label, re.I)
                if m:
                    row["comuna"] = int(m.group(1))
                    comuna_rows.append(row)
    return juris_rows, comuna_rows


def main():
    all_juris = []
    all_comuna = []
    for year in YEARS:
        path = find_sintesis_file(year)
        if not path:
            print(f"[{year}] NO file"); continue
        try:
            j, c = parse_caba_sheet(path, year)
            all_juris.extend(j)
            all_comuna.extend(c)
            print(f"[{year}] {path.name[:60]} -> {len(j)} jurisdic, {len(c)} comuna")
        except Exception as e:
            print(f"[{year}] ERR: {e}")

    out = {
        "anios": YEARS,
        "serie_jurisdiccional": all_juris,
        "serie_por_comuna": all_comuna,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print(f"\nTotal: {len(all_juris)} jurisdic + {len(all_comuna)} comuna")
    print(f"Output: {OUT}")


if __name__ == "__main__":
    main()
