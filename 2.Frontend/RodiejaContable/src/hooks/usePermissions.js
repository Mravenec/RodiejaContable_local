import { useState, useEffect } from 'react';
import rolesService from '../api/roles';
import { useAuth } from '../context/AuthContext';

export const usePermissions = (submoduloClave) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState({
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    loading: true
  });

  useEffect(() => {
    let isMounted = true;
    
    const loadPermisos = async () => {
      if (!user || !user.rol) {
        if (isMounted) setPermissions(prev => ({ ...prev, loading: false }));
        return;
      }

      // El usuario actual es ADMIN, por seguridad tiene todo permitido
      if (user.rol === 'ADMIN') {
        if (isMounted) {
          setPermissions({
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: true,
            loading: false
          });
        }
        return;
      }

      try {
        // En un caso real, el backend podría enviar los permisos en el login.
        // Aquí hacemos el match buscando el rolId basado en el nombre.
        const rolesRes = await rolesService.getRoles();
        const roles = rolesRes.data || [];
        const userRole = roles.find(r => r.nombre === user.rol);
        
        if (userRole) {
          const permisosRes = await rolesService.getPermisosByRol(userRole.id);
          const modulos = permisosRes.data || [];
          
          let found = false;
          for (const mod of modulos) {
            const sub = mod.submodulos?.find(s => s.clave === submoduloClave);
            if (sub) {
              if (isMounted) {
                setPermissions({
                  canView: sub.canView,
                  canCreate: sub.canCreate,
                  canEdit: sub.canEdit,
                  canDelete: sub.canDelete,
                  loading: false
                });
                found = true;
              }
              break;
            }
          }
          
          if (!found && isMounted) {
            setPermissions(prev => ({ ...prev, loading: false }));
          }
        } else if (isMounted) {
          setPermissions(prev => ({ ...prev, loading: false }));
        }
      } catch (err) {
        console.error("Error al cargar permisos", err);
        if (isMounted) setPermissions(prev => ({ ...prev, loading: false }));
      }
    };

    loadPermisos();
    
    return () => {
      isMounted = false;
    };
  }, [user, submoduloClave]);

  return permissions;
};

export default usePermissions;
