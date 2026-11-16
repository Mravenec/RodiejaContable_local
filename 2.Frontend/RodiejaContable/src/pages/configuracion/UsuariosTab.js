import React, { useState } from 'react';
import { List, Button, Tooltip, message, Avatar, Space, Typography, Form, Input, Select, Modal } from 'antd';
import { UserOutlined, PlusOutlined, DeleteOutlined, EditOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { useUsers, useCreateUser, useDeleteUser, useUpdateUserRole } from '../../hooks';
import { useAuth } from '../../context/AuthContext';
import './Settings.css';

const { Text } = Typography;

const UsuariosTab = () => {
  const { user: currentUser } = useAuth();
  const esAdmin = (currentUser?.rol || '').toUpperCase() === 'ADMIN';

  const { data: usuarios = [], isLoading: loading } = useUsers();
  const createUserMutation = useCreateUser();
  const deleteUserMutation = useDeleteUser();
  const updateUserRoleMutation = useUpdateUserRole();

  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newUserForm] = Form.useForm();

  // Edit Role Modal states
  const [isEditRoleModalVisible, setIsEditRoleModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editRoleForm] = Form.useForm();

  const handleCreateUser = async (values) => {
    try {
      await createUserMutation.mutateAsync({
        nombre: values.nombre,
        email: values.email,
        password: values.password,
        rol: values.rol
      });

      message.success('Usuario creado exitosamente');
      setIsModalVisible(false);
      newUserForm.resetFields();
    } catch (error) {
      console.error('Error al crear usuario:', error);
      message.error(typeof error === 'string' ? error : 'Error al crear el usuario');
    }
  };

  const handleDeleteUser = (id) => {
    const isSelf = 
      (currentUser?.id && Number(id) === Number(currentUser.id)) ||
      (currentUser?.userId && Number(id) === Number(currentUser.userId));
    if (isSelf) {
      message.warning('No puedes eliminar tu propia cuenta de usuario');
      return;
    }

    Modal.confirm({
      title: '¿Estás seguro de eliminar este usuario?',
      content: 'Esta acción no se puede deshacer.',
      okText: 'Sí, eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteUserMutation.mutateAsync(id);
          message.success('Usuario eliminado exitosamente');
        } catch (error) {
          console.error('Error al eliminar usuario:', error);
          message.error(typeof error === 'string' ? error : 'Error al eliminar el usuario');
        }
      }
    });
  };

  const handleEditRoleClick = (user) => {
    setEditingUser(user);
    editRoleForm.setFieldsValue({ rol: user.rol });
    setIsEditRoleModalVisible(true);
  };

  const handleUpdateRole = async (values) => {
    if (!editingUser) return;
    try {
      await updateUserRoleMutation.mutateAsync({
        id: editingUser.id,
        roleName: values.rol
      });
      message.success('Rol actualizado exitosamente');
      setIsEditRoleModalVisible(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error al actualizar rol:', error);
      message.error(typeof error === 'string' ? error : 'Error al actualizar el rol');
    }
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
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Gestión de Usuarios</h2>
        <Button className="glass-btn" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          Nuevo Usuario
        </Button>
      </div>

      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', overflow: 'hidden', width: '100%' }}>
        <List
          loading={loading}
          itemLayout="horizontal"
          dataSource={usuarios}
          className="premium-list"
          renderItem={(user) => {
            const esMismoUsuario = 
              (currentUser?.id && Number(user.id) === Number(currentUser.id)) ||
              (currentUser?.userId && Number(user.id) === Number(currentUser.userId)) ||
              (currentUser?.email && user.email?.toLowerCase() === currentUser.email?.toLowerCase());

            const puedeEliminar = esAdmin && !esMismoUsuario;

            return (
              <List.Item
                className="premium-list-item"
                actions={[
                  <Space key="actions">
                    <Tooltip title="Editar Rol">
                      <Button 
                        type="text" 
                        className="user-action-btn" 
                        icon={<EditOutlined style={{ color: '#0284c7' }} />} 
                        onClick={() => handleEditRoleClick(user)}
                      />
                    </Tooltip>
                    {puedeEliminar && (
                      <Tooltip title="Eliminar Usuario">
                        <Button 
                          type="text" 
                          className="user-action-btn" 
                          icon={<DeleteOutlined style={{ color: '#ef4444' }} />} 
                          onClick={() => handleDeleteUser(user.id)}
                        />
                      </Tooltip>
                    )}
                  </Space>
                ]}
              >
              <List.Item.Meta
                avatar={
                  <div className="user-avatar-wrapper" style={{ marginRight: '16px', flexShrink: 0 }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <Text style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>
                      {user.nombre}
                    </Text>
                    <span className={`user-role-tag ${getRoleClass(user.rol)}`} style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {user.rol || 'Sin Rol'}
                    </span>
                  </div>
                }
                description={
                  <div style={{ marginTop: '4px', wordBreak: 'break-all' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px' }}>
                      <MailOutlined />
                      {user.email}
                    </span>
                  </div>
                }
              />
            </List.Item>
          );
        }}
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
              <Select.Option value="COLABORADOR">Colaborador</Select.Option>
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
              loading={createUserMutation.isLoading}
              className="btn-guardar"
            >
              Crear Usuario
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={<span style={{ fontWeight: 600, fontSize: '18px' }}>Editar Rol de Usuario</span>}
        open={isEditRoleModalVisible}
        onCancel={() => {
          setIsEditRoleModalVisible(false);
          setEditingUser(null);
        }}
        footer={null}
        destroyOnClose
        centered
        className="premium-modal"
      >
        {editingUser && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">Actualizando rol para: </Text>
            <Text strong>{editingUser.nombre}</Text>
          </div>
        )}
        <Form
          form={editRoleForm}
          layout="vertical"
          onFinish={handleUpdateRole}
        >
          <Form.Item
            name="rol"
            label={<span style={{ fontWeight: 500 }}>Nuevo Rol</span>}
            rules={[{ required: true, message: 'Por favor seleccione un rol' }]}
          >
            <Select size="large">
              <Select.Option value="ADMIN">Administrador</Select.Option>
              <Select.Option value="CONTADOR">Contador</Select.Option>
              <Select.Option value="COLABORADOR">Colaborador</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginTop: 32, marginBottom: 0, textAlign: 'right' }}>
            <Button size="large" onClick={() => setIsEditRoleModalVisible(false)} style={{ marginRight: 12, borderRadius: '8px', fontWeight: 500 }}>
              Cancelar
            </Button>
            <Button 
              size="large"
              type="primary" 
              htmlType="submit" 
              loading={updateUserRoleMutation.isLoading}
              className="btn-guardar"
            >
              Guardar Cambios
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsuariosTab;
