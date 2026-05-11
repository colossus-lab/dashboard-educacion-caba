import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useHistogramaVulnerabilidad } from "../dataLoader";
import type { HistogramaMetrica } from "../types";

const TOOLTIP = { backgroundColor: "#ffffff", border: "1px solid #d5cfbc", borderRadius: 4, fontSize: 12 };
const CABA_COLOR = "#1a2755";
const GBA_COLOR = "#d4a017";

const METRIC_IDS = [
  "vulnerability_score",
  "nbi_pct",
  "privacion_material_pct",
  "hacinamiento_pct",
] as const;
type MetricId = (typeof METRIC_IDS)[number];

const METRIC_SHORT: Record<MetricId, string> = {
  vulnerability_score: "Índice [0,1]",
  nbi_pct: "NBI",
  privacion_material_pct: "Privación material (IPMH)",
  hacinamiento_pct: "Hacinamiento",
};

function fmtVal(metric: HistogramaMetrica, v: number, digits = 2): string {
  if (metric.format === "percent") return `${v.toFixed(digits)}%`;
  return v.toFixed(digits === 2 ? 3 : digits);
}

function binLabel(metric: HistogramaMetrica, x0: number, x1: number): string {
  if (metric.format === "percent") return `${x0.toFixed(0)}–${x1.toFixed(0)}%`;
  return `${x0.toFixed(2)}–${x1.toFixed(2)}`;
}

function findMedianBinIndex(bins: HistogramaMetrica["bins"], median: number): number {
  for (let i = 0; i < bins.length; i++) {
    if (median >= bins[i].x0 && median < bins[i].x1) return i;
  }
  return bins.length - 1;
}

export default function HistogramaVulnerabilidad() {
  const { data, loading } = useHistogramaVulnerabilidad();
  const [metric, setMetric] = useState<MetricId>("nbi_pct");

  const m = data?.metricas[metric];
  const chartData = useMemo(() => {
    if (!m) return [];
    const nCaba = m.stats.caba.n;
    const nGba = m.stats.gba.n;
    return m.bins.map((b) => ({
      bin: binLabel(m, b.x0, b.x1),
      x0: b.x0,
      x1: b.x1,
      caba_pct: nCaba ? (b.caba / nCaba) * 100 : 0,
      gba_pct: nGba ? (b.gba / nGba) * 100 : 0,
      caba_n: b.caba,
      gba_n: b.gba,
    }));
  }, [m]);

  if (loading || !data || !m) {
    return (
      <div style={{ padding: 24, color: "var(--ink-3)", fontSize: 12 }}>
        Cargando distribución comparativa…
      </div>
    );
  }

  const medianBinCaba = chartData[findMedianBinIndex(m.bins, m.stats.caba.median)]?.bin;
  const medianBinGba = chartData[findMedianBinIndex(m.bins, m.stats.gba.median)]?.bin;

  const fmtAxis = (v: number) => `${v.toFixed(0)}%`;
  const fmtTooltipPct = (v: number) => `${v.toFixed(1)}%`;

  return (
    <div className="card" style={{ padding: 18, marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="insight-eyebrow">Distribución comparativa · CABA vs GBA-24</div>
          <h3 style={{ margin: "4px 0 2px", fontSize: 16, fontWeight: 700, fontFamily: "var(--font-sans)" }}>
            {m.label}
          </h3>
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
            {data.meta.fuente} · {data.meta.n_caba.toLocaleString("es-AR")} radios CABA · {data.meta.n_gba.toLocaleString("es-AR")} radios GBA-24
          </div>
        </div>

        {/* Selector de métrica */}
        <div style={{ display: "flex", border: "1px solid var(--border-2)", borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
          {METRIC_IDS.map((id) => (
            <button
              key={id}
              onClick={() => setMetric(id)}
              style={{
                padding: "6px 12px",
                border: "none",
                borderRight: id !== METRIC_IDS[METRIC_IDS.length - 1] ? "1px solid var(--border-2)" : "none",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                background: metric === id ? "var(--navy)" : "var(--surface)",
                color: metric === id ? "#fff" : "var(--ink-2)",
                whiteSpace: "nowrap",
              }}
            >
              {METRIC_SHORT[id]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 28, left: 4 }} barGap={"-100%" as any}>
            <CartesianGrid stroke="#e3dfd2" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="bin"
              stroke="#6b7791"
              tick={{ fontSize: 10, fill: "#6b7791" }}
              interval="preserveStartEnd"
              tickMargin={8}
              label={{
                value: m.label,
                position: "insideBottom",
                offset: -16,
                style: { fontSize: 11, fill: "#6b7791", fontFamily: "var(--font-sans)" },
              }}
            />
            <YAxis
              stroke="#6b7791"
              tick={{ fontSize: 11, fill: "#6b7791" }}
              tickFormatter={fmtAxis}
              label={{
                value: "% de radios censales",
                angle: -90,
                position: "insideLeft",
                offset: 16,
                style: { fontSize: 11, fill: "#6b7791", textAnchor: "middle", fontFamily: "var(--font-sans)" },
              }}
            />
            <Tooltip
              contentStyle={TOOLTIP}
              formatter={(value: any, name: any, item: any) => {
                const which = name === "caba_pct" ? "CABA" : "GBA-24";
                const nKey = name === "caba_pct" ? "caba_n" : "gba_n";
                const n = item?.payload?.[nKey] ?? 0;
                const v = typeof value === "number" ? value : Number(value);
                return [`${fmtTooltipPct(v)}  (${(n as number).toLocaleString("es-AR")} radios)`, which];
              }}
              labelFormatter={(label) => `Bin: ${label}`}
            />
            <Legend
              verticalAlign="top"
              height={28}
              iconType="square"
              formatter={(value) =>
                value === "caba_pct" ? (
                  <span style={{ fontSize: 12, color: "var(--ink-2)" }}>CABA (15 comunas)</span>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--ink-2)" }}>GBA-24 (Conurbano)</span>
                )
              }
            />
            <Bar dataKey="gba_pct" fill={GBA_COLOR} fillOpacity={0.55} stroke={GBA_COLOR} strokeWidth={0.5} isAnimationActive={false} />
            <Bar dataKey="caba_pct" fill={CABA_COLOR} fillOpacity={0.7} stroke={CABA_COLOR} strokeWidth={0.5} isAnimationActive={false} />

            {medianBinCaba && (
              <ReferenceLine
                x={medianBinCaba}
                stroke={CABA_COLOR}
                strokeDasharray="4 3"
                strokeWidth={1.5}
                ifOverflow="extendDomain"
                label={{
                  value: `Md CABA ${fmtVal(m, m.stats.caba.median)}`,
                  position: "top",
                  fill: CABA_COLOR,
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}
            {medianBinGba && (
              <ReferenceLine
                x={medianBinGba}
                stroke={GBA_COLOR}
                strokeDasharray="4 3"
                strokeWidth={1.5}
                ifOverflow="extendDomain"
                label={{
                  value: `Md GBA ${fmtVal(m, m.stats.gba.median)}`,
                  position: "top",
                  fill: "#8b6608",
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10, fontSize: 11.5 }}>
        <div style={{ padding: "8px 12px", background: "rgba(26, 39, 85, 0.06)", borderLeft: `3px solid ${CABA_COLOR}` }}>
          <div style={{ fontWeight: 700, color: CABA_COLOR, marginBottom: 2 }}>CABA</div>
          <div style={{ color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>
            n={m.stats.caba.n.toLocaleString("es-AR")} · media {fmtVal(m, m.stats.caba.mean)} · mediana {fmtVal(m, m.stats.caba.median)} · p10–p90 [{fmtVal(m, m.stats.caba.p10)}, {fmtVal(m, m.stats.caba.p90)}]
          </div>
        </div>
        <div style={{ padding: "8px 12px", background: "rgba(212, 160, 23, 0.08)", borderLeft: `3px solid ${GBA_COLOR}` }}>
          <div style={{ fontWeight: 700, color: "#8b6608", marginBottom: 2 }}>GBA-24</div>
          <div style={{ color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>
            n={m.stats.gba.n.toLocaleString("es-AR")} · media {fmtVal(m, m.stats.gba.mean)} · mediana {fmtVal(m, m.stats.gba.median)} · p10–p90 [{fmtVal(m, m.stats.gba.p10)}, {fmtVal(m, m.stats.gba.p90)}]
          </div>
        </div>
      </div>

      {m.is_normalized && (
        <p style={{ marginTop: 10, fontSize: 10.5, color: "var(--ink-3)", lineHeight: 1.5 }}>
          <b>Caveat:</b> el <i>vulnerability_score</i> está z-normalizado dentro de cada población (CABA y GBA-24
          por separado) y reescalado a [0,1], por lo que la comparación refleja <b>forma de distribución</b>, no
          nivel absoluto entre jurisdicciones. Para magnitud comparable usar los componentes crudos (NBI, IPMH,
          hacinamiento) — la mediana de NBI en GBA es {(((data.metricas.nbi_pct?.stats.gba.median ?? 0) / Math.max(data.metricas.nbi_pct?.stats.caba.median ?? 1, 0.01))).toFixed(1)}× la de CABA.
        </p>
      )}
    </div>
  );
}
