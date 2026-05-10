"""ETL Padrón Oficial de Establecimientos Educativos → CABA only → JSON.

Input: Padrón nacional 64k filas, filtra Jurisdicción == "Ciudad de Buenos Aires" (~2745 escuelas).
Output:
  - data/processed/padron_caba.json        (todas las escuelas CABA, normalizadas)
  - data/processed/padron_caba_summary.json (agregados por comuna/sector/nivel)
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(
    r"C:\Users\dante\Desktop\Laboratorio Colossus\Pipeline OpenArg\datos_abiertos"
    r"\datasets\educacion\educacion-padron-oficial-establecimientos-educativos"
    r"\padrón-oficial-de-establecimientos-educativos.xlsx"
)
OUT = ROOT / "data" / "processed"
OUT.mkdir(parents=True, exist_ok=True)


def normalize_comuna(dep: str) -> int | None:
    if not isinstance(dep, str):
        return None
    m = re.search(r"comuna\s*0*(\d+)", dep, re.I)
    return int(m.group(1)) if m else None


def to_bool(v) -> bool:
    if pd.isna(v):
        return False
    s = str(v).strip().lower()
    return s in {"x", "1", "si", "sí", "true", "verdadero"}


def main():
    print(f"Leyendo {SRC.name}...")
    df = pd.read_excel(SRC, dtype=str)
    print(f"Filas totales: {len(df):,}")
    print(f"Columnas: {list(df.columns)}")

    df.columns = [c.strip() for c in df.columns]
    juris_col = next(c for c in df.columns if "jurisdic" in c.lower())
    caba = df[df[juris_col].str.contains("Ciudad de Buenos Aires", case=False, na=False)].copy()
    print(f"CABA: {len(caba):,}")

    col_map = {}
    for c in caba.columns:
        cl = c.lower().strip()
        if "sector" in cl: col_map["sector"] = c
        elif "ámbito" in cl or "ambito" in cl: col_map["ambito"] = c
        elif "departamento" == cl or cl.startswith("departamento"): col_map["departamento"] = c
        elif "localidad" == cl: col_map["localidad"] = c
        elif "cueanexo" in cl or "cue anexo" in cl: col_map["cue"] = c
        elif "nombre" in cl: col_map["nombre"] = c
        elif "domicilio" in cl: col_map["domicilio"] = c
        elif "código postal" in cl or "codigo postal" in cl: col_map["cp"] = c
        elif cl == "teléfono" or cl == "telefono": col_map["telefono"] = c
        elif cl == "email" or cl == "e-mail": col_map["email"] = c

    print(f"Mapeo columnas core: {col_map}")

    nivel_cols = [c for c in caba.columns if c not in col_map.values() and c != juris_col]
    nivel_cols = [c for c in nivel_cols if "código" not in c.lower() and "codigo" not in c.lower()]

    schools = []
    for _, row in caba.iterrows():
        comuna = normalize_comuna(row.get(col_map.get("departamento"), ""))
        ofertas = [c for c in nivel_cols if to_bool(row.get(c))]
        schools.append({
            "cue": str(row.get(col_map.get("cue"), "")).strip(),
            "nombre": str(row.get(col_map.get("nombre"), "")).strip(),
            "sector": str(row.get(col_map.get("sector"), "")).strip(),
            "ambito": str(row.get(col_map.get("ambito"), "")).strip(),
            "comuna": comuna,
            "comunaLabel": str(row.get(col_map.get("departamento"), "")).strip(),
            "domicilio": str(row.get(col_map.get("domicilio"), "")).strip(),
            "cp": str(row.get(col_map.get("cp"), "")).strip(),
            "telefono": str(row.get(col_map.get("telefono"), "")).strip(),
            "email": str(row.get(col_map.get("email"), "")).strip(),
            "ofertas": ofertas,
        })

    out_path = OUT / "padron_caba.json"
    out_path.write_text(json.dumps(schools, ensure_ascii=False), encoding="utf-8")
    print(f"Escrito {out_path} ({out_path.stat().st_size:,} B)")

    by_comuna: dict[int, dict] = {}
    by_sector = {"Estatal": 0, "Privado": 0, "Social y privado": 0, "Otro": 0}
    by_oferta_count: dict[str, int] = {}
    no_comuna = 0

    for s in schools:
        c = s["comuna"]
        if c is None:
            no_comuna += 1
        else:
            d = by_comuna.setdefault(c, {"total": 0, "estatal": 0, "privado": 0, "ofertas": {}})
            d["total"] += 1
            sect = s["sector"].lower()
            if "estatal" in sect: d["estatal"] += 1
            elif "privado" in sect: d["privado"] += 1
            for o in s["ofertas"]:
                d["ofertas"][o] = d["ofertas"].get(o, 0) + 1

        sect = s["sector"]
        if sect in by_sector: by_sector[sect] += 1
        else: by_sector["Otro"] += 1

        for o in s["ofertas"]:
            by_oferta_count[o] = by_oferta_count.get(o, 0) + 1

    summary = {
        "total": len(schools),
        "sin_comuna": no_comuna,
        "por_comuna": [
            {"comuna": k, **v} for k, v in sorted(by_comuna.items())
        ],
        "por_sector": by_sector,
        "por_oferta": dict(sorted(by_oferta_count.items(), key=lambda x: -x[1])),
    }
    sum_path = OUT / "padron_caba_summary.json"
    sum_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Escrito {sum_path}")
    print(f"  Comunas con datos: {len(by_comuna)}")
    print(f"  Total escuelas: {len(schools):,}")
    print(f"  Sin comuna identificable: {no_comuna}")
    print(f"  Por sector: {by_sector}")


if __name__ == "__main__":
    main()
