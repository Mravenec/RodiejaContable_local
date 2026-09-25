import React from 'react';
import { Layout, Menu, Typography, Drawer } from 'antd';
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
import { useAuth } from '../context/AuthContext';

const { Sider } = Layout;
const { Text } = Typography;

const Sidebar = ({ collapsed, isMobile, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasAccess } = useAuth();

  const items = [
    hasAccess('inicio_dashboard') ? { key: '/', icon: <HomeOutlined />, label: 'Inicio' } : null,
    (hasAccess('vehiculos_lista') || hasAccess('vehiculos_jerarquia')) ? {
      key: 'vehiculos',
      icon: <CarOutlined />,
      label: 'Vehículos',
      children: [
        hasAccess('vehiculos_lista') ? { key: '/vehiculos', label: 'Lista de Vehículos' } : null,
        hasAccess('vehiculos_jerarquia') ? { key: '/vehiculos/jerarquia', label: 'Ver por Generaciones' } : null,
        !['CONTADOR', 'COLABORADOR'].includes(user?.rol) && hasAccess('vehiculos_lista') ? { key: '/vehiculos/nuevo', label: 'Nuevo Vehículo' } : null,
      ].filter(Boolean)
    } : null,
    hasAccess('inventario_lista') ? {
      key: 'inventario',
      icon: <ToolOutlined />,
      label: 'Inventario',
      children: [
        { key: '/inventario', label: 'Lista de Repuestos' },
        !['CONTADOR', 'COLABORADOR'].includes(user?.rol) ? { key: '/inventario/nuevo', label: 'Nuevo Repuesto' } : null,
      ].filter(Boolean)
    } : null,
    hasAccess('finanzas_lista') ? {
      key: 'finanzas',
      icon: <DollarOutlined />,
      label: 'Finanzas',
      children: [
        { key: '/finanzas', label: 'Transacciones' },
        !['CONTADOR', 'COLABORADOR'].includes(user?.rol) ? { key: '/finanzas/nueva', label: 'Nueva Transacción' } : null,
      ].filter(Boolean)
    } : null,
    (hasAccess('reportes_general') || hasAccess('reportes_ventas') || hasAccess('reportes_vehiculos') || hasAccess('reportes_repuestos')) ? {
      key: 'reportes',
      icon: <BarChartOutlined />,
      label: 'Reportes',
      children: [
        hasAccess('reportes_general') ? { key: '/reportes', label: 'General' } : null,
        hasAccess('reportes_ventas') ? { key: '/reportes/ventas', label: 'Ventas Empleados' } : null,
        hasAccess('reportes_vehiculos') ? { key: '/reportes/vehiculos', label: 'Vehículos' } : null,
        hasAccess('reportes_repuestos') ? { key: '/reportes/repuestos', label: 'Repuestos' } : null
      ].filter(Boolean)
    } : null,
    (hasAccess('audatex_oportunidades') || hasAccess('audatex_jerarquia') || hasAccess('audatex_pedidos')) ? {
      key: 'audatex',
      icon: <SendOutlined />,
      label: 'Cotizaciones InPart',
      children: [
        hasAccess('audatex_oportunidades') ? { key: '/audatex/oportunidades', label: 'Oportunidades' } : null,
        // hasAccess('audatex_jerarquia') ? { key: '/audatex/jerarquia', label: 'Jerarquía InPart' } : null,
        hasAccess('audatex_pedidos') ? { key: '/audatex/pedidos', label: 'Pedidos' } : null,
      ].filter(Boolean)
    } : null,
    hasAccess('configuracion_ajustes') ? {
      key: 'configuracion',
      icon: <SettingOutlined />,
      label: 'Configuración',
      children: [
        { key: '/configuracion/perfil', label: 'Mi Perfil' }, // Perfil siempre visible si entran a configuración
        { key: '/configuracion/ajustes', label: 'Ajustes' },
      ]
    } : {
      // Fallback si no tiene permisos de ajustes, al menos que vea su perfil
      key: 'configuracion',
      icon: <SettingOutlined />,
      label: 'Configuración',
      children: [
        { key: '/configuracion/perfil', label: 'Mi Perfil' }
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
  ].filter(Boolean);

  const siderContent = (
    <>
      <div style={{
        height: collapsed && !isMobile ? 40 : 'auto',
        minHeight: 40,
        margin: '16px',
        padding: collapsed && !isMobile ? 0 : '12px 16px',
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
          fontSize: collapsed && !isMobile ? '16px' : '16px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          margin: 0,
          background: 'linear-gradient(to right, #ffffff, #e6f7ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {(collapsed && !isMobile) ? 'RC' : 'Rodieja Contable'}
        </Text>
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        defaultOpenKeys={[location.pathname.split('/')[1] || '']}
        items={items}
        onClick={({ key }) => {
          if (key !== 'cerrar-sesion') navigate(key);
          if (isMobile && onClose) onClose();
        }}
        style={{
          borderRight: 0,
          padding: '0 8px'
        }}
      />
    </>
  );

  if (isMobile) {
    return (
      <Drawer
        placement="left"
        closable={false}
        onClose={onClose}
        open={!collapsed}
        bodyStyle={{ padding: 0, backgroundColor: '#001529' }}
        width={250}
        zIndex={1050}
      >
        <Sider
          trigger={null}
          collapsible
          collapsed={false}
          width={250}
          style={{
            height: '100vh',
            boxShadow: 'none',
            backgroundColor: '#001529'
          }}
        >
          {siderContent}
        </Sider>
      </Drawer>
    );
  }

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      breakpoint="lg"
      collapsedWidth={80}
      width={220}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 1001,
        boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)',
        backgroundColor: '#001529'
      }}
    >
      {siderContent}
    </Sider>
  );
};

export default Sidebar;