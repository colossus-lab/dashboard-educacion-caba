"""Forecast matrícula CABA 2024-2030 por nivel.

Solo tenemos 6 años (2017-2020, 2022, 2023). ARIMA con n=6 es spurious.
Hacemos: regresión lineal por nivel + intervalo de confianza basado en
residuos (std de errores in-sample) escalado por sqrt(h) para reflejar
incertidumbre creciente con el horizonte.

Output: data/processed/forecast_matricula.json
"""
from __future__ import annotations
import json, sys, io
from pathlib import Path
import numpy as np

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "processed" / "anuarios_caba.json"
OUT = ROOT / "data" / "processed" / "forecast_matricula.json"

NIVELES = ["Inicial", "Primario", "Secundario", "Superior"]
FORECAST_TO = 2030


def fit_linear_forecast(years: list[int], values: list[int], forecast_to: int):
    """Regresión lineal simple + banda de confianza ±1.5×std(residuos)×sqrt(h)."""
    x = np.array(years, dtype=float)
    y = np.array(values, dtype=float)
    if len(x) < 3:
        return None
    # OLS
    coef = np.polyfit(x, y, 1)  # [slope, intercept]
    fitted = np.polyval(coef, x)
    residuals = y - fitted
    sigma = float(np.std(residuals, ddof=1)) if len(residuals) > 1 else 0

    # R²
    ss_res = float(np.sum(residuals ** 2))
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0

    out = []
    last_year = int(x.max())
    for year in range(int(x.min()), forecast_to + 1):
        pred = float(np.polyval(coef, year))
        is_forecast = year > last_year
        h = max(0, year - last_year)
        band = 1.96 * sigma * np.sqrt(max(1, h)) if is_forecast else 0
        actual = None
        for i, yr in enumerate(x):
            if int(yr) == year:
                actual = float(y[i])
                break
        out.append({
            "anio": year,
            "actual": int(actual) if actual is not None else None,
            "predicted": int(round(pred)) if is_forecast else None,
            "lower": int(round(pred - band)) if is_forecast else None,
            "upper": int(round(pred + band)) if is_forecast else None,
            "fitted": int(round(pred)) if not is_forecast else None,
        })
    return {
        "slope_anual": float(coef[0]),
        "intercept": float(coef[1]),
        "r2": float(r2),
        "sigma_residual": sigma,
        "puntos": out,
    }


def main():
    data = json.loads(SRC.read_text(encoding="utf-8"))
    # Serie jurisdiccional por nivel
    out: dict[str, dict] = {}
    for nivel in NIVELES:
        rows = [r for r in data["serie_jurisdiccional"] if r["nivel"] == nivel]
        rows.sort(key=lambda r: r["anio"])
        years = [r["anio"] for r in rows]
        values = [r["alumnos"] for r in rows]
        if not values:
            print(f"[forecast] {nivel}: sin datos")
            continue
        result = fit_linear_forecast(years, values, FORECAST_TO)
        if result:
            out[nivel] = result
            print(f"[forecast] {nivel}: slope={result['slope_anual']:+,.0f}/año  R²={result['r2']:.3f}  σ={result['sigma_residual']:,.0f}")
        else:
            print(f"[forecast] {nivel}: insuficientes puntos")

    payload = {
        "meta": {
            "metodo": "Regresión lineal OLS por nivel + banda de confianza 95% (1.96×σ×√h)",
            "fuente": "Anuarios Estadísticos Min. Educación Nación, Capítulo 5 Síntesis Jurisdiccional",
            "anios_observados": sorted(set(years)),
            "horizonte": FORECAST_TO,
            "caveat": "Forecast con n=6 puntos es exploratorio. La incertidumbre crece con el horizonte (banda 95% escalada por √h).",
        },
        "por_nivel": out,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nEscrito {OUT}")


if __name__ == "__main__":
    main()
