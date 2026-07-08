import { normalizarTextoClave } from './techadoNormalizar';
import { PROVINCIAS_RD_CENTROIDES } from '../data/provinciasRD';

/** Límites aproximados de República Dominicana para validar coordenadas. */
const RD_LAT_MIN = 17.4;
const RD_LAT_MAX = 19.95;
const RD_LNG_MIN = -72.05;
const RD_LNG_MAX = -68.3;

const PROVINCIA_KEYS = Object.keys(PROVINCIAS_RD_CENTROIDES);

/** Alias frecuentes en datos de obras → clave canónica en PROVINCIAS_RD_CENTROIDES. */
const PROVINCIA_ALIASES: Record<string, string> = {
  'DISTRITO NACIONAL': 'Distrito Nacional',
  DN: 'Distrito Nacional',
  'SANTO DOMINGO ESTE': 'Santo Domingo',
  'SANTO DOMINGO NORTE': 'Santo Domingo',
  'SANTO DOMINGO OESTE': 'Santo Domingo',
  'SAN CRISTOBAL': 'San Cristóbal',
  'EL SEIBO': 'El Seibo',
  'LA VEGA': 'La Vega',
  'LA ROMANA': 'La Romana',
  'LA ALTAGRACIA': 'La Altagracia',
  'MARIA TRINIDAD SANCHEZ': 'María Trinidad Sánchez',
  'MONSENOR NOUEL': 'Monseñor Nouel',
  'HERMANAS MIRABAL': 'Hermanas Mirabal',
  'SANCHEZ RAMIREZ': 'Sánchez Ramírez',
  'SAN JOSE DE OCOA': 'San José de Ocoa',
  'SAN PEDRO DE MACORIS': 'San Pedro de Macorís',
  'SANTIAGO RODRIGUEZ': 'Santiago Rodríguez',
  'ELIAS PINA': 'Elías Piña',
};

const PROVINCIA_NORM_INDEX = new Map<string, string>(
  PROVINCIA_KEYS.map((k) => [normalizarTextoClave(k), k]),
);

function parseCoordRaw(value: string | null | undefined): number | null {
  if (value == null || String(value).trim() === '') return null;
  const normalized = String(value).trim().replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

function enRangoRD(lat: number, lng: number): boolean {
  return lat >= RD_LAT_MIN && lat <= RD_LAT_MAX && lng >= RD_LNG_MIN && lng <= RD_LNG_MAX;
}

/**
 * Parsea lat/lng con soporte para comas decimales y detección de intercambio lat↔lng.
 */
export function parseGpsCoords(
  latitud: string | null | undefined,
  longitud: string | null | undefined,
): [number, number] | null {
  let lat = parseCoordRaw(latitud);
  let lng = parseCoordRaw(longitud);
  if (lat == null || lng == null) return null;

  const latOk = lat >= -90 && lat <= 90;
  const lngOk = lng >= -180 && lng <= 180;
  if (!latOk || !lngOk) return null;

  // Si parecen intercambiados (lng en rango latitud DR y viceversa), corregir.
  if (!enRangoRD(lat, lng) && enRangoRD(lng, lat)) {
    [lat, lng] = [lng, lat];
  }

  if (!enRangoRD(lat, lng)) return null;
  return [lat, lng];
}

/** Resuelve nombre de provincia a coordenadas del centroide. */
export function getCoordsForProvincia(nombre: string): [number, number] | undefined {
  const raw = String(nombre || '').trim();
  if (!raw) return undefined;

  if (PROVINCIAS_RD_CENTROIDES[raw]) return PROVINCIAS_RD_CENTROIDES[raw];

  const norm = normalizarTextoClave(raw);
  const aliasKey = PROVINCIA_ALIASES[norm];
  if (aliasKey && PROVINCIAS_RD_CENTROIDES[aliasKey]) {
    return PROVINCIAS_RD_CENTROIDES[aliasKey];
  }

  const byNorm = PROVINCIA_NORM_INDEX.get(norm);
  if (byNorm) return PROVINCIAS_RD_CENTROIDES[byNorm];

  const partial = PROVINCIA_KEYS.find((k) => {
    const kn = normalizarTextoClave(k);
    return kn.includes(norm) || norm.includes(kn);
  });
  return partial ? PROVINCIAS_RD_CENTROIDES[partial] : undefined;
}
