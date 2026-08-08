import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Typography, Tabs, Image, Tag, Spin, message, Row, Col, Divider } from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  CheckOutlined,
  ToolOutlined, 
  FileTextOutlined,
  MoneyCollectOutlined,
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
import ImageCarousel from '../../components/common/ImageCarousel';
import { useAuth } from '../../context/AuthContext';
import { audatexService } from '../../api';

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
  const { user } = useAuth();
  
  // State management
  const [vehiculo, setVehiculo] = useState(null);
  const [transacciones, setTransacciones] = useState([]);
  const [repuestos, setRepuestos] = useState([]);
  const [oportunidadesPorRepuesto, setOportunidadesPorRepuesto] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [loadingTransacciones, setLoadingTransacciones] = useState(false);
  const [loadingRepuestos, setLoadingRepuestos] = useState(false);

  // Load vehicle data
  const loadVehicleData = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      
      // Get vehicle by ID directly from API
      let vehiculoEncontrado;
      
      console.log('🔍 Buscando vehículo con ID/código:', id);

      if (isNaN(Number(id))) {
        console.log('🔍 Buscando por código (no numérico) - requires fetch all');
        const vehiculosResponse = await vehiculoService.getVehiculos();
        vehiculoEncontrado = vehiculosResponse.find(v => 
          v.codigoVehiculo === id || 
          v.codigo_vehiculo === id ||
          v.codigoVehiculo?.toLowerCase() === id.toLowerCase() ||
          v.codigo_vehiculo?.toLowerCase() === id.toLowerCase()
        );
      } else {
        console.log('🔍 Buscando por ID (numérico)');
        vehiculoEncontrado = await vehiculoService.getVehiculo(parseInt(id, 10));
      }
      
      if (!vehiculoEncontrado) {
        console.error('❌ Vehículo no encontrado. ID buscado:', id);
        throw new Error(`Vehículo con código/ID "${id}" no encontrado. Verifique consola para detalles.`);
      }

      // The vehiculosResponse already includes generacion attached from vehiculoService
      let vehiculoConGeneracion = vehiculoEncontrado;

      // If generacion is present but lacks nested modelo/marca, fetch them
      if (vehiculoConGeneracion.generacion && vehiculoConGeneracion.generacion.modeloId && !vehiculoConGeneracion.generacion.modelo) {
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

  // ROD-22: Cargar oportunidades de Audatex por repuesto en batch
  const cargarOportunidadesPorRepuesto = async () => {
    try {
      const response = await audatexService.obtenerOportunidadesBatch();
      setOportunidadesPorRepuesto(response.data?.counts || {});
    } catch (error) {
      console.error('Error cargando oportunidades por repuesto:', error);
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

  // ROD-22: Cargar oportunidades cuando se cargan los repuestos
  useEffect(() => {
    if (repuestos.length > 0) {
      cargarOportunidadesPorRepuesto();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repuestos]);

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

      <Card bordered={false} style={{ borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)', border: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '24px' }}>
            <div style={{ flex: '0 0 300px', marginRight: '24px', marginBottom: '16px' }}>
              <ImageCarousel 
                imageUrlString={vehiculo.imagenUrl} 
                alt={`${marca} ${modelo}`} 
                width="100%" 
                borderRadius="8px"
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
                    {user?.rol !== 'CONTADOR' && (
                      <Button 
                        type="primary" 
                        icon={<EditOutlined />} 
                        style={{ marginRight: '8px', marginBottom: '8px' }}
                        onClick={() => navigate(`/vehiculos/editar/${vehiculo.id}`)}
                      >
                        Editar
                      </Button>
                    )}
                    {vehiculo.estado === 'REPARACION' && user?.rol !== 'CONTADOR' && (
                      <Button 
                        type="primary" 
                        icon={<CheckOutlined />}
                        style={{ marginRight: '8px', marginBottom: '8px', backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                        onClick={() => handleMarcarComoDisponible()}
                      >
                        Hacer Disponible
                      </Button>
                    )}
                    {vehiculo.estado === 'DISPONIBLE' && user?.rol !== 'CONTADOR' && (
                      <Button 
                        type="primary" 
                        icon={<MoneyCollectOutlined />}
                        onClick={() => navigate('/finanzas/nueva', {
                          state: {
                            vehiculoId: vehiculo.id,
                            tipoTransaccion: 'INGRESO',
                            monto: vehiculo.precioVenta || 0,
                            esVentaVehiculo: true
                          }
                        })}
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
            <TabPane tab={<span><FileTextOutlined /> Información General</span>} key="1">
              {/* ── Identificación ── */}
              <Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Identificación
              </Text>
              <Divider style={{ marginTop: '8px', marginBottom: '16px' }} />
              <Row gutter={[24, 16]}>
                <Col xs={12} sm={8} md={6}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Año</Text>
                  <Text strong style={{ fontSize: '15px' }}>{vehiculo.anio || '—'}</Text>
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Código</Text>
                  <Text code>{vehiculo.codigoVehiculo || 'Sin código'}</Text>
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Estado</Text>
                  {getEstadoTag(vehiculo.estado)}
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Generación</Text>
                  <Text strong>{vehiculo.generacion?.nombre || '—'}</Text>
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Fecha de Ingreso</Text>
                  <Text>{formatDate(vehiculo.fechaIngreso)}</Text>
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Vehículo Activo</Text>
                  <Tag color={vehiculo.activo !== false ? 'success' : 'default'}>
                    {vehiculo.activo !== false ? 'Activo' : 'Inactivo'}
                  </Tag>
                </Col>
              </Row>

              {/* ── Especificaciones Técnicas ── */}
              <Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginTop: '24px' }}>
                Especificaciones Técnicas
              </Text>
              <Divider style={{ marginTop: '8px', marginBottom: '16px' }} />
              <Row gutter={[24, 16]}>
                <Col xs={12} sm={8} md={6}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Transmisión</Text>
                  <Tag color="blue">{vehiculo.transmision || 'N/E'}</Tag>
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Tracción</Text>
                  <Tag color="green">{vehiculo.traccion || 'N/E'}</Tag>
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Combustible</Text>
                  <Tag color="orange">{vehiculo.combustible || 'N/E'}</Tag>
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Cilindraje</Text>
                  <Tag color="purple">{vehiculo.cilindraje || 'N/E'}</Tag>
                </Col>
              </Row>

              {/* ── Información Financiera ── */}
              <Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginTop: '24px' }}>
                Información Financiera
              </Text>
              <Divider style={{ marginTop: '8px', marginBottom: '16px' }} />
              <Row gutter={[24, 16]}>
                <Col xs={12} sm={8} md={6}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Precio de Compra</Text>
                  <Text strong style={{ color: '#cf1322', fontSize: '15px' }}>{formatCurrency(vehiculo.precioCompra || 0)}</Text>
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Costo de Grúa</Text>
                  <Text style={{ color: '#cf1322' }}>{formatCurrency(vehiculo.costoGrua || 0)}</Text>
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Comisiones</Text>
                  <Text style={{ color: '#cf1322' }}>{formatCurrency(vehiculo.comisiones || 0)}</Text>
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Inversión Total</Text>
                  <Text strong style={{ color: '#cf1322', fontSize: '16px' }}>{formatCurrency(vehiculo.inversionTotal || 0)}</Text>
                </Col>
                {vehiculo.precioVenta && (
                  <Col xs={12} sm={8} md={6}>
                    <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Precio de Venta</Text>
                    <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>{formatCurrency(vehiculo.precioVenta)}</Text>
                  </Col>
                )}
                {vehiculo.fechaVenta && (
                  <Col xs={12} sm={8} md={6}>
                    <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Fecha de Venta</Text>
                    <Text>{formatDate(vehiculo.fechaVenta)}</Text>
                  </Col>
                )}
              </Row>

              {/* ── Estado Financiero (barra de progreso) ── */}
              {vehiculo.inversionTotal > 0 && (() => {
                const porcentaje = ((vehiculo.costoRecuperado || 0) / vehiculo.inversionTotal) * 100;
                const porcentajeAbsoluto = Math.abs(porcentaje);
                const porcentajeBase = Math.min(100, porcentajeAbsoluto);
                const porcentajeExcedente = Math.max(0, porcentajeAbsoluto - 100);
                const esNegativo = porcentaje < 0;
                return (
                  <>
                    <Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginTop: '24px' }}>
                      Estado de Recuperación
                    </Text>
                    <Divider style={{ marginTop: '8px', marginBottom: '16px' }} />
                    <Row gutter={[24, 16]}>
                      <Col xs={24} sm={12}>
                        <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Monto Recuperado</Text>
                        <Text strong style={{ color: esNegativo ? '#722ed1' : '#52c41a', fontSize: '15px' }}>
                          {formatCurrency(vehiculo.costoRecuperado || 0)}
                        </Text>
                        <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: 6, marginTop: 8, height: 8, position: 'relative', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, porcentajeBase)}%`, height: '100%', backgroundColor: esNegativo ? '#722ed1' : '#52c41a', position: 'absolute', left: 0, top: 0, transition: 'width 0.4s', borderRadius: 6 }} />
                          {porcentajeExcedente > 0 && (
                            <div style={{ width: `${porcentajeExcedente}%`, height: '100%', backgroundColor: '#faad14', position: 'absolute', right: 0, top: 0, borderTopRightRadius: 6, borderBottomRightRadius: 6 }} />
                          )}
                        </div>
                        <Text type="secondary" style={{ fontSize: '12px', marginTop: 4, display: 'block' }}>
                          {porcentaje.toLocaleString('es-CR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% de la inversión recuperado
                        </Text>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Monto Pendiente</Text>
                        <Text strong style={{ color: (vehiculo.costoPendiente || 0) < 0 ? '#52c41a' : '#f5222d', fontSize: '15px' }}>
                          {vehiculo.costoPendiente < 0 ? '+' : ''}{formatCurrency(Math.abs(vehiculo.costoPendiente || 0))}
                        </Text>
                      </Col>
                    </Row>
                  </>
                );
              })()}

              {/* ── Notas ── */}
              {vehiculo.notas && (
                <>
                  <Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginTop: '24px' }}>
                    Notas
                  </Text>
                  <Divider style={{ marginTop: '8px', marginBottom: '12px' }} />
                  <Text italic type="secondary">{vehiculo.notas}</Text>
                </>
              )}
            </TabPane>
            
            <TabPane tab={
              <span><ToolOutlined /> Repuestos</span>
            } key="2">
              <div style={{ marginTop: '16px' }}>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>Repuestos extraídos de este vehículo</Text>
                  {user?.rol !== 'CONTADOR' && (
                    <Button 
                      type="primary" 
                      size="small"
                      disabled={vehiculo.estado !== 'DESARMADO'}
                      title={vehiculo.estado !== 'DESARMADO' ? 'El vehículo debe estar en estado DESARMADO para agregar repuestos' : ''}
                      onClick={() => navigate(`/inventario/nuevo?vehiculoId=${vehiculo.id}`)}
                    >
                      Agregar Repuesto
                    </Button>
                  )}
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
                          <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>Oportunidades InPart</th>
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
                              {(() => {
                                const oportunidades = oportunidadesPorRepuesto[repuesto.id] || 0;
                                if (oportunidades > 0) {
                                  let color = 'green';
                                  let prefix = '';
                                  if (oportunidades >= 7) { color = 'red'; prefix = '🔥 '; }
                                  else if (oportunidades >= 5) { color = 'gold'; }
                                  return (
                                    <Tag 
                                      color={color} 
                                      style={{ cursor: 'pointer', fontWeight: color === 'red' ? 700 : 600 }}
                                      onClick={() => navigate(`/inventario/${repuesto.id}?tab=oportunidades`)}
                                    >
                                      {prefix}{oportunidades} {oportunidades === 1 ? 'oportunidad' : 'oportunidades'}
                                    </Tag>
                                  );
                                }
                                return <Tag color="default">Sin oportunidades</Tag>;
                              })()}
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
                    {user?.rol !== 'CONTADOR' && (
                      <Button 
                        type="primary" 
                        style={{ marginTop: '16px' }}
                        disabled={vehiculo.estado !== 'DESARMADO'}
                        title={vehiculo.estado !== 'DESARMADO' ? 'El vehículo debe estar en estado DESARMADO para agregar repuestos' : ''}
                        onClick={() => navigate(`/inventario/nuevo?vehiculoId=${vehiculo.id}`)}
                      >
                        Agregar Repuesto
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </TabPane>
            
            <TabPane tab={
              <span><MoneyCollectOutlined /> Transacciones</span>
            } key="3">
              <div style={{ marginTop: '16px' }}>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>Historial de transacciones del vehículo</Text>
                  {user?.rol !== 'CONTADOR' && (
                    <Button 
                      type="primary" 
                      size="small"
                      onClick={() => navigate('/finanzas/nueva')}
                    >
                      Nueva Transacción
                    </Button>
                  )}
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
                    <MoneyCollectOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '16px' }} />
                    <p>No hay transacciones registradas para este vehículo.</p>
                    <Button 
                      type="primary" 
                      style={{ marginTop: '16px' }}
                      onClick={() => navigate('/finanzas/nueva')}
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