/**
 * login.js — PowerFix
 * Autenticación y control de acceso al panel
 */

const API_URL = 'http://localhost:8000';

document.addEventListener('DOMContentLoaded', () => {
  /* Si ya tiene sesión activa, ir al panel */
  const token = localStorage.getItem('pf_token');
  const user  = (() => {
    try { return JSON.parse(localStorage.getItem('pf_user')); }
    catch { return null; }
  })();
  if (token && user && user.rol === 'admin') {
    window.location.replace('admin.html');
    return;
  }

  const form         = document.getElementById('loginForm');
  const loginBtn     = document.getElementById('loginBtn');
  const loginText    = document.getElementById('loginText');
  const loginError   = document.getElementById('loginError');
  const loginErrMsg  = document.getElementById('loginErrorMsg');
  const pwdToggle    = document.getElementById('passwordToggle');
  const pwdInput     = document.getElementById('password');
  const pwdIcon      = document.getElementById('passwordIcon');

  /* Mostrar/ocultar contraseña */
  if (pwdToggle && pwdInput) {
    pwdToggle.addEventListener('click', () => {
      const isPassword = pwdInput.type === 'password';
      pwdInput.type = isPassword ? 'text' : 'password';
      pwdIcon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    });
  }

  /* Validación en tiempo real */
  const emailInput = document.getElementById('email');
  if (emailInput) {
    emailInput.addEventListener('blur', () => validateEmail());
    emailInput.addEventListener('input', () => {
      if (emailInput.classList.contains('form__input--error')) validateEmail();
    });
  }
  if (pwdInput) {
    pwdInput.addEventListener('blur', () => validatePassword());
    pwdInput.addEventListener('input', () => {
      if (pwdInput.classList.contains('form__input--error')) validatePassword();
    });
  }

  /* Envío del formulario */
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError?.classList.remove('alert--visible');

      const emailValid = validateEmail();
      const pwdValid   = validatePassword();
      if (!emailValid || !pwdValid) return;

      setLoading(true);

      try {
        const res = await fetch(`${API_URL}/api/users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email:    emailInput.value.trim(),
            password: pwdInput.value,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || 'Credenciales inválidas');
        }

        const data = await res.json();

        /* Verificar que sea admin */
        if (data.usuario.rol !== 'admin') {
          throw new Error('Acceso denegado: se requiere rol de administrador.');
        }

        /* Guardar en localStorage (sesión persistente) */
        localStorage.setItem('pf_token', data.access_token);
        localStorage.setItem('pf_user',  JSON.stringify(data.usuario));

        /* Guardar token en sessionStorage también */
        sessionStorage.setItem('pf_session_token', data.access_token);

        window.location.replace('admin.html');

      } catch (err) {
        if (loginErrMsg) loginErrMsg.textContent = err.message;
        loginError?.classList.add('alert--visible');
        pwdInput.value = '';
      } finally {
        setLoading(false);
      }
    });
  }

  /* ── Helpers ──────────────────────────────────────────────── */
  function validateEmail() {
    const input = document.getElementById('email');
    const errEl = document.getElementById('emailError');
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input?.value.trim() || '');
    input?.classList.toggle('form__input--error', !valid);
    input?.classList.toggle('form__input--valid', valid);
    errEl?.classList.toggle('form__error--visible', !valid);
    return valid;
  }

  function validatePassword() {
    const input = document.getElementById('password');
    const errEl = document.getElementById('passwordError');
    const valid = (input?.value || '').length >= 8;
    input?.classList.toggle('form__input--error', !valid);
    input?.classList.toggle('form__input--valid', valid);
    errEl?.classList.toggle('form__error--visible', !valid);
    return valid;
  }

  function setLoading(loading) {
    if (loginBtn) loginBtn.disabled = loading;
    if (loginText) loginText.textContent = loading ? 'Ingresando...' : 'Ingresar al Panel';
    loginBtn?.classList.toggle('btn--disabled', loading);
  }
});
