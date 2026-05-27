import api from './axios';

const reportesService = {
  generarReporteInventario: async (params = {}) => {
    const response = await api.get('/api/inventario/exportar', { 
      params,
      responseType: 'blob' 
    });
    return response.data;
  },

  generarReporteVentas: async (params = {}) => {
    const response = await api.get('/api/v1/transacciones/exportar', { 
      params: { ...params, tipo: 'VENTA' },
      responseType: 'blob' 
    });
    return response.data;
  },

  generarReporteFinanciero: async (params = {}) => {
    const response = await api.get('/api/analisis-financiero/exportar', { 
      params,
      responseType: 'blob' 
    });
    return response.data;
  },

  generarReporteVehiculos: async (params = {}) => {
    const response = await api.get('/api/v1/vehiculos/exportar', { 
      params,
      responseType: 'blob' 
    });
    return response.data;
  },

  getReporteRepuestosMensual: async (params = {}) => {
    const response = await api.get('/transacciones-financieras/reporte-repuestos', { params });
    return response.data;
  },

  descargarArchivo: (blob, filename) => {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  }
};

export default reportesService;
