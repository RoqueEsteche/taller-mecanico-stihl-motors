import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/session';
import { Clock, Plus, Settings, ShieldCheck, Tag, Trash2, Users } from '../lib/icons';
import { toast } from '../lib/toast';
import UsersModule from './UsersModule';
import { WorkshopSettings } from '../types';
import { useWorkshop } from '../App';

interface CatalogItem {
  id: string;
  name: string;
}

interface MachineModelItem {
  id: string;
  name: string;
  brandId: string;
  brandName: string;
}

interface ActivityItem {
  id: string;
  at: string;
  method: string;
  path: string;
  statusCode: number;
  ip: string;
  origin?: string | null;
  userAgent: string;
  deviceType: string;
  browser?: string;
  os?: string;
  userEmail?: string | null;
  userDisplayName?: string | null;
}

interface ActivityResponse {
  items: ActivityItem[];
  summary: { totalCaptured: number; activeNow: number };
  activeSessions: Array<{
    userId?: string | null;
    userEmail?: string | null;
    userRole?: string | null;
    ip: string;
    deviceType: string;
    browser?: string;
    os?: string;
    userAgent: string;
    lastSeenAt: string;
  }>;
}

type SettingsSection = 'workshop' | 'catalogs' | 'users' | 'activity';

function WorkshopInfoSection() {
  const { refresh } = useWorkshop();
  const [form, setForm] = useState<WorkshopSettings>({ name: '', address: '', phone: '', email: '', tagline: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest<WorkshopSettings>('/api/settings/workshop')
      .then((data) => setForm((prev) => ({ ...prev, ...data })))
      .catch((err) => toast(err instanceof Error ? err.message : 'No se pudieron cargar los datos del taller.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field: keyof WorkshopSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast('El nombre del taller es obligatorio.', 'error'); return; }
    setSaving(true);
    try {
      await apiRequest('/api/settings/workshop', { method: 'PUT', body: JSON.stringify(form) });
      await refresh();
      toast('Datos del taller guardados correctamente.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo guardar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const fields: Array<{ key: keyof WorkshopSettings; label: string; placeholder: string }> = [
    { key: 'name', label: 'Nombre del Taller *', placeholder: 'Ej: Taller Mecánico Central' },
    { key: 'tagline', label: 'Descripción breve', placeholder: 'Ej: Servicio técnico autorizado' },
    { key: 'address', label: 'Dirección', placeholder: 'Ej: Av. Principal 1234' },
    { key: 'phone', label: 'Teléfono', placeholder: 'Ej: +595 21 000000' },
    { key: 'email', label: 'Email de contacto', placeholder: 'Ej: contacto@taller.com' },
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-sidebar-bg">Datos del Taller</h3>
        <p className="text-[11px] text-gray-500 mt-1">Esta información aparece en el encabezado del sistema y en los documentos generados.</p>
      </div>
      {loading ? (
        <p className="text-sm text-gray-400 italic">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map(({ key, label, placeholder }) => (
            <div key={key} className={key === 'name' || key === 'tagline' ? 'md:col-span-2' : ''}>
              <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 mb-1">{label}</label>
              <input
                type={key === 'email' ? 'email' : 'text'}
                value={form[key]}
                onChange={handleChange(key)}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-primary"
              />
            </div>
          ))}
        </div>
      )}
      {!loading && (
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-primary text-white text-[10px] font-black uppercase tracking-wider disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  );
}

function CatalogListSection({
  title,
  endpoint,
  placeholder,
}: {
  title: string;
  endpoint: string;
  placeholder: string;
}) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);

  const loadItems = async () => {
    try {
      const data = await apiRequest<CatalogItem[]>(endpoint);
      setItems(data);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo cargar el catálogo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [endpoint]);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;

    try {
      await apiRequest(endpoint, { method: 'POST', body: JSON.stringify({ name }) });
      setNewName('');
      toast('Elemento agregado.', 'success');
      loadItems();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo agregar.', 'error');
    }
  };

  const handleDelete = async (item: CatalogItem) => {
    if (!window.confirm(`¿Eliminar ${item.name}?`)) return;

    try {
      await apiRequest(`${endpoint}/${item.id}`, { method: 'DELETE' });
      toast('Elemento eliminado.', 'success');
      loadItems();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo eliminar.', 'error');
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-sidebar-bg mb-4">{title}</h3>
      <div className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold"
        />
        <button
          onClick={handleAdd}
          className="px-4 py-2 rounded-lg bg-primary text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Agregar
        </button>
      </div>

      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Nombre</th>
              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-4 text-xs text-gray-400 italic" colSpan={2}>Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="px-3 py-4 text-xs text-gray-400 italic" colSpan={2}>Sin registros.</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="border-b border-gray-50 last:border-none">
                <td className="px-3 py-2 text-sm font-semibold text-gray-700">{item.name}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => handleDelete(item)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModelsByBrandSection() {
  const [brands, setBrands] = useState<CatalogItem[]>([]);
  const [models, setModels] = useState<MachineModelItem[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [brandData, modelData] = await Promise.all([
        apiRequest<CatalogItem[]>('/api/catalogs/brands'),
        apiRequest<MachineModelItem[]>('/api/catalogs/models'),
      ]);
      setBrands(brandData);
      setModels(modelData);
      if (!selectedBrandId && brandData[0]?.id) setSelectedBrandId(brandData[0].id);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo cargar modelos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredModels = useMemo(
    () => models.filter((item) => !selectedBrandId || item.brandId === selectedBrandId),
    [models, selectedBrandId],
  );

  const handleAddModel = async () => {
    const name = newModelName.trim();
    if (!name || !selectedBrandId) {
      toast('Debes seleccionar marca y escribir el modelo.', 'error');
      return;
    }

    try {
      await apiRequest('/api/catalogs/models', {
        method: 'POST',
        body: JSON.stringify({ name, brandId: selectedBrandId }),
      });
      setNewModelName('');
      toast('Modelo agregado.', 'success');
      loadData();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo agregar el modelo.', 'error');
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (!window.confirm('¿Eliminar este modelo?')) return;
    try {
      await apiRequest(`/api/catalogs/models/${id}`, { method: 'DELETE' });
      toast('Modelo eliminado.', 'success');
      loadData();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo eliminar el modelo.', 'error');
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-sidebar-bg mb-4">Modelos por marca</h3>
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_auto] gap-2 mb-4">
        <select
          value={selectedBrandId}
          onChange={(event) => setSelectedBrandId(event.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold bg-white"
        >
          <option value="">Seleccionar marca</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>{brand.name}</option>
          ))}
        </select>
        <input
          value={newModelName}
          onChange={(event) => setNewModelName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleAddModel()}
          placeholder="Nuevo modelo"
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold"
        />
        <button
          onClick={handleAddModel}
          className="px-4 py-2 rounded-lg bg-primary text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1"
        >
          <Plus className="w-3 h-3" /> Agregar
        </button>
      </div>

      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Marca</th>
              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Modelo</th>
              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-4 text-xs text-gray-400 italic" colSpan={3}>Cargando...</td></tr>
            ) : filteredModels.length === 0 ? (
              <tr><td className="px-3 py-4 text-xs text-gray-400 italic" colSpan={3}>Sin modelos para la marca seleccionada.</td></tr>
            ) : filteredModels.map((item) => (
              <tr key={item.id} className="border-b border-gray-50 last:border-none">
                <td className="px-3 py-2 text-xs font-black uppercase tracking-wide text-gray-500">{item.brandName}</td>
                <td className="px-3 py-2 text-sm font-semibold text-gray-700">{item.name}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => handleDeleteModel(item.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActivityLiveSection() {
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = async () => {
    try {
      const data = await apiRequest<ActivityResponse>('/api/activity/live?limit=120');
      setActivity(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer la actividad en vivo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivity();
    const interval = window.setInterval(loadActivity, 5000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-sidebar-bg">Accesos y uso en tiempo real</h3>
          <p className="text-xs text-gray-500 mt-1">Muestra actividad API, origen de red y tipo de equipo.</p>
        </div>
        <button onClick={loadActivity} className="px-3 py-2 border border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-wider">Actualizar</button>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        {loading ? (
          <p className="text-sm text-gray-500 italic">Cargando actividad...</p>
        ) : error ? (
          <p className="text-sm text-red-600 font-semibold">{error}</p>
        ) : (
          <>
            <div className="flex items-center gap-6 mb-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-gray-500">Sesiones activas: <span className="text-sidebar-bg">{activity?.summary.activeNow || 0}</span></p>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-gray-500">Eventos en buffer: <span className="text-sidebar-bg">{activity?.summary.totalCaptured || 0}</span></p>
            </div>

            <div className="border border-gray-100 rounded-lg overflow-auto max-h-[520px]">
              <table className="w-full text-left border-collapse min-w-[980px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Hora</th>
                    <th className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Usuario</th>
                    <th className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Acceso</th>
                    <th className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Origen</th>
                    <th className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Equipo</th>
                    <th className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Plataforma</th>
                    <th className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">UA</th>
                  </tr>
                </thead>
                <tbody>
                  {(activity?.items || []).map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 last:border-none">
                      <td className="px-3 py-2 text-[11px] text-gray-500 font-semibold whitespace-nowrap">{new Date(item.at).toLocaleString('es-PY')}</td>
                      <td className="px-3 py-2">
                        <p className="text-xs font-black uppercase text-sidebar-bg">{item.userDisplayName || 'Invitado'}</p>
                        <p className="text-[11px] text-gray-500 font-semibold">{item.userEmail || 'Sin sesión'}</p>
                      </td>
                      <td className="px-3 py-2">
                        <p className="text-[11px] font-black uppercase tracking-wide text-gray-700">{item.method} {item.statusCode}</p>
                        <p className="text-[11px] text-gray-500 font-semibold">{item.path}</p>
                      </td>
                      <td className="px-3 py-2">
                        <p className="text-[11px] font-bold text-gray-700">IP: {item.ip}</p>
                        <p className="text-[11px] text-gray-500">{item.origin || 'Sin origin/referer'}</p>
                      </td>
                      <td className="px-3 py-2 text-[11px] font-bold uppercase text-primary">{item.deviceType}</td>
                      <td className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">{item.browser || 'desconocido'} / {item.os || 'desconocido'}</td>
                      <td className="px-3 py-2 text-[11px] text-gray-500 max-w-[300px] truncate" title={item.userAgent}>{item.userAgent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SettingsModule({ onNavigate: _onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [section, setSection] = useState<SettingsSection>('workshop');
  const sections: Array<{ id: SettingsSection; label: string; icon: React.ReactNode }> = [
    { id: 'workshop',  label: 'Datos del Taller',   icon: <Settings    className="w-4 h-4" /> },
    { id: 'catalogs',  label: 'Catálogos',           icon: <Tag         className="w-4 h-4" /> },
    { id: 'users',     label: 'Usuarios y Accesos',  icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'activity',  label: 'Actividad en vivo',   icon: <Clock       className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase italic tracking-tight text-sidebar-bg">Configuración</h1>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Parámetros del taller, catálogos y control de acceso</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[250px_1fr] gap-5 items-start">
        <aside className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          {sections.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setSection(entry.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-gray-50 last:border-none text-xs font-black uppercase tracking-[0.14em] transition-colors ${section === entry.id ? 'bg-orange-50 text-primary border-l-2 border-l-primary' : 'text-gray-500 hover:bg-gray-50 border-l-2 border-l-transparent'}`}
            >
              {entry.icon}
              <span>{entry.label}</span>
            </button>
          ))}
        </aside>

        <section className="space-y-5">
          {section === 'workshop' && <WorkshopInfoSection />}
          {section === 'catalogs' && (
            <>
              <CatalogListSection title="Marcas" endpoint="/api/catalogs/brands" placeholder="Nueva marca" />
              <CatalogListSection title="Categorías" endpoint="/api/catalogs/categories" placeholder="Nueva categoría" />
              <ModelsByBrandSection />
            </>
          )}
          {section === 'users' && <UsersModule />}
          {section === 'activity' && <ActivityLiveSection />}
        </section>
      </div>
    </div>
  );
}
