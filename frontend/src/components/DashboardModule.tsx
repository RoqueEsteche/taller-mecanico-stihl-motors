import React, { useState, useEffect } from 'react';
import { ShoppingCart, Wrench, AlertTriangle, Users, ClipboardList, Package, TrendingUp } from '../lib/icons';
import { apiRequest } from '../lib/session';
import { toast } from '../lib/toast';
import { WorkOrder, Part } from '../types';
import { toDateValue, statusLabel, getStatusStyle } from '../lib/utils';

export default function DashboardModule() {
  const [stats, setStats]                       = useState({ sales: 0, orders: 0, stockAlerts: 0, clients: 0 });
  const [recentOrders, setRecentOrders]         = useState<WorkOrder[]>([]);
  const [lowStockItems, setLowStockItems]       = useState<Part[]>([]);
  const [directSalesToday, setDirectSalesToday] = useState(0);
  const [deliveredOrdersToday, setDeliveredOrdersToday] = useState(0);
  const [orderStatusSummary, setOrderStatusSummary] = useState({ pending: 0, in_progress: 0, awaiting_parts: 0, finished: 0 });
  const [lastUpdated, setLastUpdated]           = useState<Date | null>(null);
  const [refreshing, setRefreshing]             = useState(false);

  const loadDashboard = () => {
    setRefreshing(true);
    apiRequest<{
      stats: { sales: number; orders: number; stockAlerts: number; clients: number };
      recentOrders: WorkOrder[];
      lowStockItems: Part[];
      directSalesToday: number;
      deliveredOrdersToday: number;
      orderStatusSummary: { pending: number; in_progress: number; awaiting_parts: number; finished: number };
    }>('/api/dashboard')
      .then((data) => {
        setStats(data.stats);
        setRecentOrders(data.recentOrders);
        setLowStockItems(data.lowStockItems);
        setDirectSalesToday(data.directSalesToday);
        setDeliveredOrdersToday(data.deliveredOrdersToday);
        setOrderStatusSummary(data.orderStatusSummary);
        setLastUpdated(new Date());
      })
      .catch((err) => toast(err instanceof Error ? err.message : 'No se pudo cargar el dashboard.', 'error'))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => { loadDashboard(); }, []);

  const statCards = [
    {
      label: 'Caja del Día',
      sub:   'Ventas facturadas',
      value: `₲ ${stats.sales.toLocaleString()}`,
      icon:  <ShoppingCart className="w-5 h-5 text-orange-500" />,
      iconBg: 'bg-orange-50',
      valueColor: 'text-orange-500',
    },
    {
      label: 'OTs en Taller',
      sub:   'Pendientes / en curso',
      value: stats.orders.toString(),
      icon:  <Wrench className="w-5 h-5 text-blue-500" />,
      iconBg: 'bg-blue-50',
      valueColor: 'text-blue-600',
    },
    {
      label: 'Stock Crítico',
      sub:   'Artículos por reponer',
      value: stats.stockAlerts.toString(),
      icon:  <AlertTriangle className="w-5 h-5 text-red-500" />,
      iconBg: 'bg-red-50',
      valueColor: 'text-red-500',
    },
    {
      label: 'Clientes',
      sub:   'Base registrada',
      value: stats.clients.toString(),
      icon:  <Users className="w-5 h-5 text-gray-500" />,
      iconBg: 'bg-gray-100',
      valueColor: 'text-gray-700',
    },
  ];

  return (
    <div className="flex flex-col gap-6">

      {/* ── Encabezado ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-800 italic tracking-tight uppercase">
            Resumen Diario
          </h1>
          {lastUpdated && (
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Actualizado a las {lastUpdated.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={loadDashboard}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-[10px] font-black uppercase italic text-gray-500 hover:border-orange-400 hover:text-orange-500 transition-colors disabled:opacity-40 bg-white"
        >
          <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* ── Tarjetas de estadísticas ───────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className={`${card.iconBg} w-10 h-10 rounded-xl flex items-center justify-center`}>
                {card.icon}
              </div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-right leading-tight">
                {card.sub}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{card.label}</p>
              <p className={`text-2xl font-black italic tracking-tight ${card.valueColor}`}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Fila principal ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* OTs Recientes — ocupa 2/3 */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/60">
            <ClipboardList className="w-4 h-4 text-orange-500" />
            <h2 className="font-black text-[11px] uppercase tracking-widest text-gray-700 italic">
              Monitoreo de Recepción — OTs Recientes
            </h2>
          </div>

          {recentOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-gray-300">
              <ClipboardList className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-bold text-gray-400 italic">No hay órdenes registradas aún</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 flex-1">
              {recentOrders.map((order) => (
                <div key={order.id} className="px-6 py-3.5 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 font-black italic text-sm border-2 border-white shadow-sm shrink-0">
                      {order.clientName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-gray-800 uppercase italic truncate">{order.clientName}</p>
                      <p className="text-[10px] font-bold text-gray-400 truncate">
                        OT N° {order.orderNumber?.toString().padStart(5, '0')} · {order.machineName}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase italic border ${getStatusStyle(order.status)}`}>
                      {statusLabel(order.status)}
                    </span>
                    <p className="text-[9px] font-bold text-gray-400">
                      {toDateValue(order.createdAt)?.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }) || '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Columna derecha — 1/3 */}
        <div className="flex flex-col gap-5">

          {/* Alertas de reabastecimiento */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/60">
              <Package className="w-4 h-4 text-orange-500" />
              <h3 className="font-black text-[11px] uppercase tracking-widest text-gray-700 italic">
                Alertas de Reabastecimiento
              </h3>
            </div>
            <div className="p-4">
              {lowStockItems.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center gap-2">
                  <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-500 text-lg font-bold">✓</div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inventario Óptimo</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lowStockItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                        <Package className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-red-900 uppercase italic truncate">{item.description}</p>
                        <p className="text-[9px] font-bold text-red-600">Stock: {item.stock}</p>
                      </div>
                      <span className="text-[9px] font-black text-red-500 italic shrink-0">Pedir</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rendimiento de Taller */}
          <div className="bg-gray-900 rounded-2xl shadow-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <h3 className="font-black text-[11px] uppercase tracking-widest text-gray-300 italic">
                Rendimiento de Taller
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Pendientes',         value: orderStatusSummary.pending,        dot: 'bg-orange-400' },
                { label: 'En Taller',          value: orderStatusSummary.in_progress,    dot: 'bg-sky-400' },
                { label: 'Esperando Repuestos',value: orderStatusSummary.awaiting_parts, dot: 'bg-amber-300' },
                { label: 'Terminadas',         value: orderStatusSummary.finished,       dot: 'bg-emerald-400' },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${row.dot}`} />
                  <span className="flex-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{row.label}</span>
                  <span className="text-[11px] font-black text-white">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-800 px-5 py-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Venta Directa Hoy</p>
                <p className="text-sm font-black text-white mt-1">₲ {directSalesToday.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">OT Cobradas Hoy</p>
                <p className="text-sm font-black text-white mt-1">₲ {deliveredOrdersToday.toLocaleString()}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
