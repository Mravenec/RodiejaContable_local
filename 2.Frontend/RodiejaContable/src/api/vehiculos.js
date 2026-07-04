import api from './axios';

class VehiculoService {
  // Enable/disable debug logging
  debug = true;
  
  log(...args) {
    if (this.debug) {
      console.log('[VehiculoService]', ...args);
    }
  }
  
  error(...args) {
    console.error('[VehiculoService]', ...args);
  }

  /**
   * Obtiene la lista de vehículos activos
   * @returns {Promise<Array>} Lista de vehículos activos
   */
  async getVehiculosActivos() {
    try {
      this.log('Fetching active vehicles...');
      const response = await api.get('/v1/vehiculos/activos');
      this.log('Active vehicles response:', response.data);
      return response.data;
    } catch (error) {
      this.error('Error fetching active vehicles:', error);
      throw error;
    }
  }

  /**
   * Obtiene la lista de vehículos para egreso
   * @returns {Promise<Array>} Lista de vehículos para egreso
   */
  async getVehiculosParaEgreso() {
    try {
      this.log('Fetching vehicles for expense transactions...');
      const response = await api.get('/v1/vehiculos/para-egreso');
      this.log('Vehicles for expense response:', response.data);
      return response.data;
    } catch (error) {
      this.error('Error fetching vehicles for expense:', error);
      throw error;
    }
  }

  /**
   * Obtiene vehículos completos filtrados por estado
   * @param {string} estado - El estado del vehículo (ej: 'DESARMADO')
   * @returns {Promise<Array>} Lista de vehículos
   */
  async getVehiculosPorEstado(estado) {
    try {
      this.log(`Fetching vehicles with status: ${estado}`);
      const response = await api.get(`/v1/vehiculos/estado/${estado}`);
      return response.data;
    } catch (error) {
      this.error(`Error fetching vehicles with status ${estado}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene los vehículos agrupados jerárquicamente por marca, modelo y generación
   * @returns {Promise<Object>} Objeto con la estructura jerárquica de vehículos
   */
  async getVehiculosAgrupados() {
    try {
      this.log('Fetching hierarchical vehicle data...');
      const response = await api.get('/vehiculos/jerarquia');
      
      // Log detallado de la respuesta
      console.log('[DEBUG] Raw API response:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        config: {
          url: response.config?.url,
          method: response.config?.method,
          params: response.config?.params,
          data: response.config?.data
        }
      });
      
      // Verificar si hay datos
      if (!response.data) {
        console.warn('La respuesta de la API está vacía');
        return { marcas: [] };
      }
      
      // Si la respuesta ya está en el formato esperado, retornarla directamente
      if (response.data.marcas !== undefined) {
        console.log('Respuesta con formato { marcas: [...] }');
        return response.data;
      }
      
      // Transformar la estructura jerárquica al formato esperado
      const marcas = [];
      
      // Recorrer cada marca en la respuesta
      for (const [nombreMarca, modelos] of Object.entries(response.data)) {
        const modelosArray = [];
        
        // Recorrer cada modelo de la marca
        for (const [nombreModelo, generaciones] of Object.entries(modelos)) {
          const generacionesArray = [];
          
          // Recorrer cada generación del modelo
          for (const [nombreGeneracion, vehiculos] of Object.entries(generaciones)) {
            // Extraer años de la generación (ej: "gen10 (2016-2021)")
            const anioMatch = nombreGeneracion.match(/\((\d{4})-(\d{4})\)/);
            const anioInicio = anioMatch ? parseInt(anioMatch[1]) : null;
            const anioFin = anioMatch ? parseInt(anioMatch[2]) : null;
            
            // Crear objeto de generación
            generacionesArray.push({
              id: generacionesArray.length + 1, // ID temporal
              nombre: nombreGeneracion.split(' (')[0], // Extraer solo el nombre sin años
              anioInicio,
              anioFin,
              vehiculos: Array.isArray(vehiculos) ? vehiculos : []
            });
          }
          
          // Crear objeto de modelo
          modelosArray.push({
            id: modelosArray.length + 1, // ID temporal
            nombre: nombreModelo,
            generaciones: generacionesArray
          });
        }
        
        // Crear objeto de marca
        marcas.push({
          id: marcas.length + 1, // ID temporal
          nombre: nombreMarca,
          modelos: modelosArray
        });
      }
      
      console.log('Datos transformados al formato jerárquico:', { marcas });
      return { marcas };
      
    } catch (error) {
      this.error('Error fetching hierarchical vehicles:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      // Si el endpoint no existe (404), intentar con el método alternativo
      if (error.response?.status === 404) {
        this.log('Hierarchical endpoint not found, falling back to flat data');
        const flatData = await this.getVehiculos({}, true);
        return { marcas: Array.isArray(flatData) ? flatData : [] };
      }
      
      throw error;
    }
  }
  
  // Obtener todos los vehículos con sus relaciones
  /**
   * Obtiene vehículos en formato plano o jerárquico según los parámetros
   * @param {Object} params - Parámetros de búsqueda
   * @param {boolean} [hierarchical=false] - Si es true, devuelve los datos en formato jerárquico
   * @returns {Promise<Array|Object>} Lista de vehículos o estructura jerárquica
   */
  async getVehiculos(params = {}, hierarchical = false) {
    try {
      this.log(`Fetching ${hierarchical ? 'hierarchical ' : ''}vehicles with params:`, params);
      
      // Si se solicita el formato jerárquico, usamos el nuevo endpoint
      if (hierarchical) {
        const response = await api.get('/vehiculos/jerarquia');
        this.log('Hierarchical vehicles API response:', response.data);
        return response.data?.marcas || [];
      }
      
      // Formato plano (comportamiento original)
      const response = await api.get('/vehiculos', { 
        params,
        paramsSerializer: params => {
          const searchParams = new URLSearchParams();
          for (const key in params) {
            if (params[key] !== undefined && params[key] !== null) {
              searchParams.append(key, params[key]);
            }
          }
          return searchParams.toString();
        }
      });
      
      this.log('Vehicles API response:', response.data);
      
      if (!Array.isArray(response.data)) {
        this.error('Expected array of vehicles but got:', response.data);
        return [];
      }
      
      const vehiculos = response.data;
      
      // Si no hay vehículos, retornar array vacío
      if (vehiculos.length === 0) {
        this.log('No vehicles found');
        return [];
      }
      
      // Obtenemos las generaciones para cada vehículo
      const vehiculosConRelaciones = [];
      
      for (const vehiculo of vehiculos) {
        try {
          this.log(`Fetching generation for vehicle ${vehiculo.id}, generacionId: ${vehiculo.generacionId}`);
          
          const generacionResponse = await api.get(`/generaciones/${vehiculo.generacionId}`);
          
          const vehiculoConRelacion = {
            ...vehiculo,
            generacion: generacionResponse.data || { id: vehiculo.generacionId }
          };
          
          this.log(`Processed vehicle ${vehiculo.id}:`, vehiculoConRelacion);
          vehiculosConRelaciones.push(vehiculoConRelacion);
          
        } catch (error) {
          this.error(`Error getting generation for vehicle ${vehiculo.id}:`, error);
          
          // Incluir el vehículo aunque falle la generación
          vehiculosConRelaciones.push({
            ...vehiculo,
            generacion: { id: vehiculo.generacionId },
            _error: `Error loading generation: ${error.message}`
          });
        }
      }
      
      this.log(`Successfully processed ${vehiculosConRelaciones.length} vehicles`);
      
      let resultados = vehiculosConRelaciones;
      
      // Filtrar localmente por búsqueda si se proporciona
      if (params.busqueda) {
        const searchStr = params.busqueda.toLowerCase();
        resultados = resultados.filter(v => {
          const searchSpace = [
            v.codigoVehiculo,
            v.anio?.toString(),
            v.estado,
            v.generacion?.nombre,
            v.notas
          ].filter(Boolean).join(' ').toLowerCase();
          return searchSpace.includes(searchStr);
        });
      }
      
      return resultados;
    } catch (error) {
      this.error('Error getting vehicles:', {
        message: error.message,
        config: error.config,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Si es un error 404, retornar array vacío
      if (error.response?.status === 404) {
        this.log('Vehicles endpoint returned 404, returning empty array');
        return [];
      }
      
      // Para otros errores, lanzar el error para que lo maneje React Query
      throw error;
    }
  }

  
  // Obtener estadísticas financieras por generación
  async getEstadisticasGeneracion(generacionId) {
    try {
      this.log(`Fetching statistics for generation ${generacionId}`);
      const response = await api.get(`/generaciones/${generacionId}/estadisticas`);
      return response.data || {};
    } catch (error) {
      this.error(`Error getting statistics for generation ${generacionId}:`, error);
      throw error;
    }
  }
  
  // Obtener todas las generaciones
  async getGeneraciones() {
    try {
      const response = await api.get('/generaciones');
      return response.data;
    } catch (error) {
      this.error('Error al obtener generaciones:', error);
      throw error;
    }
  }
  
  // Obtener un vehículo por su ID
  async getVehiculoPorId(id) {
    try {
      const response = await api.get(`/vehiculos/${id}`);
      const vehiculo = response.data;
      
      // Devolver los datos originales del vehículo según la estructura de la BD
      return {
        id: vehiculo.id,
        codigoVehiculo: vehiculo.codigoVehiculo,
        generacionId: vehiculo.generacionId,
        imagenUrl: vehiculo.imagenUrl,
        anio: vehiculo.anio,
        precioCompra: vehiculo.precioCompra,
        costoGrua: vehiculo.costoGrua || 0,
        comisiones: vehiculo.comisiones || 0,
        inversionTotal: vehiculo.inversionTotal || 0,
        costoRecuperado: vehiculo.costoRecuperado || 0,
        costoPendiente: vehiculo.costoPendiente || 0,
        fechaIngreso: vehiculo.fechaIngreso,
        estado: vehiculo.estado,
        precioVenta: vehiculo.precioVenta,
        fechaVenta: vehiculo.fechaVenta,
        activo: vehiculo.activo !== false,
        notas: vehiculo.notas,
        combustible: vehiculo.combustible,
        cilindraje: vehiculo.cilindraje,
        traccion: vehiculo.traccion,
        transmision: vehiculo.transmision,
        // Mantener campos adicionales para compatibilidad
        modelo: vehiculo.modeloNombre,
        marcaId: vehiculo.marcaId,
        marcaNombre: vehiculo.marcaNombre,
        generacionNombre: vehiculo.generacionNombre
      };
    } catch (error) {
      console.error('Error al obtener el vehículo:', error);
      throw error;
    }
  }

  // Obtener todos los vehículos desde la vista completa (con marca, modelo, etc.)
  async getVehiculosCompletos(params = {}) {
    try {
      this.log('Fetching complete vehicles (view) with params:', params);
      
      const response = await api.get('/v1/vehiculos/buscar', { 
        params,
        paramsSerializer: params => {
          const searchParams = new URLSearchParams();
          for (const key in params) {
            if (params[key] !== undefined && params[key] !== null) {
              searchParams.append(key, params[key]);
            }
          }
          return searchParams.toString();
        }
      });
      
      let vehiculos = [];
      if (response.data && response.data.vehiculos) {
        vehiculos = response.data.vehiculos;
      } else if (Array.isArray(response.data)) {
        vehiculos = response.data;
      }
      
      // Filtrar localmente por búsqueda si se proporciona (por si el backend no lo hizo por todos los campos)
      if (params.busqueda) {
        const searchStr = params.busqueda.toLowerCase();
        vehiculos = vehiculos.filter(v => {
          const searchSpace = [
            v.codigoVehiculo,
            v.anio?.toString(),
            v.estado,
            v.marca,
            v.modelo,
            v.generacion,
            v.notas
          ].filter(Boolean).join(' ').toLowerCase();
          return searchSpace.includes(searchStr);
        });
      }
      
      return vehiculos;
    } catch (error) {
      if (error.response?.status === 404) {
        return [];
      }
      this.error('Error fetching complete vehicles:', error);
      throw error;
    }
  }

  // Obtener un vehículo por su ID desde la vista completa
  async getVehiculoCompletoPorId(id) {
    try {
      const response = await api.get(`/v1/vehiculos/${id}`);
      const vehiculo = response.data;
      
      return {
        id: vehiculo.id,
        codigoVehiculo: vehiculo.codigoVehiculo,
        anio: vehiculo.anio,
        estado: vehiculo.estado,
        marcaNombre: vehiculo.marca,
        modelo: vehiculo.modelo,
        generacionNombre: vehiculo.generacion
      };
    } catch (error) {
      console.error('Error al obtener el vehículo completo:', error);
      throw error;
    }
  }
  
  // Crear un nuevo vehículo
  async crearVehiculo(vehiculoData) {
    try {
      this.log('Creando vehículo con datos:', vehiculoData);
      const response = await api.post('/vehiculos', vehiculoData);
      this.log('Vehículo creado exitosamente:', response.data);
      return response.data;
    } catch (error) {
      this.error('Error al crear el vehículo:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      
      // Si hay errores de validación del servidor, los propagamos
      if (error.response?.data?.errors) {
        const validationError = new Error('Error de validación');
        validationError.response = error.response;
        throw validationError;
      }
      
      throw error;
    }
  }
  
  // Actualizar el estado de un vehículo existente
  async actualizarEstadoVehiculo(id, estado) {
    try {
      const response = await api.put(`/vehiculos/${id}/estado`, null, {
        params: { estado }
      });
      return response.data;
    } catch (error) {
      this.error(`Error al actualizar estado del vehículo ${id}:`, error);
      throw error;
    }
  }

  // Actualizar un vehículo existente
  async actualizarVehiculo(id, vehiculoData) {
    try {
      const response = await api.put(`/vehiculos/${id}`, vehiculoData);
      return response.data;
    } catch (error) {
      console.error('Error al actualizar el vehículo:', error);
      throw error;
    }
  }
  
  // Eliminar un vehículo
  async eliminarVehiculo(id) {
    try {
      await api.delete(`/vehiculos/${id}`);
      return true;
    } catch (error) {
      console.error('Error al eliminar el vehículo:', error);
      throw error;
    }
  }
  
  // Obtener transacciones de un vehículo (versión mejorada)
  async getTransaccionesVehiculo(vehiculoId) {
    try {
      const response = await api.get('/transacciones', {
        params: {
          vehiculoId: vehiculoId,
          sort: 'fecha,desc'
        }
      });
      
      return response.data.map(transaccion => ({
        id: transaccion.id,
        fecha: transaccion.fecha,
        tipo: transaccion.tipo,
        monto: transaccion.monto,
        descripcion: transaccion.descripcion,
        estado: transaccion.estado,
        tipo_transaccion: transaccion.tipo_transaccion || { nombre: transaccion.tipo, categoria: 'EGRESO' }
      }));
    } catch (error) {
      this.error(`Error al obtener transacciones del vehículo ${vehiculoId}:`, error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const vehiculoService = new VehiculoService();
export default vehiculoService;
