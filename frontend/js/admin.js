/**
 * admin.js — PowerFix
 * Panel administrativo: stats, charts (Chart.js), tablas, modales
 */

const API = window.PF?.API_URL || 'http://localhost:8000';

let chartMaquinas = null;
let chartEstados  = null;
let chartVisitas  = null;

/* ── Paleta de colores para gráficos ──────────────────────── */
const CHART_COLORS = ['#E55F0A','#1E2D3D','#2563EB','#16A34A','#D97706','#DC2626','#7C3AED','#0891B2','#BE185D'];

document.addEventListener('DOMContentLoaded', async () => {

  /* 1 · Verificar autenticación */
  const token = localStorage.getItem('pf_token');
  const user  = (() => {
    try { return JSON.parse(localStorage.getItem('pf_user')); }
    catch { return null; }
  })();

  const authLoader   = document.getElementById('authLoader');
  const adminLayout  = document.getElementById('adminLayout');

  if (!token || !user || user.rol !== 'admin') {
    window.location.replace('login.html');
    return;
  }

  /* Mostrar layout */
  if (authLoader)  authLoader.setAttribute('hidden', '');
  if (adminLayout) adminLayout.removeAttribute('hidden');

  /* 2 · Rellenar info de usuario */
  const initiales = `${user.nombre?.[0] || ''}${user.apellido?.[0] || ''}`.toUpperCase();
  setText('userAvatar', initiales);
  setText('userName',   `${user.nombre} ${user.apellido}`);
  setText('userRole',   user.rol);

  /* 3 · Fecha en topbar */
  const hoy = new Date().toLocaleDateString('es-AR', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  setText('topbarDate', hoy.charAt(0).toUpperCase() + hoy.slice(1));

  /* 4 · Configurar navegación del sidebar */
  initSidebar();

  /* 5 · Logout */
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('pf_token');
    localStorage.removeItem('pf_user');
    sessionStorage.removeItem('pf_session_token');
    window.location.replace('login.html');
  });

  /* 6 · Toggle tema */
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon   = document.getElementById('themeIcon');
  if (themeToggle) {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    themeIcon.className = current === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    themeToggle.addEventListener('click', () => {
      const html = document.documentElement;
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('pf_theme', next);
      themeIcon.className = next === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    });
  }

  /* 7 · Cargar datos del dashboard */
  await loadDashboard();
  await loadContactos();
  await loadServicios();
});

/* ── Sidebar navigation ────────────────────────────────────── */
function initSidebar() {
  const items   = document.querySelectorAll('.sidebar__item[data-panel]');
  const panels  = document.querySelectorAll('.admin-panel');
  const topTitle = document.getElementById('topbarTitle');

  const TITLES = {
    dashboard: 'Dashboard',
    contactos: 'Contactos / Leads',
    servicios: 'Catálogo de Servicios',
    analytics: 'Analítica de Visitas',
  };

  items.forEach(item => {
    item.addEventListener('click', () => {
      const panel = item.dataset.panel;

      items.forEach(i  => i.classList.remove('sidebar__item--active'));
      panels.forEach(p => p.classList.remove('admin-panel--active'));

      item.classList.add('sidebar__item--active');
      document.getElementById(`panel-${panel}`)?.classList.add('admin-panel--active');
      if (topTitle) topTitle.textContent = TITLES[panel] || panel;

      /* Renderizar charts al entrar en analytics */
      if (panel === 'analytics') renderVisitasChart();
    });
  });

  /* Sidebar mobile toggle */
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('sidebar--open');
  });
}

/* ── Dashboard ─────────────────────────────────────────────── */
async function loadDashboard() {
  try {
    const [statsRes, chartRes] = await Promise.all([
      fetchAuth('/api/stats'),
      fetchAuth('/api/stats/charts'),
    ]);

    if (!statsRes.ok || !chartRes.ok) throw new Error('Error al cargar stats');

    const stats  = await statsRes.json();
    const charts = await chartRes.json();

    /* Stat cards */
    setText('statTotal',    stats.total_contactos);
    setText('statNuevo',    stats.contactos_nuevo);
    setText('statEnProceso', stats.contactos_en_proceso);
    setText('statResuelto', stats.contactos_resuelto);
    setText('statServicios', stats.total_servicios);
    setText('statVisitas',  stats.total_visitas);

    /* Badge en sidebar */
    setText('contactosBadge', stats.contactos_nuevo);

    /* Gráfico: por tipo de máquina */
    renderBarChart('chartMaquinas', charts.maquinas.labels, charts.maquinas.data, 'Consultas');

    /* Gráfico: por estado */
    renderDoughnutChart('chartEstados', charts.estados.labels, charts.estados.data);

    /* Guardar para el panel de analytics */
    window._visitasData = charts.visitas;

  } catch (err) {
    console.error('Error en dashboard:', err);
  }
}

/* ── Contactos ─────────────────────────────────────────────── */
async function loadContactos(estado = '') {
  const tbody   = document.getElementById('contactosBody');
  const loader  = document.getElementById('contactosLoader');
  if (!tbody) return;

  loader?.classList.add('loader--visible');
  tbody.innerHTML = '';

  try {
    const url = estado ? `/api/contactos?estado=${estado}` : '/api/contactos';
    const res = await fetchAuth(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contactos = await res.json();

    if (contactos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="td-empty">Sin contactos registrados.</td></tr>`;
      return;
    }

    contactos.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="td-muted">#${c.id}</td>
        <td><strong>${c.nombre} ${c.apellido}</strong></td>
        <td>${c.tipo_maquina}</td>
        <td>${c.email}</td>
        <td>${c.telefono}</td>
        <td><span class="badge badge--${c.estado}">${c.estado.replace('_', ' ')}</span></td>
        <td>${window.PF.formatDate(c.created_at)}</td>
        <td class="td-actions">
          <button type="button" class="btn btn--sm btn--view" data-id="${c.id}" data-action="ver">
            <i class="fa-solid fa-eye"></i>
          </button>
          <select class="select-estado" data-id="${c.id}" data-action="estado" aria-label="Cambiar estado del contacto ${c.id}">
            <option value="nuevo"      ${c.estado==='nuevo'      ? 'selected':''}>Nuevo</option>
            <option value="en_proceso" ${c.estado==='en_proceso' ? 'selected':''}>En Proceso</option>
            <option value="resuelto"   ${c.estado==='resuelto'   ? 'selected':''}>Resuelto</option>
            <option value="cerrado"    ${c.estado==='cerrado'    ? 'selected':''}>Cerrado</option>
          </select>
        </td>`;
      tbody.appendChild(tr);
      /* Almacenar datos del contacto en el TR para el modal */
      tr._contactoData = c;
    });

    /* Delegación de eventos en la tabla */
    tbody.addEventListener('click',  handleContactoAction);
    tbody.addEventListener('change', handleContactoAction);

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="td-error">Error al cargar contactos. Verificá que el servidor esté activo.</td></tr>`;
  } finally {
    loader?.classList.remove('loader--visible');
  }
}

async function handleContactoAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const id     = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === 'ver') {
    const tr = btn.closest('tr');
    openModal(tr._contactoData);
  }

  if (action === 'estado') {
    const nuevoEstado = btn.value;
    try {
      const res = await fetchAuth(`/api/contactos/${id}/estado`, 'PATCH', { estado: nuevoEstado });
      if (!res.ok) throw new Error();
      /* Actualizar el badge en la misma fila */
      const badgeEl = btn.closest('tr')?.querySelector('.badge');
      if (badgeEl) {
        badgeEl.className = `badge badge--${nuevoEstado}`;
        badgeEl.textContent = nuevoEstado.replace('_', ' ');
      }
    } catch {
      alert('No se pudo actualizar el estado.');
    }
  }
}

/* Filtro de estado */
document.getElementById('filtroEstado')?.addEventListener('change', (e) => {
  loadContactos(e.target.value);
});

document.getElementById('recargarContactos')?.addEventListener('click', () => {
  const estado = document.getElementById('filtroEstado')?.value || '';
  loadContactos(estado);
});

/* ── Servicios ─────────────────────────────────────────────── */
async function loadServicios() {
  const tbody  = document.getElementById('serviciosBody');
  const loader = document.getElementById('serviciosLoader');
  if (!tbody) return;

  loader?.classList.add('loader--visible');

  try {
    const res      = await fetch(`${API}/api/servicios`);
    const servicios = await res.json();

    tbody.innerHTML = '';
    servicios.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="td-muted">#${s.id}</td>
        <td><strong>${s.nombre}</strong></td>
        <td><span class="badge badge--${s.categoria === 'Jardinería' ? 'resuelto' : s.categoria === 'Energía' ? 'nuevo' : 'en_proceso'}">${s.categoria}</span></td>
        <td>${window.PF.formatPrice(s.precio_base)}</td>
        <td>${s.tiempo_estimado || '—'}</td>
        <td>
          <span class="td-status ${s.disponible ? 'td-status--ok' : 'td-status--off'}">
            <i class="fa-solid fa-${s.disponible ? 'check-circle' : 'times-circle'}"></i>
            ${s.disponible ? 'Activo' : 'Inactivo'}
          </span>
        </td>`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="td-error">Error al cargar servicios. Verificá que el servidor esté activo.</td></tr>`;
  } finally {
    loader?.classList.remove('loader--visible');
  }
}

/* ── Modal ─────────────────────────────────────────────────── */
function openModal(contacto) {
  const modal   = document.getElementById('contactoModal');
  const content = document.getElementById('modalContent');
  if (!modal || !content || !contacto) return;

  content.innerHTML = `
    <div class="modal-detail">
      <div class="modal-detail__grid">
        <div>
          <span class="modal-label">Cliente</span>
          <p class="modal-value">${contacto.nombre} ${contacto.apellido}</p>
        </div>
        <div>
          <span class="modal-label">Máquina</span>
          <p class="modal-value">${contacto.tipo_maquina}</p>
        </div>
        <div>
          <span class="modal-label">Email</span>
          <p class="modal-value">
            <a href="mailto:${contacto.email}" class="modal-value--link">${contacto.email}</a>
          </p>
        </div>
        <div>
          <span class="modal-label">Teléfono</span>
          <p class="modal-value">
            <a href="tel:${contacto.telefono}" class="modal-value--link">${contacto.telefono}</a>
          </p>
        </div>
      </div>
      <div>
        <span class="modal-label">Descripción del Problema</span>
        <p class="modal-desc">${contacto.descripcion}</p>
      </div>
      <div class="modal-footer">
        <span class="badge badge--${contacto.estado}">${contacto.estado.replace('_',' ')}</span>
        <span class="modal-meta">${window.PF.formatDate(contacto.created_at)}</span>
      </div>
    </div>`;

  modal.classList.add('modal--open');
}

function closeModal() {
  document.getElementById('contactoModal')?.classList.remove('modal--open');
}

document.getElementById('modalClose')?.addEventListener('click', closeModal);
document.getElementById('modalOverlay')?.addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

/* ── Charts ────────────────────────────────────────────────── */
function renderBarChart(canvasId, labels, data, label) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;

  const colors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

  if (chartMaquinas) chartMaquinas.destroy();
  chartMaquinas = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label,
        data,
        backgroundColor: colors,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
        x: { ticks: { maxRotation: 30 } },
      },
    },
  });
}

function renderDoughnutChart(canvasId, labels, data) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;

  const ESTADO_COLORS = {
    nuevo: '#2563EB', en_proceso: '#D97706', resuelto: '#16A34A', cerrado: '#CBD5E0',
  };
  const colors = labels.map(l => ESTADO_COLORS[l] || '#E55F0A');

  if (chartEstados) chartEstados.destroy();
  chartEstados = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.map(l => l.replace('_', ' ')),
      datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }],
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } },
      },
    },
  });
}

function renderVisitasChart() {
  const v = window._visitasData;
  if (!v || v.labels.length === 0) return;

  const ctx = document.getElementById('chartVisitas')?.getContext('2d');
  if (!ctx) return;

  if (chartVisitas) chartVisitas.destroy();
  chartVisitas = new Chart(ctx, {
    type: 'line',
    data: {
      labels: v.labels,
      datasets: [{
        label: 'Visitas',
        data: v.data,
        fill: true,
        backgroundColor: 'rgba(229,95,10,0.1)',
        borderColor: '#E55F0A',
        tension: 0.4,
        pointBackgroundColor: '#E55F0A',
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
      },
    },
  });
}

/* ── Helpers ───────────────────────────────────────────────── */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '—';
}

function fetchAuth(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('pf_token')}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`${API}${path}`, opts);
}
