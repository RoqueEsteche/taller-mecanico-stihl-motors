import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AnimatePresence } from 'framer-motion';
import { Search, Edit2, Trash2, X, Tag, Filter } from '../lib/icons';
import { apiRequest } from '../lib/session';
import { toast } from '../lib/toast';
import { MachineReference, Part, Supplier } from '../types';
import { normCategory } from '../lib/utils';

export default function InventoryModule({ globalSearch = '' }: { globalSearch?: string }) {
  const [items, setItems] = useState<Part[]>([]);
  const [machineReferences, setMachineReferences] = useState<MachineReference[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Part | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');

  // ── form state ──
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  useEffect(() => {
    Promise.all([
      apiRequest<MachineReference[]>('/api/machine-reference'),
      apiRequest<Part[]>('/api/parts'),
      apiRequest<Supplier[]>('/api/suppliers'),
    ])
      .then(([refs, parts, supplierList]) => {
        setMachineReferences(refs);
        setItems(parts);
        setSuppliers(supplierList);
      })
      .catch(err => toast(err instanceof Error ? err.message : 'No se pudo cargar el inventario.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isModalOpen) { setSelectedBrand(''); setSelectedModel(''); return; }
    setSelectedBrand(editingItem?.machineBrand || '');
    setSelectedModel(editingItem?.machineModel || '');
  }, [editingItem, isModalOpen]);

  // ── Opciones de filtro derivadas de los datos reales (no de machine_reference) ──
  const availableCategories = Array.from(
    new Set(items.map(i => normCategory(i.machineCategory)))
  ).sort((a, b) => a === 'General' ? 1 : b === 'General' ? -1 : String(a).localeCompare(String(b)));

  const availableBrands = Array.from(
    new Set(
      items
        .filter(i => categoryFilter === 'all' || normCategory(i.machineCategory) === categoryFilter)
        .map(i => i.machineBrand)
        .filter(Boolean)
    )
  ).sort((a, b) => String(a).localeCompare(String(b)));

  // ── Opciones para el formulario (desde machine_reference) ──
  const formBrands = Array.from(new Set(machineReferences.map(r => r.brand).filter(Boolean))).sort();
  const formModels = machineReferences
    .filter(r => !selectedBrand || r.brand === selectedBrand)
    .sort((a, b) => a.model.localeCompare(b.model));
  const formCategory = machineReferences.find(
    r => r.brand === selectedBrand && r.model === selectedModel
  )?.category || editingItem?.machineCategory || 'General';

  const saveItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      code: fd.get('code') as string,
      description: fd.get('description') as string,
      machineCategory: formCategory || 'General',
      machineBrand: selectedBrand,
      machineModel: selectedModel,
      price: Number(fd.get('price')),
      stock: Number(fd.get('stock')),
      minStock: Number(fd.get('minStock')),
      supplierId: (fd.get('supplierId') as string) || null,
    };
    try {
      if (editingItem) {
        const updated = await apiRequest<Part>(`/api/parts/${editingItem.id}`, { method: 'PUT', body: JSON.stringify(data) });
        setItems(curr => curr.map(i => i.id === editingItem.id ? updated : i));
      } else {
        const created = await apiRequest<Part>('/api/parts', { method: 'POST', body: JSON.stringify(data) });
        setItems(curr => [created, ...curr]);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      toast('Repuesto guardado correctamente.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo guardar el repuesto.', 'error');
    }
  };

  const deleteItem = async (id: string) => {
    if (!window.confirm('¿Eliminar este repuesto del inventario?')) return;
    try {
      await apiRequest<void>(`/api/parts/${id}`, { method: 'DELETE' });
      setItems(curr => curr.filter(i => i.id !== id));
      toast('Repuesto eliminado.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo eliminar.', 'error');
    }
  };

  const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
  const searchVal = globalSearch || searchTerm;

  // ── Filtrado correcto: usa datos reales de cada pieza ──
  const filteredItems = items.filter(i => {
    const cat = normCategory(i.machineCategory);
    if (categoryFilter !== 'all' && cat !== categoryFilter) return false;
    if (brandFilter !== 'all' && (i.machineBrand || '') !== brandFilter) return false;
    if (!searchVal) return true;
    const q = searchVal.toLowerCase();
    return (
      i.description.toLowerCase().includes(q) ||
      i.code.toLowerCase().includes(q) ||
      cat.toLowerCase().includes(q) ||
      (i.machineBrand || '').toLowerCase().includes(q) ||
      (i.machineModel || '').toLowerCase().includes(q) ||
      (i.supplierId ? (String(supplierMap.get(i.supplierId) || '')) : '').toLowerCase().includes(q)
    );
  });

  // Agrupar por categoría para mostrar separadores en la tabla
  const groupedItems: { category: string; parts: Part[] }[] = [];
  if (categoryFilter === 'all' && !searchVal && brandFilter === 'all') {
    const catMap = new Map<string, Part[]>();
    filteredItems.forEach(p => {
      const c = normCategory(p.machineCategory);
      if (!catMap.has(c)) catMap.set(c, []);
      catMap.get(c)!.push(p);
    });
    const orderedCats = Array.from(catMap.keys()).sort((a, b) =>
      a === 'General' ? 1 : b === 'General' ? -1 : String(a).localeCompare(String(b))
    );
    orderedCats.forEach(c => groupedItems.push({ category: c, parts: catMap.get(c)! }));
  } else {
    const flatCat = normCategory(filteredItems[0]?.machineCategory || '');
    groupedItems.push({ category: flatCat, parts: filteredItems });
  }

  const totalShown = filteredItems.length;

  const criticalCount = items.filter(i => i.stock <= i.minStock).length;

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-5 flex justify-between items-end">
        <div>
          <h1 className="text-xl font-black text-sidebar-bg italic tracking-tight uppercase">Control de Stock</h1>
          <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">
            {items.length} repuestos · {criticalCount > 0 && <span className="text-red-500">{criticalCount} con stock crítico</span>}
          </p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
          className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm shadow-orange-100 uppercase tracking-tight"
        >
          + Nuevo Repuesto
        </button>
      </div>

      {/* ── Tabla principal ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Filtros */}
        <div className="p-3 border-b border-gray-100 flex flex-wrap gap-2 bg-gray-50/50 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Buscar por código, descripción..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary bg-white"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setBrandFilter('all'); }}
            className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-xs font-bold text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Todas las categorías</option>
            {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={brandFilter}
            onChange={e => setBrandFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-xs font-bold text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Todas las marcas</option>
            {availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          {(categoryFilter !== 'all' || brandFilter !== 'all' || searchVal) && (
            <button
              onClick={() => { setCategoryFilter('all'); setBrandFilter('all'); setSearchTerm(''); }}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black text-primary border border-primary/20 rounded-lg hover:bg-orange-50 transition-colors uppercase tracking-wide"
            >
              <X className="w-3 h-3" /> Limpiar ({totalShown})
            </button>
          )}
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-[0.15em] font-black border-b border-gray-100">
              <tr>
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Descripción</th>
                <th className="px-5 py-3">
                  <span className="flex items-center gap-1.5"><Tag className="w-3 h-3" />Categoría</span>
                </th>
                <th className="px-5 py-3">Marca / Modelo</th>
                <th className="px-5 py-3">Proveedor</th>
                <th className="px-5 py-3 text-right">Stock</th>
                <th className="px-5 py-3 text-right">Precio</th>
                <th className="px-5 py-3 text-center">Estado</th>
                <th className="px-5 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-gray-400 text-xs italic">Cargando inventario...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-gray-400 text-xs italic">No se encontraron repuestos con los filtros aplicados.</td></tr>
              ) : (
                groupedItems.map(({ category, parts }) => (
                  <React.Fragment key={category}>
                    {/* Separador de grupo (solo en vista sin filtros) */}
                    {categoryFilter === 'all' && !searchVal && brandFilter === 'all' && (
                      <tr className="bg-gray-50/80 border-y border-gray-100">
                        <td colSpan={9} className="px-5 py-1.5">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            <Tag className="w-3 h-3 text-primary" />{category}
                            <span className="text-gray-400 font-bold normal-case tracking-normal ml-1">({parts.length})</span>
                          </span>
                        </td>
                      </tr>
                    )}
                    {parts.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/60 transition-colors border-b border-gray-50 last:border-0 group">
                        <td className="px-5 py-3 font-mono text-xs font-black text-sidebar-bg italic tracking-tighter">{item.code}</td>
                        <td className="px-5 py-3 text-sm text-gray-700 font-medium max-w-xs">{item.description}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                            {normCategory(item.machineCategory)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500 font-bold">
                          {item.machineBrand ? (
                            <><span className="text-primary font-black">{item.machineBrand}</span>
                            {item.machineModel && <span className="text-gray-400 ml-1">/ {item.machineModel}</span>}</>
                          ) : (
                            <span className="text-gray-300 italic">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500 font-semibold">
                          {item.supplierId ? (supplierMap.get(item.supplierId) || '—') : <span className="text-gray-300 italic">—</span>}
                        </td>
                        <td className={`px-5 py-3 text-sm text-right font-black ${item.stock <= item.minStock ? 'text-red-500' : 'text-sidebar-bg'}`}>
                          {item.stock}
                          {item.minStock > 0 && <span className="text-[10px] text-gray-400 font-normal ml-1">/ {item.minStock}</span>}
                        </td>
                        <td className="px-5 py-3 text-sm text-right font-bold text-gray-700">₲ {item.price?.toLocaleString()}</td>
                        <td className="px-5 py-3 text-center">
                          {item.stock <= item.minStock ? (
                            <span className="inline-flex px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-tighter">CRÍTICO</span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-tighter">OK</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-primary transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer con totales */}
        {!loading && filteredItems.length > 0 && (
          <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {totalShown} de {items.length} repuestos
            </p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Valor total estimado: <span className="text-sidebar-bg font-black">
                ₲ {filteredItems.reduce((acc, i) => acc + (i.price * i.stock), 0).toLocaleString()}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* ── Modal nuevo / editar ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 relative z-10 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black text-sidebar-bg italic uppercase tracking-tight">{editingItem ? 'Editar Repuesto' : 'Nuevo Repuesto'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-primary transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={saveItem} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Código *</label>
                    <input name="code" required defaultValue={editingItem?.code} className="w-full px-3 py-2 border rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Precio (₲) *</label>
                    <input name="price" type="number" min="0" required defaultValue={editingItem?.price} className="w-full px-3 py-2 border rounded-xl text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descripción *</label>
                  <textarea name="description" required defaultValue={editingItem?.description} rows={2} className="w-full px-3 py-2 border rounded-xl text-sm font-semibold resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>

                {/* Tipo/categoría se infiere de marca+modelo */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-3 border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Compatibilidad (opcional)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Marca</label>
                      <select value={selectedBrand} onChange={e => { setSelectedBrand(e.target.value); setSelectedModel(''); }} className="w-full px-3 py-2 border rounded-xl text-xs font-bold bg-white focus:outline-none focus:ring-1 focus:ring-primary">
                        <option value="">General / Universal</option>
                        {formBrands.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Modelo</label>
                      <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} disabled={!selectedBrand} className="w-full px-3 py-2 border rounded-xl text-xs font-bold bg-white focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50">
                        <option value="">Todos los modelos</option>
                        {formModels.map(r => <option key={`${r.brand}-${r.model}`} value={r.model}>{r.model}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-orange-50 rounded-lg px-3 py-2">
                    <Tag className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-[11px] font-bold text-gray-600">Categoría detectada: <span className="text-primary font-black">{formCategory}</span></span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Proveedor</label>
                  <select name="supplierId" defaultValue={editingItem?.supplierId || ''} className="w-full px-3 py-2 border rounded-xl text-sm font-bold bg-white focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">Sin proveedor asignado</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock actual *</label>
                    <input name="stock" type="number" min="0" required defaultValue={editingItem?.stock ?? 0} className="w-full px-3 py-2 border rounded-xl text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock mínimo</label>
                    <input name="minStock" type="number" min="0" defaultValue={editingItem?.minStock ?? 0} className="w-full px-3 py-2 border rounded-xl text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-colors">Cancelar</button>
                  <button type="submit" className="flex-[2] bg-primary text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-orange-100 hover:brightness-105">Guardar Repuesto</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
