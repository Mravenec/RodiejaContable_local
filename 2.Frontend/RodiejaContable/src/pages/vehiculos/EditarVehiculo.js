import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Button, 
  Typography, 
  Tabs, 
  Image, 
  Tag, 
  Spin, 
  message,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Switch,
  Descriptions,
  Space
} from 'antd';
import { 
  ArrowLeftOutlined, 
  SaveOutlined,
  DollarOutlined,
  ToolOutlined, 
  FileTextOutlined,
} from '@ant-design/icons';
import { useUpdateVehiculo } from '../../hooks/useVehiculos';
import vehiculoService from '../../api/vehiculos';
import finanzaService from '../../api/finanzas';
import inventarioService from '../../api/inventario';
import { getTiposTransacciones } from '../../api/transacciones';
import { formatCurrency } from '../../utils/formatters';
import api from '../../api/axios';
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;

// Servicio para repuestos
const repuestosService = {
  async getRepuestosPorVehiculo(vehiculoId) {
    try {
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
      let allTransacciones, tiposTransaccion;
      
      try {
        [allTransacciones, tiposTransaccion] = await Promise.all([
          finanzaService.getTransacciones(),
          getTiposTransacciones()
        ]);
        
        if (!Array.isArray(allTransacciones)) allTransacciones = [];
        if (!Array.isArray(tiposTransaccion)) tiposTransaccion = [];
      } catch (fetchError) {
        throw fetchError;
      }
      
      const tiposMap = tiposTransaccion.reduce((acc, tipo) => {
        acc[tipo.id] = tipo;
        return acc;
      }, {});
      
      let repuestos = [];
      try {
        repuestos = await repuestosService.getRepuestosPorVehiculo(vehiculoId);
      } catch (repuestoError) {
        console.error('Error fetching repuestos:', repuestoError);
      }
      
      const repuestoIds = repuestos.map(r => r.id);
      
      const filteredTransacciones = allTransacciones.filter(transaccion => {
        const matchesVehicle = transaccion.vehiculoId != null && 
                             (transaccion.vehiculoId === vehiculoId || 
                              transaccion.vehiculoId === parseInt(vehiculoId));
        
        const matchesRepuesto = transaccion.repuestoId != null && 
                               repuestoIds.includes(transaccion.repuestoId);
        
        return matchesVehicle || matchesRepuesto;
      });
      
      return filteredTransacciones
        .map(transaccion => ({
          ...transaccion,
          tipo_transaccion: tiposMap[transaccion.tipoTransaccionId] || {
            nombre: 'Tipo desconocido',
            categoria: transaccion.monto > 0 ? 'INGRESO' : 'EGRESO'
          },
          fecha: Array.isArray(transaccion.fecha) 
            ? new Date(transaccion.fecha[0], transaccion.fecha[1] - 1, transaccion.fecha[2])
            : new Date(transaccion.fecha)
        }))
        .sort((a, b) => b.fecha - a.fecha);
    } catch (error) {
      console.error('Error fetching transacciones:', error);
      return [];
    }
  }
};

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const EditarVehiculo = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  
  // Estados
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vehiculo, setVehiculo] = useState(null);
  const [transacciones, setTransacciones] = useState([]);
  const [repuestos, setRepuestos] = useState([]);
  const [generaciones] = useState([]);
  const [loadingTransacciones, setLoadingTransacciones] = useState(false);
  const [loadingRepuestos, setLoadingRepuestos] = useState(false);

  // Use the same update logic as the hook
  const updateVehiculo = useUpdateVehiculo({
    onSuccess: () => {
      navigate(`/vehiculos/${id}`);
    },
    onError: (error) => {
      console.error('Error actualizando vehículo:', error);
    }
  });

  // Load vehicle data using the same logic as VehiculoDetalle
  const loadVehicleData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get vehicle by ID from the flat list (same approach as VehiculoDetalle)
      const vehiculosResponse = await vehiculoService.getVehiculos();
      const vehiculoEncontrado = vehiculosResponse.find(v => v.id === parseInt(id));
      
      if (!vehiculoEncontrado) {
        throw new Error('Vehículo no encontrado');
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

          console.log('Vehículo completo con jerarquía:', vehiculoConGeneracion);
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
      message.error(`Error al cargar el vehículo: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadVehicleData();
  }, [loadVehicleData]);

  // Update form when vehicle data changes and load transactions/repuestos
  useEffect(() => {
    if (vehiculo) {
      console.log('Vehicle data loaded, updating form:', vehiculo);
      
      // Handle both imagenUrl and imagen_url field names
      const imagenUrl = vehiculo.imagenUrl || vehiculo.imagen_url || '';
      
      // Handle date parsing more robustly
      let fechaIngresoMoment = null;
      let fechaVentaMoment = null;
      
      if (vehiculo.fechaIngreso) {
        try {
          fechaIngresoMoment = moment(vehiculo.fechaIngreso);
          if (!fechaIngresoMoment.isValid()) {
            console.warn('Invalid fechaIngreso, trying alternative formats');
            fechaIngresoMoment = moment(vehiculo.fechaIngreso, ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD']);
          }
        } catch (error) {
          console.error('Error parsing fechaIngreso:', error, 'Raw value:', vehiculo.fechaIngreso);
        }
      }
      
      if (vehiculo.fechaVenta) {
        try {
          fechaVentaMoment = moment(vehiculo.fechaVenta);
          if (!fechaVentaMoment.isValid()) {
            console.warn('Invalid fechaVenta, trying alternative formats');
            fechaVentaMoment = moment(vehiculo.fechaVenta, ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD']);
          }
        } catch (error) {
          console.error('Error parsing fechaVenta:', error, 'Raw value:', vehiculo.fechaVenta);
        }
      }
      
      console.log('Setting form values:', {
        codigoVehiculo: vehiculo.codigoVehiculo,
        generacionId: vehiculo.generacionId,
        imagenUrl: imagenUrl,
        anio: vehiculo.anio,
        precioCompra: vehiculo.precioCompra,
        costoGrua: vehiculo.costoGrua || 0,
        comisiones: vehiculo.comisiones || 0,
        inversionTotal: vehiculo.inversionTotal || 0,
        fechaIngreso: fechaIngresoMoment,
        fechaVenta: fechaVentaMoment,
        estado: vehiculo.estado || 'DISPONIBLE',
        precioVenta: vehiculo.precioVenta,
        activo: vehiculo.activo !== false,
        notas: vehiculo.notas
      });
      
      form.setFieldsValue({
        codigoVehiculo: vehiculo.codigoVehiculo,
        generacionId: vehiculo.generacionId,
        imagenUrl: imagenUrl,
        anio: vehiculo.anio,
        precioCompra: vehiculo.precioCompra,
        costoGrua: vehiculo.costoGrua || 0,
        comisiones: vehiculo.comisiones || 0,
        inversionTotal: vehiculo.inversionTotal || 0,
        fechaIngreso: fechaIngresoMoment,
        fechaVenta: fechaVentaMoment,
        estado: vehiculo.estado || 'DISPONIBLE',
        precioVenta: vehiculo.precioVenta,
        activo: vehiculo.activo !== false,
        notas: vehiculo.notas,
        costoRecuperado: vehiculo.costoRecuperado || 0,
        cilindraje: vehiculo.cilindraje || '',
        traccion: vehiculo.traccion || null,
        transmision: vehiculo.transmision || null,
        combustible: vehiculo.combustible || null
      });
      
      // Load transactions and repuestos for this vehicle
      if (vehiculo.id) {
        loadTransactions(vehiculo.id);
        loadRepuestos(vehiculo.id);
      }
    }
  }, [vehiculo, form]);

  const loadRepuestos = async (vehiculoId) => {
    try {
      setLoadingRepuestos(true);
      const repuestosData = await repuestosService.getRepuestosPorVehiculo(vehiculoId);
      setRepuestos(repuestosData);
    } catch (error) {
      console.error('Error cargando repuestos:', error);
      message.warning('No se pudieron cargar los repuestos');
    } finally {
      setLoadingRepuestos(false);
    }
  };

  const loadTransactions = async (vehiculoId) => {
    try {
      setLoadingTransacciones(true);
      const transaccionesData = await transaccionesService.getTransaccionesPorVehiculo(vehiculoId);
      setTransacciones(Array.isArray(transaccionesData) ? transaccionesData : []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransacciones([]);
      message.error('Error al cargar las transacciones');
    } finally {
      setLoadingTransacciones(false);
    }
  };

  // Load transactions when vehicle data is available
  useEffect(() => {
    if (vehiculo?.id) {
      loadTransactions(vehiculo.id);
      loadRepuestos(vehiculo.id);
    }
  }, [vehiculo?.id]);

  const onFinish = async (values) => {
    try {
      setSaving(true);
      
      const formattedValues = {
        generacionId: values.generacionId ? parseInt(values.generacionId) : null,
        anio: values.anio ? parseInt(values.anio) : null,
        precioCompra: values.precioCompra ? parseFloat(values.precioCompra) : null,
        costoGrua: values.costoGrua ? parseFloat(values.costoGrua) : 0,
        comisiones: values.comisiones ? parseFloat(values.comisiones) : 0,
        precioVenta: values.precioVenta ? parseFloat(values.precioVenta) : null,
        imagenUrl: values.imagenUrl || '',
        fechaIngreso: values.fechaIngreso && values.fechaIngreso.isValid() ? values.fechaIngreso.format('YYYY-MM-DD') : null,
        fechaVenta: values.fechaVenta && values.fechaVenta.isValid() ? values.fechaVenta.format('YYYY-MM-DD') : null,
        estado: values.estado,
        notas: values.notas || '',
        traccion: values.traccion || null,
        transmision: values.transmision || null,
        combustible: values.combustible || null,
        cilindraje: values.cilindraje || null
      };
      
      // Remove calculated fields from payload as they're handled in backend
      delete formattedValues.inversionTotal;
      delete formattedValues.costoRecuperado;
      delete formattedValues.costoPendiente;
      
      // Remove codigoVehiculo as it shouldn't be updated
      delete formattedValues.codigoVehiculo;
      
      // Debug: Log the data being sent
      console.log('Sending to API:', JSON.stringify(formattedValues, null, 2));
      
      // Use the hook to update the vehicle
      updateVehiculo.mutate({ id, ...formattedValues });
      
    } catch (error) {
      console.error('Error actualizando vehículo:', error);
      message.error('Error al actualizar el vehículo');
    } finally {
      setSaving(false);
    }
  };

  // Helper functions (copiados de VehiculoDetalle)
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

  const renderTipoTransaccion = (tipo) => {
    if (!tipo) {
      return <Tag color="default">No especificado</Tag>;
    }
    
    const isIngreso = tipo.categoria === 'INGRESO';
    const color = isIngreso ? 'green' : 'red';
    const nombre = tipo.nombre || 'Desconocido';
    
    return <Tag color={color}>{nombre}</Tag>;
  };

  const formatCurrencyWithColor = (amount, tipo) => {
    const formattedAmount = new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0
    }).format(amount);
    
    if (tipo !== undefined) {
      const isIngreso = tipo === 'INGRESO';
      return (
        <span style={{ color: isIngreso ? '#52c41a' : '#f5222d' }}>
          {isIngreso ? '+' : '-'} {formattedAmount}
        </span>
      );
    }
    
    return formattedAmount;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'No especificada';
    
    try {
      if (Array.isArray(dateValue)) {
        const [year, month, day] = dateValue;
        return new Date(year, month - 1, day).toLocaleDateString();
      }
      
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? 'Fecha inválida' : date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Fecha inválida';
    }
  };

  const getMarcaModelo = () => {
    if (vehiculo?.generacion?.modelo?.marca?.nombre && vehiculo?.generacion?.modelo?.nombre) {
      return {
        marca: vehiculo.generacion.modelo.marca.nombre,
        modelo: vehiculo.generacion.modelo.nombre
      };
    }
    return { marca: 'Marca no disponible', modelo: 'Modelo no disponible' };
  };

  const { marca, modelo } = getMarcaModelo();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Button 
        type="link" 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate(`/vehiculos/${id}`)}
        style={{ marginBottom: '16px' }}
      >
        Volver al detalle
      </Button>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '24px' }}>
              <div style={{ flex: '0 0 300px', marginRight: '24px', marginBottom: '16px' }}>
                <Image
                  src={form.getFieldValue('imagenUrl') || vehiculo?.imagenUrl || vehiculo?.imagen_url || 'https://via.placeholder.com/300x200?text=Sin+imagen'}
                  alt={`${marca} ${modelo}`}
                  style={{ width: '100%', borderRadius: '8px' }}
                  fallback="https://via.placeholder.com/300x200?text=Imagen+no+disponible"
                />
              </div>
              
              <div style={{ flex: 1, minWidth: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <Title level={2} style={{ marginBottom: '8px' }}>
                      {marca} {modelo} {vehiculo?.anio || 'Sin año'}{' '}
                      <Form.Item
                        name="anio"
                        style={{ display: 'inline-block', margin: '0 8px', width: '80px' }}
                        rules={[{ required: true, message: 'El año es requerido' }]}
                      >
                        <InputNumber 
                          placeholder="Año"
                          min={1900}
                          max={new Date().getFullYear() + 1}
                        />
                      </Form.Item>
                    </Title>
                    
                    {getEstadoTag(form.getFieldValue('estado') || vehiculo?.estado)}
                    
                    <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
                      {vehiculo?.generacion?.nombre || 'Generación no especificada'}
                    </Text>
                    
                    <Text style={{ display: 'block', marginTop: '8px' }}>
                      <strong>Código:</strong>{' '}
                      <Form.Item
                        name="codigoVehiculo"
                        style={{ display: 'inline-block', margin: '0 8px', width: '120px' }}
                        rules={[{ required: true, message: 'El código es requerido' }]}
                      >
                        <Input placeholder="Ej: TOCO-001" />
                      </Form.Item>
                    </Text>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <Title level={3} style={{ color: '#1890ff', marginBottom: '4px' }}>
                      {formatCurrency(form.getFieldValue('precioVenta') || vehiculo?.precioCompra || 0)}
                    </Title>
                    <Text type="secondary">
                      Inversión: {formatCurrency(
                        (form.getFieldValue('precioCompra') || vehiculo?.precioCompra || 0) + 
                        (form.getFieldValue('costoGrua') || vehiculo?.costoGrua || 0) + 
                        (form.getFieldValue('comisiones') || vehiculo?.comisiones || 0)
                      )}
                    </Text>
                    
                    {(form.getFieldValue('fechaVenta') || vehiculo?.fechaVenta) && (
                      <div style={{ marginTop: '4px' }}>
                        <Text type="secondary">
                          Vendido el: {formatDate(form.getFieldValue('fechaVenta') || vehiculo?.fechaVenta)}
                        </Text>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Tabs defaultActiveKey="1" style={{ marginTop: '16px', width: '100%' }}>
              <TabPane tab={<span><FileTextOutlined /> Información General</span>} key="1">
                <div style={{ background: '#fafafa', padding: '16px', borderRadius: '8px' }}>
                  <Descriptions 
                    bordered 
                    column={{ xs: 1, sm: 2 }} 
                    size="small" 
                    style={{ width: '100%', background: 'white' }}
                    labelStyle={{ width: '120px', fontWeight: 'bold' }}
                    contentStyle={{ padding: '12px 16px' }}
                  >
                    {/* Información Básica */}
                    <Descriptions.Item label="Año">
                      <Form.Item
                        name="anio"
                        style={{ margin: 0, marginBottom: 0 }}
                        rules={[{ required: true, message: 'El año es requerido' }]}
                      >
                        <InputNumber 
                          style={{ width: '100%' }}
                          placeholder="Año"
                          min={1900}
                          max={new Date().getFullYear() + 1}
                        />
                      </Form.Item>
                    </Descriptions.Item>
                    
                    <Descriptions.Item label="Código">
                      <Form.Item
                        name="codigoVehiculo"
                        style={{ margin: 0, marginBottom: 0 }}
                        rules={[{ required: true, message: 'El código es requerido' }]}
                      >
                        <Input placeholder="Ej: TOCO-001" />
                      </Form.Item>
                    </Descriptions.Item>
                    
                    <Descriptions.Item label="Fecha Ingreso">
                      <Form.Item
                        name="fechaIngreso"
                        style={{ margin: 0, marginBottom: 0 }}
                        rules={[{ required: true, message: 'La fecha de ingreso es requerida' }]}
                      >
                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Selecciona fecha" />
                      </Form.Item>
                    </Descriptions.Item>
                    
                    <Descriptions.Item label="Estado">
                      <Form.Item
                        name="estado"
                        style={{ margin: 0, marginBottom: 0 }}
                        rules={[{ required: true, message: 'El estado es requerido' }]}
                      >
                        <Select placeholder="Selecciona estado">
                          <Option value="DISPONIBLE">Disponible</Option>
                          <Option value="VENDIDO">Vendido</Option>
                          <Option value="DESARMADO">Desarmado</Option>
                          <Option value="REPARACION">En Reparación</Option>
                        </Select>
                      </Form.Item>
                    </Descriptions.Item>

                    {/* Especificaciones Técnicas */}
                    <Descriptions.Item label="Transmisión">
                      <Form.Item
                        name="transmision"
                        style={{ margin: 0, marginBottom: 0 }}
                      >
                        <Select placeholder="Selecciona transmisión">
                          <Option value="Automatico">Automático</Option>
                          <Option value="Manual">Manual</Option>
                        </Select>
                      </Form.Item>
                    </Descriptions.Item>

                    <Descriptions.Item label="Tracción">
                      <Form.Item
                        name="traccion"
                        style={{ margin: 0, marginBottom: 0 }}
                      >
                        <Select placeholder="Selecciona tracción">
                          <Option value="4x2">4x2</Option>
                          <Option value="4x4">4x4</Option>
                        </Select>
                      </Form.Item>
                    </Descriptions.Item>

                    <Descriptions.Item label="Combustible">
                      <Form.Item
                        name="combustible"
                        style={{ margin: 0, marginBottom: 0 }}
                      >
                        <Select placeholder="Selecciona combustible">
                          <Option value="Gasolina">Gasolina</Option>
                          <Option value="Diesel">Diésel</Option>
                          <Option value="Eléctrico">Eléctrico</Option>
                        </Select>
                      </Form.Item>
                    </Descriptions.Item>

                    <Descriptions.Item label="Cilindraje">
                      <Form.Item
                        name="cilindraje"
                        style={{ margin: 0, marginBottom: 0 }}
                        rules={[{ max: 200, message: 'El cilindraje no puede exceder 200 caracteres' }]}
                      >
                        <Input placeholder="Ej: 1.8L, 1600cc, V6 3.5L" maxLength={200} />
                      </Form.Item>
                    </Descriptions.Item>
                  
                  <Descriptions.Item label="Precio de Compra">
                    <Form.Item
                      name="precioCompra"
                      style={{ margin: 0 }}
                      rules={[{ required: true, message: 'El precio de compra es requerido' }]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/₡\s?|(,*)/g, '')}
                        min={0}
                        precision={2}
                      />
                    </Form.Item>
                  </Descriptions.Item>
                  
                  <Descriptions.Item label="Costo de Grúa">
                    <Form.Item
                      name="costoGrua"
                      style={{ margin: 0 }}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/₡\s?|(,*)/g, '')}
                        min={0}
                        precision={2}
                      />
                    </Form.Item>
                  </Descriptions.Item>
                  
                  <Descriptions.Item label="Comisiones">
                    <Form.Item
                      name="comisiones"
                      style={{ margin: 0 }}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/₡\s?|(,*)/g, '')}
                        min={0}
                        precision={2}
                      />
                    </Form.Item>
                  </Descriptions.Item>
                  
                  <Descriptions.Item label="Inversión Total">
                    <Form.Item
                      name="inversionTotal"
                      style={{ margin: 0 }}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/₡\s?|(,*)/g, '')}
                        min={0}
                        precision={2}
                      />
                    </Form.Item>
                  </Descriptions.Item>
                  
                  <Descriptions.Item label="Precio de Venta">
                    <Form.Item
                      name="precioVenta"
                      style={{ margin: 0 }}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/₡\s?|(,*)/g, '')}
                        min={0}
                        precision={2}
                      />
                    </Form.Item>
                  </Descriptions.Item>
                  
                  <Descriptions.Item label="Fecha de Venta">
                    <Form.Item
                      name="fechaVenta"
                      style={{ margin: 0 }}
                    >
                      <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                  </Descriptions.Item>
                  
                  <Descriptions.Item label="URL de Imagen">
                    <Form.Item
                      name="imagenUrl"
                      style={{ margin: 0 }}
                    >
                      <Input placeholder="https://ejemplo.com/imagen.jpg" />
                    </Form.Item>
                  </Descriptions.Item>
                  
                  <Descriptions.Item label="Activo">
                    <Form.Item
                      name="activo"
                      style={{ margin: 0 }}
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="Sí" unCheckedChildren="No" />
                    </Form.Item>
                  </Descriptions.Item>
                  
                  <Descriptions.Item label="Generación">
                    <Form.Item
                      name="generacionId"
                      style={{ margin: 0 }}
                      rules={[{ required: true, message: 'La generación es requerida' }]}
                    >
                      <Select
                        placeholder="Seleccionar generación"
                        showSearch
                        filterOption={(input, option) =>
                          option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }
                      >
                        {generaciones.map(generacion => (
                          <Option key={generacion.id} value={generacion.id}>
                            {generacion.nombre} ({generacion.anioInicio}-{generacion.anioFin})
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Descriptions.Item>
                  
                  <Descriptions.Item label="Notas" span={2}>
                    <Form.Item
                      name="notas"
                      style={{ margin: 0 }}
                    >
                      <TextArea 
                        rows={4} 
                        placeholder="Notas adicionales sobre el vehículo..."
                      />
                    </Form.Item>
                  </Descriptions.Item>
                </Descriptions>
                </div>
              </TabPane>
              
              <TabPane tab={<span><ToolOutlined /> Repuestos</span>} key="2">
                <div style={{ marginTop: '16px' }}>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>Repuestos extraídos de este vehículo</Text>
                    <Button 
                      type="primary" 
                      size="small"
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
                        onClick={() => navigate(`/inventario/nuevo?vehiculoId=${vehiculo.id}`)}
                      >
                        Agregar Repuesto
                      </Button>
                    </div>
                  )}
                </div>
              </TabPane>
              
              <TabPane tab={<span><DollarOutlined /> Transacciones</span>} key="3">
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
                    </div>
                  )}
                </div>
              </TabPane>
            </Tabs>

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Space>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                >
                  <Spin spinning={loading || saving}>
                  </Spin>
                  <SaveOutlined />
                  Guardar Cambios
                </Button>
                <Button onClick={() => navigate(`/vehiculos/${id}`)} size="large">
                  Cancelar
                </Button>
              </Space>
            </div>
          </div>
        </Card>
      </Form>
    </div>
  );
};

export default EditarVehiculo;
