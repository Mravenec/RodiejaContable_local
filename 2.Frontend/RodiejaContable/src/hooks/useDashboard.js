import { useQuery } from 'react-query';
import { dashboardService } from '../api';
import vehiculoService from '../api/vehiculos';
import ventasEmpleadosService from '../api/ventasEmpleados';
import { calcularPorcentajes } from '../utils/formatters';
import { MESES_NOMBRES } from '../utils/dateUtils';

export const DASHBOARD_QUERY_KEY = ['dashboard_data'];

/**
 * Hook para cargar todas las métricas, ventas y estadísticas del Dashboard centralizado
 * @param {object} options Opciones adicionales para useQuery
 */
export function useDashboard(options = {}) {
  return useQuery(
    DASHBOARD_QUERY_KEY,
    async () => {
      const stats = await dashboardService.getDashboardStats();

      const [
        ventasMensuales,
        vehiculosMasVendidos,
        repuestosMasVendidos,
        comisiones,
        vehiculosActivos,
        repuestosCriticos,
        topEmpleados
      ] = await Promise.all([
        dashboardService.getVentasMensuales().catch(() => []),
        dashboardService.getVehiculosMasVendidos().catch(() => []),
        dashboardService.getRepuestosMasVendidos().catch(() => []),
        ventasEmpleadosService.getVentasPorEmpleado().catch(() => []),
        vehiculoService.getVehiculosActivos().catch(() => []),
        dashboardService.getAlertasInventario().catch(() => []),
        ventasEmpleadosService.getTopEmpleados(5).catch(() => [])
      ]);

      const ventasFormat = (ventasMensuales || []).map(v => {
        const mesNum = v.mes || new Date(v.fecha || v.createdAt).getMonth() + 1;
        return {
          ...v,
          nombreMes: MESES_NOMBRES[mesNum - 1] || `Mes ${mesNum}`,
          totalTransacciones: v.totalTransacciones || v.totalVentas || v.transaccionesVenta || 0,
          totalIngresos: v.totalIngresos || v.monto || v.ingresosNetos || v.totalIngresosNetos || 0
        };
      });

      const empleadosConPorcentajes = calcularPorcentajes(topEmpleados);
      const comisionesConVentas = Array.isArray(comisiones)
        ? comisiones.filter(c => (c.totalTransacciones || c.total_transacciones || 0) > 0)
        : [];

      return {
        ...stats,
        ventasMensuales: ventasFormat,
        vehiculosMasVendidos: Array.isArray(vehiculosMasVendidos) ? vehiculosMasVendidos : [],
        repuestosMasVendidos: Array.isArray(repuestosMasVendidos) ? repuestosMasVendidos : [],
        comisiones: comisionesConVentas.length > 0 ? comisionesConVentas : (Array.isArray(comisiones) ? comisiones : []),
        vehiculosActivos: Array.isArray(vehiculosActivos) ? vehiculosActivos : [],
        repuestosCriticos: Array.isArray(repuestosCriticos) ? repuestosCriticos : [],
        topEmpleados: empleadosConPorcentajes
      };
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutos de caché
      refetchOnWindowFocus: false,
      ...options
    }
  );
}

export default useDashboard;
