/**
 * admin.js — PowerFix v2
 * Panel interno: Órdenes, Agenda, Mecánicos, Inventario, Clientes, Servicios, Usuarios
 */

const API = window.PF?.API_URL || 'http://localhost:8000';

let _mecanicos = [];
let _visitasData = null;
let chartEstadosOT = null;
let chartMaquinas  = null;
let chartVisitas   = null;
const CHART_COLORS = ['#E55F0A','#1E2D3D','#2563EB','#16A34A','#D97706','#DC2626','#7C3AED','#0891B2'];

const LABEL_ORDEN = {
  recibido: 'Recibido', diagnosticando: 'Diagnosticando', reparando: 'Reparando',
  listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado',
};
const LABEL_TURNO = {
  agendado: 'Agendado', confirmado: 'Confirmado', en_curso: 'En Curso',
  completado: 'Completado', no_show: 'No Show',
};
const LABEL_ROL = { admin: 'Administrador', empleado: 'Empleado', cliente: 'Cliente' };

/* ── Helpers ──────────────────────────────────────────────────── */
function todayStr() { return new Date().toISOString().split('T')[0]; }

/* ── Toast & Confirm helpers ──────────────────────────────────── */
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast toast--${type} toast--visible`;
  setTimeout(() => { el.classList.remove('toast--visible'); }, 3500);
}

function showConfirm(title, text) {
  return new Promise(resolve => {
    const modal = document.getElementById('confirmModal');
    if (!modal) { resolve(confirm(text)); return; }
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmText').textContent  = text;
    modal.classList.add('confirm-modal--open');
    const cleanup = () => {
      modal.classList.remove('confirm-modal--open');
      document.getElementById('confirmYes')?.removeEventListener('click', onYes);
      document.getElementById('confirmNo')?.removeEventListener('click',  onNo);
    };
    const onYes = () => { cleanup(); resolve(true); };
    const onNo  = () => { cleanup(); resolve(false); };
    document.getElementById('confirmYes')?.addEventListener('click', onYes);
    document.getElementById('confirmNo')?.addEventListener('click',  onNo);
  });
}

/* ══════════════════════════════════════════════════════════════
   INIT — ÚNICO listener DOMContentLoaded
   ══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('pf_token');
  const user  = (() => { try { return JSON.parse(localStorage.getItem('pf_user')); } catch { return null; } })();

  if (!token || !user || user.rol !== 'admin') {
    window.location.replace('login.html');
    return;
  }

  document.getElementById('authLoader')?.setAttribute('hidden', '');
  document.getElementById('adminLayout')?.removeAttribute('hidden');

  const ini = `${user.nombre?.[0] || ''}${user.apellido?.[0] || ''}`.toUpperCase();
  setText('userAvatar', ini);
  setText('userName',   `${user.nombre} ${user.apellido}`);
  setText('userRole',   user.rol);

  const hoy = new Date().toLocaleDateString('es-AR', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const hoyFmt = hoy.charAt(0).toUpperCase() + hoy.slice(1);
  setText('topbarDate', hoyFmt);
  setText('dashDate', hoyFmt);

  initSidebar();
  initTheme();

  /* Escape → cerrar modales */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    ['ordenModal','turnoModal','mecanicoModal','repuestoModal','stockModal',
     'servicioModal','contactoModal'].forEach(id => {
      document.getElementById(id)?.classList.remove('modal--open');
    });
  });

  /* Logout */
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('pf_token');
    localStorage.removeItem('pf_user');
    window.location.replace('login.html');
  });

  /* ── ÓRDENES ─────────────────────────────────────────────── */
  document.getElementById('ordenesBody')?.addEventListener('click',  handleOrdenAction);
  document.getElementById('ordenesBody')?.addEventListener('change', handleOrdenAction);
  document.getElementById('nuevaOrdenBtn')?.addEventListener('click', () => openOrdenModal());
  document.getElementById('filtroOrdenEstado')?.addEventListener('change', e => loadOrdenes(e.target.value));
  document.getElementById('ordenModalClose')?.addEventListener('click',   closeOrdenModal);
  document.getElementById('ordenModalCancel')?.addEventListener('click',  closeOrdenModal);
  document.getElementById('ordenModalOverlay')?.addEventListener('click', closeOrdenModal);
  document.getElementById('oCostoMO')?.addEventListener('input',  updateOrdenTotal);
  document.getElementById('oCostoRep')?.addEventListener('input', updateOrdenTotal);
  document.getElementById('ordenForm')?.addEventListener('submit', submitOrdenForm);

  /* ── AGENDA ───────────────────────────────────────────────── */
  document.getElementById('agendaBody')?.addEventListener('click',  handleAgendaAction);
  document.getElementById('agendaBody')?.addEventListener('change', handleAgendaAction);
  document.getElementById('nuevoTurnoBtn')?.addEventListener('click', () => openTurnoModal());
  document.getElementById('turnoModalClose')?.addEventListener('click',   closeTurnoModal);
  document.getElementById('turnoModalCancel')?.addEventListener('click',  closeTurnoModal);
  document.getElementById('turnoModalOverlay')?.addEventListener('click', closeTurnoModal);
  document.getElementById('turnoForm')?.addEventListener('submit', submitTurnoForm);

  /* ── MECÁNICOS ────────────────────────────────────────────── */
  document.getElementById('mecanicosBody')?.addEventListener('click', handleMecanicoAction);
  document.getElementById('nuevoMecanicoBtn')?.addEventListener('click', () => openMecanicoModal());
  document.getElementById('mecanicoModalClose')?.addEventListener('click',   closeMecanicoModal);
  document.getElementById('mecanicoModalCancel')?.addEventListener('click',  closeMecanicoModal);
  document.getElementById('mecanicoModalOverlay')?.addEventListener('click', closeMecanicoModal);
  document.getElementById('mecanicoForm')?.addEventListener('submit', submitMecanicoForm);

  /* ── INVENTARIO ──────────────────────────────────────────── */
  document.getElementById('inventarioBody')?.addEventListener('click', handleInventarioAction);
  document.getElementById('nuevoRepuestoBtn')?.addEventListener('click', () => openRepuestoModal());
  document.getElementById('stockModalClose')?.addEventListener('click',  closeStockModal);
  document.getElementById('stockModalCancel')?.addEventListener('click', closeStockModal);
  document.getElementById('stockModalOverlay')?.addEventListener('click',closeStockModal);
  document.getElementById('stockConfirmar')?.addEventListener('click', confirmAjusteStock);
  document.getElementById('repuestoModalClose')?.addEventListener('click',   closeRepuestoModal);
  document.getElementById('repuestoModalCancel')?.addEventListener('click',  closeRepuestoModal);
  document.getElementById('repuestoModalOverlay')?.addEventListener('click', closeRepuestoModal);
  document.getElementById('repuestoForm')?.addEventListener('submit', submitRepuestoForm);

  /* ── CLIENTES ─────────────────────────────────────────────── */
  document.getElementById('recargarClientes')?.addEventListener('click', loadClientes);
  document.getElementById('clientesBuscar')?.addEventListener('input', debounce(() => loadClientes(), 300));
  document.getElementById('recargarContactos')?.addEventListener('click', () => loadContactos());
  document.getElementById('contactosBuscar')?.addEventListener('input', debounce(() => loadContactos(), 300));
  document.getElementById('contactosEstado')?.addEventListener('change', () => loadContactos());
  document.getElementById('contactosBody')?.addEventListener('click', handleContactoAction);
  document.getElementById('contactoModalClose')?.addEventListener('click', closeContactoModal);
  document.getElementById('contactoModalCancel')?.addEventListener('click', closeContactoModal);
  document.getElementById('contactoModalOverlay')?.addEventListener('click', closeContactoModal);
  document.getElementById('contactoForm')?.addEventListener('submit', submitContactoForm);

  /* ── SERVICIOS ────────────────────────────────────────────── */
  document.getElementById('serviciosBody')?.addEventListener('click', handleServicioAction);
  document.getElementById('nuevoServicioBtn')?.addEventListener('click', () => openServicioModal());

  /* ── QUICK ACTIONS ─────────────────────────────────────────── */
  document.getElementById('quickOrdenBtn')?.addEventListener('click', () => {
    document.querySelector('[data-panel="ordenes"]')?.click();
    openOrdenModal();
  });
  document.getElementById('quickTurnoBtn')?.addEventListener('click', () => {
    document.querySelector('[data-panel="agenda"]')?.click();
    openTurnoModal();
  });
  document.getElementById('quickServicioBtn')?.addEventListener('click', () => {
    document.querySelector('[data-panel="servicios"]')?.click();
    openServicioModal();
  });
  document.getElementById('quickRepuestoBtn')?.addEventListener('click', () => {
    document.querySelector('[data-panel="inventario"]')?.click();
    openRepuestoModal();
  });
  document.getElementById('dashVerOrdenes')?.addEventListener('click', () => {
    document.querySelector('[data-panel="ordenes"]')?.click();
  });
  document.getElementById('dashVerAgenda')?.addEventListener('click', () => {
    document.querySelector('[data-panel="agenda"]')?.click();
  });
  document.getElementById('servicioModalClose')?.addEventListener('click',   closeServicioModal);
  document.getElementById('servicioModalCancel')?.addEventListener('click',  closeServicioModal);
  document.getElementById('servicioModalOverlay')?.addEventListener('click', closeServicioModal);
  document.getElementById('servicioForm')?.addEventListener('submit', submitServicioForm);

  /* Cargar mecánicos en cache y luego datos */
  await refreshMecanicosCache();
  await Promise.all([
    loadDashboard(), loadOrdenes(), loadAgenda(), loadMecanicos(),
    loadInventario(), loadClientes(), loadContactos(), loadServicios(),
  ]);
});

/* ── Sidebar ─────────────────────────────────────────────────── */
function initSidebar() {
  const TITLES = {
    dashboard:  'Dashboard',
    ordenes:    'Órdenes de Trabajo',
    agenda:     'Agenda de Turnos',
    mecanicos:  'Mecánicos',
    inventario: 'Inventario de Repuestos',
    clientes:   'Clientes',
    contactos:  'Contactos / Leads',
    servicios:  'Catálogo de Servicios',
    analytics:  'Analítica',
  };

  const items  = document.querySelectorAll('.sidebar__item[data-panel]');
  const panels = document.querySelectorAll('.admin-panel');
  const title  = document.getElementById('topbarTitle');

  items.forEach(item => {
    item.addEventListener('click', () => {
      const panel = item.dataset.panel;
      items.forEach(i  => i.classList.remove('sidebar__item--active'));
      panels.forEach(p => p.classList.remove('admin-panel--active'));
      item.classList.add('sidebar__item--active');
      document.getElementById(`panel-${panel}`)?.classList.add('admin-panel--active');
      if (title) title.textContent = TITLES[panel] || panel;
      if (panel === 'analytics') renderVisitasChart();
    });
  });

  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('sidebar--open');
  });
}

function initTheme() {
  const toggle = document.getElementById('themeToggle');
  const icon   = document.getElementById('themeIcon');
  if (!toggle) return;
  const saved = localStorage.getItem('pf_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  icon.className = saved === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  toggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('pf_theme', next);
    icon.className = next === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  });
}

/* ══════════════════════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════════════════════ */
async function loadDashboard() {
  try {
    const [sr, cr] = await Promise.all([fetchAuth('/api/stats'), fetchAuth('/api/stats/charts')]);
    if (!sr.ok || !cr.ok) throw new Error();
    const s = await sr.json();
    const c = await cr.json();

    setText('statOrdenesActivas',  s.ordenes_activas);
    setText('statOrdenesHoy',      s.ordenes_hoy);
    setText('statOrdenesListas',   s.ordenes_listas);
    setText('statMecanicos',       s.mecanicos_activos);
    setText('statTurnosPendientes',s.turnos_pendientes);
    setText('statTurnosHoy',       s.turnos_hoy);
    setText('statStockBajo',       s.repuestos_bajo_stock);
    setText('statTotalOrdenes',    s.total_ordenes);

    setText('ordenesBadge', s.ordenes_activas);
    setText('agendaBadge',  s.turnos_pendientes);
    setText('stockBadge',   s.repuestos_bajo_stock);

    renderDoughnutChart('chartEstadosOT', c.estados.labels, c.estados.data);
    renderBarChart('chartMaquinas',       c.maquinas.labels, c.maquinas.data, 'Consultas');
    _visitasData = c.visitas;
  } catch { /* dashboard no crítico */ }
  loadDashboardActivity();
}

async function loadDashboardActivity() {
  const ordBody = document.getElementById('dashOrdenesBody');
  const turBody = document.getElementById('dashTurnosBody');

  try {
    const res = await fetchAuth('/api/ordenes');
    if (res.ok) {
      const ordenes = await res.json();
      if (!ordenes.length) {
        if (ordBody) ordBody.innerHTML = '<tr><td colspan="5" class="td-empty">No hay órdenes registradas.</td></tr>';
      } else if (ordBody) {
        ordBody.innerHTML = '';
        ordenes.slice(0, 6).forEach(o => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><span class="ot-numero">${o.numero || '#'+o.id}</span></td>
            <td><strong>${o.cliente_nombre}</strong></td>
            <td>${truncate(o.vehiculo, 26)}</td>
            <td><span class="badge badge--${o.estado}">${LABEL_ORDEN[o.estado] || o.estado}</span></td>
            <td class="td-muted">${formatDateShort(o.created_at)}</td>`;
          ordBody.appendChild(tr);
        });
      }
    }
  } catch {
    if (ordBody) ordBody.innerHTML = '<tr><td colspan="5" class="td-error">Error al cargar.</td></tr>';
  }

  try {
    const res = await fetchAuth('/api/turnos');
    if (res.ok) {
      const turnos = await res.json();
      if (!turnos.length) {
        if (turBody) turBody.innerHTML = '<tr><td colspan="4" class="td-empty">No hay turnos registrados.</td></tr>';
      } else if (turBody) {
        turBody.innerHTML = '';
        turnos.slice(0, 6).forEach(t => {
          const fechaFmt = t.fecha
            ? new Date(t.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' })
            : '—';
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${fechaFmt}</strong><div class="td-muted">${t.hora}</div></td>
            <td>${t.cliente_nombre}</td>
            <td>${truncate(t.vehiculo, 20)}</td>
            <td><span class="badge badge--${t.estado}">${LABEL_TURNO[t.estado] || t.estado}</span></td>`;
          turBody.appendChild(tr);
        });
      }
    }
  } catch {
    if (turBody) turBody.innerHTML = '<tr><td colspan="4" class="td-error">Error al cargar.</td></tr>';
  }
}

/* ══════════════════════════════════════════════════════════════
   ÓRDENES DE TRABAJO
   ══════════════════════════════════════════════════════════════ */
async function loadOrdenes(estado = '') {
  const tbody = document.getElementById('ordenesBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" class="td-empty">Cargando...</td></tr>';

  try {
    const url = estado ? `/api/ordenes?estado=${estado}` : '/api/ordenes';
    const res = await fetchAuth(url);
    if (!res.ok) throw new Error();
    const ordenes = await res.json();

    if (!ordenes.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="td-empty">No hay órdenes. Creá la primera con "Nueva Orden".</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    ordenes.forEach(o => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <span class="ot-numero">${o.numero || `#${o.id}`}</span>
        </td>
        <td>
          <strong>${o.cliente_nombre}</strong>
          ${o.cliente_telefono ? `<div class="td-muted">${o.cliente_telefono}</div>` : ''}
        </td>
        <td title="${o.vehiculo}">${truncate(o.vehiculo, 32)}</td>
        <td>${o.mecanico_nombre || '<span class="td-muted">Sin asignar</span>'}</td>
        <td><span class="badge badge--prioridad-${o.prioridad}">${o.prioridad}</span></td>
        <td>
          <select class="select-estado" data-id="${o.id}" data-action="orden-estado" aria-label="Estado">
            ${Object.entries(LABEL_ORDEN).map(([v,l]) =>
              `<option value="${v}" ${o.estado===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </td>
        <td class="td-muted">${formatDateShort(o.created_at)}</td>
        <td class="td-actions">
          <button class="btn btn--sm btn--view" data-id="${o.id}" data-action="orden-edit" title="Editar">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn--sm btn--delete" data-id="${o.id}" data-action="orden-delete" title="Eliminar">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>`;
      tr._data = o;
      tbody.appendChild(tr);
    });
  } catch {
    tbody.innerHTML = '<tr><td colspan="8" class="td-error">Error al cargar órdenes.</td></tr>';
  }
}

async function handleOrdenAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  const tr = btn.closest('tr');

  if (btn.dataset.action === 'orden-edit') return openOrdenModal(tr._data);

  if (btn.dataset.action === 'orden-estado') {
    try {
      const r = await fetchAuth(`/api/ordenes/${id}/estado`, 'PATCH', { estado: btn.value });
      if (!r.ok) throw new Error();
      if (tr._data) tr._data.estado = btn.value;
    } catch { showToast('No se pudo actualizar el estado.', 'error'); }
    return;
  }

  if (btn.dataset.action === 'orden-delete') {
    const ok = await showConfirm('Eliminar Orden', '¿Eliminar esta orden de trabajo? Esta acción no se puede deshacer.');
    if (!ok) return;
    try {
      const r = await fetchAuth(`/api/ordenes/${id}`, 'DELETE');
      if (!r.ok) throw new Error();
      tr.remove();
      loadDashboard();
      showToast('Orden eliminada.', 'success');
    } catch { showToast('No se pudo eliminar la orden.', 'error'); }
  }
}

function openOrdenModal(orden = null) {
  const modal = document.getElementById('ordenModal');
  if (!modal) return;
  document.getElementById('ordenForm').reset();
  populateMecanicoSelect('oMecanico');

  if (orden) {
    document.getElementById('ordenModalTitle').textContent = `Editar ${orden.numero || 'Orden'}`;
    document.getElementById('ordenId').value       = orden.id;
    document.getElementById('oNombre').value       = orden.cliente_nombre;
    document.getElementById('oTelefono').value     = orden.cliente_telefono || '';
    document.getElementById('oEmail').value        = orden.cliente_email    || '';
    document.getElementById('oVehiculo').value     = orden.vehiculo;
    document.getElementById('oProblema').value     = orden.descripcion_problema;
    document.getElementById('oDiagnostico').value  = orden.diagnostico     || '';
    document.getElementById('oTrabajo').value      = orden.trabajo_realizado || '';
    document.getElementById('oMecanico').value     = orden.mecanico_id     || '';
    document.getElementById('oPrioridad').value    = orden.prioridad       || 'normal';
    document.getElementById('oEstado').value       = orden.estado          || 'recibido';
    document.getElementById('oCostoMO').value      = orden.costo_mano_obra || 0;
    document.getElementById('oCostoRep').value     = orden.costo_repuestos || 0;
    document.getElementById('oFechaEst').value     = orden.fecha_estimada  || '';
    document.getElementById('oNotas').value        = orden.notas_internas  || '';
    updateOrdenTotal();
  } else {
    document.getElementById('ordenModalTitle').textContent = 'Nueva Orden de Trabajo';
    document.getElementById('ordenId').value = '';
    document.getElementById('oFechaEst').min = todayStr();
  }
  modal.classList.add('modal--open');
}

function closeOrdenModal() { document.getElementById('ordenModal')?.classList.remove('modal--open'); }

function updateOrdenTotal() {
  const mo  = parseFloat(document.getElementById('oCostoMO')?.value)  || 0;
  const rep = parseFloat(document.getElementById('oCostoRep')?.value) || 0;
  const el  = document.getElementById('oTotal');
  if (el) el.textContent = formatPrice(mo + rep);
}

async function submitOrdenForm(e) {
  e.preventDefault();
  const id  = document.getElementById('ordenId').value;
  const btn = document.getElementById('ordenFormSubmit');
  const txt = document.getElementById('ordenSubmitText');

  const nombre   = document.getElementById('oNombre').value.trim();
  const vehiculo = document.getElementById('oVehiculo').value.trim();
  const problema = document.getElementById('oProblema').value.trim();
  if (!nombre || !vehiculo || !problema) {
    showToast('Completá nombre, equipo y descripción del problema.', 'warning');
    return;
  }

  const mecId    = parseInt(document.getElementById('oMecanico').value) || null;
  const mecFound = mecId ? _mecanicos.find(m => m.id === mecId) : null;
  const mecNombre = mecFound ? `${mecFound.nombre} ${mecFound.apellido}` : null;

  const mo  = parseFloat(document.getElementById('oCostoMO').value)  || 0;
  const rep = parseFloat(document.getElementById('oCostoRep').value) || 0;

  const payload = {
    cliente_nombre:       nombre,
    cliente_telefono:     document.getElementById('oTelefono').value.trim() || null,
    cliente_email:        document.getElementById('oEmail').value.trim()    || null,
    vehiculo,
    descripcion_problema: problema,
    diagnostico:          document.getElementById('oDiagnostico').value.trim() || null,
    trabajo_realizado:    document.getElementById('oTrabajo').value.trim()     || null,
    mecanico_id:          mecId, mecanico_nombre: mecNombre,
    prioridad:            document.getElementById('oPrioridad').value,
    estado:               document.getElementById('oEstado').value,
    costo_mano_obra:      mo, costo_repuestos: rep, costo_total: mo + rep,
    fecha_estimada:       document.getElementById('oFechaEst').value || null,
    notas_internas:       document.getElementById('oNotas').value.trim() || null,
  };

  btn.disabled = true; txt.textContent = 'Guardando...';
  try {
    const res = id
      ? await fetchAuth(`/api/ordenes/${id}`, 'PUT',  payload)
      : await fetchAuth('/api/ordenes',        'POST', payload);
    if (!res.ok) { const d = await res.json().catch(()=>({})); throw new Error(d.detail || `Error ${res.status}`); }
    closeOrdenModal();
    await Promise.all([loadOrdenes(document.getElementById('filtroOrdenEstado').value), loadDashboard()]);
    showToast('Orden guardada.', 'success');
  } catch (err) {
    showToast(`No se pudo guardar: ${err.message}`, 'error');
  } finally {
    btn.disabled = false; txt.textContent = 'Guardar Orden';
  }
}

/* ══════════════════════════════════════════════════════════════
   AGENDA DE TURNOS
   ══════════════════════════════════════════════════════════════ */
async function loadAgenda() {
  const tbody = document.getElementById('agendaBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="td-empty">Cargando...</td></tr>';

  try {
    const res = await fetchAuth('/api/turnos');
    if (!res.ok) throw new Error();
    const turnos = await res.json();

    if (!turnos.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="td-empty">No hay turnos. Agendá el primero.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    turnos.forEach(t => {
      const tr = document.createElement('tr');
      const fechaFmt = t.fecha
        ? new Date(t.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' })
        : '—';
      tr.innerHTML = `
        <td><strong>${fechaFmt}</strong><div class="td-muted">${t.hora}</div></td>
        <td><strong>${t.cliente_nombre}</strong>${t.cliente_telefono ? `<div class="td-muted">${t.cliente_telefono}</div>` : ''}</td>
        <td>${t.vehiculo}</td>
        <td>${t.servicio}</td>
        <td>${t.mecanico || '<span class="td-muted">—</span>'}</td>
        <td>
          <select class="select-estado" data-id="${t.id}" data-action="turno-estado" aria-label="Estado turno">
            ${Object.entries(LABEL_TURNO).map(([v,l]) =>
              `<option value="${v}" ${t.estado===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </td>
        <td class="td-actions">
          <button class="btn btn--sm btn--view" data-id="${t.id}" data-action="turno-edit" title="Editar"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn--sm btn--delete" data-id="${t.id}" data-action="turno-delete" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
        </td>`;
      tr._data = t;
      tbody.appendChild(tr);
    });
  } catch {
    tbody.innerHTML = '<tr><td colspan="7" class="td-error">Error al cargar agenda.</td></tr>';
  }
}

async function handleAgendaAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  const tr = btn.closest('tr');

  if (btn.dataset.action === 'turno-edit') return openTurnoModal(tr._data);

  if (btn.dataset.action === 'turno-estado') {
    try {
      const r = await fetchAuth(`/api/turnos/${id}/estado`, 'PATCH', { estado: btn.value });
      if (!r.ok) throw new Error();
      if (tr._data) tr._data.estado = btn.value;
    } catch { showToast('No se pudo actualizar el estado.', 'error'); }
    return;
  }

  if (btn.dataset.action === 'turno-delete') {
    const ok = await showConfirm('Eliminar Turno', '¿Eliminar este turno?');
    if (!ok) return;
    try {
      const r = await fetchAuth(`/api/turnos/${id}`, 'DELETE');
      if (!r.ok) throw new Error();
      tr.remove();
      showToast('Turno eliminado.', 'success');
    } catch { showToast('No se pudo eliminar el turno.', 'error'); }
  }
}

function openTurnoModal(turno = null) {
  const modal = document.getElementById('turnoModal');
  if (!modal) return;
  document.getElementById('turnoForm').reset();
  populateMecanicoSelect('tMecanico');

  if (turno) {
    document.getElementById('turnoModalTitle').textContent = 'Editar Turno';
    document.getElementById('turnoId').value      = turno.id;
    document.getElementById('tNombre').value      = turno.cliente_nombre;
    document.getElementById('tTelefono').value    = turno.cliente_telefono || '';
    document.getElementById('tEmail').value       = turno.cliente_email    || '';
    document.getElementById('tVehiculo').value    = turno.vehiculo;
    document.getElementById('tServicio').value    = turno.servicio;
    document.getElementById('tFecha').value       = turno.fecha;
    document.getElementById('tHora').value        = turno.hora;
    /* Seleccionar mecánico por nombre (turno guarda el nombre, no el ID) */
    const mecSel = document.getElementById('tMecanico');
    if (mecSel && turno.mecanico) {
      const opt = Array.from(mecSel.options).find(o => o.text === turno.mecanico);
      if (opt) mecSel.value = opt.value;
    }
    document.getElementById('tNotas').value = turno.notas || '';
  } else {
    document.getElementById('turnoModalTitle').textContent = 'Nuevo Turno';
    document.getElementById('turnoId').value = '';
    const hoy = todayStr();
    document.getElementById('tFecha').value  = hoy;
    document.getElementById('tFecha').min    = hoy;
  }
  modal.classList.add('modal--open');
}

function closeTurnoModal() { document.getElementById('turnoModal')?.classList.remove('modal--open'); }

async function submitTurnoForm(e) {
  e.preventDefault();
  const id  = document.getElementById('turnoId').value;
  const btn = document.getElementById('turnoFormSubmit');
  const txt = document.getElementById('turnoSubmitText');

  const nombre   = document.getElementById('tNombre').value.trim();
  const vehiculo = document.getElementById('tVehiculo').value.trim();
  const servicio = document.getElementById('tServicio').value.trim();
  const fecha    = document.getElementById('tFecha').value;
  const hora     = document.getElementById('tHora').value;
  if (!nombre || !vehiculo || !servicio || !fecha || !hora) {
    showToast('Completá los campos obligatorios.', 'warning'); return;
  }

  const mecSel   = document.getElementById('tMecanico');
  const mecNombre = mecSel.value ? mecSel.options[mecSel.selectedIndex].text : null;

  const payload = {
    cliente_nombre: nombre, cliente_telefono: document.getElementById('tTelefono').value.trim() || null,
    cliente_email:  document.getElementById('tEmail').value.trim() || null,
    vehiculo, servicio, fecha, hora, mecanico: mecNombre,
    notas: document.getElementById('tNotas').value.trim() || null,
  };

  btn.disabled = true; txt.textContent = 'Guardando...';
  try {
    const res = id
      ? await fetchAuth(`/api/turnos/${id}`, 'PUT',  payload)
      : await fetchAuth('/api/turnos',        'POST', payload);
    if (!res.ok) throw new Error((await res.json().catch(()=>({}))).detail || `Error ${res.status}`);
    closeTurnoModal();
    await loadAgenda();
    showToast('Turno guardado.', 'success');
  } catch (err) {
    showToast(`No se pudo guardar: ${err.message}`, 'error');
  } finally {
    btn.disabled = false; txt.textContent = 'Guardar Turno';
  }
}

/* ══════════════════════════════════════════════════════════════
   MECÁNICOS
   ══════════════════════════════════════════════════════════════ */
async function refreshMecanicosCache() {
  try {
    const res = await fetchAuth('/api/mecanicos');
    if (res.ok) _mecanicos = await res.json();
  } catch { /* silencioso */ }
}

function populateMecanicoSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const current = sel.value;
  while (sel.options.length > 1) sel.remove(1);
  _mecanicos.filter(m => m.activo).forEach(m => {
    const opt = new Option(`${m.nombre} ${m.apellido}`, m.id);
    sel.appendChild(opt);
  });
  if (current) sel.value = current;
}

async function loadMecanicos() {
  const tbody = document.getElementById('mecanicosBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="td-empty">Cargando...</td></tr>';

  try {
    const res = await fetchAuth('/api/mecanicos');
    if (!res.ok) throw new Error();
    const mecs = await res.json();
    _mecanicos  = mecs;

    if (!mecs.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="td-empty">No hay mecánicos registrados.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    mecs.forEach(m => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${m.nombre} ${m.apellido}</strong></td>
        <td>${m.telefono || '<span class="td-muted">—</span>'}</td>
        <td>${m.email    || '<span class="td-muted">—</span>'}</td>
        <td>${m.especialidad || '<span class="td-muted">—</span>'}</td>
        <td><span class="badge ${m.activo ? 'badge--activo' : 'badge--inactivo'}">${m.activo ? 'Activo' : 'Inactivo'}</span></td>
        <td class="td-actions">
          <button class="btn btn--sm btn--view" data-id="${m.id}" data-action="mec-edit" title="Editar"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn--sm ${m.activo ? 'btn--deactivate' : 'btn--activate'}" data-id="${m.id}" data-action="mec-toggle" title="${m.activo ? 'Desactivar' : 'Activar'}">
            <i class="fa-solid fa-${m.activo ? 'user-slash' : 'user-check'}"></i>
          </button>
          <button class="btn btn--sm btn--delete" data-id="${m.id}" data-action="mec-delete" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
        </td>`;
      tr._data = m;
      tbody.appendChild(tr);
    });
  } catch {
    tbody.innerHTML = '<tr><td colspan="6" class="td-error">Error al cargar mecánicos.</td></tr>';
  }
}

async function handleMecanicoAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  const tr = btn.closest('tr');

  if (btn.dataset.action === 'mec-edit') openMecanicoModal(tr._data);

  if (btn.dataset.action === 'mec-toggle') {
    try {
      const r = await fetchAuth(`/api/mecanicos/${id}/toggle`, 'PATCH');
      if (!r.ok) throw new Error();
      await loadMecanicos();
    } catch { showToast('No se pudo cambiar el estado.', 'error'); }
  }

  if (btn.dataset.action === 'mec-delete') {
    const ok = await showConfirm('Eliminar Mecánico', '¿Eliminar este mecánico?');
    if (!ok) return;
    try {
      const r = await fetchAuth(`/api/mecanicos/${id}`, 'DELETE');
      if (!r.ok) throw new Error();
      tr.remove();
      await refreshMecanicosCache();
      showToast('Mecánico eliminado.', 'success');
    } catch { showToast('No se pudo eliminar.', 'error'); }
  }
}

function openMecanicoModal(mec = null) {
  const modal = document.getElementById('mecanicoModal');
  if (!modal) return;
  document.getElementById('mecanicoForm').reset();
  if (mec) {
    document.getElementById('mecanicoModalTitle').textContent = 'Editar Mecánico';
    document.getElementById('mecanicoId').value    = mec.id;
    document.getElementById('mNombre').value       = mec.nombre;
    document.getElementById('mApellido').value     = mec.apellido;
    document.getElementById('mTelefono').value     = mec.telefono     || '';
    document.getElementById('mEmail').value        = mec.email        || '';
    document.getElementById('mEspecialidad').value = mec.especialidad || '';
    document.getElementById('mActivo').checked     = mec.activo;
  } else {
    document.getElementById('mecanicoModalTitle').textContent = 'Nuevo Mecánico';
    document.getElementById('mecanicoId').value = '';
  }
  modal.classList.add('modal--open');
}

function closeMecanicoModal() { document.getElementById('mecanicoModal')?.classList.remove('modal--open'); }

async function submitMecanicoForm(e) {
  e.preventDefault();
  const id  = document.getElementById('mecanicoId').value;
  const btn = document.getElementById('mecanicoFormSubmit');
  const txt = document.getElementById('mecanicoSubmitText');
  const nombre   = document.getElementById('mNombre').value.trim();
  const apellido = document.getElementById('mApellido').value.trim();
  if (!nombre || !apellido) { showToast('Nombre y apellido son requeridos.', 'warning'); return; }

  const payload = {
    nombre, apellido,
    telefono:     document.getElementById('mTelefono').value.trim()     || null,
    email:        document.getElementById('mEmail').value.trim()        || null,
    especialidad: document.getElementById('mEspecialidad').value.trim() || null,
    activo:       document.getElementById('mActivo').checked,
  };
  btn.disabled = true; txt.textContent = 'Guardando...';
  try {
    const res = id
      ? await fetchAuth(`/api/mecanicos/${id}`, 'PUT',  payload)
      : await fetchAuth('/api/mecanicos',        'POST', payload);
    if (!res.ok) throw new Error((await res.json().catch(()=>({}))).detail || `Error ${res.status}`);
    closeMecanicoModal();
    await loadMecanicos();
    await loadDashboard();
    showToast('Mecánico guardado.', 'success');
  } catch (err) {
    showToast(`No se pudo guardar: ${err.message}`, 'error');
  } finally { btn.disabled = false; txt.textContent = 'Guardar'; }
}

/* ══════════════════════════════════════════════════════════════
   INVENTARIO / REPUESTOS
   ══════════════════════════════════════════════════════════════ */
let _stockRepuestoId = null;

async function loadInventario() {
  const tbody = document.getElementById('inventarioBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="td-empty">Cargando...</td></tr>';

  try {
    const res = await fetchAuth('/api/inventario');
    if (!res.ok) throw new Error();
    const items = await res.json();

    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="td-empty">No hay repuestos registrados.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    items.forEach(r => {
      const stockClass = r.stock === 0 ? 'stock--critico' : r.stock <= r.stock_minimo ? 'stock--bajo' : 'stock--ok';
      const stockLabel = r.stock === 0 ? 'Sin stock' : r.stock <= r.stock_minimo ? 'Stock bajo' : 'OK';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="ot-numero">${r.codigo}</span></td>
        <td>
          <strong>${r.nombre}</strong>
          ${r.categoria ? `<div class="td-muted">${r.categoria}</div>` : ''}
          ${r.ubicacion ? `<div class="td-muted"><i class="fa-solid fa-location-dot"></i> ${r.ubicacion}</div>` : ''}
        </td>
        <td>
          <span class="stock-badge ${stockClass}">${r.stock}</span>
          <div class="td-muted">${stockLabel}</div>
        </td>
        <td class="td-muted">${r.stock_minimo}</td>
        <td>${formatPrice(r.precio_venta)}</td>
        <td>${r.proveedor || '<span class="td-muted">—</span>'}</td>
        <td class="td-actions">
          <button class="btn btn--sm btn--view" data-id="${r.id}" data-action="rep-edit" title="Editar"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn--sm btn--activate" data-id="${r.id}" data-action="rep-stock" title="Ajustar stock"><i class="fa-solid fa-arrows-up-down"></i></button>
          <button class="btn btn--sm btn--delete" data-id="${r.id}" data-action="rep-delete" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
        </td>`;
      tr._data = r;
      tbody.appendChild(tr);
    });
  } catch {
    tbody.innerHTML = '<tr><td colspan="7" class="td-error">Error al cargar inventario.</td></tr>';
  }
}

async function handleInventarioAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  const tr = btn.closest('tr');

  if (btn.dataset.action === 'rep-edit') return openRepuestoModal(tr._data);
  if (btn.dataset.action === 'rep-stock') return openStockModal(tr._data);

  if (btn.dataset.action === 'rep-delete') {
    const ok = await showConfirm('Eliminar Repuesto', '¿Eliminar este repuesto del inventario?');
    if (!ok) return;
    try {
      const r = await fetchAuth(`/api/inventario/${id}`, 'DELETE');
      if (!r.ok) throw new Error();
      tr.remove();
      loadDashboard();
      showToast('Repuesto eliminado.', 'success');
    } catch { showToast('No se pudo eliminar.', 'error'); }
  }
}

function openRepuestoModal(rep = null) {
  const modal = document.getElementById('repuestoModal');
  if (!modal) return;
  document.getElementById('repuestoForm').reset();
  if (rep) {
    document.getElementById('repuestoModalTitle').textContent = 'Editar Repuesto';
    document.getElementById('repuestoId').value     = rep.id;
    document.getElementById('rCodigo').value        = rep.codigo;
    document.getElementById('rNombre').value        = rep.nombre;
    document.getElementById('rDescripcion').value   = rep.descripcion  || '';
    document.getElementById('rCategoria').value     = rep.categoria    || '';
    document.getElementById('rStock').value         = rep.stock;
    document.getElementById('rStockMin').value      = rep.stock_minimo;
    document.getElementById('rPrecioCosto').value   = rep.precio_costo;
    document.getElementById('rPrecioVenta').value   = rep.precio_venta;
    document.getElementById('rProveedor').value     = rep.proveedor    || '';
    document.getElementById('rUbicacion').value     = rep.ubicacion    || '';
  } else {
    document.getElementById('repuestoModalTitle').textContent = 'Nuevo Repuesto';
    document.getElementById('repuestoId').value = '';
  }
  modal.classList.add('modal--open');
}

function closeRepuestoModal() { document.getElementById('repuestoModal')?.classList.remove('modal--open'); }

async function submitRepuestoForm(e) {
  e.preventDefault();
  const id  = document.getElementById('repuestoId').value;
  const btn = document.getElementById('repuestoFormSubmit');
  const txt = document.getElementById('repuestoSubmitText');
  const codigo = document.getElementById('rCodigo').value.trim();
  const nombre = document.getElementById('rNombre').value.trim();
  if (!codigo || !nombre) { showToast('Código y nombre son requeridos.', 'warning'); return; }

  const payload = {
    codigo, nombre,
    descripcion:  document.getElementById('rDescripcion').value.trim()  || null,
    categoria:    document.getElementById('rCategoria').value.trim()     || null,
    stock:        parseInt(document.getElementById('rStock').value)      || 0,
    stock_minimo: parseInt(document.getElementById('rStockMin').value)   || 5,
    precio_costo: parseFloat(document.getElementById('rPrecioCosto').value) || 0,
    precio_venta: parseFloat(document.getElementById('rPrecioVenta').value) || 0,
    proveedor:    document.getElementById('rProveedor').value.trim()     || null,
    ubicacion:    document.getElementById('rUbicacion').value.trim()     || null,
    activo:       true,
  };
  btn.disabled = true; txt.textContent = 'Guardando...';
  try {
    const res = id
      ? await fetchAuth(`/api/inventario/${id}`, 'PUT',  payload)
      : await fetchAuth('/api/inventario',        'POST', payload);
    if (!res.ok) throw new Error((await res.json().catch(()=>({}))).detail || `Error ${res.status}`);
    closeRepuestoModal();
    await loadInventario();
    await loadDashboard();
    showToast('Repuesto guardado.', 'success');
  } catch (err) {
    showToast(`No se pudo guardar: ${err.message}`, 'error');
  } finally { btn.disabled = false; txt.textContent = 'Guardar'; }
}

function openStockModal(rep) {
  _stockRepuestoId = rep.id;
  setText('stockRepuestoNombre', rep.nombre);
  setText('stockActual', `${rep.stock} unidades`);
  document.getElementById('stockCantidad').value = 1;
  document.getElementById('stockTipo').value = 'entrada';
  document.getElementById('stockModal')?.classList.add('modal--open');
}

function closeStockModal() {
  document.getElementById('stockModal')?.classList.remove('modal--open');
  _stockRepuestoId = null;
}

async function confirmAjusteStock() {
  if (!_stockRepuestoId) return;
  const tipo  = document.getElementById('stockTipo').value;
  const cant  = parseInt(document.getElementById('stockCantidad').value) || 1;
  const delta = tipo === 'entrada' ? cant : -cant;
  try {
    const r = await fetchAuth(`/api/inventario/${_stockRepuestoId}/stock`, 'PATCH', { delta });
    if (!r.ok) { const d = await r.json().catch(()=>({})); throw new Error(d.detail); }
    closeStockModal();
    await loadInventario();
    await loadDashboard();
    showToast('Stock ajustado.', 'success');
  } catch (err) { showToast(`Error al ajustar stock: ${err.message}`, 'error'); }
}

/* ══════════════════════════════════════════════════════════════
   CLIENTES
   ══════════════════════════════════════════════════════════════ */
function filterCliente(cliente, query) {
  if (!query) return true;
  const text = `${cliente.nombre} ${cliente.apellido} ${cliente.email || ''} ${cliente.telefono || ''}`.toLowerCase();
  return text.includes(query);
}

async function loadClientes() {
  const tbody = document.getElementById('clientesBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="td-empty">Cargando...</td></tr>';

  try {
    const res = await fetchAuth('/api/clientes');
    if (!res.ok) throw new Error();
    const clientes = await res.json();
    const query = document.getElementById('clientesBuscar')?.value.trim().toLowerCase() || '';
    const filtered = clientes.filter(cliente => filterCliente(cliente, query));

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="td-empty">No hay clientes que coincidan con la búsqueda.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    filtered.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${c.nombre} ${c.apellido}</strong></td>
        <td><a href="mailto:${c.email}" class="modal-value--link">${c.email}</a></td>
        <td>${c.telefono || '<span class="td-muted">—</span>'}</td>
        <td><span class="badge badge--nuevo">${c.total_consultas}</span></td>
        <td class="td-muted">${window.PF?.formatDate ? window.PF.formatDate(c.ultima_consulta) : formatDateShort(c.ultima_consulta)}</td>`;
      tbody.appendChild(tr);
    });
  } catch {
    tbody.innerHTML = '<tr><td colspan="5" class="td-error">Error al cargar clientes.</td></tr>';
  }
}

/* ══════════════════════════════════════════════════════════════
   SERVICIOS
   ══════════════════════════════════════════════════════════════ */
async function loadServicios() {
  const tbody  = document.getElementById('serviciosBody');
  const loader = document.getElementById('serviciosLoader');
  if (!tbody) return;
  loader?.classList.add('loader--visible');
  tbody.innerHTML = '';

  try {
    const res = await fetchAuth('/api/servicios/admin/all');
    if (!res.ok) throw new Error();
    const svcs = await res.json();
    if (!svcs.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="td-empty">No hay servicios.</td></tr>';
      return;
    }
    svcs.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="td-muted">#${s.id}</td>
        <td><strong>${s.nombre}</strong></td>
        <td><span class="badge badge--nuevo">${s.categoria}</span></td>
        <td>${formatPrice(s.precio_base)}</td>
        <td class="td-muted">${s.tiempo_estimado || '—'}</td>
        <td>
          <span class="td-status ${s.disponible ? 'td-status--ok' : 'td-status--off'}">
            <i class="fa-solid fa-${s.disponible ? 'check-circle' : 'circle-xmark'}"></i>
            ${s.disponible ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td class="td-actions">
          <button class="btn btn--sm btn--view" data-id="${s.id}" data-action="svc-edit" title="Editar"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn--sm ${s.disponible ? 'btn--deactivate' : 'btn--activate'}" data-id="${s.id}" data-action="svc-toggle" title="${s.disponible ? 'Desactivar' : 'Activar'}">
            <i class="fa-solid fa-${s.disponible ? 'eye-slash' : 'eye'}"></i>
          </button>
          <button class="btn btn--sm btn--delete" data-id="${s.id}" data-action="svc-delete" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
        </td>`;
      tr._data = s;
      tbody.appendChild(tr);
    });
  } catch {
    tbody.innerHTML = '<tr><td colspan="7" class="td-error">Error al cargar servicios.</td></tr>';
  } finally {
    loader?.classList.remove('loader--visible');
  }
}

async function handleServicioAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  const tr = btn.closest('tr');

  if (btn.dataset.action === 'svc-edit') return openServicioModal(tr._data);

  if (btn.dataset.action === 'svc-toggle') {
    const s = tr._data;
    const payload = { ...s, disponible: !s.disponible };
    try {
      const r = await fetchAuth(`/api/servicios/${id}`, 'PUT', payload);
      if (!r.ok) throw new Error();
      await loadServicios();
    } catch { showToast('No se pudo cambiar el estado.', 'error'); }
    return;
  }

  if (btn.dataset.action === 'svc-delete') {
    const ok = await showConfirm('Eliminar Servicio', '¿Eliminar este servicio del catálogo?');
    if (!ok) return;
    try {
      const r = await fetchAuth(`/api/servicios/${id}`, 'DELETE');
      if (!r.ok) throw new Error();
      tr.remove();
      showToast('Servicio eliminado.', 'success');
    } catch { showToast('No se pudo eliminar.', 'error'); }
  }
}

function openServicioModal(svc = null) {
  const modal = document.getElementById('servicioModal');
  if (!modal) return;
  document.getElementById('servicioForm').reset();
  if (svc) {
    document.getElementById('servicioModalTitle').textContent = 'Editar Servicio';
    document.getElementById('servicioId').value      = svc.id;
    document.getElementById('svcNombre').value       = svc.nombre;
    document.getElementById('svcCategoria').value    = svc.categoria;
    document.getElementById('svcDescripcion').value  = svc.descripcion;
    document.getElementById('svcPrecio').value       = svc.precio_base;
    document.getElementById('svcTiempo').value       = svc.tiempo_estimado || '';
    document.getElementById('svcImagen').value       = svc.imagen_path;
    document.getElementById('svcDisponible').checked = svc.disponible;
  } else {
    document.getElementById('servicioModalTitle').textContent = 'Nuevo Servicio';
    document.getElementById('servicioId').value      = '';
    document.getElementById('svcDisponible').checked = true;
  }
  modal.classList.add('modal--open');
}

function closeServicioModal() { document.getElementById('servicioModal')?.classList.remove('modal--open'); }

async function submitServicioForm(e) {
  e.preventDefault();
  const id   = document.getElementById('servicioId').value;
  const btn  = document.getElementById('servicioFormSubmit');
  const txt  = document.getElementById('servicioSubmitText');
  const nom  = document.getElementById('svcNombre').value.trim();
  const cat  = document.getElementById('svcCategoria').value;
  const desc = document.getElementById('svcDescripcion').value.trim();
  const prec = parseFloat(document.getElementById('svcPrecio').value);
  const img  = document.getElementById('svcImagen').value.trim();
  if (!nom || !cat || !desc || isNaN(prec) || !img) { showToast('Completá todos los campos obligatorios (*)', 'warning'); return; }

  const payload = {
    nombre: nom, categoria: cat, descripcion: desc, precio_base: prec,
    imagen_path: img,
    tiempo_estimado: document.getElementById('svcTiempo').value.trim() || null,
    disponible: document.getElementById('svcDisponible').checked,
  };
  btn.disabled = true; txt.textContent = 'Guardando...';
  try {
    const res = id
      ? await fetchAuth(`/api/servicios/${id}`, 'PUT',  payload)
      : await fetchAuth('/api/servicios',        'POST', payload);
    if (!res.ok) throw new Error((await res.json().catch(()=>({}))).detail || `Error ${res.status}`);
    closeServicioModal();
    await loadServicios();
    showToast('Servicio guardado.', 'success');
  } catch (err) {
    showToast(`No se pudo guardar: ${err.message}`, 'error');
  } finally { btn.disabled = false; txt.textContent = 'Guardar Servicio'; }
}

/* ══════════════════════════════════════════════════════════════
   CONTACTOS / LEADS
   ══════════════════════════════════════════════════════════════ */
async function loadContactos() {
  const tbody  = document.getElementById('contactosBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="td-empty">Cargando...</td></tr>';

  const estado = document.getElementById('contactosEstado')?.value || '';
  const busqueda = document.getElementById('contactosBuscar')?.value.trim() || '';
  const queryParts = [];
  if (estado) queryParts.push(`estado=${encodeURIComponent(estado)}`);
  if (busqueda) queryParts.push(`q=${encodeURIComponent(busqueda)}`);
  const url = `/api/contactos${queryParts.length ? `?${queryParts.join('&')}` : ''}`;

  try {
    const res = await fetchAuth(url);
    if (!res.ok) throw new Error();
    const contactos = await res.json();

    if (!contactos.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="td-empty">No hay contactos que coincidan con la búsqueda.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    contactos.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${c.nombre} ${c.apellido}</strong></td>
        <td><a href="mailto:${c.email}" class="modal-value--link">${c.email}</a></td>
        <td>${c.telefono || '<span class="td-muted">—</span>'}</td>
        <td title="${c.tipo_maquina}">${truncate(c.tipo_maquina, 24)}</td>
        <td><span class="badge badge--${c.estado}">${c.estado.replace(/_/g, ' ')}</span></td>
        <td class="td-muted">${formatDateShort(c.created_at)}</td>
        <td class="td-actions">
          <button class="btn btn--sm btn--view" data-id="${c.id}" data-action="contacto-edit" title="Editar"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn--sm btn--delete" data-id="${c.id}" data-action="contacto-delete" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
        </td>`;
      tr._data = c;
      tbody.appendChild(tr);
    });
  } catch {
    tbody.innerHTML = '<tr><td colspan="7" class="td-error">Error al cargar contactos.</td></tr>';
  }
}

function handleContactoAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  const tr = btn.closest('tr');

  if (btn.dataset.action === 'contacto-edit') {
    return openContactoModal(tr._data);
  }

  if (btn.dataset.action === 'contacto-delete') {
    return showConfirm('Eliminar contacto', '¿Deseas eliminar este contacto? Esta acción es irreversible.')
      .then(async ok => {
        if (!ok) return;
        const res = await fetchAuth(`/api/contactos/${id}`, 'DELETE');
        if (!res.ok) throw new Error();
        await loadContactos();
        showToast('Contacto eliminado.', 'success');
      })
      .catch(() => showToast('No se pudo eliminar el contacto.', 'error'));
  }
}

function openContactoModal(contacto = null) {
  document.getElementById('contactoForm')?.reset();
  document.getElementById('contactoId').value = contacto?.id || '';
  document.getElementById('cNombre').value      = contacto?.nombre || '';
  document.getElementById('cApellido').value    = contacto?.apellido || '';
  document.getElementById('cEmail').value       = contacto?.email || '';
  document.getElementById('cTelefono').value    = contacto?.telefono || '';
  document.getElementById('cMaquina').value     = contacto?.tipo_maquina || '';
  document.getElementById('cDescripcion').value = contacto?.descripcion || '';
  document.getElementById('cEstado').value      = contacto?.estado || 'nuevo';
  document.getElementById('contactoModalTitle').textContent = contacto ? 'Editar Contacto' : 'Nuevo Contacto';
  document.getElementById('contactoSubmitText').textContent = contacto ? 'Guardar contacto' : 'Crear contacto';
  document.getElementById('contactoModal')?.classList.add('modal--open');
}

function closeContactoModal() {
  document.getElementById('contactoModal')?.classList.remove('modal--open');
}

async function submitContactoForm(e) {
  e.preventDefault();
  const id       = document.getElementById('contactoId').value;
  const nombre   = document.getElementById('cNombre').value.trim();
  const apellido = document.getElementById('cApellido').value.trim();
  const email    = document.getElementById('cEmail').value.trim();
  const telefono = document.getElementById('cTelefono').value.trim();
  const maquina  = document.getElementById('cMaquina').value.trim();
  const desc     = document.getElementById('cDescripcion').value.trim();

  if (!nombre || !apellido || !email || !telefono || !maquina || !desc) {
    showToast('Completa todos los campos obligatorios.', 'warning');
    return;
  }

  try {
    const res = await fetchAuth(id ? `/api/contactos/${id}` : '/api/contactos', id ? 'PUT' : 'POST', {
      nombre, apellido, email, telefono, tipo_maquina: maquina, descripcion: desc,
      estado: document.getElementById('cEstado').value,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Error');
    closeContactoModal();
    await loadContactos();
    showToast(`Contacto ${id ? 'actualizado' : 'creado'}.`, 'success');
  } catch (err) {
    showToast(`No se pudo guardar: ${err.message || 'Error'}`, 'error');
  }
}

function debounce(fn, delay = 250) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

/* ══════════════════════════════════════════════════════════════
   CHARTS
   ══════════════════════════════════════════════════════════════ */
function renderDoughnutChart(canvasId, labels, data) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;
  const ESTADO_OT_COLORS = {
    recibido: '#2563EB', diagnosticando: '#7C3AED', reparando: '#D97706',
    listo: '#16A34A', entregado: '#6B7280', cancelado: '#DC2626',
  };
  const colors = labels.map(l => ESTADO_OT_COLORS[l] || CHART_COLORS[0]);
  if (chartEstadosOT) chartEstadosOT.destroy();
  chartEstadosOT = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.map(l => LABEL_ORDEN[l] || l),
      datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }],
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: { legend: { position: 'bottom', labels: { padding: 14, font: { size: 12 } } } },
    },
  });
}

function renderBarChart(canvasId, labels, data, label) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;
  const colors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
  if (chartMaquinas) chartMaquinas.destroy();
  chartMaquinas = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label, data, backgroundColor: colors, borderRadius: 6, borderSkipped: false }] },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { ticks: { maxRotation: 30 } } },
    },
  });
}

function renderVisitasChart() {
  const v = _visitasData;
  if (!v || !v.labels.length) return;
  const ctx = document.getElementById('chartVisitas')?.getContext('2d');
  if (!ctx) return;
  if (chartVisitas) chartVisitas.destroy();
  chartVisitas = new Chart(ctx, {
    type: 'line',
    data: {
      labels: v.labels,
      datasets: [{
        label: 'Visitas', data: v.data, fill: true,
        backgroundColor: 'rgba(229,95,10,0.1)', borderColor: '#E55F0A',
        tension: 0.4, pointBackgroundColor: '#E55F0A', pointRadius: 4,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    },
  });
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */
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

function formatDateShort(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
  } catch { return '—'; }
}

function truncate(str, len) {
  if (!str) return '—';
  return str.length > len ? str.slice(0, len) + '…' : str;
}
