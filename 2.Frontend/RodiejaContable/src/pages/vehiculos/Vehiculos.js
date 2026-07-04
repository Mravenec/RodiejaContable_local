import React, { useState } from 'react';
import { Card, Table, Button, Space, Typography, Input, Select, Tag, Spin, Row, Col } from 'antd';
import { SearchOutlined, PlusOutlined, ReloadOutlined, CarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useVehiculos } from '../../hooks/useVehiculos';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import './vehiculos.css';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const Vehiculos = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filtros, setFiltros] = useState({});
  const { data, isLoading, isError, refetch } = useVehiculos(filtros);

  // Asegurarse de que los datos sean un array
  const tableData = Array.isArray(data) ? data : [];

  const handleSearch = (value) => {
    setFiltros(prev => ({
      ...prev,
      busqueda: value
    }));
  };

  const handleEstadoChange = (value) => {
    setFiltros(prev => ({
      ...prev,
      estado: value
    }));
  };

  const handleRefresh = () => {
    refetch();
  };

  const columns = [
    {
      title: 'Código',
      dataIndex: 'codigoVehiculo',
      key: 'codigo',
      width: 120,
      ellipsis: true,
      render: (text) => <span style={{ whiteSpace: 'nowrap' }}>{text || '-'}</span>,
    },
    {
      title: 'Vehículo',
      key: 'vehiculo',
      width: 200,
      render: (_, record) => {
        const marca = record.marca || '';
        const modelo = record.modelo || '';
        const generacionStr = typeof record.generacion === 'object' ? record.generacion?.nombre : (record.generacion || '');
        
        return (
          <span style={{ fontWeight: 500 }}>
            {marca} {modelo} {generacionStr ? `- ${generacionStr}` : ''}
            {!marca && !modelo && !generacionStr && '-'}
          </span>
        );
      },
    },
    {
      title: 'Año',
      dataIndex: 'anio',
      key: 'anio',
      width: 100,
      align: 'center',
      render: (text) => text || '-',
    },
    {
      title: 'Precio',
      key: 'precio',
      width: 150,
      align: 'right',
      render: (_, record) => (
        <div>
          <div>Compra: {record.precioCompra ? formatCurrency(record.precioCompra) : '-'}</div>
          {record.precioVenta && <div>Venta: {formatCurrency(record.precioVenta)}</div>}
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 140,
      render: (estado) => (
        <Tag
          color={
            estado === 'DISPONIBLE' ? 'green' :
              estado === 'VENDIDO' ? 'red' :
                estado === 'REPARACION' ? 'orange' :
                  estado === 'DESARMADO' ? 'warning' : 'default'
          }
          style={{
            margin: 0,
            textTransform: 'capitalize',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            minWidth: '100px',
            display: 'inline-flex',
            justifyContent: 'center'
          }}
        >
          {estado?.toLowerCase()?.replace('_', ' ') || '-'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            onClick={() => navigate(`/vehiculos/${record.id}`)}
            style={{ padding: '4px 0' }}
          >
            Ver
          </Button>
        </Space>
      ),
    },
  ];

  if (isError) {
    return (
      <div className="vehiculos-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={2} style={{ margin: 0 }}>Vehículos</Title>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={isLoading}
          >
            Reintentar
          </Button>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p>Error al cargar los vehículos</p>
        </div>
      </div>
    );
  }



  return (
    <div className="vehiculos-container" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* ── Header de navegación ─────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 600 }}>Gestión de Vehículos</Title>
          <Text type="secondary" style={{ display: 'block' }}>Administra el inventario de vehículos disponibles</Text>
        </div>
        <Space>
          <Button
            icon={<CarOutlined />}
            onClick={() => navigate('/vehiculos/jerarquia')}
          >
            Ver por Generaciones
          </Button>
          {user?.rol !== 'CONTADOR' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/vehiculos/nuevo')}
              size="large"
              style={{ borderRadius: '6px' }}
            >
              Agregar Vehículo
            </Button>
          )}
        </Space>
      </div>

      <Card
        bordered={false}
        style={{ borderRadius: '12px', border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: '24px' }}
        bodyStyle={{ padding: '24px' }}
      >
        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={8}>
              <Search
                placeholder="Buscar por marca, modelo, año..."
                allowClear
                enterButton={<SearchOutlined />}
                onSearch={handleSearch}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Select
                placeholder="Filtrar por estado"
                style={{ width: '100%' }}
                allowClear
                onChange={handleEstadoChange}
              >
                <Option value="DISPONIBLE">Disponible</Option>
                <Option value="VENDIDO">Vendido</Option>
                <Option value="REPARACION">En reparación</Option>
                <Option value="DESARMADO">Desarmado</Option>
              </Select>
            </Col>
            <Col xs={24} md={8} style={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                style={{ width: { xs: '100%', md: 'auto' } }}
              >
                Actualizar
              </Button>
            </Col>
          </Row>
        </div>

        <div style={{
          width: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: '-ms-autohiding-scrollbar',
          borderRadius: '8px',
          border: '1px solid #f0f0f0',
          marginTop: '16px'
        }}>
          <Spin spinning={isLoading}>
            <Table
              columns={columns}
              dataSource={tableData}
              rowKey="id"
              scroll={{ x: 'max-content' }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) => `Mostrando ${range[0]}-${range[1]} de ${total} vehículos`,
                showQuickJumper: true,
                total: data?.total || 0,
                responsive: true,
                size: 'small',
                style: {
                  margin: '16px 16px 0',
                  paddingBottom: '16px'
                }
              }}
              locale={{
                emptyText: null
              }}
              style={{
                minWidth: '800px',
                border: 'none'
              }}
              className="custom-table"
            />
          </Spin>
        </div>
      </Card>
    </div>
  );
};

export default Vehiculos;
