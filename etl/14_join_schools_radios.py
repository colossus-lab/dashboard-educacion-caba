"""Spatial join: cada escuela CABA → radio censal que la contiene + indicadores.

Entradas:
  data/processed/establecimientos_caba.geojson   (2.767 escuelas WGS84, ya geocodificadas)
  data/processed/radios_caba.geojson             (3.820 radios WGS84)
  data/processed/caba_radios_censo.json          (métricas por radio + score + decil)

Salida:
  data/processed/schools_caba_enriched.geojson   (escuelas + indicadores del radio)
"""
from __future__ import annotations
import os, sys, io, json
from pathlib import Path
import geopandas as gpd
import pandas as pd

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "processed"
SCHOOLS = DATA / "establecimientos_caba.geojson"
RADIOS_GEO = DATA / "radios_caba.geojson"
RADIOS_DATA = DATA / "caba_radios_censo.json"
OUT = DATA / "schools_caba_enriched.geojson"

INDICATOR_KEYS = [
    "pct_sin_instruccion", "pct_secundario_completo", "pct_superior_completo",
    "tasa_nunca_asistio", "nbi_pct", "privacion_material_pct", "hacinamiento_pct",
    "vulnerability_score", "vulnerability_decile",
]


def main() -> None:
    print("[join] Leyendo capas...", flush=True)
    schools = gpd.read_file(SCHOOLS)
    radios = gpd.read_file(RADIOS_GEO)[["radio_id", "geometry"]]
    payload = json.loads(RADIOS_DATA.read_text(encoding="utf-8"))
    radios_idx = payload["radios"]
    print(f"[join] Schools: {len(schools):,}  Radios: {len(radios):,}  Indicators: {len(radios_idx):,}")

    if schools.crs is None: schools = schools.set_crs("EPSG:4326")
    if radios.crs is None: radios = radios.set_crs("EPSG:4326")
    if str(schools.crs) != "EPSG:4326": schools = schools.to_crs("EPSG:4326")
    if str(radios.crs) != "EPSG:4326": radios = radios.to_crs("EPSG:4326")

    print("[join] Spatial join (within)...", flush=True)
    joined = gpd.sjoin(schools, radios, how="left", predicate="within")
    # En bordes de polígonos, deduplicar por id
    joined = joined.drop_duplicates(subset=["id"], keep="first").reset_index(drop=True)

    n_null = joined["radio_id"].isna().sum()
    print(f"[join] Sin radio (fuera de polígonos): {n_null:,}  ({100 * n_null / len(joined):.2f}%)")

    # Si quedó alguna sin radio (escuela en límite o lat/lng en mar), buscar por nearest
    if n_null > 0:
        miss = joined[joined["radio_id"].isna()].copy()
        ok = joined[joined["radio_id"].notna()].copy()
        print(f"[join] Asignando por nearest a las {len(miss)} restantes...")
        # Reprojectar a un CRS métrico para nearest correcto
        miss_m = miss.to_crs("EPSG:5347")
        radios_m = radios.to_crs("EPSG:5347")
        nearest = gpd.sjoin_nearest(miss_m.drop(columns=["radio_id", "index_right"], errors="ignore"),
                                    radios_m, how="left", distance_col="dist_m")
        nearest = nearest.drop_duplicates(subset=["id"], keep="first").to_crs("EPSG:4326")
        # Mantener solo columnas comunes
        nearest = nearest[ok.columns.intersection(nearest.columns)]
        joined = pd.concat([ok, nearest], ignore_index=True)
        joined = gpd.GeoDataFrame(joined, geometry="geometry", crs="EPSG:4326")
        print(f"[join] Tras nearest: {joined['radio_id'].isna().sum()} sin radio")

    # Drop sjoin internals
    joined = joined.drop(columns=[c for c in joined.columns if c.startswith("index_")], errors="ignore")

    # Atachar indicadores
    def _row_indicators(rid):
        if not isinstance(rid, str):
            return {k: None for k in INDICATOR_KEYS}
        d = radios_idx.get(rid)
        if not d:
            return {k: None for k in INDICATOR_KEYS}
        return {k: d.get(k) for k in INDICATOR_KEYS}

    extras = joined["radio_id"].apply(_row_indicators).apply(pd.Series)
    out = joined.join(extras)

    # Confianza simple: alta si tiene radio_id y población>=100, sino media; sin radio = baja
    def _confianza(row):
        rid = row.get("radio_id")
        if not isinstance(rid, str):
            return "baja"
        info = radios_idx.get(rid) or {}
        pob = info.get("poblacion_total", 0) or 0
        return "alta" if pob >= 100 else "media"

    out["confianza"] = out.apply(_confianza, axis=1)
    by_conf = out["confianza"].value_counts().to_dict()
    print(f"[join] Confianza: {by_conf}")

    # Decil distribution sanity check
    by_dec = out["vulnerability_decile"].value_counts().sort_index().to_dict()
    print(f"[join] Distribución por decil: {by_dec}")

    if OUT.exists(): OUT.unlink()
    out.to_file(OUT, driver="GeoJSON")
    size_kb = OUT.stat().st_size / 1024
    print(f"[join] Escrito {OUT}  ({size_kb:.0f} KB, {len(out):,} features)")


if __name__ == "__main__":
    main()
