import React from 'react';
import type { ObraFormState } from '../utils/obraFormulario';
import { OBRAS_FORM_AREAS } from '../constants/obraFormularioCampos';
import { CA_BLOQUE_TITULO, CA_FIELD, CA_LABEL, SEPRI_CARD } from '../constants/cargaArchivosUi';
import AutocompleteInput from './AutocompleteInput';

const inputClassName = CA_FIELD;

interface ObraFormularioProps {
  form: ObraFormState;
  onChange: (form: ObraFormState) => void;
  estadosDisponibles: string[];
  responsableSugerencias?: string[];
  loadingResponsableSugerencias?: boolean;
  readOnly?: boolean;
  /** Si se define, solo muestra estas áreas (ids de OBRAS_FORM_AREAS). */
  areasIds?: string[];
}

const ObraFormulario: React.FC<ObraFormularioProps> = ({
  form,
  onChange,
  estadosDisponibles,
  responsableSugerencias = [],
  loadingResponsableSugerencias = false,
  readOnly = false,
  areasIds,
}) => {
  const setObraField = (key: string, value: string | number | undefined) => {
    onChange({
      ...form,
      obra: { ...form.obra, [key]: value },
    });
  };

  const setContratistaField = (key: string, value: string) => {
    onChange({
      ...form,
      contratista: { ...form.contratista, [key]: value },
    });
  };

  const getValue = (source: 'obra' | 'contratista', key: string): string => {
    if (source === 'contratista') {
      return String(form.contratista[key as keyof typeof form.contratista] ?? '');
    }
    const v = form.obra[key as keyof typeof form.obra];
    if (v == null) return '';
    return String(v);
  };

  return (
    <div className="space-y-4">
      {OBRAS_FORM_AREAS.filter((area) => !areasIds || areasIds.includes(area.id)).map((area) => (
        <div key={area.id} className={`rounded-xl overflow-hidden p-4 sm:p-5 ${SEPRI_CARD}`}>
          <h5 className={`${CA_BLOQUE_TITULO} mb-4 pb-2 border-b border-stone-100`}>
            {area.label}
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {area.campos.map((campo) => {
              const colClass = campo.colSpan === 2 ? 'md:col-span-2' : '';
              const value = getValue(campo.source, campo.key);

              if (campo.source === 'contratista' && campo.key === 'responsable') {
                return (
                  <div key={`${area.id}-${campo.key}`} className={colClass}>
                    <label className={CA_LABEL}>
                      {campo.label}
                    </label>
                    <AutocompleteInput
                      value={value}
                      onChange={(v) => setContratistaField('responsable', v)}
                      options={responsableSugerencias}
                      loading={loadingResponsableSugerencias}
                      placeholder="Nombre del contratista / responsable"
                      className={inputClassName}
                    />
                  </div>
                );
              }

              if (campo.input === 'textarea') {
                return (
                  <div key={`${area.id}-${campo.key}`} className={colClass}>
                    <label className={CA_LABEL}>
                      {campo.label}
                      {campo.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <textarea
                      value={value}
                      onChange={(e) =>
                        campo.source === 'contratista'
                          ? setContratistaField(campo.key, e.target.value)
                          : setObraField(campo.key, e.target.value)
                      }
                      rows={4}
                      maxLength={campo.maxLength}
                      disabled={readOnly}
                      className={`${inputClassName} resize-y min-h-[100px]`}
                    />
                  </div>
                );
              }

              if (campo.input === 'select' && campo.key === 'estado') {
                return (
                  <div key={`${area.id}-${campo.key}`} className={colClass}>
                    <label className={CA_LABEL}>
                      {campo.label}
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={value}
                      onChange={(e) => setObraField('estado', e.target.value)}
                      required
                      disabled={readOnly}
                      className={`${inputClassName} bg-white`}
                    >
                      <option value="">Seleccione un estado</option>
                      {estadosDisponibles.map((estado) => (
                        <option key={estado} value={estado}>
                          {estado}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              const inputType =
                campo.input === 'decimal' ? 'number' : campo.input === 'number' ? 'number' : campo.input;

              return (
                <div key={`${area.id}-${campo.key}`} className={colClass}>
                  <label className={CA_LABEL}>
                    {campo.label}
                    {campo.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type={inputType}
                    value={value}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (campo.source === 'contratista') {
                        setContratistaField(campo.key, raw);
                        return;
                      }
                      if (campo.input === 'number') {
                        setObraField(campo.key, raw ? parseInt(raw, 10) : undefined);
                      } else if (campo.input === 'decimal') {
                        setObraField(campo.key, raw ? parseFloat(raw) : undefined);
                      } else {
                        setObraField(campo.key, raw);
                      }
                    }}
                    placeholder={campo.placeholder}
                    maxLength={campo.maxLength}
                    step={campo.input === 'decimal' ? '0.01' : undefined}
                    disabled={readOnly}
                    className={inputClassName}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ObraFormulario;
