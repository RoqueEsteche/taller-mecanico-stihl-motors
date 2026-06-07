/**
 * contacto.js — PowerFix
 * Validación y envío del formulario de contacto
 */

document.addEventListener('DOMContentLoaded', () => {
  const form       = document.getElementById('contactForm');
  const submitBtn  = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitText');
  const alertOk    = document.getElementById('formSuccess');
  const alertErr   = document.getElementById('formError');
  const errMsg     = document.getElementById('formErrorMsg');
  const descCount  = document.getElementById('descCount');
  const descripcion = document.getElementById('descripcion');

  /* Autocompletar tipo de máquina desde URL param */
  const params = new URLSearchParams(window.location.search);
  const maquinaParam = params.get('maquina');
  if (maquinaParam) {
    const select = document.getElementById('tipo_maquina');
    if (select) {
      const opt = Array.from(select.options).find(o =>
        o.value.toLowerCase().includes(maquinaParam.toLowerCase())
      );
      if (opt) opt.selected = true;
    }
  }

  /* Contador de caracteres en descripción */
  if (descripcion && descCount) {
    descripcion.addEventListener('input', () => {
      descCount.textContent = `${descripcion.value.length} / 500 caracteres`;
      if (descripcion.value.length > 500) {
        descripcion.value = descripcion.value.slice(0, 500);
      }
    });
  }

  /* Validación en tiempo real (blur) */
  const fields = ['nombre', 'apellido', 'email', 'telefono', 'tipo_maquina', 'descripcion'];
  fields.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('blur', () => validateField(id));
      input.addEventListener('input', () => {
        if (input.classList.contains('form__input--error')) validateField(id);
      });
    }
  });

  /* Envío del formulario */
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlerts();

      const valid = validateAll();
      if (!valid) return;

      setLoading(true);

      const payload = {
        nombre:       document.getElementById('nombre').value.trim(),
        apellido:     document.getElementById('apellido').value.trim(),
        email:        document.getElementById('email').value.trim(),
        telefono:     document.getElementById('telefono').value.trim(),
        tipo_maquina: document.getElementById('tipo_maquina').value,
        descripcion:  document.getElementById('descripcion').value.trim(),
      };

      try {
        const res = await fetch(`${window.PF.API_URL}/api/contactos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || `Error ${res.status}`);
        }

        form.reset();
        if (descCount) descCount.textContent = '0 / 500 caracteres';
        showAlert(alertOk);
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });

      } catch (err) {
        if (errMsg) errMsg.textContent = err.message;
        showAlert(alertErr);
      } finally {
        setLoading(false);
      }
    });
  }

  /* ── Helpers ──────────────────────────────────────────────── */
  function validateField(id) {
    const input = document.getElementById(id);
    const errorEl = document.getElementById(`${id}Error`);
    if (!input) return true;

    let valid = true;
    const val = input.value.trim();

    switch (id) {
      case 'nombre':
      case 'apellido':
        valid = val.length >= 2;
        break;
      case 'email':
        valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        break;
      case 'telefono':
        valid = val.replace(/\D/g, '').length >= 6;
        break;
      case 'tipo_maquina':
        valid = val !== '';
        break;
      case 'descripcion':
        valid = val.length >= 10;
        break;
    }

    input.classList.toggle('form__input--error', !valid);
    input.classList.toggle('form__input--valid', valid && val !== '');
    errorEl?.classList.toggle('form__error--visible', !valid);

    return valid;
  }

  function validateAll() {
    const fieldsToValidate = ['nombre', 'apellido', 'email', 'telefono', 'tipo_maquina', 'descripcion'];
    const results = fieldsToValidate.map(f => validateField(f));

    const terminos = document.getElementById('terminos');
    const terminosError = document.getElementById('terminosError');
    let terminosValid = true;
    if (terminos && !terminos.checked) {
      terminosValid = false;
      terminosError?.classList.add('form__error--visible');
    } else {
      terminosError?.classList.remove('form__error--visible');
    }

    return results.every(Boolean) && terminosValid;
  }

  function setLoading(loading) {
    if (!submitBtn || !submitText) return;
    submitBtn.disabled = loading;
    submitBtn.classList.toggle('btn--disabled', loading);
    submitText.textContent = loading ? 'Enviando...' : 'Enviar Consulta';
  }

  function hideAlerts() {
    alertOk?.classList.remove('alert--visible');
    alertErr?.classList.remove('alert--visible');
  }

  function showAlert(el) {
    el?.classList.add('alert--visible');
  }
});
