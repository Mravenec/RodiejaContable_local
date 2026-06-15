import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
          onClick={() => navigate(-1)}
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
        <Tabs defaultActiveKey="1">
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
        </Tabs>
      </Card>
    </div>
  );
};

export default DetalleRepuesto;
