import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  Typography, 
  Select, 
  InputNumber,
  message,
  Row,
  Col,
  Divider,
  Tag,
  Spin,
  Checkbox
} from 'antd';
import { 
  SaveOutlined, 
  ArrowLeftOutlined,
  EditOutlined
} from '@ant-design/icons';
import InventarioService from '../../api/inventario';
import vehiculoService from '../../api/vehiculos';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const EditarRepuesto = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [repuestoActual, setRepuestoActual] = useState(null);
  const [vehiculoOrigen, setVehiculoOrigen] = useState(null);
  const [ubicacionFisicaHabilitada, setUbicacionFisicaHabilitada] = useState(false);
  
  const [precioCostoUnitario, setPrecioCostoUnitario] = useState(0);
  const [cantidad, setCantidad] = useState(1);

  // Opciones base
  const parteOptions = [
    { value: 'MOTOR', label: 'Motor' },
    { value: 'CHASIS', label: 'Chasis' },
    { value: 'CARROCERIA', label: 'Carrocería' },
    { value: 'COMPUTADORA', label: 'Computadora' },
    { value: 'CAJA_DE_CAMBIO', label: 'Caja de Cambio' },
    { value: 'AIRBAGS_O_BOLSAS_DE_AIRE', label: 'Airbags o Bolsas de Aire' },
    { value: 'EJES_Y_DIFERENCIA', label: 'Ejes y Diferencia' },
    { value: 'SUSPENSION_Y_AMORTIGUAMIENTO', label: 'Suspensión y Amortiguamiento' },
    { value: 'EMBRAGUE', label: 'Embrague' },
    { value: 'SISTEMA_DE_FRENOS', label: 'Sistema de Frenos' },
    { value: 'TANQUE_DE_GASOLINA', label: 'Tanque de Gasolina' },
    { value: 'DISTRIBUIDOR', label: 'Distribuidor' },
    { value: 'RADIADOR', label: 'Radiador' },
    { value: 'VENTILADOR', label: 'Ventilador' },
    { value: 'BOMBA_DE_AGUA', label: 'Bomba de Agua' },
    { value: 'BATERIA', label: 'Batería' },
    { value: 'AROS_Y_LLANTAS', label: 'Aros y Llantas' },
    { value: 'SISTEMA_DE_DIRECCION', label: 'Sistema de Dirección' },
    { value: 'SISTEMA_ELECTRICO', label: 'Sistema Eléctrico' },
    { value: 'FUSIBLES', label: 'Fusibles' },
    { value: 'ALTERNADOR', label: 'Alternador' },
    { value: 'VALVULAS_DE_ESCAPE', label: 'Válvulas de Escape' },
    { value: 'TURBO', label: 'Turbo' }
  ];

  const getCondicionOptions = (esGenerico) => {
    if (!esGenerico) {
      return [
        { value: '_100_25_', label: 'Nuevo' },
        { value: '_50_25_', label: 'Usado' },
        { value: '_0_25_', label: 'Con detalles' }
      ];
    } else {
      return [
        { value: '100%-', label: 'Nuevo' },
        { value: '50%-', label: 'Usado' },
        { value: '0%-', label: 'Con detalles' }
      ];
    }
  };

  useEffect(() => {
    const fetchRepuesto = async () => {
      try {
        setFetching(true);
        const data = await InventarioService.getRepuestoPorId(id);
        if (!data) throw new Error("No se encontraron los datos del repuesto");
        
        setRepuestoActual(data);

        // Si pertenece a un vehículo, obtener sus datos
        if (data.vehiculoOrigenId) {
          try {
            const vData = await vehiculoService.getVehiculoCompletoPorId(data.vehiculoOrigenId);
            setVehiculoOrigen(vData);
          } catch (vErr) {
            console.error('Error fetching vehiculo:', vErr);
          }
        }
        
        // El costo unitario es lo que guarda la bd.
        // Si hay una cantidad > 1, calculamos el costo total multiplicando
        const cant = data.cantidad !== undefined && data.cantidad !== null ? data.cantidad : 1;
        const pCosto = parseFloat(data.precioCosto || 0);
        
        setCantidad(cant);
        setPrecioCostoUnitario(pCosto);

        // Formatear los guiones bajos según si es genérico o no, ya que el API a veces lo mezcla
        let condicionFormat = data.condicion;
        if (!condicionFormat) {
            condicionFormat = data.vehiculoOrigenId ? '_100_25_' : '100%-';
        }

        const esGenerico = data.vehiculoOrigenId == null;
        const defaultSep = esGenerico ? '-' : '_';
        
        // Determinar si ya tiene una ubicación asignada
        const tieneUbicacion = (data.bodega && data.bodega !== `0${defaultSep}` && data.bodega !== '0-' && data.bodega !== '0_');
        setUbicacionFisicaHabilitada(tieneUbicacion);

        form.setFieldsValue({
          parte_vehiculo: data.parteVehiculo,
          descripcion: data.descripcion,
          imagen_url: data.imagenUrl,
          precio_costo: pCosto,
          cantidad: cant,
          estado: data.estado || 'STOCK',
          condicion: condicionFormat,
          bodega: data.bodega || '0-',
          zona: data.zona || '0-',
          pared: data.pared || '0-',
          malla: data.malla || '0-',
          horizontal: data.horizontal || '0-',
          estante: data.estante || 'E1',
          nivel: data.nivel || '0-',
          piso: data.piso || 'P1-',
          plastica: data.plastica,
          carton: data.carton,
          posicion: data.posicion
        });
      } catch (error) {
        console.error('Error fetching repuesto:', error);
        message.error('No se pudo cargar el repuesto');
        navigate('/inventario');
      } finally {
        setFetching(false);
      }
    };
    fetchRepuesto();
  }, [id, form, navigate]);

  // Cálculos dinámicos
  const costoTotalCalculado = precioCostoUnitario * cantidad;
  const precioVentaCalculado = precioCostoUnitario * 1.5;
  const formula15Calculada = precioCostoUnitario * 1.15;
  const formula30Calculada = precioCostoUnitario * 1.30;

  useEffect(() => {
    form.setFieldsValue({ precio_venta: precioVentaCalculado });
  }, [precioVentaCalculado, form]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const cant = values.cantidad !== undefined && values.cantidad !== null ? values.cantidad : 1;
      const costoUni = values.precio_costo || 0;
      const pVenta = costoUni * 1.5;

      const payload = {
        parteVehiculo: values.parte_vehiculo,
        descripcion: values.descripcion,
        precioCosto: costoUni,
        precioVenta: pVenta,

        cantidad: cant,
        estado: values.estado,
        condicion: values.condicion,
        bodega: ubicacionFisicaHabilitada ? values.bodega : `_0_`,
        zona: ubicacionFisicaHabilitada ? values.zona : `_0_`,
        pared: ubicacionFisicaHabilitada ? values.pared : `_0_`,
        malla: ubicacionFisicaHabilitada ? values.malla : `_0_`,
        horizontal: ubicacionFisicaHabilitada ? values.horizontal : `_0_`,
        estante: ubicacionFisicaHabilitada ? values.estante : `E1`,
        nivel: ubicacionFisicaHabilitada ? values.nivel : `_0_`,
        piso: ubicacionFisicaHabilitada ? values.piso : `P1_`,
        plastica: ubicacionFisicaHabilitada ? values.plastica : null,
        carton: ubicacionFisicaHabilitada ? values.carton : null,
        posicion: ubicacionFisicaHabilitada ? values.posicion : null,
        imagenUrl: values.imagen_url || null
      };

      await InventarioService.actualizarRepuesto(id, payload);
      navigate(`/inventario/${id}`);
    } catch (error) {
      console.error('Error al actualizar:', error);
      const errorMsg = error.response?.data?.message || error.message;
      message.error('Error al actualizar el repuesto: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div style={{ textAlign: 'center', marginTop: 50 }}><Spin size="large" /></div>;
  }

  const esGenerico = repuestoActual?.vehiculoOrigenId == null;

  return (
    <div>
      <Button 
        type="text" 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16 }}
      >
        Volver
      </Button>
      
      <Title level={2}>
        <EditOutlined /> Editar Repuesto {repuestoActual?.codigo}
      </Title>
      
      <Card>
        <div style={{ marginBottom: 24, padding: 16, backgroundColor: esGenerico ? '#f6ffed' : '#f0f8ff', borderRadius: 8 }}>
          <Text strong style={{ fontSize: 16 }}>Origen del Repuesto: </Text>
          {esGenerico ? (
            <Tag color="geekblue" style={{ fontSize: 14, padding: '4px 8px' }}>Genérico / Comprado</Tag>
          ) : (
            <Tag color="purple" style={{ fontSize: 14, padding: '4px 8px' }}>
              Vehículo Desarmado: {vehiculoOrigen ? `${vehiculoOrigen.marcaNombre || ''} ${vehiculoOrigen.modelo || ''} ${vehiculoOrigen.anio || ''}` : ''} (ID: {repuestoActual?.vehiculoOrigenId})
            </Tag>
          )}
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">El origen del repuesto no puede ser modificado una vez creado.</Text>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Divider orientation="left">Información del Repuesto</Divider>
              
              <Form.Item
                name="parte_vehiculo"
                label="Parte del Vehículo"
                rules={[{ required: true, message: 'Seleccione la parte del vehículo' }]}
              >
                <Select placeholder="Seleccione la parte del vehículo">
                  {parteOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item
                name="descripcion"
                label="Descripción"
                rules={[{ required: true, message: 'Ingrese una descripción' }]}
              >
                <TextArea rows={3} placeholder="Descripción detallada del repuesto" />
              </Form.Item>

              <Form.Item name="imagen_url" label="URL de Imagen (Opcional)">
                <Input placeholder="https://ejemplo.com/imagen.jpg" />
              </Form.Item>

            </Col>
            
            <Col xs={24} md={12}>
              <Divider orientation="left">Precios y Estado</Divider>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="precio_costo"
                    label="Costo Unitario"
                    rules={[{ required: true, message: 'Ingrese el costo unitario' }]}
                  >
                    <InputNumber 
                      style={{ width: '100%' }} 
                      min={0} 
                      step={1000} 
                      precision={2}
                      formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value.replace(/₡\s?|(,*)/g, '')}
                      onChange={(value) => setPrecioCostoUnitario(value || 0)}
                    />
                  </Form.Item>
                </Col>
                
                <Col span={12}>
                  <Form.Item
                    label="Costo Total (Calculado)"
                  >
                    <InputNumber 
                      style={{ width: '100%' }} 
                      formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      value={costoTotalCalculado}
                      disabled
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="precio_venta"
                    label="Precio de Venta Unitario (Calculado)"
                  >
                    <InputNumber 
                      style={{ width: '100%' }} 
                      formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      value={precioVentaCalculado}
                      disabled
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Fórmula 15% (Lectura)">
                    <InputNumber 
                      style={{ width: '100%' }} 
                      formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      value={formula15Calculada}
                      disabled
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Fórmula 30% (Lectura)">
                    <InputNumber 
                      style={{ width: '100%' }} 
                      formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      value={formula30Calculada}
                      disabled
                    />
                  </Form.Item>
                </Col>
              </Row>
              
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f8ff', borderRadius: '6px' }}>
                <Text strong>Costo Unitario: ₡ {precioCostoUnitario.toFixed(2)}</Text>
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="cantidad" label="Cantidad">
                    <InputNumber 
                      style={{ width: '100%' }} 
                      min={1} 
                      onChange={(value) => setCantidad(value || 1)}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="estado" label="Estado" rules={[{ required: true }]}>
                    <Select disabled={repuestoActual?.estado === 'VENDIDO' || repuestoActual?.estado === 'AGOTADO'}>
                      <Option value="STOCK">En Stock</Option>
                      <Option value="PROCESO">En Proceso</Option>
                      <Option value="DAÑADO">Dañado</Option>
                      <Option value="USADO_INTERNO">Usado Interno</Option>
                      <Option value="VENDIDO" disabled={repuestoActual?.estado !== 'VENDIDO'}>Vendido</Option>
                      <Option value="AGOTADO" disabled={repuestoActual?.estado !== 'AGOTADO'}>Agotado</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="condicion" label="Condición">
                <Select>
                  {getCondicionOptions(esGenerico).map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Ubicación Física</Divider>
          
          <div style={{ marginBottom: '16px' }}>
            <Checkbox
              checked={ubicacionFisicaHabilitada}
              onChange={(e) => setUbicacionFisicaHabilitada(e.target.checked)}
            >
              Habilitar formulario de ubicación física (opcional)
            </Checkbox>
          </div>

          {ubicacionFisicaHabilitada && (
            <div style={{ 
              padding: '16px', 
              border: '1px solid #d9d9d9', 
              borderRadius: '6px',
              backgroundColor: '#fafafa'
            }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="bodega" label="Bodega">
                  <Select>
                    <Option value={`_0_`}>Sin especificar</Option>
                    <Option value={`R_`}>Bodega R</Option>
                    <Option value={`D_`}>Bodega D</Option>
                    <Option value={`C_`}>Bodega C</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="zona" label="Zona">
                  <Select>
                    <Option value={`_0_`}>Sin especificar</Option>
                    {Array.from({length: 22}, (_, i) => (
                      <Option key={`Z${i+1}_`} value={`Z${i+1}_`}>Zona {i+1}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="pared" label="Pared">
                  <Select>
                    <Option value={`_0_`}>Sin especificar</Option>
                    <Option value={`PE_`}>Pared Este</Option>
                    <Option value={`PO_`}>Pared Oeste</Option>
                    <Option value={`PN_`}>Pared Norte</Option>
                    <Option value={`PS_`}>Pared Sur</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="estante" label="Estante">
                  <Select>
                    {Array.from({length: 14}, (_, i) => (
                      <Option key={`E${i+1}`} value={`E${i+1}`}>Estante {i+1}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="malla" label="Malla">
                  <Select>
                    <Option value={`_0_`}>Sin especificar</Option>
                    {Array.from({length: 200}, (_, i) => (
                      <Option key={`V${i+1}`} value={`V${i+1}`}>Malla {i+1}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="piso" label="Piso">
                  <Select>
                    {Array.from({length: 21}, (_, i) => (
                      <Option key={`P${i+1}_`} value={`P${i+1}_`}>Piso {i+1}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="plastica" label="Plástica (Opcional)">
                  <Select allowClear>
                    {Array.from({length: 52}, (_, i) => (
                      <Option key={`CP${i+1}_`} value={`CP${i+1}_`}>CP {i+1}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="carton" label="Cartón (Opcional)">
                  <Select allowClear>
                    {Array.from({length: 52}, (_, i) => (
                      <Option key={`MM${i+1}_`} value={`MM${i+1}_`}>MM {i+1}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

              <Form.Item name="posicion" label="Posición (Opcional)">
                <Input placeholder="Posición específica" />
              </Form.Item>
            </div>
          )}
          
          <Divider />
          
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SaveOutlined />}
              loading={loading}
            >
              Guardar Cambios
            </Button>
            
            <Button 
              style={{ marginLeft: 8 }}
              onClick={() => navigate(-1)}
            >
              Cancelar
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default EditarRepuesto;
