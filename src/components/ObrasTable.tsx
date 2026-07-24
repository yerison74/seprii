import React, { useState, useEffect, useCallback, Suspense } from 'react';
import {
  Search,
  FilterList,
  Delete,
  Tune,
  NavigateBefore,
  NavigateNext,
  OpenInNew,
} from '@mui/icons-material';
import { mantenimientosAPI, Obra } from '../services/api';
import ObraMasDetallesDialog from './ObraMasDetallesDialog';
import ObraTechadoResumenSection from './ObraTechadoResumenSection';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_SECONDARY_SM,
  BTN_DANGER,
} from '../constants/buttonStyles';
import {
  TECHADO_MODULO,
  filtrosTechadoModulo,
  formatearValorCampoObra,
} from '../constants/techadoModulo';
import { SEPRI_INSET } from '../constants/sepriSurfaces';
import { techadoService } from '../services/techadoService';
import { esTipoObraTechados } from '../constants/tipoObra';
import {
  CLASE_ETIQUETA_OBRA_GESTION_MANTENIMIENTO,
  ETIQUETA_OBRA_GESTION_MANTENIMIENTO,
  esTipoObraGestionMantenimiento,
} from '../constants/tipoObraGestion';
import EstadoObraBadge from './EstadoObraBadge';
import type { ObraMatrizTechadoResumen } from '../types/database';

const ObraMap = React.lazy(() => import('./ObraMap'));

interface ObrasTableProps {
  refreshTrigger?: number;
  soloLectura?: boolean;
  modoTechado?: boolean;
  ocultarTitulo?: boolean;
  /** Si se define, el clic en una fila abre edición en lugar del diálogo de detalles. */
  onObraClick?: (obra: Obra) => void;
}

const ObrasTable: React.FC<ObrasTableProps> = ({
  refreshTrigger,
  soloLectura = false,
  modoTechado = false,
  ocultarTitulo = false,
  onObraClick,
}) => {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showMasDetalles, setShowMasDetalles] = useState(false);
  const [estadosDisponibles, setEstadosDisponibles] = useState<string[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [techadoResumen, setTechadoResumen] = useState<ObraMatrizTechadoResumen[]>([]);

  const loadObrasWithFilters = useCallback(async (overrides?: { estado?: string }) => {
    const estado = overrides?.estado !== undefined ? overrides.estado : estadoFilter;
    const filtrosModulo = modoTechado ? filtrosTechadoModulo() : {};
    try {
      setLoading(true);
      setError(null);
      const response = await mantenimientosAPI.obtenerObras({
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        search: searchQuery || undefined,
        estado: estado || undefined,
        ...filtrosModulo,
      });
      setObras(response.data.data);
      setTotalCount(response.data.count ?? 0);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar obras');
    } finally {
      setLoading(false);
    }
  }, [estadoFilter, rowsPerPage, page, searchQuery, modoTechado]);

  // Al cambiar filtros, volver a la primera página
  useEffect(() => {
    setPage(0);
  }, [searchQuery, estadoFilter]);

  // Búsqueda/filtros con debounce; paginación inmediata
  useEffect(() => {
    const delay = searchQuery || estadoFilter ? 350 : 0;
    const debounce = setTimeout(() => {
      loadObrasWithFilters();
    }, delay);

    return () => clearTimeout(debounce);
  }, [searchQuery, estadoFilter, page, rowsPerPage, loadObrasWithFilters, refreshTrigger]);

  // Cargar lista de estados desde toda la tabla obras (para filtros)
  useEffect(() => {
    const loadEstados = async () => {
      try {
        const res = await mantenimientosAPI.obtenerEstadosDistintos();
        const lista = res?.data?.data;
        if (Array.isArray(lista)) {
          setEstadosDisponibles(lista);
        }
      } catch {
        setEstadosDisponibles([]);
      }
    };
    loadEstados();
  }, [refreshTrigger]);

  // Si otro módulo actualizó datos, refrescar el detalle abierto
  useEffect(() => {
    if (!showDetails || !selectedObra) return;
    let activo = true;
    (async () => {
      try {
        const res = await mantenimientosAPI.obtenerObraPorId(selectedObra.id);
        if (!activo || !res.data.data) return;
        let obraDetalle = res.data.data;
        if (!modoTechado) {
          try {
            const tipo = await techadoService.resolverTipoObraParaDetalle(obraDetalle);
            obraDetalle = tipo ? { ...obraDetalle, tipo_obra: tipo } : obraDetalle;
          } catch {
            /* mantener obra cargada */
          }
        }
        setSelectedObra(obraDetalle);
        if (!modoTechado) {
          try {
            const techado = await techadoService.obtenerResumenPorObraId(obraDetalle.id);
            setTechadoResumen(techado);
          } catch {
            setTechadoResumen([]);
          }
        }
      } catch {
        /* mantener detalle actual */
      }
    })();
    return () => {
      activo = false;
    };
  }, [refreshTrigger, showDetails, selectedObra?.id, modoTechado]);

  // Escuchar eventos desde el Dashboard para aplicar filtros y cargar
  useEffect(() => {
    const handler = (e: any) => {
      const { estado, provincia } = e.detail || {};
      if (estado !== undefined) setEstadoFilter(estado || '');
      if (provincia !== undefined) setSearchQuery(provincia || '');
      setPage(0);
    };
    window.addEventListener('setObrasFilters', handler);
    return () => window.removeEventListener('setObrasFilters', handler);
  }, [loadObrasWithFilters]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setEstadoFilter('');
    setPage(0);
  };

  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = async (obra: Obra) => {
    if (onObraClick) {
      onObraClick(obra);
      return;
    }
    setLoadingDetalle(true);
    setTechadoResumen([]);
    try {
      let obraDetalle = obra;
      try {
        const res = await mantenimientosAPI.obtenerObraPorId(obra.id);
        if (res.data.data) obraDetalle = res.data.data;
      } catch {
        obraDetalle = obra;
      }
      if (!modoTechado) {
        try {
          const tipo = await techadoService.resolverTipoObraParaDetalle(obraDetalle);
          obraDetalle = tipo ? { ...obraDetalle, tipo_obra: tipo } : obraDetalle;
          const techado = await techadoService.obtenerResumenPorObraId(obraDetalle.id);
          setTechadoResumen(techado);
        } catch {
          /* mantener obra cargada */
        }
      }
      setSelectedObra(obraDetalle);
      setShowDetails(true);
    } finally {
      setLoadingDetalle(false);
    }
  };

  if (loading && obras.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#42A5F5]"></div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / rowsPerPage);
  const startRow = page * rowsPerPage;
  const endRow = Math.min(startRow + rowsPerPage, totalCount);
  const estados: string[] = estadosDisponibles;

  return (
    <div className="p-0">
      {!ocultarTitulo && (
        <h2 className="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6 text-[#42A5F5] px-4 sm:px-6">
          Gestión de Obras
        </h2>
      )}

      {modoTechado && onObraClick && (
        <p className="mx-4 sm:mx-6 mb-3 text-xs text-stone-400">
          Clic en una obra para abrir el formulario de edición.
        </p>
      )}

      {modoTechado && (
        <div className={`mx-4 sm:mx-6 mb-4 ${SEPRI_INSET} px-4 py-3 text-sm text-stone-600`}>
          Mostrando obras del programa <strong className="text-stone-800">{TECHADO_MODULO.label}</strong>.
          <span className="text-stone-400">
            {' '}
            (coinciden con «{TECHADO_MODULO.filtroOr.termino}» en descripción, nombre, nivel, sorteo o área)
          </span>
        </div>
      )}

      {/* Barra de búsqueda */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 mb-4 sm:mb-6 mx-4 sm:mx-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-8 gap-3">
          <div className="relative md:col-span-2 xl:col-span-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" sx={{ fontSize: 20 }} />
            <input
              type="text"
              placeholder="Buscar por ID, contrato, código, responsable, provincia o nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-transparent"
            />
          </div>

          <div className="relative xl:col-span-2">
            <FilterList className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" sx={{ fontSize: 20 }} />
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              {estados.map((estado) => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleClearFilters}
            className={`${BTN_SECONDARY} xl:col-span-1`}
          >
            <Tune sx={{ fontSize: 20 }} />
            Limpiar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Listado de obras */}
      {obras.length === 0 && !loading ? (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center mx-4 sm:mx-6">
          <p className="text-gray-500">
            {modoTechado
              ? `No se encontraron obras para ${TECHADO_MODULO.label}`
              : 'No se encontraron obras'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-4 mx-4 sm:mx-6 relative">
          {loadingDetalle && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 rounded-lg">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-light border-t-primary" />
            </div>
          )}
          {obras.map((obra) => (
              <div
                key={obra.id}
                onClick={() => handleViewDetails(obra)}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200 hover:border-[#42A5F5] p-4 sm:p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Información principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                          {obra.nombre || 'Sin nombre'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          {(obra.id_obra || obra.id) && (
                            <span className="font-mono font-medium text-[#42A5F5] font-semibold">
                              {obra.id_obra || obra.id}
                            </span>
                          )}
                          {obra.contrato && (
                            <span className="font-mono font-medium text-gray-700">
                              Contrato {obra.contrato}
                            </span>
                          )}
                          {obra.codigo && (
                            <span className="font-mono font-medium text-gray-600">
                              SIGEDE {obra.codigo}
                            </span>
                          )}
                          {obra.nivel && (
                            <span className="text-gray-500">• {obra.nivel}</span>
                          )}
                          {!modoTechado && esTipoObraTechados(obra.tipo_obra) && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-900">
                              Programa Techado
                            </span>
                          )}
                          {!modoTechado && esTipoObraGestionMantenimiento(obra.tipo) && (
                            <span className={CLASE_ETIQUETA_OBRA_GESTION_MANTENIMIENTO}>
                              {ETIQUETA_OBRA_GESTION_MANTENIMIENTO}
                            </span>
                          )}
                        </div>
                      </div>
                      <EstadoObraBadge estado={obra.estado} />
                    </div>

                    {/* Información secundaria */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-600">
                      {obra.responsable && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Contratista:</span>
                          <span className="truncate">{obra.responsable}</span>
                        </div>
                      )}
                      {obra.provincia && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Provincia:</span>
                          <span>{obra.provincia}</span>
                        </div>
                      )}
                      {obra.municipio && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Municipio:</span>
                          <span>{obra.municipio}</span>
                        </div>
                      )}
                      {(obra.fecha_inauguracion || obra.fecha_inicio) && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Fecha:</span>
                          <span>
                            {obra.fecha_inauguracion 
                              ? new Date(obra.fecha_inauguracion).toLocaleDateString('es-DO', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })
                              : obra.fecha_inicio 
                                ? new Date(obra.fecha_inicio).toLocaleDateString('es-DO', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })
                                : '-'
                            }
                          </span>
                        </div>
                      )}
                    </div>

                    {modoTechado && TECHADO_MODULO.camposLista.length > 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 pt-2 border-t border-stone-100 text-sm">
                        {TECHADO_MODULO.camposLista.map((campo) => {
                          const valor = formatearValorCampoObra(obra, campo);
                          if (!valor) return null;
                          return (
                            <div key={campo.key} className="flex items-center gap-1 text-stone-600">
                              <span className="font-medium text-stone-500">{campo.label}:</span>
                              <span>{valor}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
          ))}
        </div>
      )}

      {loading && obras.length === 0 && (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center mx-4 sm:mx-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#42A5F5]"></div>
          </div>
        </div>
      )}

      {/* Paginación */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mx-4 sm:mx-6 mb-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="text-sm text-slate-700 font-medium">Filas por página:</span>
          <select
            value={rowsPerPage}
            onChange={handleChangeRowsPerPage}
            className="px-3 py-2 border border-slate-300 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#42A5F5]"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-slate-700">
            {startRow + 1}-{endRow} de {totalCount}
          </span>
          <span className="hidden sm:inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">
            Página {Math.min(page + 1, Math.max(totalPages, 1))} de {Math.max(totalPages, 1)}
          </span>
        </div>
        <div className="flex gap-2 self-end sm:self-auto">
          <button
            onClick={() => handleChangePage(page - 1)}
            disabled={page === 0}
            className={BTN_SECONDARY_SM}
          >
            <NavigateBefore sx={{ fontSize: 20 }} />
            Anterior
          </button>
          <button
            onClick={() => handleChangePage(page + 1)}
            disabled={page >= totalPages - 1}
            className={BTN_SECONDARY_SM}
          >
            Siguiente
            <NavigateNext sx={{ fontSize: 20 }} />
          </button>
        </div>
      </div>

      {/* Dialog de detalles */}
      {showDetails && selectedObra && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowDetails(false);
            setShowMasDetalles(false);
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">
                {modoTechado ? `Detalles — ${TECHADO_MODULO.label}` : 'Detalles de la Obra'}
              </h3>
            </div>
            <div className="p-6">
              <h4 className="text-xl font-semibold mb-4 text-gray-800">{selectedObra.nombre}</h4>

              {modoTechado && TECHADO_MODULO.camposDetalle.length > 0 && (
                <div className="mb-6 p-4 bg-primary-light/30 rounded-xl border border-primary-light">
                  <div className="text-sm font-semibold mb-3 text-primary">
                    Especificaciones {TECHADO_MODULO.label}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {TECHADO_MODULO.camposDetalle.map((campo) => {
                      const valor = formatearValorCampoObra(selectedObra, campo);
                      if (!valor) return null;
                      return (
                        <div key={campo.key}>
                          <div className="text-xs text-stone-500 mb-0.5">{campo.label}</div>
                          <div className="text-base font-medium text-stone-800">{valor}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                {selectedObra.id_obra && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">ID de Obra</div>
                    <div className="text-base font-semibold text-[#42A5F5] font-mono">{selectedObra.id_obra}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500 mb-1">Contrato</div>
                  <div className="text-base font-medium font-mono">{selectedObra.contrato || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Código SIGEDE</div>
                  <div className="text-base font-medium">{selectedObra.codigo || '-'}</div>
                </div>
                {!selectedObra.id_obra && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">ID (Sistema)</div>
                    <div className="text-base font-semibold text-gray-600">{selectedObra.id}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500 mb-1">Estado</div>
                  <div className="mt-1">
                    <EstadoObraBadge estado={selectedObra.estado} />
                  </div>
                </div>
                {!modoTechado && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Tipo de obra</div>
                    <div className="text-base font-medium">
                      {selectedObra.tipo_obra || '-'}
                      {esTipoObraTechados(selectedObra.tipo_obra) && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-900">
                          Programa Techado
                        </span>
                      )}
                      {esTipoObraGestionMantenimiento(selectedObra.tipo) && (
                        <span className={`ml-2 ${CLASE_ETIQUETA_OBRA_GESTION_MANTENIMIENTO}`}>
                          {ETIQUETA_OBRA_GESTION_MANTENIMIENTO}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {selectedObra.responsable && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Contratista / Responsable</div>
                    <div className="text-base font-medium">{selectedObra.responsable}</div>
                  </div>
                )}
                {selectedObra.provincia && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Provincia</div>
                    <div className="text-base font-medium">{selectedObra.provincia}</div>
                  </div>
                )}
                {selectedObra.municipio && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Municipio</div>
                    <div className="text-base font-medium">{selectedObra.municipio}</div>
                  </div>
                )}
                {selectedObra.nivel && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Nivel</div>
                    <div className="text-base font-medium">{selectedObra.nivel}</div>
                  </div>
                )}
                {selectedObra.no_aula && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">No. Aulas</div>
                    <div className="text-base font-medium">{selectedObra.no_aula}</div>
                  </div>
                )}
                {selectedObra.fecha_inicio && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Fecha Inicio</div>
                    <div className="text-base font-medium">
                      {new Date(selectedObra.fecha_inicio).toLocaleDateString('es-DO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                )}
                {selectedObra.fecha_fin_estimada && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Fecha Fin Estimada</div>
                    <div className="text-base font-medium">
                      {new Date(selectedObra.fecha_fin_estimada).toLocaleDateString('es-DO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                )}
                {selectedObra.fecha_inauguracion && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Fecha Inauguración</div>
                    <div className="text-base font-medium">
                      {new Date(selectedObra.fecha_inauguracion).toLocaleDateString('es-DO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                )}
                {selectedObra.distrito_minerd_sigede && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Distrito MINERD SIGEDE</div>
                    <div className="text-base font-medium">{selectedObra.distrito_minerd_sigede}</div>
                  </div>
                )}
              </div>

              {selectedObra.observacion_legal && (
                <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-sm font-semibold mb-2 text-yellow-800">Observación Legal</div>
                  <div className="text-sm text-gray-700">{selectedObra.observacion_legal}</div>
                </div>
              )}

              {selectedObra.observacion_financiero && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-semibold mb-2 text-blue-800">Observación Financiera</div>
                  <div className="text-sm text-gray-700">{selectedObra.observacion_financiero}</div>
                </div>
              )}

              {selectedObra.descripcion && (
                <div className="mt-4">
                  <div className="text-sm font-semibold mb-2 text-gray-700">Descripción</div>
                  <div className="text-sm text-gray-600">{selectedObra.descripcion}</div>
                </div>
              )}

              {!modoTechado && techadoResumen.length > 0 && (
                <div className="mt-6">
                  <ObraTechadoResumenSection
                    obra={selectedObra}
                    entradas={techadoResumen}
                    compacto
                  />
                </div>
              )}

              {/* Mapa interactivo */}
              <div className="mt-6 mb-6">
                <div className="text-sm font-semibold mb-3 text-gray-700">Ubicación en el Mapa</div>
                {(selectedObra.latitud || selectedObra.longitud) && (
                  <div className="mb-2 text-xs text-gray-500">
                    Coordenadas: {selectedObra.latitud && selectedObra.longitud 
                      ? `${selectedObra.latitud}, ${selectedObra.longitud}`
                      : selectedObra.latitud || selectedObra.longitud || 'No disponibles'
                    }
                  </div>
                )}
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center rounded-xl bg-warm-50/80 shadow-soft h-[400px]">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-light border-t-primary" />
                    </div>
                  }
                >
                  <ObraMap
                    latitud={selectedObra.latitud}
                    longitud={selectedObra.longitud}
                    nombre={selectedObra.nombre}
                    height="400px"
                  />
                </Suspense>
              </div>

              {/* Información de auditoría */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm font-semibold mb-3 text-gray-500">Información del Sistema</div>
                <div className="grid grid-cols-2 gap-4">
                  {selectedObra.created_at && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Fecha de Creación</div>
                      <div className="text-sm font-medium">
                        {new Date(selectedObra.created_at).toLocaleDateString('es-DO', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  )}
                  {selectedObra.updated_at && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Última Actualización</div>
                      <div className="text-sm font-medium">
                        {new Date(selectedObra.updated_at).toLocaleDateString('es-DO', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowMasDetalles(true)}
                className={`${BTN_SECONDARY} flex items-center gap-2`}
              >
                <OpenInNew fontSize="small" />
                Más detalles (contrato, trámites, documentos, Techado)
              </button>
              <div className="flex gap-3">
              {!soloLectura && (
                <button
                  onClick={async () => {
                    if (window.confirm('¿Estás seguro de que quieres eliminar esta obra?')) {
                      try {
                        await mantenimientosAPI.eliminarObra(selectedObra.id);
                        setShowDetails(false);
                        loadObrasWithFilters();
                      } catch (err: any) {
                        setError(err.response?.data?.error || 'Error al eliminar obra');
                      }
                    }
                  }}
                  className={`${BTN_DANGER} flex items-center gap-2`}
                >
                  <Delete fontSize="small" />
                  Eliminar
                </button>
              )}
              <button
                onClick={() => {
                  setShowDetails(false);
                  setShowMasDetalles(false);
                }}
                className={BTN_PRIMARY}
              >
                Cerrar
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ObraMasDetallesDialog
        open={showMasDetalles}
        onClose={() => setShowMasDetalles(false)}
        obra={selectedObra}
      />
    </div>
  );
};

export default ObrasTable;
