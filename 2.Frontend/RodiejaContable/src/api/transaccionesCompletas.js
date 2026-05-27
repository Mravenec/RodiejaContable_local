import api from './axios';

export const transaccionesCompletasService = {
  // Get all complete transactions with optional filters
  getTransacciones: async (filters = {}) => {
    try {
      const response = await api.get('v1/transacciones', { params: filters });
      return response.data;
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
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get transactions by category (INGRESO/EGRESO)
  getTransaccionesPorCategoria: async (categoria) => {
    try {
      const response = await api.get(`v1/transacciones/categoria/${categoria}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get transactions by status
  getTransaccionesPorEstado: async (estado) => {
    try {
      const response = await api.get(`v1/transacciones/estado/${estado}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Search transactions with multiple filters
  buscarTransacciones: async (filters = {}) => {
    try {
      const response = await api.get('v1/transacciones/buscar', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get transactions by employee
  getTransaccionesPorEmpleado: async (empleado) => {
    try {
      const response = await api.get(`v1/transacciones/empleado/${empleado}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get transactions by type
  getTransaccionesPorTipo: async (tipo) => {
    try {
      const response = await api.get(`v1/transacciones/tipo/${tipo}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get transactions by vehicle
  getTransaccionesPorVehiculo: async (placa) => {
    try {
      const response = await api.get(`v1/transacciones/vehiculo/${placa}`);
      return response.data;
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
