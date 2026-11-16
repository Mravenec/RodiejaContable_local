import * as XLSX from 'xlsx-js-style';

/**
 * Paleta de colores pastel para filas agrupadas o bloques de datos
 */
export const PASTEL_PALETTE = ['DBEAFE', 'DCFCE7', 'FEF9C3', 'F3E8FF'];
export const PASTEL_MEDIUM_PALETTE = ['BFDBFE', 'A7F3D0', 'FDE68A', 'DDD6FE'];

/**
 * Genera el estilo visual estándar para cabeceras de Excel
 * @param {string} bgHex - Color de fondo en hexadecimal (ej: '0F172A', '1D4ED8')
 * @returns {object} Objeto de estilo compatible con xlsx-js-style
 */
export const createHeaderStyle = (bgHex = '1890FF') => ({
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
  fill: { fgColor: { rgb: bgHex } },
  border: {
    top: { style: 'thin', color: { rgb: 'CCCCCC' } },
    bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
    left: { style: 'thin', color: { rgb: 'CCCCCC' } },
    right: { style: 'thin', color: { rgb: 'CCCCCC' } },
  },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
});

/**
 * Aplica estilos de cabecera a la fila 0 de una hoja de trabajo
 * @param {object} ws - Worksheet de XLSX
 * @param {Array<string>} headers - Lista de nombres de columnas
 * @param {string} [bgHex='1890FF'] - Color de fondo para las cabeceras
 */
export const applyExcelHeaderStyles = (ws, headers, bgHex = '1890FF') => {
  if (!ws || !Array.isArray(headers)) return;
  const style = createHeaderStyle(bgHex);
  headers.forEach((_, ci) => {
    const addr = XLSX.utils.encode_cell({ r: 0, c: ci });
    if (ws[addr]) {
      ws[addr].s = style;
    }
  });
};

/**
 * Aplica formato de moneda en colones a una columna específica en todas las filas de datos
 * @param {object} ws - Worksheet de XLSX
 * @param {number} colIdx - Índice de la columna (0-indexed)
 * @param {number} rowCount - Cantidad de filas de datos
 */
export const formatExcelCurrencyColumn = (ws, colIdx, rowCount) => {
  if (!ws || colIdx < 0 || rowCount <= 0) return;
  for (let r = 1; r <= rowCount; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: colIdx });
    if (ws[addr]) {
      ws[addr].z = '"₡"#,##0.00';
    }
  }
};
