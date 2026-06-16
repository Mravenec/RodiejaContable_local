import api from './axios';

export const usersService = {
  createUser: async (userData) => {
    try {
      const response = await api.post('/users', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.response?.data || error.message;
    }
  }
};

export default usersService;
