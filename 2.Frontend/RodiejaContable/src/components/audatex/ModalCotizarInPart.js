import React, { useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Button, Descriptions, Typography, Tag, message, Row, Col } from 'antd';
import { SendOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { audatexService } from '../../api';

const { Text } = Typography;
const { Option } = Select;

const ModalCotizarInPart = ({ visible, onClose, oportunidad, repuesto, onExito }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  if (!oportunidad || !repuesto) return null;

  const handleFinish = async (values) => {
    try {
      setLoading(true);
      const payload = {
        cotizacionId: oportunidad.cotizacionId,
        aseguradora: oportunidad.aseguradora,
        vehiculo: `${oportunidad.armadora || oportunidad.marca || ''} ${oportunidad.modelo || ''}`.trim(),
        siniestro: oportunidad.cotizacionId, // Fallback
        totalPedido: (values.precio * values.cantidad) + (values.costoEnvio || 0),
        estado: 'COTIZADO',
        notas: values.notas,
      };

      const response = await audatexService.enviarCotizacion(payload);
      
      if (response.data?.mensaje) {
        message.success('Cotización enviada exitosamente al portal de Audatex InPart');
        if (onExito) onExito();
        onClose();
      } else {
        message.error('No se pudo verificar el envío de la cotización en el portal');
      }
    } catch (error) {
      console.error('Error enviando cotización:', error);
      message.error(error.message || 'Error al enviar la cotización a Audatex');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f0f0f0', paddingBottom: '12px' }}>
          <SendOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
          <span style={{ fontSize: '16px', fontWeight: 600 }}>Cotizar Oportunidad en Audatex InPart</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<SendOutlined />}
          loading={loading}
          onClick={() => form.submit()}
          style={{ background: '#52c41a', borderColor: '#52c41a' }}
        >
          Enviar Cotización
        </Button>,
      ]}
      width={600}
      destroyOnClose
    >
      <div style={{ padding: '16px 0' }}>
        <Descriptions title="Detalles de la Oportunidad" bordered column={1} size="small" style={{ marginBottom: '20px' }}>
          <Descriptions.Item label="Aseguradora">
            <Tag color="blue">{oportunidad.aseguradora}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Cotización ID (WAN)">
            <Text code>{oportunidad.cotizacionId}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Vehículo / Armadora">
            {oportunidad.armadora}
          </Descriptions.Item>
          <Descriptions.Item label="Taller / Póliza">
            {oportunidad.taller} (Póliza: {oportunidad.poliza || 'N/A'})
          </Descriptions.Item>
        </Descriptions>

        <Descriptions title="Repuesto a Ofrecer" bordered column={1} size="small" style={{ marginBottom: '24px' }}>
          <Descriptions.Item label="Código Repuesto">
            <Text strong>{repuesto.codigo}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Descripción">
            {repuesto.descripcion}
          </Descriptions.Item>
          <Descriptions.Item label="Precio de Lista (Sugerido)">
            <Text type="success" strong style={{ fontSize: '15px' }}>
              ₡{new Intl.NumberFormat('es-CR').format(repuesto.precioVenta || 0)}
            </Text>
          </Descriptions.Item>
        </Descriptions>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{
            precio: repuesto.precioVenta || 0,
            tiempo: '24h',
            condicion: repuesto.condicion || 'USADO',
            cantidad: 1,
            costoEnvio: 0,
            notas: '',
          }}
        >
          <Form.Item
            name="precio"
            label={<span style={{ fontWeight: 600 }}>Precio Ofrecido (₡)</span>}
            rules={[{ required: true, message: 'Por favor ingrese el precio de venta' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/₡\s?|(,*)/g, '')}
              min={1}
              size="large"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="tiempo"
                label={<span style={{ fontWeight: 600 }}>Tiempo de Entrega</span>}
                rules={[{ required: true, message: 'Seleccione un tiempo de entrega' }]}
              >
                <Select placeholder="Seleccione tiempo" size="large">
                  <Option value="Inmediata">Entrega Inmediata</Option>
                  <Option value="24h">24 Horas</Option>
                  <Option value="48h">48 Horas</Option>
                  <Option value="72h">72 Horas</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="condicion"
                label={<span style={{ fontWeight: 600 }}>Condición de la Pieza</span>}
                rules={[{ required: true, message: 'Seleccione la condición' }]}
              >
                <Select placeholder="Seleccione condición" size="large">
                  <Option value="NUEVO">Nuevo</Option>
                  <Option value="USADO">Usado en buen estado</Option>
                  <Option value="REPARADO">Reparado / Reconstruido</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="cantidad"
                label={<span style={{ fontWeight: 600 }}>Cantidad</span>}
                rules={[{ required: true, message: 'Ingrese la cantidad' }]}
              >
                <InputNumber style={{ width: '100%' }} min={1} size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="costoEnvio"
                label={<span style={{ fontWeight: 600 }}>Costo de Envío (₡)</span>}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value.replace(/₡\s?|(,*)/g, '')}
                  min={0}
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notas"
            label={<span style={{ fontWeight: 600 }}>Notas (opcional)</span>}
          >
            <Input.TextArea rows={3} placeholder="Ingrese comentarios adicionales para el ajustador..." />
          </Form.Item>
        </Form>

        <div style={{ display: 'flex', gap: '8px', background: '#e6f7ff', border: '1px solid #91d5ff', padding: '10px 14px', borderRadius: '4px', marginTop: '16px' }}>
          <InfoCircleOutlined style={{ color: '#1890ff', marginTop: '3px' }} />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Esta acción enviará la cotización directamente al portal de Audatex InPart bajo la cuenta configurada. No es posible deshacer la acción desde este panel una vez enviada.
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default ModalCotizarInPart;
