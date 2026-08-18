import api from './axios';

export const usersService = {
  getUsers: async () => {
    return await api.get('/users');
  },
  createUser: async (userData) => {
    try {
      const response = await api.post('/users', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.response?.data || error.message;
    }
  },
  deleteUser: async (id) => {
    try {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.response?.data || error.message;
    }
  }
};

export default usersService;
