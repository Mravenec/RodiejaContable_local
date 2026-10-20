import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Table, Typography, Tag, Button, message, Space, Input, DatePicker,
  TimePicker, Row, Col, Select, Modal, Descriptions, Divider
} from 'antd';
import {
  ReloadOutlined, SearchOutlined, DownloadOutlined, FilterOutlined,
  CheckCircleOutlined, ClockCircleOutlined, UserOutlined, FileTextOutlined
} from '@ant-design/icons';
import { audatexAPI } from '../../api/audatex';
import { useEmpleados } from '../../hooks/useEmpleados';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx-js-style';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const getSafeString = (val) => (val && val !== 'null' && val !== '-' ? String(val).trim() : '');

const getDetalleJson = (row) => {
  if (row._parsedDetalle) return row._parsedDetalle;
  let datos = {};
  try {
    if (row.detalleJson) {
      datos = typeof row.detalleJson === 'string' ? JSON.parse(row.detalleJson) : row.detalleJson;
    } else if (row.detalle_json) {
      datos = typeof row.detalle_json === 'string' ? JSON.parse(row.detalle_json) : row.detalle_json;
    } else if (row.datosCotizacion) {
      datos = typeof row.datosCotizacion === 'string' ? JSON.parse(row.datosCotizacion) : row.datosCotizacion;
    }
  } catch (e) {
    // Ignore JSON parse errors
  }
  row._parsedDetalle = datos || {};
  return row._parsedDetalle;
};

const getMarcaSegura = (row) => {
  let m = getSafeString(row.marca) || getSafeString(row.armadora);
  if (m) return m;
  const d = getDetalleJson(row);
  return d['Marca'] || d['Armadora'] || 'Desc.';
};

const getModeloSeguro = (row) => {
  let m = getSafeString(row.modelo);
  if (m) return m;
  const d = getDetalleJson(row);
  return d['Modelo'] || d['Descripción'] || d['Descripcion'] || '-';
};

const getAnioSeguro = (row) => {
  let a = getSafeString(row.anio);
  if (a) return a;
  const d = getDetalleJson(row);
  return d['Año Modelo'] || d['Año Fabricación'] || d['Ano Modelo'] || '-';
};

const getPlacaSegura = (row) => {
  if (row.matricula) return row.matricula;
  const d = getDetalleJson(row);
  return d['matricula'] || d['Matricula'] || d['Placa'] || '-';
};

const normalizeString = (str) => (str || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const formatColones = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '₡0';
  return `₡${new Intl.NumberFormat('es-CR').format(val)}`;
};

const defaultFiltros = {
  busqueda: '',
  desde: dayjs().subtract(60, 'day'),
  hasta: dayjs().add(1, 'day'),
  horaInicio: dayjs('08:00', 'HH:mm'),
  horaFin: dayjs('17:00', 'HH:mm'),
  estadoFacturacion: 'todos' // 'todos', 'facturados', 'pendientes'
};

const InsPedidos = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const [filtros, setFiltros] = useState({ ...defaultFiltros });
  const [appliedFiltros, setAppliedFiltros] = useState({ ...defaultFiltros });

  // Empleados disponibles
  const { data: empleadosData = [] } = useEmpleados();
  const empleadosActivos = useMemo(() => {
    return (empleadosData || []).filter(e => e.activo !== false && e.activo !== 0);
  }, [empleadosData]);

  // Modal de Detalle y Asignación
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [empleadoSeleccionadoId, setEmpleadoSeleccionadoId] = useState(null);
  const [porcentajeManual, setPorcentajeManual] = useState(null);

  // Cargar pedidos desde audatex_pedidos (mismo origen que PedidosAudatex.js)
  const cargarPedidos = useCallback(async () => {
    try {
      setLoading(true);
      const res = await audatexAPI.obtenerPedidos();
      const rawList = Array.isArray(res.data) 
        ? res.data 
        : (Array.isArray(res.data?.pedidos) ? res.data.pedidos : []);
      
      // Leer asignaciones guardadas en localStorage
      let localAsignaciones = {};
      try {
        localAsignaciones = JSON.parse(localStorage.getItem('pedidos_ins_asignaciones') || '{}');
      } catch (e) {}

      // Excluir estrictamente los pedidos cancelados y fusionar asignaciones sin alterar el estado del pedido
      const fusionados = rawList
        .filter(p => (p.estado || '').toLowerCase() !== 'cancelado')
        .map(p => {
          const local = localAsignaciones[p.id];
          if (local) {
            return {
              ...p,
              empleadoId: p.empleadoId || local.empleadoId,
              empleadoNombre: p.empleadoNombre || local.empleadoNombre,
              porcentajeComision: p.porcentajeComision || local.porcentajeComision,
              // Mantener intacto el estado original que viene del mapeo de pedidos / Audatex
              estado: p.estado
            };
          }
          return p;
        });

      setPedidos(fusionados);
    } catch (err) {
      console.error('Error cargando pedidos INS desde Audatex:', err);
      message.error('No se pudieron cargar los pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarPedidos();
  }, [cargarPedidos]);

  // Extraer fecha y hora en formato estandarizado
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
      minutoNum: isValid ? parsedDayjs.minute() : 0
    };
  };

  // Evaluar si la hora del pedido está dentro del rango horario regular
  const evaluarHorarioComision = (record, horaInicio, horaFin) => {
    if (record.porcentajeComision) {
      const esDentro = record.porcentajeComision === 3;
      return {
        porcentaje: record.porcentajeComision,
        esDentro,
        etiqueta: esDentro ? '3% (Dentro de horario)' : '5% (Fuera de horario)'
      };
    }

    const { horaNum, minutoNum } = parsearFechaHora(record);
    if (horaNum === -1) {
      return { porcentaje: 3, esDentro: true, etiqueta: '3% (Horario estándar)' };
    }

    const minutosPedido = horaNum * 60 + minutoNum;
    const hInicio = horaInicio ? (horaInicio.hour() * 60 + horaInicio.minute()) : (8 * 60);
    const hFin = horaFin ? (horaFin.hour() * 60 + horaFin.minute()) : (17 * 60);

    const esDentro = minutosPedido >= hInicio && minutosPedido <= hFin;
    const porcentaje = esDentro ? 3 : 5;
    return {
      porcentaje,
      esDentro,
      etiqueta: esDentro ? '3% (Dentro de horario)' : '5% (Fuera de horario)'
    };
  };

  // Filtrado de pedidos
  const pedidosFiltrados = useMemo(() => {
    const list = Array.isArray(pedidos) ? pedidos : [];
    const q = normalizeString(appliedFiltros.busqueda);
    const estadoFact = appliedFiltros.estadoFacturacion;
    const fDesde = appliedFiltros.desde ? appliedFiltros.desde.startOf('day').valueOf() : null;
    const fHasta = appliedFiltros.hasta ? appliedFiltros.hasta.endOf('day').valueOf() : null;

    return list.filter((p) => {
      // Excluir cancelados
      if ((p.estado || '').toLowerCase() === 'cancelado') return false;

      // Filtro de facturación
      const estaFacturado = (p.estado || '').toLowerCase() === 'entregado' || Boolean(p.transaccionId);
      if (estadoFact === 'facturados' && !estaFacturado) return false;
      if (estadoFact === 'pendientes' && estaFacturado) return false;

      // Búsqueda libre
      if (q) {
        const numPed = normalizeString(p.numeroPedido);
        const cotId = normalizeString(p.cotizacionId);
        const sin = normalizeString(p.siniestro);
        const veh = normalizeString(getMarcaSegura(p) + ' ' + getModeloSeguro(p));
        const emp = normalizeString(p.empleadoNombre);
        const match = numPed.includes(q) || cotId.includes(q) || sin.includes(q) || veh.includes(q) || emp.includes(q);
        if (!match) return false;
      }

      // Rango de fechas
      if (fDesde && fHasta) {
        const { dayjsObj } = parsearFechaHora(p);
        if (dayjsObj) {
          const ms = dayjsObj.valueOf();
          if (ms < fDesde || ms > fHasta) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const msA = parsearFechaHora(a).dayjsObj?.valueOf() || 0;
      const msB = parsearFechaHora(b).dayjsObj?.valueOf() || 0;
      return msB - msA;
    });
  }, [pedidos, appliedFiltros]);

  // Abrir modal de detalle al hacer clic en la fila
  const handleAbrirDetalle = (record) => {
    setSelectedPedido(record);
    const evalHorario = evaluarHorarioComision(record, appliedFiltros.horaInicio, appliedFiltros.horaFin);
    setEmpleadoSeleccionadoId(record.empleadoId || null);
    setPorcentajeManual(record.porcentajeComision || evalHorario.porcentaje);
    setModalVisible(true);
  };

  // Confirmar facturación y asignar empleado
  const handleConfirmarFacturacion = async () => {
    if (!selectedPedido) return;
    if (!empleadoSeleccionadoId) {
      message.warning('Por favor selecciona el empleado responsable del pedido');
      return;
    }

    try {
      setProcesando(true);
      const emp = empleadosActivos.find(e => e.id === empleadoSeleccionadoId);
      const empNombre = emp ? (emp.nombres || emp.nombre) : 'Empleado';
      const pct = porcentajeManual || 3;

      // 1. Guardar en localStorage para persistencia instantánea y permanente en el cliente
      try {
        const stored = JSON.parse(localStorage.getItem('pedidos_ins_asignaciones') || '{}');
        stored[selectedPedido.id] = {
          empleadoId: empleadoSeleccionadoId,
          empleadoNombre: empNombre,
          porcentajeComision: pct
        };
        localStorage.setItem('pedidos_ins_asignaciones', JSON.stringify(stored));
      } catch (e) {
        console.warn('Error guardando en localStorage:', e);
      }

      // 2. Enviar al backend asignación de empleado y comisión (sin cambiar estado del pedido)
      try {
        if (audatexAPI.asignarEmpleado) {
          await audatexAPI.asignarEmpleado(selectedPedido.id, {
            empleadoId: empleadoSeleccionadoId,
            porcentajeComision: pct
          });
        }
      } catch (errAsignar) {
        console.warn('Backend asignar error, fallback local activo:', errAsignar);
      }

      // 3. Actualizar memoria inmediata conservando el estado del pedido intacto
      selectedPedido.empleadoId = empleadoSeleccionadoId;
      selectedPedido.empleadoNombre = empNombre;
      selectedPedido.porcentajeComision = pct;

      message.success(`¡Empleado ${empNombre} asignado al pedido #${selectedPedido.numeroPedido || selectedPedido.id} exitosamente!`);
      setModalVisible(false);
      await cargarPedidos();
    } catch (err) {
      console.error('Error al asignar empleado al pedido:', err);
      message.error(err.response?.data?.error || 'Error al procesar la asignación del empleado');
    } finally {
      setProcesando(false);
    }
  };

  // Exportación a Excel
  const handleExportarExcel = () => {
    if (!pedidosFiltrados.length) {
      message.warning('No hay pedidos para exportar');
      return;
    }

    const wb = XLSX.utils.book_new();
    const data = pedidosFiltrados.map((p) => {
      const evalCom = evaluarHorarioComision(p, appliedFiltros.horaInicio, appliedFiltros.horaFin);
      const total = Number(p.totalPedido) || 0;
      const comision = (total * evalCom.porcentaje) / 100;
      const { fechaTexto, horaTexto } = parsearFechaHora(p);

      return {
        'No. Pedido': p.numeroPedido || '-',
        'Cotización ID': p.cotizacionId || '-',
        'Siniestro': p.siniestro || '-',
        'Aseguradora': p.aseguradora || 'INS',
        'Marca': getMarcaSegura(p),
        'Modelo': getModeloSeguro(p),
        'Año': getAnioSeguro(p),
        'Placa': getPlacaSegura(p),
        'Fecha': fechaTexto,
        'Hora': horaTexto,
        'Total (₡)': total,
        'Comisión (%)': `${evalCom.porcentaje}%`,
        'Monto Comisión (₡)': comision,
        'Horario Comisión': evalCom.esDentro ? 'Dentro de horario' : 'Fuera de horario',
        'Empleado': p.empleadoNombre || 'Sin asignar',
        'Estado': p.estado || '-'
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos_INS');
    XLSX.writeFile(wb, `pedidos_ins_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`);
    message.success(`Exportados ${data.length} pedidos a Excel`);
  };

  const columns = [
    {
      title: 'No. Pedido',
      dataIndex: 'numeroPedido',
      key: 'numeroPedido',
      render: (text, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: '#1e40af' }}>{text || 'S/N'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>Cot: {record.cotizacionId || '-'}</Text>
        </Space>
      )
    },
    {
      title: 'Vehículo / Siniestro',
      key: 'vehiculo',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{getMarcaSegura(record)} {getModeloSeguro(record)} ({getAnioSeguro(record)})</Text>
          <Space size={6}>
            <Tag color="cyan">Placa: {getPlacaSegura(record)}</Tag>
            {record.siniestro && <Text type="secondary" style={{ fontSize: 12 }}>Sin: {record.siniestro}</Text>}
          </Space>
        </Space>
      )
    },
    {
      title: 'Fecha y Hora',
      key: 'fechaHora',
      render: (_, record) => {
        const { fechaTexto, horaTexto } = parsearFechaHora(record);
        return (
          <Space direction="vertical" size={2}>
            <Text>{fechaTexto}</Text>
            <Tag icon={<ClockCircleOutlined />} color="default" style={{ fontWeight: 600 }}>
              {horaTexto}
            </Tag>
          </Space>
        );
      }
    },
    {
      title: 'Total Pedido',
      dataIndex: 'totalPedido',
      key: 'totalPedido',
      align: 'right',
      render: (val) => (
        <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
          {formatColones(val)}
        </Text>
      )
    },
    {
      title: 'Comisión',
      key: 'comision',
      align: 'center',
      render: (_, record) => {
        const evalCom = evaluarHorarioComision(record, appliedFiltros.horaInicio, appliedFiltros.horaFin);
        const monto = Number(record.totalPedido) || 0;
        const comisionCalculada = record.comisionCalculada || (monto * (evalCom.porcentaje / 100));

        return (
          <Space direction="vertical" size={2} align="center">
            {evalCom.esDentro ? (
              <Tag color="success" style={{ fontWeight: 600 }}>
                ● 3% Ordinario
              </Tag>
            ) : (
              <Tag color="warning" style={{ fontWeight: 600 }}>
                ● 5% Fuera Horario
              </Tag>
            )}
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatColones(comisionCalculada)}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Empleado Asignado',
      key: 'empleado',
      render: (_, record) => {
        if (record.empleadoNombre) {
          return (
            <Tag color="blue" icon={<UserOutlined />} style={{ fontWeight: 600, padding: '4px 8px' }}>
              {record.empleadoNombre}
            </Tag>
          );
        }
        return <Tag color="default">Sin asignar</Tag>;
      }
    },
    {
      title: 'Estado',
      key: 'estadoFacturacion',
      align: 'center',
      render: (_, record) => {
        const est = record.estado || 'Pendiente';
        const estLower = est.toLowerCase();
        if (estLower === 'entregado') {
          return <Tag color="green" icon={<CheckCircleOutlined />}>Entregado</Tag>;
        }
        if (estLower.includes('procesamiento')) {
          return <Tag color="blue" icon={<ClockCircleOutlined />}>{est}</Tag>;
        }
        if (estLower.includes('aguardando')) {
          return <Tag color="gold" icon={<ClockCircleOutlined />}>{est}</Tag>;
        }
        return <Tag color="orange">{est}</Tag>;
      }
    },
    {
      title: 'Acción',
      key: 'acciones',
      align: 'center',
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          size="middle"
          icon={<UserOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            handleAbrirDetalle(record);
          }}
        >
          {record.empleadoNombre ? 'Reasignar' : 'Asignar Empleado'}
        </Button>
      )
    }
  ];

  const dataSourceSafe = Array.isArray(pedidosFiltrados) ? pedidosFiltrados : [];

  return (
    <div style={{ padding: '24px' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            Pedidos INS
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Visor operativo de pedidos activos Audatex/INS (excluye cancelados) con liquidación de comisiones (3% horario regular / 5% fuera de horario) y asignación de empleado.
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={cargarPedidos} loading={loading}>
            Refrescar
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportarExcel} style={{ background: '#10b981', color: '#fff', borderColor: '#10b981' }}>
            Exportar Excel
          </Button>
        </Space>
      </div>

      {/* Barra de Filtros */}
      <Card
        bordered={false}
        style={{ marginBottom: 20, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        bodyStyle={{ padding: 18 }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={6}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Búsqueda Rápida</div>
            <Input
              placeholder="Pedido, cotización, vehículo, empleado..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={filtros.busqueda}
              onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
              allowClear
            />
          </Col>
          <Col xs={24} md={7}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Rango de Fechas (Pedido)</div>
            <RangePicker
              value={[filtros.desde, filtros.hasta]}
              onChange={(dates) => setFiltros({ ...filtros, desde: dates ? dates[0] : null, hasta: dates ? dates[1] : null })}
              format="YYYY-MM-DD"
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} md={5}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
              Rango Horario Regular (3%)
            </div>
            <TimePicker.RangePicker
              value={[filtros.horaInicio, filtros.horaFin]}
              onChange={(times) => setFiltros({ ...filtros, horaInicio: times ? times[0] : null, horaFin: times ? times[1] : null })}
              format="HH:mm"
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} md={4}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Estado Contable</div>
            <Select
              value={filtros.estadoFacturacion}
              onChange={(val) => setFiltros({ ...filtros, estadoFacturacion: val })}
              style={{ width: '100%' }}
              options={[
                { value: 'todos', label: 'Todos los activos' },
                { value: 'pendientes', label: 'Pendientes' },
                { value: 'facturados', label: 'Entregados / Facturados' }
              ]}
            />
          </Col>
          <Col xs={24} md={2} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button
              type="primary"
              icon={<FilterOutlined />}
              onClick={() => setAppliedFiltros({ ...filtros })}
              style={{ width: '100%', background: '#2563eb' }}
            >
              Filtrar
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Tabla Principal */}
      <Card
        bordered={false}
        style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          columns={columns}
          dataSource={dataSourceSafe}
          rowKey={(r) => r.id || r.numeroPedido || r.cotizacionId || Math.random()}
          loading={loading}
          pagination={{ pageSize: 12, showTotal: (total) => `${total} pedidos activos` }}
          scroll={{ x: 'max-content' }}
          onRow={(record) => ({
            onClick: () => handleAbrirDetalle(record),
            style: { cursor: 'pointer' }
          })}
        />
      </Card>

      {/* Modal / Dialog de Detalle y Asignación de Empleado */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileTextOutlined style={{ color: '#2563eb', fontSize: 20 }} />
            <span>Detalle del Pedido #{selectedPedido?.numeroPedido || selectedPedido?.cotizacionId}</span>
            {(() => {
              const est = selectedPedido?.estado || 'Pendiente';
              const estLower = est.toLowerCase();
              const color = estLower === 'entregado' ? 'success' :
                            estLower.includes('procesamiento') ? 'blue' :
                            estLower.includes('aguardando') ? 'gold' : 'orange';
              return <Tag color={color}>{est}</Tag>;
            })()}
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={780}
        footer={[
          <Button key="cerrar" onClick={() => setModalVisible(false)}>
            Cerrar
          </Button>,
          <Button
            key="asignar"
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={procesando}
            onClick={handleConfirmarFacturacion}
            style={{ background: '#2563eb', borderColor: '#2563eb' }}
          >
            Guardar Asignación de Empleado
          </Button>
        ]}
      >
        {selectedPedido && (
          <div>
            {/* Resumen del Vehículo y Siniestro */}
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Vehículo">
                <strong>{getMarcaSegura(selectedPedido)} {getModeloSeguro(selectedPedido)} ({getAnioSeguro(selectedPedido)})</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Placa">
                <Tag color="blue">{getPlacaSegura(selectedPedido)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="No. Pedido">
                <strong>{selectedPedido.numeroPedido || '-'}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Cotización ID">
                {selectedPedido.cotizacionId || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="No. Siniestro">
                {selectedPedido.siniestro || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha y Hora">
                {parsearFechaHora(selectedPedido).fechaTexto} {parsearFechaHora(selectedPedido).horaTexto}
              </Descriptions.Item>
            </Descriptions>

            {/* Repuestos del Pedido */}
            <Divider orientation="left" style={{ margin: '16px 0 10px', fontSize: 13 }}>
              Repuestos Solicitados
            </Divider>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 12 }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Descripción</th>
                  <th style={{ padding: '6px 8px' }}>Tipo Pieza</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>Cantidad</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Precio Ofrecido</th>
                </tr>
              </thead>
              <tbody>
                {!selectedPedido.items || selectedPedido.items.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 12, textAlign: 'center', color: '#94a3b8' }}>
                      Información de piezas consolidada en el total del pedido
                    </td>
                  </tr>
                ) : (
                  selectedPedido.items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '6px 8px' }}>{it.descripcion || '-'}</td>
                      <td style={{ padding: '6px 8px' }}>{it.tipoPieza || 'Original'}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>{it.cantidad || 1}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 500 }}>
                        {formatColones(it.precioOfrecido)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Cuadro de Liquidación de Comisión */}
            <Divider orientation="left" style={{ margin: '16px 0 10px', fontSize: 13 }}>
              Liquidación y Regla de Comisión
            </Divider>
            {(() => {
              const evalCom = evaluarHorarioComision(selectedPedido, appliedFiltros.horaInicio, appliedFiltros.horaFin);
              const total = Number(selectedPedido.totalPedido) || 0;
              const pct = porcentajeManual || evalCom.porcentaje;
              const comisionFinal = (total * pct) / 100;

              return (
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                  <Row gutter={[16, 8]} align="middle">
                    <Col xs={24} sm={12}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Evaluación por Horario:</Text>
                      <div style={{ marginTop: 4 }}>
                        {evalCom.esDentro ? (
                          <Tag color="success" style={{ fontSize: 13, padding: '4px 8px' }}>
                            ● Hora {parsearFechaHora(selectedPedido).horaTexto}: Dentro de horario regular (3%)
                          </Tag>
                        ) : (
                          <Tag color="warning" style={{ fontSize: 13, padding: '4px 8px' }}>
                            ● Hora {parsearFechaHora(selectedPedido).horaTexto}: Fuera de horario regular (5%)
                          </Tag>
                        )}
                      </div>
                    </Col>
                    <Col xs={24} sm={12} style={{ textAlign: 'right' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Comisión Estimada:</Text>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>
                        {formatColones(comisionFinal)} ({pct}%)
                      </div>
                    </Col>
                  </Row>
                </div>
              );
            })()}

            {/* Selección del Empleado Responsable */}
            <div style={{ background: '#eff6ff', padding: 16, borderRadius: 8, border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <UserOutlined style={{ color: '#2563eb', fontSize: 16 }} />
                <Text strong style={{ color: '#1e40af' }}>Empleado Responsable del Pedido:</Text>
              </div>
              <Select
                placeholder="Seleccione el empleado que gestionó este pedido..."
                value={empleadoSeleccionadoId}
                onChange={(val) => setEmpleadoSeleccionadoId(val)}
                style={{ width: '100%' }}
                size="large"
                showSearch
                optionFilterProp="children"
              >
                {empleadosActivos.map((emp) => (
                  <Option key={emp.id} value={emp.id}>
                    {emp.nombres || emp.nombre} {emp.apellidos || ''} {emp.puesto ? `(${emp.puesto})` : ''}
                  </Option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InsPedidos;
