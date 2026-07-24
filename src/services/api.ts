import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { obrasService, historialUploadsService, storageService, tramitesService, notificacionesTiempoService, areasService, formularioContratistaService, documentosTecnicosService, contratistasService, adendaService, documentoTecnicoComentarioService } from './supabaseService';
import { techadoService } from './techadoService';
import { getDiasMaximosPorArea } from '../constants/procesos';
import { mensajeNotificacionTiempo } from '../utils/notificacionesTiempo';
import type {
  Obra,
  ObrasFilters,
  Tramite,
  MovimientoTramite,
  Area,
  FormularioContratista,
  MovimientoSolicitudContratista,
  ImportTechadoResult,
  CrearTechadoInput,
  CrearTechadoResult,
  MatrizGeneralDetalle,
  MatrizGeneralFilters,
  MatrizGeneralTechado,
  MatrizGeneralVista,
  ContratoTechado,
  DocumentoTecnicoObra,
  MovimientoDocumentoTecnicoObra,
} from '../types/database';
import { 
  procesarArchivoXml, 
  procesarArchivoExcel, 
  validarArchivoXml, 
  validarArchivoExcel,
} from './fileProcessor';
import type { ProgresoCargaCallback } from './fileProcessor';
import * as XLSX from 'xlsx';
import { generarXmlPlantillaObras } from '../constants/obraPlantillaCarga';
import {
  construirWorkbookExport,
  construirWorkbookPlantilla,
  parsearArchivoExcel,
  workbookABlob,
} from '../utils/gestionTecnicaDocumentoExcel';
import {
  construirWorkbookPlantillaObras,
  construirWorkbookExportObras,
  workbookObrasABlob,
} from '../utils/obraPlantillaExcel';

export type { ProgresoCargaObra, ProgresoCargaCallback } from './fileProcessor';

// Re-exportar tipos para compatibilidad
export type {
  Obra,
  Tramite,
  MovimientoTramite,
  Area,
  FormularioContratista,
  MovimientoSolicitudContratista,
};

// Mantener apiClient para operaciones que aún requieren el backend (uploads, etc.)
// Usar backend local para seguimiento de trámites
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
});

// API de Mantenimientos usando Supabase
export const mantenimientosAPI = {
  obtenerObras: async (params: ObrasFilters = {}) => {
    try {
      const response = await obrasService.obtenerObras(params);
      // Simular respuesta de Axios para compatibilidad
      return {
        data: response,
      } as AxiosResponse<{ data: Obra[]; count: number }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message },
          status: 500,
        },
      };
    }
  },

  obtenerEstadosDistintos: async () => {
    try {
      const data = await obrasService.obtenerEstadosDistintos();
      return { data: { data } } as AxiosResponse<{ data: string[] }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message },
          status: 500,
        },
      };
    }
  },

  eliminarObra: async (id: string) => {
    try {
      await obrasService.eliminarObra(id);
      return {
        data: { success: true },
      } as AxiosResponse<{ success: boolean }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message },
          status: 500,
        },
      };
    }
  },

  obtenerRelacionesObraPorSigede: async (
    obra: Pick<
      import('../types/database').Obra,
      'id' | 'codigo' | 'distrito_minerd_sigede' | 'contrato_id' | 'contrato'
    >,
  ) => {
    try {
      const data = await obrasService.obtenerRelacionesObra(obra);
      return {
        data: { data },
      } as AxiosResponse<{
        data: import('../types/database').ObraRelacionesSigede;
      }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al cargar relaciones de la obra' },
          status: 500,
        },
      };
    }
  },

  obtenerObraPorId: async (id: string) => {
    try {
      const data = await obrasService.obtenerObraPorIdObra(id);
      return { data: { data } } as AxiosResponse<{ data: Obra | null }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message },
          status: 500,
        },
      };
    }
  },
};

// API de Estadísticas usando Supabase
export const statsAPI = {
  obtenerResumenDashboard: async () => {
    try {
      const stats = await obrasService.obtenerEstadisticas();
      return {
        data: { data: stats },
      } as AxiosResponse<{ data: any }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message },
          status: 500,
        },
      };
    }
  },

  obtenerObrasProximasInaugurar: async () => {
    try {
      const stats = await obrasService.obtenerEstadisticas();
      return {
        data: { data: stats.obrasProximasInaugurar },
      } as AxiosResponse<{ data: Obra[] }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message },
          status: 500,
        },
      };
    }
  },

  obtenerReporteObras: async (filtros: import('../types/database').ObrasFilters = {}) => {
    try {
      const data = await obrasService.obtenerEstadisticasReporte(filtros);
      return { data: { data } } as AxiosResponse<{ data: typeof data }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al generar reporte' },
          status: 500,
        },
      };
    }
  },
};

export const gestionTecnicaDocumentoAPI = {
  listarDocumentos: async (filtros?: { busqueda?: string }) => {
    try {
      const data = await documentosTecnicosService.listar(filtros);
      return { data: { data } } as AxiosResponse<{ data: DocumentoTecnicoObra[] }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al listar documentos' },
          status: 500,
        },
      };
    }
  },

  guardarDocumento: async (
    payload: {
      solicitud: string;
      cuadrantes?: string;
      tipo_adenda?: string;
      no_adenda_solicituda?: number | string | null;
      tipo_adenda_anterior?: string;
      numero_adenda_anterior?: string | null;
      numero_adenda_actual?: string | null;
      observacion?: string;
      monto_contrato_base?: number | string | null;
      monto_adenda_anterior?: number | string | null;
      monto_adenda_solicitada?: number | string | null;
      monto_total?: number | string | null;
      contratista_id?: string | null;
      contrato_id?: string | null;
      id_sigede: string[];
      obra_ids?: string[];
    },
    id?: string,
  ) => {
    try {
      const data = id
        ? await documentosTecnicosService.actualizar(id, payload)
        : await documentosTecnicosService.crear(payload);
      return { data: { data } } as AxiosResponse<{ data: DocumentoTecnicoObra }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al guardar documento' },
          status: 500,
        },
      };
    }
  },

  eliminarDocumento: async (id: string) => {
    try {
      await documentosTecnicosService.eliminar(id);
      return { data: { ok: true } };
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al eliminar documento' },
          status: 500,
        },
      };
    }
  },

  obtenerDocumentoPorId: async (id: string) => {
    try {
      const data = await documentosTecnicosService.obtenerPorId(id);
      return { data: { data } } as AxiosResponse<{ data: DocumentoTecnicoObra | null }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al obtener documento' },
          status: 500,
        },
      };
    }
  },

  listarMovimientos: async (solicitud: string) => {
    try {
      const data = await documentosTecnicosService.listarMovimientos(solicitud);
      return { data: { data } } as AxiosResponse<{ data: MovimientoDocumentoTecnicoObra[] }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al listar movimientos' },
          status: 500,
        },
      };
    }
  },

  guardarMovimiento: async (payload: {
    solicitud: string;
    fecha_solicitud?: string | null;
    fecha_entrada?: string | null;
    no_tramite?: string | null;
    oficio?: string | null;
    estatus?: string | null;
    departamento?: string | null;
    fecha_salida?: string | null;
    observaciones?: string | null;
    usuario?: string | null;
  }) => {
    try {
      const data = await documentosTecnicosService.crearMovimiento(payload);
      return { data: { data } } as AxiosResponse<{ data: MovimientoDocumentoTecnicoObra }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al registrar movimiento' },
          status: 500,
        },
      };
    }
  },

  actualizarMovimiento: async (
    id: string,
    payload: {
      solicitud: string;
      fecha_solicitud?: string | null;
      fecha_entrada?: string | null;
      no_tramite?: string | null;
      oficio?: string | null;
      estatus?: string | null;
      departamento?: string | null;
      fecha_salida?: string | null;
      observaciones?: string | null;
    },
  ) => {
    try {
      const data = await documentosTecnicosService.actualizarMovimiento(id, payload);
      return { data: { data } } as AxiosResponse<{ data: MovimientoDocumentoTecnicoObra }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al actualizar movimiento' },
          status: 500,
        },
      };
    }
  },

  eliminarMovimiento: async (id: string) => {
    try {
      await documentosTecnicosService.eliminarMovimiento(id);
      return { data: { ok: true } };
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al eliminar movimiento' },
          status: 500,
        },
      };
    }
  },

  buscarContratistas: async (search: string, limit = 8) => {
    try {
      const data = await contratistasService.buscar(search, limit);
      return { data: { data } } as AxiosResponse<{ data: import('../types/database').Contratista[] }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al buscar contratistas' },
          status: 500,
        },
      };
    }
  },

  buscarObrasSigede: async (search: string, limit = 10) => {
    try {
      const data = await obrasService.buscarObrasParaSigede(search, limit);
      return { data: { data } };
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al buscar obras' },
          status: 500,
        },
      };
    }
  },

  resumenesSigede: async (ids: string[], obraIds: string[] = []) => {
    try {
      const data = await obrasService.obtenerResumenesObrasDocumento(ids, obraIds);
      return { data: { data } };
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al consultar obras' },
          status: 500,
        },
      };
    }
  },

  crearObraMantenimiento: async (payload: {
    nombre: string;
    provincia?: string | null;
    municipio?: string | null;
    tipo_obra?: string | null;
    contrato_id: string;
    contratista_id?: string | null;
  }) => {
    try {
      const data = await obrasService.crearObraMantenimientoGestionTecnica(payload);
      return { data: { data } };
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al crear obra de mantenimiento' },
          status: 500,
        },
      };
    }
  },

  buscarContratos: async (search: string, limit = 25) => {
    try {
      const data = await adendaService.buscarContratos(search, limit);
      return { data: { data } } as AxiosResponse<{ data: import('../types/database').ContratoTechado[] }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al buscar contratos' },
          status: 500,
        },
      };
    }
  },

  obrasPorContrato: async (contratoId: string, noContrato?: string | null) => {
    try {
      const data = await adendaService.obtenerObrasParaDocumentoPorContrato(
        contratoId,
        noContrato,
      );
      return { data: { data } } as AxiosResponse<{
        data: { id_sigede: string[]; obra_ids: string[] };
      }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al cargar obras del contrato' },
          status: 500,
        },
      };
    }
  },

  obtenerContratoPorId: async (id: string) => {
    try {
      const data = await adendaService.obtenerContratoPorId(id);
      return { data: { data } } as AxiosResponse<{ data: import('../types/database').ContratoTechado | null }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al obtener contrato' },
          status: 500,
        },
      };
    }
  },

  resolverContratoDesdeObras: async (noContrato: string, contratistaNombre?: string | null) => {
    try {
      const norm = String(noContrato || '').trim();
      // Solo crear en catálogo si el número tiene formato completo (evita huérfanos tipo "0459").
      const formatoCompleto = /^\d{4}-\d{2}$/.test(norm) || /^\d{4}-\d{4}$/.test(norm);
      const data = await adendaService.resolverOCrearContrato({
        no_contrato: noContrato,
        contratista_nombre: contratistaNombre,
        crearSiFalta: formatoCompleto,
      });
      return { data: { data } } as AxiosResponse<{ data: import('../types/database').ContratoTechado | null }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al resolver contrato' },
          status: 500,
        },
      };
    }
  },

  listarAdendasContrato: async (contratoId: string) => {
    try {
      const data = await adendaService.listarPorContrato(contratoId);
      return { data: { data } } as AxiosResponse<{ data: import('../types/database').Adenda[] }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al listar adendas' },
          status: 500,
        },
      };
    }
  },

  guardarAdenda: async (
    payload: {
      contrato_id: string;
      obra_id?: string | null;
      numero_adenda?: string | null;
      tipo_adenda?: string | null;
      monto?: number | string | null;
      estado: import('../types/database').EstadoAdenda;
    },
    id?: string,
  ) => {
    try {
      const data = id
        ? await adendaService.actualizar(id, payload)
        : await adendaService.crear(payload);
      return { data: { data } } as AxiosResponse<{ data: import('../types/database').Adenda }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al guardar adenda' },
          status: 500,
        },
      };
    }
  },

  eliminarAdenda: async (id: string) => {
    try {
      await adendaService.eliminar(id);
      return { data: { ok: true } };
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al eliminar adenda' },
          status: 500,
        },
      };
    }
  },

  listarComentariosDocumento: async (
    documentoId: string,
    opciones?: { adendaId?: string | null; soloDocumento?: boolean },
  ) => {
    try {
      const data = await documentoTecnicoComentarioService.listarPorDocumento(documentoId, opciones);
      return {
        data: { data },
      } as AxiosResponse<{ data: import('../types/database').DocumentoTecnicoComentario[] }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al listar comentarios' },
          status: 500,
        },
      };
    }
  },

  crearComentarioDocumento: async (payload: {
    documento_id: string;
    adenda_id?: string | null;
    comentario: string;
    usuario: string;
    archivo?: File | null;
  }) => {
    try {
      const data = await documentoTecnicoComentarioService.crear(payload);
      return {
        data: { data },
      } as AxiosResponse<{ data: import('../types/database').DocumentoTecnicoComentario }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al registrar comentario' },
          status: 500,
        },
      };
    }
  },

  eliminarComentarioDocumento: async (id: string) => {
    try {
      await documentoTecnicoComentarioService.eliminar(id);
      return { data: { ok: true } };
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al eliminar comentario' },
          status: 500,
        },
      };
    }
  },

  exportarExcel: async (filtros?: { busqueda?: string }) => {
    try {
      const documentos = await documentosTecnicosService.listar(filtros);
      const movimientos = await documentosTecnicosService.listarTodosMovimientos();
      const solicitudes = new Set(documentos.map((d) => d.solicitud));
      const movimientosFiltrados = filtros?.busqueda?.trim()
        ? movimientos.filter((m) => solicitudes.has(m.solicitud))
        : movimientos;
      const contratoIds = Array.from(
        new Set(documentos.map((d) => d.contrato_id).filter((id): id is string => !!id)),
      );
      const adendas =
        contratoIds.length > 0 ? await adendaService.listarPorContratoIds(contratoIds) : [];

      const wb = construirWorkbookExport(documentos, movimientosFiltrados, adendas);
      const blob = workbookABlob(wb);
      return { data: blob } as AxiosResponse<Blob>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al exportar Excel' },
          status: 500,
        },
      };
    }
  },

  descargarPlantillaExcel: () => {
    try {
      const wb = construirWorkbookPlantilla();
      const blob = workbookABlob(wb);
      return Promise.resolve({ data: blob } as AxiosResponse<Blob>);
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al generar plantilla' },
          status: 500,
        },
      };
    }
  },

  importarExcel: async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const { documentos, movimientos, adendas } = parsearArchivoExcel(buffer);

      if (documentos.length === 0 && movimientos.length === 0 && adendas.length === 0) {
        throw new Error(
          'No se encontraron filas válidas. Use las hojas "Documentos", "Movimientos" y/o "Adendas" con los encabezados de la plantilla.',
        );
      }

      const resultado = await documentosTecnicosService.importarMasivo({
        documentos,
        movimientos,
        adendas,
      });

      return { data: { data: resultado } };
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al importar Excel' },
          status: 500,
        },
      };
    }
  },
};

// Upload API - Usando Supabase
export const uploadAPI = {
  descargarDatos: async (filtros: ObrasFilters = {}) => {
    try {
      const PAGE = 1000;
      const obras: Obra[] = [];
      let offset = 0;

      for (;;) {
        const response = await obrasService.obtenerObras({
          ...filtros,
          proyeccion: 'completo',
          limit: PAGE,
          offset,
        });
        obras.push(...response.data);
        if (response.data.length < PAGE) break;
        offset += PAGE;
      }

      const wb = construirWorkbookExportObras(obras);
      const blob = workbookObrasABlob(wb);

      return {
        data: blob,
      } as AxiosResponse<Blob>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al exportar datos' },
          status: 500,
        },
      };
    }
  },

  obtenerOpcionesFiltroDescarga: async () => {
    try {
      const data = await obrasService.obtenerOpcionesFiltroDescarga();
      return { data: { data } } as AxiosResponse<{ data: typeof data }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al cargar opciones de filtro' },
          status: 500,
        },
      };
    }
  },

  obtenerSugerenciasBuscar: async (search: string, limit = 8) => {
    try {
      const data = await obrasService.obtenerSugerenciasBuscarObras(search, limit);
      return { data: { data } } as AxiosResponse<{ data: string[] }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al obtener sugerencias' },
          status: 500,
        },
      };
    }
  },

  buscarObrasParaEdicion: async (
    search: string,
    limit = 10,
    opciones?: { contratoId?: string | null },
  ) => {
    try {
      const data = await obrasService.buscarObrasParaEdicion(search, limit, opciones);
      return { data: { data } } as AxiosResponse<{
        data: import('../types/database').ObraEdicionOpcion[];
      }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al buscar obras' },
          status: 500,
        },
      };
    }
  },

  obtenerSugerenciasResponsable: async (search: string, limit = 8) => {
    try {
      const data = await obrasService.obtenerSugerenciasResponsable(search, limit);
      return { data: { data } } as AxiosResponse<{ data: string[] }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al obtener sugerencias de responsable' },
          status: 500,
        },
      };
    }
  },

  subirXml: async (file: File, onProgreso?: ProgresoCargaCallback) => {
    try {
      onProgreso?.({ mensaje: 'Iniciando carga del archivo…', porcentaje: 2 });
      // Intentar subir archivo a Supabase Storage (opcional)
      let storageUrl: string | null = null;
      try {
        onProgreso?.({ mensaje: 'Guardando copia en almacén (opcional)…', porcentaje: 5 });
        const timestamp = Date.now();
        const fileName = `uploads/xml/${timestamp}-${file.name}`;
        storageUrl = await storageService.subirArchivo(file, 'documentos', fileName);
      } catch (storageError: any) {
        // Si el bucket no existe, continuar sin guardar en storage
        console.warn('No se pudo subir a Storage (el bucket puede no existir):', storageError.message);
        if (storageError.message?.includes('Bucket not found')) {
          console.warn('⚠️  Bucket "documentos" no encontrado. Por favor, créalo en Supabase Storage.');
        }
      }

      onProgreso?.({ mensaje: 'Procesando obras en el documento…', porcentaje: 7 });
      // Procesar archivo (esto es lo importante)
      const resultado = await procesarArchivoXml(file, onProgreso);

      // Registrar en historial (opcional - nunca hace fallar el upload)
      try {
        onProgreso?.({ mensaje: 'Registrando historial de carga…', porcentaje: 98 });
        await historialUploadsService.registrarUpload({
          nombre_archivo: file.name,
          tipo_archivo: 'XML',
          registros_procesados: resultado.total,
          registros_exitosos: resultado.exitosas,
          registros_fallidos: resultado.fallidas,
          observaciones: resultado.errores.length > 0 
            ? `Errores: ${resultado.errores.slice(0, 5).join('; ')}` 
            : null,
        });
      } catch (historialError: any) {
        console.warn('No se pudo registrar en historial (el procesamiento fue exitoso):', historialError?.message || historialError);
      }

      onProgreso?.({ mensaje: 'Carga completada', porcentaje: 100 });

      return {
        data: {
          success: true,
          message: 'Archivo XML procesado exitosamente',
          data: resultado,
        },
      } as AxiosResponse<any>;
    } catch (error: any) {
      throw {
        response: {
          data: { 
            error: error.message || 'Error al procesar archivo XML',
            detalles: error.message?.split('\n') || [error.message]
          },
          status: 500,
        },
      };
    }
  },

  validarXml: async (file: File) => {
    try {
      await validarArchivoXml(file);
      return {
        data: { success: true, message: 'Archivo XML válido' },
      } as AxiosResponse<any>;
    } catch (error: any) {
      throw {
        response: {
          data: { 
            error: error.message || 'El archivo XML no es válido',
            detalles: error.message?.split('\n') || [error.message]
          },
          status: 400,
        },
      };
    }
  },

  descargarPlantilla: () => {
    const xmlTemplate = generarXmlPlantillaObras();
    const blob = new Blob([xmlTemplate], { type: 'application/xml' });
    return Promise.resolve({
      data: blob,
    } as AxiosResponse<Blob>);
  },

  descargarPlantillaExcel: () => {
    try {
      const wb = construirWorkbookPlantillaObras();
      const blob = workbookObrasABlob(wb);
      return Promise.resolve({ data: blob } as AxiosResponse<Blob>);
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al generar plantilla' },
          status: 500,
        },
      };
    }
  },

  subirExcel: async (file: File, onProgreso?: ProgresoCargaCallback) => {
    try {
      onProgreso?.({ mensaje: 'Iniciando carga del archivo…', porcentaje: 2 });
      // Intentar subir archivo a Supabase Storage (opcional)
      let storageUrl: string | null = null;
      try {
        onProgreso?.({ mensaje: 'Guardando copia en almacén (opcional)…', porcentaje: 5 });
        const timestamp = Date.now();
        const fileName = `uploads/excel/${timestamp}-${file.name}`;
        storageUrl = await storageService.subirArchivo(file, 'documentos', fileName);
      } catch (storageError: any) {
        // Si el bucket no existe, continuar sin guardar en storage
        console.warn('No se pudo subir a Storage (el bucket puede no existir):', storageError.message);
        if (storageError.message?.includes('Bucket not found')) {
          console.warn('⚠️  Bucket "documentos" no encontrado. Por favor, créalo en Supabase Storage.');
        }
      }

      onProgreso?.({ mensaje: 'Procesando filas del Excel…', porcentaje: 7 });
      // Procesar archivo (esto es lo importante)
      const resultado = await procesarArchivoExcel(file, onProgreso);

      // Registrar en historial (opcional - nunca hace fallar el upload)
      try {
        onProgreso?.({ mensaje: 'Registrando historial de carga…', porcentaje: 98 });
        await historialUploadsService.registrarUpload({
          nombre_archivo: file.name,
          tipo_archivo: 'EXCEL',
          registros_procesados: resultado.total,
          registros_exitosos: resultado.exitosas,
          registros_fallidos: resultado.fallidas,
          observaciones: resultado.errores.length > 0 
            ? `Errores: ${resultado.errores.slice(0, 5).join('; ')}` 
            : null,
        });
      } catch (historialError: any) {
        console.warn('No se pudo registrar en historial (el procesamiento fue exitoso):', historialError?.message || historialError);
      }

      onProgreso?.({ mensaje: 'Carga completada', porcentaje: 100 });

      return {
        data: {
          success: true,
          message: 'Archivo Excel procesado exitosamente',
          data: resultado,
        },
      } as AxiosResponse<any>;
    } catch (error: any) {
      throw {
        response: {
          data: { 
            error: error.message || 'Error al procesar archivo Excel',
            detalles: error.message?.split('\n') || [error.message]
          },
          status: 500,
        },
      };
    }
  },

  validarExcel: async (file: File) => {
    try {
      await validarArchivoExcel(file);
      return {
        data: { success: true, message: 'Archivo Excel válido' },
      } as AxiosResponse<any>;
    } catch (error: any) {
      throw {
        response: {
          data: { 
            error: error.message || 'El archivo Excel no es válido',
            detalles: error.message?.split('\n') || [error.message]
          },
          status: 400,
        },
      };
    }
  },

  obtenerHistorial: async () => {
    try {
      const historial = await historialUploadsService.obtenerHistorial();
      return {
        data: { success: true, data: historial },
      } as AxiosResponse<{ success: boolean; data: any[]; message?: string }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al obtener historial' },
          status: 500,
        },
      };
    }
  },
};

// Trámites API - Conectado a Supabase (seguimiento de trámites)
export const tramitesAPI = {
  obtenerTramites: async (params?: { search?: string; estado?: string; area?: string; areaUsuario?: string; esAdmin?: boolean; limit?: number; offset?: number }) => {
    try {
      const response = await tramitesService.obtenerTramites({
        search: params?.search,
        estado: params?.estado,
        area: params?.area,
        areaUsuario: params?.areaUsuario,
        esAdmin: params?.esAdmin,
        limit: params?.limit ?? 12,
        offset: params?.offset ?? 0,
      });
      return {
        data: { data: response.data, count: response.count ?? response.data.length },
      } as AxiosResponse<{ data: Tramite[]; count: number }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al obtener trámites' },
          status: 500,
        },
      };
    }
  },

  obtenerTramitePorId: async (id: string) => {
    try {
      const data = await tramitesService.obtenerTramitePorId(id);
      return { data: { data } } as AxiosResponse<{ data: Tramite }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Trámite no encontrado' },
          status: 404,
        },
      };
    }
  },

  crearTramite: async (tramite: {
    titulo: string;
    oficio?: string | null;
    nombre_destinatario: string;
    area_destinatario: string;
    area_destino_final: string;
    proceso?: string | null;
    codigo_area?: string;
    id_fijo?: string;
    id_sigede?: string[];
    obra_ids?: string[];
  }) => {
    try {
      const prefijo = tramite.codigo_area || 'TR';
      // Si se pasa id_fijo (desde contratista), usarlo directamente
      const sufijo = (Date.now() % 1000000).toString().padStart(6, '0');
      const id = tramite.id_fijo || `${prefijo}-${sufijo}`;
      const { codigo_area: _, id_fijo: __, id_sigede, obra_ids, ...resto } = tramite;
      const sigedes = (id_sigede || []).map((s) => s.trim()).filter(Boolean);
      const obraIds = (obra_ids || []).map((s) => s.trim()).filter(Boolean);
      const data = await tramitesService.crearTramite({
        ...resto,
        id,
        estado: 'en_transito',
        codigo_barras: `${Date.now()}`,
        proceso: tramite.proceso ?? undefined,
        id_sigede: sigedes,
        obra_ids: obraIds,
      });
      return { data: { data } } as AxiosResponse<{ data: Tramite }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al crear trámite' },
          status: 500,
        },
      };
    }
  },

  crearTramiteConArchivo: async (formData: FormData) => {
    try {
      const titulo = formData.get('titulo') as string;
      const oficio = (formData.get('oficio') as string) || null;
      const nombre_destinatario = formData.get('nombre_destinatario') as string;
      const area_destinatario = formData.get('area_destinatario') as string;
      const area_destino_final = formData.get('area_destino_final') as string;
      const codigo_area = (formData.get('codigo_area') as string) || 'TR';
      const proceso = (formData.get('proceso') as string) || null;
      const archivoPdf = formData.get('archivo_pdf') as File | null;
      const idSigedeRaw = formData.get('id_sigede') as string | null;
      let id_sigede: string[] = [];
      if (idSigedeRaw) {
        try {
          const parsed = JSON.parse(idSigedeRaw);
          if (Array.isArray(parsed)) {
            id_sigede = parsed.map(String).map((s) => s.trim()).filter(Boolean);
          }
        } catch {
          id_sigede = [];
        }
      }
      const obraIdsRaw = formData.get('obra_ids') as string | null;
      let obra_ids: string[] = [];
      if (obraIdsRaw) {
        try {
          const parsed = JSON.parse(obraIdsRaw);
          if (Array.isArray(parsed)) {
            obra_ids = parsed.map(String).map((s) => s.trim()).filter(Boolean);
          }
        } catch {
          obra_ids = [];
        }
      }

      if (!titulo || !nombre_destinatario || !area_destinatario || !area_destino_final) {
        throw new Error('Faltan campos requeridos del trámite');
      }
      if (!archivoPdf || !(archivoPdf instanceof File)) {
        throw new Error('Debe adjuntar un archivo PDF');
      }

      const prefijo = codigo_area || 'TR';
      // Sufijo numérico de 6 dígitos para el ID (ej: TR-123456)
      const sufijo = (Date.now() % 1000000).toString().padStart(6, '0');
      const id = `${prefijo}-${sufijo}`;
      const codigoBarras = `${Date.now()}`;
      let archivoPdfUrl: string | null = null;

      try {
        const path = `tramites/${id}-${archivoPdf.name}`;
        archivoPdfUrl = await storageService.subirArchivo(archivoPdf, 'documentos', path);
      } catch (storageError: any) {
        console.warn('No se pudo subir PDF a Storage:', storageError?.message);
        if (storageError?.message?.includes('Bucket not found')) {
          console.warn('⚠️  Crea el bucket "documentos" en Supabase Storage para guardar los PDFs.');
        }
      }

      const data = await tramitesService.crearTramite({
        id,
        titulo,
        oficio: oficio || undefined,
        nombre_destinatario,
        area_destinatario,
        area_destino_final,
        proceso: proceso || undefined,
        estado: 'en_transito',
        codigo_barras: codigoBarras,
        archivo_pdf: archivoPdfUrl,
        nombre_archivo: archivoPdf.name,
        id_sigede,
        obra_ids,
      });

      return { data: { data } } as AxiosResponse<{ data: Tramite }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al crear trámite con archivo' },
          status: 500,
        },
      };
    }
  },

  actualizarTramite: async (id: string, tramite: Partial<Tramite>) => {
    try {
      const data = await tramitesService.actualizarTramite(id, tramite);
      return { data: { data } } as AxiosResponse<{ data: Tramite }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al actualizar trámite' },
          status: 500,
        },
      };
    }
  },

  eliminarTramite: async (id: string) => {
    try {
      await tramitesService.eliminarTramite(id);
      return { data: { success: true } } as AxiosResponse<{ success: boolean }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al eliminar trámite' },
          status: 500,
        },
      };
    }
  },

  obtenerHistorialTramite: async (id: string) => {
    try {
      const data = await tramitesService.obtenerHistorialTramite(id);
      return { data: { data } } as AxiosResponse<{ data: MovimientoTramite[] }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al obtener historial' },
          status: 500,
        },
      };
    }
  },

  obtenerUltimosMovimientosPorTramites: async (tramiteIds: string[]) => {
    try {
      const mapa = await tramitesService.obtenerUltimosMovimientosPorTramites(tramiteIds);
      const data = Object.fromEntries(mapa.entries());
      return { data: { data } } as AxiosResponse<{ data: Record<string, string | null> }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al obtener últimos movimientos' },
          status: 500,
        },
      };
    }
  },

  obtenerTiemposActualesPorTramites: async (tramiteIds: string[]) => {
    try {
      const data = await tramitesService.obtenerTiemposActualesPorTramites(tramiteIds);
      return { data: { data } } as AxiosResponse<{ data: Record<string, import('../types/database').TiempoEnArea | null> }>;
    } catch (error: any) {
      return { data: { data: {} } } as AxiosResponse<{ data: Record<string, import('../types/database').TiempoEnArea | null> }>;
    }
  },

  obtenerTodosTiemposEnAreaPorTramites: async (tramiteIds: string[]) => {
    try {
      const data = await tramitesService.obtenerTodosTiemposEnAreaPorTramites(tramiteIds);
      return { data: { data } } as AxiosResponse<{ data: import('../types/database').TiempoEnArea[] }>;
    } catch (error: any) {
      return { data: { data: [] } } as unknown as AxiosResponse<{ data: import('../types/database').TiempoEnArea[] }>;
    }
  },

  buscarObrasParaTramite: async (search: string, limit = 12) => {
    try {
      const data = await obrasService.buscarObrasParaTramite(search, limit);
      return { data: { data } } as AxiosResponse<{
        data: import('../types/database').BuscarObrasTramiteResult;
      }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al buscar obras' },
          status: 500,
        },
      };
    }
  },

  registrarMovimiento: async (id: string, movimiento: {
    area_origen: string;
    area_destino: string;
    oficio?: string | null;
    observaciones?: string;
    usuario?: string;
    actualizar_estado?: string;
  }) => {
    try {
      const tramite = await tramitesService.obtenerTramitePorId(id);
      const data = await tramitesService.registrarMovimiento(id, {
        area_origen: movimiento.area_origen,
        area_destino: movimiento.area_destino,
        oficio: movimiento.oficio ?? null,
        observaciones: movimiento.observaciones,
        usuario: movimiento.usuario,
        estado_resultante: movimiento.actualizar_estado ?? null,
      });
      if (movimiento.actualizar_estado) {
        await tramitesService.actualizarTramite(id, {
          estado: movimiento.actualizar_estado as Tramite['estado'],
          area_destinatario: movimiento.area_destino,
        });
      }
      // Mantener sincronizado formulario_contratista cuando el movimiento
      // se registra desde la vista general de seguimiento.
      if ((tramite.id || '').toUpperCase().startsWith('FC-')) {
        const estadoSolicitud =
          movimiento.actualizar_estado === 'completado'
            ? 'completado'
            : movimiento.actualizar_estado === 'detenido'
              ? 'detenido'
              : 'en_seguimiento';
        await formularioContratistaService.sincronizarDesdeTramite(id, {
          nuevo_estado: estadoSolicitud,
          nueva_area_actual: movimiento.area_destino,
        });
      }
      if (tramite.proceso) {
        await tramitesService.cerrarTiempoEnAreaActual(id);
        // En "detenido" el reloj queda en hold: no abrir un nuevo tiempo hasta reanudar.
        if (
          movimiento.actualizar_estado !== 'completado' &&
          movimiento.actualizar_estado !== 'detenido'
        ) {
          await tramitesService.abrirTiempoEnArea(id, movimiento.area_destino, tramite.proceso);
        }
      }
      return { data: { data } } as AxiosResponse<{ data: MovimientoTramite }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al registrar movimiento' },
          status: 500,
        },
      };
    }
  },

  /** Evalúa tiempos abiertos y crea notificaciones 50%, 70%, 100% para el área donde corre el proceso. */
  evaluarNotificacionesTiempo: async (): Promise<void> => {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const openTiempos = await tramitesService.obtenerTiemposEnAreaAbiertos();
    if (openTiempos.length === 0) return;
    const tramiteIds = Array.from(new Set(openTiempos.map((t: { tramite_id: string }) => t.tramite_id)));
    const tramites = await tramitesService.obtenerTramitesPorIds(tramiteIds);
    const tramitesMap: Record<string, { titulo: string; proceso: string | null }> = {};
    tramites.forEach((t) => { tramitesMap[t.id] = { titulo: t.titulo, proceso: t.proceso ?? null }; });
    const ids = openTiempos.map((t: { id?: number }) => t.id).filter((id): id is number => id != null);
    const yaEmitidas = await notificacionesTiempoService.obtenerYaEmitidasPorTiempoEnArea(ids);
    const yaSet = new Set(yaEmitidas.map((e: { tiempo_en_area_id: number; porcentaje: number }) => `${e.tiempo_en_area_id}-${e.porcentaje}`));
    const now = Date.now();
    for (const row of openTiempos) {
      const rowId = row.id;
      if (rowId == null) continue;
      const tramite = tramitesMap[row.tramite_id];
      if (!tramite?.proceso) continue;
      const maxDias = getDiasMaximosPorArea(tramite.proceso, row.area_nombre);
      if (maxDias == null) continue;
      const entradaMs = new Date(row.fecha_entrada).getTime();
      const elapsedDays = (now - entradaMs) / MS_PER_DAY;
      const pct = (elapsedDays / maxDias) * 100;
      const endMs = entradaMs + maxDias * MS_PER_DAY;
      const remainingMs = Math.max(0, endMs - now);
      for (const threshold of [50, 70, 100] as const) {
        if (pct >= threshold && !yaSet.has(`${rowId}-${threshold}`)) {
          const mensaje = mensajeNotificacionTiempo(
            threshold,
            tramite.titulo,
            threshold === 100 ? undefined : remainingMs
          );
          const inserted = await notificacionesTiempoService.insertar({
            tiempo_en_area_id: rowId as number,
            tramite_id: row.tramite_id,
            tramite_titulo: tramite.titulo,
            area_nombre: row.area_nombre,
            porcentaje: threshold,
            mensaje,
          });
          if (inserted) yaSet.add(`${rowId}-${threshold}`);
        }
      }
    }
  },

  /** Notificaciones por tiempo (50/70/100%) para usuarios del área indicada. */
  obtenerNotificacionesTiempo: async (areaNombre: string, usuarioId?: string) => {
    try {
      const data = usuarioId
        ? await notificacionesTiempoService.obtenerNoLeidasPorAreaYUsuario(areaNombre, usuarioId)
        : await notificacionesTiempoService.obtenerPorArea(areaNombre);
      return { data: { data } } as AxiosResponse<{ data: import('../types/database').NotificacionTiempo[] }>;
    } catch (error: any) {
      return { data: { data: [] } } as unknown as AxiosResponse<{ data: import('../types/database').NotificacionTiempo[] }>;
    }
  },

  marcarNotificacionTiempoLeida: async (notificacionId: number, usuarioId: string): Promise<void> => {
    await notificacionesTiempoService.marcarLeida(notificacionId, usuarioId);
  },
};

// Catálogos (áreas, etc.) usando Supabase
export const areasAPI = {
  obtenerAreas: async () => {
    try {
      const data = await areasService.obtenerAreas();
      return {
        data: { data },
      } as AxiosResponse<{ data: Area[] }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al obtener áreas' },
          status: 500,
        },
      };
    }
  },
};

export const formularioContratistaAPI = {
  crear: async (payload: Omit<FormularioContratista, 'id'>) => {
    try {
      const data = await formularioContratistaService.crear(payload);
      return {
        data: { data },
      } as AxiosResponse<{ data: FormularioContratista }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al crear formulario de contratista' },
          status: 500,
        },
      };
    }
  },

  obtener: async (
    limit = 50,
    filtros?: { areaUsuario?: string; esAdmin?: boolean }
  ) => {
    try {
      const data = await formularioContratistaService.obtener(limit, filtros || {});
      return {
        data: { data },
      } as AxiosResponse<{ data: FormularioContratista[] }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al obtener formularios de contratista' },
          status: 500,
        },
      };
    }
  },

  obtenerSugerenciasNombreEmpresa: async (search: string, limit = 8) => {
    try {
      const data = await formularioContratistaService.obtenerSugerenciasNombreEmpresa(search, limit);
      return {
        data: { data },
      } as AxiosResponse<{ data: string[] }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al obtener sugerencias de empresa' },
          status: 500,
        },
      };
    }
  },

  obtenerPorId: async (id: string, filtros?: { areaUsuario?: string; esAdmin?: boolean }) => {
    try {
      const data = await formularioContratistaService.obtenerPorId(id, filtros);
      return {
        data: { data },
      } as AxiosResponse<{ data: FormularioContratista | null }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al obtener la solicitud' },
          status: 500,
        },
      };
    }
  },

  asignarArea: async (
    id: string,
    payload: { area_nombre: string; usuario: string; nota?: string | null }
  ) => {
    try {
      const data = await formularioContratistaService.asignarArea(id, payload);
      return { data: { data } } as AxiosResponse<{ data: FormularioContratista }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al asignar área' },
          status: 500,
        },
      };
    }
  },

  registrarMovimiento: async (
    id: string,
    payload: {
      area_origen: string;
      area_destino: string;
      nota?: string | null;
      estado_resultante: '' | 'detenido' | 'completado';
      usuario: string;
      nuevo_estado: 'en_seguimiento' | 'detenido' | 'completado';
      nueva_area_actual: string;
    }
  ) => {
    try {
      const data = await formularioContratistaService.registrarMovimiento(id, payload);
      return { data: { data } } as AxiosResponse<{ data: FormularioContratista }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al registrar seguimiento' },
          status: 500,
        },
      };
    }
  },

  obtenerMovimientos: async (id: string) => {
    try {
      const data = await formularioContratistaService.obtenerMovimientos(id);
      return {
        data: { data },
      } as AxiosResponse<{ data: MovimientoSolicitudContratista[] }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al obtener historial' },
          status: 500,
        },
      };
    }
  },

  obtenerOCrearToken: async (id: string) => {
    try {
      const token = await formularioContratistaService.obtenerOCrearToken(id);
      return token;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al obtener token QR' },
          status: 500,
        },
      };
    }
  },

  obtenerSolicitudIdPorToken: async (token: string) => {
    try {
      const solicitudId = await formularioContratistaService.obtenerSolicitudIdPorToken(token);
      return solicitudId;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al resolver token' },
          status: 500,
        },
      };
    }
  },
};

export const techadoAPI = {
  obtenerMatriz: async (params: MatrizGeneralFilters = {}) => {
    try {
      const response = await techadoService.obtenerMatrizGeneral(params);
      return { data: response } as AxiosResponse<typeof response>;
    } catch (error: any) {
      throw { response: { data: { error: error.message }, status: 500 } };
    }
  },

  obtenerDetalle: async (matrizId: string) => {
    try {
      const data = await techadoService.obtenerDetalleMatriz(matrizId);
      return { data: { data } } as AxiosResponse<{ data: MatrizGeneralDetalle }>;
    } catch (error: any) {
      throw { response: { data: { error: error.message }, status: 500 } };
    }
  },

  actualizarMatriz: async (id: string, updates: Partial<MatrizGeneralTechado>) => {
    try {
      const data = await techadoService.actualizarMatriz(id, updates);
      return { data: { data } } as AxiosResponse<{ data: MatrizGeneralTechado }>;
    } catch (error: any) {
      throw { response: { data: { error: error.message }, status: 500 } };
    }
  },

  actualizarContrato: async (id: string, updates: Partial<ContratoTechado>) => {
    try {
      const data = await techadoService.actualizarContrato(id, updates);
      return { data: { data } } as AxiosResponse<{ data: ContratoTechado }>;
    } catch (error: any) {
      throw { response: { data: { error: error.message }, status: 500 } };
    }
  },

  importarExcel: async (filas: import('../utils/parsearMatrizTechadoExcel').FilaMatrizTechadoParseada[]) => {
    try {
      const data = await techadoService.importarMatrizDesdeFilas(filas);
      return { data: { data } } as AxiosResponse<{ data: ImportTechadoResult }>;
    } catch (error: any) {
      throw { response: { data: { error: error.message }, status: 500 } };
    }
  },

  vincularObras: async () => {
    try {
      const data = await techadoService.vincularObrasEnMatriz();
      return { data: { data } } as AxiosResponse<{ data: typeof data }>;
    } catch (error: any) {
      throw { response: { data: { error: error.message }, status: 500 } };
    }
  },

  crearTechado: async (payload: CrearTechadoInput) => {
    try {
      const data = await techadoService.crearTechado(payload);
      return { data: { data } } as AxiosResponse<{ data: CrearTechadoResult }>;
    } catch (error: any) {
      throw { response: { data: { error: error.message }, status: 500 } };
    }
  },

  obtenerEstatusDistintos: async () => {
    try {
      const data = await techadoService.obtenerEstatusDistintos();
      return { data: { data } } as AxiosResponse<{ data: string[] }>;
    } catch (error: any) {
      throw { response: { data: { error: error.message }, status: 500 } };
    }
  },
};

export default apiClient;


