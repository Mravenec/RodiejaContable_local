import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Descriptions, Typography, Tabs, Image, Tag, Spin, message } from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  CheckOutlined,
  ToolOutlined, 
  FileTextOutlined,
  DollarOutlined,
  ReloadOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import vehiculoService from '../../api/vehiculos';
import finanzaService from '../../api/finanzas';
import inventarioService from '../../api/inventario';
import { getTiposTransacciones } from '../../api/transacciones';
import { formatCurrency } from '../../utils/formatters';
import api from '../../api/axios';
import HistorialVehiculo from '../../components/vehiculos/HistorialVehiculo';

// Servicio para repuestos
const repuestosService = {
  async getRepuestosPorVehiculo(vehiculoId) {
    try {
      // Use the inventarioService to get all repuestos
      const allRepuestos = await inventarioService.getRepuestos();
      return allRepuestos.filter(repuesto => repuesto.vehiculoOrigenId === parseInt(vehiculoId));
    } catch (error) {
      console.error('Error fetching repuestos:', error);
      return [];
    }
  }
};

// Servicio para transacciones
const transaccionesService = {
  async getTransaccionesPorVehiculo(vehiculoId) {
    try {
      console.log('Fetching transactions for vehicle ID:', vehiculoId);
      
      let allTransacciones, tiposTransaccion;
      
      try {
        // Use Promise.all to fetch transactions and transaction types in parallel
        [allTransacciones, tiposTransaccion] = await Promise.all([
          finanzaService.getTransacciones(),
          getTiposTransacciones()
        ]);
        
        // Ensure we have arrays to work with
        if (!Array.isArray(allTransacciones)) {
          console.error('Unexpected transactions format:', allTransacciones);
          allTransacciones = [];
        }
        
        if (!Array.isArray(tiposTransaccion)) {
          console.error('Unexpected transaction types format:', tiposTransaccion);
          tiposTransaccion = [];
        }
      } catch (fetchError) {
        console.error('Error fetching data:', {
          error: fetchError.message,
          stack: fetchError.stack
        });
        throw fetchError;
      }
      
      // Create a map of tipos for quick lookup
      const tiposMap = tiposTransaccion.reduce((acc, tipo) => {
        acc[tipo.id] = tipo;
        return acc;
      }, {});
      
      
      // First, get all repuestos for this vehicle to find their IDs
      let repuestos = [];
      try {
        // Use the repuestosService to get repuestos for this vehicle
        repuestos = await repuestosService.getRepuestosPorVehiculo(vehiculoId);
      } catch (repuestoError) {
        console.error('Error fetching repuestos:', repuestoError);
      }
      
      const repuestoIds = repuestos.map(r => r.id);
      
      // Filter transactions for the specific vehicle or its repuestos
      const filteredTransacciones = allTransacciones.filter(transaccion => {
        // Check if transaction is directly for this vehicle
        const matchesVehicle = transaccion.vehiculoId !== null && 
                             (transaccion.vehiculoId === vehiculoId || 
                              transaccion.vehiculoId === parseInt(vehiculoId));
        
        const matchesRepuesto = transaccion.repuestoId !== null && 
                               repuestoIds.includes(transaccion.repuestoId);
        
        return matchesVehicle || matchesRepuesto;
      });
      
      
      // Map transactions with their type information
      const vehiculoTransacciones = filteredTransacciones
        .map(transaccion => {
          const tipoInfo = tiposMap[transaccion.tipoTransaccionId] || {
            nombre: 'Tipo desconocido',
            categoria: transaccion.monto > 0 ? 'INGRESO' : 'EGRESO'
          };
          
          return {
            ...transaccion,
            tipo_transaccion: tipoInfo,
            // Ensure we have a proper date string for sorting
            fecha: Array.isArray(transaccion.fecha) 
              ? new Date(transaccion.fecha[0], transaccion.fecha[1] - 1, transaccion.fecha[2])
              : new Date(transaccion.fecha)
          };
        })
        .sort((a, b) => b.fecha - a.fecha); // Sort by date descending
      
      return vehiculoTransacciones;
    } catch (error) {
      console.error('Error fetching transacciones:', error);
      return [];
    }
  }
};

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const VehiculoDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [vehiculo, setVehiculo] = useState(null);
  const [transacciones, setTransacciones] = useState([]);
  const [repuestos, setRepuestos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [loadingTransacciones, setLoadingTransacciones] = useState(false);
  const [loadingRepuestos, setLoadingRepuestos] = useState(false);

  // Load vehicle data
  const loadVehicleData = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      
      // Get vehicle by ID from the flat list
      const vehiculosResponse = await vehiculoService.getVehiculos();
      let vehiculoEncontrado;
      
      console.log('🔍 Buscando vehículo con ID/código:', id);
      console.log('🔍 Vehículos disponibles:', vehiculosResponse.map(v => ({
        id: v.id,
        codigoVehiculo: v.codigoVehiculo,
        codigo_vehiculo: v.codigo_vehiculo
      })));

      if (isNaN(Number(id))) {
        console.log('🔍 Buscando por código (no numérico)');
        vehiculoEncontrado = vehiculosResponse.find(v => 
          v.codigoVehiculo === id || 
          v.codigo_vehiculo === id ||
          v.codigoVehiculo?.toLowerCase() === id.toLowerCase() ||
          v.codigo_vehiculo?.toLowerCase() === id.toLowerCase()
        );
        console.log('🔍 Resultado búsqueda por código:', vehiculoEncontrado);
      } else {
        console.log('🔍 Buscando por ID (numérico)');
        vehiculoEncontrado = vehiculosResponse.find(v => v.id === parseInt(id, 10));
        console.log('🔍 Resultado búsqueda por ID:', vehiculoEncontrado);
      }
      
      if (!vehiculoEncontrado) {
        console.error('❌ Vehículo no encontrado. ID buscado:', id);
        console.error('❌ Códigos disponibles:', vehiculosResponse.map(v => v.codigoVehiculo || v.codigo_vehiculo));
        throw new Error(`Vehículo con código/ID "${id}" no encontrado. Verifique consola para detalles.`);
      }

      // The vehiculosResponse already includes generacion attached from vehiculoService
      let vehiculoConGeneracion = vehiculoEncontrado;

      // If generacion is present but lacks nested modelo/marca, fetch them
      if (vehiculoConGeneracion.generacion && !vehiculoConGeneracion.generacion.modelo) {
        try {
          const generacion = vehiculoConGeneracion.generacion;

          // Fetch modelo
          const modeloResponse = await api.get(`/modelos/${generacion.modeloId}`);
          const modelo = modeloResponse.data || { id: generacion.modeloId };

          // Fetch marca
          const marcaResponse = await api.get(`/marcas/${modelo.marcaId}`);
          const marca = marcaResponse.data || { id: modelo.marcaId, nombre: 'Marca no disponible' };

          // Attach nested structure
          vehiculoConGeneracion = {
            ...vehiculoEncontrado,
            generacion: {
              ...generacion,
              modelo: {
                ...modelo,
                marca: marca
              }
            }
          };

        } catch (nestedError) {
          console.error('Error fetching nested data (modelo/marca):', nestedError);
          // Fallback: attach empty objects to avoid crashes
          vehiculoConGeneracion = {
            ...vehiculoEncontrado,
            generacion: {
              ...vehiculoEncontrado.generacion,
              modelo: {
                nombre: 'Modelo no disponible',
                marca: { nombre: 'Marca no disponible' }
              }
            }
          };
        }
      }

      setVehiculo(vehiculoConGeneracion);

    } catch (error) {
      console.error('Error loading vehicle:', error);
      setIsError(true);
      message.error(`Error al cargar el vehículo: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Handle marking vehicle as available
  const handleMarcarComoDisponible = async () => {
    try {
      await api.put(`/vehiculos/${vehiculo.id}/estado?estado=DISPONIBLE`);
      message.success('Vehículo marcado como disponible exitosamente');
      // Refresh vehicle data
      refetch();
    } catch (error) {
      console.error('Error updating vehicle status:', error);
      message.error('Error al actualizar el estado del vehículo');
    }
  };

  // Load transactions for the vehicle
  const loadTransactions = async (vehiculoId) => {
    
    if (!vehiculoId) {
      console.error('No vehicle ID provided to loadTransactions');
      setTransacciones([]);
      return;
    }
    
    try {
      setLoadingTransacciones(true);
      
      try {
        const transaccionesData = await transaccionesService.getTransaccionesPorVehiculo(vehiculoId);
        
        const transactionsToSet = Array.isArray(transaccionesData) ? transaccionesData : [];
        
        setTransacciones(transactionsToSet);
        
        if (transactionsToSet.length === 0) {
          message.info('No se encontraron transacciones para este vehículo');
        }
      } catch (serviceError) {
        console.error('Service error in loadTransactions:', {
          error: serviceError,
          message: serviceError.message,
          stack: serviceError.stack
        });
        setTransacciones([]);
        message.error(`Error al cargar transacciones: ${serviceError.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Unexpected error in loadTransactions:', {
        error,
        message: error.message,
        stack: error.stack
      });
      setTransacciones([]);
      message.error('Error inesperado al cargar las transacciones');
    } finally {
      setLoadingTransacciones(false);
    }
  };

  // Load repuestos for the vehicle
  const loadRepuestos = async (vehiculoId) => {
    try {
      setLoadingRepuestos(true);
      const repuestosData = await repuestosService.getRepuestosPorVehiculo(vehiculoId);
      setRepuestos(Array.isArray(repuestosData) ? repuestosData : []);
    } catch (error) {
      console.error('Error loading repuestos:', error);
      setRepuestos([]);
      message.warning('No se pudieron cargar los repuestos del vehículo');
    } finally {
      setLoadingRepuestos(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (id) {
      loadVehicleData();
    }
  }, [id, loadVehicleData]);

  // Load transactions and repuestos when vehicle is loaded
  useEffect(() => {
    if (vehiculo?.id) {
      loadTransactions(vehiculo.id);
      loadRepuestos(vehiculo.id);
    }
  }, [vehiculo?.id]);

  const refetch = () => {
    loadVehicleData();
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError || !vehiculo) {
    return (
      <div style={{ padding: '24px' }}>
        <Button 
          type="link" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/vehiculos')}
        >
          Volver a la lista
        </Button>
        <Card style={{ marginTop: '16px' }}>
          <Title level={4}>No se pudo cargar la información del vehículo</Title>
          <Button 
            type="primary" 
            icon={<ReloadOutlined />} 
            onClick={() => refetch()}
            style={{ marginTop: '16px' }}
          >
            Reintentar
          </Button>
        </Card>
      </div>
    );
  }
  
  // Helper function to get estado tag for repuestos
  const getEstadoRepuestoTag = (estado) => {
    const estados = {
      STOCK: { color: 'success', text: 'Disponible' },
      VENDIDO: { color: 'error', text: 'Vendido' },
      RESERVADO: { color: 'warning', text: 'Reservado' },
      DAÑADO: { color: 'error', text: 'Dañado' }
    };
    
    const estadoInfo = estados[estado] || { color: 'default', text: estado || 'Desconocido' };
    return <Tag color={estadoInfo.color}>{estadoInfo.text}</Tag>;
  };

  // Render transaction type tag
  const renderTipoTransaccion = (tipo) => {
    if (!tipo) {
      return <Tag color="default">No especificado</Tag>;
    }
    
    const isIngreso = tipo.categoria === 'INGRESO';
    const color = isIngreso ? 'green' : 'red';
    const nombre = tipo.nombre || 'Desconocido';
    
    return <Tag color={color}>{nombre}</Tag>;
  };

  // Format currency with color based on context (transaction type or vehicle info)
  const formatCurrencyWithColor = (amount, tipo) => {
    const formattedAmount = new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0
    }).format(amount);
    
    // If tipo is provided, format as transaction (with + or -)
    if (tipo !== undefined) {
      const isIngreso = tipo === 'INGRESO';
      return (
        <span style={{ color: isIngreso ? '#52c41a' : '#f5222d' }}>
          {isIngreso ? '+' : '-'} {formattedAmount}
        </span>
      );
    }
    
    // Default formatting for vehicle info (no sign, default color)
    return formattedAmount;
  };

  const getEstadoTag = (estado) => {
    const estados = {
      DISPONIBLE: { color: 'success', text: 'Disponible' },
      VENDIDO: { color: 'error', text: 'Vendido' },
      DESARMADO: { color: 'warning', text: 'Desarmado' },
      REPARACION: { color: 'processing', text: 'En Reparación' }
    };
    
    const estadoInfo = estados[estado] || { color: 'default', text: 'Desconocido' };
    return <Tag color={estadoInfo.color}>{estadoInfo.text}</Tag>;
  };

  // Format dates safely
  const formatDate = (dateValue) => {
    if (!dateValue) return 'No especificada';
    
    try {
      // Handle array format [year, month, day] from API
      if (Array.isArray(dateValue)) {
        const [year, month, day] = dateValue;
        return new Date(year, month - 1, day).toLocaleDateString();
      }
      
      // Handle string/Date format
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? 'Fecha inválida' : date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Fecha inválida';
    }
  };

  // Get vehicle brand and model from generation info
  const getMarcaModelo = () => {
    if (vehiculo.generacion?.modelo?.marca?.nombre && vehiculo.generacion?.modelo?.nombre) {
      return {
        marca: vehiculo.generacion.modelo.marca.nombre,
        modelo: vehiculo.generacion.modelo.nombre
      };
    }
    return { marca: 'Marca no disponible', modelo: 'Modelo no disponible' };
  };

  const { marca, modelo } = getMarcaModelo();

  return (
    <div style={{ padding: '24px' }}>
      <Button 
        type="link" 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/vehiculos')}
        style={{ marginBottom: '16px' }}
      >
        Volver a la lista
      </Button>

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '24px' }}>
            <div style={{ flex: '0 0 300px', marginRight: '24px', marginBottom: '16px' }}>
              <Image
                src={vehiculo.imagenUrl || 'https://via.placeholder.com/300x200?text=Sin+imagen'}
                alt={`${marca} ${modelo}`}
                style={{ width: '100%', borderRadius: '8px' }}
                fallback="https://via.placeholder.com/300x200?text=Imagen+no+disponible"
              />
            </div>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ marginBottom: '16px' }}>
                  <Title level={2} style={{ marginBottom: '8px' }}>
                    {marca} {modelo} {vehiculo.anio || 'Sin año'}
                  </Title>
                  {getEstadoTag(vehiculo.estado)}
                  <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
                    {vehiculo.generacion?.nombre || 'Generación no especificada'}
                  </Text>
                  <Text style={{ display: 'block', marginTop: '8px' }}>
                    <strong>Código:</strong> {vehiculo.codigoVehiculo || 'Sin código'}
                  </Text>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Title level={3} style={{ color: '#1890ff', marginBottom: '4px' }}>
                    {formatCurrency(vehiculo.precioVenta || vehiculo.precioCompra || 0)}
                  </Title>
                  <Text type="secondary">
                    Inversión: {formatCurrency(vehiculo.inversionTotal || 0)}
                  </Text>
                  {vehiculo.fechaVenta && (
                    <div style={{ marginTop: '4px' }}>
                      <Text type="secondary">
                        Vendido el: {formatDate(vehiculo.fechaVenta)}
                      </Text>
                    </div>
                  )}
                  <div style={{ marginTop: '16px' }}>
                    <Button 
                      type="primary" 
                      icon={<EditOutlined />} 
                      style={{ marginRight: '8px', marginBottom: '8px' }}
                      onClick={() => navigate(`/vehiculos/editar/${vehiculo.id}`)}
                    >
                      Editar
                    </Button>
                    {vehiculo.estado === 'REPARACION' && (
                      <Button 
                        type="primary" 
                        icon={<CheckOutlined />}
                        style={{ marginRight: '8px', marginBottom: '8px', backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                        onClick={() => handleMarcarComoDisponible()}
                      >
                        Hacer Disponible
                      </Button>
                    )}
                    {vehiculo.estado !== 'VENDIDO' && (
                      <Button 
                        type="primary" 
                        icon={<DollarOutlined />}
                        onClick={() => navigate(`/finanzas/venta-vehiculo/${vehiculo.id}`)}
                      >
                        Registrar Venta
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultActiveKey="1" style={{ marginTop: '16px', width: '100%' }}>
            <TabPane tab={
              <span><FileTextOutlined /> Información General</span>
            } key="1">
              <div>
                {/* Información Básica del Vehículo */}
                <Card 
                  size="small" 
                  title={<><Text strong>📋 Información Básica</Text></>}
                  style={{ marginBottom: '16px' }}
                >
                  <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                    <Descriptions.Item label="Año" labelStyle={{ fontWeight: 'bold' }}>
                      <Text style={{ fontSize: '15px' }}>{vehiculo.anio || 'No especificado'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Código" labelStyle={{ fontWeight: 'bold' }}>
                      <Text code>{vehiculo.codigoVehiculo || 'Sin código'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Fecha de Ingreso" labelStyle={{ fontWeight: 'bold' }}>
                      {formatDate(vehiculo.fechaIngreso)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Estado" labelStyle={{ fontWeight: 'bold' }}>
                      {getEstadoTag(vehiculo.estado)}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                {/* Especificaciones Técnicas */}
                <Card 
                  size="small" 
                  title={<><Text strong>⚙️ Especificaciones Técnicas</Text></>}
                  style={{ marginBottom: '16px' }}
                >
                  <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                    <Descriptions.Item label="Transmisión" labelStyle={{ fontWeight: 'bold' }}>
                      <Tag color="blue">{vehiculo.transmision || 'No especificado'}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Tracción" labelStyle={{ fontWeight: 'bold' }}>
                      <Tag color="green">{vehiculo.traccion || 'No especificado'}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Combustible" labelStyle={{ fontWeight: 'bold' }}>
                      <Tag color="orange">{vehiculo.combustible || 'No especificado'}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Cilindraje" labelStyle={{ fontWeight: 'bold' }}>
                      <Tag color="purple">{vehiculo.cilindraje || 'No especificado'}</Tag>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                {/* Información Financiera */}
                <Card 
                  size="small" 
                  title={<><Text strong>💰 Información Financiera</Text></>}
                  style={{ marginBottom: '16px' }}
                >
                  <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                    <Descriptions.Item label="Precio de Compra" labelStyle={{ fontWeight: 'bold' }}>
                      <Text style={{ color: '#1890ff', fontSize: '16px' }}>
                        {formatCurrency(vehiculo.precioCompra || 0)}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Costo de Grúa" labelStyle={{ fontWeight: 'bold' }}>
                      {formatCurrency(vehiculo.costoGrua || 0)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Comisiones" labelStyle={{ fontWeight: 'bold' }}>
                      {formatCurrency(vehiculo.comisiones || 0)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Inversión Total" labelStyle={{ fontWeight: 'bold' }}>
                      <Text strong style={{ color: '#52c41a', fontSize: '17px' }}>
                        {formatCurrency(vehiculo.inversionTotal || 0)}
                      </Text>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                {/* Información Adicional */}
                <Card 
                  size="small" 
                  title={<><Text strong>📊 Estado Financiero Detallado</Text></>}
                  style={{ marginBottom: '16px' }}
                >
                  <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                    <Descriptions.Item label="Monto Recuperado" labelStyle={{ fontWeight: 'bold' }}>
                      <div>
                        <div style={{ 
                          color: vehiculo.costoRecuperado < 0 ? '#722ed1' : '#52c41a', 
                          fontWeight: 500,
                          marginBottom: 4
                        }}>
                          {formatCurrency(vehiculo.costoRecuperado || 0)}
                        </div>
                        {vehiculo.inversionTotal > 0 && (() => {
                          const porcentaje = ((vehiculo.costoRecuperado || 0) / vehiculo.inversionTotal) * 100;
                          const porcentajeAbsoluto = Math.abs(porcentaje);
                          const porcentajeBase = Math.min(100, porcentajeAbsoluto);
                          const porcentajeExcedente = Math.max(0, porcentajeAbsoluto - 100);
                          const esNegativo = porcentaje < 0;
                          
                          return (
                            <div> 
                              <div style={{ 
                                width: '100%', 
                                backgroundColor: '#f0f0f0', 
                                borderRadius: 4,
                                marginTop: 4,
                                height: 6,
                                position: 'relative',
                                overflow: 'hidden'
                              }}>
                                {porcentajeAbsoluto > 0 && (
                                  <div 
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      backgroundColor: esNegativo ? '#722ed1' : '#52c41a',
                                      position: 'absolute',
                                      left: 0,
                                      top: 0,
                                      transition: 'width 0.3s',
                                      maxWidth: `${Math.min(100, porcentajeBase)}%`
                                    }}
                                  />
                                )}
                                
                                {porcentajeExcedente > 0 && (
                                  <div 
                                    style={{
                                      width: `${porcentajeExcedente}%`,
                                      height: '100%',
                                      backgroundColor: esNegativo ? '#722ed1' : '#faad14',
                                      position: 'absolute',
                                      right: 0,
                                      top: 0,
                                      transition: 'width 0.3s',
                                      borderTopRightRadius: 4,
                                      borderBottomRightRadius: 4
                                    }}
                                  />
                                )}
                              </div>
                              
                              <div style={{ 
                                fontSize: 12, 
                                color: '#666',
                                marginTop: 4,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <span>
                                  {porcentaje.toLocaleString('es-CR', { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 2 
                                  })}% de la inversión
                                </span>
                                {porcentajeExcedente > 0 && (
                                  <span style={{ 
                                    color: esNegativo ? '#722ed1' : '#d48806',
                                    fontWeight: 500,
                                    marginLeft: 8,
                                    display: 'inline-flex',
                                    alignItems: 'center'
                                  }}>
                                    <span style={{ 
                                      display: 'inline-block',
                                      width: 8, 
                                      height: 8, 
                                      borderRadius: '50%',
                                      backgroundColor: esNegativo ? '#722ed1' : '#faad14',
                                      marginRight: 4
                                    }} />
                                    +{porcentajeExcedente.toFixed(2)}% de {esNegativo ? 'pérdida' : 'ganancia'}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </Descriptions.Item>
                    <Descriptions.Item label="Monto Pendiente" labelStyle={{ fontWeight: 'bold' }}>
                      <div style={{
                        color: (vehiculo.costoPendiente || 0) < 0 ? '#52c41a' : '#f5222d',
                        fontWeight: 500
                      }}>
                        {vehiculo.costoPendiente < 0 ? '+' : ''}{formatCurrency(Math.abs(vehiculo.costoPendiente || 0))}
                      </div>
                    </Descriptions.Item>
                    {vehiculo.precioVenta && (
                      <Descriptions.Item label="Precio de Venta" labelStyle={{ fontWeight: 'bold' }}>
                        <strong style={{ color: '#52c41a', fontSize: '16px' }}>
                          {formatCurrency(vehiculo.precioVenta)}
                        </strong>
                      </Descriptions.Item>
                    )}
                    {vehiculo.fechaVenta && (
                      <Descriptions.Item label="Fecha de Venta" labelStyle={{ fontWeight: 'bold' }}>
                        {formatDate(vehiculo.fechaVenta)}
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label="Notas" span={2} labelStyle={{ fontWeight: 'bold' }}>
                      <Text italic>{vehiculo.notas || 'Sin notas adicionales.'}</Text>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </div>
            </TabPane>
            
            <TabPane tab={
              <span><ToolOutlined /> Repuestos</span>
            } key="2">
              <div style={{ marginTop: '16px' }}>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>Repuestos extraídos de este vehículo</Text>
                  <Button 
                    type="primary" 
                    size="small"
                    disabled={vehiculo.estado !== 'DESARMADO'}
                    title={vehiculo.estado !== 'DESARMADO' ? 'El vehículo debe estar en estado DESARMADO para agregar repuestos' : ''}
                    onClick={() => navigate(`/inventario/nuevo?vehiculoId=${vehiculo.id}`)}
                  >
                    Agregar Repuesto
                  </Button>
                </div>

                {loadingRepuestos ? (
                  <div style={{ textAlign: 'center', padding: '24px' }}>
                    <Spin />
                  </div>
                ) : repuestos && repuestos.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="ant-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>Código</th>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>Parte</th>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>Descripción</th>
                          <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #f0f0f0' }}>Precio Venta</th>
                          <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>Estado</th>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>Ubicación</th>
                          <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {repuestos.map((repuesto) => (
                          <tr key={repuesto.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '8px' }}>
                              <Button
                                type="link"
                                style={{ padding: 0, height: 'auto' }}
                                onClick={() => navigate(`/inventario/${repuesto.id}`)}
                              >
                                {repuesto.codigoRepuesto || 'Sin código'}
                              </Button>
                            </td>
                            <td style={{ padding: '8px' }}>
                              <Tag color="blue">{repuesto.parteVehiculo || 'N/A'}</Tag>
                            </td>
                            <td style={{ padding: '8px' }}>{repuesto.descripcion || 'Sin descripción'}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>
                              {formatCurrency(repuesto.precioVenta || 0)}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              {getEstadoRepuestoTag(repuesto.estado)}
                            </td>
                            <td style={{ padding: '8px', fontSize: '0.85em' }}>
                              {repuesto.codigoUbicacion || 'Sin ubicación'}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <Button 
                                type="link" 
                                size="small"
                                onClick={() => navigate(`/inventario/${repuesto.id}`)}
                              >
                                Ver
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px' }}>
                    <ToolOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '16px' }} />
                    <p>No hay repuestos registrados para este vehículo.</p>
                    <Button 
                      type="primary" 
                      style={{ marginTop: '16px' }}
                      disabled={vehiculo.estado !== 'DESARMADO'}
                      title={vehiculo.estado !== 'DESARMADO' ? 'El vehículo debe estar en estado DESARMADO para agregar repuestos' : ''}
                      onClick={() => navigate(`/inventario/nuevo?vehiculoId=${vehiculo.id}`)}
                    >
                      Agregar Repuesto
                    </Button>
                  </div>
                )}
              </div>
            </TabPane>
            
            <TabPane tab={
              <span><DollarOutlined /> Transacciones</span>
            } key="3">
              <div style={{ marginTop: '16px' }}>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>Historial de transacciones del vehículo</Text>
                  <Button 
                    type="primary" 
                    size="small"
                    onClick={() => navigate(`/finanzas/transaccion/nueva?vehiculoId=${vehiculo.id}`)}
                  >
                    Nueva Transacción
                  </Button>
                </div>
                
                {loadingTransacciones ? (
                  <div style={{ textAlign: 'center', padding: '24px' }}>
                    <Spin />
                  </div>
                ) : transacciones && transacciones.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="ant-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>Fecha</th>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>Tipo</th>
                          <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #f0f0f0' }}>Monto</th>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>Descripción</th>
                          <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transacciones.map((transaccion) => {
                          // Determine if it's an income or expense
                          return (
                            <tr key={transaccion.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                              <td style={{ padding: '8px' }}>{formatDate(transaccion.fecha)}</td>
                              <td style={{ padding: '8px' }}>{renderTipoTransaccion(transaccion.tipo_transaccion)}</td>
                              <td style={{ padding: '8px', textAlign: 'right' }}>
                                {formatCurrencyWithColor(transaccion.monto, transaccion.tipo_transaccion?.categoria)}
                              </td>
                              <td style={{ padding: '8px' }}>{transaccion.descripcion || 'Sin descripción'}</td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <Button 
                                  type="link" 
                                  size="small"
                                  onClick={() => navigate(`/finanzas/${transaccion.id}`)}
                                >
                                  Ver
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px' }}>
                    <DollarOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '16px' }} />
                    <p>No hay transacciones registradas para este vehículo.</p>
                    <Button 
                      type="primary" 
                      style={{ marginTop: '16px' }}
                      onClick={() => navigate(`/finanzas/transaccion/nueva?vehiculoId=${vehiculo.id}`)}
                    >
                      Agregar Transacción
                    </Button>
                  </div>
                )}
              </div>
            </TabPane>
            
            <TabPane tab={
              <span><HistoryOutlined /> Historial</span>
            } key="4">
              <HistorialVehiculo vehiculoId={id} />
            </TabPane>
          </Tabs>
        </div>
      </Card>
    </div>
  );
};

export default VehiculoDetalle;