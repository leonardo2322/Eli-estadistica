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
    this.filtros  = { q: '', servicioId: '', examenId: '' };
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
   * Registra callbacks opcionales para notificar eventos de pacientes.
   * Usado por el orquestador (app.js) para conectar con FormatosController.
   * @param {Function} onGuardado   – (examenNombre, servicioNombre, fecha, cantidad)
   * @param {Function} onEliminado  – (examenNombre, servicioNombre, fecha, cantidad)
   */
  setCallbacksPaciente(onGuardado, onEliminado) {
    this._cbPacGuardado  = onGuardado;
    this._cbPacEliminado = onEliminado;
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
  // PACIENTES
  // ─────────────────────────────────────────────────────────────

  _guardarPaciente(d) {
    // Si es edición, guardar el registro ANTERIOR para deshacer su auto-llenado
    let anterior = null;
    if (d.id) {
      anterior = this.repo.obtenerPacientes().find(p => p.id === d.id) || null;
    }

    this.repo.guardarPaciente(d);
    this.view.clearPacForm();
    this._refrescar();
    DomHelpers.mostrarToast('Registro de paciente guardado.', 'success');

    // Notificar al formatosCtrl para auto-llenar la grilla
    if (this._cbPacGuardado || this._cbPacEliminado) {
      const examenes  = this.repo.obtenerExamenes();
      const servicios = this.repo.obtenerServicios();

      // Si fue edición: deshacer el auto-llenado anterior
      if (anterior && this._cbPacEliminado) {
        const exAnterior  = examenes.find(e => e.id === anterior.examenId);
        const srvAnterior = servicios.find(s => s.id === anterior.servicioId);
        if (exAnterior && srvAnterior) {
          this._cbPacEliminado(exAnterior.nombre, srvAnterior.nombre, anterior.fecha, anterior.cantidad);
        }
      }

      // Auto-llenar con el registro nuevo/editado
      if (this._cbPacGuardado) {
        const exNuevo  = examenes.find(e => e.id === d.examenId);
        const srvNuevo = servicios.find(s => s.id === d.servicioId);
        if (exNuevo && srvNuevo) {
          this._cbPacGuardado(exNuevo.nombre, srvNuevo.nombre, d.fecha, d.cantidad);
        }
      }
    }
  }

  _eliminarPaciente(id) {
    // Guardar los datos ANTES de eliminar para el callback
    const paciente  = this.repo.obtenerPacientes().find(p => p.id === id) || null;
    const examenes  = this.repo.obtenerExamenes();
    const servicios = this.repo.obtenerServicios();

    this.repo.eliminarPaciente(id);
    this._refrescar();
    DomHelpers.mostrarToast('Registro eliminado.', 'info');

    // Deshacer el auto-llenado correspondiente
    if (paciente && this._cbPacEliminado) {
      const ex  = examenes.find(e => e.id === paciente.examenId);
      const srv = servicios.find(s => s.id === paciente.servicioId);
      if (ex && srv) {
        this._cbPacEliminado(ex.nombre, srv.nombre, paciente.fecha, paciente.cantidad);
      }
    }
  }

  _renderPacientes() {
    const servicios = this.repo.obtenerServicios();
    const examenes  = this.repo.obtenerExamenes();
    let pacs        = this.repo.obtenerPacientes();

    const { q, servicioId, examenId } = this.filtros;
    if (q.trim()) {
      const qLower = q.toLowerCase();
      pacs = pacs.filter(p => {
        const srv = servicios.find(s => s.id === p.servicioId);
        const ex  = examenes.find(e => e.id === p.examenId);
        return (srv && srv.nombre.toLowerCase().includes(qLower)) ||
               (ex && ex.nombre.toLowerCase().includes(qLower));
      });
    }
    if (servicioId) pacs = pacs.filter(p => p.servicioId === servicioId);
    if (examenId)   pacs = pacs.filter(p => p.examenId   === examenId);

    this.view.renderPacientes(pacs, servicios, examenes,
      p  => this.view.fillPacForm(p),
      id => this._eliminarPaciente(id));
  }

  /**
   * Finaliza el turno actual para la fecha seleccionada en el resumen:
   * Procesa todos los registros de la fecha y sincroniza masivamente
   * sus cantidades con los Formatos Estadísticos Mensuales.
   */
  _finalizarTurno() {
    const fecha = this.fechaRes || DateUtils.getHoy();
    const pacientes = this.repo.obtenerPacientes().filter(p => p.fecha === fecha);

    if (!pacientes.length) {
      DomHelpers.mostrarToast(`No hay registros ingresados para la fecha ${fecha}.`, 'info');
      return;
    }

    if (!this._cbPacGuardado) {
      DomHelpers.mostrarToast('El módulo de formatos no está conectado.', 'error');
      return;
    }

    const examenes  = this.repo.obtenerExamenes();
    const servicios = this.repo.obtenerServicios();
    let contador = 0;

    pacientes.forEach(p => {
      const ex  = examenes.find(e => e.id === p.examenId);
      const srv = servicios.find(s => s.id === p.servicioId);
      if (ex && srv) {
        this._cbPacGuardado(ex.nombre, srv.nombre, p.fecha, p.cantidad);
        contador += p.cantidad;
      }
    });

    DomHelpers.mostrarToast(
      `⏰ ¡Turno Finalizado! Se han cargado ${contador} examen(es) a los Formatos Estadísticos del día ${fecha}.`,
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
