import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Alert } from 'antd';
import { LockOutlined, CheckCircleOutlined, WarningOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import authService from '../../api/auth';

const { Title, Text } = Typography;

const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);
  const [searchParams] = useSearchParams();
  const { token: routeToken } = useParams();
  const navigate = useNavigate();

  const token = routeToken || searchParams.get('token');

  const onFinish = async (values) => {
    if (!token) {
      message.error('Token de recuperación no encontrado');
      return;
    }

    try {
      setLoading(true);
      const resp = await authService.resetPassword(token, values.password?.trim());
      setExito(true);
      message.success(resp.message || 'Contraseña restablecida correctamente');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Error al restablecer contraseña:', error);
      message.error(error.message || 'Error al restablecer la contraseña');
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
          Restablecer Contraseña
        </Title>

        {!token ? (
          <div>
            <Alert
              icon={<WarningOutlined style={{ color: '#faad14' }} />}
              showIcon
              type="warning"
              message="Enlace inválido o incompleto"
              description="No se encontró un token de recuperación válido en la dirección web. Por favor solicita un nuevo enlace."
              style={{ marginBottom: '24px' }}
            />
            <Button
              type="primary"
              block
              size="large"
              onClick={() => navigate('/olvide-contrasena')}
            >
              Solicitar nuevo enlace
            </Button>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Link to="/login">
                <ArrowLeftOutlined style={{ marginRight: 6 }} />
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        ) : exito ? (
          <div>
            <Alert
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              showIcon
              type="success"
              message="¡Contraseña actualizada!"
              description="Tu contraseña ha sido actualizada con éxito. Serás redirigido a la pantalla de inicio de sesión en unos momentos..."
              style={{ marginBottom: '24px' }}
            />
            <Button
              type="primary"
              block
              size="large"
              onClick={() => navigate('/login')}
            >
              Ir a Iniciar Sesión ahora
            </Button>
          </div>
        ) : (
          <div>
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: '24px' }}>
              Crea una nueva contraseña segura para tu cuenta de Rodieja Contable.
            </Text>

            <Form
              name="resetPassword"
              onFinish={onFinish}
              layout="vertical"
            >
              <Form.Item
                name="password"
                label="Nueva Contraseña"
                rules={[
                  { required: true, message: 'Por favor ingrese su nueva contraseña' },
                  { min: 6, message: 'La contraseña debe tener al menos 6 caracteres' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Mínimo 6 caracteres"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Confirmar Nueva Contraseña"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Por favor confirme su contraseña' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Las contraseñas no coinciden'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Repita la nueva contraseña"
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
                  Restablecer Contraseña
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

export default ResetPassword;
