import type { Contratista, Obra } from '../types/database';

export interface ContratistaFormState {
  responsable: string;
  identificacion: string;
  telefono1: string;
  telefono2: string;
  correo: string;
}

export interface ObraFormState {
  obra: Partial<Obra>;
  contratista: ContratistaFormState;
  contratistaId?: string | null;
}

export const EMPTY_CONTRATISTA_FORM: ContratistaFormState = {
  responsable: '',
  identificacion: '',
  telefono1: '',
  telefono2: '',
  correo: '',
};

export const EMPTY_OBRA_FORM: Partial<Obra> = {
  contrato: '',
  codigo: '',
  nombre: '',
  nombre_inaugurado: '',
  tipo_obra: '',
  nivel: '',
  descripcion: '',
  no_aula: undefined,
  sorteo: '',
  area_construccion: '',
  coordinador: '',
  supervisor: '',
  estado: '',
  porcentaje_ejecutado: undefined,
  provincia: '',
  municipio: '',
  latitud: '',
  longitud: '',
  distrito_minerd_sigede: '',
  presupuesto_total: undefined,
  avance_inicial: undefined,
  numero_ultima_cubicacion: '',
  tipo_ultima_cubicacion: '',
  estatus_ultima_cubicacion: '',
  grupo_ultimo_estatus_cubicacion: '',
  total_ultima_cubicacion: undefined,
  ultima_total_cubicado: undefined,
  total_cubicado_base: undefined,
  total_pagado: undefined,
  fecha_detenida: '',
  fecha_fin_estimada: '',
  fecha_inauguracion: '',
  envio_snip: '',
  monto_snip: undefined,
  modificacion_snip: '',
  observacion_legal: '',
  observacion_financiero: '',
};

export function createEmptyObraFormState(): ObraFormState {
  return {
    obra: { ...EMPTY_OBRA_FORM },
    contratista: { ...EMPTY_CONTRATISTA_FORM },
    contratistaId: null,
  };
}

export function obraToFormState(obra: Obra): ObraFormState {
  const c = obra.contratista;
  return {
    obra: {
      contrato: obra.contrato || '',
      codigo: obra.codigo || '',
      nombre: obra.nombre || '',
      nombre_inaugurado: obra.nombre_inaugurado || '',
      tipo_obra: obra.tipo_obra || '',
      nivel: obra.nivel || '',
      descripcion: obra.descripcion || '',
      no_aula: obra.no_aula ?? undefined,
      sorteo: obra.sorteo || '',
      area_construccion: obra.area_construccion || '',
      coordinador: obra.coordinador || '',
      supervisor: obra.supervisor || '',
      estado: obra.estado || '',
      porcentaje_ejecutado: obra.porcentaje_ejecutado ?? undefined,
      provincia: obra.provincia || '',
      municipio: obra.municipio || '',
      latitud: obra.latitud || '',
      longitud: obra.longitud || '',
      distrito_minerd_sigede: obra.distrito_minerd_sigede || '',
      presupuesto_total: obra.presupuesto_total ?? undefined,
      avance_inicial: obra.avance_inicial ?? undefined,
      numero_ultima_cubicacion: obra.numero_ultima_cubicacion || '',
      tipo_ultima_cubicacion: obra.tipo_ultima_cubicacion || '',
      estatus_ultima_cubicacion: obra.estatus_ultima_cubicacion || '',
      grupo_ultimo_estatus_cubicacion: obra.grupo_ultimo_estatus_cubicacion || '',
      total_ultima_cubicacion: obra.total_ultima_cubicacion ?? undefined,
      ultima_total_cubicado: obra.ultima_total_cubicado ?? undefined,
      total_cubicado_base: obra.total_cubicado_base ?? undefined,
      total_pagado: obra.total_pagado ?? undefined,
      fecha_detenida: obra.fecha_detenida || '',
      fecha_fin_estimada: obra.fecha_fin_estimada || '',
      fecha_inauguracion: obra.fecha_inauguracion || '',
      envio_snip: obra.envio_snip || '',
      monto_snip: obra.monto_snip ?? undefined,
      modificacion_snip: obra.modificacion_snip || '',
      observacion_legal: obra.observacion_legal || '',
      observacion_financiero: obra.observacion_financiero || '',
    },
    contratista: {
      responsable: c?.responsable || obra.responsable || '',
      identificacion: c?.identificacion || '',
      telefono1: c?.telefono1 || '',
      telefono2: c?.telefono2 || '',
      correo: c?.correo || '',
    },
    contratistaId: obra.contratista_id ?? c?.id ?? null,
  };
}

function strOrUndef(v: string | undefined | null): string | undefined {
  const s = (v ?? '').trim();
  return s || undefined;
}

function numOrUndef(v: number | undefined | null): number | undefined {
  if (v == null || v === ('' as unknown)) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function formStateToObraUpdates(form: ObraFormState): Partial<Obra> {
  const o = form.obra;
  return {
    contrato: strOrUndef(o.contrato),
    codigo: strOrUndef(o.codigo),
    nombre: o.nombre?.trim() || '',
    nombre_inaugurado: strOrUndef(o.nombre_inaugurado),
    tipo_obra: strOrUndef(o.tipo_obra),
    nivel: strOrUndef(o.nivel),
    descripcion: strOrUndef(o.descripcion),
    no_aula: numOrUndef(o.no_aula),
    sorteo: strOrUndef(o.sorteo),
    area_construccion: strOrUndef(o.area_construccion),
    coordinador: strOrUndef(o.coordinador),
    supervisor: strOrUndef(o.supervisor),
    estado: o.estado?.trim() || '',
    porcentaje_ejecutado: numOrUndef(o.porcentaje_ejecutado),
    provincia: strOrUndef(o.provincia),
    municipio: strOrUndef(o.municipio),
    latitud: strOrUndef(o.latitud),
    longitud: strOrUndef(o.longitud),
    distrito_minerd_sigede: strOrUndef(o.distrito_minerd_sigede),
    presupuesto_total: numOrUndef(o.presupuesto_total),
    avance_inicial: numOrUndef(o.avance_inicial),
    numero_ultima_cubicacion: strOrUndef(o.numero_ultima_cubicacion),
    tipo_ultima_cubicacion: strOrUndef(o.tipo_ultima_cubicacion),
    estatus_ultima_cubicacion: strOrUndef(o.estatus_ultima_cubicacion),
    grupo_ultimo_estatus_cubicacion: strOrUndef(o.grupo_ultimo_estatus_cubicacion),
    total_ultima_cubicacion: numOrUndef(o.total_ultima_cubicacion),
    ultima_total_cubicado: numOrUndef(o.ultima_total_cubicado),
    total_cubicado_base: numOrUndef(o.total_cubicado_base),
    total_pagado: numOrUndef(o.total_pagado),
    fecha_detenida: strOrUndef(o.fecha_detenida),
    fecha_fin_estimada: strOrUndef(o.fecha_fin_estimada),
    fecha_inauguracion: strOrUndef(o.fecha_inauguracion),
    envio_snip: strOrUndef(o.envio_snip),
    monto_snip: numOrUndef(o.monto_snip),
    modificacion_snip: strOrUndef(o.modificacion_snip),
    observacion_legal: strOrUndef(o.observacion_legal),
    observacion_financiero: strOrUndef(o.observacion_financiero),
    responsable: strOrUndef(form.contratista.responsable),
  };
}

export function formStateToContratistaUpdates(
  form: ObraFormState,
): Partial<Contratista> | null {
  const c = form.contratista;
  const hasData = [c.responsable, c.identificacion, c.telefono1, c.telefono2, c.correo].some(
    (v) => (v || '').trim(),
  );
  if (!hasData) return null;
  return {
    responsable: (c.responsable || '').trim().slice(0, 400),
    identificacion: strOrUndef(c.identificacion),
    telefono1: strOrUndef(c.telefono1),
    telefono2: strOrUndef(c.telefono2),
    correo: strOrUndef(c.correo),
  };
}
