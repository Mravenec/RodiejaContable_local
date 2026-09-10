import React, { useState } from 'react';
import { Tabs } from 'antd';
import { TeamOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import UsuariosTab from './UsuariosTab';
import RolesPrivacidadTab from './RolesPrivacidadTab';
import '../../styles/Settings.css';

const { TabPane } = Tabs;

const Configuracion = () => {
  const [activeTab, setActiveTab] = useState('usuarios');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="settings-container mx-auto" style={{ padding: isMobile ? '16px' : '32px', maxWidth: '1200px' }}>
      <div className="settings-header">
        <h1>Ajustes del Sistema</h1>
        <p>Gestiona los usuarios, roles y preferencias del sistema</p>
      </div>

      <div className="settings-card">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          tabPosition={isMobile ? 'top' : 'left'}
          className="settings-tabs"
        >
          <TabPane
            tab={
              <span>
                <TeamOutlined style={{ fontSize: '18px', marginRight: '8px' }} />
                Usuarios
              </span>
            }
            key="usuarios"
          >
            <div className="tab-content-wrapper">
              <UsuariosTab />
            </div>
          </TabPane>
          
          <TabPane
            tab={
              <span>
                <SafetyCertificateOutlined style={{ fontSize: '18px', marginRight: '8px' }} />
                Roles y Privacidad
              </span>
            }
            key="roles"
          >
            <div className="tab-content-wrapper">
              <RolesPrivacidadTab />
            </div>
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default Configuracion;
