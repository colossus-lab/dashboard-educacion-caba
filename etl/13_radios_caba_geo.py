"""Filtra el shapefile nacional de radios censales 2022 a CABA y produce GeoJSON WGS84.

Entrada:  datos_indec/geoestadistica/radio_censal/capa_radios_censales_extracted/radios_censales.shp
Salida:   data/processed/radios_caba.geojson

CABA = provincia código 02. Filtramos por LINK (id_geo) que arranca con "02".
"""
from __future__ import annotations
import os, sys, io
from pathlib import Path
import geopandas as gpd

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(r"C:\Users\dante\Desktop\Laboratorio Colossus\Pipeline OpenArg\datos_indec\geoestadistica\radio_censal\capa_radios_censales_extracted\radios_censales.shp")
OUT = ROOT / "data" / "processed" / "radios_caba.geojson"


def main() -> None:
    print(f"[radios geo] Leyendo {SRC.name} (puede tardar 30s)...", flush=True)
    gdf = gpd.read_file(SRC)
    print(f"[radios geo] Total radios país: {len(gdf):,}")
    print(f"[radios geo] Cols: {list(gdf.columns)}")
    print(f"[radios geo] CRS: {gdf.crs}")

    # Detectar columna LINK / id_geo
    link_col = None
    for cand in ("LINK", "link", "ID_GEO", "id_geo", "CODIGO", "codigo"):
        if cand in gdf.columns:
            link_col = cand; break
    if not link_col:
        # Probar primera columna que parezca un id largo
        for c in gdf.columns:
            sample = gdf[c].astype(str).iloc[0] if len(gdf) else ""
            if sample.isdigit() and len(sample) >= 8:
                link_col = c; break
    print(f"[radios geo] Columna LINK detectada: {link_col!r}")

    # Filtrar a CABA: id arranca con "02"
    gdf[link_col] = gdf[link_col].astype(str).str.zfill(9)
    caba = gdf[gdf[link_col].str.startswith("02")].copy()
    print(f"[radios geo] Radios CABA: {len(caba):,}")

    # Detectar columnas auxiliares
    cols_keep = {link_col: "radio_id"}
    for k_in, k_out in [("DEPTO", "departamento_id"), ("FRAC", "fraccion"),
                        ("RADIO", "radio_codigo"), ("TIPO", "tipo"),
                        ("NOMDEPTO", "comuna_raw")]:
        if k_in in caba.columns:
            cols_keep[k_in] = k_out

    keep = list(cols_keep.keys()) + ["geometry"]
    caba = caba[keep].rename(columns=cols_keep)

    # Reproyectar a WGS84 si necesario
    if caba.crs and str(caba.crs) != "EPSG:4326":
        print(f"[radios geo] Reproyectando {caba.crs} → EPSG:4326")
        caba = caba.to_crs("EPSG:4326")

    # Simplificar geometrías
    print("[radios geo] Simplificando geometrías (tol=0.00005°)...", flush=True)
    caba["geometry"] = caba["geometry"].simplify(0.00005, preserve_topology=True)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    if OUT.exists():
        OUT.unlink()
    caba.to_file(OUT, driver="GeoJSON")
    size_kb = OUT.stat().st_size / 1024
    print(f"[radios geo] Escrito {OUT}  ({size_kb:.0f} KB, {len(caba):,} features)")


if __name__ == "__main__":
    main()
