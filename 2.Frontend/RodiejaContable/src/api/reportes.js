import api from './axios';
import { MESES_NOMBRES } from '../utils/dateUtils';

/**
 * Extrae un mensaje de error limpio y legible desde la respuesta de la API.
 */
const formatearErrorApi = (error, mensajeDefecto = 'Error en el servicio de reportes') => {
  const detalle = error?.response?.data?.error || error?.response?.data?.message || error?.message;
  return detalle ? `${mensajeDefecto}: ${detalle}` : mensajeDefecto;
};

const reportesService = {
  // Constantes útiles
  MESES_NOMBRES,

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
    try {
      const response = await api.post('/reportes/email/repuestos', formData);
      return response.data;
    } catch (error) {
      throw new Error(formatearErrorApi(error, 'Error al enviar reporte de repuestos por correo'));
    }
  },

  // Enviar reporte de vehículos por correo electrónico con plantilla HTML y Excel adjunto
  enviarReporteVehiculosEmail: async (formData) => {
    try {
      const response = await api.post('/reportes/email/vehiculos', formData);
      return response.data;
    } catch (error) {
      throw new Error(formatearErrorApi(error, 'Error al enviar reporte de vehículos por correo'));
    }
  },

  // Enviar reporte de ventas por correo electrónico con plantilla HTML y Excel adjunto
  enviarReporteVentasEmail: async (formData) => {
    try {
      const response = await api.post('/reportes/email/ventas', formData);
      return response.data;
    } catch (error) {
      throw new Error(formatearErrorApi(error, 'Error al enviar reporte de ventas por correo'));
    }
  },

  // Enviar reporte de oportunidades de Audatex por correo electrónico
  enviarReporteAudatexEmail: async (formData) => {
    try {
      const response = await api.post('/reportes/email/audatex', formData);
      return response.data;
    } catch (error) {
      throw new Error(formatearErrorApi(error, 'Error al enviar reporte de Audatex por correo'));
    }
  },

  // Obtener la lista de correos de usuarios administradores activos
  getDestinatariosAdmin: async () => {
    try {
      const response = await api.get('/reportes/email/destinatarios-admin');
      return response.data;
    } catch (error) {
      console.warn('Error al obtener destinatarios administradores:', error);
      return [];
    }
  },

  // Enviar correo de prueba para verificar conexión SMTP
  enviarCorreoPrueba: async (email) => {
    try {
      const response = await api.post('/reportes/email/prueba', null, {
        params: { email }
      });
      return response.data;
    } catch (error) {
      throw new Error(formatearErrorApi(error, 'Error al enviar correo de prueba'));
    }
  },

  // Disparar manualmente la ejecución de los reportes mensuales automáticos
  dispararReportesMensualesAhora: async (periodo = null) => {
    try {
      const params = periodo ? { periodo } : {};
      const response = await api.post('/reportes/email/disparar-mensuales-ahora', null, { params });
      return response.data;
    } catch (error) {
      throw new Error(formatearErrorApi(error, 'Error al disparar reportes mensuales'));
    }
  },

  // Descargar Excel oficial generado por el Backend (3 hojas: Resumen + Vendidos + Movimientos)
  exportarExcelVehiculosBackend: async (params = {}, payload = null) => {
    if (payload) {
      const response = await api.post('/reportes/exportar/vehiculos', payload, {
        params,
        responseType: 'blob'
      });
      return response.data;
    }
    const response = await api.get('/reportes/exportar/vehiculos', {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  exportarExcelRepuestosBackend: async (params = {}, payload = null) => {
    if (payload) {
      const response = await api.post('/reportes/exportar/repuestos', payload, {
        params,
        responseType: 'blob'
      });
      return response.data;
    }
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

  /**
   * Helper unificado para construir los parámetros de rango de fecha para consultas y exportación backend.
   * Maneja periodos mensuales, anuales e históricos completos.
   *
   * @param {number|null} mes 1-12 o null
   * @param {number|null} anio año numérico o null
   * @returns {Object} { todos: true } o { fechaInicio: 'YYYY-MM-DD', fechaFin: 'YYYY-MM-DD' }
   */
  construirParamsRangoFechas: (mes = null, anio = null) => {
    if (!mes && !anio) {
      return { todos: true };
    }
    const anioVal = anio ? parseInt(anio, 10) : new Date().getFullYear();
    if (!mes) {
      return {
        fechaInicio: `${anioVal}-01-01`,
        fechaFin: `${anioVal}-12-31`
      };
    }
    const m = parseInt(mes, 10);
    const mesStr = String(m).padStart(2, '0');
    const ultimoDia = new Date(anioVal, m, 0).getDate();
    return {
      fechaInicio: `${anioVal}-${mesStr}-01`,
      fechaFin: `${anioVal}-${mesStr}-${String(ultimoDia).padStart(2, '0')}`
    };
  },

  /**
   * Genera de forma inteligente el nombre de archivo para reportes (.xlsx),
   * contemplando reportes mensuales, anuales e históricos completos.
   */
  obtenerNombreArchivoConMes: (prefijo, mes, anio) => {
    const fechaActual = new Date();
    // Caso 1: Histórico completo (sin mes y sin año)
    if (!mes && !anio) {
      return `${prefijo}_Historico_Completo.xlsx`;
    }
    // Caso 2: Reporte anual (año especificado pero sin mes)
    if (!mes && anio) {
      return `${prefijo}_Anio_${anio}.xlsx`;
    }
    // Caso 3: Reporte mensual (mes especificado)
    const mesIndex = (typeof mes === 'number' && mes >= 1 && mes <= 12)
      ? mes - 1
      : fechaActual.getMonth();
    const anioVal = anio || fechaActual.getFullYear();
    const nombreMes = MESES_NOMBRES[mesIndex];
    return `${prefijo}_${nombreMes}_${anioVal}.xlsx`;
  },

  /**
   * Extrae el nombre de archivo enviado en los encabezados Content-Disposition del backend.
   */
  extraerNombreArchivoDeHeaders: (headers, fallbackFilename) => {
    try {
      const disposition = headers?.['content-disposition'] || headers?.['Content-Disposition'];
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          return match[1].replace(/['"]/g, '').trim();
        }
      }
    } catch (_) {}
    return fallbackFilename;
  },

  /**
   * Descarga un archivo Blob en el navegador y revoca el ObjectURL para evitar fugas de memoria.
   */
  descargarArchivo: (blob, filename) => {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);

    // Liberar la URL de memoria tras la descarga
    setTimeout(() => {
      try {
        window.URL.revokeObjectURL(url);
      } catch (_) {}
    }, 1000);
  }
};

export default reportesService;
