/**
 * =========================================================================
 * js/repository/firebase-repo.js
 * -------------------------------------------------------------------------
 * Repositorio de datos para Cloud Firestore (Firebase Database).
 * 
 * RESPONSABILIDAD:
 *   - Probar la conectividad con Cloud Firestore.
 *   - CRUD y sincronización de Pacientes, Exámenes y Servicios.
 *   - Sincronización bidireccional entre localStorage y Cloud Firestore.
 *   - Suscripciones en tiempo real (real-time listeners).
 * =========================================================================
 */

'use strict';

class FirebaseRepository {

  constructor() {
    this.COLLECTIONS = {
      PACIENTES: 'pacientes',
      EXAMENES:  'examenes',
      SERVICIOS: 'servicios',
      FORMATOS:  'formatos'
    };
  }

  /**
   * Verifica el estado actual de la conexión a Firebase.
   * @returns {Promise<{ok: boolean, mensaje: string}>}
   */
  async probarConexion() {
    if (!firebaseInitialized || !db) {
      const exito = initFirebase();
      if (!exito || !db) {
        return { 
          ok: false, 
          mensaje: 'Configuración pendiente: Agrega tus credenciales en js/config/firebase-config.js' 
        };
      }
    }

    try {
      // Realizar un ping ligero a Firestore
      const testRef = db.collection('_ping').doc('conexion_status');
      await testRef.set({
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        app: 'Eli-Estadística',
        estado: 'conectado'
      });

      return { 
        ok: true, 
        mensaje: '¡Conexión establecida con éxito a Cloud Firestore!' 
      };
    } catch (error) {
      console.error('Error al probar la conexión con Firebase:', error);
      return { 
        ok: false, 
        mensaje: `Error de conexión: ${error.message || 'Sin respuesta de Firestore'}` 
      };
    }
  }

  /**
   * Guarda o actualiza un paciente en Cloud Firestore.
   * @param {Object} paciente 
   * @returns {Promise<boolean>}
   */
  async guardarPaciente(paciente) {
    if (!db) return false;
    try {
      const docId = paciente.id || `pac-${Date.now()}`;
      const payload = {
        ...paciente,
        id: docId,
        actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
      };
      await db.collection(this.COLLECTIONS.PACIENTES).doc(docId).set(payload, { merge: true });
      return true;
    } catch (error) {
      console.error('Error al guardar paciente en Cloud Firestore:', error);
      return false;
    }
  }

  /**
   * Obtiene la lista completa de pacientes desde Cloud Firestore.
   * @returns {Promise<Array>}
   */
  async obtenerPacientes() {
    if (!db) return [];
    try {
      const snapshot = await db.collection(this.COLLECTIONS.PACIENTES).get();
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error al obtener pacientes desde Cloud Firestore:', error);
      return [];
    }
  }

  /**
   * Elimina un paciente de Cloud Firestore por su ID.
   * @param {string} id 
   * @returns {Promise<boolean>}
   */
  async eliminarPaciente(id) {
    if (!db || !id) return false;
    try {
      await db.collection(this.COLLECTIONS.PACIENTES).doc(id).delete();
      return true;
    } catch (error) {
      console.error('Error al eliminar paciente en Firestore:', error);
      return false;
    }
  }

  /**
   * Guarda o actualiza un servicio en Cloud Firestore.
   */
  async guardarServicio(servicio) {
    if (!db || !servicio.id) return false;
    try {
      await db.collection(this.COLLECTIONS.SERVICIOS).doc(servicio.id).set(servicio, { merge: true });
      return true;
    } catch (error) {
      console.error('Error al guardar servicio en Firestore:', error);
      return false;
    }
  }

  /**
   * Elimina un servicio de Cloud Firestore.
   */
  async eliminarServicio(id) {
    if (!db || !id) return false;
    try {
      await db.collection(this.COLLECTIONS.SERVICIOS).doc(id).delete();
      return true;
    } catch (error) {
      console.error('Error al eliminar servicio en Firestore:', error);
      return false;
    }
  }

  /**
   * Guarda o actualiza un examen en Cloud Firestore.
   */
  async guardarExamen(examen) {
    if (!db || !examen.id) return false;
    try {
      await db.collection(this.COLLECTIONS.EXAMENES).doc(examen.id).set(examen, { merge: true });
      return true;
    } catch (error) {
      console.error('Error al guardar examen en Firestore:', error);
      return false;
    }
  }

  /**
   * Elimina un examen de Cloud Firestore.
   */
  async eliminarExamen(id) {
    if (!db || !id) return false;
    try {
      await db.collection(this.COLLECTIONS.EXAMENES).doc(id).delete();
      return true;
    } catch (error) {
      console.error('Error al eliminar examen en Firestore:', error);
      return false;
    }
  }

  /**
   * Escucha cambios en tiempo real en la colección de pacientes.
   * @param {Function} callback Callback que recibe el listado actualizado de pacientes.
   * @returns {Function} Función para cancelar la suscripción.
   */
  escucharPacientesEnTiempoReal(callback) {
    if (!db) return () => {};
    return db.collection(this.COLLECTIONS.PACIENTES).onSnapshot(
      (snapshot) => {
        const pacientes = snapshot.docs.map(doc => doc.data());
        callback(pacientes);
      },
      (error) => {
        console.error('Error en listener de Firestore:', error);
      }
    );
  }

  /**
   * Sincroniza todos los datos locales (localStorage) con Cloud Firestore.
   * @param {BioanalisisRepository} localRepo 
   * @returns {Promise<{ok: boolean, count: number, mensaje: string}>}
   */
  async sincronizarLocalStorageAFirestore(localRepo) {
    if (!db) {
      return { ok: false, count: 0, mensaje: 'Base de datos de Firebase no inicializada.' };
    }

    try {
      const pacientes = localRepo.obtenerPacientes() || [];
      const examenes = localRepo.obtenerExamenes() || [];
      const servicios = localRepo.obtenerServicios() || [];

      const batch = db.batch();
      let operaciones = 0;

      // 1. Sincronizar pacientes
      pacientes.forEach(p => {
        const docRef = db.collection(this.COLLECTIONS.PACIENTES).doc(p.id);
        batch.set(docRef, p, { merge: true });
        operaciones++;
      });

      // 2. Sincronizar exámenes
      examenes.forEach(e => {
        const docRef = db.collection(this.COLLECTIONS.EXAMENES).doc(e.id);
        batch.set(docRef, e, { merge: true });
        operaciones++;
      });

      // 3. Sincronizar servicios
      servicios.forEach(s => {
        const docRef = db.collection(this.COLLECTIONS.SERVICIOS).doc(s.id);
        batch.set(docRef, s, { merge: true });
        operaciones++;
      });

      if (operaciones > 0) {
        await batch.commit();
      }

      return { 
        ok: true, 
        count: operaciones, 
        mensaje: `Sincronizados exitosamente ${operaciones} registros con Cloud Firestore.` 
      };
    } catch (error) {
      console.error('Error durante la sincronización a Firestore:', error);
      return { ok: false, count: 0, mensaje: error.message };
    }
  }
}
