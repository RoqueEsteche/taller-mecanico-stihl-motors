import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trash2, Edit2, X } from '../lib/icons';
import { apiRequest } from '../lib/session';
import { toast } from '../lib/toast';
import { Mechanic } from '../types';

interface MechanicUser {
  id: string;
  displayName?: string;
  email: string;
  role: 'admin' | 'receiver' | 'mechanic' | 'stock_manager';
  active?: boolean;
}

export default function MechanicsModule() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [mechanicUsers, setMechanicUsers] = useState<MechanicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Mechanic | null>(null);
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  useEffect(() => {
    Promise.all([
      apiRequest<Mechanic[]>('/api/mechanics'),
      apiRequest<MechanicUser[]>('/api/users'),
    ])
      .then(([mechanicsData, usersData]) => {
        setMechanics(mechanicsData);
        setMechanicUsers(usersData.filter((user) => user.role === 'mechanic' && user.active !== false && !!user.email));
      })
      .catch((error) => {
        toast(error instanceof Error ? error.message : 'No se pudo cargar el equipo técnico.', 'error');
      })
      .finally(() => setLoading(false));
  }, []);

  const saveMechanic = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const linkedUserId = (formData.get('linkedUserId') as string) || '';
    const linkedUser = mechanicUsers.find((user) => user.id === linkedUserId);
    const data = {
      name: formData.get('name') as string,
      specialty: formData.get('specialty') as string,
      linkedUserId,
      linkedEmail: linkedUser?.email || '',
      active: true,
    };

    try {
      if (editingItem) {
        const updated = await apiRequest<Mechanic>(`/api/mechanics/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...data, active: editingItem.active }),
        });
        setMechanics((current) => current.map((mechanic) => mechanic.id === editingItem.id ? updated : mechanic));
      } else {
        const created = await apiRequest<Mechanic>('/api/mechanics', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        setMechanics((current) => [created, ...current]);
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo guardar el mecánico.', 'error');
    }
  };

  const deleteMechanic = async (id: string) => {
    if (!window.confirm('¿Eliminar este mecánico? Esto puede afectar el historial de órdenes.')) return;
    try {
      await apiRequest<void>(`/api/mechanics/${id}`, { method: 'DELETE' });
      setMechanics((current) => current.filter((mechanic) => mechanic.id !== id));
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo eliminar el mecánico.', 'error');
    }
  };

  const toggleStatus = async (item: Mechanic) => {
    try {
      const updated = await apiRequest<Mechanic>(`/api/mechanics/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: item.name,
          specialty: item.specialty,
          linkedUserId: item.linkedUserId || '',
          linkedEmail: item.linkedEmail || '',
          active: !item.active,
        }),
      });
      setMechanics((current) => current.map((mechanic) => mechanic.id === item.id ? updated : mechanic));
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo actualizar el estado del mecánico.', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-sidebar-bg italic tracking-tight uppercase">Equipo Técnico</h1>
          <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">Gestión de personal y especialidades</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOnlyActive((v) => !v)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase italic border transition-colors ${
              showOnlyActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white text-gray-500 border-gray-200 hover:border-primary hover:text-primary'
            }`}
          >
            {showOnlyActive ? 'Solo Activos' : 'Todos'}
          </button>
          <button 
            onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
            className="bg-primary text-white px-6 py-3 rounded-lg text-xs font-bold shadow-lg shadow-orange-100 hover:brightness-110 transition-all uppercase tracking-tight"
          >
            + Registrar Mecánico
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-[0.15em] font-black border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 w-12"></th>
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Especialidad</th>
                <th className="px-5 py-3">Acceso vinculado</th>
                <th className="px-5 py-3 text-center">Estado</th>
                <th className="px-5 py-3 text-right w-24">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-xs italic">Cargando equipo...</td></tr>
              ) : mechanics.filter((m) => !showOnlyActive || m.active !== false).length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-xs italic">No hay mecánicos{showOnlyActive ? ' activos' : ''} registrados.</td></tr>
              ) : mechanics.filter((m) => !showOnlyActive || m.active !== false).map((mech) => (
                <tr key={mech.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors ${!mech.active ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black italic text-sm ${mech.active ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                      {mech.name.charAt(0)}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm font-black text-sidebar-bg uppercase italic tracking-tight">{mech.name}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex px-2.5 py-1 rounded-lg bg-gray-100 text-[10px] font-bold text-gray-600 uppercase tracking-wide">
                      {mech.specialty || 'General'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {mech.linkedEmail ? (
                      <p className="text-xs font-semibold text-gray-500">{mech.linkedEmail}</p>
                    ) : (
                      <span className="text-xs text-gray-300 italic">Sin cuenta vinculada</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => toggleStatus(mech)}
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border transition-colors ${mech.active ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}
                    >
                      {mech.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setEditingItem(mech); setIsModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-primary transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteMechanic(mech.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div className="px-5 py-2 border-t border-gray-100 bg-gray-50/50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {mechanics.filter((m) => !showOnlyActive || m.active !== false).length} mecánicos · {mechanics.filter(m => m.active).length} activos
            </p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10">
            <h2 className="text-xl font-black text-sidebar-bg italic uppercase tracking-tight mb-6">{editingItem ? 'Editar Perfil' : 'Nuevo Mecánico'}</h2>
            <form onSubmit={saveMechanic} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre Completo</label>
                <input name="name" required defaultValue={editingItem?.name} className="w-full px-4 py-2 border rounded-xl text-sm italic font-bold" placeholder="Ej: Ramón Esteche" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Especialidad</label>
                <select name="specialty" defaultValue={editingItem?.specialty} className="w-full px-4 py-2 border rounded-xl text-sm italic font-bold bg-white">
                  <option value="Generadores y motobombas">Generadores y motobombas</option>
                  <option value="Motosierras y poda profesional">Motosierras y poda profesional</option>
                  <option value="Desmalezadoras y motoguadañas">Desmalezadoras y motoguadañas</option>
                  <option value="Hidrolavadoras y equipos de limpieza">Hidrolavadoras y equipos de limpieza</option>
                  <option value="Cortacésped y tractores livianos">Cortacésped y tractores livianos</option>
                  <option value="Motores Diésel">Motores Diésel</option>
                  <option value="Bombas de Agua">Bombas de Agua</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Usuario de acceso</label>
                <select name="linkedUserId" defaultValue={editingItem?.linkedUserId || ''} className="w-full px-4 py-2 border rounded-xl text-sm italic font-bold bg-white">
                  <option value="">Sin vincular</option>
                  {mechanicUsers.map((user) => (
                    <option key={user.id} value={user.id}>{user.displayName || user.email} - {user.email}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 font-bold">El portal del mecánico usará esta cuenta para mostrar solo sus órdenes asignadas.</p>
              </div>
              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border rounded-xl text-[10px] font-black uppercase italic tracking-widest">Cerrar</button>
                <button type="submit" className="flex-[2] bg-primary text-white py-3 rounded-xl font-black text-[10px] uppercase italic tracking-widest shadow-lg shadow-orange-100 transition-all">Guardar Mecánico</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
