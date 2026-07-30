/**
 * =========================================================================
 * js/controllers/formatos-ctrl.js
 * -------------------------------------------------------------------------
 * Controlador del módulo de Formatos Estadísticos Mensuales.
 *
 * RESPONSABILIDAD:
 *   - Orquestar la comunicación entre FormatosRepository y FormatosView.
 *   - Cargar y renderizar la grilla cuando cambia área/hoja/turno/período.
 *   - Persistir cambios de celda de forma granular (una celda a la vez).
 *   - Manejar el borrado/limpiar de una grilla entera.
 *   - Exportar el formato mensual como CSV.
 *   - Siempre conocer el mes/año actual y trabajar sobre él por defecto.
 * =========================================================================
 */

'use strict';

class FormatosController {

  /**
   * @param {FormatosRepository} repo
   * @param {FormatosView}       view
   */
  constructor(repo, view) {
    this.repo = repo;
    this.view = view;
    this.firebaseRepo = null;
  }

  /**
   * Vincula el repositorio de Bioanálisis para inserción de atenciones de cuadernos.
   * @param {BioanalisisRepository} bioRepo 
   */
  setBioanalisisRepository(bioRepo) {
    this.bioRepo = bioRepo;
  }

  /**
   * Vincula el repositorio de Cloud Firestore para persistencia remota.
   * @param {FirebaseRepository} fbRepo 
   */
  setFirebaseRepository(fbRepo) {
    this.firebaseRepo = fbRepo;
  }

  /** Inicializa bindings y carga la grilla inicial. */
  init() {
    this.view.bindControles({
      onCambioArea:    () => this._cargarGrilla(),
      onCambioHoja:    () => this._cargarGrilla(),
      onCambioTurno:   () => this._cargarGrilla(),
      onCambioPeriodo: () => this._cargarGrilla(),
      onCeldaCambiada: (filaId, dia, valor) => this._guardarCelda(filaId, dia, valor),
      onExportar:      () => this._exportarCSV(),
      onLimpiar:       () => this._limpiarGrilla(),
      onGuardarDB:     () => this.guardarEnBD()
    });

    if (typeof this.view.bindEscanerFoto === 'function') {
      this.view.bindEscanerFoto(datos => this.aplicarDatosFoto(datos));
    }

    // Intentar descargar formatos previamente guardados en Firestore si el repositorio está listo
    if (this.firebaseRepo) {
      this.firebaseRepo.cargarFormatosDesdeFirestore(this.repo).then(() => {
        this._cargarGrilla();
      });
    } else {
      this._cargarGrilla();
    }
  }

  /**
   * Guarda manualmente todas las grillas de Formatos en Cloud Firestore.
   */
  async guardarEnBD() {
    if (!this.firebaseRepo) {
      DomHelpers.mostrarToast('Base de datos no inicializada. Verifique la conexión a Firebase.', 'error');
      return;
    }

    DomHelpers.mostrarToast('Guardando datos de formatos en la base de datos...', 'info');
    const res = await this.firebaseRepo.sincronizarFormatosAFirestore(this.repo);
    if (res.ok) {
      DomHelpers.mostrarToast(res.mensaje || '¡Formatos guardados en la base de datos exitosamente!', 'success');
    } else {
      DomHelpers.mostrarToast(`Error al guardar en la base de datos: ${res.mensaje}`, 'error');
    }
  }

  /**
   * Inyecta los datos extraídos de la foto / IA a la grilla actual de Formatos y al Registro de Atenciones.
   * Soporta tanto grillas numéricas crudas como arrays de atenciones agrupadas desde CuadernoParser.
   * @param {object|Array} datosExtraidos
   */
  aplicarDatosFoto(datosExtraidos) {
    if (!datosExtraidos) return;

    // Caso A: Array de atenciones agrupadas del CuadernoParser
    if (Array.isArray(datosExtraidos)) {
      if (!datosExtraidos.length) return;

      const serviciosExistentes = this.bioRepo ? this.bioRepo.obtenerServicios() : [];
      const examenesExistentes  = this.bioRepo ? this.bioRepo.obtenerExamenes() : [];

      datosExtraidos.forEach(item => {
        // 1. Buscar o registrar servicio
        let srv = serviciosExistentes.find(s => s.key === item.servicioKey || s.nombre.toLowerCase() === item.servicioNombre.toLowerCase());
        if (!srv && this.bioRepo) {
          srv = this.bioRepo.guardarServicio({
            nombre: item.servicioNombre,
            key: item.servicioKey,
            fecha: item.fecha,
            areaId: item.areaId || 'hematologia'
          });
          serviciosExistentes.push(srv);
        }

        // 2. Buscar o registrar examen
        let exm = examenesExistentes.find(e => e.key === item.examenKey || e.nombre.toLowerCase() === item.examenNombre.toLowerCase());
        if (!exm && this.bioRepo) {
          exm = this.bioRepo.guardarExamen({
            nombre: item.examenNombre,
            key: item.examenKey,
            areaId: item.areaId || 'hematologia',
            valor: item.multiplicador || 5
          });
          examenesExistentes.push(exm);
        }

        // 3. Insertar atención localmente en BioanalisisRepository
        if (this.bioRepo && srv && exm) {
          this.bioRepo.guardarPaciente({
            fecha: item.fecha,
            servicioId: srv.id,
            examenId: exm.id,
            cantidad: item.cantidadPacientes,
            total: item.totalCalculado
          });
        }

        // 4. Inyectar parásitos detectados en la tabla de epidemiología de Coproanálisis si aplica
        if (item.parasitosAcumulados && item.parasitosAcumulados.length) {
          const { ano, mes, dia } = DateUtils.parsearFecha(item.fecha);
          const turnoId = DateUtils.getTurnoActual();
          const mapaParasitos = {
            'Blastocystis Ssp': 'par_blastocystis',
            'Giardia Duodenale': 'par_giardia',
            'Entamoeba Histolítica': 'par_entamoeba_hist',
            'Entamoeba Coli': 'par_entamoeba_coli',
            'Ascaris Lumbricoides': 'par_ascaris',
            'Ancylostoma': 'par_ancylostoma',
            'Trichuris Trichura': 'par_trichuris',
            'Enterobius Vermicularis': 'par_enterobius',
            'Hymenolepis Nana': 'par_hymenolepis_nana',
            'Strongyloides Estercoralis': 'par_strongyloides',
            'Balantidium Coli': 'par_balantidium',
            'Yodamoeba Busthlii': 'par_yodamoeba',
            'Endolimax Nana': 'par_endolimax',
            'Tricomonas Hominis': 'par_tricomonas',
            'Taenia Sp': 'par_taenia',
            'Levaduras': 'par_levaduras'
          };

          item.parasitosAcumulados.forEach(pNombre => {
            const filaParId = mapaParasitos[pNombre];
            if (filaParId) {
              const valPrev = this.repo.obtenerCelda('coproanalisis', 'coproanalisis_h1', turnoId, ano, mes, filaParId, dia);
              this.repo.actualizarCelda('coproanalisis', 'coproanalisis_h1', turnoId, ano, mes, filaParId, dia, valPrev + (item.multiplicador || 1));
            }
          });
        }

        // 5. Incrementar celdas en Formatos
        this.incrementarFormatosDesdeRegistro({
          fecha: item.fecha,
          servicioId: srv ? srv.id : null,
          examenId: exm ? exm.id : null,
          cantidad: item.cantidadPacientes,
          total: item.totalCalculado
        }, examenesExistentes, serviciosExistentes, false);
      });

      this._cargarGrilla();
      DomHelpers.mostrarToast(`¡${datosExtraidos.length} grupos de atención inyectados exitosamente en LocalStorage y Formatos!`, 'success');
      return;
    }

    // Caso B: Formato de grilla directa de celdas
    const areaId  = this.view.getAreaId();
    const hojaId  = this.view.getHojaId();
    const turnoId = this.view.getTurnoId();
    const mes     = this.view.getMes();
    const ano     = this.view.getAno();

    if (!areaId) return;

    Object.keys(datosExtraidos).forEach(filaId => {
      Object.keys(datosExtraidos[filaId] || {}).forEach(dia => {
        const val = Number(datosExtraidos[filaId][dia]) || 0;
        this.repo.actualizarCelda(areaId, hojaId, turnoId, ano, mes, filaId, Number(dia), val);
      });
    });

    this._cargarGrilla();
    DomHelpers.mostrarToast('¡Datos aplicados a la grilla exitosamente!', 'success');
  }

  // ─────────────────────────────────────────────────────────────
  // CARGA DE GRILLA
  // ─────────────────────────────────────────────────────────────

  /**
   * Determina el contexto actual (área, hoja, turno, mes, año)
   * y solicita a la vista que renderice la grilla con los datos guardados.
   * Mantiene estrictamente la estructura estática del Excel "Formatos_Hospital_San_Jose_v2".
   */
  _cargarGrilla() {
    const areaId  = this.view.getAreaId();
    const hojaId  = this.view.getHojaId();
    const turnoId = this.view.getTurnoId();
    const mes     = this.view.getMes();
    const ano     = this.view.getAno();

    // Si no hay área seleccionada, mostrar placeholder
    if (!areaId) {
      this.view.mostrarSeleccionArea();
      return;
    }

    // Buscar objetos area y hoja en los datos de configuración
    const area = HOSPITAL_AREAS.find(a => a.id === areaId);
    if (!area) { this.view.mostrarSeleccionArea(); return; }

    const hojaOriginal = area.hojas.find(h => h.id === hojaId) || area.hojas[0];
    if (!hojaOriginal) { this.view.mostrarSeleccionArea(); return; }

    // Usar la hoja puramente como está definida en Formatos_Hospital_San_Jose_v2
    const hoja = JSON.parse(JSON.stringify(hojaOriginal));

    // Obtener datos guardados de esta grilla
    const datos = this.repo.obtenerGrilla(area.id, hojaOriginal.id, turnoId, ano, mes);

    // Renderizar
    this.view.renderGrilla(area, hoja, mes, ano, datos);
  }

  // ─────────────────────────────────────────────────────────────
  // PERSISTENCIA
  // ─────────────────────────────────────────────────────────────

  /**
   * Persiste el cambio de una sola celda en el repositorio.
   * Este método es llamado por la vista cada vez que el usuario
   * escribe en una celda de la grilla.
   * @param {string} filaId
   * @param {number} dia
   * @param {number} valor
   */
  _guardarCelda(filaId, dia, valor) {
    const areaId  = this.view.getAreaId();
    const hojaId  = this.view.getHojaId();
    const turnoId = this.view.getTurnoId();
    const mes     = this.view.getMes();
    const ano     = this.view.getAno();

    this.repo.actualizarCelda(areaId, hojaId, turnoId, ano, mes, filaId, dia, valor);
  }

  // ─────────────────────────────────────────────────────────────
  // LIMPIAR
  // ─────────────────────────────────────────────────────────────

  /**
   * Elimina todos los datos de la grilla actual del repositorio
   * y limpia visualmente la vista.
   */
  _limpiarGrilla() {
    const areaId  = this.view.getAreaId();
    const hojaId  = this.view.getHojaId();
    const turnoId = this.view.getTurnoId();
    const mes     = this.view.getMes();
    const ano     = this.view.getAno();

    if (!areaId) return;

    // Confirmar con doble click (implementado como toast + timeout)
    if (!this._limpiarPendiente) {
      this._limpiarPendiente = true;
      DomHelpers.mostrarToast('Haz clic en Limpiar nuevamente para confirmar el borrado.', 'info');
      setTimeout(() => { this._limpiarPendiente = false; }, 3000);
      return;
    }

    this._limpiarPendiente = false;
    this.repo.eliminarGrilla(areaId, hojaId, turnoId, ano, mes);
    this.view.limpiarGrilla();
    DomHelpers.mostrarToast('Grilla limpiada correctamente.', 'success');
  }

  // ─────────────────────────────────────────────────────────────
  // EXPORTACIÓN
  // ─────────────────────────────────────────────────────────────

  /**
   * Genera y descarga el CSV del formato mensual actual.
   */
  _exportarCSV() {
    const areaId  = this.view.getAreaId();
    const hojaId  = this.view.getHojaId();
    const turnoId = this.view.getTurnoId();
    const mes     = this.view.getMes();
    const ano     = this.view.getAno();

    if (!areaId) {
      DomHelpers.mostrarToast('Seleccione un área antes de exportar.', 'error');
      return;
    }

    const area    = HOSPITAL_AREAS.find(a => a.id === areaId);
    const hoja    = area?.hojas.find(h => h.id === hojaId) || area?.hojas[0];
    if (!area || !hoja) return;

    const turno   = TURNOS.find(t => t.id === turnoId);
    const dias    = DateUtils.diasDelMes(mes, ano);
    const datos   = this.repo.obtenerGrilla(areaId, hojaId, turnoId, ano, mes);
    const csv     = CsvExport.generarFormatoCSV(area, hoja, turno?.label || turnoId, mes, ano, dias, datos);

    const nombreArchivo = `Formato_${area.label}_${DateUtils.nombreMes(mes)}_${ano}_${turno?.label || turnoId}`;
    CsvExport.descargar(nombreArchivo, csv);
    DomHelpers.mostrarToast('Formato exportado exitosamente.', 'success');
  }

  /**
   * Notifica que se ha creado o eliminado un examen o servicio en Mantenimiento.
   * Purga el ID eliminado del repositorio y refresca la grilla.
   * @param {string} [idEliminado]
   */
  notificarMantenimientoCambiado(idEliminado) {
    if (idEliminado && this.repo && typeof this.repo.purgarFilaId === 'function') {
      this.repo.purgarFilaId(idEliminado);
    }
    this._cargarGrilla();
  }

  // ─────────────────────────────────────────────────────────────
  // SINCRONIZACIÓN DESDE REGISTRO DE ATENCIÓN (RESUMEN DEL DÍA)
  // ─────────────────────────────────────────────────────────────

  /**
  /**
   * Incrementa (o decrementa si es eliminación) el valor de las celdas de Formatos
   * para las filas de servicio y examen afectadas por uno o varios registros de atención.
   * PRESERVA y SUMA sobre cualquier valor previamente guardado en las celdas de Formatos.
   *
   * @param {object|Array} d – Registro o Array de registros { fecha, servicioId, examenId, cantidad, total }
   * @param {Array} examenesCat – Catálogo de exámenes
   * @param {Array} serviciosCat – Catálogo de servicios
   * @param {boolean} [esEliminacion=false] – Si es true, restará la cantidad/total
   */
  incrementarFormatosDesdeRegistro(d, examenesCat, serviciosCat, esEliminacion = false) {
    const lista = Array.isArray(d) ? d : [d];
    if (!lista.length) return;

    const factor = esEliminacion ? -1 : 1;

    lista.forEach(p => {
      if (!p.fecha) return;
      const { ano, mes, dia } = DateUtils.parsearFecha(p.fecha);
      const turnoId = DateUtils.getTurnoActual();

      const ex = (examenesCat || []).find(e => e.id === p.examenId);
      const srv = (serviciosCat || []).find(s => s.id === p.servicioId);
      if (!ex || !srv) return;

      const keyEx = ex.key || inferirExamenKey(ex.nombre);
      const destino = obtenerDestinoFormato(keyEx, srv.nombre, p.filtroSeccion || 'todos');

      if (destino) {
        const { areaId, hojaId, filaExamenId, filasServicioIds } = destino;
        const cant = (parseInt(p.cantidad) || 1) * factor;
        const multiplicador = typeof getAreaMultiplier === 'function' ? getAreaMultiplier(areaId) : 5;
        const valorExamen = Math.round(parseFloat(p.total) || (Math.abs(cant) * multiplicador)) * factor;

        // A. Sumar a las filas de servicio la cantidad de atenciones (sumando al valor actual de la celda)
        (filasServicioIds || []).forEach(fSrvId => {
          if (fSrvId) {
            const valActual = this.repo.obtenerCelda(areaId, hojaId, turnoId, ano, mes, fSrvId, dia);
            const valNuevo = Math.max(0, valActual + cant);
            this.repo.actualizarCelda(areaId, hojaId, turnoId, ano, mes, fSrvId, dia, valNuevo);
            this._refrescarSiCoincide(areaId, hojaId, turnoId, mes, ano);
          }
        });

        // B. Sumar a las filas de examen el resultado de la multiplicación (sumando al valor actual de la celda)
        if (filaExamenId) {
          if (!filasServicioIds || !filasServicioIds.includes(filaExamenId)) {
            const valActual = this.repo.obtenerCelda(areaId, hojaId, turnoId, ano, mes, filaExamenId, dia);
            const valNuevo = Math.max(0, valActual + valorExamen);
            this.repo.actualizarCelda(areaId, hojaId, turnoId, ano, mes, filaExamenId, dia, valNuevo);
            this._refrescarSiCoincide(areaId, hojaId, turnoId, mes, ano);
          }
        }
      }
    });
  }

  /**
   * Sincroniza las celdas de los Formatos Estadísticos para una fecha determinada
   * basándose en los registros de atención acumulados del día. Preserva valores iniciales de celdas.
   *
   * @param {string} fecha – Fecha en formato 'YYYY-MM-DD'
   * @param {Array} registrosAtencion – Array completo de registros de atención
   * @param {Array} examenesCat – Catálogo de exámenes de Bioanálisis
   * @param {Array} serviciosCat – Catálogo de servicios de Bioanálisis
   */
  sincronizarDesdeResumen(fecha, registrosAtencion, examenesCat, serviciosCat) {
    this.incrementarFormatosDesdeRegistro(registrosAtencion, examenesCat, serviciosCat, false);
  }

  /**
   * Refresca la grilla visual sólo si la vista está mostrando exactamente
   * el área/hoja/turno/período que cambió.
   * @private
   */
  _refrescarSiCoincide(areaId, hojaId, turnoId, mes, ano) {
    if (this.view.getAreaId()  === areaId  &&
        this.view.getHojaId()  === hojaId  &&
        this.view.getTurnoId() === turnoId &&
        this.view.getMes()     === mes     &&
        this.view.getAno()     === ano) {
      this._cargarGrilla();
    }
  }
}


