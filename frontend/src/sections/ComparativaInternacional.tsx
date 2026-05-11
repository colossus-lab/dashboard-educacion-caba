import { useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, Cell, ScatterChart, Scatter,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
} from "recharts";
import { useCiudadesInternacional } from "../dataLoader";
import type { CiudadInternacional } from "../types";

const TOOLTIP = { backgroundColor: "#ffffff", border: "1px solid #d5cfbc", borderRadius: 4, fontSize: 12 };
const isCABA = (c: CiudadInternacional) => c.codigo === "CABA";
const isOECD = (c: CiudadInternacional) => c.codigo === "OECD";

const REGION_COLORS: Record<string, string> = {
  "Sudamérica": "#d4a017",
  "Norteamérica": "#2a7f8e",
  "Europa": "#1a2755",
  "Asia": "#b0455e",
  "Oceanía": "#8b6f47",
  "Referencia": "#a5b3bb",
};

const fmt = (n: number | undefined | null, suffix = "") =>
  n == null ? "—" : `${n.toLocaleString("es-AR", { maximumFractionDigits: 1 })}${suffix}`;

export default function ComparativaInternacional() {
  const { data, loading } = useCiudadesInternacional();
  const [selectedCities, setSelectedCities] = useState<string[]>(["CABA", "MAD", "SCL", "TYO"]);

  const ranking = useMemo(() => {
    if (!data) return [];
    return data.ciudades
      .filter((c) => !isOECD(c))
      .slice()
      .sort((a, b) => b.pisa_2022.promedio - a.pisa_2022.promedio);
  }, [data]);

  const cabaRow = data?.ciudades.find(isCABA);
  const cabaRank = useMemo(() => {
    if (!ranking.length || !cabaRow) return null;
    return ranking.findIndex((c) => c.codigo === "CABA") + 1;
  }, [ranking, cabaRow]);

  const scatterData = useMemo(() => {
    if (!data) return [];
    return data.ciudades
      .filter((c) => !isOECD(c))
      .map((c) => ({
        ciudad: c.ciudad,
        codigo: c.codigo,
        region: c.region,
        gasto: c.gasto_publico_educacion_pct_pib,
        pisa: c.pisa_2022.promedio,
      }));
  }, [data]);

  const radarCities = useMemo<CiudadInternacional[]>(() => {
    if (!data) return [];
    return selectedCities
      .map((cod) => data.ciudades.find((c) => c.codigo === cod))
      .filter((c): c is CiudadInternacional => !!c);
  }, [data, selectedCities]);

  // Para el radar normalizamos cada eje a 0-100 sobre el rango del dataset
  const radarData = useMemo(() => {
    if (!data) return [];
    const all = data.ciudades.filter((c) => !isOECD(c));
    const min = (fn: (c: CiudadInternacional) => number) => Math.min(...all.map(fn));
    const max = (fn: (c: CiudadInternacional) => number) => Math.max(...all.map(fn));
    const norm = (v: number, lo: number, hi: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
    const axes = [
      { axis: "PISA promedio", get: (c: CiudadInternacional) => c.pisa_2022.promedio },
      { axis: "Secundario completo", get: (c: CiudadInternacional) => c.attainment_25_64.secundario_completo_pct },
      { axis: "Superior completo", get: (c: CiudadInternacional) => c.attainment_25_64.superior_completo_pct },
      { axis: "Escol. secundaria", get: (c: CiudadInternacional) => c.tasa_neta_escolarizacion.secundaria },
      { axis: "Escol. superior", get: (c: CiudadInternacional) => c.tasa_neta_escolarizacion.superior },
      { axis: "Gasto % PIB", get: (c: CiudadInternacional) => c.gasto_publico_educacion_pct_pib },
    ];
    return axes.map((a) => {
      const lo = min(a.get), hi = max(a.get);
      const row: any = { axis: a.axis };
      radarCities.forEach((c) => { row[c.codigo] = +norm(a.get(c), lo, hi).toFixed(1); });
      return row;
    });
  }, [data, radarCities]);

  if (loading) return <div className="loading">Cargando comparativa internacional…</div>;
  if (!data) return <div className="error">No se pudo cargar el dataset internacional.</div>;

  const oecdAvg = data.ciudades.find(isOECD);

  return (
    <div>
      <h2 className="section-title">Comparativa internacional</h2>
      <p className="section-desc">
        CABA contra 11 capitales y referencias OECD en 4 dimensiones: rendimiento PISA 2022,
        nivel educativo alcanzado por adultos, cobertura escolar y gasto público en educación.
      </p>

      {/* KPIs CABA */}
      <div className="kpi-row" style={{ padding: 0, marginBottom: 18 }}>
        <div className="kpi">
          <div className="kpi-label">Posición CABA en PISA</div>
          <div className="kpi-value">#{cabaRank ?? "—"}</div>
          <div className="kpi-sub">de {ranking.length} ciudades/países</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">PISA promedio CABA</div>
          <div className="kpi-value">{cabaRow?.pisa_2022.promedio}</div>
          <div className="kpi-sub">OECD: {oecdAvg?.pisa_2022.promedio} · gap {(cabaRow!.pisa_2022.promedio - oecdAvg!.pisa_2022.promedio).toFixed(0)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">% Sup. completo CABA</div>
          <div className="kpi-value">{fmt(cabaRow?.attainment_25_64.superior_completo_pct, "%")}</div>
          <div className="kpi-sub">OECD: {fmt(oecdAvg?.attainment_25_64.superior_completo_pct, "%")}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Gasto educ. % PIB</div>
          <div className="kpi-value">{fmt(cabaRow?.gasto_publico_educacion_pct_pib, "%")}</div>
          <div className="kpi-sub">OECD: {fmt(oecdAvg?.gasto_publico_educacion_pct_pib, "%")}</div>
        </div>
      </div>

      {/* Ranking PISA */}
      <div className="card">
        <h3>Ranking PISA 2022 — Promedio Mat + Lec + Ciencias</h3>
        <ResponsiveContainer width="100%" height={460}>
          <BarChart data={ranking} layout="vertical" margin={{ left: 100 }}>
            <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
            <XAxis type="number" stroke="#6b7791" domain={[350, 600]} />
            <YAxis type="category" dataKey="ciudad" stroke="#6b7791" width={140} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? v.toFixed(0) : v} />
            <Bar dataKey="pisa_2022.promedio" name="PISA promedio">
              {ranking.map((r, i) => (
                <Cell key={i} fill={isCABA(r) ? "#d4a017" : REGION_COLORS[r.region] ?? "#1a2755"} />
              ))}
              <LabelList dataKey="pisa_2022.promedio" position="right" formatter={(v: any) => Number(v).toFixed(0)} style={{ fill: "#1a2755", fontSize: 11, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="section-desc" style={{ marginTop: 8 }}>
          🟧 CABA destacada. Colores por región. Singapur lidera con ciudad-estado completo (575 mat). CABA: muestra propia PISA;
          el resto reporta promedio nacional.
        </p>
      </div>

      {/* Scatter gasto vs desempeño */}
      <div className="card">
        <h3>Gasto público en educación (% PIB) × Rendimiento PISA</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 40, bottom: 30, left: 10 }}>
            <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
            <XAxis type="number" dataKey="gasto" stroke="#6b7791" domain={[2.5, 7.5]}
              label={{ value: "% del PIB", position: "insideBottom", offset: -10, fill: "#6b7791", fontSize: 12 }} />
            <YAxis type="number" dataKey="pisa" stroke="#6b7791" domain={[400, 600]}
              label={{ value: "PISA promedio", angle: -90, position: "insideLeft", fill: "#6b7791", fontSize: 12 }} />
            <Tooltip contentStyle={TOOLTIP} content={(props: any) => {
              const p = props.payload?.[0]?.payload;
              if (!p) return null;
              return <div style={{ ...TOOLTIP, padding: 8 }}>
                <div style={{ fontWeight: 700, color: "#1a2755" }}>{p.ciudad}</div>
                <div style={{ color: "#6b7791", fontSize: 11 }}>Gasto: {p.gasto}% PIB</div>
                <div style={{ color: "#6b7791", fontSize: 11 }}>PISA: {p.pisa}</div>
              </div>;
            }} />
            <Scatter data={scatterData} fill="#1a2755">
              {scatterData.map((d, i) => (
                <Cell key={i} fill={d.codigo === "CABA" ? "#d4a017" : REGION_COLORS[d.region] ?? "#1a2755"} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <p className="section-desc" style={{ marginTop: 8 }}>
          La correlación gasto-rendimiento es débil a este nivel agregado: Singapur logra 560 con 2.9% del PIB, mientras Suecia gasta 6.9% y obtiene 488.
          CABA: 4.6% del PIB → 441 (debajo de la curva).
        </p>
      </div>

      {/* Radar comparativo */}
      <div className="card">
        <h3>Comparación multidimensional (radar)</h3>
        <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {data.ciudades.filter((c) => !isOECD(c)).map((c) => {
            const active = selectedCities.includes(c.codigo);
            return (
              <button key={c.codigo}
                onClick={() => {
                  if (active) setSelectedCities(selectedCities.filter((x) => x !== c.codigo));
                  else if (selectedCities.length < 5) setSelectedCities([...selectedCities, c.codigo]);
                }}
                disabled={!active && selectedCities.length >= 5}
                style={{
                  padding: "5px 10px", borderRadius: 3, border: `1px solid ${active ? REGION_COLORS[c.region] : "#d4d1c4"}`,
                  background: active ? REGION_COLORS[c.region] : "#fff",
                  color: active ? "#fff" : "#34405c", fontSize: 11, fontWeight: 600,
                  fontFamily: "var(--font-sans)", cursor: !active && selectedCities.length >= 5 ? "not-allowed" : "pointer",
                  opacity: !active && selectedCities.length >= 5 ? 0.4 : 1,
                  textTransform: "uppercase", letterSpacing: "0.04em",
                }}>
                {c.codigo}
              </button>
            );
          })}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#6b7791", alignSelf: "center" }}>
            Máx. 5 ciudades · {selectedCities.length}/5 seleccionadas
          </span>
        </div>
        <ResponsiveContainer width="100%" height={420}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#e3dfd2" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "#34405c" }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#6b7791" }} />
            {radarCities.map((c, i) => (
              <Radar key={c.codigo}
                name={c.ciudad}
                dataKey={c.codigo}
                stroke={REGION_COLORS[c.region] ?? "#1a2755"}
                fill={REGION_COLORS[c.region] ?? "#1a2755"}
                fillOpacity={0.15 - i * 0.02}
                strokeWidth={2} />
            ))}
            <Legend />
            <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? v.toFixed(0) : v} />
          </RadarChart>
        </ResponsiveContainer>
        <p className="section-desc" style={{ marginTop: 8 }}>
          Cada eje normalizado al rango (0 = peor del set, 100 = mejor). Mostrá hasta 5 ciudades simultáneas para comparar perfiles.
        </p>
      </div>

      {/* PISA detalle por área */}
      <div className="card-grid">
        <PisaArea title="PISA Matemática" data={ranking} field="matematica" />
        <PisaArea title="PISA Lectura" data={ranking} field="lectura" />
        <PisaArea title="PISA Ciencias" data={ranking} field="ciencias" />
        <div className="card">
          <h3>% Educación superior completa (25-64 años)</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.ciudades.filter((c) => !isOECD(c)).slice().sort((a, b) => b.attainment_25_64.superior_completo_pct - a.attainment_25_64.superior_completo_pct)} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
              <XAxis type="number" stroke="#6b7791" domain={[0, 80]} unit="%" />
              <YAxis type="category" dataKey="ciudad" stroke="#6b7791" width={130} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? `${v.toFixed(1)}%` : v} />
              <Bar dataKey="attainment_25_64.superior_completo_pct">
                {data.ciudades.filter((c) => !isOECD(c)).slice().sort((a, b) => b.attainment_25_64.superior_completo_pct - a.attainment_25_64.superior_completo_pct).map((r, i) => (
                  <Cell key={i} fill={isCABA(r) ? "#d4a017" : "#1a2755"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla completa */}
      <div className="card" style={{ padding: 0 }}>
        <h3 style={{ padding: "16px 22px 0", margin: 0 }}>Tabla completa</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Ciudad / País</th>
                <th>Región</th>
                <th className="num">PISA Mat</th>
                <th className="num">PISA Lec</th>
                <th className="num">PISA Cie</th>
                <th className="num">Sec. compl. %</th>
                <th className="num">Sup. compl. %</th>
                <th className="num">Esc. Sec %</th>
                <th className="num">Esc. Sup %</th>
                <th className="num">Gasto % PIB</th>
              </tr>
            </thead>
            <tbody>
              {data.ciudades.map((c) => (
                <tr key={c.codigo} style={isCABA(c) ? { background: "rgba(212,160,23,0.12)", fontWeight: 700 } : undefined}>
                  <td>{c.ciudad}{c.es_subnacional && <span style={{ fontSize: 9.5, color: "#6b7791", marginLeft: 6 }}>(sub-nacional)</span>}</td>
                  <td><span className="tag" style={{ background: `${REGION_COLORS[c.region]}22`, color: REGION_COLORS[c.region] }}>{c.region}</span></td>
                  <td className="num">{c.pisa_2022.matematica}</td>
                  <td className="num">{c.pisa_2022.lectura}</td>
                  <td className="num">{c.pisa_2022.ciencias}</td>
                  <td className="num">{c.attainment_25_64.secundario_completo_pct.toFixed(1)}</td>
                  <td className="num">{c.attainment_25_64.superior_completo_pct.toFixed(1)}</td>
                  <td className="num">{c.tasa_neta_escolarizacion.secundaria.toFixed(1)}</td>
                  <td className="num">{c.tasa_neta_escolarizacion.superior.toFixed(1)}</td>
                  <td className="num">{c.gasto_publico_educacion_pct_pib.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="section-desc" style={{ marginTop: 16 }}>
        <b>Fuentes:</b> {data.meta.fuente_principal}.<br />
        <b>Caveat PISA:</b> {data.meta.caveat_pisa_subnational}<br />
        <b>Caveat attainment:</b> {data.meta.caveat_attainment}
      </p>
    </div>
  );
}

function PisaArea({ title, data, field }: { title: string; data: any[]; field: "matematica" | "lectura" | "ciencias" }) {
  const sorted = data.slice().sort((a, b) => b.pisa_2022[field] - a.pisa_2022[field]);
  return (
    <div className="card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={sorted} layout="vertical" margin={{ left: 100 }}>
          <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
          <XAxis type="number" stroke="#6b7791" domain={[350, 600]} />
          <YAxis type="category" dataKey="ciudad" stroke="#6b7791" width={130} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? v.toFixed(0) : v} />
          <Bar dataKey={`pisa_2022.${field}`}>
            {sorted.map((r, i) => (
              <Cell key={i} fill={r.codigo === "CABA" ? "#d4a017" : "#1a2755"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
