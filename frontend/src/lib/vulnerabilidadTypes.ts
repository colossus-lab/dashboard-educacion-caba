/** Indicadores Censo 2022 — un radio censal CABA. */
export type RadioCensal = {
  radio_id: string;
  comuna: string;
  departamento_id: string;
  poblacion_total: number;
  hogares_total: number;
  poblacion_escolarizable: number;
  pct_sin_instruccion: number;
  pct_secundario_completo: number;
  pct_superior_completo: number;
  tasa_nunca_asistio: number;
  nbi_pct: number;
  privacion_material_pct: number;
  hacinamiento_pct: number;
  vulnerability_score: number;
  vulnerability_decile: number;
};

export type RadiosData = {
  meta: {
    fuente: string;
    scope: string;
    generado: string;
    n_radios: number;
    componentes_vulnerability_score: string[];
    caveat_metricas_persona: string;
  };
  radios: Record<string, RadioCensal>;
};

export type RadioMetric =
  | "vulnerability_score"
  | "nbi_pct"
  | "privacion_material_pct"
  | "pct_sin_instruccion"
  | "tasa_nunca_asistio"
  | "hacinamiento_pct"
  | "pct_secundario_completo"
  | "pct_superior_completo";

export type RadioMetricSpec = {
  id: RadioMetric;
  label: string;
  description: string;
  legendTitle: string;
  invertScale?: boolean;
  format: (n: number) => string;
};

export const RADIO_METRICS: RadioMetricSpec[] = [
  {
    id: "vulnerability_score",
    label: "Índice de vulnerabilidad",
    description: "Score compuesto (0–1): z-score equal-weight de NBI + IPMH + hacinamiento. Mayor = peor contexto.",
    legendTitle: "Índice de vulnerabilidad",
    invertScale: true,
    format: (n) => n.toFixed(2),
  },
  {
    id: "nbi_pct",
    label: "% Hogares con NBI",
    description: "Necesidades Básicas Insatisfechas: hogares con al menos una privación estructural.",
    legendTitle: "% NBI",
    invertScale: true,
    format: (n) => `${n.toFixed(1)}%`,
  },
  {
    id: "privacion_material_pct",
    label: "% Hogares con privación material",
    description: "Hogares con privación material según el IPMH (recursos corrientes/patrimoniales).",
    legendTitle: "% privación IPMH",
    invertScale: true,
    format: (n) => `${n.toFixed(1)}%`,
  },
  {
    id: "hacinamiento_pct",
    label: "% Hogares con hacinamiento",
    description: "Hogares con más de 2 personas por cuarto (definición INDEC).",
    legendTitle: "% hacinamiento",
    invertScale: true,
    format: (n) => `${n.toFixed(1)}%`,
  },
  {
    id: "pct_sin_instruccion",
    label: "% Sin instrucción",
    description: "Personas mayores de 5 años que no alcanzaron ningún nivel formal.",
    legendTitle: "% sin instrucción",
    invertScale: true,
    format: (n) => `${n.toFixed(2)}%`,
  },
  {
    id: "tasa_nunca_asistio",
    label: "% Nunca asistió",
    description: "Personas que nunca asistieron a un establecimiento educativo.",
    legendTitle: "% nunca asistió",
    invertScale: true,
    format: (n) => `${n.toFixed(2)}%`,
  },
  {
    id: "pct_secundario_completo",
    label: "% Secundario completo o más",
    description: "Personas que alcanzaron al menos secundario completo como máximo nivel.",
    legendTitle: "% secundario+",
    format: (n) => `${n.toFixed(1)}%`,
  },
  {
    id: "pct_superior_completo",
    label: "% Superior completo",
    description: "Personas que alcanzaron terciario, universitario o posgrado completo.",
    legendTitle: "% superior",
    format: (n) => `${n.toFixed(1)}%`,
  },
];

export type SchoolEnriched = {
  cue: number | null;
  nombre: string | null;
  ges: string | null;
  nivel: string | null;
  tipo: string | null;
  direccion: string | null;
  barrio: string | null;
  comuna: number | null;
  lat: number;
  lon: number;
  radio_id: string | null;
  vulnerability_score: number | null;
  vulnerability_decile: number | null;
  pct_sin_instruccion: number | null;
  pct_secundario_completo: number | null;
  pct_superior_completo: number | null;
  tasa_nunca_asistio: number | null;
  nbi_pct: number | null;
  privacion_material_pct: number | null;
  hacinamiento_pct: number | null;
  confianza: "alta" | "media" | "baja";
};
