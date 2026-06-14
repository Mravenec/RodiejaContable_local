import { useQuery, useMutation, useQueryClient } from 'react-query';
import { message } from 'antd';
import { partesVehiculoAPI } from '../api/partesVehiculo';

export function usePartesVehiculo() {
  const queryClient = useQueryClient();
  
  // Query para obtener todas las partes activas
  const partesActivasQuery = useQuery(
    'partesVehiculoActivas',
    async () => {
      try {
        const response = await partesVehiculoAPI.getActivos();
        return response.data;
      } catch (error) {
        console.error('Error fetching partes vehiculo activas:', error);
        message.error('Error al cargar las partes de vehículo');
        throw error;
      }
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 30 * 60 * 1000, // 30 minutos
      refetchOnWindowFocus: false,
    }
  );

  // Query para obtener todas las partes (mantenimiento)
  const partesAllQuery = useQuery(
    'partesVehiculoAll',
    async () => {
      try {
        const response = await partesVehiculoAPI.getAll();
        return response.data;
      } catch (error) {
        console.error('Error fetching todas partes vehiculo:', error);
        message.error('Error al cargar las partes de vehículo');
        throw error;
      }
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      // Solo cargar si es necesario (se puede habilitar desde el componente si se requiere)
      enabled: false 
    }
  );

  // Mutación para crear
  const createParteVehiculo = useMutation(
    (nuevaParte) => partesVehiculoAPI.create(nuevaParte),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('partesVehiculoActivas');
        queryClient.invalidateQueries('partesVehiculoAll');
        message.success('Parte de vehículo creada exitosamente');
      },
      onError: (error) => {
        console.error('Error creating parte vehiculo:', error);
        const errorMessage = error.response?.data?.message || 'Error al crear la parte de vehículo';
        message.error(errorMessage);
      }
    }
  );

  // Mutación para actualizar
  const updateParteVehiculo = useMutation(
    ({ id, ...data }) => partesVehiculoAPI.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('partesVehiculoActivas');
        queryClient.invalidateQueries('partesVehiculoAll');
        message.success('Parte de vehículo actualizada exitosamente');
      },
      onError: (error) => {
        console.error('Error updating parte vehiculo:', error);
        const errorMessage = error.response?.data?.message || 'Error al actualizar la parte de vehículo';
        message.error(errorMessage);
      }
    }
  );

  return {
    ...partesActivasQuery, // Expone isLoading, data, etc. del query de activos por defecto
    partesActivasQuery,
    partesAllQuery,
    createParteVehiculo,
    createParteVehiculoMutation: createParteVehiculo,
    updateParteVehiculo,
    updateParteVehiculoMutation: updateParteVehiculo
  };
}
