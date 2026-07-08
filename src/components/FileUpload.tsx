import React, { useState, useRef, useEffect } from 'react';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import { uploadAPI, mantenimientosAPI } from '../services/api';
import type { ProgresoCargaObra } from '../services/api';
import { obrasService, contratistasService } from '../services/supabaseService';
import AutocompleteInput from './AutocompleteInput';
import ObraFormulario from './ObraFormulario';
import ObraEdicionBuscador from './ObraEdicionBuscador';
import ReporteObrasFiltros from './ReporteObrasFiltros';
import ModuloPageHeader from './ui/ModuloPageHeader';
import type { ObraEdicionOpcion } from '../types/database';
import type { Obra } from '../services/api';
import {
  EMPTY_REPORTE_OBRAS_FILTERS,
  reporteFiltrosToObrasFilters,
  contarFiltrosActivos,
  type ReporteObrasFiltrosState,
} from '../constants/obraFiltrosReporte';
import {
  createEmptyObraFormState,
  obraToFormState,
  formStateToObraUpdates,
  formStateToContratistaUpdates,
  type ObraFormState,
} from '../utils/obraFormulario';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_ACCENT,
  BTN_GHOST,
} from '../constants/buttonStyles';
import {
  CA_PAGE,
  CA_HERO,
  CA_HERO_HEADER,
  CA_BLOQUE_BUSQUEDA,
  CA_BLOQUE_TITULO,
  CA_FIELD,
  CA_LABEL,
  CA_ALERTA_OK,
  CA_ALERTA_ERROR,
  CA_DROPZONE,
  SEPRI_INSET,
  CA_MODAL_OVERLAY,
  CA_MODAL_PANEL,
} from '../constants/cargaArchivosUi';

type PanelCargaArchivos = 'plantilla' | 'importar' | 'exportar' | null;

interface FileUploadProps {
  onUploadComplete?: () => void;
  onError?: (error: unknown) => void;
  /** Solo visualización: sin subir/editar/descargar */
  soloLectura?: boolean;
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete, onError, soloLectura = false }) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validMessage, setValidMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  /** Avance al subir XML/Excel (mensaje + %); se limpia al terminar. */
  const [uploadProgress, setUploadProgress] = useState<ProgresoCargaObra | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [estadosParaDescarga, setEstadosParaDescarga] = useState<string[]>([]);
  const [searchSugerencias, setSearchSugerencias] = useState<string[]>([]);
  const [responsableSugerencias, setResponsableSugerencias] = useState<string[]>([]);
  const [loadingSearchSugerencias, setLoadingSearchSugerencias] = useState(false);
  const [loadingResponsableSugerencias, setLoadingResponsableSugerencias] = useState(false);
  const [exportFilters, setExportFilters] = useState<ReporteObrasFiltrosState>({
    ...EMPTY_REPORTE_OBRAS_FILTERS,
  });
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const resEstados = await mantenimientosAPI.obtenerEstadosDistintos();
        const lista = resEstados?.data?.data;
        if (Array.isArray(lista)) setEstadosParaDescarga(lista);
      } catch {
        setEstadosParaDescarga([]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const term = exportFilters.search.trim();
    if (term.length < 2) {
      setSearchSugerencias([]);
      setLoadingSearchSugerencias(false);
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
  }, [exportFilters.search]);

  useEffect(() => {
    const term = exportFilters.responsable.trim();
    if (term.length < 2) {
      setResponsableSugerencias([]);
      setLoadingResponsableSugerencias(false);
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
  }, [exportFilters.responsable]);

  const [obraFormState, setObraFormState] = useState<ObraFormState>(createEmptyObraFormState());
  const [obraFormResponsableSugerencias, setObraFormResponsableSugerencias] = useState<string[]>([]);
  const [loadingObraFormResponsable, setLoadingObraFormResponsable] = useState(false);
  const [obraBusqueda, setObraBusqueda] = useState('');
  const [loadingObra, setLoadingObra] = useState(false);
  const [savingObra, setSavingObra] = useState(false);
  const [obraMessage, setObraMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [obraActualId, setObraActualId] = useState<string | null>(null);
  const [panelAbierto, setPanelAbierto] = useState<PanelCargaArchivos>(null);

  useEffect(() => {
    const term = obraFormState.contratista.responsable.trim();
    if (term.length < 2) {
      setObraFormResponsableSugerencias([]);
      setLoadingObraFormResponsable(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoadingObraFormResponsable(true);
      try {
        const resp = await uploadAPI.obtenerSugerenciasResponsable(term, 8);
        setObraFormResponsableSugerencias(resp.data.data || []);
      } catch {
        setObraFormResponsableSugerencias([]);
      } finally {
        setLoadingObraFormResponsable(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [obraFormState.contratista.responsable]);

  const resetMessages = () => {
    setError(null);
    setValidMessage(null);
  };

  const validateLocal = (f: File): string | null => {
    const name = f.name.toLowerCase();
    const type = f.type;
    const isXml = name.endsWith('.xml') || type === 'text/xml' || type === 'application/xml';
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls') ||
      type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      type === 'application/vnd.ms-excel';
    if (!isXml && !isExcel) return 'Solo se permiten archivos .xml, .xlsx o .xls';
    if (f.size > MAX_SIZE_BYTES) return 'El archivo es demasiado grande (límite 10MB)';
    return null;
  };

  const onChooseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0] || null;
    setFile(chosen);
    resetMessages();
    if (chosen) {
      const localError = validateLocal(chosen);
      if (localError) {
        setError(localError);
      }
    }
  };

  const handleValidate = async () => {
    if (!file) return;
    const localError = validateLocal(file);
    if (localError) return setError(localError);
    try {
      resetMessages();
      const isXml = file.name.toLowerCase().endsWith('.xml');
      if (isXml) {
        await uploadAPI.validarXml(file);
      } else {
        await uploadAPI.validarExcel(file);
      }
      setValidMessage('Archivo válido.');
    } catch (err: any) {
      const errorData = err?.response?.data;
      let msg = errorData?.error || 'El archivo no es válido.';
      
      // Si hay detalles, agregarlos al mensaje
      if (errorData?.detalles && Array.isArray(errorData.detalles)) {
        msg = errorData.detalles.join('\n');
      } else if (errorData?.detalles && typeof errorData.detalles === 'string') {
        msg = errorData.detalles;
      }
      
      setError(msg);
      if (onError) onError(err);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    const localError = validateLocal(file);
    if (localError) return setError(localError);
    try {
      resetMessages();
      setUploadProgress({ mensaje: 'Preparando archivo…', porcentaje: 0 });
      setUploading(true);
      const isXml = file.name.toLowerCase().endsWith('.xml');
      const onProg = (p: ProgresoCargaObra) => setUploadProgress(p);
      let resultado;
      if (isXml) {
        resultado = await uploadAPI.subirXml(file, onProg);
      } else {
        resultado = await uploadAPI.subirExcel(file, onProg);
      }
      
      // Mostrar información detallada del procesamiento
      const data = resultado?.data?.data;
      if (data) {
        const mensaje = `Archivo procesado exitosamente.\n` +
          `Total: ${data.total || 0} | ` +
          `Exitosas: ${data.exitosas || 0} | ` +
          `Creadas: ${data.creadas || 0} | ` +
          `Actualizadas: ${data.actualizadas || 0}` +
          (data.fallidas > 0 ? ` | Fallidas: ${data.fallidas}` : '');
        setValidMessage(mensaje);
      } else {
        setValidMessage('Archivo subido y procesado correctamente.');
      }
      if (onUploadComplete) onUploadComplete();
      // Limpiar selección
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err: any) {
      const errorData = err?.response?.data;
      let msg = errorData?.error || 'Error al subir el archivo';
      
      // Si hay detalles, agregarlos al mensaje
      if (errorData?.detalles && Array.isArray(errorData.detalles)) {
        msg = errorData.detalles.join('\n');
      } else if (errorData?.detalles && typeof errorData.detalles === 'string') {
        msg = errorData.detalles;
      }
      
      setError(msg);
      if (onError) onError(err);
    } finally {
      setUploading(false);
      window.setTimeout(() => setUploadProgress(null), 1400);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const resp = await uploadAPI.descargarPlantilla();
      const blob = new Blob([resp.data], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla-obras.xml';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('No se pudo descargar la plantilla.');
      if (onError) onError(err);
    }
  };

  const handleDownloadTemplateExcel = async () => {
    try {
      const resp = await uploadAPI.descargarPlantillaExcel();
      const blob = new Blob([resp.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla-obras.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('No se pudo descargar la plantilla Excel.');
      if (onError) onError(err);
    }
  };

  const handleDownloadData = async () => {
    try {
      resetMessages();
      setDownloading(true);

      const filtros = reporteFiltrosToObrasFilters(exportFilters);
      const response = await uploadAPI.descargarDatos(filtros);
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'obras-export.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setValidMessage('Archivo de obras descargado correctamente.');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'No se pudo descargar la información de las obras.';
      setError(msg);
      if (onError) onError(err);
    } finally {
      setDownloading(false);
    }
  };

  const filtrosExportActivos = contarFiltrosActivos(exportFilters);

  const aplicarObraEnFormulario = (obra: Obra) => {
    setObraFormState(obraToFormState(obra));
    setObraActualId(obra.id);
    setObraMessage({ type: 'success', text: `Obra cargada: ${obra.nombre}` });
  };

  const cargarObraPorIdSistema = async (idSistema: string) => {
    const obra = await obrasService.obtenerObraPorIdObra(idSistema.trim());
    if (!obra) {
      throw new Error(`No se encontró la obra con ID ${idSistema}`);
    }
    aplicarObraEnFormulario(obra);
    return obra;
  };

  const handleSeleccionarObraEdicion = async (opcion: ObraEdicionOpcion) => {
    const etiqueta = [opcion.sigede, opcion.nombre].filter(Boolean).join(' — ');
    setObraBusqueda(etiqueta);
    try {
      setLoadingObra(true);
      setObraMessage(null);
      await cargarObraPorIdSistema(opcion.id);
    } catch (err: any) {
      setObraMessage({ type: 'error', text: err.message || 'Error al cargar la obra' });
      setObraActualId(null);
    } finally {
      setLoadingObra(false);
    }
  };

  const handleBuscarObra = async () => {
    const term = obraBusqueda.trim();
    if (!term) {
      setObraMessage({ type: 'error', text: 'Ingrese SIGEDE, contrato, nombre, provincia o municipio' });
      return;
    }

    try {
      setLoadingObra(true);
      setObraMessage(null);

      try {
        await cargarObraPorIdSistema(term);
        return;
      } catch {
        /* continuar con búsqueda amplia */
      }

      const resp = await uploadAPI.buscarObrasParaEdicion(term, 10);
      const resultados = resp.data.data || [];

      if (resultados.length === 0) {
        setObraMessage({ type: 'error', text: `No se encontró ninguna obra para: ${term}` });
        setObraFormState(createEmptyObraFormState());
        setObraActualId(null);
        return;
      }

      if (resultados.length === 1) {
        const op = resultados[0];
        setObraBusqueda([op.sigede, op.nombre].filter(Boolean).join(' — '));
        await cargarObraPorIdSistema(op.id);
        return;
      }

      setObraMessage({
        type: 'error',
        text: `${resultados.length} obras coinciden. Elija una de las sugerencias de la lista.`,
      });
    } catch (err: any) {
      setObraMessage({ type: 'error', text: err.message || 'Error al buscar la obra' });
      setObraActualId(null);
    } finally {
      setLoadingObra(false);
    }
  };

  // Actualizar obra
  const handleActualizarObra = async () => {
    if (!obraActualId) {
      setObraMessage({ type: 'error', text: 'Primero debe buscar una obra existente' });
      return;
    }

    if (!obraFormState.obra.nombre || !obraFormState.obra.estado) {
      setObraMessage({ type: 'error', text: 'Los campos Nombre y Estado son obligatorios' });
      return;
    }

    try {
      setSavingObra(true);
      setObraMessage(null);

      const updates = formStateToObraUpdates(obraFormState);
      const obraActualizada = await obrasService.actualizarObra(obraActualId, updates);

      const contratistaUpdates = formStateToContratistaUpdates(obraFormState);
      const contratistaId = obraActualizada.contratista_id;
      if (contratistaUpdates && contratistaId) {
        await contratistasService.actualizar(contratistaId, contratistaUpdates);
      }

      const refreshed = await obrasService.obtenerObraPorIdObra(obraActualId);
      if (refreshed) {
        setObraFormState(obraToFormState(refreshed));
      }
      setObraMessage({ type: 'success', text: 'Obra actualizada exitosamente' });
      
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (err: any) {
      setObraMessage({ type: 'error', text: err.message || 'Error al actualizar la obra' });
    } finally {
      setSavingObra(false);
    }
  };

  return (
    <div className={CA_PAGE}>
      <ModuloPageHeader
        icon={<CloudUploadIcon fontSize="small" />}
        title="Carga de obras"
        description="Busque y edite obras individuales. Use los botones de la derecha para plantillas, importación o exportación."
      >
        {!soloLectura && (
          <>
            <button
              type="button"
              onClick={() => setPanelAbierto('plantilla')}
              className={BTN_GHOST}
            >
              <DescriptionIcon fontSize="small" className="mr-1.5" />
              Plantilla
            </button>
            <button
              type="button"
              onClick={() => setPanelAbierto('importar')}
              className={BTN_SECONDARY}
            >
              <CloudUploadIcon fontSize="small" className="mr-1.5" />
              Importar
            </button>
            <button
              type="button"
              onClick={() => setPanelAbierto('exportar')}
              className={BTN_ACCENT}
            >
              <DownloadIcon fontSize="small" className="mr-1.5" />
              Exportar
            </button>
          </>
        )}
      </ModuloPageHeader>

      {(error || validMessage || uploading || downloading) && (
        <div className="space-y-2 shrink-0">
          {uploading && (
            <div
              className={`${SEPRI_INSET} px-3 py-2.5`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start justify-between gap-3 text-xs text-stone-600 mb-1.5">
                <span className="truncate min-w-0 flex-1 leading-snug">
                  {uploadProgress?.mensaje ?? 'Iniciando…'}
                </span>
                <span className="tabular-nums text-stone-500 font-medium shrink-0">
                  {uploadProgress?.porcentaje ?? 0}%
                </span>
              </div>
              <div
                className="h-1 w-full overflow-hidden rounded-full bg-stone-200/90"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={uploadProgress?.porcentaje ?? 0}
                aria-label="Progreso de carga"
              >
                <div
                  className="h-full rounded-full bg-primary/80 transition-[width] duration-200 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, uploadProgress?.porcentaje ?? 0))}%` }}
                />
              </div>
            </div>
          )}
          {downloading && !uploading && (
            <div className={`${SEPRI_INSET} px-3 py-2`}>
              <div className="h-1 w-full overflow-hidden rounded-full bg-stone-200/90">
                <div className="h-full w-full rounded-full bg-primary/60 animate-pulse" />
              </div>
              <p className="text-xs text-stone-500 mt-2">Generando archivo de exportación…</p>
            </div>
          )}
          {error && (
            <div className={`${CA_ALERTA_ERROR} whitespace-pre-line`}>{error}</div>
          )}
          {validMessage && (
            <div className={CA_ALERTA_OK}>{validMessage}</div>
          )}
        </div>
      )}

      {soloLectura && (
        <p className="text-sm text-stone-500 px-1">
          Solo visualización: no tienes permiso para cargar o editar obras.
        </p>
      )}

      {/* Prioridad visual: buscar y editar obra */}
      {!soloLectura && (
        <section className={CA_HERO} aria-labelledby="carga-editar-obra-titulo">
          <div className={CA_HERO_HEADER}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-soft">
              <EditIcon fontSize="small" />
            </div>
            <div className="min-w-0">
              <h2
                id="carga-editar-obra-titulo"
                className="text-base sm:text-lg font-semibold text-stone-800 tracking-tight"
              >
                Buscar y editar obra
              </h2>
              <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
                Busque por SIGEDE, contrato, nombre del plantel, provincia o municipio y edite la obra
                seleccionada.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-5">
            <div className={CA_BLOQUE_BUSQUEDA}>
              <p className={CA_BLOQUE_TITULO}>Búsqueda</p>
              <ObraEdicionBuscador
                busqueda={obraBusqueda}
                onBusquedaChange={setObraBusqueda}
                onSeleccionar={handleSeleccionarObraEdicion}
                onBuscar={handleBuscarObra}
                loading={loadingObra}
              />

              {obraMessage && (
                <div
                  className={
                    obraMessage.type === 'success' ? CA_ALERTA_OK : CA_ALERTA_ERROR
                  }
                >
                  {obraMessage.type === 'success' ? (
                    <CheckCircleIcon className="shrink-0" fontSize="small" />
                  ) : (
                    <InfoIcon className="shrink-0" fontSize="small" />
                  )}
                  <span>{obraMessage.text}</span>
                </div>
              )}
            </div>

            {obraActualId && (
              <div className="space-y-5">
                <ObraFormulario
                  form={obraFormState}
                  onChange={setObraFormState}
                  estadosDisponibles={estadosParaDescarga}
                  responsableSugerencias={obraFormResponsableSugerencias}
                  loadingResponsableSugerencias={loadingObraFormResponsable}
                  readOnly={soloLectura}
                />

                <div
                  className={`${SEPRI_INSET} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4`}
                >
                  <div>
                    <p className="text-sm font-semibold text-stone-700">Guardar cambios</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Revise todas las áreas del formulario antes de actualizar.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleActualizarObra}
                    disabled={savingObra}
                    className={BTN_PRIMARY}
                  >
                    <SaveIcon className="mr-2" fontSize="small" />
                    {savingObra ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              </div>
            )}

            {!obraActualId && !loadingObra && (
              <div className={`${SEPRI_INSET} flex flex-col items-center justify-center text-center px-6 py-10`}>
                <SearchIcon className="text-stone-300 mb-2" sx={{ fontSize: 40 }} />
                <p className="text-sm text-stone-500">Busque una obra para ver y editar su información.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {panelAbierto && !soloLectura && (
        <div
          className={CA_MODAL_OVERLAY}
          onClick={() => setPanelAbierto(null)}
          role="presentation"
        >
          <div
            className={`${CA_MODAL_PANEL} ${panelAbierto === 'exportar' ? 'max-w-5xl' : 'max-w-lg'}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="carga-panel-titulo"
          >
            <div className="flex items-start justify-between gap-3 p-5 border-b border-stone-100">
              <div>
                <h3
                  id="carga-panel-titulo"
                  className="text-base font-semibold text-stone-800"
                >
                  {panelAbierto === 'plantilla' && 'Plantillas vacías'}
                  {panelAbierto === 'importar' && 'Importar obras'}
                  {panelAbierto === 'exportar' && 'Exportar obras'}
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  {panelAbierto === 'plantilla' &&
                    'Descargue el formato correcto (hoja Obras + referencia de columnas).'}
                  {panelAbierto === 'importar' &&
                    'Suba un archivo Excel o XML con múltiples obras (máx. 10 MB).'}
                  {panelAbierto === 'exportar' &&
                    'Filtre por cualquier campo del reporte y descargue un Excel con el mismo formato que la plantilla de carga.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPanelAbierto(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
                aria-label="Cerrar"
              >
                <CloseIcon fontSize="small" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {panelAbierto === 'plantilla' && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button type="button" onClick={handleDownloadTemplate} className={BTN_GHOST}>
                    <DownloadIcon className="mr-1" fontSize="small" />
                    Plantilla XML
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTemplateExcel}
                    className={BTN_GHOST}
                  >
                    <DownloadIcon className="mr-1" fontSize="small" />
                    Plantilla Excel
                  </button>
                </div>
              )}

              {panelAbierto === 'importar' && (
                <>
                  <label className={CA_DROPZONE}>
                    <CloudUploadIcon className="text-primary/70" />
                    <span className="text-sm font-medium text-stone-600">
                      {file ? file.name : 'Seleccionar archivo XML o Excel'}
                    </span>
                    <span className="text-xs text-stone-400">
                      {file
                        ? `${(file.size / 1024).toFixed(1)} KB`
                        : 'Arrastre aquí o haga clic para elegir'}
                    </span>
                    <input
                      ref={inputRef}
                      hidden
                      type="file"
                      accept=".xml,.xlsx,.xls,application/xml,text/xml,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      onChange={onChooseFile}
                    />
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleValidate}
                      disabled={!file || uploading || downloading}
                      className={BTN_SECONDARY}
                    >
                      <CheckCircleIcon className="mr-2" fontSize="small" />
                      Validar archivo
                    </button>
                    <button
                      type="button"
                      onClick={handleUpload}
                      disabled={!file || uploading || downloading}
                      className={BTN_PRIMARY}
                    >
                      <CloudUploadIcon className="mr-2" fontSize="small" />
                      Subir y procesar
                    </button>
                  </div>
                  <p className="text-xs text-stone-400">
                    Formatos: .xml, .xlsx, .xls · Tamaño máximo 10 MB
                  </p>
                </>
              )}

              {panelAbierto === 'exportar' && (
                <>
                  <div className="max-h-[min(60vh,520px)] overflow-y-auto rounded-2xl bg-warm-50/50 shadow-soft">
                    <ReporteObrasFiltros
                      embebido
                      filters={exportFilters}
                      onChange={setExportFilters}
                      estadosDisponibles={estadosParaDescarga}
                      searchSugerencias={searchSugerencias}
                      responsableSugerencias={responsableSugerencias}
                      loadingSearchSugerencias={loadingSearchSugerencias}
                      loadingResponsableSugerencias={loadingResponsableSugerencias}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setExportFilters({ ...EMPTY_REPORTE_OBRAS_FILTERS })}
                      className={BTN_GHOST}
                      disabled={filtrosExportActivos === 0}
                    >
                      Limpiar filtros
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadData}
                      disabled={downloading}
                      className={BTN_ACCENT}
                    >
                      <DownloadIcon className="mr-1.5" fontSize="small" />
                      {downloading ? 'Generando…' : 'Descargar Excel'}
                      {filtrosExportActivos > 0 ? ` (${filtrosExportActivos} filtro(s))` : ''}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
