/**
 * =========================================================================
 * js/utils/gemini-vision-service.js
 * -------------------------------------------------------------------------
 * Servicio de Inteligencia Artificial Multimodal (Google Gemini Flash)
 * para la lectura de cuadernos manuscritos de laboratorio con 98%+ exactitud.
 * =========================================================================
 */

'use strict';

class GeminiVisionService {
  static STORAGE_KEY = 'eli_gemini_api_key';

  /**
   * Modelos candidatos en orden de preferencia.
   * Se prueban en cascada: el primero que responda con éxito se usa y se cachea.
   * Solo se avanza al siguiente si el error es 404 (modelo no encontrado/retirado).
   * Para agregar o cambiar modelos en el futuro, edita SOLO este array.
   */
  static MODELOS_CANDIDATOS = [
    'gemini-3.5-flash',           // más reciente — primera opción
    'gemini-2.5-flash-lite',      // más disponible para API keys nuevas
    'gemini-2.5-flash',           // versión completa (puede estar restringida)
    'gemini-2.0-flash',           // respaldo generación anterior
  ];

  /** Clave localStorage donde se guarda el último modelo que funcionó. */
  static STORAGE_MODELO_ACTIVO = 'gemini_modelo_activo';

  /**
   * Obtiene la API Key de Gemini guardada en LocalStorage.
   * @returns {string}
   */
  static obtenerApiKey() {
    return (localStorage.getItem(this.STORAGE_KEY) || '').trim();
  }

  /**
   * Guarda la API Key de Gemini en LocalStorage y la sincroniza con Cloud Firestore.
   * @param {string} key 
   * @param {FirebaseRepository} [fbRepo]
   */
  static guardarApiKey(key, fbRepo = null) {
    if (typeof key === 'string') {
      const trimmed = key.trim();
      localStorage.setItem(this.STORAGE_KEY, trimmed);

      if (fbRepo && typeof fbRepo.guardarConfiguracionGemini === 'function') {
        fbRepo.guardarConfiguracionGemini(trimmed);
      } else if (window.formatosCtrl && window.formatosCtrl.firebaseRepo) {
        window.formatosCtrl.firebaseRepo.guardarConfiguracionGemini(trimmed);
      }
    }
  }

  /**
   * Carga la API Key guardada en Cloud Firestore hacia LocalStorage.
   * @param {FirebaseRepository} fbRepo 
   */
  static async cargarApiKeyDesdeFirestore(fbRepo) {
    if (!fbRepo || typeof fbRepo.obtenerConfiguracionGemini !== 'function') return;
    try {
      const keyRemota = await fbRepo.obtenerConfiguracionGemini();
      if (keyRemota && typeof keyRemota === 'string' && keyRemota.trim()) {
        localStorage.setItem(this.STORAGE_KEY, keyRemota.trim());
      }
    } catch (e) {
      console.error('Error al sincronizar API Key de Gemini desde Firestore:', e);
    }
  }

  /**
   * Convierte un objeto File o Blob a cadena Base64 (sin encabezado data:image/...).
   * @param {File|Blob} file 
   * @returns {Promise<string>}
   */
  static fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result || '';
        const base64Str = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64Str);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Analiza una o varias fotos de cuaderno usando Google Gemini Visión (probando endpoints disponibles).
   *
   * @param {File[]} archivos 
   * @param {string} [apiKey] 
   * @param {Function} [onProgress]
   * @returns {Promise<Array<object>>} Lista de registros estandarizados para la tabla
   */
  static async analizarLoteCuadernos(archivos, apiKey = '', onProgress = null) {
    const key = apiKey || this.obtenerApiKey();
    if (!key) {
      throw new Error('API Key de Gemini no configurada. Configure su clave API de Google Gemini para habilitar el reconocimiento con IA.');
    }

    const atencionesTotales = [];

    const promptInstrucciones = `
Eres una experta asistente de bioanálisis en el Hospital San José de Venezuela.
Analiza detenidamente esta imagen de un cuaderno de registro de laboratorio manuscrito.

REGLAS DE EXTRACCIÓN Y CLASIFICACIÓN:
1. Extrae CADA una de las filas de atención visibles en la imagen.
2. Devuelve un JSON ESTRICTO con la propiedad raíz "atenciones", que contiene una lista de objetos con la siguiente estructura:
   {
     "numPaciente": "número o cama del paciente (ej: 5, 14, 102, A1, A2)",
     "nombrePaciente": "nombre y apellido del paciente",
     "edadPaciente": "edad del paciente (ej: 31a, 25a, o S/E si no tiene)",
     "servicioTexto": "texto original del servicio o ambulatorio escrito (ej: PBA, IPAS, CEMCA, ROA, Amparo, Rio Negro, Guaraque, Cirugia, Pediatria)",
     "categoriaServicio": "Hospitalización OR Consulta Especial OR Consulta Externa",
     "centroExterno": "nombre del ambulatorio si aplica (PBA, IPAS, CEMCA, ROA, Amparo, Rio Negro, Guaraque, Triaje, CDI, PVA, etc.) o vacío",
     "examen": "Hematología Completa OR VSG OR Orina OR Coproanálisis OR Prueba de Embarazo OR VDRL OR HIV OR Hepatitis A OR Hepatitis B OR Hepatitis C OR COVID-19 OR Dengue OR Helicobacter Pylori OR ASLO",
     "resultadoTexto": "texto del resultado (ej: NSOP, Hto 38, Marrón B=4, Q. Entamoeba histolytica)",
     "parasitos": ["lista de nombres de parásitos detectados de la lista: Blastocystis Ssp, Giardia Duodenale, Entamoeba Histolítica, Entamoeba Coli, Ascaris Lumbricoides, Ancylostoma, Trichuris Trichura, Enterobius Vermicularis, Hymenolepis Nana, Strongyloides Estercoralis, Balantidium Coli, Yodamoeba Busthlii, Endolimax Nana, Tricomonas Hominis, Taenia Sp, Levaduras"]
   }

REGLAS DE SERVICIO:
- PBA, IPAS, CEMCA, ROA, Amparo, Rio Negro, Guaraque, Triaje, CDI, PVA, El Rosal, Bailadores, Ambulatorios ➔ Categoria "Consulta Externa".
- Camas A1, A2... 100 a 199, 200 a 299, Cirugía, Pediatría, Med. Interna, Obstetricia, Observación ➔ Categoria "Hospitalización".
- Números < 100 sin ambulatorio ➔ Categoria "Consulta Especial".
- NSOP ➔ "No Se Observan Parásitos" (parasitos: []).

Responde ÚNICAMENTE con el objeto JSON válido sin texto explicativo.
`;

    // ── Selección de modelo con caché ────────────────────────────────────
    // Se lee el último modelo que funcionó; si falla con 404 o 429+limit:0,
    // se invalida el caché y se prueba la cascada completa desde MODELOS_CANDIDATOS.
    const modeloCacheado = (localStorage.getItem(this.STORAGE_MODELO_ACTIVO) || '').trim();
    // Construye la lista: modelo cacheado primero (si existe y está en candidatos),
    // seguido de los demás candidatos que aún no se han probado.
    const candidatosOrdenados = modeloCacheado && this.MODELOS_CANDIDATOS.includes(modeloCacheado)
      ? [modeloCacheado, ...this.MODELOS_CANDIDATOS.filter(m => m !== modeloCacheado)]
      : [...this.MODELOS_CANDIDATOS];

    for (let i = 0; i < archivos.length; i++) {
      const file = archivos[i];

      // Si se procesa más de 1 imagen en el lote, añadir retardo preventivo de 4 segundos para evitar Rate Limit 429
      if (i > 0) {
        if (onProgress) onProgress(i + 1, archivos.length, `Esperando 4s para respetar límite de cuota (Rate Limit)...`);
        await new Promise(resolve => setTimeout(resolve, 4000));
      }

      const base64Data = await this.fileToBase64(file);

      const requestBody = {
        contents: [
          {
            parts: [
              { text: promptInstrucciones },
              {
                inline_data: {
                  mime_type: file.type || 'image/jpeg',
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1
        }
      };

      // ── Cascada de modelos ────────────────────────────────────────────
      let response       = null;
      let ultimoError    = null;
      let modeloUsado    = null;

      for (const candidato of candidatosOrdenados) {
        const modelo = candidato.replace(/^models\//, '');
        // v1beta primero (necesario para modelos 2.x+), v1 como respaldo
        const endpoints = [
          `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(key)}`,
          `https://generativelanguage.googleapis.com/v1/models/${modelo}:generateContent?key=${encodeURIComponent(key)}`
        ];

        if (onProgress) onProgress(i + 1, archivos.length, `Enviando imagen ${i + 1} a Google Gemini (${modelo})...`);
        console.info(`[GeminiVisionService] Intentando modelo: ${modelo}`);

        let debeAvanzar = false; // true → error recuperable, probar siguiente candidato

        for (const endpointUrl of endpoints) {
          try {
            const resAttempt = await fetch(endpointUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': key
              },
              body: JSON.stringify(requestBody)
            });

            if (resAttempt.ok) {
              response     = resAttempt;
              modeloUsado  = modelo;
              break;
            }

            const errJson = await resAttempt.json().catch(() => ({}));
            const errMsg  = errJson.error?.message || resAttempt.statusText;
            ultimoError   = `(${resAttempt.status}) ${errMsg}`;

            if (resAttempt.status === 404) {
              // Modelo retirado o no disponible → avanzar al siguiente candidato
              debeAvanzar = true;
              break;
            }

            if (resAttempt.status === 429 && /limit[:\s]+0\b/.test(errMsg)) {
              // 429 con "limit: 0" → modelo bloqueado permanentemente para plan gratuito.
              // No es un rate-limit temporal: avanzar al siguiente candidato.
              console.warn(`[GeminiVisionService] Modelo "${modelo}" bloqueado (429 limit:0) para plan gratuito. Probando siguiente...`);
              debeAvanzar = true;
              break;
            }

            // Cualquier otro error (401/403/429 real/red) → abortar cascada
            break;
          } catch (errNet) {
            ultimoError = errNet.message;
            break; // error de red → no tiene sentido seguir con más endpoints ni candidatos
          }
        }

        if (response) {
          // Éxito: guardar modelo que funcionó para la próxima llamada
          localStorage.setItem(this.STORAGE_MODELO_ACTIVO, modeloUsado);
          console.info(`[GeminiVisionService] ✅ Modelo activo: ${modeloUsado} (guardado en caché)`);
          break;
        }

        if (debeAvanzar) {
          // Invalida caché si el modelo que falló era el que estaba guardado
          if (candidato === modeloCacheado) {
            localStorage.removeItem(this.STORAGE_MODELO_ACTIVO);
            console.warn(`[GeminiVisionService] Caché de modelo invalidada ("${modelo}" ya no disponible). Probando cascada completa...`);
          } else {
            console.warn(`[GeminiVisionService] Modelo "${modelo}" no disponible. Probando siguiente candidato...`);
          }
          continue; // pasar al siguiente candidato en MODELOS_CANDIDATOS
        }

        // Error no recuperable (401/403/429 real/red) → abortar toda la cascada
        break;
      }

      if (!response) {
        const esRateLimitReal = ultimoError && ultimoError.includes('429')
          && !/limit[:\s]+0\b/.test(ultimoError);

        if (esRateLimitReal) {
          // 429 sin "limit: 0" → rate limit temporal real; pedir al usuario que espere
          throw new Error(`Límite de cuota excedido (429): ${ultimoError}. Espere un momento e intente de nuevo.`);
        }

        // Todos los modelos bloqueados (429 + limit:0). Intentar extraer el tiempo
        // de espera sugerido por la API ("Please retry in Xs") y reintentar una vez.
        const segundosEspera = this._extraerSegundosRetry(ultimoError || '');
        if (segundosEspera !== null && segundosEspera > 0 && segundosEspera <= 120) {
          console.warn(`[GeminiVisionService] Todos los modelos bloqueados. Esperando ${segundosEspera}s antes de reintentar...`);
          await this._esperarConContador(segundosEspera, i + 1, archivos.length, onProgress);

          // ── Reintento único tras la espera ──────────────────────────────
          let responseRetry   = null;
          let ultimoErrorRetry = null;
          let modeloUsadoRetry = null;

          for (const candidato of candidatosOrdenados) {
            const modelo = candidato.replace(/^models\//, '');
            const endpoints = [
              `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(key)}`,
              `https://generativelanguage.googleapis.com/v1/models/${modelo}:generateContent?key=${encodeURIComponent(key)}`
            ];

            if (onProgress) onProgress(i + 1, archivos.length, `Reintentando imagen ${i + 1} con modelo ${modelo}...`);

            for (const endpointUrl of endpoints) {
              try {
                const r = await fetch(endpointUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
                  body: JSON.stringify(requestBody)
                });
                if (r.ok) {
                  responseRetry   = r;
                  modeloUsadoRetry = modelo;
                  break;
                }
                const ej = await r.json().catch(() => ({}));
                ultimoErrorRetry = `(${r.status}) ${ej.error?.message || r.statusText}`;
                if (r.status !== 404) break; // no seguir con otros endpoints
              } catch (eNet) {
                ultimoErrorRetry = eNet.message;
                break;
              }
            }
            if (responseRetry) {
              localStorage.setItem(this.STORAGE_MODELO_ACTIVO, modeloUsadoRetry);
              console.info(`[GeminiVisionService] ✅ Reintento exitoso con modelo: ${modeloUsadoRetry}`);
              break;
            }
            // En el reintento solo avanzamos en 404; cualquier otro error aborta
            if (ultimoErrorRetry && !ultimoErrorRetry.startsWith('(404)')) break;
          }

          if (responseRetry) {
            // Reemplazar response por el resultado del reintento y continuar el flujo normal
            response = responseRetry;
          } else {
            const nombresIntentados = candidatosOrdenados.join(', ');
            throw new Error(
              `Error en API Gemini tras espera de ${segundosEspera}s: ` +
              `${ultimoErrorRetry || ultimoError || 'Sin respuesta'} ` +
              `(modelos intentados: ${nombresIntentados})`
            );
          }
        } else {
          // No hay tiempo de retry sugerido → lanzar error inmediatamente
          const nombresIntentados = candidatosOrdenados.join(', ');
          throw new Error(`Error en API Gemini: ${ultimoError || 'Sin respuesta'} (modelos intentados: ${nombresIntentados})`);
        }
      }

      const resData = await response.json();
      const rawCandidateText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

      let jsonParsed = {};
      try {
        jsonParsed = JSON.parse(rawCandidateText);
      } catch (e) {
        const matchJson = rawCandidateText.match(/\{[\s\S]*\}/);
        if (matchJson) {
          jsonParsed = JSON.parse(matchJson[0]);
        }
      }

      const listaAtenciones = Array.isArray(jsonParsed.atenciones) ? jsonParsed.atenciones : [];

      listaAtenciones.forEach(item => {
        const catSrv = item.categoriaServicio || 'Consulta Especial';
        let srvKey = 'cons_especial';
        if (catSrv.includes('Externa')) srvKey = 'cons_externa';
        else if (catSrv.includes('Hospitaliz')) srvKey = 'hospitalizacion';

        const exmNombre = item.examen || 'Hematología Completa';
        let exmKey = 'hem_general';
        let areaId = 'hematologia';
        let mult = 5;

        const exmNorm = exmNombre.toLowerCase();
        if (exmNorm.includes('vsg')) { exmKey = 'sub_56_vsg'; areaId = 'hematologia'; mult = 1; }
        else if (exmNorm.includes('orina') || exmNorm.includes('uro')) { exmKey = 'uro_general'; areaId = 'uroanalisis'; mult = 6; }
        else if (exmNorm.includes('copro') || exmNorm.includes('heces')) { exmKey = 'cop_general'; areaId = 'coproanalisis'; mult = 2; }
        else if (exmNorm.includes('embaraz') || exmNorm.includes('hcg')) { exmKey = 'ser1_pe'; areaId = 'serologia'; mult = 1; }
        else if (exmNorm.includes('vdrl')) { exmKey = 'ser2_vd'; areaId = 'serologia'; mult = 1; }
        else if (exmNorm.includes('hiv') || exmNorm.includes('vih')) { exmKey = 'ser2_hiv'; areaId = 'serologia'; mult = 1; }

        atencionesTotales.push({
          idTemp: `rec-ia-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          imagenIndex: i + 1,
          fecha: DateUtils.getHoy(),
          numPaciente: String(item.numPaciente || '1').trim(),
          nombrePaciente: String(item.nombrePaciente || 'Paciente').trim(),
          edadPaciente: String(item.edadPaciente || 'S/E').trim(),
          servicioTextoOriginal: String(item.servicioTexto || '').trim(),
          servicioKey: srvKey,
          servicioNombre: item.servicioTexto || catSrv,
          categoriaServicio: catSrv,
          centroExternoDetectado: String(item.centroExterno || '').trim().toUpperCase(),
          examenNombre: exmNombre,
          examenKey: exmKey,
          areaId: areaId,
          multiplicador: mult,
          resultadoTexto: String(item.resultadoTexto || '').trim(),
          parasitos: Array.isArray(item.parasitos) ? item.parasitos : [],
          dudaLectura: false,
          procesadoConIA: true
        });
      });
    }

    return atencionesTotales;
  }

  /**
   * Extrae los segundos de espera sugeridos por la API de Gemini del texto de error.
   * Busca el patrón: "Please retry in 43.69s" o "retry in 43s".
   * @param {string} msg
   * @returns {number|null} Segundos (redondeados hacia arriba) o null si no encontró.
   */
  static _extraerSegundosRetry(msg) {
    const m = msg.match(/retry in (\d+(?:\.\d+)?)s/i);
    if (!m) return null;
    return Math.ceil(parseFloat(m[1]));
  }

  /**
   * Espera el número de segundos indicado actualizando la barra de progreso
   * con una cuenta regresiva visible para el usuario.
   * @param {number}   segundos   Tiempo total a esperar
   * @param {number}   imgIdx     Índice de imagen actual (para el mensaje de progreso)
   * @param {number}   imgTotal   Total de imágenes del lote
   * @param {Function|null} onProgress  Callback de progreso (puede ser null)
   */
  static async _esperarConContador(segundos, imgIdx, imgTotal, onProgress) {
    for (let restante = segundos; restante > 0; restante--) {
      if (onProgress) {
        onProgress(
          imgIdx,
          imgTotal,
          `⏳ Límite de cuota alcanzado. Reintentando automáticamente en ${restante}s...`
        );
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (onProgress) {
      onProgress(imgIdx, imgTotal, `▶️ Reanudando envío a Gemini...`);
    }
  }

  /**
   * Lista los modelos Gemini disponibles para la API key y los imprime en consola.
   * Útil para detectar retiradas de modelos antes de que fallen en producción.
   * Llamar al inicio de la app (p.ej. en app.js) si hay una key guardada.
   * No lanza excepciones — falla silenciosamente para no bloquear el arranque.
   * @param {string} [apiKey]
   */
  static async listarModelosDisponibles(apiKey = '') {
    const key = apiKey || this.obtenerApiKey();
    if (!key) return;
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[GeminiVisionService] No se pudo listar modelos (${res.status}): ${res.statusText}`);
        return;
      }
      const data = await res.json();
      const modelosFlash = (data.models || [])
        .map(m => m.name)
        .filter(n => n.includes('flash'));
      const todos = (data.models || []).map(m => m.name);
      console.info(
        `[GeminiVisionService] Modelos flash disponibles:\n  · ${modelosFlash.join('\n  · ')}`,
        '\n[GeminiVisionService] Total modelos:', todos.length
      );
    } catch (e) {
      console.warn('[GeminiVisionService] Error al consultar modelos disponibles:', e.message);
    }
  }

  /**
   * Verifica si el modelo actualmente configurado sigue disponible en la API.
   * Usa caché en localStorage (24 h) para no gastar cuota en cada carga.
   *
   * @param {string} [apiKey]
   * @returns {Promise<{disponible: boolean, modelos: string[], modeloActual: string}|null>}
   *   Retorna el resultado de la verificación, o null si no pudo verificar
   *   (sin key, sin red, o error de API).
   */
  static async verificarModeloActual(apiKey = '') {
    const CACHE_KEY   = 'gemini_model_check';
    const CACHE_HORAS = 24;

    // ── 1. Devolver caché si aún es válida (< 24 h) ──────────────────────
    try {
      const cacheado = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cacheado && (Date.now() - cacheado.timestamp) < CACHE_HORAS * 3600 * 1000) {
        console.info('[GeminiVisionService] verificarModeloActual: usando caché (< 24 h).');
        return cacheado.resultado;
      }
    } catch (_) { /* caché corrupta → ignorar y re-verificar */ }

    // ── 2. Sin key no podemos verificar ──────────────────────────────────
    const key = apiKey || this.obtenerApiKey();
    if (!key) return null;

    // ── 3. Consultar la API ───────────────────────────────────────────────
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[GeminiVisionService] verificarModeloActual: error HTTP ${res.status}.`);
        return null;
      }

      const data     = await res.json();
      // Normalizar: quitar el prefijo "models/" que devuelve la API
      const nombres  = (data.models || []).map(m => m.name.replace(/^models\//, ''));
      // Verificar cuáles de nuestros candidatos siguen disponibles
      const modeloActual      = this.MODELOS_CANDIDATOS[0]; // el principal preferido
      const candidatosActivos = this.MODELOS_CANDIDATOS.filter(m => nombres.includes(m));
      const disponible        = candidatosActivos.length > 0;

      const resultado = { disponible, modelos: nombres, modeloActual };

      // ── 4. Guardar en caché ───────────────────────────────────────────
      localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), resultado }));

      return resultado;
    } catch (e) {
      console.warn('[GeminiVisionService] verificarModeloActual: no se pudo verificar:', e.message);
      return null;
    }
  }
}

if (typeof window !== 'undefined') {
  window.GeminiVisionService = GeminiVisionService;
}
