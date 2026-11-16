import { useQuery, useMutation, useQueryClient } from 'react-query';
import rolesService from '../api/roles';

export const ROLES_QUERY_KEY = ['roles'];
export const PERMISOS_QUERY_KEY = (rolId) => ['permisos', rolId];

/**
 * Hook para consultar todos los roles disponibles con caché en React Query
 * @param {object} options Opciones adicionales para useQuery
 */
export function useRoles(options = {}) {
  return useQuery(
    ROLES_QUERY_KEY,
    async () => {
      const res = await rolesService.getRoles();
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      ...options
    }
  );
}

/**
 * Hook para consultar los permisos de un rol específico
 * @param {number|string} rolId ID del rol
 * @param {object} options Opciones adicionales para useQuery
 */
export function usePermisosByRol(rolId, options = {}) {
  return useQuery(
    PERMISOS_QUERY_KEY(rolId),
    async () => {
      if (!rolId) return [];
      const res = await rolesService.getPermisosByRol(rolId);
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
    {
      enabled: Boolean(rolId),
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      ...options
    }
  );
}

/**
 * Hook para actualizar los permisos de un rol e invalidar la caché
 */
export function useUpdatePermiso() {
  const queryClient = useQueryClient();

  return useMutation(
    ({ rolId, submoduloId, permisosData }) =>
      rolesService.updatePermiso(rolId, submoduloId, permisosData),
    {
      onSuccess: (_, { rolId }) => {
        queryClient.invalidateQueries(PERMISOS_QUERY_KEY(rolId));
      }
    }
  );
}

export default useRoles;
