// Export all API services for easy importing

// Core
import axios from 'axios';

// Import services
import dashboardService from './dashboard';
import vehiculoService from './vehiculos';
import inventarioService from './inventario';
import authService from './auth';
import finanzaService from './finanzas';
import generacionesService from './generaciones';
import partesVehiculoService from './partesVehiculo';

// Configuración global de axios
const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // Para manejar cookies de autenticación
});

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // El servidor respondió con un estado de error
      console.error('Error de respuesta del servidor:', error.response.status, error.response.data);
      return Promise.reject({
        status: error.response.status,
        message: error.response.data?.message || 'Error en la solicitud',
        data: error.response.data
      });
    } else if (error.request) {
      // La solicitud fue hecha pero no se recibió respuesta
      console.error('No se recibió respuesta del servidor:', error.request);
      return Promise.reject({
        message: 'No se pudo conectar con el servidor. Por favor, verifica tu conexión.'
      });
    } else {
      // Error al configurar la solicitud
      console.error('Error al configurar la solicitud:', error.message);
      return Promise.reject({
        message: 'Error al procesar la solicitud.'
      });
    }
  }
);

// Interceptor para agregar el token de autenticación a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Exportar instancia de axios configurada
export { api };

// Export services
export {
  dashboardService,
  vehiculoService,
  inventarioService,
  authService,
  finanzaService,
  generacionesService,
  partesVehiculoService
};

// Default export
const apiServices = {
  dashboardService,
  vehiculoService,
  inventarioService,
  authService,
  finanzaService,
  generacionesService,
  partesVehiculoService,
  api
};

export default apiServices;
