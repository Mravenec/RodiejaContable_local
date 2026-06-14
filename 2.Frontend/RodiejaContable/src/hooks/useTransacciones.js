import { useQuery } from 'react-query';
import { message } from 'antd';
import transaccionesCompletasService from '../api/transaccionesCompletas';

export function useTransaccionesCompletas(params = {}) {
  return useQuery(
    ['transacciones', params],
    async () => {
      if (params.fechaInicio && params.fechaFin) {
        return transaccionesCompletasService.getTransaccionesPorRangoFechas(params.fechaInicio, params.fechaFin);
      }
      return transaccionesCompletasService.getTransacciones(params);
    },
    {
      onError: (error) => {
        message.error('Error al cargar las transacciones completas');
        console.error('Error en useTransaccionesCompletas:', error);
      },
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: true, // Ensuring it re-fetches when user comes back
    }
  );
}

