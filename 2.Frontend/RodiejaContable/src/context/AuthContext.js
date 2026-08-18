import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../api/auth';
import rolesService from '../api/roles';

// Crear el contexto
export const AuthContext = createContext(null);

// Proveedor de autenticación
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPermissions = async (rolId) => {
    try {
      if (!rolId) return;
      const response = await rolesService.getPermisosByRol(rolId);
      const data = response.data || [];
      const permMap = {};
      data.forEach(mod => {
        mod.submodulos.forEach(sub => {
          permMap[sub.clave] = sub.canView;
        });
      });
      setPermissions(permMap);
    } catch (err) {
      console.error('Error al cargar permisos:', err);
    }
  };

  // Cargar el usuario al iniciar la aplicación
  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const storedUser = authService.getCurrentUser();

      // Si hay token pero no hay usuario, forzar el cierre de sesión
      if (token && !storedUser) {
        console.log('Token encontrado pero sin usuario, cerrando sesión...');
        authService.logout();
        setUser(null);
        setPermissions({});
        return null;
      }

      // Si hay usuario, actualizar el estado
      if (storedUser) {
        setUser(storedUser);
        if (storedUser.rolId) {
          await fetchPermissions(storedUser.rolId);
        } else {
          // Fallback genérico para usuarios sin rolId en localStorage
          const rolesRes = await rolesService.getRoles();
          const rolesData = rolesRes.data || [];
          const userRole = rolesData.find(r => r.nombre === storedUser.rol);
          if (userRole) {
            // Actualizar el localStorage para futuras recargas
            const updatedUser = { ...storedUser, rolId: userRole.id };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            await fetchPermissions(userRole.id);
          }
        }
        return storedUser;
      }

      return null;
    } catch (err) {
      console.error('Error al cargar el usuario:', err);
      // En caso de error, limpiar la autenticación
      authService.logout();
      setUser(null);
      setPermissions({});
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
        nombre: response.nombre,
        rolId: response.rolId
      };

      setUser(loggedUser);
      localStorage.setItem('user', JSON.stringify(loggedUser));

      if (loggedUser.rolId) {
        await fetchPermissions(loggedUser.rolId);
      }

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
      authService.logout();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');

      // Limpiar el estado del usuario
      setUser(null);
      setPermissions({});

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

  const hasAccess = (clave) => {
    if (user?.rol === 'ADMIN') return true; // El admin siempre tiene acceso a todo
    return !!permissions[clave];
  };

  // Valor del contexto
  const contextValue = {
    user,
    setUser,
    permissions,
    hasAccess,
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
