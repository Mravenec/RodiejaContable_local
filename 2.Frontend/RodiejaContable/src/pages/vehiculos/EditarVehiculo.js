import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Typography,
  Tabs,
  Tag,
  Spin,
  message,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Switch,
  Space,
  Upload,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  MoneyCollectOutlined,
  ToolOutlined,
  FileTextOutlined,
  UploadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useUpdateVehiculo } from '../../hooks/useVehiculos';
import vehiculoService from '../../api/vehiculos';
import finanzaService from '../../api/finanzas';
import inventarioService from '../../api/inventario';
import { getTiposTransacciones } from '../../api/transacciones';
import { generacionesAPI } from '../../api/generaciones';
import { formatCurrency } from '../../utils/formatters';
import api from '../../api/axios';
import dayjs from 'dayjs';
import ImageCarousel from '../../components/common/ImageCarousel';


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
  const [generaciones, setGeneraciones] = useState([]);
  const [loadingGeneraciones, setLoadingGeneraciones] = useState(false);
  const [loadingTransacciones, setLoadingTransacciones] = useState(false);
  const [loadingRepuestos, setLoadingRepuestos] = useState(false);
  const [imagenUrlValue, setImagenUrlValue] = useState(null);

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

      // Get vehicle by ID directly from API
      const vehiculoEncontrado = await vehiculoService.getVehiculo(parseInt(id, 10));

      if (!vehiculoEncontrado) {
        throw new Error('Vehículo no encontrado');
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
      setImagenUrlValue(imagenUrl);

      // Handle date parsing more robustly
      let fechaIngresoDayjs = null;
      let fechaVentaDayjs = null;

      if (vehiculo.fechaIngreso) {
        try {
          if (Array.isArray(vehiculo.fechaIngreso)) {
            const [y, m, d] = vehiculo.fechaIngreso;
            fechaIngresoDayjs = dayjs(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, 'YYYY-MM-DD');
          } else {
            fechaIngresoDayjs = dayjs(vehiculo.fechaIngreso);
            if (!fechaIngresoDayjs.isValid()) {
              fechaIngresoDayjs = dayjs(vehiculo.fechaIngreso, ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD']);
            }
          }
        } catch (error) {
          console.error('Error parsing fechaIngreso:', error, 'Raw value:', vehiculo.fechaIngreso);
        }
      }

      if (vehiculo.fechaVenta) {
        try {
          if (Array.isArray(vehiculo.fechaVenta)) {
            const [y, m, d] = vehiculo.fechaVenta;
            fechaVentaDayjs = dayjs(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, 'YYYY-MM-DD');
          } else {
            fechaVentaDayjs = dayjs(vehiculo.fechaVenta);
            if (!fechaVentaDayjs.isValid()) {
              fechaVentaDayjs = dayjs(vehiculo.fechaVenta, ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD']);
            }
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
        fechaIngreso: fechaIngresoDayjs,
        fechaVenta: fechaVentaDayjs,
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
        fechaIngreso: fechaIngresoDayjs,
        fechaVenta: fechaVentaDayjs,
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

      // Load transactions, repuestos and generaciones for this vehicle
      if (vehiculo.id) {
        loadTransactions(vehiculo.id);
        loadRepuestos(vehiculo.id);
      }

      // Load generaciones based on the vehicle's modeloId
      const modeloId = vehiculo.generacion?.modeloId || vehiculo.modeloId;
      if (modeloId) {
        setLoadingGeneraciones(true);
        generacionesAPI.getByModeloId(modeloId)
          .then(response => setGeneraciones(response.data || []))
          .catch(err => console.error('Error cargando generaciones:', err))
          .finally(() => setLoadingGeneraciones(false));
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
        imagenUrl: values.imagenUrl || imagenUrlValue || '',
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
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* ── Header de navegación ─────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/vehiculos/${id}`)}
          style={{ color: '#595959', fontWeight: 500 }}
        >
          Volver al detalle
        </Button>
        <Space>
          <Button onClick={() => navigate(`/vehiculos/${id}`)}>Cancelar</Button>
          <Button
            type="primary"
            htmlType="submit"
            form="editar-vehiculo-form"
            loading={loading || saving}
            icon={<SaveOutlined />}
            style={{ borderRadius: '6px' }}
          >
            Guardar Cambios
          </Button>
        </Space>
      </div>

      <Form
        id="editar-vehiculo-form"
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        {/* ── Hero Card: imagen + datos principales ─── */}
        <Card
          bordered={false}
          style={{ borderRadius: '10px', border: '1px solid #f0f0f0', marginBottom: '16px', overflow: 'hidden' }}
          bodyStyle={{ padding: 0 }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {/* Imagen */}
            <div style={{ flex: '0 0 220px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
              <ImageCarousel 
                imageUrlString={vehiculo?.imagenUrl || vehiculo?.imagen_url || ''} 
                alt={`${marca} ${modelo}`} 
                width="220px" 
                height="160px"
                borderRadius="8px"
                preview={true}
              />
            </div>

            {/* Info principal */}
            <div style={{ flex: 1, padding: '20px 24px', minWidth: '260px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {vehiculo?.generacion?.nombre || 'Generación'}
                  </Typography.Text>
                  <Typography.Title level={3} style={{ margin: '4px 0 8px' }}>
                    {marca} {modelo}
                  </Typography.Title>
                  {getEstadoTag(vehiculo?.estado)}
                  <Typography.Text type="secondary" style={{ display: 'block', marginTop: '6px', fontSize: '13px' }}>
                    Código: <strong>{vehiculo?.codigoVehiculo || '—'}</strong>
                  </Typography.Text>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Typography.Text type="secondary" style={{ fontSize: '12px' }}>Precio de venta</Typography.Text>
                  <Typography.Title level={3} style={{ margin: '2px 0', color: '#1890ff' }}>
                    {formatCurrency(vehiculo?.precioVenta || vehiculo?.precioCompra || 0)}
                  </Typography.Title>
                  <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                    Inversión: {formatCurrency(vehiculo?.inversionTotal || 0)}
                  </Typography.Text>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Pestañas de edición ──────────────────────── */}
        <Card bordered={false} style={{ borderRadius: '10px', border: '1px solid #f0f0f0' }}>
          <Tabs defaultActiveKey="1">
            {/* ─── TAB 1: Información General ─── */}
            <Tabs.TabPane tab={<span><FileTextOutlined /> Información General</span>} key="1">

              {/* Sección: Identificación */}
              <Typography.Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Identificación
              </Typography.Text>
              <Divider style={{ marginTop: '8px', marginBottom: '16px' }} />
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Año" name="anio" rules={[{ required: true, message: 'Requerido' }]}>
                    <InputNumber style={{ width: '100%' }} placeholder="Ej: 2020" min={1900} max={new Date().getFullYear() + 1} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Código" name="codigoVehiculo" rules={[{ required: true, message: 'Requerido' }]}>
                    <Input placeholder="Ej: TOCO-001" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Estado" name="estado" rules={[{ required: true, message: 'Requerido' }]}>
                    <Select placeholder="Selecciona estado">
                      <Select.Option value="DISPONIBLE">Disponible</Select.Option>
                      <Select.Option value="VENDIDO">Vendido</Select.Option>
                      <Select.Option value="DESARMADO">Desarmado</Select.Option>
                      <Select.Option value="REPARACION">En Reparación</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Generación" name="generacionId" rules={[{ required: true, message: 'Requerido' }]}>
                    <Select
                      placeholder="Seleccionar generación"
                      loading={loadingGeneraciones}
                      showSearch
                      filterOption={(input, option) =>
                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                    >
                      {generaciones.map(g => (
                        <Select.Option key={g.id} value={g.id}>
                          {g.nombre} ({g.anioInicio}–{g.anioFin})
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Fecha de Ingreso" name="fechaIngreso" rules={[{ required: true, message: 'Requerido' }]}>
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Selecciona fecha" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Foto del vehículo (Subir o URL)">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Upload
                          name="file"
                          action="http://localhost:8080/api/upload/vehiculo"
                          headers={{
                            Authorization: `Bearer ${localStorage.getItem('token')}`
                          }}
                          listType="picture"
                          maxCount={1}
                          showUploadList={false}
                          style={{ flex: 1 }}
                          onChange={(info) => {
                            if (info.file.status === 'done') {
                              message.success(`${info.file.name} subido exitosamente`);
                              const serverUrl = info.file.response.url;
                              form.setFieldsValue({ imagenUrl: serverUrl });
                              setImagenUrlValue(serverUrl);
                              setVehiculo(prev => ({...prev, imagenUrl: serverUrl}));
                            } else if (info.file.status === 'error') {
                              message.error(`${info.file.name} falló al subir.`);
                            }
                          }}
                        >
                          <Button icon={<UploadOutlined />} style={{ width: '100%' }}>Seleccionar archivo</Button>
                        </Upload>
                        <Button 
                          icon={<DeleteOutlined />} 
                          danger
                          title="Limpiar imagen"
                          onClick={() => {
                            form.setFieldsValue({ imagenUrl: '' });
                            setImagenUrlValue('');
                            setVehiculo(prev => ({...prev, imagenUrl: ''}));
                          }}
                          disabled={!imagenUrlValue}
                        />
                      </div>
                      <Form.Item 
                        name="imagenUrl" 
                        style={{ marginBottom: 0 }}
                      >
                        <Input 
                          placeholder="https://ejemplo.com/imagen.jpg o ruta local" 
                          allowClear
                          onChange={(e) => {
                            setImagenUrlValue(e.target.value);
                            setVehiculo(prev => ({...prev, imagenUrl: e.target.value}));
                          }}
                        />
                      </Form.Item>
                    </Space>
                  </Form.Item>
                </Col>
              </Row>

              {/* Sección: Especificaciones Técnicas */}
              <Typography.Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Especificaciones Técnicas
              </Typography.Text>
              <Divider style={{ marginTop: '8px', marginBottom: '16px' }} />
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="Transmisión" name="transmision">
                    <Select placeholder="Selecciona">
                      <Select.Option value="Automatico">Automático</Select.Option>
                      <Select.Option value="Manual">Manual</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="Tracción" name="traccion">
                    <Select placeholder="Selecciona">
                      <Select.Option value="4x2">4x2</Select.Option>
                      <Select.Option value="4x4">4x4</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="Combustible" name="combustible">
                    <Select placeholder="Selecciona">
                      <Select.Option value="Gasolina">Gasolina</Select.Option>
                      <Select.Option value="Diesel">Diésel</Select.Option>
                      <Select.Option value="Eléctrico">Eléctrico</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="Cilindraje" name="cilindraje" rules={[{ max: 200 }]}>
                    <Input placeholder="Ej: 1.8L, 1600cc" maxLength={200} />
                  </Form.Item>
                </Col>
              </Row>

              {/* Sección: Información Financiera */}
              <Typography.Text strong style={{ color: '#cf1322', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Información Financiera
              </Typography.Text>
              <Divider style={{ marginTop: '8px', marginBottom: '16px', borderColor: '#cf1322' }} />
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label={<span style={{ color: '#cf1322' }}>Precio de Compra</span>} name="precioCompra" rules={[{ required: true, message: 'Requerido' }]}>
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={v => `₡ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={v => v.replace(/₡\s?|(,*)/g, '')}
                      min={0} precision={2}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label={<span style={{ color: '#cf1322' }}>Costo de Grúa</span>} name="costoGrua">
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={v => `₡ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={v => v.replace(/₡\s?|(,*)/g, '')}
                      min={0} precision={2}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label={<span style={{ color: '#cf1322' }}>Comisiones</span>} name="comisiones">
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={v => `₡ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={v => v.replace(/₡\s?|(,*)/g, '')}
                      min={0} precision={2}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Precio de Venta" name="precioVenta">
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={v => `₡ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={v => v.replace(/₡\s?|(,*)/g, '')}
                      min={0} precision={2}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Fecha de Venta" name="fechaVenta">
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Vehículo Activo" name="activo" valuePropName="checked">
                    <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
                  </Form.Item>
                </Col>
              </Row>

              {/* Notas */}
              <Row gutter={[16, 0]}>
                <Col span={24}>
                  <Form.Item label="Notas" name="notas">
                    <Input.TextArea rows={3} placeholder="Notas adicionales sobre el vehículo..." />
                  </Form.Item>
                </Col>
              </Row>
            </Tabs.TabPane>

            {/* ─── TAB 2: Repuestos ─── */}
            <Tabs.TabPane tab={<span><ToolOutlined /> Repuestos</span>} key="2">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <Typography.Text strong>Repuestos extraídos de este vehículo</Typography.Text>
                <Button type="primary" size="small" onClick={() => navigate(`/inventario/nuevo?vehiculoId=${vehiculo.id}`)}>
                  + Agregar Repuesto
                </Button>
              </div>
              {loadingRepuestos ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><Spin /></div>
              ) : repuestos && repuestos.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        {['Código', 'Parte', 'Descripción', 'Precio Venta', 'Estado', 'Ubicación', ''].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Precio Venta' ? 'right' : 'left', fontWeight: 600, color: '#595959', borderBottom: '2px solid #f0f0f0', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {repuestos.map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/inventario/${r.id}`)}>{r.codigoRepuesto || '—'}</Button>
                          </td>
                          <td style={{ padding: '10px 12px' }}><Tag color="blue">{r.parteVehiculo || 'N/A'}</Tag></td>
                          <td style={{ padding: '10px 12px', color: '#595959' }}>{r.descripcion || '—'}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 500 }}>{formatCurrency(r.precioVenta || 0)}</td>
                          <td style={{ padding: '10px 12px' }}>{getEstadoRepuestoTag(r.estado)}</td>
                          <td style={{ padding: '10px 12px', color: '#8c8c8c', fontSize: '12px' }}>{r.codigoUbicacion || '—'}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <Button type="link" size="small" onClick={() => navigate(`/inventario/${r.id}`)}>Ver</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px', color: '#bfbfbf' }}>
                  <ToolOutlined style={{ fontSize: '36px', marginBottom: '12px', display: 'block' }} />
                  <Typography.Text type="secondary">No hay repuestos registrados para este vehículo.</Typography.Text>
                  <br />
                  <Button type="primary" style={{ marginTop: '16px' }} onClick={() => navigate(`/inventario/nuevo?vehiculoId=${vehiculo.id}`)}>
                    Agregar Repuesto
                  </Button>
                </div>
              )}
            </Tabs.TabPane>

            {/* ─── TAB 3: Transacciones ─── */}
            <Tabs.TabPane tab={<span><MoneyCollectOutlined /> Transacciones</span>} key="3">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <Typography.Text strong>Historial de transacciones del vehículo</Typography.Text>
                <Button type="primary" size="small" onClick={() => navigate(`/finanzas/transaccion/nueva?vehiculoId=${vehiculo.id}`)}>
                  + Nueva Transacción
                </Button>
              </div>
              {loadingTransacciones ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><Spin /></div>
              ) : transacciones && transacciones.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        {['Fecha', 'Tipo', 'Monto', 'Descripción', ''].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Monto' ? 'right' : 'left', fontWeight: 600, color: '#595959', borderBottom: '2px solid #f0f0f0', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transacciones.map((t) => (
                        <tr key={t.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#595959' }}>{formatDate(t.fecha)}</td>
                          <td style={{ padding: '10px 12px' }}>{renderTipoTransaccion(t.tipo_transaccion)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                            {formatCurrencyWithColor(t.monto, t.tipo_transaccion?.categoria)}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#595959' }}>{t.descripcion || '—'}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <Button type="link" size="small" onClick={() => navigate(`/finanzas/${t.id}`)}>Ver</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px', color: '#bfbfbf' }}>
                  <MoneyCollectOutlined style={{ fontSize: '36px', marginBottom: '12px', display: 'block' }} />
                  <Typography.Text type="secondary">No hay transacciones registradas para este vehículo.</Typography.Text>
                </div>
              )}
            </Tabs.TabPane>
          </Tabs>
        </Card>
      </Form>
    </div>
  );
};

export default EditarVehiculo;

