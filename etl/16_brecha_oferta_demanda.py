"""ETL Brecha oferta-demanda educativa por COMUNA.

Cruza dos fuentes:
  A) Demanda: población escolarizable (5-24 años) por radio censal (CPV 2022)
     Agregada a nivel COMUNA sumando radios.
  B) Oferta: matrícula real (alumnos inscriptos) por comuna y nivel (Anuario 2023).

Output: data/processed/brecha_oferta_demanda.json
  {
    por_comuna: [{ comuna, poblacion_escolarizable_aprox, matricula_total,
                   matricula_inicial, matricula_primario, matricula_secundario,
                   matricula_superior, ratio_cobertura_pct }]
  }

Notas:
  - "Población escolarizable" del CPV se aproxima al total de personas que respondieron
    a la pregunta CONASI (5+ años). Es un upper bound de la población en edad escolar.
  - Cobertura > 100% sugiere alumnos viviendo fuera de la comuna pero estudiando ahí
    (CABA tiene mucho commute inter-comuna).
"""
from __future__ import annotations
import json, sys, io
from pathlib import Path
from collections import defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
RADIOS = ROOT / "data" / "processed" / "caba_radios_censo.json"
ANUARIOS = ROOT / "data" / "processed" / "anuarios_caba.json"
OUT = ROOT / "data" / "processed" / "brecha_oferta_demanda.json"


def main():
    radios = json.loads(RADIOS.read_text(encoding="utf-8"))
    anuarios = json.loads(ANUARIOS.read_text(encoding="utf-8"))

    # Demanda: agregamos población escolarizable por comuna
    # comuna en el JSON es string "Comuna N"
    demanda: dict[int, dict[str, int]] = defaultdict(lambda: {"pob_esc": 0, "pob_total": 0, "hogares": 0})
    for r in radios["radios"].values():
        com_str = r["comuna"]
        if not com_str.startswith("Comuna"): continue
        com = int(com_str.split()[-1])
        demanda[com]["pob_esc"] += r["poblacion_escolarizable"]
        demanda[com]["pob_total"] += r["poblacion_total"]
        demanda[com]["hogares"] += r["hogares_total"]

    # Oferta: último año disponible (2023) por comuna
    LAST_YEAR = max(anuarios["anios"])
    oferta_por_comuna_nivel: dict[int, dict[str, int]] = defaultdict(dict)
    for row in anuarios["serie_por_comuna"]:
        if row["anio"] != LAST_YEAR: continue
        oferta_por_comuna_nivel[row["comuna"]][row["nivel"]] = row["alumnos"]

    # Construir output
    out_rows = []
    for com in sorted(demanda.keys()):
        d = demanda[com]
        ofer = oferta_por_comuna_nivel.get(com, {})
        inicial = ofer.get("Inicial", 0)
        primario = ofer.get("Primario", 0)
        secundario = ofer.get("Secundario", 0)
        superior = ofer.get("Superior", 0)
        # Usamos la suma de niveles porque "Total Común" del anuario está incompleto para comunas 14-15
        total = inicial + primario + secundario + superior

        ratio = (total / d["pob_esc"] * 100) if d["pob_esc"] > 0 else 0
        out_rows.append({
            "comuna": com,
            "poblacion_total": d["pob_total"],
            "poblacion_escolarizable_aprox": d["pob_esc"],
            "hogares": d["hogares"],
            "matricula_total": total,
            "matricula_inicial": inicial,
            "matricula_primario": primario,
            "matricula_secundario": secundario,
            "matricula_superior": superior,
            "ratio_cobertura_pct": round(ratio, 2),
        })

    payload = {
        "meta": {
            "fuente": "INDEC CPV 2022 (radios censales) + Anuarios Min. Educación Nación (síntesis jurisdiccional CABA)",
            "anio_anuario": LAST_YEAR,
            "scope": "15 comunas CABA",
            "definicion_demanda": "Suma de población que respondió pregunta CONASI (5+ años) por radio. Aproxima upper-bound de población escolarizable.",
            "definicion_oferta": "Alumnos inscriptos en establecimientos ubicados en la comuna (Anuario 2023, educación común)",
            "interpretacion_ratio": "ratio > 100% indica que la comuna recibe alumnos de otras comunas (atractora). < 100% indica déficit relativo o residentes que estudian en otras comunas.",
        },
        "por_comuna": out_rows,
    }

    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Escrito {OUT}")
    print(f"\nResumen ratio cobertura por comuna (oferta/demanda):")
    for r in sorted(out_rows, key=lambda x: -x["ratio_cobertura_pct"]):
        print(f"  Comuna {r['comuna']:2}: {r['ratio_cobertura_pct']:6.1f}%  "
              f"(matr {r['matricula_total']:6,}  vs pob {r['poblacion_escolarizable_aprox']:6,})")


if __name__ == "__main__":
    main()
