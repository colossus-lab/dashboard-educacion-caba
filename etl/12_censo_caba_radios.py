"""Procesa el Censo 2022 a nivel RADIO CENSAL para CABA (15 comunas).

Adaptado de scripts/process_radios.py del proyecto Mapa Educación Conurbano.
Usa el paquete `censoargentino` (Pedro Orden) que consulta los parquet
oficiales del CPV 2022 vía DuckDB.

Variables extraídas:
  PERSONA_MNI    -> pct_sin_instruccion, pct_secundario_completo, pct_superior_completo
  PERSONA_CONASI -> tasa_nunca_asistio
  HOGAR_NBI_TOT  -> nbi_pct
  HOGAR_IPMH     -> privacion_material_pct
  HOGAR_H20CP    -> hacinamiento_pct

Vulnerability score = z(NBI) + z(IPMH) + z(hacinamiento) → [0,1] → decil 1..10
(equal-weight, métricas hogar para evitar sesgo etario).

Output: data/processed/caba_radios_censo.json
"""
from __future__ import annotations
import os, sys, io, json
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd
import numpy as np

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
os.environ["CENSO_VERBOSE"] = "0"

import censoargentino as censo

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "processed" / "caba_radios_censo.json"

# CABA = provincia código 02. Las 15 comunas se codifican con valor_departamento
# 007, 014, 021, 028, 035, 042, 049, 056, 063, 070, 077, 084, 091, 098, 105.
# El id_geo del radio: 02CCCFFFRR (jurisdicción + comuna + fracción + radio)
COMUNAS = {f"{(i*7):03d}": f"Comuna {i}" for i in range(1, 16)}


def query_var(var: str) -> pd.DataFrame:
    df = censo.query(variables=var, provincia="Ciudad Autónoma de Buenos Aires")
    df["valor_categoria"] = df["valor_categoria"].astype(str)
    df["conteo"] = pd.to_numeric(df["conteo"], errors="coerce").fillna(0).astype(int)
    return df


def pivot_var(df: pd.DataFrame, var: str) -> pd.DataFrame:
    sub = df[df["codigo_variable"] == var]
    p = sub.pivot_table(
        index="id_geo", columns="valor_categoria", values="conteo",
        aggfunc="sum", fill_value=0,
    )
    p.columns = [f"{var}__{c}" for c in p.columns]
    return p.reset_index()


def _safe_pct(num, den) -> pd.Series:
    n = pd.Series(num) if not isinstance(num, pd.Series) else num
    d = pd.Series(den) if not isinstance(den, pd.Series) else den
    return ((n / d.replace(0, np.nan)) * 100).fillna(0)


def _round(x, n: int = 2) -> float:
    try: return round(float(x), n)
    except Exception: return 0.0


def main() -> None:
    print("[radios CABA] Descargando variables del CPV 2022 (paquete censoargentino)...")
    vars_ = ["PERSONA_MNI", "PERSONA_CONASI", "HOGAR_NBI_TOT", "HOGAR_IPMH", "HOGAR_H20CP"]
    pivots: list[pd.DataFrame] = []

    for v in vars_:
        print(f"  - {v}...", flush=True)
        df = query_var(v)
        pivots.append(pivot_var(df, v))
        print(f"    rows={len(df):,}  radios={df['id_geo'].nunique():,}")

    print("[radios CABA] Mergeando variables por radio...")
    out = pivots[0]
    for p in pivots[1:]:
        out = out.merge(p, on="id_geo", how="outer")
    out = out.fillna(0)
    print(f"[radios CABA] Total radios: {len(out):,}")

    # ── Cómputos
    mni_cols_known = [c for c in out.columns if c.startswith("PERSONA_MNI__") and not c.endswith("__99")]
    out["mni_total"] = out[mni_cols_known].sum(axis=1)
    out["pct_sin_instruccion"] = _safe_pct(out.get("PERSONA_MNI__1", 0), out["mni_total"])
    sec_plus = sum(out.get(f"PERSONA_MNI__{k}", 0) for k in (5, 6, 7, 8, 9, 10, 11))
    out["pct_secundario_completo"] = _safe_pct(sec_plus, out["mni_total"])
    sup_comp = sum(out.get(f"PERSONA_MNI__{k}", 0) for k in (7, 9, 11))
    out["pct_superior_completo"] = _safe_pct(sup_comp, out["mni_total"])

    conasi_total = sum(out.get(f"PERSONA_CONASI__{k}", 0) for k in (1, 2, 3))
    out["tasa_nunca_asistio"] = _safe_pct(out.get("PERSONA_CONASI__3", 0), conasi_total)
    out["poblacion_escolarizable"] = conasi_total

    nbi_total = sum(out.get(f"HOGAR_NBI_TOT__{k}", 0) for k in (1, 2))
    out["nbi_pct"] = _safe_pct(out.get("HOGAR_NBI_TOT__1", 0), nbi_total)
    out["hogares_total"] = nbi_total

    ipmh_total = sum(out.get(f"HOGAR_IPMH__{k}", 0) for k in (1, 2, 3, 4))
    ipmh_priv = sum(out.get(f"HOGAR_IPMH__{k}", 0) for k in (2, 3, 4))
    out["privacion_material_pct"] = _safe_pct(ipmh_priv, ipmh_total)

    hac_cols_all = [c for c in out.columns if c.startswith("HOGAR_H20CP__")]
    hac_total = out[hac_cols_all].sum(axis=1) if hac_cols_all else 0
    hac_critico = sum(out.get(f"HOGAR_H20CP__{k}", 0) for k in (5, 6))
    out["hacinamiento_pct"] = _safe_pct(hac_critico, hac_total) if hac_cols_all else 0.0

    # Radio meta
    out["radio_id"] = out["id_geo"].astype(str)
    out["departamento_id"] = out["radio_id"].str[2:5]
    out["comuna"] = out["departamento_id"].apply(lambda s: COMUNAS.get(str(s), "?"))

    # ── Vulnerability score (z-score equal-weight, métricas HOGAR)
    z_components = ["nbi_pct", "privacion_material_pct", "hacinamiento_pct"]
    z = pd.DataFrame()
    for col in z_components:
        s = out[col].astype(float)
        z[col] = (s - s.mean()) / (s.std(ddof=0) or 1.0)
    raw = z.sum(axis=1)
    rng = raw.max() - raw.min()
    out["vulnerability_score"] = ((raw - raw.min()) / rng if rng else 0.0).round(4)
    # decile: rankear y dividir en 10
    out["vulnerability_decile"] = pd.qcut(
        out["vulnerability_score"].rank(method="first"),
        q=10, labels=range(1, 11),
    ).astype(int)

    keep = (out["mni_total"] + out["hogares_total"]) > 0
    out = out[keep].copy()
    print(f"[radios CABA] Radios con datos: {len(out):,}")
    print(f"[radios CABA] Comunas distintas: {out['comuna'].nunique()}")

    radios = {}
    for _, r in out.iterrows():
        radios[r["radio_id"]] = {
            "radio_id": r["radio_id"],
            "comuna": r["comuna"],
            "departamento_id": r["departamento_id"],
            "poblacion_total": int(r["mni_total"]),
            "hogares_total": int(r["hogares_total"]),
            "poblacion_escolarizable": int(r["poblacion_escolarizable"]),
            "pct_sin_instruccion": _round(r["pct_sin_instruccion"]),
            "pct_secundario_completo": _round(r["pct_secundario_completo"]),
            "pct_superior_completo": _round(r["pct_superior_completo"]),
            "tasa_nunca_asistio": _round(r["tasa_nunca_asistio"]),
            "nbi_pct": _round(r["nbi_pct"]),
            "privacion_material_pct": _round(r["privacion_material_pct"]),
            "hacinamiento_pct": _round(r["hacinamiento_pct"]),
            "vulnerability_score": float(r["vulnerability_score"]),
            "vulnerability_decile": int(r["vulnerability_decile"]),
        }

    payload = {
        "meta": {
            "fuente": "INDEC CPV 2022 vía paquete censoargentino (pedroorden)",
            "scope": "Ciudad Autónoma de Buenos Aires (15 comunas)",
            "generado": datetime.now(timezone.utc).isoformat(),
            "n_radios": len(radios),
            "componentes_vulnerability_score": z_components,
            "caveat_metricas_persona": (
                "pct_sin_instruccion y tasa_nunca_asistio se calculan sobre TODA "
                "la población. Para evaluar vulnerabilidad usar vulnerability_score, "
                "NBI, privación material o hacinamiento."
            ),
        },
        "radios": radios,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    print(f"[radios CABA] Escrito {OUT}  ({OUT.stat().st_size/1024:.0f} KB)")


if __name__ == "__main__":
    main()
