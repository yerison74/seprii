/**
 * Procesos predefinidos para trámites.
 * Si se asigna un proceso, el sistema activa control y monitoreo de tiempo por área.
 * Tiempos en días (se usa el máximo para alertas y límites).
 */

import { AREAS_TRAMITES } from './areas';

export interface TiempoArea {
  minDias: number;
  maxDias: number;
  /** Texto para mostrar (ej. "1-2 días", "Hasta 90 días") */
  label?: string;
}

export interface ProcesoOption {
  id: string;
  nombre: string;
  /** Tiempo estimado por área (nombre oficial → días). null = sin límite / no aplica. */
  tiemposPorArea: Record<string, TiempoArea | null>;
}

/** 5 minutos expresados en días (para proceso de prueba) */
const CINCO_MINUTOS_EN_DIAS = 5 / (60 * 24);

/** Tiempo de 5 min para todas las áreas (proceso de prueba) */
const TIEMPO_5_MIN_TODAS_AREAS: Record<string, TiempoArea> = AREAS_TRAMITES.reduce<Record<string, TiempoArea>>(
  (acc, area) => {
    acc[area.nombre] = { minDias: 0, maxDias: CINCO_MINUTOS_EN_DIAS, label: '5 min' };
    return acc;
  },
  {}
);

/** Procesos disponibles para el selector en creación de trámite */
export const PROCESOS: ProcesoOption[] = [
  {
    id: 'proceso_prueba',
    nombre: 'Proceso de prueba',
    tiemposPorArea: TIEMPO_5_MIN_TODAS_AREAS,
  },
  {
    id: 'proceso_1',
    nombre: 'Gestión de Construcción Nuevo Proyecto: Escuela o Politécnico',
    tiemposPorArea: {
      'Dirección General': { minDias: 1, maxDias: 2, label: '1–2 días' },
      'Departamento de Diseño y Arquitectura': { minDias: 40, maxDias: 60, label: '40–60 días' },
      'Departamento de Planificación y Desarrollo': { minDias: 0, maxDias: 90, label: 'Hasta 90 días' },
      'Departamento Administrativo y Financiero': { minDias: 75, maxDias: 85, label: '70–75 + 5–10 días' },
      'Departamento Jurídico': { minDias: 10, maxDias: 20, label: '10–20 días' },
      'Departamento Supervisión de Obras': { minDias: 3, maxDias: 5, label: '3–5 días' },
    },
  },
  {
    id: 'proceso_2',
    nombre: 'Gestión Documental de Obra',
    tiemposPorArea: {
      'Departamento de Gestión de Infraestructura Escolar': null,
      'Departamento Fiscalización de Obras': { minDias: 1, maxDias: 1, label: '1 día' },
      'Departamento de Diseño y Arquitectura': { minDias: 1, maxDias: 1, label: '1 día' },
      'Dirección General': { minDias: 1, maxDias: 2, label: '1–2 días' },
      'Departamento Administrativo y Financiero': { minDias: 1, maxDias: 2, label: '1–2 días' },
      'Departamento Administrativo y Financiero (Sección Contabilidad)': { minDias: 5, maxDias: 5, label: '5 días' },
      'Departamento Administrativo y Financiero (Sección Presupuesto)': { minDias: 1, maxDias: 15, label: '1–15 días' },
      'Departamento Administrativo y Financiero (Revisión final Contabilidad/Presupuesto)': { minDias: 1, maxDias: 2, label: '1–2 días' },
    },
  },
];

export function getProcesoById(id: string): ProcesoOption | undefined {
  return PROCESOS.find((p) => p.id === id);
}

/** Días máximos estimados para un área en un proceso (para 80% y 100% de alerta). */
export function getDiasMaximosPorArea(procesoId: string, areaNombre: string): number | null {
  const proceso = getProcesoById(procesoId);
  if (!proceso) return null;
  const t = proceso.tiemposPorArea[areaNombre];
  if (!t) return null;
  return t.maxDias;
}
