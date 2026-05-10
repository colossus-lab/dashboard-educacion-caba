import { useState } from "react";
import "./App.css";
import KpiHeader from "./sections/KpiHeader";
import ResumenEjecutivo from "./sections/ResumenEjecutivo";
import MapaTerritorial from "./sections/MapaTerritorial";
import SeriesTemporales from "./sections/SeriesTemporales";
import IndicadoresTrayectoria from "./sections/IndicadoresTrayectoria";
import ProgramasCobertura from "./sections/ProgramasCobertura";
import Comparativa from "./sections/Comparativa";
import Vulnerabilidad from "./sections/Vulnerabilidad";
import Directorio from "./sections/Directorio";

const SECTIONS = [
  { id: "resumen", label: "Resumen ejecutivo" },
  { id: "mapa", label: "Mapa territorial" },
  { id: "vulnerabilidad", label: "Vulnerabilidad social" },
  { id: "series", label: "Series históricas" },
  { id: "indicadores", label: "Indicadores" },
  { id: "programas", label: "Programas y cobertura" },
  { id: "comparativa", label: "Comparativa nacional" },
  { id: "directorio", label: "Directorio" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

export default function App() {
  const [section, setSection] = useState<SectionId>("resumen");

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-band" />
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-logo" aria-label="Buenos Aires Ciudad">
              <svg width="30" height="30" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                {/* Recreación libre del Logo BA: contornos redondeados sobre placa amarilla */}
                <g fill="#0C242B">
                  {/* Letra B */}
                  <path d="M8 12 h12 c5 0 8 3 8 7 c0 2.5 -1.5 4.5 -3.5 5.3 c2.8 0.8 4.8 3 4.8 6 c0 4.5 -3.5 7.7 -8.8 7.7 H8 V12 z M14 19 V25 h5.5 c1.8 0 3 -1.2 3 -3 c0 -1.8 -1.2 -3 -3 -3 H14 z M14 31 V41 h6.5 c2 0 3.5 -1.5 3.5 -3.5 V34.5 c0 -2 -1.5 -3.5 -3.5 -3.5 H14 z" />
                  {/* Letra A */}
                  <path d="M34 38 L42 12 h7 L57 38 h-6 l-1.4 -5 H41.4 L40 38 H34 z M42.5 28 h6.2 L45.6 18 z" />
                </g>
              </svg>
            </div>
            <div className="brand-text">
              <span className="brand-eyebrow">Ministerio de Educación · GCBA</span>
              <span className="brand-title">Tablero de Educación</span>
            </div>
          </div>
          <div className="topbar-meta">
            <span>Última actualización: <strong>enero 2026</strong></span>
            <span>Padrón · Anuarios 2017-2023 · Indicadores 2012-2023</span>
          </div>
        </div>
        <nav className="nav">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={section === s.id ? "active" : ""}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </header>

      {section !== "resumen" && <KpiHeader />}

      <main className="main">
        {section === "resumen" && <ResumenEjecutivo />}
        {section === "mapa" && <MapaTerritorial />}
        {section === "vulnerabilidad" && <Vulnerabilidad />}
        {section === "series" && <SeriesTemporales />}
        {section === "indicadores" && <IndicadoresTrayectoria />}
        {section === "programas" && <ProgramasCobertura />}
        {section === "comparativa" && <Comparativa />}
        {section === "directorio" && <Directorio />}
      </main>

      <div className="footer-band" />
      <footer className="footer">
        <span>
          Fuentes: Min. Educación de la Nación · GCBA Datos Abiertos · Padrón ene-2026 · Matrícula RA 2024 · Anuarios 2017-2023
        </span>
      </footer>
    </div>
  );
}
