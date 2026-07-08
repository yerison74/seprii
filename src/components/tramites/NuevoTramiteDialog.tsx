import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Button,
  IconButton,
} from '@mui/material';
import { AttachFile, PictureAsPdf } from '@mui/icons-material';
import type { Area } from '../../services/api';
import { PROCESOS } from '../../constants/procesos';
import TramiteObrasBuscador from './TramiteObrasBuscador';
import type { ObraSigedeResumen } from '../../types/database';

export interface NuevoTramiteForm {
  titulo: string;
  oficio: string;
  nombre_destinatario: string;
  area_destinatario: string;
  area_destino_final: string;
  proceso: string;
  archivo_pdf: File | null;
  id_sigede: string[];
}

interface NuevoTramiteDialogProps {
  open: boolean;
  onClose: () => void;
  nuevoTramite: NuevoTramiteForm;
  setNuevoTramite: (updater: (prev: NuevoTramiteForm) => NuevoTramiteForm) => void;
  areas: Area[];
  loadingAreas: boolean;
  uploadingPdf: boolean;
  onCreate: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  obrasResumen: ObraSigedeResumen[];
  setObrasResumen: React.Dispatch<React.SetStateAction<ObraSigedeResumen[]>>;
}

const NuevoTramiteDialog: React.FC<NuevoTramiteDialogProps> = ({
  open,
  onClose,
  nuevoTramite,
  setNuevoTramite,
  areas,
  loadingAreas,
  uploadingPdf,
  onCreate,
  onFileChange,
  fileInputRef,
  obrasResumen,
  setObrasResumen,
}) => {
  const handleClose = () => {
    onClose();
    setNuevoTramite(() => ({
      titulo: '',
      oficio: '',
      nombre_destinatario: '',
      area_destinatario: '',
      area_destino_final: '',
      proceso: '',
      archivo_pdf: null,
      id_sigede: [],
    }));
    setObrasResumen([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Crear Nuevo Trámite</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 2 }}>
          <TextField
            label="Título del Documento"
            fullWidth
            required
            value={nuevoTramite.titulo}
            onChange={(e) =>
              setNuevoTramite((prev) => ({ ...prev, titulo: e.target.value }))
            }
            placeholder="Ej: Solicitud de Presupuesto"
          />
          <TextField
            label="Oficio"
            fullWidth
            value={nuevoTramite.oficio}
            onChange={(e) =>
              setNuevoTramite((prev) => ({ ...prev, oficio: e.target.value }))
            }
            placeholder="Ej: OF-2025-001"
          />
          <TextField
            label="Remitente"
            fullWidth
            required
            value={nuevoTramite.nombre_destinatario}
            InputProps={{ readOnly: true }}
            placeholder="Se rellena con el usuario logueado"
          />
          <FormControl fullWidth required disabled={loadingAreas || areas.length === 0}>
            <InputLabel>Área de envío</InputLabel>
            <Select
              value={nuevoTramite.area_destinatario}
              label="Área de envío"
              onChange={(e) =>
                setNuevoTramite((prev) => ({
                  ...prev,
                  area_destinatario: e.target.value,
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
          <FormControl fullWidth>
            <InputLabel id="tramite-proceso-label" shrink>
              Proceso (opcional)
            </InputLabel>
            <Select
              labelId="tramite-proceso-label"
              value={nuevoTramite.proceso}
              label="Proceso (opcional)"
              onChange={(e) =>
                setNuevoTramite((prev) => ({ ...prev, proceso: e.target.value }))
              }
              displayEmpty
              renderValue={(selected) => {
                if (!selected) {
                  return <em style={{ opacity: 0.6 }}>Ninguno</em>;
                }
                return PROCESOS.find((p) => p.id === selected)?.nombre ?? selected;
              }}
            >
              <MenuItem value="">
                <em>Ninguno</em>
              </MenuItem>
              {PROCESOS.map((proceso) => (
                <MenuItem key={proceso.id} value={proceso.id}>
                  {proceso.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TramiteObrasBuscador
            idSigede={nuevoTramite.id_sigede}
            onChange={(ids) => setNuevoTramite((prev) => ({ ...prev, id_sigede: ids }))}
            obrasResumen={obrasResumen}
            onResumenChange={setObrasResumen}
          />
          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Archivo PDF (opcional)
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={onFileChange}
              style={{ display: 'none' }}
            />
            <Button
              variant="outlined"
              component="label"
              startIcon={<AttachFile />}
              fullWidth
              sx={{ mb: 1 }}
            >
              {nuevoTramite.archivo_pdf
                ? nuevoTramite.archivo_pdf.name
                : 'Seleccionar archivo PDF'}
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={onFileChange}
                style={{ display: 'none' }}
              />
            </Button>
            {nuevoTramite.archivo_pdf && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  bgcolor: 'success.light',
                  borderRadius: 1,
                }}
              >
                <PictureAsPdf color="error" />
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  {nuevoTramite.archivo_pdf.name}{' '}
                  {`(${(nuevoTramite.archivo_pdf.size / 1024 / 1024).toFixed(2)} MB)`}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    setNuevoTramite((prev) => ({ ...prev, archivo_pdf: null }));
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  <Typography variant="body2">✕</Typography>
                </IconButton>
              </Box>
            )}
            <Typography variant="caption" color="text.secondary">
              Solo se permiten archivos PDF. Tamaño máximo: 10MB
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button onClick={onCreate} variant="contained" disabled={uploadingPdf}>
          {uploadingPdf ? 'Creando...' : 'Crear Trámite'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NuevoTramiteDialog;

