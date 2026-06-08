import React, { useState } from 'react';
import { motion } from 'motion/react';
import { KeyRound, Eye, EyeOff } from '../lib/icons';
import { loginWithPassword } from '../lib/session';

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
    <div className="min-h-screen bg-[#0f1013] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary/6 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 w-full max-w-[420px]"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/40 mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <h1 className="text-white font-black text-xl uppercase tracking-widest italic">
            Stihl Motors
          </h1>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mt-1">
            Sistema de Gestión
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
          <h2 className="text-white font-black text-2xl italic uppercase tracking-tight mb-1">
            Bienvenido
          </h2>
          <p className="text-gray-500 text-xs font-semibold mb-7">
            Acceso exclusivo para personal autorizado
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@stihlmotors.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl text-sm font-semibold outline-none transition-all
                           bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-gray-600
                           focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:bg-white/[0.08]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
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
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm font-semibold outline-none transition-all
                             bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-gray-600
                             focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:bg-white/[0.08]"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest
                         shadow-lg shadow-primary/30 hover:brightness-110 active:scale-[0.98] transition-all
                         disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
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
        </div>

        <p className="mt-6 text-[10px] text-gray-600 font-bold uppercase tracking-widest text-center">
          Credenciales gestionadas por administración
        </p>
      </motion.div>
    </div>
  );
}
