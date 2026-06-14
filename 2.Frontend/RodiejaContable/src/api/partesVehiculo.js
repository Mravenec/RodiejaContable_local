import axios from './axios';

export const partesVehiculoAPI = {
  // Obtener todas las partes activas (para llenado de selects)
  getActivos: () => {
    return axios.get('/partes-vehiculo/activos');
  },
  
  // Obtener todas las partes (activas e inactivas, para mantenimiento)
  getAll: () => {
    return axios.get('/partes-vehiculo');
  },
  
  // Obtener parte por ID
  getById: (id) => {
    return axios.get(`/partes-vehiculo/${id}`);
  },
  
  // Crear nueva parte
  create: (data) => {
    return axios.post('/partes-vehiculo', data);
  },
  
  // Actualizar parte
  update: (id, data) => {
    return axios.put(`/partes-vehiculo/${id}`, data);
  },
  
  // Eliminar parte (borrado lógico)
  delete: (id) => {
    return axios.delete(`/partes-vehiculo/${id}`);
  }
};

export default partesVehiculoAPI;
