import axios, { AxiosInstance } from 'axios';

const baseURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

const authClient: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'mantenimientos_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export interface User {
  id: string;
  nombre: string;
  apellido: string;
  nombre_usuario: string;
  cargo?: string | null;
  area?: string | null;
  permisos: string[];
}

export interface LoginResponse {
  token: string;
  user: User;
}

export const authAPI = {
  async login(nombre_usuario: string, password: string): Promise<LoginResponse> {
    const { data } = await authClient.post<LoginResponse>('/api/auth/login', {
      nombre_usuario: nombre_usuario.trim(),
      password,
    });
    return data;
  },

  async me(): Promise<{ user: User }> {
    const token = getStoredToken();
    if (!token) throw new Error('No token');
    const { data } = await authClient.get<{ user: User }>('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  },

  listUsers(): Promise<{ data: (User & { activo?: boolean; created_at?: string; updated_at?: string })[] }> {
    const token = getStoredToken();
    if (!token) throw new Error('No token');
    return authClient.get('/api/users', {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.data);
  },

  createUser(body: {
    nombre: string;
    apellido: string;
    nombre_usuario: string;
    password: string;
    cargo?: string;
    area?: string;
    permisos?: string[];
  }): Promise<{ data: User }> {
    const token = getStoredToken();
    if (!token) throw new Error('No token');
    return authClient
      .post('/api/users', body, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.data);
  },

  updateUser(
    id: string,
    body: Partial<{
      nombre: string;
      apellido: string;
      nombre_usuario: string;
      cargo: string;
      area: string;
      permisos: string[];
      activo: boolean;
      password: string;
    }>
  ): Promise<{ data: User }> {
    const token = getStoredToken();
    if (!token) throw new Error('No token');
    return authClient
      .put(`/api/users/${id}`, body, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.data);
  },

  deleteUser(id: string): Promise<{ success: boolean }> {
    const token = getStoredToken();
    if (!token) throw new Error('No token');
    return authClient
      .delete(`/api/users/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.data);
  },
};
