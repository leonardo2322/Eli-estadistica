/**
 * =========================================================================
 * app.js  –  ORQUESTADOR PRINCIPAL
 * =========================================================================
 *
 * Este archivo es el punto de entrada de la aplicación.
 * Su única responsabilidad es instanciar los módulos y conectarlos.
 * Toda la lógica de negocio vive en los archivos de js/.
 *
 * ORDEN DE CARGA DE SCRIPTS (ver index.html):
 *   1. js/config/hospital-data.js   → constantes globales (HOSPITAL_AREAS, TURNOS, etc.)
 *   2. js/utils/date-utils.js       → DateUtils
 *   3. js/utils/dom-helpers.js      → DomHelpers
 *   4. js/utils/csv-export.js       → CsvExport
 *   5. js/repository/bioanalisis-repo.js → BioanalisisRepository
 *   6. js/repository/formatos-repo.js    → FormatosRepository
 *   7. js/views/login-view.js       → LoginView
 *   8. js/views/app-view.js         → AppView
 *   9. js/views/formatos-view.js    → FormatosView
 *  10. js/controllers/bioanalisis-ctrl.js → BioanalisisController
 *  11. js/controllers/formatos-ctrl.js    → FormatosController
 *  12. app.js  (este archivo)       → arranque
 * =========================================================================
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  // ── Repositorios ────────────────────────────────────────────
  const bioRepo      = new BioanalisisRepository();
  const formatosRepo = new FormatosRepository();
  const firebaseRepo = new FirebaseRepository();

  // ── Vistas ──────────────────────────────────────────────────
  const loginView    = new LoginView();
  const appView      = new AppView();
  const formatosView = new FormatosView();

  // ── Controladores ────────────────────────────────────────────
  const bioCtrl      = new BioanalisisController(bioRepo, appView);
  const formatosCtrl = new FormatosController(formatosRepo, formatosView);

  // ── Vincular Firebase y Repositorios con los Controladores ───
  bioRepo.setFirebaseRepository(firebaseRepo);
  formatosCtrl.setFirebaseRepository(firebaseRepo);
  formatosCtrl.setBioanalisisRepository(bioRepo);

  // ── Arranque: el login notifica cuando el usuario entra ─────
  loginView.bind(() => {
    appView.mostrar();
    bioCtrl.init();
    formatosCtrl.init();

    // Sincronizar automáticamente datos locales, centros externos y API Key de Gemini a/desde Cloud Firestore
    if (typeof CuadernoParser !== 'undefined') {
      CuadernoParser.cargarCentrosDesdeFirestore(firebaseRepo);
    }
    if (typeof GeminiVisionService !== 'undefined') {
      GeminiVisionService.cargarApiKeyDesdeFirestore(firebaseRepo);

      // Verificar (máx 1 vez/día, con caché) si el modelo configurado sigue activo.
      // Si fue retirado, muestra una advertencia visible en la UI usando el sistema
      // de notificaciones existente (DomHelpers.mostrarToast).
      GeminiVisionService.verificarModeloActual().then(resultado => {
        if (!resultado) return; // sin key o sin red → ignorar silenciosamente
        if (!resultado.disponible) {
          // Ninguno de los MODELOS_CANDIDATOS está disponible para esta key
          const flashDisponibles = resultado.modelos
            .filter(n => n.includes('flash'))
            .slice(0, 5)                          // limitar para no saturar el toast
            .join(', ') || 'Ver consola';
          // Retardo breve para que el toast aparezca después del render inicial
          setTimeout(() => {
            DomHelpers.mostrarToast(
              `⚠️ Ningún modelo Gemini candidato disponible para tu API key. ` +
              `Edita MODELOS_CANDIDATOS en gemini-vision-service.js. Flash activos: ${flashDisponibles}`,
              'error'
            );
          }, 1500);
          console.warn(
            `[GeminiVisionService] ⚠️ TODOS LOS MODELOS CANDIDATOS NO DISPONIBLES.\n` +
            `Candidatos intentados: ${GeminiVisionService.MODELOS_CANDIDATOS.join(', ')}\n` +
            `Modelos flash activos en la API:\n  · ${resultado.modelos.filter(n => n.includes('flash')).join('\n  · ')}`
          );
        } else {
          console.info(
            `[GeminiVisionService] ✅ Modelos candidatos verificados. Activo preferido: "${resultado.modeloActual}"`
          );
        }
      });
    }
    firebaseRepo.sincronizarLocalStorageAFirestore(bioRepo).then(res => {
      if (res.ok) {
        console.log(`🔥 Cloud Firestore: ${res.mensaje}`);
      }
    });

    // Conectar los controladores: preservar y sumar sobre celdas existentes de Formatos
    const sincronizarRegistro = (fecha, registros, esEliminacion) => {
      if (registros) {
        formatosCtrl.incrementarFormatosDesdeRegistro(
          registros,
          bioRepo.obtenerExamenes(),
          bioRepo.obtenerServicios(),
          esEliminacion
        );
      } else {
        formatosCtrl.sincronizarDesdeResumen(
          fecha,
          bioRepo.obtenerPacientes(),
          bioRepo.obtenerExamenes(),
          bioRepo.obtenerServicios()
        );
      }
    };

    bioCtrl.setOnSincronizarFormatos(sincronizarRegistro);
    bioCtrl.setOnMantenimientoCambiado((idEliminado) => {
      formatosCtrl.notificarMantenimientoCambiado(idEliminado);
    });

    // Sincronización inicial para la fecha actual al arrancar
    sincronizarRegistro(DateUtils.getHoy());
  });


});
