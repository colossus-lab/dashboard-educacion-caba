import { useEffect, useState } from "react";
import type {
  Establecimiento,
  EstablecimientosSummary,
  MatriculaRow,
  IndicadoresData,
  HistoricosData,
  BoletoData,
  ESIData,
  AsistenciaData,
  AnuariosData,
  PadronJurisData,
  CiudadesInternacionalData,
  BrechaData,
  ForecastData,
} from "./types";

const BASE = `${import.meta.env.BASE_URL}data`;

function useFetch<T>(path: string): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(path)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return { data, loading, error };
}

export const useComunas = () => useFetch<GeoJSON.FeatureCollection>(`${BASE}/comunas_caba.geojson`);
export const useEstablecimientos = () => useFetch<Establecimiento[]>(`${BASE}/establecimientos_caba.json`);
export const useEstablecimientosGeo = () => useFetch<GeoJSON.FeatureCollection>(`${BASE}/establecimientos_caba.geojson`);
export const useEstablecimientosSummary = () => useFetch<EstablecimientosSummary>(`${BASE}/establecimientos_summary.json`);
export const useMatricula = () => useFetch<MatriculaRow[]>(`${BASE}/matricula_caba_2024.json`);
export const useIndicadores = () => useFetch<IndicadoresData>(`${BASE}/indicadores_caba.json`);
export const useHistoricos = () => useFetch<HistoricosData>(`${BASE}/historicos_caba.json`);
export const useUniversidades = () => useFetch<GeoJSON.FeatureCollection>(`${BASE}/universidades_caba.geojson`);
export const useOficinasBoleto = () => useFetch<GeoJSON.FeatureCollection>(`${BASE}/oficinas_boleto.geojson`);
export const useBoleto = () => useFetch<BoletoData>(`${BASE}/boleto_estudiantil.json`);
export const useESI = () => useFetch<ESIData>(`${BASE}/esi.json`);
export const useAsistencia = () => useFetch<AsistenciaData>(`${BASE}/asistencia_caba.json`);
export const useAnuarios = () => useFetch<AnuariosData>(`${BASE}/anuarios_caba.json`);
export const usePadronJurisdiccional = () => useFetch<PadronJurisData>(`${BASE}/padron_jurisdiccional.json`);
export const useCiudadesInternacional = () => useFetch<CiudadesInternacionalData>(`${BASE}/ciudades_internacional.json`);
export const useBrecha = () => useFetch<BrechaData>(`${BASE}/brecha_oferta_demanda.json`);
export const useForecast = () => useFetch<ForecastData>(`${BASE}/forecast_matricula.json`);

import type { RadiosData } from "./lib/vulnerabilidadTypes";
export const useRadiosCenso = () => useFetch<RadiosData>(`${BASE}/caba_radios_censo.json`);
export const useRadiosGeo = () => useFetch<GeoJSON.FeatureCollection>(`${BASE}/radios_caba.geojson`);
export const useSchoolsEnriched = () => useFetch<GeoJSON.FeatureCollection>(`${BASE}/schools_caba_enriched.geojson`);
