import type {
  ContratoAdendaTechado,
  ContratoTechado,
  MatrizGeneralTechado,
  Obra,
} from '../types/database';
import { normalizarNoContrato } from './techadoNormalizar';

export type FormatoCampoDetalle = 'text' | 'currency' | 'number' | 'percent' | 'percentDecimal' | 'date';

export interface CampoDetalleTechado {
  label: string;
  value: string;
  grupo: string;
}

type FuenteCampo = {
  label: string;
  grupo: string;
  format?: FormatoCampoDetalle;
  get: (ctx: {
    matriz: MatrizGeneralTechado;
    contrato: ContratoTechado;
  }) => unknown;
  omitirSiObra?: (obra: Obra, ctx: { matriz: MatrizGeneralTechado; contrato: ContratoTechado }) => boolean;
};

function normTexto(valor?: string | null): string {
  return (valor ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function normEstado(valor?: string | null): string {
  return normTexto(valor) || 'NO ESPECIFICADO';
}

function normContrato(valor?: string | null): string {
  return normalizarNoContrato(valor ?? '') || normTexto(valor);
}

function normFecha(valor?: string | null): string {
  if (!valor) return '';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor.trim();
  return d.toISOString().slice(0, 10);
}

function montosIguales(a?: number | null, b?: number | null): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(Number(a) - Number(b)) < 0.02;
}

function porcentajeMatrizANumero(valor?: number | null): number | null {
  if (valor == null || Number.isNaN(Number(valor))) return null;
  const n = Number(valor);
  if (n > 0 && n <= 1) return Math.round(n * 10000) / 100;
  return n;
}

export function formatearValorDetalle(valor: unknown, format?: FormatoCampoDetalle): string | null {
  if (valor == null || valor === '') return null;
  switch (format) {
    case 'currency':
      return Number(valor).toLocaleString('es-DO', { style: 'currency', currency: 'DOP' });
    case 'number':
      return Number(valor).toLocaleString('es-DO');
    case 'percent':
      return `${Number(valor).toLocaleString('es-DO', { maximumFractionDigits: 2 })}%`;
    case 'percentDecimal': {
      const pct = porcentajeMatrizANumero(valor as number);
      return pct != null
        ? `${pct.toLocaleString('es-DO', { maximumFractionDigits: 2 })}%`
        : null;
    }
    case 'date': {
      const d = new Date(String(valor));
      if (Number.isNaN(d.getTime())) return String(valor);
      return d.toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    default:
      return String(valor).trim() || null;
  }
}

const CAMPOS_TECHADO: FuenteCampo[] = [
  {
    label: 'Lote',
    grupo: 'Programa Techado',
    format: 'number',
    get: ({ matriz }) => matriz.lote,
  },
  {
    label: 'Plantel (matriz)',
    grupo: 'Programa Techado',
    get: ({ matriz }) => matriz.plantel,
    omitirSiObra: (obra, { matriz }) => normTexto(obra.nombre) === normTexto(matriz.plantel),
  },
  {
    label: 'REG-DIST (distrito regional)',
    grupo: 'Programa Techado',
    get: ({ matriz }) => matriz.reg_dist,
    omitirSiObra: (obra, { matriz }) =>
      normTexto(obra.distrito_minerd_sigede) === normTexto(matriz.reg_dist),
  },
  {
    label: 'Provincia (matriz)',
    grupo: 'Programa Techado',
    get: ({ matriz }) => matriz.provincia,
    omitirSiObra: (obra, { matriz }) => normTexto(obra.provincia) === normTexto(matriz.provincia),
  },
  {
    label: 'Municipio (matriz)',
    grupo: 'Programa Techado',
    get: ({ matriz }) => matriz.municipio,
    omitirSiObra: (obra, { matriz }) => normTexto(obra.municipio) === normTexto(matriz.municipio),
  },
  {
    label: 'Estado (matriz)',
    grupo: 'Programa Techado',
    get: ({ matriz }) => matriz.estatus,
    omitirSiObra: (obra, { matriz }) => normEstado(obra.estado) === normEstado(matriz.estatus),
  },
  {
    label: 'Ejecución actual',
    grupo: 'Programa Techado',
    get: ({ matriz }) => matriz.ejecucion_actual,
  },
  {
    label: '% ejecución (matriz)',
    grupo: 'Programa Techado',
    format: 'percentDecimal',
    get: ({ matriz }) => matriz.porcentaje_ejecucion,
    omitirSiObra: (obra, { matriz }) => {
      const a = obra.porcentaje_ejecutado;
      const b = porcentajeMatrizANumero(matriz.porcentaje_ejecucion);
      if (a == null || b == null) return false;
      return Math.abs(Number(a) - b) < 0.05;
    },
  },
  {
    label: '% ejecución alt.',
    grupo: 'Programa Techado',
    format: 'percentDecimal',
    get: ({ matriz }) => matriz.porcentaje_ejecucion_alt,
  },
  {
    label: 'Año proceso',
    grupo: 'Programa Techado',
    format: 'number',
    get: ({ matriz }) => matriz.anio_proceso,
  },
  {
    label: 'Fecha inauguración (matriz)',
    grupo: 'Programa Techado',
    format: 'date',
    get: ({ matriz }) => matriz.fecha_inauguracion,
    omitirSiObra: (obra, { matriz }) =>
      normFecha(obra.fecha_inauguracion) === normFecha(matriz.fecha_inauguracion),
  },
  {
    label: 'Observaciones (matriz)',
    grupo: 'Programa Techado',
    get: ({ matriz }) => matriz.observaciones,
  },
  {
    label: 'No. contrato (lote)',
    grupo: 'Contrato Techado',
    get: ({ contrato }) => contrato.no_contrato,
    omitirSiObra: (obra, { contrato }) => normContrato(obra.contrato) === normContrato(contrato.no_contrato),
  },
  {
    label: 'Contratista (matriz)',
    grupo: 'Contrato Techado',
    get: ({ contrato }) => contrato.contratista_nombre,
    omitirSiObra: (obra, { contrato }) =>
      normTexto(obra.responsable) === normTexto(contrato.contratista_nombre),
  },
  {
    label: 'Fecha contrato',
    grupo: 'Contrato Techado',
    format: 'date',
    get: ({ contrato }) => contrato.fecha_contrato,
  },
  {
    label: 'Presupuesto centro',
    grupo: 'Contrato Techado',
    format: 'currency',
    get: ({ contrato }) => contrato.presupuesto_centro,
    omitirSiObra: (obra, { contrato }) => montosIguales(obra.presupuesto_total, contrato.presupuesto_centro),
  },
  {
    label: 'Estatus contrato',
    grupo: 'Contrato Techado',
    get: ({ contrato }) => contrato.estatus_contrato,
  },
  {
    label: 'Proceso',
    grupo: 'Contrato Techado',
    get: ({ contrato }) => contrato.proceso,
  },
  {
    label: 'Certificación',
    grupo: 'Contrato Techado',
    get: ({ contrato }) => contrato.certificacion,
  },
  {
    label: 'Monto total inversión',
    grupo: 'Contrato Techado',
    format: 'currency',
    get: ({ contrato }) => contrato.monto_total_inversion,
  },
  {
    label: 'Monto total contrato',
    grupo: 'Contrato Techado',
    format: 'currency',
    get: ({ contrato }) => contrato.monto_total_contrato,
  },
  {
    label: 'Avance 20%',
    grupo: 'Contrato Techado',
    format: 'currency',
    get: ({ contrato }) => contrato.avance_20_porciento,
  },
  {
    label: 'Cubicación enviada',
    grupo: 'Contrato Techado',
    get: ({ contrato }) => contrato.cubicacion_enviada,
  },
  {
    label: 'Libramiento',
    grupo: 'Contrato Techado',
    get: ({ contrato }) => contrato.libramiento,
  },
  {
    label: 'Fecha salida',
    grupo: 'Contrato Techado',
    format: 'date',
    get: ({ contrato }) => contrato.fecha_salida,
  },
  {
    label: 'Observaciones contrato',
    grupo: 'Contrato Techado',
    get: ({ contrato }) => contrato.observaciones,
  },
  {
    label: 'Monto contratado centro',
    grupo: 'Cubicación y pagos',
    format: 'currency',
    get: ({ matriz }) => matriz.monto_contratado_centro,
    omitirSiObra: (obra, { matriz }) => montosIguales(obra.presupuesto_total, matriz.monto_contratado_centro),
  },
  {
    label: 'Monto cubicado centro',
    grupo: 'Cubicación y pagos',
    format: 'currency',
    get: ({ matriz }) => matriz.monto_cubicado_centro,
  },
  {
    label: '% cubicado centro',
    grupo: 'Cubicación y pagos',
    format: 'percentDecimal',
    get: ({ matriz }) => matriz.porcentaje_cubicado_centro,
  },
  {
    label: 'Monto total cubicado sin amort.',
    grupo: 'Cubicación y pagos',
    format: 'currency',
    get: ({ matriz }) => matriz.monto_total_cubicado_sin_amort,
  },
  {
    label: '% cubicado',
    grupo: 'Cubicación y pagos',
    format: 'percentDecimal',
    get: ({ matriz }) => matriz.porciento_cubicado,
  },
  {
    label: 'Pendiente a cubicar',
    grupo: 'Cubicación y pagos',
    format: 'currency',
    get: ({ matriz }) => matriz.pendiente_a_cubicar,
  },
  {
    label: 'Monto total pagado (matriz)',
    grupo: 'Cubicación y pagos',
    format: 'currency',
    get: ({ matriz }) => matriz.monto_total_pagado,
    omitirSiObra: (obra, { matriz }) => montosIguales(obra.total_pagado, matriz.monto_total_pagado),
  },
  {
    label: 'Monto avance centro',
    grupo: 'Cubicación y pagos',
    format: 'currency',
    get: ({ matriz }) => matriz.monto_avance_centro,
  },
  {
    label: 'Fecha última cubicación',
    grupo: 'Cubicación y pagos',
    format: 'date',
    get: ({ matriz }) => matriz.fecha_ultima_cubicacion,
  },
  {
    label: 'Estatus última cubicación',
    grupo: 'Cubicación y pagos',
    get: ({ matriz }) => matriz.estatus_ultima_cubicacion,
    omitirSiObra: (obra, { matriz }) =>
      normTexto(obra.estatus_ultima_cubicacion) === normTexto(matriz.estatus_ultima_cubicacion),
  },
  {
    label: 'No. última cubicación',
    grupo: 'Cubicación y pagos',
    get: ({ matriz }) => matriz.numero_ultima_cubicacion,
    omitirSiObra: (obra, { matriz }) =>
      normTexto(obra.numero_ultima_cubicacion) === normTexto(matriz.numero_ultima_cubicacion),
  },
  {
    label: 'Monto última cubicación',
    grupo: 'Cubicación y pagos',
    format: 'currency',
    get: ({ matriz }) => matriz.monto_ultima_cubicacion,
    omitirSiObra: (obra, { matriz }) =>
      montosIguales(obra.total_ultima_cubicacion, matriz.monto_ultima_cubicacion),
  },
  {
    label: 'Valor cubicado presupuesto base',
    grupo: 'Cubicación y pagos',
    format: 'currency',
    get: ({ matriz }) => matriz.valor_cubicado_presupuesto_base,
  },
  {
    label: 'Adicional cubicación',
    grupo: 'Cubicación y pagos',
    format: 'currency',
    get: ({ matriz }) => matriz.adicional_cubicacion,
  },
  {
    label: 'Movimiento de tierra',
    grupo: 'Diseño y movimiento de tierra',
    get: ({ matriz }) => matriz.movimiento_tierra,
  },
  {
    label: 'Obs. movimiento de tierra',
    grupo: 'Diseño y movimiento de tierra',
    get: ({ matriz }) => matriz.obs_movimiento_tierra,
  },
  {
    label: 'Obs. planos arquitectónicos',
    grupo: 'Diseño y movimiento de tierra',
    get: ({ matriz }) => matriz.obs_planos_arquitectonicos,
  },
  {
    label: 'Obs. diseño',
    grupo: 'Diseño y movimiento de tierra',
    get: ({ matriz }) => matriz.obs_diseno,
  },
  {
    label: 'As built',
    grupo: 'Diseño y movimiento de tierra',
    get: ({ matriz }) => matriz.as_built,
  },
  {
    label: 'Diseño arquitectónico',
    grupo: 'Diseño y movimiento de tierra',
    get: ({ matriz }) => matriz.diseno_arquitectonico,
  },
  {
    label: 'Diseño estructural',
    grupo: 'Diseño y movimiento de tierra',
    get: ({ matriz }) => matriz.diseno_estructural,
  },
  {
    label: 'Diseño sanitario',
    grupo: 'Diseño y movimiento de tierra',
    get: ({ matriz }) => matriz.diseno_sanitario,
  },
  {
    label: 'Diseño eléctrico',
    grupo: 'Diseño y movimiento de tierra',
    get: ({ matriz }) => matriz.diseno_electrico,
  },
  {
    label: 'Diseño hidráulico',
    grupo: 'Diseño y movimiento de tierra',
    get: ({ matriz }) => matriz.diseno_hidraulico,
  },
  {
    label: 'Paisajismo',
    grupo: 'Diseño y movimiento de tierra',
    get: ({ matriz }) => matriz.paisajismo,
  },
  {
    label: 'Plano terminación',
    grupo: 'Diseño y movimiento de tierra',
    get: ({ matriz }) => matriz.plano_terminacion,
  },
  {
    label: 'Presupuesto terminación',
    grupo: 'Diseño y movimiento de tierra',
    get: ({ matriz }) => matriz.presupuesto_terminacion,
  },
  {
    label: 'Monto presupuesto terminación',
    grupo: 'Diseño y movimiento de tierra',
    format: 'currency',
    get: ({ matriz }) => matriz.monto_presupuesto_terminacion,
  },
];

export function camposTechadoSinDuplicar(
  obra: Obra,
  matriz: MatrizGeneralTechado,
  contrato: ContratoTechado,
): CampoDetalleTechado[] {
  const ctx = { matriz, contrato };
  const out: CampoDetalleTechado[] = [];

  for (const campo of CAMPOS_TECHADO) {
    if (campo.omitirSiObra?.(obra, ctx)) continue;
    const raw = campo.get(ctx);
    const value = formatearValorDetalle(raw, campo.format);
    if (!value) continue;
    out.push({ label: campo.label, value, grupo: campo.grupo });
  }

  return out;
}

export function formatearAdendaTechado(adenda: ContratoAdendaTechado): string {
  const partes = [
    adenda.tipo_adenda,
    adenda.certificacion,
    adenda.monto_adendado != null
      ? adenda.monto_adendado.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })
      : null,
  ].filter(Boolean);
  return partes.join(' · ') || 'Adenda';
}

/** Evita listar la misma adenda varias veces (p. ej. por importaciones repetidas del Excel). */
export function deduplicarAdendas(adendas: ContratoAdendaTechado[]): ContratoAdendaTechado[] {
  const vistos = new Map<string, ContratoAdendaTechado>();
  for (const a of adendas) {
    const key = [
      (a.tipo_adenda ?? '').trim().toUpperCase(),
      (a.certificacion ?? '').trim().toUpperCase(),
      a.monto_adendado ?? '',
    ].join('|');
    if (!vistos.has(key)) vistos.set(key, a);
  }
  return Array.from(vistos.values());
}

/** Omite adendas que solo repiten la certificación del contrato (ya visible en la ficha). */
export function adendasVisiblesParaObra(
  adendas: ContratoAdendaTechado[],
  contrato: ContratoTechado,
): ContratoAdendaTechado[] {
  const certContrato = (contrato.certificacion ?? '').trim().toUpperCase();
  return deduplicarAdendas(adendas).filter((a) => {
    const certAdenda = (a.certificacion ?? '').trim().toUpperCase();
    const sinTipo = !(a.tipo_adenda ?? '').trim();
    const montoCero = a.monto_adendado == null || Number(a.monto_adendado) === 0;
    if (certContrato && certAdenda === certContrato && sinTipo && montoCero) return false;
    return true;
  });
}
