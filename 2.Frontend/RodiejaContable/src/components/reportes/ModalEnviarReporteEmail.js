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
  UsergroupAddOutlined,
  CarOutlined,
  ScheduleOutlined,
  UserOutlined,
  ToolOutlined,
  BulbOutlined,
  InboxOutlined
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
  statsVendidos,
  vehiculosVendidos,
  gastosOperativos,
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
      width={tipoReporte === 'Vehículos' || gastosOperativos ? 680 : 600}
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

        {/* Resumen de Vehículos Vendidos si aplica */}
        {(tipoReporte === 'Vehículos' || (Array.isArray(vehiculosVendidos) && vehiculosVendidos.length > 0)) && (
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #d9d9d9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <Text strong style={{ fontSize: '13px' }}>
                <CarOutlined style={{ marginRight: 6, color: '#1890ff' }} />Vehículos Vendidos en el Periodo
              </Text>
              <Tag color={(statsVendidos?.cantidad || vehiculosVendidos?.length || 0) > 0 ? 'success' : 'default'} style={{ borderRadius: '10px' }}>
                {(statsVendidos?.cantidad ?? vehiculosVendidos?.length ?? 0)} vendidos
              </Tag>
            </div>

            <Row gutter={8} style={{ marginBottom: (vehiculosVendidos && vehiculosVendidos.length > 0) ? '10px' : '0' }}>
              <Col span={6}>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>Inversión Vendidos</Text>
                <Text style={{ fontSize: '12px', color: '#595959' }}>
                  {formatCurrency(statsVendidos?.totInversion || 0)}
                </Text>
              </Col>
              <Col span={6}>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>Total Ventas</Text>
                <Text style={{ fontSize: '12px', color: '#1890ff' }}>
                  {formatCurrency(statsVendidos?.totVenta || 0)}
                </Text>
              </Col>
              <Col span={6}>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>Total Recuperado</Text>
                <Text style={{ fontSize: '12px', color: '#52c41a' }}>
                  {formatCurrency(statsVendidos?.totRecuperado || statsVendidos?.totVenta || 0)}
                </Text>
              </Col>
              <Col span={6}>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>Ganancia Neta (ROI)</Text>
                <Text strong style={{ fontSize: '12px', color: (statsVendidos?.ganancia || 0) >= 0 ? '#52c41a' : '#f5222d' }}>
                  {(statsVendidos?.ganancia || 0) >= 0 ? '+' : ''}{formatCurrency(statsVendidos?.ganancia || 0)}
                  <span style={{ fontSize: '11px', marginLeft: '4px', fontWeight: 'normal' }}>
                    ({(statsVendidos?.margen || 0).toFixed(1)}%)
                  </span>
                </Text>
              </Col>
            </Row>

            {Array.isArray(vehiculosVendidos) && vehiculosVendidos.length > 0 && (
              <div style={{
                maxHeight: '140px',
                overflowY: 'auto',
                marginTop: '8px',
                border: '1px solid #f0f0f0',
                borderRadius: '6px',
                background: '#ffffff'
              }}>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0', color: '#8c8c8c' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Código</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Vehículo</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Venta</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Recuperado</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Ganancia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehiculosVendidos.map((v, i) => {
                      const inv = Number(v.inversionTotal ?? v.inversion_total ?? 0);
                      const ven = Number(v.precioVenta ?? v.precio_venta ?? 0);
                      const rec = Number(v.costoRecuperado ?? v.costo_recuperado ?? (ven || 0));
                      const gan = rec - inv;
                      const nombre = `${v.marca || v.marcaNombre || ''} ${v.modelo || ''} ${v.anio || ''}`.trim() || `ID #${v.id}`;
                      return (
                        <tr key={v.id || i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#1890ff' }}>{v.codigoVehiculo || '-'}</td>
                          <td style={{ padding: '5px 8px', color: '#262626' }}>{nombre}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right' }}>{formatCurrency(ven || rec)}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', color: '#52c41a' }}>{formatCurrency(rec)}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, color: gan >= 0 ? '#52c41a' : '#f5222d' }}>
                            {gan >= 0 ? '+' : ''}{formatCurrency(gan)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Resumen de Gastos Operativos si aplica (Reporte de Repuestos y Operaciones) */}
        {gastosOperativos && (
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #d9d9d9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <Text strong style={{ fontSize: '13px' }}>
                <ScheduleOutlined style={{ marginRight: 6, color: '#fa8c16' }} />Gastos Operativos y Administrativos
              </Text>
              <Tag color="orange" style={{ borderRadius: '10px', fontWeight: 600 }}>
                Total: {formatCurrency(gastosOperativos.total || 0)}
              </Tag>
            </div>

            <Row gutter={8}>
              <Col span={6}>
                <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '6px', padding: '6px 8px', textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: '10px', display: 'block', color: '#d46b08', fontWeight: 600 }}>
                    <UserOutlined style={{ marginRight: 4 }} />Salarios
                  </Text>
                  <Text strong style={{ fontSize: '12px', color: '#ad4e00' }}>
                    {formatCurrency(gastosOperativos.salarios || 0)}
                  </Text>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '6px', padding: '6px 8px', textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: '10px', display: 'block', color: '#389e0d', fontWeight: 600 }}>
                    <ToolOutlined style={{ marginRight: 4 }} />Mantenimiento
                  </Text>
                  <Text strong style={{ fontSize: '12px', color: '#237804' }}>
                    {formatCurrency(gastosOperativos.mantenimiento || 0)}
                  </Text>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '6px', padding: '6px 8px', textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: '10px', display: 'block', color: '#096dd9', fontWeight: 600 }}>
                    <BulbOutlined style={{ marginRight: 4 }} />Servicios
                  </Text>
                  <Text strong style={{ fontSize: '12px', color: '#0050b3' }}>
                    {formatCurrency(gastosOperativos.serviciosPublicos || 0)}
                  </Text>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '6px', padding: '6px 8px', textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: '10px', display: 'block', color: '#595959', fontWeight: 600 }}>
                    <InboxOutlined style={{ marginRight: 4 }} />Otros
                  </Text>
                  <Text strong style={{ fontSize: '12px', color: '#262626' }}>
                    {formatCurrency(gastosOperativos.otros || 0)}
                  </Text>
                </div>
              </Col>
            </Row>
          </div>
        )}
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
