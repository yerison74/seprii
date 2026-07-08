import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
} from '@mui/material';
import { AssignmentTurnedIn } from '@mui/icons-material';
import type { Area, FormularioContratista } from '../../services/api';

interface AsignarAreaSolicitudDialogProps {
  open: boolean;
  onClose: () => void;
  solicitud: FormularioContratista | null;
  areas: Area[];
  loadingAreas: boolean;
  usuario: string;
  onAsignar: (areaNombre: string, nota: string | null) => Promise<void>;
}

export default function AsignarAreaSolicitudDialog({
  open,
  onClose,
  solicitud,
  areas,
  loadingAreas,
  usuario,
  onAsignar,
}: AsignarAreaSolicitudDialogProps) {
  const [areaId, setAreaId] = useState('');
  const [nota, setNota] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setAreaId('');
      setNota('');
    }
  }, [open, solicitud?.id]);

  const handleSubmit = async () => {
    const area = areas.find((a) => a.id === areaId);
    if (!area) return;
    setLoading(true);
    try {
      await onAsignar(area.area, nota.trim() || null);
      onClose();
    } catch {
      /* el padre muestra el error */
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Asignar solicitud a un área — {solicitud?.id}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Usuario" fullWidth value={usuario} InputProps={{ readOnly: true }} size="small" />
          <FormControl fullWidth required disabled={loadingAreas || areas.length === 0}>
            <InputLabel>Área</InputLabel>
            <Select value={areaId} label="Área" onChange={(e) => setAreaId(e.target.value)}>
              {areas.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.area}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Nota (opcional)"
            fullWidth
            multiline
            minRows={2}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Comentario sobre la asignación..."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={<AssignmentTurnedIn />}
          onClick={handleSubmit}
          disabled={!areaId || loading}
        >
          {loading ? 'Guardando...' : 'Asignar área'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
