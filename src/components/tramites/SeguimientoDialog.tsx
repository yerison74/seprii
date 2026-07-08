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
} from '@mui/material';
import type { Area, Tramite } from '../../services/api';
import { getEstadoLabel } from '../../utils/estadoTramite';
import { Send } from '@mui/icons-material';

export interface SeguimientoData {
  area_origen: string;
  area_destino: string;
  usuario: string;
  observaciones: string;
  actualizar_estado: string;
}

interface SeguimientoDialogProps {
  open: boolean;
  onClose: () => void;
  tramite: Tramite | null;
  areas: Area[];
  loadingAreas: boolean;
  seguimientoData: SeguimientoData;
  setSeguimientoData: (updater: (prev: SeguimientoData) => SeguimientoData) => void;
  onSubmit: () => void;
}

const SeguimientoDialog: React.FC<SeguimientoDialogProps> = ({
  open,
  onClose,
  tramite,
  areas,
  loadingAreas,
  seguimientoData,
  setSeguimientoData,
  onSubmit,
}) => {
  const isDetenido = seguimientoData.actualizar_estado === 'detenido';
  const isCompletado = seguimientoData.actualizar_estado === 'completado';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Registrar Seguimiento - {tramite?.id}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Área Origen</InputLabel>
            <Select value={seguimientoData.area_origen} label="Área Origen" disabled>
              <MenuItem value={seguimientoData.area_origen}>
                {seguimientoData.area_origen}
              </MenuItem>
            </Select>
          </FormControl>
          <FormControl
            fullWidth
            required={!(isDetenido || isCompletado)}
            disabled={
              loadingAreas || areas.length === 0 || isDetenido || isCompletado
            }
          >
            <InputLabel>Área Destino</InputLabel>
            <Select
              value={seguimientoData.area_destino}
              label="Área Destino"
              onChange={(e) =>
                setSeguimientoData((prev) => ({
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
            label="Usuario / Quién envía (Remitente)"
            fullWidth
            required
            value={seguimientoData.usuario}
            InputProps={{ readOnly: true }}
            placeholder="Se rellena con el usuario logueado"
          />
          <FormControl fullWidth>
            <InputLabel id="seguimiento-estado-label" shrink>
              Actualizar Estado
            </InputLabel>
            <Select
              labelId="seguimiento-estado-label"
              value={
                isDetenido || isCompletado ? '' : seguimientoData.actualizar_estado
              }
              label="Actualizar Estado"
              onChange={(e) =>
                setSeguimientoData((prev) => ({
                  ...prev,
                  actualizar_estado: e.target.value as string,
                }))
              }
              displayEmpty
              renderValue={(selected) => {
                if (!selected) {
                  return <em style={{ opacity: 0.6 }}>Sin cambio</em>;
                }
                return getEstadoLabel(selected);
              }}
            >
              <MenuItem value="">
                <em>Sin cambio</em>
              </MenuItem>
              <MenuItem value="en_transito">En Tránsito</MenuItem>
              <MenuItem value="firmado">Firmado</MenuItem>
              <MenuItem value="procesado">Procesado</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isDetenido}
                  onChange={(e) =>
                    setSeguimientoData((prev) => ({
                      ...prev,
                      // Al quitar "Detenido", reactivamos el trámite para poder enviarlo.
                      actualizar_estado: e.target.checked ? 'detenido' : 'en_transito',
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
                    setSeguimientoData((prev) => ({
                      ...prev,
                      actualizar_estado: e.target.checked ? 'completado' : '',
                    }))
                  }
                  color="success"
                />
              }
              label="Completado"
            />
          </Box>
          <TextField
            label="Observaciones"
            fullWidth
            multiline
            rows={3}
            value={seguimientoData.observaciones}
            onChange={(e) =>
              setSeguimientoData((prev) => ({
                ...prev,
                observaciones: e.target.value,
              }))
            }
            placeholder="Notas adicionales sobre el movimiento..."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          startIcon={<Send />}
        >
          Registrar Seguimiento
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SeguimientoDialog;

