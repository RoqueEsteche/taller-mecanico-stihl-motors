# Stihl Motors — Sistema de Gestión de Taller + Sitio Web

Sistema web completo para el taller mecánico **Stihl Motors**, que integra una **landing page pública** con formulario de contacto y un **panel de administración** con gestión de órdenes de trabajo, inventario, ventas, clientes y analítica.

---

## Índice

1. [Arquitectura del sistema](#1-arquitectura-del-sistema)
2. [Capa Frontend — Diseño UX/UI y BEM](#2-capa-frontend--diseño-uxui-y-bem)
3. [CSS Variables y Paleta 60-30-10](#3-css-variables-y-paleta-60-30-10)
4. [Interactividad JavaScript Avanzado](#4-interactividad-javascript-avanzado)
5. [Capa Backend — Express.js y Base de Datos](#5-capa-backend--expressjs-y-base-de-datos)
6. [Endpoints del API y Documentación /docs](#6-endpoints-del-api-y-documentación-docs)
7. [Integración y Asincronía](#7-integración-y-asincronía)
8. [Gráficos Dinámicos — Recharts](#8-gráficos-dinámicos--recharts)
9. [Web Storage API](#9-web-storage-api)
10. [Seguridad y CORS](#10-seguridad-y-cors)
11. [Cookie Consent y Aspectos Legales](#11-cookie-consent-y-aspectos-legales)
12. [SEO Orgánico y Open Graph](#12-seo-orgánico-y-open-graph)
13. [Analítica Web](#13-analítica-web)
14. [Flujo End-to-End de la Defensa](#14-flujo-end-to-end-de-la-defensa)
15. [Instalación y ejecución local](#15-instalación-y-ejecución-local)
16. [Despliegue en Render](#16-despliegue-en-render)

---

## 1. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                     NAVEGADOR (Cliente)                         │
│                                                                 │
│  Landing Page (pública)     Panel Admin (autenticado)           │
│  ┌─────────────────────┐   ┌──────────────────────────────┐    │
│  │ Hero + Servicios     │   │ Dashboard / Órdenes / POS    │    │
│  │ Catálogo de Equip.   │   │ Inventario / Reportes        │    │
│  │ Formulario Contacto  │   │ Leads Web + Gráficos         │    │
│  │ Cookie Consent       │   │ Configuración                │    │
│  │ BEM CSS + Variables  │   │ React + TypeScript + Tailwind│    │
│  └──────────┬──────────┘   └──────────────┬───────────────┘    │
└─────────────┼──────────────────────────────┼───────────────────┘
              │  fetch() async/await          │  fetch() + JWT
              ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               BACKEND — Express.js (Node.js)                    │
│                                                                 │
│  POST /api/contact      → Recibe leads del formulario           │
│  GET  /api/leads        → Lista de leads (admin)                │
│  GET  /api/analytics/*  → Datos para gráficos                   │
│  GET  /api/parts        → Catálogo de productos                 │
│  POST /api/auth/login   → Autenticación JWT                     │
│  GET  /docs             → Swagger UI interactivo                │
│  ... +50 endpoints REST                                         │
└─────────────────────────────┬───────────────────────────────────┘
                              │  pg (node-postgres)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BASE DE DATOS — PostgreSQL                      │
│                                                                 │
│  app_user (usuarios + roles)    lead (contactos web)           │
│  part (productos/repuestos)     work_order (órdenes taller)    │
│  client (clientes)              sale (ventas)                  │
│  activity_log (analítica)       ... +10 tablas                 │
└─────────────────────────────────────────────────────────────────┘
```

**Stack Tecnológico:**
| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript + Tailwind CSS v4 |
| CSS público | BEM puro + CSS Custom Properties |
| Backend | Express.js 4 (Node.js) |
| Base de datos | PostgreSQL 15 |
| Gráficos | Recharts 3 |
| Autenticación | JWT (jsonwebtoken) + bcryptjs |
| API Docs | Swagger UI Express + swagger-jsdoc |
| Despliegue | Render.com |

---

## 2. Capa Frontend — Diseño UX/UI y BEM

### Heurísticas de Nielsen aplicadas

| Heurística | Implementación en el proyecto |
|-----------|-------------------------------|
| **No me hagas pensar** | Navegación simple con `<nav>` clara; botón CTA naranja visible inmediatamente |
| **No me hagas leer** | Secciones escaneables con badges, íconos por categoría y títulos en negrita |
| **No me hagas errar** | Dropdown para "Servicio" (evita ortografía libre); calendario deshabilitado para días pasados en OTs; campos con `aria-invalid` |
| **Consistencia** | Sistema de botones `.btn`, `.btn--primary`, `.btn--outline` homogéneo en todo el sitio |
| **Control del usuario** | Cookie banner con Aceptar/Rechazar; modal de T&C con botón "Entendido" |
| **Visibilidad del estado** | Skeleton loaders al cargar productos; feedback inmediato al enviar formulario; `aria-busy` en botón de envío |

### Metodología BEM — archivo `src/styles/landing.css`

BEM (Block\_\_Element--Modifier) organiza los estilos en tres niveles:

```css
/* ── BLOCK: navbar ──────────────────────────────────────────── */
.navbar { ... }                      /* Bloque raíz */
.navbar__inner { ... }               /* Elemento contenedor interno */
.navbar__brand { ... }               /* Elemento: logo + nombre */
.navbar__brand-icon { ... }          /* Elemento: cuadrado naranja con inicial */
.navbar__link { ... }                /* Elemento: enlace de navegación */
.navbar__theme-toggle { ... }        /* Elemento: botón de modo oscuro */

/* ── BLOCK: btn ─────────────────────────────────────────────── */
.btn { ... }                         /* Bloque base */
.btn--primary { ... }                /* Modifier: botón CTA naranja (10% de acento) */
.btn--outline { ... }                /* Modifier: botón con borde */
.btn--lg { ... }                     /* Modifier: tamaño grande */
.btn--disabled { pointer-events:none; opacity:.5; } /* "No me hagas errar" */

/* ── BLOCK: contact-form ────────────────────────────────────── */
.contact-form { ... }
.contact-form__title { ... }
.contact-form__grid { ... }
.contact-form__grid--full { grid-column: 1/-1; }  /* Modifier: columna completa */

/* ── BLOCK: field ───────────────────────────────────────────── */
.field { ... }
.field__label { ... }
.field__label--required::after { content: ' *'; color: var(--clr-accent); }
.field__input { ... }
.field__input--error { border-color: #DC2626; }    /* Modifier: estado de error */
.field__error { color: #DC2626; font-size: 0.75rem; }

/* ── BLOCK: product-card ────────────────────────────────────── */
.product-card { ... }
.product-card__image-wrapper { ... }
.product-card__body { ... }
.product-card__title { ... }
.product-card--skeleton { ... }      /* Modifier: estado de carga */
```

> **Convención estricta:** `.bloque__elemento--modificador`  
> Todos los estilos de la landing page usan exclusivamente BEM sin utilidades de Tailwind.

### Tipografías (Regla de 2 fuentes máximo)

```css
:root {
  --font-heading: 'Oswald', 'Impact', sans-serif;  /* Personalidad — títulos */
  --font-body:    'Inter', 'Segoe UI', sans-serif;  /* Alta legibilidad — textos */
}
```

- **Oswald** → Títulos principales (`.hero__title`, `.section__title`, `.footer__logo`)
- **Inter** → Cuerpo de texto, formularios, tablas del admin

---

## 3. CSS Variables y Paleta 60-30-10

Toda la paleta está **centralizada en `:root`** para garantizar consistencia. El modificador `.dark` en `<html>` activa el tema oscuro.

```css
/* src/styles/landing.css */
:root {
  /* ── Paleta 60-30-10 ──────────────────────────────────────── */
  --clr-bg:           #F8F9FA;   /* 60% dominante  — fondos y espacios */
  --clr-bg-alt:       #FFFFFF;   /* 60% variante   — tarjetas y formularios */
  --clr-text:         #1A1C1E;   /* 30% complementario — textos y estructura */
  --clr-text-muted:   #6B7280;   /* 30% variante   — texto secundario */
  --clr-accent:       #FF6321;   /* 10% acento      — botones CTA y énfasis */
  --clr-accent-dark:  #D94F15;   /* 10% hover       — estado hover del acento */
  --clr-border:       #E5E7EB;

  /* ── Tipografía centralizada ─────────────────────────────── */
  --font-heading: 'Oswald', sans-serif;
  --font-body:    'Inter', sans-serif;

  /* ── Tamaños de fuente ───────────────────────────────────── */
  --fs-xs:   0.75rem;
  --fs-sm:   0.875rem;
  --fs-base: 1rem;
  --fs-lg:   1.125rem;
  --fs-xl:   1.25rem;
  --fs-2xl:  1.5rem;
  --fs-3xl:  1.875rem;
  --fs-hero: clamp(2.5rem, 5vw, 3.75rem);  /* Responsive */

  /* ── Espaciado ───────────────────────────────────────────── */
  --space-sm:  0.5rem;
  --space-md:  1rem;
  --space-lg:  2rem;
  --space-xl:  4rem;
}

/* Dark mode — activado dinámicamente por JS con localStorage */
.dark {
  --clr-bg:         #111318;
  --clr-bg-alt:     #1A1C1E;
  --clr-text:       #F1F3F5;
  --clr-text-muted: #9CA3AF;
  --clr-border:     #2D2F34;
}
```

> Usar `var(--clr-accent)` en lugar de `#FF6321` hardcodeado permite cambiar todo el tema modificando un solo valor.

---

## 4. Interactividad JavaScript Avanzado

### Event Listeners (sin onclick inline)

```tsx
// src/components/LandingPage.tsx

// ✅ Correcto: addEventListener a través del sistema de eventos de React
useEffect(() => {
  const handleScroll = () => {
    const sections = ['servicios', 'productos', 'contacto'];
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top >= 0 && rect.top < window.innerHeight / 2) {
          sessionStorage.setItem('stihl.lastSection', id);
          break;
        }
      }
    }
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll); // cleanup
}, []);

// ✅ Manipulación de CSS: via classList (no estilos inline)
useEffect(() => {
  if (isDark) {
    document.documentElement.classList.add('dark');    // classList.add()
  } else {
    document.documentElement.classList.remove('dark'); // classList.remove()
  }
}, [isDark]);
```

### Validación de formulario con feedback visual

```tsx
// Función de validación pura — retorna un objeto con errores por campo
function validate(f: ContactForm): FieldErrors {
  const errs: FieldErrors = {};

  if (!f.name.trim() || f.name.trim().length < 2) {
    errs.name = 'El nombre es obligatorio (mínimo 2 caracteres).';
  }
  if (!f.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
    errs.email = 'Ingresá un correo electrónico válido.';
  }
  if (f.phone && !/^[\d\s\+\-\(\)]{6,20}$/.test(f.phone.trim())) {
    errs.phone = 'Teléfono inválido.';
  }
  if (!f.message.trim() || f.message.trim().length < 10) {
    errs.message = 'El mensaje debe tener al menos 10 caracteres.';
  }
  return errs;
}

// El feedback visual se logra con la clase CSS .field__input--error
<input
  className={`field__input${errors.name ? ' field__input--error' : ''}`}
  aria-invalid={Boolean(errors.name)}   // accesibilidad ARIA
/>
{errors.name && (
  <span className="field__error" role="alert">{errors.name}</span>
)}
```

### Dropdown cerrado — "No me hagas errar"

```tsx
{/* Selector cerrado para evitar errores ortográficos en la BD */}
<select name="service" className="field__select">
  <option value="">Seleccioná un servicio...</option>
  <option value="Reparación">Reparación de equipo</option>
  <option value="Mantenimiento">Mantenimiento preventivo</option>
  <option value="Repuestos">Compra de repuestos</option>
  <option value="Diagnóstico">Diagnóstico</option>
  <option value="Garantía">Consulta de garantía</option>
  <option value="Otro">Otro</option>
</select>
```

---

## 5. Capa Backend — Express.js y Base de Datos

### Estructura de la base de datos (PostgreSQL)

El MVP incluye **3 tablas obligatorias** + 15 tablas adicionales:

#### Tabla de Usuarios con Roles (`app_user`)

```sql
create table if not exists app_user (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  display_name text not null,
  role         text not null check (role in ('admin', 'receiver', 'mechanic', 'stock_manager')),
  password_hash text not null,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
```

| Rol | Acceso |
|-----|--------|
| `admin` | Acceso total: dashboard, órdenes, inventario, POS, leads, reportes, configuración |
| `receiver` | Órdenes de trabajo, inventario, POS, clientes |
| `stock_manager` | Dashboard, inventario, proveedores |
| `mechanic` | Portal de mecánico (solo sus órdenes), inventario (lectura) |

#### Tabla de Contacto / Leads (`lead`) — **NUEVA**

```sql
create table if not exists lead (
  id       uuid primary key default gen_random_uuid(),
  name     text not null,
  email    text not null,
  phone    text not null default '',
  service  text not null default '',
  message  text not null default '',
  -- Seguimiento comercial:
  status   text not null default 'new'
           check (status in ('new', 'contacted', 'converted', 'discarded')),
  ip       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

#### Tabla de Productos / Repuestos (`part`)

```sql
create table if not exists part (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,        -- Código del repuesto
  description     text not null,               -- Descripción
  machine_category text not null default 'General',
  machine_brand   text not null default '',
  machine_model   text not null default '',
  price           numeric(12,2) not null default 0,
  stock           integer not null default 0,
  min_stock       integer not null default 0,  -- Alerta de stock mínimo
  -- Imágenes: almacenadas localmente, solo se guarda la ruta:
  -- image_path text default '/assets/images/productos/default.webp'
  supplier_id     uuid references supplier(id),
  created_at      timestamptz not null default now()
);
```

### Servidor Express.js (`server/index.js`)

```javascript
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

const app = express();

// Configuración de CORS para seguridad
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origen no permitido: ${origin}`));
    }
  }
}));

app.use(express.json());

// Swagger UI — documentación interactiva en /docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Stihl Motors — API Docs',
  customCss: '.swagger-ui .topbar { background-color: #FF6321; }',
}));
```

---

## 6. Endpoints del API y Documentación `/docs`

Todos los endpoints están documentados con **Swagger UI** en la ruta `/docs`.  
Accedé en desarrollo: `http://localhost:4000/docs`

### Endpoints del MVP (mínimos requeridos)

#### Contacto / Leads

```
POST /api/contact          → Recibe datos del formulario público (sin auth)
GET  /api/leads            → Lista leads recibidos (solo admin)
PUT  /api/leads/:id        → Actualiza estado de un lead (solo admin)
GET  /api/analytics/leads  → Leads por mes para gráfico (solo admin)
GET  /api/analytics/summary → Resumen general: estados, visitantes, browsers
```

#### Ejemplo — `POST /api/contact`

```javascript
app.post('/api/contact', async (req, res) => {
  const { name, email, phone = '', service = '', message = '' } = req.body;

  // Validación del lado del servidor (segunda línea de defensa)
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ message: 'El nombre es obligatorio.' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ message: 'Correo electrónico inválido.' });
  }
  if (!message || message.trim().length < 10) {
    return res.status(400).json({ message: 'El mensaje es muy corto.' });
  }

  // Persistencia en la base de datos
  const result = await query(
    `insert into lead (name, email, phone, service, message, ip)
     values ($1, $2, $3, $4, $5, $6)
     returning id, name, email, created_at`,
    [name.trim(), email.trim().toLowerCase(), phone.trim(),
     service.trim(), message.trim(), getClientIp(req)]
  );

  return res.status(201).json({
    message: '¡Gracias! Tu consulta fue recibida.',
    lead: result.rows[0],
  });
});
```

#### Productos (catálogo público)

```
GET /api/parts             → Lista el catálogo completo de repuestos
```

#### Autenticación / Roles

```
POST /api/auth/login       → Login con email + contraseña → JWT
GET  /api/session          → Valida el token JWT activo
```

### Middleware de autenticación JWT

```javascript
// server/auth.js — protege rutas que requieren autenticación
export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Sin autenticación.' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado.' });
  }
}

// Control de acceso por rol
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Sin permiso para esta acción.' });
    }
    next();
  };
}

// Uso: solo el admin puede listar leads
app.get('/api/leads', requireAuth, requireRole('admin'), async (req, res) => {
  ...
});
```

---

## 7. Integración y Asincronía

### Fetch API con async/await — Formulario de contacto

```tsx
// src/components/LandingPage.tsx

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault(); // Intercepta el submit antes de enviar al servidor

  // 1. Validar en el cliente antes de consumir la red
  const fieldErrors = validate(form);
  if (Object.keys(fieldErrors).length > 0) {
    setErrors(fieldErrors);
    return; // Nunca llega al servidor con datos inválidos
  }

  setSubmitting(true);

  try {
    // 2. Petición asíncrona al backend — no bloquea el hilo principal
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),  // Datos en formato JSON
    });

    const data = await res.json();

    // 3. Procesar respuesta del servidor
    if (res.ok) {
      setSubmitResult({ ok: true, msg: data.message });
      setForm(EMPTY_FORM); // Limpiar formulario
    } else {
      setSubmitResult({ ok: false, msg: data.message });
    }
  } catch {
    // 4. Capturar errores de red con try/catch
    setSubmitResult({ ok: false, msg: 'Error de red. Intentá de nuevo.' });
  } finally {
    setSubmitting(false);
  }
}
```

### Peticiones paralelas en el panel admin

```tsx
// src/components/LeadsModule.tsx

const fetchData = useCallback(async () => {
  try {
    // Promise.all ejecuta las 3 peticiones en paralelo (más eficiente)
    const [leadsData, chartRaw, summaryRaw] = await Promise.all([
      apiRequest<Lead[]>('/api/leads'),
      apiRequest<LeadMonthData[]>('/api/analytics/leads'),
      apiRequest<AnalyticsSummary>('/api/analytics/summary'),
    ]);
    setLeads(leadsData);
    setChartData(chartRaw);
    setSummary(summaryRaw);
  } catch {
    setLeads([]);
  }
}, [filterStatus]);
```

### Cliente HTTP centralizado (`src/lib/session.ts`)

```typescript
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getSessionToken(); // Lee el JWT del localStorage

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      // Envía el token JWT en el header Authorization
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.message || response.statusText);
  }

  return response.json() as Promise<T>;
}
```

---

## 8. Gráficos Dinámicos — Recharts

El **panel de Leads** (`src/components/LeadsModule.tsx`) consume el endpoint `/api/analytics/leads` y renderiza gráficos dinámicos con la librería **Recharts**.

### Gráfico de Barras — Leads por mes

```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Datos provenientes de la API:
// [{ month: "Ene 2026", count: 5 }, { month: "Feb 2026", count: 8 }, ...]

<ResponsiveContainer width="100%" height={220}>
  <BarChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
    <Tooltip formatter={(val) => [val, 'Leads']} />
    {/* Barras naranjas con bordes redondeados — color de acento del branding */}
    <Bar dataKey="count" fill="#FF6321" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

### Gráfico de Torta — Leads por estado

```tsx
import { PieChart, Pie, Cell, Legend } from 'recharts';

const PIE_COLORS = ['#FF6321', '#3B82F6', '#10B981', '#6B7280'];

<ResponsiveContainer width="100%" height={220}>
  <PieChart>
    <Pie
      data={pieData}
      innerRadius={50}
      outerRadius={80}
      dataKey="value"
    >
      {pieData.map((_, index) => (
        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
      ))}
    </Pie>
    <Legend iconSize={10} />
    <Tooltip />
  </PieChart>
</ResponsiveContainer>
```

### Endpoint que alimenta los gráficos

```javascript
// server/index.js
app.get('/api/analytics/leads', requireAuth, requireRole('admin'), async (req, res) => {
  const result = await query(`
    select
      to_char(date_trunc('month', created_at), 'Mon YYYY') as month,
      count(*)::int as count
    from lead
    where created_at >= now() - interval '6 months'
    group by date_trunc('month', created_at)
    order by date_trunc('month', created_at) asc
  `);
  return res.json(result.rows);
});
```

---

## 9. Web Storage API

### localStorage — Persiste entre sesiones del navegador

```typescript
// src/lib/session.ts — Sesión del usuario (JWT)
window.localStorage.setItem('stihl.session.token', token);
window.localStorage.setItem('stihl.session.user', JSON.stringify(user));

// src/components/LandingPage.tsx — Preferencia de tema oscuro/claro
localStorage.setItem('stihl.theme', isDark ? 'dark' : 'light');

// Leer al inicializar:
const [isDark] = useState(() => localStorage.getItem('stihl.theme') === 'dark');

// src/components/LandingPage.tsx — Aceptación de cookies
localStorage.setItem('stihl.cookies', 'accepted');
const [cookieAccepted] = useState(() => Boolean(localStorage.getItem('stihl.cookies')));

// Activar modo oscuro modificando classList del <html>
useEffect(() => {
  document.documentElement.classList[isDark ? 'add' : 'remove']('dark');
  localStorage.setItem('stihl.theme', isDark ? 'dark' : 'light');
}, [isDark]);
```

### sessionStorage — Datos volátiles de la sesión

```typescript
// src/components/LandingPage.tsx — Última sección visitada (se pierde al cerrar tab)
sessionStorage.setItem('stihl.lastSection', 'contacto');

// Último envío de formulario en esta sesión
sessionStorage.setItem('stihl.lastContact', new Date().toISOString());

// src/App.tsx — Tab activa del panel admin
localStorage.setItem('activeTab', tab); // localStorage porque persiste entre sesiones
```

---

## 10. Seguridad y CORS

```javascript
// server/index.js — Configuración CORS
const allowedOrigins = new Set([
  'https://stihl-motors.onrender.com', // Producción
  'http://localhost:3000',              // Desarrollo frontend
  'http://localhost',                   // App Capacitor
  'capacitor://localhost',              // App Android nativa
]);

app.use(cors({
  origin: (origin, callback) => {
    // Sin origin = petición desde el mismo servidor (OK)
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origen no permitido por CORS: ${origin}`));
    }
  },
  credentials: false,
}));
```

### Seguridad de contraseñas

```javascript
// server/auth.js
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Hash de contraseña al crear usuario (nunca se guarda en texto plano)
export const hashPassword = (pwd) => bcryptjs.hash(pwd, 12);

// Verificación al login
export const comparePassword = (pwd, hash) => bcryptjs.compare(pwd, hash);

// Creación del JWT con expiración de 8 horas
export const createToken = (user) => jwt.sign(
  { sub: user.id, email: user.email, role: user.role, displayName: user.display_name },
  process.env.JWT_SECRET,
  { expiresIn: '8h' }
);
```

---

## 11. Cookie Consent y Aspectos Legales

El banner de cookies y el modal de Términos y Condiciones están implementados en `src/components/LandingPage.tsx`.

### Cookie Banner

```tsx
{/* Banner visible hasta que el usuario elige */}
<div className={`cookie-banner${cookieAccepted ? ' cookie-banner--hidden' : ''}`}
     role="dialog" aria-live="polite">
  <div className="cookie-banner__inner">
    <p className="cookie-banner__text">
      🍪 Usamos cookies para mejorar tu experiencia...
    </p>
    <div className="cookie-banner__actions">
      <button className="btn btn--outline" onClick={rejectCookies}>Rechazar</button>
      <button className="btn btn--primary" onClick={acceptCookies}>Aceptar todo</button>
    </div>
  </div>
</div>

function acceptCookies() {
  localStorage.setItem('stihl.cookies', 'accepted'); // Persiste decisión
  setCookieAccepted(true);                           // Oculta el banner
}

function rejectCookies() {
  localStorage.setItem('stihl.cookies', 'rejected');
  setCookieAccepted(true);
}
```

El ocultamiento se logra **solo con CSS** (sin `display: none` desde JS):

```css
/* landing.css */
.cookie-banner { transform: translateY(0); transition: transform 0.3s ease; }
.cookie-banner--hidden { transform: translateY(110%); }  /* Sale por abajo */
```

### Modal de Términos y Condiciones

```tsx
{/* Modal accesible con ARIA */}
<div className={`modal${showTerms ? '' : ' modal--hidden'}`}
     role="dialog" aria-modal="true" aria-labelledby="terms-title">
  <div className="modal__box">
    <div className="modal__header">
      <h2 id="terms-title" className="modal__title">Términos y Condiciones</h2>
      <button className="modal__close" onClick={() => setShowTerms(false)}>✕</button>
    </div>
    <div className="modal__body">
      {/* Contenido de T&C... */}
    </div>
  </div>
</div>
```

---

## 12. SEO Orgánico y Open Graph

```html
<!-- index.html -->

<!-- SEO Orgánico -->
<title>Stihl Motors | Servicio Técnico Especializado en Maquinaria de Potencia</title>
<meta name="description" content="Servicio técnico autorizado para STIHL, Husqvarna, Kärcher..."/>
<meta name="keywords"    content="Stihl Motors, reparación motosierras, repuestos Husqvarna..."/>
<link rel="canonical"    href="https://stihl-motors.onrender.com/" />

<!-- Open Graph — previsualización en WhatsApp/LinkedIn/Facebook -->
<meta property="og:title"       content="Stihl Motors | Servicio Técnico"/>
<meta property="og:description" content="Servicio técnico autorizado para STIHL..."/>
<meta property="og:image"       content="https://stihl-motors.onrender.com/og-image.png"/>
<meta property="og:type"        content="website"/>
<meta property="og:locale"      content="es_PY"/>

<!-- JSON-LD Schema.org para motores de búsqueda -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "AutoRepair",
  "name": "Stihl Motors",
  "description": "Servicio técnico especializado..."
}
</script>
```

### HTML Semántico en la Landing Page

```tsx
// src/components/LandingPage.tsx
<header className="navbar" role="banner">        {/* <header> para el nav */}
<main role="main">                               {/* <main> para el contenido */}
  <section id="inicio" className="hero">         {/* <section> con id para anclas */}
    <h1 className="hero__title">...</h1>
  </section>
  <section id="servicios">
    <header className="section__header">
      <h2 className="section__title">Nuestros Servicios</h2>
    </header>
    <div className="services-grid" role="list">
      <article className="service-card" role="listitem">  {/* <article> */}
```

---

## 13. Analítica Web

### Google Analytics (script en `index.html`)

```html
<!-- Medición del comportamiento de usuarios en producción -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX', { anonymize_ip: true });
</script>
```

### Analítica propia — `activity_log` en PostgreSQL

El backend registra automáticamente todas las peticiones en la tabla `activity_log`:

```javascript
// server/index.js — middleware que se ejecuta en cada request
app.use((req, res, next) => {
  res.on('finish', () => {
    const item = buildActivityRecord(req, res.statusCode);
    void persistActivity(item); // Registro asíncrono (no bloquea)
  });
  next();
});
```

Cada registro incluye: método HTTP, ruta, IP, browser, OS, dispositivo y usuario autenticado.

### Endpoint de resumen analítico

```javascript
// GET /api/analytics/summary — datos para el panel admin
app.get('/api/analytics/summary', requireAuth, requireRole('admin'), async (req, res) => {
  const [leadsResult, visitorsResult, browserResult] = await Promise.all([
    query(`select status, count(*) from lead group by status`),
    query(`select count(distinct ip) as unique_visitors from activity_log
           where created_at >= now() - interval '30 days'`),
    query(`select browser, count(*) from activity_log
           where created_at >= now() - interval '30 days'
           group by browser order by count desc limit 5`),
  ]);

  return res.json({
    leads:    leadsResult.rows,
    visitors: visitorsResult.rows[0],
    browsers: browserResult.rows,
  });
});
```

---

## 14. Flujo End-to-End de la Defensa

Este es el flujo completo que se deberá demostrar en vivo:

### Paso 1 — Usuario visita el sitio web público

```
Abrir: https://stihl-motors.onrender.com/
→ LandingPage renderiza con BEM CSS y CSS Variables
→ Cookie banner aparece (localStorage: 'stihl.cookies' no existe)
→ Catálogo se carga dinámicamente: GET /api/parts → products.slice(0,9)
```

### Paso 2 — Interacción con la landing

```
→ Click en "🌙" → classList.add('dark') en <html>
  localStorage.setItem('stihl.theme', 'dark')  ← Web Storage
→ Scroll a secciones → sessionStorage.setItem('stihl.lastSection', ...)
→ Aceptar cookies → localStorage.setItem('stihl.cookies', 'accepted')
  Banner se oculta con clase CSS .cookie-banner--hidden
```

### Paso 3 — Completar formulario de contacto

```
→ Ingresar datos incompletos → Validación JS muestra .field__input--error
→ Completar correctamente → handleSubmit intercepta el evento
→ fetch('POST /api/contact', { body: JSON.stringify(form) })
→ Backend valida, inserta en tabla `lead`, devuelve 201
→ Alert verde: "¡Gracias! Tu consulta fue recibida."
```

### Paso 4 — Acceder al panel administrativo

```
→ Click "Panel Admin" → setShowAdminLogin(true) → Login aparece
→ Login con admin@stihl.com / contraseña
→ POST /api/auth/login → JWT devuelto
→ localStorage.setItem('stihl.session.token', jwt)
→ Panel admin carga con rol 'admin'
```

### Paso 5 — Ver el lead en el panel admin

```
→ Click en "Leads Web" en el sidebar
→ Promise.all([
    GET /api/leads,
    GET /api/analytics/leads,
    GET /api/analytics/summary
  ])
→ Tabla muestra el lead del formulario
→ Gráfico de barras (Recharts) muestra leads por mes
→ Gráfico de torta muestra distribución por estado
→ Cambiar estado del lead: PUT /api/leads/:id { status: 'contacted' }
```

---

## 15. Instalación y Ejecución Local

### Requisitos previos

- Node.js 18+
- PostgreSQL 14+ corriendo localmente

### Setup

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/stihl-motors.git
cd stihl-motors

# 2. Instalar dependencias
npm install

# 3. Crear archivo .env
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stihl_motors
JWT_SECRET=mi-secreto-super-seguro-para-desarrollo
NODE_ENV=development
API_PORT=4000
EOF

# 4. Crear la base de datos y ejecutar el schema
psql -U postgres -c "CREATE DATABASE stihl_motors;"
psql -U postgres -d stihl_motors -f postgres/schema.sql

# 5. Crear usuario admin inicial
node server/seed-admin.js

# 6. Iniciar backend (puerto 4000)
npm run dev:api

# 7. En otra terminal: iniciar frontend (puerto 3000)
npm run dev
```

### Credenciales de prueba

| Email | Contraseña | Rol |
|-------|-----------|-----|
| `admin@stihl.com` | `Admin1234!` | Administrador |
| `recepcion@stihl.com` | `Recep1234!` | Recepcionista |
| `mecanico@stihl.com` | `Meca1234!` | Mecánico |
| `stock@stihl.com` | `Stock1234!` | Jefe de Stock |

### URLs de desarrollo

| Recurso | URL |
|---------|-----|
| Landing Page | http://localhost:3000 |
| Panel Admin | http://localhost:3000 (click "Panel Admin" → login) |
| API Docs | http://localhost:4000/docs |
| Seguimiento público | http://localhost:3000/seguimiento |
| Health check | http://localhost:4000/api/health |

---

## 16. Despliegue en Render

El proyecto está configurado para desplegarse automáticamente en [Render.com](https://render.com) via `render.yaml`.

### render.yaml (infraestructura como código)

```yaml
databases:
  - name: stihl-motors-db        # PostgreSQL gestionado por Render
    databaseName: stihl_motors
    user: stihl_motors_user

services:
  - type: web
    name: stihl-motors-app
    runtime: node
    plan: starter
    autoDeploy: true
    buildCommand: npm install --include=dev && npm run build
    startCommand: npm run start   # node server/index.js (sirve el dist/)
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: CORS_ORIGIN
        value: https://stihl-motors.onrender.com
      - key: JWT_SECRET
        generateValue: true       # Render genera un valor seguro automáticamente
      - key: DATABASE_URL
        fromDatabase:
          name: stihl-motors-db   # Se conecta a la BD de Render
          property: connectionString
      - key: PGSSL
        value: true               # SSL requerido en producción
```

### Pasos para el despliegue

1. Subir el código a GitHub
2. Conectar el repositorio en [render.com/dashboard](https://render.com/dashboard)
3. Render detecta automáticamente el `render.yaml`
4. El pipeline ejecuta: `npm install && npm run build` → `npm run start`
5. Variables de entorno se configuran automáticamente desde `render.yaml`
6. El admin inicial se crea ejecutando una vez: `node server/seed-admin.js`

### Cómo funciona en producción

```
Usuario → https://stihl-motors.onrender.com
            ↓
     Express sirve dist/index.html (React SPA)
            ↓
     React router maneja /seguimiento
     y la SPA maneja el resto
            ↓
     fetch('/api/*') → Express API → PostgreSQL
```

---

## Estructura de archivos

```
stihl-motors/
├── server/
│   ├── index.js          ← API completa Express (2200+ líneas)
│   ├── auth.js           ← JWT + bcryptjs
│   ├── db.js             ← Pool de conexiones PostgreSQL
│   └── seed-admin.js     ← Inicialización de usuarios de prueba
├── src/
│   ├── components/
│   │   ├── LandingPage.tsx    ← ★ Landing pública (BEM, formulario, cookies)
│   │   ├── LeadsModule.tsx    ← ★ Panel admin de leads con gráficos
│   │   ├── DashboardModule.tsx
│   │   ├── WorkOrdersModule.tsx
│   │   ├── InventoryModule.tsx
│   │   ├── POSModule.tsx
│   │   ├── ClientsModule.tsx
│   │   ├── ReportsModule.tsx
│   │   ├── Login.tsx
│   │   └── SeguimientoPage.tsx
│   ├── styles/
│   │   └── landing.css    ← ★ CSS BEM puro con CSS Variables (:root)
│   ├── lib/
│   │   ├── session.ts     ← JWT + Fetch API centralizado
│   │   ├── icons.tsx      ← Íconos SVG
│   │   ├── toast.tsx
│   │   └── utils.ts
│   ├── App.tsx            ← Routing: Landing → Login → Admin Panel
│   ├── main.tsx
│   ├── types.ts
│   └── index.css          ← Tailwind CSS + CSS Variables del admin
├── postgres/
│   └── schema.sql         ← ★ DDL completo (18 tablas, indexes, seed data)
├── index.html             ← ★ SEO: meta tags, Open Graph, GA, JSON-LD
├── render.yaml            ← Infraestructura como código para Render.com
├── vite.config.ts
├── package.json
└── README.md              ← ★ Este archivo
```

---

*Proyecto integrador — Sistema de Gestión de Taller + Sitio Web Público*
