import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  Chip,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import { Search, Close, Add, PlaylistAdd } from '@mui/icons-material';
import { tramitesAPI, gestionTecnicaDocumentoAPI } from '../../services/api';
import type { BuscarObrasTramiteResult, ObraSigedeResumen, ObraTramiteOpcion } from '../../types/database';

interface TramiteObrasBuscadorProps {
  idSigede: string[];
  onChange: (ids: string[]) => void;
  obrasResumen: ObraSigedeResumen[];
  onResumenChange: (resumen: ObraSigedeResumen[]) => void;
  disabled?: boolean;
}

function agregarSigedes(prev: string[], nuevos: string[]): string[] {
  const set = new Set(prev);
  for (const id of nuevos) {
    const t = id.trim();
    if (t) set.add(t);
  }
  return Array.from(set);
}

const TramiteObrasBuscador: React.FC<TramiteObrasBuscadorProps> = ({
  idSigede,
  onChange,
  obrasResumen,
  onResumenChange,
  disabled,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [resultado, setResultado] = useState<BuscarObrasTramiteResult | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = busqueda.trim();
    if (term.length < 1) {
      setResultado(null);
      setAbierto(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      setBuscando(true);
      try {
        const resp = await tramitesAPI.buscarObrasParaTramite(term, 12);
        setResultado(resp.data.data);
        setAbierto(true);
      } catch (err) {
        console.error('Error al buscar obras para trámite:', err);
        setResultado({ obras: [], loteContrato: null });
        setAbierto(true);
      } finally {
        setBuscando(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [busqueda]);

  useEffect(() => {
    const cerrar = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, []);

  const refrescarResumen = async (ids: string[]) => {
    if (ids.length === 0) {
      onResumenChange([]);
      return;
    }
    try {
      const resp = await gestionTecnicaDocumentoAPI.resumenesSigede(ids);
      onResumenChange(resp.data.data || []);
    } catch {
      onResumenChange(
        ids.map((id) => ({ id_sigede: id, encontrada: false })),
      );
    }
  };

  const aplicarSigedes = async (nuevos: string[]) => {
    const merged = agregarSigedes(idSigede, nuevos);
    onChange(merged);
    await refrescarResumen(merged);
    setBusqueda('');
    setAbierto(false);
  };

  const agregarObra = async (obra: ObraTramiteOpcion) => {
    const lote = resultado?.loteContrato;
    if (lote && obra.contrato && lote.contrato === obra.contrato) {
      await aplicarSigedes(lote.obras.map((o) => o.sigede));
      return;
    }
    await aplicarSigedes([obra.sigede]);
  };

  const quitarSigede = async (id: string) => {
    const next = idSigede.filter((x) => x !== id);
    onChange(next);
    onResumenChange(obrasResumen.filter((o) => o.id_sigede !== id));
  };

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
        Obras relacionadas (SIGEDE)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Busque por SIGEDE, contrato, nombre del plantel o responsable. Si busca por número de contrato,
        se agregarán todas las obras de ese contrato.
      </Typography>

      <Box ref={contenedorRef} sx={{ position: 'relative', mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onFocus={() => busqueda.trim() && setAbierto(true)}
          placeholder="SIGEDE, contrato, plantel o responsable…"
          disabled={disabled}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />,
            endAdornment: buscando ? <CircularProgress size={18} /> : undefined,
          }}
        />

        {abierto && resultado && (
          <Paper
            elevation={4}
            sx={{
              position: 'absolute',
              zIndex: 10,
              mt: 0.5,
              width: '100%',
              maxHeight: 280,
              overflow: 'auto',
            }}
          >
            <List dense disablePadding>
              {resultado.loteContrato && resultado.loteContrato.obras.length > 0 && (
                <ListItemButton
                  onClick={() =>
                    aplicarSigedes(resultado.loteContrato!.obras.map((o) => o.sigede))
                  }
                  sx={{ bgcolor: 'primary.50', borderBottom: '1px solid', borderColor: 'divider' }}
                >
                  <PlaylistAdd color="primary" sx={{ mr: 1.5 }} />
                  <ListItemText
                    primary={`Agregar todas las obras del contrato ${resultado.loteContrato.contrato}`}
                    secondary={`${resultado.loteContrato.obras.length} plantel(es) SIGEDE`}
                  />
                </ListItemButton>
              )}
              {resultado.obras.length === 0 && !resultado.loteContrato && (
                <ListItemButton disabled>
                  <ListItemText primary="Sin resultados" />
                </ListItemButton>
              )}
              {resultado.obras.map((obra) => {
                const yaAsignada = idSigede.includes(obra.sigede);
                const esLote =
                  resultado.loteContrato &&
                  obra.contrato &&
                  resultado.loteContrato.contrato === obra.contrato;
                return (
                  <ListItemButton
                    key={obra.sigede}
                    disabled={yaAsignada}
                    onClick={() => agregarObra(obra)}
                  >
                    <ListItemText
                      primary={
                        <Box component="span" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Typography component="span" variant="body2" fontWeight={600} color="primary">
                            {obra.sigede}
                          </Typography>
                          <Typography component="span" variant="body2" color="text.secondary">
                            {obra.nombre}
                          </Typography>
                        </Box>
                      }
                      secondary={[
                        obra.contrato && `Contrato ${obra.contrato}`,
                        obra.responsable,
                        obra.municipio,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    />
                    {!yaAsignada && (
                      <Add fontSize="small" color={esLote ? 'primary' : 'action'} />
                    )}
                  </ListItemButton>
                );
              })}
            </List>
          </Paper>
        )}
      </Box>

      {obrasResumen.length > 0 ? (
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Box
            component="table"
            sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}
          >
            <Box component="thead" sx={{ bgcolor: 'grey.50' }}>
              <Box component="tr">
                {['SIGEDE', 'Contrato', 'Plantel', 'Provincia', ''].map((h) => (
                  <Box
                    key={h || 'acc'}
                    component="th"
                    sx={{ px: 1.5, py: 1, textAlign: 'left', fontWeight: 600, color: 'text.secondary' }}
                  >
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {obrasResumen.map((fila) => (
                <Box component="tr" key={fila.id_sigede} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                  <Box component="td" sx={{ px: 1.5, py: 1, fontFamily: 'monospace' }}>
                    {fila.id_sigede}
                  </Box>
                  <Box component="td" sx={{ px: 1.5, py: 1 }}>
                    {fila.encontrada ? fila.contrato || '—' : '—'}
                  </Box>
                  <Box component="td" sx={{ px: 1.5, py: 1 }}>
                    {fila.encontrada ? fila.plantel || '—' : '—'}
                  </Box>
                  <Box component="td" sx={{ px: 1.5, py: 1 }}>
                    {fila.encontrada ? fila.provincia || '—' : '—'}
                  </Box>
                  <Box component="td" sx={{ px: 1, py: 0.5, textAlign: 'right' }}>
                    <IconButton
                      size="small"
                      onClick={() => quitarSigede(fila.id_sigede)}
                      disabled={disabled}
                      aria-label="Quitar obra"
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>
      ) : (
        <Chip label="Sin obras vinculadas" size="small" variant="outlined" />
      )}

      {idSigede.length > 0 && (
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            size="small"
            color="inherit"
            onClick={() => {
              onChange([]);
              onResumenChange([]);
            }}
            disabled={disabled}
          >
            Quitar todas
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default TramiteObrasBuscador;
