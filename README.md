# PowerFix — Taller Mecánico Especializado

Proyecto integrador de **Programación III** (Prof. Marcos Arrieta Moreira).  
Servicio web completo para un taller mecánico de reparación de maquinaria a nafta y diesel.

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | HTML5 semántico · CSS BEM · Vanilla JS (ES2022) |
| Estilos | CSS Custom Properties · Regla 60-30-10 · Dark mode |
| Gráficos | Chart.js 4.4.0 (bar, doughnut, line) |
| Backend | FastAPI 0.104 · Python 3.14 |
| Base de datos | SQLite · SQLAlchemy 2.0 (ORM) |
| Autenticación | JWT (python-jose) · pbkdf2_sha256 (passlib) |
| Validación | Pydantic v2 · EmailStr |
| Imágenes | WebP generadas con Pillow |

---

## Estructura del proyecto

```
taller-mecanico-powerfix/
├── backend/
│   ├── auth.py            # JWT, hashing de contraseñas
│   ├── database.py        # Conexión SQLite, sesión SQLAlchemy
│   ├── main.py            # App FastAPI, CORS, rutas raíz
│   ├── models.py          # Tablas: Usuario, Contacto, Servicio, PageView
│   ├── schemas.py         # Esquemas Pydantic v2
│   ├── seed.py            # Población inicial de la base de datos
│   ├── gen_images.py      # Genera imágenes WebP placeholder
│   ├── requirements.txt   # Dependencias Python
│   └── routers/
│       ├── users.py       # /api/users  (login, registro, perfil)
│       ├── contacts.py    # /api/contactos
│       └── products.py    # /api/servicios
└── frontend/
    ├── index.html         # Página principal
    ├── servicios.html     # Catálogo filtrable
    ├── contacto.html      # Formulario de solicitud de turno
    ├── login.html         # Acceso al panel admin
    ├── admin.html         # Dashboard administrativo
    ├── terminos.html      # Términos, privacidad y cookies
    ├── css/
    │   ├── styles.css     # Hoja principal (BEM, variables, responsive)
    │   └── admin.css      # Estilos exclusivos del panel admin
    ├── js/
    │   ├── main.js        # Tema, nav, cookies, analítica global
    │   ├── servicios.js   # Catálogo dinámico + filtros
    │   ├── contacto.js    # Validación y envío del formulario
    │   ├── login.js       # Autenticación JWT
    │   └── admin.js       # Dashboard, Chart.js, tablas, modal
    └── assets/images/     # WebP para hero, OG y 9 categorías
```

---

## Instalación y puesta en marcha

### Requisitos previos

- Python 3.10+ (probado con 3.14)
- `uv` (gestor de paquetes recomendado) o `pip`
- Cualquier servidor HTTP estático (Python incluido)

### 1 · Clonar el repositorio

```bash
git clone https://github.com/RoqueEsteche/taller-mecanico-powerfix.git
cd taller-mecanico-powerfix
```

### 2 · Crear entorno virtual e instalar dependencias

```bash
cd backend

# Con uv (recomendado)
uv venv .venv
uv pip install --python .venv/Scripts/python.exe -r requirements.txt

# Con pip estándar
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/macOS
pip install -r requirements.txt
```

### 3 · Generar imágenes WebP (solo la primera vez)

```bash
# Desde la carpeta backend/
python gen_images.py
```

### 4 · Poblar la base de datos (solo la primera vez)

```bash
# Desde la carpeta backend/
python seed.py
```

Crea 3 usuarios, 9 servicios, 6 contactos de prueba y 7 page views.

### 5 · Iniciar el backend (FastAPI)

```bash
# Desde la carpeta backend/
uvicorn main:app --reload --port 8000
```

API disponible en: `http://localhost:8000`  
Documentación interactiva: `http://localhost:8000/docs`

### 6 · Iniciar el frontend

Abrí una nueva terminal desde la raíz del proyecto:

```bash
cd frontend
python -m http.server 5500
```

Sitio disponible en: `http://localhost:5500`

> **Importante:** el frontend debe servirse desde un servidor HTTP (no `file://`) para que el Fetch API funcione sin restricciones CORS.

---

## Credenciales de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | `admin@powerfix.com` | `Admin2024!` |
| Empleado | `carlos@powerfix.com` | `Empleado2024!` |
| Cliente | `juan@ejemplo.com` | `Cliente2024!` |

> Solo el rol **admin** puede acceder al panel en `/admin.html`.

---

## API — Endpoints principales

### Autenticación

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/users/login` | Login → devuelve JWT + datos de usuario |
| `POST` | `/api/users/register` | Registro de nuevo usuario |
| `GET` | `/api/users/me` | Perfil del usuario autenticado |

### Servicios (catálogo)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/servicios` | No | Listar todos (acepta `?categoria=`) |
| `GET` | `/api/servicios/{id}` | No | Detalle de un servicio |
| `POST` | `/api/servicios` | Admin | Crear servicio |
| `PUT` | `/api/servicios/{id}` | Admin | Editar servicio |
| `DELETE` | `/api/servicios/{id}` | Admin | Eliminar servicio |

### Contactos / Leads

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/contactos` | No | Enviar consulta (formulario público) |
| `GET` | `/api/contactos` | Admin | Listar todos (acepta `?estado=`) |
| `PATCH` | `/api/contactos/{id}/estado` | Admin | Actualizar estado del lead |
| `DELETE` | `/api/contactos/{id}` | Admin | Eliminar contacto |

### Analítica y estadísticas

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/analytics/pageview` | No | Registrar visita a una página |
| `GET` | `/api/stats` | Admin | Totales: contactos, servicios, visitas |
| `GET` | `/api/stats/charts` | Admin | Datos para los 3 gráficos del dashboard |

---

## Funcionalidades implementadas

### Frontend público
- **Inicio** — hero animado, estadísticas, 6 cards de servicio, sección "Cómo funciona", testimonios, CTA
- **Catálogo** — grid dinámico cargado desde la API, filtros por categoría sin recarga de página
- **Contacto** — formulario con validación campo por campo (blur), contador de caracteres, autocompletado por URL param, feedback visual de éxito/error
- **Dark mode** — persistido en `localStorage`, toggle accesible
- **Cookie banner** — consentimiento persistido en `localStorage`, bloqueante para analítica
- **Analítica** — pageview registrado automáticamente en cada página (respeta preferencia de cookies)
- **Responsive** — breakpoints en 1024px, 768px y 480px; menú hamburguesa en móvil
- **Accesibilidad** — roles ARIA, `aria-required`, `aria-live`, `aria-expanded`, `focus-visible`

### Panel administrativo (`/admin.html`)
- **Auth guard** — redirige a login si no hay JWT válido
- **Dashboard** — 6 stat cards + gráfico de barras (consultas por máquina) + doughnut (estados) + línea de visitas
- **Tabla de contactos** — con filtro por estado, actualización de estado inline (PATCH), modal de detalle
- **Tabla de servicios** — catálogo completo con estado activo/inactivo
- **Panel de analítica** — gráfico de línea con visitas por página en los últimos 7 días
- **Sidebar responsive** — colapsa en pantallas < 1024px

---

## Variables de entorno (opcional)

El proyecto funciona con valores por defecto. Si querés personalizar:

```bash
# backend/auth.py — cambiar la clave secreta JWT en producción
SECRET_KEY = "tu-clave-secreta-segura"
```

---

## Notas técnicas

- **CORS**: configurado con `allow_origins=["*"]` para desarrollo local. En producción restringir al dominio del frontend.
- **pbkdf2_sha256**: se usa en lugar de bcrypt por compatibilidad con Python 3.14 (bcrypt tiene un bug con passlib en 3.14+).
- **WebP**: todas las imágenes del catálogo son WebP generadas programáticamente con Pillow.
- **BEM**: toda la hoja de estilos sigue la metodología Block-Element-Modifier, sin `style=""` inline en el HTML estático.
- **Base de datos**: SQLite local (`backend/powerfix.db`), excluida del repositorio. Se regenera con `seed.py`.

---

## Maquinaria atendida

Desmalezadoras · Motosierras · Cortacéspedes a empuje · Tractores cortacésped · Sopladoras · Fumigadoras motorizadas · Generadores eléctricos · Motobombas de agua · Motores estacionarios diesel y nafta

---

## Autor

**Roque Esteche** — Proyecto integrador Programación III  
Universidad / Carrera · 2024
