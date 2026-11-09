import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Alert } from 'antd';
import { MailOutlined, CheckCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import authService from '../../api/auth';

const { Title, Text } = Typography;

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState('');

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const email = values.email?.trim();
      const resp = await authService.forgotPassword(email);
      setEmailEnviado(email);
      setEnviado(true);
      message.success(resp.message || 'Enlace de recuperación enviado');
    } catch (error) {
      console.error('Error al solicitar recuperación de contraseña:', error);
      message.error(error.message || 'Ocurrió un error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f0f2f5'
    }}>
      <Card style={{
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px'
      }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '8px' }}>
          Recuperar Contraseña
        </Title>

        {enviado ? (
          <div>
            <Alert
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              showIcon
              type="success"
              message="¡Correo enviado!"
              description={
                <span>
                  Si <strong>{emailEnviado}</strong> está registrado, recibirás un correo con el enlace de recuperación válido por 15 minutos. Revisa tu bandeja de entrada o spam.
                </span>
              }
              style={{ marginBottom: '24px' }}
            />
            <Button
              type="default"
              block
              size="large"
              onClick={() => setEnviado(false)}
              style={{ marginBottom: '12px' }}
            >
              Intentar con otro correo
            </Button>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Link to="/login">
                <ArrowLeftOutlined style={{ marginRight: 6 }} />
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: '24px' }}>
              Ingresa tu correo electrónico registrado y te enviaremos un enlace seguro para restablecer tu contraseña.
            </Text>

            <Form
              name="forgotPassword"
              onFinish={onFinish}
              layout="vertical"
            >
              <Form.Item
                name="email"
                normalize={(value) => (typeof value === 'string' ? value.trim() : value)}
                rules={[
                  { required: true, message: 'Por favor ingrese su correo' },
                  { type: 'email', message: 'Ingrese un correo electrónico válido' }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="correo@ejemplo.com"
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={loading}
                >
                  Enviar enlace de recuperación
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Link to="/login">
                <ArrowLeftOutlined style={{ marginRight: 6 }} />
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ForgotPassword;
