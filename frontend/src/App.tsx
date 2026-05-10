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
            <div className="brand-mark">
              <span className="brand-mark-text">BA</span>
            </div>
            <div className="brand-text">
              <span className="brand-eyebrow">Ministerio de Educación · GCBA</span>
              <span className="brand-title">Tablero de Educación CABA</span>
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
