"""ETL Educación Sexual Integral CABA → JSON.

Inputs:
  - ESI_estudiantes_2024_.xlsx (estudiantes alcanzados por nivel/sector)
  - ESI_unidades_educativas_2024.xlsx (unidades educativas con ESI)
  - ESI_docentes_2024.xlsx (1 número total)
  - jurisdiccionales-de-educacion-sexual-integral/datos_esi_{2018..2021}.csv

Output: data/processed/esi.json
"""
from __future__ import annotations
import csv
import json
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "raw" / "caba"
OUT = ROOT / "data" / "processed" / "esi.json"


def parse_estudiantes_o_unidades(path: Path, value_label: str) -> list[dict]:
    """Parser común para los XLSX que tienen estructura jerárquica:
    - row 6+ = data with Total/Estatal/Privado.
    """
    df = pd.read_excel(path, header=None)
    rows = []
    for i in range(6, len(df)):
        row = df.iloc[i]
        nivel = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else None
        if not nivel or nivel == "nan":
            continue
        try:
            total = int(row.iloc[3]) if pd.notna(row.iloc[3]) else None
            estatal = int(row.iloc[4]) if pd.notna(row.iloc[4]) else None
            privado = int(row.iloc[5]) if pd.notna(row.iloc[5]) else None
        except (ValueError, TypeError):
            continue
        if total is None: continue
        rows.append({"nivel": nivel, "total": total, "estatal": estatal, "privado": privado})
    return rows


def main():
    estudiantes = parse_estudiantes_o_unidades(
        SRC / "educacion-sexual-integral" / "ESI_estudiantes_2024_.xlsx",
        "alumnos",
    )
    unidades = parse_estudiantes_o_unidades(
        SRC / "educacion-sexual-integral" / "ESI_unidades_educativas_2024.xlsx",
        "unidades",
    )

    docentes_df = pd.read_excel(SRC / "educacion-sexual-integral" / "ESI_docentes_2024.xlsx")
    docentes_total = int(docentes_df.iloc[0, 1]) if len(docentes_df) > 0 else None

    jurisdic_dir = SRC / "jurisdiccionales-de-educacion-sexual-integral"
    jurisdic = {}
    for f in sorted(jurisdic_dir.glob("*.csv")):
        try:
            with open(f, encoding="utf-8-sig", errors="replace") as fh:
                reader = csv.reader(fh, delimiter=";")
                rows = list(reader)
            if not rows: continue
            anio = None
            for tok in f.stem.replace("_", " ").split():
                if tok.isdigit() and len(tok) == 4:
                    anio = int(tok); break
            if not anio: continue
            jurisdic[anio] = {
                "filename": f.name,
                "rows": len(rows),
                "headers": rows[0][:6] if rows else [],
            }
        except Exception as e:
            print(f"  warn {f.name}: {e}")

    data = {
        "anio_actual": 2024,
        "estudiantes": estudiantes,
        "unidades": unidades,
        "docentes_capacitados_total": docentes_total,
        "evolucion_jurisdiccional_metadata": jurisdic,
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Estudiantes (niveles): {len(estudiantes)}")
    print(f"Unidades (niveles): {len(unidades)}")
    print(f"Docentes capacitados: {docentes_total:,}" if docentes_total else "Docentes: ?")
    print(f"Output: {OUT}")


if __name__ == "__main__":
    main()
