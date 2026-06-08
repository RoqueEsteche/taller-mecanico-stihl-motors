# Guía de Presentación — Stihl Motors
## Proyecto Integrador — Defensa Final

> **Cómo usar esta guía:**  
> Cada sección tiene un bloque **"Qué decir"** (el discurso para el expositor) y un bloque **"Dónde mostrar"** (el archivo exacto y la línea de código a abrir en pantalla).  
> El orden de esta guía sigue el flujo real de la demostración en vivo.

---

## ANTES DE EMPEZAR — Checklist de la defensa

Verificar antes de subir al frente:

- [ ] El sitio está en vivo: `https://stihl-motors.netlify.app` (o Render)
- [ ] El servidor de la BD está activo (Neon / Render PostgreSQL)
- [ ] Pantalla con `src/styles/landing.css` abierto para mostrar BEM
- [ ] Pantalla con `index.html` abierto para mostrar SEO
- [ ] Pestaña abierta en `/docs` para mostrar Swagger
- [ ] Panel admin accesible con credenciales a mano
- [ ] Formulario de contacto listo para completar en vivo

---

## MÓDULO 1 — CAPA FRONTEND: DISEÑO, UX/UI Y CONTENIDO

---

### 1A · Experiencia de Usuario (UX) y Heurísticas

---

#### Heurística 1 — "No me hagas pensar"

**Qué decir:**
> "La primera heurística de Steve Krug dice que un sitio debe ser *obvio* al primer golpe de vista. Cuando el usuario entra a Stihl Motors, sin leer nada entiende: es un taller mecánico, tiene servicios de reparación y puede pedir un presupuesto. Esto se logra con tres decisiones de diseño: el título hero directo, el botón naranja que salta a la vista, y la barra de estadísticas que valida la empresa en 2 segundos."

**Dónde mostrar:**  
Abrir el sitio en el navegador. Hacer scroll hasta la sección hero y señalar:
- El badge naranja "Servicio Técnico Autorizado"
- El `<h1>` con la propuesta de valor
- El botón CTA naranja "Pedir presupuesto"
- La stats bar con "+15 años", "234 modelos", etc.

```
Archivo: src/components/LandingPage.tsx  — sección HERO (~línea 150)

<span className="hero__badge">Servicio Técnico Autorizado</span>
<h1 className="hero__title">
  Expertos en Maquinaria de Potencia
</h1>
<p className="hero__description">
  Más de 15 años brindando servicio técnico...
</p>
<button className="btn btn--primary btn--lg">Pedir presupuesto</button>
```

---

#### Heurística 2 — "No me hagas leer"

**Qué decir:**
> "Los usuarios no leen, *escanean*. Por eso cada sección de la landing tiene un badge de categoría en naranja, un título corto y bullets visuales con íconos. La sección de servicios usa un emoji por tarjeta como anclaje visual. En el formulario, los labels son cortos y hay un placeholder que da el ejemplo exacto del formato esperado."

**Dónde mostrar:**  
Scrollear a la sección de servicios y señalar:
- Badges naranjos `<span className="section__label">`
- Íconos emoji en cada `.service-card__icon`
- Placeholders en los campos del formulario

```
Archivo: src/styles/landing.css — BLOCK: service-card

.service-card__icon { font-size: 2rem; margin-bottom: var(--space-md); }
.service-card__title { font-family: var(--font-heading); font-size: var(--fs-xl); }
.service-card__description { font-size: var(--fs-sm); color: var(--clr-text-muted); }
```

---

#### Heurística 3 — "No me hagas errar"

**Qué decir:**
> "Esta heurística es la más técnica: el diseño debe *prevenir* errores antes de que ocurran. Aplicamos tres mecanismos concretos. Primero, el campo 'Servicio' es un dropdown cerrado: el usuario no puede escribir 'reparacoin' con falta de ortografía porque solo puede elegir opciones predefinidas. Segundo, los campos obligatorios tienen validación JavaScript que muestra un borde rojo *antes* de llegar al servidor. Tercero, el botón de envío se deshabilita mientras el formulario está procesando para evitar doble submit."

**Dónde mostrar:**  
1. En el sitio, intentar enviar el formulario vacío → mostrar los bordes rojos
2. Mostrar el `<select>` con opciones fijas
3. Mostrar en el código el modifier `--error` y `--disabled`

```
Archivo: src/styles/landing.css — BEM Modifier de error

/* "No me hagas errar" — feedback visual de error */
.field__input--error {
  border-color: #DC2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.btn--disabled,
.btn:disabled {
  opacity: 0.5;
  pointer-events: none;  ← No se puede hacer click accidentalmente
}
```

```
Archivo: src/components/LandingPage.tsx — dropdown cerrado (~línea 285)

{/* Selector cerrado: el usuario elige de una lista, no escribe */}
<select name="service" className="field__select">
  <option value="">Seleccioná un servicio...</option>
  <option value="Reparación">Reparación de equipo</option>
  <option value="Mantenimiento">Mantenimiento preventivo</option>
  <option value="Repuestos">Compra de repuestos</option>
</select>
```

---

#### Heurística 4 — Visibilidad del estado del sistema

**Qué decir:**
> "El usuario siempre sabe qué está pasando. Mientras los productos cargan desde la API, se muestran skeleton loaders animados, no una pantalla en blanco. Cuando se envía el formulario, el botón cambia a '⏳ Enviando...' y queda deshabilitado. Cuando la respuesta llega, aparece una alerta verde o roja con el mensaje del servidor. Esto es la heurística de *visibilidad del estado del sistema*."

**Dónde mostrar:**  
En el sitio, enviar el formulario correctamente y mostrar la alerta verde.

```
Archivo: src/components/LandingPage.tsx

{/* Estado: cargando productos */}
{loadingProducts
  ? Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="product-card product-card--skeleton" />
    ))
  : products.map(p => <article key={p.id} className="product-card">...</article>)
}

{/* Estado: enviando formulario */}
<button
  type="submit"
  className={`btn btn--primary${submitting ? ' btn--disabled' : ''}`}
  disabled={submitting}
  aria-busy={submitting}
>
  {submitting ? '⏳ Enviando...' : '📩 Enviar consulta'}
</button>

{/* Estado: resultado */}
{submitResult && (
  <div className={`alert ${submitResult.ok ? 'alert--success' : 'alert--error'}`}
       role="status" aria-live="polite">
    {submitResult.msg}
  </div>
)}
```

```
Archivo: src/styles/landing.css — skeleton loader animado

.product-card--skeleton .product-card__image-wrapper {
  background: linear-gradient(90deg, #e5e7eb 25%, #f9fafb 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

### 1B · Interfaz de Usuario (UI) e Identidad de Marca

---

#### Consistencia Visual y Branding

**Qué decir:**
> "La consistencia visual significa que todos los componentes hablan el mismo idioma. En Stihl Motors definimos un sistema de botones con la clase `.btn` como base y modificadores para cada variante. El mismo botón naranja que se usa en la landing como CTA principal es el mismo componente que se usa en el panel de admin. Los bordes redondeados, las sombras y los íconos siguen un estilo uniforme en todo el sitio. Los íconos son todos SVG de trazo fino y mismo grosor de línea, creados con la función `createIcon()` en `icons.tsx`."

**Dónde mostrar:**  
Abrir `src/styles/landing.css` y `src/lib/icons.tsx`

```
Archivo: src/styles/landing.css — BLOCK: btn (sistema de botones consistente)

.btn {                           /* Base: mismo padding, radius, font */
  display: inline-flex;
  padding: 12px 24px;
  border-radius: var(--radius-sm);
  font-weight: 700;
  transition: all var(--transition);
}

.btn--primary {                  /* Modifier: CTA naranja — 10% de acento */
  background: var(--clr-accent);
  color: white;
}

.btn--outline {                  /* Modifier: secundario con borde */
  border: 2px solid rgba(255,255,255,0.4);
}
```

```
Archivo: src/lib/icons.tsx — iconografía homogénea con mismo grosor (strokeWidth: 2)

function createIcon(path) {
  return function Icon({ className, ...props }) {
    return (
      <svg
        strokeWidth="2"          ← Mismo grosor en TODOS los íconos
        strokeLinecap="round"    ← Mismo estilo de extremos
        strokeLinejoin="round"
        fill="none"
        stroke="currentColor"   ← Color heredado del padre (consistencia)
        ...
      >
        {path}
      </svg>
    );
  };
}
```

---

#### Regla de Color 60-30-10

**Qué decir:**
> "La regla 60-30-10 es la norma de diseño que evita que una paleta de colores se vea caótica. Funciona así: el 60% es el color dominante para los fondos, que en nuestro caso es el gris claro casi blanco. El 30% es el color complementario para texto y estructuras, que es el carbón oscuro que usamos en los títulos. Y el 10% es el color de acento, que es el naranja STIHL `#FF6321`, y se usa *exclusivamente* en los botones de acción y los elementos que queremos que el usuario presione. Todo esto vive en variables CSS en `:root` para que si el cliente nos pide cambiar el naranja a azul, lo cambiamos en un solo lugar y se actualiza todo el sitio."

**Dónde mostrar:**  
Abrir `src/styles/landing.css` sección `:root`

```
Archivo: src/styles/landing.css — Paleta 60-30-10 en CSS Variables

:root {
  /* ── 60% — Color dominante (fondos y espacios) ── */
  --clr-bg:       #F8F9FA;    ← Toda la página usa este como fondo
  --clr-bg-alt:   #FFFFFF;    ← Tarjetas y formularios

  /* ── 30% — Color complementario (textos y estructura) ── */
  --clr-text:       #1A1C1E;  ← Todos los títulos y textos principales
  --clr-text-muted: #6B7280;  ← Textos secundarios y descripciones

  /* ── 10% — Color de acento (SOLO para CTAs y énfasis) ── */
  --clr-accent:      #FF6321; ← Botones de acción, badges, links activos
  --clr-accent-dark: #D94F15; ← Estado hover del botón principal
}
```

Señalar en el sitio con el inspector del navegador los tres niveles de color.

---

#### Tipografía con Dos Fuentes

**Qué decir:**
> "Usamos exactamente dos tipografías, que es el máximo recomendado. Oswald es una fuente de display con personalidad fuerte, perfecta para títulos y headings donde queremos impacto visual. Inter es una fuente de alta legibilidad diseñada específicamente para pantallas, que usamos en todo el texto de cuerpo, formularios y tablas. Ambas se cargan desde Google Fonts en el `<head>` del HTML."

```
Archivo: src/styles/landing.css — Variables de tipografía

:root {
  --font-heading: 'Oswald', 'Impact', sans-serif;   /* Personalidad — títulos */
  --font-body:    'Inter', 'Segoe UI', sans-serif;   /* Legibilidad — cuerpo */

  /* Escala de tamaños centralizada */
  --fs-hero: clamp(2.5rem, 5vw, 3.75rem);  ← Responsive sin media queries
  --fs-3xl:  1.875rem;
  --fs-xl:   1.25rem;
  --fs-base: 1rem;
  --fs-sm:   0.875rem;
}
```

```
Archivo: index.html — carga de Google Fonts

<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
```

---

### 1C · Arquitectura de Código Frontend, SEO y Copywriting

---

#### Metodología BEM

**Qué decir:**
> "BEM es una convención de nombrado para CSS que significa Block, Element, Modifier. Un *Bloque* es un componente independiente como `.navbar` o `.product-card`. Un *Elemento* es una parte interna del bloque, separado con dos guiones bajos: `.navbar__brand`, `.product-card__title`. Un *Modifier* es una variación del bloque o elemento, separado con dos guiones: `.btn--primary`, `.field__input--error`, `.product-card--skeleton`. Esta convención hace el CSS predecible y escalable: si otro desarrollador ve `.contact-form__grid--full`, sabe exactamente que es un elemento `grid` dentro del bloque `contact-form` con un modifier que lo hace `full`."

**Dónde mostrar:**  
Abrir `src/styles/landing.css` y señalar tres ejemplos en vivo

```
Archivo: src/styles/landing.css — Estructura BEM completa

/* ══ BLOCK ════════════════════════════════════ */
.navbar { ... }               ← Componente raíz independiente

/* ══ ELEMENTS (partes del block) ═════════════ */
.navbar__inner { ... }        ← Contenedor del bloque
.navbar__brand { ... }        ← Logo + nombre
.navbar__brand-icon { ... }   ← Cuadrado naranja con inicial
.navbar__link { ... }         ← Links de navegación
.navbar__theme-toggle { ... } ← Botón de modo oscuro

/* ══ MODIFIERS (variaciones) ═════════════════ */
.btn--primary { ... }         ← Variante naranja del botón
.btn--outline { ... }         ← Variante con borde
.btn--lg { ... }              ← Variante tamaño grande
.btn--disabled { ... }        ← Variante deshabilitada

.field__input--error { ... }  ← Input en estado de error
.cookie-banner--hidden { ... }← Banner de cookies ocultado
.product-card--skeleton { ... }← Tarjeta en estado de carga
```

---

#### CSS Custom Properties (Variables)

**Qué decir:**
> "Las CSS Variables o Custom Properties permiten centralizar todos los valores de diseño en un solo lugar: el `:root`. Si el cliente nos dice mañana que quiere cambiar el naranja por azul marino, cambiamos una sola línea y todo el sitio se actualiza. También tenemos variables para el espaciado, los bordes redondeados y las sombras, que garantizan que todas las tarjetas tengan el mismo shadow y todos los inputs el mismo radio. Y para el modo oscuro, solo redefinimos las variables de color dentro de la clase `.dark` en el `<html>`."

```
Archivo: src/styles/landing.css — :root completo

:root {
  /* Colores */                        /* Tipografías */
  --clr-bg: #F8F9FA;                   --font-heading: 'Oswald', sans-serif;
  --clr-text: #1A1C1E;                 --font-body: 'Inter', sans-serif;
  --clr-accent: #FF6321;
                                       /* Tamaños de fuente */
  /* Espaciado */                      --fs-hero: clamp(2.5rem, 5vw, 3.75rem);
  --space-sm: 0.5rem;                  --fs-xl: 1.25rem;
  --space-md: 1rem;                    --fs-base: 1rem;
  --space-lg: 2rem;                    --fs-sm: 0.875rem;
  --space-xl: 4rem;
                                       /* Bordes y sombras */
  --radius-sm: 0.375rem;
  --radius-md: 0.75rem;
  --shadow-md: 0 4px 16px rgba(0,0,0,.10);
}

/* Dark mode: solo se redefinen las variables de color */
.dark {
  --clr-bg:         #111318;    ← Fondo oscuro
  --clr-bg-alt:     #1A1C1E;    ← Fondo alternativo oscuro
  --clr-text:       #F1F3F5;    ← Texto claro
  --clr-text-muted: #9CA3AF;    ← Texto secundario claro
}
```

---

#### SEO Orgánico — HTML Semántico y Meta Tags

**Qué decir:**
> "SEO significa Search Engine Optimization: que Google pueda entender y posicionar nuestro sitio. Hay dos niveles. Primero, el `index.html` tiene todas las meta tags necesarias: el `<title>` descriptivo con palabras clave, la `<meta description>` que aparece en los resultados de Google, las etiquetas Open Graph que controlan cómo se ve el link cuando lo compartís por WhatsApp o LinkedIn, y el script de JSON-LD que le dice a Google que somos un taller mecánico. Segundo, el HTML usa etiquetas semánticas: `<header>` para el nav, `<main>` para el contenido, `<section>` para cada bloque, `<article>` para cada tarjeta."

**Dónde mostrar:**  
Abrir `index.html` en el editor

```
Archivo: index.html — Meta tags SEO completos

<title>Stihl Motors | Servicio Técnico Especializado en Maquinaria de Potencia</title>

<!-- SEO Orgánico: aparece en resultados de Google -->
<meta name="description" content="Servicio técnico autorizado para STIHL, Husqvarna, Kärcher..." />
<meta name="keywords"    content="Stihl Motors, reparación motosierras, repuestos Paraguay" />
<link rel="canonical"    href="https://stihl-motors.netlify.app/" />

<!-- Open Graph: controla la vista previa en WhatsApp/LinkedIn -->
<meta property="og:title"       content="Stihl Motors | Servicio Técnico" />
<meta property="og:description" content="Servicio técnico autorizado para STIHL..." />
<meta property="og:image"       content="https://stihl-motors.netlify.app/og-image.png" />
<meta property="og:type"        content="website" />

<!-- JSON-LD: le dice a Google exactamente qué tipo de negocio somos -->
<script type="application/ld+json">
{
  "@type": "AutoRepair",
  "name": "Stihl Motors",
  "description": "Servicio técnico especializado..."
}
</script>
```

```
Archivo: src/components/LandingPage.tsx — HTML Semántico

<header className="navbar" role="banner">     ← <header> del documento
  <nav aria-label="Navegación principal">      ← <nav> accesible
    <a href="#servicios">Servicios</a>
  </nav>
</header>

<main role="main">                             ← <main> único en la página
  <section id="inicio" className="hero">       ← <section> con id para anclas
    <h1>Expertos en Maquinaria de Potencia</h1>
  </section>

  <section id="servicios">
    <header className="section__header">       ← <header> dentro de section
      <h2>Nuestros Servicios</h2>
    </header>
    <div role="list">
      <article className="service-card">       ← <article> para cada item
```

---

## MÓDULO 2 — CAPA INTERACTIVIDAD: JAVASCRIPT AVANZADO

---

### Event Listeners (sin onclick inline)

**Qué decir:**
> "Una mala práctica muy común es usar `onclick` directamente en el HTML: `<button onclick='enviar()'>`. Esto mezcla la estructura HTML con la lógica JavaScript, hace el código imposible de mantener y genera vulnerabilidades de seguridad. La forma correcta es registrar los eventos desde JavaScript, con `addEventListener` o el equivalente en React con la prop `onClick`. En nuestro proyecto, ningún elemento HTML tiene `onclick` inline. Todo el comportamiento de la página se registra desde el componente TypeScript."

```
Archivo: src/components/LandingPage.tsx

❌ Forma incorrecta (NO usada en el proyecto):
<button onclick="handleSubmit()">Enviar</button>

✅ Forma correcta (addEventListener via React):
<button onClick={handleSubmit}>Enviar</button>

✅ Scroll listener dinámico:
useEffect(() => {
  const handleScroll = () => {
    // Detectar sección visible
    const sections = ['servicios', 'productos', 'contacto'];
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top >= 0 && rect.top < window.innerHeight / 2) {
          sessionStorage.setItem('stihl.lastSection', id);
        }
      }
    }
  };

  // Registro del evento
  window.addEventListener('scroll', handleScroll, { passive: true });

  // Cleanup: se desregistra al desmontar el componente
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

---

### Manipulación Dinámica de CSS con classList

**Qué decir:**
> "La regla de oro para manipular el aspecto visual con JavaScript es: **nunca modificar `style` directamente**, siempre agregar o quitar clases CSS. Esto separa la lógica de los estilos. El JavaScript decide *cuándo* algo debe verse diferente, y el CSS define *cómo* se ve. En nuestro proyecto, el modo oscuro se activa con `classList.add('dark')`, el banner de cookies se oculta con la clase `.cookie-banner--hidden`, y el modal de T&C aparece o desaparece con `.modal--hidden`."

```
Archivo: src/components/LandingPage.tsx + landing.css

✅ Manipulación exclusiva via classList:

// JavaScript: agrega o quita la clase
useEffect(() => {
  if (isDark) {
    document.documentElement.classList.add('dark');     // classList.add()
  } else {
    document.documentElement.classList.remove('dark');  // classList.remove()
  }
  localStorage.setItem('stihl.theme', isDark ? 'dark' : 'light');
}, [isDark]);

// CSS: define el comportamiento visual
.dark {
  --clr-bg: #111318;
  --clr-text: #F1F3F5;
}

// Cookie banner: oculto con transform, no con display:none
.cookie-banner { transform: translateY(0); transition: transform 0.3s ease; }
.cookie-banner--hidden { transform: translateY(110%); }

// Modal: visible/oculto con clase
.modal { display: flex; }
.modal--hidden { display: none; }
```

**Mostrar en el sitio:** Hacer click en el toggle 🌙 y observar cómo cambia el tema.

---

### Validación de Formularios con JavaScript

**Qué decir:**
> "Antes de enviar cualquier dato al servidor, JavaScript intercepta el formulario con `e.preventDefault()` y ejecuta la validación. Si hay errores, los muestra inmediatamente con feedback visual y NO envía la petición al servidor. Esto ahorra requests innecesarios y da retroalimentación instantánea al usuario. Validamos: que el nombre tenga mínimo 2 caracteres, que el email tenga el formato correcto con expresión regular, que el teléfono solo contenga dígitos, y que el mensaje tenga mínimo 10 caracteres."

**Mostrar en el sitio:** Intentar enviar el formulario con el email con formato inválido.

```
Archivo: src/components/LandingPage.tsx

// 1. Función de validación pura — no toca el DOM
function validate(f: ContactForm): FieldErrors {
  const errs: FieldErrors = {};

  if (!f.name.trim() || f.name.trim().length < 2) {
    errs.name = 'El nombre es obligatorio (mínimo 2 caracteres).';
  }
  // Expresión regular para validar email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
    errs.email = 'Ingresá un correo electrónico válido.';
  }
  // Teléfono: opcional pero si se ingresa debe ser válido
  if (f.phone && !/^[\d\s\+\-\(\)]{6,20}$/.test(f.phone.trim())) {
    errs.phone = 'Teléfono inválido.';
  }
  if (f.message.trim().length < 10) {
    errs.message = 'El mensaje debe tener al menos 10 caracteres.';
  }

  return errs;
}

// 2. Manejador del submit: intercepta ANTES de enviar
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();   ← Detiene el submit nativo del navegador

  const fieldErrors = validate(form);
  if (Object.keys(fieldErrors).length > 0) {
    setErrors(fieldErrors);   ← Muestra errores en pantalla
    return;                   ← Corta la ejecución, NO llega al fetch
  }

  // Solo si la validación pasa, llega al fetch
  await fetch('/api/contact', { method: 'POST', ... });
}

// 3. El feedback visual se aplica por clase CSS
<input
  className={`field__input${errors.name ? ' field__input--error' : ''}`}
  aria-invalid={Boolean(errors.name)}
/>
{errors.name && (
  <span className="field__error" role="alert">{errors.name}</span>
)}
```

---

### Web Storage API

**Qué decir:**
> "El navegador ofrece dos almacenamientos del lado del cliente. `localStorage` persiste entre sesiones: si cerrás el navegador y lo abrís de nuevo, los datos siguen ahí. Usamos localStorage para guardar el token JWT de sesión del usuario, la preferencia de tema claro/oscuro, y la decisión sobre las cookies. `sessionStorage` es volátil: se borra al cerrar la pestaña. Lo usamos para registrar la última sección que visitó el usuario en la sesión actual, que no necesita persistir entre sesiones."

```
Archivo: src/components/LandingPage.tsx y src/lib/session.ts

// ── localStorage: PERSISTE entre sesiones ──────────────────────────

// Tema del sitio
localStorage.setItem('stihl.theme', 'dark');
const [isDark] = useState(() => localStorage.getItem('stihl.theme') === 'dark');

// Decisión de cookies
localStorage.setItem('stihl.cookies', 'accepted');
const [cookieAccepted] = useState(() => Boolean(localStorage.getItem('stihl.cookies')));

// Sesión JWT (src/lib/session.ts)
localStorage.setItem('stihl.session.token', jwtToken);
localStorage.setItem('stihl.session.user', JSON.stringify(userData));


// ── sessionStorage: VOLÁTIL, se borra al cerrar la pestaña ─────────

// Última sección visitada en esta sesión
sessionStorage.setItem('stihl.lastSection', 'contacto');

// Timestamp del último formulario enviado en esta sesión
sessionStorage.setItem('stihl.lastContact', new Date().toISOString());
```

**Mostrar en el sitio:**  
1. Abrir DevTools → Application → Local Storage → mostrar las claves
2. Activar modo oscuro → mostrar `stihl.theme: "dark"` en LocalStorage
3. Mostrar Session Storage con `stihl.lastSection`

---

## MÓDULO 3 — CAPA BACKEND: EXPRESS.JS Y BASE DE DATOS

---

### Las 3 Tablas Obligatorias (PostgreSQL)

**Qué decir:**
> "La base de datos de Stihl Motors tiene 18 tablas en total, pero el MVP requiere mínimo tres específicas. La primera es la tabla de usuarios con roles: almacena el email, el hash de la contraseña (nunca en texto plano), y el rol que controla el acceso. Los roles son admin, receiver, mechanic y stock_manager. La segunda es la tabla de leads o contactos: captura los datos del formulario público con un campo `status` para el seguimiento comercial. La tercera es la tabla de productos: el catálogo de repuestos con código, descripción, marca y precio."

**Dónde mostrar:**  
Abrir `postgres/schema.sql`

```
Archivo: postgres/schema.sql

── TABLA 1: Usuarios con Roles ──────────────────────────────────────
create table if not exists app_user (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  display_name  text not null,
  role          text not null
                check (role in ('admin', 'receiver', 'mechanic', 'stock_manager')),
  password_hash text not null,    ← NUNCA guardamos contraseñas en texto plano
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

── TABLA 2: Leads / Contactos del sitio web ─────────────────────────
create table if not exists lead (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  email     text not null,
  phone     text not null default '',
  service   text not null default '',
  message   text not null default '',
  status    text not null default 'new'         ← Seguimiento comercial
            check (status in ('new', 'contacted', 'converted', 'discarded')),
  ip        text,
  created_at timestamptz not null default now()
);

── TABLA 3: Productos / Catálogo de Repuestos ───────────────────────
create table if not exists part (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,     ← Código único del repuesto
  description      text not null,
  machine_category text not null default 'General',
  machine_brand    text not null default '',
  machine_model    text not null default '',
  price            numeric(12,2) not null default 0,
  stock            integer not null default 0,
  -- Imagen: se guarda la RUTA (no el binario)
  -- image_path text default '/assets/images/productos/default.webp'
  created_at       timestamptz not null default now()
);
```

---

### Servidor Express.js y Middleware de Autenticación

**Qué decir:**
> "El backend usa Express.js, que es el framework web más popular de Node.js. Tiene tres capas de middleware. La primera es CORS: controla qué dominios pueden hacer peticiones a nuestra API. La segunda es autenticación JWT: el middleware `requireAuth` verifica el token en cada petición protegida. La tercera es control de roles: `requireRole` comprueba que el usuario tenga el rol necesario para ese endpoint. Esto se encadena así: primero se verifica que haya token, luego que el token sea válido, y finalmente que el rol sea el correcto."

```
Archivo: server/index.js y server/auth.js

// ── CORS: controlamos quién puede acceder ────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);                   // Origen permitido ✓
    } else {
      callback(new Error(`Bloqueado: ${origin}`));  // Origen bloqueado ✗
    }
  }
}));

// ── Middleware de autenticación JWT ───────────────────────────────────
export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]; // "Bearer TOKEN"
  if (!token) {
    return res.status(401).json({ message: 'Sin autenticación.' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // Verifica firma
    next();  // Pasa al siguiente middleware
  } catch {
    return res.status(401).json({ message: 'Token inválido.' });
  }
}

// ── Control de acceso por rol ─────────────────────────────────────────
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Acceso denegado.' });
    }
    next();
  };
}

// ── Uso combinado: tres capas de protección ───────────────────────────
// Solo el admin puede ver los leads
app.get('/api/leads', requireAuth, requireRole('admin'), async (req, res) => {
  const result = await query('select * from lead order by created_at desc');
  return res.json(result.rows);
});
```

---

### Endpoint POST /api/contact — Flujo completo

**Qué decir:**
> "El endpoint de contacto es el núcleo de la demo en vivo. Es público, no requiere autenticación, y hace validación del lado del servidor como segunda línea de defensa. Incluso si alguien desactiva JavaScript en el navegador y envía datos incorrectos directamente a la API, el servidor los rechaza. Si los datos son válidos, los inserta en la tabla `lead` y devuelve 201 con un mensaje de confirmación."

```
Archivo: server/index.js — POST /api/contact

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

  const ip = getClientIp(req);  // Registrar IP para analítica

  // Persistencia con consulta parametrizada (previene SQL injection)
  const result = await query(
    `insert into lead (name, email, phone, service, message, ip)
     values ($1, $2, $3, $4, $5, $6)
     returning id, name, email, created_at`,
    [name.trim(), email.trim().toLowerCase(),
     phone.trim(), service.trim(), message.trim(), ip]
  );

  return res.status(201).json({
    message: '¡Gracias! Tu consulta fue recibida. Te contactamos a la brevedad.',
    lead: result.rows[0],
  });
});
```

---

### Documentación Interactiva en /docs

**Qué decir:**
> "Una de las ventajas clave de un backend bien documentado es que cualquiera puede probar los endpoints sin necesidad de código. En `/docs` tenemos Swagger UI, una interfaz visual que lista todos los endpoints con sus parámetros, muestra los schemas de request y response, y permite ejecutar peticiones directamente desde el navegador. Esto facilita el trabajo en equipo: el desarrollador de frontend puede probar la API sin hablar con el desarrollador de backend."

**Dónde mostrar:**  
Abrir en el navegador: `https://stihl-motors.netlify.app/docs` o `http://localhost:4000/docs`

```
Archivo: server/index.js — configuración de Swagger

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Stihl Motors API',
      version: '1.0.0',
      description: 'REST API del sistema de gestión de taller mecánico',
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      }
    }
  },
  apis: ['./server/index.js'],  // Lee los comentarios @openapi del código
});

// Montar la UI en /docs con el CSS de la marca
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { background-color: #FF6321; }',
}));

// Cada endpoint tiene su documentación en el código:
/**
 * @openapi
 * /api/contact:
 *   post:
 *     tags: [Contacto]
 *     summary: Enviar formulario de contacto público
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             properties:
 *               name:    { type: string }
 *               email:   { type: string, format: email }
 *               message: { type: string }
 */
```

---

## MÓDULO 4 — INTEGRACIÓN Y ASINCRONÍA

---

### Async/Await y Fetch API

**Qué decir:**
> "La asincronía es fundamental en JavaScript porque el navegador es *single-threaded*: tiene un solo hilo de ejecución. Si hacemos una petición al servidor de forma sincrónica, el navegador se congela hasta que llega la respuesta. Con `async/await` y `fetch()`, la petición se envía y el navegador sigue respondiendo al usuario mientras espera. Si la petición tarda 3 segundos, el usuario puede seguir scrolleando. Cuando llega la respuesta, el `await` continúa la ejecución. El bloque `try/catch` captura tanto errores del servidor (status 400/500) como errores de red (sin conexión)."

```
Archivo: src/components/LandingPage.tsx — ciclo completo de una petición

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  // 1. Validar en el cliente (sin usar la red)
  const fieldErrors = validate(form);
  if (Object.keys(fieldErrors).length > 0) {
    setErrors(fieldErrors);
    return;
  }

  setSubmitting(true);   ← Mostrar indicador de carga

  try {
    // 2. Petición asíncrona — no bloquea el hilo principal
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),    ← Datos en formato JSON
    });

    // 3. Procesar respuesta
    const data = await res.json();   ← También asíncrono

    if (res.ok) {                    ← res.ok = status 200-299
      setSubmitResult({ ok: true, msg: data.message });
      setForm(EMPTY_FORM);           ← Limpiar formulario al éxito
    } else {
      setSubmitResult({ ok: false, msg: data.message });
    }

  } catch (error) {
    // 4. Capturar errores de RED (sin conexión, timeout, etc.)
    setSubmitResult({ ok: false, msg: 'Error de red. Intentá de nuevo.' });

  } finally {
    setSubmitting(false);  ← Siempre ocultar el indicador, haya error o no
  }
}
```

---

### Peticiones Paralelas con Promise.all

**Qué decir:**
> "Cuando necesitamos datos de múltiples endpoints al mismo tiempo, `Promise.all` los ejecuta en paralelo en lugar de secuencial. Si cada petición tarda 300ms, en secuencial tardaríamos 900ms. Con `Promise.all` tardan 300ms en total porque viajan simultáneamente."

```
Archivo: src/components/LeadsModule.tsx

// Sin Promise.all: 3 peticiones secuenciales = ~900ms
const leads   = await apiRequest('/api/leads');          // espera...
const chart   = await apiRequest('/api/analytics/leads');// espera...
const summary = await apiRequest('/api/analytics/summary');// espera...

// Con Promise.all: 3 peticiones paralelas = ~300ms
const [leads, chartData, summary] = await Promise.all([
  apiRequest('/api/leads'),
  apiRequest('/api/analytics/leads'),
  apiRequest('/api/analytics/summary'),
]);
```

---

### Gráficos Dinámicos con Recharts

**Qué decir:**
> "El panel de administración tiene un módulo de Leads que muestra los datos de contacto en gráficos. Los datos vienen de un endpoint específico en el backend que agrupa los leads por mes usando SQL. Recharts recibe ese array de datos y renderiza el gráfico dinámicamente. Si llegan más leads mañana, al recargar el panel el gráfico se actualiza solo."

**Mostrar en el sitio:**  
Ir al panel admin → sección "Leads Web" → mostrar el gráfico de barras y el de torta.

```
Archivo: server/index.js — endpoint que alimenta el gráfico

// SQL que agrupa leads por mes — los datos reales de la BD
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
  // Respuesta: [{ month: "Ene 2026", count: 5 }, { month: "Feb 2026", count: 8 }]
});
```

```
Archivo: src/components/LeadsModule.tsx — gráfico alimentado por el endpoint

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// chartData viene del fetch a /api/analytics/leads
<ResponsiveContainer width="100%" height={220}>
  <BarChart data={chartData}>
    <XAxis dataKey="month" />
    <YAxis allowDecimals={false} />
    <Tooltip formatter={(val) => [val, 'Leads']} />
    <Bar
      dataKey="count"       ← La propiedad del objeto que representa el valor
      fill="#FF6321"        ← Color naranja del branding
      radius={[4, 4, 0, 0]} ← Bordes superiores redondeados
    />
  </BarChart>
</ResponsiveContainer>
```

---

## MÓDULO 5 — RENDIMIENTO, SEGURIDAD Y LEGAL

---

### Seguridad — CORS y JWT

**Qué decir:**
> "CORS es el mecanismo que evita que un sitio web malicioso pueda hacer peticiones a nuestra API haciéndose pasar por el usuario. Configuramos Express para que solo acepte peticiones de nuestro dominio de Netlify y de localhost en desarrollo. Para la autenticación usamos JWT: cuando el usuario hace login, el servidor genera un token firmado con una clave secreta. En cada petición al admin, el frontend envía ese token en el header, y el servidor lo verifica. Si alguien intenta falsificar el token o usa un token de otra sesión, la verificación falla."

```
Archivo: server/index.js + server/auth.js

// ── CORS ────────────────────────────────────────────────────────────
const allowedOrigins = new Set([
  'https://stihl-motors.netlify.app',  // Producción Netlify
  'https://stihl-motors.onrender.com', // Producción Render (alternativa)
  'http://localhost:3000',             // Desarrollo
]);

// ── JWT — Contraseñas con hash bcrypt ────────────────────────────────
// Al crear usuario: NUNCA guardamos texto plano
const passwordHash = await bcryptjs.hash(password, 12);
// saltRounds=12 → computacionalmente costoso para ataques de fuerza bruta

// Al hacer login: comparamos contra el hash
const isValid = await bcryptjs.compare(passwordIngresado, passwordHash);

// Si es válido: generamos un token firmado
const token = jwt.sign(
  { sub: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,    ← Clave secreta del servidor (variable de entorno)
  { expiresIn: '8h' }        ← Expira en 8 horas
);

// El frontend guarda el token en localStorage y lo envía en cada request
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Cookie Consent y Términos y Condiciones

**Qué decir:**
> "La Regulación GDPR en Europa y las leyes de protección de datos requieren que los sitios web informen al usuario sobre el uso de cookies y le den la opción de aceptarlas o rechazarlas. En Stihl Motors implementamos un banner que aparece la primera vez que el usuario visita el sitio. Si acepta, guardamos esa decisión en localStorage y el banner no vuelve a aparecer. Si presiona 'Configuración de Cookies' en el footer, puede cambiar su decisión en cualquier momento. También hay un modal de Términos y Condiciones accesible desde el footer."

**Mostrar en el sitio:**  
1. Abrir el sitio en modo incógnito para que aparezca el banner
2. Mostrar el footer → hacer click en "Términos y Condiciones" → se abre el modal

```
Archivo: src/components/LandingPage.tsx

// El banner solo aparece si no hay decisión guardada
const [cookieAccepted, setCookieAccepted] = useState(
  () => Boolean(localStorage.getItem('stihl.cookies'))
);

function acceptCookies() {
  localStorage.setItem('stihl.cookies', 'accepted');
  setCookieAccepted(true);  // Oculta el banner
}

function rejectCookies() {
  localStorage.setItem('stihl.cookies', 'rejected');
  setCookieAccepted(true);  // También oculta el banner
}

// El ocultamiento es CSS puro, no JS
<div className={`cookie-banner${cookieAccepted ? ' cookie-banner--hidden' : ''}`}>
```

```
Archivo: src/styles/landing.css

// El banner sale por debajo con animación CSS — sin display:none
.cookie-banner {
  position: fixed;
  bottom: 0;
  transform: translateY(0);
  transition: transform 0.3s ease;  ← Animación suave
}

.cookie-banner--hidden {
  transform: translateY(110%);      ← Sale por abajo del viewport
}
```

---

### Analítica Web

**Qué decir:**
> "Hay dos niveles de analítica en el proyecto. El primero es Google Analytics, integrado como script en el `index.html`. En producción solo hay que reemplazar `G-XXXXXXXXXX` con el ID real del proyecto de GA4. El segundo nivel es nuestra propia analítica: el backend tiene un middleware que registra automáticamente cada petición en la tabla `activity_log`. Guardamos el método HTTP, la ruta, el código de respuesta, la IP, el navegador, el sistema operativo y el usuario autenticado. El endpoint `/api/analytics/summary` consulta esa tabla y devuelve estadísticas de visitantes únicos y distribución de browsers para mostrar en el panel."

```
Archivo: index.html — Google Analytics (simulado/real)

<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX', { anonymize_ip: true }); ← Cumple GDPR
</script>
```

```
Archivo: server/index.js — Analítica propia con activity_log

// Middleware que corre en CADA petición automáticamente
app.use((req, res, next) => {
  res.on('finish', () => {          // Cuando la respuesta termina
    const item = buildActivityRecord(req, res.statusCode);
    void persistActivity(item);     // Guarda en BD de forma asíncrona
  });
  next();
});

// Detección automática de dispositivo y navegador
function detectBrowser(userAgent) {
  if (ua.includes('chrome/')) return 'chrome';
  if (ua.includes('firefox/')) return 'firefox';
  if (ua.includes('safari/'))  return 'safari';
  return 'otro';
}

// Endpoint que transforma activity_log en métricas para el panel
app.get('/api/analytics/summary', requireAuth, requireRole('admin'), async (req, res) => {
  const visitorsResult = await query(`
    select
      count(distinct ip)::int as unique_visitors,
      count(*)::int as total_requests
    from activity_log
    where created_at >= now() - interval '30 days'
  `);

  return res.json({
    visitors: visitorsResult.rows[0],  // Visitantes únicos últimos 30 días
    ...
  });
});
```

---

## MÓDULO 6 — EL FLUJO END-TO-END EN VIVO

> Esta sección es para el momento de la demo. Seguir exactamente este guion.

---

### Guion de la Demo (10 minutos)

**[1 min] Abrir el sitio**
```
Navegador → https://stihl-motors.netlify.app
Decir: "Este es el sitio público de Stihl Motors, lo que ve un cliente nuevo."
Señalar: El banner de cookies aparece (modo incógnito) → "Heurística de control del usuario"
```

**[1 min] Mostrar UX/UI**
```
Decir: "La jerarquía visual guía al usuario. El naranja llama la atención hacia el CTA."
Mostrar: Scroll lento por la landing mientras se explica cada sección
Acción: Click en toggle 🌙 → modo oscuro → "localStorage.setItem('stihl.theme', 'dark')"
```

**[1 min] Mostrar catálogo dinámico**
```
Decir: "Los productos vienen de la base de datos. El skeleton loader muestra que
       estamos esperando la respuesta del servidor."
Abrir DevTools → Network → hacer reload → mostrar el GET /api/parts
```

**[2 min] Demo del formulario**
```
Decir: "Vamos a enviar una consulta de contacto."
Acción 1: Intentar enviar el formulario vacío → mostrar bordes rojos
Decir: "La validación JavaScript detecta el error ANTES de llegar al servidor."
Acción 2: Escribir email con formato incorrecto → "usuario@" → borde rojo
Acción 3: Completar correctamente → enviar → alerta verde
Decir: "Esto acaba de ejecutar POST /api/contact → Express.js → PostgreSQL."
```

**[1 min] Ir al Panel Admin**
```
Decir: "Ahora vamos al panel de administración para ver el lead que acabamos de enviar."
Acción: Click en "Panel Admin" → formulario de login → ingresar credenciales admin
Decir: "El login llama a POST /api/auth/login → recibe un JWT → se guarda en localStorage."
```

**[2 min] Módulo de Leads**
```
Decir: "En la sección Leads Web vemos la consulta que enviamos hace un momento."
Señalar: La tabla con el nombre, email y mensaje
Señalar: El gráfico de barras → "Esto viene de GET /api/analytics/leads, una query SQL
         que agrupa los leads por mes."
Señalar: El gráfico de torta → "Distribución de leads por estado de seguimiento"
Acción: Cambiar el estado del lead de 'Nuevo' a 'Contactado'
```

**[1 min] Documentación /docs**
```
Decir: "El backend tiene documentación interactiva automática en /docs."
Abrir: https://stihl-motors.netlify.app/docs
Señalar: Los endpoints listados, especialmente POST /api/contact
Acción: Click en el endpoint → "Try it out" → ejecutar → mostrar la respuesta
```

**[1 min] Cierre**
```
Decir: "Resumiendo: el flujo completo funciona. El usuario llena el formulario en la
       landing page → JavaScript valida → fetch() envía al backend → Express valida
       de nuevo → PostgreSQL persiste → el admin ve los datos en tiempo real con
       gráficos dinámicos en el panel."
```

---

## Preguntas Frecuentes del Tribunal

**¿Por qué usaron Express.js y no FastAPI?**
> "Express.js es el framework de Node.js más maduro del ecosistema JavaScript. Al tener el frontend en React/TypeScript, usar el mismo lenguaje en el backend unifica el stack y permite compartir tipos. Tiene las mismas capacidades que FastAPI: middlewares, JWT, validación, CORS y documentación con Swagger."

**¿Qué es JWT y por qué es más seguro que guardar la sesión en el servidor?**
> "JWT (JSON Web Token) es un token firmado digitalmente que contiene los datos del usuario. El servidor no necesita guardar la sesión en memoria o en una tabla: simplemente verifica la firma criptográfica del token. Esto permite escalar horizontalmente porque cualquier instancia del servidor puede verificar cualquier token."

**¿Por qué BEM si ya usan Tailwind en el admin?**
> "Tailwind es excelente para componentes de aplicación donde el equipo trabaja en el mismo codebase. BEM es obligatorio en la landing page por el requerimiento del proyecto. En la práctica, coexisten: la landing pública usa BEM puro en `landing.css`, y el panel admin usa Tailwind. Ambos enfoques resuelven el mismo problema de diferente manera: Tailwind con clases de utilidad, BEM con nomenclatura semántica."

**¿Cómo funciona el modo oscuro técnicamente?**
> "El selector CSS `.dark` se define en `:root` y redefine las variables de color. JavaScript agrega la clase `.dark` al elemento `<html>` con `classList.add()` cuando el usuario activa el toggle. El navegador actualiza todos los elementos que usan esas variables automáticamente. La preferencia se persiste en `localStorage` para que el modo elegido sobreviva al cierre del navegador."

**¿Qué pasa si la base de datos no responde?**
> "El servidor tiene manejo de errores en cada endpoint con `try/catch`. Si la BD falla, el endpoint devuelve un HTTP 500 con el mensaje de error. El frontend tiene `try/catch` alrededor de cada `fetch()` y muestra un mensaje amigable al usuario. Nunca se expone el error interno al usuario por razones de seguridad."

---

*Guía preparada para la defensa final del Proyecto Integrador — Stihl Motors*
