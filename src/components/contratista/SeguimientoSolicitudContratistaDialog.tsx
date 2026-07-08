import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  FormControlLabel,
  Checkbox,
  Button,
  Typography,
} from '@mui/material';
import { Send } from '@mui/icons-material';
import type { Area, FormularioContratista } from '../../services/api';

export interface SeguimientoSolicitudForm {
  area_origen: string;
  area_destino: string;
  usuario: string;
  nota: string;
  /** '' | 'detenido' | 'completado' — mutuamente excluyente */
  actualizar_estado: string;
}

interface SeguimientoSolicitudContratistaDialogProps {
  open: boolean;
  onClose: () => void;
  solicitud: FormularioContratista | null;
  areas: Area[];
  loadingAreas: boolean;
  form: SeguimientoSolicitudForm;
  setForm: (updater: (prev: SeguimientoSolicitudForm) => SeguimientoSolicitudForm) => void;
  onSubmit: () => void;
}

const SeguimientoSolicitudContratistaDialog: React.FC<SeguimientoSolicitudContratistaDialogProps> = ({
  open,
  onClose,
  solicitud,
  areas,
  loadingAreas,
  form,
  setForm,
  onSubmit,
}) => {
  const isDetenido = form.actualizar_estado === 'detenido';
  const isCompletado = form.actualizar_estado === 'completado';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Seguimiento de solicitud — {solicitud?.id}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Área actual</InputLabel>
            <Select value={form.area_origen} label="Área actual" disabled>
              <MenuItem value={form.area_origen}>{form.area_origen}</MenuItem>
            </Select>
          </FormControl>
          <FormControl
            fullWidth
            required={!(isDetenido || isCompletado)}
            disabled={loadingAreas || areas.length === 0 || isDetenido || isCompletado}
          >
            <InputLabel>Área destino</InputLabel>
            <Select
              value={form.area_destino}
              label="Área destino"
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  area_destino: e.target.value,
                }))
              }
            >
              {areas.map((area) => (
                <MenuItem key={area.id} value={area.area}>
                  {area.area}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Usuario / Quién registra"
            fullWidth
            required
            value={form.usuario}
            InputProps={{ readOnly: true }}
          />
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 0.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isDetenido}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      actualizar_estado: e.target.checked ? 'detenido' : '',
                      area_destino: e.target.checked ? '' : prev.area_destino,
                    }))
                  }
                  color="error"
                />
              }
              label="Detenido"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isCompletado}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      actualizar_estado: e.target.checked ? 'completado' : '',
                      area_destino: e.target.checked ? '' : prev.area_destino,
                    }))
                  }
                  color="success"
                />
              }
              label="Completado"
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            Si marca Detenido o Completado, el seguimiento queda en el área actual; no debe elegir otro destino.
          </Typography>
          <TextField
            label="Notas"
            fullWidth
            multiline
            minRows={3}
            value={form.nota}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                nota: e.target.value,
              }))
            }
            placeholder="Notas del movimiento o seguimiento..."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" startIcon={<Send />} onClick={onSubmit}>
          Registrar seguimiento
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SeguimientoSolicitudContratistaDialog;
