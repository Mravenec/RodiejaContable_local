import React from 'react';
import { Layout, Button, Dropdown, Avatar, Typography } from 'antd';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  UserOutlined,
  LogoutOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Header: AntdHeader } = Layout;
const { Text } = Typography;

const Header = ({ collapsed, toggleCollapse, isMobile = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleMenuClick = async (e) => {
    switch (e.key) {
      case '1':
        navigate('/configuracion/perfil');
        break;
      case '2':
        navigate('/configuracion');
        break;
      case '3': // Cerrar Sesión
        try {
          await logout();
          // Usar window.location.replace para evitar problemas con el historial
          window.location.replace('/login');
        } catch (error) {
          console.error('Error en logout:', error);
          window.location.replace('/login');
        }
        break;
      default:
        break;
    }
  };

  const items = [
    {
      key: '1',
      label: 'Mi Perfil',
      icon: <UserOutlined />
    },
    {
      key: '2',
      label: 'Configuración',
      icon: <SettingOutlined />
    },
    {
      type: 'divider',
    },
    {
      key: '3',
      label: 'Cerrar Sesión',
      icon: <LogoutOutlined />,
      danger: true
    },
  ];

  return (
    <AntdHeader 
      style={{ 
        padding: '0 24px 0 16px',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: '0 1px 4px rgba(0,21,41,.08)',
        height: '64px',
        lineHeight: '64px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={toggleCollapse}
          style={{
            fontSize: '16px',
            width: isMobile ? 48 : 64,
            height: 64,
            display: 'inline-flex',
            padding: 0
          }}
        />
        <div style={{
          marginLeft: '16px',
          fontSize: '20px',
          fontWeight: 700,
          color: '#1890ff',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
          letterSpacing: '0.3px',
          background: 'linear-gradient(90deg, #1890ff 0%, #096dd9 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textFillColor: 'transparent',
          padding: '4px 0',
          display: isMobile ? 'none' : 'block'
        }}>
          Rodieja Contable
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Dropdown menu={{ items, onClick: handleMenuClick }} trigger={['click']} overlayStyle={{ minWidth: '200px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer', 
            padding: '8px 16px',
            borderRadius: '24px',
            transition: 'background 0.3s',
            background: 'rgba(0,0,0,0.02)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}>
            <Avatar 
              style={{ backgroundColor: '#1890ff' }} 
              icon={<UserOutlined />} 
            />
            {!isMobile && (
              <div style={{ marginLeft: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <Text strong>{user?.nombre || user?.name || user?.email?.split('@')[0] || ''}</Text>
              </div>
            )}
          </div>
        </Dropdown>
      </div>
    </AntdHeader>
  );
};

export default Header;
