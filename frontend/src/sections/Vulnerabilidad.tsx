import { useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  Source,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRadiosCenso, useRadiosGeo, useSchoolsEnriched } from "../dataLoader";
import { buildChoroplethScale } from "../lib/colorScale";
import { RADIO_METRICS, type RadioMetric, type SchoolEnriched } from "../lib/vulnerabilidadTypes";
import VulnerabilidadMap3D from "./VulnerabilidadMap3D";
import HistogramaVulnerabilidad from "./HistogramaVulnerabilidad";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const CABA_BOUNDS: [[number, number], [number, number]] = [[-58.55, -34.72], [-58.32, -34.52]];

const NIVEL_OPTIONS = [
  "todos", "Inicial", "Primario", "Secundario", "Superior", "Adultos", "Especial", "Formación profesional",
];

function bucketNivel(n: string | null): string {
  if (!n) return "Otro";
  const s = n.toLowerCase();
  if (s.includes("inicial") || s.includes("jardín") || s.includes("jardin")) return "Inicial";
  if (s.includes("primario")) return "Primario";
  if (s.includes("secundario")) return "Secundario";
  if (s.includes("superior") || s.includes("terciario") || s.includes("universitar")) return "Superior";
  if (s.includes("adulto")) return "Adultos";
  if (s.includes("especial")) return "Especial";
  if (s.includes("formación profesional") || s.includes("formacion profesional")) return "Formación profesional";
  return "Otro";
}

export default function Vulnerabilidad() {
  const { data: censo, loading: lc } = useRadiosCenso();
  const { data: radiosGeo, loading: lg } = useRadiosGeo();
  const { data: schoolsGeo, loading: ls } = useSchoolsEnriched();

  const [view, setView] = useState<"2d" | "3d">("2d");
  const [radioMetric, setRadioMetric] = useState<RadioMetric>("vulnerability_score");
  const [comunaFilter, setComunaFilter] = useState<string>("todas");
  const [sectorFilter, setSectorFilter] = useState<"todos" | "Estatal" | "Privada">("todos");
  const [nivelFilter, setNivelFilter] = useState<string>("todos");
  const [decileMin, setDecileMin] = useState(1);
  const [decileMax, setDecileMax] = useState(10);
  const [hoverRadio, setHoverRadio] = useState<string | null>(null);
  const [hoverCue, setHoverCue] = useState<string | null>(null);
  const [hoverPx, setHoverPx] = useState<{ x: number; y: number } | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<SchoolEnriched | null>(null);
  const [selectedRadio, setSelectedRadio] = useState<string | null>(null);

  const mapRef = useRef<MapRef | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Schools como array plano
  const schools = useMemo<SchoolEnriched[]>(() => {
    if (!schoolsGeo) return [];
    return schoolsGeo.features.map((f) => {
      const c = (f.geometry as any)?.coordinates ?? [null, null];
      const p = f.properties as any;
      return {
        cue: p.cue ?? null,
        nombre: p.nam ?? p.fna ?? p.nombre ?? null,
        ges: p.ges ?? null,
        nivel: p.nen_mde ?? p.nivel ?? null,
        tipo: p.tip ?? p.tipo ?? null,
        direccion: p.dir ?? p.direccion ?? null,
        barrio: p.bar ?? p.barrio ?? null,
        comuna: p.com ?? p.comuna ?? null,
        lat: c[1], lon: c[0],
        radio_id: p.radio_id ?? null,
        vulnerability_score: p.vulnerability_score ?? null,
        vulnerability_decile: p.vulnerability_decile ?? null,
        pct_sin_instruccion: p.pct_sin_instruccion ?? null,
        pct_secundario_completo: p.pct_secundario_completo ?? null,
        pct_superior_completo: p.pct_superior_completo ?? null,
        tasa_nunca_asistio: p.tasa_nunca_asistio ?? null,
        nbi_pct: p.nbi_pct ?? null,
        privacion_material_pct: p.privacion_material_pct ?? null,
        hacinamiento_pct: p.hacinamiento_pct ?? null,
        confianza: (p.confianza as any) ?? "media",
      } as SchoolEnriched;
    });
  }, [schoolsGeo]);

  // Schools filtradas
  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      if (s.lat == null || s.lon == null) return false;
      if (comunaFilter !== "todas" && String(s.comuna) !== comunaFilter) return false;
      if (sectorFilter !== "todos" && s.ges !== sectorFilter) return false;
      if (nivelFilter !== "todos" && bucketNivel(s.nivel) !== nivelFilter) return false;
      const d = s.vulnerability_decile ?? 0;
      if (d < decileMin || d > decileMax) return false;
      return true;
    });
  }, [schools, comunaFilter, sectorFilter, nivelFilter, decileMin, decileMax]);

  // Radios con value de la métrica seleccionada
  const { radiosWithValue, scale } = useMemo(() => {
    if (!radiosGeo || !censo) return { radiosWithValue: null as any, scale: null as any };
    const nums: number[] = [];
    const features = radiosGeo.features.map((f) => {
      const id = (f.properties?.radio_id as string) ?? "";
      const r = censo.radios[id];
      const v = r ? Number((r as any)[radioMetric] ?? 0) : 0;
      nums.push(v);
      return { ...f, id, properties: { ...f.properties, value: v } };
    });
    return {
      radiosWithValue: { type: "FeatureCollection", features } as GeoJSON.FeatureCollection,
      scale: buildChoroplethScale(nums),
    };
  }, [radiosGeo, censo, radioMetric]);

  const fillColor = useMemo(() => {
    if (!scale) return "#f3f0ea";
    if (scale.stops.length === 1) return scale.stops[0][1];
    const expr: any[] = ["interpolate", ["linear"], ["get", "value"]];
    scale.stops.forEach((pair: [number, string]) => { expr.push(pair[0], pair[1]); });
    return expr;
  }, [scale]);

  // Schools FC para MapLibre
  const schoolsFc = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: "FeatureCollection",
    features: filteredSchools.map((s) => ({
      type: "Feature",
      id: String(s.cue ?? ""),
      geometry: { type: "Point", coordinates: [s.lon, s.lat] },
      properties: {
        cue: String(s.cue ?? ""),
        nombre: s.nombre,
        sector: s.ges,
        decile: s.vulnerability_decile,
        confianza: s.confianza,
      },
    })),
  }), [filteredSchools]);

  // Ranking lateral
  const ranking = useMemo(() => {
    const spec = RADIO_METRICS.find((m) => m.id === radioMetric)!;
    const arr = filteredSchools
      .filter((s) => s.confianza !== "baja")
      .map((s) => ({ s, v: ((s as any)[radioMetric] as number | null) }))
      .filter((x) => x.v != null);
    arr.sort((a, b) => spec.invertScale ? (b.v! - a.v!) : (a.v! - b.v!));
    return arr;
  }, [filteredSchools, radioMetric]);

  const onMouseMove = (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (!f) {
      setHoverRadio(null); setHoverCue(null); setHoverPx(null);
      return;
    }
    setHoverPx({ x: e.point.x, y: e.point.y });
    const layer = f.layer?.id;
    if (layer === "schools-circle") {
      setHoverCue(((f.properties?.cue as string) ?? null) || null);
      setHoverRadio(null);
    } else {
      setHoverRadio(((f.properties?.radio_id as string) ?? null) || null);
      setHoverCue(null);
    }
  };

  const onClick = (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (!f) {
      setSelectedRadio(null); setSelectedSchool(null);
      return;
    }
    const layer = f.layer?.id;
    if (layer === "schools-circle") {
      const cue = (f.properties?.cue as string) ?? null;
      const sch = schools.find((s) => String(s.cue) === cue) ?? null;
      setSelectedSchool(sch);
      setSelectedRadio(null);
    } else {
      setSelectedRadio((f.properties?.radio_id as string) ?? null);
      setSelectedSchool(null);
    }
  };

  // Resize observer para que MapLibre se ajuste
  useEffect(() => {
    if (!wrapperRef.current) return;
    const el = wrapperRef.current;
    const tick = () => mapRef.current?.getMap()?.resize();
    const obs = new ResizeObserver(tick);
    obs.observe(el);
    const iv = setInterval(tick, 250);
    const stop = setTimeout(() => clearInterval(iv), 4000);
    return () => { obs.disconnect(); clearInterval(iv); clearTimeout(stop); };
  }, []);

  if (lc || lg || ls) return <div className="loading">Cargando datos del Censo 2022 + radios…</div>;

  const spec = RADIO_METRICS.find((m) => m.id === radioMetric)!;
  const hoveredSchool = hoverCue ? schools.find((s) => String(s.cue) === hoverCue) : null;
  const hoveredRadio = hoverRadio && censo ? censo.radios[hoverRadio] : null;

  // En zonas más vulnerables (decil 9-10)
  const enZonasVulnerables = filteredSchools.filter((s) => (s.vulnerability_decile ?? 0) >= 9).length;
  const decilCount = (d: number) => filteredSchools.filter((s) => s.vulnerability_decile === d).length;

  return (
    <div>
      <h2 className="section-title">Vulnerabilidad social y educación</h2>
      <p className="section-desc">
        Cruce del Censo Nacional 2022 a nivel <b>radio censal</b> ({censo?.meta.n_radios.toLocaleString("es-AR")} radios CABA) con
        las escuelas geocodificadas. Cada colegio se ubica en su radio y hereda el contexto socioeconómico del entorno —
        índice compuesto NBI + privación material + hacinamiento.
      </p>

      {/* KPIs internos */}
      <div className="kpi-row" style={{ padding: 0, marginBottom: 18 }}>
        <div className="kpi">
          <div className="kpi-label">Escuelas en zonas decil 10</div>
          <div className="kpi-value" style={{ color: "var(--danger)" }}>{decilCount(10).toLocaleString("es-AR")}</div>
          <div className="kpi-sub">Contexto más vulnerable</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Decil 9 + 10</div>
          <div className="kpi-value">{enZonasVulnerables.toLocaleString("es-AR")}</div>
          <div className="kpi-sub">{((enZonasVulnerables / filteredSchools.length) * 100).toFixed(1)}% del total filtrado</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Escuelas filtradas</div>
          <div className="kpi-value">{filteredSchools.length.toLocaleString("es-AR")}</div>
          <div className="kpi-sub">de {schools.length.toLocaleString("es-AR")} total</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Radios censales</div>
          <div className="kpi-value">{censo?.meta.n_radios.toLocaleString("es-AR") ?? "—"}</div>
          <div className="kpi-sub">15 comunas · INDEC CPV 2022</div>
        </div>
      </div>

      {/* Histograma comparativo CABA vs GBA-24 */}
      <HistogramaVulnerabilidad />

      {/* Filtros */}
      <div className="filters">
        <label>
          Vista
          <div style={{ display: "flex", gap: 0, border: "1px solid var(--border-2)", borderRadius: 4, overflow: "hidden" }}>
            <button onClick={() => setView("2d")} style={{
              padding: "6px 14px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
              fontFamily: "var(--font-sans)",
              background: view === "2d" ? "var(--navy)" : "var(--surface)",
              color: view === "2d" ? "#fff" : "var(--ink-2)",
            }}>2D</button>
            <button onClick={() => setView("3d")} style={{
              padding: "6px 14px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
              fontFamily: "var(--font-sans)",
              background: view === "3d" ? "var(--navy)" : "var(--surface)",
              color: view === "3d" ? "#fff" : "var(--ink-2)",
            }}>3D</button>
          </div>
        </label>
        <label>
          Métrica del coropleta
          <select value={radioMetric} onChange={(e) => setRadioMetric(e.target.value as RadioMetric)} style={{ minWidth: 220 }}>
            {RADIO_METRICS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        <label>
          Comuna
          <select value={comunaFilter} onChange={(e) => setComunaFilter(e.target.value)}>
            <option value="todas">Todas</option>
            {Array.from({ length: 15 }, (_, i) => i + 1).map((c) =>
              <option key={c} value={String(c)}>Comuna {c}</option>
            )}
          </select>
        </label>
        <label>
          Sector
          <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value as any)}>
            <option value="todos">Todos</option>
            <option value="Estatal">Estatal</option>
            <option value="Privada">Privada</option>
          </select>
        </label>
        <label>
          Nivel
          <select value={nivelFilter} onChange={(e) => setNivelFilter(e.target.value)}>
            {NIVEL_OPTIONS.map((n) => <option key={n} value={n}>{n === "todos" ? "Todos los niveles" : n}</option>)}
          </select>
        </label>
        <label>
          Decil de vulnerabilidad: {decileMin}–{decileMax}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="range" min={1} max={10} step={1} value={decileMin}
              onChange={(e) => setDecileMin(Math.min(Number(e.target.value), decileMax))}
              style={{ width: 80 }} />
            <input type="range" min={1} max={10} step={1} value={decileMax}
              onChange={(e) => setDecileMax(Math.max(Number(e.target.value), decileMin))}
              style={{ width: 80 }} />
          </div>
        </label>
        <button onClick={() => {
          setComunaFilter("todas"); setSectorFilter("todos"); setNivelFilter("todos");
          setDecileMin(1); setDecileMax(10);
        }} style={{
          marginLeft: "auto", border: "1px solid var(--border-2)", background: "var(--surface)",
          padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12, color: "var(--ink-2)",
        }}>Limpiar</button>
      </div>

      <div className="vulnerabilidad-layout" style={{ marginTop: 8 }}>
        {/* Mapa */}
        {view === "3d" && radiosGeo && censo ? (
          <VulnerabilidadMap3D
            radiosGeo={radiosGeo}
            radios={censo}
            schools={filteredSchools}
            metric={radioMetric}
            selectedSchool={selectedSchool}
            setSelectedSchool={setSelectedSchool}
            selectedRadio={selectedRadio}
            setSelectedRadio={setSelectedRadio}
          />
        ) : (
        <div ref={wrapperRef} style={{ position: "relative" }} className="map-container map-container--vulnerabilidad">
          <Map
            ref={mapRef}
            initialViewState={{ longitude: -58.4173, latitude: -34.6118, zoom: 11.6 }}
            mapStyle={MAP_STYLE}
            interactiveLayerIds={["radios-fill", "schools-circle"]}
            onClick={onClick}
            onMouseMove={onMouseMove}
            onMouseLeave={() => { setHoverRadio(null); setHoverCue(null); setHoverPx(null); }}
            maxBounds={CABA_BOUNDS}
            minZoom={10.5}
            maxZoom={16}
            style={{ height: "100%", width: "100%" }}
          >
            {radiosWithValue && (
              <Source id="radios" type="geojson" data={radiosWithValue} promoteId="radio_id">
                <Layer id="radios-fill" type="fill" paint={{ "fill-color": fillColor as any, "fill-opacity": 0.62 }} />
                <Layer id="radios-line" type="line" paint={{
                  "line-color": ["case", ["==", ["get", "radio_id"], selectedRadio ?? ""], "#1a2755", "#94908a"],
                  "line-width": ["case",
                    ["==", ["get", "radio_id"], selectedRadio ?? ""], 2.5,
                    ["==", ["get", "radio_id"], hoverRadio ?? ""], 1.4,
                    0.18,
                  ],
                  "line-opacity": 0.6,
                }} />
              </Source>
            )}
            <Source id="schools" type="geojson" data={schoolsFc} promoteId="cue">
              <Layer id="schools-circle" type="circle" paint={{
                "circle-radius": ["case",
                  ["==", ["get", "cue"], selectedSchool ? String(selectedSchool.cue) : ""], 7,
                  ["==", ["get", "cue"], hoverCue ?? ""], 5.5,
                  ["==", ["get", "confianza"], "baja"], 2.2,
                  3.4,
                ],
                "circle-color": ["case",
                  ["==", ["get", "confianza"], "baja"], "#9ca3af",
                  ["step", ["coalesce", ["get", "decile"], 0],
                    "#6b7280",
                    1, "#16a34a",
                    3, "#84cc16",
                    5, "#f59e0b",
                    7, "#f97316",
                    9, "#dc2626",
                  ],
                ],
                "circle-stroke-color": "#0a0a0a",
                "circle-stroke-width": ["case",
                  ["==", ["get", "cue"], selectedSchool ? String(selectedSchool.cue) : ""], 2.2,
                  0.6,
                ],
                "circle-opacity": 0.92,
              }} />
            </Source>
          </Map>

          {/* Hover tooltip */}
          {hoverPx && (hoveredSchool || hoveredRadio) && (
            <div style={{
              position: "absolute", zIndex: 10, pointerEvents: "none",
              left: Math.min(hoverPx.x + 14, (wrapperRef.current?.clientWidth ?? 1200) - 290),
              top: Math.min(hoverPx.y + 14, (wrapperRef.current?.clientHeight ?? 700) - 160),
              width: 270, padding: 12, background: "rgba(255,255,255,0.96)",
              border: "1px solid var(--border)", borderRadius: 4, boxShadow: "var(--shadow-lg)",
              fontSize: 12, lineHeight: 1.4, fontFamily: "var(--font-sans)",
            }}>
              {hoveredSchool ? (
                <>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                    Colegio · {hoveredSchool.ges}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-sans)" }}>
                    {hoveredSchool.nombre}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11, color: "var(--ink-3)" }}>
                    {hoveredSchool.barrio} · Comuna {hoveredSchool.comuna}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700, fontFamily: "var(--font-sans)", color: "var(--ink)" }}>
                    {hoveredSchool.vulnerability_decile != null ? `Decil ${hoveredSchool.vulnerability_decile}` : "—"}
                  </div>
                </>
              ) : hoveredRadio ? (
                <>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                    Radio censal · {hoveredRadio.comuna}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                    {hoveredRadio.radio_id}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700, fontFamily: "var(--font-sans)", color: "var(--ink)" }}>
                    {spec.format(((hoveredRadio as any)[radioMetric] ?? 0))}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {spec.legendTitle}
                  </div>
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px", fontSize: 11, color: "var(--ink-3)" }}>
                    <span>Decil</span><span style={{ textAlign: "right", color: "var(--ink-2)" }}>{hoveredRadio.vulnerability_decile}</span>
                    <span>NBI</span><span style={{ textAlign: "right", color: "var(--ink-2)" }}>{hoveredRadio.nbi_pct.toFixed(1)}%</span>
                    <span>Hacinamiento</span><span style={{ textAlign: "right", color: "var(--ink-2)" }}>{hoveredRadio.hacinamiento_pct.toFixed(1)}%</span>
                    <span>Hogares</span><span style={{ textAlign: "right", color: "var(--ink-2)" }}>{hoveredRadio.hogares_total.toLocaleString("es-AR")}</span>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Legend */}
          {scale && (
            <div style={{
              position: "absolute", bottom: 16, left: 16, zIndex: 5,
              background: "rgba(255,255,255,0.95)", border: "1px solid var(--border)",
              borderRadius: 4, padding: 10, fontSize: 11, fontFamily: "var(--font-sans)",
              boxShadow: "var(--shadow)",
            }}>
              <div style={{ fontWeight: 600, color: "var(--ink-2)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 10 }}>
                {spec.legendTitle}
              </div>
              {scale.legend.map((pair: [string, string], i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <span style={{ width: 16, height: 12, background: pair[1], border: "1px solid var(--border)" }} />
                  <span style={{ color: "var(--ink-3)" }}>{pair[0]}</span>
                </div>
              ))}
            </div>
          )}

          {/* Decile dot legend */}
          <div style={{
            position: "absolute", top: 16, right: 16, zIndex: 5,
            background: "rgba(255,255,255,0.95)", border: "1px solid var(--border)",
            borderRadius: 4, padding: "8px 10px", fontSize: 11, fontFamily: "var(--font-sans)",
            boxShadow: "var(--shadow)",
          }}>
            <div style={{ fontWeight: 600, color: "var(--ink-2)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 10 }}>
              Decil del colegio
            </div>
            {[
              ["Decil 1-2 (mejor)", "#16a34a"],
              ["Decil 3-4", "#84cc16"],
              ["Decil 5-6", "#f59e0b"],
              ["Decil 7-8", "#f97316"],
              ["Decil 9-10 (peor)", "#dc2626"],
            ].map(([label, color]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span style={{ width: 10, height: 10, borderRadius: 6, background: color, border: "1.5px solid #0a0a0a" }} />
                <span style={{ color: "var(--ink-3)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Sidebar: ranking + detalle */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {selectedSchool && (
            <div className="card" style={{ marginBottom: 0, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div className="insight-eyebrow">Detalle del colegio</div>
                <button onClick={() => setSelectedSchool(null)} style={{
                  background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 18, lineHeight: 1, padding: 0,
                }}>×</button>
              </div>
              <h4 style={{ margin: "6px 0 4px", fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 700 }}>{selectedSchool.nombre}</h4>
              <span className={`tag tag-${selectedSchool.ges?.toLowerCase()}`}>{selectedSchool.ges}</span>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6 }}>
                {selectedSchool.direccion}<br />{selectedSchool.barrio} · Comuna {selectedSchool.comuna}<br />
                {selectedSchool.nivel}
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                <div className="insight-eyebrow">Contexto censal del radio</div>
                <div style={{ marginTop: 4, fontSize: 22, fontFamily: "var(--font-sans)", fontWeight: 700,
                  color: (selectedSchool.vulnerability_decile ?? 0) >= 9 ? "var(--danger)" :
                         (selectedSchool.vulnerability_decile ?? 0) >= 7 ? "var(--warning)" : "var(--ink)" }}>
                  Decil {selectedSchool.vulnerability_decile ?? "—"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "2px 12px", fontSize: 11, marginTop: 8 }}>
                  <span style={{ color: "var(--ink-3)" }}>NBI</span><span style={{ textAlign: "right" }}>{selectedSchool.nbi_pct?.toFixed(1) ?? "—"}%</span>
                  <span style={{ color: "var(--ink-3)" }}>Privación material (IPMH)</span><span style={{ textAlign: "right" }}>{selectedSchool.privacion_material_pct?.toFixed(1) ?? "—"}%</span>
                  <span style={{ color: "var(--ink-3)" }}>Hacinamiento</span><span style={{ textAlign: "right" }}>{selectedSchool.hacinamiento_pct?.toFixed(1) ?? "—"}%</span>
                  <span style={{ color: "var(--ink-3)" }}>Sin instrucción</span><span style={{ textAlign: "right" }}>{selectedSchool.pct_sin_instruccion?.toFixed(2) ?? "—"}%</span>
                  <span style={{ color: "var(--ink-3)" }}>Sec. completo+</span><span style={{ textAlign: "right" }}>{selectedSchool.pct_secundario_completo?.toFixed(1) ?? "—"}%</span>
                  <span style={{ color: "var(--ink-3)" }}>Superior completo</span><span style={{ textAlign: "right" }}>{selectedSchool.pct_superior_completo?.toFixed(1) ?? "—"}%</span>
                </div>
              </div>
            </div>
          )}

          <div className="card" style={{ padding: 0, marginBottom: 0 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <div className="insight-eyebrow">Ranking · {spec.label}</div>
              <div style={{ marginTop: 2, fontSize: 12, fontWeight: 600 }}>
                {spec.invertScale ? "Peores primero" : "Mejores primero"}
              </div>
              <div style={{ marginTop: 2, fontSize: 11, color: "var(--ink-3)" }}>
                {ranking.length.toLocaleString("es-AR")} colegios en la vista
              </div>
            </div>
            <div style={{ maxHeight: 600, overflowY: "auto" }}>
              <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {ranking.slice(0, 200).map(({ s, v }, i) => {
                  const isSel = selectedSchool?.cue === s.cue;
                  return (
                    <li key={s.cue}
                      onClick={() => setSelectedSchool(isSel ? null : s)}
                      style={{
                        cursor: "pointer", padding: "8px 16px",
                        borderBottom: "1px solid var(--border)",
                        background: isSel ? "rgba(212, 160, 23, 0.08)" : "transparent",
                        display: "flex", gap: 8, alignItems: "flex-start",
                      }}>
                      <span style={{ width: 22, fontSize: 11, color: "var(--ink-4)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {i + 1}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 12, color: "var(--ink-2)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.nombre}
                        </span>
                        <span style={{ display: "block", fontSize: 10.5, color: "var(--ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.barrio} · Comuna {s.comuna} · {s.ges}
                        </span>
                      </span>
                      <span style={{ textAlign: "right", flexShrink: 0 }}>
                        <span style={{ display: "block", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                          {v != null ? spec.format(v) : "—"}
                        </span>
                        {s.vulnerability_decile != null && (
                          <span style={{
                            display: "inline-block", marginTop: 1, padding: "1px 5px", borderRadius: 3,
                            fontSize: 9.5, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                            background: decileBg(s.vulnerability_decile),
                            color: decileFg(s.vulnerability_decile),
                          }}>d{s.vulnerability_decile}</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
              {ranking.length > 200 && (
                <div style={{ padding: "8px 16px", textAlign: "center", fontSize: 10.5, color: "var(--ink-4)" }}>
                  Mostrando 200 de {ranking.length.toLocaleString("es-AR")}. Aplicá filtros para acotar.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <p className="section-desc" style={{ marginTop: 18 }}>
        <b>Metodología:</b> {censo?.meta.componentes_vulnerability_score.join(" + ")} · z-score equal-weight, normalizado [0,1], dividido en deciles 1-10.
        Spatial join (within) escuelas → radio censal. Métrica del coropleta seleccionable arriba: {spec.description}
      </p>
    </div>
  );
}

function decileBg(d: number): string {
  if (d >= 9) return "rgba(220, 38, 38, 0.15)";
  if (d >= 7) return "rgba(249, 115, 22, 0.15)";
  if (d >= 5) return "rgba(245, 158, 11, 0.15)";
  if (d >= 3) return "rgba(132, 204, 22, 0.15)";
  return "rgba(22, 163, 74, 0.15)";
}
function decileFg(d: number): string {
  if (d >= 9) return "#991b1b";
  if (d >= 7) return "#9a3412";
  if (d >= 5) return "#92400e";
  if (d >= 3) return "#3f6212";
  return "#166534";
}
