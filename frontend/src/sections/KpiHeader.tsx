import { useEstablecimientosSummary, useMatricula, useIndicadores, useBoleto, useESI } from "../dataLoader";

const fmtNum = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("es-AR");

const fmtPct = (n: number | null | undefined) =>
  n == null ? "—" : `${n.toFixed(2)}%`;

export default function KpiHeader() {
  const summary = useEstablecimientosSummary().data;
  const matricula = useMatricula().data;
  const indicadores = useIndicadores().data;
  const boleto = useBoleto().data;
  const esi = useESI().data;

  const totalMatricula = matricula?.find((r) => r.tipo_oferta.toLowerCase() === "total")?.total_matricula ?? null;

  const lastAbandono = indicadores?.abandono?.slice(-1)[0];
  const lastRepit = indicadores?.repitencia?.slice(-1)[0];

  return (
    <div className="kpi-header">
      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-label">Establecimientos</div>
          <div className="kpi-value">{fmtNum(summary?.total)}</div>
          <div className="kpi-sub">15 comunas — Padrón ene-2026</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Matrícula 2024</div>
          <div className="kpi-value">{fmtNum(totalMatricula)}</div>
          <div className="kpi-sub">Estatal + Privada</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">% Estatal</div>
          <div className="kpi-value">
            {summary
              ? `${Math.round((summary.por_sector["Estatal"] ?? 0) / summary.total * 100)}%`
              : "—"}
          </div>
          <div className="kpi-sub">
            Privada {summary
              ? `${Math.round((summary.por_sector["Privada"] ?? 0) / summary.total * 100)}%`
              : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Abandono Sec. {lastAbandono?.anio ?? ""}</div>
          <div className="kpi-value">{fmtPct(lastAbandono?.caba_secundaria)}</div>
          <div className="kpi-sub">CABA — comparable a Nación {fmtPct(lastAbandono?.nacion_secundaria)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Repitencia Sec. {lastRepit?.anio ?? ""}</div>
          <div className="kpi-value">{fmtPct(lastRepit?.caba_secundaria)}</div>
          <div className="kpi-sub">CABA — Nación {fmtPct(lastRepit?.nacion_secundaria)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Boleto Estudiantil 2024</div>
          <div className="kpi-value">{fmtNum(boleto?.total)}</div>
          <div className="kpi-sub">Beneficiarios totales</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Docentes ESI capacitados</div>
          <div className="kpi-value">{fmtNum(esi?.docentes_capacitados_total)}</div>
          <div className="kpi-sub">Programa ESI 2024</div>
        </div>
      </div>
    </div>
  );
}
