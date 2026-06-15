import axios from './axios';

const API_URL = '/tipos-transacciones';
const TRANSACCIONES_URL = '/v1/transacciones';

export const getTiposTransacciones = async () => {
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (error) {
    console.error('Error al obtener tipos de transacciones:', error);
    throw error;
  }
};

export const getTiposTransaccionesByCategoria = async (categoria) => {
  try {
    const response = await axios.get(`${API_URL}/categoria/${categoria}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener tipos de transacciones para categoría ${categoria}:`, error);
    throw error;
  }
};

export const getTiposTransaccionesActivos = async () => {
  try {
    const response = await axios.get(`${API_URL}/activos`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener tipos de transacciones activos:', error);
    throw error;
  }
};

export const createTipoTransaccion = async (tipoTransaccionData) => {
  try {
    const response = await axios.post(API_URL, tipoTransaccionData);
    return response.data;
  } catch (error) {
    console.error('Error al crear tipo de transacción:', error);
    throw error;
  }
};

// Helper para ordenar transacciones por fecha descendente
const sortTransaccionesDesc = (transacciones) => {
  if (!Array.isArray(transacciones)) return transacciones;
  return [...transacciones].sort((a, b) => {
    const getVal = f => f ? (Array.isArray(f) ? new Date(f[0], f[1]-1, f[2]).getTime() : new Date(f).getTime()) : 0;
    return getVal(b.fecha || b.createdAt) - getVal(a.fecha || a.createdAt);
  });
};

// Métodos para transacciones completas
export const getTransacciones = async (filtros = {}) => {
  try {
    const response = await axios.get(TRANSACCIONES_URL, { params: filtros });
    return sortTransaccionesDesc(response.data);
  } catch (error) {
    console.error('Error al obtener transacciones:', error);
    throw error;
  }
};

export const getTransaccionesPorRangoFechas = async (fechaInicio, fechaFin, filtros = {}) => {
  try {
    const params = { fechaInicio, fechaFin, ...filtros };
    const response = await axios.get(`${TRANSACCIONES_URL}/rango-fechas`, { params });
    return sortTransaccionesDesc(response.data);
  } catch (error) {
    console.error('Error al obtener transacciones por rango de fechas:', error);
    throw error;
  }
};

export const getTransaccionesPorCategoria = async (categoria, filtros = {}) => {
  try {
    const response = await axios.get(`${TRANSACCIONES_URL}/categoria/${categoria}`, { params: filtros });
    return sortTransaccionesDesc(response.data);
  } catch (error) {
    console.error(`Error al obtener transacciones para categoría ${categoria}:`, error);
    throw error;
  }
};

export const getTransaccionesPorEstado = async (estado, filtros = {}) => {
  try {
    const response = await axios.get(`${TRANSACCIONES_URL}/estado/${estado}`, { params: filtros });
    return sortTransaccionesDesc(response.data);
  } catch (error) {
    console.error(`Error al obtener transacciones para estado ${estado}:`, error);
    throw error;
  }
};

export const getTransaccionesPorEmpleado = async (empleado, filtros = {}) => {
  try {
    const response = await axios.get(`${TRANSACCIONES_URL}/empleado/${encodeURIComponent(empleado)}`, { params: filtros });
    return sortTransaccionesDesc(response.data);
  } catch (error) {
    console.error(`Error al obtener transacciones para empleado ${empleado}:`, error);
    throw error;
  }
};

export const getTransaccionesIngresos = async (filtros = {}) => {
  return getTransaccionesPorCategoria('INGRESO', filtros);
};

export const buscarTransacciones = async (filtros = {}) => {
  try {
    const response = await axios.get(`${TRANSACCIONES_URL}/buscar`, { params: filtros });
    if (response.data && Array.isArray(response.data.transacciones)) {
      response.data.transacciones = sortTransaccionesDesc(response.data.transacciones);
    }
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return { transacciones: [], total: 0 };
    }
    console.error('Error al buscar transacciones:', error);
    throw error;
  }
};
