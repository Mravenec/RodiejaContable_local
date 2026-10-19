import axios from './axios';

export const insAPI = {
  // Obtener todos los pedidos INS
  obtenerPedidos: (params) => {
    return axios.get('/ins/pedidos', { params });
  },

  // Obtener un pedido específico por ID
  obtenerPedidoPorId: (id) => {
    return axios.get(`/ins/pedidos/${id}`);
  },

  // Crear un nuevo pedido INS
  crearPedido: (data) => {
    return axios.post('/ins/pedidos', data);
  },

  // Actualizar un pedido INS existente
  actualizarPedido: (id, data) => {
    return axios.put(`/ins/pedidos/${id}`, data);
  },

  // Marcar un pedido como entregado
  marcarComoEntregado: (id) => {
    return axios.put(`/ins/pedidos/${id}/entregar`);
  },

  // Obtener comisiones por empleado
  obtenerComisiones: (params) => {
    return axios.get('/ins/comisiones', { params });
  },

  // Obtener estadísticas generales de comisiones
  obtenerEstadisticas: (params) => {
    return axios.get('/ins/comisiones/estadisticas', { params });
  },
};

export default insAPI;
