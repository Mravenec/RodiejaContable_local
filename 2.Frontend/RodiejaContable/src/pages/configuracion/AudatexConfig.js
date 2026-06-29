import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Switch, InputNumber, Divider, message, Alert, Typography } from 'antd';
import { SaveOutlined, ApiOutlined, SyncOutlined } from '@ant-design/icons';
import { audatexService } from '../../api';

const { Text } = Typography;

const AudatexConfig = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    // Para el MVP, cargamos valores por defecto si no existe endpoint config
    setLoading(true);
    setTimeout(() => {
      form.setFieldsValue({
        portalUrl: 'https://inpart-la.audatex.com.mx/audapartswebapp/frmLogin.aspx',
        user: 'dvenegas',
        sessionTtlMin: 30,
        cacheTtlMin: 5,
        maxRequestsPerMin: 30,
        humanDelayMs: 800,
        enabled: true
      });
      setLoading(false);
    }, 500);
  }, [form]);

  const handleSave = async (values) => {
    setSaving(true);
    try {
      // TODO: Implementar guardado real en base de datos.
      // Por ahora simulamos que se guarda correctamente y funciona de interfaz.
      setTimeout(() => {
        message.success('Configuración de Audatex guardada correctamente');
        setSaving(false);
      }, 1000);
    } catch (error) {
      console.error('Error al guardar config Audatex:', error);
      message.error('Error al guardar la configuración');
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      // Llamada al backend para forzar y probar el login
      const res = await audatexService.testLogin();
      message.success(res.data?.message || 'Conexión con el portal de Audatex exitosa');
    } catch (error) {
      message.error('Fallo al conectar con el portal. Revisa las credenciales o la disponibilidad.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="audatex-config-container">
      <Alert
        message="Integración Audatex InPart"
        description="Configura las credenciales y el comportamiento del agente puente con el portal InPart."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card loading={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item name="enabled" valuePropName="checked">
            <Switch checkedChildren="Integración Activada" unCheckedChildren="Integración Desactivada" />
          </Form.Item>

          <Divider orientation="left">Credenciales del Portal</Divider>
          
          <Form.Item 
            label="URL del Portal (InPart)" 
            name="portalUrl"
            rules={[{ required: true, message: 'La URL es requerida' }]}
          >
            <Input prefix={<ApiOutlined />} placeholder="https://inpart-la.audatex.com.mx/..." />
          </Form.Item>

          <Form.Item 
            label="Usuario de Audatex" 
            name="user"
            rules={[{ required: true, message: 'El usuario es requerido' }]}
          >
            <Input placeholder="Ej. dvenegas" />
          </Form.Item>

          <Form.Item 
            label="Contraseña" 
            name="password"
            tooltip="Déjalo en blanco si no deseas cambiar la contraseña guardada actualmente."
          >
            <Input.Password placeholder="Ingresa la nueva contraseña para cambiarla" />
          </Form.Item>

          <Divider orientation="left">Comportamiento del Bridge Backend</Divider>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <Form.Item 
              label="Caché Oportunidades (min)" 
              name="cacheTtlMin"
              tooltip="Tiempo de vida en caché para no saturar Audatex"
              style={{ minWidth: 200 }}
            >
              <InputNumber min={1} max={60} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item 
              label="Sesión TTL (min)" 
              name="sessionTtlMin"
              tooltip="Tiempo máximo de la cookie de sesión de Audatex"
              style={{ minWidth: 200 }}
            >
              <InputNumber min={5} max={120} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item 
              label="Retraso Humano (ms)" 
              name="humanDelayMs"
              tooltip="Espera mínima entre requests al portal para imitar a un usuario"
              style={{ minWidth: 200 }}
            >
              <InputNumber min={200} max={5000} step={100} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 24 }}>
            <Button 
              type="dashed" 
              icon={<SyncOutlined spin={testing} />} 
              onClick={handleTestConnection}
              loading={testing}
            >
              Probar Conexión
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SaveOutlined />} 
              loading={saving}
            >
              Guardar Configuración
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default AudatexConfig;
