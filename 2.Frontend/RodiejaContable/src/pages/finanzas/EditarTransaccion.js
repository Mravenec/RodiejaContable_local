import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, InputNumber, Button, Card, Typography, message, Select, DatePicker, Row, Col } from 'antd';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;

const EditarTransaccion = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tiposTransacciones, setTiposTransacciones] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  // Cargar datos iniciales
  useEffect(() => {
    cargarTransaccion();
    cargarTiposTransacciones();
    cargarVehiculos();
    cargarEmpleados();
  }, [id]);

  const cargarTransaccion = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/transacciones-financieras/${id}`);
      if (response.ok) {
        const data = await response.json();
        
        // Manejar la fecha que viene como array [año, mes, dia] desde el backend
        let fechaFormateada = null;
        if (data.fecha && Array.isArray(data.fecha) && data.fecha.length >= 3) {
          const [year, month, day] = data.fecha;
          // Formatear como string para el DatePicker
          fechaFormateada = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        
        form.setFieldsValue({
          ...data,
          fecha: fechaFormateada
        });
        console.log('Transacción cargada por ID:', id, data);
      } else {
        message.error(`Error al cargar transacción con ID: ${id}`);
      }
    } catch (error) {
      console.error('Error al cargar transacción por ID:', error);
      message.error('Error al conectar con el servidor');
    }
  };

  const cargarTiposTransacciones = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/tipos-transacciones');
      if (response.ok) {
        const data = await response.json();
        setTiposTransacciones(data);
      }
    } catch (error) {
      console.error('Error cargando tipos de transacciones:', error);
    }
  };

  const cargarVehiculos = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/vehiculos');
      if (response.ok) {
        const data = await response.json();
        setVehiculos(data);
      }
    } catch (error) {
      console.error('Error cargando vehículos:', error);
    }
  };

  const cargarEmpleados = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/empleados');
      if (response.ok) {
        const data = await response.json();
        setEmpleados(data);
      }
    } catch (error) {
      console.error('Error cargando empleados:', error);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const dataToSend = {
        ...values,
        fecha: values.fecha || null
      };
      
      console.log('Datos enviados al backend:', dataToSend);
      console.log('Fecha enviada:', values.fecha);
      console.log('Tipo de dato de fecha:', typeof values.fecha);
      
      const response = await fetch(`http://localhost:8080/api/transacciones-financieras/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        message.success('Transacción actualizada correctamente');
        navigate('/finanzas');
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Error al actualizar transacción');
      }
    } catch (error) {
      message.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Editar Transacción #{id}</Title>
      <Card>
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
                <Select placeholder="Seleccionar tipo">
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
                <Select placeholder="Seleccionar empleado" allowClear>
                  {empleados.map(empleado => (
                    <Option key={empleado.id} value={empleado.id}>
                      {empleado.nombre}
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
                <Select placeholder="Seleccionar vehículo" allowClear>
                  {vehiculos.map(vehiculo => (
                    <Option key={vehiculo.id} value={vehiculo.id}>
                      {vehiculo.marca} {vehiculo.modelo}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Monto"
                name="monto"
                rules={[{ required: true, message: 'El monto es requerido' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?=\d{3}))/g, ',')}
                  parser={value => value.replace(/\$\s?|(,*)/g, '')}
                  precision={2}
                  placeholder="0.00"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Comisión Empleado"
                name="comisionEmpleado"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?=\d{3}))/g, ',')}
                  parser={value => value.replace(/\$\s?|(,*)/g, '')}
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

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Actualizar Transacción
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default EditarTransaccion;
