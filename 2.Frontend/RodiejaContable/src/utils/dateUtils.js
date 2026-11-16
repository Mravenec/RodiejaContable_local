/**
 * Parsea con seguridad cualquier formato de fecha proveniente de backend o base de datos:
 * - Array de Java/LocalDate: [2026, 11, 15]
 * - String ISO o con hora: "2026-11-15T00:00:00"
 * - String de fecha simple: "2026-11-15" (sin desfase UTC)
 * - Objeto Date
 * @param {string|Array|Date} fecha - Valor de fecha
 * @returns {Date|null} Objeto Date o null si no es válida
 */
export const parseFecha = (fecha) => {
  if (!fecha) return null;
  if (fecha instanceof Date) return isNaN(fecha.getTime()) ? null : fecha;
  if (Array.isArray(fecha)) {
    return new Date(fecha[0], fecha[1] - 1, fecha[2]);
  }
  if (typeof fecha === 'string') {
    const parts = fecha.split('T')[0].split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
  }
  const parsed = new Date(fecha);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Formatea una fecha de forma segura aceptando string ISO, array [año, mes, día] o Date.
 * @param {string|Array|Date} dateValue - Fecha a formatear
 * @param {string} [fallback='No especificada'] - Texto si el valor es nulo/vacío
 * @returns {string} Fecha formateada o mensaje de fallback/error
 */
export const formatDate = (dateValue, fallback = 'No especificada') => {
  if (!dateValue) return fallback;
  try {
    const date = parseFecha(dateValue);
    if (!date || isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleDateString();
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return 'Fecha inválida';
  }
};

/**
 * Formatea fecha y hora
 * @param {string|Array|Date} dateValue
 * @param {string} [fallback='Fecha no disponible']
 * @returns {string}
 */
export const formatDateTime = (dateValue, fallback = 'Fecha no disponible') => {
  if (!dateValue) return fallback;
  try {
    const date = parseFecha(dateValue);
    if (!date || isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleString('es-CR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formateando fecha y hora:', error);
    return 'Fecha inválida';
  }
};

/**
 * Valida y formatea un año
 * @param {number|string} year - Año a validar
 * @returns {number|string} Año validado o mensaje de error
 */
export const formatYear = (year) => {
  if (!year && year !== 0) return 'N/A';
  const numYear = Number(year);
  return isNaN(numYear) || numYear < 1900 || numYear > 2100 ? 'Año inválido' : numYear;
};

/**
 * Nombres oficiales de los meses en español (1-12)
 */
export const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Opciones para componentes Select de Ant Design ({ value: 1..12, label: 'Enero'.. })
 */
export const MESES_OPCIONES = MESES_NOMBRES.map((nombre, index) => ({
  value: index + 1,
  label: nombre
}));

/**
 * Obtiene el nombre del mes correspondiente (1 a 12)
 * @param {number|string} mesNumero - Número del mes
 * @returns {string} Nombre del mes o string vacío
 */
export const obtenerNombreMes = (mesNumero) => {
  const num = parseInt(mesNumero, 10);
  return num >= 1 && num <= 12 ? MESES_NOMBRES[num - 1] : '';
};

/**
 * Genera el texto legible del período seleccionado para encabezados, filtros y exportaciones
 * @param {number|string} mes - Mes (1-12)
 * @param {number|string} anio - Año (ej: 2026)
 * @returns {string|null} Texto del período (ej: "Noviembre 2026", "Noviembre", "Año 2026") o null
 */
export const obtenerEtiquetaPeriodo = (mes, anio) => {
  const mesNum = parseInt(mes, 10);
  const nombreMes = (mesNum >= 1 && mesNum <= 12) ? MESES_NOMBRES[mesNum - 1] : null;

  if (nombreMes && anio) {
    return `${nombreMes} ${anio}`;
  }
  if (nombreMes) {
    return nombreMes;
  }
  if (anio) {
    return `Año ${anio}`;
  }
  return null;
};
