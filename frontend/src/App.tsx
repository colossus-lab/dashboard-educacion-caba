import { useState } from "react";
import "./App.css";
import KpiHeader from "./sections/KpiHeader";
import ResumenEjecutivo from "./sections/ResumenEjecutivo";
import SeriesTemporales from "./sections/SeriesTemporales";
import IndicadoresTrayectoria from "./sections/IndicadoresTrayectoria";
import Comparativa from "./sections/Comparativa";
import ComparativaInternacional from "./sections/ComparativaInternacional";
import Vulnerabilidad from "./sections/Vulnerabilidad";
import MobileNav from "./components/MobileNav";

const SECTIONS = [
  { id: "resumen", label: "Resumen ejecutivo" },
  { id: "vulnerabilidad", label: "Vulnerabilidad social" },
  { id: "series", label: "Series históricas" },
  { id: "indicadores", label: "Indicadores" },
  { id: "comparativa", label: "Comparativa nacional" },
  { id: "internacional", label: "Comparativa internacional" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

export default function App() {
  const [section, setSection] = useState<SectionId>("resumen");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-band" />
        <div className="topbar-inner">
          <div className="brand">
            <img src="/logo-ba.png" alt="Buenos Aires Ciudad" className="brand-logo-img" width={132} height={56} />
            <div className="brand-divider" />
            <div className="brand-text">
              <span className="brand-eyebrow">Ministerio de Educación</span>
              <span className="brand-title">Tablero de Educación</span>
            </div>
          </div>
          <div className="topbar-meta">
            <span>Última actualización: <strong>enero 2026</strong></span>
            <span>Padrón · Anuarios 2017-2023 · Indicadores 2012-2023</span>
          </div>
          <MobileNav
            sections={SECTIONS}
            current={section}
            onSelect={setSection}
            open={mobileNavOpen}
            setOpen={setMobileNavOpen}
          />
        </div>
      </header>
      <div className="nav-wrap">
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
      </div>

      {section !== "resumen" && <KpiHeader />}

      <main className="main">
        {section === "resumen" && <ResumenEjecutivo />}
        {section === "vulnerabilidad" && <Vulnerabilidad />}
        {section === "series" && <SeriesTemporales />}
        {section === "indicadores" && <IndicadoresTrayectoria />}
        {section === "comparativa" && <Comparativa />}
        {section === "internacional" && <ComparativaInternacional />}
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
