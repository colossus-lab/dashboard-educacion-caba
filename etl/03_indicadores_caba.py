"""ETL Indicadores Educativos Nacionales → CABA + comparación nacional → JSON.

Procesa los XLSX de Repitencia, Sobreedad, Abandono Interanual y Escolarización,
filtrando para "Ciudad de Buenos Aires".

Output:
  data/processed/indicadores_caba.json
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
BASE = Path(
    r"C:\Users\dante\Desktop\Laboratorio Colossus\Pipeline OpenArg\datos_abiertos"
    r"\datasets\educacion\educacion-indicadores-educativos"
)
OUT = ROOT / "data" / "processed" / "indicadores_caba.json"

INDICADORES = {
    "repitencia": BASE / "repitencia_extracted" / "Tasa de Repitencia 2022-2012 según división político-territorial.xlsx",
    "sobreedad": BASE / "sobreedad_extracted" / "Tasas de Sobreedad" / "Tasa de Sobreedad 2023-2012 por nivel educativo y año de estudio, según división político-territorial..xlsx",
    "abandono": BASE / "abandono-interanual_extracted" / "Tasa de Abandono Interanual 2023-2012 según división político-territorial.xlsx",
}


def find_row(df: pd.DataFrame, label: str) -> int | None:
    for i, val in enumerate(df.iloc[:, 0]):
        if isinstance(val, str) and label.lower() in val.lower():
            return i
    return None


def safe_num(v):
    if v is None or pd.isna(v):
        return None
    if isinstance(v, str):
        s = v.strip()
        if s in ("", "-", "—", "...", "s/d"): return None
        s = s.replace(",", ".").replace("%", "")
        try: return float(s)
        except ValueError: return None
    try: return float(v)
    except (TypeError, ValueError): return None


def parse_indicador(path: Path, ind_name: str) -> list[dict]:
    if not path.exists():
        print(f"  WARN: no existe {path}")
        return []
    out = []
    xl = pd.ExcelFile(path)
    for sheet in xl.sheet_names:
        s = sheet.strip()
        if s.isdigit():
            year = int(s)
        elif "-" in s and s.split("-")[0].strip().isdigit():
            year = int(s.split("-")[0].strip())
        else:
            continue
        df = pd.read_excel(path, sheet_name=sheet, header=None)
        caba_row = find_row(df, "Ciudad de Buenos Aires")
        nacion_row = find_row(df, "Total Pa")
        if caba_row is None:
            continue

        nums_caba = [safe_num(v) for v in df.iloc[caba_row, 3:].tolist()]
        nums_nac = [safe_num(v) for v in df.iloc[nacion_row, 3:].tolist()] if nacion_row is not None else []

        primaria_total = nums_caba[0] if len(nums_caba) > 0 else None
        secundaria_total = None
        for i in range(7, len(nums_caba)):
            if nums_caba[i] is not None:
                secundaria_total = nums_caba[i]
                break

        nac_prim = nums_nac[0] if len(nums_nac) > 0 else None
        nac_sec = None
        for i in range(7, len(nums_nac)):
            if nums_nac[i] is not None:
                nac_sec = nums_nac[i]
                break

        out.append({
            "indicador": ind_name,
            "anio": year,
            "caba_primaria": primaria_total,
            "caba_secundaria": secundaria_total,
            "nacion_primaria": nac_prim,
            "nacion_secundaria": nac_sec,
            "caba_detalle": nums_caba,
        })
    return out


def parse_escolarizacion() -> list[dict]:
    src = BASE / "tasas-de-escolarización_extracted" / "Tasas de Escolarización" / "Tasas de Escolarizacion 2022-2011.xlsx"
    if not src.exists():
        print(f"  WARN: no existe {src}")
        return []
    out = []
    xl = pd.ExcelFile(src)
    for sheet in xl.sheet_names:
        sl = sheet.lower().strip()
        if "primaria" in sl: nivel = "Primaria"
        elif "secundaria" in sl: nivel = "Secundaria"
        elif "5" in sl: nivel = "Sala_5"
        elif "4" in sl: nivel = "Sala_4"
        elif "3" in sl: nivel = "Sala_3"
        else: continue

        df = pd.read_excel(src, sheet_name=sheet, header=None)
        caba_row = find_row(df, "Ciudad de Buenos Aires")
        if caba_row is None:
            continue

        header_row = None
        for i in range(0, caba_row):
            row = df.iloc[i].tolist()
            if any(isinstance(v, (int, float)) and 2010 <= v <= 2025 for v in row):
                header_row = i
                break
        if header_row is None:
            continue
        header = df.iloc[header_row].tolist()
        for j, h in enumerate(header):
            if isinstance(h, (int, float)) and 2010 <= h <= 2025:
                val = safe_num(df.iloc[caba_row, j])
                if val is not None:
                    out.append({"indicador": "escolarizacion", "nivel": nivel, "anio": int(h), "caba_tasa": val})
    return out


def main():
    all_data = {}
    for name, path in INDICADORES.items():
        print(f"\n{name}:")
        rows = parse_indicador(path, name)
        all_data[name] = sorted(rows, key=lambda r: r["anio"])
        print(f"  {len(rows)} años extraídos")

    print("\nescolarizacion:")
    esc = parse_escolarizacion()
    all_data["escolarizacion"] = sorted(esc, key=lambda r: (r["nivel"], r["anio"]))
    print(f"  {len(esc)} filas extraídas")

    OUT.write_text(json.dumps(all_data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nOutput: {OUT}")


if __name__ == "__main__":
    main()
