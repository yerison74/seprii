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
  obraIds: string[];
  onChange: (next: { id_sigede: string[]; obra_ids: string[] }) => void;
  obrasResumen: ObraSigedeResumen[];
  onResumenChange: (resumen: ObraSigedeResumen[]) => void;
  disabled?: boolean;
}

function agregarUnicos(prev: string[], nuevos: string[]): string[] {
  const set = new Set(prev);
  for (const id of nuevos) {
    const t = id.trim();
    if (t) set.add(t);
  }
  return Array.from(set);
}

const TramiteObrasBuscador: React.FC<TramiteObrasBuscadorProps> = ({
  idSigede,
  obraIds,
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
    let cancelado = false;
    const timer = window.setTimeout(async () => {
      setBuscando(true);
      try {
        const resp = await tramitesAPI.buscarObrasParaTramite(term, 12);
        if (cancelado) return;
        setResultado(resp.data.data);
        setAbierto(true);
      } catch (err) {
        console.error('Error al buscar obras para trámite:', err);
        if (cancelado) return;
        setResultado({ obras: [], loteContrato: null });
        setAbierto(true);
      } finally {
        if (!cancelado) setBuscando(false);
      }
    }, 300);
    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
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

  const refrescarResumen = async (sigedes: string[], obras: string[]) => {
    if (sigedes.length === 0 && obras.length === 0) {
      onResumenChange([]);
      return;
    }
    try {
      const resp = await gestionTecnicaDocumentoAPI.resumenesSigede(sigedes, obras);
      onResumenChange(resp.data.data || []);
    } catch {
      onResumenChange([
        ...sigedes.map((id) => ({ id_sigede: id, encontrada: false as const })),
        ...obras.map((id) => ({
          id_sigede: id,
          obra_id: id,
          tipo_gestion: 'Mantenimiento' as const,
          encontrada: false as const,
        })),
      ]);
    }
  };

  const aplicarObras = async (nuevas: ObraTramiteOpcion[]) => {
    const nuevosSigede = nuevas.filter((o) => !o.sinSigede).map((o) => o.sigede);
    const nuevosIds = nuevas.filter((o) => o.sinSigede).map((o) => o.id);
    const nextSigede = agregarUnicos(idSigede, nuevosSigede);
    const nextObraIds = agregarUnicos(obraIds, nuevosIds);
    onChange({ id_sigede: nextSigede, obra_ids: nextObraIds });
    await refrescarResumen(nextSigede, nextObraIds);
    setBusqueda('');
    setAbierto(false);
  };

  const agregarObra = async (obra: ObraTramiteOpcion) => {
    const lote = resultado?.loteContrato;
    if (
      lote &&
      obra.contrato &&
      lote.contrato &&
      lote.contrato.toLowerCase() === obra.contrato.toLowerCase()
    ) {
      await aplicarObras(lote.obras);
      return;
    }
    await aplicarObras([obra]);
  };

  const quitarObra = async (fila: ObraSigedeResumen) => {
    const esMant = fila.tipo_gestion === 'Mantenimiento' || !!fila.obra_id;
    const nextSigede = esMant
      ? idSigede
      : idSigede.filter((x) => x !== fila.id_sigede);
    const nextObraIds = esMant
      ? obraIds.filter((x) => x !== (fila.obra_id || fila.id_sigede))
      : obraIds;
    onChange({ id_sigede: nextSigede, obra_ids: nextObraIds });
    onResumenChange(
      obrasResumen.filter((o) => o.id_sigede !== fila.id_sigede),
    );
  };

  const yaAsignada = (obra: ObraTramiteOpcion) =>
    obra.sinSigede ? obraIds.includes(obra.id) : idSigede.includes(obra.sigede);

  const totalVinculadas = idSigede.length + obraIds.length;

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
        Obras relacionadas
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Busque cualquier obra por SIGEDE, ID, contrato, plantel, provincia, municipio o responsable.
        Incluye obras de arrastre y de mantenimiento (sin SIGEDE). Si el término coincide con un
        número de contrato, podrá agregar todas las obras de ese contrato.
      </Typography>

      <Box ref={contenedorRef} sx={{ position: 'relative', mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onFocus={() => busqueda.trim() && setAbierto(true)}
          placeholder="SIGEDE, ID, contrato, plantel, provincia o municipio…"
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
              zIndex: 1400,
              mt: 0.5,
              width: '100%',
              maxHeight: 280,
              overflow: 'auto',
            }}
          >
            <List dense disablePadding>
              {resultado.loteContrato && resultado.loteContrato.obras.length > 0 && (
                <ListItemButton
                  onClick={() => aplicarObras(resultado.loteContrato!.obras)}
                  sx={{ bgcolor: 'primary.50', borderBottom: '1px solid', borderColor: 'divider' }}
                >
                  <PlaylistAdd color="primary" sx={{ mr: 1.5 }} />
                  <ListItemText
                    primary={`Agregar todas las obras del contrato ${resultado.loteContrato.contrato}`}
                    secondary={`${resultado.loteContrato.obras.length} obra(s)`}
                  />
                </ListItemButton>
              )}
              {resultado.obras.length === 0 && !resultado.loteContrato && (
                <ListItemButton disabled>
                  <ListItemText primary="Sin resultados" />
                </ListItemButton>
              )}
              {resultado.obras.map((obra) => {
                const asignada = yaAsignada(obra);
                const esLote =
                  resultado.loteContrato &&
                  obra.contrato &&
                  resultado.loteContrato.contrato === obra.contrato;
                const etiqueta = obra.sinSigede ? obra.id : obra.sigede;
                return (
                  <ListItemButton
                    key={obra.id}
                    disabled={asignada}
                    onClick={() => agregarObra(obra)}
                  >
                    <ListItemText
                      primary={
                        <Box component="span" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Typography component="span" variant="body2" fontWeight={600} color="primary">
                            {etiqueta}
                          </Typography>
                          {obra.sinSigede && (
                            <Typography component="span" variant="caption" color="text.secondary">
                              (sin SIGEDE)
                            </Typography>
                          )}
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
                    {!asignada && (
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
                {['ID / SIGEDE', 'Contrato', 'Plantel', 'Provincia', ''].map((h) => (
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
                    {fila.tipo_gestion === 'Mantenimiento' ? (
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        mant.
                      </Typography>
                    ) : null}
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
                      onClick={() => quitarObra(fila)}
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

      {totalVinculadas > 0 && (
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            size="small"
            color="inherit"
            onClick={() => {
              onChange({ id_sigede: [], obra_ids: [] });
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
