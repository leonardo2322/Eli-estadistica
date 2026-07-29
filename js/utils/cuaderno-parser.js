/**
 * =========================================================================
 * js/utils/cuaderno-parser.js
 * -------------------------------------------------------------------------
 * Motor Inteligente de Análisis y Reconocimiento de Cuadernos de Bioanálisis.
 *
 * RESPONSABILIDAD:
 *   - Parsear lotes de imágenes/textos de cuadernos escritos a mano.
 *   - Mantener la continuidad de fecha a lo largo de imágenes consecutivas.
 *   - Clasificar servicios:
 *       * Hospitalización: Paciente # >= 100 o prefijos A1, A2... (Pediatría, Cirugía, Obs, etc.)
 *       * Consulta Especial: Paciente # < 100 (1..99)
 *       * Consulta Externa / Ambulatorios: PBA, IPAS, CEMCA, ROA, Triaje, CDI, etc.
 *   - Aprendizaje de nuevos nombres de centros externos (CEMCA, ROA, etc.).
 *   - Reglas de multiplicación por área:
 *       * Hematología: ×5 (salvo VSG/VCG = ×1; Frotis/Gota Gruesa omitidos de ×5)
 *       * Uroanálisis (Orina): ×6
 *       * Coproanálisis (Heces): ×2 + Extracción de Parásitos individuales
 *       * Serología: ×1 (HCG Embarazo, VDRL, HIV, Hepatitis, etc.)
 *   - Soportar múltiples exámenes/áreas en una misma atención o página.
 *   - Agrupar por (fecha, servicioId, examenId) para su inserción en LocalStorage.
 * =========================================================================
 */

'use strict';

class CuadernoParser {

  static STORAGE_KEY_EXTERNOS = 'eli_nombres_externos_aprendidos';

  /**
   * Obtiene la lista de nombres/abreviaturas de centros de consulta externa
   * (incluye predeterminados + los aprendidos dinámicamente en LocalStorage y Firestore).
   * @returns {string[]}
   */
  static obtenerCentrosExternos() {
    const predeterminados = [
      'ipas', 'ipasme', 'pba', 'plan barrio adentro', 'barrio adentro',
      'cemca', 'roa', 'amparo', 'rio negro', 'guaraque', 'triaje', 'cdi', 'pva',
      'ambulatorio', 'la playa', 'el amparo', 'las acacias', 'el rosal', 'bailadores',
      'privado', 'externa', 'cons externa', 'consulta externa'
    ];

    try {
      const aprendidos = JSON.parse(localStorage.getItem(this.STORAGE_KEY_EXTERNOS)) || [];
      const combinados = new Set([...predeterminados, ...aprendidos.map(s => s.toLowerCase().trim())]);
      return Array.from(combinados);
    } catch (e) {
      return predeterminados;
    }
  }

  /**
   * Registra un nuevo nombre/abreviatura de centro externo para que el algoritmo aprenda.
   * Guarda en LocalStorage y lo sincroniza a Cloud Firestore.
   * @param {string} nombre 
   * @param {FirebaseRepository} [fbRepo]
   */
  static aprenderCentroExterno(nombre, fbRepo) {
    if (!nombre || typeof nombre !== 'string') return;
    const norm = nombre.toLowerCase().trim();
    if (!norm) return;

    try {
      const aprendidos = JSON.parse(localStorage.getItem(this.STORAGE_KEY_EXTERNOS)) || [];
      if (!aprendidos.map(s => s.toLowerCase().trim()).includes(norm)) {
        aprendidos.push(norm);
        localStorage.setItem(this.STORAGE_KEY_EXTERNOS, JSON.stringify(aprendidos));

        // Sincronizar también a Cloud Firestore para no perder los datos aprendidos
        if (fbRepo && typeof fbRepo.guardarCentrosExternos === 'function') {
          fbRepo.guardarCentrosExternos(aprendidos);
        }
      }
    } catch (e) {
      console.error('Error al guardar centro externo aprendido:', e);
    }
  }

  /**
   * Carga y sincroniza los centros externos guardados en Cloud Firestore hacia LocalStorage.
   * @param {FirebaseRepository} fbRepo 
   */
  static async cargarCentrosDesdeFirestore(fbRepo) {
    if (!fbRepo || typeof fbRepo.obtenerCentrosExternos !== 'function') return;
    try {
      const remotos = await fbRepo.obtenerCentrosExternos();
      if (Array.isArray(remotos) && remotos.length) {
        const locales = JSON.parse(localStorage.getItem(this.STORAGE_KEY_EXTERNOS)) || [];
        const conjunto = new Set([...locales, ...remotos.map(s => s.toLowerCase().trim())]);
        const finalArr = Array.from(conjunto);
        localStorage.setItem(this.STORAGE_KEY_EXTERNOS, JSON.stringify(finalArr));
      }
    } catch (e) {
      console.error('Error al sincronizar centros externos desde Firestore:', e);
    }
  }

  /**
   * Intenta extraer una fecha válida de una línea de texto.
   * Format: "Jueves 18-06-2026", "Viernes 19/06/2026", "18/06/2026"
   * @param {string} texto 
   * @returns {string|null} Fecha 'YYYY-MM-DD' o null
   */
  static extraerFecha(texto) {
    if (!texto) return null;

    // Buscar patrones de fecha dd/mm/yyyy o dd-mm-yyyy
    const match = texto.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
    if (match) {
      let dia = parseInt(match[1], 10);
      let mes = parseInt(match[2], 10);
      let ano = parseInt(match[3], 10);
      if (ano < 100) ano += 2000;

      if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
        const dStr = dia.toString().padStart(2, '0');
        const mStr = mes.toString().padStart(2, '0');
        return `${ano}-${mStr}-${dStr}`;
      }
    }
    return null;
  }

  /**
   * Normaliza y limpia artefactos frecuentes de lectura OCR en el nombre y edad del paciente.
   * "Esopo", "[Esopo", "Eu", "S/E", "ENE" son limpiados o marcados para confirmación visual.
   * @param {string} texto 
   * @returns {{ textoLimpio: string, dudaLectura: boolean }}
   */
  static limpiarNombreEdadOcr(texto) {
    if (!texto) return { textoLimpio: 'S/E', dudaLectura: false };
    let t = texto.trim();
    let dudaLectura = false;

    if (/\[?esopo?\]?|\bnsop\b/gi.test(t)) {
      dudaLectura = true;
      t = t.replace(/\[?esopo?\]?|\bnsop\b/gi, '').trim();
    }

    t = t.replace(/\bene\b|\bs\.?e\b|\bsin\s*edad\b/gi, 'S/E').trim();

    return {
      textoLimpio: t || 'S/E',
      dudaLectura
    };
  }

  /**
   * Clasifica el servicio de atención basándose en el número del paciente y el texto del servicio.
   *
   * REGLAS ACTUALIZADAS DE LA LICENCIADA:
   * 1. Hospitalización:
   *    - Pacientes con prefijos de cama/letra (A1, A2, A3...).
   *    - Números en la serie 100 (100, 101, 102...).
   *    - Números en la serie 200 (200, 201, 202...).
   *    * (Se quitan 300 y 400 de hospitalización).
   * 2. Consulta Especial:
   *    - Pacientes con números < 100 (1..99) o números fuera de las series de cama (salvo ambulatorios).
   * 3. Consulta Externa / Ambulatorios:
   *    - Nombres o abreviaturas como PBA, IPAS, CEMCA, ROA, Amparo, Río Negro, Guaraque, Triaje, CDI, PVA, etc.
   * 4. Observación (OBS, OBSER, O,B,S) -> Hospitalización (Observación).
   *
   * @param {string|number} numPaciente 
   * @param {string} textoServicio 
   * @returns {{ servicioKey: string, servicioNombre: string, Categoria: string }}
   */
  static clasificarServicio(numPaciente, textoServicio) {
    const textNorm = (textoServicio || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const centrosExternos = this.obtenerCentrosExternos();

    // 1. Verificar si coincide explícitamente con centros de Consulta Externa / Ambulatorios
    const centroEncontrado = centrosExternos.find(centro => textNorm.includes(centro));
    if (centroEncontrado) {
      return {
        servicioKey: 'cons_externa',
        servicioNombre: 'Consulta Externa',
        Categoria: 'Consulta Externa',
        centroExternoDetectado: centroEncontrado.toUpperCase()
      };
    }

    // Auto-aprendizaje: si el texto tiene formato de ambulatorio o nombre de centro desconocido (ej. "Ambulatorio Guaraque"), aprenderlo
    const matchAmbulatorio = textNorm.match(/(?:ambulatorio|sector|barrio|poblado|comunidad)\s+([a-z0-9]+)/);
    if (matchAmbulatorio && matchAmbulatorio[1]) {
      this.aprenderCentroExterno(matchAmbulatorio[1]);
      return {
        servicioKey: 'cons_externa',
        servicioNombre: 'Consulta Externa',
        Categoria: 'Consulta Externa',
        centroExternoDetectado: matchAmbulatorio[1].toUpperCase()
      };
    }

    // 2. Verificar Observación (Pertenece a Hospitalización)
    if (/obser|obs\b|\bo\s*b\s*s\b/.test(textNorm)) {
      return { servicioKey: 'observacion', servicioNombre: 'Observación', Categoria: 'Hospitalización' };
    }

    // 3. Evaluar reglas de numeración de Hospitalización:
    // A1, A2, A3... O series de cama 100..199 o 200..299
    const strNum = String(numPaciente || '').trim();
    const numParsed = parseInt(strNum.replace(/\D/g, ''), 10);
    const tienePrefijoCama = /^[a-zA-Z]/.test(strNum);

    const esNumeroHospitalizacion = (
      tienePrefijoCama ||
      (!isNaN(numParsed) && ((numParsed >= 100 && numParsed <= 199) || (numParsed >= 200 && numParsed <= 299)))
    );

    // Sub-servicios específicos
    let subServicioKey = 'srv_custom';
    let subServicioNombre = 'General';

    if (/pediatr|p\.?n\b|nino/.test(textNorm)) {
      subServicioKey = 'pediatria';
      subServicioNombre = 'Pediatría';
    } else if (/med.*interna|conta.*mi|\bmi\b/.test(textNorm)) {
      subServicioKey = 'med_interna';
      subServicioNombre = 'Medicina Interna';
    } else if (/obstetric|ginec/.test(textNorm)) {
      subServicioKey = 'obstetricia';
      subServicioNombre = 'Obstetricia';
    } else if (/cirug/.test(textNorm)) {
      subServicioKey = 'cirugia';
      subServicioNombre = 'Cirugía';
    } else if (/traumatolog/.test(textNorm)) {
      subServicioKey = 'traumatologia';
      subServicioNombre = 'Traumatología';
    } else if (/cai/.test(textNorm)) {
      subServicioKey = 'cai';
      subServicioNombre = 'CAI';
    } else if (/epidemiolog/.test(textNorm)) {
      subServicioKey = 'epidemiologia';
      subServicioNombre = 'Epidemiología';
    } else if (/neumonolog/.test(textNorm)) {
      subServicioKey = 'neumonologia';
      subServicioNombre = 'Neumonología';
    }

    if (esNumeroHospitalizacion || /h\/a|hosp/.test(textNorm)) {
      return {
        servicioKey: subServicioKey !== 'srv_custom' ? subServicioKey : 'hospitalizacion',
        servicioNombre: subServicioNombre !== 'General' ? subServicioNombre : 'Hospitalización',
        Categoria: 'Hospitalización'
      };
    }

    // Consulta Especial (números < 100 o números no pertenecientes a la serie de camas de hospitalización)
    return {
      servicioKey: subServicioKey !== 'srv_custom' ? subServicioKey : 'cons_especial',
      servicioNombre: subServicioNombre !== 'General' ? subServicioNombre : 'Consulta Especial',
      Categoria: 'Consulta Especial'
    };
  }

  /**
   * Extrae los parásitos detectados en una línea o resultado de Coproanálisis/Heces.
   * Si el resultado indica NSOP / "No Se Observan Parásitos", retorna array vacío.
   * @param {string} textoResultado 
   * @returns {string[]} Array de nombres de parásitos
   */
  static extraerParasitos(textoResultado) {
    if (!textoResultado) return [];
    const resNorm = textoResultado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // NSOP = No Se Observan Parásitos
    if (/\bnsop\b|n\.?s\.?o\.?p\.?|no\s*se\s*observan|negativo|normal/.test(resNorm)) {
      return [];
    }

    const listaParasitos = [
      { key: 'par_blastocystis', label: 'Blastocystis Ssp', regex: /blastocyst/ },
      { key: 'par_giardia', label: 'Giardia Duodenale', regex: /giardia/ },
      { key: 'par_entamoeba_hist', label: 'Entamoeba Histolítica', regex: /entamoeba\s*hist|e\.\s*hist/ },
      { key: 'par_entamoeba_coli', label: 'Entamoeba Coli', regex: /entamoeba\s*coli|e\.\s*coli/ },
      { key: 'par_ascaris', label: 'Ascaris Lumbricoides', regex: /ascaris/ },
      { key: 'par_ancylostoma', label: 'Ancylostoma', regex: /ancylostoma|uncinaria/ },
      { key: 'par_trichuris', label: 'Trichuris Trichura', regex: /trichuris/ },
      { key: 'par_enterobius', label: 'Enterobius Vermicularis', regex: /enterobius|oxiuro/ },
      { key: 'par_hymenolepis_nana', label: 'Hymenolepis Nana', regex: /hymenolepis\s*nana/ },
      { key: 'par_strongyloides', label: 'Strongyloides Estercoralis', regex: /strongyloid/ },
      { key: 'par_balantidium', label: 'Balantidium Coli', regex: /balantidium/ },
      { key: 'par_yodamoeba', label: 'Yodamoeba Busthlii', regex: /yodamoeba/ },
      { key: 'par_endolimax', label: 'Endolimax Nana', regex: /endolimax/ },
      { key: 'par_tricomonas', label: 'Tricomonas Hominis', regex: /tricomonas/ },
      { key: 'par_taenia', label: 'Taenia Sp', regex: /taenia/ },
      { key: 'par_levaduras', label: 'Levaduras', regex: /levadur/ }
    ];

    const encontrados = [];
    listaParasitos.forEach(p => {
      if (p.regex.test(resNorm)) {
        encontrados.push(p.label);
      }
    });

    return encontrados;
  }

  /**
   * Determina el examen y área del laboratorio a partir del texto y resultado de la línea.
   * Aplica las reglas de multiplicador de la Licenciada.
   * NSOP = Coproanálisis (No Se Observan Parásitos).
   *
   * @param {string} textoExamen 
   * @param {string} textoResultado 
   * @returns {{ examenNombre: string, examenKey: string, areaId: string, multiplicador: number }}
   */
  static inferirExamenYMultiplicador(textoExamen, textoResultado) {
    const combinado = `${textoExamen || ''} ${textoResultado || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // NSOP = Coproanálisis / Heces (No Se Observan Parásitos) -> Multiplicador 2
    if (/\bnsop\b|n\.?s\.?o\.?p\.?/.test(combinado)) {
      return { examenNombre: 'Coproanálisis (NSOP - No Se Observan Parásitos)', examenKey: 'cop_general', areaId: 'coproanalisis', multiplicador: 2 };
    }

    // 1. VSG / VCG (Velocidad de Sedimentación Globular) -> Multiplicador 1
    if (/vsg|vcg|velocidad.*sediment/.test(combinado)) {
      return { examenNombre: 'VSG', examenKey: 'sub_56_vsg', areaId: 'hematologia', multiplicador: 1 };
    }

    // 2. Prueba de Embarazo / HCG -> Serología, Multiplicador 1
    if (/hcg|embaraz/.test(combinado)) {
      return { examenNombre: 'Prueba de Embarazo', examenKey: 'ser1_pe', areaId: 'serologia', multiplicador: 1 };
    }

    // 3. VDRL / HIV / Hepatitis / Serología -> Multiplicador 1
    if (/vdrl/.test(combinado)) {
      return { examenNombre: 'VDRL', examenKey: 'ser2_vd', areaId: 'serologia', multiplicador: 1 };
    }
    if (/hiv|vih/.test(combinado)) {
      return { examenNombre: 'HIV', examenKey: 'ser2_hiv', areaId: 'serologia', multiplicador: 1 };
    }

    // 4. Coproanálisis / Heces -> Multiplicador 2
    if (/heces|copro|fecal|parasit|kato|sol\.?sal|lugol/.test(combinado)) {
      return { examenNombre: 'Coproanálisis', examenKey: 'cop_general', areaId: 'coproanalisis', multiplicador: 2 };
    }

    // 5. Uroanálisis / Orina -> Multiplicador 6
    if (/orin|urin|uroan/.test(combinado)) {
      return { examenNombre: 'Orina', examenKey: 'uro_general', areaId: 'uroanalisis', multiplicador: 6 };
    }

    // 6. Hematología Completa -> Multiplicador 5
    if (/hemo|hemato|hemogram|hto|hb|plaquet/.test(combinado)) {
      return { examenNombre: 'Hematología Completa', examenKey: 'hem_general', areaId: 'hematologia', multiplicador: 5 };
    }

    // Por defecto Hematología Completa (×5)
    return { examenNombre: 'Hematología Completa', examenKey: 'hem_general', areaId: 'hematologia', multiplicador: 5 };
  }

  /**
   * Parsea las líneas de texto extraídas de un lote de fotos de cuadernos.
   * Maneja la herencia de fecha entre imágenes consecutivas si falta en la página actual.
   *
   * @param {Array<{ rawText: string, fechaManual?: string }>} imagenesLote 
   * @param {string} [fechaPorDefecto] 
   * @returns {Array<object>} Lista de registros individuales detectados
   */
  static parsearLoteCuadernos(imagenesLote, fechaPorDefecto = '') {
    const registrosExtraidos = [];
    let fechaActiva = fechaPorDefecto || DateUtils.getHoy();

    imagenesLote.forEach((imgObj, indexImagen) => {
      const rawText = imgObj.rawText || '';
      const lineas = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      // Intentar buscar encabezado de fecha en las primeras líneas de la página
      let fechaEncontrada = null;
      for (let i = 0; i < Math.min(lineas.length, 5); i++) {
        const fExt = this.extraerFecha(lineas[i]);
        if (fExt) {
          fechaEncontrada = fExt;
          break;
        }
      }

      if (fechaEncontrada) {
        fechaActiva = fechaEncontrada;
      } else if (imgObj.fechaManual) {
        fechaActiva = imgObj.fechaManual;
      }
      const centrosExternos = this.obtenerCentrosExternos();

      lineas.forEach(linea => {
        // Ignorar líneas de encabezado de fecha o títulos generales
        if (this.extraerFecha(linea) || /lic\s*yosmar|asist\s|cuaderno|fecha/i.test(linea)) return;

        let text = linea.replace(/^[\s\|\-\*\.\[\]]+/, '').trim();
        if (!text) return;

        // 1. Extraer N° de Paciente o Cama al inicio
        let numPaciente = '1';
        const matchNum = text.match(/^(?:p\.?n\s*)?([a-zA-Z0-9]{1,5})\b/i);
        if (matchNum) {
          numPaciente = matchNum[1];
          text = text.substring(matchNum[0].length).trim();
        }

        // 2. Extraer Edad (ej: 31a, 31a., 31 años, 25a, 25a.)
        let edadPaciente = 'S/E';
        let nombrePaciente = '';
        let restoTexto = text;

        const regexEdadFuerte = /\b(\d{1,3}\s*(?:años|a\b\.?))\b/i;
        const matchFuerte = text.match(regexEdadFuerte);

        if (matchFuerte) {
          const idxEdad = text.indexOf(matchFuerte[0]);
          nombrePaciente = text.substring(0, idxEdad).trim();
          edadPaciente = matchFuerte[0].replace(/\.$/, '').trim();
          restoTexto = text.substring(idxEdad + matchFuerte[0].length).trim();
        } else {
          // Si no tiene edad explícita, el nombre inicial abarca hasta encontrar el servicio/centro
          nombrePaciente = text;
        }

        // 3. Buscar centros externos (PBA, IPAS, CEMCA, ROA, Guaraque, Amparo, Río Negro, etc.)
        let centroExternoDetectado = '';
        let servicioKey = 'cons_especial';
        let servicioNombre = 'Consulta Especial';
        let categoriaServicio = 'Consulta Especial';

        const textNormResto = (restoTexto || text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const centroFound = centrosExternos.find(c => textNormResto.includes(c));

        if (centroFound) {
          centroExternoDetectado = centroFound.toUpperCase();
          servicioKey = 'cons_externa';
          servicioNombre = 'Consulta Externa';
          categoriaServicio = 'Consulta Externa';
          if (!matchFuerte) {
            const idxCentro = nombrePaciente.toLowerCase().indexOf(centroFound);
            if (idxCentro > 0) {
              nombrePaciente = nombrePaciente.substring(0, idxCentro).trim();
            }
          }
        } else {
          // Clasificar por reglas del servicio o número de cama de hospitalización
          const srvClas = this.clasificarServicio(numPaciente, restoTexto || text);
          servicioKey = srvClas.servicioKey;
          servicioNombre = srvClas.servicioNombre;
          categoriaServicio = srvClas.Categoria;
          if (srvClas.centroExternoDetectado) {
            centroExternoDetectado = srvClas.centroExternoDetectado;
          }
        }

        // Limpiar el nombre del paciente de palabras clave sobrantes
        nombrePaciente = nombrePaciente.replace(/\[?esopo?\]?|\bnsop\b|\bhto\b|\bhb\b|\bvdrl\b|\bhcg\b/gi, '').trim();
        if (!nombrePaciente || nombrePaciente.length < 2) {
          nombrePaciente = `Paciente #${numPaciente}`;
        }

        // Inferir examen y multiplicador
        const examenInfo = this.inferirExamenYMultiplicador(restoTexto || text, linea);
        const parasitos  = examenInfo.areaId === 'coproanalisis' ? this.extraerParasitos(linea) : [];

        registrosExtraidos.push({
          idTemp:          `rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          imagenIndex:     indexImagen + 1,
          fecha:           fechaActiva,
          numPaciente,
          nombrePaciente,
          edadPaciente,
          servicioTextoOriginal: restoTexto || text,
          servicioKey,
          servicioNombre,
          categoriaServicio,
          centroExternoDetectado,
          examenNombre:    examenInfo.examenNombre,
          examenKey:       examenInfo.examenKey,
          areaId:          examenInfo.areaId,
          multiplicador:   examenInfo.multiplicador,
          resultadoTexto:  linea,
          parasitos:       parasitos,
          dudaLectura:     true, // Mostrar siempre el aviso visual de confirmación "¿Estoy leyendo bien este campo?"
          lineaOriginal:   linea
        });
      });
    });

    return registrosExtraidos;
  }

  /**
   * Agrupa una lista de registros individuales de atenciones por (fecha, servicioKey, examenKey)
   * calculando las cantidades de pacientes y los totales multiplicados.
   *
   * @param {Array<object>} registros
   * @returns {Array<object>} Atenciones agrupadas listas para guardar en BioanalisisRepository
   */
  static agruparAtencionesParaInsercion(registros) {
    const mapaAgrupado = {};

    (registros || []).forEach(reg => {
      const clave = `${reg.fecha}__${reg.servicioKey}__${reg.examenKey}`;

      if (!mapaAgrupado[clave]) {
        mapaAgrupado[clave] = {
          fecha:           reg.fecha,
          servicioKey:     reg.servicioKey,
          servicioNombre:  reg.servicioNombre,
          examenKey:       reg.examenKey,
          examenNombre:    reg.examenNombre,
          areaId:          reg.areaId,
          multiplicador:   reg.multiplicador,
          cantidadPacientes: 0,
          totalCalculado:  0,
          parasitosAcumulados: []
        };
      }

      mapaAgrupado[clave].cantidadPacientes += 1;
      mapaAgrupado[clave].totalCalculado = mapaAgrupado[clave].cantidadPacientes * reg.multiplicador;

      if (reg.parasitos && reg.parasitos.length) {
        mapaAgrupado[clave].parasitosAcumulados.push(...reg.parasitos);
      }
    });

    return Object.values(mapaAgrupado);
  }
}

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
  window.CuadernoParser = CuadernoParser;
}
if (typeof global !== 'undefined') {
  global.CuadernoParser = CuadernoParser;
}
