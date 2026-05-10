import { useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";
import { useHistoricos, useMatricula, useBoleto, useAsistencia, useAnuarios } from "../dataLoader";

const TOOLTIP = { backgroundColor: "#ffffff", border: "1px solid #d5cfbc", borderRadius: 6 };

export default function SeriesTemporales() {
  const { data: hist, loading: lh } = useHistoricos();
  const { data: mat, loading: lm } = useMatricula();
  const { data: boleto } = useBoleto();
  const { data: asistencia } = useAsistencia();
  const { data: anuarios } = useAnuarios();

  const matriculaHistorica = useMemo(() => {
    if (!anuarios) return [];
    // pivot por año, columnas = niveles
    const grouped: Record<number, any> = {};
    for (const r of anuarios.serie_jurisdiccional) {
      if (!grouped[r.anio]) grouped[r.anio] = { anio: r.anio };
      grouped[r.anio][r.nivel] = r.alumnos;
    }
    return Object.values(grouped).sort((a: any, b: any) => a.anio - b.anio);
  }, [anuarios]);

  const matriculaPctEstatal = useMemo(() => {
    if (!anuarios) return [];
    return anuarios.serie_jurisdiccional
      .filter((r) => r.nivel === "Total Común")
      .map((r) => ({ anio: r.anio, pct: r.pct_estatal }))
      .sort((a, b) => a.anio - b.anio);
  }, [anuarios]);

  const promAniosData = useMemo(() => {
    if (!asistencia) return [];
    const grouped: Record<number, any> = {};
    for (const r of asistencia.promedio_anios_estudio) {
      if (r.promedio == null) continue;
      if (!grouped[r.anio]) grouped[r.anio] = { anio: r.anio };
      grouped[r.anio][`sexo_${r.sexo}`] = r.promedio;
    }
    return Object.values(grouped).sort((a: any, b: any) => a.anio - b.anio);
  }, [asistencia]);

  const escolarizacionData = useMemo(() => {
    if (!hist) return [];
    const grouped: Record<number, any> = {};
    for (const r of hist.tasa_escolarizacion) {
      const key = `${r.nivel}_${r.sexo}`;
      if (!grouped[r.anio]) grouped[r.anio] = { anio: r.anio };
      grouped[r.anio][key] = r.tasa;
    }
    return Object.values(grouped).sort((a: any, b: any) => a.anio - b.anio);
  }, [hist]);

  const espVidaData = useMemo(() => {
    if (!hist) return [];
    const grouped: Record<number, any> = {};
    for (const r of hist.esperanza_vida_escolar) {
      if (!grouped[r.anio]) grouped[r.anio] = { anio: r.anio };
      grouped[r.anio][`sexo_${r.sexo}`] = r.valor;
    }
    return Object.values(grouped).sort((a: any, b: any) => a.anio - b.anio);
  }, [hist]);

  const matriculaPorNivel = useMemo(() => {
    if (!mat) return [];
    const niveles = ["Inicial", "Primario", "Secundario", "Superior"];
    return niveles.map((n) => {
      const r = mat.find((x) => x.modalidad === "Común" && x.nivel === n);
      return {
        nivel: n,
        Estatal: r?.estatal_matricula ?? 0,
        Privada: r?.privado_matricula ?? 0,
      };
    });
  }, [mat]);

  const matriculaModalidad = useMemo(() => {
    if (!mat) return [];
    return mat
      .filter((r) => r.nivel === "Total" && r.modalidad && r.modalidad !== "Total" && r.tipo_oferta === "Servicios educativos")
      .map((r) => ({
        modalidad: r.modalidad,
        Estatal: r.estatal_matricula ?? 0,
        Privada: r.privado_matricula ?? 0,
      }));
  }, [mat]);

  if (lh || lm) return <div className="loading">Cargando series…</div>;

  return (
    <div>
      <h2 className="section-title">Series temporales y composición</h2>
      <p className="section-desc">
        Matrícula 2024 (último relevamiento) + series históricas largas de escolarización y alfabetismo (1960-2017).
      </p>

      <div className="card">
        <h3>Matrícula CABA — Educación Común 2017-2023 (por nivel)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={matriculaHistorica}>
            <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
            <XAxis dataKey="anio" stroke="#6b7791" />
            <YAxis stroke="#6b7791" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? v.toLocaleString("es-AR") : v} />
            <Legend />
            <Area type="monotone" dataKey="Inicial" stackId="1" stroke="#8b6f47" fill="#8b6f47" />
            <Area type="monotone" dataKey="Primario" stackId="1" stroke="#1a2755" fill="#1a2755" />
            <Area type="monotone" dataKey="Secundario" stackId="1" stroke="#d4a017" fill="#d4a017" />
            <Area type="monotone" dataKey="Superior" stackId="1" stroke="#2f7d52" fill="#2f7d52" />
          </AreaChart>
        </ResponsiveContainer>
        <p className="section-desc" style={{ marginTop: 8 }}>
          Anuarios Estadísticos del Min. Educación Nación (Capítulo 5 — Síntesis Jurisdiccional). Falta 2021.
        </p>
      </div>

      <div className="card-grid">
        <div className="card">
          <h3>% Estatal sobre matrícula total CABA — Evolución 2017-2023</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={matriculaPctEstatal}>
              <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
              <XAxis dataKey="anio" stroke="#6b7791" />
              <YAxis stroke="#6b7791" domain={[40, 60]} unit="%" />
              <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? `${v.toFixed(2)}%` : v} />
              <Line type="monotone" dataKey="pct" name="% Estatal" stroke="#1a2755" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="section-desc" style={{ marginTop: 8 }}>
            CABA tiene la matrícula más equilibrada del país entre estatal y privada.
          </p>
        </div>
        <div className="card">
          <h3>Matrícula común 2024 por nivel y sector (relevamiento CABA)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={matriculaPorNivel}>
              <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
              <XAxis dataKey="nivel" stroke="#6b7791" />
              <YAxis stroke="#6b7791" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? v.toLocaleString("es-AR") : v} />
              <Legend />
              <Bar dataKey="Estatal" stackId="a" fill="#1a2755" />
              <Bar dataKey="Privada" stackId="a" fill="#d4a017" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Matrícula 2024 por modalidad (total)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={matriculaModalidad} layout="vertical">
              <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
              <XAxis type="number" stroke="#6b7791" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <YAxis type="category" dataKey="modalidad" stroke="#6b7791" width={100} />
              <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? v.toLocaleString("es-AR") : v} />
              <Legend />
              <Bar dataKey="Estatal" stackId="a" fill="#1a2755" />
              <Bar dataKey="Privada" stackId="a" fill="#d4a017" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3>Tasa neta de escolarización CABA — 2010-2017 (por nivel y sexo)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={escolarizacionData}>
            <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
            <XAxis dataKey="anio" stroke="#6b7791" />
            <YAxis stroke="#6b7791" domain={[0, 100]} unit="%" />
            <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? `${v.toFixed(1)}%` : v} />
            <Legend />
            <Line type="monotone" dataKey="Primario_m" name="Primario M" stroke="#1a2755" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Primario_v" name="Primario V" stroke="#1a2755" strokeWidth={2} strokeDasharray="4 4" dot={false} />
            <Line type="monotone" dataKey="Secundario / Medio_m" name="Sec. M" stroke="#d4a017" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Secundario / Medio_v" name="Sec. V" stroke="#d4a017" strokeWidth={2} strokeDasharray="4 4" dot={false} />
            <Line type="monotone" dataKey="Superior_m" name="Superior M" stroke="#2f7d52" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Superior_v" name="Superior V" stroke="#2f7d52" strokeWidth={2} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card-grid">
        <div className="card">
          <h3>Promedio de años de estudio CABA (2003-2019)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={promAniosData}>
              <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
              <XAxis dataKey="anio" stroke="#6b7791" />
              <YAxis stroke="#6b7791" domain={[11, 14]} />
              <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? `${v.toFixed(1)} años` : v} />
              <Legend />
              <Line type="monotone" dataKey="sexo_m" name="Mujeres" stroke="#d4a017" strokeWidth={2} />
              <Line type="monotone" dataKey="sexo_v" name="Varones" stroke="#1a2755" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <p className="section-desc" style={{ marginTop: 8 }}>
            Convergencia entre sexos: brecha pasa de ~0,6 años (2003) a ~0,1 (2019).
          </p>
        </div>

        <div className="card">
          <h3>Beneficiarios Boleto Estudiantil 2024 — por nivel</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={boleto?.por_nivel ?? []}>
              <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
              <XAxis dataKey="nivel" stroke="#6b7791" />
              <YAxis stroke="#6b7791" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? v.toLocaleString("es-AR") : v} />
              <Bar dataKey="beneficiarios" fill="#c47600" />
            </BarChart>
          </ResponsiveContainer>
          <p className="section-desc" style={{ marginTop: 8 }}>
            Total: <b style={{ color: "var(--ink)" }}>{boleto?.total.toLocaleString("es-AR") ?? "—"}</b> beneficiarios.
          </p>
        </div>
      </div>

      <div className="card-grid">
        <div className="card">
          <h3>Esperanza de vida escolar CABA (1980-2010)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={espVidaData}>
              <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
              <XAxis dataKey="anio" stroke="#6b7791" />
              <YAxis stroke="#6b7791" domain={[10, 16]} />
              <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? `${v.toFixed(2)} años` : v} />
              <Legend />
              <Line type="monotone" dataKey="sexo_m" name="Mujeres" stroke="#d4a017" strokeWidth={2} />
              <Line type="monotone" dataKey="sexo_v" name="Varones" stroke="#1a2755" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Brecha de analfabetismo CABA (1960-2010)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={hist?.brecha_analfabetismo}>
              <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
              <XAxis dataKey="anio" stroke="#6b7791" />
              <YAxis stroke="#6b7791" />
              <Tooltip contentStyle={TOOLTIP} />
              <ReferenceLine y={1} stroke="#2f7d52" strokeDasharray="3 3" label={{ value: "Paridad", fill: "#2f7d52", fontSize: 11 }} />
              <Line type="monotone" dataKey="valor" name="Mujeres / Varones" stroke="#a8312f" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <p className="section-desc" style={{ marginTop: 8 }}>
            Ratio mujeres/varones de 10+ años analfabetos. Convergencia hacia 1 = paridad.
          </p>
        </div>
      </div>
    </div>
  );
}
