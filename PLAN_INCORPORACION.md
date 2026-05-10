# Plan de Incorporación Completa — Dashboard Educación CABA

## Decisiones de scope (acordadas con el usuario)

- **Alcance**: las 5 fases (completo)
- **Organización**: sección nueva **"Programas y Cobertura"**
- **Anuarios**: solo 2017-2023 (formatos estables, garantizar serie limpia de 7 años)
- **Comparativa nacional**: sí, panel comparativo CABA vs otras provincias

---

## Fase 1 — Capas adicionales al mapa
**Status**: pendiente
**Archivos a crear/modificar**:
- ETL `etl/05_universidades.py` → `data/processed/universidades_caba.geojson`
- ETL `etl/06_oficinas_boleto.py` → `data/processed/oficinas_boleto.geojson`
- `frontend/src/sections/MapaTerritorial.tsx` — sumar 2 layers con `LayersControl.Overlay`
- `frontend/src/dataLoader.ts` — 2 hooks nuevos
- `frontend/src/types.ts` — tipos para universidades

**Detalle:**
- Universidades: marker púrpura, popup con nombre, dirección, web (link clickeable)
- Oficinas boleto: marker naranja, popup con empresa, dirección, horarios

## Fase 2 — KPIs y nuevos gráficos
**Status**: pendiente
**Archivos a crear/modificar**:
- ETL `etl/07_boleto_estudiantil.py` → JSON: por nivel + total
- ETL `etl/08_esi.py` → JSON: estudiantes/docentes/unidades 2024 + serie 2018-2021
- ETL `etl/09_asistencia_caba.py` → JSON: tasa por edad/año/sexo + cond_asistencia + promedio_anios_estudio
- `KpiHeader.tsx`: agregar 2 KPIs (boleto + ESI docentes)
- `SeriesTemporales.tsx`: agregar gráfico boleto por nivel + promedio años estudio (2003-2019)

## Fase 3 — Sección nueva "Programas y Cobertura"
**Status**: pendiente
**Archivos a crear**:
- `frontend/src/sections/ProgramasCobertura.tsx`
- Modificar `App.tsx` para agregar tab

**Subsecciones:**
1. **ESI 2024** — cobertura por nivel/sector (estudiantes + unidades + docentes capacitados)
2. **ESI evolución 2018-2021** — series jurisdiccionales
3. **Boleto Estudiantil** — beneficiarios por nivel + mapa de oficinas
4. **Asistencia escolar histórica (1980-2010)** — heatmap edad × año + condición de asistencia (stacked: Asiste / Asistió antes / Nunca asistió)

## Fase 4 — Anuarios Nacionales 2017-2023 (matrícula histórica CABA)
**Status**: pendiente
**Archivos a crear**:
- `etl/10_anuarios_caba.py` — parser específico para Capítulo 5 "Síntesis Jurisdiccional" 2017-2023
- Output: `data/processed/matricula_historica_caba.json` con shape `[{anio, nivel, sector, matricula, locales, docentes}]`

**Modificaciones**:
- `SeriesTemporales.tsx`: reemplazar el chart de matrícula 2024 estática con serie histórica 2017-2024 (área apilada por nivel)
- Mantener el desglose 2024 como detalle expandible

## Fase 5 — Padrón nacional + comparativa jurisdiccional
**Status**: pendiente
**Archivos a crear**:
- `etl/11_padron_nacional.py` — agregar el padrón 64K filas por jurisdicción
- Output: `data/processed/padron_jurisdiccional.json` (24 jurisdicciones × estatal/privado × oferta)
- `frontend/src/sections/Comparativa.tsx` — nueva pestaña

**Visualizaciones:**
- Ranking jurisdiccional: cant. establecimientos
- % estatal vs privado por jurisdicción (bar chart horizontal con CABA destacado)
- Posición CABA en repitencia/sobreedad/abandono (ya tenemos los datos, solo agregamos el gráfico)

## Archivos críticos del input

```
data/raw/caba/universidades/universidades.geojson         (CRS84, listo)
data/raw/caba/boleto-estudiantil/oficinas-boleto-estudiantil.csv     (lat/lng directo)
data/raw/caba/boleto-estudiantil/beneficiarios_boleto_estudiantil_2024.xlsx
data/raw/caba/educacion-sexual-integral/ESI_estudiantes_2024_.xlsx
data/raw/caba/educacion-sexual-integral/ESI_docentes_2024.xlsx
data/raw/caba/educacion-sexual-integral/ESI_unidades_educativas_2024.xlsx
data/raw/caba/jurisdiccionales-de-educacion-sexual-integral/datos_esi_2018-2021.csv  (4 archivos)
data/raw/caba/asistencia-escolar/tas_asis_esc_cen_edad__sexo__annio_limpio.csv  (1980-2010, x edad)
data/raw/caba/asistencia-escolar/cond_asis_esc_edad__sexo__annio__c_asist_limpio.csv
data/raw/caba/asistencia-escolar/prom_an_esc_sexo__annio_limpio.csv  (2003-2019)

datos_abiertos/educacion/educacion-anuario-estadisticos-educativos/
  anuario-estadístico-educativo-{2017..2023}_extracted/Anuario {YYYY}/Capítulo 5_*/

datos_abiertos/educacion/educacion-padron-oficial-establecimientos-educativos/
  padrón-oficial-de-establecimientos-educativos.xlsx  (64K filas, todas las provincias)
```

## Verificación

Al terminar cada fase: levantar dev server y verificar en browser via preview MCP que cada componente nuevo carga datos reales sin errores de consola.
