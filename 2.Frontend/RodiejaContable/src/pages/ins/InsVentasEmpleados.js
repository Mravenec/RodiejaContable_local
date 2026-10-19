import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Row, Col, Typography, Statistic,
  Select, Tag, message, Modal
} from 'antd';
import {
  DollarOutlined, ShoppingCartOutlined, TeamOutlined,
  ReloadOutlined, PayCircleOutlined
} from '@ant-design/icons';
import { insAPI } from '../../api/ins';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const InsVentasEmpleados = () => {
  const [comisiones, setComisiones] = useState([]);
  const [estadisticas, setEstadisticas] = useState({});
  const [loading, setLoading] = useState(false);
  const [modalPagoVisible, setModalPagoVisible] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);

  const [filtros, setFiltros] = useState({
    anio: dayjs().year(),
    mes: dayjs().month() + 1,
  });

  const cargarComisiones = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtros.anio) params.anio = filtros.anio;
      if (filtros.mes) params.mes = filtros.mes;

      const [comisionesRes, estadisticasRes] = await Promise.all([
        insAPI.obtenerComisiones(params),
        insAPI.obtenerEstadisticas(params),
      ]);

      setComisiones(comisionesRes.data || []);
      setEstadisticas(estadisticasRes.data || {});
    } catch (error) {
      message.error('Error al cargar comisiones');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarComisiones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  const handlePagarComisiones = (empleado) => {
    setEmpleadoSeleccionado(empleado);
    setModalPagoVisible(true);
  };

  const confirmarPago = async () => {
    try {
      // Aquí se implementaría la lógica para registrar el pago
      // Por ahora solo mostramos un mensaje
      message.success('Comisión registrada como pagada (funcionalidad pendiente de implementar)');
      setModalPagoVisible(false);
      setEmpleadoSeleccionado(null);
    } catch (error) {
      message.error('Error al registrar pago');
      console.error(error);
    }
  };

  const columns = [
    {
      title: 'Empleado',
      dataIndex: 'empleado',
      key: 'empleado',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Total Pedidos',
      dataIndex: 'total_pedidos',
      key: 'total_pedidos',
      align: 'center',
      render: (val) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: 'Total Utilidad',
      dataIndex: 'total_utilidad',
      key: 'total_utilidad',
      align: 'right',
      render: (val) => val ? `$${val.toFixed(2)}` : '$0.00',
    },
    {
      title: 'Total Comisión',
      dataIndex: 'total_comision',
      key: 'total_comision',
      align: 'right',
      render: (val) => (
        <Text strong style={{ color: '#52c41a' }}>
          {val ? `$${val.toFixed(2)}` : '$0.00'}
        </Text>
      ),
    },
    {
      title: 'Pedidos',
      dataIndex: 'pedidos',
      key: 'pedidos',
      render: (pedidos) => (
        <Text ellipsis style={{ maxWidth: 200 }}>
          {pedidos || '-'}
        </Text>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<PayCircleOutlined />}
          onClick={() => handlePagarComisiones(record)}
          disabled={!record.total_comision || record.total_comision <= 0}
        >
          Pagar
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Ventas Empleados INS</Title>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={cargarComisiones}>
            Recargar
          </Button>
        </Col>
      </Row>

      {/* Estadísticas */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Comisiones"
              value={estadisticas.totalComisiones || 0}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Utilidad"
              value={estadisticas.totalUtilidad || 0}
              precision={2}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Pedidos"
              value={estadisticas.totalPedidos || 0}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Empleados Activos"
              value={estadisticas.totalEmpleados || 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Select
              placeholder="Año"
              style={{ width: '100%' }}
              value={filtros.anio}
              onChange={(value) => setFiltros({ ...filtros, anio: value })}
            >
              {[2024, 2025, 2026, 2027].map(anio => (
                <Option key={anio} value={anio}>{anio}</Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <Select
              placeholder="Mes"
              style={{ width: '100%' }}
              value={filtros.mes}
              onChange={(value) => setFiltros({ ...filtros, mes: value })}
              allowClear
            >
              {[
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
              ].map((mes, index) => (
                <Option key={index + 1} value={index + 1}>{mes}</Option>
              ))}
            </Select>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={comisiones}
          loading={loading}
          rowKey="empleado_id"
          pagination={false}
        />
      </Card>

      <Modal
        title="Confirmar Pago de Comisiones"
        open={modalPagoVisible}
        onOk={confirmarPago}
        onCancel={() => {
          setModalPagoVisible(false);
          setEmpleadoSeleccionado(null);
        }}
      >
        {empleadoSeleccionado && (
          <div>
            <p><strong>Empleado:</strong> {empleadoSeleccionado.empleado}</p>
            <p><strong>Total a pagar:</strong> ${empleadoSeleccionado.total_comision?.toFixed(2) || '0.00'}</p>
            <p><strong>Mes:</strong> {filtros.mes ? ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][filtros.mes - 1] : 'Todos'}</p>
            <p><strong>Año:</strong> {filtros.anio}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InsVentasEmpleados;
