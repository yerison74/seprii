/**
 * Áreas disponibles (mismas que en Seguimiento de Trámites).
 * Se usan para: área del usuario, área destinatario/destino en trámites.
 */
export const AREAS_TRAMITES: { nombre: string; codigo: string }[] = [
  { nombre: 'Dirección General', codigo: 'DIGE' },
  { nombre: 'Oficina de Libre Acceso a la Información Pública', codigo: 'OAIP' },
  { nombre: 'Departamento Jurídico', codigo: 'JURI' },
  { nombre: 'Departamento de Recursos Humanos', codigo: 'RRHH' },
  { nombre: 'Departamento de Planificación y Desarrollo', codigo: 'PYDE' },
  { nombre: 'División Control de Gestión Interna', codigo: 'COGI' },
  { nombre: 'División de Seguridad', codigo: 'SEFI' },
  { nombre: 'División de Tecnologías de la Información y Comunicación', codigo: 'TECO' },
  { nombre: 'Departamento Administrativo y Financiero', codigo: 'ADFI' },
  { nombre: 'Departamento de Diseño y Arquitectura', codigo: 'DIAR' },
  { nombre: 'Departamento de Gestión de Infraestructura Escolar', codigo: 'GEIE' },
  { nombre: 'Departamento Gestión de Riesgo', codigo: 'GERI' },
  { nombre: 'Departamento de Mantenimiento de Obras', codigo: 'MANO' },
  { nombre: 'Departamento Supervisión de Obras', codigo: 'SUPO' },
  { nombre: 'Departamento Fiscalización de Obras', codigo: 'FISO' },
  { nombre: 'Departamento de Cubicaciones', codigo: 'CUBI' },
  { nombre: 'Departamento de Coordinación Regional', codigo: 'COOR' },
];

export function getCodigoPorArea(nombreArea: string): string {
  return AREAS_TRAMITES.find((a) => a.nombre === nombreArea)?.codigo ?? 'TR';
}
