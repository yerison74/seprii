import React, { useEffect, useRef, useState } from 'react';
import { Search } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { uploadAPI } from '../services/api';
import type { ObraEdicionOpcion } from '../types/database';
import {
  CA_FIELD,
  CA_LABEL,
  CA_SUGERENCIAS_BADGE_DIST,
  CA_SUGERENCIAS_BADGE_SIGEDE,
  CA_SUGERENCIAS_EMPTY,
  CA_SUGERENCIAS_ITEM,
  CA_SUGERENCIAS_LIST,
  CA_SUGERENCIAS_PANEL,
} from '../constants/cargaArchivosUi';
import { BTN_PRIMARY } from '../constants/buttonStyles';

interface ObraEdicionBuscadorProps {
  busqueda: string;
  onBusquedaChange: (value: string) => void;
  onSeleccionar: (opcion: ObraEdicionOpcion) => void;
  onBuscar: () => void;
  loading?: boolean;
  disabled?: boolean;
  contratoId?: string | null;
  label?: string;
  placeholder?: string;
  helpText?: string;
}

const ObraEdicionBuscador: React.FC<ObraEdicionBuscadorProps> = ({
  busqueda,
  onBusquedaChange,
  onSeleccionar,
  onBuscar,
  loading = false,
  disabled,
  contratoId,
  label = 'Buscar obra',
  placeholder = 'SIGEDE, contrato, plantel, provincia o municipio…',
  helpText = 'Escriba al menos un carácter para ver sugerencias. Busque por ID SIGEDE, contrato, nombre del plantel, provincia o municipio.',
}) => {
  const [sugerencias, setSugerencias] = useState<ObraEdicionOpcion[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = busqueda.trim();
    if (term.length < 1) {
      setSugerencias([]);
      setAbierto(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setBuscando(true);
      try {
        const resp = await uploadAPI.buscarObrasParaEdicion(term, 12, {
          contratoId: contratoId || undefined,
        });
        setSugerencias(resp.data.data || []);
        setAbierto(true);
      } catch {
        setSugerencias([]);
        setAbierto(true);
      } finally {
        setBuscando(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [busqueda, contratoId]);

  useEffect(() => {
    const cerrar = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, []);

  return (
    <div className="space-y-2">
      <label htmlFor="obra-edicion-busqueda" className={CA_LABEL}>
        {label}
      </label>
      <div ref={contenedorRef} className="relative">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
              sx={{ fontSize: 20 }}
            />
            <input
              id="obra-edicion-busqueda"
              type="text"
              value={busqueda}
              onChange={(e) => onBusquedaChange(e.target.value)}
              onFocus={() => busqueda.trim() && setAbierto(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onBuscar();
                }
              }}
              placeholder={placeholder}
              disabled={disabled}
              className={`${CA_FIELD} pl-10 pr-10`}
              autoComplete="off"
            />
            {buscando && (
              <CircularProgress
                size={18}
                className="!absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
            )}
          </div>
          <button
            type="button"
            onClick={onBuscar}
            disabled={disabled || loading || !busqueda.trim()}
            className={`${BTN_PRIMARY} shrink-0`}
          >
            <Search className="mr-2" fontSize="small" />
            {loading ? 'Cargando…' : 'Buscar'}
          </button>
        </div>

        {abierto && busqueda.trim() && (
          <div className={CA_SUGERENCIAS_PANEL} role="listbox">
            <ul className={CA_SUGERENCIAS_LIST}>
              {buscando && sugerencias.length === 0 && (
                <li className={CA_SUGERENCIAS_EMPTY}>Buscando…</li>
              )}
              {sugerencias.length === 0 && !buscando && (
                <li className={CA_SUGERENCIAS_EMPTY}>Sin resultados</li>
              )}
              {sugerencias.map((obra) => (
                <li key={obra.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    className={CA_SUGERENCIAS_ITEM}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSeleccionar(obra);
                      setAbierto(false);
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={CA_SUGERENCIAS_BADGE_SIGEDE}>
                        {obra.codigo || obra.sigede}
                      </span>
                      {obra.distrito_minerd_sigede && (
                        <span className={CA_SUGERENCIAS_BADGE_DIST}>
                          Dist. {obra.distrito_minerd_sigede}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-stone-800 line-clamp-2 leading-snug">
                      {obra.nombre}
                    </p>
                    {(obra.contrato || obra.provincia || obra.municipio) && (
                      <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                        {[
                          obra.contrato && `Contrato ${obra.contrato}`,
                          obra.provincia,
                          obra.municipio,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <p className="text-[11px] text-stone-400">{helpText}</p>
    </div>
  );
};

export default ObraEdicionBuscador;

