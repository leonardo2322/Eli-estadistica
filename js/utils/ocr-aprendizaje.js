/**
 * =========================================================================
 * js/utils/ocr-aprendizaje.js
 * -------------------------------------------------------------------------
 * Módulo de Aprendizaje Adaptativo para OCR de Escritura a Mano.
 *
 * PROPÓSITO:
 *   Mejorar progresivamente la precisión del OCR cuando se trabaja con
 *   documentos escritos a mano. El sistema aprende de las correcciones que
 *   el usuario hace sobre el texto reconocido y las aplica automáticamente
 *   la próxima vez que se detecte un texto similar.
 *
 * CÓMO FUNCIONA:
 *   1. El OCR reconoce texto crudo (puede tener errores por la letra a mano).
 *   2. OcrAprendizaje aplica correcciones ya conocidas al texto crudo.
 *   3. Se muestra al usuario un panel de confirmación con lo que se detectó.
 *   4. El usuario confirma (check) o corrige cada fila detectada.
 *   5. Cuando el usuario corrige, el sistema guarda la asociación:
 *        "lo que el OCR leyó" -> "lo que realmente era"
 *   6. En el próximo escaneo, si el OCR vuelve a leer algo parecido,
 *      aplica la corrección guardada antes de mostrar los resultados.
 *
 * ALMACENAMIENTO:
 *   - Clave localStorage: eli_ocr_aprendizaje
 *   - Formato: Array de entradas { textoOcr, textoCorrecto, confianza, usos }
 *   - Máximo: 500 entradas (se eliminan las menos usadas si se supera)
 * =========================================================================
 */

'use strict';

class OcrAprendizaje {

  // -------------------------------------------------------------------------
  // CONSTANTES DE CONFIGURACION
  // -------------------------------------------------------------------------

  /** Clave en localStorage donde se persiste el diccionario aprendido */
  static get CLAVE_STORAGE() { return 'eli_ocr_aprendizaje'; }

  /** Maximo de correcciones almacenadas antes de limpiar las menos usadas */
  static get MAX_ENTRADAS() { return 500; }

  /**
   * Umbral de similitud (0 a 1) para considerar dos textos como iguales.
   * 0.72 = 72% de similitud -> buena tolerancia a la letra a mano.
   */
  static get UMBRAL_SIMILITUD() { return 0.72; }

  // -------------------------------------------------------------------------
  // LECTURA Y ESCRITURA DEL DICCIONARIO
  // -------------------------------------------------------------------------

  /**
   * Carga el diccionario de correcciones desde localStorage.
   * @returns {Array<{textoOcr: string, textoCorrecto: string, confianza: number, usos: number}>}
   */
  static cargarDiccionario() {
    try {
      const raw = localStorage.getItem(this.CLAVE_STORAGE);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      // Si el localStorage esta corrupto, empezar de cero
      return [];
    }
  }

  /**
   * Guarda el diccionario de correcciones en localStorage.
   * Si supera el limite maximo, elimina las entradas menos usadas.
   * @param {Array} diccionario
   */
  static guardarDiccionario(diccionario) {
    let dic = diccionario;

    // Si superamos el maximo, ordenar por usos y conservar solo los mas frecuentes
    if (dic.length > this.MAX_ENTRADAS) {
      dic = dic.sort((a, b) => b.usos - a.usos).slice(0, this.MAX_ENTRADAS);
    }

    localStorage.setItem(this.CLAVE_STORAGE, JSON.stringify(dic));
  }

  /**
   * Devuelve cuantas correcciones tiene el sistema aprendidas.
   * @returns {number}
   */
  static contarAprendizajes() {
    return this.cargarDiccionario().length;
  }

  /** Elimina TODO el diccionario aprendido (para reiniciar el aprendizaje). */
  static limpiarDiccionario() {
    localStorage.removeItem(this.CLAVE_STORAGE);
  }

  // -------------------------------------------------------------------------
  // ALGORITMO DE SIMILITUD DE TEXTO (Distancia Levenshtein)
  // -------------------------------------------------------------------------

  /**
   * Normaliza un texto para comparacion: minusculas, sin acentos, sin simbolos.
   * Esto ayuda a que "Hemoglobina" y "hemoglobIna" sean tratados igual.
   * @param {string} texto
   * @returns {string}
   */
  static normalizar(texto) {
    return (texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')   // eliminar acentos
      .replace(/[^a-z0-9\s]/g, '')        // eliminar caracteres especiales
      .replace(/\s+/g, ' ')               // normalizar espacios multiples
      .trim();
  }

  /**
   * Calcula la similitud entre dos textos usando el algoritmo de
   * distancia de Levenshtein normalizada.
   *
   * Retorna un valor de 0 (nada similar) a 1 (identicos).
   * Ejemplo: "hemoglobina" vs "hemogIabyna" -> ~0.82 (muy similar)
   *
   * @param {string} a - Primer texto
   * @param {string} b - Segundo texto
   * @returns {number} Similitud entre 0 y 1
   */
  static calcularSimilitud(a, b) {
    const s1 = this.normalizar(a);
    const s2 = this.normalizar(b);

    if (!s1 && !s2) return 1;
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1;

    const len1 = s1.length;
    const len2 = s2.length;

    // Crear matriz para el algoritmo de Levenshtein (programacion dinamica)
    const dp = Array.from({ length: len1 + 1 }, (_, i) =>
      Array.from({ length: len2 + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
    );

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1]; // misma letra: sin costo adicional
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // operacion: borrar
            dp[i][j - 1],     // operacion: insertar
            dp[i - 1][j - 1]  // operacion: reemplazar
          );
        }
      }
    }

    // Normalizar: similitud = 1 - (distancia / longitud del texto mas largo)
    const distancia = dp[len1][len2];
    const maxLongitud = Math.max(len1, len2);
    return 1 - (distancia / maxLongitud);
  }

  // -------------------------------------------------------------------------
  // MOTOR DE APRENDIZAJE: GUARDAR Y APLICAR CORRECCIONES
  // -------------------------------------------------------------------------

  /**
   * Registra una correccion del usuario en el diccionario de aprendizaje.
   * Si ya existe una entrada muy similar al texto OCR, la actualiza.
   * Si no existe, crea una nueva entrada.
   *
   * @param {string} textoOcr       - Texto que el OCR leyo incorrectamente
   * @param {string} textoCorrecto  - El texto correcto que ingreso el usuario
   */
  static aprenderCorreccion(textoOcr, textoCorrecto) {
    if (!textoOcr || !textoCorrecto) return;
    // No aprender si ambos textos son identicos despues de normalizar
    if (this.normalizar(textoOcr) === this.normalizar(textoCorrecto)) return;

    const dic = this.cargarDiccionario();

    // Buscar si ya existe una entrada similar al texto OCR incorrecto
    let entradaExistente = null;
    let mejorSimilitud = 0;

    for (const entrada of dic) {
      const sim = this.calcularSimilitud(entrada.textoOcr, textoOcr);
      if (sim > this.UMBRAL_SIMILITUD && sim > mejorSimilitud) {
        mejorSimilitud = sim;
        entradaExistente = entrada;
      }
    }

    if (entradaExistente) {
      // Actualizar la entrada existente: refinar el texto correcto y aumentar confianza
      entradaExistente.textoCorrecto = textoCorrecto;
      entradaExistente.usos += 1;
      entradaExistente.confianza = Math.min(1, entradaExistente.confianza + 0.1);
    } else {
      // Crear nueva entrada de aprendizaje con confianza inicial moderada
      dic.push({
        textoOcr:      textoOcr,
        textoCorrecto: textoCorrecto,
        confianza:     0.5,   // confianza inicial moderada (crece con confirmaciones)
        usos:          1,
        fechaCreacion: new Date().toISOString()
      });
    }

    this.guardarDiccionario(dic);
    console.log('[OCR-Aprendizaje] Nueva correccion guardada: "' + textoOcr + '" -> "' + textoCorrecto + '"');
  }

  /**
   * Registra que una deteccion fue CORRECTA (el usuario la confirmo sin cambios).
   * Aumenta la confianza de las correcciones relacionadas con ese texto.
   *
   * @param {string} textoReconocido - Texto que el OCR detecto y el usuario confirmo correcto
   */
  static confirmarDeteccion(textoReconocido) {
    if (!textoReconocido) return;

    const dic = this.cargarDiccionario();
    let cambiado = false;

    for (const entrada of dic) {
      const simConTextoCorrecto = this.calcularSimilitud(entrada.textoCorrecto, textoReconocido);

      if (simConTextoCorrecto > 0.85) {
        // El texto reconocido coincide con lo ya aprendido como correcto -> aumentar confianza
        entrada.usos += 1;
        entrada.confianza = Math.min(1, entrada.confianza + 0.05);
        cambiado = true;
      }
    }

    if (cambiado) this.guardarDiccionario(dic);
  }

  /**
   * Aplica las correcciones aprendidas a una linea de texto del OCR.
   *
   * Antes de mostrar resultados al usuario, revisa si el texto reconocido
   * se parece a algo que el usuario corrigio antes y, si la confianza
   * es suficiente, lo reemplaza automaticamente.
   *
   * @param {string} textoOcr - Texto crudo que devolvio el OCR
   * @returns {{ textoCorrecto: string, correccionAplicada: boolean, detalle: string|null }}
   */
  static aplicarCorreccionesAprendidas(textoOcr) {
    if (!textoOcr) {
      return { textoCorrecto: textoOcr, correccionAplicada: false, detalle: null };
    }

    const dic = this.cargarDiccionario();
    let mejorSimilitud = 0;
    let mejorEntrada = null;

    // Buscar la correccion mas similar con confianza suficiente
    for (const entrada of dic) {
      // Solo aplicar correcciones con al menos 40% de confianza
      if (entrada.confianza < 0.4) continue;

      const sim = this.calcularSimilitud(entrada.textoOcr, textoOcr);
      if (sim > this.UMBRAL_SIMILITUD && sim > mejorSimilitud) {
        mejorSimilitud = sim;
        mejorEntrada = entrada;
      }
    }

    if (mejorEntrada) {
      // Aplicar la correccion aprendida y registrar su uso
      mejorEntrada.usos += 1;
      this.guardarDiccionario(dic);

      return {
        textoCorrecto:      mejorEntrada.textoCorrecto,
        correccionAplicada: true,
        detalle:            'Correccion automatica aplicada (similitud: ' + Math.round(mejorSimilitud * 100) + '%)'
      };
    }

    return { textoCorrecto: textoOcr, correccionAplicada: false, detalle: null };
  }

  /**
   * Busca si hay una sugerencia para un texto dado.
   * Util para mostrar "Era esto: X?" al usuario cuando el OCR no esta seguro.
   *
   * @param {string} texto - Texto a buscar en el diccionario
   * @returns {{ sugerencia: string|null, confianza: number }}
   */
  static buscarSugerencia(texto) {
    if (!texto) return { sugerencia: null, confianza: 0 };

    const dic = this.cargarDiccionario();
    let mejorSim = 0;
    let sugerencia = null;
    let confianzaSug = 0;

    for (const entrada of dic) {
      // Comparar el texto con lo que el OCR suele leer incorrectamente
      const simOcr = this.calcularSimilitud(entrada.textoOcr, texto);
      if (simOcr > this.UMBRAL_SIMILITUD && simOcr > mejorSim) {
        mejorSim = simOcr;
        sugerencia = entrada.textoCorrecto;
        confianzaSug = entrada.confianza;
      }
    }

    return { sugerencia, confianza: confianzaSug };
  }

  // -------------------------------------------------------------------------
  // UI: PANEL DE CONFIRMACION INTERACTIVO
  // -------------------------------------------------------------------------

  /**
   * Genera el HTML del Panel de Confirmacion Interactivo.
   *
   * Este panel muestra cada fila detectada por el OCR y permite al usuario:
   *   - check  Confirmar que el texto reconocido es correcto
   *   - lapiz  Corregir el texto (el sistema aprende la correccion para siempre)
   *   - Ver si se aplico una correccion automatica con la etiqueta [Auto]
   *
   * @param {Array} lineasDetectadas - Lista de filas detectadas por el OCR
   *   Cada elemento: { filaId, label, numeros, textoOcrOriginal, correccionAuto }
   *
   * @param {Function} onConfirmar  - Callback cuando el usuario confirma todo.
   *   Recibe: Array de { filaId, labelFinal, numeros }
   * @param {Function} onCorreccion - Callback cuando el usuario corrige una fila.
   *   Recibe: { filaId, textoAntes, textoDespues, idx }
   *
   * @returns {HTMLElement} El panel listo para insertar en el DOM
   */
  static crearPanelConfirmacion(lineasDetectadas, onConfirmar, onCorreccion) {
    const panel = document.createElement('div');
    panel.className = 'ocr-aprendizaje-panel';
    panel.id = 'panel-confirmacion-ocr';

    // Mostrar cuanto ha aprendido el sistema hasta ahora
    const total = this.contarAprendizajes();
    const totalBadge = total > 0
      ? '<span class="badge-aprendizaje">Cerebro: ' + total + ' correccion' + (total !== 1 ? 'es' : '') + ' aprendida' + (total !== 1 ? 's' : '') + '</span>'
      : '<span class="badge-aprendizaje nuevo">Primer uso - sin correcciones aun</span>';

    panel.innerHTML =
      '<div class="ocr-confirm-header">' +
        '<h4>Confirmar Reconocimiento de la Foto</h4>' +
        '<p class="ocr-confirm-subtitulo">' +
          'Revisa cada fila detectada. Si hay errores, corrigelos y el sistema ' +
          '<strong>aprendera automaticamente</strong> para mejorar la proxima vez.' +
        '</p>' +
        totalBadge +
      '</div>' +
      '<div class="ocr-confirm-lista" id="ocr-lista-confirmacion">' +
        (lineasDetectadas.length === 0
          ? '<p class="ocr-sin-datos">No se detectaron filas en la foto. Intenta con una imagen mas clara.</p>'
          : '') +
      '</div>' +
      '<div class="ocr-confirm-acciones">' +
        '<button id="ocr-btn-confirmar-todo" class="btn-ocr-confirmar">' +
          'Confirmar Todo y Aplicar al Formato' +
        '</button>' +
        '<p class="ocr-confirm-nota">' +
          'Cada correccion que hagas aqui mejora el reconocimiento futuro.' +
        '</p>' +
      '</div>';

    // Crear una tarjeta en el panel por cada linea que detecto el OCR
    const lista = panel.querySelector('#ocr-lista-confirmacion');

    lineasDetectadas.forEach((linea, idx) => {
      const item = document.createElement('div');
      item.className = 'ocr-confirm-item' + (linea.correccionAuto ? ' con-correccion-auto' : '');
      item.dataset.idx = idx;
      item.dataset.filaId = linea.filaId;

      // Construir resumen de valores numericos detectados
      const valoresStr = (linea.numeros || []).join(', ');

      // Etiqueta especial si se aplico una correccion automatica
      const autoTag = linea.correccionAuto
        ? '<span class="tag-auto" title="Se aplico una correccion aprendida automaticamente">Auto-corregido</span>'
        : '';

      // Sugerencia adicional si hay algo similar en el diccionario
      const { sugerencia } = this.buscarSugerencia(linea.textoOcrOriginal || linea.label);
      const hayOtraSugerencia = sugerencia && this.normalizar(sugerencia) !== this.normalizar(linea.label);
      const sugerenciaTag = hayOtraSugerencia
        ? '<span class="tag-sugerencia">Era: <strong>' + sugerencia + '</strong>?</span>'
        : '';

      item.innerHTML =
        '<div class="ocr-item-header">' +
          '<span class="ocr-item-numero">' + (idx + 1) + '</span>' +
          '<div class="ocr-item-info">' +
            '<div class="ocr-item-etiqueta" id="ocr-label-' + idx + '">' +
              '<span class="ocr-label-texto">' + linea.label + '</span>' +
              autoTag + sugerenciaTag +
            '</div>' +
            '<div class="ocr-item-valores">' +
              '<span class="ocr-valores-texto">Valores: ' + (valoresStr || '(ninguno detectado)') + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="ocr-item-controles">' +
            '<button class="btn-ocr-accion btn-confirmar-fila" data-idx="' + idx + '" title="El texto reconocido es correcto">Correcto</button>' +
            '<button class="btn-ocr-accion btn-corregir-fila" data-idx="' + idx + '" title="El nombre no es correcto, deseo corregirlo">Corregir</button>' +
          '</div>' +
        '</div>' +
        '<div class="ocr-correccion-panel d-none" id="ocr-correccion-' + idx + '">' +
          '<label class="ocr-correccion-label">Cual es el nombre correcto de esta fila?</label>' +
          '<input type="text" class="ocr-correccion-input" id="ocr-input-' + idx + '" value="' + linea.label.replace(/"/g, '&quot;') + '" placeholder="Escribe el nombre correcto aqui..." />' +
          '<div class="ocr-correccion-botones">' +
            '<button class="btn-ocr-guardar-correccion" data-idx="' + idx + '">Guardar y Aprender</button>' +
            '<button class="btn-ocr-cancelar-correccion" data-idx="' + idx + '">Cancelar</button>' +
          '</div>' +
        '</div>';

      lista.appendChild(item);
    });

    // -----------------------------------------------------------------------
    // ESTADO INTERNO: rastrea si cada fila fue confirmada y su texto final
    // -----------------------------------------------------------------------
    const estadoFilas = lineasDetectadas.map(l => ({
      filaId:           l.filaId,
      labelOriginalOcr: l.textoOcrOriginal || l.label,  // lo que el OCR vio crudo
      labelFinal:       l.label,                          // texto actual (puede ser corregido)
      numeros:          l.numeros || [],
      confirmada:       false,
      corregida:        false
    }));

    // -----------------------------------------------------------------------
    // EVENTOS: Boton "Correcto" por cada fila
    // -----------------------------------------------------------------------
    panel.querySelectorAll('.btn-confirmar-fila').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const item = panel.querySelector('.ocr-confirm-item[data-idx="' + idx + '"]');

        // Marcar visualmente como confirmado
        item.classList.add('confirmada');
        item.classList.remove('con-error');
        estadoFilas[idx].confirmada = true;

        // Informar al sistema que esta deteccion fue correcta (aumenta confianza futura)
        OcrAprendizaje.confirmarDeteccion(estadoFilas[idx].labelFinal);

        if (typeof DomHelpers !== 'undefined') {
          DomHelpers.mostrarToast('Confirmado: "' + estadoFilas[idx].labelFinal + '"', 'success');
        }
      });
    });

    // -----------------------------------------------------------------------
    // EVENTOS: Boton "Corregir" -> expandir el campo de texto
    // -----------------------------------------------------------------------
    panel.querySelectorAll('.btn-corregir-fila').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const panelCorr = panel.querySelector('#ocr-correccion-' + idx);
        // Alternar visibilidad del panel de correccion
        panelCorr.classList.toggle('d-none');
        panel.querySelector('#ocr-input-' + idx).focus();
      });
    });

    // -----------------------------------------------------------------------
    // EVENTOS: Boton "Guardar y Aprender"
    // *** AQUI OCURRE EL APRENDIZAJE REAL ***
    // El sistema guarda la asociacion: "textoOcr" -> "textoCorrecto"
    // La proxima vez que el OCR vea algo parecido, lo corregira automaticamente
    // -----------------------------------------------------------------------
    panel.querySelectorAll('.btn-ocr-guardar-correccion').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const input = panel.querySelector('#ocr-input-' + idx);
        const textoCorrecto = input.value.trim();

        if (!textoCorrecto) {
          if (typeof DomHelpers !== 'undefined') {
            DomHelpers.mostrarToast('Escribe el nombre correcto para que pueda aprenderlo.', 'error');
          }
          return;
        }

        const textoAntes = estadoFilas[idx].labelOriginalOcr;

        // *** GUARDAR LA CORRECCION EN EL DICCIONARIO PERSISTENTE ***
        OcrAprendizaje.aprenderCorreccion(textoAntes, textoCorrecto);

        // Actualizar el estado local de la fila
        estadoFilas[idx].labelFinal = textoCorrecto;
        estadoFilas[idx].confirmada = true;
        estadoFilas[idx].corregida  = true;

        // Actualizar visualmente la etiqueta con el texto corregido
        const labelTexto = panel.querySelector('#ocr-label-' + idx + ' .ocr-label-texto');
        if (labelTexto) {
          labelTexto.textContent = textoCorrecto;
          labelTexto.style.color = '#20c997';
          labelTexto.style.fontWeight = '600';
        }

        // Ocultar panel de correccion y marcar fila como corregida
        panel.querySelector('#ocr-correccion-' + idx).classList.add('d-none');
        panel.querySelector('.ocr-confirm-item[data-idx="' + idx + '"]').classList.add('corregida', 'confirmada');

        // Notificar al modulo padre sobre la correccion
        if (onCorreccion) {
          onCorreccion({ filaId: estadoFilas[idx].filaId, textoAntes, textoDespues: textoCorrecto, idx });
        }

        if (typeof DomHelpers !== 'undefined') {
          DomHelpers.mostrarToast('Aprendido! "' + textoAntes + '" -> "' + textoCorrecto + '"', 'success');
        }
      });
    });

    // -----------------------------------------------------------------------
    // EVENTOS: Boton "Cancelar" correccion
    // -----------------------------------------------------------------------
    panel.querySelectorAll('.btn-ocr-cancelar-correccion').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        panel.querySelector('#ocr-correccion-' + idx).classList.add('d-none');
      });
    });

    // -----------------------------------------------------------------------
    // EVENTOS: Boton "Confirmar Todo y Aplicar al Formato"
    // -----------------------------------------------------------------------
    panel.querySelector('#ocr-btn-confirmar-todo').addEventListener('click', () => {
      // Auto-confirmar las filas que el usuario no toco manualmente
      estadoFilas.forEach((ef, idx) => {
        if (!ef.confirmada) {
          OcrAprendizaje.confirmarDeteccion(ef.labelFinal);
          const item = panel.querySelector('.ocr-confirm-item[data-idx="' + idx + '"]');
          if (item) item.classList.add('confirmada');
        }
      });

      // Ejecutar el callback del padre con los datos finales confirmados/corregidos
      if (onConfirmar) {
        onConfirmar(estadoFilas);
      }
    });

    return panel;
  }

  // -------------------------------------------------------------------------
  // UTILIDADES PRIVADAS
  // -------------------------------------------------------------------------

  /**
   * Escapa caracteres especiales de una cadena para uso seguro en RegExp.
   * @param {string} str
   * @returns {string}
   */
  static _escaparRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
