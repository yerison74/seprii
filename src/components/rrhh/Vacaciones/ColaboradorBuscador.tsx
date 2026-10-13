import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import {
  SEPRI_CARD,
  SEPRI_FIELD_SHADOW,
} from '../../../constants/gestionTecnicaDocumentoUi';
import type { RrhhColaborador } from '../../../services/rrhhColaboradores.service';

const INPUT = `w-full pl-9 pr-9 py-2.5 rounded-xl text-sm text-stone-700 placeholder:text-stone-400 bg-white border-0 outline-none transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed ${SEPRI_FIELD_SHADOW}`;

interface ColaboradorBuscadorProps {
  colaboradores: RrhhColaborador[];
  value: string;
  onChange: (colaboradorId: string) => void;
  disabled?: boolean;
  id?: string;
}

function etiqueta(c: RrhhColaborador): string {
  const area = c.departamento?.trim();
  return area ? `${c.nombre} — ${area}` : c.nombre;
}

const ColaboradorBuscador: React.FC<ColaboradorBuscadorProps> = ({
  colaboradores,
  value,
  onChange,
  disabled = false,
  id = 'vac-colaborador',
}) => {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const seleccionado = useMemo(
    () => colaboradores.find((c) => c.id === value) || null,
    [colaboradores, value],
  );

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  useEffect(() => {
    if (seleccionado) setQuery(etiqueta(seleccionado));
    else if (!value) setQuery('');
  }, [seleccionado, value]);

  const resultados = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return colaboradores.slice(0, 12);
    return colaboradores
      .filter((c) => {
        const haystack = [c.nombre, c.identificacion, c.departamento, c.cargo, c.correo]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      })
      .slice(0, 12);
  }, [colaboradores, query]);

  useEffect(() => {
    setHighlighted(0);
  }, [resultados, query]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (seleccionado) setQuery(etiqueta(seleccionado));
        else setQuery('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [seleccionado]);

  const seleccionar = (c: RrhhColaborador) => {
    onChange(c.id);
    setQuery(etiqueta(c));
    setOpen(false);
  };

  const limpiar = () => {
    onChange('');
    setQuery('');
    setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || resultados.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((prev) => (prev + 1) % resultados.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((prev) => (prev - 1 + resultados.length) % resultados.length);
    } else if (e.key === 'Enter' && resultados[highlighted]) {
      e.preventDefault();
      seleccionar(resultados[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      if (seleccionado) setQuery(etiqueta(seleccionado));
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
        aria-hidden
      />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        value={query}
        disabled={disabled}
        placeholder="Buscar por nombre, cédula o área…"
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange('');
        }}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className={INPUT}
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={limpiar}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-warm-50 border-0 bg-transparent"
          aria-label="Quitar colaborador"
        >
          <X size={15} strokeWidth={1.75} />
        </button>
      )}

      {open && !disabled && (
        <div
          id={listId}
          role="listbox"
          className={`absolute z-30 mt-1.5 left-0 right-0 max-h-60 overflow-auto ${SEPRI_CARD} py-1.5`}
        >
          {resultados.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-stone-400">Sin colaboradores coincidentes.</p>
          ) : (
            <ul className="m-0 p-0 list-none">
              {resultados.map((c, index) => {
                const activo = index === highlighted || c.id === value;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={activo}
                      className={[
                        'w-full text-left px-3 py-2.5 border-0 bg-transparent transition-colors',
                        activo
                          ? 'bg-primary-light/50 text-[#1565C0]'
                          : 'text-stone-700 hover:bg-warm-50',
                      ].join(' ')}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setHighlighted(index)}
                      onClick={() => seleccionar(c)}
                    >
                      <span className="block text-sm font-medium">{c.nombre}</span>
                      <span className="block text-[11px] text-stone-400 mt-0.5">
                        {[c.identificacion, c.departamento, c.cargo].filter(Boolean).join(' · ') ||
                          'Sin datos adicionales'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default ColaboradorBuscador;
