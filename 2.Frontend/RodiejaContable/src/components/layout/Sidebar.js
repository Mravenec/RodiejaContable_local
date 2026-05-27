import React from 'react';
import { Layout, Menu } from 'antd';
import { 
  HomeOutlined, 
  CarOutlined, 
  ToolOutlined, 
  DollarOutlined, 
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const { Sider } = Layout;

const Sidebar = ({ collapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const items = [
    { key: '/', icon: <HomeOutlined />, label: 'Inicio' },
    { 
      key: 'vehiculos', 
      icon: <CarOutlined />, 
      label: 'Vehículos',
      children: [
        { key: '/vehiculos', label: 'Lista de Vehículos' },
        { key: '/vehiculos/jerarquia', label: 'Ver por Generaciones' },
        { key: '/vehiculos/nuevo', label: 'Nuevo Vehículo' },
      ]
    },
    { 
      key: 'inventario', 
      icon: <ToolOutlined />, 
      label: 'Inventario',
      children: [
        { key: '/inventario', label: 'Lista de Repuestos' },
        { key: '/inventario/nuevo', label: 'Nuevo Repuesto' },
      ]
    },
    { 
      key: 'finanzas', 
      icon: <DollarOutlined />, 
      label: 'Finanzas',
      children: [
        { key: '/finanzas', label: 'Transacciones' },
        { key: '/finanzas/nueva', label: 'Nueva Transacción' },
      ]
    },
    { 
      key: 'reportes', 
      icon: <BarChartOutlined />, 
      label: 'Reportes',
      children: [
        { key: '/reportes', label: 'General' },
        { key: '/reportes/ventas', label: 'Ventas' },
        { key: '/reportes/repuestos', label: 'Repuestos' }
      ]
    },
    { 
      key: 'configuracion', 
      icon: <SettingOutlined />, 
      label: 'Configuración',
      children: [
        { key: '/configuracion/perfil', label: 'Mi Perfil' },
        { key: '/configuracion/ajustes', label: 'Ajustes' },
      ]
    },
    { 
      key: 'cerrar-sesion', 
      icon: <LogoutOutlined />, 
      label: 'Cerrar Sesión',
      onClick: () => {
        logout();
        navigate('/login');
      }
    },
  ];

  return (
    <Sider 
      trigger={null} 
      collapsible 
      collapsed={collapsed}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
      }}
    >
      <div style={{ 
        height: collapsed ? 32 : 'auto',
        minHeight: 32,
        margin: 16, 
        padding: collapsed ? 0 : '12px 16px',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'white',
        fontSize: collapsed ? '16px' : '18px',
        fontWeight: 700,
        background: 'rgba(255, 255, 255, 0.25)',
        borderRadius: '8px',
        textAlign: 'center',
        lineHeight: '1.4',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.3s ease',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {collapsed ? 'RC' : 'Rodieja Contable'}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={items}
        onClick={({ key }) => key !== 'cerrar-sesion' && navigate(key)}
      />
    </Sider>
  );
};

export default Sidebar;