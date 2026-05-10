"""Genera una grilla regular CABA (cuadrículas indexadas por row/col) y le asigna
el radio_id correspondiente al radio que contiene el centroide de cada celda.

Similar a build_radios_hexgrid.py del Conurbano. Para CABA generamos la grilla
desde cero (no había una pre-existente).

Output: data/processed/radios_hexgrid_caba.geojson
"""
from __future__ import annotations
import json, sys, io
from pathlib import Path
import geopandas as gpd
from shapely.geometry import box, Point

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
RADIOS = ROOT / "data" / "processed" / "radios_caba.geojson"
OUT = ROOT / "data" / "processed" / "radios_hexgrid_caba.geojson"

# Bounds CABA (un poquito generoso)
MIN_LON, MAX_LON = -58.5310, -58.3350
MIN_LAT, MAX_LAT = -34.7050, -34.5260

# Cell size en grados — ~180 m
CELL_SIZE_DEG = 0.0018  # ≈200m


def main():
    print(f"[hex CABA] Generando grilla {CELL_SIZE_DEG}° (~{int(CELL_SIZE_DEG * 111000)}m)...", flush=True)

    radios = gpd.read_file(RADIOS)[["radio_id", "geometry"]]
    if radios.crs is None: radios = radios.set_crs("EPSG:4326")
    if str(radios.crs) != "EPSG:4326": radios = radios.to_crs("EPSG:4326")

    # Bounding box de los radios (para descartar celdas fuera del área urbana)
    radios_union = radios.unary_union if hasattr(radios, "unary_union") else radios.geometry.union_all()

    cells = []
    row_idx = 0
    lat = MIN_LAT
    while lat < MAX_LAT:
        col_idx = 0
        lon = MIN_LON
        while lon < MAX_LON:
            cell = box(lon, lat, lon + CELL_SIZE_DEG, lat + CELL_SIZE_DEG)
            cell_centroid = cell.centroid
            # Solo celdas dentro de CABA
            if radios_union.contains(cell_centroid):
                cells.append({
                    "row": row_idx, "col": col_idx,
                    "geometry": cell, "centroid": cell_centroid,
                })
            lon += CELL_SIZE_DEG
            col_idx += 1
        lat += CELL_SIZE_DEG
        row_idx += 1

    print(f"[hex CABA] Celdas en CABA: {len(cells):,}")

    # Spatial join centroide-en-radio
    centroids = gpd.GeoDataFrame(cells, geometry="centroid", crs="EPSG:4326")
    centroids_simple = centroids[["row", "col", "centroid"]].rename(columns={"centroid": "geometry"}).set_geometry("geometry")
    centroids_simple = gpd.GeoDataFrame(centroids_simple, geometry="geometry", crs="EPSG:4326")
    joined = gpd.sjoin(centroids_simple, radios, how="left", predicate="within")
    joined = joined.drop_duplicates(subset=["row", "col"], keep="first")

    # Mapa (row,col) → radio_id
    rmap: dict[tuple[int, int], str | None] = {}
    for _, r in joined.iterrows():
        rid = r.get("radio_id")
        rmap[(int(r["row"]), int(r["col"]))] = rid if isinstance(rid, str) else None

    n_match = sum(1 for v in rmap.values() if v)
    print(f"[hex CABA] Hex con radio asignado: {n_match:,}/{len(cells):,} ({100*n_match/len(cells):.1f}%)")

    out_features = []
    for c in cells:
        rid = rmap.get((c["row"], c["col"]))
        out_features.append({
            "type": "Feature",
            "geometry": c["geometry"].__geo_interface__,
            "properties": {
                "row": c["row"], "col": c["col"],
                "weight": 1.0,  # CABA = todo urbano
                "radio_id": rid,
            },
        })

    fc = {"type": "FeatureCollection", "features": out_features}
    OUT.write_text(json.dumps(fc, separators=(",", ":")), encoding="utf-8")
    size_mb = OUT.stat().st_size / 1024 / 1024
    print(f"[hex CABA] Escrito {OUT} ({size_mb:.2f} MB, {len(out_features):,} cells)")


if __name__ == "__main__":
    main()
