import { useMemo } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
} from "recharts";
import {
  useEstablecimientosSummary,
  useMatricula,
  useIndicadores,
  useBoleto,
  useESI,
  useAnuarios,
  usePadronJurisdiccional,
} from "../dataLoader";

const TOOLTIP = { backgroundColor: "#ffffff", border: "1px solid #d5cfbc", borderRadius: 4, fontSize: 12.5 };

const fmtN = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("es-AR");
const fmtP = (n: number | null | undefined, d = 1) =>
  n == null ? "—" : `${n.toFixed(d)}%`;

const isCABA = (j: string) => /ciudad.*buenos\s*aires/i.test(j);

function pctChange(a: number, b: number): number {
  if (!a) return 0;
  return ((b - a) / a) * 100;
}

interface Insight {
  kind: "up" | "down" | "alert" | "info" | "terr";
  eyebrow: string;
  headline: string;
  metric?: string;
  detail: string;
}

export default function ResumenEjecutivo() {
  const { data: summary } = useEstablecimientosSummary();
  const { data: mat } = useMatricula();
  const { data: ind } = useIndicadores();
  const { data: boleto } = useBoleto();
  const { data: esi } = useESI();
  const { data: anuarios } = useAnuarios();
  const { data: padron } = usePadronJurisdiccional();

  const totalMatricula =
    mat?.find((r) => r.tipo_oferta.toLowerCase() === "total")?.total_matricula ?? null;
  const lastAband = ind?.abandono.slice(-1)[0];
  const lastRepit = ind?.repitencia.slice(-1)[0];

  const cabaRow = padron?.por_jurisdiccion.find((r) => isCABA(r.jurisdiccion));
  const cabaRank = padron && cabaRow ? padron.por_jurisdiccion.findIndex((r) => isCABA(r.jurisdiccion)) + 1 : null;

  // ───── Mini-serie histórica matrícula
  const matriculaHistorica = useMemo(() => {
    if (!anuarios) return [];
    const grouped: Record<number, any> = {};
    for (const r of anuarios.serie_jurisdiccional) {
      if (!grouped[r.anio]) grouped[r.anio] = { anio: r.anio };
      grouped[r.anio][r.nivel] = r.alumnos;
    }
    return Object.values(grouped).sort((a: any, b: any) => a.anio - b.anio);
  }, [anuarios]);

  // ───── Comparativa de comunas en matrícula último año
  const comunaRanking = useMemo(() => {
    if (!anuarios) return [];
    const lastYear = Math.max(...anuarios.serie_por_comuna.map((r) => r.anio));
    return anuarios.serie_por_comuna
      .filter((r) => r.anio === lastYear && r.nivel === "Total Común")
      .map((r) => ({ comuna: `Comuna ${r.comuna}`, alumnos: r.alumnos, pct_estatal: r.pct_estatal }))
      .sort((a, b) => b.alumnos - a.alumnos);
  }, [anuarios]);

  // ───── Generación de insights
  const insights: Insight[] = useMemo(() => {
    const out: Insight[] = [];

    // 1. Matrícula histórica — tendencia
    if (anuarios && matriculaHistorica.length >= 2) {
      const first = matriculaHistorica[0] as any;
      const last = matriculaHistorica[matriculaHistorica.length - 1] as any;
      const totalFirst = (first["Inicial"] ?? 0) + (first["Primario"] ?? 0) + (first["Secundario"] ?? 0) + (first["Superior"] ?? 0);
      const totalLast = (last["Inicial"] ?? 0) + (last["Primario"] ?? 0) + (last["Secundario"] ?? 0) + (last["Superior"] ?? 0);
      const ch = pctChange(totalFirst, totalLast);
      out.push({
        kind: ch >= 0 ? "up" : "down",
        eyebrow: `Tendencia · ${first.anio}–${last.anio}`,
        headline: ch >= 0
          ? `Matrícula común creció ${ch.toFixed(1)}% en el período`
          : `Matrícula común retrocedió ${Math.abs(ch).toFixed(1)}% en el período`,
        metric: fmtN(totalLast),
        detail: `Educación común CABA. ${fmtN(totalFirst)} en ${first.anio} → ${fmtN(totalLast)} en ${last.anio}.`,
      });

      // Por nivel: el que más creció
      const niveles = ["Inicial", "Primario", "Secundario", "Superior"];
      let maxCh = -Infinity, maxN = "";
      for (const n of niveles) {
        if (first[n] && last[n]) {
          const c = pctChange(first[n], last[n]);
          if (c > maxCh) { maxCh = c; maxN = n; }
        }
      }
      if (maxN) {
        out.push({
          kind: maxCh >= 0 ? "up" : "down",
          eyebrow: `Por nivel · ${first.anio}–${last.anio}`,
          headline: maxCh >= 0
            ? `Nivel ${maxN} lidera el crecimiento`
            : `Nivel ${maxN} mostró menor caída`,
          metric: `${maxCh >= 0 ? "+" : ""}${maxCh.toFixed(1)}%`,
          detail: `${fmtN(first[maxN])} alumnos en ${first.anio} → ${fmtN(last[maxN])} en ${last.anio}.`,
        });
      }
    }

    // 2. % Estatal evolución
    if (anuarios) {
      const totalSerie = anuarios.serie_jurisdiccional
        .filter((r) => r.nivel === "Total Común" && r.pct_estatal != null)
        .sort((a, b) => a.anio - b.anio);
      if (totalSerie.length >= 2) {
        const first = totalSerie[0]; const last = totalSerie[totalSerie.length - 1];
        const diff = (last.pct_estatal! - first.pct_estatal!);
        out.push({
          kind: "info",
          eyebrow: "Composición público-privado",
          headline: Math.abs(diff) < 0.5
            ? "El balance estatal/privada se mantiene estable"
            : diff > 0 ? "La participación estatal aumentó" : "La participación privada ganó terreno",
          metric: `${last.pct_estatal!.toFixed(1)}% estatal`,
          detail: `Variación ${diff >= 0 ? "+" : ""}${diff.toFixed(2)} p.p. desde ${first.anio} (era ${first.pct_estatal!.toFixed(1)}%).`,
        });
      }
    }

    // 3. Indicador de riesgo: abandono o repitencia
    if (ind?.abandono && ind.abandono.length >= 2) {
      const first = ind.abandono[0]; const last = ind.abandono[ind.abandono.length - 1];
      if (last.caba_secundaria != null && first.caba_secundaria != null) {
        const diff = last.caba_secundaria - first.caba_secundaria;
        out.push({
          kind: diff > 0 ? "alert" : "up",
          eyebrow: `Trayectoria · ${first.anio}–${last.anio}`,
          headline: diff > 0
            ? `Abandono interanual secundario en alza`
            : `Abandono interanual secundario en baja`,
          metric: fmtP(last.caba_secundaria, 2),
          detail: `${diff >= 0 ? "Subió" : "Bajó"} ${Math.abs(diff).toFixed(2)} p.p. desde ${first.anio} (${fmtP(first.caba_secundaria, 2)}). Promedio Nación ${last.anio}: ${fmtP(last.nacion_secundaria, 2)}.`,
        });
      }
    }

    // 4. Comparativos territoriales
    if (comunaRanking.length >= 2) {
      const top = comunaRanking[0];
      const bot = comunaRanking[comunaRanking.length - 1];
      const ratio = top.alumnos / bot.alumnos;
      out.push({
        kind: "terr",
        eyebrow: "Distribución territorial",
        headline: `${top.comuna} concentra ${ratio.toFixed(1)}× más alumnos que ${bot.comuna}`,
        metric: `${fmtN(top.alumnos)} vs ${fmtN(bot.alumnos)}`,
        detail: `Educación común. La comuna más poblada de alumnos casi ${ratio < 2 ? "duplica" : "triplica"} a la menor — desigualdad estructural intra-CABA.`,
      });

      // Comuna con mayor % estatal
      const sorted = comunaRanking.slice().sort((a, b) => (b.pct_estatal ?? 0) - (a.pct_estatal ?? 0));
      const masEstatal = sorted[0];
      const masPrivada = sorted[sorted.length - 1];
      out.push({
        kind: "terr",
        eyebrow: "Brecha de gestión por comuna",
        headline: `${masEstatal.comuna} tiene la matrícula más estatal; ${masPrivada.comuna} la más privada`,
        metric: `${masEstatal.pct_estatal?.toFixed(1)}% vs ${masPrivada.pct_estatal?.toFixed(1)}%`,
        detail: `La composición sectorial varía ${((masEstatal.pct_estatal ?? 0) - (masPrivada.pct_estatal ?? 0)).toFixed(0)} p.p. entre comunas, reflejando contextos socioeconómicos heterogéneos.`,
      });
    }

    // 5. Programas: ESI y boleto
    if (esi && esi.docentes_capacitados_total) {
      out.push({
        kind: "info",
        eyebrow: "Programas educativos",
        headline: `${fmtN(esi.docentes_capacitados_total)} docentes capacitados en ESI`,
        metric: fmtN(esi.estudiantes.find((r) => r.nivel.toLowerCase().startsWith("total"))?.total),
        detail: `Estudiantes alcanzados por el programa de Educación Sexual Integral en niveles obligatorios CABA, 2024.`,
      });
    }
    if (boleto?.total) {
      out.push({
        kind: "info",
        eyebrow: "Boleto Estudiantil 2024",
        headline: `${fmtN(boleto.total)} beneficiarios activos`,
        metric: fmtN(boleto.por_nivel.find((r) => r.nivel === "Secundario")?.beneficiarios),
        detail: `El nivel secundario concentra el ${(((boleto.por_nivel.find((r) => r.nivel === "Secundario")?.beneficiarios ?? 0) / boleto.total) * 100).toFixed(0)}% del beneficio.`,
      });
    }

    // 6. Comparativa nacional
    if (cabaRow && cabaRank && padron) {
      const promedioPctEstatalPais =
        padron.por_jurisdiccion.reduce((a, r) => a + r.pct_estatal, 0) /
        padron.por_jurisdiccion.length;
      const diff = cabaRow.pct_estatal - promedioPctEstatalPais;
      out.push({
        kind: "info",
        eyebrow: "Posición nacional",
        headline: `CABA ocupa el puesto #${cabaRank} en cantidad de establecimientos`,
        metric: `${fmtN(cabaRow.total)} estab.`,
        detail: `${fmtP(cabaRow.pct_estatal, 1)} estatales vs ${fmtP(promedioPctEstatalPais, 1)} promedio país (${diff >= 0 ? "+" : ""}${diff.toFixed(1)} p.p.).`,
      });
    }

    return out;
  }, [anuarios, matriculaHistorica, ind, esi, boleto, comunaRanking, cabaRow, cabaRank, padron]);

  return (
    <div>
      <div className="hero">
        <div className="hero-eyebrow">Tablero ministerial · Resumen ejecutivo</div>
        <h1 className="hero-title">El sistema educativo de CABA en una mirada</h1>
        <p className="hero-subtitle">
          {fmtN(summary?.total)} establecimientos educativos · {fmtN(totalMatricula)} alumnos en RA 2024 ·{" "}
          {fmtP(cabaRow?.pct_estatal, 1)} de gestión estatal · {fmtN(boleto?.total)} beneficiarios del boleto.
          Las cifras clave y los insights operativos del último relevamiento, listos para briefing.
        </p>
      </div>

      <div className="kpi-row" style={{ padding: 0, marginBottom: 24 }}>
        <div className="kpi">
          <div className="kpi-label">Establecimientos</div>
          <div className="kpi-value">{fmtN(summary?.total)}</div>
          <div className="kpi-sub">15 comunas · padrón ene-2026</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Matrícula 2024</div>
          <div className="kpi-value">{fmtN(totalMatricula)}</div>
          <div className="kpi-sub">Estatal + privada</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">% Estatal</div>
          <div className="kpi-value">{summary ? `${Math.round(((summary.por_sector["Estatal"] ?? 0) / summary.total) * 100)}%` : "—"}</div>
          <div className="kpi-sub">Privada {summary ? `${Math.round(((summary.por_sector["Privada"] ?? 0) / summary.total) * 100)}%` : "—"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Abandono Sec. {lastAband?.anio ?? ""}</div>
          <div className="kpi-value">{fmtP(lastAband?.caba_secundaria, 2)}</div>
          <div className="kpi-sub">Nación {fmtP(lastAband?.nacion_secundaria, 2)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Repitencia Sec. {lastRepit?.anio ?? ""}</div>
          <div className="kpi-value">{fmtP(lastRepit?.caba_secundaria, 2)}</div>
          <div className="kpi-sub">Nación {fmtP(lastRepit?.nacion_secundaria, 2)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Beneficiarios boleto 2024</div>
          <div className="kpi-value">{fmtN(boleto?.total)}</div>
          <div className="kpi-sub">Inicial · Primario · Sec. · CFP · Especial</div>
        </div>
      </div>

      <h2 className="section-title" style={{ marginTop: 28 }}>Insights destacados</h2>
      <p className="section-desc">Lecturas relevantes generadas a partir de los datos del último período disponible.</p>
      <div className="insights-grid">
        {insights.map((it, i) => (
          <div key={i} className={`insight-card ${it.kind}`}>
            <div className="insight-eyebrow">{it.eyebrow}</div>
            <div className="insight-headline">{it.headline}</div>
            {it.metric && <div className="insight-metric">{it.metric}</div>}
            <div className="insight-detail">{it.detail}</div>
          </div>
        ))}
      </div>

      <div className="card-grid">
        <div className="card">
          <h3>Matrícula histórica CABA · Educación común 2017-2023</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={matriculaHistorica}>
              <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
              <XAxis dataKey="anio" stroke="#6b7791" />
              <YAxis stroke="#6b7791" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? v.toLocaleString("es-AR") : v} />
              <Legend />
              <Area type="monotone" dataKey="Inicial" stackId="1" stroke="#8b6f47" fill="#8b6f47" fillOpacity={0.85} />
              <Area type="monotone" dataKey="Primario" stackId="1" stroke="#1a2755" fill="#1a2755" fillOpacity={0.9} />
              <Area type="monotone" dataKey="Secundario" stackId="1" stroke="#d4a017" fill="#d4a017" fillOpacity={0.9} />
              <Area type="monotone" dataKey="Superior" stackId="1" stroke="#2a7f8e" fill="#2a7f8e" fillOpacity={0.85} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Distribución territorial · Matrícula por comuna (último año)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={comunaRanking} layout="vertical" margin={{ left: 64 }}>
              <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" />
              <XAxis type="number" stroke="#6b7791" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <YAxis type="category" dataKey="comuna" stroke="#6b7791" width={75} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => typeof v === "number" ? v.toLocaleString("es-AR") : v} />
              <Bar dataKey="alumnos" fill="#1a2755">
                {comunaRanking.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#d4a017" : "#1a2755"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
