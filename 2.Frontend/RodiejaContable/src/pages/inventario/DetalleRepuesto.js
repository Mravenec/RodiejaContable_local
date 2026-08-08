import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Card, 
  Button, 
  Descriptions, 
  Typography, 
  Tabs, 
  Tag, 
  Divider, 
  Row, 
  Col, 
  Statistic,
  Image,
  message,
  Table
} from 'antd';
import { 
  ArrowLeftOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import InventarioService from '../../api/inventario';
import vehiculoService from '../../api/vehiculos';
import transaccionesCompletasService from '../../api/transaccionesCompletas';
import { audatexService } from '../../api';
import ModalCotizarInPart from '../../components/audatex/ModalCotizarInPart';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const DetalleRepuesto = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [repuesto, setRepuesto] = useState(null);
  const [vehiculoOrigen, setVehiculoOrigen] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [oportunidades, setOportunidades] = useState([]);
  const [loadingOportunidades, setLoadingOportunidades] = useState(false);
  const [envios, setEnvios] = useState([]);
  const [loadingEnvios, setLoadingEnvios] = useState(false);
  const [modalCotizarVisible, setModalCotizarVisible] = useState(false);
  const [oportunidadSeleccionada, setOportunidadSeleccionada] = useState(null);

  const location = useLocation();
  const urlTab = new URLSearchParams(location.search).get('tab');
  const [activeTab, setActiveTab] = useState(urlTab === 'oportunidades' ? '3' : '1');

  useEffect(() => {
    if (urlTab === 'oportunidades') {
      setActiveTab('3');
    }
  }, [urlTab]);

  useEffect(() => {
    const fetchRepuesto = async () => {
      try {
        setLoading(true);
        const data = await InventarioService.getRepuestoPorId(id);
        setRepuesto(data);
        
        if (data.vehiculoOrigenId) {
          try {
            const vData = await vehiculoService.getVehiculoCompletoPorId(data.vehiculoOrigenId);
            setVehiculoOrigen(vData);
          } catch (vErr) {
            console.error('Error fetching vehiculo:', vErr);
          }
        }
      } catch (error) {
        console.error('Error al cargar el repuesto:', error);
        message.error('Error al cargar los datos del repuesto');
      } finally {
        setLoading(false);
      }
    };

    fetchRepuesto();
  }, [id]);

  useEffect(() => {
    const fetchMovimientos = async () => {
      if (!repuesto) return;
      try {
        setLoadingMovimientos(true);
        const data = await transaccionesCompletasService.getTransacciones();
        const filtrados = data.filter(t => 
          (t.repuestoId && t.repuestoId.toString() === id.toString()) || 
          (t.codigoRepuesto && repuesto.codigo && t.codigoRepuesto === repuesto.codigo)
        );
        
        filtrados.sort((a, b) => {
           const getVal = f => f ? (Array.isArray(f) ? new Date(f[0], f[1]-1, f[2]).getTime() : new Date(f).getTime()) : 0;
           return getVal(b.fecha) - getVal(a.fecha);
        });
        setMovimientos(filtrados);
      } catch (error) {
        console.error('Error al cargar movimientos:', error);
      } finally {
        setLoadingMovimientos(false);
      }
    };
    fetchMovimientos();
  }, [repuesto, id]);

  // ROD-23: Cargar oportunidades de Audatex por repuesto
  const fetchOportunidades = useCallback(async () => {
    if (!repuesto) return;
    try {
      setLoadingOportunidades(true);
      const response = await audatexService.obtenerPorRepuesto(repuesto.id);
      setOportunidades(response.data?.oportunidades || []);
    } catch (error) {
      console.error('Error al cargar oportunidades:', error);
      setOportunidades([]);
    } finally {
      setLoadingOportunidades(false);
    }
  }, [repuesto]);

  useEffect(() => {
    fetchOportunidades();
  }, [fetchOportunidades]);

  // ROD-24: Cargar envíos de Audatex por repuesto
  const fetchEnvios = useCallback(async () => {
    if (!repuesto) return;
    try {
      setLoadingEnvios(true);
      const response = await audatexService.obtenerEnviosPorRepuesto(repuesto.id);
      setEnvios(response.data?.envios || []);
    } catch (error) {
      console.error('Error al cargar envíos:', error);
      setEnvios([]);
    } finally {
      setLoadingEnvios(false);
    }
  }, [repuesto]);

  useEffect(() => {
    fetchEnvios();
  }, [fetchEnvios]);

  const getEstadoTag = (estado) => {
    const estados = {
      'STOCK': { color: 'blue', icon: <CheckCircleOutlined />, text: 'En Stock' },
      'VENDIDO': { color: 'red', icon: <CloseCircleOutlined />, text: 'Vendido' },
      'AGOTADO': { color: 'orange', text: 'Agotado' },
      'DISPONIBLE': { color: 'green', icon: <CheckCircleOutlined />, text: 'Disponible' },
      'DESARMADO': { color: 'purple', text: 'Desarmado' },
      'REPARACION': { color: 'gold', icon: <SyncOutlined spin />, text: 'En Reparación' }
    };

    const estadoInfo = estados[estado] || { color: 'default', text: estado };
    return (
      <Tag color={estadoInfo.color} icon={estadoInfo.icon}>
        {estadoInfo.text}
      </Tag>
    );
  };

  const columnasMovimientos = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      render: (fecha) => {
        if (!fecha) return '-';
        if (Array.isArray(fecha)) {
          return `${String(fecha[2]).padStart(2, '0')}/${String(fecha[1]).padStart(2, '0')}/${fecha[0]}`;
        }
        return new Date(fecha).toLocaleDateString();
      }
    },
    {
      title: 'Tipo',
      dataIndex: 'tipoTransaccion',
      key: 'tipoTransaccion',
      render: (texto, record) => {
        const isIngreso = record.categoria === 'INGRESO' || record.tipoTransaccion?.toLowerCase().includes('venta');
        return <Tag color={isIngreso ? 'success' : 'error'}>{texto || record.categoria}</Tag>;
      }
    },
    {
      title: 'Referencia',
      dataIndex: 'referencia',
      key: 'referencia',
      render: (text) => text || '-'
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
    },
    {
      title: 'Monto',
      dataIndex: 'monto',
      key: 'monto',
      align: 'right',
      render: (monto, record) => {
        const isIngreso = record.categoria === 'INGRESO' || record.tipoTransaccion?.toLowerCase().includes('venta');
        return (
          <Text strong style={{ color: isIngreso ? '#52c41a' : '#f5222d' }}>
            {isIngreso ? '+' : '-'} ₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(monto || 0)}
          </Text>
        );
      }
    }
  ];

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!repuesto) {
    return <div>No se encontró el repuesto</div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <Button 
          type="text"
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/inventario')}
          style={{ marginRight: 16 }}
        >
          Volver
        </Button>
        <Title level={2} style={{ margin: 0, marginRight: 16 }}>Detalle del Repuesto</Title>
        {repuesto.vehiculoOrigenId ? (
          <Tag color="purple" style={{ fontSize: '14px', padding: '4px 8px' }}>
            Vehículo Desarmado: {vehiculoOrigen ? `${vehiculoOrigen.marcaNombre || ''} ${vehiculoOrigen.modelo || ''} ${vehiculoOrigen.anio || ''}` : ''} (ID: {repuesto.vehiculoOrigenId})
          </Tag>
        ) : (
          <Tag color="geekblue" style={{ fontSize: '14px', padding: '4px 8px' }}>
            Repuesto Genérico / Comprado
          </Tag>
        )}
      </div>
      
      <Card>
        <Tabs 
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            if (key === '3') {
              navigate(`/inventario/${id}?tab=oportunidades`, { replace: true });
            } else {
              navigate(`/inventario/${id}`, { replace: true });
            }
          }}
        >
          <TabPane tab="Información General" key="1">
            <Row gutter={[24, 24]}>
              <Col xs={24} md={8}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <Image
                    width={200}
                    src={repuesto.imagenUrl}
                    alt={repuesto.descripcion}
                    fallback="https://via.placeholder.com/200?text=Sin+imagen"
                    style={{ 
                      maxWidth: '100%',
                      height: 'auto',
                      borderRadius: 8,
                      border: '1px solid #f0f0f0'
                    }}
                  />
                </div>
                <Card>
                  <Statistic 
                    title="Precio de Venta" 
                    value={repuesto.precioVentaFormatted || '₡0'}
                    valueStyle={{ color: '#3f8600', fontSize: '1.5rem' }}
                  />
                  <Divider style={{ margin: '16px 0' }} />
                  <Statistic 
                    title="Stock Disponible" 
                    value={repuesto.cantidad} 
                    suffix="unidades"
                    valueStyle={{ color: repuesto.cantidad > 0 ? '#3f8600' : '#cf1322' }}
                  />
                  <Divider style={{ margin: '16px 0' }} />
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Estado:</Text>
                    {getEstadoTag(repuesto.estado)}
                  </div>
                </Card>
              </Col>
              <Col xs={24} md={16}>
                <Descriptions 
                  bordered 
                  column={1}
                  size="middle"
                  labelStyle={{ fontWeight: 'bold', width: '200px' }}
                >
                  <Descriptions.Item label="Código">{repuesto.codigo}</Descriptions.Item>
                  <Descriptions.Item label="Descripción">{repuesto.descripcion}</Descriptions.Item>
                  <Descriptions.Item label="Ubicación">
                    {repuesto.ubicacion || 'No especificada'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Precio de Costo">
                    {repuesto.precioCostoFormatted || '₡0'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Condición">
                    <Tag color={repuesto.condicion === 'NUEVO' ? 'green' : 'orange'}>
                      {repuesto.condicion || 'No especificada'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Código de Ubicación">
                    {repuesto.codigoUbicacion || 'No especificado'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Última Actualización">
                    {new Date(repuesto.fechaActualizacion).toLocaleString()}
                  </Descriptions.Item>
                </Descriptions>

                <Divider>Ubicación Física</Divider>
                <Row gutter={[16, 16]}>
                  {['bodega', 'zona', 'pared', 'malla', 'estante', 'nivel', 'piso'].map((item) => (
                    repuesto[item] && (
                      <Col key={item} xs={12} sm={8} md={6}>
                        <Card size="small" title={item.charAt(0).toUpperCase() + item.slice(1)}>
                          {repuesto[item]}
                        </Card>
                      </Col>
                    )
                  ))}
                </Row>
              </Col>
            </Row>
          </TabPane>
          
          <TabPane tab="Historial" key="2">
            <Card bordered={false}>
              <Table 
                columns={columnasMovimientos} 
                dataSource={movimientos} 
                rowKey="id" 
                loading={loadingMovimientos}
                pagination={{ defaultPageSize: 10 }}
                locale={{ emptyText: 'No hay movimientos registrados para este repuesto.' }}
              />
            </Card>
          </TabPane>
          
          <TabPane tab="Oportunidades InPart" key="3">
            <Card bordered={false}>
              <Table 
                columns={[
                  {
                    title: 'Marca', key: 'marca',
                    sorter: (a, b) => {
                      const marcaA = (a.marca || a.armadora || (a.datosCotizacion && (a.datosCotizacion['Marca'] || a.datosCotizacion['Armadora'])) || '');
                      const marcaB = (b.marca || b.armadora || (b.datosCotizacion && (b.datosCotizacion['Marca'] || b.datosCotizacion['Armadora'])) || '');
                      return marcaA.localeCompare(marcaB);
                    },
                    render: (_, record) => record.marca || record.armadora || (record.datosCotizacion && (record.datosCotizacion['Marca'] || record.datosCotizacion['Armadora'])) || 'Desc.'
                  },
                  {
                    title: 'Modelo', key: 'modelo',
                    sorter: (a, b) => {
                      const modeloA = (a.datosCotizacion && a.datosCotizacion['Descripción']) || '';
                      const modeloB = (b.datosCotizacion && b.datosCotizacion['Descripción']) || '';
                      return modeloA.localeCompare(modeloB);
                    },
                    render: (_, record) => (record.datosCotizacion && record.datosCotizacion['Descripción']) || '-'
                  },
                  {
                    title: 'Año', key: 'anio',
                    sorter: (a, b) => {
                      const anioA = (a.anio || (a.datosCotizacion && (a.datosCotizacion['Año Modelo'] || a.datosCotizacion['Año Fabricación'])) || '').toString();
                      const anioB = (b.anio || (b.datosCotizacion && (b.datosCotizacion['Año Modelo'] || b.datosCotizacion['Año Fabricación'])) || '').toString();
                      return anioA.localeCompare(anioB);
                    },
                    render: (_, record) => {
                      return record.anio || (record.datosCotizacion && (record.datosCotizacion['Año Modelo'] || record.datosCotizacion['Año Fabricación'])) || '-';
                    }
                  },
                  {
                    title: 'Aseguradora', dataIndex: 'aseguradora', key: 'aseguradora',
                    sorter: (a, b) => (a.aseguradora || '').localeCompare(b.aseguradora || '')
                  },
                  { title: 'Cotización ID', dataIndex: 'cotizacionId', key: 'cotizacionId' },
                  { title: 'Taller', dataIndex: 'taller', key: 'taller' },
                  { title: 'Póliza', dataIndex: 'poliza', key: 'poliza' },
                  { title: 'Siniestro', dataIndex: 'siniestro', key: 'siniestro' },
                  {
                    title: 'Matrícula', key: 'vehiculo',
                    render: (_, record) => {
                      const matricula = record.matricula || '';
                      return matricula
                        ? <Tag color="blue" style={{ width: 'fit-content', margin: 0 }}>{matricula}</Tag>
                        : <span style={{ color: '#888' }}>N/A</span>;
                    }
                  },
                  {
                    title: 'Fecha', dataIndex: 'fechaCotizacion', key: 'fechaCotizacion',
                    sorter: (a, b) => (a.fechaCotizacion || '').localeCompare(b.fechaCotizacion || '')
                  },
                  {
                    title: 'Pendientes', dataIndex: 'pendientes', key: 'pendientes',
                    sorter: (a, b) => (a.pendientes || 0) - (b.pendientes || 0),
                    render: (v) => (
                      <Tag color={v > 0 ? 'orange' : 'green'} style={{ fontWeight: 'bold' }}>{v}</Tag>
                    ),
                  },
                  {
                    title: 'Acciones',
                    key: 'acciones',
                    render: (_, record) => (
                      <Button 
                        type="primary" 
                        size="small"
                        disabled={repuesto.cantidad <= 0 || repuesto.estado !== 'STOCK'}
                        onClick={() => {
                          setOportunidadSeleccionada(record);
                          setModalCotizarVisible(true);
                        }}
                      >
                        Cotizar
                      </Button>
                    ),
                  },
                ]}
                dataSource={oportunidades}
                rowKey="cotizacionId"
                loading={loadingOportunidades}
                pagination={{ defaultPageSize: 10 }}
                locale={{ emptyText: 'No hay oportunidades de Audatex para este repuesto.' }}
                scroll={{ x: 'max-content' }}
              />
            </Card>
          </TabPane>
          
          <TabPane tab="Mis Envíos" key="4">
            <Card bordered={false}>
              <Table 
                columns={[
                  {
                    title: 'Cotización ID',
                    dataIndex: 'cotizacionId',
                    key: 'cotizacionId',
                  },
                  {
                    title: 'WAN',
                    dataIndex: 'wan',
                    key: 'wan',
                  },
                  {
                    title: 'Precio Ofrecido',
                    dataIndex: 'precioOfrecido',
                    key: 'precioOfrecido',
                    render: (precio) => `₡${new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(precio || 0)}`,
                  },
                  {
                    title: 'Tiempo de Entrega',
                    dataIndex: 'tiempoEntrega',
                    key: 'tiempoEntrega',
                  },
                  {
                    title: 'Condición',
                    dataIndex: 'condicionPieza',
                    key: 'condicionPieza',
                  },
                  {
                    title: 'Estado',
                    dataIndex: 'estado',
                    key: 'estado',
                    render: (estado) => {
                      const colores = {
                        'ENVIADA': 'blue',
                        'GANADA': 'green',
                        'PERDIDA': 'red',
                        'PENDIENTE': 'orange',
                      };
                      return <Tag color={colores[estado] || 'default'}>{estado}</Tag>;
                    },
                  },
                  {
                    title: 'Fecha de Envío',
                    dataIndex: 'fechaEnvio',
                    key: 'fechaEnvio',
                    render: (fecha) => fecha ? new Date(fecha).toLocaleString() : '-',
                  },
                  {
                    title: 'Usuario',
                    dataIndex: 'usuarioEnvio',
                    key: 'usuarioEnvio',
                  },
                ]}
                dataSource={envios}
                rowKey="id"
                loading={loadingEnvios}
                pagination={{ defaultPageSize: 10 }}
                locale={{ emptyText: 'No hay envíos de cotizaciones para este repuesto.' }}
                scroll={{ x: 'max-content' }}
              />
            </Card>
          </TabPane>
        </Tabs>
      </Card>

      <ModalCotizarInPart
        visible={modalCotizarVisible}
        onClose={() => {
          setModalCotizarVisible(false);
          setOportunidadSeleccionada(null);
        }}
        oportunidad={oportunidadSeleccionada}
        repuesto={repuesto}
        onExito={() => {
          fetchEnvios();
          fetchOportunidades();
        }}
      />
    </div>
  );
};

export default DetalleRepuesto;
