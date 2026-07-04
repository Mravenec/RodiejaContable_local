import { useQuery, useMutation, useQueryClient } from 'react-query';
import { message } from 'antd';
import vehiculoService from '../api/vehiculos';

export function useVehiculos(params = {}) {
  return useQuery(
    ['vehiculos_vista', params],
    async () => {
      try {
        const data = await vehiculoService.getVehiculosCompletos(params);
        
        // Sort vehicles in the specified order: DISPONIBLE > REPARACION > DESARMADO > VENDIDO
        if (Array.isArray(data)) {
          // Debug: Log unique status values
          const uniqueStatuses = [...new Set(data.map(v => v.estado))];
          console.log('Unique status values in data:', uniqueStatuses);
          
          // Normalize status values to uppercase to handle any case sensitivity
          const statusOrder = {
            'DISPONIBLE': 1,
            'REPARACION': 2,
            'DESARMADO': 3,
            'VENDIDO': 4
          };
          
          return [...data].sort((a, b) => {
            const statusA = (a.estado || '').toUpperCase();
            const statusB = (b.estado || '').toUpperCase();
            const orderA = statusOrder[statusA] || 5; // Default to end if status not in list
            const orderB = statusOrder[statusB] || 5;
            
            console.log(`Comparing ${statusA} (${orderA}) with ${statusB} (${orderB})`);
            return orderA - orderB;
          });
        }
        
        return data;
      } catch (error) {
        console.error('Error in useVehiculos:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          params
        });
        throw error;
      }
    },
    {
      onError: (error) => {
        const errorMessage = error.response?.data?.message || 'Error al cargar los vehículos';
        message.error(errorMessage);
        console.error('Error en useVehiculos:', error);
      },
      retry: 1,
      refetchOnWindowFocus: false
    }
  );
}

export function useVehiculo(id) {
  return useQuery(
    ['vehiculo', id],
    () => vehiculoService.getVehiculoPorId(id),
    {
      enabled: !!id,
      onError: (error) => {
        message.error('Error al cargar el vehículo');
        console.error('Error en useVehiculo:', error);
      },
    }
  );
}

export function useCreateVehiculo(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, onSettled } = options;
  
  return useMutation(
    (vehiculoData) => {
      console.log('Enviando datos al servidor:', vehiculoData);
      return vehiculoService.crearVehiculo(vehiculoData);
    },
    {
      onSuccess: (data, variables, context) => {
        message.success('Vehículo creado correctamente');
        queryClient.invalidateQueries('vehiculos');
        // Llamar al callback onSuccess si existe
        if (onSuccess) {
          onSuccess(data, variables, context);
        }
      },
      onError: (error, variables, context) => {
        const errorMessage = error.response?.data?.message || 'Error al crear el vehículo';
        console.error('Error en useCreateVehiculo:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        message.error(errorMessage);
        // Llamar al callback onError si existe
        if (onError) {
          onError(error, variables, context);
        }
      },
      onSettled: (data, error, variables, context) => {
        // Llamar al callback onSettled si existe
        if (onSettled) {
          onSettled(data, error, variables, context);
        }
      }
    }
  );
}

export function useUpdateVehiculo(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, onSettled } = options;
  
  return useMutation(
    ({ id, ...vehiculoData }) => vehiculoService.actualizarVehiculo(id, vehiculoData),
    {
      onSuccess: (data, variables, context) => {
        message.success('Vehículo actualizado correctamente');
        queryClient.invalidateQueries(['vehiculo', variables.id]);
        queryClient.invalidateQueries('vehiculos');
        // Llamar al callback onSuccess si existe
        if (onSuccess) {
          onSuccess(data, variables, context);
        }
      },
      onError: (error, variables, context) => {
        const errorMessage = error.response?.data?.message || 'Error al actualizar el vehículo';
        console.error('Error en useUpdateVehiculo:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        message.error(errorMessage);
        // Llamar al callback onError si existe
        if (onError) {
          onError(error, variables, context);
        }
      },
      onSettled: (data, error, variables, context) => {
        // Llamar al callback onSettled si existe
        if (onSettled) {
          onSettled(data, error, variables, context);
        }
      }
    }
  );
}
