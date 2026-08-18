import React, { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, Button, message, Row, Col, Avatar, Modal, Select } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, SaveOutlined, PlusOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../api/auth';
import './Perfil.css';

const { Title } = Typography;

const Perfil = () => {
  const { user, setUser } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        nombre: user.nombre || 'Administrador',
        email: user.email || 'admin@rodieja.com',
      });
    }
  }, [user, form]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await authService.updateProfile({
        nombre: values.nombre,
        password: values.password
      });

      message.success({
        content: 'Perfil actualizado exitosamente',
        style: { marginTop: '10vh' }
      });

      if (values.password) {
        message.info({
          content: 'Contraseña actualizada. Por favor inicie sesión nuevamente.',
          style: { marginTop: '10vh' }
        });
        authService.logout();
        setUser(null);
      } else {
        // Update local user state
        if (values.nombre) {
          const updatedUser = { ...user, nombre: values.nombre };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      }
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      message.error({
        content: typeof error === 'string' ? error : 'Error al actualizar el perfil',
        style: { marginTop: '10vh' }
      });
    } finally {
      setLoading(false);
    }
  };

  // Obtener iniciales para el avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="perfil-container" style={{ maxWidth: '800px' }}>
      <div className="perfil-header-card" style={{ 
        padding: '20px 24px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '20px', 
        background: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)',
        color: 'white',
        marginBottom: '20px'
      }}>
        <Avatar 
          size={64} 
          style={{ border: '3px solid rgba(255,255,255,0.3)', backgroundColor: '#1890ff' }}
          icon={!user?.nombre && <UserOutlined />}
        >
          {user?.nombre ? getInitials(user.nombre) : ''}
        </Avatar>
        <div>
          <Title level={4} style={{ color: 'white', margin: 0, fontWeight: 600 }}>{user?.nombre || 'Administrador del Sistema'}</Title>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px', fontWeight: 500 }}>
            {user?.rol || 'ADMIN'}
          </div>
        </div>
      </div>

      <Row justify="center">
        <Col xs={24}>
          <Card className="perfil-form-card" title="Editar Perfil">
            <Form
              form={form}
              name="perfil_update"
              onFinish={onFinish}
              layout="vertical"
              size="middle"
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="nombre"
                    label="Nombre Completo"
                    rules={[{ required: true, message: 'Por favor ingrese su nombre' }]}
                  >
                    <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} placeholder="Ej. Juan Pérez" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="email"
                    label="Correo Electrónico"
                    rules={[
                      { required: true, message: 'Por favor ingrese su correo' },
                      { type: 'email', message: 'Ingrese un correo válido' }
                    ]}
                  >
                    <Input prefix={<MailOutlined style={{ color: '#bfbfbf' }} />} placeholder="usuario@empresa.com" disabled />
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ fontWeight: 600, margin: '16px 0 12px', color: '#4C1D95' }}>Seguridad de Contraseña</div>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="password"
                    label="Nueva Contraseña"
                    extra="Déjelo en blanco si no desea cambiarla"
                  >
                    <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} placeholder="••••••••" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="confirmPassword"
                    label="Confirmar Contraseña"
                    dependencies={['password']}
                    rules={[
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
                    <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} placeholder="••••••••" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item style={{ marginTop: 16, marginBottom: 0, textAlign: 'right' }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  icon={<SaveOutlined />} 
                  loading={loading}
                  style={{ 
                    backgroundColor: '#4C1D95', 
                    borderColor: '#4C1D95',
                    boxShadow: '0 4px 12px rgba(76, 29, 149, 0.2)'
                  }}
                >
                  Guardar Cambios
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Perfil;
