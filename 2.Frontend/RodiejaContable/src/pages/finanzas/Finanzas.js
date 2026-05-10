
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, 
  Tag, 
  Input, 
  Button, 
  Space, 
  Select, 
  Modal, 
  Typography, 
  Card, 
  Row, 
  Col, 
  Statistic, 
  message,
  Alert
} from 'antd';
import { 
  SearchOutlined, 
  FilterOutlined, 
  ReloadOutlined, 
  EyeOutlined, 
  EditOutlined, 
  DeleteOutlined,
  PlusOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import transaccionesCompletasService from '../../api/transaccionesCompletas';

const { Option } = Select;
const { Text } = Typography;

const Finanzas = () => {
  const [transacciones, setTransacciones] = useState([]);
  const [loading, setLoading] = useState({ transacciones: false, filtros: false });
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    tipo: null,
    estado: null,
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    busqueda: '',
    searchFields: ['descripcion', 'referencia', 'codigoTransaccion'],
    categoria: null
  });
  const [filtrosVisibles, setFiltrosVisibles] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [estadisticas, setEstadisticas] = useState({
    ingresos: 0,
    egresos: 0,
    balance: 0,
    totalTransacciones: 0
  });

  const navigate = useNavigate();

  const obtenerTransacciones = useCallback(async (filtrosAplicados = {}) => {
    try {
      setLoading(prev => ({ ...prev, transacciones: true }));
      setError(null);
      
      const { estado, mes, anio, busqueda, searchFields, categoria } = { ...filtros, ...filtrosAplicados };
      
      let data;
      if (mes && anio) {
        // Calcular rango de fechas para el mes seleccionado
        const primerDia = moment([anio, mes - 1, 1]).format('YYYY-MM-DD');
        const ultimoDia = moment([anio, mes - 1, 1]).endOf('month').format('YYYY-MM-DD');
        data = await transaccionesCompletasService.getTransaccionesPorRangoFechas(primerDia, ultimoDia);
      } else if (categoria) {
        data = await transaccionesCompletasService.getTransaccionesPorCategoria(categoria);
      } else if (estado) {
        data = await transaccionesCompletasService.getTransaccionesPorEstado(estado);
      } else if (busqueda) {
        data = await transaccionesCompletasService.buscarTransacciones({ 
          search: busqueda, 
          fields: searchFields 
        });
      } else {
        data = await transaccionesCompletasService.getTransacciones();
      }
      
      const transaccionesMapeadas = Array.isArray(data) ? data.map(transaccion => {
        const categoria = String(transaccion?.categoria || '').toUpperCase();
        const esIngreso = categoria === 'INGRESO';
        const tipo = esIngreso ? 'INGRESO' : 'EGRESO';
        let fechaFormateada = 'Fecha no disponible';
        
        if (Array.isArray(transaccion?.fecha) && transaccion.fecha.length >= 3) {
          const [year, month, day] = transaccion.fecha;
          fechaFormateada = moment([year, month - 1, day]).format('DD/MM/YYYY');
        } else if (transaccion?.fecha) {
          fechaFormateada = moment(transaccion.fecha).format('DD/MM/YYYY');
        }
        
        const monto = parseFloat(transaccion?.monto) || 0;
        
        return {
          ...transaccion,
          key: transaccion?.codigoTransaccion || transaccion?.id?.toString() || Math.random().toString(),
          fecha: transaccion.fecha || [2023, 1, 1], // Default date if not provided
          tipo,
          tipoTransaccion: tipo, // Asegurarnos de que tipoTransaccion esté definido
          monto: Math.abs(monto),
          esIngreso,
          fechaFormateada
        };
      }) : [];

      setTransacciones(transaccionesMapeadas);
      
      // Calcular estadísticas
      const ingresos = transaccionesMapeadas
        .filter(t => t.esIngreso)
        .reduce((sum, t) => sum + t.monto, 0);
        
      const egresos = transaccionesMapeadas
        .filter(t => !t.esIngreso)
        .reduce((sum, t) => sum + t.monto, 0);
        
      setEstadisticas({
        ingresos,
        egresos,
        balance: ingresos - egresos,
        totalTransacciones: transaccionesMapeadas.length
      });
      
      setPagination(prev => ({
        ...prev,
        total: transaccionesMapeadas.length
      }));
      
    } catch (error) {
      console.error('Error al obtener transacciones:', error);
      setError('Error al cargar las transacciones. Por favor, intente de nuevo.');
      message.error('Error al cargar las transacciones');
    } finally {
      setLoading(prev => ({ ...prev, transacciones: false }));
    }
  }, [filtros]);

  useEffect(() => {
    obtenerTransacciones();
  }, [obtenerTransacciones]);

  const handleTableChange = (pagination, filters, sorter) => {
    setPagination(pagination);
    // Aquí puedes agregar lógica adicional para ordenamiento si es necesario
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'codigoTransaccion',
      key: 'codigoTransaccion',
      width: 180,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 120,
      render: (fecha) => {
        if (Array.isArray(fecha) && fecha.length >= 3) {
          const [year, month, day] = fecha;
          return moment([year, month - 1, day]).format('DD/MM/YYYY');
        }
        return 'Fecha inválida';
      },
      sorter: (a, b) => {
        const dateA = Array.isArray(a.fecha) ? new Date(a.fecha[0], a.fecha[1] - 1, a.fecha[2]) : new Date(0);
        const dateB = Array.isArray(b.fecha) ? new Date(b.fecha[0], b.fecha[1] - 1, b.fecha[2]) : new Date(0);
        return dateB - dateA; // Invertido: más reciente primero
      },
      defaultSortOrder: 'descend', // Ordenar descendente por defecto
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      render: (text, record) => (
        <div>
          <div>{text || 'Sin descripción'}</div>
          {record.referencia && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Ref: {record.referencia}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'tipoTransaccion',
      key: 'tipoTransaccion',
      width: 120,
      render: (tipo) => (
        <Tag color={tipo === 'INGRESO' ? 'green' : 'red'}>
          {tipo === 'INGRESO' ? 'INGRESO' : 'EGRESO'}
        </Tag>
      ),
      filters: [
        { text: 'Ingresos', value: 'INGRESO' },
        { text: 'Egresos', value: 'EGRESO' },
      ],
      onFilter: (value, record) => record.tipoTransaccion === value,
    },
    {
      title: 'Categoría',
      dataIndex: 'categoria',
      key: 'categoria',
      width: 150,
    },
    {
      title: 'Monto',
      dataIndex: 'monto',
      key: 'monto',
      width: 150,
      align: 'right',
      render: (monto, record) => (
        <Text 
          strong 
          style={{ 
            color: record.tipoTransaccion === 'INGRESO' ? '#52c41a' : '#f5222d' 
          }}
        >
          {record.tipoTransaccion === 'INGRESO' ? '+' : '-'} ₡{monto.toLocaleString('es-CR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })}
        </Text>
      ),
      sorter: (a, b) => a.monto - b.monto,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 120,
      render: (estado) => {
        let color = 'default';
        if (estado === 'PAGADO') color = 'green';
        else if (estado === 'PENDIENTE') color = 'orange';
        else if (estado === 'ANULADO') color = 'red';
        
        return (
          <Tag color={color} key={estado}>
            {estado}
          </Tag>
        );
      },
      filters: [
        { text: 'Pagado', value: 'PAGADO' },
        { text: 'Pendiente', value: 'PENDIENTE' },
        { text: 'Anulado', value: 'ANULADO' },
      ],
      onFilter: (value, record) => record.estado === value,
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 120,
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => verDetalle(record)}
            title="Ver detalles"
          />
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => editarTransaccion(record)}
            title="Editar"
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => confirmarEliminar(record)}
            title="Eliminar"
          />
        </Space>
      ),
    },
  ];

  const verDetalle = (transaccion) => {
    Modal.info({
      title: `Detalles de Transacción #${transaccion.codigoTransaccion}`,
      width: 700,
      content: (
        <div>
          <Row gutter={16}>
            <Col span={12}>
              <p><strong>Fecha:</strong> {transaccion.fechaFormateada || 'N/A'}</p>
              <p><strong>Descripción:</strong> {transaccion.descripcion || 'N/A'}</p>
              <p><strong>Referencia:</strong> {transaccion.referencia || 'N/A'}</p>
              <p><strong>Tipo:</strong> 
                <Tag color={transaccion.tipo === 'ingreso' ? 'green' : 'red'} style={{ marginLeft: 8 }}>
                  {transaccion.tipoTransaccion || 'N/A'}
                </Tag>
              </p>
            </Col>
            <Col span={12}>
              <p><strong>Categoría:</strong> {transaccion.categoria || 'N/A'}</p>
              <p>
                <strong>Monto:</strong> 
                <span style={{ 
                  color: transaccion.tipo === 'ingreso' ? '#52c41a' : '#f5222d',
                  marginLeft: 8
                }}>
                  {transaccion.tipo === 'ingreso' ? '+' : '-'} ₡{transaccion.monto?.toLocaleString('es-CR', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })}
                </span>
              </p>
              <p><strong>Estado:</strong> 
                <Tag 
                  color={
                    transaccion.estado === 'PAGADO' ? 'green' : 
                    transaccion.estado === 'PENDIENTE' ? 'orange' : 'red'
                  } 
                  style={{ marginLeft: 8 }}
                >
                  {transaccion.estado || 'N/A'}
                </Tag>
              </p>
              {transaccion.codigoVehiculo && (
                <p><strong>Vehículo:</strong> {transaccion.codigoVehiculo}</p>
              )}
            </Col>
          </Row>
          {transaccion.observaciones && (
            <div style={{ marginTop: 16 }}>
              <p><strong>Observaciones:</strong></p>
              <p>{transaccion.observaciones}</p>
            </div>
          )}
        </div>
      ),
      onOk() {},
    });
  };

  const editarTransaccion = (transaccion) => {
    // Navegar a la página de edición con el ID numérico de la transacción
    navigate(`/finanzas/editar/${transaccion.id}`);
  };

  const confirmarEliminar = (transaccion) => {
    Modal.confirm({
      title: '¿Está seguro de eliminar esta transacción?',
      content: `La transacción #${transaccion.codigoTransaccion} será eliminada permanentemente.`,
      okText: 'Sí, eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: () => eliminarTransaccion(transaccion.codigoTransaccion),
    });
  };

  const eliminarTransaccion = async (id) => {
    try {
      await transaccionesCompletasService.eliminarTransaccion(id);
      message.success('Transacción eliminada correctamente');
      obtenerTransacciones(); // Recargar la lista
    } catch (error) {
      console.error('Error al eliminar transacción:', error);
      message.error('Error al eliminar la transacción');
    }
  };

  const handleBuscar = (value) => {
    setFiltros(prev => ({ ...prev, busqueda: value }));
    obtenerTransacciones({ busqueda: value });
  };

  const handleFiltrar = (filtrosAplicados) => {
    obtenerTransacciones(filtrosAplicados);
  };

  const limpiarFiltros = () => {
    const filtrosIniciales = {
      tipo: null,
      estado: null,
      mes: null,
      anio: null,
      busqueda: '',
      categoria: null
    };
    setFiltros(filtrosIniciales);
    obtenerTransacciones(filtrosIniciales);
  };

  const toggleFiltros = () => {
    setFiltrosVisibles(!filtrosVisibles);
  };

  const handleNuevaTransaccion = () => {
    navigate('/finanzas/nueva');
  };

  return (
    <div className="finanzas-container">
      <div className="page-header">
        <Typography.Title level={2}>Gestión Financiera</Typography.Title>
        <div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleNuevaTransaccion}
            style={{ marginRight: 8 }}
          >
            Nueva Transacción
          </Button>
          <Button 
            icon={<FilterOutlined />} 
            onClick={toggleFiltros}
          >
            {filtrosVisibles ? 'Ocultar Filtros' : 'Mostrar Filtros'}
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Ingresos"
              value={estadisticas.ingresos}
              precision={2}
              valueStyle={{ color: '#52c41a' }}
              prefix={<><ArrowUpOutlined /> ₡</>}
              suffix=""
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Egresos"
              value={estadisticas.egresos}
              precision={2}
              valueStyle={{ color: '#f5222d' }}
              prefix={<><ArrowDownOutlined /> ₡</>}
              suffix=""
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Balance"
              value={estadisticas.balance}
              precision={2}
              valueStyle={{ color: estadisticas.balance >= 0 ? '#52c41a' : '#f5222d' }}
              prefix={<>{estadisticas.balance >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} ₡</>}
              suffix=""
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Transacciones"
              value={estadisticas.totalTransacciones}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filtros */}
      {filtrosVisibles && (
        <Card 
          title="Filtros" 
          style={{ marginBottom: 24 }}
          extra={
            <Button 
              type="link" 
              onClick={limpiarFiltros}
              disabled={!Object.values(filtros).some(val => val !== null && val !== '' && !(Array.isArray(val) && val.length === 0))}
            >
              Limpiar Filtros
            </Button>
          }
        >
          <Row gutter={16}>
            <Col xs={24} md={12} lg={6} style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}><strong>Mes</strong></div>
              <Select
                style={{ width: '100%' }}
                placeholder="Seleccionar mes"
                allowClear
                value={filtros.mes}
                onChange={(value) => {
                  const newFiltros = { ...filtros, mes: value };
                  setFiltros(newFiltros);
                  handleFiltrar(newFiltros);
                }}
              >
                <Option value={1}>Enero</Option>
                <Option value={2}>Febrero</Option>
                <Option value={3}>Marzo</Option>
                <Option value={4}>Abril</Option>
                <Option value={5}>Mayo</Option>
                <Option value={6}>Junio</Option>
                <Option value={7}>Julio</Option>
                <Option value={8}>Agosto</Option>
                <Option value={9}>Septiembre</Option>
                <Option value={10}>Octubre</Option>
                <Option value={11}>Noviembre</Option>
                <Option value={12}>Diciembre</Option>
              </Select>
            </Col>
            <Col xs={24} md={12} lg={6} style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}><strong>Año</strong></div>
              <Select
                style={{ width: '100%' }}
                placeholder="Seleccionar año"
                allowClear
                value={filtros.anio}
                onChange={(value) => {
                  const newFiltros = { ...filtros, anio: value };
                  setFiltros(newFiltros);
                  handleFiltrar(newFiltros);
                }}
              >
                {[...Array(10).keys()].map(i => {
                  const year = new Date().getFullYear() - 5 + i;
                  return <Option key={year} value={year}>{year}</Option>;
                })}
              </Select>
            </Col>
            <Col xs={24} md={12} lg={6} style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}><strong>Tipo de Transacción</strong></div>
              <Select
                style={{ width: '100%' }}
                placeholder="Seleccionar tipo"
                allowClear
                value={filtros.tipo}
                onChange={(value) => {
                  const newFiltros = { ...filtros, tipo: value };
                  setFiltros(newFiltros);
                  handleFiltrar(newFiltros);
                }}
              >
                <Option value="INGRESO">Ingreso</Option>
                <Option value="EGRESO">Egreso</Option>
              </Select>
            </Col>
            <Col xs={24} md={12} lg={6} style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}><strong>Estado</strong></div>
              <Select
                style={{ width: '100%' }}
                placeholder="Seleccionar estado"
                allowClear
                value={filtros.estado}
                onChange={(value) => {
                  const newFiltros = { ...filtros, estado: value };
                  setFiltros(newFiltros);
                  handleFiltrar(newFiltros);
                }}
              >
                <Option value="PAGADO">Pagado</Option>
                <Option value="PENDIENTE">Pendiente</Option>
                <Option value="ANULADO">Anulado</Option>
              </Select>
            </Col>
            <Col xs={24} md={12} lg={6} style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}><strong>Buscar</strong></div>
              <Input.Search
                placeholder="Buscar transacciones..."
                allowClear
                enterButton={<SearchOutlined />}
                value={filtros.busqueda}
                onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                onSearch={handleBuscar}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Tabla de transacciones */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Transacciones</span>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={() => obtenerTransacciones()}
              loading={loading.transacciones}
            >
              Actualizar
            </Button>
          </div>
        }
      >
        {error && (
          <div style={{ marginBottom: 16 }}>
            <Alert message="Error" description={error} type="error" showIcon />
          </div>
        )}
        
        <Table
          columns={columns}
          dataSource={transacciones}
          rowKey="codigoTransaccion"
          loading={loading.transacciones}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} transacciones`,
            pageSizeOptions: ['10', '20', '50', '100'],
            showQuickJumper: true,
          }}
          onChange={handleTableChange}
          scroll={{ x: 'max-content' }}
          bordered
        />
      </Card>
    </div>
  );
};

export default Finanzas;