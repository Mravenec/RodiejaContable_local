import React, { useState, useEffect } from 'react';
import { 
  Tabs, 
  Card, 
  Form, 
  Input, 
  Button, 
  Select, 
  Switch, 
  Avatar, 
  Upload, 
  message, 
  Divider, 
  Row, 
  Col, 
  Typography, 
  Modal,
  Space,
  Spin,
  Alert,
  Tag,
  InputNumber,
  Descriptions,
  Progress,
  List
} from 'antd';
import { 
  UserOutlined, 
  LockOutlined, 
  MailOutlined, 
  PhoneOutlined,
  EnvironmentOutlined,
  UploadOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  BellOutlined,
  TeamOutlined,
  SettingOutlined,
  KeyOutlined,
  ReloadOutlined,
  SaveOutlined,
  SafetyOutlined,
  NotificationOutlined,
  GlobalOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  PlusOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  authService, 
  // Nota: Asegúrate de que estos servicios estén exportados en tu archivo api/index.js
  // Si no existen, deberás crearlos o importarlos desde sus respectivos archivos
  // Por ahora, los dejo comentados para evitar errores
  // usuarioService, 
  // configuracionService 
} from '../../api';
import { Loading } from '../../components/Loading';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const Configuracion = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('perfil');
  const [avatarFile, setAvatarFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangePasswordModalVisible, setIsChangePasswordModalVisible] = useState(false);
  
  // Mock de las mutaciones - Reemplazar con implementación real si es necesario
  const updateProfileMutation = {
    mutate: async (values) => {
      console.log('Actualizando perfil:', values);
      return new Promise((resolve) => {
        setTimeout(() => {
          // message.success('Perfil actualizado correctamente');
          resolve();
        }, 1000);
      });
    },
    isLoading: false
  };
  
  const updatePasswordMutation = {
    mutate: async (values) => {
      console.log('Actualizando contraseña:', values);
      return new Promise((resolve) => {
        setTimeout(() => {
          // message.success('Contraseña actualizada correctamente');
          setIsChangePasswordModalVisible(false);
          passwordForm.resetFields();
          resolve();
        }, 1000);
      });
    },
    isLoading: false
  };
  
  const updateConfigMutation = {
    mutate: async (values) => {
      console.log('Actualizando configuración:', values);
      return new Promise((resolve) => {
        setTimeout(() => {
          // message.success('Configuración actualizada correctamente');
          resolve();
        }, 1000);
      });
    },
    isLoading: false
  };
  
  // Servicio de usuario mock - Reemplazar con implementación real si es necesario
  const usuarioService = {
    uploadAvatar: async (formData) => {
      console.log('Subiendo avatar:', formData);
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            avatar_url: 'https://randomuser.me/api/portraits/men/1.jpg'
          });
        }, 1000);
      });
    },
    actualizarAvatar: async (formData) => {
      console.log('Actualizando avatar:', formData);
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            avatar_url: 'https://randomuser.me/api/portraits/men/1.jpg'
          });
        }, 1000);
      });
    }
  };
  
  // Datos de ejemplo del usuario
  const usuario = {
    nombre: 'Usuario Ejemplo',
    email: 'usuario@ejemplo.com',
    telefono: '123-456-7890',
    direccion: 'Calle Falsa 123',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    puesto: 'Administrador',
    departamento: 'TI'
  };
  
  // Configuración de ejemplo
  const configuracion = {
    notificaciones: {
      email: true,
      push: true,
      sonido: true
    },
    tema: 'claro',
    idioma: 'es'
  };
  
  const isLoading = false;
  const error = null;
  const isLoadingConfig = false;
  
  // Función para manejar la actualización del perfil
  const handleUpdateProfile = (values) => {
    console.log('Actualizar perfil con:', values);
    // message.success('Perfil actualizado correctamente');
    setIsEditing(false);
  };
  
  // Función para manejar el cambio de contraseña
  const handleChangePassword = (values) => {
    console.log('Cambiar contraseña con:', values);
    // message.success('Contraseña actualizada correctamente');
    setIsChangePasswordModalVisible(false);
    passwordForm.resetFields();
  };
  
  // Función para actualizar la configuración
  const handleUpdateConfig = (values) => {
    console.log('Actualizar configuración con:', values);
    // message.success('Configuración actualizada correctamente');
    
    // Aplicar cambios de tema si es necesario
    if (values.tema) {
      const body = document.body;
      if (values.tema === 'oscuro') {
        body.classList.add('dark-theme');
      } else {
        body.classList.remove('dark-theme');
      }
    }
  };
  
  // Función para manejar la carga del avatar
  const handleAvatarChange = async (info) => {
    if (info.file.status === 'done') {
      try {
        const formData = new FormData();
        formData.append('avatar', info.file.originFileObj);
        
        const response = await usuarioService.uploadAvatar(formData);
        
        if (response.success) {
          // Actualizar el avatar en el estado del usuario
          queryClient.setQueryData('usuario', (oldData) => ({
            ...oldData,
            avatar_url: response.avatar_url
          }));
          
          message.success('Avatar actualizado correctamente');
        } else {
          message.error(response.message || 'Error al actualizar el avatar');
        }
      } catch (error) {
        console.error('Error al subir el avatar:', error);
        message.error('Error al subir el avatar');
      }
    }
  };
  
  // Función para manejar el guardado del perfil del usuario
  const handleSaveProfile = async () => {
    try {
      const values = await form.validateFields();
      await updateProfileMutation.mutate(values);
      setIsEditing(false);
    } catch (error) {
      console.error('Error al guardar el perfil:', error);
      message.error('Error al guardar el perfil');
    }
  };


  
  // Efecto para establecer valores iniciales del formulario cuando se cargan los datos
  useEffect(() => {
    if (usuario) {
      form.setFieldsValue({
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono,
        direccion: usuario.direccion,
        puesto: usuario.puesto,
        departamento: usuario.departamento,
      });
    }
  }, [usuario, form]);
  
  // Manejar carga de avatar
  const beforeUpload = (file) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('Solo puedes subir archivos JPG/PNG!');
      return Upload.LIST_IGNORE;
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('La imagen debe ser menor a 2MB!');
      return Upload.LIST_IGNORE;
    }
    return isJpgOrPng && isLt2M;
  };
  
  // Función handleChange para manejar la carga del avatar
  const handleChange = async (info) => {
    if (info.file.status === 'done') {
      setAvatarFile(info.file.originFileObj);
      message.success(`${info.file.name} subido correctamente`);
      
      try {
        const formData = new FormData();
        formData.append('avatar', info.file.originFileObj);
        await usuarioService.actualizarAvatar(formData);
        message.success('Foto de perfil actualizada correctamente');
        queryClient.invalidateQueries('usuario');
      } catch (error) {
        message.error('Error al actualizar la foto de perfil');
      }
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} falló al subir.`);
    }
  };
  
  // Las funciones handleChangePassword y handleUpdateConfig ya están definidas anteriormente
  
  if (isLoading || isLoadingConfig) return <Loading />;
  
  if (error) {
    return (
      <Alert
        message="Error"
        description="No se pudieron cargar los datos de configuración"
        type="error"
        showIcon
      />
    );
  }
  
  return (
    <div className="configuracion-container">
      <Modal
        title="Cambiar Contraseña"
        open={isChangePasswordModalVisible}
        onCancel={() => setIsChangePasswordModalVisible(false)}
        footer={null}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <Form.Item
            name="currentPassword"
            label="Contraseña Actual"
            rules={[{ required: true, message: 'Por favor ingresa tu contraseña actual' }]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="Contraseña actual"
              disabled={updatePasswordMutation.isLoading}
            />
          </Form.Item>
          
          <Form.Item
            name="newPassword"
            label="Nueva Contraseña"
            rules={[
              { required: true, message: 'Por favor ingresa una nueva contraseña' },
              { min: 8, message: 'La contraseña debe tener al menos 8 caracteres' }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="Nueva contraseña"
              disabled={updatePasswordMutation.isLoading}
            />
          </Form.Item>
          
          <Form.Item
            name="confirmPassword"
            label="Confirmar Nueva Contraseña"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Por favor confirma tu nueva contraseña' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Las contraseñas no coinciden'));
                },
              }),
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="Confirmar nueva contraseña"
              disabled={updatePasswordMutation.isLoading}
            />
          </Form.Item>
          
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block
              loading={updatePasswordMutation.isLoading}
              icon={<SaveOutlined />}
            >
              Actualizar Contraseña
            </Button>
          </Form.Item>
        </Form>
      </Modal>
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        tabPosition="left"
        className="configuracion-tabs"
      >
        <TabPane
          tab={
            <span>
              <UserOutlined />
              Perfil
            </span>
          }
          key="perfil"
        >
          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Card title="Foto de Perfil" loading={updateProfileMutation.isLoading}>
                <div style={{ textAlign: 'center' }}>
                  <Upload
                    name="avatar"
                    listType="picture-card"
                    showUploadList={false}
                    beforeUpload={beforeUpload}
                    onChange={handleChange}
                    disabled={updateProfileMutation.isLoading}
                  >
                    {usuario?.avatar_url ? (
                      <Avatar 
                        src={usuario.avatar_url} 
                        size={150} 
                        icon={<UserOutlined />}
                      />
                    ) : (
                      <Avatar 
                        size={150} 
                        icon={<UserOutlined />} 
                        style={{ fontSize: '64px' }}
                      />
                    )}
                  </Upload>
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary">Haz clic para cambiar la foto (max. 2MB)</Text>
                  </div>
                </div>
              </Card>
              
              <Card 
                title="Seguridad" 
                style={{ marginTop: 16 }}
                loading={updatePasswordMutation.isLoading}
              >
                <Button 
                  type="primary" 
                  icon={<KeyOutlined />} 
                  block
                  onClick={() => setIsChangePasswordModalVisible(true)}
                  loading={updatePasswordMutation.isLoading}
                >
                  Cambiar Contraseña
                </Button>
              </Card>
            </Col>
            <Col xs={24} md={16}>
              <Card 
                title="Información Personal"
                extra={
                  isEditing ? (
                    <Space>
                      <Button 
                        onClick={() => setIsEditing(false)}
                        disabled={updateProfileMutation.isLoading}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="primary" 
                        onClick={() => form.submit()}
                        loading={updateProfileMutation.isLoading}
                        icon={<SaveOutlined />}
                      >
                        Guardar Cambios
                      </Button>
                    </Space>
                  ) : (
                    <Button 
                      type="primary" 
                      icon={<EditOutlined />} 
                      onClick={() => setIsEditing(true)}
                      disabled={updateProfileMutation.isLoading}
                    >
                      Editar Perfil
                    </Button>
                  )
                }
                loading={updateProfileMutation.isLoading}
              >
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSaveProfile}
                  initialValues={{
                    nombre: usuario?.nombre || '',
                    email: usuario?.email || '',
                    telefono: usuario?.telefono || '',
                    direccion: usuario?.direccion || '',
                    puesto: usuario?.puesto || '',
                    departamento: usuario?.departamento || '',
                  }}
                >
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="nombre"
                        label="Nombre Completo"
                        rules={[{ required: true, message: 'Por favor ingresa tu nombre' }]}
                      >
                        <Input 
                          prefix={<UserOutlined />} 
                          placeholder="Nombre Completo" 
                          disabled={!isEditing}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="email"
                        label="Correo Electrónico"
                        rules={[
                          { required: true, message: 'Por favor ingresa tu correo' },
                          { type: 'email', message: 'Ingresa un correo válido' },
                        ]}
                      >
                        <Input 
                          prefix={<MailOutlined />} 
                          placeholder="correo@ejemplo.com" 
                          disabled={!isEditing}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="telefono"
                        label="Teléfono"
                      >
                        <Input 
                          prefix={<PhoneOutlined />} 
                          placeholder="+52 1 55 1234 5678" 
                          disabled={!isEditing}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="puesto"
                        label="Puesto"
                      >
                        <Input 
                          placeholder="Ej: Gerente de Ventas" 
                          disabled={!isEditing}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Form.Item
                    name="direccion"
                    label="Dirección"
                  >
                    <Input 
                      prefix={<EnvironmentOutlined />} 
                      placeholder="Dirección completa" 
                      disabled={!isEditing}
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="departamento"
                    label="Departamento"
                  >
                    <Input 
                      placeholder="Departamento" 
                      disabled={!isEditing}
                    />
                  </Form.Item>
                </Form>
              </Card>
            </Col>
          </Row>
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <TeamOutlined />
              Usuarios
            </span>
          }
          key="usuarios"
        >
          <Card
            title="Gestión de Usuarios"
            extra={
              <Button type="primary" icon={<PlusOutlined />}>
                Nuevo Usuario
              </Button>
            }
          >
            <List
              itemLayout="horizontal"
              dataSource={[
                { 
                  id: 1, 
                  nombre: 'Ana García', 
                  email: 'ana.garcia@empresa.com', 
                  rol: 'Vendedor', 
                  activo: true,
                  ultimoAcceso: 'Hoy, 10:15',
                },
                { 
                  id: 2, 
                  nombre: 'Carlos López', 
                  email: 'carlos.lopez@empresa.com', 
                  rol: 'Vendedor', 
                  activo: true,
                  ultimoAcceso: 'Ayer, 16:45',
                },
                { 
                  id: 3, 
                  nombre: 'María Rodríguez', 
                  email: 'maria.rodriguez@empresa.com', 
                  rol: 'Inventario', 
                  activo: false,
                  ultimoAcceso: 'Hace 3 días',
                },
              ]}
              renderItem={(user) => (
                <List.Item
                  actions={[
                    <Button type="link" icon={<EditOutlined />} />,
                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />} 
                      onClick={() => console.log('Eliminar usuario:', user.id)}
                    />,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        style={{ backgroundColor: user.activo ? '#52c41a' : '#f52222' }}
                        icon={<UserOutlined />} 
                      />
                    }
                    title={
                      <Space>
                        <Text>{user.nombre}</Text>
                        <Tag color={user.activo ? 'success' : 'error'}>
                          {user.activo ? 'Activo' : 'Inactivo'}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={0}>
                        <Text type="secondary">{user.email}</Text>
                        <Text type="secondary">Rol: {user.rol}</Text>
                        <Text type="secondary">Último acceso: {user.ultimoAcceso}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <SettingOutlined />
              Configuración
            </span>
          }
          key="configuracion"
        >
          <Card 
            title="Configuración del Sistema"
            loading={updateConfigMutation.isLoading}
          >
            <Form
              layout="vertical"
              onFinish={handleUpdateConfig}
              initialValues={{
                tema: configuracion?.tema || 'claro',
                idioma: configuracion?.idioma || 'es',
                zona_horaria: configuracion?.zona_horaria || 'America/Mexico_City',
                items_por_pagina: configuracion?.items_por_pagina || 10,
                notificaciones_email: configuracion?.notificaciones_email || false,
                notificaciones_push: configuracion?.notificaciones_push || true
              }}
            >
              <Row gutter={24}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Tema de la Aplicación"
                    name="tema"
                  >
                    <Select 
                      placeholder="Selecciona un tema"
                      disabled={updateConfigMutation.isLoading}
                    >
                      <Option value="claro">Claro</Option>
                      <Option value="oscuro">Oscuro</Option>
                      <Option value="sistema">Usar configuración del sistema</Option>
                    </Select>
                  </Form.Item>
                </Col>
                
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Idioma"
                    name="idioma"
                  >
                    <Select 
                      placeholder="Selecciona un idioma"
                      disabled={updateConfigMutation.isLoading}
                    >
                      <Option value="es">Español</Option>
                      <Option value="en">English</Option>
                    </Select>
                  </Form.Item>
                </Col>
                
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Zona Horaria"
                    name="zona_horaria"
                  >
                    <Select 
                      showSearch
                      placeholder="Selecciona una zona horaria"
                      optionFilterProp="children"
                      disabled={updateConfigMutation.isLoading}
                    >
                      <Option value="America/Mexico_City">Ciudad de México (UTC-6)</Option>
                      <Option value="America/New_York">Nueva York (UTC-5)</Option>
                      <Option value="America/Los_Angeles">Los Ángeles (UTC-8)</Option>
                      <Option value="Europe/Madrid">Madrid (UTC+1)</Option>
                    </Select>
                  </Form.Item>
                </Col>
                
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Elementos por página"
                    name="items_por_pagina"
                  >
                    <Select 
                      placeholder="Elementos por página"
                      disabled={updateConfigMutation.isLoading}
                    >
                      <Option value={10}>10 por página</Option>
                      <Option value={25}>25 por página</Option>
                      <Option value={50}>50 por página</Option>
                      <Option value={100}>100 por página</Option>
                    </Select>
                  </Form.Item>
                </Col>
                
                <Col span={24}>
                  <Divider orientation="left">Notificaciones</Divider>
                </Col>
                
                <Col xs={24} md={12}>
                  <Form.Item
                    name="notificaciones_email"
                    valuePropName="checked"
                  >
                    <Switch 
                      checkedChildren={<CheckOutlined />} 
                      unCheckedChildren={<CloseOutlined />}
                      disabled={updateConfigMutation.isLoading}
                    />
                    <span style={{ marginLeft: 8 }}>Notificaciones por correo</span>
                  </Form.Item>
                  
                  <Form.Item
                    name="notificaciones_push"
                    valuePropName="checked"
                  >
                    <Switch 
                      checkedChildren={<CheckOutlined />} 
                      unCheckedChildren={<CloseOutlined />}
                      disabled={updateConfigMutation.isLoading}
                    />
                    <span style={{ marginLeft: 8 }}>Notificaciones push</span>
                  </Form.Item>
                </Col>
                
                <Col span={24}>
                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit"
                      loading={updateConfigMutation.isLoading}
                      icon={<SaveOutlined />}
                    >
                      Guardar Configuración
                    </Button>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
          
          <Card 
            title="Copia de Seguridad" 
            style={{ marginTop: 16 }}
            loading={updateConfigMutation.isLoading}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                icon={<CloudUploadOutlined />}
                block
              >
                Crear Copia de Seguridad
              </Button>
              
              <Button 
                icon={<DownloadOutlined />}
                block
              >
                Descargar Última Copia
              </Button>
              
              <Button 
                danger
                icon={<ReloadOutlined />}
                block
              >
                Restaurar desde Copia
              </Button>
            </Space>
          </Card>
          
          <Card 
            title="Mantenimiento" 
            style={{ marginTop: 16 }}
            loading={updateConfigMutation.isLoading}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                icon={<DatabaseOutlined />}
                block
              >
                Optimizar Base de Datos
              </Button>
              
              <Button 
                danger
                icon={<DeleteOutlined />}
                block
              >
                Limpiar Caché
              </Button>
              
              <Button 
                type="dashed"
                icon={<ReloadOutlined />}
                block
                onClick={() => window.location.reload()}
              >
                Recargar Aplicación
              </Button>
            </Space>
          </Card>
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <SettingOutlined />
              Sistema
            </span>
          }
          key="sistema"
        >
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Card title="Información del Sistema">
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="Versión de la Aplicación">1.0.0</Descriptions.Item>
                  <Descriptions.Item label="Última Actualización">07/07/2023</Descriptions.Item>
                  <Descriptions.Item label="Base de Datos">MySQL 8.0</Descriptions.Item>
                  <Descriptions.Item label="Servidor">Node.js 16.14.0</Descriptions.Item>
                  <Descriptions.Item label="Frontend">React 18.2.0</Descriptions.Item>
                </Descriptions>
                
                <Divider>Estado del Servidor</Divider>
                
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text>Uso de CPU</Text>
                    <Text strong>24%</Text>
                  </div>
                  <Progress percent={24} status="active" />
                </div>
                
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text>Uso de Memoria</Text>
                    <Text strong>1.8 GB / 4 GB</Text>
                  </div>
                  <Progress percent={45} status="normal" />
                </div>
                
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text>Almacenamiento</Text>
                    <Text strong>125 GB / 500 GB</Text>
                  </div>
                  <Progress percent={25} status="success" />
                </div>
              </Card>
            </Col>
            
            <Col xs={24} md={12}>
              <Card title="Copia de Seguridad">
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <FileTextOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                  <Title level={4} style={{ marginBottom: '8px' }}>Copia de Seguridad</Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
                    Realiza una copia de seguridad de todos tus datos para prevenir pérdidas de información.
                  </Text>
                  
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button type="primary" block icon={<DownloadOutlined />}>
                      Descargar Copia de Seguridad
                    </Button>
                    <Button block icon={<UploadOutlined />}>
                      Restaurar desde Archivo
                    </Button>
                  </Space>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
      
      {/* Modal para cambiar contraseña */}
      <Modal
        title="Cambiar Contraseña"
        open={isChangePasswordModalVisible}
        onOk={handleChangePassword}
        onCancel={() => setIsChangePasswordModalVisible(false)}
        okText="Guardar Cambios"
        cancelText="Cancelar"
      >
        <Form layout="vertical">
          <Form.Item
            label="Contraseña Actual"
            name="currentPassword"
            rules={[{ required: true, message: 'Por favor ingresa tu contraseña actual' }]}
          >
            <Input.Password placeholder="Ingresa tu contraseña actual" />
          </Form.Item>
          <Form.Item
            label="Nueva Contraseña"
            name="newPassword"
            rules={[{ required: true, message: 'Por favor ingresa una nueva contraseña' }]}
          >
            <Input.Password placeholder="Ingresa tu nueva contraseña" />
          </Form.Item>
          <Form.Item
            label="Confirmar Nueva Contraseña"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Por favor confirma tu nueva contraseña' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Las contraseñas no coinciden'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirma tu nueva contraseña" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Configuracion;
