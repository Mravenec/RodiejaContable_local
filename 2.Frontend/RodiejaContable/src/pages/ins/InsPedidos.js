import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Select,
  DatePicker, message, Tag, Space, Typography, Row, Col
} from 'antd';
import {
  PlusOutlined, CheckOutlined, ReloadOutlined
} from '@ant-design/icons';
import { insAPI } from '../../api/ins';
import { useEmpleados } from '../../hooks/useEmpleados';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const InsPedidos = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [filtros, setFiltros] = useState({ estado: null, empleadoId: null });
  const { data: empleados = [] } = useEmpleados();

  const cargarPedidos = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtros.estado) params.estado = filtros.estado;
      if (filtros.empleadoId) params.empleadoId = filtros.empleadoId;

      const response = await insAPI.obtenerPedidos(params);
      setPedidos(response.data || []);
    } catch (error) {
      message.error('Error al cargar pedidos INS');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPedidos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  const handleCrearPedido = async (values) => {
    try {
      const data = {
        ...values,
        fechaSolicitud: values.fechaSolicitud ? values.fechaSolicitud.format('YYYY-MM-DD') : null,
        horaSolicitud: values.horaSolicitud ? values.horaSolicitud.format('HH:mm:ss') : null,
      };
      await insAPI.crearPedido(data);
      message.success('Pedido creado exitosamente');
      setModalVisible(false);
      form.resetFields();
      cargarPedidos();
    } catch (error) {
      message.error('Error al crear pedido');
      console.error(error);
    }
  };

  const handleMarcarEntregado = async (id) => {
    try {
      await insAPI.marcarComoEntregado(id);
      message.success('Pedido marcado como entregado');
      cargarPedidos();
    } catch (error) {
      message.error('Error al marcar como entregado');
      console.error(error);
    }
  };

  const columns = [
    {
      title: 'Número Pedido',
      dataIndex: 'numeroPedido',
      key: 'numeroPedido',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Repuesto',
      dataIndex: 'repuesto',
      key: 'repuesto',
    },
    {
      title: 'Tipo Vehículo',
      dataIndex: 'tipoVehiculo',
      key: 'tipoVehiculo',
    },
    {
      title: 'Año',
      dataIndex: 'anioVehiculo',
      key: 'anioVehiculo',
      align: 'center',
    },
    {
      title: 'Precio Compra',
      dataIndex: 'precioCompra',
      key: 'precioCompra',
      align: 'right',
      render: (val) => val ? `$${val.toFixed(2)}` : '-',
    },
    {
      title: 'Precio Venta',
      dataIndex: 'precioVenta',
      key: 'precioVenta',
      align: 'right',
      render: (val) => val ? `$${val.toFixed(2)}` : '-',
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado) => (
        <Tag color={estado === 'ENTREGADO' ? 'green' : 'default'}>
          {estado === 'PENDIENTE_ENTREGA' ? 'Pendiente' : 'Entregado'}
        </Tag>
      ),
    },
    {
      title: 'Empleado',
      dataIndex: 'empleadoNombre',
      key: 'empleadoNombre',
    },
    {
      title: 'Hora Solicitud',
      dataIndex: 'horaSolicitud',
      key: 'horaSolicitud',
      render: (hora) => hora || '-',
    },
    {
      title: 'Fecha Solicitud',
      dataIndex: 'fechaSolicitud',
      key: 'fechaSolicitud',
      render: (fecha) => fecha ? dayjs(fecha).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space>
          {record.estado === 'PENDIENTE_ENTREGA' && (
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleMarcarEntregado(record.id)}
            >
              Entregar
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Pedidos INS</Title>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={cargarPedidos}>
              Recargar
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalVisible(true)}
            >
              Nuevo Pedido
            </Button>
          </Space>
        </Col>
      </Row>

      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Select
              placeholder="Filtrar por estado"
              style={{ width: '100%' }}
              allowClear
              onChange={(value) => setFiltros({ ...filtros, estado: value })}
            >
              <Option value="PENDIENTE_ENTREGA">Pendiente de Entrega</Option>
              <Option value="ENTREGADO">Entregado</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="Filtrar por empleado"
              style={{ width: '100%' }}
              allowClear
              onChange={(value) => setFiltros({ ...filtros, empleadoId: value })}
            >
              {empleados.map(emp => (
                <Option key={emp.id} value={emp.id}>{emp.nombre}</Option>
              ))}
            </Select>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={pedidos}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title="Nuevo Pedido INS"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCrearPedido}
        >
          <Form.Item
            name="numeroPedido"
            label="Número de Pedido"
            rules={[{ required: true, message: 'Ingrese el número de pedido' }]}
          >
            <Input placeholder="Ej: CAS-001" />
          </Form.Item>

          <Form.Item
            name="repuesto"
            label="Repuesto"
            rules={[{ required: true, message: 'Ingrese el repuesto' }]}
          >
            <Input placeholder="Ej: Parrilla delantera" />
          </Form.Item>

          <Form.Item
            name="tipoVehiculo"
            label="Tipo de Vehículo"
          >
            <Input placeholder="Ej: Cheryl Esquadro" />
          </Form.Item>

          <Form.Item
            name="anioVehiculo"
            label="Año del Vehículo"
          >
            <InputNumber style={{ width: '100%' }} placeholder="Ej: 2018" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="precioCompra"
                label="Precio Compra"
                rules={[{ required: true, message: 'Ingrese el precio de compra' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  min={0}
                  precision={2}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="precioVenta"
                label="Precio Venta"
                rules={[{ required: true, message: 'Ingrese el precio de venta' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  min={0}
                  precision={2}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="empleadoId"
            label="Empleado"
          >
            <Select placeholder="Seleccione el empleado" allowClear>
              {empleados.map(emp => (
                <Option key={emp.id} value={emp.id}>{emp.nombre}</Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="fechaSolicitud"
                label="Fecha Solicitud"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="horaSolicitud"
                label="Hora Solicitud"
              >
                <DatePicker.TimePicker style={{ width: '100%' }} format="HH:mm:ss" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notas"
            label="Notas"
          >
            <Input.TextArea rows={3} placeholder="Notas adicionales..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InsPedidos;
