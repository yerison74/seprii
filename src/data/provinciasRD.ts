/**
 * Centroides aproximados de las provincias de República Dominicana [lat, lng].
 * Se usan para posicionar marcadores en el mapa del dashboard.
 * Nombres normalizados para coincidir con los datos de obras (provincia).
 */
export const PROVINCIAS_RD_CENTROIDES: Record<string, [number, number]> = {
  'Azua': [18.45, -70.73],
  'Bahoruco': [18.48, -71.22],
  'Barahona': [18.21, -71.10],
  'Dajabón': [19.55, -71.71],
  'Distrito Nacional': [18.47, -69.93],
  'Duarte': [19.30, -70.25],
  'El Seibo': [18.77, -69.04],
  'Elías Piña': [19.10, -71.58],
  'Espaillat': [19.58, -70.42],
  'Hato Mayor': [18.77, -69.26],
  'Hermanas Mirabal': [19.40, -70.39],
  'Independencia': [18.49, -71.55],
  'La Altagracia': [18.62, -68.71],
  'La Romana': [18.43, -68.97],
  'La Vega': [19.22, -70.53],
  'María Trinidad Sánchez': [19.38, -69.89],
  'Monseñor Nouel': [18.93, -70.41],
  'Monte Cristi': [19.85, -71.65],
  'Monte Plata': [18.81, -69.78],
  'Pedernales': [18.04, -71.74],
  'Peravia': [18.28, -70.33],
  'Puerto Plata': [19.80, -70.69],
  'Samaná': [19.21, -69.34],
  'San Cristóbal': [18.42, -70.11],
  'San José de Ocoa': [18.55, -70.51],
  'San Juan': [18.81, -71.23],
  'San Pedro de Macorís': [18.46, -69.31],
  'Sánchez Ramírez': [19.05, -70.15],
  'Santiago': [19.45, -70.70],
  'Santiago Rodríguez': [19.48, -71.34],
  'Santo Domingo': [18.47, -69.93],
  'Valverde': [19.58, -71.08],
};

/** Centro de República Dominicana para el mapa */
export const RD_CENTER: [number, number] = [18.7357, -70.1627];
export const RD_DEFAULT_ZOOM = 8;
