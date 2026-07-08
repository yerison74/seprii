import { useState } from 'react';
import { loginUsuario } from '../services/login.service';
import { useAuth } from '../context/AuthContext';
import { BTN_PRIMARY } from '../constants/buttonStyles';

const inputClass =
  'w-full px-3 py-3 mt-1.5 mb-5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 bg-white transition-all focus:outline-none focus:border-[#42A5F5]/50 focus:ring-2 focus:ring-[#42A5F5]/10';

export default function Login() {
  const { login } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await loginUsuario(usuario, password);
      login(user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Usuario o contraseña incorrectos';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/50 px-8 py-8">
        <h1 className="text-center text-2xl font-semibold text-[#42A5F5] mb-2">
          Seguimiento de Procesos Internos
        </h1>

        <p className="text-center text-sm text-slate-500 mb-8">Inicia sesión con tu usuario</p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <label className="text-sm font-medium text-slate-700">Nombre de usuario</label>
          <input
            placeholder="Ej: jperez"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className={inputClass}
          />

          <label className="text-sm font-medium text-slate-700">Contraseña</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} mb-7`}
          />

          <button type="submit" disabled={loading} className={`${BTN_PRIMARY} w-full !py-3 text-base`}>
            {loading ? 'Verificando…' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
