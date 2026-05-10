import { useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { useESI, useBoleto, useAsistencia } from "../dataLoader";

const TOOLTIP = { backgroundColor: "#ffffff", border: "1px solid #d5cfbc", borderRadius: 6 };

export default function ProgramasCobertura() {
  const { data: esi, loading: le } = useESI();
  const { data: boleto, loading: lb } = useBoleto();
  const { data: asist, loading: la } = useAsistencia();

  const [yearAsist, setYearAsist] = useState<number>(2010);

  const yearsAsist = useMemo(() => {
    if (!asist) return [];
    return Array.from(new Set(asist.tasa_por_edad.map((r) => r.anio))).sort();
  }, [asist]);

  const tasaPorEdadAnio = useMemo(() => {
    if (!asist) return [];
    return asist.tasa_por_edad
      .filter((r) => r.anio === yearAsist && r.sexo === "TOTAL" && r.edad != null && r.tasa != null)
      .map((r) => ({ edad: r.edad, tasa: r.tasa }))
      .sort((a, b) => (a.edad ?? 0) - (b.edad ?? 0));
  }, [asist, yearAsist]);

  const condicionPorGrupoEdad = useMemo(() => {
    if (!asist) return [];
    // Por año más reciente y total
    const last = Math.max(...asist.condicion_por_grupo_edad.map((r) => r.anio));
    const filtered = asist.condicion_por_grupo_edad.filter(
      (r) => r.anio === last && r.sexo === "TOTAL" && r.personas != null
    );
    const grouped: Record<string, any> = {};
    for (const r of filtered) {
      if (!grouped[r.grupo_edad]) grouped[r.grupo_edad] = { grupo: r.grupo_edad };
      grouped[r.grupo_edad][r.condicion] = r.personas;
    }
    return Object.values(grouped);
  }, [asist]);

  const esiEstudiantesObligatorios = useMemo(() => {
    if (!esi) return null;
    return esi.estudiantes.find((r) => r.nivel.toLowerCase().startsWith("total"));
  }, [esi]);

  if (le || lb || la) return <div className="loading">Cargando datos de programas…</div>;

  return (
    <div>
      <h2 className="section-title">Programas y Cobertura</h2>
      <p className="section-desc">
        Programas educativos: Educación Sexual Integral (ESI), Boleto Estudiantil, y series largas de asistencia escolar.
      </p>

      {/* ESI */}
      <div className="card">
        <h3>Educación Sexual Integral (ESI) 2024 — Cobertura en niveles obligatorios</h3>
        <div className="kpi-row" style={{ padding: 0, gap: 12, marginBottom: 16 }}>
          <div className="kpi">
            <div className="kpi-label">Estudiantes alcanzados</div>
            <div className="kpi-value">{esiEstudiantesObligatorios?.total.toLocaleString("es-AR") ?? "—"}</div>
            <div className="kpi-sub">Niveles obligatorios CABA</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Unidades educativas</div>
            <div className="kpi-value">{esi?.unidades.find((r) => r.nivel.toLowerCase().startsWith("total"))?.total.toLocaleString("es-AR") ?? "—"}</div>
            <div className="kpi-sub">Que dictan ESI</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Docentes capacitados</div>
            <div className="kpi-value">{esi?.docentes_capacitados_total?.toLocaleString("es-AR") ?? "—"}</div>
            <div className="kpi-sub">2024</div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={(esi?.estudiantes ?? []).filter((r) => !r.nivel.toLowerCase().startsWith("total"))}>
            <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
            <XAxis dataKey="nivel" stroke="#6b7791" tick={{ fontSize: 11 }} />
            <YAxis stroke="#6b7791" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? v.toLocaleString("es-AR") : v} />
            <Legend />
            <Bar dataKey="estatal" name="Estatal" stackId="a" fill="#1a2755" />
            <Bar dataKey="privado" name="Privada" stackId="a" fill="#d4a017" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Boleto */}
      <div className="card">
        <h3>Boleto Estudiantil 2024 — {boleto?.total.toLocaleString("es-AR")} beneficiarios</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={boleto?.por_nivel ?? []} layout="vertical">
            <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
            <XAxis type="number" stroke="#6b7791" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <YAxis type="category" dataKey="nivel" stroke="#6b7791" width={100} />
            <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? v.toLocaleString("es-AR") : v} />
            <Bar dataKey="beneficiarios" fill="#c47600" />
          </BarChart>
        </ResponsiveContainer>
        <p className="section-desc" style={{ marginTop: 8 }}>
          15 oficinas distribuidas por la ciudad. Ver capa "Oficinas Boleto Estudiantil" en el Mapa territorial.
        </p>
      </div>

      {/* Asistencia: tasa por edad */}
      <div className="card">
        <h3>Tasa de asistencia escolar CABA — perfil por edad</h3>
        <div className="filters" style={{ background: "transparent", border: "none", padding: 0, marginBottom: 8 }}>
          <label>
            Año censal
            <select value={yearAsist} onChange={(e) => setYearAsist(Number(e.target.value))}>
              {yearsAsist.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={tasaPorEdadAnio}>
            <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
            <XAxis dataKey="edad" stroke="#6b7791" label={{ value: "Edad", position: "insideBottom", offset: -2, fill: "#6b7791" }} />
            <YAxis stroke="#6b7791" domain={[0, 100]} unit="%" />
            <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? `${v.toFixed(1)}%` : v} labelFormatter={(l) => `${l} años`} />
            <Line type="monotone" dataKey="tasa" name="Tasa asistencia" stroke="#2f7d52" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
        <p className="section-desc" style={{ marginTop: 8 }}>
          Donde la línea cae es donde se concentra la deserción. Picos centrales (~100%) en edades obligatorias.
        </p>
      </div>

      {/* Condición de asistencia por grupo de edad */}
      <div className="card">
        <h3>Condición de asistencia por grupo de edad — CABA, último año disponible</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={condicionPorGrupoEdad}>
            <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
            <XAxis dataKey="grupo" stroke="#6b7791" />
            <YAxis stroke="#6b7791" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? v.toLocaleString("es-AR") : v} />
            <Legend />
            <Bar dataKey="Asiste" stackId="a" fill="#2f7d52" />
            <Bar dataKey="No asiste pero asistió" stackId="a" fill="#d4a017" />
            <Bar dataKey="Nunca asistió" stackId="a" fill="#a8312f" />
            <Bar dataKey="Ignorado" stackId="a" fill="#6b7791" />
          </BarChart>
        </ResponsiveContainer>
        <p className="section-desc" style={{ marginTop: 8 }}>
          Stack: cantidad de personas por condición educativa, segmentadas por grupo etario.
        </p>
      </div>
    </div>
  );
}
