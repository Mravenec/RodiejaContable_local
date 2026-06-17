import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Typography,
  Drawer,
  Grid,
  message,
  Spin,
  Image,
  Popconfirm
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import InventarioService from '../../api/inventario';
import { usePartesVehiculo } from '../../hooks/usePartesVehiculo';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { useBreakpoint } = Grid;

const Inventario = () => {
  const screens = useBreakpoint();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const { data: partesVehiculo = [], isLoading: loadingPartes } = usePartesVehiculo();

  const [filterVisible, setFilterVisible] = useState(false);
  const [filtros, setFiltros] = useState({
    estado: null,
    parteVehiculoId: null,
    ubicacion: null,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Fetch data from API
  const fetchData = async (params = {}) => {
    try {
      setLoading(true);
      const { current, pageSize } = pagination;
      const { estado, parteVehiculoId, ubicacion } = filtros;

      // Build query params
      const queryParams = {
        page: params.pagination?.current || current,
        pageSize: params.pagination?.pageSize || pageSize,
        ...(estado && { estado }),
        ...(parteVehiculoId && { parteVehiculoId }),
        ...(ubicacion && { ubicacion }),
        ...params,
      };

      const data = await InventarioService.getRepuestos(queryParams);
      const activeData = Array.isArray(data) ? data.filter(item => item.activo) : [];

      setData(activeData);
      setPagination({
        ...pagination,
        total: activeData.length,
        current: pagination.current,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Error al cargar el inventario');
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle table change (pagination, filters, sorter)
  const handleTableChange = (pagination, filters, sorter) => {
    fetchData({
      sortField: sorter.field,
      sortOrder: sorter.order,
      pagination,
      ...filters,
    });
  };

  // Handle search
  const handleSearch = (value) => {
    if (value) {
      InventarioService.buscarPorCodigo(value)
        .then((results) => {
          setData(Array.isArray(results) ? results.filter(item => item.activo) : []);
        })
        .catch((error) => {
          console.error('Error searching:', error);
          message.error('Error al buscar repuestos');
        });
    } else {
      fetchData();
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    try {
      await InventarioService.eliminarRepuesto(id);
      message.success('Repuesto eliminado correctamente');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error deleting item:', error);
      message.error('Error al eliminar el repuesto');
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Imagen',
      dataIndex: 'imagenUrl',
      key: 'imagen',
      width: 100,
      render: (imagenUrl) => (
        imagenUrl ? (
          <Image
            width={50}
            height={50}
            src={imagenUrl}
            alt="Imagen del repuesto"
            style={{ objectFit: 'cover' }}
            fallback="https://via.placeholder.com/50?text=Sin+imagen"
          />
        ) : (
          <div style={{
            width: 50,
            height: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f0f0f0',
            color: '#999',
            fontSize: 10,
            textAlign: 'center',
            padding: 5
          }}>
            Sin imagen
          </div>
        )
      ),
    },
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      sorter: true,
      fixed: 'left',
      width: 150,
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      width: 250,
    },
    {
      title: 'Parte',
      dataIndex: 'parteVehiculo',
      key: 'parteVehiculo',
      width: 180,
      render: (parte) => {
        const partes = {
          'MOTOR': 'Motor',
          'CAJA_DE_CAMBIO': 'Caja de Cambio',
          'COMPUTADORA': 'Computadora',
          'SISTEMA_DE_FRENOS': 'Frenos',
          'SUSPENSION_Y_AMORTIGUAMIENTO': 'Suspensión',
          'SISTEMA_ELECTRICO': 'Eléctrico',
          'CARROCERIA': 'Carrocería',
          'AROS_Y_LLANTAS': 'Llantas',
          'SISTEMA_DE_DIRECCION': 'Dirección',
          'EJES_Y_DIFERENCIA': 'Ejes',
          'AIRBAGS_O_BOLSAS_DE_AIRE': 'Airbags',
          'EMBRAGUE': 'Embrague',
          'TURBO': 'Turbo',
          'BATERIA': 'Batería',
          'ALTERNADOR': 'Alternador',
          'FUSIBLES': 'Fusibles',
          'TANQUE_DE_GASOLINA': 'Tanque de Gasolina'
        };
        return partes[parte] || parte;
      },
      filters: [
        { text: 'Motor', value: 'MOTOR' },
        { text: 'Caja de Cambio', value: 'CAJA_DE_CAMBIO' },
        { text: 'Computadora', value: 'COMPUTADORA' },
        { text: 'Frenos', value: 'SISTEMA_DE_FRENOS' },
        { text: 'Suspensión', value: 'SUSPENSION_Y_AMORTIGUAMIENTO' },
        { text: 'Eléctrico', value: 'SISTEMA_ELECTRICO' },
        { text: 'Carrocería', value: 'CARROCERIA' },
        { text: 'Llantas', value: 'AROS_Y_LLANTAS' },
      ],
      onFilter: (value, record) => record.parteVehiculo === value,
    },
    {
      title: 'Ubicación',
      dataIndex: 'ubicacion',
      key: 'ubicacion',
      width: 200,
    },
    {
      title: 'Stock',
      dataIndex: 'cantidad',
      key: 'cantidad',
      sorter: (a, b) => a.cantidad - b.cantidad,
      width: 120,
      render: (cantidad, record) => (
        <Tag color={cantidad > 0 ? 'green' : 'red'}>
          {cantidad} {cantidad === 1 ? 'unidad' : 'unidades'}
        </Tag>
      ),
    },
    {
      title: 'Precio Venta',
      dataIndex: 'precioVentaFormatted',
      key: 'precioVenta',
      sorter: (a, b) => a.precioVenta - b.precioVenta,
      width: 150,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 150,
      filters: [
        { text: 'En Stock', value: 'STOCK' },
        { text: 'Vendido', value: 'VENDIDO' },
        { text: 'Agotado', value: 'AGOTADO' },
        { text: 'Disponible', value: 'DISPONIBLE' },
        { text: 'Desarmado', value: 'DESARMADO' },
        { text: 'En Reparación', value: 'REPARACION' },
      ],
      onFilter: (value, record) => record.estado === value,
      render: (estado) => {
        const estados = {
          'STOCK': { color: 'success', icon: <CheckCircleOutlined />, label: 'En Stock' },
          'VENDIDO': { color: 'default', icon: <CheckCircleOutlined />, label: 'Vendido' },
          'AGOTADO': { color: 'error', icon: <CloseCircleOutlined />, label: 'Agotado' },
          'DISPONIBLE': { color: 'processing', icon: <SyncOutlined spin />, label: 'Disponible' },
          'DESARMADO': { color: 'warning', icon: <ToolOutlined />, label: 'Desarmado' },
          'REPARACION': { color: 'processing', icon: <SyncOutlined spin />, label: 'En Reparación' },
        };

        const estadoInfo = estados[estado] || { color: 'default', icon: null, label: estado };

        return (
          <Tag icon={estadoInfo.icon} color={estadoInfo.color}>
            {estadoInfo.label}
          </Tag>
        );
      },
    },
    {
      title: 'Acciones',
      key: 'acciones',
      fixed: screens.md ? false : 'right',
      width: 120,
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/inventario/${record.id}`)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => navigate(`/inventario/editar/${record.id}`)}
          />
          <Popconfirm
            title="¿Eliminar permanentemente?"
            description="Si tiene transacciones asociadas, la eliminación fallará."
            onConfirm={() => handleDelete(record.id)}
            okText="Sí, eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* ── Header de navegación ─────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 600 }}>Gestión de Inventario</Title>
          <Text type="secondary">Administra los repuestos disponibles, en reparación o agotados.</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/inventario/nuevo')}
          size="large"
          style={{ borderRadius: '6px' }}
        >
          Nuevo Repuesto
        </Button>
      </div>

      <Card
        bordered={false}
        style={{ borderRadius: '12px', border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
        bodyStyle={{ padding: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: '12px' }}>
          <Space>
            <Search
              placeholder="Buscar por código..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              style={{ width: 300 }}
              onSearch={handleSearch}
            />
            <Button
              icon={<FilterOutlined />}
              onClick={() => setFilterVisible(true)}
            >
              Filtros
            </Button>
          </Space>
        </div>

        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={data}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} repuestos`,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            loading={loading}
            onChange={handleTableChange}
            rowKey="id"
            style={{ marginTop: 16 }}
            scroll={{ x: 'max-content' }}
          />
        </Spin>
      </Card>

      <Drawer
        title="Filtros de búsqueda"
        placement="right"
        onClose={() => setFilterVisible(false)}
        open={filterVisible}
        width={350}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>Estado</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder="Seleccionar estado"
              allowClear
              value={filtros.estado}
              onChange={(value) => setFiltros({ ...filtros, estado: value })}
            >
              <Option value="STOCK">En Stock</Option>
              <Option value="VENDIDO">Vendido</Option>
              <Option value="AGOTADO">Agotado</Option>
              <Option value="DISPONIBLE">Disponible</Option>
              <Option value="DESARMADO">Desarmado</Option>
              <Option value="REPARACION">En Reparación</Option>
            </Select>
          </div>

          <div>
            <Text strong>Parte del Vehículo</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder="Seleccionar parte"
              allowClear
              loading={loadingPartes}
              value={filtros.parteVehiculoId}
              onChange={(value) => setFiltros({ ...filtros, parteVehiculoId: value })}
            >
              {partesVehiculo.map(parte => (
                <Option key={parte.id} value={parte.id}>
                  {parte.nombre}
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <Text strong>Ubicación</Text>
            <Input
              placeholder="Ej: B1 Z1 P1"
              style={{ marginTop: 8 }}
              value={filtros.ubicacion || ''}
              onChange={(e) => setFiltros({ ...filtros, ubicacion: e.target.value })}
            />
          </div>

          <Button
            type="primary"
            block
            style={{ marginTop: 16 }}
            onClick={() => {
              fetchData();
              setFilterVisible(false);
            }}
          >
            Aplicar Filtros
          </Button>

          <Button
            block
            style={{ marginTop: 8 }}
            onClick={() => {
              setFiltros({
                estado: null,
                parteVehiculoId: null,
                ubicacion: null,
              });
              fetchData();
              setFilterVisible(false);
            }}
          >
            Limpiar Filtros
          </Button>
        </Space>
      </Drawer>
    </div>
  );
};

export default Inventario;
