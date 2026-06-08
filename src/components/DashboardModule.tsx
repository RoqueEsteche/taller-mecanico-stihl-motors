import React, { useState, useEffect } from 'react';
import { ShoppingCart, Wrench, AlertTriangle, Users, ClipboardList, Package, ArrowRight, TrendingUp } from '../lib/icons';
import { apiRequest } from '../lib/session';
import { toast } from '../lib/toast';
import { WorkOrder, Part } from '../types';
import { toDateValue, statusLabel, getStatusStyle } from '../lib/utils';

export default function DashboardModule() {
  const [stats, setStats] = useState({ sales: 0, orders: 0, stockAlerts: 0, clients: 0 });
  const [recentOrders, setRecentOrders] = useState<WorkOrder[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Part[]>([]);
  const [directSalesToday, setDirectSalesToday] = useState(0);
  const [deliveredOrdersToday, setDeliveredOrdersToday] = useState(0);
  const [orderStatusSummary, setOrderStatusSummary] = useState({ pending: 0, in_progress: 0, awaiting_parts: 0, finished: 0 });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
      .catch((error) => {
        toast(error instanceof Error ? error.message : 'No se pudo cargar el dashboard.', 'error');
      })
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-sidebar-bg italic tracking-tight uppercase">Resumen Diario</h1>
          {lastUpdated && (
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
              Actualizado a las {lastUpdated.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <button
          onClick={loadDashboard}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-xs font-black uppercase italic text-gray-500 hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
        >
          <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Caja del Día (Facturado)', value: `₲ ${stats.sales.toLocaleString()}`, trend: 'Ventas directas', color: 'text-primary', bg: 'bg-orange-50' },
          { label: 'OTs en Taller', value: stats.orders.toString(), trend: 'Pendientes / En Curso', color: 'text-sidebar-bg', bg: 'bg-blue-50' },
          { label: 'Stock Crítico', value: stats.stockAlerts.toString(), trend: 'Artículos por reponer', color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Clientes Registrados', value: stats.clients.toString(), trend: 'Base de clientes', color: 'text-sidebar-bg', bg: 'bg-gray-100' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <div className={`${stat.bg} p-2.5 rounded-xl`}>
                {i === 0 ? <ShoppingCart className={`w-5 h-5 ${stat.color}`} /> : 
                 i === 1 ? <Wrench className={`w-5 h-5 ${stat.color}`} /> :
                 i === 2 ? <AlertTriangle className={`w-5 h-5 ${stat.color}`} /> :
                 <Users className={`w-5 h-5 ${stat.color}`} />}
              </div>
              <span className={`text-[9px] font-black italic uppercase ${stat.color}`}>{stat.trend}</span>
            </div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</div>
            <div className={`text-2xl font-black ${stat.color} tracking-tight italic`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
            <h2 className="font-black text-xs uppercase tracking-widest text-sidebar-bg italic flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" /> Monitoreo de Recepción (OTs Recientes)
            </h2>
          </div>
          <div className="flex-1">
            {recentOrders.length === 0 ? (
              <div className="h-full py-20 flex flex-col items-center justify-center text-gray-400 italic text-sm">
                <ClipboardList className="w-12 h-12 mb-4 opacity-10" />
                <p>No hay órdenes registradas aún</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentOrders.map((order) => (
                  <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sidebar-bg font-black italic border-2 border-white shadow-sm">
                        {order.clientName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-black text-sidebar-bg uppercase italic leading-tight">{order.clientName}</p>
                        <p className="text-[10px] font-bold text-gray-400">OT N° {order.orderNumber?.toString().padStart(5, '0')} - {order.machineName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase italic border ${getStatusStyle(order.status)}`}>
                          {statusLabel(order.status)}
                        </p>
                        <p className="text-[9px] font-bold text-gray-400 mt-1">{toDateValue(order.createdAt)?.toLocaleTimeString() || 'Sin hora'}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-200 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-black text-xs uppercase tracking-widest text-sidebar-bg italic mb-6 border-b border-gray-50 pb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Alertas de Reabastecimiento
            </h3>
            <div className="space-y-3">
              {lowStockItems.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">✓</div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Inventario Óptimo</p>
                </div>
              ) : lowStockItems.map(item => (
                <div key={item.id} className="p-3 bg-red-50 rounded-xl border border-red-100/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-red-600 shadow-sm">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-red-900 uppercase italic leading-tight truncate max-w-[120px]">{item.description}</p>
                      <p className="text-[9px] font-bold text-red-700">Stock Actual: {item.stock}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-red-600 italic">Pedido Sugerido</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#1A1C1E] rounded-2xl shadow-xl p-6 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/30 transition-all" />
            <h3 className="text-[10px] font-black mb-6 text-gray-400 uppercase tracking-widest italic flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Rendimiento de Taller
            </h3>
            <div className="space-y-3 mb-6">
              {[
                { label: 'Pendientes', value: orderStatusSummary.pending, accent: 'bg-orange-400' },
                { label: 'En taller', value: orderStatusSummary.in_progress, accent: 'bg-sky-400' },
                { label: 'Esperando repuestos', value: orderStatusSummary.awaiting_parts, accent: 'bg-amber-300' },
                { label: 'Terminadas', value: orderStatusSummary.finished, accent: 'bg-emerald-400' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.accent}`} />
                  <div className="flex-1 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-gray-200">
                    <span>{item.label}</span>
                    <span className="text-white">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-800/50 pt-4 grid grid-cols-2 gap-3 text-[9px] font-black uppercase tracking-[0.16em]">
              <div>
                <p className="text-gray-500">Venta directa hoy</p>
                <p className="text-white mt-1">₲ {directSalesToday.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500">OT cobradas hoy</p>
                <p className="text-white mt-1">₲ {deliveredOrdersToday.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

