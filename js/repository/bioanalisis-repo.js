/**
 * =========================================================================
 * js/repository/bioanalisis-repo.js
 * -------------------------------------------------------------------------
 * Repositorio de datos para el módulo de Bioanálisis (Pacientes, Servicios
 * y Exámenes), usando localStorage como capa de persistencia.
 *
 * RESPONSABILIDAD:
 *   - CRUD completo de Servicios de Atención.
 *   - CRUD completo de Exámenes (con valor monetario).
 *   - CRUD completo de Registros de Pacientes.
 *   - Migración automática de esquemas de datos antiguos.
 *   - Sembrado inicial de datos de ejemplo al primer uso.
 *
 * CLAVES localStorage:
 *   'eli_servicios' → array de servicios
 *   'eli_examenes'  → array de exámenes
 *   'eli_pacientes' → array de registros de pacientes
 * =========================================================================
 */

'use strict';

class BioanalisisRepository {

  constructor() {
    this.KEYS = {
      SERVICIOS: 'eli_servicios',
      EXAMENES:  'eli_examenes',
      PACIENTES: 'eli_pacientes'
    };
    this._seed();
    this._migrar();
  }

  // ─────────────────────────────────────────────────────────────
  // SEMILLA INICIAL – Se carga sólo si no hay datos previos
  // ─────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────
  // SEMILLA INICIAL – Se carga sólo si no hay datos previos
  // ─────────────────────────────────────────────────────────────
  _seed() {
    const hoy = DateUtils.getHoy();

    if (!localStorage.getItem(this.KEYS.SERVICIOS)) {
      localStorage.setItem(this.KEYS.SERVICIOS, JSON.stringify([
        { id: 'srv-1', nombre: 'Emergencia',        fecha: hoy },
        { id: 'srv-2', nombre: 'Consulta Externa',  fecha: hoy },
        { id: 'srv-3', nombre: 'Hospitalización',   fecha: hoy }
      ]));
    }

    const examenesPredeterminados = [
      'Orina', 'Heces', 'Glicemia',
      'Hematología Completa', 'Hemoglobina', 'Hematocrito', 'Plaquetas',
      'Diferencial', 'Contaje de B', 'VSG', 'Gota Gruesa', 'Frotis de Sangre Periférica',
      'Glucosa', 'Proteínas', 'Sedimentos', 'P.H', 'Densidad', 'Pigmentos Biliares',
      'Directos Sol-Sal', 'Directos Sol-Lugol', 'Kato', 'Sangre Oculta',
      'Ascaris Lumbricoides', 'Ancylostoma', 'Trichuris Trichura', 'Enterobius Vermicularis',
      'Hymenolepis Nana', 'Hymenolepis Diminuta', 'Entamoeba Histolítica', 'Strongyloides Estercoralis',
      'Balantidium Coli', 'Entamoeba Coli', 'Yodamoeba Busthlii', 'Endolimax Nana',
      'Giardia Duodenale', 'Tricomonas Hominis', 'Chilomastix Mesnili', 'Blastocystis Ssp',
      'Taenia Sp', 'Levaduras',
      'Hepatitis A', 'Hepatitis B', 'Hepatitis C', 'Prueba de Embarazo', 'COVID-19',
      'VDRL', 'HIV', 'Dengue', 'Helicobacter Pylori Sangre', 'ASLO'
    ];

    let exExistentes = this._get(this.KEYS.EXAMENES);
    let cambioEx = false;

    if (!exExistentes.length) {
      exExistentes = examenesPredeterminados.map((nombre, i) => ({
        id: `exm-${i + 1}`,
        nombre,
        valor: 5
      }));
      cambioEx = true;
    } else {
      // Agregar exámenes faltantes sin duplicar
      const norm = str => (str || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const nombresSet = new Set(exExistentes.map(e => norm(e.nombre)));
      
      examenesPredeterminados.forEach((nombre, idx) => {
        if (!nombresSet.has(norm(nombre))) {
          exExistentes.push({
            id: `exm-auto-${Date.now()}-${idx}`,
            nombre,
            valor: 5
          });
          cambioEx = true;
        }
      });
    }

    if (cambioEx) {
      this._set(this.KEYS.EXAMENES, exExistentes);
    }

    if (!localStorage.getItem(this.KEYS.PACIENTES)) {
      localStorage.setItem(this.KEYS.PACIENTES, JSON.stringify([
        {
          id: 'pac-1', fecha: hoy,
          servicioId: 'srv-1', examenId: 'exm-1', cantidad: 1, total: 5
        }
      ]));
    }
  }

  // ─────────────────────────────────────────────────────────────
  // MIGRACIÓN – Normaliza datos de versiones anteriores del app
  // ─────────────────────────────────────────────────────────────
  _migrar() {
    // Exámenes: esquema antiguo usaba valorBase/metodo/valorAumento
    const exs = this._get(this.KEYS.EXAMENES);
    let cambioEx = false;
    const exMig = exs.map(e => {
      if (e.valor === undefined) {
        cambioEx = true;
        return { id: e.id, nombre: e.nombre, valor: parseFloat(e.valorBase || 5) };
      }
      return e;
    });
    if (cambioEx) this._set(this.KEYS.EXAMENES, exMig);

    // Pacientes: esquema antiguo no tenía 'cantidad'
    const pacs = this._get(this.KEYS.PACIENTES);
    let cambioPac = false;
    const pacMig = pacs.map(p => {
      if (p.cantidad === undefined) {
        cambioPac = true;
        return {
          id: p.id, nombrePaciente: p.nombrePaciente, fecha: p.fecha,
          servicioId: p.servicioId, examenId: p.examenId,
          cantidad: 1,
          total: parseFloat(p.total || p.valorCalculado || p.valorBase || 0)
        };
      }
      return p;
    });
    if (cambioPac) this._set(this.KEYS.PACIENTES, pacMig);
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS INTERNOS
  // ─────────────────────────────────────────────────────────────
  _get(key)       { return JSON.parse(localStorage.getItem(key)) || []; }
  _set(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
  _uid(pfx)       { return `${pfx}-${Date.now()}`; }

  // ─────────────────────────────────────────────────────────────
  // SERVICIOS
  // ─────────────────────────────────────────────────────────────

  /** Retorna todos los servicios. */
  obtenerServicios() { return this._get(this.KEYS.SERVICIOS); }

  /**
   * Crea o actualiza un servicio.
   * Si s.id está vacío/null, asigna un nuevo id y lo inserta.
   * @param {{id?: string, nombre: string, fecha: string}} s
   * @returns {object} – El objeto guardado con id asignado
   */
  guardarServicio(s) {
    const list = this.obtenerServicios();
    if (s.id) {
      const i = list.findIndex(x => x.id === s.id);
      if (i !== -1) list[i] = s;
    } else {
      s.id = this._uid('srv');
      list.push(s);
    }
    this._set(this.KEYS.SERVICIOS, list);
    return s;
  }

  /**
   * Elimina un servicio por id.
   * @param {string} id
   */
  eliminarServicio(id) {
    this._set(this.KEYS.SERVICIOS,
      this.obtenerServicios().filter(s => s.id !== id));
  }

  // ─────────────────────────────────────────────────────────────
  // EXÁMENES
  // ─────────────────────────────────────────────────────────────

  /** Retorna todos los exámenes. */
  obtenerExamenes() { return this._get(this.KEYS.EXAMENES); }

  /**
   * Crea o actualiza un examen.
   * @param {{id?: string, nombre: string, valor: number}} e
   * @returns {object}
   */
  guardarExamen(e) {
    e.valor = parseFloat(e.valor) || 0;
    const list = this.obtenerExamenes();
    if (e.id) {
      const i = list.findIndex(x => x.id === e.id);
      if (i !== -1) list[i] = e;
    } else {
      e.id = this._uid('exm');
      list.push(e);
    }
    this._set(this.KEYS.EXAMENES, list);
    return e;
  }

  /**
   * Elimina un examen por id.
   * @param {string} id
   */
  eliminarExamen(id) {
    this._set(this.KEYS.EXAMENES,
      this.obtenerExamenes().filter(e => e.id !== id));
  }

  // ─────────────────────────────────────────────────────────────
  // PACIENTES (registros de atención)
  // ─────────────────────────────────────────────────────────────

  /** Retorna todos los registros de pacientes. */
  obtenerPacientes() { return this._get(this.KEYS.PACIENTES); }

  /**
   * Crea o actualiza un registro de paciente.
   * @param {{
   *   id?: string,
   *   nombrePaciente: string,
   *   fecha: string,
   *   servicioId: string,
   *   examenId: string,
   *   cantidad: number,
   *   total: number
   * }} p
   * @returns {object}
   */
  guardarPaciente(p) {
    p.cantidad = parseInt(p.cantidad) || 1;
    p.total    = parseFloat(p.total)  || 0;
    const list = this.obtenerPacientes();
    if (p.id) {
      const i = list.findIndex(x => x.id === p.id);
      if (i !== -1) list[i] = p;
    } else {
      p.id = this._uid('pac');
      list.push(p);
    }
    this._set(this.KEYS.PACIENTES, list);
    return p;
  }

  /**
   * Elimina un registro de paciente por id.
   * @param {string} id
   */
  eliminarPaciente(id) {
    this._set(this.KEYS.PACIENTES,
      this.obtenerPacientes().filter(p => p.id !== id));
  }
}
