export type EstadoColaborador = 'Activo' | 'Inactivo';
export type EstadoVacacion = 'Aprobada' | 'Pendiente';
export type EstadoPonche = 'Completo' | 'Tardío' | 'Ausente';

export type RrhhTab = 'colaboradores' | 'vacaciones' | 'ponche';

export interface ColaboradorMock {
  id: string;
  /** id de ficha RH; si falta, se asume igual a id (mock/legacy). */
  colaboradorId?: string | null;
  usuarioAppId?: string | null;
  soloUsuario?: boolean;
  nombre: string;
  iniciales: string;
  departamento: string;
  cargo: string;
  correo: string;
  estado: EstadoColaborador;
  /** Clase Tailwind del avatar (sin estilos inline). */
  avatarClass: string;
}

export interface VacacionMock {
  id: string;
  colaborador: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  estado: EstadoVacacion;
}

export interface PoncheMock {
  id: string;
  fecha: string;
  colaborador: string;
  horaEntrada: string | null;
  horaSalida: string | null;
  estado: EstadoPonche;
}

export const COLABORADORES_MOCK: ColaboradorMock[] = [
  {
    id: '1',
    nombre: 'Ana Martínez',
    iniciales: 'AM',
    departamento: 'Administración',
    cargo: 'Analista de RRHH',
    correo: 'ana.martinez@empresa.com',
    estado: 'Activo',
    avatarClass: 'bg-blue-600',
  },
  {
    id: '2',
    nombre: 'Carlos Pérez',
    iniciales: 'CP',
    departamento: 'Operaciones',
    cargo: 'Supervisor de Obra',
    correo: 'carlos.perez@empresa.com',
    estado: 'Activo',
    avatarClass: 'bg-blue-600',
  },
  {
    id: '3',
    nombre: 'Laura Gómez',
    iniciales: 'LG',
    departamento: 'Finanzas',
    cargo: 'Contadora',
    correo: 'laura.gomez@empresa.com',
    estado: 'Activo',
    avatarClass: 'bg-violet-500',
  },
  {
    id: '4',
    nombre: 'Miguel Santos',
    iniciales: 'MS',
    departamento: 'Tecnología',
    cargo: 'Desarrollador',
    correo: 'miguel.santos@empresa.com',
    estado: 'Inactivo',
    avatarClass: 'bg-slate-500',
  },
  {
    id: '5',
    nombre: 'Patricia Ruiz',
    iniciales: 'PR',
    departamento: 'Administración',
    cargo: 'Asistente administrativa',
    correo: 'patricia.ruiz@empresa.com',
    estado: 'Activo',
    avatarClass: 'bg-teal-500',
  },
  {
    id: '6',
    nombre: 'José Ramírez',
    iniciales: 'JR',
    departamento: 'Operaciones',
    cargo: 'Coordinador de campo',
    correo: 'jose.ramirez@empresa.com',
    estado: 'Activo',
    avatarClass: 'bg-amber-500',
  },
  {
    id: '7',
    nombre: 'Elena Castillo',
    iniciales: 'EC',
    departamento: 'Legal',
    cargo: 'Abogada corporativa',
    correo: 'elena.castillo@empresa.com',
    estado: 'Inactivo',
    avatarClass: 'bg-rose-500',
  },
  {
    id: '8',
    nombre: 'David Núñez',
    iniciales: 'DN',
    departamento: 'Tecnología',
    cargo: 'Analista de sistemas',
    correo: 'david.nunez@empresa.com',
    estado: 'Activo',
    avatarClass: 'bg-emerald-500',
  },
];

export const VACACIONES_MOCK: VacacionMock[] = [
  {
    id: '1',
    colaborador: 'Ana Martínez',
    fechaInicio: '2026-09-15',
    fechaFin: '2026-09-19',
    dias: 5,
    estado: 'Aprobada',
  },
  {
    id: '2',
    colaborador: 'Carlos Pérez',
    fechaInicio: '2026-09-22',
    fechaFin: '2026-09-26',
    dias: 5,
    estado: 'Pendiente',
  },
  {
    id: '3',
    colaborador: 'Laura Gómez',
    fechaInicio: '2026-10-01',
    fechaFin: '2026-10-03',
    dias: 3,
    estado: 'Aprobada',
  },
  {
    id: '4',
    colaborador: 'Patricia Ruiz',
    fechaInicio: '2026-10-06',
    fechaFin: '2026-10-10',
    dias: 5,
    estado: 'Pendiente',
  },
  {
    id: '5',
    colaborador: 'José Ramírez',
    fechaInicio: '2026-10-13',
    fechaFin: '2026-10-17',
    dias: 5,
    estado: 'Aprobada',
  },
];

export const PONCHE_MOCK: PoncheMock[] = [
  {
    id: '1',
    fecha: '2026-09-08',
    colaborador: 'Ana Martínez',
    horaEntrada: '08:02',
    horaSalida: '17:05',
    estado: 'Completo',
  },
  {
    id: '2',
    fecha: '2026-09-08',
    colaborador: 'Carlos Pérez',
    horaEntrada: '08:28',
    horaSalida: '17:10',
    estado: 'Tardío',
  },
  {
    id: '3',
    fecha: '2026-09-08',
    colaborador: 'Laura Gómez',
    horaEntrada: '07:58',
    horaSalida: '17:00',
    estado: 'Completo',
  },
  {
    id: '4',
    fecha: '2026-09-08',
    colaborador: 'Miguel Santos',
    horaEntrada: null,
    horaSalida: null,
    estado: 'Ausente',
  },
  {
    id: '5',
    fecha: '2026-09-08',
    colaborador: 'Patricia Ruiz',
    horaEntrada: '08:00',
    horaSalida: '17:02',
    estado: 'Completo',
  },
  {
    id: '6',
    fecha: '2026-09-08',
    colaborador: 'José Ramírez',
    horaEntrada: '08:05',
    horaSalida: '17:15',
    estado: 'Completo',
  },
  {
    id: '7',
    fecha: '2026-09-07',
    colaborador: 'Elena Castillo',
    horaEntrada: null,
    horaSalida: null,
    estado: 'Ausente',
  },
  {
    id: '8',
    fecha: '2026-09-07',
    colaborador: 'David Núñez',
    horaEntrada: '08:35',
    horaSalida: '17:20',
    estado: 'Tardío',
  },
];

export const DEPARTAMENTOS = [
  'Todos',
  'Administración',
  'Operaciones',
  'Finanzas',
  'Tecnología',
  'Legal',
] as const;
