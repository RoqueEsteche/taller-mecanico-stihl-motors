/** Convierte cualquier valor de fecha (string, Date, Firestore Timestamp) a Date | null */
export function toDateValue(value: unknown): Date | null {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return value instanceof Date ? value : null;
}

/** Normaliza la categoría de un repuesto (vacío → 'General') */
export function normCategory(v: string | undefined): string {
  return v && v.trim() ? v.trim() : 'General';
}

/** Etiqueta legible para un estado de orden de trabajo */
export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending:        'Pendiente',
    in_progress:    'En Taller',
    awaiting_parts: 'Faltan Repuestos',
    finished:       'Terminado',
    delivered:      'Entregado',
    cancelled:      'Anulado',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

/** Clases Tailwind para el badge de estado de orden */
export function getStatusStyle(status: string): string {
  const map: Record<string, string> = {
    pending:        'bg-yellow-100 text-yellow-700 border-yellow-200',
    in_progress:    'bg-blue-100   text-blue-700   border-blue-200',
    awaiting_parts: 'bg-purple-100 text-purple-700 border-purple-200',
    finished:       'bg-green-100  text-green-700  border-green-200',
    delivered:      'bg-gray-100   text-gray-600   border-gray-200',
    cancelled:      'bg-red-100    text-red-600    border-red-200',
  };
  return map[status] ?? map.pending;
}

/** Etiqueta legible para entradas del audit trail */
export function actionLabel(action: string): string {
  const map: Record<string, string> = {
    order_created:          'Orden creada',
    status_updated:         'Estado actualizado',
    labor_cost_updated:     'Costo mano de obra actualizado',
    cancelled:              'Anulado',
    part_added:             'Repuesto agregado',
    part_removed:           'Repuesto quitado',
    sale_created:           'Venta registrada',
    work_order_collected:   'Reparación cobrada',
    sale_cancelled:         'Venta anulada',
    bancard_payment_confirmed: 'Pago Bancard confirmado',
  };
  return map[action] ?? action.replace(/_/g, ' ');
}

/** Formatea un número como guaraníes: ₲ 1.500.000 */
export function fmtGs(n: number): string {
  return `₲ ${n.toLocaleString('es-PY')}`;
}
