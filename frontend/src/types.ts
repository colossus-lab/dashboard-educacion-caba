export interface Establecimiento {
  id: number | null;
  cue: number | null;
  nombre: string | null;
  ges: string | null;
  nivel: string | null;
  tipo: string | null;
  direccion: string | null;
  barrio: string | null;
  comuna: number | null;
  lat: number | null;
  lon: number | null;
}

export interface ComunaSummary {
  comuna: number;
  total: number;
  estatal: number;
  privado: number;
  otro: number;
  niveles: Record<string, number>;
}

export interface EstablecimientosSummary {
  total: number;
  sin_comuna: number;
  por_comuna: ComunaSummary[];
  por_sector: Record<string, number>;
  por_nivel: Record<string, number>;
  por_tipo: Record<string, number>;
  por_barrio: Record<string, number>;
}

export interface MatriculaRow {
  tipo_oferta: string;
  modalidad: string;
  nivel: string;
  total_matricula: number | null;
  total_mujeres_pct: number | null;
  estatal_matricula: number | null;
  estatal_mujeres_pct: number | null;
  privado_matricula: number | null;
  privado_mujeres_pct: number | null;
}

export interface IndicadorAnual {
  indicador: string;
  anio: number;
  caba_primaria: number | null;
  caba_secundaria: number | null;
  nacion_primaria: number | null;
  nacion_secundaria: number | null;
  caba_detalle: (number | null)[];
}

export interface EscolarizacionRow {
  indicador: "escolarizacion";
  nivel: string;
  anio: number;
  caba_tasa: number;
}

export interface IndicadoresData {
  repitencia: IndicadorAnual[];
  sobreedad: IndicadorAnual[];
  abandono: IndicadorAnual[];
  escolarizacion: EscolarizacionRow[];
}

export interface HistoricosData {
  esperanza_vida_escolar: { anio: number; sexo: string; valor: number }[];
  brecha_analfabetismo: { anio: number; valor: number }[];
  tasa_escolarizacion: { anio: number; sexo: string; tasa: number; nivel: string }[];
}

export interface BoletoData {
  anio: number;
  total: number;
  por_nivel: { nivel: string; beneficiarios: number }[];
}

export interface ESIData {
  anio_actual: number;
  estudiantes: { nivel: string; total: number; estatal: number | null; privado: number | null }[];
  unidades: { nivel: string; total: number; estatal: number | null; privado: number | null }[];
  docentes_capacitados_total: number | null;
  evolucion_jurisdiccional_metadata: Record<string, { filename: string; rows: number; headers: string[] }>;
}

export interface AsistenciaData {
  tasa_por_edad: { anio: number; edad: number | null; edad_label: string; sexo: string; tasa: number | null }[];
  promedio_anios_estudio: { anio: number; sexo: string; promedio: number | null }[];
  condicion_por_edad: { anio: number; edad: number | null; sexo: string; personas: number | null; condicion: string }[];
  condicion_por_grupo_edad: { anio: number; grupo_edad: string; sexo: string; personas: number | null; condicion: string }[];
}

export interface AnuarioJurisRow {
  anio: number;
  nivel: string;
  alumnos: number;
  unidades: number | null;
  pct_estatal: number | null;
  cargos: number | null;
}

export interface AnuarioComunaRow extends AnuarioJurisRow {
  comuna: number;
}

export interface AnuariosData {
  anios: number[];
  serie_jurisdiccional: AnuarioJurisRow[];
  serie_por_comuna: AnuarioComunaRow[];
}

export interface PadronJurisRow {
  jurisdiccion: string;
  total: number;
  estatal: number;
  privado: number;
  urbano: number;
  rural: number;
  pct_estatal: number;
  pct_urbano: number;
}

export interface PadronJurisData {
  total_pais: number;
  por_jurisdiccion: PadronJurisRow[];
}

export interface CiudadInternacional {
  ciudad: string;
  pais: string;
  codigo: string;
  region: string;
  es_subnacional: boolean;
  pisa_2022: { matematica: number; lectura: number; ciencias: number; promedio: number };
  attainment_25_64: { secundario_completo_pct: number; superior_completo_pct: number };
  tasa_neta_escolarizacion: { primaria: number; secundaria: number; superior: number };
  gasto_publico_educacion_pct_pib: number;
}

export interface BrechaComunaRow {
  comuna: number;
  poblacion_total: number;
  poblacion_escolarizable_aprox: number;
  hogares: number;
  matricula_total: number;
  matricula_inicial: number;
  matricula_primario: number;
  matricula_secundario: number;
  matricula_superior: number;
  ratio_cobertura_pct: number;
}

export interface BrechaData {
  meta: {
    fuente: string;
    anio_anuario: number;
    scope: string;
    definicion_demanda: string;
    definicion_oferta: string;
    interpretacion_ratio: string;
  };
  por_comuna: BrechaComunaRow[];
}

export interface ForecastPoint {
  anio: number;
  actual: number | null;
  predicted: number | null;
  lower: number | null;
  upper: number | null;
  fitted: number | null;
}

export interface ForecastNivel {
  slope_anual: number;
  intercept: number;
  r2: number;
  sigma_residual: number;
  puntos: ForecastPoint[];
}

export interface ForecastData {
  meta: {
    metodo: string;
    fuente: string;
    anios_observados: number[];
    horizonte: number;
    caveat: string;
  };
  por_nivel: Record<string, ForecastNivel>;
}

export interface CiudadesInternacionalData {
  meta: {
    fuente_principal: string;
    scope: string;
    generado: string;
    caveat_pisa_subnational: string;
    caveat_attainment: string;
    caveat_escolarizacion: string;
    caveat_gasto: string;
  };
  ciudades: CiudadInternacional[];
}
