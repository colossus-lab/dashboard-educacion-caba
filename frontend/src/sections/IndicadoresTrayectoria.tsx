import { useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { useIndicadores } from "../dataLoader";
import type { IndicadorAnual } from "../types";
import { useChartHeight } from "../lib/useChartHeight";

const TOOLTIP = { backgroundColor: "#ffffff", border: "1px solid #d5cfbc", borderRadius: 6 };

const fmt = (v: any) => (typeof v === "number" ? `${v.toFixed(2)}%` : v);

function buildSerie(rows: IndicadorAnual[], key: "primaria" | "secundaria") {
  return rows
    .map((r) => ({
      anio: r.anio,
      CABA: key === "primaria" ? r.caba_primaria : r.caba_secundaria,
      Nación: key === "primaria" ? r.nacion_primaria : r.nacion_secundaria,
    }))
    .sort((a, b) => a.anio - b.anio);
}

export default function IndicadoresTrayectoria() {
  const { data, loading } = useIndicadores();
  const heatmapH = useChartHeight(280);
  const lineH = useChartHeight(300);

  const repPrim = useMemo(() => (data ? buildSerie(data.repitencia, "primaria") : []), [data]);
  const repSec = useMemo(() => (data ? buildSerie(data.repitencia, "secundaria") : []), [data]);
  const sobPrim = useMemo(() => (data ? buildSerie(data.sobreedad, "primaria") : []), [data]);
  const sobSec = useMemo(() => (data ? buildSerie(data.sobreedad, "secundaria") : []), [data]);
  const abandPrim = useMemo(() => (data ? buildSerie(data.abandono, "primaria") : []), [data]);
  const abandSec = useMemo(() => (data ? buildSerie(data.abandono, "secundaria") : []), [data]);

  const repHeatmap = useMemo(() => {
    if (!data) return [];
    const last = data.repitencia.slice(-1)[0];
    if (!last) return [];
    const labels = ["1° P", "2° P", "3° P", "4° P", "5° P", "6° P", "7° P"];
    const out: any[] = [];
    for (let i = 1; i <= 7 && i < last.caba_detalle.length; i++) {
      out.push({ grado: labels[i - 1], CABA: last.caba_detalle[i] });
    }
    return out;
  }, [data]);

  if (loading) return <div className="loading">Cargando indicadores…</div>;
  if (!data) return <div className="error">No se pudo cargar indicadores.</div>;

  const lastYear = data.repitencia.slice(-1)[0]?.anio;

  return (
    <div>
      <h2 className="section-title">Indicadores de trayectoria escolar</h2>
      <p className="section-desc">
        Repitencia, sobreedad y abandono interanual en CABA vs Nación (2012-2023). Datos jurisdiccionales del Min. Educación Nación.
      </p>

      <div className="card-grid">
        <Pair title={`Repitencia Primaria — CABA vs Nación`} data={repPrim} />
        <Pair title={`Repitencia Secundaria — CABA vs Nación`} data={repSec} />
        <Pair title={`Sobreedad Primaria — CABA vs Nación`} data={sobPrim} />
        <Pair title={`Sobreedad Secundaria — CABA vs Nación`} data={sobSec} />
        <Pair title={`Abandono Interanual Primaria — CABA vs Nación`} data={abandPrim} />
        <Pair title={`Abandono Interanual Secundaria — CABA vs Nación`} data={abandSec} />
      </div>

      <div className="card">
        <h3>Repitencia por grado de Primaria — CABA, último año disponible ({lastYear})</h3>
        <ResponsiveContainer width="100%" height={heatmapH}>
          <BarChart data={repHeatmap}>
            <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
            <XAxis dataKey="grado" stroke="#6b7791" />
            <YAxis stroke="#6b7791" unit="%" />
            <Tooltip contentStyle={TOOLTIP} formatter={fmt} />
            <Bar dataKey="CABA" fill="#1a2755" />
          </BarChart>
        </ResponsiveContainer>
        <p className="section-desc" style={{ marginTop: 8 }}>
          La repitencia se concentra fuertemente en los primeros años de cada nivel.
        </p>
      </div>

      <div className="card">
        <h3>Tasa neta de escolarización CABA por nivel (2012-2022)</h3>
        <ResponsiveContainer width="100%" height={lineH}>
          <LineChart data={
            (() => {
              const grouped: Record<number, any> = {};
              for (const r of data.escolarizacion) {
                if (!grouped[r.anio]) grouped[r.anio] = { anio: r.anio };
                grouped[r.anio][r.nivel] = r.caba_tasa;
              }
              return Object.values(grouped).sort((a: any, b: any) => a.anio - b.anio);
            })()
          }>
            <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
            <XAxis dataKey="anio" stroke="#6b7791" />
            <YAxis stroke="#6b7791" unit="%" domain={[40, 110]} />
            <Tooltip contentStyle={TOOLTIP} formatter={fmt} />
            <Legend />
            <Line type="monotone" dataKey="Primaria" stroke="#1a2755" strokeWidth={2} />
            <Line type="monotone" dataKey="Secundaria" stroke="#d4a017" strokeWidth={2} />
            <Line type="monotone" dataKey="Sala_5" stroke="#2f7d52" strokeWidth={2} />
            <Line type="monotone" dataKey="Sala_4" stroke="#8b6f47" strokeWidth={2} />
            <Line type="monotone" dataKey="Sala_3" stroke="#b0455e" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Pair({ title, data }: { title: string; data: any[] }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
          <XAxis dataKey="anio" stroke="#6b7791" />
          <YAxis stroke="#6b7791" unit="%" />
          <Tooltip contentStyle={TOOLTIP} formatter={fmt} />
          <Legend />
          <Line type="monotone" dataKey="CABA" stroke="#1a2755" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Nación" stroke="#d4a017" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
