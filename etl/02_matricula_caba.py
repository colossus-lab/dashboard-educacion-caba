"""ETL Matrícula Escolar CABA 2024 → JSON.

Input: data/raw/caba/matricula-escolar/matricula_2024.csv
Estructura del CSV: header multi-fila (filas 3-5), separador ';', formato es-AR
("906.406" = 906406, "52,1" = 52.1, "`-" = sin dato).

Output: data/processed/matricula_caba_2024.json
  [{tipo_oferta, modalidad, nivel, total_matricula, total_mujeres_pct,
    estatal_matricula, estatal_mujeres_pct, privado_matricula, privado_mujeres_pct}]
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "raw" / "caba" / "matricula-escolar" / "matricula_2024.csv"
OUT = ROOT / "data" / "processed" / "matricula_caba_2024.json"


def parse_int(v: str):
    if v is None: return None
    s = v.strip().replace("﻿", "")
    if s in ("", "-", "`-", "—", "..."): return None
    s = s.replace(".", "").replace(" ", "")
    try: return int(s)
    except ValueError: return None


def parse_float(v: str):
    if v is None: return None
    s = v.strip().replace("﻿", "")
    if s in ("", "-", "`-", "—", "..."): return None
    s = s.replace(".", "").replace(",", ".")
    try: return float(s)
    except ValueError: return None


def main():
    rows = []
    with open(SRC, encoding="utf-8-sig") as f:
        reader = csv.reader(f, delimiter=";")
        all_rows = list(reader)

    data_rows = all_rows[6:]
    last_tipo = ""
    last_modalidad = ""

    for r in data_rows:
        if not r or all(not c.strip() for c in r):
            continue
        tipo = r[0].strip()
        modalidad = r[1].strip()
        nivel = r[2].strip() if len(r) > 2 else ""

        if tipo: last_tipo = tipo
        if modalidad: last_modalidad = modalidad

        if not nivel and not modalidad and not tipo:
            continue

        # cols (0-based): 3 total_matricula, 4 total_muj_%, 5 est_mat, 6 est_muj_%, 7 priv_mat, 8 priv_muj_%
        rec = {
            "tipo_oferta": last_tipo,
            "modalidad": last_modalidad if modalidad else last_modalidad,
            "nivel": nivel or "Total",
            "total_matricula": parse_int(r[3] if len(r) > 3 else ""),
            "total_mujeres_pct": parse_float(r[4] if len(r) > 4 else ""),
            "estatal_matricula": parse_int(r[5] if len(r) > 5 else ""),
            "estatal_mujeres_pct": parse_float(r[6] if len(r) > 6 else ""),
            "privado_matricula": parse_int(r[7] if len(r) > 7 else ""),
            "privado_mujeres_pct": parse_float(r[8] if len(r) > 8 else ""),
        }
        if rec["total_matricula"] is None:
            continue
        rows.append(rec)

    OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Filas extraídas: {len(rows)}")
    print(f"Output: {OUT}")
    total_general = next((r for r in rows if r["tipo_oferta"].lower() == "total"), None)
    if total_general:
        print(f"  Matrícula total CABA 2024: {total_general['total_matricula']:,}")
        print(f"  % Mujeres: {total_general['total_mujeres_pct']}")


if __name__ == "__main__":
    main()
