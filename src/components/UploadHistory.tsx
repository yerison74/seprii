import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Stack,
  Card,
  CardContent,
  CardActions,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  Snackbar,
  Checkbox,
} from '@mui/material';
import {
  Search,
  Add,
  QrCode,
  Print,
  Visibility,
  History as HistoryIcon,
  FollowTheSigns,
  PictureAsPdf,
  Download,
  AttachFile,
  Send,
  Person,
  CheckCircle,
  CameraAlt,
  Stop,
  Warning as WarningIcon,
  Scanner,
  Clear,
  ViewList,
  ViewModule
} from '@mui/icons-material';
import { tramitesAPI, Tramite, MovimientoTramite, Area } from '../services/api';
import type { ObraSigedeResumen } from '../types/database';
import { PROCESOS, getDiasMaximosPorArea } from '../constants/procesos';
import { useAuth } from '../context/AuthContext';
import JsBarcode from 'jsbarcode';
import { supabase } from '../lib/supabase';
import { useAreas } from '../hooks/useAreas';
import { getEstadoColor, getEstadoLabel } from '../utils/estadoTramite';
import TramitesToolbar from './tramites/TramitesToolbar';
import NuevoTramiteDialog from './tramites/NuevoTramiteDialog';
import SeguimientoDialog, { SeguimientoData } from './tramites/SeguimientoDialog';
import HistorialDialog from './tramites/HistorialDialog';
import BarcodeDialog from './tramites/BarcodeDialog';
import DetalleTramiteDialog from './tramites/DetalleTramiteDialog';
import { esTramiteGestionTecnica } from '../utils/tramiteGestionTecnica';
const LazyPdfViewerDialog = React.lazy(() => import('./tramites/PdfViewerDialog'));

const ESTADO_OPTIONS: { value: string; label: string }[] = [
  { value: 'en_transito', label: 'En tránsito' },
  { value: 'detenido', label: 'Detenido' },
  { value: 'firmado', label: 'Firmado' },
  { value: 'procesado', label: 'Procesado' },
  { value: 'completado', label: 'Completado' },
];

/** Etiqueta del chip en listado: BD + respaldo por id FC-* (atención al contratista). */
function chipLabelTipoTramite(tramite: Tramite): string {
  if (tramite.tipo_tramite === 'tipo_contratista') return 'Contratista';
  if (tramite.tipo_tramite === 'tipo_gestion_tecnica') return 'Gestión técnica';
  if (tramite.tipo_tramite === 'tipo_interno') return 'Interno';
  if ((tramite.titulo || '').startsWith('Doc. técnico')) return 'Gestión técnica';
  const id = (tramite.id || '').toUpperCase();
  if (id.startsWith('FC-')) return 'Contratista';
  return 'Interno';
}

// Componente para generar código de barras usando jsbarcode - Estilo DIE
const BarcodeDisplay: React.FC<{ codigo: string; id: string; año?: string }> = ({ codigo, id, año }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!barcodeRef.current || !codigo) return;

    let cancelled = false;

    const renderBarcode = async () => {
      try {
        const module = await import('jsbarcode');
        if (cancelled || !barcodeRef.current) return;
        const JsBarcodeDynamic = module.default || (module as any);
        barcodeRef.current.innerHTML = '';
        JsBarcodeDynamic(barcodeRef.current, codigo, {
          format: 'CODE128',
          width: 2,
          height: 80,
          displayValue: false,
          margin: 0,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (error) {
        console.error('Error al generar código de barras:', error);
      }
    };

    renderBarcode();

    return () => {
      cancelled = true;
    };
  }, [codigo]);

  return (
    <Box
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        border: '2.5px solid #000',
        borderRadius: '14px',
        overflow: 'hidden',
        background: '#fff',
        padding: '10px 14px 10px 14px',
        width: 480,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* Fila superior: logo DIE + código de barras. El año va arriba a la derecha absoluto */}
      {año && (
        <Typography
          sx={{
            position: 'absolute',
            top: 10,
            right: 14,
            fontFamily: 'Arial, sans-serif',
            fontWeight: 700,
            fontSize: '0.85rem',
            color: '#000',
            lineHeight: 1,
            zIndex: 1,
          }}
        >
          {año}
        </Typography>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        {/* Logo DIE */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 64 }}>
          <img
            src="logo-die.png"
            alt="DIE Logo"
            style={{ width: 58, height: 'auto', imageRendering: 'crisp-edges' }}
          />
          <Typography
            sx={{
              fontFamily: 'Arial Black, Arial, sans-serif',
              fontWeight: 900,
              fontSize: '1.1rem',
              letterSpacing: 2,
              color: '#000',
              mt: 0.25,
              lineHeight: 1,
            }}
          >
            
          </Typography>
        </Box>

        {/* Código de barras ocupa todo el espacio restante */}
        <Box sx={{ flex: 1, minWidth: 0, mt: año ? '18px' : 0 }}>
          <svg ref={barcodeRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
        </Box>
      </Box>

      {/* ID grande centrado en dos líneas */}
      <Typography
        sx={{
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontWeight: 900,
          fontSize: '2rem',
          letterSpacing: 1,
          color: '#000',
          textAlign: 'center',
          lineHeight: 1.15,
          mt: 0.25,
        }}
      >
        {id}
      </Typography>

      {/* Subtítulo */}
      <Typography
        sx={{
          fontFamily: 'Arial, sans-serif',
          fontSize: '0.72rem',
          color: '#000',
          textAlign: 'center',
          mt: 0.25,
          letterSpacing: 0.5,
        }}
      >
        Dirección de Infraestructura Escolar
      </Typography>
    </Box>
  );
};

interface TramiteHistoryProps {
  soloLectura?: boolean;
}

const TramiteHistory: React.FC<TramiteHistoryProps> = ({ soloLectura = false }) => {
  const { user } = useAuth();
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(15);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [lastInputTime, setLastInputTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openBarcodeDialog, setOpenBarcodeDialog] = useState(false);
  const [openSeguimientoDialog, setOpenSeguimientoDialog] = useState(false);
  const [selectedTramite, setSelectedTramite] = useState<Tramite | null>(null);
  const [openDetalleDialog, setOpenDetalleDialog] = useState(false);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [historial, setHistorial] = useState<MovimientoTramite[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [tiempoStatus, setTiempoStatus] = useState<Record<string, 'ok' | 'warning' | 'exceeded'>>({});
  const [nuevoTramiteMensaje, setNuevoTramiteMensaje] = useState<string | null>(null);
  const [openNuevoTramiteSnackbar, setOpenNuevoTramiteSnackbar] = useState(false);
  const { areas, loadingAreas } = useAreas();

  // Formulario nuevo trámite (destinatario y área se rellenan con el usuario logueado)
  const [nuevoTramite, setNuevoTramite] = useState({
    titulo: '',
    oficio: '',
    nombre_destinatario: '',
    area_destinatario: '',
    area_destino_final: '',
    proceso: '' as string,
    archivo_pdf: null as File | null,
    id_sigede: [] as string[],
  });
  const [obrasResumenTramite, setObrasResumenTramite] = useState<ObraSigedeResumen[]>([]);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [openPdfDialog, setOpenPdfDialog] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formulario de seguimiento
  const [seguimientoData, setSeguimientoData] = useState<SeguimientoData>({
    area_origen: '',
    area_destino: '',
    usuario: '',
    observaciones: '',
    actualizar_estado: '',
  });

  useEffect(() => {
    loadTramites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery, estadoFilter]);

  // Al abrir el diálogo de nuevo trámite, rellenar solo el remitente con el usuario logueado.
  // Primera área de envío queda vacía para que el usuario la elija.
  useEffect(() => {
    if (openDialog && user) {
      const nombreCompleto = [user.nombre, user.apellido].filter(Boolean).join(' ').trim();
      setNuevoTramite((prev) => ({
        ...prev,
        nombre_destinatario: nombreCompleto || prev.nombre_destinatario
        // area_destinatario no se rellena: el usuario debe elegir la primera área de envío
      }));
    }
  }, [openDialog, user]);

  // Resetear a página 1 cuando cambian filtros
  useEffect(() => {
    setPage(1);
  }, [hideCompleted, searchQuery, estadoFilter]);

  // Limpiar stream de cámara al desmontar
  useEffect(() => {
    return () => {
      stopCameraScan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Abrir detalle de trámite cuando se hace clic en una notificación de tiempo
  useEffect(() => {
    const handler = async (event: Event) => {
      const custom = event as CustomEvent<{ tramiteId?: string }>;
      const tramiteId = custom.detail?.tramiteId;
      if (!tramiteId) return;

      try {
        setLoading(true);
        setError(null);
        const tramiteRes = await tramitesAPI.obtenerTramitePorId(tramiteId);
        const tramite = tramiteRes.data.data;
        setSelectedTramite(tramite);
        setOpenHistoryDialog(true);
        setLoadingHistorial(true);
        setHistorial([]);
        const histRes = await tramitesAPI.obtenerHistorialTramite(tramite.id);
        setHistorial(histRes.data.data || []);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Error al abrir el trámite desde la notificación');
      } finally {
        setLoading(false);
        setLoadingHistorial(false);
      }
    };

    window.addEventListener('openTramiteDesdeNotificacion', handler as EventListener);
    return () => {
      window.removeEventListener('openTramiteDesdeNotificacion', handler as EventListener);
    };
  }, []);

  // Suscribirse a nuevos trámites que lleguen al área del usuario y notificar
  useEffect(() => {
    if (!user?.area) return;

    const channel = supabase
      .channel(`tramites-nuevos-${user.area}`)
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'tramites',
          event: 'INSERT',
          filter: `area_destinatario=eq.${user.area}`,
        },
        (payload) => {
          const nuevo = payload.new as any;
          const titulo = nuevo?.titulo || nuevo?.id || 'Nuevo trámite';
          setNuevoTramiteMensaje(`Nuevo trámite recibido en tu área: ${titulo}`);
          setOpenNuevoTramiteSnackbar(true);
          // Refrescar lista para incluir el nuevo trámite
          loadTramites();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.area]);

  // Notificar cuando un trámite llega a mi área vía movimiento y refrescar listado.
  useEffect(() => {
    if (!user?.area) return;
    const channel = supabase
      .channel(`tramites-movimientos-llegada-${user.area}`)
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'movimientos_tramites',
          event: 'INSERT',
          filter: `area_destino=eq.${user.area}`,
        },
        async (payload) => {
          const nuevo = payload.new as any;
          const tramiteId = nuevo?.tramite_id;
          let titulo = tramiteId || 'trámite';
          if (tramiteId) {
            try {
              const res = await tramitesAPI.obtenerTramitePorId(tramiteId);
              titulo = res?.data?.data?.titulo || tramiteId;
            } catch {
              titulo = tramiteId;
            }
          }
          setNuevoTramiteMensaje(`Llegó un trámite a tu área (${user.area}): ${titulo}`);
          setOpenNuevoTramiteSnackbar(true);
          loadTramites();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.area]);

  const loadTramites = async () => {
    try {
      setLoading(true);
      setError(null);
      const areaUsuario = user?.area ?? '';
      const verTodosTramites = user?.rol === 'admin' || user?.rol === 'supervision';
      const response = await tramitesAPI.obtenerTramites({ 
        search: searchQuery,
        estado: estadoFilter || undefined,
        limit: rowsPerPage,
        offset: (page - 1) * rowsPerPage,
        areaUsuario: areaUsuario || undefined,
        esAdmin: verTodosTramites,
      });
      const tramitesData = response.data.data || [];
      const total = response.data.count ?? tramitesData.length;
      setTotalCount(total);

      // Obtener URL del backend desde variable de entorno o usar default
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

      // Convertir URLs relativas a absolutas
      const tramitesConUrl = tramitesData.map((tramite: any) => {
        if (tramite.archivo_pdf && tramite.archivo_pdf.startsWith('/api/')) {
          tramite.archivo_pdf = `${backendUrl}${tramite.archivo_pdf}`;
        }
        return tramite;
      });

      // Ordenar por movimiento más reciente (fallback: fecha de creación)
      let tramitesOrdenados = tramitesConUrl;
      if (tramitesConUrl.length > 0) {
        const ids = tramitesConUrl.map((t: Tramite) => t.id);
        try {
          const res = await tramitesAPI.obtenerUltimosMovimientosPorTramites(ids);
          const mapaFechas = new Map(Object.entries(res.data.data || {}));
          tramitesOrdenados = [...tramitesConUrl].sort((a, b) => {
            const fa = mapaFechas.get(a.id) || a.fecha_creacion || a.created_at || '';
            const fb = mapaFechas.get(b.id) || b.fecha_creacion || b.created_at || '';
            return new Date(fb).getTime() - new Date(fa).getTime();
          });
        } catch {
          tramitesOrdenados = [...tramitesConUrl].sort(
            (a, b) => new Date(b.fecha_creacion || b.created_at || '').getTime() - new Date(a.fecha_creacion || a.created_at || '').getTime()
          );
        }
      }

      setTramites(tramitesOrdenados);

      const conProceso = tramitesConUrl.filter((t: Tramite) => t.proceso && t.estado !== 'completado');
      if (conProceso.length > 0) {
        try {
          const ids = conProceso.map((t: Tramite) => t.id);
          const [resActuales, resTodos] = await Promise.all([
            tramitesAPI.obtenerTiemposActualesPorTramites(ids),
            tramitesAPI.obtenerTodosTiemposEnAreaPorTramites(ids),
          ]);
          const tiempos = resActuales.data?.data || {};
          const todosLosTiempos: { tramite_id: string; area_nombre: string; fecha_entrada: string; fecha_salida?: string | null }[] = resTodos.data?.data || [];
          const status: Record<string, 'ok' | 'warning' | 'exceeded'> = {};
          const now = Date.now();
          conProceso.forEach((t: Tramite) => {
            const te = tiempos[t.id];
            if (!te) return;
            const areaActual = te.area_nombre;
            const diasMax = getDiasMaximosPorArea(t.proceso!, areaActual);
            if (diasMax == null) return;
            const filasEnEstaArea = todosLosTiempos.filter((r: any) => r.tramite_id === t.id && r.area_nombre === areaActual);
            let totalMs = 0;
            filasEnEstaArea.forEach((r: any) => {
              const inicio = new Date(r.fecha_entrada).getTime();
              const fin = r.fecha_salida ? new Date(r.fecha_salida).getTime() : now;
              totalMs += fin - inicio;
            });
            const diasTranscurridos = totalMs / (1000 * 60 * 60 * 24);
            const pct = (diasTranscurridos / diasMax) * 100;
            if (pct >= 100) status[t.id] = 'exceeded';
            else if (pct >= 80) status[t.id] = 'warning';
            else status[t.id] = 'ok';
          });
          setTiempoStatus(status);
        } catch {
          setTiempoStatus({});
        }
      } else {
        setTiempoStatus({});
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('El backend aún no tiene implementados los endpoints de trámites. Los datos se guardan localmente.');
        setTramites([]);
      } else {
        setError(err.response?.data?.error || 'Error al cargar trámites');
        setTramites([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const validatePdf = (file: File): string | null => {
    const name = file.name.toLowerCase();
    const type = file.type;
    const isPdf = name.endsWith('.pdf') || type === 'application/pdf';
    if (!isPdf) return 'Solo se permiten archivos PDF';
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) return 'El archivo PDF es demasiado grande (límite 10MB)';
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const error = validatePdf(file);
      if (error) {
        setError(error);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setNuevoTramite({ ...nuevoTramite, archivo_pdf: file });
        setError(null);
      }
    }
  };

  const handleCreateTramite = async () => {
    if (!nuevoTramite.titulo || !nuevoTramite.nombre_destinatario || 
        !nuevoTramite.area_destinatario) {
      setError('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      setError(null);
      setUploadingPdf(true);
      const areaDestinoFinal = nuevoTramite.area_destino_final || nuevoTramite.area_destinatario;

      let nuevoTramiteData: Tramite;

      const getCodigoArea = (nombreArea: string | undefined | null): string => {
        if (!nombreArea) return 'TR';
        const match = areas.find((a) => a.area === nombreArea);
        return match?.id || 'TR';
      };

      if (nuevoTramite.archivo_pdf) {
        const formData = new FormData();
        formData.append('titulo', nuevoTramite.titulo);
        formData.append('oficio', nuevoTramite.oficio);
        formData.append('nombre_destinatario', nuevoTramite.nombre_destinatario);
        formData.append('area_destinatario', nuevoTramite.area_destinatario);
        formData.append('area_destino_final', areaDestinoFinal);
        if (nuevoTramite.proceso) formData.append('proceso', nuevoTramite.proceso);
        formData.append('codigo_area', getCodigoArea(user?.area || ''));
        formData.append('archivo_pdf', nuevoTramite.archivo_pdf);
        if (nuevoTramite.id_sigede.length > 0) {
          formData.append('id_sigede', JSON.stringify(nuevoTramite.id_sigede));
        }

        const response = await tramitesAPI.crearTramiteConArchivo(formData);
        nuevoTramiteData = response.data.data;

        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
        if (nuevoTramiteData.archivo_pdf && nuevoTramiteData.archivo_pdf.startsWith('/api/')) {
          nuevoTramiteData.archivo_pdf = `${backendUrl}${nuevoTramiteData.archivo_pdf}`;
        }
      } else {
        const response = await tramitesAPI.crearTramite({
          titulo: nuevoTramite.titulo,
          oficio: nuevoTramite.oficio || undefined,
          nombre_destinatario: nuevoTramite.nombre_destinatario,
          area_destinatario: nuevoTramite.area_destinatario,
          area_destino_final: areaDestinoFinal,
          proceso: nuevoTramite.proceso || undefined,
          codigo_area: getCodigoArea(user?.area || ''),
          id_sigede: nuevoTramite.id_sigede,
        });
        nuevoTramiteData = response.data.data;
      }

      // Movimiento 1: desde el área del usuario hasta la primera área de envío, por quien creó el trámite
      const areaOrigenCreador = user?.area || 'Área del creador';
      const nombreCreador = [user?.nombre, user?.apellido].filter(Boolean).join(' ').trim() || nuevoTramite.nombre_destinatario;
      try {
        await tramitesAPI.registrarMovimiento(nuevoTramiteData.id, {
          area_origen: areaOrigenCreador,
          area_destino: nuevoTramite.area_destinatario,
          usuario: nombreCreador,
          observaciones: 'Trámite creado',
          actualizar_estado: 'en_transito',
        });
      } catch (errMov: any) {
        console.warn('No se pudo registrar el movimiento inicial del trámite:', errMov?.response?.data?.error || errMov);
      }

      setTramites([{ ...nuevoTramiteData, estado: 'en_transito' }, ...tramites]);

      setOpenDialog(false);
      setNuevoTramite({
        titulo: '',
        oficio: '',
        nombre_destinatario: '',
        area_destinatario: '',
        area_destino_final: '',
        proceso: '',
        archivo_pdf: null,
        id_sigede: [],
      });
      setObrasResumenTramite([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear el trámite');
    } finally {
      setUploadingPdf(false);
    }
  };

  const processScannedCode = (code: string) => {
    // Buscar por ID (ej. OAIP-123456, JURI-123456) o solo números
    setSearchQuery(code);
    setPage(1);
    setTimeout(() => loadTramites(), 100);
  };

  const handleSearch = () => {
    setPage(1);
    loadTramites();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const now = Date.now();
    const timeSinceLastInput = now - lastInputTime;
    
    setSearchQuery(value);
    setLastInputTime(now);
    
    // Detectar escaneo de escáner profesional: si se escribe muy rápido (menos de 50ms entre caracteres)
    // y el código tiene al menos 6 caracteres, probablemente es un escaneo
    if (value.length >= 6 && timeSinceLastInput < 50 && timeSinceLastInput > 0) {
      // Esperar un momento para ver si hay más caracteres
      setTimeout(() => {
        if (searchInputRef.current?.value === value) {
          processScannedCode(value);
        }
      }, 200);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const startCameraScan = async () => {
    try {
      setScanning(true);
      setError(null);
      
      // Verificar si el navegador soporta BarcodeDetector API
      if ('BarcodeDetector' in window) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' } // Cámara trasera en móviles
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'codabar', 'i2of5']
          });
          
          const detectBarcode = async () => {
            if (videoRef.current && scanning) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const code = barcodes[0].rawValue;
                  stopCameraScan();
                  processScannedCode(code);
                }
              } catch (err) {
                // Continuar escaneando
              }
              if (scanning) {
                requestAnimationFrame(detectBarcode);
              }
            }
          };
          
          detectBarcode();
        }
      } else {
        // Fallback: usar input manual con foco automático
        setError('Tu navegador no soporta escaneo con cámara. Usa un escáner de código de barras profesional o escribe el código manualmente.');
        searchInputRef.current?.focus();
        setScanning(false);
      }
    } catch (err: any) {
      setError('No se pudo acceder a la cámara. Asegúrate de dar permisos de cámara.');
      setScanning(false);
    }
  };

  const stopCameraScan = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const handleViewPdf = async (tramite: Tramite) => {
    if (!tramite.archivo_pdf) {
      setError('No hay archivo PDF asociado a este trámite');
      return;
    }

    try {
      // Obtener URL del backend desde variable de entorno o usar default
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
      // Asegurar que la URL sea absoluta
      let pdfUrl = tramite.archivo_pdf.trim();
      
      // Si es una URL relativa que empieza con /api/
      if (pdfUrl.startsWith('/api/')) {
        pdfUrl = `${backendUrl}${pdfUrl}`;
      }
      // Si es una blob URL (creada localmente), usarla directamente
      else if (pdfUrl.startsWith('blob:')) {
        // Mantener la blob URL - estas son válidas localmente
      }
      // Si ya es una URL completa (http/https), usarla directamente
      else if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) {
        // URL completa, usar tal cual
      }
      // Si no tiene protocolo, intentar construir URL
      else {
        // Si no tiene protocolo, asumir que es relativa al backend
        pdfUrl = `${backendUrl}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;
      }
      
      console.log('Abriendo PDF en nueva pestaña:', pdfUrl);
      
      // Verificar si la URL es válida antes de abrir
      if (!pdfUrl || pdfUrl.trim() === '') {
        setError('URL del PDF no válida');
        return;
      }
      
      // Abrir PDF en nueva pestaña del navegador
      // El navegador usará su visor de PDF integrado o el lector del sistema según configuración
      const newWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      
      // Si el navegador bloquea la ventana emergente, mostrar mensaje
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
       
      }
    } catch (error: any) {
      console.error('Error al abrir PDF:', error);
      setError(`Error al abrir el PDF: ${error.message || 'Error desconocido'}. Verifica que el backend esté corriendo y que la URL del PDF sea válida.`);
    }
  };

  const handleDownloadPdf = (tramite: Tramite) => {
    if (!tramite.archivo_pdf) {
      setError('No hay archivo PDF asociado a este trámite');
      return;
    }

    try {
      // Obtener URL del backend desde variable de entorno o usar default
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
      // Asegurar que la URL sea absoluta
      let pdfUrl = tramite.archivo_pdf.trim();
      
      // Si es una URL relativa que empieza con /api/
      if (pdfUrl.startsWith('/api/')) {
        pdfUrl = `${backendUrl}${pdfUrl}`;
      }
      // Si ya es una URL completa (http/https/blob), usarla directamente
      else if (!pdfUrl.startsWith('http://') && !pdfUrl.startsWith('https://') && !pdfUrl.startsWith('blob:')) {
        // Si no tiene protocolo, asumir que es relativa al backend
        pdfUrl = `${backendUrl}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;
      }
      
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = tramite.nombre_archivo || `tramite-${tramite.id}.pdf`;
      link.target = '_blank'; // Abrir en nueva pestaña como respaldo
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error('Error al descargar PDF:', error);
      setError(`Error al descargar el PDF: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleOpenDetalle = async (tramite: Tramite) => {
    setSelectedTramite(tramite);
    setOpenDetalleDialog(true);
    try {
      const res = await tramitesAPI.obtenerTramitePorId(tramite.id);
      setSelectedTramite(res.data.data);
    } catch {
      // Mantener datos de la fila si falla la carga completa
    }
  };

  const handleViewBarcode = (tramite: Tramite) => {
    setSelectedTramite(tramite);
    setOpenBarcodeDialog(true);
  };

  const handleSeguimiento = (tramite: Tramite) => {
    setSelectedTramite(tramite);
    const nombreCompleto = user ? [user.nombre, user.apellido].filter(Boolean).join(' ').trim() : '';
    // Área origen = última área en la que llegó el trámite (donde está actualmente)
    const ultimaAreaLlegada = tramite.area_destinatario;
    setSeguimientoData({
      area_origen: ultimaAreaLlegada,
      area_destino: '',
      usuario: nombreCompleto,
      observaciones: '',
      actualizar_estado: tramite.estado
    });
    setOpenSeguimientoDialog(true);
  };

  const handleRegistrarSeguimiento = async () => {
    if (!selectedTramite) return;
    if (esTramiteGestionTecnica(selectedTramite)) {
      setError(
        'Este trámite proviene de Gestión técnica de documento. Registre o edite movimientos allí; en Seguimiento solo puede consultarlos.',
      );
      return;
    }

    const esDetenido = seguimientoData.actualizar_estado === 'detenido';
    const esCompletado = seguimientoData.actualizar_estado === 'completado';
    const requiereAreaDestino = !esDetenido && !esCompletado;

    if ((!seguimientoData.area_destino && requiereAreaDestino) || !seguimientoData.usuario) {
      setError(
        requiereAreaDestino
          ? 'Por favor complete el área destino y el usuario'
          : 'Por favor complete el usuario'
      );
      return;
    }

    try {
      setError(null);
      await tramitesAPI.registrarMovimiento(selectedTramite.id, {
        area_origen: seguimientoData.area_origen,
        area_destino: esDetenido || esCompletado
          ? seguimientoData.area_origen
          : seguimientoData.area_destino,
        usuario: seguimientoData.usuario,
        observaciones: seguimientoData.observaciones,
        actualizar_estado: seguimientoData.actualizar_estado
      });

      setOpenSeguimientoDialog(false);
      setSeguimientoData({
        area_origen: '',
        area_destino: '',
        usuario: '',
        observaciones: '',
        actualizar_estado: ''
      });
      await loadTramites();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar el seguimiento');
    }
  };

  const handleViewHistory = async (tramite: Tramite) => {
    setSelectedTramite(tramite);
    setOpenHistoryDialog(true);
    setLoadingHistorial(true);
    setHistorial([]);
    
    try {
      const response = await tramitesAPI.obtenerHistorialTramite(tramite.id);
      setHistorial(response.data.data || []);
    } catch (err: any) {
      console.error('Error al cargar historial:', err);
      if (err.response?.status === 404 || err.response?.status === 500) {
        // Si no hay historial o hay error, mostrar lista vacía
        setHistorial([]);
      } else {
        setError('Error al cargar el historial del trámite');
        // Aún así mostrar el modal con lista vacía
        setHistorial([]);
      }
    } finally {
      setLoadingHistorial(false);
    }
  };

  // Obtener código de barras del ID (solo números)
  const getCodigoBarras = (id: string) => {
    // Usar el ID completo (ej. TECO-1771359309039)
    return id;
  };

  // Filtrar trámites según búsqueda y estado completado
  const filteredTramites = useMemo(
    () =>
      tramites.filter((tramite) => {
        if (hideCompleted && tramite.estado === 'completado') {
          return false;
        }

        const searchLower = searchQuery.toLowerCase();
        const codigoBarras = getCodigoBarras(tramite.id);

        return (
          tramite.titulo.toLowerCase().includes(searchLower) ||
          (tramite.oficio && tramite.oficio.toLowerCase().includes(searchLower)) ||
          tramite.nombre_destinatario.toLowerCase().includes(searchLower) ||
          tramite.id.toLowerCase().includes(searchLower) ||
          tramite.area_destinatario.toLowerCase().includes(searchLower) ||
          tramite.area_destino_final.toLowerCase().includes(searchLower) ||
          codigoBarras.includes(searchQuery.replace(/[^0-9]/g, ''))
        );
      }),
    [tramites, hideCompleted, searchQuery],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const paginatedTramites = filteredTramites;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <FollowTheSigns sx={{ fontSize: 32, color: 'primary.main' }} />
        <Typography
          variant="h4"
          sx={{
            fontWeight: 600,
            color: 'primary.main',
          }}
        >
          Seguimiento de Trámites
        </Typography>
      </Box>

      <TramitesToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearch}
        estadoFilter={estadoFilter}
        onEstadoFilterChange={setEstadoFilter}
        estadoOptions={ESTADO_OPTIONS}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        hideCompleted={hideCompleted}
        onHideCompletedChange={setHideCompleted}
        scanning={scanning}
        onToggleScan={scanning ? stopCameraScan : startCameraScan}
        searchInputRef={searchInputRef}
        onOpenNuevoTramite={() => setOpenDialog(true)}
      />

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : filteredTramites.length === 0 ? (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <FollowTheSigns sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchQuery ? 'No se encontraron trámites' : 'No hay trámites registrados'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {searchQuery 
              ? 'Intente con otros términos de búsqueda'
              : 'Comience creando un nuevo trámite para rastrear documentos físicos.'}
          </Typography>
          {!searchQuery && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenDialog(true)}
              sx={{ mt: 2 }}
            >
              Crear Primer Trámite
            </Button>
          )}
        </Paper>
      ) : (
        <>
          {viewMode === 'list' ? (
            /* Vista de Lista (Tabla) */
            <TableContainer component={Paper} elevation={3} sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'primary.main' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>ID</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Título</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Remitente</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Área actual</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Estado</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Fecha Creación</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">Documento</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedTramites.map((tramite) => (
                    <TableRow
                      key={tramite.id}
                      onClick={() => handleOpenDetalle(tramite)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'action.hover' },
                        borderLeft: tramite.estado === 'completado' ? '4px solid #4CAF50' : tramite.estado === 'detenido' || tiempoStatus[tramite.id] === 'exceeded' ? '4px solid #F44336' : tramite.proceso && tiempoStatus[tramite.id] === 'warning' ? '4px solid #ff9800' : 'none',
                        backgroundColor: tramite.estado === 'detenido' || tiempoStatus[tramite.id] === 'exceeded' ? 'rgba(244, 67, 54, 0.04)' : tramite.proceso && tiempoStatus[tramite.id] === 'warning' ? 'rgba(255, 152, 0, 0.08)' : 'inherit'
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {tramite.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {tramite.titulo}
                          </Typography>
                          <Chip
                            size="small"
                            variant="outlined"
                            color="default"
                            label={chipLabelTipoTramite(tramite)}
                            sx={{ height: 20, '& .MuiChip-label': { px: 0.75, fontSize: '0.68rem' } }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person fontSize="small" color="action" />
                          <Typography variant="body2">
                            {tramite.nombre_destinatario}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {tramite.area_destinatario}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                          <Chip
                            label={getEstadoLabel(tramite.estado)}
                            size="small"
                            color={getEstadoColor(tramite.estado)}
                          />
                          {tramite.proceso && tiempoStatus[tramite.id] === 'warning' && (
                            <Tooltip title="Trámite próximo a vencer en esta área (80% del tiempo)">
                              <Chip label="Próximo a vencer" size="small" sx={{ bgcolor: '#ff9800', color: 'white', fontWeight: 600, border: '1px solid rgba(255, 152, 0, 0.5)' }} />
                            </Tooltip>
                          )}
                          {tramite.proceso && tiempoStatus[tramite.id] === 'exceeded' && (
                            <Tooltip title="Tiempo excedido en esta área">
                              <Chip label="Excedido" size="small" color="error" />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {tramite.fecha_creacion 
                            ? new Date(tramite.fecha_creacion).toLocaleDateString('es-DO')
                            : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        {tramite.archivo_pdf ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<PictureAsPdf />}
                            onClick={() => handleViewPdf(tramite)}
                          >
                            Ver PDF
                          </Button>
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Ver Código de Barras">
                            <IconButton
                              size="small"
                              onClick={() => handleViewBarcode(tramite)}
                              color="primary"
                            >
                              <QrCode fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {tramite.estado !== 'completado' &&
                            !soloLectura &&
                            !esTramiteGestionTecnica(tramite) && (
                            <Tooltip title="Registrar Seguimiento">
                              <IconButton
                                size="small"
                                onClick={() => handleSeguimiento(tramite)}
                                color="success"
                              >
                                <Send fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            /* Vista de Cards */
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 3,
              mb: 3
            }}>
              {paginatedTramites.map((tramite) => {
              const codigoBarras = getCodigoBarras(tramite.id);
              return (
                <Box key={tramite.id}>
                  <Card 
                    elevation={3}
                    onClick={() => handleOpenDetalle(tramite)}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      border: tramite.estado === 'completado' ? '2px solid #4CAF50' : tramite.estado === 'detenido' || tiempoStatus[tramite.id] === 'exceeded' ? '2px solid #F44336' : tramite.proceso && tiempoStatus[tramite.id] === 'warning' ? '2px solid #ff9800' : 'none',
                      borderLeft: tramite.estado === 'completado' ? '4px solid #4CAF50' : tramite.estado === 'detenido' || tiempoStatus[tramite.id] === 'exceeded' ? '4px solid #F44336' : tramite.proceso && tiempoStatus[tramite.id] === 'warning' ? '4px solid #ff9800' : 'none',
                      backgroundColor: tramite.estado === 'completado' ? 'rgba(76, 175, 80, 0.05)' : tramite.estado === 'detenido' || tiempoStatus[tramite.id] === 'exceeded' ? 'rgba(244, 67, 54, 0.05)' : tramite.proceso && tiempoStatus[tramite.id] === 'warning' ? 'rgba(255, 152, 0, 0.08)' : 'inherit',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 6
                      }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      {/* Información básica */}
                      <Box sx={{ mb: 2 }}>
                        {tramite.estado === 'completado' && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            mb: 1,
                            p: 1,
                            bgcolor: 'success.light',
                            borderRadius: 1
                          }}>
                            <CheckCircle color="success" fontSize="small" />
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.dark' }}>
                              TRÁMITE COMPLETADO
                            </Typography>
                          </Box>
                        )}
                        {tramite.estado === 'detenido' && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            mb: 1,
                            p: 1,
                            bgcolor: 'rgba(244, 67, 54, 0.12)',
                            borderRadius: 1,
                            border: '1px solid rgba(244, 67, 54, 0.3)'
                          }}>
                            <Stop sx={{ color: '#c62828', fontSize: 20 }} />
                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#c62828' }}>
                              TRÁMITE DETENIDO
                            </Typography>
                          </Box>
                        )}
                        {tramite.proceso && tiempoStatus[tramite.id] === 'warning' && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            mb: 1,
                            p: 1,
                            bgcolor: 'rgba(255, 152, 0, 0.12)',
                            borderRadius: 1,
                            border: '1px solid rgba(255, 152, 0, 0.3)'
                          }}>
                            <WarningIcon sx={{ color: '#e65100', fontSize: 20 }} />
                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#e65100' }}>
                              PRÓXIMO A VENCER (80% TIEMPO EN ÁREA)
                            </Typography>
                          </Box>
                        )}
                        {tramite.proceso && tiempoStatus[tramite.id] === 'exceeded' && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            mb: 1,
                            p: 1,
                            bgcolor: 'rgba(244, 67, 54, 0.12)',
                            borderRadius: 1,
                            border: '1px solid rgba(244, 67, 54, 0.3)'
                          }}>
                            <Stop sx={{ color: '#c62828', fontSize: 20 }} />
                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#c62828' }}>
                              TIEMPO EXCEDIDO EN ÁREA
                            </Typography>
                          </Box>
                        )}
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                          {tramite.titulo}
                        </Typography>
                        <Chip
                          size="small"
                          variant="outlined"
                          color="default"
                          label={chipLabelTipoTramite(tramite)}
                          sx={{ mb: 1 }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Person fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {tramite.nombre_destinatario}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          <strong>Área actual:</strong> {tramite.area_destinatario}
                        </Typography>
                        <Chip
                          label={getEstadoLabel(tramite.estado)}
                          size="small"
                          color={getEstadoColor(tramite.estado)}
                          sx={{ mt: 1 }}
                        />
                      </Box>

                      {/* Archivo PDF - clic para ver */}
                      {tramite.archivo_pdf && (
                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<PictureAsPdf />}
                          onClick={(e) => { e.stopPropagation(); handleViewPdf(tramite); }}
                          sx={{ mb: 2, justifyContent: 'flex-start', textTransform: 'none' }}
                        >
                          Ver PDF: {tramite.nombre_archivo || 'documento.pdf'}
                        </Button>
                      )}

                      {/* Código de Barras en la parte inferior */}
                      <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
                        <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 1, border: '1px solid #e0e0e0' }}>
                          <BarcodeDisplay 
                            codigo={codigoBarras} 
                            id={tramite.id}
                            año={tramite.fecha_creacion
                              ? new Date(tramite.fecha_creacion).getFullYear().toString()
                              : tramite.created_at
                                ? new Date(tramite.created_at).getFullYear().toString()
                                : new Date().getFullYear().toString()
                            }
                          />
                        </Box>
                      </Box>
                    </CardContent>

                    <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }} onClick={(e) => e.stopPropagation()}>
                      <Box>
                        {tramite.archivo_pdf && (
                          <Tooltip title="Ver PDF">
                            <IconButton
                              size="small"
                              onClick={() => handleViewPdf(tramite)}
                              color="error"
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Ver Código de Barras">
                          <IconButton
                            size="small"
                            onClick={() => handleViewBarcode(tramite)}
                            color="primary"
                          >
                            <QrCode />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      {tramite.estado !== 'completado' &&
                        !soloLectura &&
                        !esTramiteGestionTecnica(tramite) && (
                        <Tooltip title="Registrar Seguimiento">
                          <IconButton
                            size="small"
                            onClick={() => handleSeguimiento(tramite)}
                            color="success"
                          >
                            <Send />
                          </IconButton>
                        </Tooltip>
                      )}
                      {tramite.estado === 'completado' && (
                        <Tooltip title="Trámite completado - No se puede enviar a otro lugar">
                          <span>
                            <IconButton
                              size="small"
                              disabled
                              color="success"
                            >
                              <Send />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </CardActions>
                  </Card>
                </Box>
              );
            })}
            </Box>
          )}

          {/* Navegación de páginas */}
          {totalCount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Mostrando {(page - 1) * rowsPerPage + 1}-{Math.min(page * rowsPerPage, totalCount)} de {totalCount} trámites
              </Typography>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}

      {/* Dialog para nuevo trámite */}
      <NuevoTramiteDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        nuevoTramite={nuevoTramite}
        setNuevoTramite={(updater) => setNuevoTramite((prev) => updater({ ...prev } as any))}
        areas={areas}
        loadingAreas={loadingAreas}
        uploadingPdf={uploadingPdf}
        onCreate={handleCreateTramite}
        onFileChange={handleFileChange}
        fileInputRef={fileInputRef}
        obrasResumen={obrasResumenTramite}
        setObrasResumen={setObrasResumenTramite}
      />

      {/* Estilos de impresión - solo muestra la etiqueta */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #barcode-print-area, #barcode-print-area * { visibility: visible !important; }
          #barcode-print-area {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      {/* Contenedor de impresión oculto fuera del dialog */}
      {selectedTramite && openBarcodeDialog && (
        <Box
          id="barcode-print-area"
          sx={{ position: 'fixed', left: '-9999px', top: 0 }}
        >
          <BarcodeDisplay
            codigo={getCodigoBarras(selectedTramite.id)}
            id={selectedTramite.id}
            año={selectedTramite.fecha_creacion
              ? new Date(selectedTramite.fecha_creacion).getFullYear().toString()
              : selectedTramite.created_at
                ? new Date(selectedTramite.created_at).getFullYear().toString()
                : new Date().getFullYear().toString()
            }
          />
        </Box>
      )}

      {/* Dialog para código de barras */}
      <BarcodeDialog
        open={openBarcodeDialog}
        onClose={() => setOpenBarcodeDialog(false)}
        tramite={selectedTramite}
        renderBarcode={(tramite) => (
          <>
            <BarcodeDisplay
              codigo={getCodigoBarras(tramite.id)}
              id={tramite.id}
              año={
                tramite.fecha_creacion
                  ? new Date(tramite.fecha_creacion).getFullYear().toString()
                  : tramite.created_at
                    ? new Date(tramite.created_at).getFullYear().toString()
                    : new Date().getFullYear().toString()
              }
            />
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Título:</strong> {tramite.titulo}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Remitente:</strong> {tramite.nombre_destinatario}
              </Typography>
            </Box>
          </>
        )}
        onPrint={() => window.print()}
      />

      {/* Dialog para visualizar PDF (lazy) */}
      <Suspense
        fallback={
          <Dialog open={openPdfDialog} maxWidth="lg" fullWidth>
            <DialogContent
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 200,
              }}
            >
              <CircularProgress />
            </DialogContent>
          </Dialog>
        }
      >
        <LazyPdfViewerDialog
          open={openPdfDialog}
          onClose={() => {
            setOpenPdfDialog(false);
            setPdfUrl(null);
            setPdfError(false);
          }}
          tramite={selectedTramite}
          pdfUrl={pdfUrl}
          pdfError={pdfError}
          onRetryOpenInNewTab={() => {
            if (pdfUrl) window.open(pdfUrl, '_blank');
          }}
          onDownload={() => {
            if (selectedTramite) {
              handleDownloadPdf(selectedTramite);
            }
          }}
        />
      </Suspense>

      {/* Dialog para registrar seguimiento */}
      <SeguimientoDialog
        open={openSeguimientoDialog}
        onClose={() => setOpenSeguimientoDialog(false)}
        tramite={selectedTramite}
        areas={areas}
        loadingAreas={loadingAreas}
        seguimientoData={seguimientoData}
        setSeguimientoData={(updater) =>
          setSeguimientoData((prev) => updater(prev))
        }
        onSubmit={handleRegistrarSeguimiento}
      />

      {/* Dialog para historial */}
      <HistorialDialog
        open={openHistoryDialog}
        onClose={() => {
          setOpenHistoryDialog(false);
          setHistorial([]);
          setLoadingHistorial(false);
        }}
        tramite={selectedTramite}
        historial={historial}
        loadingHistorial={loadingHistorial}
        onVerPdf={
          selectedTramite?.archivo_pdf
            ? () => {
                setOpenHistoryDialog(false);
                handleViewPdf(selectedTramite);
              }
            : undefined
        }
      />

      {/* Dialog para detalle de trámite */}
      <DetalleTramiteDialog
        open={openDetalleDialog}
        onClose={() => setOpenDetalleDialog(false)}
        tramite={selectedTramite}
        onVerHistorial={() => {
          if (selectedTramite) {
            handleViewHistory(selectedTramite);
          }
        }}
      />

      {/* Notificación de nuevo trámite recibido */}
      <Snackbar
        open={openNuevoTramiteSnackbar}
        autoHideDuration={6000}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return;
          setOpenNuevoTramiteSnackbar(false);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setOpenNuevoTramiteSnackbar(false)}
          severity="info"
          sx={{ width: '100%' }}
        >
          {nuevoTramiteMensaje}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TramiteHistory;
