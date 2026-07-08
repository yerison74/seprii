/**
 * Códigos de permisos del sistema.
 * Cada usuario tiene un array de estos códigos en user.permisos.
 */

export const PERMISOS = {
  CREAR_USUARIOS: 'crear_usuarios',
  EDITAR_USUARIOS: 'editar_usuarios',
  VER_DASHBOARD: 'ver_dashboard',
  EDITAR_DASHBOARD: 'editar_dashboard',
  VER_OBRAS: 'ver_obras',
  EDITAR_OBRAS: 'editar_obras',
  VER_TECHADO: 'ver_techado',
  EDITAR_TECHADO: 'editar_techado',
  VER_CARGA_OBRAS: 'ver_carga_obras',
  EDITAR_CARGA_OBRAS: 'editar_carga_obras',
  VER_TRAMITES: 'ver_tramites',
  EDITAR_TRAMITES: 'editar_tramites',
  VER_ATENCION_CONTRATISTA: 'ver_atencion_contratista',
  EDITAR_ATENCION_CONTRATISTA: 'editar_atencion_contratista',
  VER_GESTION_TECNICA_DOCUMENTO: 'ver_gestion_tecnica_documento',
  EDITAR_GESTION_TECNICA_DOCUMENTO: 'editar_gestion_tecnica_documento',
  VER_CONFIGURACION: 'ver_configuracion',
  EDITAR_CONFIGURACION: 'editar_configuracion',
  VER_REPORTE: 'ver_reporte',
  EDITAR_REPORTE: 'editar_reporte',
} as const;

export type PermisoCode = (typeof PERMISOS)[keyof typeof PERMISOS];

/** Lista para mostrar en UI (label, código) */
export const PERMISOS_LISTA: { codigo: PermisoCode; label: string }[] = [
  { codigo: PERMISOS.CREAR_USUARIOS, label: 'Creación de usuarios' },
  { codigo: PERMISOS.EDITAR_USUARIOS, label: 'Edición de usuarios' },
  { codigo: PERMISOS.VER_DASHBOARD, label: 'Visualización del Dashboard' },
  { codigo: PERMISOS.EDITAR_DASHBOARD, label: 'Edición en Dashboard' },
  { codigo: PERMISOS.VER_OBRAS, label: 'Visualización de Obras' },
  { codigo: PERMISOS.EDITAR_OBRAS, label: 'Edición de Obras' },
  { codigo: PERMISOS.VER_TECHADO, label: 'Visualización de Techado' },
  { codigo: PERMISOS.EDITAR_TECHADO, label: 'Edición de Techado' },
  { codigo: PERMISOS.VER_CARGA_OBRAS, label: 'Visualización de Carga de Obras' },
  { codigo: PERMISOS.EDITAR_CARGA_OBRAS, label: 'Carga y edición en Carga de Obras' },
  { codigo: PERMISOS.VER_TRAMITES, label: 'Visualización de Seguimiento de Trámite' },
  { codigo: PERMISOS.EDITAR_TRAMITES, label: 'Creación y seguimiento de Trámites' },
  { codigo: PERMISOS.VER_ATENCION_CONTRATISTA, label: 'Visualización de Atención al contratista' },
  { codigo: PERMISOS.EDITAR_ATENCION_CONTRATISTA, label: 'Edición de Atención al contratista' },
  { codigo: PERMISOS.VER_GESTION_TECNICA_DOCUMENTO, label: 'Visualización de Gestión técnica de documento' },
  { codigo: PERMISOS.EDITAR_GESTION_TECNICA_DOCUMENTO, label: 'Carga y edición de documentos técnicos' },
  { codigo: PERMISOS.VER_REPORTE, label: 'Visualización de Reporte' },
  { codigo: PERMISOS.EDITAR_REPORTE, label: 'Exportación y reportes' },
  { codigo: PERMISOS.VER_CONFIGURACION, label: 'Visualización de Configuración' },
  { codigo: PERMISOS.EDITAR_CONFIGURACION, label: 'Edición de Configuración' },
];

/** Mapeo pestaña App -> permiso requerido para ver */
export const TAB_PERMISOS: Record<number, PermisoCode> = {
  0: PERMISOS.VER_DASHBOARD,
  1: PERMISOS.VER_OBRAS,
  2: PERMISOS.VER_TECHADO,
  3: PERMISOS.VER_CARGA_OBRAS,
  4: PERMISOS.VER_TRAMITES,
  5: PERMISOS.VER_ATENCION_CONTRATISTA,
  6: PERMISOS.VER_GESTION_TECNICA_DOCUMENTO,
  7: PERMISOS.VER_REPORTE,
  8: PERMISOS.VER_CONFIGURACION,
};

export function tienePermiso(permisosUsuario: string[] | null | undefined, codigo: PermisoCode): boolean {
  if (!permisosUsuario || !Array.isArray(permisosUsuario)) return false;
  return permisosUsuario.includes(codigo);
}
