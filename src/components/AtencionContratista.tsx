import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { AssignmentTurnedIn, Send } from '@mui/icons-material';
import { formularioContratistaAPI, type FormularioContratista } from '../services/api';
import { useAreas } from '../hooks/useAreas';
import { useAuth } from '../context/AuthContext';
import AsignarAreaSolicitudDialog from './contratista/AsignarAreaSolicitudDialog';
import SeguimientoSolicitudContratistaDialog, {
  type SeguimientoSolicitudForm,
} from './contratista/SeguimientoSolicitudContratistaDialog';
import {
  colorEstadoSolicitudContratista,
  labelEstadoSolicitudContratista,
  normalizarEstadoSolicitud,
  esEstadoTerminal,
} from '../utils/solicitudContratista';
import { APP_TAB_INDEX } from '../constants/appTabs';
import {
  hrefContratistaDetalleDesdeApp,
  urlAbsolutaDetalleContratista,
  urlImagenQrDetalleContratista,
} from '../constants/contratistaDetalle';

const MOTIVOS_VISITA = [
  'Adenda',
  'Contrato',
  'Equilibrio economico',
  'Linea de credito',
  'Pago de cubicación',
  'Mantenimiento Correctivo',
  'Aula movil',
  'Otras',
] as const;

const PROVINCIAS_RD = [
  'Azua',
  'Bahoruco',
  'Barahona',
  'Dajabón',
  'Distrito Nacional',
  'Duarte',
  'Elías Piña',
  'El Seibo',
  'Espaillat',
  'Hato Mayor',
  'Hermanas Mirabal',
  'Independencia',
  'La Altagracia',
  'La Romana',
  'La Vega',
  'María Trinidad Sánchez',
  'Monseñor Nouel',
  'Monte Cristi',
  'Monte Plata',
  'Pedernales',
  'Peravia',
  'Puerto Plata',
  'Samaná',
  'San Cristóbal',
  'San José de Ocoa',
  'San Juan',
  'San Pedro de Macorís',
  'Sánchez Ramírez',
  'Santiago',
  'Santiago Rodríguez',
  'Santo Domingo',
  'Valverde',
] as const;

type FormState = {
  fecha_visita: string;
  nombres: string;
  apellidos: string;
  nombre_empresa: string;
  motivo_visita: string;
  nombre_obra: string;
  nombre_obra_inaugurada: string;
  provincia: string;
  numero_contrato: string;
  correo: string;
  nota: string;
};

const initialForm: FormState = {
  fecha_visita: new Date().toISOString().split('T')[0],
  nombres: '',
  apellidos: '',
  nombre_empresa: '',
  motivo_visita: '',
  nombre_obra: '',
  nombre_obra_inaugurada: '',
  provincia: '',
  numero_contrato: '',
  correo: '',
  nota: '',
};

function detalleContratistaState() {
  return { returnTab: APP_TAB_INDEX.ATENCION_CONTRATISTA };
}

type AtencionContratistaProps = {
  soloLectura?: boolean;
};

export default function AtencionContratista({ soloLectura = false }: AtencionContratistaProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { areas, loadingAreas } = useAreas();
  const [form, setForm] = useState<FormState>(initialForm);
  const [registros, setRegistros] = useState<FormularioContratista[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRegistros, setLoadingRegistros] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [qrData, setQrData] = useState<FormularioContratista | null>(null);
  const [qrToken, setQrToken] = useState<string>('');
  const [qrTokenLoading, setQrTokenLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openAsignar, setOpenAsignar] = useState(false);
  const [openSeguimiento, setOpenSeguimiento] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<FormularioContratista | null>(null);
  const [empresaOptions, setEmpresaOptions] = useState<string[]>([]);
  const [loadingEmpresaOptions, setLoadingEmpresaOptions] = useState(false);
  const [seguimientoForm, setSeguimientoForm] = useState<SeguimientoSolicitudForm>({
    area_origen: '',
    area_destino: '',
    usuario: '',
    nota: '',
    actualizar_estado: '',
  });

  const nombreUsuarioLogueado = useMemo(
    () => (user ? [user.nombre, user.apellido].filter(Boolean).join(' ').trim() : ''),
    [user]
  );

  const esAreaGestionContratista =
    (user?.area || '').trim() === 'Oficina de gestión del contratista';
  const puedeAsignarContratista =
    !soloLectura && (esAreaGestionContratista || user?.rol === 'admin' || user?.rol === 'supervision');

  const canSubmit = useMemo(() => {
    return (
      form.fecha_visita &&
      form.nombres.trim() &&
      form.apellidos.trim() &&
      form.nombre_empresa.trim() &&
      form.motivo_visita &&
      form.provincia &&
      form.numero_contrato.trim() &&
      form.correo.trim()
    );
  }, [form]);


  const cargarRegistros = async () => {
    setLoadingRegistros(true);
    try {
      const verTodos = user?.rol === 'admin' || user?.rol === 'supervision';
      const areaUsuario = user?.area?.trim() ?? '';
      const resp = await formularioContratistaAPI.obtener(100, {
        esAdmin: verTodos,
        areaUsuario: areaUsuario || undefined,
      });
      setRegistros(resp.data.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudieron cargar los registros.');
    } finally {
      setLoadingRegistros(false);
    }
  };

  useEffect(() => {
    cargarRegistros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.area, user?.rol]);

  useEffect(() => {
    const term = form.nombre_empresa.trim();
    if (!showForm || term.length < 2) {
      setEmpresaOptions([]);
      setLoadingEmpresaOptions(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingEmpresaOptions(true);
      try {
        const resp = await formularioContratistaAPI.obtenerSugerenciasNombreEmpresa(term, 8);
        setEmpresaOptions(resp.data.data || []);
      } catch {
        setEmpresaOptions([]);
      } finally {
        setLoadingEmpresaOptions(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [form.nombre_empresa, showForm]);

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const resp = await formularioContratistaAPI.crear({
        ...form,
        nombre_obra: form.nombre_obra.trim() || null,
        nombre_obra_inaugurada: form.nombre_obra_inaugurada.trim() || null,
        nota: form.nota.trim() || null,
      });
      const creado = resp.data.data;
      setSuccess('Formulario guardado correctamente.');
      setQrData(creado);
      setShowForm(false);
      setForm({ ...initialForm, fecha_visita: form.fecha_visita });
      await cargarRegistros();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudo guardar el formulario.');
    } finally {
      setLoading(false);
    }
  };

  /** URL interna de la app: al escanear se abre la vista de detalle de la solicitud. */
  // Obtener/crear el token QR desde la BD al abrir el dialog
  useEffect(() => {
    if (!qrData) { setQrToken(''); return; }
    setQrTokenLoading(true);
    formularioContratistaAPI.obtenerOCrearToken(qrData.id)
      .then((token) => setQrToken(token))
      .catch(() => setQrToken(''))
      .finally(() => setQrTokenLoading(false));
  }, [qrData?.id]);

  const qrDetailUrl = qrToken ? urlAbsolutaDetalleContratista(qrToken) : '';
  const qrImageUrl  = qrToken ? urlImagenQrDetalleContratista(qrToken) : '';

  const abrirAsignar = (s: FormularioContratista) => {
    setError(null);
    setSolicitudSeleccionada(s);
    setOpenAsignar(true);
  };

  const abrirSeguimiento = (s: FormularioContratista) => {
    setError(null);
    setSolicitudSeleccionada(s);
    setSeguimientoForm({
      area_origen: s.area_actual || '',
      area_destino: '',
      usuario: nombreUsuarioLogueado,
      nota: '',
      actualizar_estado: '',
    });
    setOpenSeguimiento(true);
  };

  const handleAsignarArea = async (areaNombre: string, nota: string | null) => {
    if (!solicitudSeleccionada || !nombreUsuarioLogueado) {
      setError('No se pudo identificar al usuario.');
      throw new Error('Usuario no disponible');
    }
    try {
      await formularioContratistaAPI.asignarArea(solicitudSeleccionada.id, {
        area_nombre: areaNombre,
        usuario: nombreUsuarioLogueado,
        nota,
      });
      setError(null);
      setSuccess('Solicitud asignada al área correctamente.');
      await cargarRegistros();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Error al asignar el área.');
      throw e;
    }
  };

  const handleRegistrarSeguimiento = async () => {
    if (!solicitudSeleccionada) return;
    const esDetenido = seguimientoForm.actualizar_estado === 'detenido';
    const esCompletado = seguimientoForm.actualizar_estado === 'completado';
    const requiereDestino = !esDetenido && !esCompletado;

    if ((requiereDestino && !seguimientoForm.area_destino) || !seguimientoForm.usuario) {
      setError(
        requiereDestino
          ? 'Seleccione el área destino e indique el usuario.'
          : 'Indique el usuario que registra el movimiento.'
      );
      return;
    }

    const destino =
      esDetenido || esCompletado ? seguimientoForm.area_origen : seguimientoForm.area_destino;
    const nuevoEstado = esDetenido ? 'detenido' : esCompletado ? 'completado' : 'en_seguimiento';

    try {
      setError(null);
      await formularioContratistaAPI.registrarMovimiento(solicitudSeleccionada.id, {
        area_origen: seguimientoForm.area_origen,
        area_destino: destino,
        nota: seguimientoForm.nota.trim() || null,
        estado_resultante: esDetenido ? 'detenido' : esCompletado ? 'completado' : '',
        usuario: seguimientoForm.usuario,
        nuevo_estado: nuevoEstado,
        nueva_area_actual: destino,
      });
      setSuccess('Seguimiento registrado correctamente.');
      setOpenSeguimiento(false);
      setSolicitudSeleccionada(null);
      await cargarRegistros();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Error al registrar el seguimiento.');
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
        Atención al contratista
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
        Cree la solicitud, asígnela a un área y registre el seguimiento entre áreas (detenido / completado y notas).
      </Typography>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Solicitudes de contratista
        </Typography>
        <Button
          variant={showForm ? 'outlined' : 'contained'}
          disabled={soloLectura}
          onClick={() => {
            setError(null);
            setSuccess(null);
            setShowForm((prev) => !prev);
          }}
        >
          {showForm ? 'Ocultar formulario' : 'Nueva solicitud'}
        </Button>
      </Stack>

      {showForm && (
        <Paper elevation={2} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Nueva solicitud
          </Typography>

          <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Fecha de visita"
                type="date"
                fullWidth
                required
                value={form.fecha_visita}
                onChange={handleChange('fecha_visita')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField label="Nombres" fullWidth required value={form.nombres} onChange={handleChange('nombres')} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField label="Apellidos" fullWidth required value={form.apellidos} onChange={handleChange('apellidos')} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete
                freeSolo
                options={empresaOptions}
                loading={loadingEmpresaOptions}
                inputValue={form.nombre_empresa}
                onInputChange={(_, value) => {
                  setForm((prev) => ({ ...prev, nombre_empresa: value }));
                }}
                onChange={(_, value) => {
                  const selected = typeof value === 'string' ? value : '';
                  setForm((prev) => ({ ...prev, nombre_empresa: selected }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Nombre empresa"
                    fullWidth
                    required
                    placeholder="Escribe para ver sugerencias..."
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                label="Motivo visita"
                fullWidth
                required
                value={form.motivo_visita}
                onChange={handleChange('motivo_visita')}
              >
                {MOTIVOS_VISITA.map((motivo) => (
                  <MenuItem key={motivo} value={motivo}>
                    {motivo}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Nombre obra (opcional)" fullWidth value={form.nombre_obra} onChange={handleChange('nombre_obra')} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Nombre obra inaugurada (opcional)"
                fullWidth
                value={form.nombre_obra_inaugurada}
                onChange={handleChange('nombre_obra_inaugurada')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                label="Provincia"
                fullWidth
                required
                value={form.provincia}
                onChange={handleChange('provincia')}
              >
                {PROVINCIAS_RD.map((provincia) => (
                  <MenuItem key={provincia} value={provincia}>
                    {provincia}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Numero contrato"
                fullWidth
                required
                value={form.numero_contrato}
                onChange={handleChange('numero_contrato')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Correo"
                type="email"
                fullWidth
                required
                value={form.correo}
                onChange={handleChange('correo')}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Nota" fullWidth multiline minRows={3} value={form.nota} onChange={handleChange('nota')} />
            </Grid>
          </Grid>

            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button type="submit" variant="contained" disabled={soloLectura || !canSubmit || loading}>
                {loading ? 'Guardando...' : 'Guardar formulario'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      )}

      {(error || success) && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
        </Stack>
      )}

      {qrData && (
        <Paper elevation={2} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            QR de la solicitud {qrData.id}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Escanea el QR para abrir la vista de detalle de esta solicitud en el sistema (debes iniciar sesión si aplica).
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box
              component="img"
              src={qrImageUrl}
              alt={`QR solicitud ${qrData.id}`}
              sx={{ width: 200, height: 200, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, bgcolor: 'white' }}
            />
            <Box>
              <Typography variant="body2" sx={{ mb: 1, wordBreak: 'break-all' }}>
                <strong>Enlace:</strong> {qrDetailUrl}
              </Typography>
              <Typography variant="body2"><strong>Nombre:</strong> {qrData.nombres} {qrData.apellidos}</Typography>
              <Typography variant="body2"><strong>Empresa:</strong> {qrData.nombre_empresa}</Typography>
              <Typography variant="body2"><strong>Motivo:</strong> {qrData.motivo_visita}</Typography>
              <Typography variant="body2"><strong>Provincia:</strong> {qrData.provincia}</Typography>
              <Button
                variant="outlined"
                size="small"
                sx={{ mt: 1.5 }}
                onClick={() =>
                  navigate(hrefContratistaDetalleDesdeApp(qrData.id), { state: detalleContratistaState() })
                }
              >
                Ver solicitud en pantalla
              </Button>
            </Box>
          </Stack>
        </Paper>
      )}

      <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Registros recientes
        </Typography>
        {loadingRegistros ? (
          <Typography variant="body2" color="text.secondary">
            Cargando registros...
          </Typography>
        ) : registros.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay registros todavía.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {registros.map((r) => {
              const estado = normalizarEstadoSolicitud(r.estado);
              const terminal = esEstadoTerminal(estado);
              return (
                <Paper key={r.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Box
                      sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                      onClick={() =>
                        navigate(hrefContratistaDetalleDesdeApp(r.id), { state: detalleContratistaState() })
                      }
                      role="presentation"
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {r.id} — {r.nombres} {r.apellidos}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {r.fecha_visita} | {r.nombre_empresa} | {r.motivo_visita} | {r.provincia}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" alignItems="center" useFlexGap>
                      <Chip
                        size="small"
                        label={labelEstadoSolicitudContratista(estado)}
                        color={colorEstadoSolicitudContratista(estado)}
                        variant={terminal ? 'filled' : 'outlined'}
                      />
                      <Chip
                        size="small"
                        label={r.area_actual || 'Sin área'}
                        variant="outlined"
                        sx={{ maxWidth: 200 }}
                      />
                      <Tooltip title="Asignar a un área">
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            disabled={!puedeAsignarContratista || estado !== 'pendiente_asignacion'}
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirAsignar(r);
                            }}
                          >
                            <AssignmentTurnedIn fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Registrar seguimiento / reactivar detenido">
                        <span>
                          <IconButton
                            size="small"
                            color="secondary"
                            disabled={soloLectura || (estado !== 'en_seguimiento' && estado !== 'detenido') || !r.area_actual}
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirSeguimiento(r);
                            }}
                          >
                            <Send fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>

      <AsignarAreaSolicitudDialog
        open={openAsignar}
        onClose={() => {
          setOpenAsignar(false);
          setSolicitudSeleccionada(null);
        }}
        solicitud={solicitudSeleccionada}
        areas={areas}
        loadingAreas={loadingAreas}
        usuario={nombreUsuarioLogueado}
        onAsignar={handleAsignarArea}
      />

      <SeguimientoSolicitudContratistaDialog
        open={openSeguimiento}
        onClose={() => {
          setOpenSeguimiento(false);
          setSolicitudSeleccionada(null);
        }}
        solicitud={solicitudSeleccionada}
        areas={areas}
        loadingAreas={loadingAreas}
        form={seguimientoForm}
        setForm={setSeguimientoForm}
        onSubmit={handleRegistrarSeguimiento}
      />
    </Box>
  );
}

