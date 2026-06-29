import React from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title } = Typography;

const ForgotPassword = () => {
  const onFinish = (values) => {
    console.log('Recuperar contraseña:', values);
    message.success('Se ha enviado un enlace de recuperación a tu correo');
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '24px' }}>
      <Card>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '24px' }}>
          Recuperar Contraseña
        </Title>
        <p style={{ textAlign: 'center', marginBottom: '24px' }}>
          Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        <Form
          name="forgotPassword"
          onFinish={onFinish}
          layout="vertical"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Por favor ingrese su correo' },
              { type: 'email', message: 'Ingrese un correo válido' }
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Correo electrónico"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              Enviar enlace de recuperación
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Link to="/login">Volver al inicio de sesión</Link>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPassword;
