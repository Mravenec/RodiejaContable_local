import { useState, useEffect } from 'react';
import rolesService from '../api/roles';
import { useAuth } from '../context/AuthContext';

export const usePermissions = (submoduloClave) => {
  const { user, permissions: contextPermissions = {} } = useAuth();
  const [permissions, setPermissions] = useState({
    canView: user?.rol === 'ADMIN',
    canCreate: user?.rol === 'ADMIN',
    canEdit: user?.rol === 'ADMIN',
    canDelete: user?.rol === 'ADMIN',
    loading: user?.rol !== 'ADMIN'
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

      // Si AuthContext ya cargó los permisos
      let targetClave = submoduloClave;
      if (submoduloClave === 'ins_pedidos' && !contextPermissions['ins_pedidos']) targetClave = 'audatex_pedidos';
      if (submoduloClave === 'ins_ventas_empleados' && !contextPermissions['ins_ventas_empleados']) targetClave = 'reportes_ventas';
      const ctxPerm = contextPermissions[targetClave];
      if (ctxPerm && typeof ctxPerm === 'object') {
        if (isMounted) {
          setPermissions({
            canView: !!ctxPerm.canView,
            canCreate: !!ctxPerm.canCreate,
            canEdit: !!ctxPerm.canEdit,
            canDelete: !!ctxPerm.canDelete,
            loading: false
          });
        }
        return;
      }

      try {
        const rolesRes = await rolesService.getRoles();
        const roles = rolesRes.data || [];
        const userRole = roles.find(r => r.nombre === user.rol);
        
        if (userRole) {
          const permisosRes = await rolesService.getPermisosByRol(userRole.id);
          const modulos = permisosRes.data || [];
          
          let found = false;
          for (const mod of modulos) {
            const sub = mod.submodulos?.find(s => s.clave === targetClave);
            if (sub) {
              if (isMounted) {
                setPermissions({
                  canView: !!sub.canView,
                  canCreate: !!sub.canCreate,
                  canEdit: !!sub.canEdit,
                  canDelete: !!sub.canDelete,
                  loading: false
                });
                found = true;
              }
              break;
            }
          }
          
          if (!found && isMounted) {
            setPermissions({ canView: false, canCreate: false, canEdit: false, canDelete: false, loading: false });
          }
        } else if (isMounted) {
          setPermissions({ canView: false, canCreate: false, canEdit: false, canDelete: false, loading: false });
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
  }, [user, submoduloClave, contextPermissions]);

  return permissions;
};

export default usePermissions;
