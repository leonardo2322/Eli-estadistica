/**
 * =========================================================================
 * js/utils/ocr-scanner.js
 * -------------------------------------------------------------------------
 * Motor de Preprocesamiento de Imagen y Reconocimiento Óptico de Caracteres (OCR / IA).
 * 
 * RESPONSABILIDAD:
 *   - Preprocesar imágenes (contraste, escala de grises, binarización en Canvas).
 *   - Reconocer texto y números de planillas con Tesseract.js / IA.
 *   - Mapear nombres de exámenes y conteos por día (1-31) a la grilla de Formatos.
 * =========================================================================
 */

'use strict';

class OcrScanner {

  /**
   * Preprocesa una imagen recibida (File/Blob) en un Canvas HTML5
   * aplicando escala de grises y contraste para mejorar la precisión del OCR.
   * @param {File|Blob|string} imageSource
   * @returns {Promise<string>} Data URL de la imagen optimizada
   */
  static preprocesarImagen(imageSource) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;

        // Escala de grises + Aumento de contraste (Binarización suave)
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          // Luminancia estándar
          let v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          // Estirar contraste
          v = (v - 128) * 1.4 + 128;
          v = Math.min(255, Math.max(0, v));

          d[i] = d[i + 1] = d[i + 2] = v;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = (err) => reject(err);

      if (typeof imageSource === 'string') {
        img.src = imageSource;
      } else {
        const reader = new FileReader();
        reader.onload = e => { img.src = e.target.result; };
        reader.onerror = err => reject(err);
        reader.readAsDataURL(imageSource);
      }
    });
  }

  /**
   * Procesa la foto mediante Tesseract.js (si está cargado) o extracción heurística.
   * @param {File|Blob|string} imageFile
   * @param {Array} filasDisponibles – Filas [{ id, label }] del formato actual
   * @param {number} diasEnMes – Cantidad de días en el mes actual (ej. 30 o 31)
   * @param {Function} onProgress – Callback de estado (porcentaje 0 a 100)
   * @returns {Promise<{ datos: object, resumenLineas: Array }>}
   */
  static async escanearFotoFormatos(imageFile, filasDisponibles, diasEnMes, onProgress) {
    let imagenOptimizada;
    try {
      if (onProgress) onProgress({ status: 'preprocesando', progress: 0.1, msg: 'Mejorando contraste de la foto...' });
      imagenOptimizada = await this.preprocesarImagen(imageFile);
    } catch (e) {
      imagenOptimizada = imageFile;
    }

    if (typeof Tesseract === 'undefined') {
      throw new Error('Tesseract.js no está cargado. Verifique la conexión a internet o el script CDN.');
    }

    if (onProgress) onProgress({ status: 'iniciando_ocr', progress: 0.2, msg: 'Analizando texto con Inteligencia Artificial...' });

    const worker = await Tesseract.createWorker('spa+eng', 1, {
      logger: m => {
        if (onProgress && m.status === 'recognizing text') {
          const pct = 0.2 + (m.progress * 0.7);
          onProgress({ status: 'ocr', progress: pct, msg: `Reconociendo imagen: ${Math.round(m.progress * 100)}%` });
        }
      }
    });

    const result = await worker.recognize(imagenOptimizada);
    await worker.terminate();

    if (onProgress) onProgress({ status: 'procesando_datos', progress: 0.95, msg: 'Mapeando conteos detectados...' });

    const text = result.data.text || '';
    const lineas = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const datosExtraidos = {};
    const resumenLineas = [];

    const norm = str => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    lineas.forEach(linea => {
      // ------------------------------------------------------------------
      // PASO 1: Aplicar correcciones aprendidas antes de intentar mapear.
      // Si el sistema aprendió que "Hemoglobyina" -> "Hemoglobina", lo
      // corregirá automáticamente aquí antes de buscar coincidencias.
      // ------------------------------------------------------------------
      let lineaParaMapeo = linea;
      let correccionAuto  = false;
      let textoOcrOriginal = linea;

      if (typeof OcrAprendizaje !== 'undefined') {
        const resultado = OcrAprendizaje.aplicarCorreccionesAprendidas(linea);
        if (resultado.correccionAplicada) {
          lineaParaMapeo = resultado.textoCorrecto;
          correccionAuto  = true;
          // textoOcrOriginal conserva siempre lo que leyó el OCR en crudo
        }
      }

      const lineaNorm = norm(lineaParaMapeo);

      // Extraer todos los números positivos presentes en la línea
      const numeros = (lineaParaMapeo.match(/\b\d+\b/g) || []).map(n => parseInt(n, 10)).filter(n => n >= 0 && n <= 9999);

      if (!numeros.length) return;

      // ------------------------------------------------------------------
      // PASO 2: Mapear la línea (ya corregida) con las filas del formato.
      // Se usa comparación de palabras clave + similitud Levenshtein si
      // OcrAprendizaje está disponible para mejorar el match.
      // ------------------------------------------------------------------
      let mejorFila = null;
      let mejorPuntaje = 0;

      (filasDisponibles || []).forEach(f => {
        const fLabel = norm(f.label);
        const palabrasLabel = fLabel.split(/\s+/).filter(w => w.length > 3);
        let coincidencias = 0;
        palabrasLabel.forEach(w => {
          if (lineaNorm.includes(w)) coincidencias++;
        });

        // Bonus de similitud global con Levenshtein si el módulo está cargado
        let bonusSimilitud = 0;
        if (typeof OcrAprendizaje !== 'undefined') {
          const sim = OcrAprendizaje.calcularSimilitud(lineaNorm, fLabel);
          if (sim > 0.65) bonusSimilitud = sim;
        }

        const puntajeTotal = coincidencias + bonusSimilitud;
        if (puntajeTotal > mejorPuntaje) {
          mejorPuntaje = puntajeTotal;
          mejorFila = f;
        }
      });

      if (mejorFila && mejorPuntaje > 0) {
        if (!datosExtraidos[mejorFila.id]) datosExtraidos[mejorFila.id] = {};
        // Asignar los números leídos a días correlativos
        numeros.forEach((num, idx) => {
          const dia = idx + 1;
          if (dia <= diasEnMes) {
            datosExtraidos[mejorFila.id][dia] = num;
          }
        });

        // Incluir textoOcrOriginal y correccionAuto para que el panel
        // de confirmación pueda mostrar si se aplicó una corrección automática
        resumenLineas.push({
          filaId:          mejorFila.id,
          label:           mejorFila.label,
          numeros:         numeros.slice(0, diasEnMes),
          textoOcrOriginal: textoOcrOriginal,  // lo que el OCR leyó antes de corregir
          correccionAuto:  correccionAuto       // true si se aplicó una corrección aprendida
        });
      }
    });

    if (onProgress) onProgress({ status: 'completado', progress: 1.0, msg: '¡Foto procesada con éxito!' });

    return {
      datos: datosExtraidos,
      resumenLineas,
      rawText: text
    };
  }
}
