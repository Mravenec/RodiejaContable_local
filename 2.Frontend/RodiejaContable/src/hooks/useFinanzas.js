import { useQuery, useMutation, useQueryClient } from 'react-query';
import { message } from 'antd';
import finanzasService from '../api/finanzas';

export function useTransacciones(params = {}) {
  return useQuery(
    ['transacciones', params],
    () => finanzasService.getTransacciones(params),
    {
      onError: (error) => {
        message.error('Error al cargar las transacciones');
        console.error('Error en useTransacciones:', error);
      },
    }
  );
}

export function useTransaccion(id) {
  return useQuery(
    ['transaccion', id],
    () => finanzasService.getTransaccionById(id),
    {
      enabled: !!id,
      onError: (error) => {
        message.error('Error al cargar la transacción');
        console.error('Error en useTransaccion:', error);
      },
    }
  );
}

export function useCreateTransaccion(options = {}) {
  const queryClient = useQueryClient();
  
  return useMutation(
    (transaccionData) => finanzasService.createTransaccion(transaccionData),
    {
      onSuccess: (data, variables, context) => {
        // Invalidar queries
        queryClient.invalidateQueries('transacciones');
        queryClient.invalidateQueries('resumenFinanciero');
        queryClient.invalidateQueries('vehiculosActivos');
        
        // Llamar al onSuccess personalizado si existe
        if (options.onSuccess) {
          options.onSuccess(data, variables, context);
        } else {
          // Mensaje por defecto si no hay onSuccess personalizado
          message.success('Transacción creada correctamente');
        }
      },
      onError: (error) => {
        message.error('Error al crear la transacción');
        console.error('Error en useCreateTransaccion:', error);
      },
    }
  );
}

export function useUpdateTransaccion() {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ id, ...transaccionData }) => finanzasService.updateTransaccion(id, transaccionData),
    {
      onSuccess: (_, variables) => {
        message.success('Transacción actualizada correctamente');
        queryClient.invalidateQueries(['transaccion', variables.id]);
        queryClient.invalidateQueries('transacciones');
        queryClient.invalidateQueries('resumenFinanciero');
        queryClient.invalidateQueries('vehiculos_vista');
        queryClient.invalidateQueries('vehiculosActivos');
        queryClient.invalidateQueries('generaciones');
      },
      onError: (error) => {
        message.error('Error al actualizar la transacción');
        console.error('Error en useUpdateTransaccion:', error);
      },
    }
  );
}

export function useDeleteTransaccion() {
  const queryClient = useQueryClient();
  
  return useMutation(
    (id) => finanzasService.deleteTransaccion(id),
    {
      onSuccess: () => {
        message.success('Transacción eliminada correctamente');
        queryClient.invalidateQueries('transacciones');
        queryClient.invalidateQueries('resumenFinanciero');
        queryClient.invalidateQueries('vehiculos_vista');
        queryClient.invalidateQueries('vehiculosActivos');
        queryClient.invalidateQueries('generaciones');
      },
      onError: (error) => {
        message.error('Error al eliminar la transacción');
        console.error('Error en useDeleteTransaccion:', error);
      },
    }
  );
}

export function useResumenFinanciero(params = {}) {
  return useQuery(
    ['resumenFinanciero', params],
    () => finanzasService.getResumenFinanciero(params),
    {
      onError: (error) => {
        message.error('Error al cargar el resumen financiero');
        console.error('Error en useResumenFinanciero:', error);
      },
    }
  );
}

export function useVentasPorEmpleado(params = {}) {
  return useQuery(
    ['ventasPorEmpleado', params],
    () => finanzasService.getVentasPorEmpleado(params),
    {
      onError: (error) => {
        message.error('Error al cargar las ventas por empleado');
        console.error('Error en useVentasPorEmpleado:', error);
      },
    }
  );
}

export function useProductosMasVendidos(params = {}) {
  return useQuery(
    ['productosMasVendidos', params],
    () => finanzasService.getProductosMasVendidos(params),
    {
      onError: (error) => {
        message.error('Error al cargar los productos más vendidos');
        console.error('Error en useProductosMasVendidos:', error);
      },
    }
  );
}
