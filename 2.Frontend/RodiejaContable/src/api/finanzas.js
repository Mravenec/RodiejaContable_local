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
  // Get all financial transactions with optional filters (including mes and anio)
  getTransacciones: async (filters = {}) => {
    try {
      const params = { ...filters };
      if (params.mes && params.anio) {
        return await finanzasService.getTransaccionesPorPeriodo(params.mes, params.anio, params);
      }
      if (params.fechaInicio && params.fechaFin) {
        return await finanzasService.getTransaccionesByDateRange(params.fechaInicio, params.fechaFin, params);
      }
      const response = await api.get('transacciones-financieras', { params });
      return sortTransaccionesDesc(response.data);
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get transactions filtered by month and year (calculates date range for backend endpoint)
  getTransaccionesPorPeriodo: async (mes, anio, params = {}) => {
    try {
      const m = parseInt(mes, 10);
      const a = parseInt(anio, 10);
      const mesStr = String(m).padStart(2, '0');
      const ultimoDia = new Date(a, m, 0).getDate();
      const fechaInicio = `${a}-${mesStr}-01`;
      const fechaFin = `${a}-${mesStr}-${String(ultimoDia).padStart(2, '0')}`;

      // El endpoint en el backend para filtrar transacciones por fecha es /rango-fechas
      const response = await api.get('transacciones-financieras/rango-fechas', {
        params: { fechaInicio, fechaFin, ...params }
      });
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
  },

  // Reembolsar una transacción
  reembolsarTransaccion: async (id) => {
    try {
      const response = await api.post(`transacciones-financieras/reembolso/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Consultar el estado de reembolso de una transacción
  verificarEstadoReembolso: async (id) => {
    try {
      const response = await api.get(`transacciones-financieras/${id}/estado-reembolso`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default finanzasService;
