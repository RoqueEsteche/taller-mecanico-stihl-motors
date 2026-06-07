/**
 * config.js — PowerFix
 * URL del backend según entorno (local o producción en Render).
 * Para desarrollo local el backend debe correr en http://localhost:8000
 */
const _isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

window.PF_CONFIG = {
  API_URL: _isLocal ? 'http://localhost:8000' : 'https://powerfix-api.onrender.com',
};
