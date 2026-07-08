import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, Checkbox, FormControlLabel, Button
} from '@mui/material';
import { CARGOS } from '../../constants/cargos';

const PERMISOS = [
  { key: 'crear_usuarios', label: 'Creación de usuarios' },
  { key: 'editar_usuarios', label: 'Edición de usuarios' },
  { key: 'ver_dashboard', label: 'Visualización del Dashboard' },
  { key: 'ver_obras', label: 'Visualización de Obras' },
  { key: 'ver_carga_obras', label: 'Visualización de Carga de Obras' },
  { key: 'editar_carga_obras', label: 'Carga y edición en Carga de Obras' },
  { key: 'ver_tramites', label: 'Visualización de Seguimiento de Trámite' },
  { key: 'editar_tramites', label: 'Creación y seguimiento de Trámites' },
  { key: 'ver_configuracion', label: 'Visualización de Configuración' },
];

const AREAS = [
  'Ninguna',
  'Dirección General',
  'Oficina de Libre Acceso a la Información Pública',
  'Departamento Jurídico',
  'Departamento de Recursos Humanos',
  'Departamento de Planificación y Desarrollo',
  'División Control de Gestión Interna',
  'División de Seguridad',
  'División de Tecnologías de la Información y Comunicación',
  'Departamento Administrativo y Financiero',
  'Departamento de Diseño y Arquitectura',
  'Departamento de Gestión de Infraestructura Escolar',
  'Departamento Gestión de Riesgo',
  'Departamento de Mantenimiento de Obras',
  'Departamento Supervisión de Obras',
  'Departamento Fiscalización de Obras',
  'Departamento de Cubicaciones',
  'Departamento de Coordinación Regional',
];

export default function UsuarioModalViejo({ open, onClose, onSave, form, setForm, isEdit }: any) {
  const togglePermiso = (key: string) => {
    setForm({
      ...form,
      permisos: { ...form.permisos, [key]: !form.permisos?.[key] },
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
      <DialogContent>
        <TextField fullWidth margin="dense" label="Nombre *"
          value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}/>
        <TextField fullWidth margin="dense" label="Apellido *"
          value={form.apellido} onChange={e=>setForm({...form,apellido:e.target.value})}/>
        <TextField fullWidth margin="dense" label="Nombre de usuario *"
          value={form.usuario} onChange={e=>setForm({...form,usuario:e.target.value})}/>
        <TextField fullWidth margin="dense" label="Contraseña *" type="password"
          value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
        <Select fullWidth value={form.cargo || ''} displayEmpty
          onChange={e=>setForm({...form,cargo:e.target.value})}
          renderValue={(v) => v || 'Sin especificar'}
          style={{ marginTop: 8, marginBottom: 8 }}>
          <MenuItem value="">Sin especificar</MenuItem>
          {CARGOS.map(c=> <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </Select>

        <Select fullWidth value={form.area}
          onChange={e=>setForm({...form,area:e.target.value})}>
          {AREAS.map(a=><MenuItem key={a} value={a}>{a}</MenuItem>)}
        </Select>

        <Select fullWidth value={form.rol}
          onChange={e=>{
            const newRol = e.target.value;
            const updates = { ...form, rol: newRol };
            if (newRol === 'admin') {
              const todosPermisos = {} as Record<string, boolean>;
              PERMISOS.forEach(p=> { todosPermisos[p.key] = true; });
              updates.permisos = todosPermisos;
            }
            setForm(updates);
          }}
          style={{ marginTop: 12 }}>
          <MenuItem value="admin">Administrador</MenuItem>
          <MenuItem value="supervision">Supervisión</MenuItem>
          <MenuItem value="usuario">Usuario</MenuItem>
        </Select>

        <h4 style={{ marginTop: 16 }}>Permisos</h4>
        {PERMISOS.map(p=>(
          <FormControlLabel key={p.key}
            control={<Checkbox checked={!!form.permisos?.[p.key]} onChange={()=>togglePermiso(p.key)} />}
            label={p.label}
          />
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={onSave}>
          {isEdit ? 'Guardar' : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}