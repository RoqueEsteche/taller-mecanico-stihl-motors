import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AnimatePresence } from 'framer-motion';
import { Plus, Truck, Edit2, Trash2, X, Phone, Mail, User, Search } from '../lib/icons';
import { apiRequest } from '../lib/session';
import { toast } from '../lib/toast';
import { Supplier } from '../types';

export default function SuppliersModule() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    apiRequest<Supplier[]>('/api/suppliers')
      .then(data => setSuppliers(data))
      .catch(err => toast(err instanceof Error ? err.message : 'No se pudieron cargar los proveedores.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const closeModal = () => { setIsModalOpen(false); setEditingSupplier(null); };

  const saveSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get('name') as string,
      contact: fd.get('contact') as string || '',
      phone: fd.get('phone') as string || '',
      email: fd.get('email') as string || '',
      notes: fd.get('notes') as string || '',
    };
    try {
      if (editingSupplier) {
        const updated = await apiRequest<Supplier>(`/api/suppliers/${editingSupplier.id}`, { method: 'PUT', body: JSON.stringify(data) });
        setSuppliers(curr => curr.map(s => s.id === editingSupplier.id ? updated : s));
      } else {
        const created = await apiRequest<Supplier>('/api/suppliers', { method: 'POST', body: JSON.stringify(data) });
        setSuppliers(curr => [created, ...curr]);
      }
      toast('Proveedor guardado.', 'success');
      closeModal();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo guardar el proveedor.', 'error');
    }
  };

  const deleteSupplier = async (id: string) => {
    if (!window.confirm('¿Eliminar este proveedor?')) return;
    try {
      await apiRequest<void>(`/api/suppliers/${id}`, { method: 'DELETE' });
      setSuppliers(curr => curr.filter(s => s.id !== id));
      toast('Proveedor eliminado.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo eliminar.', 'error');
    }
  };

  const filtered = suppliers.filter(s => {
    const q = searchTerm.toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || (s.contact || '').toLowerCase().includes(q) || (s.email || '').includes(q) || (s.phone || '').includes(q);
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex justify-between items-end">
        <div>
          <h1 className="text-xl font-black text-sidebar-bg italic tracking-tight uppercase">Proveedores</h1>
          <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">{suppliers.length} proveedores registrados</p>
        </div>
        <button
          onClick={() => { setEditingSupplier(null); setIsModalOpen(true); }}
          className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm shadow-orange-100 uppercase tracking-tight flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" /> Nuevo Proveedor
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Buscador */}
        <div className="p-3 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Buscar por nombre, contacto o email..."
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
                <th className="px-5 py-3 w-8"></th>
                <th className="px-5 py-3">Razón Social</th>
                <th className="px-5 py-3">Contacto</th>
                <th className="px-5 py-3">Teléfono</th>
                <th className="px-5 py-3">Correo</th>
                <th className="px-5 py-3">Notas</th>
                <th className="px-5 py-3 text-right w-20">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-xs italic">Cargando proveedores...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-xs italic">No se encontraron proveedores.</td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors group">
                  <td className="px-5 py-3">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                      <Truck className="w-3.5 h-3.5 text-primary" />
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm font-black text-sidebar-bg italic uppercase tracking-tight">{s.name}</p>
                  </td>
                  <td className="px-5 py-3">
                    {s.contact ? (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold">
                        <User className="w-3 h-3 text-gray-400 shrink-0" />{s.contact}
                      </div>
                    ) : <span className="text-gray-300 text-xs italic">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    {s.phone ? (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold">
                        <Phone className="w-3 h-3 text-gray-400 shrink-0" />{s.phone}
                      </div>
                    ) : <span className="text-gray-300 text-xs italic">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    {s.email ? (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold">
                        <Mail className="w-3 h-3 text-gray-400 shrink-0" />{s.email}
                      </div>
                    ) : <span className="text-gray-300 text-xs italic">—</span>}
                  </td>
                  <td className="px-5 py-3 max-w-xs">
                    {s.notes ? (
                      <p className="text-xs text-gray-500 italic leading-snug line-clamp-2">{s.notes}</p>
                    ) : <span className="text-gray-300 text-xs italic">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setEditingSupplier(s); setIsModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-primary transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteSupplier(s.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-2 border-t border-gray-100 bg-gray-50/50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{filtered.length} de {suppliers.length} proveedores</p>
          </div>
        )}
      </div>

      {/* ── Modal crear/editar ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black text-sidebar-bg italic uppercase tracking-tight">{editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-primary transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={saveSupplier} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Razón Social *</label>
                  <input name="name" required defaultValue={editingSupplier?.name} className="w-full px-3 py-2 border rounded-xl text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contacto</label>
                    <input name="contact" defaultValue={editingSupplier?.contact} className="w-full px-3 py-2 border rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Teléfono</label>
                    <input name="phone" defaultValue={editingSupplier?.phone} className="w-full px-3 py-2 border rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Correo electrónico</label>
                  <input name="email" type="email" defaultValue={editingSupplier?.email} className="w-full px-3 py-2 border rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notas</label>
                  <textarea name="notes" defaultValue={editingSupplier?.notes} rows={3} className="w-full px-3 py-2 border rounded-xl text-sm font-semibold resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50">Cancelar</button>
                  <button type="submit" className="flex-1 bg-primary text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-orange-100">Guardar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
