import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Table, Typography, Tag, Button, message, Space, Input, DatePicker,
  TimePicker, Row, Col, Select, Modal, Descriptions, Divider, Alert
} from 'antd';
import {
  ReloadOutlined, SearchOutlined, DownloadOutlined, FilterOutlined,
  CheckCircleOutlined, ClockCircleOutlined, UserOutlined, FileTextOutlined,
  UpOutlined, DownOutlined
} from '@ant-design/icons';
import { audatexAPI } from '../../api/audatex';
import { useAuth } from '../../context/AuthContext';
import usersService from '../../api/users';
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
  estadoFacturacion: 'todos', // 'todos', 'facturados', 'pendientes'
  usuarioId: 'todos'
};

const InsPedidos = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const [filtros, setFiltros] = useState({ ...defaultFiltros });
  const [appliedFiltros, setAppliedFiltros] = useState({ ...defaultFiltros });
  const [mostrarFiltros, setMostrarFiltros] = useState(true);

  const handleLimpiar = () => {
    setFiltros({ ...defaultFiltros });
    setAppliedFiltros({ ...defaultFiltros });
  };

  const handleFiltrar = () => {
    setAppliedFiltros({ ...filtros });
  };

  const { user } = useAuth();
  const esAdmin = (user?.rol || '').toUpperCase() === 'ADMIN';
  const currentUserId = user?.id || user?.userId || null;
  const currentUserName = user?.nombre || user?.email || 'Mi Usuario';

  const [usuariosData, setUsuariosData] = useState([]);
  const usuariosActivos = useMemo(() => {
    return (usuariosData || []).filter(u => u.activo !== false);
  }, [usuariosData]);

  const cargarUsuarios = useCallback(async () => {
    try {
      const res = await usersService.getUsers();
      setUsuariosData(res.data || res || []);
    } catch (e) {
      console.warn('Error cargando usuarios en PedidosIns:', e);
    }
  }, []);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  // Modal de Detalle y Asignación
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [usuarioSeleccionadoId, setUsuarioSeleccionadoId] = useState(null);
  const [porcentajeManual, setPorcentajeManual] = useState(null);

  // Cargar pedidos desde audatex_pedidos (mismo origen que PedidosAudatex.js)
  const cargarPedidos = useCallback(async () => {
    try {
      setLoading(true);
      const res = await audatexAPI.obtenerPedidos();
      const rawList = Array.isArray(res.data) 
        ? res.data 
        : (Array.isArray(res.data?.pedidos) ? res.data.pedidos : []);
      
      // Limpiar claves obsoletas de localStorage para que la base de datos sea la única fuente de la verdad
      try {
        localStorage.removeItem('pedidos_ins_asignaciones');
      } catch (e) {}

      // Excluir estrictamente los pedidos cancelados usando los datos reales de BD
      const fusionados = rawList
        .filter(p => (p.estado || '').toLowerCase() !== 'cancelado')
        .map(p => {
          const empId = p.userId || p.usuarioId || p.empleadoId || null;
          let empNom = p.usuarioNombre || p.empleadoNombre || null;
          if (!empNom && empId) {
            const uFound = (usuariosData || []).find(u => Number(u.id) === Number(empId));
            if (uFound) empNom = uFound.nombre || uFound.email;
          }
          return {
            ...p,
            userId: empId,
            usuarioId: empId,
            empleadoId: empId,
            usuarioNombre: empNom,
            empleadoNombre: empNom
          };
        });

      setPedidos(fusionados);
    } catch (err) {
      console.error('Error cargando pedidos INS desde Audatex:', err);
      message.error('No se pudieron cargar los pedidos');
    } finally {
      setLoading(false);
    }
  }, [usuariosData]);

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
  const evaluarHorarioComision = useCallback((record, horaInicio, horaFin) => {
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
  }, []);

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

      // Filtro de usuario responsable
      if (appliedFiltros.usuarioId && appliedFiltros.usuarioId !== 'todos') {
        const asigId = p.usuarioId || p.userId || p.empleadoId;
        if (appliedFiltros.usuarioId === 'sin_asignar') {
          if (asigId) return false;
        } else {
          if (Number(asigId) !== Number(appliedFiltros.usuarioId)) return false;
        }
      }

      // Búsqueda libre
      if (q) {
        const numPed = normalizeString(p.numeroPedido);
        const cotId = normalizeString(p.cotizacionId);
        const sin = normalizeString(p.siniestro);
        const veh = normalizeString(getMarcaSegura(p) + ' ' + getModeloSeguro(p));
        const emp = normalizeString(p.usuarioNombre || p.empleadoNombre);
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

  // Indicadores KPI consolidados (estilo Oportunidades)
  const stats = useMemo(() => {
    const list = Array.isArray(pedidosFiltrados) ? pedidosFiltrados : [];
    let montoTotal = 0;
    let totalComision = 0;
    let asignadosAMi = 0;

    list.forEach((p) => {
      const evalCom = evaluarHorarioComision(p, appliedFiltros.horaInicio, appliedFiltros.horaFin);
      const items = Array.isArray(p.items) ? p.items : [];
      const total = Number(p.totalPedido) || (items.length > 0 ? items.reduce((acc, it) => acc + (Number(it.precioOfrecido || 0) * Number(it.cantidad || 1)), 0) : 0);
      const pct = p.porcentajeComision || evalCom.porcentaje;
      const com = p.comisionCalculada != null ? Number(p.comisionCalculada) : (total * pct) / 100;
      montoTotal += total;
      totalComision += com;

      const asigId = p.usuarioId || p.userId || p.empleadoId;
      if (currentUserId && Number(asigId) === Number(currentUserId)) {
        asignadosAMi++;
      }
    });

    return {
      total: list.length,
      montoTotal,
      totalComision,
      asignadosAMi
    };
  }, [pedidosFiltrados, appliedFiltros.horaInicio, appliedFiltros.horaFin, currentUserId, evaluarHorarioComision]);

  // Abrir modal de detalle al hacer clic en la fila
  const handleAbrirDetalle = (record) => {
    setSelectedPedido(record);
    const evalHorario = evaluarHorarioComision(record, appliedFiltros.horaInicio, appliedFiltros.horaFin);
    const asigId = record.usuarioId || record.userId || record.empleadoId || null;
    if (esAdmin) {
      setUsuarioSeleccionadoId(asigId ? Number(asigId) : null);
    } else {
      setUsuarioSeleccionadoId(asigId ? Number(asigId) : (currentUserId ? Number(currentUserId) : null));
    }
    setPorcentajeManual(record.porcentajeComision || evalHorario.porcentaje);
    setModalVisible(true);
  };

  // Confirmar facturación y asignar usuario
  const handleConfirmarFacturacion = async () => {
    if (!selectedPedido) return;
    const idToAssign = esAdmin ? usuarioSeleccionadoId : (usuarioSeleccionadoId || currentUserId);
    if (!idToAssign) {
      message.warning('Por favor selecciona el usuario responsable del pedido');
      return;
    }

    const actualAsigId = selectedPedido.usuarioId || selectedPedido.userId || selectedPedido.empleadoId;
    if (!esAdmin && actualAsigId && Number(actualAsigId) !== Number(currentUserId)) {
      message.error('No tienes permisos para reasignar un pedido de otro usuario');
      return;
    }

    try {
      setProcesando(true);
      const uFound = usuariosActivos.find(u => Number(u.id) === Number(idToAssign));
      const uNombre = uFound ? (uFound.nombre || uFound.email) : (Number(idToAssign) === Number(currentUserId) ? currentUserName : `Usuario #${idToAssign}`);
      const pct = porcentajeManual || 3;

      // 1. Enviar al backend asignación de usuario y comisión (persiste directamente en BD)
      try {
        if (audatexAPI.asignarUsuario) {
          await audatexAPI.asignarUsuario(selectedPedido.id, {
            usuarioId: idToAssign,
            userId: idToAssign,
            empleadoId: idToAssign,
            porcentajeComision: pct
          });
        } else if (audatexAPI.asignarEmpleado) {
          await audatexAPI.asignarEmpleado(selectedPedido.id, {
            usuarioId: idToAssign,
            userId: idToAssign,
            empleadoId: idToAssign,
            porcentajeComision: pct
          });
        }
      } catch (errAsignar) {
        console.warn('Backend asignar error:', errAsignar);
      }

      // 3. Actualizar memoria inmediata conservando el estado del pedido intacto
      selectedPedido.usuarioId = idToAssign;
      selectedPedido.userId = idToAssign;
      selectedPedido.usuarioNombre = uNombre;
      selectedPedido.empleadoId = idToAssign;
      selectedPedido.empleadoNombre = uNombre;
      selectedPedido.porcentajeComision = pct;

      message.success(`¡Usuario ${uNombre} asignado al pedido #${selectedPedido.numeroPedido || selectedPedido.id} exitosamente!`);
      setModalVisible(false);
      await cargarPedidos();
    } catch (err) {
      console.error('Error al asignar usuario al pedido:', err);
      message.error(err.response?.data?.error || 'Error al procesar la asignación del usuario');
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
        'Empleado': p.usuarioNombre || p.empleadoNombre || 'Sin asignar',
        'Usuario Responsable': p.usuarioNombre || p.empleadoNombre || 'Sin asignar',
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
      title: 'Usuario Responsable',
      key: 'usuario',
      render: (_, record) => {
        const uNombre = record.usuarioNombre || record.empleadoNombre;
        const uId = record.usuarioId || record.empleadoId;
        const esMio = currentUserId && Number(uId) === Number(currentUserId);
        if (uNombre) {
          return (
            <Tag color={esMio ? 'blue' : 'geekblue'} icon={<UserOutlined />} style={{ fontWeight: 600, padding: '4px 8px' }}>
              {uNombre} {esMio ? ' (Tú)' : ''}
            </Tag>
          );
        }
        return <Tag color="default" style={{ fontStyle: 'italic' }}>Sin asignar</Tag>;
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
      render: (_, record) => {
        const uId = record.usuarioId || record.empleadoId;
        const esMio = currentUserId && Number(uId) === Number(currentUserId);

        let btnText = 'Asignar';
        if (uId) {
          btnText = esAdmin ? 'Reasignar' : (esMio ? 'Gestionar' : 'Ver Detalle');
        } else {
          btnText = esAdmin ? 'Asignar' : 'Autoasignarme';
        }

        return (
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
            {btnText}
          </Button>
        );
      }
    }
  ];

  const dataSourceSafe = Array.isArray(pedidosFiltrados) ? pedidosFiltrados : [];

  return (
    <div style={{ padding: '24px' }}>
      {/* Encabezado Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Space>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            Pedidos INS
          </Title>
          <Tag color="blue" style={{ fontWeight: 600 }}>Audatex / InPart</Tag>
          <Text type="secondary">{pedidosFiltrados.length} pedidos</Text>
        </Space>
        <Space>
          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={cargarPedidos}
            loading={loading}
            style={{ color: '#1890ff', borderColor: '#1890ff', borderRadius: '8px' }}
          >
            Refrescar
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExportarExcel}
            style={{ background: '#52c41a', borderColor: '#52c41a', borderRadius: '8px' }}
          >
            Exportar Excel
          </Button>
        </Space>
      </div>

      {/* Indicadores KPI (solo Total Activos y Asignados a mí) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: 600, letterSpacing: '0.05em' }}>TOTAL ACTIVOS</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#52c41a' }}>{stats.total}</div>
        </div>
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: 600, letterSpacing: '0.05em' }}>ASIGNADOS A MÍ</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#2563eb' }}>{stats.asignadosAMi}</div>
        </div>
      </div>

      {/* Barra de Filtros de Búsqueda */}
      <Card
        bordered={false}
        style={{
          marginBottom: '24px',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
          background: '#ffffff'
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mostrarFiltros ? '20px' : '0' }}>
          <Title level={5} style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setMostrarFiltros(!mostrarFiltros)}>
            <FilterOutlined style={{ marginRight: '8px', color: '#3b82f6' }} />
            Filtros de Búsqueda
            {mostrarFiltros ? <UpOutlined style={{ marginLeft: '8px', fontSize: '12px', color: '#94a3b8' }} /> : <DownOutlined style={{ marginLeft: '8px', fontSize: '12px', color: '#94a3b8' }} />}
          </Title>
          <Space>
            <Button onClick={handleLimpiar} style={{ borderRadius: '8px' }}>Limpiar</Button>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleFiltrar} style={{ borderRadius: '8px', background: '#3b82f6' }}>Filtrar</Button>
          </Space>
        </div>

        {mostrarFiltros && (
          <Row gutter={[16, 20]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Búsqueda General</div>
              <Input
                placeholder="Pedido, cotización, vehículo, usuario..."
                prefix={<SearchOutlined style={{ color: '#cbd5e1' }} />}
                value={filtros.busqueda}
                onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
                style={{ width: '100%', borderRadius: '8px' }}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Rango de Fechas (Pedido)</div>
              <RangePicker
                value={[filtros.desde, filtros.hasta]}
                onChange={(dates) => setFiltros({ ...filtros, desde: dates ? dates[0] : null, hasta: dates ? dates[1] : null })}
                format="YYYY-MM-DD"
                placeholder={['Desde', 'Hasta']}
                style={{ width: '100%', borderRadius: '8px' }}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Horario Regular (3%)</div>
              <TimePicker.RangePicker
                value={[filtros.horaInicio, filtros.horaFin]}
                onChange={(times) => setFiltros({ ...filtros, horaInicio: times ? times[0] : null, horaFin: times ? times[1] : null })}
                format="HH:mm"
                style={{ width: '100%', borderRadius: '8px' }}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Estado Facturación</div>
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
            <Col xs={24} sm={12} md={8} lg={4}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Usuario Responsable</div>
              <Select
                value={filtros.usuarioId}
                onChange={(val) => setFiltros({ ...filtros, usuarioId: val })}
                style={{ width: '100%' }}
                showSearch
                optionFilterProp="children"
              >
                <Option value="todos">Todos los usuarios</Option>
                <Option value="sin_asignar">Sin asignar</Option>
                {usuariosActivos.map((u) => (
                  <Option key={u.id} value={u.id}>
                    {u.nombre || u.email} {u.id === currentUserId ? '(Tú)' : ''}
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>
        )}
      </Card>

      {/* Tabla Principal */}
      <Card
        bordered={false}
        style={{
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
          background: '#ffffff'
        }}
        bodyStyle={{ padding: '20px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Space size={8} wrap>
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>Leyenda de Comisiones:</Text>
            <Tag color="success" style={{ fontWeight: 600 }}>● 3% Horario Regular (08:00 - 17:00)</Tag>
            <Tag color="warning" style={{ fontWeight: 600 }}>● 5% Fuera de Horario</Tag>
          </Space>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Total mostrados: <strong>{pedidosFiltrados.length}</strong>
          </Text>
        </div>
        <Table
          columns={columns}
          dataSource={dataSourceSafe}
          rowKey={(r) => r.id || r.numeroPedido || r.cotizacionId || Math.random()}
          loading={loading}
          pagination={{ pageSize: 12, showTotal: (total) => `Total: ${total} pedidos activos` }}
          scroll={{ x: 'max-content' }}
          onRow={(record) => ({
            onClick: () => handleAbrirDetalle(record),
            style: { cursor: 'pointer' }
          })}
        />
      </Card>

      {/* Modal / Dialog de Detalle y Asignación de Pedido (Estilo Oportunidades Audatex) */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileTextOutlined style={{ color: '#2563eb', fontSize: 20 }} />
            <span>Detalle del Pedido #{selectedPedido?.numeroPedido || selectedPedido?.cotizacionId}</span>
            {(() => {
              const est = selectedPedido?.estado || 'Confirmado';
              const estLower = est.toLowerCase();
              const color = estLower === 'entregado' ? 'success' :
                            estLower.includes('procesamiento') ? 'blue' :
                            estLower.includes('aguardando') ? 'gold' : 'green';
              return <Tag color={color}>{est}</Tag>;
            })()}
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={780}
        footer={(() => {
          const assignedId = selectedPedido?.usuarioId || selectedPedido?.empleadoId;
          const esAsignadoAOtro = Boolean(assignedId && currentUserId && Number(assignedId) !== Number(currentUserId));

          if (!esAdmin && esAsignadoAOtro) {
            return (
              <Button onClick={() => setModalVisible(false)}>
                Cerrar
              </Button>
            );
          }

          let btnLabel = 'Confirmar Asignación';
          if (!assignedId) {
            btnLabel = esAdmin ? 'Asignar Usuario' : 'Confirmar Autoasignación';
          } else {
            btnLabel = esAdmin ? 'Guardar Cambios' : 'Actualizar Mi Gestión';
          }

          return (
            <Space>
              <Button onClick={() => setModalVisible(false)}>Cerrar</Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={procesando}
                onClick={handleConfirmarFacturacion}
                style={{ background: '#2563eb', borderColor: '#2563eb' }}
              >
                {btnLabel}
              </Button>
            </Space>
          );
        })()}
      >
        {selectedPedido && (
          <div>
            {/* Resumen del Siniestro y Vehículo (mismo estilo limpio que en Oportunidades) */}
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid #e2e8f0' }}>
              <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }}>
                <Descriptions.Item label="Vehículo">
                  <Text strong>{getMarcaSegura(selectedPedido)} {getModeloSeguro(selectedPedido)} ({getAnioSeguro(selectedPedido)})</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Placa / Matrícula">
                  <Tag color="blue">{getPlacaSegura(selectedPedido)}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="No. Pedido">
                  <Text strong>#{selectedPedido.numeroPedido || selectedPedido.id || '-'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Cotización ID">
                  <Text strong>#{selectedPedido.cotizacionId || '-'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Aseguradora">
                  <Tag color="cyan">{selectedPedido.aseguradora || 'INS'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="No. Siniestro">
                  {selectedPedido.siniestro || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Taller">
                  {selectedPedido.taller || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha y Hora">
                  {parsearFechaHora(selectedPedido).fechaTexto} {parsearFechaHora(selectedPedido).horaTexto}
                </Descriptions.Item>
              </Descriptions>
            </div>

            {/* Bloque Financiero: Monto Total Cargado y Comisión */}
            {(() => {
              const evalCom = evaluarHorarioComision(selectedPedido, appliedFiltros.horaInicio, appliedFiltros.horaFin);
              const items = Array.isArray(selectedPedido.items) ? selectedPedido.items : [];
              const totalCalculado = (() => {
                const direct = Number(selectedPedido.totalPedido || selectedPedido.total_pedido || 0);
                if (direct > 0) return direct;
                if (items.length > 0) {
                  const sum = items.reduce((acc, it) => {
                    const p = it.precioOfrecido || it.precio || it.Precio || 0;
                    const num = typeof p === 'string' ? Number(p.replace(/[^0-9.-]+/g, '')) : Number(p);
                    const cant = Number(it.cantidad || 1);
                    return acc + (isNaN(num) ? 0 : num * (isNaN(cant) ? 1 : cant));
                  }, 0);
                  if (sum > 0) return sum;
                }
                return 0;
              })();

              const pctComision = porcentajeManual || Number(selectedPedido.porcentajeComision || selectedPedido.porcentaje_comision || evalCom.porcentaje);
              const comisionFinal = Number(selectedPedido.comisionCalculada || selectedPedido.comision_calculada || Math.round((totalCalculado * pctComision) / 100));

              return (
                <div style={{ background: '#f0fdf4', padding: 14, borderRadius: 8, marginBottom: 16, border: '1px solid #86efac' }}>
                  <Row gutter={16} align="middle">
                    <Col xs={24} sm={8}>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Pedido Confirmado</Text>
                      <Text strong style={{ color: '#166534', fontSize: 15 }}>
                        📦 #{selectedPedido.numeroPedido || selectedPedido.id || selectedPedido.cotizacionId}
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        <Tag color="green" style={{ fontWeight: 500 }}>
                          {selectedPedido.estado || 'Confirmado'}
                        </Tag>
                      </div>
                      <div style={{ marginTop: 6 }}>
                        {evalCom.esDentro ? (
                          <Tag color="success" style={{ fontSize: 11, fontWeight: 500 }}>
                            ● Hora {parsearFechaHora(selectedPedido).horaTexto}: 3% (Horario regular)
                          </Tag>
                        ) : (
                          <Tag color="warning" style={{ fontSize: 11, fontWeight: 500 }}>
                            ● Hora {parsearFechaHora(selectedPedido).horaTexto}: 5% (Fuera de horario)
                          </Tag>
                        )}
                      </div>
                    </Col>
                    <Col xs={12} sm={8} style={{ textAlign: 'right' }}>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Monto Total Cargado</Text>
                      <Text strong style={{ color: '#15803d', fontSize: 18 }}>
                        ₡{new Intl.NumberFormat('es-CR').format(totalCalculado)}
                      </Text>
                    </Col>
                    <Col xs={12} sm={8} style={{ textAlign: 'right' }}>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        Comisión ({pctComision}%)
                      </Text>
                      <Text strong style={{ color: '#b45309', fontSize: 18 }}>
                        ₡{new Intl.NumberFormat('es-CR').format(comisionFinal)}
                      </Text>
                    </Col>
                  </Row>
                </div>
              );
            })()}

            {/* Repuestos Solicitados */}
            <Divider orientation="left" style={{ margin: '14px 0', fontSize: 13, color: '#475569' }}>
              Repuestos Solicitados ({selectedPedido.items?.length || 0})
            </Divider>
            <Table
              size="small"
              pagination={false}
              dataSource={Array.isArray(selectedPedido.items) ? selectedPedido.items : []}
              rowKey={(item, idx) => item.id || idx}
              columns={[
                {
                  title: '#',
                  key: 'idx',
                  width: 50,
                  render: (_, __, index) => index + 1
                },
                {
                  title: 'Descripción',
                  key: 'descripcion',
                  render: (_, r) => <strong>{r.descripcion || r['Descripcion Pieza'] || r['Grupo Pieza'] || 'Pieza'}</strong>
                },
                {
                  title: 'Part Number',
                  key: 'partNumber',
                  render: (_, r) => <Text code>{r.partNumber || r.numeroParte || r['PartNumber'] || '-'}</Text>
                },
                {
                  title: 'Tipo Pieza / Estado',
                  key: 'tipoPieza',
                  align: 'center',
                  render: (_, r) => <Tag>{r.tipoPieza || r.estado || r.Estado || 'Original'}</Tag>
                },
                {
                  title: 'Cantidad',
                  key: 'cantidad',
                  align: 'center',
                  width: 65,
                  render: (_, r) => r.cantidad || 1
                },
                {
                  title: 'Precio Ofrecido',
                  key: 'precio',
                  align: 'right',
                  width: 140,
                  render: (_, r) => {
                    const p = r.precioOfrecido || r.precio || r.Precio || r['Precio Ofrecido'];
                    const val = typeof p === 'string' ? Number(p.replace(/[^0-9.-]+/g, '')) : Number(p);
                    return val ? <Text strong style={{ color: '#15803d' }}>₡{new Intl.NumberFormat('es-CR').format(val)}</Text> : '-';
                  }
                }
              ]}
              locale={{ emptyText: 'No hay repuestos desglosados en este pedido' }}
              style={{ marginBottom: 16 }}
            />

            {/* Selección / Autoasignación del Usuario Responsable */}
            {(() => {
              const assignedId = selectedPedido?.usuarioId || selectedPedido?.empleadoId;
              const assignedName = selectedPedido?.usuarioNombre || selectedPedido?.empleadoNombre;
              const esAsignadoAOtro = Boolean(assignedId && currentUserId && Number(assignedId) !== Number(currentUserId));

              return (
                <div style={{ background: '#eff6ff', padding: 16, borderRadius: 8, border: '1px solid #bfdbfe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <UserOutlined style={{ color: '#2563eb', fontSize: 16 }} />
                      <Text strong style={{ color: '#1e40af' }}>
                        {esAdmin ? 'Usuario Responsable (Gestión Admin):' : 'Usuario Responsable:'}
                      </Text>
                    </div>
                    {!esAdmin && (
                      <Tag color="cyan">Rol: {user?.rol || 'Colaborador'}</Tag>
                    )}
                  </div>

                  {esAdmin ? (
                    <Select
                      placeholder="Seleccione el usuario que gestionó este pedido..."
                      value={usuarioSeleccionadoId}
                      onChange={(val) => setUsuarioSeleccionadoId(val)}
                      style={{ width: '100%' }}
                      size="large"
                      showSearch
                      optionFilterProp="children"
                    >
                      {usuariosActivos.map((u) => (
                        <Option key={u.id} value={u.id}>
                          {u.nombre || u.email} {u.rol ? `(${u.rol})` : ''} {u.id === currentUserId ? '— (Tú)' : ''}
                        </Option>
                      ))}
                    </Select>
                  ) : (
                    <div>
                      {esAsignadoAOtro ? (
                        <Alert
                          type="warning"
                          showIcon
                          message={`Asignado actualmente a: ${assignedName || `Usuario #${assignedId}`}`}
                          description="Este pedido ya está asignado a otro usuario. Solo un Administrador puede transferirlo."
                        />
                      ) : (
                        <div style={{ padding: '10px 14px', background: '#fff', borderRadius: 6, border: '1px solid #93c5fd', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <Text strong style={{ color: '#1e3a8a', fontSize: 15 }}>
                              👤 {currentUserName}
                            </Text>
                            <div style={{ color: '#64748b', fontSize: 12 }}>
                              {assignedId ? 'Ya asignado a tu cuenta' : 'Se autoasignará a tu usuario al confirmar'}
                            </div>
                          </div>
                          <Tag color="blue">Autoasignación</Tag>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InsPedidos;
