import React, { useState, useEffect } from 'react';
import {
  Assessment,
  Download,
  FilterList,
  Place,
  Public,
  LocationOn,
  School,
  Groups,
  Tune,
} from '@mui/icons-material';
import { mantenimientosAPI, statsAPI, uploadAPI } from '../services/api';
import type { ReporteObrasStats } from '../types/database';
import ReporteObrasMap from './ReporteObrasMap';
import ReporteObrasTablaDetalle from './ReporteObrasTablaDetalle';
import ReporteObrasFiltros from './ReporteObrasFiltros';
import SeccionColapsable from './ui/SeccionColapsable';
import {
  EMPTY_REPORTE_OBRAS_FILTERS,
  reporteFiltrosToObrasFilters,
  contarFiltrosActivos,
} from '../constants/obraFiltrosReporte';
import {
  REPORTE_OBRAS_COLUMNAS,
  obtenerValorReporteCampo,
  formatearValorReporte,
} from '../constants/reporteObrasAreas';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_ACCENT,
  BTN_PRIMARY_SM,
} from '../constants/buttonStyles';

const COLORS: Record<string, string> = {
  ACTIVA: '#4361EE',
  INAUGURADA: '#3A86FF',
  TERMINADA: '#22C55E',
  DETENIDA: '#FB8500',
  PRELIMINARES: '#8338EC',
  'INTERVENIDA MANTENIMIENTO': '#FF006E',
  'NO ESPECIFICADO': '#94A3B8',
};

const EMPTY_FILTERS = { ...EMPTY_REPORTE_OBRAS_FILTERS };

interface ReporteObrasProps {
  refreshTrigger?: number;
  soloLectura?: boolean;
}

const ReporteObras: React.FC<ReporteObrasProps> = ({ refreshTrigger, soloLectura = false }) => {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [reporte, setReporte] = useState<ReporteObrasStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [estadosDisponibles, setEstadosDisponibles] = useState<string[]>([]);
  const [searchSugerencias, setSearchSugerencias] = useState<string[]>([]);
  const [responsableSugerencias, setResponsableSugerencias] = useState<string[]>([]);
  const [loadingSearchSugerencias, setLoadingSearchSugerencias] = useState(false);
  const [loadingResponsableSugerencias, setLoadingResponsableSugerencias] = useState(false);

  const [secFiltros, setSecFiltros] = useState(true);
  const [secResumen, setSecResumen] = useState(true);
  const [secMapa, setSecMapa] = useState(false);
  const [secDesglose, setSecDesglose] = useState(false);
  const [secDetalle, setSecDetalle] = useState(true);
  const [secInauguraciones, setSecInauguraciones] = useState(false);

  const filtrosActivos = contarFiltrosActivos(filters);

  useEffect(() => {
    const load = async () => {
      try {
        const resEstados = await mantenimientosAPI.obtenerEstadosDistintos();
        const lista = resEstados?.data?.data;
        if (Array.isArray(lista)) {
          setEstadosDisponibles(lista);
        }
      } catch {
        setEstadosDisponibles([]);
      }
    };
    load();
  }, [refreshTrigger]);

  useEffect(() => {
    const term = filters.search.trim();
    if (term.length < 2) {
      setSearchSugerencias([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoadingSearchSugerencias(true);
      try {
        const resp = await uploadAPI.obtenerSugerenciasBuscar(term, 8);
        setSearchSugerencias(resp.data.data || []);
      } catch {
        setSearchSugerencias([]);
      } finally {
        setLoadingSearchSugerencias(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    const term = filters.responsable.trim();
    if (term.length < 2) {
      setResponsableSugerencias([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoadingResponsableSugerencias(true);
      try {
        const resp = await uploadAPI.obtenerSugerenciasResponsable(term, 8);
        setResponsableSugerencias(resp.data.data || []);
      } catch {
        setResponsableSugerencias([]);
      } finally {
        setLoadingResponsableSugerencias(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filters.responsable]);

  const generarReporte = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = reporteFiltrosToObrasFilters(filters);
      const resp = await statsAPI.obtenerReporteObras(params);
      setReporte(resp.data.data);
      if (resp.data.data?.obrasProximasInaugurar?.length) {
        setSecInauguraciones(true);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al generar el reporte');
      setReporte(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generarReporte();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const handleExportExcel = async () => {
    if (!reporte?.obrasDetalle?.length) {
      setError('No hay datos para exportar');
      return;
    }
    try {
      setExporting(true);
      const XLSX = await import('xlsx');
      const headers = ['ID', ...REPORTE_OBRAS_COLUMNAS.map((c) => `${c.areaLabel} — ${c.label}`)];
      const filas = reporte.obrasDetalle.map((obra) => {
        const obraRecord = obra as unknown as Record<string, unknown>;
        const contratistaRecord = (obra.contratista ?? null) as Record<string, unknown> | null;
        return [
          obra.codigo || obra.id,
          ...REPORTE_OBRAS_COLUMNAS.map((col) => {
            const valor = obtenerValorReporteCampo(obraRecord, contratistaRecord, col);
            return formatearValorReporte(valor, col.format);
          }),
        ];
      });
      const ws = XLSX.utils.aoa_to_sheet([headers, ...filas]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte obras');
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-obras-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('No se pudo exportar el Excel');
    } finally {
      setExporting(false);
    }
  };

  const getEstadoColor = (estado: string) =>
    COLORS[estado.toUpperCase()] || '#757575';

  const estadoData = reporte?.estadisticas?.porEstado?.map((item) => ({
    ...item,
    color: getEstadoColor(item.estado),
  })) || [];

  const totalEstados = estadoData.reduce((s, i) => s + i.cantidad, 0);
  const maxEstado = estadoData.length > 0 ? Math.max(1, ...estadoData.map((i) => i.cantidad)) : 1;

  return (
    <div className="flex flex-col gap-3 min-h-[calc(100dvh-5.5rem)] sm:min-h-[calc(100dvh-6rem)]">
      <div className="bg-white rounded-xl border border-slate-200 px-3 py-3 sm:px-5 shadow-sm shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Assessment className="text-[#42A5F5]" sx={{ fontSize: 24 }} />
              Reporte de Obras
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Filtre, genere el reporte y expanda solo las secciones que necesite.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setFilters({ ...EMPTY_FILTERS });
                setReporte(null);
              }}
              className={BTN_SECONDARY}
            >
              <Tune sx={{ fontSize: 18 }} />
              Limpiar
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || !reporte?.obrasDetalle?.length || soloLectura}
              className={BTN_ACCENT}
            >
              <Download sx={{ fontSize: 18 }} />
              {exporting ? 'Exportando…' : 'Excel'}
            </button>
            <button
              type="button"
              onClick={generarReporte}
              disabled={loading}
              className={BTN_PRIMARY}
            >
              <FilterList sx={{ fontSize: 18 }} />
              {loading ? 'Generando…' : 'Generar'}
            </button>
          </div>
        </div>
      </div>

      <SeccionColapsable
        titulo="Filtros de búsqueda"
        descripcion="Búsqueda general, responsable y filtros avanzados por área."
        abierto={secFiltros}
        onToggle={() => setSecFiltros((v) => !v)}
        className="shrink-0"
        badge={
          filtrosActivos > 0 ? (
            <span className="text-[10px] font-medium text-[#42A5F5] bg-blue-50 px-1.5 py-0.5 rounded-md">
              {filtrosActivos} activo{filtrosActivos !== 1 ? 's' : ''}
            </span>
          ) : undefined
        }
        acciones={
          <button type="button" onClick={generarReporte} disabled={loading} className={BTN_PRIMARY_SM}>
            {loading ? '…' : 'Aplicar'}
          </button>
        }
        contenidoClassName="!p-0"
      >
        <ReporteObrasFiltros
          filters={filters}
          onChange={setFilters}
          estadosDisponibles={estadosDisponibles}
          searchSugerencias={searchSugerencias}
          responsableSugerencias={responsableSugerencias}
          loadingSearchSugerencias={loadingSearchSugerencias}
          loadingResponsableSugerencias={loadingResponsableSugerencias}
          embebido
        />
      </SeccionColapsable>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-xl text-sm shrink-0">
          {error}
        </div>
      )}

      {loading && !reporte && (
        <div className="flex-1 flex items-center justify-center min-h-[8rem]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-[#42A5F5]" />
        </div>
      )}

      {reporte && (
        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto">
          <SeccionColapsable
            titulo="Resumen"
            abierto={secResumen}
            onToggle={() => setSecResumen((v) => !v)}
            className="shrink-0"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <KpiCard label="Total obras" value={reporte.estadisticas.totalObras} />
              <KpiCard label="Estados" value={estadoData.length} />
              <KpiCard label="Total aulas" value={reporte.estadisticas.totalAulas} />
              <KpiCard label="Con GPS" value={reporte.estadisticas.conUbicacion} />
            </div>
          </SeccionColapsable>

          <SeccionColapsable
            titulo="Mapa y distribución por estado"
            descripcion="El mapa se carga solo al expandir esta sección."
            abierto={secMapa}
            onToggle={() => setSecMapa((v) => !v)}
            className="shrink-0"
          >
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
              <div className="lg:col-span-3">
                <p className="text-xs text-slate-500 mb-2">
                  {reporte.obrasConUbicacion?.length ?? 0} de {reporte.estadisticas.totalObras} obras
                  con coordenadas GPS.
                </p>
                {secMapa && (
                  <ReporteObrasMap obras={reporte.obrasConUbicacion ?? []} height="280px" />
                )}
              </div>
              <div className="lg:col-span-2">
                {estadoData.length > 0 ? (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {estadoData.map((item) => {
                      const pct = totalEstados > 0 ? (item.cantidad / totalEstados) * 100 : 0;
                      return (
                        <div key={item.estado} className="space-y-1">
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="font-medium text-slate-700 truncate">{item.estado}</span>
                            <span className="text-slate-500 shrink-0 ml-2">
                              {item.cantidad} ({pct.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(item.cantidad / maxEstado) * 100}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Sin datos para los filtros aplicados</p>
                )}
              </div>
            </div>
          </SeccionColapsable>

          <SeccionColapsable
            titulo="Desglose estadístico"
            descripcion="Provincia, municipio, nivel educativo y responsables."
            abierto={secDesglose}
            onToggle={() => setSecDesglose((v) => !v)}
            className="shrink-0"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <TablaReporte
                titulo="Por provincia"
                icon={<Place className="text-slate-400" fontSize="small" />}
                columnas={['Provincia', 'Obras']}
                filas={reporte.obrasPorProvincia.map((r) => [r.provincia, String(r.cantidad)])}
              />
              <TablaReporte
                titulo="Por municipio (top 15)"
                icon={<LocationOn className="text-slate-400" fontSize="small" />}
                columnas={['Municipio', 'Provincia', 'Obras']}
                filas={reporte.obrasPorMunicipio.slice(0, 15).map((r) => [
                  r.municipio,
                  r.provincia,
                  String(r.cantidad),
                ])}
              />
              <TablaReporte
                titulo="Por nivel educativo"
                icon={<School className="text-slate-400" fontSize="small" />}
                columnas={['Nivel', 'Obras']}
                filas={reporte.obrasPorNivel.map((r) => [r.nivel, String(r.cantidad)])}
              />
              <TablaReporte
                titulo="Por responsable (top 15)"
                icon={<Groups className="text-slate-400" fontSize="small" />}
                columnas={['Responsable', 'Obras']}
                filas={reporte.obrasPorResponsable.map((r) => [r.responsable, String(r.cantidad)])}
              />
            </div>
          </SeccionColapsable>

          <SeccionColapsable
            titulo="Detalle por áreas"
            descripcion="Tabla completa agrupada por PLANTEL, CONSTRUCCIÓN, UBICACIÓN, etc."
            abierto={secDetalle}
            onToggle={() => setSecDetalle((v) => !v)}
            className="flex-1 min-h-[12rem]"
            contenidoClassName="!p-2 sm:!p-3 min-h-0"
          >
            <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-slate-200">
              <ReporteObrasTablaDetalle obras={reporte.obrasDetalle ?? []} />
            </div>
          </SeccionColapsable>

          {reporte.obrasProximasInaugurar.length > 0 && (
            <SeccionColapsable
              titulo="Próximas a inaugurar (30 días)"
              abierto={secInauguraciones}
              onToggle={() => setSecInauguraciones((v) => !v)}
              className="shrink-0"
              badge={
                <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md">
                  {reporte.obrasProximasInaugurar.length}
                </span>
              }
            >
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Código</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Nombre</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Estado</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Provincia</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Inauguración</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.obrasProximasInaugurar.map((obra) => (
                      <tr key={obra.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-mono text-xs">{obra.codigo || obra.id}</td>
                        <td className="px-3 py-2">{obra.nombre}</td>
                        <td className="px-3 py-2">{obra.estado}</td>
                        <td className="px-3 py-2">{obra.provincia || '—'}</td>
                        <td className="px-3 py-2">{obra.fecha_inauguracion || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SeccionColapsable>
          )}
        </div>
      )}
    </div>
  );
};

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-50/80 rounded-xl border border-slate-100 p-3">
      <div className="text-[10px] font-semibold text-slate-500 uppercase mb-0.5">{label}</div>
      <div className="text-xl sm:text-2xl font-bold text-slate-800 tabular-nums">{value}</div>
    </div>
  );
}

function TablaReporte({
  titulo,
  icon,
  columnas,
  filas,
}: {
  titulo: string;
  icon: React.ReactNode;
  columnas: string[];
  filas: string[][];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-slate-800">
        {icon}
        {titulo}
      </h4>
      {filas.length > 0 ? (
        <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-100">
              <tr>
                {columnas.map((c) => (
                  <th key={c} className="py-1.5 px-2 text-left text-xs font-semibold text-slate-600">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, i) => (
                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                  {fila.map((celda, j) => (
                    <td
                      key={j}
                      className={`py-1.5 px-2 text-xs sm:text-sm ${
                        j === fila.length - 1
                          ? 'text-right font-semibold text-slate-500'
                          : 'text-slate-800'
                      }`}
                    >
                      {celda}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-slate-500 text-sm py-3 text-center">Sin datos</p>
      )}
    </div>
  );
}

export default ReporteObras;
