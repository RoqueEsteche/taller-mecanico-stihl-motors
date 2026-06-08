create extension if not exists pgcrypto;

create table if not exists app_settings (
  key text primary key,
  value text not null default ''
);

insert into app_settings (key, value) values
  ('workshop_name', 'Taller Mecánico'),
  ('workshop_address', ''),
  ('workshop_phone', ''),
  ('workshop_email', ''),
  ('workshop_tagline', '')
on conflict (key) do nothing;

create table if not exists app_user (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  role text not null check (role in ('admin', 'receiver', 'mechanic', 'stock_manager')),
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists client (
  id uuid primary key default gen_random_uuid(),
  ci text not null unique,
  name text not null,
  phone text not null default '',
  address text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists supplier (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null default '',
  phone text not null default '',
  email text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists mechanic (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty text not null default '',
  active boolean not null default true,
  linked_user_id uuid references app_user(id) on delete set null,
  linked_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists part (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null,
  machine_category text not null default 'General',
  machine_brand text not null default '',
  machine_model text not null default '',
  price numeric(12,2) not null default 0,
  stock integer not null default 0,
  min_stock integer not null default 0,
  supplier_id uuid references supplier(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists machine_brand (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists machine_category (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists machine_model (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references machine_brand(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (brand_id, name)
);

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
);

create index if not exists idx_activity_log_created_at
  on activity_log(created_at desc);

create index if not exists idx_activity_log_user_created
  on activity_log(user_id, created_at desc);

create table if not exists machine_reference (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  category text not null,
  model text not null,
  created_at timestamptz not null default now(),
  unique (brand, category, model)
);

insert into machine_reference (brand, category, model) values
  ('STIHL', 'Motosierras', 'MS 170'),
  ('STIHL', 'Motosierras', 'MS 180'),
  ('STIHL', 'Motosierras', 'MS 210'),
  ('STIHL', 'Motosierras', 'MS 250'),
  ('STIHL', 'Motosierras', 'MS 260'),
  ('STIHL', 'Motosierras', 'MS 382'),
  ('STIHL', 'Desmalezadoras', 'FS 55'),
  ('STIHL', 'Desmalezadoras', 'FS 85'),
  ('STIHL', 'Desmalezadoras', 'FS 120'),
  ('STIHL', 'Desmalezadoras', 'FS 250'),
  ('STIHL', 'Desmalezadoras', 'FS 450'),
  ('STIHL', 'Hidrolavadoras', 'RE 110'),
  ('STIHL', 'Hidrolavadoras', 'RE 143'),
  ('STIHL', 'Fumigadoras', 'SR 420'),
  ('STIHL', 'Fumigadoras', 'SR 450'),
  ('STIHL', 'Fumigadoras', 'SG 20'),
  ('STIHL', 'Sopladores', 'BG 86'),
  ('STIHL', 'Sopladores', 'BR 600'),
  ('HUSQVARNA', 'Motosierras', '120 Mark II'),
  ('HUSQVARNA', 'Motosierras', '445'),
  ('HUSQVARNA', 'Motosierras', '450'),
  ('HUSQVARNA', 'Motosierras', '395XP'),
  ('HUSQVARNA', 'Desmalezadoras', '131R'),
  ('HUSQVARNA', 'Desmalezadoras', '143R-II'),
  ('HUSQVARNA', 'Desmalezadoras', '541RS'),
  ('HUSQVARNA', 'Cortacesped', 'LC 140'),
  ('HUSQVARNA', 'Cortacesped', 'LC 151'),
  ('HUSQVARNA', 'Hidrolavadoras', 'PW 360'),
  ('HUSQVARNA', 'Motobombas', 'W50P'),
  ('HUSQVARNA', 'Motobombas', 'W80P'),
  ('HUSQVARNA', 'Fumigadoras', '321S15'),
  ('HUSQVARNA', 'Sopladores', '125B'),
  ('HUSQVARNA', 'Sopladores', '570BTS'),
  ('KARCHER', 'Hidrolavadoras', 'K2'),
  ('KARCHER', 'Hidrolavadoras', 'K3'),
  ('KARCHER', 'Hidrolavadoras', 'K4'),
  ('KARCHER', 'Hidrolavadoras', 'K5'),
  ('KARCHER', 'Hidrolavadoras', 'K7'),
  ('KARCHER', 'Hidrolavadoras', 'HD 5/11'),
  ('KARCHER', 'Hidrolavadoras', 'HDS 8/18'),
  ('KARCHER', 'Aspiradoras', 'WD 1'),
  ('KARCHER', 'Aspiradoras', 'WD 3'),
  ('KARCHER', 'Aspiradoras', 'NT 30/1'),
  ('KARCHER', 'Aspiradoras', 'Puzzi 10/1'),
  ('KARCHER', 'Barredoras', 'S 4'),
  ('KARCHER', 'Barredoras', 'S 6'),
  ('KARCHER', 'Barredoras', 'KM 70/20'),
  ('KARCHER', 'Lustradoras', 'BDS 43/150'),
  ('HONDA', 'Cortacesped', 'HRN 216'),
  ('HONDA', 'Cortacesped', 'HRX 217'),
  ('HONDA', 'Motobombas', 'WB20'),
  ('HONDA', 'Motobombas', 'WB30'),
  ('HONDA', 'Motobombas', 'WT40'),
  ('HONDA', 'Generadores', 'EU22i'),
  ('HONDA', 'Generadores', 'EM5000'),
  ('HONDA', 'Generadores', 'EG6500'),
  ('MAKITA', 'Taladros', 'HP1630'),
  ('MAKITA', 'Taladros', 'DHP485'),
  ('MAKITA', 'Amoladoras', 'GA4530'),
  ('MAKITA', 'Amoladoras', '9557HNG'),
  ('MAKITA', 'Aspiradoras', 'VC2512L'),
  ('MAKITA', 'Sopladores', 'EB5300TH'),
  ('DEWALT', 'Taladros', 'DWD024'),
  ('DEWALT', 'Taladros', 'DCD771'),
  ('DEWALT', 'Amoladoras', 'DWE402'),
  ('DEWALT', 'Amoladoras', 'DWE4120'),
  ('BOSCH', 'Taladros', 'GSB 13 RE'),
  ('BOSCH', 'Taladros', 'GSB 18V-50'),
  ('BOSCH', 'Amoladoras', 'GWS 700'),
  ('BOSCH', 'Amoladoras', 'GWS 9-125'),
  ('JACTO', 'Fumigadoras', 'PJH'),
  ('JACTO', 'Fumigadoras', 'XP12'),
  ('JACTO', 'Fumigadoras', 'PJB'),
  ('ECHO', 'Motosierras', 'CS-310'),
  ('ECHO', 'Motosierras', 'CS-620'),
  ('ECHO', 'Desmalezadoras', 'SRM-4605'),
  ('ECHO', 'Fumigadoras', 'SHR-210'),
  ('ECHO', 'Sopladores', 'PB-2520'),
  ('TOYAMA', 'Desmalezadoras', 'TBC43'),
  ('TOYAMA', 'Motobombas', 'TWP50'),
  ('TOYAMA', 'Generadores', 'TG2800'),
  ('TOYAMA', 'Fumigadoras', 'TDM40'),
  ('NIWA', 'Desmalezadoras', 'DNW-52'),
  ('NIWA', 'Motobombas', 'MBW-50'),
  ('NIWA', 'Motobombas', 'MBD-80'),
  ('NIWA', 'Generadores', 'GNW-28'),
  ('NILFISK', 'Hidrolavadoras', 'Core 140'),
  ('NILFISK', 'Hidrolavadoras', 'MC 2C'),
  ('NILFISK', 'Barredoras', 'SW250'),
  ('NILFISK', 'Aspiradoras', 'Buddy II'),
  ('TORO', 'Cortacesped', 'Recycler'),
  ('TORO', 'Cortacesped', 'Timemaster'),
  ('SWINGTEC', 'Termonieblas', 'Swingfog SN 50'),
  ('SWINGTEC', 'Termonieblas', 'Swingfog SN 101'),
  ('IGEBA', 'Termonieblas', 'TF 35'),
  ('IGEBA', 'Termonieblas', 'TF 95'),
  ('PULSFOG', 'Termonieblas', 'K-10'),
  ('PULSFOG', 'Termonieblas', 'K-22'),
  ('MILWAUKEE', 'Taladros', 'M18 Fuel'),
  ('MILWAUKEE', 'Amoladoras', '2780-20'),
  ('RIDGID', 'Aspiradoras', 'WD1450'),
  ('BLACK+DECKER', 'Hidrolavadoras', 'PW1450'),
  ('BLACK+DECKER', 'Taladros', 'TM500'),
  ('BLACK+DECKER', 'Aspiradoras', 'BDWD10'),
  ('SHINDAIWA', 'Motosierras', '600sx'),
  ('SHINDAIWA', 'Desmalezadoras', 'B45')
on conflict (brand, category, model) do nothing;

create table if not exists machine (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references client(id) on delete cascade,
  name text not null,
  brand text not null default '',
  model text not null default '',
  serial_number text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists counter (
  key text primary key,
  value integer not null default 0
);

create table if not exists work_order (
  id uuid primary key default gen_random_uuid(),
  order_number integer not null unique,
  client_id uuid not null references client(id),
  client_name text not null,
  client_ci text not null,
  machine_id uuid not null references machine(id),
  machine_name text not null,
  machine_model text not null default '',
  brand text not null default '',
  serial_number text not null default '',
  accessories text not null default '',
  observations text not null default '',
  description text not null default '',
  findings text not null default '',
  status text not null check (status in ('pending', 'in_progress', 'awaiting_parts', 'finished', 'delivered', 'cancelled')),
  labor_cost numeric(12,2) not null default 0,
  parts_cost numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  mechanic_id uuid references mechanic(id) on delete set null,
  mechanic_name text,
  cancellation_reason text,
  cancellation_authorized_by text,
  audit_trail jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table work_order
  add column if not exists warranty_type text;

alter table work_order
  add column if not exists warranty_notes text;

alter table work_order
  add column if not exists related_order_id uuid references work_order(id);

create table if not exists work_order_part (
  work_order_id uuid not null references work_order(id) on delete cascade,
  part_id uuid not null references part(id),
  code text not null,
  description text not null,
  price numeric(12,2) not null,
  quantity integer not null default 1,
  primary key (work_order_id, part_id)
);

create table if not exists sale (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references client(id) on delete set null,
  client_name text not null,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  discount_reason text,
  discount_authorized_by text,
  total numeric(12,2) not null default 0,
  type text not null check (type in ('direct', 'work_order')),
  work_order_id uuid references work_order(id) on delete set null,
  created_by text,
  audit_trail jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Pagos pendientes de confirmación por Bancard vPOS
create table if not exists pending_payment (
  id uuid primary key default gen_random_uuid(),
  shop_process_id text not null unique,
  sale_data jsonb not null,
  amount numeric(12,2) not null,
  currency text not null default 'PYG',
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','expired')),
  sale_id uuid references sale(id) on delete set null,
  bancard_confirmation_id text,
  created_by text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes')
);

create index if not exists idx_pending_payment_shop_process_id on pending_payment(shop_process_id);
create index if not exists idx_pending_payment_status on pending_payment(status, created_at desc);

create table if not exists sale_item (
  sale_id uuid not null references sale(id) on delete cascade,
  part_id uuid references part(id) on delete set null,
  code text not null,
  description text not null,
  price numeric(12,2) not null,
  quantity integer not null,
  primary key (sale_id, code, description)
);

-- ── Tabla de Leads / Contactos (formulario público del sitio web) ────────────
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
);

create index if not exists idx_lead_created_at on lead(created_at desc);
create index if not exists idx_lead_status on lead(status);
