import React, { useCallback, useEffect, useState } from 'react';
import { Search, FilterList, Tune, NavigateBefore, NavigateNext, Link as LinkIcon } from '@mui/icons-material';
import { techadoAPI } from '../services/api';
import type { MatrizGeneralVista } from '../types/database';
import { BTN_SECONDARY, BTN_SECONDARY_SM } from '../constants/buttonStyles';
import { SEPRI_INSET } from '../constants/sepriSurfaces';
import EstadoObraBadge from './EstadoObraBadge';

interface MatrizGeneralTableProps {
  refreshTrigger?: number;
  onFilaClick: (fila: MatrizGeneralVista) => void;
}

const MatrizGeneralTable: React.FC<MatrizGeneralTableProps> = ({
  refreshTrigger,
  onFilaClick,
}) => {
  const [filas, setFilas] = useState<MatrizGeneralVista[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [estadosDisponibles, setEstadosDisponibles] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await techadoAPI.obtenerMatriz({
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        search: searchQuery || undefined,
        estatus: estadoFilter || undefined,
      });
      setFilas(res.data.data || []);
      setTotalCount(res.data.count ?? 0);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar matriz general');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchQuery, estadoFilter]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, estadoFilter]);

  useEffect(() => {
    const t = setTimeout(load, searchQuery || estadoFilter ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, refreshTrigger]);

  useEffect(() => {
    const loadEstados = async () => {
      try {
        const res = await techadoAPI.obtenerEstatusDistintos();
        const lista = res?.data?.data;
        if (Array.isArray(lista)) setEstadosDisponibles(lista);
      } catch {
        setEstadosDisponibles([]);
      }
    };
    loadEstados();
  }, [refreshTrigger]);

  const estados = estadosDisponibles;

  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const startRow = page * rowsPerPage;
  const endRow = Math.min(startRow + rowsPerPage, totalCount);

  if (loading && filas.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-light border-t-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 pb-6">
      <p className="text-xs text-stone-400 mb-3">
        REG-DIST corresponde a <strong className="text-stone-500">distrito_minerd_sigede</strong> en
        obras. Clic en una fila para editar.
      </p>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-8 gap-3">
          <div className="relative md:col-span-2 xl:col-span-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" sx={{ fontSize: 20 }} />
            <input
              type="text"
              placeholder="Buscar plantel, contrato, REG-DIST, provincia…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="relative xl:col-span-2">
            <FilterList className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" sx={{ fontSize: 20 }} />
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50"
            >
              <option value="">Todos los estados</option>
              {estados.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setEstadoFilter(''); setPage(0); }}
            className={`${BTN_SECONDARY} xl:col-span-1`}
          >
            <Tune sx={{ fontSize: 20 }} />
            Limpiar
          </button>
        </div>
      </div>

      {error && (
        <div className={`${SEPRI_INSET} mb-4 px-4 py-3 text-sm text-red-700`}>{error}</div>
      )}

      {filas.length === 0 && !loading ? (
        <div className={`${SEPRI_INSET} text-center py-12 text-stone-500 text-sm`}>
          No hay registros. Importe el Excel MATRIZ GENERAL para comenzar.
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {filas.map((fila) => {
            const id = fila.id || fila.matriz_general_id || '';
            return (
              <button
                key={id}
                type="button"
                onClick={() => onFilaClick(fila)}
                className="w-full text-left bg-white rounded-xl shadow-md hover:shadow-lg border border-gray-200 hover:border-primary p-4 sm:p-5 transition-all"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-stone-800 truncate">{fila.plantel}</h3>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-stone-500">
                      <span className="font-mono text-primary">Lote {fila.lote}</span>
                      {fila.no_contrato && <span className="font-mono">{fila.no_contrato}</span>}
                      {fila.reg_dist && <span>REG-DIST {fila.reg_dist}</span>}
                      {fila.obra_id && (
                        <span className="inline-flex items-center gap-0.5 text-green-600">
                          <LinkIcon sx={{ fontSize: 14 }} /> Obra vinculada
                        </span>
                      )}
                    </div>
                  </div>
                  {fila.estatus && <EstadoObraBadge estado={fila.estatus} />}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-sm text-stone-600">
                  {fila.provincia && <div><span className="text-stone-400">Provincia: </span>{fila.provincia}</div>}
                  {fila.municipio && <div><span className="text-stone-400">Municipio: </span>{fila.municipio}</div>}
                  {fila.contratista_nombre && (
                    <div className="col-span-2 truncate"><span className="text-stone-400">Contratista: </span>{fila.contratista_nombre}</div>
                  )}
                  {fila.porcentaje_ejecucion != null && (
                    <div><span className="text-stone-400">% ejec: </span>{Number(fila.porcentaje_ejecucion * 100).toFixed(0)}%</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-wrap justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <select
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
            className="px-2 py-1 border rounded-lg"
          >
            {[5, 10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <span>{totalCount ? `${startRow + 1}-${endRow} de ${totalCount}` : '0 registros'}</span>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className={BTN_SECONDARY_SM}>
            <NavigateBefore /> Anterior
          </button>
          <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className={BTN_SECONDARY_SM}>
            Siguiente <NavigateNext />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatrizGeneralTable;
