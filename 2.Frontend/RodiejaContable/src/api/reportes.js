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

  getReporteVehiculosMensual: async (params = {}) => {
    const response = await api.get('/transacciones-financieras/reporte-vehiculos', { params });
    return response.data;
  },

  getResumenInventarioCritico: async () => {
    const response = await api.get('/inventario-critico/resumen');
    return response.data;
  },

  getEstadisticasRepuestos: async () => {
    const response = await api.get('/dashboard/ejecutivo/estadisticas-repuestos');
    return response.data;
  },

  getEstadisticasVehiculos: async () => {
    const response = await api.get('/dashboard/ejecutivo/estadisticas-vehiculos');
    return response.data;
  },

  // ROD-13: Obtener oportunidades de Audatex con filtros
  obtenerOportunidadesAudatex: async (params = {}) => {
    const response = await api.get('/audatex/oportunidades', { params });
    return response.data;
  },

  // ROD-17: Exportar oportunidades de Audatex InPart a Excel
  exportarOportunidadesAudatex: async (params = {}) => {
    const response = await api.get('/audatex/oportunidades/export', {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // ROD-20: Obtener oportunidades de Audatex para un repuesto específico
  obtenerOportunidadesPorRepuesto: async (repuestoId) => {
    const response = await api.get(`/audatex/oportunidades/por-repuesto/${repuestoId}`);
    return response.data;
  },

  // ROD-24: Obtener envíos de cotizaciones de Audatex para un repuesto específico
  obtenerEnviosPorRepuesto: async (repuestoId) => {
    const response = await api.get(`/audatex/envios/por-repuesto/${repuestoId}`);
    return response.data;
  },

  // Invalidar caché de Audatex
  invalidarCacheAudatex: async () => {
    const response = await api.post('/audatex/cache/invalidar');
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
