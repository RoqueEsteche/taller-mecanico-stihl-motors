import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { comparePassword, createToken, decodeAuthTokenOptional, hashPassword, requireAuth, requireRole } from './auth.js';
import { pool, query, withTransaction } from './db.js';

const app = express();
const port = Number(process.env.API_PORT || 4000);
const isProduction = process.env.NODE_ENV === 'production';
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : null;
const nativeAppOrigins = ['http://localhost', 'https://localhost', 'capacitor://localhost'];

if (isProduction && (!corsOrigins || corsOrigins.length === 0)) {
  throw new Error('CORS_ORIGIN es obligatorio en producción.');
}

const allowedOrigins = new Set([...(corsOrigins || []), ...nativeAppOrigins]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: false,
}));
app.use(express.json());
app.set('trust proxy', true);

// ── Swagger / OpenAPI — Documentación interactiva en /docs ────────────────────
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Stihl Motors API',
      version: '1.0.0',
      description: 'REST API del sistema de gestión de taller mecánico Stihl Motors. Incluye endpoints de autenticación, órdenes de trabajo, inventario, ventas, clientes, contacto y analítica.',
      contact: { name: 'Equipo de Desarrollo', email: 'dev@stihl-motors.com' },
    },
    servers: [{ url: '/api', description: 'Servidor principal' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./server/index.js'],
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Stihl Motors — API Docs',
  customCss: '.swagger-ui .topbar { background-color: #FF6321; }',
}));

app.get('/api/openapi.json', (_req, res) => res.json(swaggerSpec));

function detectDeviceType(userAgent) {
  const ua = String(userAgent || '').toLowerCase();
  if (!ua) return 'desconocido';
  if (ua.includes('android') || ua.includes('iphone') || ua.includes('mobile')) return 'movil';
  if (ua.includes('ipad') || ua.includes('tablet')) return 'tablet';
  return 'desktop';
}

function detectBrowser(userAgent) {
  const ua = String(userAgent || '').toLowerCase();
  if (!ua) return 'desconocido';
  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('opr/') || ua.includes('opera')) return 'opera';
  if (ua.includes('chrome/') && !ua.includes('edg/')) return 'chrome';
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'safari';
  if (ua.includes('firefox/')) return 'firefox';
  return 'otro';
}

function detectOs(userAgent) {
  const ua = String(userAgent || '').toLowerCase();
  if (!ua) return 'desconocido';
  if (ua.includes('windows')) return 'windows';
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) return 'ios';
  if (ua.includes('mac os') || ua.includes('macintosh')) return 'macos';
  if (ua.includes('linux')) return 'linux';
  return 'otro';
}

function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || 'desconocido';
}

function buildActivityRecord(req, statusCode) {
  if (!req.path.startsWith('/api') || req.path === '/api/health' || req.path === '/api/activity/live') {
    return null;
  }

  const userAgent = req.headers['user-agent'] || 'desconocido';
  const tokenUser = decodeAuthTokenOptional(req.headers.authorization || '');
  const user = req.user || tokenUser || null;

  return {
    at: new Date().toISOString(),
    method: req.method,
    path: req.originalUrl || req.path,
    statusCode,
    ip: getClientIp(req),
    origin: req.headers.origin || req.headers.referer || null,
    userAgent,
    deviceType: detectDeviceType(userAgent),
    browser: detectBrowser(userAgent),
    os: detectOs(userAgent),
    userId: user?.sub || null,
    userEmail: user?.email || null,
    userRole: user?.role || null,
    userDisplayName: user?.displayName || null,
  };
}

async function persistActivity(item) {
  if (!item) return;

  try {
    await query(
      `insert into activity_log (
        method, path, status_code, ip, origin,
        user_agent, device_type, browser, os,
        user_id, user_email, user_role, user_display_name
      ) values (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13
      )`,
      [
        item.method,
        item.path,
        item.statusCode,
        item.ip,
        item.origin,
        item.userAgent,
        item.deviceType,
        item.browser,
        item.os,
        item.userId,
        item.userEmail,
        item.userRole,
        item.userDisplayName,
      ],
    );
  } catch (err) {
    // No bloquear al cliente, pero registrar el fallo para diagnóstico
    console.error('[activity_log] Error al persistir:', err instanceof Error ? err.message : err);
  }
}

async function ensureCatalogTables() {
  await query(`
    create table if not exists pending_payment (
      id uuid primary key default gen_random_uuid(),
      shop_process_id text not null unique,
      sale_data jsonb not null,
      amount numeric(12,2) not null,
      currency text not null default 'PYG',
      status text not null default 'pending',
      sale_id uuid references sale(id) on delete set null,
      bancard_confirmation_id text,
      created_by text,
      created_at timestamptz not null default now(),
      expires_at timestamptz not null default (now() + interval '30 minutes')
    )
  `);

  await query(`
    create index if not exists idx_pending_payment_shop_process_id
    on pending_payment(shop_process_id)
  `);

  // Columna de método de pago en ventas (migración idempotente)
  await query(`alter table sale add column if not exists payment_method text not null default 'cash'`);
  await query(`alter table sale add column if not exists payment_ref text`);

  await query(`
    create table if not exists app_settings (
      key text primary key,
      value text not null default ''
    )
  `);

  await query(`
    insert into app_settings (key, value) values
      ('workshop_name', 'Taller Mecánico'),
      ('workshop_address', ''),
      ('workshop_phone', ''),
      ('workshop_email', ''),
      ('workshop_tagline', '')
    on conflict (key) do nothing
  `);

  await query(`
    create table if not exists machine_brand (
      id uuid primary key default gen_random_uuid(),
      name text not null unique,
      created_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists machine_category (
      id uuid primary key default gen_random_uuid(),
      name text not null unique,
      created_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists machine_model (
      id uuid primary key default gen_random_uuid(),
      brand_id uuid not null references machine_brand(id) on delete cascade,
      name text not null,
      created_at timestamptz not null default now(),
      unique (brand_id, name)
    )
  `);

  await query(`
    create table if not exists activity_log (
      id bigserial primary key,
      method text not null,
      path text not null,
      status_code integer not null,
      ip text not null,
      origin text,
      user_agent text not null,
      device_type text not null,
      browser text not null default 'desconocido',
      os text not null default 'desconocido',
      user_id uuid,
      user_email text,
      user_role text,
      user_display_name text,
      created_at timestamptz not null default now()
    )
  `);

  await query('create index if not exists idx_activity_log_created_at on activity_log(created_at desc)');
  await query('create index if not exists idx_activity_log_user_created on activity_log(user_id, created_at desc)');

  // ── Tabla de Leads / Contactos (formulario público del sitio web) ──────────
  await query(`
    create table if not exists lead (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      email text not null,
      phone text not null default '',
      service text not null default '',
      message text not null default '',
      status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'discarded')),
      ip text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await query('create index if not exists idx_lead_created_at on lead(created_at desc)');
  await query('create index if not exists idx_lead_status on lead(status)');
}

app.use((req, res, next) => {
  res.on('finish', () => {
    const item = buildActivityRecord(req, res.statusCode);
    void persistActivity(item);
  });
  next();
});

function asNumber(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function parseJson(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === 'object')) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function mapUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapClient(row) {
  return {
    id: row.id,
    ci: row.ci,
    name: row.name,
    phone: row.phone,
    address: row.address,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSupplier(row) {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPart(row) {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    machineCategory: row.machine_category,
    machineBrand: row.machine_brand,
    machineModel: row.machine_model,
    price: asNumber(row.price),
    stock: Number(row.stock || 0),
    minStock: Number(row.min_stock || 0),
    supplierId: row.supplier_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMechanic(row) {
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    active: row.active,
    linkedUserId: row.linked_user_id,
    linkedEmail: row.linked_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMachineReference(row) {
  return {
    id: row.id,
    brand: row.brand,
    category: row.category,
    model: row.model,
    createdAt: row.created_at,
  };
}

function mapPartUsage(row) {
  return {
    partId: row.part_id,
    code: row.code,
    description: row.description,
    price: asNumber(row.price),
    quantity: Number(row.quantity || 0),
  };
}

function mapWorkOrder(row, parts = []) {
  return {
    id: row.id,
    orderNumber: Number(row.order_number || 0),
    clientId: row.client_id,
    clientName: row.client_name,
    clientCI: row.client_ci,
    machineId: row.machine_id,
    machineName: row.machine_name,
    machineModel: row.machine_model,
    brand: row.brand,
    serialNumber: row.serial_number,
    accessories: row.accessories,
    observations: row.observations,
    description: row.description,
    findings: row.findings,
    status: row.status,
    laborCost: asNumber(row.labor_cost),
    partsCost: asNumber(row.parts_cost),
    total: asNumber(row.total),
    mechanicId: row.mechanic_id,
    mechanicName: row.mechanic_name,
    parts,
    cancellationReason: row.cancellation_reason,
    cancellationAuthorizedBy: row.cancellation_authorized_by,
    warrantyType: row.warranty_type || null,
    warrantyNotes: row.warranty_notes || null,
    relatedOrderId: row.related_order_id || null,
    relatedOrderNumber: row.related_order_number !== null && row.related_order_number !== undefined ? Number(row.related_order_number) : null,
    auditTrail: parseJson(row.audit_trail, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    finishedAt: row.finished_at,
  };
}

function mapSale(row, items = []) {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    items,
    subtotal: asNumber(row.subtotal),
    discount: asNumber(row.discount),
    discountReason: row.discount_reason,
    discountAuthorizedBy: row.discount_authorized_by,
    total: asNumber(row.total),
    type: row.type,
    workOrderId: row.work_order_id,
    createdBy: row.created_by,
    paymentMethod: row.payment_method || 'cash',
    paymentRef: row.payment_ref || null,
    auditTrail: parseJson(row.audit_trail, []),
    createdAt: row.created_at,
  };
}

async function listWorkOrders(whereClause = '', params = []) {
  const ordersResult = await query(
    `select wo.*, rel.order_number as related_order_number
     from work_order wo
     left join work_order rel on wo.related_order_id = rel.id
     ${whereClause} order by wo.created_at desc`,
    params,
  );
  const orderIds = ordersResult.rows.map((row) => row.id);
  const partsMap = new Map();

  if (orderIds.length > 0) {
    const partsResult = await query(
      'select * from work_order_part where work_order_id = any($1::uuid[]) order by work_order_id, code',
      [orderIds],
    );

    partsResult.rows.forEach((row) => {
      const items = partsMap.get(row.work_order_id) || [];
      items.push(mapPartUsage(row));
      partsMap.set(row.work_order_id, items);
    });
  }

  return ordersResult.rows.map((row) => mapWorkOrder(row, partsMap.get(row.id) || []));
}

async function listSales() {
  const salesResult = await query('select * from sale order by created_at desc');
  const saleIds = salesResult.rows.map((row) => row.id);
  const itemsMap = new Map();

  if (saleIds.length > 0) {
    const itemsResult = await query(
      'select * from sale_item where sale_id = any($1::uuid[]) order by sale_id, code',
      [saleIds],
    );

    itemsResult.rows.forEach((row) => {
      const items = itemsMap.get(row.sale_id) || [];
      items.push(mapPartUsage(row));
      itemsMap.set(row.sale_id, items);
    });
  }

  return salesResult.rows.map((row) => mapSale(row, itemsMap.get(row.id) || []));
}

async function nextCounterValue(client, key) {
  const result = await client.query(
    `insert into counter (key, value) values ($1, 1)
     on conflict (key) do update set value = counter.value + 1
     returning value`,
    [key],
  );

  return Number(result.rows[0].value);
}

async function findOrCreateClient(client, payload) {
  const existing = await client.query('select id from client where ci = $1 limit 1', [payload.clientCI.trim()]);
  if (existing.rowCount > 0) {
    return existing.rows[0].id;
  }

  const created = await client.query(
    `insert into client (ci, name, phone, address)
     values ($1, $2, $3, $4)
     returning id`,
    [payload.clientCI.trim(), payload.clientName.trim(), (payload.phone || '').trim(), (payload.address || '').trim()],
  );

  return created.rows[0].id;
}

async function createMachine(client, clientId, payload) {
  // Buscar máquina existente del mismo cliente con mismo nombre, marca, modelo y S/N
  const serialNumber = (payload.serialNumber || '').trim();
  if (serialNumber) {
    const existing = await client.query(
      `select id from machine
       where client_id = $1 and lower(name) = lower($2) and lower(brand) = lower($3) and lower(model) = lower($4) and lower(serial_number) = lower($5)
       limit 1`,
      [clientId, payload.machineName.trim(), payload.brand.trim(), payload.machineModel.trim(), serialNumber],
    );
    if (existing.rowCount > 0) return existing.rows[0].id;
  }

  const created = await client.query(
    `insert into machine (client_id, name, brand, model, serial_number)
     values ($1, $2, $3, $4, $5)
     returning id`,
    [clientId, payload.machineName.trim(), payload.brand.trim(), payload.machineModel.trim(), serialNumber],
  );

  return created.rows[0].id;
}

app.get('/api/health', async (_req, res) => {
  try {
    await query('select 1');
    res.json({ ok: true, database: 'reachable' });
  } catch (error) {
    res.status(500).json({ ok: false, message: error instanceof Error ? error.message : 'Database unavailable' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ message: 'Correo y contraseña son obligatorios.' });
  }

  try {
    const result = await query(
      'select id, email, display_name, role, active, password_hash, created_at, updated_at from app_user where email = $1 limit 1',
      [email],
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    if (!user.active) {
      return res.status(403).json({ message: 'La cuenta está suspendida.' });
    }

    const validPassword = await comparePassword(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    return res.json({ token: createToken(user), user: mapUser(user) });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo iniciar sesión.' });
  }
});

app.get('/api/session', requireAuth, async (req, res) => {
  try {
    const result = await query(
      'select id, email, display_name, role, active, created_at, updated_at from app_user where id = $1 limit 1',
      [req.user.sub],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    return res.json({ user: mapUser(result.rows[0]) });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo recuperar la sesión.' });
  }
});

app.get('/api/clients', requireAuth, async (_req, res) => {
  try {
    const result = await query('select * from client order by created_at desc');
    return res.json(result.rows.map(mapClient));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo listar clientes.' });
  }
});

app.post('/api/clients', requireAuth, requireRole('admin', 'receiver'), async (req, res) => {
  const { ci, name, phone = '', address = '' } = req.body || {};
  if (!ci || !name) {
    return res.status(400).json({ message: 'CI y nombre son obligatorios.' });
  }

  try {
    const result = await query(
      'insert into client (ci, name, phone, address) values ($1, $2, $3, $4) returning *',
      [String(ci).trim(), String(name).trim(), String(phone).trim(), String(address).trim()],
    );
    return res.status(201).json(mapClient(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo crear el cliente.' });
  }
});

app.put('/api/clients/:id', requireAuth, requireRole('admin', 'receiver'), async (req, res) => {
  const { ci, name, phone = '', address = '' } = req.body || {};

  try {
    const result = await query(
      'update client set ci = $2, name = $3, phone = $4, address = $5, updated_at = now() where id = $1 returning *',
      [req.params.id, String(ci).trim(), String(name).trim(), String(phone).trim(), String(address).trim()],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado.' });
    }

    return res.json(mapClient(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo actualizar el cliente.' });
  }
});

app.delete('/api/clients/:id', requireAuth, requireRole('admin', 'receiver'), async (req, res) => {
  try {
    const result = await query('delete from client where id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado.' });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo eliminar el cliente.' });
  }
});

app.get('/api/suppliers', requireAuth, async (_req, res) => {
  try {
    const result = await query('select * from supplier order by created_at desc');
    return res.json(result.rows.map(mapSupplier));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo listar proveedores.' });
  }
});

app.post('/api/suppliers', requireAuth, requireRole('admin', 'stock_manager'), async (req, res) => {
  const { name, contact = '', phone = '', email = '', notes = '' } = req.body || {};
  if (!name) {
    return res.status(400).json({ message: 'El nombre del proveedor es obligatorio.' });
  }

  try {
    const result = await query(
      `insert into supplier (name, contact, phone, email, notes)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [String(name).trim(), String(contact).trim(), String(phone).trim(), String(email).trim(), String(notes).trim()],
    );
    return res.status(201).json(mapSupplier(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo crear el proveedor.' });
  }
});

app.put('/api/suppliers/:id', requireAuth, requireRole('admin', 'stock_manager'), async (req, res) => {
  const { name, contact = '', phone = '', email = '', notes = '' } = req.body || {};
  try {
    const result = await query(
      `update supplier
       set name = $2, contact = $3, phone = $4, email = $5, notes = $6, updated_at = now()
       where id = $1
       returning *`,
      [req.params.id, String(name).trim(), String(contact).trim(), String(phone).trim(), String(email).trim(), String(notes).trim()],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado.' });
    }

    return res.json(mapSupplier(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo actualizar el proveedor.' });
  }
});

app.delete('/api/suppliers/:id', requireAuth, requireRole('admin', 'stock_manager'), async (req, res) => {
  try {
    const result = await query('delete from supplier where id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado.' });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo eliminar el proveedor.' });
  }
});

app.get('/api/machine-reference', requireAuth, async (_req, res) => {
  try {
    const result = await query('select * from machine_reference order by brand asc, category asc, model asc');
    return res.json(result.rows.map(mapMachineReference));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo listar el catálogo de máquinas.' });
  }
});

app.get('/api/parts', requireAuth, async (_req, res) => {
  try {
    const result = await query('select * from part order by created_at desc');
    return res.json(result.rows.map(mapPart));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo listar el inventario.' });
  }
});

app.post('/api/parts', requireAuth, requireRole('admin', 'stock_manager', 'receiver'), async (req, res) => {
  const {
    code,
    description,
    machineCategory = 'General',
    machineBrand = '',
    machineModel = '',
    price = 0,
    stock = 0,
    minStock = 0,
    supplierId = null,
  } = req.body || {};
  if (!code || !description) {
    return res.status(400).json({ message: 'Código y descripción son obligatorios.' });
  }

  try {
    const result = await query(
      `insert into part (code, description, machine_category, machine_brand, machine_model, price, stock, min_stock, supplier_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning *`,
      [
        String(code).trim(),
        String(description).trim(),
        String(machineCategory || 'General').trim(),
        String(machineBrand || '').trim(),
        String(machineModel || '').trim(),
        asNumber(price),
        Number(stock || 0),
        Number(minStock || 0),
        supplierId || null,
      ],
    );
    return res.status(201).json(mapPart(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo crear el repuesto.' });
  }
});

app.put('/api/parts/:id', requireAuth, requireRole('admin', 'stock_manager', 'receiver'), async (req, res) => {
  const {
    code,
    description,
    machineCategory = 'General',
    machineBrand = '',
    machineModel = '',
    price = 0,
    stock = 0,
    minStock = 0,
    supplierId = null,
  } = req.body || {};
  try {
    const result = await query(
      `update part
       set code = $2, description = $3, machine_category = $4, machine_brand = $5, machine_model = $6, price = $7, stock = $8, min_stock = $9, supplier_id = $10, updated_at = now()
       where id = $1
       returning *`,
      [
        req.params.id,
        String(code).trim(),
        String(description).trim(),
        String(machineCategory || 'General').trim(),
        String(machineBrand || '').trim(),
        String(machineModel || '').trim(),
        asNumber(price),
        Number(stock || 0),
        Number(minStock || 0),
        supplierId || null,
      ],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Repuesto no encontrado.' });
    }

    return res.json(mapPart(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo actualizar el repuesto.' });
  }
});

app.delete('/api/parts/:id', requireAuth, requireRole('admin', 'stock_manager'), async (req, res) => {
  try {
    const result = await query('delete from part where id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Repuesto no encontrado.' });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo eliminar el repuesto.' });
  }
});

app.get('/api/users', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const result = await query('select * from app_user order by created_at desc');
    return res.json(result.rows.map(mapUser));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo listar usuarios.' });
  }
});

app.post('/api/users', requireAuth, requireRole('admin'), async (req, res) => {
  const { displayName, email, role, password } = req.body || {};
  if (!displayName || !email || !role || !password) {
    return res.status(400).json({ message: 'Nombre, correo, rol y contraseña son obligatorios.' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  try {
    const passwordHash = await hashPassword(String(password));
    const result = await query(
      `insert into app_user (display_name, email, role, password_hash, active)
       values ($1, $2, $3, $4, true)
       returning *`,
      [String(displayName).trim(), String(email).trim().toLowerCase(), String(role), passwordHash],
    );
    return res.status(201).json(mapUser(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo crear el usuario.' });
  }
});

app.put('/api/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { displayName, role, active } = req.body || {};
  try {
    const result = await query(
      `update app_user
       set display_name = coalesce($2, display_name),
           role = coalesce($3, role),
           active = coalesce($4, active),
           updated_at = now()
       where id = $1
       returning *`,
      [req.params.id, displayName ? String(displayName).trim() : null, role || null, typeof active === 'boolean' ? active : null],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    return res.json(mapUser(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo actualizar el usuario.' });
  }
});

app.get('/api/mechanics', requireAuth, async (_req, res) => {
  try {
    const result = await query('select * from mechanic order by created_at desc');
    return res.json(result.rows.map(mapMechanic));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo listar mecánicos.' });
  }
});

app.post('/api/mechanics', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, specialty, linkedUserId = null, linkedEmail = '', active = true } = req.body || {};
  if (!name) {
    return res.status(400).json({ message: 'El nombre del mecánico es obligatorio.' });
  }

  try {
    const result = await query(
      `insert into mechanic (name, specialty, linked_user_id, linked_email, active)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [String(name).trim(), String(specialty || '').trim(), linkedUserId || null, String(linkedEmail || '').trim(), Boolean(active)],
    );
    return res.status(201).json(mapMechanic(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo crear el mecánico.' });
  }
});

app.put('/api/mechanics/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, specialty, linkedUserId = null, linkedEmail = '', active = true } = req.body || {};
  try {
    const result = await query(
      `update mechanic
       set name = $2, specialty = $3, linked_user_id = $4, linked_email = $5, active = $6, updated_at = now()
       where id = $1
       returning *`,
      [req.params.id, String(name).trim(), String(specialty || '').trim(), linkedUserId || null, String(linkedEmail || '').trim(), Boolean(active)],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Mecánico no encontrado.' });
    }

    return res.json(mapMechanic(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo actualizar el mecánico.' });
  }
});

app.delete('/api/mechanics/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await query('delete from mechanic where id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Mecánico no encontrado.' });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo eliminar el mecánico.' });
  }
});

app.get('/api/work-orders', requireAuth, async (req, res) => {
  try {
    if (req.query.machineId) {
      const orders = await listWorkOrders('where wo.machine_id = $1', [req.query.machineId]);
      return res.json(orders);
    }
    const orders = await listWorkOrders();
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudieron listar las órdenes.' });
  }
});

app.post('/api/work-orders', requireAuth, requireRole('admin', 'receiver'), async (req, res) => {
  const payload = req.body || {};
  const requiredFields = { clientName: 'Nombre del cliente', clientCI: 'CI del cliente', machineName: 'Nombre del equipo', brand: 'Marca', machineModel: 'Modelo', description: 'Falla reportada' };
  for (const [field, label] of Object.entries(requiredFields)) {
    if (!String(payload[field] || '').trim()) {
      return res.status(400).json({ message: `El campo "${label}" es obligatorio.` });
    }
  }
  if (payload.warrantyType === 'warranty' && !payload.relatedOrderId) {
    return res.status(400).json({ message: 'Las órdenes de garantía de taller deben referenciar la orden de trabajo original.' });
  }
  try {
    const created = await withTransaction(async (client) => {
      const clientId = await findOrCreateClient(client, payload);
      const machineId = await createMachine(client, clientId, payload);
      const orderNumber = await nextCounterValue(client, 'workOrders');
      const result = await client.query(
        `insert into work_order (
          order_number, client_id, client_name, client_ci, machine_id, machine_name,
          machine_model, brand, serial_number, accessories, observations, description,
          findings, status, labor_cost, parts_cost, total, mechanic_id, mechanic_name,
          warranty_type, warranty_notes, related_order_id,
          audit_trail
        ) values (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          '', 'pending', 0, 0, 0, $13, $14,
          $15, $16, $17,
          $18::jsonb
        ) returning *`,
        [
          orderNumber,
          clientId,
          String(payload.clientName || '').trim(),
          String(payload.clientCI || '').trim(),
          machineId,
          String(payload.machineName || '').trim(),
          String(payload.machineModel || '').trim(),
          String(payload.brand || '').trim(),
          String(payload.serialNumber || '').trim(),
          String(payload.accessories || '').trim(),
          String(payload.observations || '').trim(),
          String(payload.description || '').trim(),
          payload.mechanicId || null,
          payload.mechanicName || null,
          payload.warrantyType || null,
          payload.warrantyNotes || null,
          payload.relatedOrderId || null,
          JSON.stringify(payload.auditTrail || []),
        ],
      );

      return result.rows[0];
    });

    return res.status(201).json(mapWorkOrder(created, []));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo crear la orden.' });
  }
});

app.put('/api/work-orders/:id', requireAuth, async (req, res) => {
  const userRole = req.user?.role;
  const isMechanic = userRole === 'mechanic';

  // Anular solo admin
  if (req.body?.status === 'cancelled' && userRole !== 'admin') {
    return res.status(403).json({ message: 'Solo un administrador puede anular órdenes.' });
  }

  try {
    // Leer la orden actual para proteger campos que el mecánico no puede cambiar
    const currentResult = await query('select * from work_order where id = $1 limit 1', [req.params.id]);
    if (currentResult.rowCount === 0) {
      return res.status(404).json({ message: 'Orden no encontrada.' });
    }
    const current = currentResult.rows[0];

    // Órdenes entregadas o anuladas son inmutables
    if (current.status === 'delivered') {
      return res.status(409).json({ message: 'La orden ya fue entregada al cliente y no puede modificarse.' });
    }
    if (current.status === 'cancelled') {
      return res.status(409).json({ message: 'La orden está anulada y no puede modificarse.' });
    }

    // Mecánicos solo pueden modificar su orden asignada
    if (isMechanic && current.mechanic_id !== req.user.sub) {
      return res.status(403).json({ message: 'Solo podés actualizar las órdenes que te están asignadas.' });
    }

    const body = req.body || {};
    const { status = current.status, findings = current.findings, auditTrail = parseJson(current.audit_trail, []) } = body;
    // Campos protegidos: si el usuario es mecánico se ignora lo que envíe y se usan los valores actuales
    const laborCost  = isMechanic ? current.labor_cost   : (body.laborCost   ?? current.labor_cost);
    const mechanicId = isMechanic ? current.mechanic_id  : (body.mechanicId  ?? current.mechanic_id);
    const mechanicName = isMechanic ? current.mechanic_name : (body.mechanicName ?? current.mechanic_name);
    const finishedAt = body.finishedAt ?? current.finished_at;
    const cancellationReason       = isMechanic ? current.cancellation_reason        : (body.cancellationReason       ?? null);
    const cancellationAuthorizedBy = isMechanic ? current.cancellation_authorized_by : (body.cancellationAuthorizedBy ?? null);

    // Recalcular total en el servidor para evitar manipulación desde el cliente
    const partsResult = await query(
      'select coalesce(sum(price * quantity), 0) as parts_cost from work_order_part where work_order_id = $1',
      [req.params.id],
    );
    const serverTotal = asNumber(partsResult.rows[0].parts_cost) + asNumber(laborCost);

    const result = await query(
      `update work_order
       set status = $2,
           findings = $3,
           labor_cost = $4,
           total = $5,
           mechanic_id = $6,
           mechanic_name = $7,
           finished_at = $8,
           audit_trail = $9::jsonb,
           cancellation_reason = $10,
           cancellation_authorized_by = $11,
           updated_at = now()
       where id = $1
       returning *`,
      [
        req.params.id,
        status,
        String(findings || ''),
        asNumber(laborCost),
        serverTotal,
        mechanicId || null,
        mechanicName || null,
        finishedAt || null,
        JSON.stringify(Array.isArray(auditTrail) ? auditTrail : []),
        cancellationReason || null,
        cancellationAuthorizedBy || null,
      ],
    );

    const [order] = await listWorkOrders('where id = $1', [req.params.id]);
    return res.json(order);
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo actualizar la orden.' });
  }
});

app.delete('/api/work-orders/:id', requireAuth, requireRole('admin', 'receiver'), async (req, res) => {
  try {
    await withTransaction(async (client) => {
      const orderResult = await client.query('select status from work_order where id = $1 for update', [req.params.id]);
      if (orderResult.rowCount === 0) {
        throw Object.assign(new Error('Orden no encontrada.'), { statusCode: 404 });
      }
      const { status } = orderResult.rows[0];
      // Restaurar stock solo en órdenes que aún no fueron entregadas ni anuladas
      // (en esos estados el stock ya fue confirmado como consumido en la venta)
      if (!['delivered', 'cancelled'].includes(status)) {
        const parts = await client.query('select part_id, quantity from work_order_part where work_order_id = $1', [req.params.id]);
        for (const row of parts.rows) {
          await client.query('update part set stock = stock + $2, updated_at = now() where id = $1', [row.part_id, row.quantity]);
        }
      }
      await client.query('delete from work_order where id = $1', [req.params.id]);
    });

    return res.status(204).send();
  } catch (error) {
    const status = error?.statusCode === 404 ? 404 : 500;
    return res.status(status).json({ message: error instanceof Error ? error.message : 'No se pudo eliminar la orden.' });
  }
});

app.post('/api/work-orders/:id/parts', requireAuth, async (req, res) => {
  const { partId, actor = 'Sistema' } = req.body || {};

  try {
    await withTransaction(async (client) => {
      const orderResult = await client.query('select * from work_order where id = $1 for update', [req.params.id]);
      if (orderResult.rowCount === 0) {
        throw new Error('Orden no encontrada.');
      }

      const partResult = await client.query('select * from part where id = $1 for update', [partId]);
      if (partResult.rowCount === 0) {
        throw new Error('Repuesto no encontrado.');
      }

      const orderRow = orderResult.rows[0];
      const partRow = partResult.rows[0];

      if (['finished', 'delivered', 'cancelled'].includes(orderRow.status)) {
        throw new Error(`No se pueden agregar repuestos a una orden en estado "${orderRow.status}".`);
      }

      if (Number(partRow.stock || 0) <= 0) {
        throw new Error(`No hay stock disponible para ${partRow.description}.`);
      }

      await client.query(
        `insert into work_order_part (work_order_id, part_id, code, description, price, quantity)
         values ($1, $2, $3, $4, $5, 1)
         on conflict (work_order_id, part_id)
         do update set quantity = work_order_part.quantity + 1`,
        [req.params.id, partRow.id, partRow.code, partRow.description, partRow.price],
      );

      const partsCostResult = await client.query('select coalesce(sum(price * quantity), 0) as total from work_order_part where work_order_id = $1', [req.params.id]);
      const nextAudit = [
        ...parseJson(orderRow.audit_trail, []),
        { action: 'part_added', actor, at: new Date().toISOString(), detail: `${partRow.description} x1` },
      ];

      await client.query(
        `update work_order
         set parts_cost = $2, total = $2 + labor_cost, audit_trail = $3::jsonb, updated_at = now()
         where id = $1`,
        [req.params.id, asNumber(partsCostResult.rows[0].total), JSON.stringify(nextAudit)],
      );

      await client.query('update part set stock = stock - 1, updated_at = now() where id = $1', [partId]);
    });

    const [currentOrder] = await listWorkOrders('where id = $1', [req.params.id]);
    return res.json(currentOrder);
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo agregar el repuesto.' });
  }
});

app.delete('/api/work-orders/:id/parts/:partId', requireAuth, async (req, res) => {
  const { actor = 'Sistema' } = req.body || {};

  try {
    await withTransaction(async (client) => {
      const orderResult = await client.query('select * from work_order where id = $1 for update', [req.params.id]);
      if (orderResult.rowCount === 0) {
        throw new Error('Orden no encontrada.');
      }

      if (['delivered', 'cancelled'].includes(orderResult.rows[0].status)) {
        throw new Error(`No se pueden quitar repuestos de una orden en estado "${orderResult.rows[0].status}".`);
      }

      const relationResult = await client.query(
        'select * from work_order_part where work_order_id = $1 and part_id = $2 for update',
        [req.params.id, req.params.partId],
      );

      if (relationResult.rowCount === 0) {
        throw new Error('Repuesto no asociado a la orden.');
      }

      const relationRow = relationResult.rows[0];

      if (Number(relationRow.quantity) > 1) {
        await client.query(
          'update work_order_part set quantity = quantity - 1 where work_order_id = $1 and part_id = $2',
          [req.params.id, req.params.partId],
        );
      } else {
        await client.query('delete from work_order_part where work_order_id = $1 and part_id = $2', [req.params.id, req.params.partId]);
      }

      const partsCostResult = await client.query('select coalesce(sum(price * quantity), 0) as total from work_order_part where work_order_id = $1', [req.params.id]);
      const nextAudit = [
        ...parseJson(orderResult.rows[0].audit_trail, []),
        { action: 'part_removed', actor, at: new Date().toISOString(), detail: `${relationRow.description} x1` },
      ];

      await client.query(
        `update work_order
         set parts_cost = $2, total = $2 + labor_cost, audit_trail = $3::jsonb, updated_at = now()
         where id = $1`,
        [req.params.id, asNumber(partsCostResult.rows[0].total), JSON.stringify(nextAudit)],
      );

      await client.query('update part set stock = stock + 1, updated_at = now() where id = $1', [req.params.partId]);
    });

    const [currentOrder] = await listWorkOrders('where id = $1', [req.params.id]);
    return res.json(currentOrder);
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo quitar el repuesto.' });
  }
});

app.get('/api/sales', requireAuth, async (_req, res) => {
  try {
    const sales = await listSales();
    return res.json(sales);
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudieron listar las ventas.' });
  }
});

app.post('/api/sales', requireAuth, requireRole('admin', 'receiver'), async (req, res) => {
  const { clientId, clientName, items = [], discount = 0, discountReason = null, discountAuthorizedBy = null, type = 'direct', workOrderId = null, createdBy = null, auditTrail = [], paymentMethod = 'cash', paymentRef = null } = req.body || {};

  const VALID_PAYMENT_METHODS = ['cash', 'qr', 'card', 'transfer'];
  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    return res.status(400).json({ message: `Forma de pago inválida: "${paymentMethod}".` });
  }

  // Validar que las cantidades sean positivas
  for (const item of items) {
    const qty = Number(item.quantity || 0);
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ message: `Cantidad inválida para "${item.description}". Debe ser un entero mayor a 0.` });
    }
  }

  // Recalcular subtotal y total en el servidor — nunca confiar en los del cliente
  const serverSubtotal = items.reduce((sum, item) => sum + asNumber(item.price) * Number(item.quantity || 0), 0);
  const serverDiscount = Math.min(Math.max(asNumber(discount), 0), serverSubtotal);
  const serverTotal = serverSubtotal - serverDiscount;

  try {
    const sale = await withTransaction(async (client) => {
      // Solo descontar stock en ventas directas. Las órdenes de trabajo
      // ya descontaron el stock al momento de agregar las partes.
      if (type === 'direct') {
        for (const item of items) {
          if (!item.partId) continue;
          const partResult = await client.query('select * from part where id = $1 for update', [item.partId]);
          if (partResult.rowCount === 0) {
            throw new Error(`El repuesto ${item.description} ya no existe.`);
          }
          const partRow = partResult.rows[0];
          if (Number(partRow.stock || 0) < Number(item.quantity || 0)) {
            throw new Error(`Stock insuficiente para ${partRow.description}.`);
          }
          await client.query('update part set stock = stock - $2, updated_at = now() where id = $1', [item.partId, Number(item.quantity || 0)]);
        }
      }

      const saleResult = await client.query(
        `insert into sale (client_id, client_name, subtotal, discount, discount_reason, discount_authorized_by, total, type, work_order_id, created_by, payment_method, payment_ref, audit_trail)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
         returning *`,
        [clientId, clientName, serverSubtotal, serverDiscount, discountReason, discountAuthorizedBy, serverTotal, type, workOrderId, createdBy, paymentMethod, paymentRef || null, JSON.stringify(auditTrail || [])],
      );

      for (const item of items) {
        await client.query(
          `insert into sale_item (sale_id, part_id, code, description, price, quantity)
           values ($1, $2, $3, $4, $5, $6)`,
          [saleResult.rows[0].id, item.partId || null, item.code, item.description, asNumber(item.price), Number(item.quantity || 0)],
        );
      }

      // Marcar la orden de trabajo como entregada al cobrarla
      if (type === 'work_order' && workOrderId) {
        const woCheck = await client.query('select status from work_order where id = $1 for update', [workOrderId]);
        if (woCheck.rowCount === 0) {
          throw new Error('La orden de trabajo referenciada no existe.');
        }
        if (woCheck.rows[0].status !== 'finished') {
          throw new Error('Solo se pueden cobrar órdenes en estado "Terminada". Verifica el diagnóstico y cierra la orden primero.');
        }
        await client.query(
          `update work_order set status = 'delivered', updated_at = now() where id = $1`,
          [workOrderId],
        );
      }

      return saleResult.rows[0];
    });

    const sales = await listSales();
    return res.status(201).json(sales.find((item) => item.id === sale.id));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo procesar la venta.' });
  }
});

app.get('/api/dashboard', requireAuth, async (_req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [statsResult, lowStockResult, recentOrdersResult] = await Promise.all([
      query(
        `select
          coalesce((select sum(total) from sale where created_at >= $1), 0)::numeric as direct_sales_today,
          coalesce((select sum(total) from work_order where status = 'delivered' and updated_at >= $1), 0)::numeric as delivered_today,
          (select count(*)::int from work_order where status in ('pending','in_progress','awaiting_parts')) as active_orders,
          (select count(*)::int from part where stock <= min_stock) as stock_alerts,
          (select count(*)::int from client) as total_clients,
          (select count(*)::int from work_order where status = 'pending') as pending_count,
          (select count(*)::int from work_order where status = 'in_progress') as in_progress_count,
          (select count(*)::int from work_order where status = 'awaiting_parts') as awaiting_parts_count,
          (select count(*)::int from work_order where status = 'finished') as finished_count`,
        [startOfDay],
      ),
      query('select * from part where stock <= min_stock order by (stock - min_stock) asc limit 3'),
      query(
        `select wo.*, rel.order_number as related_order_number
         from work_order wo
         left join work_order rel on wo.related_order_id = rel.id
         order by wo.created_at desc limit 5`,
      ),
    ]);

    const s = statsResult.rows[0];
    const directSalesToday = asNumber(s.direct_sales_today);
    const deliveredOrdersToday = asNumber(s.delivered_today);

    const recentOrderIds = recentOrdersResult.rows.map((r) => r.id);
    const partsMap = new Map();
    if (recentOrderIds.length > 0) {
      const partsResult = await query(
        'select * from work_order_part where work_order_id = any($1::uuid[]) order by work_order_id, code',
        [recentOrderIds],
      );
      partsResult.rows.forEach((row) => {
        const items = partsMap.get(row.work_order_id) || [];
        items.push(mapPartUsage(row));
        partsMap.set(row.work_order_id, items);
      });
    }

    return res.json({
      stats: {
        sales: directSalesToday + deliveredOrdersToday,
        orders: Number(s.active_orders),
        stockAlerts: Number(s.stock_alerts),
        clients: Number(s.total_clients),
      },
      recentOrders: recentOrdersResult.rows.map((row) => mapWorkOrder(row, partsMap.get(row.id) || [])),
      lowStockItems: lowStockResult.rows.map(mapPart),
      directSalesToday,
      deliveredOrdersToday,
      orderStatusSummary: {
        pending: Number(s.pending_count),
        in_progress: Number(s.in_progress_count),
        awaiting_parts: Number(s.awaiting_parts_count),
        finished: Number(s.finished_count),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo generar el dashboard.' });
  }
});

app.get('/api/reports', requireAuth, async (_req, res) => {
  try {
    const [sales, orders, parts] = await Promise.all([listSales(), listWorkOrders(), query('select * from part order by created_at desc')]);
    return res.json({ sales, orders, parts: parts.rows.map(mapPart) });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudieron cargar los reportes.' });
  }
});

// ── Reportes: garantías ───────────────────────────────────────────────────
app.get('/api/reports/warranties', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const [summary, byMechanic, recent, monthCount] = await Promise.all([
      query(`
        select warranty_type, count(*)::int as total
        from work_order where warranty_type is not null
        group by warranty_type`),
      query(`
        select coalesce(mechanic_name,'Sin asignar') as mechanic_name, count(*)::int as total
        from work_order where warranty_type = 'warranty'
        group by mechanic_name order by total desc limit 8`),
      query(`
        select order_number, client_name, machine_name, machine_model, status,
               warranty_notes, mechanic_name, created_at
        from work_order where warranty_type is not null
        order by created_at desc limit 20`),
      query(`
        select count(*)::int as total from work_order
        where warranty_type = 'warranty'
          and created_at >= date_trunc('month', now())`),
    ]);
    return res.json({
      summary: summary.rows,
      byMechanic: byMechanic.rows,
      recent: recent.rows,
      thisMonth: monthCount.rows[0].total,
    });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo cargar el reporte de garantías.' });
  }
});

// ── Portal público de seguimiento (sin auth) ──────────────────────────────
app.get('/api/public/seguimiento', async (req, res) => {
  const ci = String(req.query.ci || '').trim();
  if (ci.length < 3) {
    return res.status(400).json({ message: 'Ingresá tu CI o RUC para buscar.' });
  }
  try {
    const clientResult = await query('select * from client where lower(ci) = lower($1)', [ci]);
    if (clientResult.rowCount === 0) {
      return res.json({ client: null, orders: [] });
    }
    const client = clientResult.rows[0];
    const ordersResult = await query(
      `select order_number, status, machine_name, machine_model, brand,
              description, findings, created_at, updated_at, finished_at
       from work_order where client_id = $1 order by created_at desc limit 15`,
      [client.id],
    );
    return res.json({
      client: { name: client.name, ci: client.ci, phone: client.phone },
      orders: ordersResult.rows.map((r) => ({
        orderNumber: r.order_number,
        status: r.status,
        machineName: r.machine_name,
        machineModel: r.machine_model,
        brand: r.brand,
        description: r.description,
        findings: r.findings || '',
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        finishedAt: r.finished_at,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al buscar órdenes.' });
  }
});

// ── Historial de compras del cliente ─────────────────────────────────────
app.get('/api/clients/:id/purchases', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `select s.id, s.total, s.created_at, s.payment_method, s.type,
              coalesce(json_agg(
                json_build_object('description', si.description, 'quantity', si.quantity, 'price', si.price)
              ) filter (where si.id is not null), '[]') as items
       from sale s
       left join sale_item si on si.sale_id = s.id
       where s.client_id = $1
       group by s.id
       order by s.created_at desc limit 12`,
      [req.params.id],
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo obtener el historial de compras.' });
  }
});

// ── Corte de caja ─────────────────────────────────────────────────────────
// Tabla creada automáticamente si no existe
await query(`
  create table if not exists cash_register (
    id uuid primary key default gen_random_uuid(),
    opened_by text not null,
    opened_at timestamptz not null default now(),
    opening_balance numeric(12,2) not null default 0,
    closed_by text,
    closed_at timestamptz,
    closing_balance numeric(12,2),
    expected_balance numeric(12,2),
    difference numeric(12,2),
    notes text,
    status text not null default 'open' check (status in ('open','closed'))
  )
`);

app.get('/api/cash-register/current', requireAuth, requireRole('admin', 'receiver'), async (_req, res) => {
  try {
    const result = await query(`
      select cr.*,
        coalesce((
          select sum(s.total) from sale s
          where s.created_at >= cr.opened_at
            and (cr.closed_at is null or s.created_at <= cr.closed_at)
        ), 0) as sales_total
      from cash_register cr
      where cr.status = 'open'
      order by cr.opened_at desc limit 1`);
    return res.json(result.rows[0] || null);
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo obtener la caja actual.' });
  }
});

app.post('/api/cash-register/open', requireAuth, requireRole('admin', 'receiver'), async (req, res) => {
  const { openingBalance = 0, notes = '' } = req.body || {};
  try {
    const existing = await query(`select id from cash_register where status = 'open' limit 1`);
    if (existing.rowCount > 0) {
      return res.status(409).json({ message: 'Ya hay una caja abierta. Cerrá la caja actual antes de abrir una nueva.' });
    }
    const result = await query(
      `insert into cash_register (opened_by, opening_balance, notes)
       values ($1, $2, $3) returning *`,
      [req.user.displayName || req.user.email, asNumber(openingBalance), notes],
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo abrir la caja.' });
  }
});

app.post('/api/cash-register/close', requireAuth, requireRole('admin', 'receiver'), async (req, res) => {
  const { closingBalance, notes = '' } = req.body || {};
  try {
    const current = await query(`select * from cash_register where status = 'open' order by opened_at desc limit 1`);
    if (current.rowCount === 0) {
      return res.status(404).json({ message: 'No hay caja abierta para cerrar.' });
    }
    const register = current.rows[0];
    const salesResult = await query(
      `select coalesce(sum(total), 0) as total from sale where created_at >= $1`,
      [register.opened_at],
    );
    const expected = asNumber(register.opening_balance) + asNumber(salesResult.rows[0].total);
    const closing = asNumber(closingBalance);
    const difference = closing - expected;
    const result = await query(
      `update cash_register
       set status = 'closed', closed_by = $2, closed_at = now(),
           closing_balance = $3, expected_balance = $4, difference = $5, notes = $6
       where id = $1 returning *`,
      [register.id, req.user.displayName || req.user.email, closing, expected, difference, notes],
    );
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo cerrar la caja.' });
  }
});

app.get('/api/cash-register/history', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const result = await query(
      `select * from cash_register order by opened_at desc limit 30`,
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo obtener el historial de caja.' });
  }
});

// ── Cambio de contraseña ───────────────────────────────────────────────────
app.put('/api/users/:id/password', requireAuth, requireRole('admin'), async (req, res) => {
  const { password } = req.body || {};
  if (!password || String(password).length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  try {
    const passwordHash = await hashPassword(String(password));
    const result = await query(
      'update app_user set password_hash = $2, updated_at = now() where id = $1 returning id',
      [req.params.id, passwordHash],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.' });
  }
});

// ── Cancelar venta (anulación con auditoría + devolución de stock) ─────────
app.delete('/api/sales/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { reason = '', authorizedBy = '' } = req.body || {};

  if (!reason.trim() || !authorizedBy.trim()) {
    return res.status(400).json({ message: 'La anulación requiere motivo y nombre del autorizador.' });
  }

  try {
    await withTransaction(async (client) => {
      const saleResult = await client.query('select * from sale where id = $1 for update', [req.params.id]);
      if (saleResult.rowCount === 0) throw new Error('Venta no encontrada.');

      const itemsResult = await client.query('select * from sale_item where sale_id = $1', [req.params.id]);
      for (const item of itemsResult.rows) {
        if (item.part_id) {
          await client.query('update part set stock = stock + $2, updated_at = now() where id = $1', [item.part_id, Number(item.quantity || 0)]);
        }
      }

      const prevAudit = parseJson(saleResult.rows[0].audit_trail, []);
      const nextAudit = [...prevAudit, { action: 'sale_cancelled', actor: authorizedBy.trim(), at: new Date().toISOString(), detail: reason.trim() }];
      await client.query('update sale set audit_trail = $2::jsonb where id = $1', [req.params.id, JSON.stringify(nextAudit)]);
      await client.query('delete from sale_item where sale_id = $1', [req.params.id]);
      await client.query('delete from sale where id = $1', [req.params.id]);
    });

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo anular la venta.' });
  }
});

// ── Historial de máquinas y OTs de un cliente ─────────────────────────────
app.get('/api/clients/:id/history', requireAuth, async (req, res) => {
  try {
    const machinesResult = await query('select * from machine where client_id = $1 order by created_at desc', [req.params.id]);
    const ordersResult = await query('select * from work_order where client_id = $1 order by created_at desc', [req.params.id]);
    return res.json({ machines: machinesResult.rows, orders: ordersResult.rows });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo obtener el historial.' });
  }
});

// ── CRUD machine_reference ────────────────────────────────────────────────
app.post('/api/machine-reference', requireAuth, requireRole('admin'), async (req, res) => {
  const { brand, category, model } = req.body || {};
  if (!brand || !category || !model) {
    return res.status(400).json({ message: 'Marca, categoría y modelo son obligatorios.' });
  }

  try {
    const result = await query(
      `insert into machine_reference (brand, category, model)
       values ($1, $2, $3)
       on conflict (brand, category, model) do nothing
       returning *`,
      [String(brand).trim().toUpperCase(), String(category).trim(), String(model).trim()],
    );

    if (result.rowCount === 0) {
      return res.status(409).json({ message: 'Esa combinación de marca, categoría y modelo ya existe.' });
    }

    return res.status(201).json(mapMachineReference(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo crear la referencia.' });
  }
});

app.put('/api/machine-reference/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { brand, category, model } = req.body || {};
  try {
    const result = await query(
      'update machine_reference set brand = $2, category = $3, model = $4 where id = $1 returning *',
      [req.params.id, String(brand).trim().toUpperCase(), String(category).trim(), String(model).trim()],
    );

    if (result.rowCount === 0) return res.status(404).json({ message: 'Referencia no encontrada.' });
    return res.json(mapMachineReference(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo actualizar la referencia.' });
  }
});

app.delete('/api/machine-reference/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await query('delete from machine_reference where id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Referencia no encontrada.' });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo eliminar la referencia.' });
  }
});

app.get('/api/activity/live', requireAuth, requireRole('admin'), async (req, res) => {
  const limit = Math.max(10, Math.min(300, Number(req.query.limit || 120)));

  try {
    const [itemsResult, totalResult, activeSessionsResult] = await Promise.all([
      query(
        `select
          id::text as id,
          created_at as at,
          method,
          path,
          status_code as "statusCode",
          ip,
          origin,
          user_agent as "userAgent",
          device_type as "deviceType",
          browser,
          os,
          user_id as "userId",
          user_email as "userEmail",
          user_role as "userRole",
          user_display_name as "userDisplayName"
         from activity_log
         order by created_at desc
         limit $1`,
        [limit],
      ),
      query('select count(*)::int as total from activity_log'),
      query(
        `select distinct on (coalesce(user_id::text, ip || ':' || user_agent))
          user_id as "userId",
          user_email as "userEmail",
          user_role as "userRole",
          ip,
          device_type as "deviceType",
          browser,
          os,
          user_agent as "userAgent",
          created_at as "lastSeenAt"
         from activity_log
         where created_at >= now() - interval '5 minutes'
         order by coalesce(user_id::text, ip || ':' || user_agent), created_at desc`,
      ),
    ]);

    return res.json({
      items: itemsResult.rows,
      summary: {
        totalCaptured: totalResult.rows[0]?.total || 0,
        activeNow: activeSessionsResult.rowCount,
      },
      activeSessions: activeSessionsResult.rows,
    });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudo recuperar la actividad en vivo.' });
  }
});

// ── Configuración del taller ──────────────────────────────────────────────
const WORKSHOP_KEYS = ['name', 'address', 'phone', 'email', 'tagline'];

app.get('/api/settings/workshop', requireAuth, async (_req, res) => {
  try {
    const result = await query(`select key, value from app_settings where key like 'workshop_%'`);
    const settings = {};
    result.rows.forEach((row) => { settings[row.key.replace('workshop_', '')] = row.value; });
    return res.json(settings);
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudieron leer los ajustes del taller.' });
  }
});

app.put('/api/settings/workshop', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    for (const field of WORKSHOP_KEYS) {
      if (field in (req.body || {})) {
        await query(
          `insert into app_settings (key, value) values ($1, $2)
           on conflict (key) do update set value = excluded.value`,
          [`workshop_${field}`, String(req.body[field] || '').trim()],
        );
      }
    }
    const result = await query(`select key, value from app_settings where key like 'workshop_%'`);
    const settings = {};
    result.rows.forEach((row) => { settings[row.key.replace('workshop_', '')] = row.value; });
    return res.json(settings);
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'No se pudieron guardar los ajustes del taller.' });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '..', 'dist');

app.use(express.static(distPath));
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// --- Catálogos: Marcas y Categorías de máquina ---
app.get('/api/catalogs/brands', requireAuth, async (_req, res) => {
  try {
    const result = await query('select id, name from machine_brand order by name');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/catalogs/brands', requireAuth, requireRole('admin'), async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Nombre requerido.' });
  try {
    const result = await query('insert into machine_brand(name) values($1) returning id, name', [name]);
    res.status(201).json(result.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ message: 'Ya existe esa marca.' });
    res.status(500).json({ message: e.message });
  }
});

app.delete('/api/catalogs/brands/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await query('delete from machine_brand where id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/catalogs/categories', requireAuth, async (_req, res) => {
  try {
    const result = await query('select id, name from machine_category order by name');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/catalogs/categories', requireAuth, requireRole('admin'), async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Nombre requerido.' });
  try {
    const result = await query('insert into machine_category(name) values($1) returning id, name', [name]);
    res.status(201).json(result.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ message: 'Ya existe esa categoría.' });
    res.status(500).json({ message: e.message });
  }
});

app.delete('/api/catalogs/categories/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await query('delete from machine_category where id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/catalogs/models', requireAuth, async (req, res) => {
  const brandId = String(req.query.brandId || '').trim();
  const brandName = String(req.query.brandName || '').trim();

  try {
    let result;
    if (brandId) {
      result = await query(
        `select mm.id, mm.name, mm.brand_id as "brandId", mb.name as "brandName"
         from machine_model mm
         join machine_brand mb on mb.id = mm.brand_id
         where mm.brand_id = $1
         order by mm.name`,
        [brandId],
      );
    } else if (brandName) {
      result = await query(
        `select mm.id, mm.name, mm.brand_id as "brandId", mb.name as "brandName"
         from machine_model mm
         join machine_brand mb on mb.id = mm.brand_id
         where lower(mb.name) = lower($1)
         order by mm.name`,
        [brandName],
      );
    } else {
      result = await query(
        `select mm.id, mm.name, mm.brand_id as "brandId", mb.name as "brandName"
         from machine_model mm
         join machine_brand mb on mb.id = mm.brand_id
         order by mb.name, mm.name`,
      );
    }

    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post('/api/catalogs/models', requireAuth, requireRole('admin'), async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const brandId = String(req.body?.brandId || '').trim();

  if (!name || !brandId) {
    return res.status(400).json({ message: 'Nombre y marca son requeridos.' });
  }

  try {
    const result = await query(
      `insert into machine_model (brand_id, name)
       values ($1, $2)
       returning id, name, brand_id as "brandId"`,
      [brandId, name],
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ message: 'Ese modelo ya existe para la marca seleccionada.' });
    res.status(500).json({ message: e.message });
  }
});

app.delete('/api/catalogs/models/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await query('delete from machine_model where id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// ── BANCARD vPOS — Integración de pagos electrónicos ─────────────────────
// ══════════════════════════════════════════════════════════════════════════

const BANCARD_PUBLIC_KEY  = process.env.BANCARD_PUBLIC_KEY  || '';
const BANCARD_PRIVATE_KEY = process.env.BANCARD_PRIVATE_KEY || '';
const BANCARD_SANDBOX     = process.env.BANCARD_SANDBOX !== 'false'; // true por defecto en dev
const BANCARD_BASE_URL    = BANCARD_SANDBOX
  ? 'https://vpos.infonet.com.py:8888'
  : 'https://vpos.infonet.com.py';
const APP_URL = process.env.APP_URL || process.env.CORS_ORIGIN?.split(',')[0] || 'https://stihl-motors.onrender.com';

function bancardToken(...parts) {
  return crypto.createHmac('sha256', BANCARD_PRIVATE_KEY).update(parts.join('')).digest('hex');
}

function formatAmount(amount) {
  return Number(amount).toFixed(2);
}

// ── POST /api/payments/bancard/init — Inicializar cobro ──────────────────
app.post('/api/payments/bancard/init', requireAuth, requireRole('admin', 'receiver'), async (req, res) => {
  if (!BANCARD_PUBLIC_KEY || !BANCARD_PRIVATE_KEY) {
    return res.status(503).json({ message: 'Las credenciales de Bancard no están configuradas. Contactá al administrador.' });
  }

  const { saleData, amount, currency = 'PYG', description = 'Pago en Taller', createdBy } = req.body || {};

  if (!saleData || !amount || amount <= 0) {
    return res.status(400).json({ message: 'Datos de venta y monto son obligatorios.' });
  }

  const shopProcessId = `TALLER-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const amountStr = formatAmount(amount);

  try {
    // Persistir el pago pendiente antes de llamar a Bancard
    await query(
      `insert into pending_payment (shop_process_id, sale_data, amount, currency, created_by)
       values ($1, $2::jsonb, $3, $4, $5)`,
      [shopProcessId, JSON.stringify(saleData), asNumber(amount), currency, createdBy || null],
    );

    const token = bancardToken(shopProcessId, amountStr, currency);

    const payload = {
      public_key: BANCARD_PUBLIC_KEY,
      operation: {
        token,
        shop_process_id: shopProcessId,
        amount: amountStr,
        currency,
        additional_data: '',
        description: description.substring(0, 100),
        return_url: `${APP_URL}/pago-completado`,
        cancel_url:  `${APP_URL}/pago-cancelado`,
      },
    };

    const bancardRes = await fetch(`${BANCARD_BASE_URL}/api/online/charge/init_payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const bancardData = await bancardRes.json();

    if (bancardData.status !== 'success') {
      await query(`update pending_payment set status = 'cancelled' where shop_process_id = $1`, [shopProcessId]);
      return res.status(502).json({ message: bancardData.messages?.[0]?.dsc || 'Bancard rechazó el inicio del pago.' });
    }

    return res.json({
      shopProcessId,
      processId: bancardData.process_id,
      redirectUrl: `${BANCARD_BASE_URL}/payment/card?process_id=${bancardData.process_id}`,
    });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'Error al conectar con Bancard.' });
  }
});

// ── POST /api/payments/bancard/webhook — Confirmación de Bancard ─────────
// Sin autenticación JWT: Bancard llama directo a este endpoint
app.post('/api/payments/bancard/webhook', async (req, res) => {
  // En producción, rechazar si no hay clave configurada
  if (!BANCARD_PRIVATE_KEY) {
    console.error('[Bancard webhook] Recibido sin BANCARD_PRIVATE_KEY configurada — ignorado.');
    return res.status(503).json({ status: 'error', message: 'Integración de pagos no configurada.' });
  }

  const op = req.body?.operation;
  if (!op?.shop_process_id) {
    return res.status(400).json({ status: 'error', message: 'Payload inválido.' });
  }

  const { shop_process_id, confirmation_id, amount, currency, response_code } = op;

  // Verificar HMAC — siempre requerido cuando la clave está configurada
  const expectedToken = bancardToken(shop_process_id, formatAmount(amount), currency || 'PYG');
  if (op.token !== expectedToken) {
    return res.status(401).json({ status: 'error', message: 'Firma inválida.' });
  }

  // Solo procesar aprobados (response_code "00" = aprobado por Bancard)
  if (response_code !== '00') {
    await query(`update pending_payment set status = 'cancelled' where shop_process_id = $1`, [shop_process_id]);
    return res.json({ status: 'success' });
  }

  try {
    const pendingResult = await query(
      `select * from pending_payment where shop_process_id = $1 and status = 'pending' limit 1`,
      [shop_process_id],
    );

    if (pendingResult.rowCount === 0) {
      // Ya procesado o no existe
      return res.json({ status: 'success' });
    }

    const pending = pendingResult.rows[0];
    const saleData = parseJson(pending.sale_data, {});

    // Crear la venta real en una transacción
    const sale = await withTransaction(async (client) => {
      if (saleData.type === 'direct') {
        for (const item of (saleData.items || [])) {
          if (!item.partId) continue;
          const partResult = await client.query('select * from part where id = $1 for update', [item.partId]);
          if (partResult.rowCount === 0) throw new Error(`Repuesto ${item.description} no encontrado.`);
          const partRow = partResult.rows[0];
          if (Number(partRow.stock || 0) < Number(item.quantity || 0)) {
            throw new Error(`Stock insuficiente para ${partRow.description}.`);
          }
          await client.query('update part set stock = stock - $2, updated_at = now() where id = $1', [item.partId, Number(item.quantity || 0)]);
        }
      }

      const saleResult = await client.query(
        `insert into sale (client_id, client_name, subtotal, discount, discount_reason, discount_authorized_by, total, type, work_order_id, created_by, audit_trail)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb) returning *`,
        [
          saleData.clientId || null, saleData.clientName,
          asNumber(pending.amount), asNumber(saleData.discount || 0),
          saleData.discountReason || null, saleData.discountAuthorizedBy || null,
          asNumber(pending.amount) - asNumber(saleData.discount || 0),
          saleData.type || 'direct',
          saleData.workOrderId || null,
          pending.created_by || 'Bancard',
          JSON.stringify([
            ...(saleData.auditTrail || []),
            { action: 'bancard_payment_confirmed', actor: 'Bancard vPOS', at: new Date().toISOString(), detail: `Confirmación #${confirmation_id}` },
          ]),
        ],
      );

      for (const item of (saleData.items || [])) {
        await client.query(
          `insert into sale_item (sale_id, part_id, code, description, price, quantity)
           values ($1, $2, $3, $4, $5, $6)`,
          [saleResult.rows[0].id, item.partId || null, item.code, item.description, asNumber(item.price), Number(item.quantity || 0)],
        );
      }

      if (saleData.type === 'work_order' && saleData.workOrderId) {
        await client.query(`update work_order set status = 'delivered', updated_at = now() where id = $1`, [saleData.workOrderId]);
      }

      await client.query(
        `update pending_payment set status = 'confirmed', sale_id = $2, bancard_confirmation_id = $3 where shop_process_id = $1`,
        [shop_process_id, saleResult.rows[0].id, confirmation_id || null],
      );

      return saleResult.rows[0];
    });

    return res.json({ status: 'success', saleId: sale.id });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Error al procesar el pago.' });
  }
});

// ── GET /api/payments/bancard/status/:shopProcessId — Polling del frontend ─
app.get('/api/payments/bancard/status/:shopProcessId', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `select p.status, p.sale_id, p.bancard_confirmation_id, p.expires_at,
              s.client_name, s.total, s.subtotal, s.discount, s.type, s.created_at
       from pending_payment p
       left join sale s on s.id = p.sale_id
       where p.shop_process_id = $1 limit 1`,
      [req.params.shopProcessId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Pago no encontrado.' });
    }

    const row = result.rows[0];

    // Expirar automáticamente si pasó el tiempo
    if (row.status === 'pending' && new Date() > new Date(row.expires_at)) {
      await query(`update pending_payment set status = 'expired' where shop_process_id = $1`, [req.params.shopProcessId]);
      return res.json({ status: 'expired' });
    }

    return res.json({
      status: row.status,
      saleId: row.sale_id,
      confirmationId: row.bancard_confirmation_id,
      expiresAt: row.expires_at,
      sale: row.sale_id ? {
        clientName: row.client_name,
        total: asNumber(row.total),
        subtotal: asNumber(row.subtotal),
        discount: asNumber(row.discount),
        type: row.type,
        createdAt: row.created_at,
      } : null,
    });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'Error al consultar el estado del pago.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// LEADS / FORMULARIO DE CONTACTO PÚBLICO
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/contact:
 *   post:
 *     tags: [Contacto]
 *     summary: Enviar formulario de contacto público
 *     description: Endpoint público (sin autenticación). Recibe los datos del formulario de contacto del sitio web y los persiste en la tabla `lead`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, message]
 *             properties:
 *               name:    { type: string, example: "Juan Pérez" }
 *               email:   { type: string, format: email, example: "juan@correo.com" }
 *               phone:   { type: string, example: "0981 123 456" }
 *               service: { type: string, example: "Reparación de motosierra" }
 *               message: { type: string, example: "Necesito revisar mi equipo STIHL MS 170" }
 *     responses:
 *       201:
 *         description: Lead registrado correctamente
 *       400:
 *         description: Datos inválidos
 */
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone = '', service = '', message = '' } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ message: 'El nombre es obligatorio (mínimo 2 caracteres).' });
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: 'Debe ingresar un correo electrónico válido.' });
    }
    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return res.status(400).json({ message: 'El mensaje es obligatorio (mínimo 10 caracteres).' });
    }

    const ip = getClientIp(req);

    const result = await query(
      `insert into lead (name, email, phone, service, message, ip)
       values ($1, $2, $3, $4, $5, $6)
       returning id, name, email, created_at`,
      [name.trim(), email.trim().toLowerCase(), phone.trim(), service.trim(), message.trim(), ip],
    );

    return res.status(201).json({
      message: '¡Gracias! Tu consulta fue recibida. Te contactaremos a la brevedad.',
      lead: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'Error al registrar la consulta.' });
  }
});

/**
 * @openapi
 * /api/leads:
 *   get:
 *     tags: [Contacto]
 *     summary: Listar leads recibidos (solo admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [new, contacted, converted, discarded] }
 *     responses:
 *       200:
 *         description: Lista de leads
 */
app.get('/api/leads', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    const params = [];
    let where = '';
    if (status) {
      params.push(status);
      where = `where status = $1`;
    }

    const result = await query(
      `select id, name, email, phone, service, message, status, ip, created_at, updated_at
       from lead ${where}
       order by created_at desc
       limit 500`,
      params,
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'Error al obtener leads.' });
  }
});

/**
 * @openapi
 * /api/leads/{id}:
 *   put:
 *     tags: [Contacto]
 *     summary: Actualizar estado de un lead (solo admin)
 *     security: [{ bearerAuth: [] }]
 */
app.put('/api/leads/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowed = ['new', 'contacted', 'converted', 'discarded'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Estado inválido.' });
    }
    const result = await query(
      `update lead set status = $1, updated_at = now() where id = $2 returning *`,
      [status, req.params.id],
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Lead no encontrado.' });
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'Error al actualizar lead.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS — datos para gráficos del panel admin
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/analytics/leads:
 *   get:
 *     tags: [Analítica]
 *     summary: Leads por mes (últimos 6 meses)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array de { month, count } para renderizar gráfico
 */
app.get('/api/analytics/leads', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await query(`
      select
        to_char(date_trunc('month', created_at), 'Mon YYYY') as month,
        to_char(date_trunc('month', created_at), 'YYYY-MM') as month_key,
        count(*)::int as count
      from lead
      where created_at >= now() - interval '6 months'
      group by date_trunc('month', created_at)
      order by date_trunc('month', created_at) asc
    `);
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'Error al obtener analítica.' });
  }
});

/**
 * @openapi
 * /api/analytics/summary:
 *   get:
 *     tags: [Analítica]
 *     summary: Resumen general: leads por estado
 *     security: [{ bearerAuth: [] }]
 */
app.get('/api/analytics/summary', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const leadsResult = await query(`
      select status, count(*)::int as count from lead group by status
    `);
    const visitorsResult = await query(`
      select count(distinct ip)::int as unique_visitors,
             count(*)::int as total_requests
      from activity_log
      where created_at >= now() - interval '30 days'
        and path not like '%health%'
    `);
    const browserResult = await query(`
      select browser, count(*)::int as count
      from activity_log
      where created_at >= now() - interval '30 days'
      group by browser
      order by count desc
      limit 5
    `);

    return res.json({
      leads: leadsResult.rows,
      visitors: visitorsResult.rows[0],
      browsers: browserResult.rows,
    });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'Error al obtener resumen.' });
  }
});

// ── Manejador de errores global (debe ser la última middleware registrada) ─
app.use((error, _req, res, _next) => {
  res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' });
});

let server;

ensureCatalogTables()
  .then(() => {
    server = app.listen(port, () => {
      console.log(`API PostgreSQL disponible en puerto ${port}`);
    });
  })
  .catch((error) => {
    console.error('No se pudieron inicializar tablas de catálogos:', error instanceof Error ? error.message : error);
    process.exit(1);
  });

process.on('SIGTERM', async () => {
  if (server) server.close();
  await pool.end();
});
