import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PERMISOS } from '../constants/permisos';
import {
  GT_ALERTA_ERROR,
  GT_ALERTA_INFO,
  GT_PAGE,
  GT_STACK,
} from '../constants/gestionTecnicaDocumentoUi';
import Header from './rrhh/Header';
import Tabs from './rrhh/Tabs';
import ColaboradoresView from './rrhh/Colaboradores';
import ColaboradorForm, { type ColaboradorFormMode } from './rrhh/Colaboradores/ColaboradorForm';
import VacacionesView, { type VacacionListaItem } from './rrhh/Vacaciones';
import VacacionForm, { type VacacionFormMode } from './rrhh/Vacaciones/VacacionForm';
import { type ColaboradorMock, type RrhhTab } from './rrhh/mockData';
import {
  rrhhColaboradoresService,
  type RrhhColaborador,
} from '../services/rrhhColaboradores.service';
import {
  rrhhVacacionesService,
  type RrhhVacacion,
} from '../services/rrhhVacaciones.service';

type VistaRh = 'lista' | 'formulario-colab' | 'formulario-vacacion';

const AVATAR_COLORS = [
  'bg-[#42A5F5]',
  'bg-sky-500',
  'bg-violet-500',
  'bg-teal-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-emerald-500',
  'bg-slate-500',
];

function inicialesDe(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function mapColaborador(c: RrhhColaborador, idx: number): ColaboradorMock {
  return {
    id: c.id,
    colaboradorId: c.id,
    usuarioAppId: c.usuario_app_id,
    nombre: c.nombre,
    iniciales: inicialesDe(c.nombre),
    departamento: c.departamento?.trim() || 'Sin área',
    cargo: c.cargo?.trim() || '—',
    correo: c.correo?.trim() || '—',
    estado: c.estado === 'Inactivo' ? 'Inactivo' : 'Activo',
    avatarClass: AVATAR_COLORS[idx % AVATAR_COLORS.length],
  };
}

function mapVacacion(v: RrhhVacacion): VacacionListaItem {
  return {
    id: v.id,
    colaboradorId: v.colaborador_id,
    colaborador: v.colaborador?.nombre || 'Sin nombre',
    fechaInicio: v.fecha_inicio,
    fechaFin: v.fecha_fin,
    dias: v.dias,
    estado: v.estado,
  };
}

const RecursoHumano: React.FC = () => {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<RrhhTab>('colaboradores');
  const [search, setSearch] = useState('');
  const [vista, setVista] = useState<VistaRh>('lista');
  const [formModeColab, setFormModeColab] = useState<ColaboradorFormMode>('create');
  const [formModeVac, setFormModeVac] = useState<VacacionFormMode>('create');
  const [editColabId, setEditColabId] = useState<string | null>(null);
  const [editVacId, setEditVacId] = useState<string | null>(null);
  const [colaboradores, setColaboradores] = useState<ColaboradorMock[]>([]);
  const [vacaciones, setVacaciones] = useState<VacacionListaItem[]>([]);
  const [loadingColabs, setLoadingColabs] = useState(false);
  const [loadingVac, setLoadingVac] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const puedeEditarColaboradores =
    hasPermission(PERMISOS.EDITAR_RH_PERSONAL) ||
    hasPermission(PERMISOS.EDITAR_RECURSO_HUMANO);
  const puedeVerColaboradores =
    hasPermission(PERMISOS.VER_RH_PERSONAL) ||
    hasPermission(PERMISOS.VER_RECURSO_HUMANO) ||
    puedeEditarColaboradores;

  const puedeEditarVacaciones =
    hasPermission(PERMISOS.EDITAR_RH_VACACIONES) ||
    hasPermission(PERMISOS.EDITAR_RECURSO_HUMANO);
  const puedeVerVacaciones =
    hasPermission(PERMISOS.VER_RH_VACACIONES) ||
    hasPermission(PERMISOS.VER_RECURSO_HUMANO) ||
    puedeEditarVacaciones;

  // Ponche oculto por ahora
  const visibleTabs = useMemo(() => {
    const tabs: RrhhTab[] = [];
    if (puedeVerColaboradores) tabs.push('colaboradores');
    if (puedeVerVacaciones) tabs.push('vacaciones');
    if (tabs.length === 0 && hasPermission(PERMISOS.VER_RECURSO_HUMANO)) {
      return ['colaboradores', 'vacaciones'] as RrhhTab[];
    }
    return tabs.length > 0 ? tabs : (['colaboradores', 'vacaciones'] as RrhhTab[]);
  }, [hasPermission, puedeVerColaboradores, puedeVerVacaciones]);

  const tabActual = visibleTabs.includes(activeTab) ? activeTab : visibleTabs[0];

  const cargarColaboradores = useCallback(async () => {
    setLoadingColabs(true);
    setLoadError(null);
    try {
      const rows = await rrhhColaboradoresService.listar();
      setColaboradores(rows.map(mapColaborador));
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || 'No se pudieron cargar los colaboradores.';
      setLoadError(msg);
      setColaboradores([]);
    } finally {
      setLoadingColabs(false);
    }
  }, []);

  const cargarVacaciones = useCallback(async () => {
    setLoadingVac(true);
    setLoadError(null);
    try {
      const rows = await rrhhVacacionesService.listar();
      setVacaciones(rows.map(mapVacacion));
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || 'No se pudieron cargar las vacaciones.';
      setLoadError(msg);
      setVacaciones([]);
    } finally {
      setLoadingVac(false);
    }
  }, []);

  useEffect(() => {
    if (vista !== 'lista') return;
    if (tabActual === 'colaboradores') void cargarColaboradores();
    if (tabActual === 'vacaciones') void cargarVacaciones();
  }, [tabActual, vista, cargarColaboradores, cargarVacaciones]);

  useEffect(() => {
    setSearch('');
    setLoadError(null);
  }, [tabActual]);

  const handleNuevo = () => {
    if (tabActual === 'colaboradores' && puedeEditarColaboradores) {
      setFormModeColab('create');
      setEditColabId(null);
      setVista('formulario-colab');
      return;
    }
    if (tabActual === 'vacaciones' && puedeEditarVacaciones) {
      setFormModeVac('create');
      setEditVacId(null);
      setVista('formulario-vacacion');
    }
  };

  const handleAbrirColab = (row: ColaboradorMock) => {
    setEditColabId(row.colaboradorId || row.id);
    setFormModeColab(puedeEditarColaboradores ? 'edit' : 'view');
    setVista('formulario-colab');
  };

  const handleAbrirVac = (row: VacacionListaItem) => {
    setEditVacId(row.id);
    setFormModeVac(puedeEditarVacaciones ? 'edit' : 'view');
    setVista('formulario-vacacion');
  };

  const handleCancelarForm = () => {
    setVista('lista');
    setEditColabId(null);
    setEditVacId(null);
  };

  const handleSavedColab = () => {
    setVista('lista');
    setEditColabId(null);
    void cargarColaboradores();
  };

  const handleSavedVac = () => {
    setVista('lista');
    setEditVacId(null);
    void cargarVacaciones();
  };

  if (visibleTabs.length === 0) {
    return (
      <div className={GT_PAGE}>
        <div className={GT_ALERTA_INFO}>No tienes permisos para ver submódulos de Recurso Humano.</div>
      </div>
    );
  }

  if (vista === 'formulario-colab') {
    return (
      <div className="w-full">
        <ColaboradorForm
          mode={formModeColab}
          colaboradorId={editColabId}
          onCancel={handleCancelarForm}
          onSaved={handleSavedColab}
        />
      </div>
    );
  }

  if (vista === 'formulario-vacacion') {
    return (
      <div className="w-full">
        <VacacionForm
          mode={formModeVac}
          vacacionId={editVacId}
          onCancel={handleCancelarForm}
          onSaved={handleSavedVac}
        />
      </div>
    );
  }

  const showNuevo =
    (tabActual === 'colaboradores' && puedeEditarColaboradores) ||
    (tabActual === 'vacaciones' && puedeEditarVacaciones);

  return (
    <div className={GT_PAGE}>
      <Header
        activeTab={tabActual}
        search={search}
        onSearchChange={setSearch}
        onNuevo={handleNuevo}
        showNuevo={showNuevo}
      />
      <Tabs activeTab={tabActual} onChange={setActiveTab} visibleTabs={visibleTabs} />

      <div className={GT_STACK}>
        {tabActual === 'colaboradores' && (
          <>
            {loadingColabs && (
              <p className="text-sm text-stone-400 px-0.5">Cargando colaboradores…</p>
            )}
            {loadError && (
              <div className={GT_ALERTA_ERROR} role="alert">
                {loadError}
              </div>
            )}
            <ColaboradoresView
              colaboradores={colaboradores}
              search={search}
              onOpen={handleAbrirColab}
            />
          </>
        )}
        {tabActual === 'vacaciones' && (
          <>
            {loadingVac && (
              <p className="text-sm text-stone-400 px-0.5">Cargando vacaciones…</p>
            )}
            {loadError && (
              <div className={GT_ALERTA_ERROR} role="alert">
                {loadError}
              </div>
            )}
            <VacacionesView
              vacaciones={vacaciones}
              search={search}
              onOpen={handleAbrirVac}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default RecursoHumano;
