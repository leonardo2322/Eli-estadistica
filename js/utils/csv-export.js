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
   * Genera el cuerpo HTML estilizado compatible con Excel y la Impresión Directa
   * idéntico a la plantilla Formatos_Hospital_San_Jose_v2 con campos llenos
   * ajustado para encajar perfectamente en 1 SOLA HOJA de impresión horizontal.
   */
  function generarFormatoExcelHTML(area, hoja, turnoLabel, mes, ano, dias, datos) {
    const mesLabel = NOMBRES_MESES[mes - 1];
    const totalCols = dias.length + 2; // Label + Días + Total

    let html = `<html xmlns:o="urn:schemas-microsoft-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>${DomHelpers.esc(hoja.label)}</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9pt; margin: 10px; background-color: #ffffff; color: #1e293b; }
    .print-container { width: 100%; max-width: 100%; margin: 0 auto; }
    table { border-collapse: collapse; width: 100%; table-layout: fixed; font-family: 'Segoe UI', Arial, sans-serif; margin-bottom: 5px; }
    th, td { border: 1px solid #64748b; padding: 2px 4px; text-align: center; vertical-align: middle; line-height: 1.15; overflow: hidden; text-overflow: ellipsis; }
    .h-hospital { background-color: #004d40; color: #ffffff; font-weight: bold; font-size: 11pt; text-align: center; }
    .h-area { background-color: #00695c; color: #ffffff; font-weight: bold; font-size: 9.5pt; text-align: center; }
    .h-meta { background-color: #e0f2f1; color: #004d40; font-weight: bold; font-size: 8.5pt; text-align: center; }
    .h-dias { background-color: #cfd8dc; color: #1e293b; font-weight: bold; font-size: 7.5pt; }
    .row-grupo { background-color: #80cbc4; color: #004d40; font-weight: bold; font-size: 8.5pt; text-align: left; padding-left: 6px; }
    .col-label { text-align: left; font-weight: 600; background-color: #f8fafc; font-size: 8pt; white-space: nowrap; }
    .cell-val { mso-number-format:"0"; font-size: 8pt; }
    .cell-val-zero { color: #94a3b8; mso-number-format:"0"; font-size: 8pt; }
    .cell-total { background-color: #e0f2f1; font-weight: bold; color: #004d40; mso-number-format:"0"; font-size: 8.5pt; }
    .row-total { background-color: #b2dfdb; font-weight: bold; }
    .footer-sig { font-size: 8pt; font-style: italic; color: #334155; margin-top: 10px; border: none; }

    @media print {
      @page { size: landscape; margin: 4mm 5mm 4mm 5mm; }
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; width: 100%; height: 100%; overflow: hidden; }
      .print-container { width: 100% !important; transform: scale(0.95); transform-origin: top left; }
      table { table-layout: fixed !important; width: 100% !important; page-break-inside: avoid !important; }
      tr { page-break-inside: avoid !important; page-break-after: auto !important; }
      th, td { padding: 1.5px 2px !important; font-size: 7pt !important; border: 1px solid #475569 !important; }
      .h-hospital { background-color: #004d40 !important; color: #fff !important; font-size: 9.5pt !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .h-area { background-color: #00695c !important; color: #fff !important; font-size: 8pt !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .h-meta { background-color: #e0f2f1 !important; color: #004d40 !important; font-size: 7.5pt !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .h-dias th { background-color: #cbd5e1 !important; font-size: 6.5pt !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .row-grupo { background-color: #80cbc4 !important; color: #004d40 !important; font-size: 7.5pt !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .col-label { font-size: 7pt !important; white-space: nowrap !important; }
      .cell-val, .cell-val-zero, .cell-total { font-size: 7pt !important; }
      .cell-total { background-color: #e0f2f1 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .row-total { background-color: #b2dfdb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .footer-sig { margin-top: 6px !important; font-size: 7.5pt !important; }
    }
  </style>
</head>
<body>
  <div class="print-container">
    <table>
      <colgroup>
        <col style="width: 22%;">
        ${dias.map(() => `<col style="width: 2.3%;">`).join('')}
        <col style="width: 6.7%;">
      </colgroup>
      <thead>
        <tr>
          <th colspan="${totalCols}" class="h-hospital">HOSPITAL II "SAN JOSÉ" TOVAR</th>
        </tr>
        <tr>
          <th colspan="${totalCols}" class="h-area">FORMATO ESTADÍSTICO MENSUAL DE BIOANÁLISIS — ÁREA: ${DomHelpers.esc(area.label.toUpperCase())}</th>
        </tr>
        <tr>
          <th colspan="${totalCols}" class="h-meta">HOJA: ${DomHelpers.esc(hoja.label.toUpperCase())} &nbsp;|&nbsp; MES: ${mesLabel.toUpperCase()} ${ano} &nbsp;|&nbsp; TURNO: ${DomHelpers.esc(turnoLabel.toUpperCase())}</th>
        </tr>
        <tr class="h-dias">
          <th style="text-align: left; padding-left: 5px;">CONCEPTO / SERVICIO / EXAMEN</th>
          ${dias.map(d => `<th>${String(d).padStart(2, '0')}</th>`).join('')}
          <th style="background-color: #b2dfdb;">TOTAL</th>
        </tr>
      </thead>
      <tbody>`;

    hoja.grupos.forEach(grupo => {
      html += `
        <tr>
          <td colspan="${totalCols}" class="row-grupo">--- ${DomHelpers.esc(grupo.titulo.toUpperCase())} ---</td>
        </tr>`;

      grupo.filas.forEach(fila => {
        const filaData = datos[fila.id] || {};
        const valores  = dias.map(d => filaData[d] || 0);
        const total    = valores.reduce((s, v) => s + v, 0);
        const isTotalRow = fila.esTotal;
        const rowClass   = isTotalRow ? 'class="row-total"' : '';

        html += `<tr ${rowClass}>
          <td class="col-label">${DomHelpers.esc(fila.label)}</td>`;

        valores.forEach(val => {
          const cellClass = val > 0 ? 'cell-val' : 'cell-val-zero';
          html += `<td class="${cellClass}">${val}</td>`;
        });

        html += `<td class="cell-total">${total}</td>
        </tr>`;
      });
    });

    html += `
      </tbody>
    </table>
    <table class="footer-sig" style="border: none; width: 100%;">
      <tr style="border: none;">
        <td style="border: none; text-align: left; font-weight: bold;" colspan="15">
          Lic. Eliana Morales — Bioanalista
        </td>
        <td style="border: none; text-align: right; font-weight: bold;" colspan="${totalCols - 15}">
          Firma y Sello del Hospital San José
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * Descarga la planilla estilizada en formato Excel (.xls).
   */
  function descargarExcelEstilizado(nombre, htmlContent) {
    const blob = new Blob(['\uFEFF' + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `${nombre}.xls`,
      style: 'display:none'
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Abre la vista previa e impresión de la planilla formateada.
   */
  function imprimirFormatoEstilizado(area, hoja, turnoLabel, mes, ano, dias, datos) {
    const htmlContent = generarFormatoExcelHTML(area, hoja, turnoLabel, mes, ano, dias, datos);
    const win = window.open('', '_blank');
    if (!win) {
      DomHelpers.mostrarToast('Por favor permita la apertura de ventanas emergentes para imprimir.', 'error');
      return;
    }
    win.document.write(htmlContent);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 400);
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
      `(Recuerde adjuntar el archivo descargado.)\n\n` +
      `Atentamente,\nLic. Eliana Morales`;

    return `mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  }

  // API pública
  return {
    descargar,
    generarHistorialCSV,
    generarResumenDiarioCSV,
    generarFormatoCSV,
    generarFormatoExcelHTML,
    descargarExcelEstilizado,
    imprimirFormatoEstilizado,
    generarMailtoResumen
  };

})();
