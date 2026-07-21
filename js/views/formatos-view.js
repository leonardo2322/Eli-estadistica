/**
 * =========================================================================
 * js/views/formatos-view.js
 * -------------------------------------------------------------------------
 * Vista del módulo de Formatos Estadísticos Mensuales.
 * Genera la grilla editable por día del mes, tal como el Excel del hospital.
 *
 * RESPONSABILIDAD:
 *   - Renderizar el encabezado con Mes/Año/Turno/Área.
 *   - Renderizar la grilla mensual: columnas = días, filas = exámenes/servicios.
 *   - Manejar inputs de celda y calcular totales de fila automáticamente.
 *   - Disparar callbacks al controlador cuando cambia una celda.
 *   - Navegar entre meses (anterior/siguiente).
 *   - Cambiar de área y de hoja.
 *   - Resaltar el día de hoy en la columna correspondiente.
 *
 * NOTA: Las filas con esTotal=true son de solo lectura y se calculan
 *       automáticamente sumando las demás filas del mismo bloque.
 * =========================================================================
 */

'use strict';

class FormatosView {

  constructor() {
    // ── Controles principales ─────────────────────────────────
    this.$section       = document.getElementById('section-formatos');
    this.$selArea       = document.getElementById('fmt-sel-area');
    this.$selHoja       = document.getElementById('fmt-sel-hoja');
    this.$selTurno      = document.getElementById('fmt-sel-turno');
    this.$btnPrevMes    = document.getElementById('fmt-btn-prev-mes');
    this.$btnNextMes    = document.getElementById('fmt-btn-next-mes');
    this.$lblPeriodo    = document.getElementById('fmt-lbl-periodo');
    this.$inpMes        = document.getElementById('fmt-inp-mes');
    this.$inpAno        = document.getElementById('fmt-inp-ano');
    this.$contenedorGrilla = document.getElementById('fmt-contenedor-grilla');
    this.$btnExportarCSV   = document.getElementById('fmt-btn-exportar');
    this.$btnLimpiar       = document.getElementById('fmt-btn-limpiar');
    this.$indicadorGuardado = document.getElementById('fmt-indicador-guardado');

    // Estado actual de la vista
    this._mes    = DateUtils.getMesActual();
    this._ano    = DateUtils.getAnoActual();
    this._areaId = null;
    this._hojaId = null;

    // Callback que dispara el controlador al editar una celda
    this._onCeldaCambiada = null;

    this._inicializar();
  }

  // ════════════════════════════════════════════════════════════
  // INICIALIZACIÓN
  // ════════════════════════════════════════════════════════════

  _inicializar() {
    // Poblar selector de Áreas
    HOSPITAL_AREAS.forEach(area => {
      const opt = document.createElement('option');
      opt.value       = area.id;
      opt.textContent = `${area.icon} ${area.label}`;
      this.$selArea.appendChild(opt);
    });

    // Poblar selector de Turnos
    TURNOS.forEach(t => {
      const opt = document.createElement('option');
      opt.value       = t.id;
      opt.textContent = t.label;
      this.$selTurno.appendChild(opt);
    });

    // Poner turno por defecto según hora actual
    const hora = new Date().getHours();
    if      (hora >= 6  && hora < 14) this.$selTurno.value = 'manana';
    else if (hora >= 14 && hora < 22) this.$selTurno.value = 'tarde';
    else                              this.$selTurno.value = 'noche';

    // Sincronizar inputs de mes/año
    this.$inpMes.value = this._mes;
    this.$inpAno.value = this._ano;

    this._actualizarEtiquetaPeriodo();
    this._actualizarSelectorHojas();
  }

  // ════════════════════════════════════════════════════════════
  // GETTERS DE ESTADO ACTUAL
  // ════════════════════════════════════════════════════════════

  getMes()    { return this._mes; }
  getAno()    { return this._ano; }
  getTurnoId(){ return this.$selTurno.value; }
  getAreaId() { return this.$selArea.value; }
  getHojaId() { return this.$selHoja.value; }

  // ════════════════════════════════════════════════════════════
  // BIND DE CONTROLES
  // ════════════════════════════════════════════════════════════

  /**
   * Asocia todos los controles de la sección Formatos al controlador.
   * @param {object} handlers – { onCeldaCambiada, onExportar, onLimpiar }
   */
  bindControles(handlers) {
    this._onCeldaCambiada = handlers.onCeldaCambiada;

    // Actualizar hojas al inicializar (por si área tiene valor inicial)
    this._actualizarSelectorHojas();

    // Cambio de área → actualizar hojas disponibles y redibujar
    this.$selArea.addEventListener('change', () => {
      this._actualizarSelectorHojas();
      if (handlers.onCambioArea) handlers.onCambioArea();
    });

    // Cambio de hoja
    this.$selHoja.addEventListener('change', () => {
      if (handlers.onCambioHoja) handlers.onCambioHoja();
    });

    // Cambio de turno → redibujar con datos del turno seleccionado
    this.$selTurno.addEventListener('change', () => {
      if (handlers.onCambioTurno) handlers.onCambioTurno();
    });

    // Navegación de mes: Anterior
    this.$btnPrevMes.addEventListener('click', () => {
      this._mes--;
      if (this._mes < 1) { this._mes = 12; this._ano--; }
      this._sincronizarInputsPeriodo();
      this._actualizarEtiquetaPeriodo();
      if (handlers.onCambioPeriodo) handlers.onCambioPeriodo(this._mes, this._ano);
    });

    // Navegación de mes: Siguiente
    this.$btnNextMes.addEventListener('click', () => {
      this._mes++;
      if (this._mes > 12) { this._mes = 1; this._ano++; }
      this._sincronizarInputsPeriodo();
      this._actualizarEtiquetaPeriodo();
      if (handlers.onCambioPeriodo) handlers.onCambioPeriodo(this._mes, this._ano);
    });

    // Input directo de mes
    this.$inpMes.addEventListener('change', () => {
      const v = parseInt(this.$inpMes.value);
      if (v >= 1 && v <= 12) {
        this._mes = v;
        this._actualizarEtiquetaPeriodo();
        if (handlers.onCambioPeriodo) handlers.onCambioPeriodo(this._mes, this._ano);
      }
    });

    // Input directo de año
    this.$inpAno.addEventListener('change', () => {
      const v = parseInt(this.$inpAno.value);
      if (v >= 2000 && v <= 2099) {
        this._ano = v;
        this._actualizarEtiquetaPeriodo();
        if (handlers.onCambioPeriodo) handlers.onCambioPeriodo(this._mes, this._ano);
      }
    });

    // Exportar CSV
    this.$btnExportarCSV.addEventListener('click', () => {
      if (handlers.onExportar) handlers.onExportar();
    });

    // Limpiar grilla
    this.$btnLimpiar.addEventListener('click', () => {
      if (handlers.onLimpiar) handlers.onLimpiar();
    });
  }

  // ════════════════════════════════════════════════════════════
  // RENDER DE LA GRILLA MENSUAL
  // ════════════════════════════════════════════════════════════

  /**
   * Renderiza la grilla completa de un mes con sus datos.
   * @param {object}   area  – Objeto de área (de HOSPITAL_AREAS)
   * @param {object}   hoja  – Objeto de hoja dentro del área
   * @param {number}   mes
   * @param {number}   ano
   * @param {object}   datos – { [filaId]: { [dia]: number } }
   */
  renderGrilla(area, hoja, mes, ano, datos) {
    this._areaId = area.id;
    this._hojaId = hoja.id;

    const dias     = DateUtils.diasDelMes(mes, ano);
    const hoy      = new Date();
    const esHoy    = (dia) => hoy.getFullYear() === ano && (hoy.getMonth() + 1) === mes && hoy.getDate() === dia;

    // ── Construir encabezado de columnas ──────────────────────
    let headCols = `<th class="col-fila-nombre">FECHA</th>`;
    dias.forEach(d => {
      const clsHoy = esHoy(d) ? ' col-hoy' : '';
      headCols += `<th class="col-dia text-center${clsHoy}">${DateUtils.padDia(d)}</th>`;
    });
    headCols += `<th class="col-total text-center">TOTAL</th>`;

    // ── Construir cuerpo con grupos ────────────────────────────
    let tbody = '';
    hoja.grupos.forEach(grupo => {
      // Fila de título del grupo
      const totalCols = dias.length + 2; // nombre + días + total
      tbody += `
        <tr class="fila-grupo-titulo">
          <td colspan="${totalCols}" class="grupo-titulo-cell">
            <span class="grupo-titulo-badge" style="--area-color:${area.color}">
              ${grupo.titulo}
            </span>
          </td>
        </tr>`;

      // Filas de datos
      grupo.filas.forEach(fila => {
        const esTotal = fila.esTotal;
        const trClass = esTotal ? 'fila-total' : 'fila-dato';
        const filaData = datos[fila.id] || {};

        // Calcular total de la fila
        const totalFila = dias.reduce((s, d) => s + (Number(filaData[d]) || 0), 0);

        let celdas = '';
        if (esTotal) {
          // Celdas de total: solo lectura, se recalculan desde JS
          dias.forEach(d => {
            celdas += `<td class="celda-total text-center" data-fila="${fila.id}" data-dia="${d}">
              ${Number(filaData[d]) || 0}
            </td>`;
          });
        } else {
          // Celdas editables
          dias.forEach(d => {
            const val     = Number(filaData[d]) || '';
            const clsHoy  = esHoy(d) ? ' celda-hoy' : '';
            celdas += `<td class="celda-input${clsHoy}">
              <input
                type="number" min="0" step="1"
                class="inp-celda"
                data-fila="${fila.id}"
                data-dia="${d}"
                value="${val}"
                aria-label="${DomHelpers.esc(fila.label)} día ${d}"
              >
            </td>`;
          });
        }

        tbody += `
          <tr class="${trClass}" data-fila-id="${fila.id}">
            <td class="celda-nombre ${esTotal ? 'nombre-total' : ''}">${DomHelpers.esc(fila.label)}</td>
            ${celdas}
            <td class="celda-total-fila text-center fw-bold" data-total-fila="${fila.id}">${totalFila || ''}</td>
          </tr>`;
      });
    });

    // ── Inyectar en el DOM ─────────────────────────────────────
    this.$contenedorGrilla.innerHTML = `
      <div class="grilla-header" style="--area-color:${area.color}; --area-color-soft:${area.colorSoft}">
        <div class="grilla-header-top">
          <div class="grilla-hospital-info">
            <span class="area-icon">${area.icon}</span>
            <div>
              <div class="grilla-hospital-nombre">HOSPITAL II "SAN JOSÉ" TOVAR</div>
              <div class="grilla-area-nombre">ÁREA: ${area.label}</div>
            </div>
          </div>
          <div class="grilla-periodo-info">
            <span class="grilla-badge-mes">📅 MES: ${DateUtils.nombreMes(mes)}</span>
            <span class="grilla-badge-ano">🗓️ AÑO: ${ano}</span>
            <span class="grilla-badge-turno">⏰ TURNO: ${this._turnoLabel()}</span>
          </div>
        </div>
      </div>

      <div class="grilla-scroll-wrap">
        <table class="tabla-formato" id="tabla-grilla-principal">
          <thead>
            <tr>${headCols}</tr>
          </thead>
          <tbody id="grilla-tbody">
            ${tbody}
          </tbody>
        </table>
      </div>

      <div class="grilla-firma mt-3 text-end text-muted small">
        BIOANALISTA: <strong>${HOSPITAL_INFO.bioanalista}</strong>
      </div>`;

    // ── Ligar eventos de inputs ────────────────────────────────
    this._bindInputsCelda(area, hoja, mes, ano, dias, datos);
  }

  // ════════════════════════════════════════════════════════════
  // EVENTOS DE CELDAS
  // ════════════════════════════════════════════════════════════

  /**
   * Liga los eventos 'input' y 'change' a todos los inputs de celda.
   * Al cambiar un valor:
   *   1. Guarda la celda vía callback al controlador.
   *   2. Recalcula el TOTAL de la fila.
   *   3. Si la fila pertenece a un grupo que tiene fila-total, recalcula esa.
   */
  _bindInputsCelda(area, hoja, mes, ano, dias, datosInicio) {
    const tabla = document.getElementById('tabla-grilla-principal');
    if (!tabla) return;

    // Construir mapa de filas por grupo para calcular totales de grupo
    const mapaGrupos = {}; // grupoTituloId → { filasTotales: [...id], filasBase: [...id] }
    hoja.grupos.forEach(grupo => {
      grupo.filas.forEach(fila => {
        if (fila.esTotal) {
          if (!mapaGrupos[grupo.titulo]) mapaGrupos[grupo.titulo] = { filasTotal: [], filasBase: [] };
          mapaGrupos[grupo.titulo].filasTotal.push(fila.id);
        } else {
          if (!mapaGrupos[grupo.titulo]) mapaGrupos[grupo.titulo] = { filasTotal: [], filasBase: [] };
          mapaGrupos[grupo.titulo].filasBase.push(fila.id);
        }
      });
    });

    // Estado en memoria para cálculos (sincronizado con inputs)
    const datosActuales = JSON.parse(JSON.stringify(datosInicio)); // copia profunda

    tabla.addEventListener('input', e => {
      const inp = e.target;
      if (!inp.classList.contains('inp-celda')) return;

      const filaId = inp.dataset.fila;
      const dia    = Number(inp.dataset.dia);
      const valor  = Math.max(0, parseInt(inp.value) || 0);

      // Normalizar valor
      inp.value = valor || '';

      // Actualizar datos en memoria
      if (!datosActuales[filaId]) datosActuales[filaId] = {};
      if (valor === 0) {
        delete datosActuales[filaId][dia];
      } else {
        datosActuales[filaId][dia] = valor;
      }

      // Notificar al controlador para persistir
      if (this._onCeldaCambiada) {
        this._onCeldaCambiada(filaId, dia, valor);
      }

      // Recalcular TOTAL de la fila editada
      this._recalcularTotalFila(filaId, dias, datosActuales);

      // Buscar si esta fila pertenece a un grupo con fila de total
      // y recalcular esa fila total
      hoja.grupos.forEach(grupo => {
        const tieneEstaFila = grupo.filas.some(f => f.id === filaId && !f.esTotal);
        if (!tieneEstaFila) return;

        const filaTotal = grupo.filas.find(f => f.esTotal);
        if (!filaTotal) return;

        // Sumar todas las filas base del grupo por cada día
        const filasBase = grupo.filas.filter(f => !f.esTotal);
        dias.forEach(d => {
          const suma = filasBase.reduce((s, fb) => {
            return s + (Number((datosActuales[fb.id] || {})[d]) || 0);
          }, 0);
          if (!datosActuales[filaTotal.id]) datosActuales[filaTotal.id] = {};
          if (suma === 0) delete datosActuales[filaTotal.id][d];
          else datosActuales[filaTotal.id][d] = suma;

          // Actualizar celda visual de total
          const celdaTot = tabla.querySelector(`[data-fila="${filaTotal.id}"][data-dia="${d}"]`);
          if (celdaTot) celdaTot.textContent = suma || '';
        });

        // Recalcular total de fila total
        this._recalcularTotalFila(filaTotal.id, dias, datosActuales);
      });

      // Mostrar indicador de guardado
      this._mostrarGuardado();
    });
  }

  /**
   * Recalcula y actualiza visualmente la celda TOTAL de una fila.
   * @param {string}   filaId
   * @param {number[]} dias
   * @param {object}   datos – estado en memoria
   */
  _recalcularTotalFila(filaId, dias, datos) {
    const filaData = datos[filaId] || {};
    const total    = dias.reduce((s, d) => s + (Number(filaData[d]) || 0), 0);
    const celda    = document.querySelector(`[data-total-fila="${filaId}"]`);
    if (celda) celda.textContent = total || '';
  }

  // ════════════════════════════════════════════════════════════
  // ESTADO DE PERÍODO
  // ════════════════════════════════════════════════════════════

  /** Actualiza el selector de hojas según el área seleccionada. */
  _actualizarSelectorHojas() {
    const area = HOSPITAL_AREAS.find(a => a.id === this.$selArea.value);
    this.$selHoja.innerHTML = '';

    if (!area) return;

    area.hojas.forEach(h => {
      const opt = document.createElement('option');
      opt.value       = h.id;
      opt.textContent = h.label;
      this.$selHoja.appendChild(opt);
    });

    // Mostrar u ocultar el selector de hojas según si el área tiene más de una
    const grupoHoja = document.getElementById('fmt-grupo-hoja');
    if (grupoHoja) {
      grupoHoja.classList.toggle('d-none', area.hojas.length <= 1);
    }
  }


  _actualizarEtiquetaPeriodo() {
    if (this.$lblPeriodo) {
      this.$lblPeriodo.textContent = DateUtils.etiquetaPeriodo(this._mes, this._ano);
    }
    // Resaltar si es el mes actual
    const esActual = this._mes === DateUtils.getMesActual() && this._ano === DateUtils.getAnoActual();
    this.$lblPeriodo?.classList.toggle('periodo-actual', esActual);
  }

  _sincronizarInputsPeriodo() {
    this.$inpMes.value = this._mes;
    this.$inpAno.value = this._ano;
  }

  _turnoLabel() {
    const t = TURNOS.find(t => t.id === this.$selTurno.value);
    return t ? t.label : '';
  }

  /** Muestra brevemente el indicador de "guardado" */
  _mostrarGuardado() {
    if (!this.$indicadorGuardado) return;
    this.$indicadorGuardado.classList.remove('d-none');
    clearTimeout(this._timerGuardado);
    this._timerGuardado = setTimeout(() => {
      this.$indicadorGuardado.classList.add('d-none');
    }, 1500);
  }

  /** Limpia visualmente la grilla (pone todos los inputs en 0) */
  limpiarGrilla() {
    const inputs = this.$contenedorGrilla.querySelectorAll('.inp-celda');
    inputs.forEach(inp => { inp.value = ''; });
    const totales = this.$contenedorGrilla.querySelectorAll('[data-total-fila]');
    totales.forEach(td => { td.textContent = ''; });
    const celdastot = this.$contenedorGrilla.querySelectorAll('.celda-total');
    celdastot.forEach(td => { td.textContent = ''; });
  }

  /** Muestra el estado de "Sin área seleccionada" */
  mostrarSeleccionArea() {
    this.$contenedorGrilla.innerHTML = `
      <div class="grilla-placeholder">
        <div class="grilla-placeholder-icon">📊</div>
        <h5>Seleccione un área para ver el formato</h5>
        <p class="text-muted">Use los controles de arriba para elegir el área, mes, año y turno.</p>
      </div>`;
  }
}
