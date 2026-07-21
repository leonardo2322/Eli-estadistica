/**
 * =========================================================================
 * js/utils/dom-helpers.js
 * -------------------------------------------------------------------------
 * Helpers de manipulación del DOM reutilizables en toda la aplicación.
 *
 * RESPONSABILIDAD:
 *   - Escapar HTML para prevenir XSS.
 *   - Crear elementos <tr> desde HTML.
 *   - Reconstruir <select> sin perder la selección previa.
 *   - Disparar animaciones de notificación (toast).
 * =========================================================================
 */

'use strict';

const DomHelpers = (() => {

  /**
   * Escapa caracteres peligrosos para prevenir XSS.
   * @param {*} str
   * @returns {string}
   */
  function esc(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Crea un elemento <tr> a partir de contenido HTML interno.
   * @param {string} html – Contenido HTML de las celdas <td>
   * @returns {HTMLTableRowElement}
   */
  function crearFila(html) {
    const tr = document.createElement('tr');
    tr.innerHTML = html;
    return tr;
  }

  /**
   * Reconstruye un <select> con nuevas opciones, conservando la selección.
   * @param {HTMLSelectElement} sel       – Elemento select a reconstruir
   * @param {object[]} items             – Array de ítems
   * @param {string}   placeholder       – Texto del placeholder deshabilitado
   * @param {string}   valKey            – Propiedad a usar como value
   * @param {string}   textKey           – Propiedad a usar como texto visible
   */
  function reconstruirSelect(sel, items, placeholder, valKey, textKey) {
    const cur = sel.value;
    while (sel.options.length > 0) sel.remove(0);

    const ph = document.createElement('option');
    ph.value = '';
    ph.disabled = true;
    ph.textContent = placeholder;
    sel.appendChild(ph);

    items.forEach(it => {
      const opt = document.createElement('option');
      opt.value = it[valKey];
      opt.textContent = it[textKey];
      sel.appendChild(opt);
    });

    // Restaurar selección anterior si sigue existiendo
    if (cur && Array.from(sel.options).some(o => o.value === cur)) {
      sel.value = cur;
    }
  }

  /**
   * Muestra un toast de notificación flotante.
   * Se auto-elimina después de 3 segundos.
   * @param {string} mensaje   – Texto del mensaje
   * @param {'success'|'error'|'info'} tipo – Tipo de notificación
   */
  function mostrarToast(mensaje, tipo = 'success') {
    // Crear contenedor de toasts si no existe
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = `
        position: fixed; bottom: 1.5rem; right: 1.5rem;
        z-index: 9999; display: flex; flex-direction: column; gap: 0.5rem;
      `;
      document.body.appendChild(container);
    }

    const iconos = { success: '✅', error: '❌', info: 'ℹ️' };
    const colores = {
      success: 'linear-gradient(135deg,#0d9488,#0f766e)',
      error:   'linear-gradient(135deg,#e74c3c,#c0392b)',
      info:    'linear-gradient(135deg,#3498db,#2980b9)'
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: ${colores[tipo] || colores.info};
      color: #fff; padding: 0.75rem 1.2rem; border-radius: 12px;
      font-size: 0.9rem; font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,.25);
      display: flex; align-items: center; gap: 0.5rem;
      animation: toastIn 0.3s ease forwards;
    `;
    toast.innerHTML = `<span>${iconos[tipo] || '•'}</span><span>${esc(mensaje)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Muestra / oculta un elemento Bootstrap (toggle d-none).
   * @param {HTMLElement} el
   * @param {boolean} visible
   */
  function toggleVisible(el, visible) {
    if (!el) return;
    el.classList.toggle('d-none', !visible);
  }

  // API pública
  return { esc, crearFila, reconstruirSelect, mostrarToast, toggleVisible };

})();
