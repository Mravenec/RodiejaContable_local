import React, { useState, useEffect } from 'react';
import { Drawer, Table, Button, Select, InputNumber, message, Space, Typography, Tag, Switch, Card, Row, Col, Divider, Tooltip } from 'antd';
import { CarOutlined, SendOutlined, StopOutlined, CheckOutlined, TagOutlined, DollarOutlined, ToolOutlined, CalendarOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;
const { Option } = Select;

const TIPOS_PIEZA = ['Original', 'Genérica', 'Usada'];
const RAZONES_NO_COTIZAR = [
  'Sin existencias',
  'No trabajamos la marca',
  'Pieza descontinuada',
  'No se vende por separado',
  'Otro'
];

const normalizeString = (str) => {
  if (!str) return '';
  return str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const CotizarDrawer = ({ visible, onClose, oportunidad, filtroRepuesto }) => {
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const mRepuesto = normalizeString(filtroRepuesto);
  const repuestosFiltrados = (oportunidad?.repuestos || []).map((r, idx) => ({ ...r, originalIdx: idx })).filter(r => {
    if (!mRepuesto) return true;
    return normalizeString(r['Grupo Pieza']).includes(mRepuesto) || 
           normalizeString(r['PartNumber']).includes(mRepuesto) || 
           normalizeString(r['Part Serial Number']).includes(mRepuesto) || 
           normalizeString(r['Descripcion Pieza']).includes(mRepuesto) ||
           normalizeString(r.descripcion).includes(mRepuesto);
  });

  useEffect(() => {
    if (visible && oportunidad) {
      const initialData = {};
      repuestosFiltrados.forEach((rep) => {
        initialData[rep.originalIdx] = {
          tiposPieza: [],
          plazos: {},
          precios: {},
          noCotizar: true,
          razon: null,
        };
      });
      setFormData(initialData);
    }
  }, [visible, oportunidad]);

  const updateRow = (idx, field, value) => {
    setFormData(prev => {
      const row = { ...prev[idx], [field]: value };
      if (field === 'tiposPieza' && value && value.length > 0) {
        row.noCotizar = false;
        row.razon = null;
      }
      if (field === 'noCotizar' && value === true) {
        row.tiposPieza = [];
        row.plazos = {};
        row.precios = {};
      }
      return { ...prev, [idx]: row };
    });
  };

  const updateSubRow = (idx, tipo, field, value) => {
    setFormData(prev => {
      const row = { ...prev[idx] };
      row[field] = { ...row[field], [tipo]: value };
      return { ...prev, [idx]: row };
    });
  };

  const handleSeleccionarTodosNoCotizar = () => {
    setFormData(prev => {
      const newData = { ...prev };
      repuestosFiltrados.forEach(rep => {
        const idx = rep.originalIdx;
        newData[idx] = {
          ...newData[idx],
          noCotizar: true,
          tiposPieza: [],
          plazos: {},
          precios: {},
          razon: 'Sin existencias',
        };
      });
      return newData;
    });
  };

  const handleEnviar = async () => {
    if (!oportunidad) return;
    
    const envios = [];

    for (let i = 0; i < repuestosFiltrados.length; i++) {
      const rep = repuestosFiltrados[i];
      const idx = rep.originalIdx;
      const row = formData[idx];
      const repuestoId = rep.id || rep.Id || (idx + 1);

      if (!row.noCotizar && row.tiposPieza && row.tiposPieza.length > 0) {
        let hasError = false;
        row.tiposPieza.forEach(tipo => {
          const precio = row.precios[tipo];
          const plazo = row.plazos[tipo];
          if (precio === null || precio === undefined) {
            message.error(`Por favor ingrese el precio para ${tipo} en el repuesto #${idx + 1}`);
            hasError = true;
          }
          if (plazo === null || plazo === undefined) {
            message.error(`Por favor ingrese el plazo de entrega para ${tipo} en el repuesto #${idx + 1}`);
            hasError = true;
          }

          if (!hasError) {
            envios.push({
              repuestoId: repuestoId,
              cotizacionId: oportunidad.cotizacionId,
              precioOfrecido: precio,
              tiempoEntrega: plazo.toString(),
              condicionPieza: tipo,
              notas: ''
            });
          }
        });
        if (hasError) return;
      }
    }

    if (envios.length === 0) {
      message.warning('No hay repuestos seleccionados para cotizar. Todo está marcado como "No Cotizar".');
      return;
    }

    setSubmitting(true);
    try {
      for (const envio of envios) {
        await fetch(`http://localhost:8080/api/audatex/cotizar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(envio)
        });
      }
      message.success('Cotización enviada exitosamente');
      onClose();
    } catch (error) {
      console.error('Error enviando cotización:', error);
      message.error('Ocurrió un error al enviar la cotización');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: '#',
      key: 'index',
      width: 40,
      render: (_, rep) => (
        <Tag color="geekblue" style={{ borderRadius: '12px' }}>{rep.originalIdx + 1}</Tag>
      ),
    },
    {
      title: 'Descripción Pieza',
      key: 'descripcion',
      width: 250,
      render: (_, rep) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: '13px' }}>
            <ToolOutlined style={{ marginRight: 6, color: '#1890ff' }} />
            {rep['Descripcion Pieza'] || rep.descripcion}
          </Text>
          {rep['PartNumber'] && (
            <Tag icon={<TagOutlined />} color="purple" style={{ marginTop: 4, borderRadius: '4px' }}>
              PN: {rep['PartNumber']}
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Estado',
      key: 'noCotizar',
      width: 110,
      align: 'center',
      render: (_, rep) => {
        const idx = rep.originalIdx;
        const isCotizando = !formData[idx]?.noCotizar;
        return (
          <Tooltip title={isCotizando ? "Se enviará cotización de los tipos seleccionados" : "Pieza descartada. No se enviará cotización."}>
            <Switch
              checked={isCotizando}
              onChange={(checked) => updateRow(idx, 'noCotizar', !checked)}
              checkedChildren={<CheckOutlined />}
              unCheckedChildren={<StopOutlined />}
              style={{ backgroundColor: isCotizando ? '#52c41a' : '#ff4d4f' }}
            />
            <div style={{ fontSize: '10px', marginTop: 4, color: isCotizando ? '#52c41a' : '#ff4d4f', fontWeight: 'bold' }}>
              {isCotizando ? 'COTIZANDO' : 'DESCARTADO'}
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: 'Tipo Pieza',
      key: 'tipoPieza',
      width: 200,
      render: (_, rep) => {
        const idx = rep.originalIdx;
        return (
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Seleccione..."
            value={formData[idx]?.tiposPieza}
            onChange={(val) => updateRow(idx, 'tiposPieza', val)}
            maxTagCount="responsive"
          >
            {TIPOS_PIEZA.map(t => <Option key={t} value={t}>{t}</Option>)}
          </Select>
        );
      }
    },
    {
      title: 'Plazo Entrega',
      key: 'plazoEntrega',
      width: 200,
      render: (_, rep) => {
        const idx = rep.originalIdx;
        const row = formData[idx];
        if (row?.noCotizar || !row?.tiposPieza || row.tiposPieza.length === 0) {
          return <InputNumber disabled style={{ width: '100%', borderRadius: 6 }} placeholder="Días" />;
        }
        return (
          <Space direction="vertical" style={{ width: '100%' }} size={6}>
            {row.tiposPieza.map(tipo => (
              <div key={tipo} style={{ display: 'flex', alignItems: 'center', background: '#f5f7fa', padding: '4px 8px', borderRadius: 6 }}>
                <Text strong style={{ fontSize: 10, width: 60, color: '#8c8c8c', textTransform: 'uppercase' }}>{tipo}</Text>
                <CalendarOutlined style={{ marginRight: 6, color: '#8c8c8c' }} />
                <InputNumber
                  min={0}
                  max={100}
                  style={{ width: '100%', flex: 1, borderRadius: 6 }}
                  value={row.plazos?.[tipo]}
                  onChange={(val) => updateSubRow(idx, tipo, 'plazos', val)}
                  placeholder="Días"
                  bordered={false}
                />
              </div>
            ))}
          </Space>
        );
      }
    },
    {
      title: 'Precio Ofrecido',
      key: 'precioItem',
      width: 220,
      render: (_, rep) => {
        const idx = rep.originalIdx;
        const row = formData[idx];
        if (row?.noCotizar || !row?.tiposPieza || row.tiposPieza.length === 0) {
          return <InputNumber disabled style={{ width: '100%', borderRadius: 6 }} placeholder="0.00" />;
        }
        return (
          <Space direction="vertical" style={{ width: '100%' }} size={6}>
            {row.tiposPieza.map(tipo => (
              <div key={tipo} style={{ display: 'flex', alignItems: 'center', background: '#e6f7ff', padding: '4px 8px', borderRadius: 6, border: '1px solid #91d5ff' }}>
                <Text strong style={{ fontSize: 10, width: 60, color: '#1890ff', textTransform: 'uppercase' }}>{tipo}</Text>
                <DollarOutlined style={{ marginRight: 6, color: '#1890ff' }} />
                <InputNumber
                  min={0}
                  step={0.01}
                  style={{ width: '100%', flex: 1, borderRadius: 6, fontWeight: 'bold', color: '#1890ff' }}
                  value={row.precios?.[tipo]}
                  onChange={(val) => updateSubRow(idx, tipo, 'precios', val)}
                  placeholder="Precio"
                  bordered={false}
                />
              </div>
            ))}
          </Space>
        );
      }
    }
  ];

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: 8 }}>
            <CarOutlined style={{ fontSize: 20, color: '#fff' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#fff', fontSize: '18px', fontWeight: 600, lineHeight: 1.2 }}>Cotización #{oportunidad?.cotizacionId || ''}</span>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 400 }}>Plataforma Audatex InPart</span>
          </div>
        </div>
      }
      styles={{
        header: { 
          background: 'linear-gradient(135deg, #09203f 0%, #537895 100%)', 
          borderBottom: 'none' 
        },
        closeIcon: { color: '#fff' }
      }}
      placement="right"
      width={1100}
      onClose={onClose}
      open={visible}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px' }}>
          <Button danger icon={<StopOutlined />} onClick={handleSeleccionarTodosNoCotizar}>
            Descartar Todas las Piezas
          </Button>
          <Button type="primary" size="large" icon={<SendOutlined />} onClick={handleEnviar} loading={submitting} style={{ background: 'linear-gradient(90deg, #1890ff, #096dd9)', border: 'none', boxShadow: '0 4px 14px rgba(24, 144, 255, 0.4)' }}>
            Enviar Cotización Audatex
          </Button>
        </div>
      }
    >
      <Card 
        size="small" 
        style={{ marginBottom: 20, background: '#f0f5ff', border: '1px solid #adc6ff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Space>
              <CarOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <div>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Vehículo de la Oportunidad</Text>
                <Text strong style={{ fontSize: 16 }}>{oportunidad?.marca || oportunidad?.armadora} {oportunidad?.modelo} {oportunidad?.anio}</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Tag color="geekblue" style={{ padding: '4px 12px', fontSize: 14, borderRadius: 16 }}>
              {repuestosFiltrados.length} piezas en esta vista
            </Tag>
          </Col>
        </Row>
      </Card>

      <Table
        dataSource={repuestosFiltrados}
        columns={columns}
        rowKey={(record) => record.originalIdx}
        pagination={false}
        size="small"
        bordered
      />
    </Drawer>
  );
};

export default CotizarDrawer;
