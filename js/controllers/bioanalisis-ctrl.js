/**
 * =========================================================================
 * js/controllers/bioanalisis-ctrl.js
 * -------------------------------------------------------------------------
 * Controlador del módulo de Bioanálisis (Pacientes, Servicios, Exámenes).
 *
 * RESPONSABILIDAD:
 *   - Orquestar la comunicación entre BioanalisisRepository y AppView.
 *   - Ejecutar la lógica de negocio (guardar, eliminar, filtrar, calcular resumen).
 *   - Gestionar la exportación de datos (CSV historial, CSV resumen, correo).
 *   - No manipula el DOM directamente; delega todo en AppView.
 * =========================================================================
 */

'use strict';

class BioanalisisController {

  /**
   * @param {BioanalisisRepository} repo
   * @param {AppView}               view
   */
  constructor(repo, view) {
    this.repo     = repo;
    this.view     = view;
    this.filtros  = { q: '', servicioId: '', examenId: '', fechaFiltro: '' };
    this.fechaRes = DateUtils.getHoy();
  }

  /** Inicializa todos los bindings y carga los datos iniciales. */
  init() {
    this.view.bindServForm(d => this._guardarServicio(d));
    this.view.bindExamForm(d => this._guardarExamen(d));
    this.view.bindPacForm( d => this._guardarPaciente(d));
    this.view.bindCalculo();
    this.view.bindFiltros(f => { this.filtros = f; this._renderPacientes(); });
    this.view.bindFechaResumen(f => { this.fechaRes = f; this._renderResumen(); });
    this.view.bindFinalizarTurno(() => this._finalizarTurno());
    this.view.bindExport(
      ()  => this._exportHistorial(),
      (f) => this._exportResumen(f),
      (f) => this._enviarCorreo(f)
    );
    this._refrescar();
  }

  /**
   * Registra el callback para notificar la sincronización de formatos basada en el Resumen del Día.
   * @param {Function} onSincronizar – (fecha)
   */
  setOnSincronizarFormatos(onSincronizar) {
    this._cbSincronizarFormatos = onSincronizar;
  }

  /**
   * Mantiene compatibilidad con la firma anterior de callbacks.
   */
  setCallbacksPaciente(onGuardado, onEliminado) {
    if (typeof onGuardado === 'function' && onGuardado.length <= 1) {
      this._cbSincronizarFormatos = onGuardado;
    }
  }

  _notificarSincronizacion(fecha) {
    if (typeof this._cbSincronizarFormatos === 'function' && fecha) {
      this._cbSincronizarFormatos(fecha);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // REFRESCO COMPLETO
  // ─────────────────────────────────────────────────────────────

  _refrescar() {
    const servicios = this.repo.obtenerServicios();
    const examenes  = this.repo.obtenerExamenes();
    const pacientes = this.repo.obtenerPacientes();

    this.view.renderServicios(servicios,
      s  => this.view.fillServForm(s),
      id => this._eliminarServicio(id));

    this.view.renderExamenes(examenes,
      e  => this.view.fillExamForm(e),
      id => this._eliminarExamen(id));

    this.view.actualizarSelects(servicios, examenes);
    this._renderPacientes();
    this._renderResumen();
    this.view.updateStats(pacientes.length, servicios.length, examenes.length);

    // Stat-cards de HOY en el Dashboard
    const hoy = DateUtils.getHoy();
    const { rows } = this._calcResumen(hoy);
    this.view.renderStatsHoy(rows);
  }

  // ─────────────────────────────────────────────────────────────
  // SERVICIOS
  // ─────────────────────────────────────────────────────────────

  _guardarServicio(d) {
    this.repo.guardarServicio(d);
    this.view.clearServForm();
    this._refrescar();
    DomHelpers.mostrarToast('Servicio guardado correctamente.', 'success');
  }

  _eliminarServicio(id) {
    this.repo.eliminarServicio(id);
    this._refrescar();
    DomHelpers.mostrarToast('Servicio eliminado.', 'info');
  }

  // ─────────────────────────────────────────────────────────────
  // EXÁMENES
  // ─────────────────────────────────────────────────────────────

  _guardarExamen(d) {
    this.repo.guardarExamen(d);
    this.view.clearExamForm();
    this._refrescar();
    DomHelpers.mostrarToast('Examen guardado correctamente.', 'success');
  }

  _eliminarExamen(id) {
    this.repo.eliminarExamen(id);
    this._refrescar();
    DomHelpers.mostrarToast('Examen eliminado.', 'info');
  }

  // ─────────────────────────────────────────────────────────────
  // REGISTROS DE ATENCIÓN (PACIENTES)
  // ─────────────────────────────────────────────────────────────

  _guardarPaciente(d) {
    let anterior = null;
    if (d.id) {
      anterior = this.repo.obtenerPacientes().find(p => p.id === d.id) || null;
    }

    this.repo.guardarPaciente(d);
    this.view.clearPacForm();
    this._refrescar();
    DomHelpers.mostrarToast('Registro de atención guardado.', 'success');

    // Sincronizar Formatos para la fecha del registro (y fecha anterior si se editó la fecha)
    if (anterior && anterior.fecha && anterior.fecha !== d.fecha) {
      this._notificarSincronizacion(anterior.fecha);
    }
    this._notificarSincronizacion(d.fecha);
  }

  _eliminarPaciente(id) {
    const paciente = this.repo.obtenerPacientes().find(p => p.id === id) || null;

    this.repo.eliminarPaciente(id);
    this._refrescar();
    DomHelpers.mostrarToast('Registro de atención eliminado.', 'info');

    if (paciente && paciente.fecha) {
      this._notificarSincronizacion(paciente.fecha);
    }
  }

  _renderPacientes() {
    const servicios = this.repo.obtenerServicios();
    const examenes  = this.repo.obtenerExamenes();
    let pacs        = this.repo.obtenerPacientes();

    const { q, servicioId, examenId, fechaFiltro } = this.filtros;
    if (q.trim()) {
      const qLower = q.toLowerCase();
      pacs = pacs.filter(p => {
        const srv = servicios.find(s => s.id === p.servicioId);
        const ex  = examenes.find(e => e.id === p.examenId);
        return (srv && srv.nombre.toLowerCase().includes(qLower)) ||
               (ex && ex.nombre.toLowerCase().includes(qLower)) ||
               (p.fecha && p.fecha.includes(qLower));
      });
    }
    if (servicioId) pacs = pacs.filter(p => p.servicioId === servicioId);
    if (examenId)   pacs = pacs.filter(p => p.examenId   === examenId);

    if (fechaFiltro === 'hoy') {
      const hoy = DateUtils.getHoy();
      pacs = pacs.filter(p => p.fecha === hoy);
    } else if (fechaFiltro) {
      pacs = pacs.filter(p => p.fecha === fechaFiltro);
    }

    this.view.renderPacientes(pacs, servicios, examenes,
      p  => this.view.fillPacForm(p),
      id => this._eliminarPaciente(id));
  }

  /**
   * Finaliza el turno actual para la fecha seleccionada en el resumen:
   * Sincroniza el Resumen Acumulado del Día con los Formatos Estadísticos Mensuales.
   */
  _finalizarTurno() {
    const fecha = this.fechaRes || DateUtils.getHoy();
    const pacientes = this.repo.obtenerPacientes().filter(p => p.fecha === fecha);

    if (!pacientes.length) {
      DomHelpers.mostrarToast(`No hay registros ingresados para la fecha ${fecha}.`, 'info');
      return;
    }

    if (!this._cbSincronizarFormatos) {
      DomHelpers.mostrarToast('El módulo de formatos no está conectado.', 'error');
      return;
    }

    // Ejecutar la sincronización idempotente basada en los datos del Resumen del Día
    this._notificarSincronizacion(fecha);

    const totalExamenes = pacientes.reduce((sum, p) => sum + (parseInt(p.cantidad) || 1), 0);

    DomHelpers.mostrarToast(
      `⏰ ¡Turno Finalizado! Se han cargado ${totalExamenes} examen(es) a los Formatos Estadísticos del día ${fecha}.`,
      'success'
    );
  }

  _renderResumen() {
    const { rows, totalCant, totalVal } = this._calcResumen(this.fechaRes);
    this.view.renderResumen(rows, totalCant, totalVal);
  }

  /**
   * Agrupa los registros de pacientes por examen para una fecha dada.
   * @param {string} fecha – 'YYYY-MM-DD'
   * @returns {{ rows: object[], totalCant: number, totalVal: number }}
   */
  _calcResumen(fecha) {
    const examenes = this.repo.obtenerExamenes();
    const pacs     = this.repo.obtenerPacientes().filter(p => p.fecha === fecha);
    const mapa     = {};
    let totalCant = 0, totalVal = 0;

    pacs.forEach(p => {
      if (!mapa[p.examenId]) mapa[p.examenId] = { cantidad: 0, total: 0 };
      mapa[p.examenId].cantidad += p.cantidad;
      mapa[p.examenId].total    += p.total;
      totalCant += p.cantidad;
      totalVal  += p.total;
    });

    const rows = Object.keys(mapa).map(eid => {
      const ex = examenes.find(e => e.id === eid) || { nombre: '(eliminado)' };
      return { nombre: ex.nombre, ...mapa[eid] };
    });

    return { rows, totalCant, totalVal };
  }

  // ─────────────────────────────────────────────────────────────
  // EXPORTACIÓN
  // ─────────────────────────────────────────────────────────────

  _exportHistorial() {
    const servicios = this.repo.obtenerServicios();
    const examenes  = this.repo.obtenerExamenes();
    const pacientes = this.repo.obtenerPacientes();
    const csv       = CsvExport.generarHistorialCSV(pacientes, servicios, examenes);
    CsvExport.descargar('Historial_Bioanalisis', csv);
    DomHelpers.mostrarToast('Historial exportado exitosamente.', 'success');
  }

  _exportResumen(fecha) {
    const { rows, totalCant, totalVal } = this._calcResumen(fecha);
    const csv = CsvExport.generarResumenDiarioCSV(fecha, rows, totalCant, totalVal);
    CsvExport.descargar(`Resumen_${fecha}`, csv);
    DomHelpers.mostrarToast('Resumen del día exportado.', 'success');
  }

  _enviarCorreo(fecha) {
    const { rows, totalCant, totalVal } = this._calcResumen(fecha);
    window.location.href = CsvExport.generarMailtoResumen(fecha, rows, totalCant, totalVal);
  }
}
