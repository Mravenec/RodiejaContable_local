import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, InputNumber, Button, Card, Typography, message, Select, Row, Col, Divider } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

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

  const cargarTransaccion = useCallback(async () => {
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
          fecha: fechaFormateada,
          monto: data.monto ? parseFloat(data.monto) : null,
          comisionEmpleado: data.comisionEmpleado ? parseFloat(data.comisionEmpleado) : null
        });
        console.log('Transacción cargada por ID:', id, data);
      } else {
        message.error(`Error al cargar transacción con ID: ${id}`);
      }
    } catch (error) {
      console.error('Error al cargar transacción por ID:', error);
      message.error('Error al conectar con el servidor');
    }
  }, [id, form]);

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
      const response = await fetch('http://localhost:8080/api/v1/vehiculos');
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

  // Cargar datos iniciales
  useEffect(() => {
    cargarTransaccion();
    cargarTiposTransacciones();
    cargarVehiculos();
    cargarEmpleados();
  }, [cargarTransaccion, id]);

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
        // message.success('Transacción actualizada correctamente');
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
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* ── Header de navegación ─────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ color: '#595959', fontWeight: 500 }}
          disabled={loading}
        >
          Volver
        </Button>
        <Title level={3} style={{ margin: 0, fontWeight: 600 }}>
          Editar Transacción #{id}
        </Title>
        <div style={{ width: '100px' }}></div> {/* Spacer */}
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
                <Select placeholder="Seleccionar tipo" disabled>
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
                <Select 
                  placeholder="Seleccionar vehículo" 
                  allowClear
                  showSearch
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
            >
              Cancelar
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
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
