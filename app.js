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

  // ── Vincular Firebase con el Repositorio de Bioanálisis ─────
  bioRepo.setFirebaseRepository(firebaseRepo);

  // ── Arranque: el login notifica cuando el usuario entra ─────
  loginView.bind(() => {
    appView.mostrar();
    bioCtrl.init();
    formatosCtrl.init();

    // Sincronizar automáticamente datos locales a Cloud Firestore en segundo plano
    firebaseRepo.sincronizarLocalStorageAFirestore(bioRepo).then(res => {
      if (res.ok) {
        console.log(`🔥 Cloud Firestore: ${res.mensaje}`);
      }
    });

    // Conectar los controladores: el Resumen del Día es la base central para los Formatos
    const sincronizarFecha = (fecha) => {
      formatosCtrl.sincronizarDesdeResumen(
        fecha,
        bioRepo.obtenerPacientes(),
        bioRepo.obtenerExamenes(),
        bioRepo.obtenerServicios()
      );
    };

    bioCtrl.setOnSincronizarFormatos(sincronizarFecha);

    // Sincronización inicial para la fecha actual al arrancar
    sincronizarFecha(DateUtils.getHoy());
  });

});
