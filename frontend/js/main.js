/**
 * main.js — PowerFix
 * Funcionalidades globales: nav, tema, cookies, analítica
 */

const API_URL = 'http://localhost:8000';

/* ── Tema oscuro/claro ─────────────────────────────────────── */
(function initTheme() {
  const savedTheme = localStorage.getItem('pf_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
})();

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (!icon) return;
  icon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
}

document.addEventListener('DOMContentLoaded', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  updateThemeIcon(currentTheme);

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const html    = document.documentElement;
      const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('pf_theme', newTheme);
      updateThemeIcon(newTheme);
    });
  }

  /* ── Navbar scroll ─────────────────────────────────────── */
  const nav = document.getElementById('mainNav');
  if (nav && !nav.classList.contains('nav--scrolled')) {
    const handleScroll = () => {
      nav.classList.toggle('nav--scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  /* ── Hamburger menu ────────────────────────────────────── */
  const navToggle = document.getElementById('navToggle');
  const navMenu   = document.getElementById('navMenu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('nav__menu--open');
      navToggle.classList.toggle('nav__toggle--open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Cerrar al hacer click en un link
    navMenu.querySelectorAll('.nav__link, .nav__cta').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('nav__menu--open');
        navToggle.classList.remove('nav__toggle--open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Cookie consent ────────────────────────────────────── */
  initCookieBanner();

  /* ── Analítica de página ───────────────────────────────── */
  trackPageView();
});

/* ── Cookies ───────────────────────────────────────────────── */
function initCookieBanner() {
  const banner      = document.getElementById('cookieBanner');
  const btnAccept   = document.getElementById('cookieAccept');
  const btnReject   = document.getElementById('cookieReject');

  if (!banner) return;

  const cookieStatus = localStorage.getItem('pf_cookies');
  if (cookieStatus !== null) {
    banner.classList.add('cookie-banner--hidden');
    return;
  }

  if (btnAccept) {
    btnAccept.addEventListener('click', () => {
      localStorage.setItem('pf_cookies', 'accepted');
      sessionStorage.setItem('pf_session', 'active');
      banner.classList.add('cookie-banner--hidden');
    });
  }

  if (btnReject) {
    btnReject.addEventListener('click', () => {
      localStorage.setItem('pf_cookies', 'rejected');
      banner.classList.add('cookie-banner--hidden');
    });
  }
}

/* ── Analítica (pageview) ──────────────────────────────────── */
async function trackPageView() {
  const cookieStatus = localStorage.getItem('pf_cookies');
  if (cookieStatus === 'rejected') return;

  const pathMap = {
    'index.html': 'inicio', '': 'inicio', '/': 'inicio',
    'servicios.html': 'servicios',
    'contacto.html': 'contacto',
    'terminos.html': 'terminos',
    'admin.html': 'admin',
    'login.html': 'login',
  };

  const filename = window.location.pathname.split('/').pop() || 'index.html';
  const pagina   = pathMap[filename] || filename;

  try {
    await fetch(`${API_URL}/api/analytics/pageview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pagina }),
    });
  } catch {
    // Error silencioso: analítica no crítica
  }
}

/* ── Helpers exportados ────────────────────────────────────── */
function getToken() {
  return localStorage.getItem('pf_token');
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('pf_user')); }
  catch { return null; }
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}

function formatDate(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function formatPrice(n) {
  return `$${Number(n).toLocaleString('es-AR')}`;
}

/* Exponer globalmente */
window.PF = { API_URL, getToken, getUser, authHeaders, formatDate, formatPrice };
