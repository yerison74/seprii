import React from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Button } from '@mui/material';
import { Print } from '@mui/icons-material';
import type { Tramite } from '../../services/api';

interface BarcodeDialogProps {
  open: boolean;
  onClose: () => void;
  tramite: Tramite | null;
  renderBarcode: (tramite: Tramite) => React.ReactNode;
  onPrint: () => void;
}

const BarcodeDialog: React.FC<BarcodeDialogProps> = ({
  open,
  onClose,
  tramite,
  renderBarcode,
  onPrint,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Código de Barras - {tramite?.id}</DialogTitle>
      <DialogContent>
        {tramite && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 3,
              gap: 3,
            }}
          >
            {renderBarcode(tramite)}
            <Box sx={{ textAlign: 'center' }}>
              <Button
                variant="contained"
                startIcon={<Print />}
                onClick={onPrint}
              >
                Imprimir
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeDialog;

