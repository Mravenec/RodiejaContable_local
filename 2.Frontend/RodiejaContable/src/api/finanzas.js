import api from './axios';

// Helper para ordenar transacciones por fecha descendente
const sortTransaccionesDesc = (transacciones) => {
  if (!Array.isArray(transacciones)) return transacciones;
  return [...transacciones].sort((a, b) => {
    const getVal = f => f ? (Array.isArray(f) ? new Date(f[0], f[1]-1, f[2]).getTime() : new Date(f).getTime()) : 0;
    return getVal(b.fecha || b.createdAt) - getVal(a.fecha || a.createdAt);
  });
};

export const finanzasService = {
  // Get all financial transactions with optional filters
  getTransacciones: async (filters = {}) => {
    try {
      const response = await api.get('transacciones-financieras', { params: filters });
      return sortTransaccionesDesc(response.data);
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get a single transaction by ID
  getTransaccionById: async (id) => {
    try {
      const response = await api.get(`transacciones-financieras/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Create a new transaction
  createTransaccion: async (transaccionData) => {
    try {
      const response = await api.post('transacciones-financieras', transaccionData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update an existing transaction
  updateTransaccion: async (id, transaccionData) => {
    try {
      const response = await api.put(`transacciones-financieras/${id}`, transaccionData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete a transaction
  deleteTransaccion: async (id) => {
    try {
      const response = await api.delete(`transacciones-financieras/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get financial summary
  getResumenFinanciero: async (params = {}) => {
    try {
      const response = await api.get('transacciones-financieras/resumen', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get financial metrics
  getMetricasFinancieras: async (params = {}) => {
    try {
      const response = await api.get('transacciones-financieras/metricas', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get transactions by type (ingreso/egreso)
  getTransaccionesByTipo: async (tipo, params = {}) => {
    try {
      const response = await api.get(`transacciones-financieras/tipo/${tipo}`, { params });
      return sortTransaccionesDesc(response.data);
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get transactions by date range
  getTransaccionesByDateRange: async (fechaInicio, fechaFin, params = {}) => {
    try {
      const response = await api.get('transacciones-financieras/rango-fechas', {
        params: { fechaInicio, fechaFin, ...params }
      });
      return sortTransaccionesDesc(response.data);
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getTransaccionesPorVehiculo: async (vehiculoId, params = {}) => {
    try {
      const { data } = await api.get(
        `transacciones-financieras/vehiculo/${vehiculoId}`,
        { params: { activo: 1, ...params } }
      );
      return sortTransaccionesDesc(data);
    } catch (error) {
      throw error?.response?.data || error?.message || 'Error al cargar transacciones del vehículo';
    }
  },

  // Facturar un pedido Audatex
  facturarPedidoAudatex: async (pedidoId) => {
    try {
      const response = await api.post('audatex/pedidos/facturar', { pedidoId });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default finanzasService;
