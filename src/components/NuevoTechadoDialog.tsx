import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  Typography,
  Button,
  Alert,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import ObraEdicionBuscador from './ObraEdicionBuscador';
import type { CrearTechadoInput, ObraEdicionOpcion } from '../types/database';
import { techadoAPI } from '../services/api';
import { BTN_PRIMARY } from '../constants/buttonStyles';

export const FORM_TECHADO_VACIO: CrearTechadoInput = {
  lote: 1,
  no_contrato: '',
  plantel: '',
  provincia: '',
  municipio: '',
  reg_dist: '',
  contratista_nombre: '',
  estatus: '',
  obra_id: null,
};

interface NuevoTechadoDialogProps {
  open: boolean;
  onClose: () => void;
  onCreado: (matrizId: string, info: { obraVinculada: boolean }) => void;
}

const NuevoTechadoDialog: React.FC<NuevoTechadoDialogProps> = ({
  open,
  onClose,
  onCreado,
}) => {
  const [form, setForm] = useState<CrearTechadoInput>({ ...FORM_TECHADO_VACIO });
  const [busquedaObra, setBusquedaObra] = useState('');
  const [obraSeleccionada, setObraSeleccionada] = useState<ObraEdicionOpcion | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({ ...FORM_TECHADO_VACIO });
    setBusquedaObra('');
    setObraSeleccionada(null);
    setError(null);
    setGuardando(false);
  }, [open]);

  const setCampo = <K extends keyof CrearTechadoInput>(key: K, value: CrearTechadoInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const aplicarObra = (opcion: ObraEdicionOpcion) => {
    setObraSeleccionada(opcion);
    setForm((prev) => ({
      ...prev,
      obra_id: opcion.id,
      plantel: prev.plantel?.trim() ? prev.plantel : opcion.nombre,
      reg_dist: prev.reg_dist?.trim() ? prev.reg_dist : opcion.distrito_minerd_sigede || '',
      provincia: prev.provincia?.trim() ? prev.provincia : opcion.provincia || '',
      municipio: prev.municipio?.trim() ? prev.municipio : opcion.municipio || '',
      no_contrato: prev.no_contrato?.trim() ? prev.no_contrato : opcion.contrato || '',
    }));
    setBusquedaObra('');
  };

  const limpiarObra = () => {
    setObraSeleccionada(null);
    setCampo('obra_id', null);
    setBusquedaObra('');
  };

  const handleCrear = async () => {
    try {
      setGuardando(true);
      setError(null);
      const res = await techadoAPI.crearTechado({
        ...form,
        lote: Number(form.lote),
      });
      const { matrizId, obraVinculada } = res.data.data;
      onCreado(matrizId, { obraVinculada });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudo crear el techado');
    } finally {
      setGuardando(false);
    }
  };

  const puedeCrear =
    Number(form.lote) >= 1 &&
    form.no_contrato.trim().length > 0 &&
    form.plantel.trim().length > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Nuevo techado</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Crea un plantel en la matriz Techado. Si el contrato (lote + número) ya existe, se
            reutiliza; cada plantel debe ser único dentro del mismo contrato.
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Lote"
              type="number"
              required
              fullWidth
              inputProps={{ min: 1, step: 1 }}
              value={form.lote}
              onChange={(e) => setCampo('lote', Number(e.target.value) || 1)}
            />
            <TextField
              label="No. contrato"
              required
              fullWidth
              placeholder="0000-0000"
              value={form.no_contrato}
              onChange={(e) => setCampo('no_contrato', e.target.value)}
            />
          </Stack>

          <TextField
            label="Plantel"
            required
            fullWidth
            value={form.plantel}
            onChange={(e) => setCampo('plantel', e.target.value)}
            placeholder="Nombre del centro educativo"
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="REG-DIST"
              fullWidth
              placeholder="01-01"
              helperText="Equivale a distrito_minerd_sigede en obras"
              value={form.reg_dist ?? ''}
              onChange={(e) => setCampo('reg_dist', e.target.value)}
            />
            <TextField
              label="Provincia"
              fullWidth
              value={form.provincia ?? ''}
              onChange={(e) => setCampo('provincia', e.target.value)}
            />
            <TextField
              label="Municipio"
              fullWidth
              value={form.municipio ?? ''}
              onChange={(e) => setCampo('municipio', e.target.value)}
            />
          </Stack>

          <TextField
            label="Contratista"
            fullWidth
            value={form.contratista_nombre ?? ''}
            onChange={(e) => setCampo('contratista_nombre', e.target.value)}
          />

          <TextField
            label="Estado / estatus"
            fullWidth
            value={form.estatus ?? ''}
            onChange={(e) => setCampo('estatus', e.target.value)}
          />

          <div>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Vincular obra SIGEDE (opcional)
            </Typography>
            {obraSeleccionada ? (
              <Alert
                severity="success"
                action={
                  <Button color="inherit" size="small" onClick={limpiarObra}>
                    Quitar
                  </Button>
                }
              >
                {obraSeleccionada.nombre}
                {obraSeleccionada.sigede ? ` · SIGEDE ${obraSeleccionada.sigede}` : ''}
              </Alert>
            ) : (
              <ObraEdicionBuscador
                busqueda={busquedaObra}
                onBusquedaChange={setBusquedaObra}
                onSeleccionar={aplicarObra}
                onBuscar={() => {}}
                label="Buscar obra en catálogo"
                helpText="Opcional. Al seleccionar una obra se completan plantel, REG-DIST y contrato si están vacíos."
              />
            )}
          </div>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={guardando}>
          Cancelar
        </Button>
        <button
          type="button"
          className={BTN_PRIMARY}
          disabled={!puedeCrear || guardando}
          onClick={handleCrear}
        >
          <Add fontSize="small" className="mr-1" />
          {guardando ? 'Creando…' : 'Crear techado'}
        </button>
      </DialogActions>
    </Dialog>
  );
};

export default NuevoTechadoDialog;
