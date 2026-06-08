import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AnimatePresence } from 'framer-motion';
import { X, Search, Plus, Trash2, FileText } from '../lib/icons';
import { apiRequest, getSessionUser } from '../lib/session';
import { toast } from '../lib/toast';
import { WorkOrder, Mechanic, OrderStatus, Part } from '../types';
import { useWorkshop } from '../App';
import { toDateValue, statusLabel, getStatusStyle, actionLabel } from '../lib/utils';
import { notifyNewAssignment } from '../lib/native';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface CatalogModel {
  id: string;
  name: string;
  brandId: string;
  brandName: string;
}

export default function WorkOrdersModule({ globalSearch = '', portalMode = false }: { globalSearch?: string; portalMode?: boolean }) {
  const { settings: workshop } = useWorkshop();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [inventory, setInventory] = useState<Part[]>([]);
  const [currentMechanic, setCurrentMechanic] = useState<Mechanic | null>(null);
  const [assignmentAlerts, setAssignmentAlerts] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [formStatus, setFormStatus] = useState<OrderStatus>('pending');

  // Garantía / reingreso
  const [serialInput, setSerialInput] = useState('');
  const [previousOrders, setPreviousOrders] = useState<WorkOrder[]>([]);
  const [warrantyType, setWarrantyType] = useState<'warranty' | 'non_warranty' | ''>('');
  const [warrantyNotes, setWarrantyNotes] = useState('');
  const [relatedOrder, setRelatedOrder] = useState<WorkOrder | null>(null);
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [newOrderBrand, setNewOrderBrand] = useState('');

  const currentUser = getSessionUser();
  const actorName = currentUser?.displayName || currentUser?.email || 'Taller';
  const currentRole = currentUser?.role ?? null;

  const buildAuditEntry = (action: string, detail: string) => ({
    action,
    actor: actorName,
    at: new Date().toISOString(),
    detail,
  });

  const getOrderParts = (order: WorkOrder | null) => order?.parts || [];

  useEffect(() => {
    if (selectedOrder) setFormStatus(selectedOrder.status);
  }, [selectedOrder]);

  useEffect(() => {
    Promise.all([
      apiRequest<{ id: string; name: string }[]>('/api/catalogs/brands'),
      apiRequest<{ id: string; name: string }[]>('/api/catalogs/categories'),
      apiRequest<CatalogModel[]>('/api/catalogs/models'),
    ])
      .then(([brandData, categoryData, modelData]) => {
        setBrands(brandData.map((item) => item.name));
        setCategories(categoryData.map((item) => item.name));
        setModels(modelData);
      })
      .catch((err) => {
        toast(err instanceof Error ? err.message : 'No se pudieron cargar los catálogos de marcas y modelos.', 'error');
      });
  }, []);

  const modelsForSelectedBrand = models
    .filter((item) => item.brandName.toLowerCase() === newOrderBrand.trim().toLowerCase())
    .map((item) => item.name);

  const generatePDF = (order: WorkOrder) => {
    const workshopName = (workshop.name || 'TALLER MECÁNICO').toUpperCase();
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(255, 107, 0);
    doc.text(`${workshopName} - ORDEN DE TRABAJO`, 10, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    if (workshop.address) doc.text(workshop.address, 10, 26);
    if (workshop.phone) doc.text(`Tel: ${workshop.phone}`, 10, 30);
    doc.setTextColor(0);
    doc.text(`OT N°: ${order.orderNumber.toString().padStart(5, '0')}`, 10, workshop.address || workshop.phone ? 38 : 30);
    doc.text(`Fecha: ${toDateValue(order.createdAt)?.toLocaleString() || 'Pendiente de sincronización'}`, 10, workshop.address || workshop.phone ? 43 : 35);
    
    const hasExtra = !!(workshop.address || workshop.phone);
    const baseY = hasExtra ? 52 : 44;

    doc.setFontSize(12);
    doc.text('INFORMACION DEL CLIENTE', 10, baseY);
    doc.line(10, baseY + 2, 200, baseY + 2);
    doc.setFontSize(10);
    doc.text(`Cliente: ${order.clientName}`, 10, baseY + 10);
    doc.text(`C.I./ID: ${order.clientCI}`, 10, baseY + 15);

    doc.setFontSize(12);
    doc.text('DETALLES DEL EQUIPO', 10, baseY + 30);
    doc.line(10, baseY + 32, 200, baseY + 32);
    doc.setFontSize(10);
    doc.text(`Maquina: ${order.machineName} - ${order.machineModel}`, 10, baseY + 40);
    doc.text(`Marca: ${order.brand}`, 10, baseY + 45);
    doc.text(`S/N: ${order.serialNumber}`, 10, baseY + 50);
    doc.text(`Descripcion del Problema: ${order.description}`, 10, baseY + 60);

    if (order.parts?.length) {
      (doc as any).autoTable({
        startY: baseY + 70,
        head: [['Repuesto', 'Cant.', 'Precio Unit.', 'Subtotal']],
        body: order.parts.map((part) => [
          part.description,
          part.quantity,
          `G ${part.price.toLocaleString()}`,
          `G ${(part.price * part.quantity).toLocaleString()}`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [255, 107, 0] },
      });
    }

    const finalY = (doc as any).lastAutoTable?.finalY || (baseY + 70);
    doc.setFontSize(10);
    doc.text(`Costo Mano de Obra: G ${order.laborCost.toLocaleString()}`, 10, finalY + 10);
    doc.setFontSize(13);
    doc.setTextColor(255, 107, 0);
    doc.text(`TOTAL FINAL: G ${order.total.toLocaleString()}`, 10, finalY + 20);
    doc.setTextColor(0);
    
    doc.save(`OT_${order.id.slice(-4)}.pdf`);
  };

  const generateQuotePDF = (order: WorkOrder) => {
    const workshopName = (workshop.name || 'TALLER MECÁNICO').toUpperCase();
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(255, 107, 0);
    doc.text(`${workshopName} - PRESUPUESTO`, 10, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    if (workshop.address) doc.text(workshop.address, 10, 26);
    if (workshop.phone) doc.text(`Tel: ${workshop.phone}`, 10, 30);
    doc.setTextColor(200, 0, 0);
    doc.setFontSize(11);
    doc.text('** DOCUMENTO DE PRESUPUESTO — NO ES UNA ORDEN DEFINITIVA **', 10, workshop.address || workshop.phone ? 36 : 28);
    doc.setTextColor(0);
    doc.setFontSize(10);
    const y0 = workshop.address || workshop.phone ? 45 : 37;
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-PY')}`, 10, y0);
    doc.text(`Cliente: ${order.clientName}   CI: ${order.clientCI}`, 10, y0 + 6);
    doc.text(`Equipo: ${order.brand} ${order.machineName} ${order.machineModel}   S/N: ${order.serialNumber || '—'}`, 10, y0 + 12);
    doc.text(`Falla reportada: ${order.description}`, 10, y0 + 18);
    const baseY = y0 + 28;
    if (order.parts?.length) {
      (doc as any).autoTable({
        startY: baseY,
        head: [['Repuesto / Servicio', 'Cant.', 'Precio Unit.', 'Subtotal']],
        body: [
          ...order.parts.map(p => [p.description, p.quantity, `G ${p.price.toLocaleString()}`, `G ${(p.price * p.quantity).toLocaleString()}`]),
          ...(order.laborCost > 0 ? [['Mano de Obra / Servicio Técnico', 1, `G ${order.laborCost.toLocaleString()}`, `G ${order.laborCost.toLocaleString()}`]] : []),
        ],
        theme: 'striped',
        headStyles: { fillColor: [255, 107, 0] },
      });
    }
    const finalY = (doc as any).lastAutoTable?.finalY || (baseY + 20);
    doc.setFontSize(13);
    doc.setTextColor(255, 107, 0);
    doc.text(`TOTAL ESTIMADO: G ${order.total.toLocaleString()}`, 10, finalY + 14);
    doc.setTextColor(0);
    doc.setFontSize(9);
    doc.text('Este presupuesto tiene validez de 15 días. El total puede variar según diagnóstico definitivo.', 10, finalY + 24);
    doc.save(`Presupuesto_OT_${String(order.orderNumber).padStart(5, '0')}.pdf`);
  };

  const openWhatsApp = (order: WorkOrder) => {
    const phone = (order as WorkOrder & { clientPhone?: string }).clientPhone;
    const num = phone ? phone.replace(/\D/g, '') : '';
    const msg = encodeURIComponent(
      `Hola ${order.clientName}, le informamos que su equipo (${order.brand} ${order.machineName} ${order.machineModel}) está listo para retirar en nuestro taller. ` +
      `OT N° ${String(order.orderNumber).padStart(5, '0')}. Gracias por confiar en ${workshop.name || 'nuestro taller'}.`
    );
    const url = num ? `https://wa.me/${num}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    Promise.all([
      apiRequest<WorkOrder[]>('/api/work-orders'),
      apiRequest<Mechanic[]>('/api/mechanics'),
      apiRequest<Part[]>('/api/parts'),
    ])
      .then(([ordersData, mechanicsData, partsData]) => {
        setOrders(ordersData);
        setMechanics(mechanicsData.filter((mechanic) => mechanic.active));
        setInventory(partsData);
      })
      .catch((error) => {
        toast(error instanceof Error ? error.message : 'No se pudieron cargar las órdenes de trabajo.', 'error');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!currentUser || mechanics.length === 0) {
      setCurrentMechanic(null);
      return;
    }

    const matchedMechanic = mechanics.find((mechanic) =>
      mechanic.linkedUserId === currentUser.id ||
      (!!mechanic.linkedEmail && mechanic.linkedEmail.toLowerCase() === (currentUser.email || '').toLowerCase())
    ) || null;

    setCurrentMechanic(matchedMechanic);
  }, [currentUser, mechanics]);

  useEffect(() => {
    if (!portalMode || !currentUser?.id || !currentMechanic) {
      setAssignmentAlerts([]);
      return;
    }

    const storageKey = `stihl-mechanic-seen-orders:${currentUser.id}`;
    let seenOrderIds: Set<string>;
    try {
      seenOrderIds = new Set<string>(JSON.parse(window.localStorage.getItem(storageKey) || '[]'));
    } catch {
      seenOrderIds = new Set<string>();
    }
    const assignedOrders = orders.filter((order) => order.mechanicId === currentMechanic.id);
    const newAssignments = assignedOrders.filter((order) => !seenOrderIds.has(order.id));

    if (newAssignments.length > 0) {
      setAssignmentAlerts(newAssignments);
      const updatedSeenIds = Array.from(new Set([...seenOrderIds, ...assignedOrders.map((order) => order.id)]));
      window.localStorage.setItem(storageKey, JSON.stringify(updatedSeenIds));
      // Notificación push/local para cada nueva asignación (Android)
      for (const order of newAssignments) {
        notifyNewAssignment(order.orderNumber ?? 0, order.clientName);
      }
    }
  }, [portalMode, currentMechanic, currentUser, orders]);

  const handleSerialChange = (sn: string) => {
    setSerialInput(sn);
    setRelatedOrder(null);
    setWarrantyType('');
    setWarrantyNotes('');
    if (sn.trim().length >= 3) {
      const prev = orders.filter(
        (o) => o.serialNumber && o.serialNumber.toLowerCase() === sn.trim().toLowerCase()
      );
      setPreviousOrders(prev);
    } else {
      setPreviousOrders([]);
    }
  };

  const openNewOrderModal = () => {
    setSerialInput('');
    setPreviousOrders([]);
    setWarrantyType('');
    setWarrantyNotes('');
    setRelatedOrder(null);
    setNewOrderBrand('');
    setIsModalOpen(true);
  };

  const createOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const clientName = formData.get('clientName') as string;

    if (previousOrders.length > 0 && !warrantyType) {
      toast('Esta máquina tiene historial. Debes indicar si es garantía o ingreso nuevo.', 'error');
      return;
    }
    
    try {
      const mech = mechanics.find(m => m.id === formData.get('mechanicId'));
      const created = await apiRequest<WorkOrder>('/api/work-orders', {
        method: 'POST',
        body: JSON.stringify({
          clientName,
          clientCI: formData.get('clientCI') as string,
          phone: formData.get('phone') as string,
          address: formData.get('address') as string,
          machineName: formData.get('machineName') as string,
          brand: formData.get('brand') as string,
          machineModel: formData.get('machineModel') as string,
          serialNumber: formData.get('serialNumber') as string,
          accessories: formData.get('accessories') as string,
          observations: formData.get('observations') as string,
          description: formData.get('description') as string,
          mechanicId: (formData.get('mechanicId') as string) || null,
          mechanicName: mech?.name || null,
          warrantyType: warrantyType || null,
          warrantyNotes: warrantyNotes || null,
          relatedOrderId: relatedOrder?.id || null,
          auditTrail: [buildAuditEntry('order_created', `Recepción inicial para ${clientName}${warrantyType ? ` [${warrantyType === 'warranty' ? 'GARANTÍA DE TALLER' : 'REINGRESO — Error de usuario'}]` : ''}`)],
        }),
      });
      setOrders((current) => [created, ...current]);
      setIsModalOpen(false);
      setSerialInput('');
      setPreviousOrders([]);
      setWarrantyType('');
      setWarrantyNotes('');
      setRelatedOrder(null);
      setNewOrderBrand('');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo crear la orden.', 'error');
    }
  };

  const addPartToOrder = async (part: Part) => {
    if (!selectedOrder) return;

    try {
      const updated = await apiRequest<WorkOrder>(`/api/work-orders/${selectedOrder.id}/parts`, {
        method: 'POST',
        body: JSON.stringify({ partId: part.id, actor: actorName }),
      });
      setOrders((current) => current.map((order) => order.id === updated.id ? updated : order));
      setSelectedOrder(updated);
      setInventory((current) => current.map((entry) => entry.id === part.id ? { ...entry, stock: Math.max(0, entry.stock - 1) } : entry));
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo agregar el repuesto.', 'error');
    }
  };

  const removePartFromOrder = async (index: number) => {
    if (!selectedOrder) return;
    const removedPart = getOrderParts(selectedOrder)[index];
    if (!removedPart) return;

    try {
      const updated = await apiRequest<WorkOrder>(`/api/work-orders/${selectedOrder.id}/parts/${removedPart.partId}`, {
        method: 'DELETE',
        body: JSON.stringify({ actor: actorName }),
      });
      setOrders((current) => current.map((order) => order.id === updated.id ? updated : order));
      setSelectedOrder(updated);
      setInventory((current) => current.map((entry) => entry.id === removedPart.partId ? { ...entry, stock: entry.stock + 1 } : entry));
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo quitar el repuesto.', 'error');
    }
  };

  const updateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedOrder) return;
    const formData = new FormData(e.currentTarget);
    const status = formData.get('status') as OrderStatus;
    // En portal mode el mecánico no puede cambiar costo ni asignación — preservar valores actuales
    const laborCost = portalMode
      ? (selectedOrder.laborCost || 0)
      : Number(formData.get('laborCost')) || 0;
    const mechanicId = portalMode
      ? (selectedOrder.mechanicId || null)
      : ((formData.get('mechanicId') as string) || null);
    const mech = portalMode
      ? mechanics.find(m => m.id === selectedOrder.mechanicId)
      : mechanics.find(m => m.id === formData.get('mechanicId'));
    // Preservar el nombre del mecánico si la ficha fue eliminada o no se encuentra
    const resolvedMechanicName = mech?.name ?? selectedOrder.mechanicName ?? null;
    const cancellationReason = (formData.get('cancellationReason') as string) || '';
    const cancellationAuthorizedBy = (formData.get('cancellationAuthorizedBy') as string) || '';

    if (status === 'cancelled' && currentRole !== 'admin') {
      toast('Solo un administrador puede anular órdenes de trabajo.', 'error');
      return;
    }

    if (status === 'cancelled' && (!cancellationReason.trim() || !cancellationAuthorizedBy.trim())) {
      toast('Las anulaciones deben registrar motivo y autorización.', 'error');
      return;
    }

    // Requiere diagnóstico documentado al marcar como Terminado
    const findings = formData.get('findings') as string;
    if (status === 'finished' && !findings?.trim()) {
      toast('Debe completar el campo "Diagnóstico Final" antes de marcar la orden como Terminada.', 'error');
      return;
    }

    const auditTrail = [...(selectedOrder.auditTrail || [])];

    if (selectedOrder.laborCost !== laborCost) {
      auditTrail.push(buildAuditEntry('labor_cost_updated', `Mano de obra de ₲ ${selectedOrder.laborCost.toLocaleString()} a ₲ ${laborCost.toLocaleString()}`));
    }

    if (selectedOrder.status !== status) {
      auditTrail.push(buildAuditEntry('status_updated', `Estado de ${selectedOrder.status} a ${status}`));
    }

    const data: Record<string, unknown> = {
      status,
      findings: formData.get('findings') as string,
      laborCost,
      total: (selectedOrder.partsCost || 0) + laborCost,
      mechanicId,
      mechanicName: resolvedMechanicName,
      finishedAt: status === 'finished' ? new Date().toISOString() : selectedOrder.finishedAt || null,
      auditTrail,
    };

    if (status === 'cancelled') {
      data.cancellationReason = cancellationReason.trim();
      data.cancellationAuthorizedBy = cancellationAuthorizedBy.trim();
      data.auditTrail = [
        ...auditTrail,
        buildAuditEntry('cancelled', `${cancellationAuthorizedBy.trim()}: ${cancellationReason.trim()}`),
      ];
    }

    try {
      const updated = await apiRequest<WorkOrder>(`/api/work-orders/${selectedOrder.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      setOrders((current) => current.map((order) => order.id === updated.id ? updated : order));
      setSelectedOrder(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo actualizar la orden.', 'error');
    }
  };

  const [machineHistory, setMachineHistory] = useState<WorkOrder[]>([]);
  useEffect(() => {
    if (selectedOrder?.machineId) {
      setMachineHistory(orders.filter((order) => order.machineId === selectedOrder.machineId && order.id !== selectedOrder.id));
    } else {
      setMachineHistory([]);
    }
  }, [orders, selectedOrder]);

  const deleteOrder = async (id: string) => {
    if (!window.confirm('¿Eliminar esta orden?')) return;
    try { 
      await apiRequest<void>(`/api/work-orders/${id}`, { method: 'DELETE' });
      setOrders((current) => current.filter((order) => order.id !== id));
    } catch (error) { 
      toast(error instanceof Error ? error.message : 'No se pudo eliminar la orden.', 'error'); 
    }
  };

  const searchVal = globalSearch || searchTerm;
  const scopedOrders = portalMode
    ? orders.filter((order) => currentMechanic ? order.mechanicId === currentMechanic.id : false)
    : orders;
  const filteredOrders = scopedOrders.filter(o => 
    o.clientName.toLowerCase().includes(searchVal.toLowerCase()) ||
    o.clientCI.includes(searchVal) ||
    o.machineName.toLowerCase().includes(searchVal.toLowerCase()) ||
    o.orderNumber?.toString().includes(searchVal)
  );


  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-black text-sidebar-bg italic tracking-tight uppercase">{portalMode ? 'Portal del Mecánico' : 'Gestión de Taller'}</h1>
          <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">{portalMode ? 'Órdenes asignadas a tu cuenta de trabajo' : 'Órdenes de servicio y asignaciones'}</p>
        </div>
        {!portalMode && (
          <button 
            onClick={() => openNewOrderModal()}
            className="bg-primary text-white px-6 py-3 rounded-lg text-xs font-bold shadow-lg shadow-orange-100 hover:brightness-110 transition-all uppercase tracking-tight"
          >
            + Nueva Recepción
          </button>
        )}
      </div>

      {portalMode && !currentMechanic && !loading && (
        <div className="mb-6 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
          <p className="text-[10px] font-black text-amber-700 uppercase tracking-[0.18em]">Acceso pendiente de vinculación</p>
          <p className="text-sm text-amber-900 mt-2">Tu usuario tiene rol mecánico, pero todavía no está enlazado a una ficha de mecánico. Un administrador debe hacerlo desde Staff Mecánico.</p>
        </div>
      )}

      {portalMode && currentMechanic && (
        <>
          <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-6">
            <div>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.18em]">Sesión del mecánico</p>
              <h2 className="text-lg font-black text-sidebar-bg italic uppercase tracking-tight mt-1">{currentMechanic.name}</h2>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">{currentMechanic.specialty}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">OT asignadas</p>
              <p className="text-3xl font-black text-primary italic">{scopedOrders.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Pendientes', value: scopedOrders.filter((order) => order.status === 'pending').length, tone: 'bg-orange-50 text-orange-600 border-orange-100' },
              { label: 'En taller', value: scopedOrders.filter((order) => order.status === 'in_progress').length, tone: 'bg-sky-50 text-sky-600 border-sky-100' },
              { label: 'Esperando repuestos', value: scopedOrders.filter((order) => order.status === 'awaiting_parts').length, tone: 'bg-amber-50 text-amber-600 border-amber-100' },
              { label: 'Terminadas', value: scopedOrders.filter((order) => order.status === 'finished').length, tone: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
            ].map((card) => (
              <div key={card.label} className={`rounded-2xl border p-4 shadow-sm ${card.tone}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.18em]">{card.label}</p>
                <p className="text-3xl font-black italic mt-2">{card.value}</p>
              </div>
            ))}
          </div>

          {assignmentAlerts.length > 0 && (
            <div className="mb-6 bg-primary text-white rounded-2xl shadow-lg shadow-orange-100 p-5">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">Nuevas órdenes asignadas</p>
                  <p className="text-lg font-black italic">Tienes {assignmentAlerts.length} OT nueva{assignmentAlerts.length > 1 ? 's' : ''} por revisar.</p>
                </div>
                <button onClick={() => setAssignmentAlerts([])} className="border border-white/20 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] hover:bg-white/10 transition-colors">Ocultar</button>
              </div>
              <div className="space-y-2">
                {assignmentAlerts.slice(0, 3).map((order) => (
                  <div key={order.id} className="bg-white/10 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.15em]">OT {order.orderNumber?.toString().padStart(5, '0')}</p>
                      <p className="text-sm font-bold">{order.clientName} · {order.machineName} {order.machineModel}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.15em]">{statusLabel(order.status)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input 
          type="text" 
          placeholder="Filtrar por cliente, CI o máquina..." 
          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400 italic text-sm">Cargando órdenes...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-2 text-gray-400">
            <Search className="w-8 h-8" />
            <p className="text-sm font-bold italic">No se encontraron órdenes.</p>
            {searchTerm && <p className="text-xs">Intentá con otro término de búsqueda.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[880px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">OT</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Cliente / Equipo</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Estado</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Mecánico</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Fecha</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-[11px] font-black text-primary tracking-[0.08em]">{order.orderNumber?.toString().padStart(5, '0') || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-black uppercase italic text-sidebar-bg leading-tight">{order.clientName}</p>
                      <p className="text-[11px] font-semibold text-gray-600">{order.machineName} {order.machineModel} · {order.brand}</p>
                      <p className="text-[11px] text-gray-500 italic truncate max-w-[300px]">"{order.description}"</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded border text-[9px] font-black uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] font-semibold text-gray-600">{order.mechanicName || 'Sin asignar'}</td>
                    <td className="px-4 py-3 text-[11px] font-semibold text-gray-500">{toDateValue(order.createdAt)?.toLocaleDateString('es-PY') || 'Sin fecha'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => setSelectedOrder(order)} className="bg-sidebar-bg text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wide">Detalles</button>
                        {!portalMode && (
                          <button type="button" onClick={() => deleteOrder(order.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors" title="Eliminar orden" aria-label="Eliminar orden">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {!portalMode && isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 relative z-10 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-black text-sidebar-bg italic uppercase tracking-tight mb-6 border-b pb-2">Nueva Recepción</h2>
              <form onSubmit={createOrder} className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Cliente</h3>
                  <input name="clientName" required placeholder="Nombre Completo" className="w-full px-4 py-2 border rounded-xl text-sm" />
                  <input name="clientCI" required placeholder="CI o RUC" className="w-full px-4 py-2 border rounded-xl text-sm" />
                  <input name="phone" required placeholder="Teléfono" className="w-full px-4 py-2 border rounded-xl text-sm" />
                  <input name="address" placeholder="Dirección" className="w-full px-4 py-2 border rounded-xl text-sm" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Equipo</h3>
                  <input name="machineName" required placeholder="Categoría (Ej: Motosierra)" list="categories-list" className="w-full px-4 py-2 border rounded-xl text-sm" />
                  <datalist id="categories-list">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      name="brand"
                      required
                      placeholder="Marca"
                      list="brands-list"
                      className="w-full px-4 py-2 border rounded-xl text-sm"
                      value={newOrderBrand}
                      onChange={(event) => setNewOrderBrand(event.target.value)}
                    />
                    <input
                      name="machineModel"
                      required
                      placeholder="Modelo"
                      list="models-list"
                      className="w-full px-4 py-2 border rounded-xl text-sm"
                    />
                  </div>
                  <datalist id="brands-list">
                    {brands.map(b => <option key={b} value={b} />)}
                  </datalist>
                  <datalist id="models-list">
                    {modelsForSelectedBrand.map((model) => <option key={model} value={model} />)}
                  </datalist>
                  <input name="serialNumber" placeholder="N° de Serie" className="w-full px-4 py-2 border rounded-xl text-sm" value={serialInput} onChange={(e) => handleSerialChange(e.target.value)} />
                  {previousOrders.length > 0 && (
                    <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 space-y-3">
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1">⚠ Historial encontrado — esta máquina ya estuvo en el taller</p>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {previousOrders.map((po) => (
                          <div key={po.id} className={`rounded-lg p-2 text-[10px] border cursor-pointer transition-all ${relatedOrder?.id === po.id ? 'bg-amber-200 border-amber-500' : 'bg-white border-amber-200 hover:border-amber-400'}`} onClick={() => setRelatedOrder(po)}>
                            <div className="flex items-center justify-between">
                              <span className="font-black text-amber-800">OT #{po.orderNumber?.toString().padStart(5, '0')}</span>
                              <span className="font-bold text-gray-500">{po.status}</span>
                            </div>
                            <p className="text-gray-600 italic truncate">"{po.description}"</p>
                            <p className="text-gray-400">{po.mechanicName || 'Sin mecánico'} · {new Date(po.createdAt as string).toLocaleDateString('es-PY')}</p>
                          </div>
                        ))}
                      </div>
                      {relatedOrder && (
                        <div className="space-y-2 pt-2 border-t border-amber-300">
                          <p className="text-[10px] font-black text-amber-700 uppercase">¿Tipo de reingreso?</p>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setWarrantyType('warranty')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase border-2 transition-all ${warrantyType === 'warranty' ? 'bg-green-500 text-white border-green-500' : 'bg-white text-green-700 border-green-300 hover:border-green-500'}`}>
                              ✓ Garantía de taller
                            </button>
                            <button type="button" onClick={() => setWarrantyType('non_warranty')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase border-2 transition-all ${warrantyType === 'non_warranty' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-red-700 border-red-300 hover:border-red-500'}`}>
                              ✗ Reparación nueva
                            </button>
                          </div>
                          {warrantyType && (
                            <input type="text" placeholder={warrantyType === 'warranty' ? 'Motivo de garantía...' : 'Motivo del reingreso...'} value={warrantyNotes} onChange={(e) => setWarrantyNotes(e.target.value)} className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-xs bg-white" />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <input name="accessories" placeholder="Accesorios" className="w-full px-4 py-2 border rounded-xl text-sm" />
                </div>
                <div className="col-span-2 space-y-4">
                   <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Trabajo</h3>
                  <select name="mechanicId" aria-label="Mecánico asignado" className="w-full px-4 py-2 border rounded-xl text-sm font-bold bg-gray-50">
                    <option value="">Seleccionar Mecánico (Opcional)</option>
                    {mechanics.map(m => <option key={m.id} value={m.id}>{m.name} ({m.specialty})</option>)}
                  </select>
                  <textarea name="description" required placeholder="Falla reportada..." className="w-full px-4 py-2 border rounded-xl text-sm" rows={2} />
                  <textarea name="observations" placeholder="Observaciones físicas..." className="w-full px-4 py-2 border rounded-xl text-sm" rows={2} />
                </div>
                <div className="col-span-2 flex gap-3 pt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border rounded-xl text-[10px] font-black uppercase italic tracking-widest">Cancelar</button>
                  <button type="submit" className="flex-[2] bg-primary text-white py-3 rounded-xl font-black text-[10px] uppercase italic tracking-widest shadow-lg shadow-orange-100 transition-all hover:scale-[1.02]">Ingresar a Taller</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedOrder(null)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h2 className="text-2xl font-black text-sidebar-bg tracking-tight italic uppercase">Diagnóstico y Reparación</h2>
                  <p className="text-[9px] font-black text-gray-400 tracking-widest uppercase">OT N°: {selectedOrder.orderNumber?.toString().padStart(5, '0')}</p>
                </div>
                <button type="button" aria-label="Cerrar" onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-6 h-6 text-gray-400" /></button>
              </div>
              {['delivered', 'cancelled'].includes(selectedOrder.status) && (
                <div className={`mx-8 mt-4 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-center ${selectedOrder.status === 'delivered' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {selectedOrder.status === 'delivered' ? 'Orden entregada — solo lectura' : 'Orden anulada — solo lectura'}
                </div>
              )}

              <form onSubmit={updateOrder} className="flex-1 overflow-auto p-8 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-6">
                    {selectedOrder.warrantyType && (
                      <div className={`rounded-xl p-3 border-2 text-[10px] font-black uppercase ${selectedOrder.warrantyType === 'warranty' ? 'bg-green-50 border-green-400 text-green-800' : 'bg-orange-50 border-orange-300 text-orange-800'}`}>
                        {selectedOrder.warrantyType === 'warranty' ? '🔁 GARANTÍA DE TALLER — Reparación sin costo al cliente' : '⚠ REINGRESO POR ERROR DE USUARIO — Reparación normal con costo'}
                        {selectedOrder.relatedOrderNumber && (
                          <span className="block font-bold text-[9px] mt-1 opacity-70">OT anterior: #{selectedOrder.relatedOrderNumber.toString().padStart(5, '0')}</span>
                        )}
                        {selectedOrder.warrantyNotes && (
                          <span className="block font-normal italic mt-1 normal-case">{selectedOrder.warrantyNotes}</span>
                        )}
                      </div>
                    )}
                    <div>
                      <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b pb-1 mb-4">Info Recepción</h3>
                      <p className="text-[9px] font-black text-primary uppercase">Cliente / Equipo</p>
                      <p className="font-black text-sidebar-bg text-sm leading-tight uppercase italic">{selectedOrder.clientName}</p>
                      <p className="font-bold text-gray-500 text-xs italic">{selectedOrder.machineName} {selectedOrder.machineModel}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase">Falla Reportada</p>
                      <p className="text-xs text-sidebar-bg italic font-medium p-3 bg-gray-50 rounded-xl border border-gray-100">"{selectedOrder.description}"</p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b pb-1 flex-1">Repuestos Usados</h3>
                        {!['finished', 'delivered', 'cancelled'].includes(selectedOrder.status) && (
                          <button type="button" onClick={() => setIsAddingPart(!isAddingPart)} className="text-[9px] font-black text-primary uppercase italic ml-2">
                            {isAddingPart ? 'Cerrar' : '+ Agregar'}
                          </button>
                        )}
                      </div>
                      
                      {isAddingPart && (
                        <div className="bg-gray-100 p-3 rounded-xl space-y-2 max-h-40 overflow-y-auto border-2 border-primary/20">
                          {inventory.filter(p => p.stock > 0).map(part => (
                            <div key={part.id} className="flex items-center justify-between bg-white p-2 rounded-lg text-[10px]">
                              <span className="font-bold truncate max-w-[120px]">{part.description}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-primary">₲{part.price.toLocaleString()}</span>
                                <button type="button" aria-label={`Agregar ${part.description}`} onClick={() => addPartToOrder(part)} className="bg-primary text-white p-1 rounded"><Plus className="w-3 h-3" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-2">
                        {getOrderParts(selectedOrder).map((part, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-xs bg-white border border-gray-100 p-2 rounded-lg">
                            <span className="font-medium italic truncate flex-1">{part.description} x{part.quantity}</span>
                            <div className="flex items-center gap-3">
                              <span className="font-bold">₲{(part.price * part.quantity).toLocaleString()}</span>
                              {!['delivered', 'cancelled'].includes(selectedOrder.status) && (
                                <button type="button" onClick={() => removePartFromOrder(idx)} className="text-red-500"><X className="w-3 h-3" /></button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b pb-1">Actualización Técnica</h3>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-primary uppercase">Mecánico Asignado</label>
                      {portalMode ? (
                        <div className="w-full px-4 py-2 border rounded-xl text-xs font-black italic uppercase bg-gray-50 text-gray-500">
                          {selectedOrder.mechanicName || 'Sin asignar'}
                        </div>
                      ) : (
                        <select name="mechanicId" aria-label="Mecánico asignado" defaultValue={selectedOrder.mechanicId} className="w-full px-4 py-2 border rounded-xl text-xs font-black italic uppercase italic bg-white focus:ring-1 focus:ring-primary outline-none">
                          <option value="">Sin asignar</option>
                          {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-primary uppercase">Estado de la OT</label>
                      <select
                        name="status"
                        aria-label="Estado de la orden"
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as OrderStatus)}
                        className="w-full px-4 py-2 border rounded-xl text-xs font-black italic uppercase bg-white focus:ring-1 focus:ring-primary outline-none"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="in_progress">En Taller</option>
                        <option value="awaiting_parts">Faltan Repuestos</option>
                        <option value="finished">Terminado / Facturar</option>
                        {!portalMode && <option value="delivered">Entregado / Pagado</option>}
                        {!portalMode && currentRole === 'admin' && <option value="cancelled">Anulado</option>}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-primary uppercase">Diagnóstico Final</label>
                      <textarea name="findings" defaultValue={selectedOrder.findings} rows={3} className="w-full px-4 py-2 border rounded-xl text-xs italic font-medium focus:ring-1 focus:ring-primary outline-none" placeholder="Qué se encontró y cómo se reparó..." />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-primary uppercase">Costo Mano de Obra (₲)</label>
                      <input name="laborCost" type="number" aria-label="Costo mano de obra en guaraníes" defaultValue={selectedOrder.laborCost} disabled={portalMode} className="w-full px-4 py-2 border rounded-xl text-lg font-black text-primary italic tracking-tight focus:ring-1 focus:ring-primary outline-none disabled:bg-gray-50 disabled:text-gray-400" />
                    </div>

                    <AnimatePresence>
                      {formStatus === 'cancelled' && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-1">
                          <label className="text-[9px] font-black text-red-500 uppercase">Motivo de Anulación</label>
                          <textarea name="cancellationReason" required className="w-full px-4 py-2 border-red-200 border bg-red-50 rounded-xl text-[10px] font-bold italic outline-none" placeholder="Escriba el motivo..." />
                          <input name="cancellationAuthorizedBy" required className="w-full px-4 py-2 border-red-200 border bg-red-50 rounded-xl text-[10px] font-bold italic outline-none" placeholder="Autorizado por" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {machineHistory.length > 0 && (
                      <div className="mt-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b pb-1">Historial del Equipo</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {machineHistory.map(h => (
                            <div key={h.id} className="text-[9px] flex justify-between items-center bg-white p-2 rounded-lg border border-gray-50">
                              <span className="font-bold text-sidebar-bg">N° {h.orderNumber?.toString().padStart(5, '0')}</span>
                              <span className="font-medium italic text-gray-400">{toDateValue(h.createdAt)?.toLocaleDateString() || 'Sin fecha'}</span>
                              <span className="font-black text-primary">₲{h.total.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedOrder.status === 'cancelled' && (
                      <div className="bg-red-50 p-4 rounded-2xl border border-red-100 space-y-2">
                        <h4 className="text-[9px] font-black text-red-500 uppercase tracking-widest border-b border-red-100 pb-2">Control de anulación</h4>
                        <p className="text-[10px] font-bold text-red-800"><span className="uppercase">Motivo:</span> {selectedOrder.cancellationReason || 'No registrado'}</p>
                        <p className="text-[10px] font-bold text-red-800"><span className="uppercase">Autorizado por:</span> {selectedOrder.cancellationAuthorizedBy || 'No registrado'}</p>
                      </div>
                    )}

                    {!!selectedOrder.auditTrail?.length && (
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b pb-1">Auditoría</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {[...selectedOrder.auditTrail].slice(-5).reverse().map((entry, index) => (
                            <div key={`${entry.action}-${index}`} className="bg-white border border-gray-100 rounded-xl p-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-[10px] font-black text-sidebar-bg uppercase tracking-[0.14em]">{actionLabel(entry.action)}</p>
                                <p className="text-[9px] font-bold text-gray-400">{toDateValue(entry.at)?.toLocaleString() || String(entry.at)}</p>
                              </div>
                              <p className="text-[10px] font-bold text-primary mt-1">{entry.actor}</p>
                              {entry.detail && <p className="text-[10px] text-gray-500 italic mt-1">{entry.detail}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase italic">Subtotal Repuestos: ₲{(selectedOrder.partsCost || 0).toLocaleString()}</p>
                      <p className="text-3xl font-black text-sidebar-bg italic tracking-tighter leading-none mt-1">Total: ₲ {((selectedOrder.partsCost || 0) + (selectedOrder.laborCost || 0)).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => generateQuotePDF(selectedOrder)} className="flex items-center gap-1.5 text-gray-500 text-[10px] font-black uppercase italic hover:text-primary transition-colors">
                        <FileText className="w-3.5 h-3.5" /> Presupuesto
                      </button>
                      <button type="button" onClick={() => generatePDF(selectedOrder)} className="flex items-center gap-1.5 text-primary text-[10px] font-black uppercase italic hover:underline">
                        <FileText className="w-3.5 h-3.5" /> OT PDF
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    {/* WhatsApp — aparece cuando el equipo está listo */}
                    {['finished', 'delivered'].includes(selectedOrder.status) ? (
                      <button
                        type="button"
                        onClick={() => openWhatsApp(selectedOrder)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-600 transition-colors"
                      >
                        <span>📱</span> Avisar por WhatsApp
                      </button>
                    ) : <span />}
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setSelectedOrder(null)} className="px-6 py-2 border border-gray-200 rounded-xl font-black text-[10px] uppercase italic tracking-widest hover:bg-gray-50 transition-colors">Cerrar</button>
                      {!['delivered', 'cancelled'].includes(selectedOrder.status) && (
                        <button type="submit" className="px-6 py-2 bg-sidebar-bg text-white rounded-xl font-black text-[10px] uppercase italic tracking-widest shadow-lg shadow-gray-200 hover:brightness-110 active:scale-95 transition-all">Actualizar Orden</button>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
