import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { ArrowBack, AssignmentTurnedIn, Send } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import Login from './Login';
import { formularioContratistaAPI, tramitesAPI } from '../services/api';
import type { FormularioContratista, MovimientoSolicitudContratista } from '../types/database';
import {
  colorEstadoSolicitudContratista,
  labelEstadoSolicitudContratista,
  normalizarEstadoSolicitud,
  esEstadoTerminal,
} from '../utils/solicitudContratista';
import { APP_TAB_INDEX } from '../constants/appTabs';
import {
  esContratistaDetalleDesdeApp,
  urlAbsolutaDetalleContratista,
  urlImagenQrDetalleContratista,
} from '../constants/contratistaDetalle';
import { useAreas } from '../hooks/useAreas';
import AsignarAreaSolicitudDialog from './contratista/AsignarAreaSolicitudDialog';
import SeguimientoSolicitudContratistaDialog, {
  type SeguimientoSolicitudForm,
} from './contratista/SeguimientoSolicitudContratistaDialog';

const REDIRECT_KEY = 'redirectAfterLogin';

/** Ruta dedicada: /contratista/:id — detalle de una solicitud (mismo permiso que el módulo). */
export default function SolicitudContratistaDetalle() {
  const { id: tokenOrId } = useParams<{ id: string }>();
  const [id, setId] = useState<string | undefined>(undefined);
  const [tokenResolved, setTokenResolved] = useState(false);

  /**
   * Resuelve el parámetro de la URL:
   * - Si es un token de la BD (32 hex chars), lo busca en contratista_access_tokens.
   * - Si no lo encuentra, lo usa tal cual (compatibilidad con links internos ?from=app).
   */
  useEffect(() => {
    if (!tokenOrId) { setTokenResolved(true); return; }
    const looksLikeToken = /^[0-9a-f]{32}$/.test(tokenOrId);
    if (!looksLikeToken) {
      // Link interno: ya viene el ID real (ej: desde ?from=app)
      setId(tokenOrId);
      setTokenResolved(true);
      return;
    }
    formularioContratistaAPI.obtenerSolicitudIdPorToken(tokenOrId)
      .then((solicitudId) => {
        setId(solicitudId ?? tokenOrId);
      })
      .catch(() => setId(tokenOrId))
      .finally(() => setTokenResolved(true));
  }, [tokenOrId]);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, hasPermission } = useAuth();
  const { areas, loadingAreas } = useAreas();
  const [registro, setRegistro] = useState<FormularioContratista | null | undefined>(undefined);
  const [movimientos, setMovimientos] = useState<MovimientoSolicitudContratista[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);
  const [openAsignar, setOpenAsignar] = useState(false);
  const [openSeguimiento, setOpenSeguimiento] = useState(false);
  const [movimientoSeleccionado, setMovimientoSeleccionado] = useState<MovimientoSolicitudContratista | null>(null);
  const [seguimientoForm, setSeguimientoForm] = useState<SeguimientoSolicitudForm>({
    area_origen: '',
    area_destino: '',
    usuario: '',
    nota: '',
    actualizar_estado: '',
  });

  const esAreaGestionContratista =
    (user?.area || '').trim() === 'Oficina de gestión del contratista';

  /** Vista con botones: enlaces internos (?from=app) o navegación con state (vuelta al módulo). El QR no incluye query → solo lectura. */
  const modoAccionesSistema = useMemo(() => {
    if (esContratistaDetalleDesdeApp(location.search)) return true;
    const st = location.state as { returnTab?: number } | null;
    return typeof st?.returnTab === 'number';
  }, [location.search, location.state]);

  const nombreUsuarioLogueado = useMemo(
    () => (user ? [user.nombre, user.apellido].filter(Boolean).join(' ').trim() : ''),
    [user]
  );
  const canEditAtencionContratista = hasPermission('editar_atencion_contratista');
  const puedeAsignarContratista =
    canEditAtencionContratista &&
    (esAreaGestionContratista || user?.rol === 'admin' || user?.rol === 'supervision');

  const [qrToken, setQrToken] = useState<string>('');
  useEffect(() => {
    if (!id) { setQrToken(''); return; }
    formularioContratistaAPI.obtenerOCrearToken(id)
      .then((token) => setQrToken(token))
      .catch(() => setQrToken(''));
  }, [id]);
  const qrDetailUrl = qrToken ? urlAbsolutaDetalleContratista(qrToken) : '';
  const qrImageUrl  = qrToken ? urlImagenQrDetalleContratista(qrToken) : '';

  const cargarDatos = useCallback(async (opts?: { silent?: boolean }) => {
    if (!user || !id) return;
    if (!hasPermission('ver_atencion_contratista')) return;

    const silent = opts?.silent;
    if (!silent) {
      setLoadError(null);
      setRegistro(undefined);
      setMovimientos([]);
    }
    try {
      const verTodos = user?.rol === 'admin' || user?.rol === 'supervision';
      const areaUsuario = user?.area?.trim() ?? '';
      const resp = await formularioContratistaAPI.obtenerPorId(id, {
        esAdmin: verTodos,
        areaUsuario: areaUsuario || undefined,
      });
      const data = resp.data.data;
      setRegistro(data);
      if (data) {
        try {
          const hist = await formularioContratistaAPI.obtenerMovimientos(id);
          setMovimientos(hist.data.data || []);
        } catch {
          setMovimientos([]);
        }
      } else {
        setMovimientos([]);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'No se pudo cargar la solicitud.';
      if (!silent) {
        setLoadError(msg);
        setRegistro(null);
      } else {
        setFeedback({ severity: 'error', message: msg });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.area, user?.rol, id]);

  useEffect(() => {
    if (!authLoading && !user && id) {
      try {
        sessionStorage.setItem(REDIRECT_KEY, `/contratista/${encodeURIComponent(id)}`);
      } catch {
        /* ignore */
      }
    }
  }, [authLoading, user, id, tokenResolved]);

  useEffect(() => {
    if (authLoading || !user || !id) return;
    if (!hasPermission('ver_atencion_contratista')) return;
    void cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, user?.area, user?.rol, id, tokenResolved, cargarDatos]);

  const handleAsignarArea = async (areaNombre: string, nota: string | null) => {
    if (!id || !nombreUsuarioLogueado) {
      setFeedback({ severity: 'error', message: 'No se pudo identificar al usuario.' });
      throw new Error('Usuario no disponible');
    }
    try {
      await formularioContratistaAPI.asignarArea(id, {
        area_nombre: areaNombre,
        usuario: nombreUsuarioLogueado,
        nota,
      });

      // Crear trámite en Seguimiento de Trámites con el mismo ID (FC-XXXXXX)
      if (registro) {
        try {
          const titulo = `[Contratista] ${registro.nombres} ${registro.apellidos} — ${registro.motivo_visita}`;
          await tramitesAPI.crearTramite({
            titulo,
            oficio: registro.id,
            nombre_destinatario: `${registro.nombres} ${registro.apellidos}`,
            area_destinatario: areaNombre,
            area_destino_final: areaNombre,
            proceso: nota ?? undefined,
            codigo_area: 'FC',
            id_fijo: registro.id,
          });
        } catch {
          // Silencioso: no interrumpir el flujo principal
        }
      }

      setFeedback({ severity: 'success', message: 'Solicitud asignada al área correctamente.' });
      await cargarDatos({ silent: true });
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Error al asignar el área.';
      setFeedback({ severity: 'error', message: msg });
      throw e;
    }
  };

  const handleRegistrarSeguimiento = async () => {
    if (!id || !registro) return;
    const esDetenido = seguimientoForm.actualizar_estado === 'detenido';
    const esCompletado = seguimientoForm.actualizar_estado === 'completado';
    const requiereDestino = !esDetenido && !esCompletado;

    if ((requiereDestino && !seguimientoForm.area_destino) || !seguimientoForm.usuario) {
      setFeedback({
        severity: 'error',
        message: requiereDestino
          ? 'Seleccione el área destino e indique el usuario.'
          : 'Indique el usuario que registra el movimiento.',
      });
      return;
    }

    const destino =
      esDetenido || esCompletado ? seguimientoForm.area_origen : seguimientoForm.area_destino;
    const nuevoEstado = esDetenido ? 'detenido' : esCompletado ? 'completado' : 'en_seguimiento';

    try {
      await formularioContratistaAPI.registrarMovimiento(id, {
        area_origen: seguimientoForm.area_origen,
        area_destino: destino,
        nota: seguimientoForm.nota.trim() || null,
        estado_resultante: esDetenido ? 'detenido' : esCompletado ? 'completado' : '',
        usuario: seguimientoForm.usuario,
        nuevo_estado: nuevoEstado,
        nueva_area_actual: destino,
      });
      setFeedback({ severity: 'success', message: 'Seguimiento registrado correctamente.' });
      setOpenSeguimiento(false);
      await cargarDatos({ silent: true });
    } catch (e: any) {
      setFeedback({ severity: 'error', message: e?.response?.data?.error || 'Error al registrar el seguimiento.' });
    }
  };

  const abrirSeguimiento = () => {
    if (!registro) return;
    setFeedback(null);
    setSeguimientoForm({
      area_origen: registro.area_actual || '',
      area_destino: '',
      usuario: nombreUsuarioLogueado,
      nota: '',
      actualizar_estado: '',
    });
    setOpenSeguimiento(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!hasPermission('ver_atencion_contratista')) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center p-4">
        <Paper sx={{ p: 4, maxWidth: 480 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            No tienes permiso para ver el módulo de atención al contratista.
          </Alert>
          <Button
            variant="contained"
            onClick={() => navigate('/', { replace: true, state: { openTab: APP_TAB_INDEX.ATENCION_CONTRATISTA } })}
          >
            Ir al inicio
          </Button>
        </Paper>
      </div>
    );
  }

  if (!tokenResolved) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!id) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center p-4">
        <Alert severity="error">Identificador de solicitud no válido.</Alert>
      </div>
    );
  }

  if (registro === undefined) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  if (loadError || registro === null) {
    return (
      <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center gap-4 p-4">
        <Alert severity="error" sx={{ maxWidth: 480 }}>
          {loadError ||
            'Solicitud no encontrada o no tienes permiso para verla (solo se muestran solicitudes de tu área, salvo administración/supervisión).'}
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          variant="outlined"
          onClick={() => navigate('/', { replace: true, state: { openTab: APP_TAB_INDEX.ATENCION_CONTRATISTA } })}
        >
          Ir al inicio
        </Button>
      </div>
    );
  }

  const r = registro;
  const estado = normalizarEstadoSolicitud(r.estado);
  const terminal = esEstadoTerminal(estado);

  /** Volver al módulo de origen con la misma pestaña; evita remontar App en el Dashboard (tab 0). */
  const handleVolver = () => {
    const st = location.state as { returnTab?: number } | null;
    const tabToRestore =
      typeof st?.returnTab === 'number' ? st.returnTab : APP_TAB_INDEX.ATENCION_CONTRATISTA;
    navigate('/', { state: { openTab: tabToRestore } });
  };

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      <header className="bg-white border-b border-warm-200 shadow-soft px-4 py-3 flex items-center gap-3">
        <Button startIcon={<ArrowBack />} onClick={handleVolver} size="small">
          Volver
        </Button>
        <Typography variant="h6" component="h1" sx={{ fontWeight: 600, flex: 1 }}>
          Solicitud {r.id}
        </Typography>
      </header>
      <main className="flex-1 p-4 overflow-auto">
        {feedback && (
          <Alert
            severity={feedback.severity}
            sx={{ maxWidth: 720, mx: 'auto', mb: 2 }}
            onClose={() => setFeedback(null)}
          >
            {feedback.message}
          </Alert>
        )}

        <Paper elevation={2} sx={{ p: 3, maxWidth: 720, mx: 'auto', borderRadius: 2, mb: 3 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <Chip
              size="small"
              label={labelEstadoSolicitudContratista(estado)}
              color={colorEstadoSolicitudContratista(estado)}
              variant={terminal ? 'filled' : 'outlined'}
            />
            <Chip size="small" label={r.area_actual ? `Área: ${r.area_actual}` : 'Sin área asignada'} variant="outlined" />
          </Stack>

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Fecha de visita
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {r.fecha_visita}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Visitante
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {r.nombres} {r.apellidos}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Empresa
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {r.nombre_empresa}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Motivo de visita
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {r.motivo_visita}
          </Typography>

          {r.nombre_obra ? (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Nombre obra
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {r.nombre_obra}
              </Typography>
            </>
          ) : null}

          {r.nombre_obra_inaugurada ? (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Obra inaugurada
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {r.nombre_obra_inaugurada}
              </Typography>
            </>
          ) : null}

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Provincia
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {r.provincia}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Número de contrato
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {r.numero_contrato}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Correo
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {r.correo}
          </Typography>

          {r.nota ? (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Nota
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {r.nota}
              </Typography>
            </>
          ) : null}
        </Paper>

        <Paper elevation={2} sx={{ p: 3, maxWidth: 720, mx: 'auto', borderRadius: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            QR de la solicitud {r.id}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Escanea el QR para abrir la vista de detalle de esta solicitud en el sistema (debes iniciar sesión si aplica).
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box
              component="img"
              src={qrImageUrl}
              alt={`QR solicitud ${r.id}`}
              sx={{
                width: 200,
                height: 200,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 1,
                bgcolor: 'white',
              }}
            />
            <Box>
              <Typography variant="body2" sx={{ mb: 1, wordBreak: 'break-all' }}>
                <strong>Enlace:</strong> {qrDetailUrl}
              </Typography>
              <Typography variant="body2">
                <strong>Nombre:</strong> {r.nombres} {r.apellidos}
              </Typography>
              <Typography variant="body2">
                <strong>Empresa:</strong> {r.nombre_empresa}
              </Typography>
              <Typography variant="body2">
                <strong>Motivo:</strong> {r.motivo_visita}
              </Typography>
              <Typography variant="body2">
                <strong>Provincia:</strong> {r.provincia}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {modoAccionesSistema && puedeAsignarContratista && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ maxWidth: 720, mx: 'auto', mb: 3 }}
            justifyContent="flex-end"
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <Button
              variant="outlined"
              size="small"
              startIcon={<AssignmentTurnedIn />}
              disabled={!puedeAsignarContratista || estado !== 'pendiente_asignacion'}
              onClick={() => {
                setFeedback(null);
                setOpenAsignar(true);
              }}
            >
              Asignar a un área
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="secondary"
              startIcon={<Send />}
              disabled={(estado !== 'en_seguimiento' && estado !== 'detenido') || !r.area_actual}
              onClick={abrirSeguimiento}
            >
              Registrar seguimiento / enviar a otra área
            </Button>
          </Stack>
        )}

        <Paper elevation={1} sx={{ p: 3, maxWidth: 720, mx: 'auto', borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Historial de seguimiento
          </Typography>
          {movimientos.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No hay movimientos registrados aún.
            </Typography>
          ) : (
            <Stack spacing={2} sx={{ position: 'relative', pl: 2.5 }}>
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  left: 10,
                  top: 4,
                  bottom: 4,
                  width: 2,
                  bgcolor: 'divider',
                }}
              />
              {movimientos.map((m) => (
                <Box key={m.id} sx={{ position: 'relative', pl: 2 }}>
                  <Box
                    aria-hidden
                    sx={{
                      position: 'absolute',
                      left: -2,
                      top: 20,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: m.estado_resultante === 'completado' ? 'success.main' : m.estado_resultante === 'detenido' ? 'warning.main' : 'primary.main',
                    }}
                  />
                  <Paper
                    variant="outlined"
                    role="button"
                    tabIndex={0}
                    onClick={() => setMovimientoSeleccionado(m)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setMovimientoSeleccionado(m);
                      }
                    }}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: 1,
                      },
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" display="block">
                      {m.fecha_movimiento ? new Date(m.fecha_movimiento).toLocaleString('es-DO') : ''}
                      {m.usuario ? ` · ${m.usuario}` : ''}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      <strong>De:</strong> {m.area_origen} → <strong>A:</strong> {m.area_destino}
                    </Typography>
                    <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'inline-block' }}>
                      Ver detalle
                    </Typography>
                  </Paper>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </main>

      <AsignarAreaSolicitudDialog
        open={openAsignar}
        onClose={() => setOpenAsignar(false)}
        solicitud={r}
        areas={areas}
        loadingAreas={loadingAreas}
        usuario={nombreUsuarioLogueado}
        onAsignar={handleAsignarArea}
      />

      <SeguimientoSolicitudContratistaDialog
        open={openSeguimiento}
        onClose={() => setOpenSeguimiento(false)}
        solicitud={r}
        areas={areas}
        loadingAreas={loadingAreas}
        form={seguimientoForm}
        setForm={setSeguimientoForm}
        onSubmit={handleRegistrarSeguimiento}
      />

      <Dialog
        open={Boolean(movimientoSeleccionado)}
        onClose={() => setMovimientoSeleccionado(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Detalle de movimiento</DialogTitle>
        <DialogContent dividers>
          {movimientoSeleccionado && (
            <Stack spacing={1.5}>
              <Typography variant="body2">
                <strong>Fecha:</strong>{' '}
                {movimientoSeleccionado.fecha_movimiento
                  ? new Date(movimientoSeleccionado.fecha_movimiento).toLocaleString('es-DO')
                  : 'No disponible'}
              </Typography>
              <Typography variant="body2">
                <strong>Usuario:</strong> {movimientoSeleccionado.usuario || 'No registrado'}
              </Typography>
              <Typography variant="body2">
                <strong>Área origen:</strong> {movimientoSeleccionado.area_origen}
              </Typography>
              <Typography variant="body2">
                <strong>Área destino:</strong> {movimientoSeleccionado.area_destino}
              </Typography>
              {movimientoSeleccionado.estado_resultante ? (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2">
                    <strong>Estado resultante:</strong>
                  </Typography>
                  <Chip
                    size="small"
                    label={movimientoSeleccionado.estado_resultante === 'completado' ? 'Completado' : 'Detenido'}
                    color={movimientoSeleccionado.estado_resultante === 'completado' ? 'success' : 'warning'}
                  />
                </Stack>
              ) : (
                <Typography variant="body2">
                  <strong>Estado resultante:</strong> En seguimiento
                </Typography>
              )}
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                <strong>Nota:</strong> {movimientoSeleccionado.nota || 'Sin nota'}
              </Typography>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
