/**
 * =========================================================================
 * js/views/login-view.js
 * -------------------------------------------------------------------------
 * Vista de la pantalla de inicio de sesión con Firebase Authentication.
 *
 * RESPONSABILIDAD:
 *   - Gestionar el formulario de email/contraseña real.
 *   - Autenticar con firebase.auth().signInWithEmailAndPassword()
 *   - Restaurar la sesión automáticamente al recargar (onAuthStateChanged).
 *   - Ocultar el login con fade-out al autenticarse correctamente.
 *   - Exponer bindCerrarSesion() para el botón de logout en el navbar.
 * =========================================================================
 */

'use strict';

class LoginView {

  constructor() {
    this.$screen      = document.getElementById('login-screen');
    this.$form        = document.getElementById('login-form');
    this.$checking    = document.getElementById('login-checking');
    this.$inpEmail    = document.getElementById('inp-login-email');
    this.$inpPass     = document.getElementById('inp-login-pass');
    this.$btnSubmit   = document.getElementById('btn-login-submit');
    this.$btnToggle   = document.getElementById('btn-toggle-login-pass');
    this.$icoToggle   = document.getElementById('ico-toggle-login-pass');
    this.$errorBox    = document.getElementById('login-error');
    this.$errorMsg    = document.getElementById('login-error-msg');

    // Navbar
    this.$btnLogout   = document.getElementById('btn-cerrar-sesion');
    this.$emailBadge  = document.getElementById('navbar-user-email');
    this.$emailTxt    = document.getElementById('navbar-email-txt');

    // Toggle ojo en campo contraseña
    if (this.$btnToggle) {
      this.$btnToggle.addEventListener('click', () => {
        const oculto = this.$inpPass.type === 'password';
        this.$inpPass.type = oculto ? 'text' : 'password';
        this.$icoToggle.className = oculto ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill';
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MOSTRAR / OCULTAR PANTALLA
  // ─────────────────────────────────────────────────────────────────────────

  /** Oculta el login con fade-out y muestra la app */
  _entrarAlSistema(usuario, onSuccess) {
    // Mostrar email en el navbar
    if (this.$emailTxt && usuario) {
      this.$emailTxt.textContent = usuario.email || '';
    }
    if (this.$emailBadge) this.$emailBadge.classList.remove('d-none');
    if (this.$btnLogout)  this.$btnLogout.classList.remove('d-none');

    // Fade out login
    this.$screen.classList.add('fade-out');
    setTimeout(() => {
      this.$screen.style.display = 'none';
      onSuccess();
    }, 550);
  }

  /** Vuelve a mostrar el login (después de cerrar sesión) */
  _volverAlLogin() {
    this.$screen.style.display = '';
    this.$screen.classList.remove('fade-out');

    // Restaurar formulario
    if (this.$form)     { this.$form.classList.add('active'); this.$form.reset(); }
    if (this.$checking) this.$checking.classList.remove('active');
    this._ocultarError();

    // Ocultar info de usuario del navbar
    if (this.$emailBadge) this.$emailBadge.classList.add('d-none');
    if (this.$btnLogout)  this.$btnLogout.classList.add('d-none');

    // Ocultar app
    const $app = document.getElementById('main-app');
    if ($app) $app.classList.add('d-none');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MENSAJES DE ERROR
  // ─────────────────────────────────────────────────────────────────────────

  _mostrarError(msg) {
    if (this.$errorBox) this.$errorBox.classList.remove('d-none');
    if (this.$errorMsg) this.$errorMsg.textContent = msg;
  }

  _ocultarError() {
    if (this.$errorBox) this.$errorBox.classList.add('d-none');
    if (this.$errorMsg) this.$errorMsg.textContent = '';
  }

  /** Traduce los códigos de error de Firebase a mensajes amigables en español */
  _traducirError(code) {
    const errores = {
      'auth/invalid-email':         'El correo electrónico no tiene un formato válido.',
      'auth/user-not-found':        'No existe una cuenta con este correo electrónico.',
      'auth/wrong-password':        'La contraseña es incorrecta. Inténtalo de nuevo.',
      'auth/invalid-credential':    'Correo o contraseña incorrectos. Verifica tus datos.',
      'auth/too-many-requests':     'Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.',
      'auth/network-request-failed':'Sin conexión a internet. Verifica tu red.',
      'auth/user-disabled':         'Esta cuenta ha sido deshabilitada. Contacta al administrador.',
    };
    return errores[code] || `Error de autenticación (${code}). Verifica tus credenciales.`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SPINNER DE VERIFICACIÓN
  // ─────────────────────────────────────────────────────────────────────────

  _mostrarVerificando() {
    if (this.$form)     this.$form.classList.remove('active');
    if (this.$checking) this.$checking.classList.add('active');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BIND PRINCIPAL – conecta el login con Firebase Auth
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Conecta el formulario de login con Firebase Authentication.
   * Restaura la sesión automáticamente si el usuario ya había iniciado sesión.
   * @param {Function} onSuccess – Se llama cuando el usuario está autenticado
   */
  bind(onSuccess) {
    // ── 1. Verificar si ya hay sesión activa al cargar la página ──────────
    this._mostrarVerificando();

    // Esperar a que Firebase esté inicializado
    const intentarBind = () => {
      if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
        setTimeout(intentarBind, 150);
        return;
      }

      firebase.auth().onAuthStateChanged((usuario) => {
        if (usuario) {
          // Sesión activa → entrar directamente sin pedir credenciales
          console.log('🔐 [Auth] Sesión restaurada:', usuario.email);
          this._entrarAlSistema(usuario, onSuccess);
        } else {
          // Sin sesión → mostrar el formulario
          if (this.$form)     this.$form.classList.add('active');
          if (this.$checking) this.$checking.classList.remove('active');
        }
      });
    };

    intentarBind();

    // ── 2. Envío del formulario ───────────────────────────────────────────
    if (this.$form) {
      this.$form.addEventListener('submit', async (e) => {
        e.preventDefault();
        this._ocultarError();

        const email = (this.$inpEmail?.value || '').trim();
        const pass  = (this.$inpPass?.value  || '').trim();

        if (!email || !pass) {
          this._mostrarError('Por favor ingresa tu correo y contraseña.');
          return;
        }

        // Estado de carga
        if (this.$btnSubmit) {
          this.$btnSubmit.disabled = true;
          this.$btnSubmit.innerHTML =
            `<span class="spinner-border spinner-border-sm me-2"></span>Verificando...`;
        }

        try {
          const resultado = await firebase.auth().signInWithEmailAndPassword(email, pass);
          console.log('✅ [Auth] Inicio de sesión exitoso:', resultado.user.email);
          // onAuthStateChanged se dispara y llama a _entrarAlSistema automáticamente
        } catch (err) {
          console.error('❌ [Auth] Error al iniciar sesión:', err.code, err.message);
          this._mostrarError(this._traducirError(err.code));
          // Restaurar botón
          if (this.$btnSubmit) {
            this.$btnSubmit.disabled = false;
            this.$btnSubmit.innerHTML =
              `<i class="bi bi-shield-lock-fill me-2"></i>Iniciar Sesión`;
          }
        }
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CERRAR SESIÓN
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Conecta el botón de cerrar sesión del navbar con Firebase Auth.
   */
  bindCerrarSesion() {
    if (!this.$btnLogout) return;

    this.$btnLogout.addEventListener('click', async () => {
      const confirmar = confirm('¿Deseas cerrar sesión?');
      if (!confirmar) return;

      try {
        await firebase.auth().signOut();
        console.log('👋 [Auth] Sesión cerrada correctamente.');
        this._volverAlLogin();
      } catch (err) {
        console.error('❌ [Auth] Error al cerrar sesión:', err);
        alert('Error al cerrar sesión. Intenta de nuevo.');
      }
    });
  }
}
