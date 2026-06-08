import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AnimatePresence } from 'framer-motion';
import { Shield, X, Power, Edit2, UserPlus, KeyRound, Search } from '../lib/icons';
import { apiRequest } from '../lib/session';
import { toast } from '../lib/toast';

interface SystemUser {
  id: string;
  displayName: string;
  email: string;
  role: 'admin' | 'receiver' | 'mechanic' | 'stock_manager';
  active?: boolean;
}

export default function UsersModule() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [changePwdUser, setChangePwdUser] = useState<SystemUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    apiRequest<SystemUser[]>('/api/users')
      .then((data) => setUsers(data))
      .catch((error) => {
        toast(error instanceof Error ? error.message : 'No se pudieron cargar los usuarios.', 'error');
      })
      .finally(() => setLoading(false));
  }, []);

  const saveUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string).trim();
    const role = formData.get('role') as SystemUser['role'];
    const data = {
      displayName: formData.get('displayName') as string,
      email,
      role,
    };

    try {
      if (editingUser) {
        const updated = await apiRequest<SystemUser>(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify({ displayName: data.displayName, role: data.role }),
        });
        setUsers((current) => current.map((user) => user.id === editingUser.id ? updated : user));
      } else {
        const password = (formData.get('password') as string) || '';
        if (password.length < 6) {
          toast('La contraseña debe tener al menos 6 caracteres.', 'error');
          return;
        }

        const created = await apiRequest<SystemUser>('/api/users', {
          method: 'POST',
          body: JSON.stringify({
            displayName: data.displayName,
            email,
            role,
            password,
          }),
        });
        setUsers((current) => [created, ...current]);
      }
      setIsModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo guardar el usuario.', 'error');
    }
  };

  const toggleUserAccess = async (user: SystemUser) => {
    const nextActiveState = user.active === false;
    const confirmationText = nextActiveState
      ? '¿Reactivar este acceso?'
      : '¿Suspender este acceso? El usuario perderá acceso al volver a iniciar sesión.';

    if (!window.confirm(confirmationText)) return;

    try {
      const updated = await apiRequest<SystemUser>(`/api/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          active: nextActiveState,
        }),
      });
      setUsers((current) => current.map((entry) => entry.id === user.id ? updated : entry));
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo actualizar el acceso del usuario.', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-sidebar-bg italic tracking-tight uppercase">Usuarios y Roles</h1>
          <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">Control de acceso al sistema</p>
        </div>
        <button 
          onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
          className="bg-primary text-white px-6 py-3 rounded-lg text-xs font-bold shadow-lg shadow-orange-100 hover:brightness-110 transition-all uppercase tracking-tight flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Nuevo Acceso
        </button>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-xs font-black uppercase italic bg-white focus:ring-1 focus:ring-primary outline-none"
        >
          <option value="all">Todos los roles</option>
          <option value="admin">Administrador</option>
          <option value="receiver">Recepción</option>
          <option value="mechanic">Mecánico</option>
          <option value="stock_manager">Stock</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-orange-50 text-primary flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.18em]">Flujo recomendado</p>
          <p className="text-sm text-gray-600">El administrador crea el acceso con correo y contraseña, luego asigna el rol y, si corresponde, vincula la cuenta del mecánico desde Staff Mecánico.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Usuario</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Rol</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={3} className="px-6 py-10 text-center text-gray-400 italic text-sm">Sincronizando...</td></tr>
            ) : users
                .filter((u) => {
                  const term = searchTerm.toLowerCase();
                  const matchSearch = !term || u.displayName?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term);
                  const matchRole = roleFilter === 'all' || u.role === roleFilter;
                  return matchSearch && matchRole;
                })
                .map((user) => (
              <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-primary font-black italic text-xs uppercase">
                      {user.displayName?.charAt(0) || user.email?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-sidebar-bg text-sm uppercase italic leading-tight">{user.displayName || 'Sin nombre'}</p>
                      <p className="text-[10px] font-bold text-gray-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded border text-[9px] font-black italic uppercase tracking-tighter
                    ${user.role === 'admin' ? 'bg-red-50 text-red-600 border-red-100' : 
                      user.role === 'mechanic' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                      'bg-green-50 text-green-600 border-green-100'}`}
                  >
                    {user.role?.replace('_', ' ')}
                  </span>
                  <span className={`ml-2 px-2 py-0.5 rounded border text-[9px] font-black italic uppercase tracking-tighter ${user.active === false ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                    {user.active === false ? 'Suspendido' : 'Activo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 transition-opacity">
                    <button onClick={() => { setEditingUser(user); setIsModalOpen(true); }} className="p-2 text-gray-400 hover:text-primary transition-colors cursor-pointer">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setChangePwdUser(user); setNewPassword(''); }} className="p-2 text-gray-400 hover:text-blue-500 transition-colors cursor-pointer" title="Cambiar contraseña">
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleUserAccess(user)} className="p-2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                      <Power className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => { setIsModalOpen(false); setEditingUser(null); }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-sidebar-bg italic uppercase tracking-tight">
                  {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h2>
                <button onClick={() => { setIsModalOpen(false); setEditingUser(null); }} className="text-gray-400 hover:text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={saveUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-primary uppercase">Nombre Completo</label>
                  <input name="displayName" required defaultValue={editingUser?.displayName} className="w-full px-4 py-2 border rounded-xl text-sm italic font-medium focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-primary uppercase">Correo Electrónico</label>
                  <input name="email" type="email" required defaultValue={editingUser?.email} disabled={!!editingUser} className="w-full px-4 py-2 border rounded-xl text-sm italic font-medium focus:ring-1 focus:ring-primary outline-none disabled:bg-gray-50 disabled:text-gray-400" />
                </div>
                {!editingUser && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-primary uppercase">Contraseña Inicial</label>
                    <input name="password" type="password" required className="w-full px-4 py-2 border rounded-xl text-sm italic font-medium focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-primary uppercase">Rol de Acceso</label>
                  <select name="role" defaultValue={editingUser?.role || 'receiver'} className="w-full px-4 py-3 border rounded-xl text-sm font-black italic uppercase italic focus:ring-1 focus:ring-primary outline-none bg-gray-50">
                    <option value="admin">Administrador</option>
                    <option value="receiver">Recepción / Caja</option>
                    <option value="mechanic">Mecánico / Taller</option>
                    <option value="stock_manager">Encargado de Stock</option>
                  </select>
                </div>
                <div className="pt-6 flex gap-3">
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingUser(null); }} className="flex-1 px-4 py-3 border rounded-xl text-[10px] font-black uppercase italic tracking-widest">Cancelar</button>
                  <button type="submit" className="flex-1 bg-sidebar-bg text-white py-3 rounded-xl font-black text-[10px] uppercase italic tracking-widest shadow-lg shadow-gray-200 transition-all hover:scale-[1.02]">
                    {editingUser ? 'Actualizar' : 'Crear Acceso'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {changePwdUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setChangePwdUser(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-0.5">Cambiar Contraseña</p>
                <h2 className="text-lg font-black text-sidebar-bg italic uppercase">{changePwdUser.displayName}</h2>
              </div>
              <button onClick={() => setChangePwdUser(null)} className="text-gray-400 hover:text-primary"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-primary uppercase">Nueva Contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-2 border rounded-xl text-sm font-medium focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setChangePwdUser(null)} className="flex-1 px-4 py-3 border rounded-xl text-[10px] font-black uppercase italic tracking-widest">Cancelar</button>
                <button
                  disabled={pwdLoading || newPassword.length < 6}
                  onClick={async () => {
                    setPwdLoading(true);
                    try {
                      await apiRequest(`/api/users/${changePwdUser.id}/password`, { method: 'PUT', body: JSON.stringify({ password: newPassword }) });
                      toast('Contraseña actualizada correctamente.', 'success');
                      setChangePwdUser(null);
                    } catch (err) {
                      toast(err instanceof Error ? err.message : 'Error al cambiar contraseña', 'error');
                    } finally {
                      setPwdLoading(false);
                    }
                  }}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] uppercase italic tracking-widest disabled:opacity-50"
                >
                  {pwdLoading ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
