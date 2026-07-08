import React from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  IconButton,
  Tooltip,
  Typography,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Search,
  Add,
  CameraAlt,
  Stop,
  Scanner,
  Clear,
  ViewList,
  ViewModule,
  CheckCircle,
} from '@mui/icons-material';

interface TramitesToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  estadoFilter: string;
  onEstadoFilterChange: (value: string) => void;
  estadoOptions: { value: string; label: string }[];
  viewMode: 'list' | 'cards';
  onViewModeChange: (mode: 'list' | 'cards') => void;
  hideCompleted: boolean;
  onHideCompletedChange: (value: boolean) => void;
  scanning: boolean;
  onToggleScan: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onOpenNuevoTramite: () => void;
}

const TramitesToolbar: React.FC<TramitesToolbarProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  estadoFilter,
  onEstadoFilterChange,
  estadoOptions,
  viewMode,
  onViewModeChange,
  hideCompleted,
  onHideCompletedChange,
  scanning,
  onToggleScan,
  searchInputRef,
  onOpenNuevoTramite,
}) => {
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* Icono y título se mantienen en el componente principal */}
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onOpenNuevoTramite}
          sx={{
            px: 3,
            py: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Nuevo Trámite
        </Button>
      </Box>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Sistema de seguimiento de documentos físicos. Registre y rastree el movimiento de trámites entre áreas.
      </Typography>

      <Paper
        elevation={3}
        sx={{
          p: 2.5,
          mb: 3,
          background: 'linear-gradient(135deg, rgba(66, 165, 245, 0.05) 0%, rgba(255, 255, 255, 1) 100%)',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <Box
          display="flex"
          gap={1.5}
          alignItems="stretch"
          sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' } }}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <TextField
              inputRef={searchInputRef}
              label="Buscar trámite"
              variant="outlined"
              size="medium"
              fullWidth
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') onSearchSubmit();
              }}
              placeholder="ID, título, oficio, destinatario, área o código de barras..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: 'background.paper',
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderWidth: 2,
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                    <Search sx={{ color: 'primary.main', fontSize: 22 }} />
                  </Box>
                ),
                endAdornment: searchQuery && (
                  <IconButton
                    size="small"
                    onClick={() => {
                      onSearchChange('');
                      searchInputRef.current?.focus();
                    }}
                    sx={{ mr: 0.5 }}
                  >
                    <Clear fontSize="small" />
                  </IconButton>
                ),
              }}
            />
          </Box>

          <FormControl
            size="medium"
            sx={{
              minWidth: { xs: '100%', sm: 220 },
              '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: 'background.paper' },
            }}
          >
            <InputLabel>Estado</InputLabel>
            <Select
              value={estadoFilter}
              label="Estado"
              onChange={(e) => onEstadoFilterChange(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {estadoOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box display="flex" gap={1} alignItems="stretch">
            <Tooltip
              title={scanning ? 'Detener escaneo con cámara' : 'Escanear código de barras con cámara'}
              arrow
            >
              <Button
                variant={scanning ? 'contained' : 'outlined'}
                onClick={onToggleScan}
                color={scanning ? 'error' : 'primary'}
                startIcon={scanning ? <Stop /> : <CameraAlt />}
                sx={{
                  minWidth: { xs: 'auto', sm: 140 },
                  px: 2.5,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  borderWidth: scanning ? 0 : 2,
                  boxShadow: scanning ? 2 : 0,
                  '&:hover': {
                    borderWidth: scanning ? 0 : 2,
                    boxShadow: scanning ? 4 : 2,
                  },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  {scanning ? 'Detener' : 'Cámara'}
                </Box>
              </Button>
            </Tooltip>

            <Tooltip title="Buscar trámites" arrow>
              <Button
                variant="contained"
                onClick={onSearchSubmit}
                startIcon={<Search />}
                sx={{
                  minWidth: { xs: 'auto', sm: 120 },
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: 2,
                  '&:hover': {
                    boxShadow: 4,
                  },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Buscar
                </Box>
              </Button>
            </Tooltip>
          </Box>
        </Box>

        {!scanning && searchQuery && (
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Scanner sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              También puedes usar un escáner de código de barras profesional
            </Typography>
          </Box>
        )}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        <FormControlLabel
          control={
            <Switch
              checked={viewMode === 'list'}
              onChange={(e) => onViewModeChange(e.target.checked ? 'list' : 'cards')}
              color="primary"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {viewMode === 'list' ? <ViewList /> : <ViewModule />}
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {viewMode === 'list' ? 'Vista de Lista' : 'Vista de Tarjetas'}
              </Typography>
            </Box>
          }
          sx={{
            '& .MuiFormControlLabel-label': {
              ml: 1,
            },
          }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={hideCompleted}
              onChange={(e) => onHideCompletedChange(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle fontSize="small" color={hideCompleted ? 'action' : 'success'} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Ocultar Completados
              </Typography>
            </Box>
          }
          sx={{
            '& .MuiFormControlLabel-label': {
              ml: 1,
            },
          }}
        />
      </Box>
    </>
  );
};

export default TramitesToolbar;

