/**
 * =========================================================================
 * js/views/login-view.js
 * -------------------------------------------------------------------------
 * Vista de la pantalla de inicio de sesión (Login).
 *
 * RESPONSABILIDAD:
 *   - Gestionar la animación de 2 pasos del login.
 *   - Notificar al controlador cuando el usuario entra al sistema.
 *   - Ocultar la pantalla de login con fade-out al continuar.
 * =========================================================================
 */

'use strict';

class LoginView {

  constructor() {
    this.$screen  = document.getElementById('login-screen');
    this.$step1   = document.getElementById('login-step-1');
    this.$step2   = document.getElementById('login-step-2');
    this.$btnStart = document.getElementById('btn-iniciar');
    this.$btnNext  = document.getElementById('btn-continuar');
  }

  /**
   * Asocia el callback de éxito al flujo del login.
   * @param {Function} onSuccess – Se llama cuando el usuario pulsa "Continuar al Sistema"
   */
  bind(onSuccess) {
    // Paso 1 → Paso 2 (simulación de conexión)
    this.$btnStart.addEventListener('click', () => {
      this.$btnStart.disabled = true;
      this.$btnStart.innerHTML =
        `<span class="spinner-border spinner-border-sm me-2"></span>Conectando...`;
      setTimeout(() => {
        this.$step1.classList.remove('active');
        this.$step2.classList.add('active');
      }, 900);
    });

    // Paso 2 → Entrar al sistema
    this.$btnNext.addEventListener('click', () => {
      this.$screen.classList.add('fade-out');
      setTimeout(() => {
        this.$screen.style.display = 'none';
        onSuccess();
      }, 600);
    });
  }
}
