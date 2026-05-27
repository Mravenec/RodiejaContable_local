import React from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Componentes de interfaz
import { Layout, Menu, Avatar, Dropdown, Button } from 'antd';
import {
  DashboardOutlined,
  CarOutlined,
  ToolOutlined,
  MoneyCollectOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Obtener la ruta actual para resaltar el menú correspondiente
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    if (path.startsWith('/vehiculos')) return 'vehiculos';
    if (path.startsWith('/inventario')) return 'inventario';
    if (path.startsWith('/finanzas')) return 'finanzas';
    if (path.startsWith('/reportes')) return 'reportes';
    if (path.startsWith('/configuracion')) return 'configuracion';
    return '';
  };

  // Menú desplegable de usuario
  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        <Link to="/configuracion/perfil">Mi Perfil</Link>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={() => logout()}>
        Cerrar Sesión
      </Menu.Item>
    </Menu>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        width={250}
        className="site-layout-background"
        theme="light"
      >
        <div className="logo" style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ color: '#1890ff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {!collapsed ? 'Rodieja S.A.' : 'RSA'}
          </h2>
        </div>
        
        <Menu
          theme="light"
          mode="inline"
          defaultSelectedKeys={[getSelectedKey()]}
          selectedKeys={[getSelectedKey()]}
        >
          <Menu.Item key="dashboard" icon={<DashboardOutlined />}>
            <Link to="/">Dashboard</Link>
          </Menu.Item>
          
          <Menu.SubMenu key="vehiculos" icon={<CarOutlined />} title="Vehículos">
            <Menu.Item key="vehiculos-lista">
              <Link to="/vehiculos">Lista de Vehículos</Link>
            </Menu.Item>
            <Menu.Item key="vehiculos-nuevo">
              <Link to="/vehiculos/nuevo">Nuevo Vehículo</Link>
            </Menu.Item>
          </Menu.SubMenu>
          
          <Menu.SubMenu key="inventario" icon={<ToolOutlined />} title="Inventario">
            <Menu.Item key="inventario-lista">
              <Link to="/inventario">Lista de Repuestos</Link>
            </Menu.Item>
            <Menu.Item key="inventario-nuevo">
              <Link to="/inventario/nuevo">Nuevo Repuesto</Link>
            </Menu.Item>
          </Menu.SubMenu>
          
          <Menu.Item key="finanzas" icon={<MoneyCollectOutlined />}>
            <Link to="/finanzas">Finanzas</Link>
          </Menu.Item>
          
          <Menu.Item key="reportes" icon={<BarChartOutlined />}>
            <Link to="/reportes">Reportes</Link>
          </Menu.Item>
          
          <Menu.Item key="configuracion" icon={<SettingOutlined />}>
            <Link to="/configuracion">Configuración</Link>
          </Menu.Item>
        </Menu>
      </Sider>
      
      <Layout className="site-layout">
        <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center' }}>
          {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
            className: 'trigger',
            onClick: () => setCollapsed(!collapsed),
            style: { fontSize: '18px', padding: '0 24px', cursor: 'pointer' },
          })}
          
          <div style={{ marginLeft: 'auto', paddingRight: '24px', display: 'flex', alignItems: 'center' }}>
            <Dropdown overlay={userMenu} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Avatar 
                  style={{ backgroundColor: '#1890ff' }} 
                  icon={<UserOutlined />} 
                />
                <span style={{ marginLeft: '8px', marginRight: '8px' }}>
                  {user?.nombre || 'Usuario'}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>
        
        <Content style={{ 
          margin: '24px 16px',
          padding: '24px 24px 24px',
          minHeight: 'calc(100vh - 112px)',
          background: '#fff',
          borderRadius: '8px',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)'
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
