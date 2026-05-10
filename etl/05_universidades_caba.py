"""ETL Universidades CABA → GeoJSON normalizado.

Input: data/raw/caba/universidades/universidades.geojson (ya en CRS84/WGS84).
Output: data/processed/universidades_caba.geojson (normalizado y servible).
"""
from __future__ import annotations
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "raw" / "caba" / "universidades" / "universidades.geojson"
OUT = ROOT / "data" / "processed" / "universidades_caba.geojson"


def _s(v):
    if v is None: return None
    s = str(v).strip()
    return None if s in ("", "nan", "None", "null") else s


def main():
    src = json.loads(SRC.read_text(encoding="utf-8"))
    feats_out = []
    for feat in src.get("features", []):
        props = feat.get("properties", {})
        comuna_raw = _s(props.get("comuna")) or ""
        m = re.search(r"\d+", comuna_raw)
        comuna_num = int(m.group()) if m else None
        feats_out.append({
            "type": "Feature",
            "geometry": feat.get("geometry"),
            "properties": {
                "id": props.get("id"),
                "nombre": _s(props.get("nombre")),
                "unidad_aca": _s(props.get("unidad_aca")),
                "sede": _s(props.get("sede")),
                "direccion": _s(props.get("dirreccion")) or _s(props.get("direccion")),
                "barrio": _s(props.get("barrio")),
                "comuna": comuna_num,
                "telefono": _s(props.get("telefono")),
                "web": _s(props.get("web")),
            },
        })
    out = {"type": "FeatureCollection", "features": feats_out}
    OUT.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print(f"Universidades: {len(feats_out)}")
    print(f"Output: {OUT} ({OUT.stat().st_size:,} B)")


if __name__ == "__main__":
    main()
