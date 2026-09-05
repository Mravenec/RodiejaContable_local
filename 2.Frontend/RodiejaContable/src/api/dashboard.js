import api from './axios';
import vehiculoService from './vehiculos'; // Importar el mismo servicio que VehiculoDetalle.js

class DashboardService {
  // Obtener estadísticas generales del dashboard
  async getDashboardStats() {
    try {
      // Obtener datos del dashboard ejecutivo
      const dashboardResponse = await api.get('/dashboard/ejecutivo');
      const dashboardData = dashboardResponse.data[0] || {};
      
      // Obtener ingresos y egresos reales desde transacciones financieras
      const transaccionesResponse = await api.get('/transacciones-financieras');
      const transacciones = transaccionesResponse.data || [];
      
      // Calcular ingresos y egresos desde transacciones reales
      const ingresosTotales = transacciones
        .filter(t => {
          // Asumimos que tipoTransaccionId 1-3 son ingresos, 4-6 son egresos
          return t.tipoTransaccionId <= 3;
        })
        .reduce((sum, t) => sum + (t.monto || 0), 0);
        
      const egresosTotales = transacciones
        .filter(t => {
          return t.tipoTransaccionId > 3;
        })
        .reduce((sum, t) => sum + (t.monto || 0), 0);
      
      console.log('=== CÁLCULO DE INGRESOS/EGRESOS ===');
      console.log('Transacciones totales:', transacciones.length);
      console.log('Ingresos calculados:', ingresosTotales);
      console.log('Egresos calculados:', egresosTotales);
      
      // Mapear la respuesta del backend al formato esperado por el frontend
      return {
        totalVentas: ingresosTotales || 0,
        totalVehiculos: dashboardData.totalVehiculos || 0,
        totalRepuestos: dashboardData.totalRepuestos || 0,
        totalClientes: 0, // This field might need to be fetched separately
        totalEgresos: egresosTotales || 0,
        margenBeneficio: (ingresosTotales || 0) - (egresosTotales || 0),
        roiPromedio: dashboardData.roiPromedio || 0
      };
    } catch (error) {
      console.error('Error al obtener estadísticas del dashboard:', error);
      throw error;
    }
  }

  // Obtener vehículos más vendidos
  async getVehiculosMasVendidos() {
    console.log('=== INICIANDO getVehiculosMasVendidos ===');
    try {
      // USAR EXACTAMENTE LA MISMA LÓGICA QUE VehiculoDetalle.js
      console.log('Usando vehiculoService.getVehiculos() como en VehiculoDetalle.js');
      const vehiculosResponse = await vehiculoService.getVehiculos();
      console.log('Vehículos response completo:', vehiculosResponse);
      
      // Mostrar estructura específica del primer vehículo
      if (vehiculosResponse.length > 0) {
        console.log('Primer vehículo estructura:', {
          id: vehiculosResponse[0].id,
          codigo_vehiculo: vehiculosResponse[0].codigo_vehiculo,
          modelo: vehiculosResponse[0].modelo,
          anio: vehiculosResponse[0].anio,
          generacion: vehiculosResponse[0].generacion,
          estado: vehiculosResponse[0].estado,
          todos_los_campos: Object.keys(vehiculosResponse[0])
        });
      }
      
      const vendidos = vehiculosResponse.filter(v => v.estado === 'VENDIDO' || v.estado === 'DISPONIBLE');
      console.log('Vehículos filtrados (VENDIDOS + DISPONIBLES):', vendidos);
      
      // Priorizar vehículos vendidos, pero si no hay, mostrar disponibles
      const prioritizedVendidos = vehiculosResponse.filter(v => v.estado === 'VENDIDO');
      const disponibles = vehiculosResponse.filter(v => v.estado === 'DISPONIBLE');
      
      const vehiclesToShow = prioritizedVendidos.length > 0 ? prioritizedVendidos : disponibles;
      console.log('Vehículos a mostrar:', vehiclesToShow);
      
      // Enriquecer datos con relaciones completas EXACTAMENTE como en VehiculoDetalle.js
      const enrichedVehicles = await Promise.all(
        vehiclesToShow.slice(0, 5).map(async (v) => {
          console.log(`Procesando vehículo ${v.id}:`, {
            tiene_generacion: !!v.generacion,
            generacion_id: v.generacion?.id,
            modelo_id: v.generacion?.modeloId,
            generacion_completa: v.generacion
          });
          
          let vehiculoConGeneracion = v;
          
          // Si generacion está presente pero le falta nested modelo/marca, fetch them
          // EXACTAMENTE COMO EN VehiculoDetalle.js LÍNEAS 185-224
          if (v.generacion && !v.generacion.modelo) {
            console.log(`Vehículo ${v.id}: Tiene generacion pero缺少 modelo, fetching...`);
            try {
              const generacion = v.generacion;
              
              // Fetch modelo
              console.log(`Fetching modelo ${generacion.modeloId}`);
              const modeloResponse = await api.get(`/modelos/${generacion.modeloId}`);
              const modelo = modeloResponse.data || { id: generacion.modeloId };
              console.log(`Modelo obtenido:`, modelo);
              
              // Fetch marca
              console.log(`Fetching marca ${modelo.marcaId}`);
              const marcaResponse = await api.get(`/marcas/${modelo.marcaId}`);
              const marca = marcaResponse.data || { id: modelo.marcaId, nombre: 'Marca no disponible' };
              console.log(`Marca obtenida:`, marca);
              
              // Attach nested structure
              vehiculoConGeneracion = {
                ...v,
                generacion: {
                  ...generacion,
                  modelo: {
                    ...modelo,
                    marca: marca
                  }
                }
              };
              
              console.log(`Vehículo ${v.id} enriquecido:`, vehiculoConGeneracion);
            } catch (nestedError) {
              console.error('Error fetching nested data (modelo/marca):', nestedError);
              // Fallback: attach empty objects to avoid crashes
              vehiculoConGeneracion = {
                ...v,
                generacion: {
                  ...v.generacion,
                  modelo: {
                    nombre: 'Modelo no disponible',
                    marca: { nombre: 'Marca no disponible' }
                  }
                }
              };
            }
          } else {
            console.log(`Vehículo ${v.id}: No necesita enriquecimiento o no tiene generacion`);
          }
          
          return vehiculoConGeneracion;
        })
      );
      
      const result = enrichedVehicles.map(v => {
        // Extraer nombres de las relaciones anidadas - estructura correcta
        const generacion = v.generacion || {};
        const modelo = generacion.modelo || {};
        const marca = modelo.marca || {};
        
        // Debugging específico para este vehículo
        console.log(`Vehículo ${v.id} - Campos disponibles:`, {
          codigo_vehiculo: v.codigo_vehiculo,
          generacion: !!v.generacion,
          modelo_nombre: generacion.modelo?.nombre,
          marca_nombre: generacion.modelo?.marca?.nombre,
          anio: v.anio,
          todos_los_campos: Object.keys(v)
        });
        
        // Construir nombre real como en el DOM: "Honda Civic 2018"
        const nombreReal = v.codigo_vehiculo || 
          `${marca.nombre || ''} ${modelo.nombre || ''} ${v.anio || ''}`.trim() ||
          `${v.id} ${modelo.nombre || 'Modelo'} ${v.anio || ''}`.trim() ||
          `Vehículo ${v.id}`;
        
        console.log(`Nombre construido para vehículo ${v.id}:`, nombreReal);
        
        return {
          id: v.id,
          nombre: nombreReal,
          codigo_vehiculo: v.codigo_vehiculo,
          marca: marca.nombre,
          modelo: modelo.nombre,
          anio: v.anio,
          precio_compra: v.precio_compra,
          precio_venta: v.precio_venta,
          fecha_venta: v.fecha_venta,
          estado: v.estado,
          // Guardar todos los campos para debugging
          _raw: v
        };
      });
      
      console.log('Vehículos más vendidos mapeados:', result);
      return result;
    } catch (error) {
      console.error('Error al obtener vehículos más vendidos:', error);
      return [];
    }
  }

  // Obtener repuestos más vendidos
  async getRepuestosMasVendidos() {
    try {
      // Intentar obtener datos reales filtrando repuestos vendidos
      const response = await api.get('/inventario-repuestos');
      console.log('Inventario repuestos response:', response.data);
      
      // Mostrar estructura del primer repuesto
      if (response.data.length > 0) {
        console.log('Primer repuesto estructura:', {
          id: response.data[0].id,
          descripcion: response.data[0].descripcion,
          parte_vehiculo: response.data[0].parte_vehiculo,
          codigo_repuesto: response.data[0].codigo_repuesto,
          estado: response.data[0].estado,
          todos_los_campos: Object.keys(response.data[0])
        });
      }
      
      const vendidos = response.data.filter(r => r.estado === 'VENDIDO');
      const disponibles = response.data.filter(r => r.estado === 'STOCK');
      
      // Priorizar vendidos, pero si no hay, mostrar disponibles
      const partsToShow = vendidos.length > 0 ? vendidos : disponibles;
      console.log('Repuestos vendidos:', vendidos);
      console.log('Repuestos disponibles:', disponibles);
      console.log('Repuestos a mostrar:', partsToShow);
      
      const result = partsToShow.slice(0, 5).map(r => ({
        id: r.id,
        nombre: r.descripcion || r.parte_vehiculo || `Repuesto ${r.id}`,
        descripcion: r.descripcion,
        parte_vehiculo: r.parte_vehiculo,
        codigo_repuesto: r.codigo_repuesto,
        codigo_ubicacion: r.codigo_ubicacion,
        precio_costo: r.precio_costo,
        precio_venta: r.precio_venta,
        estado: r.estado,
        // Guardar todos los campos para debugging
        _raw: r
      }));
      
      console.log('Repuestos más vendidos mapeados:', result);
      return result;
    } catch (error) {
      console.error('Error al obtener repuestos más vendidos:', error);
      return [];
    }
  }

  // Obtener ventas mensuales
  async getVentasMensuales() {
    try {
      // Estos son los controles que deben funcionar según el archivo .http:
      // GET /api/analisis-financiero
      const response = await api.get('/analisis-financiero');
      return response.data;
    } catch (error) {
      console.error('Error al obtener ventas mensuales:', error);
      return [];
    }
  }

  // Obtener comisiones de vendedores
  async getComisionesVendedores() {
    console.log('=== INICIANDO getComisionesVendedores ===');
    try {
      // Estos son los controles que deben funcionar según el archivo .http:
      // GET /api/v1/ventas-empleados
      console.log('Fetching comisiones from: /v1/ventas-empleados');
      const response = await api.get('/v1/ventas-empleados');
      console.log('Comisiones response crudo:', response.data);
      
      // Mostrar estructura del primer elemento si hay datos
      if (response.data && response.data.length > 0) {
        console.log('Primera comisión estructura:', {
          todos_los_campos: Object.keys(response.data[0]),
          datos_completos: response.data[0]
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('Error al obtener comisiones por vendedor:', error);
      return [];
    }
  }

  // Obtener alertas de inventario
  async getAlertasInventario() {
    console.log('=== INICIANDO getAlertasInventario ===');
    try {
      // Intentar diferentes endpoints para inventario crítico
      let response;
      const endpoints = [
        '/inventario-repuestos',
        '/inventario/critico',
        '/inventario/alertas',
        '/alertas/inventario'
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Intentando endpoint: ${endpoint}`);
          response = await api.get(endpoint);
          console.log(`Endpoint ${endpoint} funcionó:`, response.data);
          break;
        } catch (err) {
          console.log(`Endpoint ${endpoint} falló:`, err.message);
          continue;
        }
      }
      
      // Si ningún endpoint funciona, devolver array vacío
      if (!response) {
        console.log('Ningún endpoint de inventario crítico funcionó, devolviendo array vacío');
        return [];
      }
      
      // Filtrar solo items críticos
      const criticos = Array.isArray(response.data) 
        ? response.data.filter(item => 
            item.estado === 'CRITICO' || 
            item.estado === 'AGOTADO' || 
            item.cantidad <= 5 ||
            item.stock_bajo
          )
        : [];
      
      console.log('Items críticos encontrados:', criticos);
      return criticos;
    } catch (error) {
      console.error('Error al obtener alertas de inventario:', error);
      return [];
    }
  }
}

const dashboardService = new DashboardService();

// Export a singleton instance
export default dashboardService;
