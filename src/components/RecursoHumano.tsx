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
import VacacionesView from './rrhh/Vacaciones';
import PoncheView from './rrhh/Ponche';
import {
  VACACIONES_MOCK,
  PONCHE_MOCK,
  type ColaboradorMock,
  type RrhhTab,
} from './rrhh/mockData';
import {
  rrhhColaboradoresService,
  type RrhhColaborador,
} from '../services/rrhhColaboradores.service';

type VistaRh = 'lista' | 'formulario';

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

const RecursoHumano: React.FC = () => {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<RrhhTab>('colaboradores');
  const [search, setSearch] = useState('');
  const [vista, setVista] = useState<VistaRh>('lista');
  const [formMode, setFormMode] = useState<ColaboradorFormMode>('create');
  const [editId, setEditId] = useState<string | null>(null);
  const [colaboradores, setColaboradores] = useState<ColaboradorMock[]>([]);
  const [loadingColabs, setLoadingColabs] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const puedeEditarColaboradores =
    hasPermission(PERMISOS.EDITAR_RH_PERSONAL) ||
    hasPermission(PERMISOS.EDITAR_RECURSO_HUMANO);
  const puedeVerColaboradores =
    hasPermission(PERMISOS.VER_RH_PERSONAL) ||
    hasPermission(PERMISOS.VER_RECURSO_HUMANO) ||
    puedeEditarColaboradores;

  const visibleTabs = useMemo(() => {
    const tabs: RrhhTab[] = [];
    if (puedeVerColaboradores) tabs.push('colaboradores');
    if (hasPermission(PERMISOS.VER_RH_VACACIONES) || hasPermission(PERMISOS.VER_RECURSO_HUMANO)) {
      tabs.push('vacaciones');
    }
    if (hasPermission(PERMISOS.VER_RH_PONCHE) || hasPermission(PERMISOS.VER_RECURSO_HUMANO)) {
      tabs.push('ponche');
    }
    if (tabs.length === 0 && hasPermission(PERMISOS.VER_RECURSO_HUMANO)) {
      return ['colaboradores', 'vacaciones', 'ponche'] as RrhhTab[];
    }
    return tabs.length > 0 ? tabs : (['colaboradores', 'vacaciones', 'ponche'] as RrhhTab[]);
  }, [hasPermission, puedeVerColaboradores]);

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

  useEffect(() => {
    if (tabActual === 'colaboradores' && vista === 'lista') {
      void cargarColaboradores();
    }
  }, [tabActual, vista, cargarColaboradores]);

  const handleNuevo = () => {
    if (tabActual !== 'colaboradores' || !puedeEditarColaboradores) return;
    setFormMode('create');
    setEditId(null);
    setVista('formulario');
  };

  const handleAbrir = (row: ColaboradorMock) => {
    setEditId(row.colaboradorId || row.id);
    setFormMode(puedeEditarColaboradores ? 'edit' : 'view');
    setVista('formulario');
  };

  const handleCancelarForm = () => {
    setVista('lista');
    setEditId(null);
  };

  const handleSaved = () => {
    setVista('lista');
    setEditId(null);
    void cargarColaboradores();
  };

  if (visibleTabs.length === 0) {
    return (
      <div className={GT_PAGE}>
        <div className={GT_ALERTA_INFO}>No tienes permisos para ver submódulos de Recurso Humano.</div>
      </div>
    );
  }

  if (vista === 'formulario') {
    return (
      <div className="w-full">
        <ColaboradorForm
          mode={formMode}
          colaboradorId={editId}
          onCancel={handleCancelarForm}
          onSaved={handleSaved}
        />
      </div>
    );
  }

  return (
    <div className={GT_PAGE}>
      <Header
        activeTab={tabActual}
        search={search}
        onSearchChange={setSearch}
        onNuevo={handleNuevo}
        showNuevo={tabActual === 'colaboradores' && puedeEditarColaboradores}
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
              onOpen={handleAbrir}
            />
          </>
        )}
        {tabActual === 'vacaciones' && <VacacionesView vacaciones={VACACIONES_MOCK} />}
        {tabActual === 'ponche' && <PoncheView registros={PONCHE_MOCK} />}
      </div>
    </div>
  );
};

export default RecursoHumano;
