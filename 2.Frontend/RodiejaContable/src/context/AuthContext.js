import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../api/auth';

// Crear el contexto
export const AuthContext = createContext();

// Proveedor de autenticación
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar el usuario al iniciar la aplicación
  const loadUser = useCallback(() => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const user = authService.getCurrentUser();
      
      // Si hay token pero no hay usuario, forzar el cierre de sesión
      if (token && !user) {
        console.log('Token encontrado pero sin usuario, cerrando sesión...');
        authService.logout();
        setUser(null);
        return null;
      }
      
      // Si hay usuario, actualizar el estado
      if (user) {
        setUser(user);
        return user;
      }
      
      return null;
    } catch (err) {
      console.error('Error al cargar el usuario:', err);
      // En caso de error, limpiar la autenticación
      authService.logout();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificar si hay un usuario autenticado al cargar la aplicación
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.login(userData);
      
      // authService.login ya guarda el token y el usuario en localStorage
      const loggedUser = {
        email: response.email,
        rol: response.rol,
        nombre: response.nombre
      };
      
      setUser(loggedUser);
      localStorage.setItem('user', JSON.stringify(loggedUser));
      
      return response;
    } catch (err) {
      console.error('Error en login:', err);
      setError(err.message || 'Error en la autenticación');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Cerrar sesión
  const logout = useCallback(() => {
    console.log('Ejecutando logout...');
    try {
      // Limpiar solo los datos de autenticación
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      
      // Limpiar el estado del usuario
      setUser(null);
      
      // Devolver una promesa resuelta
      return Promise.resolve();
    } catch (error) {
      console.error('Error al limpiar datos de autenticación:', error);
      return Promise.reject(error);
    }
  }, []);

  // Verificar si el usuario está autenticado
  const isAuthenticated = useCallback(() => {
    // Verificar si hay token válido. No depender estrictamente del estado 'user'
    // porque las actualizaciones de estado de React pueden ser asíncronas y causar
    // redirecciones prematuras a /login inmediatamente después del inicio de sesión.
    return authService.isAuthenticated();
  }, []);

  // Verificar si el usuario tiene un rol específico
  const hasRole = useCallback((role) => {
    return user?.role === role;
  }, [user]);

  // Valor del contexto
  const contextValue = {
    user,
    setUser,
    loading,
    error,
    login,
    logout,
    isAuthenticated,
    hasRole,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto de autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
