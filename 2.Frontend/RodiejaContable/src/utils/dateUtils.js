/**
 * Formatea una fecha en formato legible
 * @param {string|Date} dateString - Fecha a formatear
 * @returns {string} Fecha formateada o mensaje de error
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Fecha inválida' : date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return 'Error de formato';
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
