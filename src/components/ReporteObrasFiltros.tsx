import React, { useState } from 'react';
import AutocompleteInput from './AutocompleteInput';
import SeccionColapsable from './ui/SeccionColapsable';
import {
  REPORTE_OBRAS_FILTRO_GRUPOS,
  TIPO_OBRA_OPCIONES,
  contarFiltrosActivos,
  type ReporteObrasFiltrosState,
  type ObraFiltroCampoDef,
} from '../constants/obraFiltrosReporte';
import { CA_FIELD, CA_LABEL } from '../constants/cargaArchivosUi';
import { SEPRI_BADGE, SEPRI_CARD_RAISED } from '../constants/sepriSurfaces';

interface ReporteObrasFiltrosProps {
  filters: ReporteObrasFiltrosState;
  onChange: (next: ReporteObrasFiltrosState) => void;
  estadosDisponibles: string[];
  searchSugerencias: string[];
  responsableSugerencias: string[];
  loadingSearchSugerencias: boolean;
  loadingResponsableSugerencias: boolean;
  /** Sin tarjeta exterior (dentro de modal / SeccionColapsable). */
  embebido?: boolean;
}

const fieldClassName = CA_FIELD;

const ReporteObrasFiltros: React.FC<ReporteObrasFiltrosProps> = ({
  filters,
  onChange,
  estadosDisponibles,
  searchSugerencias,
  responsableSugerencias,
  loadingSearchSugerencias,
  loadingResponsableSugerencias,
  embebido = false,
}) => {
  const [gruposAbiertos, setGruposAbiertos] = useState<Record<string, boolean>>({
    PLANTEL: true,
  });

  const setField = (key: keyof ReporteObrasFiltrosState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const toggleGrupo = (label: string) => {
    setGruposAbiertos((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const renderCampo = (campo: ObraFiltroCampoDef) => {
    if (campo.tipo === 'dateRange' && campo.hastaKey) {
      return (
        <div key={String(campo.key)} className="md:col-span-2 space-y-1">
          <span className={CA_LABEL}>{campo.label}</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-stone-400 mb-0.5">Desde</label>
              <input
                type="date"
                value={String(filters[campo.key] ?? '')}
                onChange={(e) => setField(campo.key, e.target.value)}
                className={fieldClassName}
              />
            </div>
            <div>
              <label className="block text-[10px] text-stone-400 mb-0.5">Hasta</label>
              <input
                type="date"
                value={String(filters[campo.hastaKey] ?? '')}
                onChange={(e) => setField(campo.hastaKey!, e.target.value)}
                className={fieldClassName}
              />
            </div>
          </div>
        </div>
      );
    }

    if (campo.tipo === 'select' && campo.selectKey === 'estado') {
      return (
        <div key={String(campo.key)} className="space-y-1">
          <label className={CA_LABEL}>{campo.label}</label>
          <select
            value={filters.estado}
            onChange={(e) => setField('estado', e.target.value)}
            className={fieldClassName}
          >
            <option value="">Todos</option>
            {estadosDisponibles.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (campo.tipo === 'select' && campo.selectKey === 'tipo_obra') {
      return (
        <div key={String(campo.key)} className="space-y-1">
          <label className={CA_LABEL}>{campo.label}</label>
          <select
            value={filters.tipo_obra}
            onChange={(e) => setField('tipo_obra', e.target.value)}
            className={fieldClassName}
          >
            <option value="">Todos</option>
            {TIPO_OBRA_OPCIONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      );
    }

    const placeholder =
      campo.tipo === 'number' ? 'Valor numérico exacto' : 'Contiene…';

    return (
      <div key={String(campo.key)} className="space-y-1">
        <label className={CA_LABEL}>{campo.label}</label>
        <input
          type="text"
          value={String(filters[campo.key] ?? '')}
          onChange={(e) => setField(campo.key, e.target.value)}
          placeholder={placeholder}
          className={fieldClassName}
        />
      </div>
    );
  };

  const activos = contarFiltrosActivos(filters);

  const contenido = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1">
          <label className={CA_LABEL}>Búsqueda general</label>
          <AutocompleteInput
            value={filters.search}
            onChange={(v) => setField('search', v)}
            options={searchSugerencias}
            loading={loadingSearchSugerencias}
            placeholder="Nombre, código, contrato, estado…"
            className={fieldClassName}
          />
        </div>
        <div className="space-y-1">
          <label className={CA_LABEL}>Responsable / Contratista</label>
          <AutocompleteInput
            value={filters.responsable}
            onChange={(v) => setField('responsable', v)}
            options={responsableSugerencias}
            loading={loadingResponsableSugerencias}
            placeholder="Nombre del contratista"
            className={fieldClassName}
          />
        </div>
      </div>

      <div className="space-y-3 pt-1">
        {REPORTE_OBRAS_FILTRO_GRUPOS.map((grupo) => {
          const abierto = gruposAbiertos[grupo.label] ?? false;
          const camposActivos = grupo.campos.filter((c) => {
            if (c.tipo === 'dateRange' && c.hastaKey) {
              return Boolean(filters[c.key] || filters[c.hastaKey]);
            }
            return Boolean(filters[c.key]);
          }).length;

          return (
            <SeccionColapsable
              key={grupo.label}
              titulo={grupo.label}
              abierto={abierto}
              onToggle={() => toggleGrupo(grupo.label)}
              contenidoClassName="pt-0"
              badge={
                camposActivos > 0 ? (
                  <span className={`${SEPRI_BADGE} ml-2`}>
                    {camposActivos} activo{camposActivos !== 1 ? 's' : ''}
                  </span>
                ) : undefined
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {grupo.campos.map((campo) => renderCampo(campo))}
              </div>
            </SeccionColapsable>
          );
        })}
      </div>
    </>
  );

  if (embebido) {
    return <div className="p-3 sm:p-4 space-y-3 bg-warm-50/40">{contenido}</div>;
  }

  return (
    <div className={`${SEPRI_CARD_RAISED} p-4 sm:p-5 space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Filtros</h3>
        {activos > 0 && (
          <span className={SEPRI_BADGE}>
            {activos} filtro(s) activo(s)
          </span>
        )}
      </div>
      {contenido}
    </div>
  );
};

export default ReporteObrasFiltros;
