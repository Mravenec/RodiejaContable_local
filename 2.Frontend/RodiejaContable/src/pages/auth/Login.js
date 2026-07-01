import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated()) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, location.state, navigate]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const email = values.email?.trim();
      const password = values.password?.trim();

      await login({ email, password });
      
      const from = location.state?.from?.pathname || '/';
      message.success('¡Bienvenido!');
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      message.error(error.message || 'Credenciales incorrectas o error en el servidor');
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
        maxWidth: '420px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        margin: '0 auto'
      }}>
      <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Iniciar Sesión</h2>
      
      <Form
        name="login"
        initialValues={{ remember: true }}
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
            prefix={<UserOutlined />} 
            placeholder="Correo Electrónico" 
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Por favor ingrese su contraseña' }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            type="password"
            placeholder="Contraseña"
            size="large"
          />
        </Form.Item>

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            block
            size="large"
          >
            Iniciar Sesión
          </Button>
        </Form.Item>
        
        <div style={{ textAlign: 'center' }}>
          <Link to="/olvide-contrasena">¿Olvidó su contraseña?</Link>
        </div>
      </Form>
    </Card>
    </div>
  );
};

export default Login;
