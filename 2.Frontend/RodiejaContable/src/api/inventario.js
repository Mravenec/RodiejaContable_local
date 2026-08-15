import api from './axios';

class InventarioService {
  // Get all spare parts
  async getRepuestos(params = {}) {
    try {
      const response = await api.get('/inventario-repuestos');
      let data = response.data.map(item => this._mapRepuesto(item));
      
      // Filtrado local para soportar los filtros del Drawer
      if (params.estado) {
        data = data.filter(item => item.estado?.toLowerCase() === params.estado.toLowerCase());
      }
      if (params.parteVehiculoId) {
        data = data.filter(item => item.parteVehiculoId === parseInt(params.parteVehiculoId, 10));
      }
      if (params.ubicacion) {
        const searchUbicacion = params.ubicacion.toLowerCase().replace(/\s+/g, '');
        data = data.filter(item => item.ubicacion?.toLowerCase().replace(/\s+/g, '').includes(searchUbicacion));
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching spare parts:', error);
      throw error;
    }
  }

  // Get spare parts by vehicle origin
  async getRepuestosPorVehiculo(vehiculoId) {
    try {
      const response = await api.get(`/inventario-repuestos/vehiculo/${vehiculoId}`);
      if (!response.data) return [];
      return response.data.map(item => this._mapRepuesto(item));
    } catch (error) {
      if (error.response && error.response.status === 204) return [];
      console.error(`Error fetching spare parts for vehicle ${vehiculoId}:`, error);
      throw error;
    }
  }

  // Delete spare part
  async eliminarRepuesto(id) {
    try {
      await api.delete(`/inventario-repuestos/${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting part ${id}:`, error);
      throw error;
    }
  }

  // Get a spare part by ID
  async getRepuestoPorId(id) {
    try {
      const response = await api.get(`/inventario-repuestos/${id}`);
      return this._mapRepuesto(response.data);
    } catch (error) {
      console.error(`Error fetching spare part ${id}:`, error);
      throw error;
    }
  }

  // Search parts by code
  async buscarPorCodigo(codigo) {
    try {
      const response = await api.get('/inventario-repuestos/buscar', {
        params: { codigo }
      });
      return response.data.map(item => this._mapRepuesto(item));
    } catch (error) {
      console.error('Error searching parts by code:', error);
      throw error;
    }
  }

  // Get parts by vehicle
  async getRepuestosPorVehiculo(vehiculoId) {
    try {
      const response = await api.get(`/inventario-repuestos/vehiculo/${vehiculoId}`);
      return response.data.map(item => this._mapRepuesto(item));
    } catch (error) {
      console.error(`Error getting parts for vehicle ${vehiculoId}:`, error);
      throw error;
    }
  }

  // Create new spare part (CON vehículo origen)
  async crearRepuesto(repuestoData) {
    try {
      const response = await api.post('/inventario-repuestos', repuestoData);
      return this._mapRepuesto(response.data);
    } catch (error) {
      console.error('Error creating spare part:', error);
      throw error;
    }
  }

  // ✅ NUEVO: Create spare part WITHOUT vehicle origin (usando stored procedure)
  async crearRepuestoSinVehiculo(repuestoData) {
    try {
      const response = await api.post('/inventario-repuestos/sin-vehiculo', repuestoData);
      return response.data; // El SP devuelve un mensaje de texto, no un objeto mapeado
    } catch (error) {
      console.error('Error creating spare part without vehicle:', error);
      throw error;
    }
  }

  // Update existing part
  async actualizarRepuesto(id, repuestoData) {
    try {
      const response = await api.put(`/inventario-repuestos/${id}`, repuestoData);
      return this._mapRepuesto(response.data);
    } catch (error) {
      console.error(`Error updating part ${id}:`, error);
      throw error;
    }
  }



  // Map API response to frontend format
  _mapRepuesto(item) {
    if (!item) return null;
    
    const formatDate = (dateArray) => {
      if (!dateArray || !Array.isArray(dateArray)) return null;
      const [year, month, day, hours = 0, minutes = 0, seconds = 0] = dateArray;
      return new Date(year, month - 1, day, hours, minutes, seconds).toISOString();
    };

    const ubicacion = [
      item.bodega,
      item.zona,
      item.pared,
      item.malla,
      item.horizontal,
      item.estante,
      item.nivel,
      item.piso
    ].filter(Boolean).join(' ') || item.codigoUbicacion || item.codigo_ubicacion;

    const getEstadoDisplay = (estado) => {
      const estados = {
        'STOCK': 'En Stock',
        'VENDIDO': 'Vendido',
        'AGOTADO': 'Agotado',
        'DISPONIBLE': 'Disponible',
        'DESARMADO': 'Desarmado',
        'REPARACION': 'En Reparación'
      };
      return estados[estado] || estado;
    };

    return {
      id: item.id,
      codigo: item.codigoRepuesto || item.codigo_repuesto,
      codigoUbicacion: item.codigoUbicacion || item.codigo_ubicacion,
      vehiculoOrigenId: item.vehiculoOrigenId || item.vehiculo_origen_id,
      generacionId: item.generacionId || item.generacion_id,
      // Vehículo (si viene de vista o dto)
      vehiculoCodigo: item.codigoVehiculo || item.codigo_vehiculo,
      marca: item.marca,
      modelo: item.modelo,
      generacion: item.generacion,
      anioVehiculo: item.anioVehiculo || item.anio_vehiculo,
      claveGeneracion: item.claveGeneracion || item.clave_generacion,

      anioRegistro: item.anioRegistro || item.anio_registro,
      mesRegistro: item.mesRegistro || item.mes_registro,
      parteVehiculoId: item.parteVehiculoId || item.parte_vehiculo_id,
      parteVehiculo: item.parteVehiculo || item.parte_vehiculo,
      descripcion: item.descripcion,
      precioCosto: item.precioCosto || item.precio_costo,
      precioVenta: item.precioVenta || item.precio_venta,

      formula15: item.formula_15,
      formula30: item.formula_30,
      bodega: item.bodega,
      zona: item.zona,
      pared: item.pared,
      malla: item.malla,
      horizontal: item.horizontal,
      estante: item.estante,
      nivel: item.nivel,
      piso: item.piso,
      plastica: item.plastica,
      carton: item.carton,
      posicion: item.posicion,
      cantidad: item.cantidad,
      estado: item.estado,
      estadoDisplay: getEstadoDisplay(item.estado),
      condicion: item.condicion,
      imagenUrl: item.imagenUrl || item.imagen_url,
      fechaCreacion: formatDate(item.fechaCreacion) || item.fechaCreacion || item.fecha_creacion,
      fechaActualizacion: formatDate(item.fechaActualizacion) || item.fechaActualizacion || item.fecha_actualizacion,
      activo: item.activo !== false,
      ubicacion: ubicacion,
      esVendido: (item.estado === 'VENDIDO' || item.estado === 'AGOTADO'),
      tieneStock: (item.cantidad > 0),
      precioVentaFormatted: `₡${(item.precioVenta || item.precio_venta || 0).toLocaleString('es-CR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}`,
      precioCostoFormatted: `₡${(item.precioCosto || item.precio_costo || 0).toLocaleString('es-CR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}`
    };
  }
}

const inventarioServiceInstance = new InventarioService();
export default inventarioServiceInstance;
