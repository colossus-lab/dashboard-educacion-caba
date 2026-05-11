import { useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, Popup, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useComunas, useEstablecimientos, useEstablecimientosSummary, useUniversidades, useOficinasBoleto, useAnuarios, useBrecha } from "../dataLoader";
import type { Establecimiento } from "../types";

const CABA_CENTER: [number, number] = [-34.6118, -58.4173];
const NIVEL_BUCKETS = [
  { key: "Inicial", match: ["nivel inicial", "jardín", "jardin"] },
  { key: "Primario", match: ["nivel primario"] },
  { key: "Secundario", match: ["nivel secundario", "nivel medio"] },
  { key: "Superior", match: ["superior", "terciario", "universitar"] },
  { key: "Adultos", match: ["adultos", "jóvenes y adultos"] },
  { key: "Especial", match: ["especial"] },
  { key: "Formación profesional", match: ["formación profesional", "formacion profesional"] },
];

function bucketize(nivel: string | null): string {
  if (!nivel) return "Otro";
  const n = nivel.toLowerCase();
  for (const b of NIVEL_BUCKETS) if (b.match.some((m) => n.includes(m))) return b.key;
  return "Otro";
}

function getColor(value: number, max: number): string {
  if (max === 0) return "#e3dfd2";
  const t = Math.sqrt(value / max);
  const r = Math.round(35 + t * 220);
  const g = Math.round(45 + t * 140);
  const b = Math.round(60 + t * 60);
  return `rgb(${r},${g},${b})`;
}

export default function MapaTerritorial() {
  const { data: comunas, loading: lc } = useComunas();
  const { data: schools, loading: ls } = useEstablecimientos();
  const { data: summary } = useEstablecimientosSummary();
  const { data: universidades } = useUniversidades();
  const { data: oficinasBoleto } = useOficinasBoleto();
  const { data: anuarios } = useAnuarios();
  const { data: brecha } = useBrecha();

  const [sectorFilter, setSectorFilter] = useState<"todos" | "Estatal" | "Privada">("todos");
  const [nivelFilter, setNivelFilter] = useState<string>("todos");
  const [maxPoints, setMaxPoints] = useState<number>(800);
  const [coroletaMode, setCoroletaMode] = useState<"establecimientos" | "matricula">("establecimientos");
  const [matriculaAnio, setMatriculaAnio] = useState<number>(2023);
  const [matriculaNivel, setMatriculaNivel] = useState<string>("Total Común");

  const filteredSchools = useMemo<Establecimiento[]>(() => {
    if (!schools) return [];
    return schools.filter((s) => {
      if (s.lat == null || s.lon == null) return false;
      if (sectorFilter !== "todos" && s.ges !== sectorFilter) return false;
      if (nivelFilter !== "todos" && bucketize(s.nivel) !== nivelFilter) return false;
      return true;
    });
  }, [schools, sectorFilter, nivelFilter]);

  const sample = useMemo(() => {
    if (filteredSchools.length <= maxPoints) return filteredSchools;
    const step = filteredSchools.length / maxPoints;
    const out: Establecimiento[] = [];
    for (let i = 0; i < filteredSchools.length; i += step) out.push(filteredSchools[Math.floor(i)]);
    return out;
  }, [filteredSchools, maxPoints]);

  const comunaCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    if (coroletaMode === "matricula" && anuarios) {
      for (const r of anuarios.serie_por_comuna) {
        if (r.anio === matriculaAnio && r.nivel === matriculaNivel) {
          counts[r.comuna] = r.alumnos;
        }
      }
    } else {
      for (const s of filteredSchools) {
        if (s.comuna != null) counts[s.comuna] = (counts[s.comuna] ?? 0) + 1;
      }
    }
    return counts;
  }, [filteredSchools, coroletaMode, anuarios, matriculaAnio, matriculaNivel]);

  const maxCount = Math.max(1, ...Object.values(comunaCounts));
  const coroletaLabel = coroletaMode === "matricula"
    ? `Matrícula ${matriculaNivel} ${matriculaAnio}`
    : "Establecimientos";

  const styleComuna = (feature: any) => {
    const id = feature?.properties?.comuna;
    const v = comunaCounts[id] ?? 0;
    return {
      fillColor: getColor(v, maxCount),
      weight: 1.5,
      color: "#1a2755",
      fillOpacity: 0.6,
    };
  };

  const onEachComuna = (feature: any, layer: any) => {
    const id = feature?.properties?.comuna;
    const barrios = feature?.properties?.barrios ?? "";
    const v = comunaCounts[id] ?? 0;
    layer.bindTooltip(
      `<b>Comuna ${id}</b><br/>${v.toLocaleString("es-AR")} ${coroletaMode === "matricula" ? "alumnos" : "establecimientos"}<br/><span style="color:#6b7791;font-size:11px">${barrios}</span>`,
      { sticky: true }
    );
  };

  if (lc || ls) return <div className="loading">Cargando mapa…</div>;

  return (
    <div>
      <h2 className="section-title">Mapa territorial intra-CABA</h2>
      <p className="section-desc">
        Distribución de los 2.767 establecimientos educativos por las 15 comunas. Coropleta = densidad. Puntos = escuelas individuales (muestra para performance).
      </p>

      <div className="filters">
        <label>
          Coropleta
          <select value={coroletaMode} onChange={(e) => setCoroletaMode(e.target.value as any)}>
            <option value="establecimientos">Cant. establecimientos</option>
            <option value="matricula">Matrícula por nivel/año</option>
          </select>
        </label>
        {coroletaMode === "matricula" && (
          <>
            <label>
              Año
              <select value={matriculaAnio} onChange={(e) => setMatriculaAnio(Number(e.target.value))}>
                {(anuarios?.anios ?? []).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <label>
              Nivel
              <select value={matriculaNivel} onChange={(e) => setMatriculaNivel(e.target.value)}>
                {["Total Común", "Inicial", "Primario", "Secundario", "Superior"].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </>
        )}
        <label>
          Sector
          <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value as any)}>
            <option value="todos">Todos</option>
            <option value="Estatal">Estatal</option>
            <option value="Privada">Privada</option>
          </select>
        </label>
        <label>
          Nivel educativo
          <select value={nivelFilter} onChange={(e) => setNivelFilter(e.target.value)}>
            <option value="todos">Todos</option>
            {NIVEL_BUCKETS.map((b) => <option key={b.key} value={b.key}>{b.key}</option>)}
            <option value="Otro">Otro</option>
          </select>
        </label>
        <label>
          Puntos visibles
          <select value={maxPoints} onChange={(e) => setMaxPoints(Number(e.target.value))}>
            <option value={300}>300</option>
            <option value={800}>800</option>
            <option value={1500}>1.500</option>
            <option value={3000}>Todos</option>
          </select>
        </label>
        <div style={{ marginLeft: "auto", color: "var(--ink-3)", fontSize: 13 }}>
          Mostrando <b style={{ color: "var(--ink)" }}>{filteredSchools.length.toLocaleString("es-AR")}</b> escuelas
          ({sample.length.toLocaleString("es-AR")} en mapa)
        </div>
      </div>

      <div className="map-container">
        <MapContainer center={CABA_CENTER} zoom={12} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LayersControl position="topright">
            <LayersControl.Overlay checked name={`Coropleta: ${coroletaLabel}`}>
              <GeoJSON
                key={`${coroletaMode}-${matriculaAnio}-${matriculaNivel}-${sectorFilter}-${nivelFilter}`}
                data={comunas as any}
                style={styleComuna as any}
                onEachFeature={onEachComuna}
              />
            </LayersControl.Overlay>
            <LayersControl.Overlay checked name="Escuelas (puntos)">
              <>
                {sample.map((s) => (
                  <CircleMarker
                    key={s.id ?? `${s.lat}-${s.lon}-${s.cue}`}
                    center={[s.lat!, s.lon!]}
                    radius={4}
                    pathOptions={{
                      color: s.ges === "Estatal" ? "#1a2755" : s.ges === "Privada" ? "#d4a017" : "#6b7791",
                      fillOpacity: 0.7,
                      weight: 1,
                    }}
                  >
                    <Tooltip>{s.nombre}</Tooltip>
                    <Popup>
                      <div className="school-popup">
                        <b>{s.nombre}</b>
                        <span className={`tag tag-${s.ges?.toLowerCase()}`}>{s.ges}</span>
                        <div className="meta">
                          {s.nivel}<br/>
                          {s.tipo}<br/>
                          {s.direccion} — {s.barrio} (Comuna {s.comuna})
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </>
            </LayersControl.Overlay>
            <LayersControl.Overlay name="Universidades (153)">
              <>
                {universidades?.features.map((f, i) => {
                  const c = (f.geometry as any)?.coordinates;
                  if (!c) return null;
                  const p = f.properties as any;
                  return (
                    <CircleMarker
                      key={`u-${p?.id ?? i}`}
                      center={[c[1], c[0]]}
                      radius={6}
                      pathOptions={{ color: "#8b6f47", fillColor: "#8b6f47", fillOpacity: 0.85, weight: 2 }}
                    >
                      <Tooltip>{p?.nombre}</Tooltip>
                      <Popup>
                        <div className="school-popup">
                          <b>{p?.nombre}</b>
                          {p?.unidad_aca && <div style={{ fontSize: 12 }}>{p.unidad_aca}</div>}
                          <div className="meta">
                            {p?.direccion} — {p?.barrio}{p?.comuna ? ` (Comuna ${p.comuna})` : ""}
                            {p?.web && <><br/><a href={p.web.startsWith("http") ? p.web : `https://${p.web}`} target="_blank" rel="noreferrer">{p.web}</a></>}
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </>
            </LayersControl.Overlay>
            <LayersControl.Overlay name="Oficinas Boleto Estudiantil">
              <>
                {oficinasBoleto?.features.map((f, i) => {
                  const c = (f.geometry as any)?.coordinates;
                  if (!c) return null;
                  const p = f.properties as any;
                  return (
                    <CircleMarker
                      key={`b-${i}`}
                      center={[c[1], c[0]]}
                      radius={7}
                      pathOptions={{ color: "#c47600", fillColor: "#c47600", fillOpacity: 0.85, weight: 2 }}
                    >
                      <Tooltip>{p?.empresa}</Tooltip>
                      <Popup>
                        <div className="school-popup">
                          <b>{p?.empresa}</b>
                          <span className="tag" style={{ background: "rgba(255,140,66,0.18)", color: "#c47600" }}>Oficina boleto</span>
                          <div className="meta">
                            {p?.direccion} — {p?.barrio}{p?.comuna ? ` (Comuna ${p.comuna})` : ""}<br/>
                            <b>Líneas:</b> {p?.lineas}<br/>
                            <b>Horario:</b> {p?.horario}
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </>
            </LayersControl.Overlay>
          </LayersControl>
        </MapContainer>
      </div>

      <div className="legend">
        <span className="legend-item"><span className="legend-swatch" style={{ background: "#1a2755" }}></span>Estatal</span>
        <span className="legend-item"><span className="legend-swatch" style={{ background: "#d4a017" }}></span>Privada</span>
        <span className="legend-item"><span className="legend-swatch" style={{ background: "#8b6f47" }}></span>Universidad</span>
        <span className="legend-item"><span className="legend-swatch" style={{ background: "#c47600" }}></span>Oficina boleto</span>
      </div>

      {summary && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Resumen por comuna</h3>
          <table className="table">
            <thead>
              <tr><th>Comuna</th><th className="num">Total</th><th className="num">Estatal</th><th className="num">Privada</th></tr>
            </thead>
            <tbody>
              {summary.por_comuna.map((c) => (
                <tr key={c.comuna}>
                  <td>Comuna {c.comuna}</td>
                  <td className="num">{c.total.toLocaleString("es-AR")}</td>
                  <td className="num">{c.estatal.toLocaleString("es-AR")}</td>
                  <td className="num">{c.privado.toLocaleString("es-AR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Brecha oferta-demanda ─── */}
      {brecha && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Brecha oferta–demanda educativa por comuna</h3>
          <p className="section-desc" style={{ marginBottom: 12, marginTop: -4 }}>
            Ratio matrícula común {brecha.meta.anio_anuario} / población escolarizable censo 2022.
            Ratios mayores indican comunas <b>atractoras</b> (reciben alumnos de otras zonas).
            Menores indican <b>déficit relativo</b> o residentes que estudian fuera.
          </p>
          <table className="table">
            <thead>
              <tr>
                <th>Comuna</th>
                <th className="num">Pob. escolarizable</th>
                <th className="num">Matrícula común</th>
                <th className="num">Ratio cobertura</th>
                <th>Indicador</th>
              </tr>
            </thead>
            <tbody>
              {brecha.por_comuna.slice().sort((a, b) => b.ratio_cobertura_pct - a.ratio_cobertura_pct).map((b) => {
                const ratio = b.ratio_cobertura_pct;
                const isHigh = ratio > 30;
                const isLow = ratio < 18;
                const tag = isHigh ? "Atractora" : isLow ? "Déficit" : "Equilibrio";
                const tagColor = isHigh ? "var(--good)" : isLow ? "var(--danger)" : "var(--ink-3)";
                return (
                  <tr key={b.comuna}>
                    <td>Comuna {b.comuna}</td>
                    <td className="num">{b.poblacion_escolarizable_aprox.toLocaleString("es-AR")}</td>
                    <td className="num">{b.matricula_total.toLocaleString("es-AR")}</td>
                    <td className="num" style={{ fontWeight: 700, color: tagColor }}>{ratio.toFixed(1)}%</td>
                    <td><span className="tag" style={{ background: `${tagColor}1f`, color: tagColor }}>{tag}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="section-desc" style={{ fontSize: 11, marginTop: 8 }}>
            Fuentes: INDEC CPV 2022 (radios censales) + Anuario Min. Educación {brecha.meta.anio_anuario}. {brecha.meta.interpretacion_ratio}
          </p>
        </div>
      )}
    </div>
  );
}
