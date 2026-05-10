"""ETL Datos históricos CABA (acceso a credenciales 1960-2017) → JSON.

Input: datos_caba/datasets/acceso-credenciales-educativas/*.csv
Output: data/processed/historicos_caba.json
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = Path(
    r"C:\Users\dante\Desktop\Laboratorio Colossus\Pipeline OpenArg\datos_caba"
    r"\datasets\acceso-credenciales-educativas"
)
OUT = ROOT / "data" / "processed" / "historicos_caba.json"


def read_csv(path: Path) -> list[dict]:
    rows = []
    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append({k: v for k, v in r.items() if k})
    return rows


def main():
    out = {}

    esp = read_csv(BASE / "años-de-escolaridad-esperados-(csv).csv")
    out["esperanza_vida_escolar"] = [
        {"anio": int(r["anio"]), "sexo": r["sexo"], "valor": float(r["esp_vida_escolar"])}
        for r in esp
    ]

    bre = read_csv(BASE / "brecha-de-analfabetismo-(csv).csv")
    out["brecha_analfabetismo"] = [
        {"anio": int(r["anio"]), "valor": float(r["brecha_analfabetismo"])}
        for r in bre
    ]

    tasa = read_csv(BASE / "tasa-neta-de-escolarización-(csv).csv")
    nivel_key = next(k for k in tasa[0] if "nivel" in k.lower())
    out["tasa_escolarizacion"] = [
        {
            "anio": int(r["anio"]),
            "sexo": r["sexo"],
            "tasa": float(r["tasa_escolarizacion"]),
            "nivel": r[nivel_key],
        }
        for r in tasa
    ]

    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"esperanza_vida_escolar: {len(out['esperanza_vida_escolar'])}")
    print(f"brecha_analfabetismo: {len(out['brecha_analfabetismo'])}")
    print(f"tasa_escolarizacion: {len(out['tasa_escolarizacion'])}")
    print(f"Output: {OUT}")


if __name__ == "__main__":
    main()
