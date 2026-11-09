import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Tag,
  Spin,
  Switch,
  Typography,
  Card,
  Row,
  Col,
  Space,
  Button,
  message
} from 'antd';
import {
  MailOutlined,
  SendOutlined,
  FileExcelOutlined,
  UsergroupAddOutlined
} from '@ant-design/icons';
import reportesService from '../../api/reportes';
import { formatCurrency } from '../../utils/formatters';

const { Text } = Typography;

const ModalEnviarReporteEmail = ({
  visible,
  onCancel,
  tipoReporte = 'Repuestos',
  periodo,
  totales,
  metricasPersonalizadas,
  onEnviar
}) => {
  const [form] = Form.useForm();
  const [enviando, setEnviando] = useState(false);
  const [adminEmails, setAdminEmails] = useState([]);
  const [cargandoAdmins, setCargandoAdmins] = useState(false);

  const initialValues = {
    asunto: `Rodieja Contable - Reporte de ${tipoReporte} (${periodo || 'Mensual'})`,
    adjuntarExcel: true,
    mensaje: ''
  };

  useEffect(() => {
    if (visible) {
      let isMounted = true;
      const cargarAdmins = async () => {
        try {
          setCargandoAdmins(true);
          const admins = await reportesService.getDestinatariosAdmin();
          if (isMounted) {
            setAdminEmails(Array.isArray(admins) ? admins : []);
            form.setFieldsValue({
              asunto: `Rodieja Contable - Reporte de ${tipoReporte} (${periodo || 'Mensual'})`
            });
          }
        } catch (err) {
          console.warn('Error al cargar correos de administradores:', err);
        } finally {
          if (isMounted) setCargandoAdmins(false);
        }
      };
      cargarAdmins();
    }
  }, [visible, periodo, tipoReporte, form]);

  const handleFinish = async (values) => {
    try {
      setEnviando(true);
      await onEnviar({
        asunto: values.asunto,
        mensaje: values.mensaje,
        adjuntarExcel: values.adjuntarExcel !== false,
        periodo: periodo || 'Mensual'
      });
      message.success('Reporte enviado por correo exitosamente');
      form.resetFields();
      onCancel();
    } catch (error) {
      console.error('Error enviando reporte por correo:', error);
      const errMsg = error.response?.data?.error || error.message || 'Error al enviar el correo';
      message.error(errMsg);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <MailOutlined style={{ color: '#1890ff' }} />
          <span>Enviar Reporte de {tipoReporte} por Correo</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      width={600}
    >
      {/* Resumen previo de datos a enviar */}
      <Card
        size="small"
        style={{
          background: '#fafafa',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #f0f0f0'
        }}
      >
        <div style={{ marginBottom: (metricasPersonalizadas || totales) ? '12px' : '0' }}>
          <Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase' }}>Periodo / Rango:</Text>
          <Text strong style={{ marginLeft: '8px' }}>{periodo || 'Periodo Actual'}</Text>
        </div>

        {Array.isArray(metricasPersonalizadas) && metricasPersonalizadas.length > 0 ? (
          <Row gutter={12}>
            {metricasPersonalizadas.map((m, idx) => (
              <Col span={Math.floor(24 / metricasPersonalizadas.length)} key={idx}>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>{m.label}</Text>
                <Text strong style={{ color: m.color || '#262626' }}>{m.value}</Text>
              </Col>
            ))}
          </Row>
        ) : totales ? (
          <Row gutter={12}>
            <Col span={8}>
              <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>Ingresos</Text>
              <Text strong style={{ color: '#52c41a' }}>{formatCurrency(totales?.ingresos || 0)}</Text>
            </Col>
            <Col span={8}>
              <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>Egresos / Inversión</Text>
              <Text strong style={{ color: '#f5222d' }}>{formatCurrency(totales?.egresos || 0)}</Text>
            </Col>
            <Col span={8}>
              <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>Balance Neto</Text>
              <Text strong style={{ color: (totales?.balanceNeto || 0) >= 0 ? '#52c41a' : '#f5222d' }}>
                {formatCurrency(totales?.balanceNeto || 0)}
              </Text>
            </Col>
          </Row>
        ) : null}
      </Card>

      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleFinish}
      >
        {/* Destinatarios fijos a todos los administradores */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
            <UsergroupAddOutlined style={{ color: '#1890ff', marginRight: 6, fontSize: '15px' }} />
            <Text strong style={{ fontSize: '14px' }}>Destinatarios (Rol Administrador)</Text>
          </div>
          <div style={{
            background: '#fafafa',
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid #e8e8e8'
          }}>
            {cargandoAdmins ? (
              <Space>
                <Spin size="small" />
                <Text type="secondary" style={{ fontSize: '12px' }}>Cargando administradores...</Text>
              </Space>
            ) : adminEmails.length > 0 ? (
              <div>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 8 }}>
                  El reporte se enviará automáticamente a todos los usuarios con rol de Administrador:
                </Text>
                <Space size={[6, 8]} wrap>
                  {adminEmails.map(email => (
                    <Tag color="blue" key={email} icon={<MailOutlined />}>
                      {email}
                    </Tag>
                  ))}
                </Space>
              </div>
            ) : (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Se enviará a todos los administradores activos del sistema.
              </Text>
            )}
          </div>
        </div>

        <Form.Item
          label="Asunto"
          name="asunto"
          rules={[{ required: true, message: 'El asunto es requerido' }]}
        >
          <Input placeholder="Asunto del correo" />
        </Form.Item>

        <Form.Item
          label="Mensaje personalizado (opcional)"
          name="mensaje"
        >
          <Input.TextArea
            rows={3}
            placeholder="Escribe una nota o comentario para los destinatarios..."
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="adjuntarExcel"
          valuePropName="checked"
          style={{ marginBottom: '24px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '6px' }}>
            <Space>
              <FileExcelOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
              <div>
                <Text strong style={{ fontSize: '13px', display: 'block' }}>Adjuntar archivo Excel (.xlsx)</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>Incluye el desglose detallado de las operaciones de este reporte</Text>
              </div>
            </Space>
            <Switch defaultChecked />
          </div>
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button onClick={onCancel} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SendOutlined />}
            loading={enviando}
            style={{ borderRadius: '6px' }}
          >
            Enviar Reporte
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default ModalEnviarReporteEmail;
