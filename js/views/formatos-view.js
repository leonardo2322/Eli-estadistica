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

    // Guardar en BD
    const $btnGuardarDB = document.getElementById('fmt-btn-guardar-db');
    if ($btnGuardarDB) {
      $btnGuardarDB.addEventListener('click', () => {
        if (handlers.onGuardarDB) handlers.onGuardarDB();
      });
    }

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
          // Celdas editables con manija de copiado tipo Excel (Fill Handle)
          dias.forEach(d => {
            const val     = Number(filaData[d]) || '';
            const clsHoy  = esHoy(d) ? ' celda-hoy' : '';
            celdas += `<td class="celda-input${clsHoy}">
              <div class="celda-wrapper">
                <input
                  type="number" min="0" step="1"
                  class="inp-celda"
                  data-fila="${fila.id}"
                  data-dia="${d}"
                  value="${val}"
                  aria-label="${DomHelpers.esc(fila.label)} día ${d}"
                >
                <div class="cell-fill-handle" data-fila="${fila.id}" data-dia="${d}" title="Arrastrar para copiar celda tipo Excel"></div>
              </div>
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

    // ── Ligar eventos de inputs y manija de Excel ──────────────
    this._bindInputsCelda(area, hoja, mes, ano, dias, datos);
    this._initFillHandleEvents(dias, datos);
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

    // Controles de ventana modal centrada de copiado móvil
    const $mobOverlay = document.getElementById('fmt-mobile-copiar-overlay');
    const $mobLabel   = document.getElementById('lbl-cell-focus-mobile');
    const $mobInstruccion = document.getElementById('lbl-mob-instruccion');
    const $btnFila    = document.getElementById('btn-mob-copiar-fila');
    const $btn7Dias   = document.getElementById('btn-mob-copiar-7dias');
    const $btnRango   = document.getElementById('btn-mob-copiar-rango');
    const $btnCol     = document.getElementById('btn-mob-copiar-columna');
    const $btnExmArea = document.getElementById('btn-mob-copiar-examenes-area');
    const $panelExmArea = document.getElementById('fmt-panel-examenes-area');
    const $lblAreaMult = document.getElementById('lbl-area-multiplicador');
    const $cntChksExm = document.getElementById('contenedor-checkboxes-examenes-area');
    const $btnSelTodos = document.getElementById('btn-select-todos-examenes');
    const $btnDeselTodos = document.getElementById('btn-deselect-todos-examenes');

    const $btnCerrar  = document.getElementById('btn-mob-cerrar-bar');
    const $btnCancelar = document.getElementById('btn-mob-cancelar-accion');
    const $btnAplicar = document.getElementById('btn-mob-aplicar-accion');

    let celdaActivaMobile = null;
    let opcionSeleccionada = null; // 'fila' | '7dias' | 'rango' | 'columna' | 'examenes-area' | null
    let celdaOrigenRango = null;
    let celdaDestinoRango = null;

    const desmarcarOpcionesUI = () => {
      [$btnFila, $btn7Dias, $btnRango, $btnCol, $btnExmArea].forEach(btn => {
        if (!btn) return;
        btn.classList.remove('opcion-seleccionada');
        const icon = btn.querySelector('.check-icon');
        if (icon) {
          icon.className = 'bi bi-circle check-icon text-muted';
        }
      });
      if ($panelExmArea) $panelExmArea.classList.add('d-none');
    };

    const resetModal = () => {
      opcionSeleccionada = null;
      if (celdaOrigenRango && celdaOrigenRango.inp) {
        celdaOrigenRango.inp.classList.remove('inp-celda-origen');
      }
      celdaOrigenRango = null;
      celdaDestinoRango = null;
      desmarcarOpcionesUI();
      if ($btnAplicar) $btnAplicar.disabled = true;
      if ($mobInstruccion) $mobInstruccion.textContent = 'Seleccione una opción de copiado:';
      if ($mobOverlay) $mobOverlay.classList.add('d-none');
    };

    const $cntFiltroCop = document.getElementById('contenedor-filtro-copiado-seccion');
    const $selFiltroCop = document.getElementById('copiado-filtro-seccion');

    const poblarCheckboxesExamenesArea = () => {
      if (!$cntChksExm) return;
      $cntChksExm.innerHTML = '';
      const mult = typeof getAreaMultiplier === 'function' ? getAreaMultiplier(area.id) : 5;
      if ($lblAreaMult) {
        $lblAreaMult.textContent = `Exámenes del Área (${area.label} — Factor: ${mult}x)`;
      }

      const esAreaFiltro = area.id === 'hematologia' || area.id === 'uroanalisis';
      if ($cntFiltroCop) {
        if (esAreaFiltro) {
          $cntFiltroCop.classList.remove('d-none');
        } else {
          $cntFiltroCop.classList.add('d-none');
          if ($selFiltroCop) $selFiltroCop.value = 'todos';
        }
      }

      const filtroVal = (esAreaFiltro && $selFiltroCop) ? $selFiltroCop.value : 'todos';

      // Recopilar todas las filas que no sean totales
      const filasDisponibles = [];
      hoja.grupos.forEach((grupo, gIdx) => {
        const gTitulo = (grupo.titulo || '').toUpperCase();
        if (filtroVal === 'hospitalizados' && gIdx > 0 && !gTitulo.includes('HOSPITALIZADOS')) return;
        if (filtroVal === 'consulta_especial' && gIdx > 0 && !gTitulo.includes('CONSULTA ESPECIAL')) return;

        grupo.filas.forEach(f => {
          if (!f.esTotal) filasDisponibles.push(f);
        });
      });

      filasDisponibles.forEach(f => {
        const colDiv = document.createElement('div');
        colDiv.className = 'col-12 col-md-6';
        colDiv.innerHTML = `
          <div class="form-check mb-1">
            <input class="form-check-input chk-examen-copiar" type="checkbox" id="chk-exm-${f.id}" value="${f.id}" checked>
            <label class="form-check-label small" for="chk-exm-${f.id}" title="${DomHelpers.esc(f.label)}">
              ${DomHelpers.esc(f.label)}
            </label>
          </div>`;
        $cntChksExm.appendChild(colDiv);
      });
    };

    if ($selFiltroCop) {
      $selFiltroCop.onchange = () => poblarCheckboxesExamenesArea();
    }

    if ($btnSelTodos) {
      $btnSelTodos.onclick = () => {
        const chks = $cntChksExm?.querySelectorAll('.chk-examen-copiar');
        chks?.forEach(c => { c.checked = true; });
      };
    }

    if ($btnDeselTodos) {
      $btnDeselTodos.onclick = () => {
        const chks = $cntChksExm?.querySelectorAll('.chk-examen-copiar');
        chks?.forEach(c => { c.checked = false; });
      };
    }

    const seleccionarOpcion = (opcion, btnEl) => {
      if (opcionSeleccionada === opcion) {
        opcionSeleccionada = null;
        desmarcarOpcionesUI();
        if ($btnAplicar) $btnAplicar.disabled = true;
        if ($mobInstruccion) $mobInstruccion.textContent = 'Seleccione una opción de copiado:';
        return;
      }

      desmarcarOpcionesUI();
      opcionSeleccionada = opcion;
      btnEl.classList.add('opcion-seleccionada');
      const icon = btnEl.querySelector('.check-icon');
      if (icon) icon.className = 'bi bi-check-circle-fill check-icon text-teal';

      if (opcion === 'examenes-area') {
        if ($panelExmArea) $panelExmArea.classList.remove('d-none');
        poblarCheckboxesExamenesArea();
        const mult = typeof getAreaMultiplier === 'function' ? getAreaMultiplier(area.id) : 5;
        const valActual = celdaActivaMobile ? celdaActivaMobile.val : 0;
        const valCalc = valActual * mult;
        if ($mobInstruccion) {
          $mobInstruccion.innerHTML = `<strong>Copiado con Multiplicador (${mult}x):</strong> Servicio: [${valActual}] ➔ Exámenes: [${valCalc}]. Marca los exámenes deseados:`;
        }
        if ($btnAplicar) $btnAplicar.disabled = false;
      } else if (opcion === 'rango') {
        celdaOrigenRango = { ...celdaActivaMobile };
        if (celdaOrigenRango.inp) celdaOrigenRango.inp.classList.add('inp-celda-origen');
        if ($mobInstruccion) $mobInstruccion.innerHTML = `📍 Origen Día ${celdaOrigenRango.dia} (${celdaOrigenRango.val}). <br><strong>Cierra este panel y toca la celda destino en la tabla.</strong>`;
        if ($btnAplicar) $btnAplicar.disabled = celdaDestinoRango ? false : true;
        DomHelpers.mostrarToast(`Origen fijado (Día ${celdaOrigenRango.dia}). Toca la celda destino en la tabla.`, 'info');
      } else {
        if (celdaOrigenRango && celdaOrigenRango.inp) {
          celdaOrigenRango.inp.classList.remove('inp-celda-origen');
        }
        celdaOrigenRango = null;
        celdaDestinoRango = null;
        if ($mobInstruccion) $mobInstruccion.textContent = 'Opción seleccionada. Pulse "Aplicar Copiado" para confirmar.';
        if ($btnAplicar) $btnAplicar.disabled = false;
      }
    };

    if ($mobOverlay) {
      const abrirModalCelda = (inp, forceOpen = false) => {
        if (!inp) return;
        const filaId = inp.dataset.fila;
        const dia = Number(inp.dataset.dia);
        const val = parseInt(inp.value) || 0;

        // Si estábamos en modo "Copiar hasta..." esperando celda destino:
        if (opcionSeleccionada === 'rango' && celdaOrigenRango && celdaOrigenRango.inp !== inp) {
          celdaDestinoRango = { filaId, dia, val, inp };
          if ($mobInstruccion) {
            $mobInstruccion.innerHTML = `✅ <strong>Rango listo:</strong> Copiar ${celdaOrigenRango.val} del Día ${celdaOrigenRango.dia} al Día ${dia}.`;
          }
          if ($btnAplicar) $btnAplicar.disabled = false;
          $mobOverlay.classList.remove('d-none');
          return;
        }

        celdaActivaMobile = { filaId, dia, val, inp };
        if ($mobLabel) $mobLabel.textContent = `📋 Copiado Rápido — Día ${dia}: [${val}]`;

        const infoDisp = DomHelpers.obtenerTipoDispositivo();

        // Abrir modal solo si es Teléfono/Tablet, o si se forzó la apertura (clic en botón Excel en barra o celda en PC)
        if (opcionSeleccionada !== 'rango' && (infoDisp.esMovilOTablet || forceOpen)) {
          $mobOverlay.classList.remove('d-none');
        }
      };

      this._abrirModalCeldaRef = abrirModalCelda;

      tabla.addEventListener('focusin', e => {
        if (!e.target.classList.contains('inp-celda')) return;
        abrirModalCelda(e.target, false);
      });

      tabla.addEventListener('click', e => {
        const inp = e.target.closest('.inp-celda');
        if (!inp) return;
        abrirModalCelda(inp, false);
      });

      const $btnCopiarRapido = document.getElementById('fmt-btn-copiar-rapido');
      if ($btnCopiarRapido) {
        $btnCopiarRapido.onclick = () => {
          if (celdaActivaMobile && celdaActivaMobile.inp && document.body.contains(celdaActivaMobile.inp)) {
            celdaActivaMobile.val = parseInt(celdaActivaMobile.inp.value) || 0;
            abrirModalCelda(celdaActivaMobile.inp, true);
          } else {
            const primeraCelda = tabla.querySelector('input.inp-celda');
            if (primeraCelda) {
              primeraCelda.focus();
              abrirModalCelda(primeraCelda, true);
            } else {
              DomHelpers.mostrarToast('Seleccione una celda en la grilla para usar Copiado Rápido.', 'info');
            }
          }
        };
      }

      if ($btnCerrar) $btnCerrar.onclick = () => resetModal();
      if ($btnCancelar) $btnCancelar.onclick = () => resetModal();

      if ($btnFila)    $btnFila.onclick    = () => seleccionarOpcion('fila', $btnFila);
      if ($btn7Dias)   $btn7Dias.onclick   = () => seleccionarOpcion('7dias', $btn7Dias);
      if ($btnRango)   $btnRango.onclick   = () => seleccionarOpcion('rango', $btnRango);
      if ($btnCol)     $btnCol.onclick     = () => seleccionarOpcion('columna', $btnCol);
      if ($btnExmArea) $btnExmArea.onclick = () => seleccionarOpcion('examenes-area', $btnExmArea);

      // Botón "Aplicar Copiado"
      if ($btnAplicar) {
        $btnAplicar.onclick = () => {
          if (!opcionSeleccionada || !celdaActivaMobile) return;
          const val = celdaActivaMobile.val;

          if (opcionSeleccionada === 'examenes-area') {
            const mult = typeof getAreaMultiplier === 'function' ? getAreaMultiplier(area.id) : 5;
            const valExamenes = Math.round(val * mult);
            const dia = celdaActivaMobile.dia;

            const chksSeleccionados = Array.from($cntChksExm?.querySelectorAll('.chk-examen-copiar:checked') || [])
              .map(c => c.value);

            if (!chksSeleccionados.length) {
              DomHelpers.mostrarToast('Seleccione al menos un examen de la lista.', 'info');
              return;
            }

            chksSeleccionados.forEach(fId => {
              const targetInp = tabla.querySelector(`input.inp-celda[data-fila="${fId}"][data-dia="${dia}"]`);
              if (targetInp) {
                const valExistente = parseInt(targetInp.value) || 0;
                const nuevoVal = valExistente + valExamenes;
                targetInp.value = nuevoVal || '';
                targetInp.dispatchEvent(new Event('input', { bubbles: true }));
              }
            });

            DomHelpers.mostrarToast(`Copiado aplicado a ${chksSeleccionados.length} exámenes para el Día ${dia} (+${valExamenes} sumado a valores existentes).`, 'success');
          }
          else if (opcionSeleccionada === 'fila') {
            const { filaId } = celdaActivaMobile;
            dias.forEach(d => {
              const targetInp = tabla.querySelector(`input.inp-celda[data-fila="${filaId}"][data-dia="${d}"]`);
              if (targetInp) {
                const valExistente = parseInt(targetInp.value) || 0;
                targetInp.value = (valExistente + val) || '';
                targetInp.dispatchEvent(new Event('input', { bubbles: true }));
              }
            });
            DomHelpers.mostrarToast(`Fila rellenada sumando ${val} a valores existentes.`, 'success');
          }
          else if (opcionSeleccionada === '7dias') {
            const { filaId, dia } = celdaActivaMobile;
            for (let d = dia; d <= Math.min(dia + 6, dias.length); d++) {
              const targetInp = tabla.querySelector(`input.inp-celda[data-fila="${filaId}"][data-dia="${d}"]`);
              if (targetInp) {
                const valExistente = parseInt(targetInp.value) || 0;
                targetInp.value = (valExistente + val) || '';
                targetInp.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }
            DomHelpers.mostrarToast(`Copiado a los 7 días siguientes sumando ${val}.`, 'success');
          }
          else if (opcionSeleccionada === 'rango' && celdaOrigenRango && celdaDestinoRango) {
            const fromFilaId = celdaOrigenRango.filaId;
            const fromDia = celdaOrigenRango.dia;
            const toFilaId = celdaDestinoRango.filaId;
            const toDia = celdaDestinoRango.dia;
            const valorACopiar = celdaOrigenRango.val;

            const minDia = Math.min(fromDia, toDia);
            const maxDia = Math.max(fromDia, toDia);

            if (fromFilaId === toFilaId) {
              for (let d = minDia; d <= maxDia; d++) {
                const targetInp = tabla.querySelector(`input.inp-celda[data-fila="${fromFilaId}"][data-dia="${d}"]`);
                if (targetInp) {
                  const valExistente = parseInt(targetInp.value) || 0;
                  targetInp.value = (valExistente + valorACopiar) || '';
                  targetInp.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }
            } else {
              const filas = Array.from(tabla.querySelectorAll('tr.fila-dato')).map(tr => tr.dataset.filaId);
              const idxStart = filas.indexOf(fromFilaId);
              const idxEnd = filas.indexOf(toFilaId);
              if (idxStart !== -1 && idxEnd !== -1) {
                const minIdx = Math.min(idxStart, idxEnd);
                const maxIdx = Math.max(idxStart, idxEnd);
                for (let f = minIdx; f <= maxIdx; f++) {
                  const currentFila = filas[f];
                  for (let d = minDia; d <= maxDia; d++) {
                    const targetInp = tabla.querySelector(`input.inp-celda[data-fila="${currentFila}"][data-dia="${d}"]`);
                    if (targetInp) {
                      const valExistente = parseInt(targetInp.value) || 0;
                      targetInp.value = (valExistente + valorACopiar) || '';
                      targetInp.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                  }
                }
              }
            }
            DomHelpers.mostrarToast(`Celdas rellenadas sumando ${valorACopiar}.`, 'success');
          }
          else if (opcionSeleccionada === 'columna') {
            const { dia } = celdaActivaMobile;
            const targetInputs = tabla.querySelectorAll(`input.inp-celda[data-dia="${dia}"]`);
            targetInputs.forEach(targetInp => {
              const valExistente = parseInt(targetInp.value) || 0;
              targetInp.value = (valExistente + val) || '';
              targetInp.dispatchEvent(new Event('input', { bubbles: true }));
            });
            DomHelpers.mostrarToast(`Día ${dia} rellenado sumando ${val}.`, 'success');
          }

          resetModal();
        };
      }

    }
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

  /**
   * Inicializa la manija de copiado tipo Excel (Fill Handle) para arrastrar y copiar celdas con ratón.
   */
  _initFillHandleEvents(dias, datosInicio) {
    const tabla = document.getElementById('tabla-grilla-principal');
    if (!tabla) return;

    let isDragging = false;
    let startFilaId = null;
    let startDia = null;
    let startVal = 0;
    let draggedInputs = [];

    const clearHighlights = () => {
      draggedInputs.forEach(inp => inp.classList.remove('cell-fill-dragged'));
      draggedInputs = [];
    };

    let clickStartPos = { x: 0, y: 0 };
    let dragMoved = false;

    tabla.addEventListener('mousedown', e => {
      const handle = e.target.closest('.cell-fill-handle');
      if (!handle) return;
      e.preventDefault();

      startFilaId = handle.dataset.fila;
      startDia = Number(handle.dataset.dia);
      clickStartPos = { x: e.clientX, y: e.clientY };
      dragMoved = false;

      const sourceInp = tabla.querySelector(`input.inp-celda[data-fila="${startFilaId}"][data-dia="${startDia}"]`);
      startVal = sourceInp ? (parseInt(sourceInp.value) || 0) : 0;
      isDragging = true;
    });

    const onMove = e => {
      if (!isDragging) return;
      const dx = Math.abs(e.clientX - clickStartPos.x);
      const dy = Math.abs(e.clientY - clickStartPos.y);
      if (dx > 3 || dy > 3) {
        dragMoved = true;
      }
      const clientX = e.clientX;
      const clientY = e.clientY;
      const targetEl = document.elementFromPoint(clientX, clientY);

      if (!targetEl) return;
      const targetInp = targetEl.closest('.inp-celda') || targetEl.querySelector('.inp-celda');
      if (!targetInp) return;

      const targetFilaId = targetInp.dataset.fila;
      const targetDia = Number(targetInp.dataset.dia);

      clearHighlights();

      const minDia = Math.min(startDia, targetDia);
      const maxDia = Math.max(startDia, targetDia);

      if (startFilaId === targetFilaId) {
        for (let d = minDia; d <= maxDia; d++) {
          const inp = tabla.querySelector(`input.inp-celda[data-fila="${startFilaId}"][data-dia="${d}"]`);
          if (inp) {
            inp.classList.add('cell-fill-dragged');
            draggedInputs.push(inp);
          }
        }
      } else {
        const filas = Array.from(tabla.querySelectorAll('tr.fila-dato')).map(tr => tr.dataset.filaId);
        const idxStart = filas.indexOf(startFilaId);
        const idxEnd = filas.indexOf(targetFilaId);

        if (idxStart !== -1 && idxEnd !== -1) {
          const minIdx = Math.min(idxStart, idxEnd);
          const maxIdx = Math.max(idxStart, idxEnd);

          for (let f = minIdx; f <= maxIdx; f++) {
            const currentFila = filas[f];
            for (let d = minDia; d <= maxDia; d++) {
              const inp = tabla.querySelector(`input.inp-celda[data-fila="${currentFila}"][data-dia="${d}"]`);
              if (inp) {
                inp.classList.add('cell-fill-dragged');
                draggedInputs.push(inp);
              }
            }
          }
        }
      }
    };

    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;

      if (dragMoved && draggedInputs.length > 0) {
        draggedInputs.forEach(inp => {
          inp.value = startVal || '';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        });
        DomHelpers.mostrarToast(`Celdas rellenadas con valor ${startVal}.`, 'success');
      } else if (!dragMoved && startFilaId) {
        // Clic simple en la manija de Excel ("botoncito de excel") -> abrir modal de copiado rápido
        const sourceInp = tabla.querySelector(`input.inp-celda[data-fila="${startFilaId}"][data-dia="${startDia}"]`);
        if (sourceInp && typeof this._abrirModalCeldaRef === 'function') {
          this._abrirModalCeldaRef(sourceInp, true);
        }
      }

      clearHighlights();
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
  }

  /**
   * Conecta los controles del Modal de Escáner de Cuadernos de Bioanálisis (IA).
   * Soporta selección de lote de imágenes con continuidad de fecha,
   * tabla interactiva de revisión pre-inserción y aprendizaje de centros externos.
   * @param {Function} onAplicarFoto – Callback que recibe las atenciones agrupadas para guardar localmente
   */
  bindEscanerFoto(onAplicarFoto) {
    const $btnEscanear = document.getElementById('fmt-btn-escanear-foto');
    const $modal       = document.getElementById('modal-escaner-foto');
    const $btnCerrar   = document.getElementById('btn-cerrar-escaner');
    const $dropzone    = document.getElementById('escaner-dropzone');
    const $btnCamara   = document.getElementById('btn-escaner-camara');
    const $btnGaleria  = document.getElementById('btn-escaner-galeria');
    const $inpCamara   = document.getElementById('inp-foto-camara');
    const $inpGaleria  = document.getElementById('inp-foto-galeria');
    const $inpFoto     = document.getElementById('inp-foto-planilla');
    const $previewWrap = document.getElementById('contenedor-preview-foto');
    const $lblLoteCount= document.getElementById('lbl-lote-count');
    const $gridThumbs  = document.getElementById('grid-lote-thumbnails');
    const $btnReemplaz = document.getElementById('btn-reemplazar-foto');
    const $progWrap    = document.getElementById('contenedor-progreso-ocr');
    const $lblEstado   = document.getElementById('lbl-estado-ocr');
    const $pctEstado   = document.getElementById('pct-estado-ocr');
    const $barProgreso = document.getElementById('bar-progreso-ocr');
    const $resWrap     = document.getElementById('contenedor-resultados-ocr');
    const $tbodyRes    = document.getElementById('tbody-resultados-ocr');
    const $btnAplicar  = document.getElementById('btn-aplicar-foto-formato');
    const $btnCancelar = document.getElementById('btn-cancelar-atenciones');
    const $btnAprender = document.getElementById('btn-aprender-centro');
    const $lblResumenCount = document.getElementById('lbl-resumen-atenciones-count');

    if (!$btnEscanear || !$modal) return;

    let archivosLote = [];
    let registrosDetectados = [];

    const abrirModal = () => {
      $modal.classList.remove('d-none');
      document.body.style.overflow = 'hidden';

      // Detectar si el usuario está en un dispositivo móvil/teléfono
      const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth <= 1024);
      if ($btnCamara) {
        if (esMovil) {
          $btnCamara.classList.remove('d-none'); // Mostrar botón de tomar foto directa con cámara en teléfonos
        } else {
          $btnCamara.classList.add('d-none'); // Ocultar botón de cámara en PC de escritorio / Laptops
        }
      }
    };

    const cerrarModal = () => {
      $modal.classList.add('d-none');
      document.body.style.overflow = '';
      resetForm();
    };

    let mediaStreamLive = null;

    const abrirCamaraLive = async () => {
      // Intentar primero con la API nativa de cámara en vivo HTML5 (WebRTC)
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        try {
          const constraints = {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          };
          mediaStreamLive = await navigator.mediaDevices.getUserMedia(constraints);
          const $video = document.getElementById('video-camara-live');
          const $wrapLive = document.getElementById('contenedor-camara-live');
          if ($video && $wrapLive) {
            $video.srcObject = mediaStreamLive;
            $wrapLive.classList.remove('d-none');
            if ($dropzone) $dropzone.classList.add('d-none');
            return;
          }
        } catch (err) {
          console.warn('Cámara en vivo no disponible o sin permiso, usando fallback de captura:', err);
        }
      }

      // Fallback si WebRTC no es soportado o si fue denegado el permiso directo
      if ($inpCamara) {
        $inpCamara.value = '';
        $inpCamara.click();
      }
    };

    const detenerCamaraLive = () => {
      if (mediaStreamLive) {
        mediaStreamLive.getTracks().forEach(track => track.stop());
        mediaStreamLive = null;
      }
      const $wrapLive = document.getElementById('contenedor-camara-live');
      if ($wrapLive) $wrapLive.classList.add('d-none');
      if ($dropzone && !archivosLote.length) $dropzone.classList.remove('d-none');
    };

    const capturarSnapLive = () => {
      const $video = document.getElementById('video-camara-live');
      const $canvas = document.getElementById('canvas-camara-snap');
      if (!$video || !$canvas) return;

      $canvas.width = $video.videoWidth || 1280;
      $canvas.height = $video.videoHeight || 720;
      const ctx = $canvas.getContext('2d');
      ctx.drawImage($video, 0, 0, $canvas.width, $canvas.height);

      $canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `cuaderno-foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
          detenerCamaraLive();
          procesarArchivosLote([...archivosLote, file]);
        }
      }, 'image/jpeg', 0.92);
    };

    const $btnSnapLive   = document.getElementById('btn-capturar-snap');
    const $btnCerrarLive = document.getElementById('btn-cerrar-camara-live');

    if ($btnSnapLive) $btnSnapLive.addEventListener('click', capturarSnapLive);
    if ($btnCerrarLive) $btnCerrarLive.addEventListener('click', detenerCamaraLive);

    const resetForm = () => {
      detenerCamaraLive();
      archivosLote = [];
      registrosDetectados = [];
      if ($inpFoto) $inpFoto.value = '';
      if ($inpCamara) $inpCamara.value = '';
      if ($inpGaleria) $inpGaleria.value = '';
      if ($previewWrap) $previewWrap.classList.add('d-none');
      if ($gridThumbs) $gridThumbs.innerHTML = '';
      if ($dropzone) $dropzone.classList.remove('d-none');
      if ($progWrap) $progWrap.classList.add('d-none');
      if ($resWrap) $resWrap.classList.add('d-none');
      if ($tbodyRes) $tbodyRes.innerHTML = '';
    };

    $btnEscanear.addEventListener('click', abrirModal);
    $btnCerrar.addEventListener('click', cerrarModal);
    if ($btnCancelar) $btnCancelar.addEventListener('click', cerrarModal);
    if ($btnReemplaz) $btnReemplaz.addEventListener('click', () => resetForm());

    if ($btnAprender) {
      $btnAprender.addEventListener('click', () => {
        const nuevo = prompt('Ingrese el nombre o abreviatura del nuevo centro de consulta externa / ambulatorio (ej: CEMCA, ROA, Amparo, Río Negro, Guaraque):');
        if (nuevo && nuevo.trim()) {
          const fbRepo = (window.formatosCtrl && window.formatosCtrl.firebaseRepo) ? window.formatosCtrl.firebaseRepo : null;
          CuadernoParser.aprenderCentroExterno(nuevo, fbRepo);
          DomHelpers.mostrarToast(`¡Centro "${nuevo.trim().toUpperCase()}" aprendido y sincronizado con Cloud Firestore! Re-procesando la lista...`, 'success');
          // Re-clasificar atenciones en pantalla
          registrosDetectados.forEach(r => {
            const reClas = CuadernoParser.clasificarServicio(r.numPaciente, r.servicioTextoOriginal);
            if (reClas.servicioKey === 'cons_externa') {
              r.servicioKey = reClas.servicioKey;
              r.servicioNombre = reClas.servicioNombre;
              r.categoriaServicio = reClas.Categoria;
            }
          });
          renderTablaRevision();
        }
      });
    }

    if ($btnCamara) {
      $btnCamara.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirCamaraLive();
      });
    }
    if ($btnGaleria && $inpGaleria) {
      $btnGaleria.addEventListener('click', (e) => {
        e.stopPropagation();
        $inpGaleria.value = '';
        $inpGaleria.click();
      });
    }

    if ($dropzone) {
      $dropzone.addEventListener('click', (e) => {
        if (e.target.closest('#btn-escaner-camara') || e.target.closest('#btn-escaner-galeria')) return;
        if ($inpGaleria) $inpGaleria.click();
        else if ($inpFoto) $inpFoto.click();
      });

      $dropzone.addEventListener('dragover', e => { e.preventDefault(); $dropzone.style.borderColor = 'var(--teal)'; });
      $dropzone.addEventListener('dragleave', e => { e.preventDefault(); $dropzone.style.borderColor = '#cbd5e1'; });
      $dropzone.addEventListener('drop', e => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          procesarArchivosLote(Array.from(e.dataTransfer.files));
        }
      });
    }

    [$inpCamara, $inpGaleria, $inpFoto].forEach(inp => {
      if (!inp) return;
      inp.addEventListener('change', () => {
        if (inp.files && inp.files.length) {
          procesarArchivosLote(Array.from(inp.files));
        }
      });
    });

    const procesarArchivosLote = async (files) => {
      archivosLote = files;
      if (!archivosLote.length) return;

      $dropzone.classList.add('d-none');
      $previewWrap.classList.remove('d-none');
      $progWrap.classList.remove('d-none');
      $resWrap.classList.add('d-none');

      // Renderizar miniaturas del lote
      $lblLoteCount.innerHTML = `<i class="bi bi-images me-1"></i>Imágenes en este lote (${archivosLote.length})`;
      $gridThumbs.innerHTML = '';
      archivosLote.forEach((f, i) => {
        const url = URL.createObjectURL(f);
        const thumb = document.createElement('div');
        thumb.className = 'position-relative border rounded overflow-hidden shadow-sm flex-shrink-0';
        thumb.style.width = '70px';
        thumb.style.height = '70px';
        thumb.innerHTML = `
          <img src="${url}" class="w-100 h-100" style="object-fit: cover;">
          <span class="position-absolute bottom-0 end-0 bg-dark text-white px-1 py-0 small fw-bold opacity-75" style="font-size: 0.65rem;">Pág ${i + 1}</span>
        `;
        $gridThumbs.appendChild(thumb);
      });

      if (typeof Tesseract === 'undefined') {
        DomHelpers.mostrarToast('Tesseract.js no disponible. Verifique la conexión a internet.', 'error');
        $progWrap.classList.add('d-none');
        return;
      }

      const totalArchivos = archivosLote.length;
      const resultadosImgs = [];

      try {
        for (let i = 0; i < totalArchivos; i++) {
          const file = archivosLote[i];
          const pctBase = i / totalArchivos;
          $lblEstado.textContent = `Analizando imagen ${i + 1} de ${totalArchivos} con IA...`;

          let imagenOptimizada = file;

          // Rotar automáticamente si la imagen de la foto está tomada de lado/vertical (alto > ancho)
          try {
            imagenOptimizada = await new Promise((resolve) => {
              const img = new Image();
              const url = URL.createObjectURL(file);
              img.onload = () => {
                URL.revokeObjectURL(url);
                if (img.height > img.width) {
                  const canvas = document.createElement('canvas');
                  canvas.width = img.height;
                  canvas.height = img.width;
                  const ctx = canvas.getContext('2d');
                  ctx.translate(canvas.width / 2, canvas.height / 2);
                  ctx.rotate((90 * Math.PI) / 180);
                  ctx.drawImage(img, -img.width / 2, -img.height / 2);
                  canvas.toBlob((b) => resolve(b ? new File([b], file.name, { type: 'image/jpeg' }) : file), 'image/jpeg', 0.95);
                } else {
                  resolve(file);
                }
              };
              img.onerror = () => resolve(file);
              img.src = url;
            });
          } catch (e) {}

          if (typeof OcrScanner !== 'undefined' && OcrScanner.preprocesarImagen) {
            try { imagenOptimizada = await OcrScanner.preprocesarImagen(imagenOptimizada); } catch (e) {}
          }

          const worker = await Tesseract.createWorker('spa+eng', 1, {
            logger: m => {
              if (m.status === 'recognizing text') {
                const subPct = (pctBase + (m.progress / totalArchivos)) * 100;
                $pctEstado.textContent = `${Math.round(subPct)}%`;
                $barProgreso.style.width = `${Math.round(subPct)}%`;
              }
            }
          });

          const res = await worker.recognize(imagenOptimizada);
          await worker.terminate();

          resultadosImgs.push({
            rawText: res.data.text || '',
            imagenIndex: i + 1
          });
        }

        // Parsear el lote completo con CuadernoParser (manejando herencia de fechas entre fotos consecutivas)
        registrosDetectados = CuadernoParser.parsearLoteCuadernos(resultadosImgs, DateUtils.getHoy());

        $progWrap.classList.add('d-none');
        $resWrap.classList.remove('d-none');

        renderTablaRevision();

      } catch (err) {
        $progWrap.classList.add('d-none');
        DomHelpers.mostrarToast(err.message || 'Error al procesar el lote de imágenes.', 'error');
        resetForm();
      }
    };

    const renderTablaRevision = () => {
      $tbodyRes.innerHTML = '';
      if (!registrosDetectados.length) {
        $tbodyRes.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No se detectaron filas de atención en las fotos. Verifique que la imagen esté enfocada.</td></tr>`;
        $lblResumenCount.textContent = '0 atenciones detectadas';
        return;
      }

      $lblResumenCount.textContent = `${registrosDetectados.length} atenciones listadas para revisión`;

      const serviciosOpciones = [
        { key: 'hospitalizacion', label: 'Hospitalización - General' },
        { key: 'pediatria', label: 'Hospitalización - Pediatría' },
        { key: 'med_interna', label: 'Hospitalización - Med. Interna' },
        { key: 'obstetricia', label: 'Hospitalización - Obstetricia' },
        { key: 'cirugia', label: 'Hospitalización - Cirugía' },
        { key: 'observacion', label: 'Hospitalización - Observación' },
        { key: 'cons_especial', label: 'Consulta Especial' },
        { key: 'cons_externa', label: 'Consulta Externa / Ambulatorio' }
      ];

      const examenesOpciones = [
        { key: 'hem_general', nombre: 'Hematología Completa', areaId: 'hematologia', mult: 5 },
        { key: 'sub_56_vsg', nombre: 'VSG', areaId: 'hematologia', mult: 1 },
        { key: 'uro_general', nombre: 'Orina / Uroanálisis', areaId: 'uroanalisis', mult: 6 },
        { key: 'cop_general', nombre: 'Coproanálisis / Heces', areaId: 'coproanalisis', mult: 2 },
        { key: 'ser1_pe', nombre: 'Prueba de Embarazo (HCG)', areaId: 'serologia', mult: 1 },
        { key: 'ser2_vd', nombre: 'VDRL', areaId: 'serologia', mult: 1 },
        { key: 'ser2_hiv', nombre: 'HIV', areaId: 'serologia', mult: 1 },
        { key: 'ser1_ha', nombre: 'Hepatitis A', areaId: 'serologia', mult: 1 },
        { key: 'ser1_hb', nombre: 'Hepatitis B', areaId: 'serologia', mult: 1 },
        { key: 'ser1_hc', nombre: 'Hepatitis C', areaId: 'serologia', mult: 1 },
        { key: 'ser1_cov', nombre: 'COVID-19', areaId: 'serologia', mult: 1 },
        { key: 'ser2_den', nombre: 'Dengue', areaId: 'serologia', mult: 1 },
        { key: 'ser2_hp', nombre: 'Helicobacter Pylori', areaId: 'serologia', mult: 1 },
        { key: 'ser2_aslo', nombre: 'ASLO', areaId: 'serologia', mult: 1 }
      ];

      registrosDetectados.forEach((reg, idx) => {
        const tr = document.createElement('tr');
        const badgeCat = reg.categoriaServicio === 'Hospitalización' ? 'bg-danger' :
                         (reg.categoriaServicio === 'Consulta Externa' ? 'bg-info text-dark' : 'bg-primary');

        const optsServ = serviciosOpciones.map(s => `
          <option value="${s.key}" ${s.key === reg.servicioKey ? 'selected' : ''}>${s.label}</option>
        `).join('');

        const optsExm = examenesOpciones.map(e => `
          <option value="${e.key}" ${e.key === reg.examenKey ? 'selected' : ''}>${e.nombre}</option>
        `).join('');

        const centroExtBadge = reg.centroExternoDetectado ?
          `<span class="badge bg-teal text-white py-1 px-2"><i class="bi bi-geo-alt-fill me-1"></i>${DomHelpers.esc(reg.centroExternoDetectado)}</span>` :
          `<span class="text-muted small">—</span>`;

        const strParasitos = (reg.parasitos && reg.parasitos.length) ? reg.parasitos.join(', ') : (reg.resultadoTexto || 'Normal');

        tr.innerHTML = `
          <td class="text-center fw-bold text-teal" style="width: 40px;">${idx + 1}</td>
          <td style="width: 115px;">
            <input type="date" class="form-control form-control-sm py-0 input-fecha-rev" data-idx="${idx}" value="${reg.fecha}">
          </td>
          <td style="min-width: 150px;">
            <input type="text" class="form-control form-control-sm py-0 input-nombre-rev mb-1 fw-semibold" data-idx="${idx}" value="${DomHelpers.esc(reg.nombrePaciente)}" placeholder="Nombre del paciente">
            <div class="d-flex align-items-center gap-1">
              <span class="small text-muted">Edad:</span>
              <input type="text" class="form-control form-control-sm py-0 input-edad-rev" data-idx="${idx}" value="${DomHelpers.esc(reg.edadPaciente || 'S/E')}" style="width: 65px;" placeholder="S/E">
            </div>
            ${reg.dudaLectura ? `<div class="badge bg-warning-subtle text-dark border border-warning mt-1" style="font-size: 0.65rem;" title="Haga clic en los campos para corregir si el OCR no leyó perfectamente."><i class="bi bi-pencil-square me-1"></i>Verificar / Editar Datos</div>` : ''}
          </td>
          <td>
            <select class="form-select form-select-sm py-0 select-servicio-rev" data-idx="${idx}">
              ${optsServ}
            </select>
            <span class="badge ${badgeCat} mt-1" style="font-size: 0.65rem;">${reg.categoriaServicio}</span>
          </td>
          <td>
            ${centroExtBadge}
          </td>
          <td>
            <select class="form-select form-select-sm py-0 select-examen-rev" data-idx="${idx}">
              ${optsExm}
            </select>
          </td>
          <td class="text-center">
            <span class="badge bg-teal-subtle text-teal-dark fw-bold span-area-mult-${idx}">
              ${reg.areaId.toUpperCase()} (×${reg.multiplicador})
            </span>
          </td>
          <td style="min-width: 140px;">
            <input type="text" class="form-control form-control-sm py-0 input-parasito-rev" data-idx="${idx}" value="${DomHelpers.esc(strParasitos)}" placeholder="Ej: Blastocystis, Entamoeba">
          </td>
          <td class="text-end">
            <button type="button" class="btn btn-xs btn-outline-danger btn-del-rev py-0 px-2" data-idx="${idx}" title="Eliminar atención">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        `;
        $tbodyRes.appendChild(tr);
      });

      // Bindings de la tabla interactiva de revisión (Edición directa de todos los campos)
      $tbodyRes.querySelectorAll('.input-fecha-rev').forEach(inp => {
        inp.addEventListener('change', (e) => {
          const idx = parseInt(e.target.dataset.idx, 10);
          if (registrosDetectados[idx]) registrosDetectados[idx].fecha = e.target.value;
        });
      });

      $tbodyRes.querySelectorAll('.input-nombre-rev').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const idx = parseInt(e.target.dataset.idx, 10);
          if (registrosDetectados[idx]) registrosDetectados[idx].nombrePaciente = e.target.value;
        });
      });

      $tbodyRes.querySelectorAll('.input-edad-rev').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const idx = parseInt(e.target.dataset.idx, 10);
          if (registrosDetectados[idx]) registrosDetectados[idx].edadPaciente = e.target.value;
        });
      });

      $tbodyRes.querySelectorAll('.input-parasito-rev').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const idx = parseInt(e.target.dataset.idx, 10);
          if (registrosDetectados[idx]) {
            const val = e.target.value.trim();
            registrosDetectados[idx].resultadoTexto = val;
            registrosDetectados[idx].parasitos = CuadernoParser.extraerParasitos(val);
          }
        });
      });

      $tbodyRes.querySelectorAll('.select-servicio-rev').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const idx = parseInt(e.target.dataset.idx, 10);
          const selOpt = sel.options[sel.selectedIndex];
          if (registrosDetectados[idx]) {
            registrosDetectados[idx].servicioKey = sel.value;
            registrosDetectados[idx].servicioNombre = selOpt.text;
            if (sel.value === 'cons_externa') registrosDetectados[idx].categoriaServicio = 'Consulta Externa';
            else if (sel.value === 'cons_especial') registrosDetectados[idx].categoriaServicio = 'Consulta Especial';
            else registrosDetectados[idx].categoriaServicio = 'Hospitalización';
          }
        });
      });

      $tbodyRes.querySelectorAll('.select-examen-rev').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const idx = parseInt(e.target.dataset.idx, 10);
          const exmKey = sel.value;
          const exmObj = examenesOpciones.find(ex => ex.key === exmKey);
          if (registrosDetectados[idx] && exmObj) {
            registrosDetectados[idx].examenKey = exmObj.key;
            registrosDetectados[idx].examenNombre = exmObj.nombre;
            registrosDetectados[idx].areaId = exmObj.areaId;
            registrosDetectados[idx].multiplicador = exmObj.mult;

            // Actualizar la celda visual de área y multiplicador
            const badgeSpan = $tbodyRes.querySelector(`.span-area-mult-${idx}`);
            if (badgeSpan) {
              badgeSpan.textContent = `${exmObj.areaId.toUpperCase()} (×${exmObj.mult})`;
            }
          }
        });
      });

      $tbodyRes.querySelectorAll('.btn-del-rev').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.dataset.idx, 10);
          registrosDetectados.splice(idx, 1);
          renderTablaRevision();
        });
      });
    };

    // Botón "Guardar Atenciones en el Sistema (Local)"
    if ($btnAplicar) {
      $btnAplicar.addEventListener('click', () => {
        if (!registrosDetectados.length) {
          DomHelpers.mostrarToast('No hay atenciones para guardar.', 'error');
          return;
        }

        // Agrupar las atenciones revisadas por (fecha, servicioKey, examenKey)
        const atencionesAgrupadas = CuadernoParser.agruparAtencionesParaInsercion(registrosDetectados);

        if (onAplicarFoto) {
          onAplicarFoto(atencionesAgrupadas);
        }

        cerrarModal();
        DomHelpers.mostrarToast(`¡${registrosDetectados.length} atenciones guardadas exitosamente en LocalStorage! Recuerde hacer clic en "Guardar en Base de Datos" cuando desee sincronizar a la Nube.`, 'success');
      });
    }
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

