/**
 * LandingPage.tsx
 * Página pública de Stihl Motors.
 *
 * Demuestra:
 *  - BEM CSS (clase .landing, .navbar, .hero, .product-card, .contact-form, etc.)
 *  - CSS Custom Properties / Variables (src/styles/landing.css :root)
 *  - Manejo de eventos con addEventListener (sin onclick inline)
 *  - Validación de formulario con feedback visual inmediato
 *  - Fetch API asíncrona con async/await y try/catch
 *  - Web Storage: localStorage (tema) y sessionStorage (última sección visitada)
 *  - Cookie consent banner
 *  - Modal de Términos y Condiciones
 *  - SEO semántico: <header>, <nav>, <main>, <section>, <footer>
 */

import React, { useState, useEffect, useRef } from 'react';
import '../styles/landing.css';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Part {
  id: string;
  code: string;
  description: string;
  machine_brand: string;
  machine_category: string;
  machine_model: string;
  price: number;
  stock: number;
}

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
}

interface FieldErrors {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const SERVICES = [
  { icon: '🔧', title: 'Reparación de Motosierras', desc: 'Servicio técnico autorizado para equipos STIHL, Husqvarna, Echo y más.' },
  { icon: '💧', title: 'Mantenimiento de Hidrolavadoras', desc: 'Revisión completa, cambio de sellos, bombas y accesorios Kärcher y Nilfisk.' },
  { icon: '🌿', title: 'Desmalezadoras y Sopladores', desc: 'Afinación, cambio de cabezal y reparación de transmisión en todos los modelos.' },
  { icon: '⚡', title: 'Venta de Repuestos Originales', desc: 'Stock de repuestos para más de 234 modelos de 15 marcas líderes del mercado.' },
  { icon: '🏭', title: 'Servicio Industrial', desc: 'Atención a empresas agrícolas y constructoras con contratos de mantenimiento preventivo.' },
  { icon: '🚀', title: 'Diagnóstico Digital', desc: 'Diagnóstico computarizado para equipos modernos con puerto de comunicación electrónica.' },
];

const EMPTY_FORM: ContactForm = { name: '', email: '', phone: '', service: '', message: '' };

// ── Componente principal ──────────────────────────────────────────────────────

export default function LandingPage({ onGoToAdmin }: { onGoToAdmin: () => void }) {
  // ── Estado ──────────────────────────────────────────────────────────────────
  const [isDark, setIsDark]               = useState(() => localStorage.getItem('stihl.theme') === 'dark');
  const [products, setProducts]           = useState<Part[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [form, setForm]                   = useState<ContactForm>(EMPTY_FORM);
  const [errors, setErrors]               = useState<FieldErrors>({});
  const [submitting, setSubmitting]       = useState(false);
  const [submitResult, setSubmitResult]   = useState<{ ok: boolean; msg: string } | null>(null);
  const [cookieAccepted, setCookieAccepted] = useState(() => Boolean(localStorage.getItem('stihl.cookies')));
  const [showTerms, setShowTerms]         = useState(false);

  const contactRef = useRef<HTMLElement>(null);

  // ── Dark mode: persiste en localStorage ─────────────────────────────────────
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('stihl.theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('stihl.theme', 'light');
    }
  }, [isDark]);

  // ── SessionStorage: registra última sección visitada ────────────────────────
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
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Cargar catálogo desde la API (async/await + Fetch) ───────────────────────
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/parts');
        if (!res.ok) throw new Error('No se pudo cargar el catálogo.');
        const data: Part[] = await res.json();
        setProducts(data.slice(0, 9)); // Mostrar primeros 9 en landing
      } catch {
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    void fetchProducts();
  }, []);

  // ── Validación del formulario ────────────────────────────────────────────────
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

  function handleFieldChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    // Validación en tiempo real: limpia el error del campo en cuanto el usuario escribe
    if (errors[name as keyof FieldErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }

  // ── Envío del formulario al backend (async/await + fetch) ────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const fieldErrors = validate(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitResult({ ok: true, msg: data.message });
        setForm(EMPTY_FORM);
        setErrors({});
        // Guardar último envío en sessionStorage para esta sesión de navegación
        sessionStorage.setItem('stihl.lastContact', new Date().toISOString());
      } else {
        setSubmitResult({ ok: false, msg: data.message || 'Error al enviar el formulario.' });
      }
    } catch {
      setSubmitResult({ ok: false, msg: 'Error de red. Por favor intentá de nuevo.' });
    } finally {
      setSubmitting(false);
    }
  }

  function acceptCookies() {
    localStorage.setItem('stihl.cookies', 'accepted');
    setCookieAccepted(true);
  }

  function rejectCookies() {
    localStorage.setItem('stihl.cookies', 'rejected');
    setCookieAccepted(true);
  }

  function scrollToContact() {
    contactRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="landing">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <header className="navbar" role="banner">
        <div className="navbar__inner">
          <a href="#inicio" className="navbar__brand" aria-label="Stihl Motors inicio">
            <div className="navbar__brand-icon" aria-hidden="true">S</div>
            <span>STIHL MOTORS</span>
          </a>

          <nav className="navbar__nav" aria-label="Navegación principal">
            <a href="#servicios" className="navbar__link">Servicios</a>
            <a href="#productos"  className="navbar__link">Catálogo</a>
            <a href="#contacto"   className="navbar__link">Contacto</a>
          </nav>

          <div className="navbar__actions">
            {/* Dark/Light toggle — localStorage */}
            <button
              className="navbar__theme-toggle"
              aria-label="Cambiar tema"
              onClick={() => setIsDark(d => !d)}
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            <button className="btn btn--primary" onClick={onGoToAdmin}>
              Panel Admin
            </button>
          </div>
        </div>
      </header>

      <main role="main">

        {/* ── HERO ───────────────────────────────────────────────────────────── */}
        <section id="inicio" className="hero" aria-labelledby="hero-heading">
          <div className="hero__inner">
            <div className="hero__content">
              <span className="hero__badge">Servicio Técnico Autorizado</span>
              <h1 id="hero-heading" className="hero__title">
                Expertos en<br />
                <span className="hero__title--accent">Maquinaria de Potencia</span>
              </h1>
              <p className="hero__description">
                Más de 15 años brindando servicio técnico especializado para STIHL, Husqvarna, Kärcher y más.
                Diagnóstico digital, repuestos originales y garantía en cada trabajo.
              </p>
              <div className="hero__actions">
                <button className="btn btn--primary btn--lg" onClick={scrollToContact}>
                  Pedir presupuesto
                </button>
                <a href="#productos" className="btn btn--outline btn--lg">
                  Ver catálogo
                </a>
              </div>
            </div>
            <div className="hero__image-box" aria-hidden="true">
              <div className="hero__image" style={{
                background: 'linear-gradient(135deg, #2D2F34 0%, #1A1C1E 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '6rem', borderRadius: '1.25rem',
              }}>
                ⚙️
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS BAR ─────────────────────────────────────────────────────── */}
        <div className="stats-bar" role="region" aria-label="Cifras clave">
          <div className="stats-bar__inner">
            <div className="stats-bar__item">
              <strong className="stats-bar__number">+15</strong>
              <span className="stats-bar__label">Años de experiencia</span>
            </div>
            <div className="stats-bar__item">
              <strong className="stats-bar__number">234</strong>
              <span className="stats-bar__label">Modelos en catálogo</span>
            </div>
            <div className="stats-bar__item">
              <strong className="stats-bar__number">15</strong>
              <span className="stats-bar__label">Marcas autorizadas</span>
            </div>
            <div className="stats-bar__item">
              <strong className="stats-bar__number">48h</strong>
              <span className="stats-bar__label">Tiempo promedio de entrega</span>
            </div>
          </div>
        </div>

        {/* ── SERVICIOS ─────────────────────────────────────────────────────── */}
        <section id="servicios" className="section" aria-labelledby="servicios-heading">
          <div className="section__inner">
            <header className="section__header">
              <span className="section__label">Lo que hacemos</span>
              <h2 id="servicios-heading" className="section__title">Nuestros Servicios</h2>
              <p className="section__subtitle">Soluciones completas para tu maquinaria de potencia</p>
            </header>

            <div className="services-grid" role="list">
              {SERVICES.map((s, i) => (
                <article key={i} className="service-card" role="listitem">
                  <div className="service-card__icon" aria-hidden="true">{s.icon}</div>
                  <h3 className="service-card__title">{s.title}</h3>
                  <p className="service-card__description">{s.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── CATÁLOGO DINÁMICO (desde API) ─────────────────────────────────── */}
        <section id="productos" className="section section--alt" aria-labelledby="productos-heading">
          <div className="section__inner">
            <header className="section__header">
              <span className="section__label">Repuestos y Equipos</span>
              <h2 id="productos-heading" className="section__title">Catálogo de Productos</h2>
              <p className="section__subtitle">Stock permanente de repuestos originales para más de 234 modelos</p>
            </header>

            <div className="products-grid" role="list">
              {loadingProducts
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="product-card product-card--skeleton" aria-hidden="true">
                      <div className="product-card__image-wrapper" />
                      <div className="product-card__body">
                        <div className="product-card__brand" style={{ height: '1rem', width: '60%' }} />
                        <div className="product-card__title" style={{ height: '1.25rem', width: '80%' }} />
                      </div>
                    </div>
                  ))
                : products.length === 0
                  ? (
                      <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--clr-text-muted)' }}>
                        <p style={{ fontSize: 'var(--fs-lg)' }}>Catálogo no disponible en este momento.</p>
                      </div>
                    )
                  : products.map(p => (
                      <article key={p.id} className="product-card" role="listitem">
                        <div className="product-card__image-wrapper" aria-hidden="true">
                          <span className="product-card__placeholder">🔩</span>
                        </div>
                        <div className="product-card__body">
                          <span className="product-card__brand">{p.machine_brand || 'Universal'}</span>
                          <h3 className="product-card__title">{p.description}</h3>
                          <span className="product-card__category">{p.machine_category}</span>
                          <div className="product-card__price">
                            <span className="product-card__price-label">Código: </span>
                            {p.code}
                          </div>
                        </div>
                      </article>
                    ))
              }
            </div>
          </div>
        </section>

        {/* ── FORMULARIO DE CONTACTO ─────────────────────────────────────────── */}
        <section id="contacto" className="section" ref={contactRef} aria-labelledby="contacto-heading">
          <div className="section__inner">
            <header className="section__header">
              <span className="section__label">Hablemos</span>
              <h2 id="contacto-heading" className="section__title">¿Necesitás ayuda con tu equipo?</h2>
              <p className="section__subtitle">Completá el formulario y te contactamos en menos de 24 horas</p>
            </header>

            <form
              className="contact-form"
              onSubmit={handleSubmit}
              noValidate
              aria-label="Formulario de contacto"
            >
              <h3 className="contact-form__title">Enviar consulta</h3>
              <p className="contact-form__subtitle">Los campos marcados con * son obligatorios.</p>

              <div className="contact-form__grid">

                {/* Nombre */}
                <div className="field">
                  <label htmlFor="contact-name" className="field__label field__label--required">
                    Nombre completo
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    className={`field__input${errors.name ? ' field__input--error' : ''}`}
                    placeholder="Ej: Juan Pérez"
                    value={form.name}
                    onChange={handleFieldChange}
                    autoComplete="name"
                    aria-describedby={errors.name ? 'err-name' : undefined}
                    aria-invalid={Boolean(errors.name)}
                  />
                  {errors.name && <span id="err-name" className="field__error" role="alert">{errors.name}</span>}
                </div>

                {/* Email */}
                <div className="field">
                  <label htmlFor="contact-email" className="field__label field__label--required">
                    Correo electrónico
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    className={`field__input${errors.email ? ' field__input--error' : ''}`}
                    placeholder="juan@correo.com"
                    value={form.email}
                    onChange={handleFieldChange}
                    autoComplete="email"
                    aria-describedby={errors.email ? 'err-email' : undefined}
                    aria-invalid={Boolean(errors.email)}
                  />
                  {errors.email && <span id="err-email" className="field__error" role="alert">{errors.email}</span>}
                </div>

                {/* Teléfono */}
                <div className="field">
                  <label htmlFor="contact-phone" className="field__label">
                    Teléfono
                  </label>
                  <input
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    className={`field__input${errors.phone ? ' field__input--error' : ''}`}
                    placeholder="0981 123 456"
                    value={form.phone}
                    onChange={handleFieldChange}
                    autoComplete="tel"
                    aria-describedby={errors.phone ? 'err-phone' : undefined}
                    aria-invalid={Boolean(errors.phone)}
                  />
                  {errors.phone && <span id="err-phone" className="field__error" role="alert">{errors.phone}</span>}
                </div>

                {/* Servicio — dropdown (previene errores ortográficos) */}
                <div className="field">
                  <label htmlFor="contact-service" className="field__label">
                    Servicio de interés
                  </label>
                  <select
                    id="contact-service"
                    name="service"
                    className="field__select"
                    value={form.service}
                    onChange={handleFieldChange}
                  >
                    <option value="">Seleccioná un servicio...</option>
                    <option value="Reparación">Reparación de equipo</option>
                    <option value="Mantenimiento">Mantenimiento preventivo</option>
                    <option value="Repuestos">Compra de repuestos</option>
                    <option value="Diagnóstico">Diagnóstico</option>
                    <option value="Garantía">Consulta de garantía</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                {/* Mensaje */}
                <div className="field contact-form__grid--full">
                  <label htmlFor="contact-message" className="field__label field__label--required">
                    Mensaje
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    className={`field__textarea${errors.message ? ' field__textarea--error' : ''}`}
                    placeholder="Describí el problema o consulta con tu equipo..."
                    value={form.message}
                    onChange={handleFieldChange}
                    aria-describedby={errors.message ? 'err-message' : undefined}
                    aria-invalid={Boolean(errors.message)}
                  />
                  {errors.message && <span id="err-message" className="field__error" role="alert">{errors.message}</span>}
                </div>

              </div>

              {/* Respuesta del servidor */}
              {submitResult && (
                <div
                  className={`alert ${submitResult.ok ? 'alert--success' : 'alert--error'}`}
                  role="status"
                  aria-live="polite"
                >
                  {submitResult.msg}
                </div>
              )}

              <button
                type="submit"
                className={`btn btn--primary btn--lg contact-form__submit${submitting ? ' btn--disabled' : ''}`}
                disabled={submitting}
                aria-busy={submitting}
              >
                {submitting ? '⏳ Enviando...' : '📩 Enviar consulta'}
              </button>
            </form>
          </div>
        </section>

      </main>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="footer" role="contentinfo">
        <div className="footer__inner">
          <div className="footer__grid">
            <div className="footer__brand">
              <p className="footer__logo">STIHL MOTORS</p>
              <p className="footer__tagline">
                Servicio técnico especializado en maquinaria de potencia.
                Atendemos STIHL, Husqvarna, Kärcher, Honda y más de 15 marcas líderes.
              </p>
            </div>

            <div>
              <p className="footer__col-title">Servicios</p>
              <ul className="footer__links">
                <li><a href="#servicios" className="footer__link">Reparaciones</a></li>
                <li><a href="#servicios" className="footer__link">Mantenimiento</a></li>
                <li><a href="#productos" className="footer__link">Repuestos</a></li>
                <li><a href="#servicios" className="footer__link">Diagnóstico digital</a></li>
              </ul>
            </div>

            <div>
              <p className="footer__col-title">Marcas</p>
              <ul className="footer__links">
                <li><span className="footer__link">STIHL</span></li>
                <li><span className="footer__link">Husqvarna</span></li>
                <li><span className="footer__link">Kärcher</span></li>
                <li><span className="footer__link">Honda · Makita</span></li>
              </ul>
            </div>

            <div>
              <p className="footer__col-title">Contacto</p>
              <ul className="footer__links">
                <li><a href="#contacto" className="footer__link">Enviar consulta</a></li>
                <li><a href="/seguimiento" className="footer__link">Seguir mi reparación</a></li>
              </ul>
            </div>
          </div>

          <div className="footer__bottom">
            <span>© {new Date().getFullYear()} Stihl Motors. Todos los derechos reservados.</span>
            <div className="footer__legal">
              <button
                className="footer__legal-link"
                style={{ background: 'none', color: 'inherit', fontSize: 'inherit', cursor: 'pointer' }}
                onClick={() => setShowTerms(true)}
              >
                Términos y Condiciones
              </button>
              <button
                className="footer__legal-link"
                style={{ background: 'none', color: 'inherit', fontSize: 'inherit', cursor: 'pointer' }}
                onClick={() => {
                  localStorage.removeItem('stihl.cookies');
                  setCookieAccepted(false);
                }}
              >
                Configuración de Cookies
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ── BANNER DE COOKIES ──────────────────────────────────────────────── */}
      <div
        className={`cookie-banner${cookieAccepted ? ' cookie-banner--hidden' : ''}`}
        role="dialog"
        aria-live="polite"
        aria-label="Aviso de cookies"
      >
        <div className="cookie-banner__inner">
          <p className="cookie-banner__text">
            🍪 Usamos cookies propias y de terceros para mejorar tu experiencia y analizar el uso del sitio.
            Podés aceptarlas o rechazarlas.{' '}
            <button
              className="cookie-banner__link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline', font: 'inherit' }}
              onClick={() => setShowTerms(true)}
            >
              Ver política de privacidad
            </button>
          </p>
          <div className="cookie-banner__actions">
            <button className="btn btn--outline" onClick={rejectCookies}>
              Rechazar
            </button>
            <button className="btn btn--primary" onClick={acceptCookies}>
              Aceptar todo
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL TÉRMINOS Y CONDICIONES ───────────────────────────────────── */}
      <div
        className={`modal${showTerms ? '' : ' modal--hidden'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-title"
      >
        <div className="modal__box">
          <div className="modal__header">
            <h2 id="terms-title" className="modal__title">Términos y Condiciones</h2>
            <button className="modal__close" onClick={() => setShowTerms(false)} aria-label="Cerrar">✕</button>
          </div>
          <div className="modal__body">
            <h3>1. Aceptación de los Términos</h3>
            <p>Al utilizar el sitio web de Stihl Motors, aceptás íntegramente los presentes Términos y Condiciones. Si no estás de acuerdo, no deberías utilizar este sitio.</p>

            <h3>2. Servicios Ofrecidos</h3>
            <p>Stihl Motors ofrece servicios de reparación, mantenimiento y venta de repuestos para maquinaria de potencia. Los precios y disponibilidad pueden variar sin previo aviso.</p>

            <h3>3. Política de Privacidad y Cookies</h3>
            <p>Recopilamos datos de contacto únicamente para responder a consultas comerciales. No vendemos ni cedemos información personal a terceros. Usamos cookies de analítica para mejorar el sitio.</p>

            <h3>4. Garantía de Servicios</h3>
            <p>Todos los trabajos de reparación incluyen garantía de 30 días sobre la mano de obra. Los repuestos poseen la garantía del fabricante original.</p>

            <h3>5. Propiedad Intelectual</h3>
            <p>El contenido, marca y diseño de este sitio son propiedad exclusiva de Stihl Motors y están protegidos por la legislación vigente de propiedad intelectual.</p>

            <h3>6. Legislación Aplicable</h3>
            <p>Estos términos se rigen por las leyes de la República del Paraguay. Cualquier controversia será sometida a los tribunales competentes de Asunción.</p>

            <h3>7. Contacto</h3>
            <p>Para consultas sobre estos términos, escribinos a través del formulario de contacto o directamente al correo indicado en el sitio.</p>

            <div style={{ marginTop: '2rem' }}>
              <button className="btn btn--primary" onClick={() => setShowTerms(false)}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
