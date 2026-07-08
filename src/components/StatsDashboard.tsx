import React, { useState, useEffect, Suspense } from 'react';
import {
  Assignment,
  TrendingUp,
  CheckCircle,
  PauseCircle,
  Insights,
  BuildCircle,
  PendingActions,
  LocationOn,
  Public,
  Place,
} from '@mui/icons-material';
import { statsAPI, Obra } from '../services/api';

const DashboardMap = React.lazy(() => import('./DashboardMap'));

interface StatsDashboardProps {
  refreshTrigger?: number;
  onEstadoClick?: (estado: string) => void;
  onProvinciaClick?: (provincia: string) => void;
}

const COLORS = {
  'ACTIVA': '#4361EE',
  'INAUGURADA': '#3A86FF',
  'TERMINADA': '#22C55E',
  'DETENIDA': '#FB8500',
  'PRELIMINARES': '#8338EC',
  'INTERVENIDA MANTENIMIENTO': '#FF006E',
  'NO ESPECIFICADO': '#94A3B8'
};

const StatsDashboard: React.FC<StatsDashboardProps> = ({ refreshTrigger, onEstadoClick, onProvinciaClick }) => {
  const [stats, setStats] = useState<any>(null);
  const [proximasInaugurar, setProximasInaugurar] = useState<Obra[]>([]);
  const [obrasPorProvincia, setObrasPorProvincia] = useState<{ provincia: string; cantidad: number }[]>([]);
  const [obrasPorMunicipio, setObrasPorMunicipio] = useState<{ municipio: string; provincia: string; cantidad: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [refreshTrigger]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const statsResponse = await statsAPI.obtenerResumenDashboard();
      const data = statsResponse.data.data;
      setStats(data);
      setProximasInaugurar(data.obrasProximasInaugurar || []);
      setObrasPorProvincia(data.obrasPorProvincia || []);
      setObrasPorMunicipio(data.obrasPorMunicipio || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado: string) => {
    return COLORS[estado.toUpperCase() as keyof typeof COLORS] || '#757575';
  };

  const normalizeEstado = (estado?: string | null) =>
    (estado || '').trim().replace(/\s+/g, ' ').toUpperCase();

  const getEstadoIcon = (estado: string) => {
    const normalized = normalizeEstado(estado);
    if (normalized.includes('TERMINADA') || normalized.includes('INAUGURADA')) {
      return <CheckCircle sx={{ fontSize: 18 }} />;
    }
    if (normalized.includes('DETENIDA')) {
      return <PauseCircle sx={{ fontSize: 18 }} />;
    }
    if (normalized.includes('PRELIMINAR') || normalized.includes('NO INICIADA')) {
      return <PendingActions sx={{ fontSize: 18 }} />;
    }
    if (normalized.includes('INTERVENIDA') || normalized.includes('MANTEN')) {
      return <BuildCircle sx={{ fontSize: 18 }} />;
    }
    if (normalized.includes('ACTIVA')) {
      return <TrendingUp sx={{ fontSize: 18 }} />;
    }
    return <Insights sx={{ fontSize: 18 }} />;
  };

  // Preparar datos para visualización de estados
  const estadoData = stats?.estadisticas?.porEstado?.map((item: any) => {
    const estado = normalizeEstado(item.estado) || 'NO ESPECIFICADO';
    return {
      estado,
      cantidad: item.cantidad,
      color: getEstadoColor(estado)
    };
  }) || [];

  const topEstados = [...estadoData]
    .sort((a: any, b: any) => (Number(b.cantidad) || 0) - (Number(a.cantidad) || 0))
    .slice(0, 4);

  // Calcular total para porcentajes
  const totalEstados = estadoData.reduce((sum: number, item: any) => sum + item.cantidad, 0);

  // Calcular máximo para normalizar barras por estado (evitar 0 para no dividir por cero)
  const maxEstadoCantidad = estadoData.length > 0
    ? Math.max(1, ...estadoData.map((item: any) => Number(item.cantidad) || 0))
    : 1;

  // Preparar fondo para gráfico de pastel (conic-gradient) basado en estados
  let pieBackground = '';
  if (estadoData.length > 0 && totalEstados > 0) {
    let acumulado = 0;
    const segmentos: string[] = [];
    estadoData.forEach((item: any) => {
      const inicio = (acumulado / totalEstados) * 360;
      const fin = ((acumulado + item.cantidad) / totalEstados) * 360;
      segmentos.push(`${item.color} ${inicio}deg ${fin}deg`);
      acumulado += item.cantidad;
    });
    pieBackground = `conic-gradient(${segmentos.join(', ')})`;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#42A5F5]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
        {error}
      </div>
    );
  }

  return (
    <div className="p-0">
      <div className="rounded-2xl bg-gradient-to-b from-slate-100/90 to-slate-50 p-4 sm:p-5 space-y-4 border border-slate-200 shadow-inner">
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-4 sm:px-5 shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">
          Dashboard de Obras
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Resumen general, distribución y seguimiento territorial de obras.
          </p>
        </div>

        {/* Estadísticas generales - Tarjetas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* Obras Totales */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Obras Totales
                </div>
                <div className="text-3xl font-bold text-slate-800 leading-none">
                  {stats?.estadisticas?.totalObras || 0}
                </div>
              </div>
              <span className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 inline-flex items-center justify-center">
                <Assignment sx={{ fontSize: 20 }} />
              </span>
            </div>
          </div>
          {topEstados.map((item: any, index: number) => (
            <div
              key={`${item.estado}-${index}`}
              onClick={() => onEstadoClick && onEstadoClick(item.estado)}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2 line-clamp-2">
                    {item.estado}
                  </div>
                  <div className="text-3xl font-bold text-slate-800 leading-none">
                    {item.cantidad}
                  </div>
                </div>
                <span
                  className="h-9 w-9 rounded-lg inline-flex items-center justify-center"
                  style={{ backgroundColor: `${item.color}22`, color: item.color }}
                >
                  {getEstadoIcon(item.estado)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Mapa + Resumen lateral */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 lg:p-6 lg:col-span-3 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">
                Obras por provincia
              </h3>
              <Public className="text-[#42A5F5]" />
            </div>
            <p className="text-sm text-slate-500 mb-4 mt-1">
              Haz clic en un punto para abrir la lista filtrada de obras.
            </p>
            <Suspense
              fallback={
                <div
                  className="flex items-center justify-center rounded-xl bg-slate-50 shadow-soft"
                  style={{ height: '340px' }}
                >
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-light border-t-primary" />
                </div>
              }
            >
              <DashboardMap
                obrasPorProvincia={obrasPorProvincia}
                onProvinciaClick={onProvinciaClick}
                height="340px"
              />
            </Suspense>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 lg:p-6 lg:col-span-2 transition-all hover:shadow-md">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">
              Distribución por estado
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Proporción general del total de obras.
            </p>
            {estadoData.length > 0 && pieBackground ? (
              <div className="flex flex-col items-center">
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 lg:w-48 lg:h-48">
                  <div
                    className="w-full h-full rounded-full shadow-inner"
                    style={{ backgroundImage: pieBackground }}
                  />
                  <div className="absolute inset-[24%] rounded-full bg-white border border-slate-100" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">Total</div>
                      <div className="text-xl font-bold text-slate-800">{totalEstados}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 w-full space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {estadoData.map((item: any, index: number) => {
                    const porcentaje = totalEstados > 0 ? (item.cantidad / totalEstados) * 100 : 0;
                    return (
                      <button
                        key={`${item.estado}-${index}`}
                        onClick={() => onEstadoClick && onEstadoClick(item.estado)}
                        className="group w-full flex items-center gap-2 text-sm rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 px-3 py-2 transition-all duration-200 hover:shadow-sm"
                      >
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-white"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="flex-1 truncate text-slate-700 text-left">{item.estado}</span>
                        <span className="text-slate-500 font-semibold text-xs px-2 py-0.5 rounded-full bg-slate-100 group-hover:bg-white">
                          {porcentaje.toFixed(1)}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-48">
                <span className="text-slate-500">No hay datos para mostrar</span>
              </div>
            )}
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 gap-4">
          {/* Gráfico de Barras - Distribución por Estado */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 lg:p-6 transition-all hover:shadow-md">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">
              Distribución por Estado
            </h3>
            {estadoData.length > 0 ? (
              <div className="overflow-x-auto">
                <div
                  className="flex items-end justify-around gap-2 pb-2 min-w-[520px]"
                  style={{ minHeight: '200px' }}
                >
                  {estadoData.map((item: any, index: number) => {
                    const cantidad = Number(item.cantidad) || 0;
                    const alturaPct = maxEstadoCantidad > 0 ? (cantidad / maxEstadoCantidad) * 100 : 0;
                    const porcentaje = totalEstados > 0 ? (cantidad / totalEstados) * 100 : 0;
                    const barHeight = Math.max(alturaPct, cantidad > 0 ? 4 : 0);
                    return (
                      <div
                        key={`${item.estado}-${index}`}
                        className="flex flex-col items-center flex-1 min-w-0 max-w-[120px]"
                      >
                        <div
                          className="w-full h-[200px] flex flex-col justify-end items-center"
                          title={`${item.estado}: ${cantidad} (${porcentaje.toFixed(1)}%)`}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => onEstadoClick && onEstadoClick(item.estado)}
                            onKeyDown={(e) => e.key === 'Enter' && onEstadoClick && onEstadoClick(item.estado)}
                            className="w-full min-w-[24px] max-w-[48px] rounded-t-lg transition-all duration-300 hover:opacity-90 cursor-pointer shadow-sm"
                            style={{
                              height: `${barHeight}%`,
                              background: `linear-gradient(180deg, ${item.color} 0%, ${item.color}CC 100%)`,
                              minHeight: cantidad > 0 ? 6 : 0,
                            }}
                          />
                        </div>
                        <span className="mt-2 text-xs font-medium text-center break-words line-clamp-2 text-slate-700">
                          {item.estado}
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold mt-0.5">
                          {cantidad} ({porcentaje.toFixed(1)}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-48">
                <span className="text-slate-500">No hay datos para mostrar</span>
              </div>
            )}
          </div>
        </div>

        {/* Obras por provincia y por municipio */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 lg:p-6 transition-all hover:shadow-md">
            <h3 className="text-lg font-semibold mb-4 flex items-center text-slate-800">
            <Place className="text-slate-400 mr-2" />
            Obras por provincia
            </h3>
            {obrasPorProvincia.length > 0 ? (
              <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/40">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-slate-100/90 backdrop-blur">
                    <tr className="text-left text-slate-600">
                      <th className="py-2.5 px-3 font-semibold">Provincia</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Obras</th>
                    </tr>
                  </thead>
                  <tbody>
                    {obrasPorProvincia.map((item, index) => (
                      <tr
                        key={index}
                        onClick={() => onProvinciaClick && onProvinciaClick(item.provincia)}
                        className={`${onProvinciaClick ? 'cursor-pointer' : ''} border-t border-slate-200/70 hover:bg-slate-100/60 transition-colors`}
                      >
                        <td className="py-2.5 px-3 font-medium text-slate-800">{item.provincia}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-500">{item.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex justify-center items-center h-32 text-slate-500">
                No hay datos por provincia
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 lg:p-6 transition-all hover:shadow-md">
            <h3 className="text-lg font-semibold mb-4 flex items-center text-slate-800">
              <LocationOn className="text-slate-400 mr-2" />
              Obras por municipio (top 15)
            </h3>
            {obrasPorMunicipio.length > 0 ? (
              <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/40">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-slate-100/90 backdrop-blur">
                    <tr className="text-left text-slate-600">
                      <th className="py-2.5 px-3 font-semibold">Municipio</th>
                      <th className="py-2.5 px-3 font-semibold">Provincia</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Obras</th>
                    </tr>
                  </thead>
                  <tbody>
                    {obrasPorMunicipio.slice(0, 15).map((item, index) => (
                      <tr key={index} className="border-t border-slate-200/70 hover:bg-slate-100/60 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-800">{item.municipio}</td>
                        <td className="py-2.5 px-3 text-slate-700">{item.provincia}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-500">{item.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex justify-center items-center h-32 text-slate-500">
                No hay datos por municipio
              </div>
            )}
          </div>
        </div>

        {/* Obras próximas a inaugurar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 lg:p-6 transition-all hover:shadow-md">
          <div className="flex items-center mb-4">
            <LocationOn className="text-[#42A5F5] mr-2" />
            <h3 className="text-lg font-semibold text-slate-800">
              Obras Próximas a Inaugurar (este mes)
            </h3>
          </div>

          {proximasInaugurar.length === 0 ? (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl">
              No hay obras próximas a inaugurar este mes
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Código</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Responsable</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Fecha Inauguración</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {proximasInaugurar.map((obra) => (
                    <tr
                      key={obra.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{obra.codigo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{obra.nombre}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className="px-2 py-1 text-xs font-semibold rounded-full text-white"
                          style={{ backgroundColor: getEstadoColor(obra.estado) }}
                        >
                          {obra.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{obra.responsable || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {obra.fecha_inauguracion
                          ? new Date(obra.fecha_inauguracion).toLocaleDateString('es-DO', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsDashboard;
