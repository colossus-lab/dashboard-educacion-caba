"""ETL Establecimientos Educativos CABA → GeoJSON WGS84 + JSON normalizado.

Input:  data/raw/caba/establecimientos-educativos/establecimientos_educativos.geojson  (EPSG:9498)
Output:
  - data/processed/establecimientos_caba.geojson  (WGS84, listo para Leaflet)
  - data/processed/establecimientos_caba.json     (lista plana sin geometry, para tablas)
  - data/processed/establecimientos_summary.json  (agregados por comuna/sector/nivel)
"""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

import geopandas as gpd

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "raw" / "caba" / "establecimientos-educativos" / "establecimientos_educativos.geojson"
OUT = ROOT / "data" / "processed"
OUT.mkdir(parents=True, exist_ok=True)


def main():
    print(f"Leyendo {SRC.name}...")
    gdf = gpd.read_file(SRC)
    print(f"  features: {len(gdf):,}")
    print(f"  CRS origen: {gdf.crs}")

    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:9498")
    gdf = gdf.to_crs("EPSG:4326")
    print(f"  CRS final: {gdf.crs}")

    keep = ["id", "cue", "anx", "fna", "nam", "ges", "nen_mde", "tip", "dep", "dir", "bar", "com"]
    keep = [c for c in keep if c in gdf.columns]
    gdf = gdf[keep + ["geometry"]].copy()

    gdf["com"] = gdf["com"].apply(lambda v: int(v) if v is not None and str(v).strip() not in ("", "nan", "None") else None)
    gdf["cue"] = gdf["cue"].apply(lambda v: int(v) if v is not None and str(v).strip() not in ("", "nan", "None") else None)

    geo_path = OUT / "establecimientos_caba.geojson"
    gdf.to_file(geo_path, driver="GeoJSON")
    print(f"  GeoJSON WGS84: {geo_path} ({geo_path.stat().st_size:,} B)")

    def _s(v):
        if v is None: return None
        s = str(v).strip()
        return None if s in ("", "nan", "None") else s

    rows = []
    for _, r in gdf.iterrows():
        pt = r.geometry
        rows.append({
            "id": int(r["id"]) if r["id"] is not None else None,
            "cue": r["cue"],
            "nombre": _s(r.get("nam")) or _s(r.get("fna")),
            "ges": _s(r.get("ges")),
            "nivel": _s(r.get("nen_mde")),
            "tipo": _s(r.get("tip")),
            "direccion": _s(r.get("dir")),
            "barrio": _s(r.get("bar")),
            "comuna": r["com"],
            "lat": pt.y if pt else None,
            "lon": pt.x if pt else None,
        })
    import math
    def _clean(v):
        if isinstance(v, float) and math.isnan(v): return None
        return v
    rows = [{k: _clean(v) for k, v in r.items()} for r in rows]

    flat_path = OUT / "establecimientos_caba.json"
    flat_path.write_text(json.dumps(rows, ensure_ascii=False, allow_nan=False), encoding="utf-8")
    print(f"  JSON plano: {flat_path} ({flat_path.stat().st_size:,} B)")

    by_comuna: dict[int, dict] = defaultdict(lambda: {"total": 0, "estatal": 0, "privado": 0, "otro": 0, "niveles": defaultdict(int)})
    by_sector: dict[str, int] = defaultdict(int)
    by_nivel: dict[str, int] = defaultdict(int)
    by_tipo: dict[str, int] = defaultdict(int)
    by_barrio: dict[str, int] = defaultdict(int)
    no_comuna = 0

    for r in rows:
        c = r["comuna"]
        if c is None:
            no_comuna += 1
        else:
            d = by_comuna[c]
            d["total"] += 1
            ges = str(r["ges"] or "").lower()
            if "estatal" in ges:
                d["estatal"] += 1
            elif "privad" in ges:
                d["privado"] += 1
            else:
                d["otro"] += 1
            if r["nivel"]:
                d["niveles"][r["nivel"]] += 1

        by_sector[r["ges"] or "Sin dato"] += 1
        by_nivel[r["nivel"] or "Sin dato"] += 1
        by_tipo[r["tipo"] or "Sin dato"] += 1
        if r["barrio"]:
            by_barrio[r["barrio"]] += 1

    summary = {
        "total": len(rows),
        "sin_comuna": no_comuna,
        "por_comuna": [
            {"comuna": k, "total": v["total"], "estatal": v["estatal"], "privado": v["privado"],
             "otro": v["otro"], "niveles": dict(v["niveles"])}
            for k, v in sorted(by_comuna.items())
        ],
        "por_sector": dict(by_sector),
        "por_nivel": dict(sorted(by_nivel.items(), key=lambda x: -x[1])),
        "por_tipo": dict(sorted(by_tipo.items(), key=lambda x: -x[1])),
        "por_barrio": dict(sorted(by_barrio.items(), key=lambda x: -x[1])),
    }
    sum_path = OUT / "establecimientos_summary.json"
    sum_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  Summary: {sum_path}")
    print(f"  Total: {len(rows)} | Sin comuna: {no_comuna} | Comunas: {len(by_comuna)}")


if __name__ == "__main__":
    main()
