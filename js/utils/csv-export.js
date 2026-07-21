/**
 * =========================================================================
 * js/utils/csv-export.js
 * -------------------------------------------------------------------------
 * Utilidades de exportación CSV para el Sistema Hospital San José.
 *
 * RESPONSABILIDAD:
 *   - Generar cadenas CSV a partir de datos estructurados.
 *   - Disparar la descarga del archivo en el navegador.
 *   - Formatear el CSV de la grilla mensual del formato estadístico.
 *   - Generar correos pre-redactados con el resumen del día.
 * =========================================================================
 */

'use strict';

const CsvExport = (() => {

  /**
   * Descarga un archivo CSV en el navegador del usuario.
   * Incluye BOM (\\uFEFF) para compatibilidad con Excel en español.
   * @param {string} nombre  – Nombre del archivo (sin extensión)
   * @param {string} csv     – Contenido CSV
   */
  function descargar(nombre, csv) {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `${nombre}.csv`,
      style: 'display:none'
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Genera el CSV del historial completo de pacientes.
   * @param {object[]} pacientes  – Array de registros de pacientes
   * @param {object[]} servicios  – Array de servicios (para lookup por id)
   * @param {object[]} examenes   – Array de exámenes (para lookup por id)
   * @returns {string}            – Contenido CSV
   */
  function generarHistorialCSV(pacientes, servicios, examenes) {
    let csv = 'Fecha,Servicio,Examen,Cantidad,Total\n';
    pacientes.forEach(p => {
      const serv = servicios.find(s => s.id === p.servicioId) || { nombre: '' };
      const exam = examenes.find(e => e.id === p.examenId)    || { nombre: '' };
      csv += `"${p.fecha}","${serv.nombre}","${exam.nombre}",${p.cantidad},${parseFloat(p.total).toFixed(2)}\n`;
    });
    return csv;
  }

  /**
   * Genera el CSV del resumen diario.
   * @param {string}   fecha
   * @param {object[]} rows       – [{nombre, cantidad, total}]
   * @param {number}   totalCant
   * @param {number}   totalVal
   * @returns {string}
   */
  function generarResumenDiarioCSV(fecha, rows, totalCant, totalVal) {
    let csv = `Resumen Diario – ${fecha}\nExamen,Cantidad,Total\n`;
    rows.forEach(r => {
      csv += `"${r.nombre}",${r.cantidad},${r.total.toFixed(2)}\n`;
    });
    csv += `\n"TOTAL",${totalCant},${totalVal.toFixed(2)}\n`;
    return csv;
  }

  /**
   * Genera el CSV de la grilla mensual de un formato estadístico.
   * @param {object}   area       – Objeto del área (HOSPITAL_AREAS[i])
   * @param {object}   hoja       – Objeto de la hoja dentro del área
   * @param {string}   turnoLabel – Etiqueta del turno
   * @param {number}   mes        – Mes (1-12)
   * @param {number}   ano        – Año
   * @param {number[]} dias       – Array de días del mes
   * @param {object}   datos      – {[filaId]: {[dia]: valor}}
   * @returns {string}
   */
  function generarFormatoCSV(area, hoja, turnoLabel, mes, ano, dias, datos) {
    const mesLabel  = NOMBRES_MESES[mes - 1];
    const diasHead  = dias.map(d => String(d).padStart(2, '0')).join(',');

    let csv = `HOSPITAL II "SAN JOSE" TOVAR\n`;
    csv    += `ÁREA:,${area.label}\n`;
    csv    += `MES:,${mesLabel},AÑO:,${ano},TURNO:,${turnoLabel}\n\n`;
    csv    += `FECHA:,${diasHead},TOTAL\n`;

    hoja.grupos.forEach(grupo => {
      csv += `\n--- ${grupo.titulo} ---\n`;
      grupo.filas.forEach(fila => {
        const filaData  = datos[fila.id] || {};
        const valores   = dias.map(d => filaData[d] || 0);
        const total     = valores.reduce((s, v) => s + v, 0);
        const valStr    = valores.join(',');
        csv += `"${fila.label}",${valStr},${total}\n`;
      });
    });

    return csv;
  }

  /**
   * Genera el cuerpo del correo de resumen diario.
   * @param {string}   fecha
   * @param {object[]} rows
   * @param {number}   totalCant
   * @param {number}   totalVal
   * @returns {string}  – URI mailto completo
   */
  function generarMailtoResumen(fecha, rows, totalCant, totalVal) {
    const detalle = rows.length
      ? rows.map(r => `  - ${r.nombre}: ${r.cantidad} examen(es) · Total: ${r.total.toFixed(2)}`).join('\n')
      : '  Sin registros para esta fecha.';

    const asunto = `Reporte Diario de Bioanálisis – ${fecha}`;
    const cuerpo =
      `Estimada(o),\n\nAdjunto encontrará el reporte del día ${fecha}.\n\n` +
      `══════════════════════════════════\n` +
      `RESUMEN DEL DÍA\n` +
      `══════════════════════════════════\n` +
      `${detalle}\n` +
      `──────────────────────────────────\n` +
      `TOTAL EXÁMENES : ${totalCant}\n` +
      `VALOR TOTAL    : ${totalVal.toFixed(2)}\n` +
      `══════════════════════════════════\n\n` +
      `(Recuerde adjuntar el archivo .csv descargado.)\n\n` +
      `Atentamente,\nLic. Eliana Morales`;

    return `mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  }

  // API pública
  return {
    descargar,
    generarHistorialCSV,
    generarResumenDiarioCSV,
    generarFormatoCSV,
    generarMailtoResumen
  };

})();
