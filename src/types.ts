export type AppDateValue = string | Date | null | undefined;

export interface WorkshopSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  tagline: string;
}

export type OrderStatus = 'pending' | 'in_progress' | 'awaiting_parts' | 'finished' | 'delivered' | 'cancelled';

export interface AuditEntry {
  action: string;
  actor: string;
  at: AppDateValue;
  detail?: string;
}

export interface PartUsage {
  partId: string;
  code: string;
  description: string;
  price: number;
  quantity: number;
}

export interface Client {
  id: string;
  ci: string;
  name: string;
  phone: string;
  address: string;
  createdAt: AppDateValue;
  updatedAt?: AppDateValue;
}

export interface Machine {
  id: string;
  clientId: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  createdAt: AppDateValue;
}

export interface MachineReference {
  id: string;
  brand: string;
  category: string;
  model: string;
  createdAt?: AppDateValue;
}

export interface Part {
  id: string;
  code: string;
  description: string;
  machineCategory: string;
  machineBrand: string;
  machineModel: string;
  price: number;
  stock: number;
  minStock: number;
  supplierId?: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  notes?: string;
  createdAt?: AppDateValue;
  updatedAt?: AppDateValue;
}

export type PaymentMethod = 'cash' | 'qr' | 'card' | 'transfer';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  qr: 'QR / Billetera',
  card: 'Tarjeta (POS)',
  transfer: 'Transferencia',
};

export interface Sale {
  id: string;
  clientId?: string | null;
  clientName: string;
  items: PartUsage[];
  subtotal: number;
  discount: number;
  discountReason?: string;
  discountAuthorizedBy?: string;
  total: number;
  type: 'direct' | 'work_order';
  workOrderId?: string;
  createdAt: AppDateValue;
  createdBy?: string;
  paymentMethod?: PaymentMethod;
  paymentRef?: string | null;
  auditTrail?: AuditEntry[];
}

export interface Mechanic {
  id: string;
  name: string;
  specialty: string;
  active: boolean;
  linkedUserId?: string;
  linkedEmail?: string;
}

export interface WorkOrder {
  id: string;
  orderNumber: number;
  clientId: string;
  clientName: string;
  clientCI: string;
  machineId: string;
  machineName: string;
  machineModel: string;
  brand: string;
  serialNumber: string;
  accessories: string;
  observations: string;
  description: string;
  findings?: string;
  status: OrderStatus;
  laborCost: number;
  partsCost: number;
  total: number;
  mechanicId?: string;
  mechanicName?: string;
  parts?: PartUsage[];
  cancellationReason?: string;
  cancellationAuthorizedBy?: string;
  warrantyType?: 'warranty' | 'non_warranty' | null;
  warrantyNotes?: string;
  relatedOrderId?: string;
  relatedOrderNumber?: number;
  auditTrail?: AuditEntry[];
  createdAt: AppDateValue;
  updatedAt: AppDateValue;
  finishedAt?: AppDateValue;
}
