import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Search, Plus, Minus, Trash2, User, CreditCard,
  X, FileText, CheckCircle, Tag,
} from '../lib/icons';
import { apiRequest, getSessionUser } from '../lib/session';
import { useWorkshop } from '../App';
import { toast } from '../lib/toast';
import { Part, Client, Sale, WorkOrder, PaymentMethod, PAYMENT_METHOD_LABELS } from '../types';
import { normCategory as normCat } from '../lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ── Íconos / colores por método de pago ────────────────────────────────────
const PM_CONFIG: Record<PaymentMethod, { icon: string; color: string; bg: string; hint: string }> = {
  cash:     { icon: '💵', color: 'text-green-700',  bg: 'bg-green-50  border-green-200',  hint: 'Billetes y monedas en mano' },
  qr:       { icon: '📱', color: 'text-blue-700',   bg: 'bg-blue-50   border-blue-200',   hint: 'EKO, Zimple, Tigo Money, Personal Pay…' },
  card:     { icon: '💳', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', hint: 'Pasada por terminal POS físico' },
  transfer: { icon: '🏦', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', hint: 'Transferencia bancaria o depósito' },
};

// ── Modal de Forma de Pago ─────────────────────────────────────────────────
interface PaymentData { method: PaymentMethod; ref: string; cashReceived: number; change: number; }

function PaymentModal({
  amount,
  onConfirm,
  onCancel,
}: {
  amount: number;
  onConfirm: (data: PaymentData) => void;
  onCancel: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [cashReceived, setCashReceived] = useState('');
  const [ref, setRef] = useState('');

  const received = Number(cashReceived.replace(/\D/g, '') || 0);
  const change = method === 'cash' && received >= amount ? received - amount : 0;
  const cashOk = method !== 'cash' || received >= amount;
  const canConfirm = !!method && cashOk;

  const quickAmounts = [amount, Math.ceil(amount / 50000) * 50000, Math.ceil(amount / 100000) * 100000]
    .filter((v, i, a) => a.indexOf(v) === i && v >= amount)
    .slice(0, 3);

  const confirm = () => {
    if (!method) return;
    onConfirm({ method, ref: ref.trim(), cashReceived: method === 'cash' ? received : 0, change });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden z-10"
      >
        {/* Cabecera */}
        <div className="bg-sidebar-bg px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Total a cobrar</p>
            <p className="text-white font-black text-2xl italic tracking-tighter">₲ {amount.toLocaleString()}</p>
          </div>
          <button type="button" aria-label="Cerrar" onClick={onCancel} className="text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Selección de método */}
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">¿Cómo paga el cliente?</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(PM_CONFIG) as [PaymentMethod, typeof PM_CONFIG[PaymentMethod]][]).map(([key, cfg]) => (
                <button type="button" key={key} onClick={() => { setMethod(key); setCashReceived(''); setRef(''); }}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${method === key ? `${cfg.bg} border-current ${cfg.color}` : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                >
                  <span className="text-xl leading-none">{cfg.icon}</span>
                  <div>
                    <p className={`text-[11px] font-black uppercase tracking-wide ${method === key ? cfg.color : 'text-gray-700'}`}>{PAYMENT_METHOD_LABELS[key]}</p>
                    <p className="text-[9px] text-gray-400 leading-tight mt-0.5">{cfg.hint}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Efectivo: monto recibido + vuelto */}
          {method === 'cash' && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                  Monto recibido (₲)
                </label>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                  placeholder={`Mínimo ${amount.toLocaleString()}`}
                  autoFocus
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg font-black text-right outline-none focus:border-green-400 transition-colors"
                />
              </div>
              {/* Montos rápidos */}
              <div className="flex gap-2">
                {quickAmounts.map(q => (
                  <button type="button" key={q} onClick={() => setCashReceived(String(q))}
                    className="flex-1 py-2 text-[11px] font-black text-green-700 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors"
                  >
                    ₲ {q.toLocaleString()}
                  </button>
                ))}
              </div>
              {/* Vuelto */}
              {received >= amount && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
                  <p className="text-[11px] font-black text-green-700 uppercase tracking-widest">Vuelto</p>
                  <p className="text-xl font-black text-green-700 italic">₲ {change.toLocaleString()}</p>
                </div>
              )}
              {cashReceived && received < amount && (
                <p className="text-[11px] font-bold text-red-500 text-center">
                  Faltan ₲ {(amount - received).toLocaleString()} para completar el pago
                </p>
              )}
            </div>
          )}

          {/* QR / Tarjeta / Transferencia: referencia opcional */}
          {method && method !== 'cash' && (
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                N° de referencia / comprobante <span className="text-gray-300 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={ref}
                onChange={e => setRef(e.target.value)}
                autoFocus
                placeholder={
                  method === 'qr' ? 'Ej: Confirmación EKO 123456' :
                  method === 'card' ? 'Ej: Cupón POS 000456' :
                  'Ej: Transferencia ref. 789012'
                }
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-primary transition-colors"
              />
              <p className="text-[10px] text-gray-400 mt-1.5">
                {method === 'qr'
                  ? 'Verificá en la app del banco que el pago fue recibido antes de confirmar.'
                  : method === 'card'
                  ? 'Ingresá el número del ticket del POS físico como respaldo.'
                  : 'Ingresá el ID de la transferencia para el registro contable.'}
              </p>
            </div>
          )}

          {/* Botón confirmar */}
          <button
            type="button"
            onClick={confirm}
            disabled={!canConfirm}
            className="w-full py-3.5 bg-primary text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md shadow-orange-100 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-40 disabled:grayscale flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {method ? `Confirmar cobro — ${PAYMENT_METHOD_LABELS[method]}` : 'Seleccioná una forma de pago'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export default function POSModule() {
  const { settings: workshop } = useWorkshop();
  const [items, setItems] = useState<Part[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cart, setCart] = useState<{ part: Part; quantity: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [discountAuthorizedBy, setDiscountAuthorizedBy] = useState('');
  const [pendingReceipt, setPendingReceipt] = useState<{ sale: Sale; client: Client; saleItems: { part: Part; quantity: number }[] } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [activeTab, setActiveTab] = useState<'direct' | 'workorder' | 'caja'>('direct');
  const [finishedOrders, setFinishedOrders] = useState<WorkOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [woDiscount, setWoDiscount] = useState(0);
  const [woDiscountReason, setWoDiscountReason] = useState('');
  const [woDiscountAuthorizedBy, setWoDiscountAuthorizedBy] = useState('');
  const [woProcessing, setWoProcessing] = useState(false);
  const [showWoPaymentModal, setShowWoPaymentModal] = useState(false);

  // Historial de compras del cliente seleccionado
  const [clientPurchases, setClientPurchases] = useState<{ id: string; total: number; createdAt: string; payment_method: string; type: string; items: { description: string; quantity: number; price: number }[] }[]>([]);
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);

  // Corte de caja
  type CashRegister = { id: string; opened_by: string; opened_at: string; opening_balance: number; sales_total?: number; status: string };
  const [currentCaja, setCurrentCaja] = useState<CashRegister | null>(null);
  const [cajaLoading, setCajaLoading] = useState(false);
  const [showOpenCaja, setShowOpenCaja] = useState(false);
  const [showCloseCaja, setShowCloseCaja] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [cajaHistory, setCajaHistory] = useState<CashRegister[]>([]);

  useEffect(() => {
    Promise.all([apiRequest<Part[]>('/api/parts'), apiRequest<Client[]>('/api/clients')])
      .then(([parts, clientList]) => { setItems(parts); setClients(clientList); })
      .catch(err => toast(err instanceof Error ? err.message : 'No se pudieron cargar los datos.', 'error'));
  }, []);

  const loadFinishedOrders = () => {
    setOrdersLoading(true);
    apiRequest<WorkOrder[]>('/api/work-orders')
      .then(orders => setFinishedOrders(orders.filter(o => o.status === 'finished')))
      .catch(err => toast(err instanceof Error ? err.message : 'Error al cargar órdenes.', 'error'))
      .finally(() => setOrdersLoading(false));
  };

  const loadClientHistory = (clientId: string) => {
    apiRequest<typeof clientPurchases>(`/api/clients/${clientId}/purchases`)
      .then(setClientPurchases)
      .catch(() => setClientPurchases([]));
  };

  const loadCaja = () => {
    setCajaLoading(true);
    Promise.all([
      apiRequest<CashRegister | null>('/api/cash-register/current'),
      apiRequest<CashRegister[]>('/api/cash-register/history').catch(() => []),
    ])
      .then(([current, history]) => { setCurrentCaja(current); setCajaHistory(history); })
      .catch(() => {})
      .finally(() => setCajaLoading(false));
  };

  const handleOpenCaja = async () => {
    try {
      await apiRequest('/api/cash-register/open', { method: 'POST', body: JSON.stringify({ openingBalance: Number(openingBalance) || 0 }) });
      setShowOpenCaja(false); setOpeningBalance('');
      toast('Caja abierta.', 'success');
      loadCaja();
    } catch (err) { toast(err instanceof Error ? err.message : 'Error al abrir caja.', 'error'); }
  };

  const handleCloseCaja = async () => {
    try {
      await apiRequest('/api/cash-register/close', { method: 'POST', body: JSON.stringify({ closingBalance: Number(closingBalance) || 0 }) });
      setShowCloseCaja(false); setClosingBalance('');
      toast('Caja cerrada correctamente.', 'success');
      loadCaja();
    } catch (err) { toast(err instanceof Error ? err.message : 'Error al cerrar caja.', 'error'); }
  };

  useEffect(() => { if (activeTab === 'workorder') loadFinishedOrders(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'caja') loadCaja(); }, [activeTab]);
  useEffect(() => {
    if (selectedClient) { loadClientHistory(selectedClient.id); setShowPurchaseHistory(false); }
    else { setClientPurchases([]); setShowPurchaseHistory(false); }
  }, [selectedClient]);

  const addToCart = (part: Part) => {
    if (part.stock <= 0) return;
    setCart(prev => {
      const ex = prev.find(i => i.part.id === part.id);
      if (ex) {
        if (ex.quantity >= part.stock) return prev;
        return prev.map(i => i.part.id === part.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { part, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) =>
    setCart(prev => prev.map(i =>
      i.part.id === id ? { ...i, quantity: Math.max(1, Math.min(i.part.stock, i.quantity + delta)) } : i
    ));

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.part.id !== id));

  const subtotal = cart.reduce((a, i) => a + i.part.price * i.quantity, 0);
  const appliedDiscount = Math.min(Math.max(discount, 0), subtotal);
  const total = subtotal - appliedDiscount;

  const currentUser = getSessionUser();
  const actorName = currentUser?.displayName || currentUser?.email || 'Caja';
  const workshopName = (workshop.name || 'TALLER MECÁNICO').toUpperCase();

  // ── PDF Factura A4 ──────────────────────────────────────────────────────
  const generateReceipt = (sale: Sale, client: Client, saleItems: { part: Part; quantity: number }[]) => {
    const doc = new jsPDF();
    const pm = sale.paymentMethod ? PAYMENT_METHOD_LABELS[sale.paymentMethod] : 'Efectivo';

    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setFontSize(15); doc.setTextColor(255, 107, 0); doc.setFont('helvetica', 'bold');
    doc.text(workshopName, 10, 13);
    doc.setFontSize(8); doc.setTextColor(160, 160, 160); doc.setFont('helvetica', 'normal');
    if (workshop.tagline) doc.text(workshop.tagline, 10, 19);
    if (workshop.address) doc.text(workshop.address, 10, 24);
    if (workshop.phone) doc.text(`Tel: ${workshop.phone}`, 10, 29);
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text(`Fecha: ${new Date().toLocaleString('es-PY')}`, 140, 19);
    doc.text(`Cajero: ${actorName}`, 140, 24);
    doc.text(`Forma de pago: ${pm}`, 140, 29);

    doc.setFontSize(11); doc.setTextColor(0); doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL CLIENTE', 10, 42);
    doc.setDrawColor(230); doc.line(10, 44, 200, 44);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(60);
    doc.text(`Nombre: ${client.name}`, 10, 51);
    doc.text(`CI / RUC: ${client.ci || '—'}`, 10, 57);
    if (client.phone) doc.text(`Tel: ${client.phone}`, 10, 63);

    (doc as any).autoTable({
      startY: 72,
      head: [['Código', 'Descripción', 'P. Unitario', 'Cant.', 'Subtotal']],
      body: saleItems.map(i => [i.part.code, i.part.description, `₲ ${i.part.price.toLocaleString()}`, String(i.quantity), `₲ ${(i.part.price * i.quantity).toLocaleString()}`]),
      theme: 'striped',
      headStyles: { fillColor: [26, 26, 26], textColor: [255, 107, 0], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'center' }, 4: { halign: 'right' } },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 80;
    doc.setFontSize(9); doc.setTextColor(80);
    doc.text('Subtotal:', 130, finalY + 10);
    doc.text(`₲ ${sale.subtotal.toLocaleString()}`, 200, finalY + 10, { align: 'right' });

    if (sale.discount > 0) {
      doc.setTextColor(180, 0, 0);
      doc.text('Descuento:', 130, finalY + 17);
      doc.text(`- ₲ ${sale.discount.toLocaleString()}`, 200, finalY + 17, { align: 'right' });
      doc.setTextColor(100);
      doc.text(`Motivo: ${sale.discountReason || '—'} | Aut: ${sale.discountAuthorizedBy || '—'}`, 10, finalY + 17);
    }

    doc.setDrawColor(255, 107, 0); doc.setLineWidth(0.5);
    doc.line(130, finalY + 20, 200, finalY + 20);
    doc.setFontSize(13); doc.setTextColor(26, 26, 26); doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 130, finalY + 28);
    doc.setTextColor(255, 107, 0);
    doc.text(`₲ ${sale.total.toLocaleString()}`, 200, finalY + 28, { align: 'right' });

    if (sale.paymentMethod === 'cash' && sale.paymentRef) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80);
      const vueltoNum = Number(sale.paymentRef) || 0;
      if (vueltoNum > 0) doc.text(`Vuelto entregado: ₲ ${vueltoNum.toLocaleString()}`, 130, finalY + 36);
    } else if (sale.paymentRef) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100);
      doc.text(`Ref: ${sale.paymentRef}`, 130, finalY + 36);
    }

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150);
    doc.text('¡Gracias por su compra! — No válido como factura legal.', 10, finalY + 44);
    doc.save(`Recibo_${Date.now()}.pdf`);
  };

  // ── Ticket térmico 80mm ──────────────────────────────────────────────────
  const printTicket = (sale: Sale, client: Client, saleItems: { part: Part; quantity: number }[]) => {
    const pm = sale.paymentMethod ? PAYMENT_METHOD_LABELS[sale.paymentMethod] : 'Efectivo';
    const rows = saleItems.map(i => `
      <tr>
        <td style="text-align:left;padding:2px 0;word-break:break-word;max-width:130px">${i.part.description}</td>
        <td style="text-align:center;padding:2px 4px">${i.quantity}</td>
        <td style="text-align:right;padding:2px 0;white-space:nowrap">${(i.part.price * i.quantity).toLocaleString()} Gs</td>
      </tr>
      <tr><td colspan="3" style="font-size:9px;color:#666;padding-bottom:3px">${i.part.code} — ${i.part.price.toLocaleString()} Gs/u</td></tr>
    `).join('');

    const discRow = sale.discount > 0
      ? `<tr><td colspan="2">Descuento:</td><td style="text-align:right;color:#c00">-${sale.discount.toLocaleString()} Gs</td></tr>`
      : '';
    const vueltoRow = sale.paymentMethod === 'cash' && sale.paymentRef
      ? `<tr><td colspan="2" style="font-size:9px">Vuelto:</td><td style="text-align:right;font-size:9px">${Number(sale.paymentRef).toLocaleString()} Gs</td></tr>`
      : '';
    const refLine = sale.paymentRef && sale.paymentMethod !== 'cash'
      ? `<div style="font-size:9px;color:#555">Ref: ${sale.paymentRef}</div>`
      : '';

    const html = `<!DOCTYPE html><html><head>
      <meta charset="UTF-8"><title>Ticket</title>
      <style>@page{margin:0;size:80mm auto}*{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Courier New',monospace;font-size:11px;width:72mm;padding:4mm 3mm}
      .c{text-align:center}.b{font-weight:bold}.r{text-align:right}
      .d{border-top:1px dashed #000;margin:4px 0}
      table{width:100%;border-collapse:collapse}
      th{font-size:10px;border-bottom:1px solid #000;padding-bottom:2px;text-align:left}
      .tot td{font-size:13px;font-weight:bold;padding-top:4px}</style>
    </head><body>
      <div class="c b" style="font-size:14px;letter-spacing:1px">${workshopName}</div>
      ${workshop.tagline ? `<div class="c" style="font-size:9px">${workshop.tagline}</div>` : ''}
      ${workshop.phone ? `<div class="c" style="font-size:9px">Tel: ${workshop.phone}</div>` : ''}
      <div class="d"></div>
      <div>Fecha: ${new Date().toLocaleString('es-PY')}</div>
      <div>Cajero: ${actorName}</div>
      <div>Pago: ${pm}</div>
      <div class="d"></div>
      <div class="b">CLIENTE</div>
      <div>${client.name}</div>
      <div style="font-size:10px">CI/RUC: ${client.ci || '—'}</div>
      <div class="d"></div>
      <table>
        <thead><tr><th>Descripción</th><th style="text-align:center">Cant</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${rows}
          <tr class="d"><td colspan="3"></td></tr>
          <tr><td colspan="2">Subtotal:</td><td class="r">${sale.subtotal.toLocaleString()} Gs</td></tr>
          ${discRow}
          <tr class="tot"><td colspan="2">TOTAL:</td><td class="r">${sale.total.toLocaleString()} Gs</td></tr>
          ${vueltoRow}
        </tbody>
      </table>
      ${refLine}
      <div class="d"></div>
      <div class="c" style="font-size:9px;color:#444">¡Gracias por su compra!</div>
      <div class="c" style="font-size:8px;color:#888;margin-top:2px">No válido como factura legal</div>
      <div style="margin-top:16px"></div>
    </body></html>`;

    const win = window.open('', '_blank', 'width=400,height=600,toolbar=0,menubar=0');
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 300); }
  };

  // ── Procesar venta directa ───────────────────────────────────────────────
  const processSale = async (paymentData: PaymentData) => {
    if (cart.length === 0 || !selectedClient) return;
    setIsProcessing(true);
    const cartSnap = [...cart];
    const clientSnap = selectedClient;
    try {
      const created = await apiRequest<Sale>('/api/sales', {
        method: 'POST',
        body: JSON.stringify({
          clientId: selectedClient.id, clientName: selectedClient.name,
          items: cart.map(i => ({ partId: i.part.id, code: i.part.code, description: i.part.description, price: i.part.price, quantity: i.quantity })),
          subtotal, discount: appliedDiscount,
          discountReason: appliedDiscount > 0 ? discountReason.trim() : null,
          discountAuthorizedBy: appliedDiscount > 0 ? discountAuthorizedBy.trim() : null,
          total, type: 'direct', createdBy: actorName,
          paymentMethod: paymentData.method,
          paymentRef: paymentData.method === 'cash'
            ? (paymentData.change > 0 ? String(paymentData.change) : null)
            : (paymentData.ref || null),
          auditTrail: [{
            action: 'sale_created', actor: actorName, at: new Date().toISOString(),
            detail: `${PAYMENT_METHOD_LABELS[paymentData.method]} — ₲ ${total.toLocaleString()}${paymentData.change > 0 ? ` (vuelto ₲ ${paymentData.change.toLocaleString()})` : ''}${paymentData.ref ? ` | Ref: ${paymentData.ref}` : ''}`,
          }],
        }),
      });
      setPendingReceipt({ sale: created, client: clientSnap, saleItems: cartSnap });
      setItems(curr => curr.map(p => { const ci = cart.find(e => e.part.id === p.id); return ci ? { ...p, stock: Math.max(0, p.stock - ci.quantity) } : p; }));
      setCart([]); setSelectedClient(null); setDiscount(0); setDiscountReason(''); setDiscountAuthorizedBy(''); setClientSearch(''); setShowClientSearch(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo procesar la venta.', 'error');
    } finally { setIsProcessing(false); }
  };

  // ── Procesar cobro de reparación ─────────────────────────────────────────
  const processWorkOrderSale = async (paymentData: PaymentData) => {
    if (!selectedOrder) return;
    setWoProcessing(true);
    try {
      // Refrescar la OT desde el servidor para evitar cobrar con datos desactualizados
      const freshOrders = await apiRequest<WorkOrder[]>('/api/work-orders');
      const freshOrder = freshOrders.find(o => o.id === selectedOrder.id);
      if (!freshOrder) {
        toast('La orden ya no existe o fue modificada. Actualizando lista.', 'error');
        setFinishedOrders(freshOrders.filter(o => o.status === 'finished'));
        setSelectedOrder(null);
        setWoProcessing(false);
        return;
      }
      if (freshOrder.status !== 'finished') {
        toast('La orden ya no está en estado "Terminada". Actualizando lista.', 'error');
        setFinishedOrders(freshOrders.filter(o => o.status === 'finished'));
        setSelectedOrder(null);
        setWoProcessing(false);
        return;
      }
      const appDisc = Math.min(Math.max(woDiscount, 0), freshOrder.total);
      if (appDisc > 0 && (!woDiscountReason.trim() || !woDiscountAuthorizedBy.trim())) {
        toast('Debe registrar motivo y autorización del descuento.', 'error');
        setWoProcessing(false);
        return;
      }
      const saleItems: Sale['items'] = [
        ...(freshOrder.parts || []).map(p => ({ partId: p.partId, code: p.code, description: p.description, price: p.price, quantity: p.quantity })),
        ...(freshOrder.laborCost > 0 ? [{ partId: '', code: 'MANO-OBRA', description: 'Mano de Obra / Servicio Técnico', price: freshOrder.laborCost, quantity: 1 }] : []),
      ];
      const totalWo = freshOrder.total - appDisc;
      const created = await apiRequest<Sale>('/api/sales', {
        method: 'POST',
        body: JSON.stringify({
          clientId: freshOrder.clientId, clientName: freshOrder.clientName,
          items: saleItems, subtotal: freshOrder.total, discount: appDisc,
          discountReason: appDisc > 0 ? woDiscountReason.trim() : null,
          discountAuthorizedBy: appDisc > 0 ? woDiscountAuthorizedBy.trim() : null,
          total: totalWo, type: 'work_order', workOrderId: freshOrder.id, createdBy: actorName,
          paymentMethod: paymentData.method,
          paymentRef: paymentData.method === 'cash'
            ? (paymentData.change > 0 ? String(paymentData.change) : null)
            : (paymentData.ref || null),
          auditTrail: [{
            action: 'work_order_collected', actor: actorName, at: new Date().toISOString(),
            detail: `${PAYMENT_METHOD_LABELS[paymentData.method]} — OT #${freshOrder.orderNumber} — ₲ ${totalWo.toLocaleString()}${paymentData.ref ? ` | Ref: ${paymentData.ref}` : ''}`,
          }],
        }),
      });
      const pseudoClient: Client = { id: freshOrder.clientId, ci: freshOrder.clientCI || '', name: freshOrder.clientName, phone: '', address: '', createdAt: null };
      const pseudoItems = saleItems.map(i => ({ part: { id: i.partId || '', code: i.code, description: i.description, price: i.price, stock: 0 } as Part, quantity: i.quantity }));
      setPendingReceipt({ sale: created, client: pseudoClient, saleItems: pseudoItems });
      setFinishedOrders(prev => prev.filter(o => o.id !== freshOrder.id));
      setSelectedOrder(null); setWoDiscount(0); setWoDiscountReason(''); setWoDiscountAuthorizedBy('');
      toast(`Reparación #${freshOrder.orderNumber} cobrada.`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo procesar el cobro.', 'error');
    } finally { setWoProcessing(false); }
  };

  // ── Filtros ──────────────────────────────────────────────────────────────
  const partCategories = Array.from(new Set(items.map(i => normCat(i.machineCategory)))).sort((a, b) => a === 'General' ? 1 : b === 'General' ? -1 : String(a).localeCompare(String(b)));
  const filteredItems = items
    .filter(i => categoryFilter === 'all' || normCat(i.machineCategory) === categoryFilter)
    .filter(i => !searchTerm || i.description.toLowerCase().includes(searchTerm.toLowerCase()) || i.code.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.ci.includes(clientSearch));

  // Validaciones para habilitar el botón de cobro
  const canCheckout = cart.length > 0 && !!selectedClient && !isProcessing;
  const discountValid = appliedDiscount === 0 || (!!discountReason.trim() && !!discountAuthorizedBy.trim());

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {([
          ['direct',    '🛒 Venta'],
          ['workorder', '🔧 Cobrar OT'],
          ['caja',      '💰 Corte de Caja'],
        ] as const).map(([tab, label]) => (
          <button type="button" key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase italic tracking-widest transition-all ${activeTab === tab ? 'bg-sidebar-bg text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:border-primary hover:text-primary'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══ CORTE DE CAJA ══ */}
      {activeTab === 'caja' ? (
        <div className="max-w-2xl space-y-4">
          {cajaLoading ? (
            <div className="py-10 text-center text-gray-400 italic text-sm">Cargando estado de caja...</div>
          ) : (
            <>
              {/* Estado actual */}
              <div className={`rounded-2xl border p-5 ${currentCaja ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Estado de caja</p>
                    <p className={`text-xl font-black italic uppercase ${currentCaja ? 'text-green-700' : 'text-gray-500'}`}>
                      {currentCaja ? '🟢 Caja Abierta' : '🔴 Caja Cerrada'}
                    </p>
                  </div>
                  {currentCaja ? (
                    <button type="button" onClick={() => setShowCloseCaja(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-colors">
                      Cerrar Caja
                    </button>
                  ) : (
                    <button type="button" onClick={() => setShowOpenCaja(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-colors">
                      Abrir Caja
                    </button>
                  )}
                </div>
                {currentCaja && (
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <div className="bg-white rounded-xl p-3 border border-green-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Apertura</p>
                      <p className="font-black text-sidebar-bg">₲ {Number(currentCaja.opening_balance).toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-green-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ventas del turno</p>
                      <p className="font-black text-primary">₲ {Number(currentCaja.sales_total || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-green-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total esperado</p>
                      <p className="font-black text-green-700">₲ {(Number(currentCaja.opening_balance) + Number(currentCaja.sales_total || 0)).toLocaleString()}</p>
                    </div>
                    <div className="col-span-3 text-[10px] text-gray-500 font-bold">
                      Abierta por <span className="text-sidebar-bg">{currentCaja.opened_by}</span> — {new Date(currentCaja.opened_at).toLocaleString('es-PY')}
                    </div>
                  </div>
                )}
              </div>

              {/* Modales abrir/cerrar */}
              {showOpenCaja && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
                  <p className="text-[11px] font-black uppercase tracking-widest text-sidebar-bg">Abrir caja</p>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Efectivo en caja al inicio (₲)</label>
                    <input type="number" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)}
                      placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowOpenCaja(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-[10px] font-black uppercase text-gray-500">Cancelar</button>
                    <button type="button" onClick={handleOpenCaja} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-[10px] font-black uppercase">Confirmar apertura</button>
                  </div>
                </div>
              )}
              {showCloseCaja && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
                  <p className="text-[11px] font-black uppercase tracking-widest text-sidebar-bg">Cerrar caja</p>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Efectivo contado en caja (₲)</label>
                    <input type="number" value={closingBalance} onChange={e => setClosingBalance(e.target.value)}
                      placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  {currentCaja && closingBalance && (
                    <div className={`rounded-xl p-3 text-sm font-black ${Number(closingBalance) >= Number(currentCaja.opening_balance) + Number(currentCaja.sales_total || 0) - 1 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      Diferencia: ₲ {(Number(closingBalance) - (Number(currentCaja.opening_balance) + Number(currentCaja.sales_total || 0))).toLocaleString()}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowCloseCaja(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-[10px] font-black uppercase text-gray-500">Cancelar</button>
                    <button type="button" onClick={handleCloseCaja} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase">Confirmar cierre</button>
                  </div>
                </div>
              )}

              {/* Historial de cortes */}
              {cajaHistory.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <p className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-50">Historial de cortes</p>
                  <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                    {cajaHistory.map((r: any) => (
                      <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-sidebar-bg uppercase">{r.opened_by}</p>
                          <p className="text-[10px] text-gray-400">{new Date(r.opened_at).toLocaleDateString('es-PY')} {r.closed_at ? `→ ${new Date(r.closed_at).toLocaleDateString('es-PY')}` : '(abierta)'}</p>
                        </div>
                        <div className="text-right">
                          {r.closing_balance != null && <p className="text-xs font-black text-primary">₲ {Number(r.closing_balance).toLocaleString()}</p>}
                          {r.difference != null && (
                            <p className={`text-[10px] font-bold ${Number(r.difference) < -500 ? 'text-red-500' : 'text-green-600'}`}>
                              {Number(r.difference) >= 0 ? '+' : ''}₲ {Number(r.difference).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      ) : activeTab === 'workorder' ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Buscar por cliente, N° orden o equipo..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <button type="button" onClick={loadFinishedOrders} className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-400 hover:text-primary hover:border-primary transition-colors">↻</button>
            </div>

            <div className="overflow-y-auto max-h-[55vh] space-y-2 pr-1">
              {ordersLoading ? (
                <div className="py-16 text-center text-gray-400 italic text-sm">Cargando órdenes...</div>
              ) : (() => {
                const vis = finishedOrders.filter(o => { const q = orderSearch.toLowerCase(); return !q || o.clientName.toLowerCase().includes(q) || String(o.orderNumber).includes(q) || (o.machineName || '').toLowerCase().includes(q); });
                return vis.length === 0
                  ? <div className="py-16 text-center text-gray-400 italic text-sm">No hay reparaciones listas para cobrar.</div>
                  : vis.map(order => (
                    <button type="button" key={order.id} onClick={() => { setSelectedOrder(order); setWoDiscount(0); setWoDiscountReason(''); setWoDiscountAuthorizedBy(''); }}
                      className={`w-full text-left bg-white border rounded-xl p-4 shadow-sm transition-all ${selectedOrder?.id === order.id ? 'border-primary ring-2 ring-primary/20' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-0.5">OT #{order.orderNumber}</p>
                          <p className="font-black text-sidebar-bg text-sm uppercase italic leading-tight">{order.clientName}</p>
                          <p className="text-[11px] text-gray-400 font-bold mt-0.5">{order.machineName} — {order.brand} {order.machineModel}</p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-xl font-black text-primary italic">₲ {order.total.toLocaleString()}</p>
                          <p className="text-[9px] text-gray-400 uppercase font-bold">Lista para cobrar</p>
                        </div>
                      </div>
                    </button>
                  ));
              })()}
            </div>
          </div>

          {/* Panel cobro reparación */}
          <div className="flex flex-col gap-3">
            {!selectedOrder ? (
              <div className="bg-white border border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-300 p-10">
                <span className="text-5xl mb-3">🔧</span>
                <p className="text-xs font-bold uppercase tracking-widest text-center">Seleccioná una orden para cobrar</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col">
                <div className="p-5 border-b border-gray-50">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">OT #{selectedOrder.orderNumber}</p>
                  <h2 className="text-sm font-black text-sidebar-bg italic uppercase">{selectedOrder.clientName}</h2>
                  <p className="text-[11px] text-gray-400 font-bold">{selectedOrder.machineName} — {selectedOrder.brand} {selectedOrder.machineModel}</p>
                </div>

                <div className="overflow-y-auto max-h-48 divide-y divide-gray-50 px-4">
                  {(selectedOrder.parts || []).map((p, i) => (
                    <div key={i} className="flex justify-between items-center py-2">
                      <div><p className="text-[10px] font-black text-sidebar-bg uppercase italic">{p.description}</p><p className="text-[9px] text-gray-400 font-mono">{p.code} × {p.quantity}</p></div>
                      <p className="text-xs font-black text-gray-600 shrink-0 ml-2">₲ {(p.price * p.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                  {selectedOrder.laborCost > 0 && (
                    <div className="flex justify-between items-center py-2">
                      <div><p className="text-[10px] font-black text-sidebar-bg uppercase italic">Mano de Obra</p><p className="text-[9px] text-gray-400">Servicio técnico</p></div>
                      <p className="text-xs font-black text-gray-600">₲ {selectedOrder.laborCost.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50/50 border-t border-gray-100 space-y-3">
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
                    <span>Subtotal</span><span>₲ {selectedOrder.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase items-center">
                    <div className="flex items-center gap-2">
                      <span>Descuento</span>
                      <input type="number" aria-label="Descuento en guaraníes" value={woDiscount} min="0" max={selectedOrder.total} onChange={e => setWoDiscount(Math.max(0, Number(e.target.value) || 0))} className="w-20 h-6 border rounded px-2 outline-none focus:ring-1 focus:ring-primary text-right text-xs" />
                    </div>
                    <span className="text-red-500">- ₲ {Math.min(woDiscount, selectedOrder.total).toLocaleString()}</span>
                  </div>
                  {woDiscount > 0 && (
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 space-y-2">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">Descuento auditado</p>
                      <input value={woDiscountAuthorizedBy} onChange={e => setWoDiscountAuthorizedBy(e.target.value)} placeholder="Autorizado por" className="w-full px-3 py-1.5 bg-white border border-orange-100 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-primary" />
                      <textarea value={woDiscountReason} onChange={e => setWoDiscountReason(e.target.value)} placeholder="Motivo" rows={2} className="w-full px-3 py-1.5 bg-white border border-orange-100 rounded-lg text-[10px] font-bold resize-none outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1 border-t">
                    <span className="text-xs font-black text-sidebar-bg italic uppercase">Total</span>
                    <span className="text-2xl font-black text-primary italic">₲ {Math.max(0, selectedOrder.total - Math.min(woDiscount, selectedOrder.total)).toLocaleString()}</span>
                  </div>
                  <button type="button" onClick={() => setShowWoPaymentModal(true)} disabled={woProcessing}
                    className="w-full py-3.5 bg-primary text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />{woProcessing ? 'Procesando...' : 'Seleccionar forma de pago'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      ) : (
      /* ══ VENTA DIRECTA ══ */
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
        {/* Catálogo */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar por código o nombre..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <select aria-label="Filtrar por categoría" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-xs font-bold text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="all">Todas las categorías</option>
              {partCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-y-auto max-h-[60vh]">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-[0.12em] font-black border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5">Código</th>
                    <th className="px-4 py-2.5">Descripción</th>
                    <th className="px-4 py-2.5 hidden md:table-cell">Categoría</th>
                    <th className="px-4 py-2.5 text-center">Stock</th>
                    <th className="px-4 py-2.5 text-right">Precio</th>
                    <th className="px-4 py-2.5 w-12"><span className="sr-only">Agregar</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredItems.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-xs italic">No hay repuestos.</td></tr>
                  ) : filteredItems.map(part => (
                    <tr key={part.id} className={`hover:bg-orange-50/40 transition-colors ${part.stock <= 0 ? 'opacity-40' : ''}`}>
                      <td className="px-4 py-2.5 font-mono text-[11px] font-black text-gray-500 italic">{part.code}</td>
                      <td className="px-4 py-2.5 text-sm font-semibold text-gray-700">{part.description}</td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-500">{normCat(part.machineCategory)}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs font-black ${part.stock <= 0 ? 'text-red-500' : part.stock < 5 ? 'text-orange-500' : 'text-green-600'}`}>{part.stock}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-black text-sm text-primary">₲ {part.price.toLocaleString()}</td>
                      <td className="px-4 py-2.5">
                        <button type="button" aria-label="Agregar al carrito" onClick={() => addToCart(part)} disabled={part.stock <= 0}
                          className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:brightness-110 disabled:opacity-30 transition-all ml-auto">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{filteredItems.length} repuestos</p>
            </div>
          </div>
        </div>

        {/* Carrito y checkout */}
        <div className="flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden xl:sticky xl:top-4">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-sm font-black text-sidebar-bg italic uppercase tracking-tight">Carrito</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{cart.length} {cart.length === 1 ? 'artículo' : 'artículos'}</p>
            </div>
            <ShoppingCart className="w-5 h-5 text-gray-300" />
          </div>

          <div className="overflow-y-auto p-3 space-y-2 max-h-[38vh]">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-gray-300 py-8">
                <ShoppingCart className="w-8 h-8 mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">Carrito vacío</p>
              </div>
            ) : cart.map(item => (
              <div key={item.part.id} className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-sidebar-bg uppercase italic leading-tight truncate">{item.part.description}</p>
                  <p className="text-[10px] font-mono text-gray-400 mt-0.5">{item.part.code}</p>
                </div>
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shrink-0">
                  <button type="button" aria-label="Quitar uno" onClick={() => updateQty(item.part.id, -1)} className="p-0.5 hover:text-primary transition-colors"><Minus className="w-3 h-3" /></button>
                  <span className="w-6 text-center text-xs font-black">{item.quantity}</span>
                  <button type="button" aria-label="Agregar uno" onClick={() => updateQty(item.part.id, 1)} className="p-0.5 hover:text-primary transition-colors"><Plus className="w-3 h-3" /></button>
                </div>
                <p className="text-sm font-black text-primary italic shrink-0">₲ {(item.part.price * item.quantity).toLocaleString()}</p>
                <button type="button" aria-label="Quitar del carrito" onClick={() => removeFromCart(item.part.id)} className="text-gray-300 hover:text-red-500 transition-colors shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-3 shrink-0">
            {/* Cliente */}
            {!selectedClient ? (
              <div className="relative">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <input value={clientSearch} onChange={e => { setClientSearch(e.target.value); setShowClientSearch(true); }} onFocus={() => setShowClientSearch(true)}
                    placeholder="Buscar cliente (nombre o CI)..."
                    className="w-full pl-8 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-bold uppercase italic outline-none focus:ring-1 focus:ring-primary" />
                </div>
                {showClientSearch && clientSearch && filteredClients.length > 0 && (
                  <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-xl z-10 max-h-36 overflow-y-auto">
                    {filteredClients.map(c => (
                      <button type="button" key={c.id} onClick={() => { setSelectedClient(c); setShowClientSearch(false); setClientSearch(''); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-orange-50 border-b border-gray-50 last:border-0 flex gap-2 items-center">
                        <span className="text-[10px] font-black text-sidebar-bg uppercase italic">{c.name}</span>
                        <span className="text-[10px] font-mono text-gray-400">{c.ci}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between px-3 py-2 bg-white border border-primary/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-primary font-black text-xs">{selectedClient.name[0]}</div>
                  <div>
                    <p className="text-[10px] font-black text-sidebar-bg uppercase italic">{selectedClient.name}</p>
                    <p className="text-[9px] font-mono text-gray-400">{selectedClient.ci}</p>
                  </div>
                </div>
                <button type="button" aria-label="Quitar cliente" onClick={() => setSelectedClient(null)} className="text-gray-300 hover:text-primary"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {/* Historial de compras del cliente */}
            {selectedClient && clientPurchases.length > 0 && (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <button type="button" onClick={() => setShowPurchaseHistory(p => !p)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-colors">
                  <span>📋 Historial ({clientPurchases.length} compras)</span>
                  <span>{showPurchaseHistory ? '▲' : '▼'}</span>
                </button>
                {showPurchaseHistory && (
                  <div className="max-h-40 overflow-y-auto divide-y divide-gray-50">
                    {clientPurchases.map(p => (
                      <div key={p.id} className="px-3 py-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-gray-500">{new Date(p.createdAt).toLocaleDateString('es-PY')}</span>
                          <span className="text-[11px] font-black text-primary">₲ {p.total.toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 truncate">{(p.items || []).map(i => i.description).join(', ')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Totales */}
            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between font-bold text-gray-500 uppercase">
                <span>Subtotal</span><span>₲ {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-500 uppercase items-center">
                <div className="flex items-center gap-2">
                  <span>Descuento</span>
                  <input type="number" aria-label="Descuento en guaraníes" value={discount} min="0" max={subtotal} onChange={e => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-20 h-5 border rounded px-2 outline-none focus:ring-1 focus:ring-primary text-right text-xs" />
                </div>
                <span className="text-red-500">- ₲ {appliedDiscount.toLocaleString()}</span>
              </div>
              {appliedDiscount > 0 && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-2.5 space-y-1.5">
                  <p className="font-black text-primary uppercase tracking-widest">Descuento auditado</p>
                  <input value={discountAuthorizedBy} onChange={e => setDiscountAuthorizedBy(e.target.value)} placeholder="Autorizado por"
                    className="w-full px-2.5 py-1.5 bg-white border border-orange-100 rounded-lg font-bold uppercase italic outline-none focus:ring-1 focus:ring-primary text-[10px]" />
                  <textarea value={discountReason} onChange={e => setDiscountReason(e.target.value)} placeholder="Motivo" rows={2}
                    className="w-full px-2.5 py-1.5 bg-white border border-orange-100 rounded-lg font-bold italic outline-none focus:ring-1 focus:ring-primary text-[10px] resize-none" />
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-gray-200">
              <span className="text-xs font-black text-sidebar-bg uppercase italic">Total</span>
              <span className="text-2xl font-black text-primary italic tracking-tighter">₲ {total.toLocaleString()}</span>
            </div>

            {/* Alerta descuento sin completar */}
            {appliedDiscount > 0 && !discountValid && (
              <p className="text-[10px] font-bold text-orange-600 text-center">Completá el motivo y autorización del descuento</p>
            )}

            <button
              onClick={() => { if (!discountValid) { toast('Completá el motivo y autorización del descuento.', 'error'); return; } setShowPaymentModal(true); }}
              disabled={!canCheckout}
              className="w-full py-3.5 bg-primary text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-40 disabled:grayscale flex items-center justify-center gap-2"
            >
              {isProcessing ? (<><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Procesando...</>) : (<><CreditCard className="w-4 h-4" />Procesar Cobro</>)}
            </button>
          </div>
        </div>
      </div>
      )}

      {/* ── Modal forma de pago — venta directa ── */}
      <AnimatePresence>
        {showPaymentModal && (
          <PaymentModal
            amount={total}
            onConfirm={data => { setShowPaymentModal(false); processSale(data); }}
            onCancel={() => setShowPaymentModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Modal forma de pago — reparación ── */}
      <AnimatePresence>
        {showWoPaymentModal && selectedOrder && (
          <PaymentModal
            amount={Math.max(0, selectedOrder.total - Math.min(woDiscount, selectedOrder.total))}
            onConfirm={data => { setShowWoPaymentModal(false); processWorkOrderSale(data); }}
            onCancel={() => setShowWoPaymentModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Modal comprobante ── */}
      <AnimatePresence>
        {pendingReceipt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPendingReceipt(null)} />
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 z-10">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-lg font-black text-sidebar-bg italic uppercase tracking-tight">¡Cobro Registrado!</h2>
                <p className="text-sm font-bold text-primary italic mt-1">₲ {pendingReceipt.sale.total.toLocaleString()}</p>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">{pendingReceipt.sale.clientName}</p>
                {pendingReceipt.sale.paymentMethod && (
                  <span className={`inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${PM_CONFIG[pendingReceipt.sale.paymentMethod]?.bg}`}>
                    {PM_CONFIG[pendingReceipt.sale.paymentMethod]?.icon} {PAYMENT_METHOD_LABELS[pendingReceipt.sale.paymentMethod]}
                  </span>
                )}
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center mb-4">¿Cómo desea el comprobante?</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button type="button" onClick={() => { printTicket(pendingReceipt.sale, pendingReceipt.client, pendingReceipt.saleItems); setPendingReceipt(null); }}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-2xl hover:border-primary hover:bg-orange-50 transition-all group">
                  <span className="text-3xl">🧾</span>
                  <span className="text-[10px] font-black text-sidebar-bg uppercase group-hover:text-primary">Ticket 80mm</span>
                  <span className="text-[9px] text-gray-400">Impresora térmica</span>
                </button>
                <button type="button" onClick={() => { generateReceipt(pendingReceipt.sale, pendingReceipt.client, pendingReceipt.saleItems); setPendingReceipt(null); }}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-2xl hover:border-primary hover:bg-orange-50 transition-all group">
                  <FileText className="w-8 h-8 text-gray-300 group-hover:text-primary" />
                  <span className="text-[10px] font-black text-sidebar-bg uppercase group-hover:text-primary">Factura A4</span>
                  <span className="text-[9px] text-gray-400">Documento PDF</span>
                </button>
              </div>
              <button type="button" onClick={() => setPendingReceipt(null)} className="w-full text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest py-2 transition-colors">
                Continuar sin comprobante
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
