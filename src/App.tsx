import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Dashboard,
  Assignment,
  CloudUpload,
  Settings,
  FollowTheSigns,
  Logout,
  Person,
  Menu as MenuIcon,
  ChevronLeft,
  SupportAgent,
  Assessment,
  Description,
  Roofing,
} from '@mui/icons-material';
import Login from './components/Login';
import NotificacionesTiempo from './components/NotificacionesTiempo';
import { useAuth } from './context/AuthContext';
import { TAB_PERMISOS } from './constants/permisos';
import { MODULO_REPORTE_HABILITADO } from './constants/featureFlags';

const StatsDashboard = React.lazy(() => import('./components/StatsDashboard'));
const ObrasTable = React.lazy(() => import('./components/ObrasTable'));
const Techado = React.lazy(() => import('./components/Techado'));
const FileUpload = React.lazy(() => import('./components/FileUpload'));
const TramiteHistory = React.lazy(() => import('./components/UploadHistory'));
const GestionTecnicaDocumento = React.lazy(() => import('./components/GestionTecnicaDocumento'));
const GestionUsuarios = React.lazy(() => import('./components/GestionUsuarios'));
const AtencionContratista = React.lazy(() => import('./components/AtencionContratista'));

const ReporteObras = MODULO_REPORTE_HABILITADO
  ? React.lazy(() => import('./components/ReporteObras'))
  : null;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;

  if (value !== index) return null;

  return (
    <div
      role="tabpanel"
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
    >
      <div className="p-2 sm:p-3 md:p-4 lg:p-6">
        {children}
      </div>
    </div>
  );
}

function TabLoading() {
  return (
    <div className="flex items-center justify-center min-h-[12rem]">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-light border-t-primary" />
    </div>
  );
}

function App() {
  const { user, loading, logout, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const tramitesOnly = false;
  const [tabValue, setTabValue] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /** Recarga Dashboard, Gestión de Obras, Techado y Reporte tras cambios en cualquier módulo. */
  const handleDatosActualizados = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleTabChange = (newValue: number) => {
    setTabValue(newValue);
    if (newValue === 1) {
      handleDatosActualizados();
    }
  };

  const handleUploadComplete = () => {
    handleDatosActualizados();
    if (!tramitesOnly) setTabValue(1);
  };

  const allTabs = [
    { icon: <Dashboard />, label: 'Dashboard', index: 0 },
    { icon: <Assignment />, label: 'Obras', index: 1 },
    { icon: <Roofing />, label: 'Techado', index: 2 },
    { icon: <CloudUpload />, label: 'Cargar Obras', index: 3 },
    { icon: <FollowTheSigns />, label: 'Seguimiento de Trámites', index: 4 },
    { icon: <SupportAgent />, label: 'Atención al contratista', index: 5 },
    { icon: <Description />, label: 'Gestión técnica de documento', index: 6 },
    ...(MODULO_REPORTE_HABILITADO
      ? [{ icon: <Assessment />, label: 'Reporte', index: 7 as const }]
      : []),
    { icon: <Settings />, label: 'Configuración', index: 8 },
  ];

  // Solo mostrar pestañas para las que el usuario tiene permiso
  const tabs = tramitesOnly
    ? allTabs.filter((tab) => tab.index === 4)
    : allTabs.filter((tab) => hasPermission(TAB_PERMISOS[tab.index as keyof typeof TAB_PERMISOS]));

  // Al tener usuario, ir a la primera pestaña que tiene permiso (login o recarga)
  const allowedTabIndices = tabs.map((t) => t.index).join(',');
  useEffect(() => {
    if (!user || tabs.length === 0) return;
    const allowedSet = new Set(tabs.map((t) => t.index));
    setTabValue((prev) => (allowedSet.has(prev) ? prev : tabs[0].index));
  }, [user?.id, allowedTabIndices]);

  // Al volver desde rutas como /contratista/:id, restaurar la pestaña (evita ir al Dashboard)
  useEffect(() => {
    const openTab = (location.state as { openTab?: number } | null)?.openTab;
    if (typeof openTab !== 'number' || !user) return;
    const indices = allowedTabIndices.split(',').filter(Boolean).map((s) => parseInt(s, 10));
    const allowedSet = new Set(indices);
    if (!allowedSet.has(openTab)) return;
    setTabValue(openTab);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, user, allowedTabIndices, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-2 border-primary-light border-t-primary" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-warm-50 flex">
      {/* Sidebar minimalista desplegable */}
      {tabs.length > 0 && (!tramitesOnly || tabs.length > 1) && (
        <aside
          className={`
            flex-shrink-0 bg-white border-r border-warm-200 flex flex-col shadow-soft
            transition-[width] duration-300 ease-in-out overflow-hidden
            ${sidebarOpen ? 'w-56 sm:w-64' : 'w-[72px]'}
          `}
          role="navigation"
          aria-label="Menú principal"
        >
          <div className={`border-b border-warm-200 flex items-center ${sidebarOpen ? 'p-4 gap-2' : 'p-3 justify-center'}`}>
            {tramitesOnly ? (
              <FollowTheSigns className="shrink-0 text-2xl text-primary" />
            ) : (
              <Assignment className="shrink-0 text-2xl text-primary" />
            )}
            {sidebarOpen && (
              <span className="font-semibold text-sm sm:text-base truncate text-stone-700">
                {tramitesOnly ? 'Trámites' : 'SEPRI'}
              </span>
            )}
          </div>
          <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.index}
                onClick={() => handleTabChange(tab.index)}
                role="tab"
                aria-selected={tabValue === tab.index}
                aria-controls={`simple-tabpanel-${tab.index}`}
                id={`simple-tab-${tab.index}`}
                title={!sidebarOpen ? tab.label : undefined}
                className={`
                  w-full flex items-center font-medium text-sm
                  transition-all duration-200
                  ${sidebarOpen ? 'gap-3 px-4 py-3 text-left' : 'justify-center p-3'}
                  ${
                    tabValue === tab.index
                      ? 'bg-primary-light text-primary border-l-4 border-primary'
                      : 'text-stone-600 hover:bg-warm-50 border-l-4 border-transparent'
                  }
                `}
              >
                <span className="shrink-0 [&>.MuiSvgIcon-root]:!text-xl">
                  {tab.icon}
                </span>
                {sidebarOpen && <span className="truncate">{tab.label}</span>}
              </button>
            ))}
          </nav>
        </aside>
      )}

      {/* Contenido principal: header + área de contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-warm-200 shadow-soft flex-shrink-0">
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-3.5">
            <div className="flex items-center gap-3">
              {tabs.length > 0 && (!tramitesOnly || tabs.length > 1) && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen((o) => !o)}
                  className="flex-shrink-0 p-2 rounded-lg text-stone-600 hover:bg-warm-100 hover:text-stone-800 transition-colors"
                  title={sidebarOpen ? 'Contraer menú' : 'Expandir menú'}
                  aria-label={sidebarOpen ? 'Contraer menú' : 'Expandir menú'}
                >
                  {sidebarOpen ? (
                    <ChevronLeft sx={{ fontSize: 24 }} />
                  ) : (
                    <MenuIcon sx={{ fontSize: 24 }} />
                  )}
                </button>
              )}
              <h1 className="text-base sm:text-lg md:text-xl font-semibold flex-grow text-stone-800 truncate min-w-0">
                {tramitesOnly
                  ? 'Sistema de Seguimiento de Trámites'
                  : 'Seguimiento de Procesos Internos'}
              </h1>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {hasPermission('ver_tramites') && (
                  <NotificacionesTiempo
                    areaUsuario={user?.area}
                    usuarioId={user?.id}
                    evaluarAlAbrir={true}
                  />
                )}
                <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-warm-100 text-sm font-medium text-stone-700 border border-warm-200">
                  <Person sx={{ fontSize: 18 }} className="text-stone-500" />
                  <span>{user.nombre} {user.apellido}</span>
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warm-100 hover:bg-warm-200 text-stone-700 text-sm font-medium border border-warm-200 hover:border-stone-300 transition-all duration-200"
                  title="Cerrar sesión"
                >
                  <Logout sx={{ fontSize: 18 }} />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-1 sm:px-2 md:px-3 lg:px-4 py-2 sm:py-3 md:py-4 overflow-auto">
          <div className="bg-white rounded-xl shadow-soft border border-warm-200/80 w-full min-h-0">
            {!tramitesOnly && (
            <>
              {hasPermission('ver_dashboard') && (
                <TabPanel value={tabValue} index={0}>
                  <Suspense fallback={<TabLoading />}>
                    <StatsDashboard
                    refreshTrigger={refreshTrigger}
                    onEstadoClick={(estado: string) => {
                      setTabValue(1);
                      // Disparar después del cambio de pestaña para asegurar que ObrasTable
                      // ya esté montado y reciba el evento de filtros.
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('setObrasFilters', { detail: { estado } }));
                      }, 0);
                    }}
                    onProvinciaClick={(provincia: string) => {
                      setTabValue(1);
                      // Disparar después del cambio de pestaña para asegurar recepción del filtro.
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('setObrasFilters', { detail: { provincia } }));
                      }, 0);
                    }}
                  />
                  </Suspense>
                </TabPanel>
              )}

              {hasPermission('ver_obras') && (
                <TabPanel value={tabValue} index={1}>
                  <Suspense fallback={<TabLoading />}>
                    <ObrasTable refreshTrigger={refreshTrigger} soloLectura={!hasPermission('editar_obras')} />
                  </Suspense>
                </TabPanel>
              )}

              {hasPermission('ver_techado') && (
                <TabPanel value={tabValue} index={2}>
                  <Suspense fallback={<TabLoading />}>
                    <Techado
                    refreshTrigger={refreshTrigger}
                    soloLectura={!hasPermission('editar_techado')}
                    onDatosActualizados={handleDatosActualizados}
                  />
                  </Suspense>
                </TabPanel>
              )}

              {hasPermission('ver_carga_obras') && (
                <TabPanel value={tabValue} index={3}>
                  <Suspense fallback={<TabLoading />}>
                    <FileUpload
                    onUploadComplete={handleUploadComplete}
                    onError={(error: unknown) => console.error('Upload error:', error)}
                    soloLectura={!hasPermission('editar_carga_obras')}
                  />
                  </Suspense>
                </TabPanel>
              )}

              {hasPermission('ver_atencion_contratista') && (
                <TabPanel value={tabValue} index={5}>
                  <Suspense fallback={<TabLoading />}>
                    <AtencionContratista soloLectura={!hasPermission('editar_atencion_contratista')} />
                  </Suspense>
                </TabPanel>
              )}

              {hasPermission('ver_gestion_tecnica_documento') && (
                <TabPanel value={tabValue} index={6}>
                  <Suspense fallback={<TabLoading />}>
                    <GestionTecnicaDocumento
                    soloLectura={!hasPermission('editar_gestion_tecnica_documento')}
                  />
                  </Suspense>
                </TabPanel>
              )}

              {MODULO_REPORTE_HABILITADO && hasPermission('ver_reporte') && ReporteObras && (
                <TabPanel value={tabValue} index={7}>
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center min-h-[12rem]">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-light border-t-primary" />
                      </div>
                    }
                  >
                    <ReporteObras
                      refreshTrigger={refreshTrigger}
                      soloLectura={!hasPermission('editar_reporte')}
                    />
                  </Suspense>
                </TabPanel>
              )}

              {hasPermission('ver_configuracion') && (
                <TabPanel value={tabValue} index={8}>
                  <div>
                    <h2 className="text-2xl font-semibold mb-4 text-stone-800">
                      Configuración del Sistema
                    </h2>
                    <Suspense fallback={<TabLoading />}>
                      <GestionUsuarios />
                    </Suspense>
                  </div>
                </TabPanel>
              )}
            </>
          )}

          {hasPermission('ver_tramites') && (
            <TabPanel value={tabValue} index={4}>
              <Suspense fallback={<TabLoading />}>
                <TramiteHistory soloLectura={!hasPermission('editar_tramites')} />
              </Suspense>
            </TabPanel>
          )}

          {tabs.length === 0 && (
            <div className="p-8 text-center text-stone-500">
              No tienes permisos para acceder a ninguna sección. Contacta al administrador.
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
