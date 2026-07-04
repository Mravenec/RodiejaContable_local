import React, { useState, useMemo } from 'react';
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
  Alert,
  DatePicker,
  Collapse
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
  MoneyCollectOutlined,
  UndoOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import transaccionesCompletasService from '../../api/transaccionesCompletas';
import { useTransaccionesCompletas } from '../../hooks/useTransacciones';
import { useAuth } from '../../context/AuthContext';
import vehiculoService from '../../api/vehiculos';

const { Option } = Select;
const { Text } = Typography;

const Finanzas = () => {
  const { user } = useAuth();
  const [filtros, setFiltros] = useState({
    tipo: null,
    estado: null,
    rangoFechas: null,
    vehiculo: '',
    busqueda: '',
    searchFields: ['descripcion', 'referencia', 'codigoTransaccion'],
    categoria: null
  });
  const [filtrosVisibles, setFiltrosVisibles] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  const navigate = useNavigate();

  const queryParams = useMemo(() => {
    const params = {};
    if (filtros.rangoFechas && filtros.rangoFechas.length === 2) {
      params.fechaInicio = filtros.rangoFechas[0].format('YYYY-MM-DD');
      params.fechaFin = filtros.rangoFechas[1].format('YYYY-MM-DD');
    }
    return params;
  }, [filtros.rangoFechas]);

  const { data: queryData, isLoading: isLoadingTransacciones, error: queryError, refetch: refetchTransacciones } = useTransaccionesCompletas(queryParams);

  const transacciones = useMemo(() => {
    let data = queryData || [];
    
    let transaccionesMapeadas = Array.isArray(data) ? data.map(transaccion => {
      const cat = String(transaccion?.categoria || '').toUpperCase();
      const esIngreso = cat === 'INGRESO';
      const tipoTrans = esIngreso ? 'INGRESO' : 'EGRESO';
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
        fecha: transaccion.fecha || [2023, 1, 1],
        tipo: tipoTrans,
        tipoTransaccion: tipoTrans,
        tipoTransaccionOriginal: transaccion.tipoTransaccion,
        monto: Math.abs(monto),
        esIngreso,
        fechaFormateada
      };
    }) : [];

    if (filtros.tipo) {
      transaccionesMapeadas = transaccionesMapeadas.filter(t => t.tipoTransaccion === filtros.tipo);
    }
    if (filtros.estado) {
      transaccionesMapeadas = transaccionesMapeadas.filter(t => t.estado === filtros.estado);
    }
    if (filtros.categoria && filtros.categoria.trim() !== '') {
      const catLower = filtros.categoria.toLowerCase();
      transaccionesMapeadas = transaccionesMapeadas.filter(t => t.categoria && t.categoria.toLowerCase().includes(catLower));
    }
    if (filtros.vehiculo && filtros.vehiculo.trim() !== '') {
      const v = filtros.vehiculo.toLowerCase();
      transaccionesMapeadas = transaccionesMapeadas.filter(t => 
        t.codigoVehiculo && t.codigoVehiculo.toLowerCase().includes(v)
      );
    }
    if (filtros.busqueda && filtros.busqueda.trim() !== '') {
      const b = filtros.busqueda.toLowerCase();
      transaccionesMapeadas = transaccionesMapeadas.filter(t => 
        (t.descripcion && t.descripcion.toLowerCase().includes(b)) ||
        (t.referencia && t.referencia.toLowerCase().includes(b)) ||
        (t.codigoTransaccion && t.codigoTransaccion.toLowerCase().includes(b))
      );
    }

    return transaccionesMapeadas;
  }, [queryData, filtros]);

  const estadisticas = useMemo(() => {
    const ingresos = transacciones
      .filter(t => t.esIngreso)
      .reduce((sum, t) => sum + t.monto, 0);
      
    const egresos = transacciones
      .filter(t => !t.esIngreso)
      .reduce((sum, t) => sum + t.monto, 0);
      
    return {
      ingresos,
      egresos,
      balance: ingresos - egresos,
      totalTransacciones: transacciones.length
    };
  }, [transacciones]);

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
        if (!fecha) return 'Fecha inválida';
        if (Array.isArray(fecha) && fecha.length >= 3) {
          const [year, month, day] = fecha;
          return moment([year, month - 1, day]).format('DD/MM/YYYY');
        }
        const m = moment(fecha);
        return m.isValid() ? m.format('DD/MM/YYYY') : 'Fecha inválida';
      },
      sorter: (a, b) => {
        const getDate = (f) => {
          if (!f) return 0;
          if (Array.isArray(f) && f.length >= 3) return new Date(f[0], f[1] - 1, f[2]).getTime();
          const d = new Date(f);
          return isNaN(d.getTime()) ? 0 : d.getTime();
        };
        return getDate(a.fecha) - getDate(b.fecha);
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
      title: 'Vehículo / Repuesto',
      key: 'asociacion',
      width: 200,
      render: (_, record) => {
        if (record.codigoVehiculo) {
          return (
            <div>
              <Tag color="blue">Vehículo</Tag>
              <div style={{ fontSize: '12px', marginTop: 4 }}>
                {record.marca} {record.modelo} {record.generacion}
              </div>
            </div>
          );
        } else if (record.codigoRepuesto) {
          return (
            <div>
              <Tag color="orange">Repuesto</Tag>
              <div style={{ fontSize: '12px', marginTop: 4 }}>
                {record.codigoRepuesto}
                {record.marca ? ` (${record.marca} ${record.modelo})` : ''}
              </div>
            </div>
          );
        }
        return <Text type="secondary">N/A</Text>;
      },
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 120,
      render: (estado) => {
        let color = 'default';
        if (estado === 'PAGADO' || estado === 'COMPLETADA') color = 'green';
        else if (estado === 'PENDIENTE') color = 'orange';
        else if (estado === 'ANULADO' || estado === 'CANCELADA') color = 'red';
        
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
      width: 150,
      render: (_, record) => (
        <Space size="middle">
          {record.estado === 'COMPLETADA' && user?.rol !== 'CONTADOR' && (
            <Button 
              type="text" 
              danger
              icon={<UndoOutlined />} 
              onClick={() => confirmarReembolso(record)}
              title="Reembolsar Transacción"
            />
          )}
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => verDetalle(record)}
            title="Ver detalles"
          />
          {user?.rol !== 'CONTADOR' && (
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => editarTransaccion(record)}
              title="Editar"
            />
          )}
          {user?.rol !== 'CONTADOR' && (
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => confirmarEliminar(record)}
              title="Eliminar"
            />
          )}
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
                <Tag color={transaccion.tipoTransaccion === 'INGRESO' ? 'green' : 'red'} style={{ marginLeft: 8 }}>
                  {transaccion.tipoTransaccion || 'N/A'}
                </Tag>
              </p>
            </Col>
            <Col span={12}>
              <p><strong>Categoría:</strong> {transaccion.categoria || 'N/A'}</p>
              <p>
                <strong>Monto:</strong> 
                <span style={{ 
                  color: transaccion.tipoTransaccion === 'INGRESO' ? '#52c41a' : '#f5222d',
                  marginLeft: 8
                }}>
                  {transaccion.tipoTransaccion === 'INGRESO' ? '+' : '-'} ₡{transaccion.monto?.toLocaleString('es-CR', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })}
                </span>
              </p>
              <p><strong>Estado:</strong> 
                <Tag 
                  color={
                    (transaccion.estado === 'PAGADO' || transaccion.estado === 'COMPLETADA') ? 'green' : 
                    transaccion.estado === 'PENDIENTE' ? 'orange' : 'red'
                  } 
                  style={{ marginLeft: 8 }}
                >
                  {transaccion.estado || 'N/A'}
                </Tag>
              </p>
              {transaccion.codigoVehiculo && (
                <p><strong>Vehículo:</strong> {transaccion.marca} {transaccion.modelo} {transaccion.generacion}</p>
              )}
              {transaccion.codigoRepuesto && (
                <p><strong>Repuesto:</strong> {transaccion.codigoRepuesto} {transaccion.marca ? `(${transaccion.marca} ${transaccion.modelo})` : ''}</p>
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
      onOk: () => eliminarTransaccion(transaccion.id),
    });
  };

  const confirmarReembolso = (transaccion) => {
    Modal.confirm({
      title: 'Confirmar Reembolso',
      content: (
        <div>
          <p>¿Está seguro que desea reembolsar la transacción <strong>#{transaccion.codigoTransaccion}</strong>?</p>
          <p>Esta acción generará una transacción de balance (Ingreso/Egreso) por <strong>₡{transaccion.monto?.toLocaleString('es-CR')}</strong>.</p>
        </div>
      ),
      okText: 'Sí, Reembolsar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: () => procesarReembolso(transaccion),
    });
  };

  const procesarReembolso = async (transaccion) => {
    try {
      await transaccionesCompletasService.reembolsarTransaccion(transaccion.id);
      
      // Si la transacción está relacionada a un vehículo y es un reembolso (posible cancelación de venta),
      // volvemos a poner el vehículo como DISPONIBLE.
      const vehiculoId = transaccion.vehiculoId || transaccion.codigoVehiculo;
      if (vehiculoId) {
        try {
          await vehiculoService.actualizarEstadoVehiculo(vehiculoId, 'DISPONIBLE');
        } catch (e) {
          console.error('Error al actualizar estado del vehículo tras reembolso:', e);
        }
      }

      message.success('Reembolso procesado exitosamente');
      refetchTransacciones(); // Recargar la lista
    } catch (error) {
      console.error('Error al procesar el reembolso:', error);
      message.error(error.message || 'Error al procesar el reembolso');
    }
  };

  const eliminarTransaccion = async (id) => {
    try {
      await transaccionesCompletasService.eliminarTransaccion(id);
      message.success('Transacción eliminada correctamente');
      refetchTransacciones(); // Recargar la lista
    } catch (error) {
      console.error('Error al eliminar transacción:', error);
      message.error('Error al eliminar la transacción');
    }
  };

  const handleBuscar = (value) => {
    setFiltros(prev => ({ ...prev, busqueda: value }));
  };

  const handleFiltrar = (filtrosAplicados) => {
    // handled by useMemo
  };

  const limpiarFiltros = () => {
    const filtrosIniciales = {
      tipo: null,
      estado: null,
      rangoFechas: null,
      vehiculo: '',
      busqueda: '',
      categoria: null
    };
    setFiltros(filtrosIniciales);
  };

  const toggleFiltros = () => {
    setFiltrosVisibles(!filtrosVisibles);
  };

  const handleNuevaTransaccion = () => {
    navigate('/finanzas/nueva');
  };

  return (
    <div className="finanzas-container" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* ── Header de navegación ─────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0, fontWeight: 600 }}>Gestión Financiera</Typography.Title>
          <Typography.Text type="secondary" style={{ display: 'block' }}>Administra los ingresos y egresos de la empresa</Typography.Text>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button 
            icon={<FilterOutlined />} 
            onClick={toggleFiltros}
            size="large"
          >
            {filtrosVisibles ? 'Ocultar Filtros' : 'Mostrar Filtros'}
          </Button>
          {user?.rol !== 'CONTADOR' && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleNuevaTransaccion}
              size="large"
              style={{ borderRadius: '6px' }}
            >
              Nueva Transacción
            </Button>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} bodyStyle={{ padding: '24px' }} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}>
            <Statistic
              title={<span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Ingresos Totales</span>}
              value={estadisticas.ingresos}
              precision={2}
              valueStyle={{ color: '#52c41a', fontWeight: 600, fontSize: '24px' }}
              prefix={<ArrowUpOutlined style={{ fontSize: '20px' }} />}
              formatter={(value) => `₡${value.toLocaleString('es-CR')}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} bodyStyle={{ padding: '24px' }} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}>
            <Statistic
              title={<span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Egresos Totales</span>}
              value={estadisticas.egresos}
              precision={2}
              valueStyle={{ color: '#f5222d', fontWeight: 600, fontSize: '24px' }}
              prefix={<ArrowDownOutlined style={{ fontSize: '20px' }} />}
              formatter={(value) => `₡${value.toLocaleString('es-CR')}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} bodyStyle={{ padding: '24px' }} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}>
            <Statistic
              title={<span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Balance Neto</span>}
              value={Math.abs(estadisticas.balance)}
              precision={2}
              valueStyle={{ color: estadisticas.balance >= 0 ? '#52c41a' : '#f5222d', fontWeight: 600, fontSize: '24px' }}
              prefix={estadisticas.balance >= 0 ? <ArrowUpOutlined style={{ fontSize: '20px' }} /> : <ArrowDownOutlined style={{ fontSize: '20px' }} />}
              formatter={(value) => `${estadisticas.balance < 0 ? '-' : ''}₡${value.toLocaleString('es-CR')}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} bodyStyle={{ padding: '24px' }} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}>
            <Statistic
              title={<span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Total Transacciones</span>}
              value={estadisticas.totalTransacciones}
              valueStyle={{ color: '#1890ff', fontWeight: 600, fontSize: '24px' }}
              prefix={<MoneyCollectOutlined style={{ fontSize: '20px' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filtros */}
      {filtrosVisibles && (
        <Card 
          title={<span style={{ fontWeight: 600, fontSize: '16px' }}>Filtros de Búsqueda</span>} 
          style={{ marginBottom: 24, borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)', border: '1px solid #f0f0f0' }}
          bordered={false}
          headStyle={{ borderBottom: '1px solid #f0f0f0', padding: '0 24px', minHeight: '56px' }}
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
              <div style={{ marginBottom: 8 }}><strong>Buscar</strong></div>
              <Input.Search
                placeholder="Buscar descripción o ref..."
                allowClear
                enterButton={<SearchOutlined />}
                value={filtros.busqueda}
                onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                onSearch={handleBuscar}
              />
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
              <div style={{ marginBottom: 8 }}><strong>Fechas</strong></div>
              <DatePicker.RangePicker
                style={{ width: '100%' }}
                value={filtros.rangoFechas}
                onChange={(dates) => {
                  const newFiltros = { ...filtros, rangoFechas: dates };
                  setFiltros(newFiltros);
                  handleFiltrar(newFiltros);
                }}
              />
            </Col>
            <Col xs={24} md={12} lg={6} style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}><strong>Vehículo</strong></div>
              <Input
                placeholder="Código o Placa"
                allowClear
                value={filtros.vehiculo}
                onChange={(e) => {
                  const newFiltros = { ...filtros, vehiculo: e.target.value };
                  setFiltros(newFiltros);
                }}
                onPressEnter={() => handleFiltrar(filtros)}
              />
            </Col>
          </Row>
          
          <Collapse ghost>
            <Collapse.Panel header="Filtros avanzados" key="1">
              <Row gutter={16}>
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
                  <div style={{ marginBottom: 8 }}><strong>Categoría</strong></div>
                  <Input
                    placeholder="Ej. Mantenimiento"
                    allowClear
                    value={filtros.categoria}
                    onChange={(e) => {
                      const newFiltros = { ...filtros, categoria: e.target.value };
                      setFiltros(newFiltros);
                    }}
                    onPressEnter={() => handleFiltrar(filtros)}
                  />
                </Col>
              </Row>
            </Collapse.Panel>
          </Collapse>
        </Card>
      )}

      {/* Tabla de transacciones */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '16px' }}>Historial de Transacciones</span>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={() => refetchTransacciones()}
              loading={isLoadingTransacciones}
              type="text"
            >
              Actualizar
            </Button>
          </div>
        }
        bordered={false}
        style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}
        headStyle={{ borderBottom: '1px solid #f0f0f0', padding: '0 24px', minHeight: '64px' }}
        bodyStyle={{ padding: '0' }}
      >
        {queryError && (
          <div style={{ marginBottom: 16 }}>
            <Alert message="Error" description={queryError.message || 'Error al cargar las transacciones'} type="error" showIcon />
          </div>
        )}
        
        <div style={{ padding: '24px' }}>
          <Table
            columns={columns}
            dataSource={transacciones}
            rowKey="codigoTransaccion"
            loading={isLoadingTransacciones}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} transacciones`,
              pageSizeOptions: ['10', '20', '50', '100'],
              showQuickJumper: true,
            }}
            onChange={handleTableChange}
            scroll={{ x: 'max-content' }}
          />
        </div>
      </Card>
    </div>
  );
};

export default Finanzas;