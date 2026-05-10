"""ETL Asistencia escolar CABA → JSON.

Inputs:
  - tas_asis_esc_cen_edad__sexo__annio_limpio.csv (tasa por edad/sexo/año)
  - cond_asis_esc_edad__sexo__annio__c_asist_limpio.csv (condición por edad/sexo/año)
  - cond_asis_24_sexo__annio__g_edad__c_asist_limpio.csv (igual pero por grupo edad >24)
  - prom_an_esc_sexo__annio_limpio.csv (promedio años de estudio 2003-2019 por sexo)

Output: data/processed/asistencia_caba.json
"""
from __future__ import annotations
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "raw" / "caba" / "asistencia-escolar"
OUT = ROOT / "data" / "processed" / "asistencia_caba.json"


def fnum(s):
    if s is None: return None
    s = str(s).strip()
    if s in ("", "-", ".", "..."): return None
    try: return float(s)
    except ValueError: return None


def fint(s):
    n = fnum(s)
    return int(n) if n is not None else None


def main():
    out = {}

    # Tasa de asistencia por edad
    rows = []
    with open(SRC / "tas_asis_esc_cen_edad__sexo__annio_limpio.csv", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            rows.append({
                "anio": int(r["anio"]),
                "edad": fnum(r["edad"]) if r["edad"] != "TOTAL" else None,
                "edad_label": r["edad"],
                "sexo": r["sexo"],
                "tasa": fnum(r["porc_asistencia_escolar"]),
            })
    out["tasa_por_edad"] = rows

    # Promedio años de estudio
    rows = []
    with open(SRC / "prom_an_esc_sexo__annio_limpio.csv", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            if not r.get("anio"): continue
            rows.append({
                "anio": int(r["anio"]),
                "sexo": r["sexo"],
                "promedio": fnum(r["promedio_anios_estudio"]),
            })
    out["promedio_anios_estudio"] = rows

    # Condición de asistencia por edad
    rows = []
    with open(SRC / "cond_asis_esc_edad__sexo__annio__c_asist_limpio.csv", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            rows.append({
                "anio": int(r["anio"]),
                "edad": fnum(r["edad"]),
                "sexo": r["sexo"],
                "personas": fint(r["cantidad_personas"]),
                "condicion": r["condicion_asist_escolar"],
            })
    out["condicion_por_edad"] = rows

    # Condición de asistencia por grupo de edad (incluye 25+)
    rows = []
    with open(SRC / "cond_asis_24_sexo__annio__g_edad__c_asist_limpio.csv", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            rows.append({
                "anio": int(r["anio"]),
                "grupo_edad": r["grupo_edad"],
                "sexo": r["sexo"],
                "personas": fint(r["cantidad_personas"]),
                "condicion": r["condicion_asist_escolar"],
            })
    out["condicion_por_grupo_edad"] = rows

    OUT.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    for k, v in out.items():
        print(f"  {k}: {len(v)} filas")
    print(f"Output: {OUT}")


if __name__ == "__main__":
    main()
