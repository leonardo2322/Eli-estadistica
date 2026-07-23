/**
 * =========================================================================
 * js/views/app-view.js
 * -------------------------------------------------------------------------
 * Vista principal del módulo de Bioanálisis (Mantenimiento + Pacientes).
 *
 * RESPONSABILIDAD:
 *   - Renderizar tablas de Servicios, Exámenes y Pacientes.
 *   - Gestionar formularios de creación/edición (Servicios, Exámenes, Pacientes).
 *   - Actualizar los selectores desplegables.
 *   - Calcular el total en tiempo real (valor × cantidad).
 *   - Renderizar el resumen diario y las stat-cards del dashboard.
 *   - Gestionar el panel de exportación.
 *   - Navegación entre secciones del navbar.
 *
 * NOTA: Esta clase NO conoce la lógica de negocio. Sólo recibe datos y
 *       dispara callbacks hacia el controlador.
 * =========================================================================
 */

'use strict';

const FRASES_ELIANA = [
  '"Dicen que los buenos resultados dependen de la muestra... pero esta aplicación tuvo la suerte de tener a la más hermosa y mejor licenciada en bioanálisis, Eliana Morales."',
  '"No hay microscopio en el mundo capaz de medir lo grande que es tu talento, dedicación y corazón, hermosa Eliana Morales."',
  '"Cada análisis que realizas lleva la marca de tu excelencia, pasión y dulzura. ¡Sigue brillando siempre, Eli!"',
  '"En cada muestra pones tu corazón y tu ciencia. La medicina y este laboratorio son mejores gracias a ti, Lic. Eliana Morales."',
  '"Tu sonrisa ilumina el laboratorio y tu profesionalismo inspira a todos a tu alrededor. ¡Mucho ánimo en tu jornada!"',
  '"Entre pipetas, reactivos y tubos de ensayo, la fórmula perfecta siempre serás tú, bella Eliana Morales."',
  '"Que la precisión te acompañe en cada análisis y el éxito corone todos tus resultados de hoy. ¡Eres la mejor!"',
  '"Con amor, ciencia y entrega impecable, haces que cada día de trabajo se convierta en una obra maestra. ¡Orgullosos de ti!"'
];

function esServicioDeArea(nombreServicio, areaId) {
  if (!areaId) return true;
  const norm = (nombreServicio || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // Para Serología: ÚNICAMENTE los 5 servicios oficiales de las planillas de Serología (H1 y H2)
  if (areaId === 'serologia') {
    const SERVICIOS_SEROLOGIA = [
      'emergencia adulto',
      'emergencia pediatrica',
      'hospitalizacion',
      'consulta externa',
      'consulta especial'
    ];
    return SERVICIOS_SEROLOGIA.some(s => norm.includes(s));
  }

  // Para Uroanálisis: los 5 principales + Prenatal
  if (areaId === 'uroanalisis') {
    const SERVICIOS_UROANALISIS = [
      'emergencia adulto',
      'emergencia pediatrica',
      'hospitalizacion',
      'consulta externa',
      'consulta especial',
      'prenatal'
    ];
    return SERVICIOS_UROANALISIS.some(s => norm.includes(s));
  }

  // Para Coproanálisis y Hematología: omitir Prenatal que es exclusivo de Uroanálisis
  if (norm.includes('prenatal')) {
    return false;
  }

  return true;
}

function inferirAreaDeExamen(nombre) {
  const norm = (nombre || '').toLowerCase().trim();

  const HEMATOLOGIA = [
    'hematología', 'hemoglobina', 'hematocrito', 'plaquetas', 
    'diferencial', 'contaje de b', 'vsg', 'gota gruesa', 'frotis'
  ];

  const UROANALISIS = [
    'orina', 'glucosa', 'proteínas', 'sedimentos', 'p.h', 
    'densidad', 'pigmentos biliares'
  ];

  const COPROANALISIS = [
    'heces', 'directos sol-sal', 'directos sol-lugol', 'kato', 'sangre oculta',
    'ascaris', 'ancylostoma', 'trichuris', 'enterobius', 'hymenolepis', 
    'entamoeba', 'strongyloides', 'balantidium', 'yodamoeba', 'endolimax', 
    'giardia', 'tricomonas', 'chilomastix', 'blastocystis', 'taenia', 'levaduras'
  ];

  if (HEMATOLOGIA.some(k => norm.includes(k))) return 'hematologia';
  if (UROANALISIS.some(k => norm.includes(k))) return 'uroanalisis';
  if (COPROANALISIS.some(k => norm.includes(k))) return 'coproanalisis';
  return 'serologia';
}

function getAreaBadgeHTML(areaId) {
  switch (areaId) {
    case 'hematologia':
      return `<span class="badge bg-danger-subtle text-danger border border-danger-subtle me-1">🩸 Hematología</span>`;
    case 'uroanalisis':
      return `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle me-1">🧪 Uroanálisis</span>`;
    case 'coproanalisis':
      return `<span class="badge bg-primary-subtle text-primary border border-primary-subtle me-1">💩 Coproanálisis</span>`;
    default:
      return `<span class="badge bg-info-subtle text-info-emphasis border border-info-subtle me-1">🔬 Serología/Química</span>`;
  }
}

class AppView {

  constructor() {
    this.$app       = document.getElementById('main-app');
    this.$navLinks  = document.querySelectorAll('#main-nav-tabs .nav-link');
    this.$sections  = document.querySelectorAll('.app-section');

    // ── Dashboard stats ────────────────────────────────────────
    this.$statPac   = document.getElementById('stat-pacientes');
    this.$statServ  = document.getElementById('stat-servicios');
    this.$statExam  = document.getElementById('stat-examenes');
    this.$statsHoy  = document.getElementById('stats-hoy-examenes');

    // ── Servicios ──────────────────────────────────────────────
    this.$frmServ       = document.getElementById('form-servicio');
    this.$servId        = document.getElementById('servicio-id');
    this.$servNombre    = document.getElementById('servicio-nombre');
    this.$servFecha     = document.getElementById('servicio-fecha');
    this.$servArea      = document.getElementById('servicio-area');
    this.$servHoja      = document.getElementById('servicio-hoja');
    this.$btnSaveServ   = document.getElementById('btn-guardar-servicio');
    this.$btnCancelServ = document.getElementById('btn-cancelar-servicio');
    this.$tbodyServ     = document.getElementById('tabla-servicios-cuerpo');

    // ── Exámenes ───────────────────────────────────────────────
    this.$frmExam       = document.getElementById('form-examen');
    this.$examId        = document.getElementById('examen-id');
    this.$examNombre    = document.getElementById('examen-nombre');
    this.$examValor     = document.getElementById('examen-valor');
    this.$examArea      = document.getElementById('examen-area');
    this.$examHoja      = document.getElementById('examen-hoja');
    this.$btnSaveExam   = document.getElementById('btn-guardar-examen');
    this.$btnCancelExam = document.getElementById('btn-cancelar-examen');
    this.$tbodyExam     = document.getElementById('tabla-examenes-cuerpo');

    // ── Pacientes / Registro de Atención ──────────────────────
    this.$frmPac          = document.getElementById('form-paciente');
    this.$pacId           = document.getElementById('paciente-registro-id');
    this.$pacFecha        = document.getElementById('paciente-fecha');
    this.$selArea         = document.getElementById('paciente-area');
    this.$selServicio     = document.getElementById('paciente-servicio');
    this.$selExamen       = document.getElementById('paciente-examen');
    this.$pacCantidad     = document.getElementById('paciente-cantidad');
    this.$pacTotal        = document.getElementById('paciente-total');
    this.$btnSavePac      = document.getElementById('btn-guardar-paciente');
    this.$btnCancelPac    = document.getElementById('btn-cancelar-paciente');
    this.$tituloPacForm   = document.getElementById('titulo-form-paciente');
    this.$btnFinalizarTurno = document.getElementById('btn-finalizar-turno');

    // ── Historial ──────────────────────────────────────────────
    this.$tbodyPac   = document.getElementById('tabla-pacientes-cuerpo');
    this.$badge      = document.getElementById('badge-total-registros');
    this.$filtroQ    = document.getElementById('filtro-busqueda');
    this.$filtroFecha = document.getElementById('filtro-fecha');
    this.$filtroServ = document.getElementById('filtro-servicio');
    this.$filtroExam = document.getElementById('filtro-examen');
    this.$sinResult  = document.getElementById('sin-resultados');

    // ── Resumen ────────────────────────────────────────────────
    this.$fechaResumen  = document.getElementById('fecha-resumen');
    this.$tbodyResumen  = document.getElementById('tabla-resumen-cuerpo');
    this.$resumenCant   = document.getElementById('resumen-total-cant');
    this.$resumenVal    = document.getElementById('resumen-total-val');

    // ── Panel exportar ─────────────────────────────────────────
    this.$overlay       = document.getElementById('export-overlay');
    this.$btnAbrirExport = document.getElementById('btn-abrir-export');
    this.$btnCerrarExp  = document.getElementById('btn-cerrar-export');
    this.$btnCsvHist    = document.getElementById('btn-csv-historial');
    this.$btnCsvResumen = document.getElementById('btn-csv-resumen');
    this.$btnCorreo     = document.getElementById('btn-correo');

    // Callbacks de tabla (asignados en bind*)
    this._cbServEdit = null; this._cbServDel = null;
    this._cbExamEdit = null; this._cbExamDel = null;
    this._cbPacEdit  = null; this._cbPacDel  = null;
    this._pacList    = [];   // copia para lookup en delegation
    this._calcFn     = null; // función de cálculo en tiempo real

    this._initNav();
    this._setFechaHoy();
    this._initTableDelegation();
    this._initMantenimientoSelects();
    this._initFrasesRotativas();
  }

  // ════════════════════════════════════════════════════════════
  // INICIALIZACIÓN INTERNA
  // ════════════════════════════════════════════════════════════

  /**
   * Inicializa la actualización dinámica de las Hojas según el Área seleccionada
   * en los formularios de Mantenimiento (Servicios y Exámenes).
   */
  _initMantenimientoSelects() {
    const actualizarHojasServ = () => {
      if (!this.$servArea || !this.$servHoja) return;
      const areaId = this.$servArea.value;
      const hojas = typeof getHojasParaArea === 'function' ? getHojasParaArea(areaId) : [];
      DomHelpers.reconstruirSelect(this.$servHoja, hojas, null, 'id', 'label');
    };

    const actualizarHojasExam = () => {
      if (!this.$examArea || !this.$examHoja) return;
      const areaId = this.$examArea.value;
      const hojas = typeof getHojasParaArea === 'function' ? getHojasParaArea(areaId) : [];
      DomHelpers.reconstruirSelect(this.$examHoja, hojas, null, 'id', 'label');
    };

    if (this.$servArea) {
      this.$servArea.addEventListener('change', actualizarHojasServ);
      actualizarHojasServ();
    }
    if (this.$examArea) {
      this.$examArea.addEventListener('change', actualizarHojasExam);
      actualizarHojasExam();
    }
  }

  /** Rotación suave de frases cariñosas en el hero banner + soporte para doble clic. */
  _initFrasesRotativas() {
    const $heroText = document.getElementById('hero-title-text');
    if (!$heroText) return;

    $heroText.style.cursor = 'pointer';
    $heroText.title = 'Haz doble clic para ver otro mensaje ❤️';

    let idx = 0;
    let animando = false;

    const cambiarFrase = () => {
      if (animando) return;
      animando = true;
      $heroText.style.opacity = '0';
      $heroText.style.transform = 'translateY(-6px)';

      setTimeout(() => {
        idx = (idx + 1) % FRASES_ELIANA.length;
        $heroText.textContent = FRASES_ELIANA[idx];
        $heroText.style.opacity = '1';
        $heroText.style.transform = 'translateY(0)';
        setTimeout(() => { animando = false; }, 800);
      }, 800);
    };

    // Cambiar automáticamente cada 7 segundos
    let intervalId = setInterval(cambiarFrase, 7000);

    // Cambiar inmediatamente al hacer doble clic
    const heroContainer = $heroText.closest('.hero-card') || $heroText;
    heroContainer.addEventListener('dblclick', (e) => {
      e.preventDefault();
      clearInterval(intervalId);
      cambiarFrase();
      intervalId = setInterval(cambiarFrase, 7000);
    });
  }

  /** Inicializa la navegación del navbar. */
  _initNav() {
    const bsNav = bootstrap.Collapse.getOrCreateInstance(
      document.getElementById('navbarNav'), { toggle: false });

    this.$navLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        this.$navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        this.$sections.forEach(s =>
          s.classList.toggle('d-none', s.id !== link.dataset.section));
        if (window.innerWidth < 992) bsNav.hide();
      });
    });
  }

  /** Pone la fecha de hoy en los campos de fecha. */
  _setFechaHoy() {
    const hoy = DateUtils.getHoy();
    if (this.$servFecha)   this.$servFecha.value   = hoy;
    if (this.$pacFecha)    this.$pacFecha.value     = hoy;
    if (this.$fechaResumen) this.$fechaResumen.value = hoy;
  }

  /**
   * Configura event delegation en los tres tbody de tablas.
   * Implementa borrado de doble-toque: 1er toque → alerta roja, 2do → borra.
   * No usa confirm() para mejor UX en móviles.
   */
  _initTableDelegation() {
    const armarConfirm = (btn, originalHTML) => {
      btn.dataset.confirming = '1';
      btn.classList.remove('btn-outline-danger');
      btn.classList.add('btn-danger');
      btn.innerHTML = '<i class="bi bi-exclamation-lg"></i>¿Borrar?';
      btn._timer = setTimeout(() => {
        btn.dataset.confirming = '0';
        btn.classList.add('btn-outline-danger');
        btn.classList.remove('btn-danger');
        btn.innerHTML = originalHTML;
      }, 2500);
    };

    // Servicios
    this.$tbodyServ.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      e.stopPropagation();
      const { action, id } = btn.dataset;
      if (action === 'edit' && this._cbServEdit) {
        const s = this._servList?.find(x => x.id === id);
        if (s) this._cbServEdit(s);
      } else if (action === 'del' && this._cbServDel) {
        if (btn.dataset.confirming === '1') {
          clearTimeout(btn._timer);
          this._cbServDel(id);
        } else {
          armarConfirm(btn, '<i class="bi bi-trash-fill"></i>');
        }
      }
    });

    // Exámenes
    this.$tbodyExam.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      e.stopPropagation();
      const { action, id } = btn.dataset;
      if (action === 'edit' && this._cbExamEdit) {
        const ex = this._examList?.find(x => x.id === id);
        if (ex) this._cbExamEdit(ex);
      } else if (action === 'del' && this._cbExamDel) {
        if (btn.dataset.confirming === '1') {
          clearTimeout(btn._timer);
          this._cbExamDel(id);
        } else {
          armarConfirm(btn, '<i class="bi bi-trash-fill"></i>');
        }
      }
    });

    // Pacientes
    this.$tbodyPac.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      e.stopPropagation();
      const { action, id } = btn.dataset;
      if (action === 'edit' && this._cbPacEdit) {
        const p = this._pacList.find(x => x.id === id);
        if (p) this._cbPacEdit(p);
      } else if (action === 'del' && this._cbPacDel) {
        if (btn.dataset.confirming === '1') {
          clearTimeout(btn._timer);
          this._cbPacDel(id);
        } else {
          armarConfirm(btn, '<i class="bi bi-trash-fill"></i>');
        }
      }
    });
  }

  // ════════════════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════════════════
  mostrar() { this.$app.classList.remove('d-none'); }

  // ════════════════════════════════════════════════════════════
  // SERVICIOS
  // ════════════════════════════════════════════════════════════

  renderServicios(list, onEdit, onDel) {
    this._servList   = list;
    this._cbServEdit = onEdit;
    this._cbServDel  = onDel;
    this.$tbodyServ.innerHTML = '';

    if (!list.length) {
      this.$tbodyServ.innerHTML =
        `<tr><td colspan="4" class="text-center text-muted py-3">Sin servicios registrados.</td></tr>`;
      return;
    }

    list.forEach(s => {
      const areaBadge = getAreaBadgeHTML(s.areaId || 'hematologia');
      const hojaNom   = getHojaNombre(s.areaId || 'hematologia', s.hojaId || 'hematologia_h1');
      const hojaBadge = `<span class="badge bg-secondary-subtle text-dark border border-secondary-subtle">${DomHelpers.esc(hojaNom)}</span>`;

      this.$tbodyServ.appendChild(DomHelpers.crearFila(`
        <td class="fw-semibold text-teal-dark">${DomHelpers.esc(s.nombre)}</td>
        <td>${areaBadge} ${hojaBadge}</td>
        <td>${s.fecha}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-teal btn-action-sm me-1"
            data-action="edit" data-id="${s.id}"><i class="bi bi-pencil-square"></i></button>
          <button class="btn btn-sm btn-outline-danger btn-action-sm"
            data-action="del" data-id="${s.id}" data-confirming="0"><i class="bi bi-trash-fill"></i></button>
        </td>`));
    });
  }

  fillServForm(s) {
    this.$servId.value     = s.id;
    this.$servNombre.value = s.nombre;
    this.$servFecha.value  = s.fecha;
    if (this.$servArea && s.areaId) {
      this.$servArea.value = s.areaId;
      this.$servArea.dispatchEvent(new Event('change'));
    }
    if (this.$servHoja && s.hojaId) {
      this.$servHoja.value = s.hojaId;
    }
    this.$btnSaveServ.innerHTML = `<i class="bi bi-check-circle me-1"></i>Actualizar`;
    this.$btnCancelServ.classList.remove('d-none');
  }

  clearServForm() {
    this.$frmServ.reset();
    this.$servId.value    = '';
    this.$servFecha.value = DateUtils.getHoy();
    if (this.$servArea) {
      this.$servArea.value = 'hematologia';
      this.$servArea.dispatchEvent(new Event('change'));
    }
    this.$btnSaveServ.innerHTML = `<i class="bi bi-plus-circle me-1"></i>Guardar`;
    this.$btnCancelServ.classList.add('d-none');
  }

  bindServForm(handler) {
    this.$frmServ.addEventListener('submit', e => {
      e.preventDefault();
      if (!this.$frmServ.checkValidity()) { this.$frmServ.reportValidity(); return; }
      handler({
        id: this.$servId.value || null,
        nombre: this.$servNombre.value.trim(),
        fecha: this.$servFecha.value,
        areaId: this.$servArea ? this.$servArea.value : 'hematologia',
        hojaId: this.$servHoja ? this.$servHoja.value : 'hematologia_h1'
      });
    });
    this.$btnCancelServ.addEventListener('click', () => this.clearServForm());
  }

  // ════════════════════════════════════════════════════════════
  // EXÁMENES
  // ════════════════════════════════════════════════════════════

  renderExamenes(list, onEdit, onDel) {
    this._examList   = list;
    this._cbExamEdit = onEdit;
    this._cbExamDel  = onDel;
    this.$tbodyExam.innerHTML = '';

    if (!list.length) {
      this.$tbodyExam.innerHTML =
        `<tr><td colspan="4" class="text-center text-muted py-3">Sin exámenes registrados.</td></tr>`;
      return;
    }

    list.forEach(e => {
      const areaBadge = getAreaBadgeHTML(e.areaId || 'hematologia');
      const hojaNom   = getHojaNombre(e.areaId || 'hematologia', e.hojaId || 'hematologia_h1');
      const hojaBadge = `<span class="badge bg-secondary-subtle text-dark border border-secondary-subtle">${DomHelpers.esc(hojaNom)}</span>`;

      this.$tbodyExam.appendChild(DomHelpers.crearFila(`
        <td class="fw-semibold text-pink-dark">${DomHelpers.esc(e.nombre)}</td>
        <td>${areaBadge} ${hojaBadge}</td>
        <td class="text-end fw-bold text-teal">${parseFloat(e.valor).toFixed(2)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-pink btn-action-sm me-1"
            data-action="edit" data-id="${e.id}"><i class="bi bi-pencil-square"></i></button>
          <button class="btn btn-sm btn-outline-danger btn-action-sm"
            data-action="del" data-id="${e.id}" data-confirming="0"><i class="bi bi-trash-fill"></i></button>
        </td>`));
    });
  }

  fillExamForm(e) {
    this.$examId.value     = e.id;
    this.$examNombre.value = e.nombre;
    this.$examValor.value  = e.valor;
    if (this.$examArea && e.areaId) {
      this.$examArea.value = e.areaId;
      this.$examArea.dispatchEvent(new Event('change'));
    }
    if (this.$examHoja && e.hojaId) {
      this.$examHoja.value = e.hojaId;
    }
    this.$btnSaveExam.innerHTML = `<i class="bi bi-check-circle me-1"></i>Actualizar`;
    this.$btnCancelExam.classList.remove('d-none');
  }

  clearExamForm() {
    this.$frmExam.reset();
    this.$examId.value    = '';
    this.$examValor.value = '5';
    if (this.$examArea) {
      this.$examArea.value = 'hematologia';
      this.$examArea.dispatchEvent(new Event('change'));
    }
    this.$btnSaveExam.innerHTML = `<i class="bi bi-plus-circle me-1"></i>Guardar`;
    this.$btnCancelExam.classList.add('d-none');
  }

  bindExamForm(handler) {
    this.$frmExam.addEventListener('submit', e => {
      e.preventDefault();
      if (!this.$frmExam.checkValidity()) { this.$frmExam.reportValidity(); return; }
      handler({
        id: this.$examId.value || null,
        nombre: this.$examNombre.value.trim(),
        valor: parseFloat(this.$examValor.value),
        areaId: this.$examArea ? this.$examArea.value : 'hematologia',
        hojaId: this.$examHoja ? this.$examHoja.value : 'hematologia_h1'
      });
    });
    this.$btnCancelExam.addEventListener('click', () => this.clearExamForm());
  }

  // ════════════════════════════════════════════════════════════
  // SELECTS + CÁLCULO EN TIEMPO REAL
  // ════════════════════════════════════════════════════════════

  // ════════════════════════════════════════════════════════════
  // SELECTS + CÁLCULO EN TIEMPO REAL
  // ════════════════════════════════════════════════════════════

  actualizarSelects(servicios, examenes) {
    this._examenes = examenes;
    this._servicios = servicios;

    DomHelpers.reconstruirSelect(this.$selServicio, servicios, 'Seleccione un servicio...', 'id', 'nombre');

    const filtrarOpcionesPorArea = () => {
      const areaSeleccionada = this.$selArea ? this.$selArea.value : '';
      let examenesFiltrados = examenes;
      let serviciosFiltrados = servicios;

      if (areaSeleccionada) {
        examenesFiltrados = examenes.filter(e => (e.areaId === areaSeleccionada || inferirAreaDeExamen(e.nombre) === areaSeleccionada));
        serviciosFiltrados = servicios.filter(s => (s.areaId === areaSeleccionada || esServicioDeArea(s.nombre, areaSeleccionada)));
      }

      DomHelpers.reconstruirSelect(this.$selExamen, examenesFiltrados, 'Seleccione un examen...', 'id', 'nombre');
      DomHelpers.reconstruirSelect(this.$selServicio, serviciosFiltrados, 'Seleccione un servicio...', 'id', 'nombre');
      if (this._calcFn) this._calcFn();
    };

    if (this.$selArea && !this._boundAreaChange) {
      this.$selArea.addEventListener('change', () => {
        filtrarOpcionesPorArea();
      });
      this._boundAreaChange = true;
    }

    filtrarOpcionesPorArea();

    const fsv = this.$filtroServ.value;
    const fex = this.$filtroExam.value;
    DomHelpers.reconstruirSelect(this.$filtroServ, servicios, 'Todos los Servicios', 'id', 'nombre', false);
    DomHelpers.reconstruirSelect(this.$filtroExam, examenes,  'Todos los Exámenes',  'id', 'nombre', false);
    this.$filtroServ.value = fsv;
    this.$filtroExam.value = fex;

    if (this._calcFn) this._calcFn();
  }

  bindCalculo() {
    const calc = () => {
      const exId  = this.$selExamen.value;
      const exam  = (this._examenes || []).find(e => e.id === exId);
      const valor = exam ? (parseFloat(exam.valor) || 0) : 0;
      const cant  = Math.max(1, parseInt(this.$pacCantidad.value) || 1);
      this.$pacTotal.value = (valor * cant).toFixed(2);
    };
    this._calcFn = calc;
    this.$selExamen.addEventListener('change', calc);
    this.$pacCantidad.addEventListener('input',  calc);
    this.$pacCantidad.addEventListener('change', calc);
  }

  // ════════════════════════════════════════════════════════════
  // PACIENTES
  // ════════════════════════════════════════════════════════════

  renderPacientes(list, servicios, examenes, onEdit, onDel) {
    this._pacList  = list;
    this._cbPacEdit = onEdit;
    this._cbPacDel  = onDel;
    this.$tbodyPac.innerHTML = '';
    this.$badge.textContent  = `${list.length} Registros`;

    if (!list.length) {
      this.$sinResult.classList.remove('d-none');
      return;
    }
    this.$sinResult.classList.add('d-none');

    list.forEach(p => {
      const serv = servicios.find(s => s.id === p.servicioId) || { nombre: '—' };
      const exam = examenes.find(e  => e.id === p.examenId)  || { nombre: '—' };
      const areaId = inferirAreaDeExamen(exam.nombre);
      const areaBadge = getAreaBadgeHTML(areaId);

      this.$tbodyPac.appendChild(DomHelpers.crearFila(`
        <td class="text-nowrap">${p.fecha}</td>
        <td><span class="badge bg-soft-teal">${DomHelpers.esc(serv.nombre)}</span></td>
        <td>${areaBadge} <span class="badge bg-soft-pink">${DomHelpers.esc(exam.nombre)}</span></td>
        <td class="text-center fw-bold">${p.cantidad}</td>
        <td class="text-end fw-bold text-teal">${parseFloat(p.total).toFixed(2)}</td>
        <td class="text-end text-nowrap">
          <button class="btn btn-sm btn-outline-teal btn-action-sm me-1"
            data-action="edit" data-id="${p.id}"><i class="bi bi-pencil-square"></i></button>
          <button class="btn btn-sm btn-outline-danger btn-action-sm"
            data-action="del" data-id="${p.id}" data-confirming="0"><i class="bi bi-trash-fill"></i></button>
        </td>`));
    });
  }

  fillPacForm(p) {
    this.$pacId.value        = p.id;
    this.$pacFecha.value     = p.fecha;
    this.$selServicio.value  = p.servicioId;

    const exam = (this._examenes || []).find(e => e.id === p.examenId);
    if (exam && this.$selArea) {
      this.$selArea.value = inferirAreaDeExamen(exam.nombre);
      this.actualizarSelects(this._servicios || [], this._examenes || []);
    }

    this.$selExamen.value    = p.examenId;
    this.$pacCantidad.value  = p.cantidad;
    this.$pacTotal.value     = parseFloat(p.total).toFixed(2);
    this.$tituloPacForm.innerHTML = `<i class="bi bi-pencil-square me-2"></i>Editar Registro`;
    this.$btnSavePac.innerHTML    = `<i class="bi bi-check-circle-fill me-1"></i>Guardar Cambios`;
    this.$btnCancelPac.classList.remove('d-none');
  }

  clearPacForm() {
    this.$frmPac.reset();
    this.$pacId.value       = '';
    this.$pacFecha.value    = DateUtils.getHoy();
    if (this.$selArea) {
      this.$selArea.value = '';
    }
    this.actualizarSelects(this._servicios || [], this._examenes || []);
    this.$pacCantidad.value = '1';
    this.$pacTotal.value    = '0.00';
    this.$tituloPacForm.innerHTML = `<i class="bi bi-file-medical-fill me-2"></i>Registrar Atención / Examen`;
    this.$btnSavePac.innerHTML    = `<i class="bi bi-save me-1"></i>Guardar Registro`;
    this.$btnCancelPac.classList.add('d-none');
  }

  bindPacForm(handler) {
    this.$frmPac.addEventListener('submit', e => {
      e.preventDefault();
      if (!this.$frmPac.checkValidity()) { this.$frmPac.reportValidity(); return; }
      handler({
        id:             this.$pacId.value || null,
        fecha:          this.$pacFecha.value,
        servicioId:     this.$selServicio.value,
        examenId:       this.$selExamen.value,
        cantidad:       parseInt(this.$pacCantidad.value) || 1,
        total:          parseFloat(this.$pacTotal.value)  || 0
      });
    });
    this.$btnCancelPac.addEventListener('click', () => this.clearPacForm());
  }

  bindFinalizarTurno(handler) {
    if (this.$btnFinalizarTurno) {
      this.$btnFinalizarTurno.addEventListener('click', () => handler());
    }
  }

  bindFiltros(onChange) {
    [this.$filtroQ, this.$filtroFecha, this.$filtroServ, this.$filtroExam].forEach(el => {
      if (!el) return;
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input',
        () => onChange({
          q: this.$filtroQ.value,
          fechaFiltro: this.$filtroFecha ? this.$filtroFecha.value : '',
          servicioId: this.$filtroServ.value,
          examenId: this.$filtroExam.value
        }));
    });
  }

  // ════════════════════════════════════════════════════════════
  // RESUMEN DEL DÍA
  // ════════════════════════════════════════════════════════════

  renderResumen(rows, totalCant, totalVal) {
    this.$tbodyResumen.innerHTML = '';
    this.$resumenCant.textContent = totalCant;
    this.$resumenVal.textContent  = totalVal.toFixed(2);

    if (!rows.length) {
      this.$tbodyResumen.innerHTML =
        `<tr><td colspan="3" class="text-center text-muted py-3">Sin exámenes para esta fecha.</td></tr>`;
      return;
    }

    rows.forEach(r => {
      this.$tbodyResumen.appendChild(DomHelpers.crearFila(`
        <td class="fw-semibold text-pink-dark">${DomHelpers.esc(r.nombre)}</td>
        <td class="text-center fw-bold">${r.cantidad}</td>
        <td class="text-end fw-bold text-teal">${r.total.toFixed(2)}</td>`));
    });
  }

  bindFechaResumen(onChange) {
    this.$fechaResumen.addEventListener('change', () => onChange(this.$fechaResumen.value));
  }

  getFechaResumen() { return this.$fechaResumen.value; }

  // ════════════════════════════════════════════════════════════
  // STAT-CARDS HOY (Dashboard)
  // ════════════════════════════════════════════════════════════

  renderStatsHoy(rows) {
    if (!this.$statsHoy) return;
    this.$statsHoy.innerHTML = '';

    if (!rows.length) {
      this.$statsHoy.innerHTML = `
        <div class="col-12">
          <div class="alert alert-teal-soft d-flex align-items-center gap-2 mb-0">
            <span style="font-size:1.4rem">🔬</span>
            <span class="text-teal-dark fw-semibold">Sin exámenes registrados hoy. ¡Comienza el registro!</span>
          </div>
        </div>`;
      return;
    }

    const defaultEmojis = ['🧪', '💉', '🔬', '🧬', '🌡️', '💊', '🩺', '🏥'];
    const getEmoji = nombre => {
      const n = nombre.toLowerCase();
      if (/heces|fecal|coprol|materia fecal/.test(n))  return '💩';
      if (/sangr|hemo|hemat|eritro|leuco|plaqueta/.test(n)) return '🩸';
      if (/orin|urin|uroan/.test(n))                   return '🧫';
      if (/cultiv|bacteri|microbi/.test(n))             return '🦠';
      if (/hormon|tiroides|tsh|glicemia|glucosa/.test(n)) return '⚗️';
      if (/rayos|ultrason|ecograf|tomograf/.test(n))    return '🩻';
      return null;
    };

    rows.forEach((r, i) => {
      const emoji = getEmoji(r.nombre) ?? defaultEmojis[i % defaultEmojis.length];
      this.$statsHoy.insertAdjacentHTML('beforeend', `
        <div class="col-6 col-md-3">
          <div class="stat-card-hoy">
            <div class="stat-hoy-emoji">${emoji}</div>
            <div class="stat-hoy-nombre">${DomHelpers.esc(r.nombre)}</div>
            <div class="stat-hoy-cantidad">${r.cantidad}</div>
            <div class="stat-hoy-label">examen(es) hoy</div>
            <div class="stat-hoy-total">Total: <strong>${r.total.toFixed(2)}</strong></div>
          </div>
        </div>`);
    });
  }

  // ════════════════════════════════════════════════════════════
  // PANEL EXPORTAR
  // ════════════════════════════════════════════════════════════

  bindExport(onCsvHist, onCsvResumen, onCorreo) {
    this.$btnAbrirExport.addEventListener('click', () => {
      this.$overlay.classList.remove('d-none');
      document.body.style.overflow = 'hidden';
    });
    this.$btnCerrarExp.addEventListener('click', () => this._cerrarExport());
    this.$overlay.addEventListener('click', e => { if (e.target === this.$overlay) this._cerrarExport(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this._cerrarExport(); });
    this.$btnCsvHist.addEventListener('click',    () => onCsvHist());
    this.$btnCsvResumen.addEventListener('click', () => onCsvResumen(this.$fechaResumen.value));
    this.$btnCorreo.addEventListener('click',     () => onCorreo(this.$fechaResumen.value));
  }

  _cerrarExport() {
    this.$overlay.classList.add('d-none');
    document.body.style.overflow = '';
  }

  // ════════════════════════════════════════════════════════════
  // DASHBOARD GENERAL
  // ════════════════════════════════════════════════════════════

  updateStats(pac, serv, exam) {
    this.$statPac.textContent  = pac;
    this.$statServ.textContent = serv;
    this.$statExam.textContent = exam;
  }
}
