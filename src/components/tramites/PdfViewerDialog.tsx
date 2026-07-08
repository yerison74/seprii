import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Tooltip,
  IconButton,
  Button,
  CircularProgress,
} from '@mui/material';
import { Visibility, Download, PictureAsPdf } from '@mui/icons-material';
import type { Tramite } from '../../services/api';

interface PdfViewerDialogProps {
  open: boolean;
  onClose: () => void;
  tramite: Tramite | null;
  pdfUrl: string | null;
  pdfError: boolean;
  onRetryOpenInNewTab: () => void;
  onDownload: () => void;
}

const PdfViewerDialog: React.FC<PdfViewerDialogProps> = ({
  open,
  onClose,
  tramite,
  pdfUrl,
  pdfError,
  onRetryOpenInNewTab,
  onDownload,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          height: '90vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          pb: 2,
          borderBottom: '2px solid',
          borderColor: 'divider',
          backgroundColor: 'error.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <PictureAsPdf />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {tramite?.nombre_archivo || 'Documento PDF'}
            </Typography>
            {tramite && (
              <Typography
                variant="body2"
                sx={{
                  opacity: 0.9,
                  mt: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {tramite.id} - {tramite.titulo}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {pdfUrl && (
            <Tooltip title="Abrir en nueva pestaña">
              <IconButton
                size="small"
                onClick={onRetryOpenInNewTab}
                sx={{ color: 'white' }}
              >
                <Visibility />
              </IconButton>
            </Tooltip>
          )}
          {tramite && (
            <Tooltip title="Descargar PDF">
              <IconButton
                size="small"
                onClick={onDownload}
                sx={{ color: 'white' }}
              >
                <Download />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{ p: 0, height: '100%', overflow: 'hidden', position: 'relative' }}
      >
        {pdfError ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 6,
              height: '100%',
              backgroundColor: '#f5f5f5',
            }}
          >
            <PictureAsPdf
              sx={{ fontSize: 80, color: 'text.secondary', mb: 2, opacity: 0.5 }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No se pudo cargar el PDF
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 3, textAlign: 'center', maxWidth: 400 }}
            >
              El PDF no se puede mostrar en el visor. Puedes intentar abrirlo en
              una nueva pestaña o descargarlo.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {pdfUrl && (
                <Button
                  variant="contained"
                  startIcon={<Visibility />}
                  onClick={onRetryOpenInNewTab}
                >
                  Abrir en nueva pestaña
                </Button>
              )}
              {tramite && (
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={onDownload}
                >
                  Descargar PDF
                </Button>
              )}
            </Box>
          </Box>
        ) : pdfUrl ? (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#525252',
              position: 'relative',
            }}
          >
            <embed
              src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              type="application/pdf"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                flex: 1,
                minHeight: '500px',
              }}
            />
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 6,
              height: '100%',
            }}
          >
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Cargando PDF...
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} variant="outlined" sx={{ minWidth: 100 }}>
          Cerrar
        </Button>
        {pdfUrl && (
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={onDownload}
          >
            Descargar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PdfViewerDialog;

