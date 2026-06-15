import api from './axios';

// Helper para ordenar transacciones por fecha descendente
const sortTransaccionesDesc = (transacciones) => {
  if (!Array.isArray(transacciones)) return transacciones;
  return [...transacciones].sort((a, b) => {
    const getVal = f => f ? (Array.isArray(f) ? new Date(f[0], f[1]-1, f[2]).getTime() : new Date(f).getTime()) : 0;
    return getVal(b.fecha || b.createdAt) - getVal(a.fecha || a.createdAt);
  });
};

export const transaccionesCompletasService = {
  // Get all complete transactions with optional filters
  getTransacciones: async (filters = {}) => {
    try {
      const response = await api.get('v1/transacciones', { params: filters });
      return sortTransaccionesDesc(response.data);
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get transactions by date range
  getTransaccionesPorRangoFechas: async (fechaInicio, fechaFin) => {
    try {
      const response = await api.get('v1/transacciones/rango-fechas', {
        params: {
          fechaInicio,
          fechaFin
        }
      });
      return sortTransaccionesDesc(response.data);
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get transactions by category (INGRESO/EGRESO)
  getTransaccionesPorCategoria: async (categoria) => {
    try {
      const response = await api.get(`v1/transacciones/categoria/${categoria}`);
      return sortTransaccionesDesc(response.data);
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get transactions by status
  getTransaccionesPorEstado: async (estado) => {
    try {
      const response = await api.get(`v1/transacciones/estado/${estado}`);
      return sortTransaccionesDesc(response.data);
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Search transactions with multiple filters
  buscarTransacciones: async (filters = {}) => {
    try {
      const response = await api.get('v1/transacciones/buscar', { params: filters });
      if (response.data && Array.isArray(response.data.transacciones)) {
        response.data.transacciones = sortTransaccionesDesc(response.data.transacciones);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get transactions by employee
  getTransaccionesPorEmpleado: async (empleado) => {
    try {
      const response = await api.get(`v1/transacciones/empleado/${empleado}`);
      return sortTransaccionesDesc(response.data);
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get transactions by type
  getTransaccionesPorTipo: async (tipo) => {
    try {
      const response = await api.get(`v1/transacciones/tipo/${tipo}`);
      return sortTransaccionesDesc(response.data);
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get transactions by vehicle
  getTransaccionesPorVehiculo: async (placa) => {
    try {
      const response = await api.get(`v1/transacciones/vehiculo/${placa}`);
      return sortTransaccionesDesc(response.data);
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get financial statistics
  getEstadisticas: async () => {
    try {
      const response = await api.get('v1/transacciones/estadisticas');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get Excel view for current month sales
  getVistaExcelMesActual: async () => {
    try {
      const response = await api.get('vista-excel-ventas-mes-completa/mes-actual');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get Excel view for specific month and year
  getVistaExcelMesEspecifico: async (anio, mes) => {
    try {
      const response = await api.get(`vista-excel-ventas-mes-completa/${anio}/${mes}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Eliminar transacción
  eliminarTransaccion: async (id) => {
    try {
      const response = await api.delete(`transacciones-financieras/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Reembolsar transacción
  reembolsarTransaccion: async (id) => {
    try {
      const response = await api.post(`transacciones-financieras/reembolso/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default transaccionesCompletasService;
