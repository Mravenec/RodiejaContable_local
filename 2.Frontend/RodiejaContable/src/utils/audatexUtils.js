/**
 * Utilitarios centralizados para procesamiento de datos de vehículos de Audatex e INS.
 */

/**
 * Normaliza una cadena eliminando acentos/diacríticos y pasando a minúsculas
 * @param {string|any} str
 * @returns {string}
 */
export const normalizeString = (str) => {
  if (!str && str !== 0) return '';
  return str.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};

/**
 * Obtiene un string seguro recortado, retornando '' si es nulo o '-'
 * @param {any} val
 * @returns {string}
 */
export const getSafeString = (val) => {
  if (val === null || val === undefined || val === 'null' || val === '-') return '';
  return String(val).trim();
};

/**
 * Extrae y cachea el objeto JSON de detalles del pedido u oportunidad
 * @param {object} row
 * @returns {object}
 */
export const getDetalleJson = (row) => {
  if (!row) return {};
  if (row._parsedDetalle) return row._parsedDetalle;
  let datos = {};
  try {
    if (row.detalleJson) {
      datos = typeof row.detalleJson === 'string' ? JSON.parse(row.detalleJson) : row.detalleJson;
    } else if (row.detalle_json) {
      datos = typeof row.detalle_json === 'string' ? JSON.parse(row.detalle_json) : row.detalle_json;
    } else if (row.datosCotizacion) {
      datos = typeof row.datosCotizacion === 'string' ? JSON.parse(row.datosCotizacion) : row.datosCotizacion;
    }
  } catch (e) {
    // Ignore JSON parse errors
  }
  row._parsedDetalle = datos || {};
  return row._parsedDetalle;
};

/**
 * Obtiene la marca de un vehículo de forma segura
 * @param {object} row
 * @returns {string}
 */
export const getMarcaSegura = (row) => {
  if (!row) return 'Desc.';
  const m = getSafeString(row.marca) || getSafeString(row.armadora);
  if (m) return m;
  const d = getDetalleJson(row);
  return d['Marca'] || d['Armadora'] || 'Desc.';
};

/**
 * Obtiene el modelo de un vehículo de forma segura
 * @param {object} row
 * @returns {string}
 */
export const getModeloSeguro = (row) => {
  if (!row) return '-';
  const m = getSafeString(row.modelo);
  if (m) return m;
  const d = getDetalleJson(row);
  return d['Modelo'] || d['Descripción'] || d['Descripcion'] || '-';
};

/**
 * Obtiene el año de un vehículo de forma segura
 * @param {object} row
 * @returns {string}
 */
export const getAnioSeguro = (row) => {
  if (!row) return '-';
  const a = getSafeString(row.anio);
  if (a) return a;
  const d = getDetalleJson(row);
  return d['Año Modelo'] || d['Año Fabricación'] || d['Ano Modelo'] || '-';
};

/**
 * Obtiene la placa/matrícula de un vehículo de forma segura
 * @param {object} row
 * @returns {string}
 */
export const getPlacaSegura = (row) => {
  if (!row) return '-';
  if (row.matricula) return row.matricula;
  const d = getDetalleJson(row);
  return d['matricula'] || d['Matricula'] || d['Placa'] || '-';
};

/**
 * Obtiene la provincia de un vehículo de forma segura
 * @param {object} row
 * @returns {string}
 */
export const getProvinciaSegura = (row) => {
  if (!row) return '-';
  const d = getDetalleJson(row);
  return getSafeString(d['Estado']) || getSafeString(d['Provincia']) || '-';
};

/**
 * Obtiene el cantón o ciudad de un vehículo de forma segura
 * @param {object} row
 * @returns {string}
 */
export const getCantonSeguro = (row) => {
  if (!row) return '-';
  const c = getSafeString(row.ciudad);
  if (c) return c;
  const d = getDetalleJson(row);
  return getSafeString(d['Ciudad']) || getSafeString(d['Cantón']) || getSafeString(d['Canton']) || '-';
};

/**
 * Obtiene la dirección o colonia de un vehículo de forma segura
 * @param {object} row
 * @returns {string}
 */
export const getDireccionSegura = (row) => {
  if (!row) return '-';
  const dir = getSafeString(row.colonia);
  if (dir) return dir;
  const d = getDetalleJson(row);
  return getSafeString(d['Colonia']) || getSafeString(d['Dirección']) || getSafeString(d['Direccion']) || '-';
};
