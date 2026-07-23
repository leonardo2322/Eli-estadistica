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

    // 1. Servicios Predeterminados
    let srvExistentes = this._get(this.KEYS.SERVICIOS);
    let cambioSrv = false;

    if (!srvExistentes.length) {
      srvExistentes = SERVICIOS_PREDETERMINADOS.map((item, i) => ({
        id: `srv-${i + 1}`,
        nombre: item.nombre,
        key: item.key,
        fecha: hoy
      }));
      cambioSrv = true;
    } else {
      const norm = str => (str || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const nombresSet = new Set(srvExistentes.map(s => norm(s.nombre)));

      SERVICIOS_PREDETERMINADOS.forEach((item, idx) => {
        if (!nombresSet.has(norm(item.nombre))) {
          srvExistentes.push({
            id: `srv-auto-${Date.now()}-${idx}`,
            nombre: item.nombre,
            key: item.key,
            fecha: hoy
          });
          cambioSrv = true;
        }
      });
    }

    if (cambioSrv) {
      this._set(this.KEYS.SERVICIOS, srvExistentes);
    }

    // 2. Exámenes Predeterminados
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
        valor: 5,
        key: inferirExamenKey(nombre)
      }));
      cambioEx = true;
    } else {
      const norm = str => (str || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const nombresSet = new Set(exExistentes.map(e => norm(e.nombre)));

      examenesPredeterminados.forEach((nombre, idx) => {
        if (!nombresSet.has(norm(nombre))) {
          exExistentes.push({
            id: `exm-auto-${Date.now()}-${idx}`,
            nombre,
            valor: 5,
            key: inferirExamenKey(nombre)
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
    // Servicios: incorporar claves, areaId/hojaId y sembrar servicios predeterminados faltantes
    const hoy = DateUtils.getHoy();
    const srvs = this._get(this.KEYS.SERVICIOS);
    let cambioSrv = false;
    const norm = str => (str || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const nombresSet = new Set(srvs.map(s => norm(s.nombre)));

    const srvMig = srvs.map(s => {
      let mod = false;
      const nuevo = { ...s };
      if (!nuevo.key) {
        nuevo.key = inferirServicioKey(nuevo.nombre);
        mod = true;
      }
      if (!nuevo.areaId) {
        nuevo.areaId = 'hematologia';
        mod = true;
      }
      if (!nuevo.hojaId) {
        nuevo.hojaId = 'hematologia_h1';
        mod = true;
      }
      if (mod) cambioSrv = true;
      return nuevo;
    });

    SERVICIOS_PREDETERMINADOS.forEach((item, idx) => {
      if (!nombresSet.has(norm(item.nombre))) {
        srvMig.push({
          id: `srv-auto-${Date.now()}-${idx}`,
          nombre: item.nombre,
          key: item.key,
          areaId: 'hematologia',
          hojaId: 'hematologia_h1',
          fecha: hoy
        });
        cambioSrv = true;
      }
    });

    if (cambioSrv) this._set(this.KEYS.SERVICIOS, srvMig);

    // Exámenes: esquema antiguo usaba valorBase/metodo/valorAumento o no tenía 'key' / 'areaId' / 'hojaId'
    const exs = this._get(this.KEYS.EXAMENES);
    let cambioEx = false;
    const exMig = exs.map(e => {
      let mod = false;
      const nuevo = { ...e };
      if (nuevo.valor === undefined) {
        nuevo.valor = parseFloat(e.valorBase || 5);
        mod = true;
      }
      if (!nuevo.key) {
        nuevo.key = inferirExamenKey(nuevo.nombre);
        mod = true;
      }
      if (!nuevo.areaId) {
        const infArea = typeof inferirAreaDeExamen === 'function' ? inferirAreaDeExamen(nuevo.nombre) : 'hematologia';
        nuevo.areaId = (typeof EXAMEN_KEY_MAP !== 'undefined' && EXAMEN_KEY_MAP[nuevo.key]) ? EXAMEN_KEY_MAP[nuevo.key].areaId : infArea;
        mod = true;
      }
      if (!nuevo.hojaId) {
        const defaultHoja = typeof getHojasParaArea === 'function' && getHojasParaArea(nuevo.areaId)[0] ? getHojasParaArea(nuevo.areaId)[0].id : `${nuevo.areaId}_h1`;
        nuevo.hojaId = (typeof EXAMEN_KEY_MAP !== 'undefined' && EXAMEN_KEY_MAP[nuevo.key]) ? EXAMEN_KEY_MAP[nuevo.key].hojaId : defaultHoja;
        mod = true;
      }
      if (mod) cambioEx = true;
      return nuevo;
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

  setFirebaseRepository(fbRepo) {
    this.firebaseRepo = fbRepo;
  }

  /**
   * Crea o actualiza un servicio.
   * Si s.id está vacío/null, asigna un nuevo id y lo inserta.
   * @param {{id?: string, nombre: string, fecha: string, areaId?: string, hojaId?: string, key?: string}} s
   * @returns {object} – El objeto guardado con id asignado
   */
  guardarServicio(s) {
    if (!s.key) {
      s.key = inferirServicioKey(s.nombre);
    }
    if (!s.areaId) s.areaId = 'hematologia';
    if (!s.hojaId) {
      const hojas = typeof getHojasParaArea === 'function' ? getHojasParaArea(s.areaId) : [];
      s.hojaId = hojas[0] ? hojas[0].id : `${s.areaId}_h1`;
    }

    const list = this.obtenerServicios();
    if (s.id) {
      const i = list.findIndex(x => x.id === s.id);
      if (i !== -1) list[i] = s;
    } else {
      s.id = this._uid('srv');
      list.push(s);
    }
    this._set(this.KEYS.SERVICIOS, list);

    if (this.firebaseRepo) {
      this.firebaseRepo.guardarServicio(s);
    }
    return s;
  }

  /**
   * Elimina un servicio por id.
   * @param {string} id
   */
  eliminarServicio(id) {
    this._set(this.KEYS.SERVICIOS,
      this.obtenerServicios().filter(s => s.id !== id));

    if (this.firebaseRepo) {
      this.firebaseRepo.eliminarServicio(id);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // EXÁMENES
  // ─────────────────────────────────────────────────────────────

  /** Retorna todos los exámenes. */
  obtenerExamenes() { return this._get(this.KEYS.EXAMENES); }

  /**
   * Crea o actualiza un examen.
   * @param {{id?: string, nombre: string, valor: number, areaId?: string, hojaId?: string}} e
   * @returns {object}
   */
  guardarExamen(e) {
    e.valor = parseFloat(e.valor) || 0;
    if (!e.key) {
      e.key = inferirExamenKey(e.nombre);
    }
    if (!e.areaId) {
      e.areaId = typeof inferirAreaDeExamen === 'function' ? inferirAreaDeExamen(e.nombre) : 'hematologia';
    }
    if (!e.hojaId) {
      const config = typeof EXAMEN_KEY_MAP !== 'undefined' ? EXAMEN_KEY_MAP[e.key] : null;
      if (config && config.hojaId) {
        e.hojaId = config.hojaId;
      } else {
        const hojas = typeof getHojasParaArea === 'function' ? getHojasParaArea(e.areaId) : [];
        e.hojaId = hojas[0] ? hojas[0].id : `${e.areaId}_h1`;
      }
    }

    const list = this.obtenerExamenes();
    if (e.id) {
      const i = list.findIndex(x => x.id === e.id);
      if (i !== -1) list[i] = e;
    } else {
      e.id = this._uid('exm');
      list.push(e);
    }
    this._set(this.KEYS.EXAMENES, list);

    if (this.firebaseRepo) {
      this.firebaseRepo.guardarExamen(e);
    }
    return e;
  }

  /**
   * Elimina un examen por id.
   * @param {string} id
   */
  eliminarExamen(id) {
    this._set(this.KEYS.EXAMENES,
      this.obtenerExamenes().filter(e => e.id !== id));

    if (this.firebaseRepo) {
      this.firebaseRepo.eliminarExamen(id);
    }
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

    if (this.firebaseRepo) {
      this.firebaseRepo.guardarPaciente(p);
    }
    return p;
  }

  /**
   * Elimina un registro de paciente por id.
   * @param {string} id
   */
  eliminarPaciente(id) {
    this._set(this.KEYS.PACIENTES,
      this.obtenerPacientes().filter(p => p.id !== id));

    if (this.firebaseRepo) {
      this.firebaseRepo.eliminarPaciente(id);
    }
  }
}
