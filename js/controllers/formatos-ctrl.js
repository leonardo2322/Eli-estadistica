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
      onLimpiar:       () => this._limpiarGrilla()
    });

    // Cargar grilla inicial si hay un área seleccionada
    this._cargarGrilla();
  }

  // ─────────────────────────────────────────────────────────────
  // CARGA DE GRILLA
  // ─────────────────────────────────────────────────────────────

  /**
   * Determina el contexto actual (área, hoja, turno, mes, año)
   * y solicita a la vista que renderice la grilla con los datos guardados.
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

    const hoja = area.hojas.find(h => h.id === hojaId) || area.hojas[0];
    if (!hoja) { this.view.mostrarSeleccionArea(); return; }

    // Obtener datos guardados de esta grilla
    const datos = this.repo.obtenerGrilla(area.id, hoja.id, turnoId, ano, mes);

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

  // ─────────────────────────────────────────────────────────────
  // SINCRONIZACIÓN DESDE REGISTRO DE ATENCIÓN (RESUMEN DEL DÍA)
  // ─────────────────────────────────────────────────────────────

  /**
   * Sincroniza las celdas de los Formatos Estadísticos para una fecha determinada
   * basándose en los registros de atención acumulados del día.
   *
   * @param {string} fecha – Fecha en formato 'YYYY-MM-DD'
   * @param {Array} registrosAtencion – Array completo de registros de atención
   * @param {Array} examenesCat – Catálogo de exámenes de Bioanálisis
   * @param {Array} serviciosCat – Catálogo de servicios de Bioanálisis
   */
  sincronizarDesdeResumen(fecha, registrosAtencion, examenesCat, serviciosCat) {
    if (!fecha) return;
    const { ano, mes, dia } = DateUtils.parsearFecha(fecha);
    const turnoId = DateUtils.getTurnoActual();

    // 1. Identificar todos los destinos en Formatos posibles para inicializar/resetear
    const celdasAfectadasKeys = new Set();
    const acumuladorCeldas = {};

    (examenesCat || []).forEach(ex => {
      (serviciosCat || []).forEach(srv => {
        const keyEx = ex.key || inferirExamenKey(ex.nombre);
        const dest = obtenerDestinoFormato(keyEx, srv.nombre);
        if (dest) {
          if (dest.filaServicioId) celdasAfectadasKeys.add(`${dest.areaId}|${dest.hojaId}|${dest.filaServicioId}`);
          if (dest.filaExamenId)   celdasAfectadasKeys.add(`${dest.areaId}|${dest.hojaId}|${dest.filaExamenId}`);
        }
      });
    });

    celdasAfectadasKeys.forEach(k => { acumuladorCeldas[k] = 0; });

    // 2. Acumular los totales de los registros de atención para la fecha dada
    const pacsDelDia = (registrosAtencion || []).filter(p => p.fecha === fecha);

    pacsDelDia.forEach(p => {
      const ex = examenesCat.find(e => e.id === p.examenId);
      const srv = serviciosCat.find(s => s.id === p.servicioId);
      if (!ex || !srv) return;

      const keyEx = ex.key || inferirExamenKey(ex.nombre);
      const destino = obtenerDestinoFormato(keyEx, srv.nombre);

      if (destino) {
        const { areaId, hojaId, filaExamenId, filaServicioId } = destino;
        const cant = parseInt(p.cantidad) || 1;

        if (filaServicioId) {
          const kSrv = `${areaId}|${hojaId}|${filaServicioId}`;
          acumuladorCeldas[kSrv] = (acumuladorCeldas[kSrv] || 0) + cant;
          celdasAfectadasKeys.add(kSrv);
        }

        if (filaExamenId && filaExamenId !== filaServicioId) {
          const kEx = `${areaId}|${hojaId}|${filaExamenId}`;
          acumuladorCeldas[kEx] = (acumuladorCeldas[kEx] || 0) + cant;
          celdasAfectadasKeys.add(kEx);
        }
      }
    });

    // 3. Persistir en el repositorio de Formatos el acumulado exacto del día
    celdasAfectadasKeys.forEach(keyStr => {
      const [areaId, hojaId, filaId] = keyStr.split('|');
      const valAcumulado = acumuladorCeldas[keyStr] || 0;
      this.repo.actualizarCelda(areaId, hojaId, turnoId, ano, mes, filaId, dia, valAcumulado);
      this._refrescarSiCoincide(areaId, hojaId, turnoId, mes, ano);
    });
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

