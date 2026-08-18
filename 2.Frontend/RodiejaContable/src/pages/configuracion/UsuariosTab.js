import React, { useState, useEffect } from 'react';
import { List, Button, Tooltip, message, Avatar, Space, Typography, Form, Input, Select, Modal } from 'antd';
import { UserOutlined, PlusOutlined, DeleteOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { usersService } from '../../api/users';
import './Settings.css';

const { Text } = Typography;

const UsuariosTab = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserForm] = Form.useForm();

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const res = await usersService.getUsers();
      setUsuarios(res.data || []);
    } catch (err) {
      console.error("Error fetching users", err);
      message.error("Error al cargar los usuarios");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (values) => {
    setCreatingUser(true);
    try {
      await usersService.createUser({
        nombre: values.nombre,
        email: values.email,
        password: values.password,
        rol: values.rol
      });

      message.success('Usuario creado exitosamente');
      setIsModalVisible(false);
      newUserForm.resetFields();
      fetchUsuarios(); // Refresh list
    } catch (error) {
      console.error('Error al crear usuario:', error);
      message.error(typeof error === 'string' ? error : 'Error al crear el usuario');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = (id) => {
    Modal.confirm({
      title: '¿Estás seguro de eliminar este usuario?',
      content: 'Esta acción no se puede deshacer.',
      okText: 'Sí, eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await usersService.deleteUser(id);
          message.success('Usuario eliminado exitosamente');
          fetchUsuarios();
        } catch (error) {
          console.error('Error al eliminar usuario:', error);
          message.error(typeof error === 'string' ? error : 'Error al eliminar el usuario');
        }
      }
    });
  };

  const getRoleClass = (role) => {
    const r = role?.toLowerCase() || '';
    if (r.includes('admin')) return 'user-role-admin';
    if (r.includes('vendedor') || r.includes('ventas')) return 'user-role-vendor';
    return 'user-role-default';
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Gestión de Usuarios</h2>
        <Button className="glass-btn" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          Nuevo Usuario
        </Button>
      </div>

      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <List
          loading={loading}
          itemLayout="horizontal"
          dataSource={usuarios}
          className="premium-list"
          renderItem={(user) => (
            <List.Item
              className="premium-list-item"
              actions={[
                user.rol !== 'ADMIN' && (
                  <Tooltip title="Eliminar Usuario" key="delete">
                    <Button 
                      type="text" 
                      className="user-action-btn" 
                      icon={<DeleteOutlined style={{ color: '#ef4444' }} />} 
                      onClick={() => handleDeleteUser(user.id)}
                    />
                  </Tooltip>
                )
              ].filter(Boolean)}
            >
              <List.Item.Meta
                avatar={
                  <div className="user-avatar-wrapper" style={{ marginRight: '16px' }}>
                    <Avatar 
                      size={48}
                      style={{ 
                        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                        color: '#0284c7', 
                        fontSize: '18px', 
                        fontWeight: 'bold', 
                        border: '1px solid #bae6fd'
                      }}
                    >
                      {getInitials(user.nombre)}
                    </Avatar>
                    <div className={`user-status-dot ${user.activo ? 'active' : 'inactive'}`} />
                  </div>
                }
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                    <Text style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>{user.nombre}</Text>
                    <span className={`user-role-tag ${getRoleClass(user.rol)}`} style={{ fontSize: '12px' }}>
                      {user.rol || 'Sin Rol'}
                    </span>
                  </div>
                }
                description={
                  <Space size="large" style={{ marginTop: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                      <MailOutlined />
                      {user.email}
                    </span>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </div>

      <Modal
        title={<span style={{ fontWeight: 600, fontSize: '18px' }}>Crear Nuevo Usuario</span>}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          newUserForm.resetFields();
        }}
        footer={null}
        destroyOnClose
        centered
        className="premium-modal"
      >
        <Form
          form={newUserForm}
          layout="vertical"
          onFinish={handleCreateUser}
          autoComplete="off"
          style={{ marginTop: '24px' }}
        >
          <Form.Item
            name="nombre"
            label={<span style={{ fontWeight: 500 }}>Nombre Completo</span>}
            rules={[{ required: true, message: 'Por favor ingrese el nombre del usuario' }]}
          >
            <Input size="large" prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} placeholder="Ej. Ana Gómez" style={{ borderRadius: '8px' }} />
          </Form.Item>
          
          <Form.Item
            name="email"
            label={<span style={{ fontWeight: 500 }}>Correo Electrónico</span>}
            rules={[
              { required: true, message: 'Por favor ingrese el correo' },
              { type: 'email', message: 'Ingrese un correo válido' }
            ]}
          >
            <Input size="large" prefix={<MailOutlined style={{ color: '#bfbfbf' }} />} placeholder="nuevo@rodieja.com" style={{ borderRadius: '8px' }} />
          </Form.Item>
          
          <Form.Item
            name="password"
            label={<span style={{ fontWeight: 500 }}>Contraseña</span>}
            rules={[
              { required: true, message: 'Por favor ingrese una contraseña' },
              { min: 6, message: 'La contraseña debe tener al menos 6 caracteres' }
            ]}
          >
            <Input.Password size="large" prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} placeholder="••••••••" style={{ borderRadius: '8px' }} />
          </Form.Item>
          
          <Form.Item
            name="rol"
            label={<span style={{ fontWeight: 500 }}>Rol de Usuario</span>}
            rules={[{ required: true, message: 'Por favor seleccione un rol' }]}
            initialValue="CONTADOR"
          >
            <Select size="large">
              <Select.Option value="ADMIN">Administrador</Select.Option>
              <Select.Option value="CONTADOR">Contador</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item style={{ marginTop: 32, marginBottom: 0, textAlign: 'right' }}>
            <Button size="large" onClick={() => setIsModalVisible(false)} style={{ marginRight: 12, borderRadius: '8px', fontWeight: 500 }}>
              Cancelar
            </Button>
            <Button 
              size="large"
              type="primary" 
              htmlType="submit" 
              loading={creatingUser}
              className="premium-submit-btn"
            >
              Crear Usuario
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsuariosTab;
