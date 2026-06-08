/**
 * LeadsModule.tsx
 * Panel de administración de leads/contactos del sitio web.
 *
 * Demuestra:
 *  - Fetch API con async/await desde el panel admin
 *  - Gráfico dinámico con recharts (BarChart alimentado por /api/analytics/leads)
 *  - Visualización en tiempo real de los datos del formulario de contacto
 *  - Control por rol (solo admin puede acceder)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { apiRequest } from '../lib/session';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  status: 'new' | 'contacted' | 'converted' | 'discarded';
  ip: string;
  created_at: string;
}

interface LeadMonthData {
  month: string;
  month_key: string;
  count: number;
}

interface AnalyticsSummary {
  leads: { status: string; count: number }[];
  visitors: { unique_visitors: number; total_requests: number };
  browsers: { browser: string; count: number }[];
}

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  new:       'Nuevo',
  contacted: 'Contactado',
  converted: 'Convertido',
  discarded: 'Descartado',
};

const STATUS_COLORS: Record<string, string> = {
  new:       '#FF6321',
  contacted: '#3B82F6',
  converted: '#10B981',
  discarded: '#6B7280',
};

const PIE_COLORS = ['#FF6321', '#3B82F6', '#10B981', '#6B7280'];

// ── Componente ────────────────────────────────────────────────────────────────

export default function LeadsModule() {
  const [leads, setLeads]               = useState<Lead[]>([]);
  const [chartData, setChartData]       = useState<LeadMonthData[]>([]);
  const [summary, setSummary]           = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading]           = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [updatingId, setUpdatingId]     = useState<string | null>(null);

  // ── Cargar datos ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterStatus ? `/api/leads?status=${filterStatus}` : '/api/leads';
      const [leadsData, chartRaw, summaryRaw] = await Promise.all([
        apiRequest<Lead[]>(url),
        apiRequest<LeadMonthData[]>('/api/analytics/leads'),
        apiRequest<AnalyticsSummary>('/api/analytics/summary'),
      ]);
      setLeads(leadsData);
      setChartData(chartRaw);
      setSummary(summaryRaw);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // ── Actualizar estado de un lead ──────────────────────────────────────────────
  async function updateStatus(id: string, status: Lead['status']) {
    setUpdatingId(id);
    try {
      await apiRequest(`/api/leads/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
      if (selectedLead?.id === id) setSelectedLead(prev => prev ? { ...prev, status } : prev);
    } finally {
      setUpdatingId(null);
    }
  }

  // ── Renders parciales ─────────────────────────────────────────────────────────

  const pieData = summary?.leads.map(l => ({
    name: STATUS_LABELS[l.status] || l.status,
    value: l.count,
    status: l.status,
  })) ?? [];

  const totalLeads = leads.length;
  const newLeads   = leads.filter(l => l.status === 'new').length;
  const converted  = leads.filter(l => l.status === 'converted').length;

  return (
    <div className="p-6 space-y-6">

      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tight">Leads & Contactos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Consultas recibidas desde el formulario del sitio web</p>
        </div>
        <button
          onClick={() => void fetchData()}
          className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-orange-600 transition-colors"
        >
          ↺ Actualizar
        </button>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: totalLeads, color: 'text-primary' },
          { label: 'Nuevos',      value: newLeads,   color: 'text-orange-500' },
          { label: 'Convertidos', value: converted,  color: 'text-emerald-600' },
          { label: 'Visitantes únicos (30d)', value: summary?.visitors?.unique_visitors ?? '—', color: 'text-blue-500' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{kpi.label}</p>
            <p className={`text-3xl font-black mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ── Gráficos ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gráfico de barras: leads por mes */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
            📊 Leads por mes (últimos 6 meses)
          </h2>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Sin datos de leads aún. ¡Comparte el sitio para recibir consultas!
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(val) => [val, 'Leads']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Bar dataKey="count" fill="#FF6321" radius={[4, 4, 0, 0]} name="Leads" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Gráfico de torta: leads por estado */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
            🥧 Estado de leads
          </h2>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Tabla de leads ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Lista de consultas</h2>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            Cargando leads...
          </div>
        ) : leads.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            No hay leads con este filtro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Nombre', 'Correo', 'Teléfono', 'Servicio', 'Estado', 'Fecha', 'Acciones'].map(h => (
                    <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leads.map(lead => (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-800">{lead.name}</td>
                    <td className="px-4 py-3 text-gray-600">{lead.email}</td>
                    <td className="px-4 py-3 text-gray-600">{lead.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{lead.service || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold"
                        style={{
                          background: `${STATUS_COLORS[lead.status]}20`,
                          color: STATUS_COLORS[lead.status],
                        }}
                      >
                        {STATUS_LABELS[lead.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString('es-PY')}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <select
                        value={lead.status}
                        disabled={updatingId === lead.id}
                        onChange={e => void updateStatus(lead.id, e.target.value as Lead['status'])}
                        className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                      >
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detalle de lead (panel lateral/modal) ──────────────────────────── */}
      {selectedLead && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
          onClick={() => setSelectedLead(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black italic uppercase">Detalle del Lead</h3>
              <button
                onClick={() => setSelectedLead(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Nombre</p>
                <p className="font-semibold">{selectedLead.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Correo</p>
                <a href={`mailto:${selectedLead.email}`} className="font-semibold text-primary hover:underline">{selectedLead.email}</a>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Teléfono</p>
                <p className="font-semibold">{selectedLead.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Servicio</p>
                <p className="font-semibold">{selectedLead.service || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Mensaje</p>
                <p className="bg-gray-50 rounded-lg p-3 text-gray-700 leading-relaxed">{selectedLead.message}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Recibido</p>
                <p className="font-semibold">{new Date(selectedLead.created_at).toLocaleString('es-PY')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Estado actual</p>
                <span
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold mt-1"
                  style={{
                    background: `${STATUS_COLORS[selectedLead.status]}20`,
                    color: STATUS_COLORS[selectedLead.status],
                  }}
                >
                  {STATUS_LABELS[selectedLead.status]}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 flex-wrap">
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <button
                  key={k}
                  disabled={selectedLead.status === k || updatingId === selectedLead.id}
                  onClick={() => void updateStatus(selectedLead.id, k as Lead['status'])}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    borderColor: STATUS_COLORS[k],
                    color: STATUS_COLORS[k],
                    background: selectedLead.status === k ? `${STATUS_COLORS[k]}15` : 'transparent',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
