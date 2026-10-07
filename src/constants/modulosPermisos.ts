import { MODULO_REPORTE_HABILITADO } from './featureFlags';
import { PERMISOS, type PermisoCode } from './permisos';

export type ModuloPermisoDef = {
  id: string;
  label: string;
  icon: string;
  verKey: PermisoCode;
  editarKey: PermisoCode;
};

/** Catálogo de módulos para switches Ver/Editar en formularios de usuario. */
export const MODULOS_PERMISOS: ModuloPermisoDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', verKey: PERMISOS.VER_DASHBOARD, editarKey: PERMISOS.EDITAR_DASHBOARD },
  { id: 'obras', label: 'Obras', icon: '🏗️', verKey: PERMISOS.VER_OBRAS, editarKey: PERMISOS.EDITAR_OBRAS },
  { id: 'techado', label: 'Techado', icon: '🏠', verKey: PERMISOS.VER_TECHADO, editarKey: PERMISOS.EDITAR_TECHADO },
  { id: 'carga_obras', label: 'Carga de Obras', icon: '📋', verKey: PERMISOS.VER_CARGA_OBRAS, editarKey: PERMISOS.EDITAR_CARGA_OBRAS },
  { id: 'tramites', label: 'Seguimiento de Trámite', icon: '📄', verKey: PERMISOS.VER_TRAMITES, editarKey: PERMISOS.EDITAR_TRAMITES },
  { id: 'atencion_contratista', label: 'Atención al contratista', icon: '🧑‍💼', verKey: PERMISOS.VER_ATENCION_CONTRATISTA, editarKey: PERMISOS.EDITAR_ATENCION_CONTRATISTA },
  { id: 'gestion_tecnica_documento', label: 'Gestión técnica de documento', icon: '📁', verKey: PERMISOS.VER_GESTION_TECNICA_DOCUMENTO, editarKey: PERMISOS.EDITAR_GESTION_TECNICA_DOCUMENTO },
  { id: 'recurso_humano', label: 'Recurso Humano', icon: '👥', verKey: PERMISOS.VER_RECURSO_HUMANO, editarKey: PERMISOS.EDITAR_RECURSO_HUMANO },
  { id: 'rh_colaboradores', label: 'RH - Colaboradores', icon: '🪪', verKey: PERMISOS.VER_RH_PERSONAL, editarKey: PERMISOS.EDITAR_RH_PERSONAL },
  { id: 'rh_vacaciones', label: 'RH - Vacaciones', icon: '🏖️', verKey: PERMISOS.VER_RH_VACACIONES, editarKey: PERMISOS.EDITAR_RH_VACACIONES },
  { id: 'rh_ponche', label: 'RH - Ponche', icon: '⏱️', verKey: PERMISOS.VER_RH_PONCHE, editarKey: PERMISOS.EDITAR_RH_PONCHE },
  { id: 'reporte', label: 'Reporte', icon: '📊', verKey: PERMISOS.VER_REPORTE, editarKey: PERMISOS.EDITAR_REPORTE },
  { id: 'configuracion', label: 'Administración', icon: '⚙️', verKey: PERMISOS.VER_CONFIGURACION, editarKey: PERMISOS.EDITAR_CONFIGURACION },
];

export const MODULOS_PERMISOS_VISIBLES = MODULOS_PERMISOS.filter(
  (m) => MODULO_REPORTE_HABILITADO || m.id !== 'reporte',
);

/** Marca todos los permisos de módulos visibles (rol admin). */
export function aplicarPermisosAdmin(
  permisosActuales?: Record<string, boolean> | null,
): Record<string, boolean> {
  const permisos = { ...(permisosActuales || {}) };
  MODULOS_PERMISOS_VISIBLES.forEach((m) => {
    permisos[m.verKey] = true;
    permisos[m.editarKey] = true;
  });
  return permisos;
}

export function cambiarPermisoModuloEnMapa(
  permisos: Record<string, boolean>,
  verKey: string,
  editarKey: string,
  tipo: 'ver' | 'editar',
  enabled: boolean,
): Record<string, boolean> {
  const next = { ...permisos };
  if (tipo === 'ver') {
    next[verKey] = enabled;
    if (!enabled) next[editarKey] = false;
  } else {
    next[editarKey] = enabled;
    if (enabled) next[verKey] = true;
  }
  return next;
}
