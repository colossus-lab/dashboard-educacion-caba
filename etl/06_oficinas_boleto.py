"""ETL Oficinas Boleto Estudiantil CABA → GeoJSON.

Input: data/raw/caba/boleto-estudiantil/oficinas-boleto-estudiantil.csv
       (lat/lng en formato es-AR con coma decimal)
Output: data/processed/oficinas_boleto.geojson
"""
from __future__ import annotations
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "raw" / "caba" / "boleto-estudiantil" / "oficinas-boleto-estudiantil.csv"
OUT = ROOT / "data" / "processed" / "oficinas_boleto.geojson"


def fnum(s):
    if not s: return None
    try: return float(str(s).replace(",", "."))
    except ValueError: return None


def main():
    feats = []
    with open(SRC, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=";")
        for r in reader:
            lat = fnum(r.get("lat"))
            lng = fnum(r.get("lng"))
            if lat is None or lng is None:
                continue
            feats.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lng, lat]},
                "properties": {
                    "linea": r.get("linea", "").strip(),
                    "empresa": r.get("empresa", "").strip(),
                    "horario": (r.get("dias y horario") or "").strip(),
                    "direccion": (r.get("direccion_normalizada") or "").strip(),
                    "barrio": (r.get("barrio") or "").strip(),
                    "comuna": int(r["comuna"]) if (r.get("comuna") or "").strip().isdigit() else None,
                },
            })

    # Dedupe por (direccion, empresa) — el CSV tiene duplicados (varias líneas mismo punto)
    seen: dict[tuple, dict] = {}
    for f in feats:
        key = (f["properties"]["direccion"], f["properties"]["empresa"])
        if key in seen:
            seen[key]["properties"]["lineas"] = (
                seen[key]["properties"].get("lineas", []) + [f["properties"]["linea"]]
            )
        else:
            f["properties"]["lineas"] = [f["properties"]["linea"]]
            seen[key] = f

    out_feats = list(seen.values())
    for f in out_feats:
        f["properties"]["lineas"] = ", ".join(sorted(set(f["properties"]["lineas"])))
        del f["properties"]["linea"]

    out = {"type": "FeatureCollection", "features": out_feats}
    OUT.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print(f"Oficinas únicas: {len(out_feats)} (de {len(feats)} filas brutas)")
    print(f"Output: {OUT}")


if __name__ == "__main__":
    main()
