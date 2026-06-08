import React, { useState } from 'react';
import { motion } from 'motion/react';
import { KeyRound, Wrench, Eye, EyeOff } from '../lib/icons';
import { loginWithPassword } from '../lib/session';

const FEATURES = ['Órdenes de Trabajo', 'Control de Stock', 'Punto de Venta', 'Reportes'];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await loginWithPassword(email.trim().toLowerCase(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Panel izquierdo — branding ── */}
      <div className="hidden lg:flex lg:w-[42%] bg-[#1a1a1a] flex-col justify-between p-14 relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-primary/5 pointer-events-none" />
        <div className="absolute -right-8 bottom-20 w-48 h-48 rounded-full bg-primary/5 pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <span className="text-white/60 font-black text-[11px] uppercase tracking-[0.2em] italic">
            Sistema de Gestión
          </span>
        </div>

        {/* Título */}
        <div className="relative z-10">
          <p className="text-primary text-[11px] font-black uppercase tracking-[0.3em] mb-4">
            Taller Mecánico
          </p>
          <h1 className="text-[2.6rem] font-black text-white italic uppercase leading-[1.05] tracking-tighter mb-5">
            Control<br/>Total de<br/>tu Taller
          </h1>
          <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-xs">
            Gestión integral de reparaciones, inventario, ventas y personal técnico.
          </p>
        </div>

        {/* Feature pills */}
        <div className="grid grid-cols-2 gap-2.5 relative z-10">
          {FEATURES.map(f => (
            <div key={f} className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3.5 py-2.5">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{f}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Panel derecho — formulario ── */}
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex items-center justify-center bg-white p-8"
      >
        <div className="w-full max-w-[340px]">
          {/* Logo móvil */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-[#1a1a1a] rounded-xl flex items-center justify-center">
              <Wrench className="w-4 h-4 text-primary" />
            </div>
            <span className="font-black text-[#1a1a1a] text-xs uppercase tracking-widest italic">
              Gestión de Taller
            </span>
          </div>

          <h2 className="text-2xl font-black text-[#1a1a1a] italic uppercase tracking-tighter mb-1">
            Bienvenido
          </h2>
          <p className="text-gray-400 text-[11px] font-semibold mb-8">
            Acceso exclusivo para personal autorizado
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold outline-none bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-gray-300"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl text-sm font-semibold outline-none bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-[11px] font-bold text-red-600">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md shadow-orange-100 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  Ingresar al sistema
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-[10px] text-gray-300 font-bold uppercase tracking-widest text-center">
            Credenciales gestionadas por administración
          </p>
        </div>
      </motion.div>
    </div>
  );
}
