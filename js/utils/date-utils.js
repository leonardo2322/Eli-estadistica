/**
 * =========================================================================
 * js/utils/date-utils.js
 * -------------------------------------------------------------------------
 * Utilidades de fecha para el Sistema Estadístico Hospital San José.
 *
 * RESPONSABILIDAD:
 *   - Proveer helpers de fecha/mes/año conscientes de la fecha actual.
 *   - Calcular cuántos días tiene un mes determinado.
 *   - Formatear fechas para mostrar en la UI.
 *   - Generar la clave de almacenamiento por período.
 * =========================================================================
 */

'use strict';

const DateUtils = (() => {

  /**
   * Devuelve la fecha de hoy en formato local 'YYYY-MM-DD'.
   * @returns {string}
   */
  function getHoy() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Devuelve el año actual como número.
   * @returns {number}
   */
  function getAnoActual() {
    return new Date().getFullYear();
  }

  /**
   * Devuelve el mes actual como número (1-12).
   * @returns {number}
   */
  function getMesActual() {
    return new Date().getMonth() + 1;
  }

  /**
   * Calcula cuántos días tiene un mes específico.
   * Maneja correctamente años bisiestos.
   * @param {number} mes  – Mes (1-12)
   * @param {number} ano  – Año (ej. 2026)
   * @returns {number}    – Número de días (28-31)
   */
  function diasEnMes(mes, ano) {
    return new Date(ano, mes, 0).getDate();
  }

  /**
   * Devuelve el nombre del mes en español (MAYÚSCULAS).
   * @param {number} mes  – Mes (1-12)
   * @returns {string}
   */
  function nombreMes(mes) {
    return NOMBRES_MESES[mes - 1] || '';
  }

  /**
   * Genera un array de números de días para un mes/año dado.
   * Ej: diasDelMes(7, 2026) → [1, 2, 3, ..., 31]
   * @param {number} mes
   * @param {number} ano
   * @returns {number[]}
   */
  function diasDelMes(mes, ano) {
    const total = diasEnMes(mes, ano);
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  /**
   * Genera la clave de almacenamiento en localStorage para una grilla.
   * Formato: 'hsj_formato_{area}_{hoja}_{turno}_{ano}_{mes}'
   * @param {string} areaId
   * @param {string} hojaId
   * @param {string} turnoId
   * @param {number} ano
   * @param {number} mes
   * @returns {string}
   */
  function generarClave(areaId, hojaId, turnoId, ano, mes) {
    const mesPad = String(mes).padStart(2, '0');
    return `hsj_formato_${areaId}_${hojaId}_${turnoId}_${ano}_${mesPad}`;
  }

  /**
   * Formatea un número de día con cero a la izquierda.
   * Ej: padDia(5) → '05'
   * @param {number} dia
   * @returns {string}
   */
  function padDia(dia) {
    return String(dia).padStart(2, '0');
  }

  /**
   * Devuelve una etiqueta de período formateada.
   * Ej: etiquetaPeriodo(7, 2026) → 'JULIO 2026'
   * @param {number} mes
   * @param {number} ano
   * @returns {string}
   */
  function etiquetaPeriodo(mes, ano) {
    return `${nombreMes(mes)} ${ano}`;
  }

  /**
   * Convierte 'YYYY-MM-DD' a objeto {ano, mes, dia}.
   * @param {string} fechaISO
   * @returns {{ano: number, mes: number, dia: number}}
   */
  function parsearFecha(fechaISO) {
    const [ano, mes, dia] = fechaISO.split('-').map(Number);
    return { ano, mes, dia };
  }

  /**
   * Detecta el turno actual según la hora del sistema.
   *   Mañana : 06:00 – 13:59
   *   Tarde  : 14:00 – 21:59
   *   Noche  : 22:00 – 05:59
   * @returns {'manana'|'tarde'|'noche'}
   */
  function getTurnoActual() {
    const hora = new Date().getHours();
    if (hora >= 6  && hora < 14) return 'manana';
    if (hora >= 14 && hora < 22) return 'tarde';
    return 'noche';
  }


  // API pública
  return {
    getHoy,
    getAnoActual,
    getMesActual,
    diasEnMes,
    nombreMes,
    diasDelMes,
    generarClave,
    padDia,
    etiquetaPeriodo,
    parsearFecha,
    getTurnoActual
  };


})();
