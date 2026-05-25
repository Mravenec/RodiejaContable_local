import React from 'react';
import { Card, Typography, Form, Input, Button, message } from 'antd';
import { UserOutlined, MailOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Perfil = () => {
  // Datos del usuario actual - reemplazar con datos reales
  const [usuario, setUsuario] = React.useState({
    nombre: 'Usuario Ejemplo',
    email: 'usuario@ejemplo.com',
    // ... otros campos
  });

  const onFinish = (values) => {
    console.log('Actualizar perfil:', values);
    // message.success('Perfil actualizado correctamente');
    setUsuario({ ...usuario, ...values });
  };

  return (
    <div>
      <Title level={2}>Mi Perfil</Title>
      <Card>
        <Form
          name="perfil"
          initialValues={usuario}
          onFinish={onFinish}
          layout="vertical"
        >
          <Form.Item
            name="nombre"
            label="Nombre completo"
            rules={[{ required: true, message: 'Por favor ingrese su nombre' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Nombre completo" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Correo electrónico"
            rules={[
              { required: true, message: 'Por favor ingrese su correo' },
              { type: 'email', message: 'Ingrese un correo válido' }
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Correo electrónico" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Guardar cambios
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Perfil;
