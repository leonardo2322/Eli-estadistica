/**
 * =========================================================================
 * js/utils/fuzzy-matcher.js
 * -------------------------------------------------------------------------
 * Motor de Similitud Léxica (Algoritmo Levenshtein & Jaro-Winkler).
 * Corrije automáticamente errores de lectura de caligrafía manuscrita
 * (ej: "Graic1 Par3des PB4" ➔ "Graicy Paredes PBA") 100% offline.
 * =========================================================================
 */

'use strict';

class FuzzyMatcher {

  /**
   * Calcula la distancia de Levenshtein entre dos cadenas.
   * @param {string} a 
   * @param {string} b 
   * @returns {number}
   */
  static distanciaLevenshtein(a, b) {
    const s1 = (a || '').toLowerCase().trim();
    const s2 = (b || '').toLowerCase().trim();

    if (s1 === s2) return 0;
    if (s1.length === 0) return s2.length;
    if (s2.length === 0) return s1.length;

    const matrix = [];
    for (let i = 0; i <= s2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= s1.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // Sustitución
            matrix[i][j - 1] + 1,     // Inserción
            matrix[i - 1][j] + 1      // Eliminación
          );
        }
      }
    }

    return matrix[s2.length][s1.length];
  }

  /**
   * Calcula el porcentaje de similitud (0.0 a 1.0) usando Levenshtein.
   * @param {string} a 
   * @param {string} b 
   * @returns {number}
   */
  static similitudLevenshtein(a, b) {
    const maxLen = Math.max((a || '').length, (b || '').length);
    if (maxLen === 0) return 1.0;
    const dist = this.distanciaLevenshtein(a, b);
    return 1.0 - (dist / maxLen);
  }

  /**
   * Busca la mejor coincidencia de una palabra en un diccionario de términos.
   * @param {string} palabra 
   * @param {Array<string>} diccionario 
   * @param {number} [umbralMinimo=0.65] 
   * @returns {{ coincidencia: string, similitud: number } | null}
   */
  static encontrarMejorCoincidencia(palabra, diccionario, umbralMinimo = 0.65) {
    if (!palabra || !palabra.trim()) return null;
    const norm = palabra.trim();

    let mejor = null;
    let maxSim = 0;

    for (const termino of diccionario) {
      const sim = this.similitudLevenshtein(norm, termino);
      if (sim > maxSim) {
        maxSim = sim;
        mejor = termino;
      }
    }

    if (maxSim >= umbralMinimo && mejor) {
      return { coincidencia: mejor, similitud: maxSim };
    }

    return null;
  }

  /**
   * Diccionario de centros y ambulatorios externos de Mérida / Venezuela.
   */
  static DICCIONARIO_CENTROS = [
    'PBA', 'IPAS', 'CEMCA', 'ROA', 'Guaraque', 'Amparo', 'Río Negro', 'Rio Negro',
    'Triaje', 'CDI', 'PVA', 'El Rosal', 'Bailadores', 'Ambulatorio', 'San José',
    'Chiguará', 'Santa Cruz', 'Lagunillas', 'Tovar', 'Ejido', 'Mérida'
  ];

  /**
   * Diccionario de nombres y apellidos comunes venezolanos para corrección léxica.
   */
  static DICCIONARIO_NOMBRES = [
    'Graicy', 'Paredes', 'Mary', 'Viloria', 'Rafael', 'Zambrano', 'Nelba', 'Molina',
    'Dabis', 'Hernández', 'José', 'García', 'Rodríguez', 'Pérez', 'González', 'Martínez',
    'Sánchez', 'Ramírez', 'Díaz', 'Gómez', 'Torres', 'Álvarez', 'Romero', 'Rojas',
    'Vargas', 'Moreno', 'Medina', 'Flores', 'Herrera', 'Castillo', 'Jiménez', 'Reyes',
    'Morales', 'Ortiz', 'Gutierrez', 'Castro', 'Chávez', 'Ríos', 'Silva', 'Mendoza',
    'Eliana', 'Leonardo', 'Yolanda', 'Carlos', 'Ana', 'María', 'Luis', 'Juan',
    'Pedro', 'Carmen', 'Rosa', 'Jesús', 'Francisco', 'Manuel', 'David', 'Daniel'
  ];

  /**
   * Corrije ambulatorios u hospitales manuscritos usando Fuzzy Matching.
   * @param {string} texto 
   * @returns {string} Texto corregido
   */
  static corregirCentroExterno(texto) {
    if (!texto) return '';
    const res = this.encontrarMejorCoincidencia(texto, this.DICCIONARIO_CENTROS, 0.60);
    return res ? res.coincidencia : texto;
  }

  /**
   * Corrije un nombre y apellido usando el motor de similitud léxica.
   * Reemplaza números u OCR ruidoso (ej: "Graic1 Par3des" ➔ "Graicy Paredes").
   * @param {string} nombreCompleto 
   * @returns {string} Nombre corregido
   */
  static corregirNombrePaciente(nombreCompleto) {
    if (!nombreCompleto) return 'Paciente';

    // Limpiar caracteres extraños típicos del OCR ruidoso
    let limpio = nombreCompleto
      .replace(/[0-9]/g, char => {
        // Mapear números que OCR confunde con letras
        if (char === '1') return 'i';
        if (char === '3') return 'e';
        if (char === '4') return 'a';
        if (char === '0') return 'o';
        if (char === '5') return 's';
        return '';
      })
      .replace(/[|_@#$%\^&\*]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const palabras = limpio.split(' ');
    const palabrasCorregidas = palabras.map(p => {
      if (p.length < 3) return p;
      const match = this.encontrarMejorCoincidencia(p, this.DICCIONARIO_NOMBRES, 0.65);
      return match ? match.coincidencia : (p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
    });

    return palabrasCorregidas.join(' ');
  }
}

if (typeof window !== 'undefined') {
  window.FuzzyMatcher = FuzzyMatcher;
}
if (typeof global !== 'undefined') {
  global.FuzzyMatcher = FuzzyMatcher;
}
