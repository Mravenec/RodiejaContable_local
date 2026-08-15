import axios from './axios';

export const audatexAPI = {
  // Obtener todas las oportunidades activas, opcionalmente filtradas
  obtenerOportunidades: (params) => {
    return axios.get('/audatex/oportunidades', { params, timeout: 60000 });
  },

  // Obtener oportunidades de la BD local (sync) — carga instantánea, acepta filtros
  obtenerOportunidadesSync: (params) => {
    return axios.get('/audatex/oportunidades/sync', { params, timeout: 60000 });
  },

  // Obtener la lista de pedidos audatex
  obtenerPedidos: () => {
    return axios.get('/audatex/pedidos');
  },

  // Disparar sincronización incremental de 30 días en background
  syncIncremental: () => {
    return axios.post('/audatex/oportunidades/sync/incremental', null, { timeout: 15000 });
  },

  // Obtener oportunidades activas para un repuesto específico
  obtenerPorRepuesto: (repuestoId) => {
    return axios.get(`/audatex/oportunidades/por-repuesto/${repuestoId}`, { timeout: 60000 });
  },

  // Obtener la cantidad de oportunidades activas para todos los repuestos en stock (batch)
  obtenerOportunidadesBatch: () => {
    return axios.get('/audatex/oportunidades/batch', { timeout: 60000 });
  },

  // Obtener historial de envíos de cotizaciones para un repuesto específico
  obtenerEnviosPorRepuesto: (repuestoId) => {
    return axios.get(`/audatex/envios/por-repuesto/${repuestoId}`);
  },

  // Enviar una cotización al portal de Audatex
  enviarCotizacion: (data) => {
    return axios.post('/audatex/pedidos', data, { timeout: 60000 });
  },

  // Invalidar caché (forzar sincronización)
  invalidarCache: () => {
    return axios.post('/audatex/cache/invalidar');
  },

  // Obtener estado de la integración
  obtenerStatus: () => {
    return axios.get('/audatex/status');
  },

  // Obtener exportación Excel XLSX
  exportarExcelUrl: (params) => {
    const query = new URLSearchParams(params).toString();
    return `http://localhost:8080/api/audatex/oportunidades/export${query ? '?' + query : ''}`;
  },

  // Descargar exportación Excel XLSX como blob
  exportarExcel: (params) => {
    return axios.get('/audatex/oportunidades/export', {
      params,
      responseType: 'blob',
      timeout: 60000
    });
  }
};

export default audatexAPI;
