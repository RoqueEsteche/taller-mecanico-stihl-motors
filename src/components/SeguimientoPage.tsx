import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ClipboardList, CheckCircle, Wrench, Package, AlertTriangle } from '../lib/icons';
import { statusLabel, getStatusStyle, toDateValue } from '../lib/utils';

interface TrackOrder {
  orderNumber: number;
  status: string;
  machineName: string;
  machineModel: string;
  brand: string;
  description: string;
  findings: string;
  createdAt: string;
  finishedAt: string | null;
}

interface TrackResult {
  client: { name: string; ci: string; phone: string } | null;
  orders: TrackOrder[];
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending:        <ClipboardList className="w-5 h-5" />,
  in_progress:    <Wrench className="w-5 h-5" />,
  awaiting_parts: <Package className="w-5 h-5" />,
  finished:       <CheckCircle className="w-5 h-5" />,
  delivered:      <CheckCircle className="w-5 h-5" />,
  cancelled:      <AlertTriangle className="w-5 h-5" />,
};

const API = (import.meta as any).env?.VITE_API_URL || '';

export default function SeguimientoPage() {
  const [ci, setCi] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState('');

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = ci.trim();
    if (q.length < 3) { setError('Ingresá al menos 3 caracteres.'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`${API}/api/public/seguimiento?ci=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al buscar.');
      setResult(data);
      if (!data.client) setError('No se encontró ningún cliente con ese CI o RUC.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F3F5] flex flex-col">
      {/* Header */}
      <header className="bg-[#1A1C1E] py-4 px-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded flex items-center justify-center font-black text-white italic text-sm">S</div>
        <div>
          <p className="text-white font-black uppercase italic text-sm tracking-tight">Stihl Motors</p>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Seguimiento de equipo</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-10 max-w-lg">
          <h1 className="text-3xl font-black uppercase italic tracking-tight text-[#1A1C1E] leading-tight">
            ¿En qué etapa está<br />tu equipo?
          </h1>
          <p className="text-gray-500 mt-3 text-sm font-medium">
            Ingresá tu CI o RUC y consultá el estado de tu reparación en tiempo real.
          </p>
        </div>

        {/* Buscador */}
        <form onSubmit={search} className="w-full max-w-md mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={ci}
                onChange={e => setCi(e.target.value)}
                placeholder="Ej: 1234567 o 80000000-1"
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-3 bg-primary text-white rounded-xl font-black text-sm uppercase italic tracking-wide shadow-lg shadow-orange-100 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? '...' : 'Buscar'}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-500 font-semibold text-center">{error}</p>}
        </form>

        {/* Resultados */}
        <AnimatePresence>
          {result?.client && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-xl space-y-4"
            >
              {/* Cliente */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Cliente encontrado</p>
                <p className="font-black text-[#1A1C1E] uppercase italic text-lg">{result.client.name}</p>
                <p className="text-xs text-gray-500 font-mono">{result.client.ci}{result.client.phone ? ` · ${result.client.phone}` : ''}</p>
              </div>

              {/* Órdenes */}
              {result.orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-10 text-center">
                  <p className="text-gray-400 text-sm italic">No hay órdenes de servicio registradas.</p>
                </div>
              ) : (
                result.orders.map(order => (
                  <div key={order.orderNumber} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Estado */}
                    <div className={`px-5 py-3 flex items-center justify-between ${getStatusStyle(order.status)} border-b`}>
                      <div className="flex items-center gap-2">
                        {STATUS_ICON[order.status]}
                        <span className="font-black text-sm uppercase tracking-wide">{statusLabel(order.status)}</span>
                      </div>
                      <span className="font-mono text-xs font-bold opacity-70">OT #{String(order.orderNumber).padStart(5, '0')}</span>
                    </div>

                    {/* Info */}
                    <div className="px-5 py-4 space-y-2">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Equipo</p>
                        <p className="font-black text-[#1A1C1E] uppercase italic">{order.brand} {order.machineName} {order.machineModel}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Falla reportada</p>
                        <p className="text-sm text-gray-600 italic">"{order.description}"</p>
                      </div>
                      {order.findings && (
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Diagnóstico técnico</p>
                          <p className="text-sm text-gray-700 font-medium">{order.findings}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                        <p className="text-[10px] text-gray-400 font-bold">
                          Ingreso: {toDateValue(order.createdAt)?.toLocaleDateString('es-PY') ?? '—'}
                        </p>
                        {order.finishedAt && (
                          <p className="text-[10px] text-green-600 font-bold">
                            Finalizado: {toDateValue(order.finishedAt)?.toLocaleDateString('es-PY') ?? '—'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="text-center py-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
        Stihl Motors · Sistema de gestión de taller
      </footer>
    </div>
  );
}
