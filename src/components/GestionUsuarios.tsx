import { useEffect, useState } from 'react';
import { obtenerUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario } from '../services/usuarios.service';
import { 
  Button, 
  Card, 
  CardContent, 
  Chip, 
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Snackbar
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  PersonAdd as PersonAddIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import UsuarioModal from './usuarios/UsuarioModal';
import { PERMISOS } from '../constants/permisos';
import { useAuth } from '../context/AuthContext';

const TODOS_LOS_PERMISOS = Object.values(PERMISOS);

function aplicarPermisosAdmin(permisosActuales: Record<string, boolean> | null | undefined) {
  const permisos = { ...(permisosActuales || {}) };
  TODOS_LOS_PERMISOS.forEach((codigo) => {
    permisos[codigo] = true;
  });
  return permisos;
}

export default function GestionUsuarios() {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>({
    usuario: '', 
    password: '', 
    nombre: '', 
    apellido: '',
    cargo: '', 
    area: 'Ninguna', 
    rol: 'usuario', 
    permisos: {}, 
    activo: true,
  });
  const canEditarUsuarios = hasPermission('editar_configuracion') || hasPermission('editar_usuarios');

  const cargar = async () => {
    try {
      const data = await obtenerUsuarios();
      setUsers(data);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      showSnackbar('Error al cargar usuarios', 'error');
    }
  };

  useEffect(() => { 
    cargar(); 
  }, []);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const nuevo = () => {
    setEditId(null);
    setForm({ 
      usuario: '', 
      password: '', 
      nombre: '', 
      apellido: '', 
      cargo: '', 
      area: 'Ninguna', 
      rol: 'usuario', 
      permisos: {}, 
      activo: true 
    });
    setOpen(true);
  };

  const editar = (u: any) => {
    setEditId(u.id);
    setForm({
      ...u,
      permisos: u?.rol === 'admin' ? aplicarPermisosAdmin(u?.permisos) : (u?.permisos || {}),
    });
    setOpen(true);
  };

  const guardar = async () => {
    if (!canEditarUsuarios) {
      showSnackbar('No tienes permisos para editar usuarios', 'error');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        ...form,
        permisos: form?.rol === 'admin' ? aplicarPermisosAdmin(form?.permisos) : (form?.permisos || {}),
      };
      if (editId) {
        await actualizarUsuario(editId, payload);
        showSnackbar('Usuario actualizado exitosamente', 'success');
      } else {
        await crearUsuario(payload);
        showSnackbar('Usuario creado exitosamente', 'success');
      }
      setOpen(false);
      await cargar();
    } catch (error: any) {
      console.error('Error guardando usuario:', error);
      showSnackbar(error.message || 'Error al guardar el usuario', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (user: any) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    if (!canEditarUsuarios) {
      showSnackbar('No tienes permisos para eliminar usuarios', 'error');
      return;
    }
    
    try {
      setLoading(true);
      await eliminarUsuario(userToDelete.id);
      showSnackbar('Usuario eliminado exitosamente', 'success');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      await cargar();
    } catch (error: any) {
      console.error('Error eliminando usuario:', error);
      showSnackbar(error.message || 'Error al eliminar el usuario', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const getRolColor = (rol: string) => {
    if (rol === 'admin') return 'error';
    if (rol === 'supervision') return 'warning';
    return 'primary';
  };

  const getRolLabel = (rol: string) => {
    if (rol === 'admin') return 'Administrador';
    if (rol === 'supervision') return 'Supervisión';
    return 'Usuario';
  };

  const getEstadoColor = (activo: boolean) => {
    return activo ? 'success' : 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card elevation={3}>
        <CardContent>
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 3 
          }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
              Gestión de Usuarios
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<PersonAddIcon />}
              onClick={nuevo}
              disabled={!canEditarUsuarios}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                py: 1
              }}
            >
              Nuevo Usuario
            </Button>
          </Box>

          {/* Stats */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Chip 
              label={`Total: ${users.length}`} 
              color="primary" 
              variant="outlined"
            />
            <Chip 
              label={`Activos: ${users.filter(u => u.activo).length}`} 
              color="success" 
              variant="outlined"
            />
            <Chip 
              label={`Inactivos: ${users.filter(u => !u.activo).length}`} 
              color="default" 
              variant="outlined"
            />
          </Box>

          {/* Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Usuario</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nombre Completo</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cargo</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Área</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Rol</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Estado</TableCell>
                  {canEditarUsuarios && (
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">
                      Acciones
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEditarUsuarios ? 7 : 6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        No hay usuarios registrados
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow 
                      key={u.id}
                      hover
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        opacity: u.activo ? 1 : 0.6
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {u.usuario}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {u.nombre} {u.apellido}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {u.cargo || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200 }}>
                          {u.area === 'Ninguna' ? '-' : u.area}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getRolLabel(u.rol)}
                          color={getRolColor(u.rol)}
                          size="small"
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          icon={u.activo ? <CheckCircleIcon /> : <CancelIcon />}
                          label={u.activo ? 'Activo' : 'Inactivo'}
                          color={getEstadoColor(u.activo)}
                          size="small"
                          variant={u.activo ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      {canEditarUsuarios && (
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => editar(u)}
                              sx={{ 
                                '&:hover': { 
                                  bgcolor: 'primary.light',
                                  color: 'white'
                                }
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDeleteClick(u)}
                              sx={{ 
                                '&:hover': { 
                                  bgcolor: 'error.light',
                                  color: 'white'
                                }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Modal de Usuario */}
      <UsuarioModal
        open={open}
        onClose={() => setOpen(false)}
        onSave={guardar}
        form={form}
        setForm={setForm}
        isEdit={!!editId}
        loading={loading}
      />

      {/* Dialog de Confirmación de Eliminación */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: 'error.main', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <DeleteIcon />
          Confirmar Eliminación
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar al usuario <strong>{userToDelete?.nombre} {userToDelete?.apellido}</strong> ({userToDelete?.usuario})?
          </DialogContentText>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Esta acción no se puede deshacer. El usuario será eliminado permanentemente del sistema.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleDeleteCancel}
            variant="outlined"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            disabled={loading}
            autoFocus
          >
            {loading ? 'Eliminando...' : 'Eliminar Usuario'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
