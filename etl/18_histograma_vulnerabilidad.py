"""Histograma comparativo de vulnerabilidad: CABA vs GBA-24.

Lee los dos JSON de radios censales (CABA propio + GBA del proyecto hermano
Mapa Educacion Conurbano) y precomputa bins + stats para cuatro métricas:

  - vulnerability_score   (índice [0,1], z-normalizado dentro de cada población)
  - nbi_pct
  - privacion_material_pct
  - hacinamiento_pct

Los porcentajes son directamente comparables entre poblaciones; el score
compuesto, en cambio, tiene media ~0.5 por construcción en cada una y sólo
permite comparar forma de distribución (caveat propagado al JSON via flag
`is_normalized`).

Output: data/processed/histograma_vulnerabilidad.json
"""
from __future__ import annotations
import io
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
CABA_SRC = ROOT / "data" / "processed" / "caba_radios_censo.json"
GBA_DEFAULT = ROOT.parent / "Mapa Educacion Conurbano" / "public" / "data" / "gba_radios_censo.json"
GBA_SRC = Path(os.environ.get("GBA_CENSO_PATH", str(GBA_DEFAULT)))
OUT = ROOT / "data" / "processed" / "histograma_vulnerabilidad.json"

METRICAS = [
    {
        "id": "vulnerability_score",
        "label": "Vulnerabilidad (índice [0,1])",
        "format": "decimal",
        "is_normalized": True,
        "n_bins": 20,
        "range": (0.0, 1.0),
    },
    {
        "id": "nbi_pct",
        "label": "NBI (% hogares)",
        "format": "percent",
        "is_normalized": False,
        "n_bins": 25,
        "range": None,
    },
    {
        "id": "privacion_material_pct",
        "label": "Privación material IPMH (% hogares)",
        "format": "percent",
        "is_normalized": False,
        "n_bins": 25,
        "range": None,
    },
    {
        "id": "hacinamiento_pct",
        "label": "Hacinamiento (% hogares ≥3 personas/cuarto)",
        "format": "percent",
        "is_normalized": False,
        "n_bins": 25,
        "range": None,
    },
]


def load_values(path: Path, metric: str) -> np.ndarray:
    raw = json.loads(path.read_text(encoding="utf-8"))
    radios = raw["radios"]
    vals = [r.get(metric) for r in radios.values() if r.get(metric) is not None]
    return np.asarray(vals, dtype=float)


def stats(arr: np.ndarray) -> dict:
    return {
        "n": int(arr.size),
        "mean": round(float(arr.mean()), 4),
        "median": round(float(np.median(arr)), 4),
        "p10": round(float(np.percentile(arr, 10)), 4),
        "p90": round(float(np.percentile(arr, 90)), 4),
        "std": round(float(arr.std(ddof=1)), 4),
    }


def histogram(caba: np.ndarray, gba: np.ndarray, n_bins: int, rng) -> tuple[list[dict], tuple[float, float]]:
    if rng is None:
        # rango = [0, p99 redondeado] del concat — evita que outliers GBA aplasten la lectura
        combined = np.concatenate([caba, gba])
        upper = float(np.percentile(combined, 99))
        upper = float(np.ceil(upper / 5.0) * 5.0)  # redondea a múltiplo de 5
        if upper <= 0:
            upper = float(combined.max())
        lo, hi = 0.0, max(upper, 1.0)
    else:
        lo, hi = float(rng[0]), float(rng[1])

    edges = np.linspace(lo, hi, n_bins + 1)
    caba_clip = np.clip(caba, lo, hi)
    gba_clip = np.clip(gba, lo, hi)
    caba_counts, _ = np.histogram(caba_clip, bins=edges)
    gba_counts, _ = np.histogram(gba_clip, bins=edges)

    bins = []
    for i in range(n_bins):
        bins.append({
            "x0": round(float(edges[i]), 4),
            "x1": round(float(edges[i + 1]), 4),
            "caba": int(caba_counts[i]),
            "gba": int(gba_counts[i]),
        })
    return bins, (lo, hi)


def main() -> None:
    if not CABA_SRC.exists():
        sys.exit(f"❌ No existe {CABA_SRC} — corré antes etl/12_censo_caba_radios.py")
    if not GBA_SRC.exists():
        sys.exit(
            f"❌ No existe {GBA_SRC}. Apuntá GBA_CENSO_PATH al gba_radios_censo.json "
            "del proyecto Mapa Educacion Conurbano."
        )

    print(f"[hist] CABA ← {CABA_SRC}")
    print(f"[hist] GBA  ← {GBA_SRC}")

    metricas_out: dict[str, dict] = {}
    n_caba = n_gba = 0

    for spec in METRICAS:
        caba_v = load_values(CABA_SRC, spec["id"])
        gba_v = load_values(GBA_SRC, spec["id"])
        n_caba = max(n_caba, caba_v.size)
        n_gba = max(n_gba, gba_v.size)

        bins, (lo, hi) = histogram(caba_v, gba_v, spec["n_bins"], spec["range"])
        metricas_out[spec["id"]] = {
            "label": spec["label"],
            "format": spec["format"],
            "is_normalized": spec["is_normalized"],
            "range": [lo, hi],
            "bins": bins,
            "stats": {"caba": stats(caba_v), "gba": stats(gba_v)},
        }
        s_caba = metricas_out[spec["id"]]["stats"]["caba"]
        s_gba = metricas_out[spec["id"]]["stats"]["gba"]
        print(
            f"[hist] {spec['id']:>28}  CABA mediana={s_caba['median']:>7.3f}  "
            f"GBA mediana={s_gba['median']:>7.3f}  Δ={s_gba['median'] - s_caba['median']:+.3f}"
        )

    payload = {
        "meta": {
            "generado": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "n_caba": n_caba,
            "n_gba": n_gba,
            "fuente": "INDEC CPV 2022 (paquete censoargentino) · agregación por radio censal",
            "metodologia_score": "z(NBI) + z(IPMH) + z(hacinamiento) → normalizado [0,1] → deciles",
            "caveat_score": (
                "vulnerability_score se z-normaliza dentro de cada población — "
                "compara FORMA de distribución, no nivel absoluto. Para magnitud "
                "absoluta usar los componentes crudos (NBI, IPMH, hacinamiento)."
            ),
            "ambitos": {"caba": "Ciudad Autónoma de Buenos Aires (15 comunas)", "gba": "GBA-24 (24 partidos del Conurbano)"},
        },
        "metricas": metricas_out,
    }

    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✓ Escrito {OUT}  ({OUT.stat().st_size / 1024:.1f} KB)")
    print(f"  CABA n={n_caba}  ·  GBA n={n_gba}")


if __name__ == "__main__":
    main()
