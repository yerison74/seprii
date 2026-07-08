/**
 * Tipos TypeScript para la base de datos Supabase
 * Estos tipos deben coincidir con el esquema de la base de datos
 */

export interface Contratista {
  id: string;
  responsable: string;
  identificacion?: string | null;
  telefono1?: string | null;
  telefono2?: string | null;
  correo?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Obra {
  /** Identificador de la obra en Supabase (formato: OB-0000 o MT-0000, generado por el sistema). */
  id: string;
  /** ID legado de la obra (ej. OB-0000 o MT-0000) usado en algunos flujos antiguos. */
  id_obra?: string | null;
  /** Código interno o identificador externo usado para actualizar la obra (ej. 0000-0000). */
  codigo?: string | null;
  /** Código de contrato (máx. 9 caracteres, guía: xxxx-xxxx). Derivado de contrato_id o legado. */
  contrato?: string | null;
  /** FK al catálogo Techado (contrato). Una obra → un contrato; un contrato → N obras. */
  contrato_id?: string | null;
  /** Join lectura — no persistir. */
  contrato_ref?: Pick<ContratoTechado, 'id' | 'lote' | 'no_contrato' | 'contratista_nombre'> | null;
  nombre: string;
  nombre_inaugurado?: string | null;
  /** Tipo de obra: por ejemplo "Construccion" o "Mantenimiento". */
  tipo_obra?: string | null;
  /** Clasificación gestión técnica: Arrastre (SIGEDE) o Mantenimiento (contrato, sin SIGEDE). */
  tipo?: 'Arrastre' | 'Mantenimiento' | null;
  estado: string;
  fecha_inicio?: string | null;
  fecha_fin_estimada?: string | null;
  fecha_detenida?: string | null;
  fecha_inauguracion?: string | null;
  /** FK a contratistas; el nombre del responsable viene de esa tabla. */
  contratista_id?: string | null;
  contratista?: Contratista | null;
  /** Alias de lectura desde contratista.responsable (no se persiste en obras). */
  responsable?: string | null;
  descripcion?: string | null;
  provincia?: string | null;
  municipio?: string | null;
  nivel?: string | null;
  no_aula?: number | null;
  sorteo?: string | null;
  area_construccion?: string | null;
  coordinador?: string | null;
  supervisor?: string | null;
  porcentaje_ejecutado?: number | null;
  presupuesto_total?: number | null;
  avance_inicial?: number | null;
  numero_ultima_cubicacion?: string | null;
  tipo_ultima_cubicacion?: string | null;
  estatus_ultima_cubicacion?: string | null;
  grupo_ultimo_estatus_cubicacion?: string | null;
  total_ultima_cubicacion?: number | null;
  ultima_total_cubicado?: number | null;
  total_cubicado_base?: number | null;
  total_pagado?: number | null;
  envio_snip?: string | null;
  monto_snip?: number | null;
  modificacion_snip?: string | null;
  observacion_legal?: string | null;
  observacion_financiero?: string | null;
  latitud?: string | null;
  longitud?: string | null;
  distrito_minerd_sigede?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Registro base — Gestión técnica de documento. */
export interface DocumentoTecnicoObra {
  id: string;
  solicitud: string;
  cuadrantes?: string | null;
  tipo_adenda?: string | null;
  no_adenda_solicituda?: number | null;
  contratista_id?: string | null;
  contrato_id?: string | null;
  id_sigede: string[];
  /** IDs de obras de mantenimiento (obras.id, ej. MT-xxxx). */
  obra_ids?: string[];
  tipo_adenda_anterior?: string | null;
  numero_adenda_anterior?: string | null;
  numero_adenda_actual?: string | null;
  observacion?: string | null;
  monto_contrato_base?: number | null;
  monto_adenda_anterior?: number | null;
  monto_adenda_solicitada?: number | null;
  monto_total?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  contratista?: Contratista | null;
  contrato?: Pick<ContratoTechado, 'id' | 'lote' | 'no_contrato' | 'contratista_nombre'> | null;
  /** Adendas del contrato vinculado (consulta, no persistido en documentos_tecnicos_obra). */
  adendas?: Adenda[];
  /** Datos de obra por cada id_sigede (consulta, no persistido). */
  obras_sigede?: ObraSigedeResumen[];
}

/** Adenda contractual — Gestión técnica de documento (tabla adenda). */
export type EstadoAdenda = 'en_curso' | 'anterior';

export interface Adenda {
  id: string;
  contrato_id: string;
  numero_adenda: string;
  tipo_adenda?: string | null;
  monto?: number | null;
  estado: EstadoAdenda;
  created_at?: string | null;
  updated_at?: string | null;
  contrato?: Pick<ContratoTechado, 'id' | 'lote' | 'no_contrato'> | null;
}

/** Datos de obra mostrados al vincular obras a un documento técnico. */
export interface ObraSigedeResumen {
  /** Clave en el documento: código/distrito SIGEDE o id de obra (MT-xxxx). */
  id_sigede: string;
  /** Arrastre (SIGEDE) o Mantenimiento (obra manual). */
  tipo_gestion?: 'Arrastre' | 'Mantenimiento';
  /** Id interno de obra (mantenimiento). */
  obra_id?: string | null;
  contrato?: string | null;
  plantel?: string | null;
  tipo?: string | null;
  provincia?: string | null;
  municipio?: string | null;
  encontrada: boolean;
}

/** Resultado de búsqueda de obra para vincular a un trámite. */
export interface ObraTramiteOpcion {
  sigede: string;
  nombre: string;
  contrato?: string | null;
  responsable?: string | null;
  provincia?: string | null;
  municipio?: string | null;
}

export interface BuscarObrasTramiteResult {
  obras: ObraTramiteOpcion[];
  /** Todas las obras de un contrato cuando la búsqueda coincide con el número de contrato. */
  loteContrato: { contrato: string; obras: ObraTramiteOpcion[] } | null;
}

/** Trámite vinculado a un SIGEDE (resumen para detalle de obra). */
export interface TramiteObraResumen {
  id: string;
  titulo: string;
  estado: string;
  oficio?: string | null;
  area_destinatario?: string | null;
  proceso?: string | null;
  fecha_creacion?: string | null;
}

/** Documento técnico vinculado a un SIGEDE (resumen para detalle de obra). */
export interface DocumentoObraResumen {
  id: string;
  solicitud: string;
  tipo_adenda?: string | null;
  no_adenda_solicituda?: number | null;
  numero_adenda_actual?: string | null;
  monto_total?: number | null;
  created_at?: string | null;
}

export interface ObraRelacionesSigede {
  sigedes: string[];
  tramites: TramiteObraResumen[];
  documentos: DocumentoObraResumen[];
  techado?: ObraMatrizTechadoResumen[];
}

/** Opción de búsqueda para editar una obra en Carga de archivos. */
export interface ObraEdicionOpcion {
  id: string;
  /** Código SIGEDE del plantel (obras.codigo). */
  sigede: string;
  codigo?: string | null;
  distrito_minerd_sigede?: string | null;
  nombre: string;
  contrato?: string | null;
  provincia?: string | null;
  municipio?: string | null;
}

/** Movimiento u oficio de un documento técnico. */
export interface MovimientoDocumentoTecnicoObra {
  id: string;
  solicitud: string;
  fecha_solicitud?: string | null;
  fecha_entrada?: string | null;
  no_tramite?: string | null;
  oficio?: string | null;
  estatus?: string | null;
  departamento?: string | null;
  fecha_salida?: string | null;
  observaciones?: string | null;
  created_at?: string | null;
  area?: Area | null;
}

export interface HistorialEstado {
  id: number;
  /** Código de la obra (se usa en lugar de obra_id para trazabilidad). */
  codigo?: string | null;
  /** Identificador interno legado (si existe en la BD). */
  obra_id?: number | null;
  estado_anterior?: string | null;
  estado_nuevo: string;
  fecha_cambio?: string | null;
  usuario?: string | null;
  observaciones?: string | null;
}

export interface Tramite {
  id: string;
  titulo: string;
  oficio?: string | null;
  nombre_destinatario: string;
  area_destinatario: string;
  area_destino_final: string;
  /** Proceso asignado (ej. proceso_1, proceso_2). Si existe, se activa control de tiempo por área. */
  proceso?: string | null;
  estado: 'en_transito' | 'detenido' | 'firmado' | 'procesado' | 'completado';
  codigo_barras?: string | null;
  archivo_pdf?: string | null;
  nombre_archivo?: string | null;
  /** Tipo de trámite para distinguir origen del flujo. */
  tipo_tramite?: 'tipo_interno' | 'tipo_contratista' | 'tipo_gestion_tecnica' | string | null;
  fecha_creacion?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  /** Obras SIGEDE vinculadas al trámite. */
  id_sigede?: string[];
  obras_sigede?: ObraSigedeResumen[];
}

export interface MovimientoTramite {
  id: number;
  tramite_id: string;
  area_origen: string;
  area_destino: string;
  oficio?: string | null;
  fecha_movimiento?: string | null;
  observaciones?: string | null;
  usuario?: string | null;
  /** Estado que quedó el trámite tras este movimiento (ej. 'detenido', 'completado'). Para indicadores en historial. */
  estado_resultante?: string | null;
  /** Tipo de trámite ligado al movimiento (interno / contratista / gestión técnica). */
  tipo_tramite?: 'tipo_interno' | 'tipo_contratista' | 'tipo_gestion_tecnica' | string | null;
  /** FK al movimiento en gestión técnica de documento (espejo de solo lectura en seguimiento). */
  movimiento_documento_id?: string | null;
}

/** Registro de tiempo que un trámite permanece en un área (para procesos con medición). */
export interface TiempoEnArea {
  id?: number;
  tramite_id: string;
  area_nombre: string;
  fecha_entrada: string;
  fecha_salida?: string | null;
  proceso_id: string;
}

/** Catálogo de áreas institucionales. */
export interface Area {
  /** Código del área (ej: DIGE, OAIP, JURI). */
  id: string;
  /** Nombre descriptivo del área. */
  area: string;
  /** ID del usuario encargado del área (tabla usuarios_app), si existe. */
  encargado_id?: string | null;
}

/** Estado del flujo: asignación a área y seguimiento entre áreas. */
export type EstadoSolicitudContratista =
  | 'pendiente_asignacion'
  | 'en_seguimiento'
  | 'detenido'
  | 'completado';

export interface FormularioContratista {
  id: string;
  fecha_visita: string;
  nombres: string;
  apellidos: string;
  nombre_empresa: string;
  motivo_visita: string;
  nombre_obra?: string | null;
  nombre_obra_inaugurada?: string | null;
  provincia: string;
  numero_contrato: string;
  correo: string;
  nota?: string | null;
  /** Nombre descriptivo del área (misma convención que trámites: `area.area`). */
  area_actual?: string | null;
  estado?: EstadoSolicitudContratista | string | null;
}

/** Movimiento de una solicitud entre áreas (seguimiento). */
export interface MovimientoSolicitudContratista {
  id: number;
  solicitud_id: string;
  area_origen: string;
  area_destino: string;
  nota?: string | null;
  estado_resultante?: 'detenido' | 'completado' | string | null;
  usuario?: string | null;
  fecha_movimiento?: string | null;
}

/** Notificación cuando un trámite alcanza 50%, 70% o 100% del tiempo estimado en un área. */
export interface NotificacionTiempo {
  id: number;
  tiempo_en_area_id: number;
  tramite_id: string;
  tramite_titulo: string;
  area_nombre: string;
  porcentaje: 50 | 70 | 100;
  mensaje: string;
  created_at: string;
}

export interface HistorialUpload {
  id: number;
  nombre_archivo: string;
  tipo_archivo: string;
  fecha_subida?: string | null;
  registros_procesados?: number | null;
  registros_exitosos?: number | null;
  registros_fallidos?: number | null;
  usuario?: string | null;
  observaciones?: string | null;
}

// Tipos para filtros y consultas
export interface ObrasFilters {
  limit?: number;
  offset?: number;
  search?: string;
  responsable?: string;
  estado?: string;
  provincia?: string;
  municipio?: string;
  nivel?: string;
  codigo?: string;
  contrato?: string;
  nombre?: string;
  nombre_inaugurado?: string;
  tipo_obra?: string;
  descripcion?: string;
  no_aula?: string;
  sorteo?: string;
  area_construccion?: string;
  coordinador?: string;
  supervisor?: string;
  porcentaje_ejecutado?: string;
  latitud?: string;
  longitud?: string;
  distrito_minerd_sigede?: string;
  presupuesto_total?: string;
  avance_inicial?: string;
  numero_ultima_cubicacion?: string;
  tipo_ultima_cubicacion?: string;
  estatus_ultima_cubicacion?: string;
  grupo_ultimo_estatus_cubicacion?: string;
  total_ultima_cubicacion?: string;
  ultima_total_cubicado?: string;
  total_cubicado_base?: string;
  total_pagado?: string;
  envio_snip?: string;
  monto_snip?: string;
  modificacion_snip?: string;
  observacion_legal?: string;
  observacion_financiero?: string;
  fechaInicioDesde?: string;
  fechaInicioHasta?: string;
  fechaFinEstimadaDesde?: string;
  fechaFinEstimadaHasta?: string;
  fechaDetenidaDesde?: string;
  fechaDetenidaHasta?: string;
  fechaInauguracionDesde?: string;
  fechaInauguracionHasta?: string;
  /** Filtro OR del submódulo de obras (ej. programa Techados). */
  moduloBusquedaOr?: {
    termino: string;
    columnas: string[];
  };
  /**
   * Columnas a traer de la BD.
   * - listado (default): tarjetas y paginación
   * - reporte: agrega latitud/longitud para mapas y estadísticas
   * - completo: todos los campos (exportaciones, etc.)
   */
  proyeccion?: 'listado' | 'reporte' | 'completo';
}

/** Estadísticas agregadas del módulo Reporte (obras filtradas). */
export interface ReporteObrasStats {
  estadisticas: {
    totalObras: number;
    porEstado: Array<{ estado: string; cantidad: number }>;
    totalAulas: number;
    conUbicacion: number;
  };
  obrasPorProvincia: Array<{ provincia: string; cantidad: number }>;
  obrasPorMunicipio: Array<{ municipio: string; provincia: string; cantidad: number }>;
  obrasPorNivel: Array<{ nivel: string; cantidad: number }>;
  obrasPorResponsable: Array<{ responsable: string; cantidad: number }>;
  obrasProximasInaugurar: Obra[];
  /** Obras del filtro con latitud/longitud GPS válidas (para el mapa). */
  obrasConUbicacion: ObraUbicacionGps[];
  /** Detalle completo por áreas del reporte (con contratista). */
  obrasDetalle: Obra[];
}

/** Punto GPS de una obra para mapas de reporte. */
export interface ObraUbicacionGps {
  id: string;
  codigo?: string | null;
  nombre: string;
  estado: string;
  provincia?: string | null;
  latitud: string;
  longitud: string;
}

export interface TramitesFilters {
  search?: string;
  estado?: string;
  area?: string;
  /** Si se indica, solo se devuelven trámites enviados por o enviados a esta área (ignorado si esAdmin) */
  areaUsuario?: string;
  /** Si true, se ignoran filtros por área y se devuelven todos los trámites */
  esAdmin?: boolean;
  limit?: number;
  offset?: number;
}

// Tipos para respuestas de API
export interface ApiResponse<T> {
  data: T;
  count?: number;
  error?: string;
}

// --- Módulo Techado (matriz_general + contrato) ---

export interface ContratoTechado {
  id: string;
  lote: number;
  no_contrato: string;
  contratista_nombre?: string | null;
  contratista_id?: string | null;
  fecha_contrato?: string | null;
  presupuesto_centro?: number | null;
  estatus_contrato?: string | null;
  proceso?: string | null;
  certificacion?: string | null;
  monto_total_inversion?: number | null;
  monto_total_contrato?: number | null;
  avance_20_porciento?: number | null;
  cubicacion_enviada?: string | null;
  libramiento?: string | null;
  fecha_salida?: string | null;
  observaciones?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ContratoAdendaTechado {
  id: string;
  contrato_id: string;
  tipo_adenda?: string | null;
  certificacion?: string | null;
  monto_adendado?: number | null;
  fecha_adenda?: string | null;
  observaciones?: string | null;
  orden?: number;
}

export interface MatrizGeneralTechado {
  id: string;
  contrato_id: string;
  lote: number;
  plantel: string;
  provincia?: string | null;
  municipio?: string | null;
  /** Equivale a obras.distrito_minerd_sigede (REG-DIST del Excel). */
  reg_dist?: string | null;
  obra_id?: string | null;
  ejecucion_actual?: string | null;
  observaciones?: string | null;
  estatus?: string | null;
  porcentaje_ejecucion?: number | null;
  porcentaje_ejecucion_alt?: number | null;
  fecha_inauguracion?: string | null;
  anio_proceso?: number | null;
  monto_contratado_centro?: number | null;
  monto_cubicado_centro?: number | null;
  porcentaje_cubicado_centro?: number | null;
  monto_total_cubicado_sin_amort?: number | null;
  porciento_cubicado?: number | null;
  pendiente_a_cubicar?: number | null;
  monto_total_pagado?: number | null;
  monto_avance_centro?: number | null;
  fecha_ultima_cubicacion?: string | null;
  estatus_ultima_cubicacion?: string | null;
  numero_ultima_cubicacion?: string | null;
  monto_ultima_cubicacion?: number | null;
  valor_cubicado_presupuesto_base?: number | null;
  adicional_cubicacion?: number | null;
  movimiento_tierra?: string | null;
  obs_movimiento_tierra?: string | null;
  obs_planos_arquitectonicos?: string | null;
  obs_diseno?: string | null;
  as_built?: string | null;
  diseno_arquitectonico?: string | null;
  diseno_estructural?: string | null;
  diseno_sanitario?: string | null;
  diseno_electrico?: string | null;
  diseno_hidraulico?: string | null;
  paisajismo?: string | null;
  plano_terminacion?: string | null;
  presupuesto_terminacion?: string | null;
  monto_presupuesto_terminacion?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Fila de la vista v_matriz_general_techado */
export interface MatrizGeneralVista extends Omit<MatrizGeneralTechado, 'id'> {
  id?: string;
  matriz_general_id?: string;
  contratista_nombre?: string | null;
  no_contrato?: string | null;
  fecha_contrato?: string | null;
  presupuesto?: number | null;
  estatus_contrato?: string | null;
  proceso?: string | null;
  certificacion?: string | null;
  tipo_adenda?: string | null;
  monto_adendado?: number | null;
  monto_total_inversion?: number | null;
  monto_total_contrato?: number | null;
  avance_20_porciento?: number | null;
  cubicacion_enviada?: string | null;
  libramiento?: string | null;
  fecha_salida?: string | null;
  observaciones_contrato?: string | null;
}

export interface MatrizGeneralDetalle {
  matriz: MatrizGeneralTechado;
  contrato: ContratoTechado;
  adendas: ContratoAdendaTechado[];
  obra: Obra | null;
}

/** Matriz Techado vinculada a una obra (resumen para Gestión de Obras). */
export interface ObraMatrizTechadoResumen {
  matriz: MatrizGeneralTechado;
  contrato: ContratoTechado;
  adendas: ContratoAdendaTechado[];
}

export interface ImportTechadoResult {
  contratos: number;
  contratosCreados?: number;
  contratosActualizados?: number;
  matriz: number;
  matrizCreadas?: number;
  matrizActualizadas?: number;
  adendas: number;
  adendasCreadas?: number;
  adendasActualizadas?: number;
  obrasVinculadas: number;
  sinObra: number;
  errores: string[];
}

export interface MatrizGeneralFilters {
  search?: string;
  estatus?: string;
  limit?: number;
  offset?: number;
}

/** Datos mínimos para crear un registro Techado (contrato + plantel en matriz). */
export interface CrearTechadoInput {
  lote: number;
  no_contrato: string;
  plantel: string;
  provincia?: string | null;
  municipio?: string | null;
  reg_dist?: string | null;
  contratista_nombre?: string | null;
  estatus?: string | null;
  obra_id?: string | null;
}

export interface CrearTechadoResult {
  matrizId: string;
  contratoId: string;
  obraVinculada: boolean;
}
