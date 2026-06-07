/**
 * servicios.js — PowerFix
 * Carga y filtra el catálogo de servicios desde la API
 */

const CATEGORY_ICONS = {
  'Jardinería': '🌿',
  'Forestal':   '🌲',
  'Agricultura':'🚜',
  'Energía':    '⚡',
  'Agua':       '💧',
};

document.addEventListener('DOMContentLoaded', () => {
  loadServicios();

  /* Filtros de categoría */
  const filterContainer = document.getElementById('filterContainer');
  if (filterContainer) {
    filterContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter__btn');
      if (!btn) return;

      filterContainer.querySelectorAll('.filter__btn').forEach(b => {
        b.classList.remove('filter__btn--active');
      });
      btn.classList.add('filter__btn--active');

      const categoria = btn.dataset.categoria;
      loadServicios(categoria);
    });
  }
});

async function loadServicios(categoria = '') {
  const grid      = document.getElementById('catalogGrid');
  const loader    = document.getElementById('catalogLoader');
  const noResults = document.getElementById('noResults');
  if (!grid) return;

  loader?.classList.add('loader--visible');
  grid.innerHTML   = '';
  if (noResults) noResults.setAttribute('hidden', '');

  try {
    const url = categoria
      ? `${window.PF.API_URL}/api/servicios?categoria=${encodeURIComponent(categoria)}`
      : `${window.PF.API_URL}/api/servicios`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const servicios = await res.json();

    if (servicios.length === 0) {
      if (noResults) noResults.removeAttribute('hidden');
      return;
    }

    servicios.forEach(s => {
      grid.appendChild(buildCard(s));
    });

  } catch (err) {
    console.error('Error al cargar servicios:', err);
    grid.innerHTML = `
      <div class="no-results" style="grid-column:1/-1">
        <i class="fa-solid fa-circle-exclamation no-results__icon"></i>
        <p class="no-results__title">No se pudo cargar el catálogo.</p>
        <p class="no-results__text">Asegurate de que el servidor esté corriendo en <code>localhost:8000</code>.</p>
        <button type="button" class="btn btn--secondary btn--sm mt-4" onclick="loadServicios()">
          <i class="fa-solid fa-rotate-right"></i> Reintentar
        </button>
      </div>`;
  } finally {
    loader?.classList.remove('loader--visible');
  }
}

function buildCard(s) {
  const article = document.createElement('article');
  article.className = 'card';
  article.setAttribute('aria-label', `Servicio: ${s.nombre}`);

  const icon = CATEGORY_ICONS[s.categoria] || '🔧';

  article.innerHTML = `
    <div class="card__image-placeholder" role="img" aria-label="${s.nombre}">
      ${icon}
    </div>
    <div class="card__body">
      <span class="card__category">${s.categoria}</span>
      <h3 class="card__title">${s.nombre}</h3>
      <p class="card__desc">${s.descripcion}</p>
      <div class="card__time">
        <i class="fa-solid fa-clock text-accent"></i>
        ${s.tiempo_estimado || 'A consultar'}
      </div>
      <div class="card__footer">
        <div>
          <span class="card__price-label">Desde</span>
          <div class="card__price">${window.PF.formatPrice(s.precio_base)}</div>
        </div>
        <a href="contacto.html?maquina=${encodeURIComponent(s.categoria)}" class="btn btn--primary btn--sm">
          Solicitar <i class="fa-solid fa-arrow-right"></i>
        </a>
      </div>
    </div>`;

  return article;
}
