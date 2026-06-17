import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, InputNumber, Button, Card, Typography, Select, Row, Col, Divider, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useQuery } from 'react-query';

import { useTransaccion, useUpdateTransaccion } from '../../hooks/useFinanzas';
import { useEmpleados } from '../../hooks/useEmpleados';
import { useVehiculosParaTransacciones } from '../../hooks/useVehiculosParaTransacciones';
import { getTiposTransacciones } from '../../api/transacciones';

const { Title } = Typography;
const { Option } = Select;

const EditarTransaccion = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // Queries
  const { data: transaccion, isLoading: loadingTransaccion } = useTransaccion(id);
  const { data: empleados = [], isLoading: loadingEmpleados } = useEmpleados();
  const { vehiculos = [], loadingVehiculos } = useVehiculosParaTransacciones();

  const { data: tiposTransacciones = [], isLoading: loadingTipos } = useQuery(
    ['tiposTransacciones'],
    getTiposTransacciones,
    { staleTime: 1000 * 60 * 5 }
  );

  // Mutation
  const { mutate: updateTransaccion, isLoading: isUpdating } = useUpdateTransaccion();

  // Cargar datos iniciales
  useEffect(() => {
    if (transaccion) {
      let fechaFormateada = null;
      if (transaccion.fecha && Array.isArray(transaccion.fecha) && transaccion.fecha.length >= 3) {
        const [year, month, day] = transaccion.fecha;
        fechaFormateada = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      } else if (transaccion.fecha) {
        // Fallback for string dates
        fechaFormateada = transaccion.fecha.substring(0, 10);
      }

      form.setFieldsValue({
        ...transaccion,
        fecha: fechaFormateada,
        monto: transaccion.monto ? parseFloat(transaccion.monto) : null,
        comisionEmpleado: transaccion.comisionEmpleado ? parseFloat(transaccion.comisionEmpleado) : null
      });
    }
  }, [transaccion, form]);

  const onFinish = (values) => {
    const dataToSend = {
      id: id,
      ...values,
      fecha: values.fecha || null
    };

    updateTransaccion(dataToSend, {
      onSuccess: () => {
        // Navigate back to finanzas list where React Query will auto-update
        navigate('/finanzas');
      }
    });
  };

  const empleadoSeleccionadoId = Form.useWatch('empleadoId', form);
  const monto = Form.useWatch('monto', form);

  // Efecto para calcular comisión automáticamente
  useEffect(() => {
    if (transaccion && tiposTransacciones.length > 0) {
      const tipo = tiposTransacciones.find(t => t.id === form.getFieldValue('tipoTransaccionId'));
      if (tipo && tipo.categoria === 'INGRESO') {
        if (empleadoSeleccionadoId && monto > 0) {
          form.setFieldsValue({ comisionEmpleado: monto * 0.03 });
        } else {
          form.setFieldsValue({ comisionEmpleado: 0 });
        }
      }
    }
  }, [empleadoSeleccionadoId, monto, transaccion, tiposTransacciones, form]);

  const isLoading = loadingTransaccion || loadingEmpleados || loadingVehiculos || loadingTipos;

  if (loadingTransaccion) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
        <Spin size="large" tip="Cargando transacción..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ color: '#595959', fontWeight: 500 }}
          disabled={isUpdating}
        >
          Volver
        </Button>
        <Title level={3} style={{ margin: 0, fontWeight: 600 }}>
          Editar Transacción #{id}
        </Title>
        <div style={{ width: '100px' }}></div>
      </div>

      <Card
        bordered={false}
        style={{ borderRadius: '12px', border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
        bodyStyle={{ padding: '32px' }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            activo: 1,
            estado: 'PENDIENTE'
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Código de Transacción"
                name="codigoTransaccion"
                rules={[{ required: true, message: 'Este campo es requerido' }]}
              >
                <Input placeholder="Ej: TRX-202605-0001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Fecha"
                name="fecha"
                rules={[{ required: true, message: 'La fecha es requerida' }]}
              >
                <Input
                  type="date"
                  style={{ width: '100%' }}
                  placeholder="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Tipo de Transacción"
                name="tipoTransaccionId"
                rules={[{ required: true, message: 'Este campo es requerido' }]}
              >
                <Select placeholder="Seleccionar tipo" disabled loading={loadingTipos}>
                  {tiposTransacciones.map(tipo => (
                    <Option key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Empleado"
                name="empleadoId"
              >
                <Select placeholder="Seleccionar empleado" allowClear loading={loadingEmpleados}>
                  {empleados.map(empleado => (
                    <Option key={empleado.id} value={empleado.id}>
                      {empleado.nombre || empleado.nombres}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Vehículo"
                name="vehiculoId"
              >
                <Select
                  placeholder="Seleccionar vehículo"
                  allowClear
                  showSearch
                  loading={loadingVehiculos}
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option?.children?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {vehiculos.map(vehiculo => {
                    const codigo = vehiculo.codigoVehiculo || 'SIN_CODIGO';
                    const anio = vehiculo.anio || 'Año N/A';
                    const estado = vehiculo.estado || 'SIN_ESTADO';
                    const marca = vehiculo.marca || 'Marca N/A';
                    const modelo = vehiculo.modelo || 'Modelo N/A';

                    let estadoAmigable = estado;
                    if (estado === 'DESARMADO') {
                      estadoAmigable = 'Para repuestos';
                    } else if (estado === 'REPARACION') {
                      estadoAmigable = 'Para reparar';
                    } else if (estado !== 'SIN_ESTADO') {
                      estadoAmigable = estado.charAt(0).toUpperCase() + estado.slice(1).toLowerCase();
                    }

                    const displayText = `${codigo} — ${marca} ${modelo} ${anio} (${estadoAmigable})`;

                    return (
                      <Option
                        key={vehiculo.id}
                        value={vehiculo.id}
                        title={displayText}
                      >
                        {displayText}
                      </Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Monto (₡)"
                name="monto"
                rules={[{ required: true, message: 'El monto es requerido' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/[₡$\s?,]/g, '')}
                  precision={2}
                  placeholder="0.00"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Comisión (₡)"
                name="comisionEmpleado"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/[₡$\s?,]/g, '')}
                  precision={2}
                  placeholder="0.00"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Descripción"
                name="descripcion"
                rules={[{ required: true, message: 'La descripción es requerida' }]}
              >
                <Input.TextArea rows={3} placeholder="Descripción detallada de la transacción" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Referencia"
                name="referencia"
              >
                <Input placeholder="Referencia o número de factura" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Estado"
                name="estado"
                rules={[{ required: true, message: 'El estado es requerido' }]}
              >
                <Select placeholder="Seleccionar estado">
                  <Option value="PENDIENTE">Pendiente</Option>
                  <Option value="COMPLETADA">Completada</Option>
                  <Option value="CANCELADA">Cancelada</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '32px 0 24px' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button
              size="large"
              onClick={() => navigate(-1)}
              style={{ borderRadius: '6px' }}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isUpdating}
              disabled={isLoading}
              size="large"
              style={{ borderRadius: '6px', padding: '0 32px' }}
            >
              Actualizar Transacción
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default EditarTransaccion;

