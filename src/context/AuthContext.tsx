import { createContext, useContext, useState, useCallback } from 'react';

const STORAGE_KEY = 'sepri_user';

const readStoredUser = (): any => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? normalizeUser(JSON.parse(s)) : null;
  } catch {
    return null;
  }
};

/** Normaliza rol y permisos (jsonb a veces llega como string). */
export function normalizeUser(usuario: any) {
  if (!usuario) return null;
  let permisos = usuario.permisos;
  if (typeof permisos === 'string') {
    try {
      permisos = JSON.parse(permisos);
    } catch {
      permisos = {};
    }
  }
  return {
    ...usuario,
    rol: String(usuario.rol || '').trim().toLowerCase(),
    permisos: permisos && typeof permisos === 'object' ? permisos : {},
  };
}

const saveUser = (usuario: any) => {
  try {
    if (!usuario) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const normalized = normalizeUser(usuario);
    const { password, ...rest } = normalized;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
};

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<any>(() => readStoredUser());

  const login = useCallback((usuario: any) => {
    const normalized = normalizeUser(usuario);
    saveUser(normalized);
    setUser(normalized);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const hasPermission = (permiso: string) => {
    if (!user) return false;
    const rol = String(user.rol || '').toLowerCase();
    if (rol === 'admin' || rol === 'supervision') return true;
    return !!user.permisos?.[permiso];
  };

  return (
    <AuthContext.Provider value={{ user, loading: false, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);