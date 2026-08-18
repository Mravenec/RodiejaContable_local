import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography } from 'antd';
import {
  HomeOutlined,
  CarOutlined,
  ToolOutlined,
  DollarOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  SendOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const { Sider } = Layout;
const { Text } = Typography;

const Sidebar = ({ collapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Para manejar responsividad interna si es necesario
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const items = [
    { key: '/', icon: <HomeOutlined />, label: 'Inicio' },
    {
      key: 'vehiculos',
      icon: <CarOutlined />,
      label: 'Vehículos',
      children: [
        { key: '/vehiculos', label: 'Lista de Vehículos' },
        { key: '/vehiculos/jerarquia', label: 'Ver por Generaciones' },
        user?.rol !== 'CONTADOR' ? { key: '/vehiculos/nuevo', label: 'Nuevo Vehículo' } : null,
      ].filter(Boolean)
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
        user?.rol !== 'CONTADOR' ? { key: '/finanzas/nueva', label: 'Nueva Transacción' } : null,
      ].filter(Boolean)
    },
    {
      key: 'reportes',
      icon: <BarChartOutlined />,
      label: 'Reportes',
      children: [
        { key: '/reportes', label: 'General' },
        { key: '/reportes/ventas', label: 'Ventas Empleados' },
        { key: '/reportes/vehiculos', label: 'Vehículos' },
        { key: '/reportes/repuestos', label: 'Repuestos' }
      ]
    },
    {
      key: 'audatex',
      icon: <SendOutlined />,
      label: 'Cotizaciones InPart',
      children: [
        { key: '/audatex/oportunidades', label: 'Oportunidades' },
        // { key: '/audatex/jerarquia', label: 'Jerarquía InPart' },
        { key: '/audatex/pedidos', label: 'Pedidos' },
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
      breakpoint="lg"
      collapsedWidth={isMobile ? 0 : 80}
      width={220}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 1001, // Asegurar que esté por encima del contenido en móviles
        boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)',
        backgroundColor: '#001529' // Manteniendo el color oscuro clásico
      }}
    >
      <div style={{
        height: collapsed ? 40 : 'auto',
        minHeight: 40,
        margin: '16px',
        padding: collapsed ? 0 : '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        overflow: 'hidden'
      }} onClick={() => navigate('/')}>
        <Text style={{
          color: 'white',
          fontSize: collapsed ? '16px' : '16px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          margin: 0,
          background: 'linear-gradient(to right, #ffffff, #e6f7ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {collapsed ? 'RC' : 'Rodieja Contable'}
        </Text>
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        defaultOpenKeys={[location.pathname.split('/')[1] || '']}
        items={items}
        onClick={({ key }) => key !== 'cerrar-sesion' && navigate(key)}
        style={{
          borderRight: 0,
          padding: '0 8px'
        }}
      />
    </Sider>
  );
};

export default Sidebar;