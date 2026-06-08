import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Edit2, Trash2, X, Phone, MapPin, Clock, Wrench } from '../lib/icons';
import { apiRequest } from '../lib/session';
import { toast } from '../lib/toast';
import { Client } from '../types';

interface MachineRow { id: string; name: string; brand: string; model: string; serial_number: string; created_at: string; }
interface OrderRow { id: string; order_number: number; machine_name: string; machine_model: string; status: string; total: number; created_at: string; }
interface ClientHistory { machines: MachineRow[]; orders: OrderRow[]; }

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', in_progress: 'En progreso', awaiting_parts: 'Esperando repuestos',
  finished: 'Terminado', delivered: 'Entregado', cancelled: 'Cancelado',
};

export default function ClientsModule({ globalSearch = '' }: { globalSearch?: string }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [history, setHistory] = useState<ClientHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadClients = async () => {
    setLoading(true);
    try {
      setClients(await apiRequest<Client[]>('/api/clients'));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudieron cargar los clientes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClients(); }, []);

  const openHistory = async (client: Client) => {
    setHistoryClient(client);
    setHistory(null);
    setHistoryLoading(true);
    try {
      setHistory(await apiRequest<ClientHistory>(`/api/clients/${client.id}/history`));
    } catch {
      setHistory({ machines: [], orders: [] });
    } finally {
      setHistoryLoading(false);
    }
  };

  const saveClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      ci: fd.get('ci') as string,
      name: fd.get('name') as string,
      phone: fd.get('phone') as string || '',
      address: fd.get('address') as string || '',
    };
    try {
      if (editingItem) {
        await apiRequest<Client>(`/api/clients/${editingItem.id}`, { method: 'PUT', body: JSON.stringify(data) });
      } else {
        await apiRequest<Client>('/api/clients', { method: 'POST', body: JSON.stringify(data) });
      }
      await loadClients();
      setIsModalOpen(false);
      setEditingItem(null);
      toast('Cliente guardado.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo guardar el cliente.', 'error');
    }
  };

  const deleteClient = async (id: string) => {
    if (!window.confirm('¿Eliminar este cliente? Se perderá todo su historial.')) return;
    try {
      await apiRequest<void>(`/api/clients/${id}`, { method: 'DELETE' });
      await loadClients();
      toast('Cliente eliminado.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo eliminar.', 'error');
    }
  };

  const searchVal = globalSearch || searchTerm;
  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchVal.toLowerCase()) ||
    c.ci.includes(searchVal) ||
    (c.phone || '').includes(searchVal)
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex justify-between items-end">
        <div>
          <h1 className="text-xl font-black text-sidebar-bg italic tracking-tight uppercase">Base de Clientes</h1>
          <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">{clients.length} clientes registrados</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
          className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm shadow-orange-100 uppercase tracking-tight"
        >
          + Agregar Cliente
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Buscador integrado */}
        <div className="p-3 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Buscar por nombre, CI o teléfono..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary bg-white"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-[0.15em] font-black border-b border-gray-100">
              <tr>
                <th className="px-5 py-3">CI / RUC</th>
                <th className="px-5 py-3">Nombre / Razón Social</th>
                <th className="px-5 py-3">Teléfono</th>
                <th className="px-5 py-3">Dirección</th>
                <th className="px-5 py-3 text-right w-24">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-xs italic">Cargando clientes...</td></tr>
              ) : filteredClients.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-xs italic">No se encontraron clientes.</td></tr>
              ) : filteredClients.map(client => (
                <tr key={client.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors group">
                  <td className="px-5 py-3 font-mono text-xs font-black text-primary tracking-tighter">{client.ci}</td>
                  <td className="px-5 py-3">
                    <p className="text-sm font-black text-sidebar-bg uppercase italic tracking-tight leading-tight">{client.name}</p>
                  </td>
                  <td className="px-5 py-3">
                    {client.phone ? (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold">
                        <Phone className="w-3 h-3 text-gray-400 shrink-0" />{client.phone}
                      </div>
                    ) : <span className="text-gray-300 text-xs italic">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    {client.address ? (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold max-w-xs">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{client.address}</span>
                      </div>
                    ) : <span className="text-gray-300 text-xs italic">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openHistory(client)} title="Historial" className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"><Clock className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setEditingItem(client); setIsModalOpen(true); }} title="Editar" className="p-1.5 text-gray-400 hover:text-primary transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteClient(client.id)} title="Eliminar" className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredClients.length > 0 && (
          <div className="px-5 py-2 border-t border-gray-100 bg-gray-50/50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{filteredClients.length} de {clients.length} clientes</p>
          </div>
        )}
      </div>

      {/* ── Modal crear/editar ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-sidebar-bg italic uppercase tracking-tight">{editingItem ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-primary transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={saveClient} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CI / RUC *</label>
                  <input name="ci" required defaultValue={editingItem?.ci} className="w-full px-3 py-2 border rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Teléfono</label>
                  <input name="phone" defaultValue={editingItem?.phone} className="w-full px-3 py-2 border rounded-xl text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre / Razón Social *</label>
                <input name="name" required defaultValue={editingItem?.name} className="w-full px-3 py-2 border rounded-xl text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dirección</label>
                <input name="address" defaultValue={editingItem?.address} className="w-full px-3 py-2 border rounded-xl text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="flex-[2] bg-primary text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-orange-100">Guardar</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── Modal historial ── */}
      {historyClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setHistoryClient(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 relative z-10 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Historial del Cliente</p>
                <h2 className="text-xl font-black text-sidebar-bg italic uppercase tracking-tight">{historyClient.name}</h2>
                <p className="text-xs text-gray-400 font-bold mt-0.5">CI / RUC: {historyClient.ci}</p>
              </div>
              <button onClick={() => setHistoryClient(null)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
            </div>

            {historyLoading ? (
              <div className="py-12 text-center text-gray-400 italic text-sm">Cargando historial...</div>
            ) : (
              <>
                {/* Máquinas */}
                <div className="mb-6">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Wrench className="w-3.5 h-3.5" /> Máquinas registradas ({history?.machines.length || 0})
                  </h3>
                  {!history?.machines.length ? (
                    <p className="text-xs text-gray-400 italic">Sin máquinas registradas.</p>
                  ) : (
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">Equipo</th>
                            <th className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">Marca / Modelo</th>
                            <th className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">S/N</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.machines.map(m => (
                            <tr key={m.id} className="border-b border-gray-50 last:border-0">
                              <td className="px-4 py-2.5 text-xs font-black text-sidebar-bg uppercase italic">{m.name}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-500 font-semibold">{m.brand} {m.model}</td>
                              <td className="px-4 py-2.5 font-mono text-[10px] text-gray-400">{m.serial_number || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Órdenes */}
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> Órdenes de servicio ({history?.orders.length || 0})
                  </h3>
                  {!history?.orders.length ? (
                    <p className="text-xs text-gray-400 italic">Sin órdenes registradas.</p>
                  ) : (
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">N° OT</th>
                            <th className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">Equipo</th>
                            <th className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
                            <th className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.orders.map(o => (
                            <tr key={o.id} className="border-b border-gray-50 last:border-0">
                              <td className="px-4 py-2.5 font-mono text-xs font-black text-primary">#{String(o.order_number).padStart(5, '0')}</td>
                              <td className="px-4 py-2.5 text-xs font-semibold text-sidebar-bg italic uppercase">{o.machine_name} {o.machine_model}</td>
                              <td className="px-4 py-2.5"><span className="text-[10px] font-bold text-gray-500 uppercase">{STATUS_LABELS[o.status] || o.status}</span></td>
                              <td className="px-4 py-2.5 text-right text-sm font-black text-primary italic">₲ {Number(o.total).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
