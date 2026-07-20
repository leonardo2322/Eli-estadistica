/**
 * =========================================================================
 * ELI-ESTADÍSTICA – PORTAL DE BIOANÁLISIS
 * Arquitectura MVC – Dedicado a la Lic. Eliana Morales
 * =========================================================================
 *
 * LÓGICA DE NEGOCIO:
 *   - Cada Examen tiene un Nombre y un Valor (ej. Orina = 5).
 *   - Registro paciente: selecciona el Examen + Cantidad → Total = Valor × Cantidad.
 *   - Resumen del Día: suma cantidades y totales por tipo de examen para una fecha.
 *
 * NOTAS TÉCNICAS:
 *   - Eliminación sin confirm() → doble clic: 1er clic muestra alerta roja, 2do elimina.
 *   - Event delegation en cada tbody → listeners nunca se pierden al re-renderizar.
 *   - Panel de exportación propio (sin Bootstrap Modal) → sin backdrop negro.
 */

// ══════════════════════════════════════════════════════════════════
// 1. REPOSITORIO
// ══════════════════════════════════════════════════════════════════
class BioanalisisRepository {
  constructor () {
    this.KEYS = { SERVICIOS: 'eli_servicios', EXAMENES: 'eli_examenes', PACIENTES: 'eli_pacientes' };
    this._seed();
    this._migrar();
  }

  _seed () {
    const hoy = this._hoy();
    if (!localStorage.getItem(this.KEYS.SERVICIOS)) {
      localStorage.setItem(this.KEYS.SERVICIOS, JSON.stringify([
        { id: 'srv-1', nombre: 'Emergencia',       fecha: hoy },
        { id: 'srv-2', nombre: 'Consulta Externa',  fecha: hoy },
        { id: 'srv-3', nombre: 'Hospitalización',   fecha: hoy }
      ]));
    }
    if (!localStorage.getItem(this.KEYS.EXAMENES)) {
      localStorage.setItem(this.KEYS.EXAMENES, JSON.stringify([
        { id: 'exm-1', nombre: 'Orina',    valor: 5 },
        { id: 'exm-2', nombre: 'Heces',    valor: 5 },
        { id: 'exm-3', nombre: 'Glicemia', valor: 5 }
      ]));
    }
    if (!localStorage.getItem(this.KEYS.PACIENTES)) {
      localStorage.setItem(this.KEYS.PACIENTES, JSON.stringify([
        { id: 'pac-1', nombrePaciente: 'Juan Pérez', fecha: hoy,
          servicioId: 'srv-1', examenId: 'exm-1', cantidad: 1, total: 5 }
      ]));
    }
  }

  _migrar () {
    // Migrar exámenes del esquema antiguo (valorBase/metodo/valorAumento → valor)
    const exs = this._get(this.KEYS.EXAMENES);
    let cambioEx = false;
    const exMig = exs.map(e => {
      if (e.valor === undefined) { cambioEx = true; return { id: e.id, nombre: e.nombre, valor: parseFloat(e.valorBase || 5) }; }
      return e;
    });
    if (cambioEx) this._set(this.KEYS.EXAMENES, exMig);

    // Migrar pacientes del esquema antiguo (valorUnitario → cantidad + total)
    const pacs = this._get(this.KEYS.PACIENTES);
    let cambioPac = false;
    const pacMig = pacs.map(p => {
      if (p.cantidad === undefined) {
        cambioPac = true;
        return { id: p.id, nombrePaciente: p.nombrePaciente, fecha: p.fecha,
                 servicioId: p.servicioId, examenId: p.examenId,
                 cantidad: 1, total: parseFloat(p.total || p.valorCalculado || p.valorBase || 0) };
      }
      return p;
    });
    if (cambioPac) this._set(this.KEYS.PACIENTES, pacMig);
  }

  _hoy ()          { return new Date().toISOString().split('T')[0]; }
  _get (key)       { return JSON.parse(localStorage.getItem(key)) || []; }
  _set (key, data) { localStorage.setItem(key, JSON.stringify(data)); }
  _uid (pfx)       { return `${pfx}-${Date.now()}`; }

  // SERVICIOS
  obtenerServicios ()  { return this._get(this.KEYS.SERVICIOS); }
  guardarServicio (s) {
    const list = this.obtenerServicios();
    if (s.id) { const i = list.findIndex(x => x.id === s.id); if (i !== -1) list[i] = s; }
    else       { s.id = this._uid('srv'); list.push(s); }
    this._set(this.KEYS.SERVICIOS, list); return s;
  }
  eliminarServicio (id) { this._set(this.KEYS.SERVICIOS, this.obtenerServicios().filter(s => s.id !== id)); }

  // EXÁMENES
  obtenerExamenes ()  { return this._get(this.KEYS.EXAMENES); }
  guardarExamen (e) {
    e.valor = parseFloat(e.valor) || 0;
    const list = this.obtenerExamenes();
    if (e.id) { const i = list.findIndex(x => x.id === e.id); if (i !== -1) list[i] = e; }
    else       { e.id = this._uid('exm'); list.push(e); }
    this._set(this.KEYS.EXAMENES, list); return e;
  }
  eliminarExamen (id) { this._set(this.KEYS.EXAMENES, this.obtenerExamenes().filter(e => e.id !== id)); }

  // PACIENTES
  obtenerPacientes ()  { return this._get(this.KEYS.PACIENTES); }
  guardarPaciente (p) {
    p.cantidad = parseInt(p.cantidad) || 1;
    p.total    = parseFloat(p.total)  || 0;
    const list = this.obtenerPacientes();
    if (p.id) { const i = list.findIndex(x => x.id === p.id); if (i !== -1) list[i] = p; }
    else       { p.id = this._uid('pac'); list.push(p); }
    this._set(this.KEYS.PACIENTES, list); return p;
  }
  eliminarPaciente (id) { this._set(this.KEYS.PACIENTES, this.obtenerPacientes().filter(p => p.id !== id)); }
}

// ══════════════════════════════════════════════════════════════════
// 2. LOGIN VIEW
// ══════════════════════════════════════════════════════════════════
class LoginView {
  constructor () {
    this.$screen   = document.getElementById('login-screen');
    this.$step1    = document.getElementById('login-step-1');
    this.$step2    = document.getElementById('login-step-2');
    this.$btnStart = document.getElementById('btn-iniciar');
    this.$btnNext  = document.getElementById('btn-continuar');
  }
  bind (onSuccess) {
    this.$btnStart.addEventListener('click', () => {
      this.$btnStart.disabled = true;
      this.$btnStart.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Conectando...`;
      setTimeout(() => {
        this.$step1.classList.remove('active');
        this.$step2.classList.add('active');
      }, 900);
    });
    this.$btnNext.addEventListener('click', () => {
      this.$screen.classList.add('fade-out');
      setTimeout(() => { this.$screen.style.display = 'none'; onSuccess(); }, 600);
    });
  }
}

// ══════════════════════════════════════════════════════════════════
// 3. APP VIEW
// ══════════════════════════════════════════════════════════════════
class AppView {
  constructor () {
    this.$app      = document.getElementById('main-app');
    this.$navLinks = document.querySelectorAll('#main-nav-tabs .nav-link');
    this.$sections = document.querySelectorAll('.app-section');

    // Dashboard stats
    this.$statPac  = document.getElementById('stat-pacientes');
    this.$statServ = document.getElementById('stat-servicios');
    this.$statExam = document.getElementById('stat-examenes');
    this.$statsHoy = document.getElementById('stats-hoy-examenes');

    // Servicios
    this.$frmServ       = document.getElementById('form-servicio');
    this.$servId        = document.getElementById('servicio-id');
    this.$servNombre    = document.getElementById('servicio-nombre');
    this.$servFecha     = document.getElementById('servicio-fecha');
    this.$btnSaveServ   = document.getElementById('btn-guardar-servicio');
    this.$btnCancelServ = document.getElementById('btn-cancelar-servicio');
    this.$tbodyServ     = document.getElementById('tabla-servicios-cuerpo');

    // Exámenes
    this.$frmExam       = document.getElementById('form-examen');
    this.$examId        = document.getElementById('examen-id');
    this.$examNombre    = document.getElementById('examen-nombre');
    this.$examValor     = document.getElementById('examen-valor');
    this.$btnSaveExam   = document.getElementById('btn-guardar-examen');
    this.$btnCancelExam = document.getElementById('btn-cancelar-examen');
    this.$tbodyExam     = document.getElementById('tabla-examenes-cuerpo');

    // Pacientes
    this.$frmPac        = document.getElementById('form-paciente');
    this.$pacId         = document.getElementById('paciente-registro-id');
    this.$pacNombre     = document.getElementById('paciente-nombre');
    this.$pacFecha      = document.getElementById('paciente-fecha');
    this.$selServicio   = document.getElementById('paciente-servicio');
    this.$selExamen     = document.getElementById('paciente-examen');
    this.$pacCantidad   = document.getElementById('paciente-cantidad');
    this.$pacTotal      = document.getElementById('paciente-total');
    this.$btnSavePac    = document.getElementById('btn-guardar-paciente');
    this.$btnCancelPac  = document.getElementById('btn-cancelar-paciente');
    this.$tituloPacForm = document.getElementById('titulo-form-paciente');

    // Historial
    this.$tbodyPac  = document.getElementById('tabla-pacientes-cuerpo');
    this.$badge     = document.getElementById('badge-total-registros');
    this.$filtroQ   = document.getElementById('filtro-busqueda');
    this.$filtroServ= document.getElementById('filtro-servicio');
    this.$filtroExam= document.getElementById('filtro-examen');
    this.$sinResult = document.getElementById('sin-resultados');

    // Resumen
    this.$fechaResumen = document.getElementById('fecha-resumen');
    this.$tbodyResumen = document.getElementById('tabla-resumen-cuerpo');
    this.$resumenCant  = document.getElementById('resumen-total-cant');
    this.$resumenVal   = document.getElementById('resumen-total-val');

    // Export panel
    this.$overlay        = document.getElementById('export-overlay');
    this.$btnAbrirExport = document.getElementById('btn-abrir-export');
    this.$btnCerrarExp   = document.getElementById('btn-cerrar-export');
    this.$btnCsvHist     = document.getElementById('btn-csv-historial');
    this.$btnCsvResumen  = document.getElementById('btn-csv-resumen');
    this.$btnCorreo      = document.getElementById('btn-correo');

    // Callbacks de tabla (se asignan en bind*)
    this._cbServEdit = null; this._cbServDel = null;
    this._cbExamEdit = null; this._cbExamDel = null;
    this._cbPacEdit  = null; this._cbPacDel  = null;
    this._pacList    = []; // copia de la lista actual para lookup en delegation

    this._initNav();
    this._setFechaHoy();
    this._initTableDelegation();
  }

  // ══════════════════════════════════════════════════════════════════
  // Event delegation – se configura UNA sola vez en los tres tbody.
  // No usa confirm() → doble toque: 1er toque = alerta roja, 2do = borra.
  // ══════════════════════════════════════════════════════════════════
  _initTableDelegation () {
    // Helper: convierte botón al estado "confirmar"
    const armarConfirm = (btn, originalHTML) => {
      btn.dataset.confirming = '1';
      btn.classList.remove('btn-outline-danger');
      btn.classList.add('btn-danger');
      btn.innerHTML = '<i class="bi bi-exclamation-lg"></i>¿Borrar?';
      // Revierte automáticamente si no hay 2do clic en 2.5 s
      btn._timer = setTimeout(() => {
        btn.dataset.confirming = '0';
        btn.classList.add('btn-outline-danger');
        btn.classList.remove('btn-danger');
        btn.innerHTML = originalHTML;
      }, 2500);
    };

    // ── Servicios ────────────────────────────────────────────
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

    // ── Exámenes ─────────────────────────────────────────────
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

    // ── Pacientes ────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────────
  mostrar ()  { this.$app.classList.remove('d-none'); }
  _hoy ()     { return new Date().toISOString().split('T')[0]; }

  _setFechaHoy () {
    const hoy = this._hoy();
    this.$servFecha.value    = hoy;
    this.$pacFecha.value     = hoy;
    this.$fechaResumen.value = hoy;
  }

  // ── Navegación ─────────────────────────────────────────────
  _initNav () {
    const bsNav = bootstrap.Collapse.getOrCreateInstance(
      document.getElementById('navbarNav'), { toggle: false });
    this.$navLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        this.$navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        this.$sections.forEach(s => s.classList.toggle('d-none', s.id !== link.dataset.section));
        if (window.innerWidth < 992) bsNav.hide();
      });
    });
  }

  // ════════════════════════════════════════════════════════════
  // SERVICIOS
  // ════════════════════════════════════════════════════════════
  renderServicios (list, onEdit, onDel) {
    this._servList   = list; // guarda para lookup en delegation
    this._cbServEdit = onEdit;
    this._cbServDel  = onDel;
    this.$tbodyServ.innerHTML = '';
    if (!list.length) {
      this.$tbodyServ.innerHTML =
        `<tr><td colspan="3" class="text-center text-muted py-3">Sin servicios registrados.</td></tr>`;
      return;
    }
    list.forEach(s => {
      this.$tbodyServ.appendChild(this._tr(`
        <td class="fw-semibold text-teal-dark">${this._esc(s.nombre)}</td>
        <td>${s.fecha}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-teal btn-action-sm me-1"
            data-action="edit" data-id="${s.id}"><i class="bi bi-pencil-square"></i></button>
          <button class="btn btn-sm btn-outline-danger btn-action-sm"
            data-action="del" data-id="${s.id}" data-confirming="0"><i class="bi bi-trash-fill"></i></button>
        </td>`));
    });
  }

  fillServForm (s) {
    this.$servId.value     = s.id;
    this.$servNombre.value = s.nombre;
    this.$servFecha.value  = s.fecha;
    this.$btnSaveServ.innerHTML = `<i class="bi bi-check-circle me-1"></i>Actualizar`;
    this.$btnCancelServ.classList.remove('d-none');
  }

  clearServForm () {
    this.$frmServ.reset();
    this.$servId.value    = '';
    this.$servFecha.value = this._hoy();
    this.$btnSaveServ.innerHTML = `<i class="bi bi-plus-circle me-1"></i>Guardar`;
    this.$btnCancelServ.classList.add('d-none');
  }

  bindServForm (handler) {
    this.$frmServ.addEventListener('submit', e => {
      e.preventDefault();
      if (!this.$frmServ.checkValidity()) { this.$frmServ.reportValidity(); return; }
      handler({ id: this.$servId.value || null,
                nombre: this.$servNombre.value.trim(),
                fecha:  this.$servFecha.value });
    });
    this.$btnCancelServ.addEventListener('click', () => this.clearServForm());
  }

  // ════════════════════════════════════════════════════════════
  // EXÁMENES
  // ════════════════════════════════════════════════════════════
  renderExamenes (list, onEdit, onDel) {
    this._examList   = list;
    this._cbExamEdit = onEdit;
    this._cbExamDel  = onDel;
    this.$tbodyExam.innerHTML = '';
    if (!list.length) {
      this.$tbodyExam.innerHTML =
        `<tr><td colspan="3" class="text-center text-muted py-3">Sin exámenes registrados.</td></tr>`;
      return;
    }
    list.forEach(e => {
      this.$tbodyExam.appendChild(this._tr(`
        <td class="fw-semibold text-pink-dark">${this._esc(e.nombre)}</td>
        <td class="text-end fw-bold text-teal">${parseFloat(e.valor).toFixed(2)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-pink btn-action-sm me-1"
            data-action="edit" data-id="${e.id}"><i class="bi bi-pencil-square"></i></button>
          <button class="btn btn-sm btn-outline-danger btn-action-sm"
            data-action="del" data-id="${e.id}" data-confirming="0"><i class="bi bi-trash-fill"></i></button>
        </td>`));
    });
  }

  fillExamForm (e) {
    this.$examId.value     = e.id;
    this.$examNombre.value = e.nombre;
    this.$examValor.value  = e.valor;
    this.$btnSaveExam.innerHTML = `<i class="bi bi-check-circle me-1"></i>Actualizar`;
    this.$btnCancelExam.classList.remove('d-none');
  }

  clearExamForm () {
    this.$frmExam.reset();
    this.$examId.value    = '';
    this.$examValor.value = '5';
    this.$btnSaveExam.innerHTML = `<i class="bi bi-plus-circle me-1"></i>Guardar`;
    this.$btnCancelExam.classList.add('d-none');
  }

  bindExamForm (handler) {
    this.$frmExam.addEventListener('submit', e => {
      e.preventDefault();
      if (!this.$frmExam.checkValidity()) { this.$frmExam.reportValidity(); return; }
      handler({ id: this.$examId.value || null,
                nombre: this.$examNombre.value.trim(),
                valor:  parseFloat(this.$examValor.value) });
    });
    this.$btnCancelExam.addEventListener('click', () => this.clearExamForm());
  }

  // ════════════════════════════════════════════════════════════
  // SELECTS + cálculo en tiempo real
  // ════════════════════════════════════════════════════════════
  actualizarSelects (servicios, examenes) {
    // ── Guardamos los exámenes en memoria para que calc() los lea
    //    directamente sin depender de data-valor en el HTML (más fiable).
    this._examenes = examenes;

    /** Reconstruye un <select> usando createElement (no innerHTML +=). */
    const rebuildSel = (sel, items, label, valKey, textKey) => {
      const cur = sel.value;
      // Vaciar sin perder el elemento raíz
      while (sel.options.length > 0) sel.remove(0);
      // Placeholder
      const ph = document.createElement('option');
      ph.value = ''; ph.disabled = true; ph.textContent = label;
      sel.appendChild(ph);
      // Opciones reales
      items.forEach(it => {
        const opt = document.createElement('option');
        opt.value       = it[valKey];
        opt.textContent = it[textKey];
        sel.appendChild(opt);
      });
      // Restaurar selección anterior si aún existe
      if (cur && Array.from(sel.options).some(o => o.value === cur)) sel.value = cur;
    };

    rebuildSel(this.$selServicio, servicios, 'Seleccione un servicio...', 'id', 'nombre');
    rebuildSel(this.$selExamen,   examenes,  'Seleccione un examen...',   'id', 'nombre');

    const fsv = this.$filtroServ.value;
    const fex = this.$filtroExam.value;
    rebuildSel(this.$filtroServ, servicios, 'Todos los Servicios', 'id', 'nombre');
    rebuildSel(this.$filtroExam, examenes,  'Todos los Exámenes',  'id', 'nombre');
    this.$filtroServ.value = fsv;
    this.$filtroExam.value = fex;

    // Recalcula el total si ya hay examen seleccionado (ej. tras guardar otro registro)
    if (this._calcFn) this._calcFn();
  }

  bindCalculo () {
    /**
     * Lee el valor del examen desde this._examenes (array en memoria),
     * NO desde data-valor del HTML — así nunca falla por parsing del DOM.
     */
    const calc = () => {
      const exId  = this.$selExamen.value;
      const exam  = (this._examenes || []).find(e => e.id === exId);
      const valor = exam ? (parseFloat(exam.valor) || 0) : 0;
      const cant  = Math.max(1, parseInt(this.$pacCantidad.value) || 1);
      this.$pacTotal.value = (valor * cant).toFixed(2);
    };
    this._calcFn = calc;   // guardamos para llamarlo externamente
    this.$selExamen.addEventListener('change', calc);
    this.$pacCantidad.addEventListener('input',  calc);
    this.$pacCantidad.addEventListener('change', calc); // también en change por si acaso
  }

  // ════════════════════════════════════════════════════════════
  // PACIENTES
  // ════════════════════════════════════════════════════════════
  renderPacientes (list, servicios, examenes, onEdit, onDel) {
    this._pacList   = list;   // guardado para delegation lookup
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
      const exam = examenes.find(e => e.id === p.examenId)    || { nombre: '—' };
      this.$tbodyPac.appendChild(this._tr(`
        <td class="text-nowrap">${p.fecha}</td>
        <td class="fw-semibold text-teal-dark">${this._esc(p.nombrePaciente)}</td>
        <td><span class="badge bg-soft-teal">${this._esc(serv.nombre)}</span></td>
        <td><span class="badge bg-soft-pink">${this._esc(exam.nombre)}</span></td>
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

  fillPacForm (p) {
    this.$pacId.value         = p.id;
    this.$pacNombre.value     = p.nombrePaciente;
    this.$pacFecha.value      = p.fecha;
    this.$selServicio.value   = p.servicioId;
    this.$selExamen.value     = p.examenId;
    this.$pacCantidad.value   = p.cantidad;
    this.$pacTotal.value      = parseFloat(p.total).toFixed(2);
    this.$tituloPacForm.innerHTML = `<i class="bi bi-pencil-square me-2"></i>Editar Registro`;
    this.$btnSavePac.innerHTML    = `<i class="bi bi-check-circle-fill me-1"></i>Guardar Cambios`;
    this.$btnCancelPac.classList.remove('d-none');
  }

  clearPacForm () {
    this.$frmPac.reset();
    this.$pacId.value       = '';
    this.$pacFecha.value    = this._hoy();
    this.$pacCantidad.value = '1';
    this.$pacTotal.value    = '0.00';
    this.$tituloPacForm.innerHTML = `<i class="bi bi-person-fill-add me-2"></i>Registrar Paciente`;
    this.$btnSavePac.innerHTML    = `<i class="bi bi-save me-1"></i>Guardar Registro`;
    this.$btnCancelPac.classList.add('d-none');
  }

  bindPacForm (handler) {
    this.$frmPac.addEventListener('submit', e => {
      e.preventDefault();
      if (!this.$frmPac.checkValidity()) { this.$frmPac.reportValidity(); return; }
      handler({
        id:             this.$pacId.value || null,
        nombrePaciente: this.$pacNombre.value.trim(),
        fecha:          this.$pacFecha.value,
        servicioId:     this.$selServicio.value,
        examenId:       this.$selExamen.value,
        cantidad:       parseInt(this.$pacCantidad.value) || 1,
        total:          parseFloat(this.$pacTotal.value)  || 0
      });
    });
    this.$btnCancelPac.addEventListener('click', () => this.clearPacForm());
  }

  bindFiltros (onChange) {
    [this.$filtroQ, this.$filtroServ, this.$filtroExam].forEach(el =>
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input',
        () => onChange({ q: this.$filtroQ.value, servicioId: this.$filtroServ.value, examenId: this.$filtroExam.value })));
  }

  // ════════════════════════════════════════════════════════════
  // RESUMEN DEL DÍA
  // ════════════════════════════════════════════════════════════
  renderResumen (rows, totalCant, totalVal) {
    this.$tbodyResumen.innerHTML  = '';
    this.$resumenCant.textContent = totalCant;
    this.$resumenVal.textContent  = totalVal.toFixed(2);
    if (!rows.length) {
      this.$tbodyResumen.innerHTML =
        `<tr><td colspan="3" class="text-center text-muted py-3">Sin exámenes para esta fecha.</td></tr>`;
      return;
    }
    rows.forEach(r => {
      this.$tbodyResumen.appendChild(this._tr(`
        <td class="fw-semibold text-pink-dark">${this._esc(r.nombre)}</td>
        <td class="text-center fw-bold">${r.cantidad}</td>
        <td class="text-end fw-bold text-teal">${r.total.toFixed(2)}</td>`));
    });
  }

  bindFechaResumen (onChange) {
    this.$fechaResumen.addEventListener('change', () => onChange(this.$fechaResumen.value));
  }

  getFechaResumen () { return this.$fechaResumen.value; }

  // ════════════════════════════════════════════════════════════
  // STAT-CARDS DE HOY (sección Inicio)
  // Muestra una tarjeta por cada tipo de examen realizado hoy.
  // ════════════════════════════════════════════════════════════
  renderStatsHoy (rows) {
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

    const emojis = ['🧪','🩺','💉','🔬','🧬','🌡️','💊','🏥'];
    rows.forEach((r, i) => {
      const emoji = emojis[i % emojis.length];
      this.$statsHoy.insertAdjacentHTML('beforeend', `
        <div class="col-6 col-md-3">
          <div class="stat-card-hoy">
            <div class="stat-hoy-emoji">${emoji}</div>
            <div class="stat-hoy-nombre">${this._esc(r.nombre)}</div>
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
  bindExport (onCsvHist, onCsvResumen, onCorreo) {
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

  _cerrarExport () {
    this.$overlay.classList.add('d-none');
    document.body.style.overflow = '';
  }

  // ════════════════════════════════════════════════════════════
  // DASHBOARD GENERAL
  // ════════════════════════════════════════════════════════════
  updateStats (pac, serv, exam) {
    this.$statPac.textContent  = pac;
    this.$statServ.textContent = serv;
    this.$statExam.textContent = exam;
  }

  // ── DOM helpers ────────────────────────────────────────────
  _tr (html) { const tr = document.createElement('tr'); tr.innerHTML = html; return tr; }

  _esc (str = '') {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  descargarCSV (filename, csv) {
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: filename, style: 'display:none' });
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }
}

// ══════════════════════════════════════════════════════════════════
// 4. CONTROLADOR
// ══════════════════════════════════════════════════════════════════
class BioanalisisController {
  constructor (repo, view, loginView) {
    this.repo    = repo;
    this.view    = view;
    this.filtros = { q: '', servicioId: '', examenId: '' };
    this.fechaRes = new Date().toISOString().split('T')[0];

    loginView.bind(() => { this.view.mostrar(); this._init(); });
  }

  _init () {
    this.view.bindServForm(d => this._guardarServicio(d));
    this.view.bindExamForm(d => this._guardarExamen(d));
    this.view.bindPacForm(d  => this._guardarPaciente(d));
    this.view.bindCalculo();
    this.view.bindFiltros(f  => { this.filtros = f; this._renderPacientes(); });
    this.view.bindFechaResumen(f => { this.fechaRes = f; this._renderResumen(); });
    this.view.bindExport(
      ()  => this._exportHistorial(),
      (f) => this._exportResumen(f),
      (f) => this._enviarCorreo(f)
    );
    this._refrescar();
  }

  _refrescar () {
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

    // Stat-cards de HOY en la sección Inicio
    const hoy = new Date().toISOString().split('T')[0];
    const { rows } = this._calcResumen(hoy);
    this.view.renderStatsHoy(rows);
  }

  // ── Servicios ─────────────────────────────────────────────
  _guardarServicio (d) { this.repo.guardarServicio(d); this.view.clearServForm(); this._refrescar(); }
  _eliminarServicio(id){ this.repo.eliminarServicio(id); this._refrescar(); }

  // ── Exámenes ──────────────────────────────────────────────
  _guardarExamen (d)  { this.repo.guardarExamen(d); this.view.clearExamForm(); this._refrescar(); }
  _eliminarExamen(id) { this.repo.eliminarExamen(id); this._refrescar(); }

  // ── Pacientes ─────────────────────────────────────────────
  _guardarPaciente (d) { this.repo.guardarPaciente(d); this.view.clearPacForm(); this._refrescar(); }
  _eliminarPaciente(id){ this.repo.eliminarPaciente(id); this._refrescar(); }

  _renderPacientes () {
    const servicios = this.repo.obtenerServicios();
    const examenes  = this.repo.obtenerExamenes();
    let   pacs      = this.repo.obtenerPacientes();
    const { q, servicioId, examenId } = this.filtros;
    if (q.trim())   pacs = pacs.filter(p => p.nombrePaciente.toLowerCase().includes(q.toLowerCase()));
    if (servicioId) pacs = pacs.filter(p => p.servicioId === servicioId);
    if (examenId)   pacs = pacs.filter(p => p.examenId   === examenId);
    this.view.renderPacientes(pacs, servicios, examenes,
      p  => this.view.fillPacForm(p),
      id => this._eliminarPaciente(id));
  }

  _renderResumen () {
    const { rows, totalCant, totalVal } = this._calcResumen(this.fechaRes);
    this.view.renderResumen(rows, totalCant, totalVal);
  }

  /** Agrupa registros por examen para una fecha dada */
  _calcResumen (fecha) {
    const examenes = this.repo.obtenerExamenes();
    const pacs     = this.repo.obtenerPacientes().filter(p => p.fecha === fecha);
    const mapa = {};
    let totalCant = 0, totalVal = 0;
    pacs.forEach(p => {
      if (!mapa[p.examenId]) mapa[p.examenId] = { cantidad: 0, total: 0 };
      mapa[p.examenId].cantidad += p.cantidad;
      mapa[p.examenId].total   += p.total;
      totalCant += p.cantidad;
      totalVal  += p.total;
    });
    const rows = Object.keys(mapa).map(eid => {
      const ex = examenes.find(e => e.id === eid) || { nombre: '(eliminado)' };
      return { nombre: ex.nombre, ...mapa[eid] };
    });
    return { rows, totalCant, totalVal };
  }

  // ── Exportación ───────────────────────────────────────────
  _exportHistorial () {
    const servicios = this.repo.obtenerServicios();
    const examenes  = this.repo.obtenerExamenes();
    let csv = 'Fecha,Paciente,Servicio,Examen,Cantidad,Total\n';
    this.repo.obtenerPacientes().forEach(p => {
      const serv = servicios.find(s => s.id === p.servicioId) || { nombre: '' };
      const exam = examenes.find(e => e.id === p.examenId)    || { nombre: '' };
      csv += `"${p.fecha}","${p.nombrePaciente}","${serv.nombre}","${exam.nombre}",${p.cantidad},${parseFloat(p.total).toFixed(2)}\n`;
    });
    this.view.descargarCSV('Historial_Bioanalisis.csv', csv);
  }

  _exportResumen (fecha) {
    const { rows, totalCant, totalVal } = this._calcResumen(fecha);
    let csv = `Resumen Diario – ${fecha}\nExamen,Cantidad,Total\n`;
    rows.forEach(r => { csv += `"${r.nombre}",${r.cantidad},${r.total.toFixed(2)}\n`; });
    csv += `\n"TOTAL",${totalCant},${totalVal.toFixed(2)}\n`;
    this.view.descargarCSV(`Resumen_${fecha}.csv`, csv);
  }

  _enviarCorreo (fecha) {
    const { rows, totalCant, totalVal } = this._calcResumen(fecha);
    const detalle = rows.length
      ? rows.map(r => `  - ${r.nombre}: ${r.cantidad} examen(es) · Total: ${r.total.toFixed(2)}`).join('\n')
      : '  Sin registros para esta fecha.';
    const asunto = `Reporte Diario de Bioanálisis – ${fecha}`;
    const cuerpo =
`Estimada(o),

Adjunto encontrará el reporte del día ${fecha}.

══════════════════════════════════
RESUMEN DEL DÍA
══════════════════════════════════
${detalle}
──────────────────────────────────
TOTAL EXÁMENES : ${totalCant}
VALOR TOTAL    : ${totalVal.toFixed(2)}
══════════════════════════════════

(Recuerde adjuntar el archivo .csv descargado.)

Atentamente,
Lic. Eliana Morales`;
    window.location.href =
      `mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  }
}

// ══════════════════════════════════════════════════════════════════
// 5. ARRANQUE
// ══════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const repo      = new BioanalisisRepository();
  const loginView = new LoginView();
  const view      = new AppView();
  new BioanalisisController(repo, view, loginView);
});
