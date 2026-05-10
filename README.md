# Dashboard Educación CABA

Dashboard web (React + Vite + TypeScript) sobre educación en la Ciudad Autónoma de Buenos Aires.
Datos del Ministerio de Educación de la Nación + GCBA Datos Abiertos (data.buenosaires.gob.ar).

## Secciones

| Sección | Contenido |
|---------|-----------|
| **Mapa territorial** | Coropleta CABA por comuna (cant. establecimientos *o* matrícula histórica por nivel/año) + capas: 2.767 escuelas, 153 universidades, 15 oficinas boleto |
| **Series temporales** | Matrícula histórica 2017-2023 por nivel · % estatal evolución · matrícula 2024 detallada · escolarización 2010-2017 · promedio años de estudio 2003-2019 · boleto por nivel · esperanza de vida escolar 1980-2010 · brecha de analfabetismo 1960-2010 |
| **Indicadores** | Repitencia / sobreedad / abandono CABA vs Nación (2012-2023) · repitencia por grado · escolarización por nivel |
| **Programas y Cobertura** | ESI 2024 (555.922 estudiantes, 14.406 docentes capacitados) · boleto estudiantil (113.698 beneficiarios) · perfil de asistencia por edad · condición de asistencia |
| **Comparativa** | Rank de CABA entre 24 jurisdicciones · cant. establecimientos · % estatal · CABA vs Nación en indicadores |
| **Directorio** | 2.767 escuelas paginadas, búsqueda por nombre/CUE/dirección/barrio |

## KPIs principales

- **Establecimientos:** 2.767 (15 comunas) — rank nacional #8
- **Matrícula 2024:** 906.406 alumnos — 64% estatal, 36% privada
- **Beneficiarios boleto estudiantil:** 113.698
- **Docentes capacitados ESI:** 14.406
- **Abandono interanual sec. 2022:** 6,49%
- **Repitencia secundaria 2022:** 5,05%

## Estructura

```
dashboard-educacion-caba/
├── data/
│   ├── raw/caba/                            # XLSX/CSV/GeoJSON descargados
│   └── processed/                           # JSONs normalizados (12 archivos)
├── etl/
│   ├── 01_establecimientos_caba.py          # Padrón CABA → GeoJSON WGS84
│   ├── 02_matricula_caba.py                 # Matrícula 2024 (es-AR → JSON)
│   ├── 03_indicadores_caba.py               # Repit/Sobre/Aband/Escol → CABA + Nación
│   ├── 04_historicos_caba.py                # Series CABA 1960-2017
│   ├── 05_universidades_caba.py             # 153 universidades CABA
│   ├── 06_oficinas_boleto.py                # 15 oficinas boleto (dedupe)
│   ├── 07_boleto_estudiantil.py             # Beneficiarios 2024 por nivel
│   ├── 08_esi.py                            # ESI 2024 estudiantes/docentes/unidades
│   ├── 09_asistencia_caba.py                # Asistencia por edad/sexo + cond. + prom años
│   ├── 10_anuarios_caba.py                  # Anuarios 2017-2023, matrícula por comuna y nivel
│   └── 11_padron_nacional.py                # Padrón nacional → 24 jurisdicciones
├── scripts/
│   └── download_caba_education.py           # CKAN downloader para 8 datasets de CABA
├── frontend/                                # Vite 6 + React 19 + TS
│   ├── public/data/                         # Todos los JSONs servidos estáticos
│   └── src/
│       ├── App.tsx                          # 6 tabs
│       ├── dataLoader.ts                    # 12 hooks fetch con cache
│       ├── types.ts                         # Tipos TS
│       └── sections/
│           ├── KpiHeader.tsx                # 7 KPIs principales
│           ├── MapaTerritorial.tsx          # Leaflet + 4 capas
│           ├── SeriesTemporales.tsx         # 9 charts
│           ├── IndicadoresTrayectoria.tsx   # 8 charts
│           ├── ProgramasCobertura.tsx       # ESI + Boleto + Asistencia
│           ├── Comparativa.tsx              # CABA vs 24 jurisdicciones
│           └── Directorio.tsx               # Buscador 2.767 escuelas
├── PLAN_INCORPORACION.md                    # Plan completo de incorporación
└── README.md
```

## Datasets

### Local (data/raw + datos_abiertos del Min. Educación Nación)

| Dataset | Cobertura | Granularidad |
|---------|-----------|--------------|
| Establecimientos CABA (CKAN) | actualizado | 2.767 escuelas geocodificadas, por comuna |
| Universidades CABA | actualizado | 153 con coordenadas |
| Boleto estudiantil — oficinas | actualizado | 15 con coordenadas |
| Matrícula CABA 2024 | RA 2024 | total + estatal/privada × modalidad/nivel |
| Anuarios Estadísticos Nacionales | 2017-2023 | jurisdiccional + **por comuna CABA** |
| Indicadores nacionales (rep/sob/aband/escol) | 2012-2023 | jurisdiccional CABA + total país |
| ESI 2024 | 2024 | estudiantes/unidades/docentes por nivel/sector |
| Asistencia escolar histórica | 1980-2010 (censo) | por edad y sexo |
| Promedio años de estudio CABA | 2003-2019 | por sexo |
| Acceso a credenciales (CABA) | 1960-2017 | esperanza vida escolar, alfabetismo, escolarización |
| Padrón Nacional | actualizado | 64.606 establecimientos en 24 jurisdicciones |

## Cómo correrlo

### Re-procesar todos los datos

```powershell
# (Solo primera vez) Descargar datasets de CABA
python scripts/download_caba_education.py

# Correr todos los ETLs
python etl/01_establecimientos_caba.py
python etl/02_matricula_caba.py
python etl/03_indicadores_caba.py
python etl/04_historicos_caba.py
python etl/05_universidades_caba.py
python etl/06_oficinas_boleto.py
python etl/07_boleto_estudiantil.py
python etl/08_esi.py
python etl/09_asistencia_caba.py
python etl/10_anuarios_caba.py
python etl/11_padron_nacional.py

# Copiar a public
cp data/processed/*.json data/processed/*.geojson frontend/public/data/
```

### Levantar dashboard

```powershell
cd frontend
npm install
npm run dev   # → http://localhost:5173
npm run build # → dist/ (~795KB JS, 235KB gz)
```

## Decisiones técnicas

- **Vite 6** (no 7/8) por incompatibilidad de rolldown con Windows ARM64
- **`@rollup/rollup-win32-arm64-msvc` instalado manualmente** por bug npm con optional deps
- **Leaflet + react-leaflet** para mapas; **Recharts** para charts
- **Reproyección EPSG:9498 → WGS84** con geopandas en ETL (no en runtime)
- **Sin geocoding externo** — el GeoJSON CABA y universidades ya traen coordenadas
- **Datos servidos como estáticos** desde `public/data/` — no API
- **`json.dumps(allow_nan=False)`** en ETL para evitar `NaN` literal

## Limitaciones conocidas

1. Indicadores de trayectoria (rep/sobre/aband) son jurisdiccionales — no por establecimiento.
2. Resultados de Aprender no están en formato tabular público (solo metodología PDF).
3. Anuario 2021 no tiene Capítulo 5 Síntesis Jurisdiccional → hueco en serie histórica.
4. CENPE 2014 docentes omitido por antigüedad.
5. Sample default 800 puntos en mapa por performance — total disponible: 2.767.
