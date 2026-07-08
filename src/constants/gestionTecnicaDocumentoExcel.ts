/** Hojas del libro Excel — Gestión técnica de documento. */
export const HOJA_DOCUMENTOS = 'Documentos';
export const HOJA_MOVIMIENTOS = 'Movimientos';
export const HOJA_ADENDAS = 'Adendas';

export const DOCUMENTOS_EXCEL_HEADERS = [
  'Solicitud',
  'Cuadrantes',
  'Número de contrato',
  'Monto contrato base',
  'Tipo adenda anterior',
  'Codigo adenda anterior',
  'Monto adenda anterior',
  'Tipo adenda',
  'Codigo adenda actual',
  'No. adendas (solicituda)',
  'Monto adenda solicitada',
  'Monto total',
  'Observación',
  'Contratista',
  'ID SIGEDE',
] as const;

export const MOVIMIENTOS_EXCEL_HEADERS = [
  'Solicitud',
  'Fecha solicitud',
  'Fecha entrada',
  'No. trámite',
  'Oficio',
  'Estatus',
  'Departamento',
  'Fecha salida',
  'Observaciones',
] as const;

export const ADENDAS_EXCEL_HEADERS = [
  'Número de contrato',
  'Código adenda',
  'Tipo adenda',
  'Monto',
  'Estado',
] as const;

export const DOCUMENTOS_EXCEL_EJEMPLO: string[] = [
  'Juan Pérez García',
  'Norte',
  '1234-5678',
  '15000000.00',
  'Reformulacion de presupuesto',
  '12-345',
  '250000.00',
  'Equilibrio economico',
  '13-456',
  '3',
  '180000.00',
  '15430000.00',
  'Ejemplo de observación',
  'CONSTRUCTORA EJEMPLO SRL',
  'SIG-001, SIG-002',
];

export const MOVIMIENTOS_EXCEL_EJEMPLO: string[] = [
  'Juan Pérez García',
  '2025-01-15',
  '2025-01-20',
  'TR-2025-001',
  'OF-2025-042',
  'En Proceso',
  'Dirección técnica',
  '2025-02-01',
  'Ejemplo de observación del movimiento',
];

export const ADENDAS_EXCEL_EJEMPLO: string[] = [
  '1234-5678',
  '12-345',
  'Reformulacion de presupuesto',
  '250000.00',
  'en_curso',
];

export const DOCUMENTOS_EXCEL_COL_WIDTHS = [
  { wch: 28 },
  { wch: 14 },
  { wch: 18 },
  { wch: 18 },
  { wch: 26 },
  { wch: 18 },
  { wch: 18 },
  { wch: 26 },
  { wch: 18 },
  { wch: 20 },
  { wch: 22 },
  { wch: 16 },
  { wch: 32 },
  { wch: 28 },
  { wch: 22 },
];

export const MOVIMIENTOS_EXCEL_COL_WIDTHS = [
  { wch: 28 },
  { wch: 16 },
  { wch: 16 },
  { wch: 18 },
  { wch: 16 },
  { wch: 14 },
  { wch: 24 },
  { wch: 16 },
  { wch: 36 },
];

export const ADENDAS_EXCEL_COL_WIDTHS = [
  { wch: 18 },
  { wch: 16 },
  { wch: 28 },
  { wch: 16 },
  { wch: 12 },
];
