import * as XLSX from 'xlsx';
import {
  normalizarNoContrato,
  normalizarRegDist,
  parsearEnteroMatriz,
  parsearFechaMatriz,
  parsearNumeroMatriz,
  textoMatriz,
} from './techadoNormalizar';

export interface FilaMatrizTechadoParseada {
  lote: number;
  contratista_nombre: string | null;
  no_contrato: string;
  fecha_contrato: string | null;
  plantel: string;
  provincia: string | null;
  municipio: string | null;
  reg_dist: string | null;
  presupuesto_centro: number | null;
  ejecucion_actual: string | null;
  observaciones: string | null;
  estatus: string | null;
  porcentaje_ejecucion: number | null;
  porcentaje_ejecucion_alt: number | null;
  fecha_inauguracion: string | null;
  anio_proceso: number | null;
  cubicacion_enviada: string | null;
  libramiento: string | null;
  fecha_salida: string | null;
  estatus_contrato: string | null;
  proceso: string | null;
  observaciones_contrato: string | null;
  certificacion: string | null;
  tipo_adenda: string | null;
  monto_adendado: number | null;
  monto_total_inversion: number | null;
  movimiento_tierra: string | null;
  obs_movimiento_tierra: string | null;
  obs_planos_arquitectonicos: string | null;
  obs_diseno: string | null;
  as_built: string | null;
  diseno_arquitectonico: string | null;
  diseno_estructural: string | null;
  diseno_sanitario: string | null;
  diseno_electrico: string | null;
  diseno_hidraulico: string | null;
  paisajismo: string | null;
  plano_terminacion: string | null;
  presupuesto_terminacion: string | null;
  monto_presupuesto_terminacion: number | null;
  monto_contratado_centro: number | null;
  monto_total_contrato: number | null;
  avance_20_porciento: number | null;
  fecha_ultima_cubicacion: string | null;
  estatus_ultima_cubicacion: string | null;
  numero_ultima_cubicacion: string | null;
  monto_ultima_cubicacion: number | null;
  valor_cubicado_presupuesto_base: number | null;
  adicional_cubicacion: number | null;
  porcentaje_cubicado_centro: number | null;
  monto_cubicado_centro: number | null;
  monto_total_cubicado_sin_amort: number | null;
  porciento_cubicado: number | null;
  pendiente_a_cubicar: number | null;
  monto_total_pagado: number | null;
  monto_avance_centro: number | null;
}

function normHeader(h: unknown): string {
  return String(h ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/`/g, "'");
}

function findCol(headers: string[], ...needles: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (needles.some((n) => h.includes(n))) return i;
  }
  return -1;
}

function buildColumnMap(headers: string[]): Record<string, number> {
  const h = headers.map(normHeader);
  return {
    lote: findCol(h, 'LOTE'),
    contratista: findCol(h, 'CONTRATISTA'),
    noContrato: findCol(h, 'NO. CONTRATO', 'NO CONTRATO'),
    fechaContrato: findCol(h, 'FECHA DE CONTRATO'),
    plantel: findCol(h, 'PLANTEL EDUCATIVO', 'PLANTEL'),
    provincia: findCol(h, 'PROVINCIA'),
    municipio: findCol(h, 'MUNICIPIO'),
    regDist: findCol(h, 'REG-DIST', 'REG DIST'),
    presupuesto: findCol(h, 'PRESUPUESTO'),
    ejecucionActual: findCol(h, 'EJECUCION ACTUAL', 'EJECUCIÓN ACTUAL'),
    observaciones: findCol(h, 'OBSERVACIONES 17'),
    estatus: findCol(h, 'ESTATUS 15'),
    porcentaje: findCol(h, 'PORCENTAJE'),
    ejec: findCol(h, 'EJEC'),
    fechaInauguracion: findCol(h, 'FECHA DE INAGURACION', 'FECHA DE INAUGURACION'),
    fechaProceso: findCol(h, 'FECHA DE PROCESO'),
    cubicacionEnviada: findCol(h, 'CUBICACION ENVIADA', 'CUBICACIÓN ENVIADA'),
    libramiento: findCol(h, 'LIBRAMIENTO'),
    fechaSalida: findCol(h, 'FECHA SALIDA'),
    estatusContrato: findCol(h, 'ESTATUS CONTRATO'),
    proceso: findCol(h, 'PROCESO'),
    observacionesContrato: findCol(h, 'OBSERVACIONES'),
    certificacion: findCol(h, 'CERTIFICACION', 'CERTIFICACIÓN'),
    tipoAdenda: findCol(h, 'TIPO DE ADENDA'),
    montoAdendado: findCol(h, 'MONTO ADENDADO'),
    montoTotalInversion: findCol(h, 'MONTO TOTAL DE INVERSION', 'MONTO TOTAL DE INVERSIÓN'),
    movimientoTierra: findCol(h, 'MOVIMIENTO DE TIERRA'),
    obsMovimientoTierra: findCol(h, 'OBSERVACIONES DE MOVIMIENTO'),
    obsPlanosArq: findCol(h, 'OBSERVACIONES DE PLANOS ARQUITECTONICOS'),
    obsDiseno: findCol(h, "OBSERVACIONES `POR PARTE", 'POR PARTE DE DISE'),
    asBuilt: findCol(h, 'AS BUILT'),
    disenoArquitectonico: findCol(h, 'DISEÑO ARQUITECTONICO', 'DISEÑO ARQUITECTÓNICO'),
    disenoEstructural: findCol(h, 'DISEÑO ESTRUCTURAL'),
    disenoSanitario: findCol(h, 'DISEÑO SANITARIO'),
    disenoElectrico: findCol(h, 'DISEÑO ELECTRICOS', 'DISEÑO ELÉCTRICOS'),
    disenoHidraulico: findCol(h, 'DISEÑO HIDRAULICO', 'DISEÑO HIDRÁULICO'),
    paisajismo: findCol(h, 'PAISAJISMO'),
    planoTerminacion: findCol(h, 'PLANO DE TERMINACION', 'PLANO DE TERMINACIÓN'),
    presupuestoTerminacion: findCol(h, 'PRESUPUESTO DE TERMINACION', 'PRESUPUESTO DE TERMINACIÓN'),
    montoPresupuestoTerminacion: findCol(h, 'MONTO PRESUPUESTO DE TERMINACION'),
    montoContratadoCentro: findCol(h, 'MONTO CONTRATADO POR CENTRO'),
    montoTotalContrato: findCol(h, 'MONTO TOTAL POR CONTRATO'),
    avance20: findCol(h, 'AVANCE 20'),
    fechaUltimaCub: findCol(h, 'FECHA ULTIMA CUB', 'FECHA ÚLTIMA CUB'),
    estatusUltimaCub: findCol(h, 'ESTATUS'),
    numeroUltimaCub: findCol(h, '# ULTIMA CUBICACION', 'ULTIMA CUBICACION'),
    montoUltimaCub: findCol(h, 'MONTO ULTIMA CUBICACION'),
    valorCubicadoBase: findCol(h, 'VALOR CUBICADO DEL PRESUPUESTO'),
    adicional: findCol(h, 'ADICIONAL'),
    porcentajeCubicadoCentro: findCol(h, 'PORCENTAJE CUBICADO POR CENTRO'),
    montoCubicadoCentro: findCol(h, 'MONTO CUBICADO POR CENTRO'),
    montoTotalCubicadoSinAmort: findCol(h, 'MONTO TOTAL CUBICADO'),
    porcientoCubicado: findCol(h, 'PORCIENTO CUBICADO'),
    pendienteCubicar: findCol(h, 'PEDIENTE A CUBICAR', 'PENDIENTE A CUBICAR'),
    montoTotalPagado: findCol(h, 'MONTO TOTAL PAGADO'),
    montoAvanceCentro: findCol(h, 'MONTO AVANCE POR CENTRO'),
  };
}

function cell(row: unknown[], idx: number): unknown {
  return idx >= 0 && idx < row.length ? row[idx] : undefined;
}

function parseFila(row: unknown[], col: Record<string, number>): FilaMatrizTechadoParseada | null {
  const lote = parsearEnteroMatriz(cell(row, col.lote));
  const plantel = textoMatriz(cell(row, col.plantel));
  const noContratoRaw = textoMatriz(cell(row, col.noContrato));
  if (lote == null || !plantel) return null;

  const no_contrato = normalizarNoContrato(noContratoRaw || '');

  return {
    lote,
    contratista_nombre: textoMatriz(cell(row, col.contratista)),
    no_contrato,
    fecha_contrato: parsearFechaMatriz(cell(row, col.fechaContrato)),
    plantel,
    provincia: textoMatriz(cell(row, col.provincia)),
    municipio: textoMatriz(cell(row, col.municipio)),
    reg_dist: normalizarRegDist(textoMatriz(cell(row, col.regDist))) || null,
    presupuesto_centro: parsearNumeroMatriz(cell(row, col.presupuesto)),
    ejecucion_actual: textoMatriz(cell(row, col.ejecucionActual)),
    observaciones: textoMatriz(cell(row, col.observaciones)),
    estatus: textoMatriz(cell(row, col.estatus)),
    porcentaje_ejecucion: parsearNumeroMatriz(cell(row, col.porcentaje)),
    porcentaje_ejecucion_alt: parsearNumeroMatriz(cell(row, col.ejec)),
    fecha_inauguracion: parsearFechaMatriz(cell(row, col.fechaInauguracion)),
    anio_proceso: parsearEnteroMatriz(cell(row, col.fechaProceso)),
    cubicacion_enviada: textoMatriz(cell(row, col.cubicacionEnviada)),
    libramiento: textoMatriz(cell(row, col.libramiento)),
    fecha_salida: parsearFechaMatriz(cell(row, col.fechaSalida)),
    estatus_contrato: textoMatriz(cell(row, col.estatusContrato)),
    proceso: textoMatriz(cell(row, col.proceso)),
    observaciones_contrato: textoMatriz(cell(row, col.observacionesContrato)),
    certificacion: textoMatriz(cell(row, col.certificacion)),
    tipo_adenda: textoMatriz(cell(row, col.tipoAdenda)),
    monto_adendado: parsearNumeroMatriz(cell(row, col.montoAdendado)),
    monto_total_inversion: parsearNumeroMatriz(cell(row, col.montoTotalInversion)),
    movimiento_tierra: textoMatriz(cell(row, col.movimientoTierra)),
    obs_movimiento_tierra: textoMatriz(cell(row, col.obsMovimientoTierra)),
    obs_planos_arquitectonicos: textoMatriz(cell(row, col.obsPlanosArq)),
    obs_diseno: textoMatriz(cell(row, col.obsDiseno)),
    as_built: textoMatriz(cell(row, col.asBuilt)),
    diseno_arquitectonico: textoMatriz(cell(row, col.disenoArquitectonico)),
    diseno_estructural: textoMatriz(cell(row, col.disenoEstructural)),
    diseno_sanitario: textoMatriz(cell(row, col.disenoSanitario)),
    diseno_electrico: textoMatriz(cell(row, col.disenoElectrico)),
    diseno_hidraulico: textoMatriz(cell(row, col.disenoHidraulico)),
    paisajismo: textoMatriz(cell(row, col.paisajismo)),
    plano_terminacion: textoMatriz(cell(row, col.planoTerminacion)),
    presupuesto_terminacion: textoMatriz(cell(row, col.presupuestoTerminacion)),
    monto_presupuesto_terminacion: parsearNumeroMatriz(cell(row, col.montoPresupuestoTerminacion)),
    monto_contratado_centro: parsearNumeroMatriz(cell(row, col.montoContratadoCentro)),
    monto_total_contrato: parsearNumeroMatriz(cell(row, col.montoTotalContrato)),
    avance_20_porciento: parsearNumeroMatriz(cell(row, col.avance20)),
    fecha_ultima_cubicacion: parsearFechaMatriz(cell(row, col.fechaUltimaCub)),
    estatus_ultima_cubicacion: textoMatriz(cell(row, col.estatusUltimaCub)),
    numero_ultima_cubicacion: textoMatriz(cell(row, col.numeroUltimaCub)),
    monto_ultima_cubicacion: parsearNumeroMatriz(cell(row, col.montoUltimaCub)),
    valor_cubicado_presupuesto_base: parsearNumeroMatriz(cell(row, col.valorCubicadoBase)),
    adicional_cubicacion: parsearNumeroMatriz(cell(row, col.adicional)),
    porcentaje_cubicado_centro: parsearNumeroMatriz(cell(row, col.porcentajeCubicadoCentro)),
    monto_cubicado_centro: parsearNumeroMatriz(cell(row, col.montoCubicadoCentro)),
    monto_total_cubicado_sin_amort: parsearNumeroMatriz(cell(row, col.montoTotalCubicadoSinAmort)),
    porciento_cubicado: parsearNumeroMatriz(cell(row, col.porcientoCubicado)),
    pendiente_a_cubicar: parsearNumeroMatriz(cell(row, col.pendienteCubicar)),
    monto_total_pagado: parsearNumeroMatriz(cell(row, col.montoTotalPagado)),
    monto_avance_centro: parsearNumeroMatriz(cell(row, col.montoAvanceCentro)),
  };
}

export function parsearMatrizTechadoDesdeBuffer(buffer: ArrayBuffer): FilaMatrizTechadoParseada[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetName =
    wb.SheetNames.find((n) => normHeader(n).includes('MATRIZ') && normHeader(n).includes('GENERAL')) ||
    wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
  let headerIdx = data.findIndex((row) => normHeader(row[0]) === 'LOTE');
  if (headerIdx < 0) headerIdx = 1;
  const headers = (data[headerIdx] || []).map((c) => String(c));
  const col = buildColumnMap(headers);
  const filas: FilaMatrizTechadoParseada[] = [];
  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    if (!row || row.every((c) => c === '' || c == null)) continue;
    const parsed = parseFila(row, col);
    if (parsed) filas.push(parsed);
  }
  return filas;
}

export function parsearMatrizTechadoDesdeFile(file: File): Promise<FilaMatrizTechadoParseada[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(parsearMatrizTechadoDesdeBuffer(reader.result as ArrayBuffer));
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
