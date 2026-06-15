import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from 'react-query';
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
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined
} from '@ant-design/icons';
import InventarioService from '../../api/inventario';
import vehiculoService from '../../api/vehiculos';
import api from '../../api/axios';
import { usePartesVehiculo } from '../../hooks/usePartesVehiculo';

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

  const queryClient = useQueryClient();
  const { data: partesVehiculo = [], isLoading: loadingPartes } = usePartesVehiculo();

  // Estados para nueva parte de vehículo
  const [nuevaParteModal, setNuevaParteModal] = useState(false);
  const [nuevaParteNombre, setNuevaParteNombre] = useState('');
  const [creandoParte, setCreandoParte] = useState(false);

  const [editingParteId, setEditingParteId] = useState(null);
  const [editingParteNombre, setEditingParteNombre] = useState('');

  // Opciones base
  // Opciones base ya no se usan, se obtienen dinámicamente

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
          parte_vehiculo_id: data.parteVehiculoId,
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

  // Función para crear nueva parte de vehículo
  const handleNuevaParte = async () => {
    if (!nuevaParteNombre.trim()) {
      message.warning('Por favor ingrese el nombre de la parte de vehículo');
      return;
    }

    setCreandoParte(true);
    try {
      const response = await api.post('/partes-vehiculo', {
        nombre: nuevaParteNombre.trim(),
        activo: 1
      });

      message.success('Parte de vehículo creada exitosamente');
      setNuevaParteModal(false);
      setNuevaParteNombre('');

      queryClient.invalidateQueries('partesVehiculoActivas');

      if (response.data && response.data.id) {
        form.setFieldsValue({ parte_vehiculo_id: response.data.id });
      }
    } catch (error) {
      console.error('Error al crear parte de vehículo:', error);
      message.error('Error al crear parte de vehículo: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreandoParte(false);
    }
  };

  const handleEditarParte = (parte) => {
    setEditingParteId(parte.id);
    setEditingParteNombre(parte.nombre);
  };

  const handleCancelarEdicionParte = () => {
    setEditingParteId(null);
    setEditingParteNombre('');
  };

  const { updateParteVehiculoMutation } = usePartesVehiculo();

  const handleGuardarEdicionParte = async () => {
    if (!editingParteNombre.trim()) {
      message.warning('El nombre no puede estar vacío');
      return;
    }

    try {
      await updateParteVehiculoMutation.mutateAsync({
        id: editingParteId,
        nombre: editingParteNombre.trim(),
        activo: 1
      });
      setEditingParteId(null);
      setEditingParteNombre('');
    } catch (error) {
      // El hook usePartesVehiculo ya maneja el mensaje de error
    }
  };

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
        parteVehiculoId: values.parte_vehiculo_id,
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
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* ── Header de navegación ─────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ color: '#595959', fontWeight: 500 }}
          disabled={loading}
        >
          Volver
        </Button>
        <Title level={3} style={{ margin: 0, fontWeight: 600 }}>
          Editar Repuesto {repuestoActual?.codigo}
        </Title>
        <div style={{ width: '100px' }}></div> {/* Spacer */}
      </div>

      <Card
        bordered={false}
        style={{ borderRadius: '12px', border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
        bodyStyle={{ padding: '32px' }}
      >
        <div style={{ marginBottom: 24, padding: 16, backgroundColor: esGenerico ? '#f6ffed' : '#f0f8ff', borderRadius: 8 }}>
          <Text strong style={{ fontSize: 16 }}>Origen del Repuesto: </Text>
          {esGenerico ? (
            <Tag color="geekblue" style={{ fontSize: 14, padding: '4px 8px' }}>Genérico / Comprado</Tag>
          ) : (
            <Tag color="purple" style={{ fontSize: 14, padding: '4px 8px' }}>
              Vehículo Desarmado: {vehiculoOrigen ? (() => {
                const codigo = vehiculoOrigen.codigoVehiculo || vehiculoOrigen.codigo_vehiculo || 'SIN_CODIGO';
                const anio = vehiculoOrigen.anio || 'Año N/A';
                const estado = vehiculoOrigen.estado || 'SIN_ESTADO';
                const marca = vehiculoOrigen.marcaNombre || vehiculoOrigen.marca || 'Marca N/A';
                const modelo = vehiculoOrigen.modelo || 'Modelo N/A';

                let estadoAmigable = estado;
                if (estado === 'DESARMADO') {
                  estadoAmigable = 'Para repuestos';
                } else if (estado === 'REPARACION') {
                  estadoAmigable = 'Para reparar';
                } else if (estado !== 'SIN_ESTADO') {
                  estadoAmigable = estado.charAt(0).toUpperCase() + estado.slice(1).toLowerCase();
                }

                return `${codigo} — ${marca} ${modelo} ${anio} (${estadoAmigable})`;
              })() : ''}
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
              <Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '16px' }}>
                Información del Repuesto
              </Text>

              <Form.Item
                name="parte_vehiculo_id"
                label="Parte del Vehículo"
                rules={[{ required: true, message: 'Seleccione la parte del vehículo' }]}
              >
                <Select
                  placeholder="Seleccione la parte del vehículo"
                  loading={loadingPartes}
                  showSearch
                  optionFilterProp="label"
                  optionLabelProp="label"
                  dropdownRender={(menu) => (
                    <div>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      {nuevaParteModal ? (
                        <div style={{ padding: '8px', display: 'flex', gap: '8px' }}>
                          <Input
                            autoFocus
                            size="small"
                            placeholder="Nombre de la parte"
                            value={nuevaParteNombre}
                            onChange={(e) => setNuevaParteNombre(e.target.value)}
                            onPressEnter={handleNuevaParte}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setNuevaParteModal(false);
                                setNuevaParteNombre('');
                              }
                            }}
                            style={{ flex: 1 }}
                          />
                          <Button
                            type="text"
                            icon={<CheckOutlined style={{ color: '#52c41a' }} />}
                            onClick={handleNuevaParte}
                            loading={creandoParte}
                            disabled={!nuevaParteNombre.trim()}
                            title="Agregar"
                          />
                          <Button
                            type="text"
                            danger
                            icon={<CloseOutlined />}
                            onClick={() => {
                              setNuevaParteModal(false);
                              setNuevaParteNombre('');
                            }}
                            disabled={creandoParte}
                            title="Cancelar"
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: '4px 8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            color: '#1890ff'
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setNuevaParteModal(true);
                            setNuevaParteNombre('');
                          }}
                        >
                          <PlusOutlined style={{ marginRight: 8 }} />
                          Agregar nueva parte de vehículo
                        </div>
                      )}
                    </div>
                  )}
                >
                  {partesVehiculo.map(parte => (
                    <Option key={parte.id} value={parte.id} label={parte.nombre}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        {editingParteId === parte.id ? (
                          <div style={{ display: 'flex', width: '100%', gap: '8px' }}>
                            <Input
                              value={editingParteNombre}
                              onChange={(e) => {
                                e.stopPropagation();
                                setEditingParteNombre(e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              style={{ flex: 1 }}
                              autoFocus
                            />
                            <Button
                              type="text"
                              icon={<CheckOutlined style={{ color: 'green' }} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGuardarEdicionParte();
                              }}
                              size="small"
                            />
                            <Button
                              type="text"
                              icon={<CloseOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelarEdicionParte();
                              }}
                              size="small"
                            />
                          </div>
                        ) : (
                          <>
                            <span>{parte.nombre}</span>
                            <Button
                              type="text"
                              icon={<EditOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditarParte(parte);
                              }}
                              size="small"
                            />
                          </>
                        )}
                      </div>
                    </Option>
                  ))}
                  {nuevaParteModal && (
                    <Option className="add-new-option" value="" style={{ display: 'none' }}>
                      {nuevaParteNombre}
                    </Option>
                  )}
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
              <Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '16px' }}>
                Precios y Estado
              </Text>

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
                      min={0}
                      onChange={(value) => {
                        const val = value !== null ? value : 0;
                        setCantidad(val);

                        // Si hay cantidad mayor a 0 y estaba agotado, pasarlo a STOCK
                        if (val > 0 && form.getFieldValue('estado') === 'AGOTADO') {
                          form.setFieldsValue({ estado: 'STOCK' });
                        }
                        // Si la cantidad es 0, pasarlo automáticamente a AGOTADO
                        else if (val === 0) {
                          form.setFieldsValue({ estado: 'AGOTADO' });
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="estado" label="Estado" rules={[{ required: true }]}>
                    <Select>
                      <Option value="STOCK">En Stock</Option>
                      <Option value="PROCESO">En Proceso</Option>
                      <Option value="DAÑADO">Dañado</Option>
                      <Option value="USADO_INTERNO">Usado Interno</Option>
                      <Option value="VENDIDO" disabled={repuestoActual?.estado !== 'VENDIDO'}>Vendido</Option>
                      <Option value="AGOTADO">Agotado</Option>
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

          <Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', margin: '32px 0 16px' }}>
            Ubicación Física
          </Text>

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
                      {Array.from({ length: 22 }, (_, i) => (
                        <Option key={`Z${i + 1}_`} value={`Z${i + 1}_`}>Zona {i + 1}</Option>
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
                      {Array.from({ length: 14 }, (_, i) => (
                        <Option key={`E${i + 1}`} value={`E${i + 1}`}>Estante {i + 1}</Option>
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
                      {Array.from({ length: 200 }, (_, i) => (
                        <Option key={`V${i + 1}`} value={`V${i + 1}`}>Malla {i + 1}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="piso" label="Piso">
                    <Select>
                      {Array.from({ length: 21 }, (_, i) => (
                        <Option key={`P${i + 1}_`} value={`P${i + 1}_`}>Piso {i + 1}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="plastica" label="Plástica (Opcional)">
                    <Select allowClear>
                      {Array.from({ length: 52 }, (_, i) => (
                        <Option key={`CP${i + 1}_`} value={`CP${i + 1}_`}>CP {i + 1}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="carton" label="Cartón (Opcional)">
                    <Select allowClear>
                      {Array.from({ length: 52 }, (_, i) => (
                        <Option key={`MM${i + 1}_`} value={`MM${i + 1}_`}>MM {i + 1}</Option>
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

          <Divider style={{ margin: '32px 0 24px' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button
              size="large"
              onClick={() => navigate(-1)}
              style={{ borderRadius: '6px' }}
            >
              Cancelar
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
              size="large"
              style={{ borderRadius: '6px', padding: '0 32px' }}
            >
              Guardar Cambios
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default EditarRepuesto;
