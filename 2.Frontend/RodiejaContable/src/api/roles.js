import api from './axios';

const rolesService = {
  getRoles: async () => {
    return await api.get('/roles');
  },
  
  getPermisosByRol: async (rolId) => {
    return await api.get(`/roles/${rolId}/permisos`);
  },
  
  updatePermiso: async (rolId, submoduloId, permisosData) => {
    return await api.put(`/roles/${rolId}/permisos/${submoduloId}`, permisosData);
  }
};

export default rolesService;
