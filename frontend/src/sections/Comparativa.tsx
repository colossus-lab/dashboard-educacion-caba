import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { usePadronJurisdiccional, useIndicadores } from "../dataLoader";

const TOOLTIP = { backgroundColor: "#ffffff", border: "1px solid #d5cfbc", borderRadius: 6 };
const isCABA = (j: string) => /ciudad.*buenos\s*aires/i.test(j);

export default function Comparativa() {
  const { data: padron, loading: lp } = usePadronJurisdiccional();
  const { data: ind, loading: li } = useIndicadores();

  const cabaRank = useMemo(() => {
    if (!padron) return null;
    const i = padron.por_jurisdiccion.findIndex((r) => isCABA(r.jurisdiccion));
    return i >= 0 ? i + 1 : null;
  }, [padron]);

  const cabaRow = padron?.por_jurisdiccion.find((r) => isCABA(r.jurisdiccion));

  // Establecimientos por jurisdicción (rankéado)
  const establecimientosData = useMemo(() => {
    if (!padron) return [];
    return padron.por_jurisdiccion.slice().sort((a, b) => b.total - a.total);
  }, [padron]);

  // % Estatal por jurisdicción (rankéado)
  const pctEstatalData = useMemo(() => {
    if (!padron) return [];
    return padron.por_jurisdiccion.slice().sort((a, b) => a.pct_estatal - b.pct_estatal);
  }, [padron]);

  // Repitencia 2022 por jurisdicción (de indicadores) - solo CABA disponible en este JSON
  // Acá podemos mostrar al menos CABA vs Total País
  const lastRep = ind?.repitencia.slice(-1)[0];
  const lastSob = ind?.sobreedad.slice(-1)[0];
  const lastAband = ind?.abandono.slice(-1)[0];

  const cabaVsNacionData = useMemo(() => {
    const data = [];
    if (lastRep) data.push({ indicador: "Repitencia P", CABA: lastRep.caba_primaria, Nación: lastRep.nacion_primaria });
    if (lastRep) data.push({ indicador: "Repitencia S", CABA: lastRep.caba_secundaria, Nación: lastRep.nacion_secundaria });
    if (lastSob) data.push({ indicador: "Sobreedad P", CABA: lastSob.caba_primaria, Nación: lastSob.nacion_primaria });
    if (lastSob) data.push({ indicador: "Sobreedad S", CABA: lastSob.caba_secundaria, Nación: lastSob.nacion_secundaria });
    if (lastAband) data.push({ indicador: "Abandono P", CABA: lastAband.caba_primaria, Nación: lastAband.nacion_primaria });
    if (lastAband) data.push({ indicador: "Abandono S", CABA: lastAband.caba_secundaria, Nación: lastAband.nacion_secundaria });
    return data;
  }, [lastRep, lastSob, lastAband]);

  if (lp || li) return <div className="loading">Cargando comparativa…</div>;

  return (
    <div>
      <h2 className="section-title">Comparativa CABA vs Nación</h2>
      <p className="section-desc">
        Posición de CABA en el ranking jurisdiccional, composición sectorial y desempeño relativo.
      </p>

      <div className="kpi-row" style={{ padding: 0, marginBottom: 16 }}>
        <div className="kpi">
          <div className="kpi-label">Posición CABA por establecimientos</div>
          <div className="kpi-value">#{cabaRank ?? "—"}</div>
          <div className="kpi-sub">Sobre {padron?.por_jurisdiccion.length} jurisdicciones</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Establecimientos CABA</div>
          <div className="kpi-value">{cabaRow?.total.toLocaleString("es-AR") ?? "—"}</div>
          <div className="kpi-sub">{cabaRow ? `${(cabaRow.total / (padron?.total_pais ?? 1) * 100).toFixed(2)}% del total país` : ""}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">% Estatal CABA</div>
          <div className="kpi-value">{cabaRow?.pct_estatal.toFixed(1) ?? "—"}%</div>
          <div className="kpi-sub">Promedio país: {padron ? (padron.por_jurisdiccion.reduce((a, r) => a + r.pct_estatal, 0) / padron.por_jurisdiccion.length).toFixed(1) : "—"}%</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">% Urbano CABA</div>
          <div className="kpi-value">{cabaRow?.pct_urbano.toFixed(1) ?? "—"}%</div>
          <div className="kpi-sub">100% por definición</div>
        </div>
      </div>

      <div className="card">
        <h3>Cantidad de establecimientos por jurisdicción</h3>
        <ResponsiveContainer width="100%" height={520}>
          <BarChart data={establecimientosData} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
            <XAxis type="number" stroke="#6b7791" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <YAxis type="category" dataKey="jurisdiccion" stroke="#6b7791" width={130} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? v.toLocaleString("es-AR") : v} />
            <Bar dataKey="total" name="Establecimientos">
              {establecimientosData.map((r, i) => (
                <Cell key={i} fill={isCABA(r.jurisdiccion) ? "#d4a017" : "#1a2755"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="section-desc" style={{ marginTop: 8 }}>
          🟧 CABA destacada — entre las jurisdicciones con menor cantidad absoluta (concentración geográfica).
        </p>
      </div>

      <div className="card">
        <h3>% Estatal por jurisdicción</h3>
        <ResponsiveContainer width="100%" height={520}>
          <BarChart data={pctEstatalData} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
            <XAxis type="number" stroke="#6b7791" domain={[0, 100]} unit="%" />
            <YAxis type="category" dataKey="jurisdiccion" stroke="#6b7791" width={130} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? `${v.toFixed(1)}%` : v} />
            <Bar dataKey="pct_estatal" name="% Estatal">
              {pctEstatalData.map((r, i) => (
                <Cell key={i} fill={isCABA(r.jurisdiccion) ? "#d4a017" : "#1a2755"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="section-desc" style={{ marginTop: 8 }}>
          CABA tiene una composición pública/privada de las más equilibradas del país.
        </p>
      </div>

      <div className="card">
        <h3>Indicadores de trayectoria — CABA vs Total Nación (último año disponible)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={cabaVsNacionData}>
            <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
            <XAxis dataKey="indicador" stroke="#6b7791" />
            <YAxis stroke="#6b7791" unit="%" />
            <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? `${v.toFixed(2)}%` : v} />
            <Legend />
            <Bar dataKey="CABA" fill="#d4a017" />
            <Bar dataKey="Nación" fill="#1a2755" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
