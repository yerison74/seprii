import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  CircularProgress,
} from '@mui/material';
import { History as HistoryIcon, Person } from '@mui/icons-material';
import type { Tramite, MovimientoTramite } from '../../services/api';
import { esMovimientoDesdeGestionTecnica } from '../../utils/tramiteGestionTecnica';

interface HistorialDialogProps {
  open: boolean;
  onClose: () => void;
  tramite: Tramite | null;
  historial: MovimientoTramite[];
  loadingHistorial: boolean;
  onVerPdf?: () => void;
}

const HistorialDialog: React.FC<HistorialDialogProps> = ({
  open,
  onClose,
  tramite,
  historial,
  loadingHistorial,
  onVerPdf,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      <DialogTitle
        sx={{
          pb: 2,
          borderBottom: '2px solid',
          borderColor: 'divider',
          backgroundColor: 'primary.main',
          color: 'white',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon />
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                Historial de Movimientos
              </Typography>
              {tramite && (
                <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                  {tramite.id} - {tramite.titulo}
                  {tramite.oficio && ` · Oficio: ${tramite.oficio}`}
                </Typography>
              )}
            </Box>
          </Box>
          {tramite?.archivo_pdf && onVerPdf && (
            <Button
              variant="contained"
              size="small"
              color="error"
              startIcon={<HistoryIcon />}
              sx={{ whiteSpace: 'nowrap' }}
              onClick={onVerPdf}
            >
              Ver PDF del trámite
            </Button>
          )}
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 3, minHeight: '300px' }}>
        {loadingHistorial ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 6,
            }}
          >
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Cargando historial de movimientos...
            </Typography>
          </Box>
        ) : historial.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <HistoryIcon
              sx={{
                fontSize: 80,
                color: 'text.secondary',
                mb: 2,
                opacity: 0.5,
              }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Sin movimientos registrados
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Aún no hay movimientos registrados para este trámite
            </Typography>
          </Box>
        ) : (
          <Box sx={{ mt: 1 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 2, fontWeight: 600 }}
            >
              Total de movimientos: {historial.length}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                maxHeight: '500px',
                overflowY: 'auto',
                pr: 1,
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: '4px',
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.3)',
                  },
                },
              }}
            >
              {historial.map((movimiento, index) => {
                const esUltimo = index === 0;
                const desdeGestionTecnica = esMovimientoDesdeGestionTecnica(movimiento);
                const movimientoDetenido =
                  movimiento.estado_resultante === 'detenido';
                const colorBorde = movimientoDetenido
                  ? '#c62828'
                  : esUltimo
                    ? 'primary.main'
                    : 'divider';
                const colorFondo = movimientoDetenido
                  ? 'rgba(198, 40, 40, 0.06)'
                  : esUltimo
                    ? 'rgba(66, 165, 245, 0.05)'
                    : 'background.paper';
                const colorCirculo = movimientoDetenido ? '#c62828' : 'primary.main';

                return (
                  <Paper
                    key={movimiento.id || index}
                    elevation={esUltimo ? 3 : 1}
                    sx={{
                      p: 2.5,
                      position: 'relative',
                      borderLeft: esUltimo ? '4px solid' : '2px solid',
                      borderColor: colorBorde,
                      backgroundColor: colorFondo,
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: 4,
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    {esUltimo && (
                      <Chip
                        label="Más Reciente"
                        size="small"
                        color={movimientoDetenido ? 'error' : 'primary'}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          fontWeight: 600,
                        }}
                      />
                    )}
                    {desdeGestionTecnica && (
                      <Chip
                        label="Gestión técnica · solo lectura"
                        size="small"
                        variant="outlined"
                        sx={{
                          position: 'absolute',
                          top: esUltimo ? 40 : 8,
                          right: 8,
                          fontWeight: 500,
                          fontSize: '0.65rem',
                          borderColor: 'info.main',
                          color: 'info.main',
                        }}
                      />
                    )}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        mb: 1.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: colorCirculo,
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                          }}
                        >
                          {historial.length - index}
                        </Box>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 600, fontSize: '1rem' }}
                        >
                          Movimiento #{historial.length - index}
                        </Typography>
                      </Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 500 }}
                      >
                        {movimiento.fecha_movimiento
                          ? new Date(
                              movimiento.fecha_movimiento,
                            ).toLocaleString('es-DO', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Fecha no disponible'}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        gap: 2,
                        mb: 1.5,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Box
                        sx={{
                          flex: 1,
                          minWidth: '200px',
                          p: 1.5,
                          backgroundColor: 'rgba(255, 152, 0, 0.1)',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'warning.light',
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mb: 0.5 }}
                        >
                          Desde
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {movimiento.area_origen || 'N/A'}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          flex: 1,
                          minWidth: '200px',
                          p: 1.5,
                          backgroundColor: 'rgba(76, 175, 80, 0.1)',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'success.light',
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mb: 0.5 }}
                        >
                          Hacia
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {movimiento.area_destino || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>

                    {movimiento.usuario && (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 1,
                          p: 1,
                          backgroundColor: 'rgba(0, 0, 0, 0.02)',
                          borderRadius: 1,
                        }}
                      >
                        <Person fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          <strong>Usuario:</strong> {movimiento.usuario}
                        </Typography>
                      </Box>
                    )}

                    {movimiento.observaciones && (
                      <Box
                        sx={{
                          mt: 1.5,
                          p: 1.5,
                          backgroundColor:
                            movimiento.estado_resultante === 'detenido'
                              ? 'rgba(198, 40, 40, 0.06)'
                              : 'rgba(0, 0, 0, 0.02)',
                          borderRadius: 1,
                          borderLeft: '3px solid',
                          borderColor:
                            movimiento.estado_resultante === 'detenido'
                              ? '#c62828'
                              : 'info.main',
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}
                        >
                          Observaciones
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ whiteSpace: 'pre-wrap' }}
                        >
                          {movimiento.observaciones}
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                );
              })}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions
        sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}
      >
        <Button onClick={onClose} variant="outlined" sx={{ minWidth: 100 }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HistorialDialog;

