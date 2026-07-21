/**
 * =========================================================================
 * js/repository/formatos-repo.js
 * -------------------------------------------------------------------------
 * Repositorio de datos para los Formatos Estadísticos Mensuales del
 * Hospital San José.
 *
 * RESPONSABILIDAD:
 *   - Guardar y recuperar los valores de la grilla mensual.
 *   - Cada grilla se identifica por: área + hoja + turno + año + mes.
 *   - La estructura de datos almacenada es un mapa plano:
 *       { [filaId]: { [dia]: numero } }
 *   - Proveer listado de períodos que tienen datos guardados.
 *
 * CLAVE DE ALMACENAMIENTO:
 *   'hsj_formato_{areaId}_{hojaId}_{turnoId}_{ano}_{mes}'
 *   Ejemplo: 'hsj_formato_hematologia_hematologia_h1_tarde_2026_07'
 * =========================================================================
 */

'use strict';

class FormatosRepository {

  constructor() {
    /** Prefijo para distinguir claves de formatos de otras claves */
    this.PREFIJO = 'hsj_formato_';
  }

  // ─────────────────────────────────────────────────────────────
  // LECTURA
  // ─────────────────────────────────────────────────────────────

  /**
   * Obtiene los datos de una grilla específica.
   * @param {string} areaId
   * @param {string} hojaId
   * @param {string} turnoId
   * @param {number} ano
   * @param {number} mes
   * @returns {object} – { [filaId]: { [dia]: number } } — vacío si no hay datos
   */
  obtenerGrilla(areaId, hojaId, turnoId, ano, mes) {
    const clave = DateUtils.generarClave(areaId, hojaId, turnoId, ano, mes);
    return JSON.parse(localStorage.getItem(clave)) || {};
  }

  /**
   * Obtiene el valor de una celda específica.
   * @param {string} areaId
   * @param {string} hojaId
   * @param {string} turnoId
   * @param {number} ano
   * @param {number} mes
   * @param {string} filaId
   * @param {number} dia
   * @returns {number}
   */
  obtenerCelda(areaId, hojaId, turnoId, ano, mes, filaId, dia) {
    const datos = this.obtenerGrilla(areaId, hojaId, turnoId, ano, mes);
    return (datos[filaId] && datos[filaId][dia]) ? Number(datos[filaId][dia]) : 0;
  }

  // ─────────────────────────────────────────────────────────────
  // ESCRITURA
  // ─────────────────────────────────────────────────────────────

  /**
   * Guarda toda una grilla.
   * @param {string} areaId
   * @param {string} hojaId
   * @param {string} turnoId
   * @param {number} ano
   * @param {number} mes
   * @param {object} datos – { [filaId]: { [dia]: number } }
   */
  guardarGrilla(areaId, hojaId, turnoId, ano, mes, datos) {
    const clave = DateUtils.generarClave(areaId, hojaId, turnoId, ano, mes);
    localStorage.setItem(clave, JSON.stringify(datos));
  }

  /**
   * Actualiza el valor de una sola celda dentro de una grilla.
   * Esto es más eficiente que reescribir toda la grilla cada vez.
   * @param {string} areaId
   * @param {string} hojaId
   * @param {string} turnoId
   * @param {number} ano
   * @param {number} mes
   * @param {string} filaId
   * @param {number} dia
   * @param {number} valor
   */
  actualizarCelda(areaId, hojaId, turnoId, ano, mes, filaId, dia, valor) {
    const clave = DateUtils.generarClave(areaId, hojaId, turnoId, ano, mes);
    const datos = JSON.parse(localStorage.getItem(clave)) || {};

    if (!datos[filaId]) datos[filaId] = {};

    if (valor === 0 || valor === null || valor === '') {
      delete datos[filaId][dia];
      // Limpiar la fila si queda vacía
      if (Object.keys(datos[filaId]).length === 0) delete datos[filaId];
    } else {
      datos[filaId][dia] = Number(valor);
    }

    localStorage.setItem(clave, JSON.stringify(datos));
  }

  // ─────────────────────────────────────────────────────────────
  // ELIMINACIÓN
  // ─────────────────────────────────────────────────────────────

  /**
   * Elimina todos los datos de una grilla específica.
   * @param {string} areaId
   * @param {string} hojaId
   * @param {string} turnoId
   * @param {number} ano
   * @param {number} mes
   */
  eliminarGrilla(areaId, hojaId, turnoId, ano, mes) {
    const clave = DateUtils.generarClave(areaId, hojaId, turnoId, ano, mes);
    localStorage.removeItem(clave);
  }

  // ─────────────────────────────────────────────────────────────
  // CONSULTAS
  // ─────────────────────────────────────────────────────────────

  /**
   * Lista todos los períodos guardados en localStorage.
   * Devuelve un array de objetos con la info parseada de la clave.
   * @returns {{clave, areaId, hojaId, turnoId, ano, mes}[]}
   */
  listarPeriodosGuardados() {
    const periodos = [];
    for (let i = 0; i < localStorage.length; i++) {
      const clave = localStorage.key(i);
      if (!clave.startsWith(this.PREFIJO)) continue;

      // Parsear clave: 'hsj_formato_{areaId}_{hojaId}_{turnoId}_{ano}_{mes}'
      const sin_prefijo = clave.slice(this.PREFIJO.length);
      // Las últimas 2 partes son ano y mes (formato YYYY y MM)
      const partes = sin_prefijo.split('_');
      const mes    = partes.pop();
      const ano    = partes.pop();
      const turnoId = partes.pop();
      // Lo que queda antes puede tener guiones bajos (ids compuestos)
      // Ejemplo: 'hematologia_hematologia_h1' → area='hematologia', hoja='hematologia_h1'
      // Usamos la convención: areaId es la primera parte, hojaId el resto
      const areaId = partes.shift();
      const hojaId = partes.join('_');

      periodos.push({ clave, areaId, hojaId, turnoId, ano: Number(ano), mes: Number(mes) });
    }
    return periodos;
  }

  /**
   * Verifica si una grilla tiene algún dato guardado.
   * @param {string} areaId
   * @param {string} hojaId
   * @param {string} turnoId
   * @param {number} ano
   * @param {number} mes
   * @returns {boolean}
   */
  tieneDatos(areaId, hojaId, turnoId, ano, mes) {
    const datos = this.obtenerGrilla(areaId, hojaId, turnoId, ano, mes);
    return Object.keys(datos).length > 0;
  }

  /**
   * Calcula el total de una fila específica sumando todos sus días.
   * @param {string} areaId
   * @param {string} hojaId
   * @param {string} turnoId
   * @param {number} ano
   * @param {number} mes
   * @param {string} filaId
   * @returns {number}
   */
  calcularTotalFila(areaId, hojaId, turnoId, ano, mes, filaId) {
    const datos = this.obtenerGrilla(areaId, hojaId, turnoId, ano, mes);
    const filaData = datos[filaId] || {};
    return Object.values(filaData).reduce((s, v) => s + Number(v), 0);
  }
}
