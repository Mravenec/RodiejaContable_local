import { useQuery, useMutation, useQueryClient } from 'react-query';
import usersService from '../api/users';

export const USERS_QUERY_KEY = ['users'];

/**
 * Hook para obtener la lista de usuarios con caché automática en React Query.
 * Elimina la necesidad de repetir `useState` + `useEffect` en cada componente.
 * @param {object} options Opciones adicionales para useQuery
 */
export function useUsers(options = {}) {
  return useQuery(
    USERS_QUERY_KEY,
    async () => {
      const res = await usersService.getUsers();
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutos de caché
      refetchOnWindowFocus: false,
      ...options
    }
  );
}

/**
 * Hook para crear un nuevo usuario con invalidación automática de la caché de usuarios.
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation(
    (userData) => usersService.createUser(userData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(USERS_QUERY_KEY);
      }
    }
  );
}

/**
 * Hook para eliminar un usuario con invalidación automática de la caché de usuarios.
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation(
    (id) => usersService.deleteUser(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(USERS_QUERY_KEY);
      }
    }
  );
}

/**
 * Hook para actualizar el rol de un usuario con invalidación automática de la caché.
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation(
    ({ id, roleName }) => usersService.updateUserRole(id, roleName),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(USERS_QUERY_KEY);
      }
    }
  );
}

export default useUsers;
