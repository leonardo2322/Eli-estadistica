/**
 * =========================================================================
 * js/config/firebase-config.js
 * -------------------------------------------------------------------------
 * Configuración e inicialización de Firebase para Eli-Estadística.
 * 
 * Reemplaza los valores de 'firebaseConfig' con las credenciales de tu
 * proyecto de Firebase (obtenidas desde https://console.firebase.google.com/).
 * =========================================================================
 */

'use strict';

// ⚙️ Configuración real de la Consola de Firebase del usuario:
const firebaseConfig = {
  apiKey: "AIzaSyAr8vgvgjk4JjWJGcx1rvoFzn0RdLkZq2o",
  authDomain: "eli-estadistica.firebaseapp.com",
  projectId: "eli-estadistica",
  storageBucket: "eli-estadistica.firebasestorage.app",
  messagingSenderId: "261785090932",
  appId: "1:261785090932:web:94ee256d51d53ecac20a21",
  measurementId: "G-QQDWMVYM3J"
};

// Instancias globales
let db = null;
let firebaseInitialized = false;

/**
 * Inicializa la app de Firebase y activa Cloud Firestore con soporte offline.
 * @returns {boolean} true si se inicializó con éxito
 */
function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.warn('⚠️ Firebase SDK no está cargado. Revisa los <script> en index.html');
      return false;
    }

    if (!firebase.apps.length) {
      if (firebaseConfig.apiKey === "TU_API_KEY_AQUI") {
        console.info('💡 Firebase disponible, pero usa credenciales demo. Configura js/config/firebase-config.js');
        return false;
      }
      firebase.initializeApp(firebaseConfig);
    }

    db = firebase.firestore();

    // Activar soporte offline para sincronización local en Firestore
    db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore offline: Múltiples pestañas abiertas a la vez.');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore offline: Este navegador no soporta almacenamiento en caché.');
      }
    });

    firebaseInitialized = true;
    console.log('🔥 Firebase Cloud Firestore inicializado correctamente.');
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar Firebase:', error);
    return false;
  }
}

// Intentar inicialización al cargar la ventana
document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
});
