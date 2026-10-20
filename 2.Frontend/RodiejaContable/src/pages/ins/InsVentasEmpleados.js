import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Table, Button, Row, Col, Typography, Statistic,
  Select, Tag, message, Modal, Input, Space, Descriptions
} from 'antd';
import {
  ReloadOutlined, SearchOutlined, EyeOutlined, UserOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  DollarOutlined, ShoppingCartOutlined, TeamOutlined
} from '@ant-design/icons';
import { audatexAPI } from '../../api/audatex';
import { useEmpleados } from '../../hooks/useEmpleados';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const formatColones = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '₡0';
  return `₡${new Intl.NumberFormat('es-CR').format(Math.round(val))}`;
};

const parsearFechaHora = (record) => {
  const rawFecha = record.fecha || '';
  let parsedDayjs = null;

  if (rawFecha && rawFecha.includes('/')) {
    const parts = rawFecha.split(/[\s/:]+/);
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      const hour = parts[3] ? parseInt(parts[3], 10) : 0;
      const min = parts[4] ? parseInt(parts[4], 10) : 0;
      parsedDayjs = dayjs(new Date(year, month, day, hour, min));
    }
  } else if (rawFecha) {
    parsedDayjs = dayjs(rawFecha);
  } else if (record.fechaCreacion) {
    parsedDayjs = dayjs(record.fechaCreacion);
  }

  const isValid = parsedDayjs && parsedDayjs.isValid();
  const horaTexto = isValid ? parsedDayjs.format('HH:mm') : (record.hora || '--:--');
  const fechaTexto = isValid ? parsedDayjs.format('DD/MM/YYYY') : (rawFecha || '-');

  return {
    dayjsObj: isValid ? parsedDayjs : null,
    fechaTexto,
    horaTexto,
    horaNum: isValid ? parsedDayjs.hour() : -1,
    minutoNum: isValid ? parsedDayjs.minute() : 0,
    anio: isValid ? parsedDayjs.year() : null,
    mes: isValid ? parsedDayjs.month() + 1 : null
  };
};

const evaluarHorarioComision = (record) => {
  if (record.porcentajeComision) {
    const pct = Number(record.porcentajeComision);
    return { porcentaje: pct, esDentro: pct === 3 };
  }
  const { horaNum, minutoNum } = parsearFechaHora(record);
  if (horaNum === -1) {
    return { porcentaje: 3, esDentro: true };
  }
  const minutos = horaNum * 60 + minutoNum;
  // Horario regular: 08:00 a 17:00
  const esDentro = minutos >= (8 * 60) && minutos <= (17 * 60);
  return { porcentaje: esDentro ? 3 : 5, esDentro };
};

const getVehiculoTexto = (row) => {
  let datosCot = {};
  try {
    if (row.datosCotizacion) {
      datosCot = typeof row.datosCotizacion === 'string' ? JSON.parse(row.datosCotizacion) : row.datosCotizacion;
    } else if (row.detalleJson) {
      const parsed = typeof row.detalleJson === 'string' ? JSON.parse(row.detalleJson) : row.detalleJson;
      datosCot = parsed.datosCotizacion || parsed;
    } else if (row.detalle_json) {
      const parsed = typeof row.detalle_json === 'string' ? JSON.parse(row.detalle_json) : row.detalle_json;
      datosCot = parsed.datosCotizacion || parsed;
    }
  } catch (e) {}

  const desc = datosCot['Descripción'] || datosCot['Descripcion'] || '';
  const arm = row.armadora || datosCot['Armadora'] || datosCot['Marca'] || '';
  const anio = datosCot['Año Modelo'] || datosCot['Año Fabricación'] || row.anio || '';
  const placa = row.matricula || datosCot['Matricula'] || datosCot['Placa'] || '';

  let nombreVehiculo = '';
  if (row.vehiculo && row.vehiculo.trim() && !row.vehiculo.startsWith('CAS-')) {
    nombreVehiculo = row.vehiculo;
  } else if (desc) {
    nombreVehiculo = `${desc}${anio ? ` (${anio})` : ''}`;
  } else if (arm) {
    nombreVehiculo = `${arm} ${anio ? `(${anio})` : ''}`.trim();
  } else {
    nombreVehiculo = 'Vehículo Desc.';
  }

  return {
    nombre: nombreVehiculo,
    placa: placa ? `Placa: ${placa}` : '',
    siniestro: row.siniestro || datosCot['Número Siniestro'] || ''
  };
};

const InsVentasEmpleados = () => {
  const [loading, setLoading] = useState(false);
  const [pedidosRaw, setPedidosRaw] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [modalDetalleVisible, setModalDetalleVisible] = useState(false);
  const [empleadoDetalle, setEmpleadoDetalle] = useState(null);

  const { data: empleadosData = [] } = useEmpleados();

  const [filtros, setFiltros] = useState({
    anio: dayjs().year(),
    mes: null, // null = todos los meses
  });

  // Cargar pedidos
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const resPedidos = await audatexAPI.obtenerPedidos();
      const rawList = Array.isArray(resPedidos.data)
        ? resPedidos.data
        : (Array.isArray(resPedidos.data?.pedidos) ? resPedidos.data.pedidos : []);

      // Obtener asignaciones locales de localStorage
      let localAsignaciones = {};
      try {
        localAsignaciones = JSON.parse(localStorage.getItem('pedidos_ins_asignaciones') || '{}');
      } catch (e) {}

      // Fusionar asignaciones sin descartar cancelados para alimentar los 3 bloques
      const fusionados = rawList.map(p => {
        const local = localAsignaciones[p.id];
        const empleadoId = p.empleadoId || local?.empleadoId || null;
        const empleadoNombre = p.empleadoNombre || local?.empleadoNombre || null;
        const porcentajeComision = p.porcentajeComision || local?.porcentajeComision || null;
        const estado = p.estado;
        return {
          ...p,
          empleadoId,
          empleadoNombre,
          porcentajeComision,
          estado
        };
      });

      setPedidosRaw(fusionados);
    } catch (error) {
      console.error('Error al cargar pedidos y comisiones:', error);
      message.error('Error al cargar datos de ventas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Agrupar pedidos por colaborador
  const procesarGrupo = useCallback((listaPedidos, esCancelado = false) => {
    const anioFiltro = filtros.anio;
    const mesFiltro = filtros.mes;
    const empleadosMap = {};

    let totalComisiones = 0;
    let totalVentas = 0;
    let totalPedidos = 0;

    listaPedidos.forEach(p => {
      const empId = p.empleadoId;
      const empNom = p.empleadoNombre;
      if (!empId && !empNom) return;

      const infoFecha = parsearFechaHora(p);
      if (anioFiltro && infoFecha.anio && infoFecha.anio !== anioFiltro) return;
      if (mesFiltro && infoFecha.mes && infoFecha.mes !== mesFiltro) return;

      const key = empId ? `id_${empId}` : `nom_${empNom}`;
      if (!empleadosMap[key]) {
        let nombreFinal = empNom;
        if (!nombreFinal && empId) {
          const empObj = empleadosData.find(e => e.id === empId);
          nombreFinal = empObj ? (empObj.nombres || empObj.nombre) : `Empleado #${empId}`;
        }

        empleadosMap[key] = {
          empleado_id: empId || key,
          empleado: nombreFinal || 'Sin nombre',
          total_pedidos: 0,
          total_ventas: 0,
          total_comision: 0,
          pedidos_ordinarios: 0,
          pedidos_fuera_horario: 0,
          pedidos_detalle: []
        };
      }

      const total = Number(p.totalPedido) || 0;
      const evalCom = evaluarHorarioComision(p);
      const comisionCalculada = esCancelado ? 0 : (total * evalCom.porcentaje) / 100;
      const comisionPotencial = (total * evalCom.porcentaje) / 100;

      empleadosMap[key].total_pedidos += 1;
      empleadosMap[key].total_ventas += total;
      empleadosMap[key].total_comision += comisionCalculada;

      if (evalCom.esDentro) {
        empleadosMap[key].pedidos_ordinarios += 1;
      } else {
        empleadosMap[key].pedidos_fuera_horario += 1;
      }

      empleadosMap[key].pedidos_detalle.push({
        id: p.id,
        numeroPedido: p.numeroPedido || `ID-${p.id}`,
        siniestro: p.siniestro,
        vehiculo: p.vehiculo,
        armadora: p.armadora,
        matricula: p.matricula,
        datosCotizacion: p.datosCotizacion,
        detalleJson: p.detalleJson,
        detalle_json: p.detalle_json,
        fechaTexto: infoFecha.fechaTexto,
        horaTexto: infoFecha.horaTexto,
        totalPedido: total,
        porcentaje: evalCom.porcentaje,
        esDentro: evalCom.esDentro,
        comision: esCancelado ? comisionPotencial : comisionCalculada,
        estado: p.estado
      });

      totalComisiones += comisionCalculada;
      totalVentas += total;
      totalPedidos += 1;
    });

    let filas = Object.values(empleadosMap);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      filas = filas.filter(f => f.empleado.toLowerCase().includes(q));
    }
    filas.sort((a, b) => b.total_comision - a.total_comision || b.total_pedidos - a.total_pedidos);

    return {
      filas,
      totalComisiones,
      totalVentas,
      totalPedidos,
      totalEmpleados: filas.length
    };
  }, [filtros, busqueda, empleadosData]);

  // Partición en los 3 bloques solicitados
  const datosBloques = useMemo(() => {
    const list = Array.isArray(pedidosRaw) ? pedidosRaw : [];

    // 1. Entregados: SOLO entregados
    const entregadosList = list.filter(p => (p.estado || '').toLowerCase() === 'entregado');
    const bloqueEntregados = procesarGrupo(entregadosList, false);

    // 2. En espera: estados en proceso / pendientes (no entregados, no cancelados)
    const enEsperaList = list.filter(p => {
      const est = (p.estado || '').toLowerCase();
      return est !== 'entregado' && est !== 'cancelado';
    });
    const bloqueEnEspera = procesarGrupo(enEsperaList, false);

    // 3. Cancelados: solo cancelados con empleado asignado
    const canceladosList = list.filter(p => {
      const est = (p.estado || '').toLowerCase();
      return est === 'cancelado' && (Boolean(p.empleadoId) || Boolean(p.empleadoNombre));
    });
    const bloqueCancelados = procesarGrupo(canceladosList, true);

    return {
      bloqueEntregados,
      bloqueEnEspera,
      bloqueCancelados
    };
  }, [pedidosRaw, procesarGrupo]);

  const handleVerDetalle = (emp, tipoBloque) => {
    setEmpleadoDetalle({ ...emp, tipoBloque });
    setModalDetalleVisible(true);
  };

  const getColumns = (tipoBloque) => [
    {
      title: 'Empleado',
      dataIndex: 'empleado',
      key: 'empleado',
      render: (text) => (
        <Space>
          <UserOutlined style={{ color: '#2563eb' }} />
          <Text strong style={{ color: '#1e40af' }}>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Pedidos',
      dataIndex: 'total_pedidos',
      key: 'total_pedidos',
      align: 'center',
      render: (val) => (
        <Tag
          color={tipoBloque === 'entregados' ? 'green' : tipoBloque === 'en_espera' ? 'blue' : 'red'}
          style={{ fontWeight: 600 }}
        >
          {val} {val === 1 ? 'pedido' : 'pedidos'}
        </Tag>
      ),
    },
    {
      title: 'Horario',
      key: 'horarios',
      render: (_, record) => (
        <Space size={4}>
          {record.pedidos_ordinarios > 0 && (
            <Tag color="success">3% ({record.pedidos_ordinarios})</Tag>
          )}
          {record.pedidos_fuera_horario > 0 && (
            <Tag color="warning">5% ({record.pedidos_fuera_horario})</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Ventas',
      dataIndex: 'total_ventas',
      key: 'total_ventas',
      align: 'right',
      render: (val) => formatColones(val)
    },
    {
      title: tipoBloque === 'cancelados' ? 'Estado' : 'Comisión',
      dataIndex: 'total_comision',
      key: 'total_comision',
      align: 'right',
      render: (val) => {
        if (tipoBloque === 'cancelados') {
          return <Tag color="error">Cancelado (₡0)</Tag>;
        }
        return (
          <Text strong style={{ color: tipoBloque === 'entregados' ? '#16a34a' : '#2563eb', fontSize: 14 }}>
            {formatColones(val)}
          </Text>
        );
      },
    },
    {
      title: 'Acción',
      key: 'acciones',
      align: 'center',
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleVerDetalle(record, tipoBloque)}
        >
          Ver Detalle
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '8px' }}>
      {/* Encabezado Conciso */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
          Ventas Empleados INS
        </Title>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={cargarDatos}
          loading={loading}
          style={{ background: '#2563eb' }}
        >
          Recargar
        </Button>
      </div>

      {/* Barra de Filtros */}
      <Card size="small" style={{ borderRadius: 8, marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle" justify="space-between">
          <Col xs={24} sm={8}>
            <Input
              placeholder="Buscar empleado..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={16} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Select
                placeholder="Año"
                style={{ width: 100 }}
                value={filtros.anio}
                onChange={(val) => setFiltros({ ...filtros, anio: val })}
                allowClear
              >
                {[2024, 2025, 2026, 2027].map(anio => (
                  <Option key={anio} value={anio}>{anio}</Option>
                ))}
              </Select>
              <Select
                placeholder="Mes (Todos)"
                style={{ width: 130 }}
                value={filtros.mes}
                onChange={(val) => setFiltros({ ...filtros, mes: val })}
                allowClear
              >
                {[
                  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                ].map((mes, idx) => (
                  <Option key={idx + 1} value={idx + 1}>{mes}</Option>
                ))}
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Dashboard Resumen */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <Statistic
              title={<Text strong style={{ color: '#15803d' }}>Comisiones Efectivas</Text>}
              value={datosBloques.bloqueEntregados.totalComisiones}
              formatter={(val) => formatColones(val)}
              valueStyle={{ color: '#16a34a', fontWeight: 700, fontSize: 20 }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <Statistic
              title={<Text strong style={{ color: '#1d4ed8' }}>Comisiones en Espera</Text>}
              value={datosBloques.bloqueEnEspera.totalComisiones}
              formatter={(val) => formatColones(val)}
              valueStyle={{ color: '#2563eb', fontWeight: 700, fontSize: 20 }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, background: '#faf5ff', border: '1px solid #e9d5ff' }}>
            <Statistic
              title={<Text strong style={{ color: '#6b21a8' }}>Total Pedidos Asignados</Text>}
              value={datosBloques.bloqueEntregados.totalPedidos + datosBloques.bloqueEnEspera.totalPedidos}
              suffix={<span style={{ fontSize: 12, color: '#6b7280' }}>({datosBloques.bloqueCancelados.totalPedidos} canc.)</span>}
              valueStyle={{ color: '#7c3aed', fontWeight: 700, fontSize: 20 }}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a' }}>
            <Statistic
              title={<Text strong style={{ color: '#b45309' }}>Colaboradores</Text>}
              value={Math.max(datosBloques.bloqueEntregados.totalEmpleados, datosBloques.bloqueEnEspera.totalEmpleados)}
              valueStyle={{ color: '#d97706', fontWeight: 700, fontSize: 20 }}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* BLOQUE 1: ENTREGADOS */}
      <Card
        size="small"
        style={{
          borderRadius: 8,
          marginBottom: 16,
          borderLeft: '4px solid #16a34a',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
        }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space size={8}>
              <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 16 }} />
              <span style={{ fontSize: 16, fontWeight: 700 }}>Entregados</span>
              <Tag color="success">{datosBloques.bloqueEntregados.totalPedidos}</Tag>
            </Space>
            <Space size={14}>
              <Text type="secondary">Ventas: <strong>{formatColones(datosBloques.bloqueEntregados.totalVentas)}</strong></Text>
              <Text style={{ color: '#16a34a' }}>Comisión: <strong style={{ fontSize: 15 }}>{formatColones(datosBloques.bloqueEntregados.totalComisiones)}</strong></Text>
            </Space>
          </div>
        }
      >
        <Table
          size="middle"
          columns={getColumns('entregados')}
          dataSource={datosBloques.bloqueEntregados.filas}
          loading={loading}
          rowKey="empleado_id"
          pagination={{ pageSize: 5, showSizeChanger: true }}
          locale={{ emptyText: 'No hay pedidos entregados' }}
        />
      </Card>

      {/* BLOQUE 2: EN ESPERA */}
      <Card
        size="small"
        style={{
          borderRadius: 8,
          marginBottom: 16,
          borderLeft: '4px solid #2563eb',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
        }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space size={8}>
              <ClockCircleOutlined style={{ color: '#2563eb', fontSize: 16 }} />
              <span style={{ fontSize: 16, fontWeight: 700 }}>En espera</span>
              <Tag color="processing">{datosBloques.bloqueEnEspera.totalPedidos}</Tag>
            </Space>
            <Space size={14}>
              <Text type="secondary">Ventas: <strong>{formatColones(datosBloques.bloqueEnEspera.totalVentas)}</strong></Text>
              <Text style={{ color: '#2563eb' }}>Comisión pendiente: <strong style={{ fontSize: 15 }}>{formatColones(datosBloques.bloqueEnEspera.totalComisiones)}</strong></Text>
            </Space>
          </div>
        }
      >
        <Table
          size="middle"
          columns={getColumns('en_espera')}
          dataSource={datosBloques.bloqueEnEspera.filas}
          loading={loading}
          rowKey="empleado_id"
          pagination={{ pageSize: 5, showSizeChanger: true }}
          locale={{ emptyText: 'No hay pedidos en espera' }}
        />
      </Card>

      {/* BLOQUE 3: CANCELADOS */}
      <Card
        size="small"
        style={{
          borderRadius: 8,
          marginBottom: 16,
          borderLeft: '4px solid #dc2626',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
        }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space size={8}>
              <CloseCircleOutlined style={{ color: '#dc2626', fontSize: 16 }} />
              <span style={{ fontSize: 16, fontWeight: 700 }}>Cancelados</span>
              <Tag color="error">{datosBloques.bloqueCancelados.totalPedidos}</Tag>
            </Space>
            <Space size={14}>
              <Text type="secondary">Ventas canceladas: <strong>{formatColones(datosBloques.bloqueCancelados.totalVentas)}</strong></Text>
              <Tag color="error">Comisión: ₡0</Tag>
            </Space>
          </div>
        }
      >
        <Table
          size="middle"
          columns={getColumns('cancelados')}
          dataSource={datosBloques.bloqueCancelados.filas}
          loading={loading}
          rowKey="empleado_id"
          pagination={{ pageSize: 5, showSizeChanger: true }}
          locale={{ emptyText: 'No hay pedidos cancelados con empleado asignado' }}
        />
      </Card>

      {/* Modal de Detalle */}
      <Modal
        title={
          <Space>
            <UserOutlined style={{ color: '#2563eb' }} />
            <span>
              {empleadoDetalle?.empleado} — {empleadoDetalle?.tipoBloque === 'entregados' ? 'Entregados' : empleadoDetalle?.tipoBloque === 'en_espera' ? 'En espera' : 'Cancelados'}
            </span>
          </Space>
        }
        open={modalDetalleVisible}
        onCancel={() => {
          setModalDetalleVisible(false);
          setEmpleadoDetalle(null);
        }}
        footer={[
          <Button key="cerrar" type="primary" onClick={() => setModalDetalleVisible(false)}>
            Cerrar
          </Button>
        ]}
        width={750}
      >
        {empleadoDetalle && (
          <div>
            <Descriptions size="small" column={{ xs: 1, sm: 3 }} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="Pedidos">
                <strong>{empleadoDetalle.total_pedidos}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Total Ventas">
                <strong>{formatColones(empleadoDetalle.total_ventas)}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Comisión">
                <strong style={{ color: empleadoDetalle.tipoBloque === 'cancelados' ? '#dc2626' : '#16a34a' }}>
                  {empleadoDetalle.tipoBloque === 'cancelados' ? '₡0' : formatColones(empleadoDetalle.total_comision)}
                </strong>
              </Descriptions.Item>
            </Descriptions>

            <Table
              size="small"
              dataSource={empleadoDetalle.pedidos_detalle || []}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              columns={[
                {
                  title: 'Pedido',
                  dataIndex: 'numeroPedido',
                  key: 'numeroPedido',
                  render: (text) => <Text strong style={{ color: '#1e40af' }}>{text}</Text>
                },
                {
                  title: 'Fecha/Hora',
                  key: 'fecha',
                  render: (_, r) => `${r.fechaTexto} ${r.horaTexto}`
                },
                {
                  title: 'Vehículo',
                  key: 'vehiculo',
                  render: (_, r) => {
                    const veh = getVehiculoTexto(r);
                    return (
                      <Space direction="vertical" size={2}>
                        <Text strong style={{ fontSize: 13 }}>{veh.nombre}</Text>
                        <Space size={6} wrap>
                          {veh.placa && <Tag color="cyan" style={{ fontSize: 11 }}>{veh.placa}</Tag>}
                          {veh.siniestro && <Text type="secondary" style={{ fontSize: 11 }}>Sin: {veh.siniestro}</Text>}
                        </Space>
                      </Space>
                    );
                  }
                },
                {
                  title: 'Estado',
                  dataIndex: 'estado',
                  key: 'estado',
                  render: (est) => (
                    <Tag color={
                      (est || '').toLowerCase() === 'entregado' ? 'success' :
                      (est || '').toLowerCase().includes('procesamiento') ? 'blue' :
                      (est || '').toLowerCase() === 'cancelado' ? 'red' : 'orange'
                    }>
                      {est || 'Pendiente'}
                    </Tag>
                  )
                },
                {
                  title: 'Venta',
                  dataIndex: 'totalPedido',
                  key: 'totalPedido',
                  align: 'right',
                  render: (val) => formatColones(val)
                },
                {
                  title: '%',
                  key: 'porcentaje',
                  align: 'center',
                  render: (_, r) => (
                    <Tag color={r.esDentro ? 'success' : 'warning'}>
                      {r.porcentaje}%
                    </Tag>
                  )
                },
                {
                  title: 'Comisión',
                  dataIndex: 'comision',
                  key: 'comision',
                  align: 'right',
                  render: (val) => (
                    <Text strong style={{ color: empleadoDetalle.tipoBloque === 'cancelados' ? '#94a3b8' : '#16a34a' }}>
                      {empleadoDetalle.tipoBloque === 'cancelados' ? '₡0' : formatColones(val)}
                    </Text>
                  )
                }
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InsVentasEmpleados;
