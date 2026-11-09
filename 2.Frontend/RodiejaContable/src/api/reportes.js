import api from './axios';

const reportesService = {
  generarReporteInventario: async (params = {}) => {
    const response = await api.get('/inventario/exportar', { 
      params,
      responseType: 'blob' 
    });
    return response.data;
  },

  generarReporteVentas: async (params = {}) => {
    const response = await api.get('/v1/transacciones/exportar', { 
      params: { ...params, tipo: 'VENTA' },
      responseType: 'blob' 
    });
    return response.data;
  },

  generarReporteFinanciero: async (params = {}) => {
    const response = await api.get('/analisis-financiero/exportar', { 
      params,
      responseType: 'blob' 
    });
    return response.data;
  },

  generarReporteVehiculos: async (params = {}) => {
    const response = await api.get('/v1/vehiculos/exportar', { 
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

  // Enviar reporte de repuestos por correo electrónico con plantilla HTML y Excel adjunto
  enviarReporteRepuestosEmail: async (formData) => {
    const response = await api.post('/reportes/email/repuestos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Enviar reporte de vehículos por correo electrónico con plantilla HTML y Excel adjunto
  enviarReporteVehiculosEmail: async (formData) => {
    const response = await api.post('/reportes/email/vehiculos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Enviar reporte de ventas por correo electrónico con plantilla HTML y Excel adjunto
  enviarReporteVentasEmail: async (formData) => {
    const response = await api.post('/reportes/email/ventas', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Enviar reporte de oportunidades de Audatex por correo electrónico
  enviarReporteAudatexEmail: async (formData) => {
    const response = await api.post('/reportes/email/audatex', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Obtener la lista de correos de usuarios administradores activos
  getDestinatariosAdmin: async () => {
    const response = await api.get('/reportes/email/destinatarios-admin');
    return response.data;
  },

  // Enviar correo de prueba para verificar conexión SMTP
  enviarCorreoPrueba: async (email) => {
    const response = await api.post('/reportes/email/prueba', null, {
      params: { email }
    });
    return response.data;
  },

  // Disparar manualmente la ejecución de los reportes mensuales automáticos
  dispararReportesMensualesAhora: async (periodo = null) => {
    const params = periodo ? { periodo } : {};
    const response = await api.post('/reportes/email/disparar-mensuales-ahora', null, { params });
    return response.data;
  },

  // Descargar Excel oficial generado por el Backend (Fuente Única de Verdad con estilos y colapsables)
  exportarExcelVehiculosBackend: async (params = {}) => {
    const response = await api.get('/reportes/exportar/vehiculos', {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  exportarExcelRepuestosBackend: async (params = {}) => {
    const response = await api.get('/reportes/exportar/repuestos', {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  exportarExcelVentasBackend: async (params = {}) => {
    const response = await api.get('/reportes/exportar/ventas', {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  exportarExcelJerarquiaBackend: async (data = null, params = {}) => {
    if (data && Array.isArray(data) && data.length > 0) {
      const response = await api.post('/reportes/exportar/jerarquia', data, {
        params,
        responseType: 'blob'
      });
      return response.data;
    }
    const response = await api.get('/reportes/exportar/jerarquia', {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  obtenerNombreArchivoConMes: (prefijo, mes, anio) => {
    const nombreMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const fechaActual = new Date();
    const mesIndex = (typeof mes === 'number' && mes >= 1 && mes <= 12)
      ? mes - 1
      : fechaActual.getMonth();
    const anioVal = anio || fechaActual.getFullYear();
    const nombreMes = nombreMeses[mesIndex];
    return `${prefijo}_${nombreMes}_${anioVal}.xlsx`;
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
