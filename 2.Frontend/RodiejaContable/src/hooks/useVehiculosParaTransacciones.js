import { useQuery } from 'react-query';
import { message } from 'antd';
import vehiculoService from '../api/vehiculos';

const fetchVehiculosActivos = async () => {
  try {
    console.log('🔍 [API] Obteniendo vehículos activos...');
    const vehiculos = await vehiculoService.getVehiculosActivos();
    
    if (!vehiculos) {
      console.error('❌ [ERROR] La respuesta de vehículos está vacía');
      return [];
    }
    
    const vehiculosData = Array.isArray(vehiculos) ? vehiculos : [vehiculos];
    
    if (vehiculosData.length === 0) {
      console.warn('⚠️ [ADVERTENCIA] No se encontraron vehículos activos');
      return [];
    }
    
    // Mapear los datos para asegurar que tengan la estructura esperada
    const vehiculosMapeados = vehiculosData.map(vehiculo => ({
      id: vehiculo.id,
      codigoVehiculo: vehiculo.codigoVehiculo || 'SIN_CODIGO',
      generacionId: vehiculo.generacionId,
      anio: vehiculo.anio || 'N/A',
      placa: vehiculo.codigoVehiculo || 'SIN_PLACA', // Usar codigoVehiculo como placa
      estado: vehiculo.estado || 'DESCONOCIDO',
      activo: vehiculo.activo !== false,
      marca: vehiculo.marca || 'Marca N/A',
      modelo: vehiculo.modelo || 'Modelo N/A',
      ...vehiculo
    }));

    // Filtrar vehículos para mostrar solo los que están DISPONIBLE, DESARMADO o REPARACION
    // Estos son los vehículos que se pueden vender o tienen repuestos disponibles
    const vehiculosFiltrados = vehiculosMapeados.filter(vehiculo => 
      vehiculo.estado === 'DISPONIBLE' || 
      vehiculo.estado === 'DESARMADO' ||
      vehiculo.estado === 'REPARACION'
    );
    
    console.log(`📊 [FILTRO] De ${vehiculosMapeados.length} vehículos totales, ${vehiculosFiltrados.length} cumplen el criterio (DISPONIBLE, DESARMADO o REPARACION)`);
    console.log(`✅ [API] ${vehiculosFiltrados.length} vehículos cargados:`, 
      vehiculosFiltrados.map(v => `${v.id}: ${v.codigoVehiculo} (${v.anio}) - ${v.estado}`).join(', ')
    );
    
    return vehiculosFiltrados;
    
  } catch (error) {
    console.error('Error al obtener vehículos:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url
    });
    
    message.error('No se pudieron cargar los vehículos. Por favor, intente de nuevo.');
    return []; // Retornar array vacío en caso de error
  }
};

export const useVehiculosParaTransacciones = () => {
  const { data, isLoading, error } = useQuery(
    'vehiculosActivos',
    fetchVehiculosActivos,
    {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
      refetchOnWindowFocus: false,
      onError: (error) => {
        console.error('Error en la consulta de vehículos:', error);
      },
      onSuccess: (data) => {
        console.log('Datos de vehículos cargados correctamente:', data);
      }
    }
  );

  return {
    vehiculos: data || [],
    loadingVehiculos: isLoading,
    errorVehiculos: error || null
  };
};

const fetchVehiculosParaEgreso = async () => {
  try {
    console.log('🔍 [API] Obteniendo vehículos para egreso...');
    const vehiculos = await vehiculoService.getVehiculosParaEgreso();
    
    if (!vehiculos) {
      console.error('❌ [ERROR] La respuesta de vehículos está vacía');
      return [];
    }
    
    const vehiculosData = Array.isArray(vehiculos) ? vehiculos : [vehiculos];
    
    if (vehiculosData.length === 0) {
      console.warn('⚠️ [ADVERTENCIA] No se encontraron vehículos para egreso');
      return [];
    }
    
    // Mapear los datos
    const vehiculosMapeados = vehiculosData.map(vehiculo => ({
      id: vehiculo.id,
      codigoVehiculo: vehiculo.codigoVehiculo || 'SIN_CODIGO',
      generacionId: vehiculo.generacionId,
      anio: vehiculo.anio || 'N/A',
      placa: vehiculo.codigoVehiculo || 'SIN_PLACA',
      estado: vehiculo.estado || 'DESCONOCIDO',
      activo: vehiculo.activo !== false,
      marca: vehiculo.marca || 'Marca N/A',
      modelo: vehiculo.modelo || 'Modelo N/A',
      ...vehiculo
    }));
    
    console.log(`✅ [API] ${vehiculosMapeados.length} vehículos para egreso cargados:`, 
      vehiculosMapeados.map(v => `${v.id}: ${v.codigoVehiculo} (${v.anio}) - ${v.estado}`).join(', ')
    );
    
    return vehiculosMapeados;
    
  } catch (error) {
    console.error('Error al obtener vehículos para egreso:', error);
    message.error('No se pudieron cargar los vehículos. Por favor, intente de nuevo.');
    return [];
  }
};

export const useVehiculosParaEgreso = () => {
  const { data, isLoading, error } = useQuery(
    'vehiculosParaEgreso',
    fetchVehiculosParaEgreso,
    {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
      refetchOnWindowFocus: false,
      onError: (error) => {
        console.error('Error en la consulta de vehículos para egreso:', error);
      },
      onSuccess: (data) => {
        console.log('Datos de vehículos para egreso cargados correctamente:', data);
      }
    }
  );

  return {
    vehiculos: data || [],
    loadingVehiculos: isLoading,
    errorVehiculos: error || null
  };
};
