import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from 'recharts';
import { motion } from 'motion/react';
import { TrendingUp, DollarSign, Package, Wrench, FileSpreadsheet, FileText, XCircle } from '../lib/icons';
import { apiRequest } from '../lib/session';
import { toast } from '../lib/toast';
import { Sale, WorkOrder, Part } from '../types';
import { toDateValue } from '../lib/utils';
import * as XLSX from 'xlsx';

export default function ReportsModule() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelSale, setCancelSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelAuth, setCancelAuth] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [warranties, setWarranties] = useState<{
    summary: { warranty_type: string; total: number }[];
    byMechanic: { mechanic_name: string; total: number }[];
    recent: { order_number: number; client_name: string; machine_name: string; machine_model: string; status: string; warranty_notes: string; mechanic_name: string; created_at: string }[];
    thisMonth: number;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest<{ sales: Sale[]; orders: WorkOrder[]; parts: Part[] }>('/api/reports'),
      apiRequest<typeof warranties>('/api/reports/warranties').catch(() => null),
    ])
      .then(([data, wData]) => {
        setSales(data.sales);
        setOrders(data.orders);
        setParts(data.parts);
        setWarranties(wData);
      })
      .catch((error) => {
        toast(error instanceof Error ? error.message : 'No se pudieron cargar los reportes.', 'error');
      })
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0) + orders.filter(o => o.status === 'delivered').reduce((acc, o) => acc + o.total, 0);
  const totalSalesCount = sales.length + orders.filter(o => o.status === 'delivered').length;
  const totalStockUnits = parts.reduce((acc, part) => acc + Number(part.stock || 0), 0);
  
  // Aggregate sales by day for chart
  const getSalesHistory = () => {
    const history: { [key: string]: number } = {};
    [...sales, ...orders.filter(o => o.status === 'delivered')].forEach(item => {
      const date = toDateValue(item.createdAt)?.toLocaleDateString() || 'Sin fecha';
      history[date] = (history[date] || 0) + item.total;
    });
    return Object.entries(history).map(([name, total]) => ({ name, total })).slice(-7);
  };

  // Top Products
  const getTopProducts = () => {
    const counts: { [key: string]: number } = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        counts[item.description] = (counts[item.description] || 0) + item.quantity;
      });
    });

    orders
      .filter(order => order.status !== 'cancelled')
      .forEach((order) => {
        (order.parts || []).forEach((part) => {
          counts[part.description] = (counts[part.description] || 0) + part.quantity;
        });
      });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  const getTopServices = () => {
    const services: Record<string, { value: number; revenue: number }> = {};

    orders
      .filter((order) => order.status === 'finished' || order.status === 'delivered')
      .forEach((order) => {
        const serviceName = `${order.machineName} ${order.machineModel}`.trim();
        if (!services[serviceName]) {
          services[serviceName] = { value: 0, revenue: 0 };
        }
        services[serviceName].value += 1;
        services[serviceName].revenue += Number(order.total || 0);
      });

    return Object.entries(services)
      .map(([name, data]) => ({ name, value: data.value, revenue: data.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  // Mechanic Productivity
  const getMechanicProductivity = () => {
    const counts: { [key: string]: number } = {};
    orders.filter(order => order.status === 'finished' || order.status === 'delivered').forEach(order => {
      if (order.mechanicName) {
        counts[order.mechanicName] = (counts[order.mechanicName] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const exportToExcel = () => {
    const salesData = sales.map(s => ({
      Fecha: toDateValue(s.createdAt)?.toLocaleString() || 'Sin fecha',
      Cliente: s.clientName,
      Descuento: s.discount,
      AutorizadoPor: s.discountAuthorizedBy || '',
      Total: s.total,
      Tipo: 'Venta Directa'
    }));

    const servicesData = orders.map(order => ({
      Fecha: toDateValue(order.createdAt)?.toLocaleString() || 'Sin fecha',
      Orden: order.orderNumber,
      Cliente: order.clientName,
      Equipo: `${order.machineName} ${order.machineModel}`.trim(),
      Estado: order.status,
      ManoDeObra: order.laborCost,
      Repuestos: order.partsCost,
      Total: order.total,
      Anulacion: order.cancellationReason || '',
      AutorizadoPor: order.cancellationAuthorizedBy || '',
    }));

    const salesSheet = XLSX.utils.json_to_sheet(salesData);
    const servicesSheet = XLSX.utils.json_to_sheet(servicesData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, salesSheet, "Ventas");
    XLSX.utils.book_append_sheet(workbook, servicesSheet, "Servicios");
    XLSX.writeFile(workbook, "Reporte_Stihl_Motors.xlsx");
  };

  const COLORS = ['#FF6B00', '#1A1D24', '#4B5563', '#9CA3AF', '#E5E7EB'];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-sidebar-bg italic tracking-tight uppercase">Dashboard Gerencial</h1>
          <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">Análisis de rendimiento Stihl Motors</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportToExcel} className="flex items-center gap-2 bg-white border border-gray-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-widest hover:bg-gray-50 transition-all shadow-sm">
            <FileSpreadsheet className="w-4 h-4 text-green-600" /> Exportar Excel
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-10 text-center text-gray-400 italic text-sm">Preparando métricas...</div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { label: 'Facturación Total', value: `₲ ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Ventas Realizadas', value: totalSalesCount, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Órdenes Activas', value: orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length, icon: Wrench, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'Repuestos en Stock', value: totalStockUnits.toLocaleString(), icon: Package, color: 'text-purple-500', bg: 'bg-purple-50' },
        ].map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-2xl font-black text-sidebar-bg italic tracking-tighter">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Sales Trend */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-xs font-black text-sidebar-bg uppercase italic mb-8 border-b pb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Tendencia de Ventas (Últimos 7 días)
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getSalesHistory()}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                <YAxis fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="total" stroke="#FF6B00" strokeWidth={4} dot={{ r: 4, fill: '#FF6B00' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Parts */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-xs font-black text-sidebar-bg uppercase italic mb-8 border-b pb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" /> Repuestos con Mayor Rotación
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getTopProducts()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} fontSize={9} fontWeight="black" axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {getTopProducts().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Productivity */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-xs font-black text-sidebar-bg uppercase italic mb-8 border-b pb-4 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" /> Productividad por Mecánico (OTs finalizadas)
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getMechanicProductivity()}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                <YAxis fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#1A1D24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-xs font-black text-sidebar-bg uppercase italic mb-8 border-b pb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> Servicios más rentables
          </h3>
          <div className="space-y-3">
            {getTopServices().length === 0 ? (
              <div className="text-sm text-gray-400 italic">Aún no hay servicios cerrados para analizar.</div>
            ) : getTopServices().map((service, index) => (
              <div key={service.name} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.15em]">Top {index + 1}</p>
                  <p className="text-sm font-black text-sidebar-bg italic uppercase leading-tight">{service.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{service.value} órdenes cerradas</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-sidebar-bg italic">₲ {service.revenue.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Facturado</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* ── Sección de Garantías ─────────────────────────────────────────────── */}
      {warranties && (
        <div className="space-y-4">
          <h2 className="text-xs font-black text-sidebar-bg uppercase italic tracking-widest flex items-center gap-2">
            🔁 Control de Garantías
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Garantías este mes</p>
              <p className="text-4xl font-black text-primary italic mt-1">{warranties.thisMonth}</p>
            </div>
            {warranties.summary.map(s => (
              <div key={s.warranty_type} className={`border rounded-2xl p-5 shadow-sm ${s.warranty_type === 'warranty' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{s.warranty_type === 'warranty' ? 'Garantía de taller' : 'Reingreso usuario'}</p>
                <p className={`text-4xl font-black italic mt-1 ${s.warranty_type === 'warranty' ? 'text-green-700' : 'text-orange-600'}`}>{s.total}</p>
                <p className="text-[10px] text-gray-400 mt-1">órdenes totales</p>
              </div>
            ))}
          </div>
          {warranties.byMechanic.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <p className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-50">Garantías por mecánico</p>
              <div className="divide-y divide-gray-50">
                {warranties.byMechanic.map(m => (
                  <div key={m.mechanic_name} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm font-bold text-sidebar-bg uppercase italic">{m.mechanic_name}</span>
                    <span className="text-xs font-black text-primary">{m.total} OT</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {warranties.recent.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <p className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-50">Últimas garantías / reingresos</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[600px]">
                  <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-5 py-2.5">OT</th>
                      <th className="px-5 py-2.5">Cliente / Equipo</th>
                      <th className="px-5 py-2.5">Tipo</th>
                      <th className="px-5 py-2.5">Mecánico</th>
                      <th className="px-5 py-2.5">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {warranties.recent.map(r => (
                      <tr key={r.order_number} className="hover:bg-gray-50/60">
                        <td className="px-5 py-3 font-mono text-primary font-black">#{String(r.order_number).padStart(5,'0')}</td>
                        <td className="px-5 py-3">
                          <p className="font-black text-sidebar-bg uppercase italic text-xs">{r.client_name}</p>
                          <p className="text-[10px] text-gray-500">{r.machine_name} {r.machine_model}</p>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${r.status === 'warranty' || r.status === 'warranty_type' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {r.warranty_notes || (r.status === 'warranty' ? 'Garantía' : 'Reingreso')}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[11px] font-semibold text-gray-600">{r.mechanic_name || '—'}</td>
                        <td className="px-5 py-3 text-[11px] text-gray-500">{toDateValue(r.created_at)?.toLocaleDateString('es-PY') ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Direct Sales Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-black text-sidebar-bg uppercase italic flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Ventas Directas
          </h3>
        </div>
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <th className="px-6 py-3">Fecha</th>
              <th className="px-6 py-3">Cliente</th>
              <th className="px-6 py-3">Descuento</th>
              <th className="px-6 py-3 text-right">Total</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sales.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic text-xs">Sin ventas directas registradas.</td></tr>
            ) : sales.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-3 text-[11px] font-bold text-gray-500">{toDateValue(s.createdAt)?.toLocaleDateString('es-PY') || '—'}</td>
                <td className="px-6 py-3 text-[11px] font-black italic text-sidebar-bg uppercase">{s.clientName || 'Consumidor Final'}</td>
                <td className="px-6 py-3 text-[11px] text-gray-500">{s.discount ? `${s.discount}%` : '—'}</td>
                <td className="px-6 py-3 text-right font-black text-primary italic">₲ {Number(s.total).toLocaleString()}</td>
                <td className="px-6 py-3 text-right">
                  <button
                    onClick={() => { setCancelSale(s); setCancelReason(''); setCancelAuth(''); }}
                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                    title="Anular venta"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cancelSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setCancelSale(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-0.5">Anular Venta</p>
                <h2 className="text-lg font-black text-sidebar-bg italic uppercase">₲ {Number(cancelSale.total).toLocaleString()}</h2>
                <p className="text-[10px] text-gray-400 font-bold">{cancelSale.clientName || 'Consumidor Final'}</p>
              </div>
              <button onClick={() => setCancelSale(null)} className="text-gray-400 hover:text-primary"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-red-500 uppercase">Motivo de anulación *</label>
                <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="w-full px-4 py-2 border rounded-xl text-sm font-medium focus:ring-1 focus:ring-red-400 outline-none" placeholder="Ej: Error en precio, devolucion..." />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-red-500 uppercase">Autorizado por *</label>
                <input value={cancelAuth} onChange={(e) => setCancelAuth(e.target.value)} className="w-full px-4 py-2 border rounded-xl text-sm font-medium focus:ring-1 focus:ring-red-400 outline-none" placeholder="Nombre del autorizante" />
              </div>
              <div className="bg-red-50 rounded-xl px-4 py-3">
                <p className="text-[10px] font-black text-red-600 uppercase tracking-wide">Esta acción restaura el stock y elimina la venta permanentemente.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setCancelSale(null)} className="flex-1 px-4 py-3 border rounded-xl text-[10px] font-black uppercase italic tracking-widest">Cancelar</button>
                <button
                  disabled={cancelLoading || !cancelReason.trim() || !cancelAuth.trim()}
                  onClick={async () => {
                    setCancelLoading(true);
                    try {
                      await apiRequest(`/api/sales/${cancelSale.id}`, { method: 'DELETE', body: JSON.stringify({ reason: cancelReason, authorizedBy: cancelAuth }) });
                      setSales((prev) => prev.filter((s) => s.id !== cancelSale.id));
                      toast('Venta anulada correctamente.', 'success');
                      setCancelSale(null);
                    } catch (err) {
                      toast(err instanceof Error ? err.message : 'Error al anular venta', 'error');
                    } finally {
                      setCancelLoading(false);
                    }
                  }}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black text-[10px] uppercase italic tracking-widest disabled:opacity-50"
                >
                  {cancelLoading ? 'Anulando...' : 'Confirmar Anulación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
