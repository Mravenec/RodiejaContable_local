import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Table, Button, Row, Col, Typography, Statistic,
  Select, Tag, message, Modal, Input, Space, Descriptions, Tabs,
  InputNumber
} from 'antd';
import {
  ReloadOutlined, SearchOutlined, EyeOutlined, UserOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  DollarOutlined, ShoppingCartOutlined, TeamOutlined, FileTextOutlined
} from '@ant-design/icons';
import { audatexAPI } from '../../api/audatex';
import { useEmpleados } from '../../hooks/useEmpleados';
import { useAuth } from '../../context/AuthContext';
import usersService from '../../api/users';
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
  const [oportunidadesAsignadas, setOportunidadesAsignadas] = useState({});
  const [busqueda, setBusqueda] = useState('');
  const [modalDetalleVisible, setModalDetalleVisible] = useState(false);
  const [empleadoDetalle, setEmpleadoDetalle] = useState(null);

  // Estados para marcar oportunidad como entregada
  const [modalEntregarVisible, setModalEntregarVisible] = useState(false);
  const [modalTodasOpsVisible, setModalTodasOpsVisible] = useState(false);
  const [itemAEntregar, setItemAEntregar] = useState(null);
  const [entregaForm, setEntregaForm] = useState({
    montoTotal: 0,
    empleadoId: null,
    porcentajeComision: 3
  });
  const [procesandoEntrega, setProcesandoEntrega] = useState(false);

  const { user } = useAuth();
  const esAdmin = (user?.rol || '').toUpperCase() === 'ADMIN';
  const currentUserId = user?.id || user?.userId || null;

  const { data: empleadosData = [] } = useEmpleados();
  const [usuariosData, setUsuariosData] = useState([]);
  const usuariosActivos = useMemo(() => {
    return (usuariosData || []).filter(u => u.activo !== false);
  }, [usuariosData]);

  useEffect(() => {
    (async () => {
      try {
        const res = await usersService.getUsers();
        setUsuariosData(res.data || res || []);
      } catch (e) {
        console.warn('Error cargando usuarios en InsVentasEmpleados:', e);
      }
    })();
  }, []);

  const [filtros, setFiltros] = useState({
    anio: dayjs().year(),
    mes: null, // null = todos los meses
  });

  // Helper para buscar si una cotización ya tiene pedido referenciado
  const buscarPedidoReferenciado = useCallback((cotizacionId, wan) => {
    if (!pedidosRaw || !Array.isArray(pedidosRaw)) return null;
    const targetCot = cotizacionId ? String(cotizacionId).trim() : '';
    const targetWan = wan ? String(wan).trim() : '';

    return pedidosRaw.find(p => {
      if (p.esOportunidadSinPedido) return false;
      const idStr = p.id ? String(p.id).trim() : '';
      const cotStr = p.cotizacionId ? String(p.cotizacionId).trim() : '';
      const sinStr = p.siniestro ? String(p.siniestro).trim() : '';
      const numStr = p.numeroPedido ? String(p.numeroPedido).trim() : '';
      return (
        (targetCot && (idStr === targetCot || cotStr === targetCot || sinStr === targetCot || numStr === targetCot)) ||
        (targetWan && p.wan && String(p.wan).trim() === targetWan)
      );
    });
  }, [pedidosRaw]);

  // Cargar pedidos y oportunidades
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [resPedidos, resOpsSync] = await Promise.all([
        audatexAPI.obtenerPedidos().catch((err) => {
          console.warn('Error obteniendo pedidos:', err);
          return { data: [] };
        }),
        audatexAPI.obtenerOportunidadesSync().catch((err) => {
          console.warn('Error obteniendo oportunidades sync:', err);
          return { data: [] };
        })
      ]);

      const rawList = Array.isArray(resPedidos.data)
        ? resPedidos.data
        : (Array.isArray(resPedidos.data?.pedidos) ? resPedidos.data.pedidos : []);

      const rawOpsSync = Array.isArray(resOpsSync.data)
        ? resOpsSync.data
        : (Array.isArray(resOpsSync.data?.oportunidades) ? resOpsSync.data.oportunidades : []);

      // Limpiar claves obsoletas de localStorage para que la base de datos sea la única fuente de la verdad
      try {
        localStorage.removeItem('pedidos_ins_asignaciones');
        localStorage.removeItem('oportunidades_ins_asignaciones');
      } catch (e) {}

      // Mapear oportunidades asignadas desde backend (sync) que tengan usuario asignado en BD
      const opsMap = {};
      rawOpsSync.forEach((os) => {
        const uid = os.userId || os.user_id || os.usuarioId || os.empleadoId;
        if (uid) {
          const cotKey = String(os.cotizacionId || os.cotizacion_id || os.wan || '').trim();
          if (cotKey && !opsMap[cotKey] && !opsMap[os.wan]) {
            opsMap[cotKey] = {
              cotizacionId: os.cotizacionId || os.cotizacion_id,
              wan: os.wan,
              usuarioId: uid,
              userId: uid,
              empleadoId: uid,
              usuarioNombre: os.usuarioNombre || os.usuario_nombre || os.empleadoNombre,
              empleadoNombre: os.empleadoNombre || os.usuarioNombre || os.usuario_nombre,
              vehiculo: `${os.armadora || ''} ${os.modelo || ''} ${os.anio || ''}`.trim(),
              aseguradora: os.aseguradora || 'INS',
              taller: os.taller,
              totalPedido: Number(os.totalPedido || os.total_pedido || 0),
              porcentajeComision: Number(os.porcentajeComision || 3),
              fechaCotizacion: os.fechaCotizacion || os.fecha_cotizacion,
              asignadoEn: os.creado_en || os.actualizado_en || new Date().toISOString()
            };
          }
        }
      });

      setOportunidadesAsignadas(opsMap);

      // Usar directamente los pedidos que existen en la base de datos
      const fusionados = rawList.map(p => {
        const empleadoId = p.empleadoId || p.userId || p.usuarioId || null;
        let empleadoNombre = p.empleadoNombre || p.usuarioNombre || null;
        if (!empleadoNombre && empleadoId) {
          const uFound = (usuariosData || []).find(u => Number(u.id) === Number(empleadoId));
          const empFound = (empleadosData || []).find(e => Number(e.id) === Number(empleadoId));
          empleadoNombre = uFound ? (uFound.nombre || uFound.email) : (empFound ? (empFound.nombres || empFound.nombre) : `Usuario #${empleadoId}`);
        }
        return {
          ...p,
          empleadoId,
          empleadoNombre,
          userId: empleadoId,
          usuarioId: empleadoId,
          usuarioNombre: empleadoNombre,
          porcentajeComision: p.porcentajeComision || 3,
          estado: p.estado,
          totalPedido: Number(p.totalPedido || 0)
        };
      });

      setPedidosRaw(fusionados);
    } catch (error) {
      console.error('Error al cargar pedidos y comisiones:', error);
      message.error('Error al cargar datos de ventas');
    } finally {
      setLoading(false);
    }
  }, [usuariosData, empleadosData]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Abrir modal para marcar como entregado
  const handleAbrirModalEntregar = (item) => {
    const ahora = dayjs();
    const horaNum = ahora.hour();
    const esHorarioRegular = horaNum >= 8 && horaNum < 17;
    const defaultPct = item.porcentajeComision || (esHorarioRegular ? 3 : 5);
    const empIdDef = item.empleadoId || (empleadoDetalle ? empleadoDetalle.empleado_id : null);

    setItemAEntregar(item);
    setEntregaForm({
      montoTotal: Number(item.totalPedido || item.montoTotal || 0),
      empleadoId: empIdDef ? (typeof empIdDef === 'string' && empIdDef.startsWith('id_') ? Number(empIdDef.replace('id_', '')) : Number(empIdDef)) : null,
      porcentajeComision: defaultPct
    });
    setModalEntregarVisible(true);
  };

  // Confirmar y marcar como entregado
  const handleConfirmarEntrega = async () => {
    if (!itemAEntregar) return;
    if (!entregaForm.montoTotal || Number(entregaForm.montoTotal) <= 0) {
      message.warning('Por favor ingresa un monto total de venta válido (mayor a ₡0)');
      return;
    }
    if (!entregaForm.empleadoId) {
      message.warning('Por favor selecciona un colaborador responsable');
      return;
    }

    setProcesandoEntrega(true);
    try {
      const empIdNum = Number(entregaForm.empleadoId);
      const emp = empleadosData.find(e => e.id === empIdNum);
      const empNombre = emp ? (emp.nombres || emp.nombre) : `Empleado #${empIdNum}`;
      const cotId = itemAEntregar.cotizacionId || itemAEntregar.siniestro || itemAEntregar.id;
      const totalNum = Number(entregaForm.montoTotal);
      const pctNum = Number(entregaForm.porcentajeComision || 3);
      const vehiculoStr = itemAEntregar.vehiculo || 'Vehículo INS';

      // 1. Si es un pedido existente en backend (id numérico que no empieza con op_)
      const esPedidoExistente = itemAEntregar.id && !String(itemAEntregar.id).startsWith('op_');

      if (esPedidoExistente) {
        try {
          await audatexAPI.facturarPedido(itemAEntregar.id, {
            empleadoId: empIdNum,
            porcentajeComision: pctNum
          });
        } catch (errFact) {
          console.warn('Backend facturarPedido fallo, fallback local activo:', errFact);
        }
      } else {
        // Es una oportunidad/cotización sin pedido en backend: Registrar pedido con estado Entregado
        const payload = {
          cotizacionId: String(cotId),
          wan: itemAEntregar.wan || String(cotId),
          vehiculo: vehiculoStr,
          siniestro: String(cotId),
          totalPedido: totalNum,
          estado: 'Entregado',
          notas: `Marcado como Entregado desde Ventas INS para ${empNombre}`,
          items: itemAEntregar.items || [],
          empleadoId: empIdNum,
          porcentajeComision: pctNum
        };
        try {
          await audatexAPI.enviarCotizacion(payload);
        } catch (errReg) {
          console.warn('Backend enviarCotizacion fallo:', errReg);
        }
      }

      message.success(`¡Cotización #${cotId} registrada y marcada como ENTREGADA para ${empNombre}!`);
      setModalEntregarVisible(false);
      setItemAEntregar(null);
      await cargarDatos();
      if (modalDetalleVisible) {
        setModalDetalleVisible(false);
      }
    } catch (err) {
      console.error('Error al marcar entrega:', err);
      message.error('Error al procesar la entrega');
    } finally {
      setProcesandoEntrega(false);
    }
  };

  // Agrupar pedidos por colaborador
  const procesarGrupo = useCallback((listaPedidos, esCancelado = false) => {
    const anioFiltro = filtros.anio;
    const mesFiltro = filtros.mes;
    const empleadosMap = {};

    let totalComisiones = 0;
    let totalVentas = 0;
    let totalPedidos = 0;

    listaPedidos.forEach(p => {
      const empId = p.empleadoId || p.userId || p.usuarioId;
      const empNom = p.empleadoNombre || p.usuarioNombre;
      if (!empId && !empNom) return;

      const infoFecha = parsearFechaHora(p);
      if (anioFiltro && infoFecha.anio && infoFecha.anio !== anioFiltro) return;
      if (mesFiltro && infoFecha.mes && infoFecha.mes !== mesFiltro) return;

      let nombreFinal = empNom;
      if (empId) {
        const uObj = usuariosActivos.find(u => Number(u.id) === Number(empId));
        const empObj = (empleadosData || []).find(e => Number(e.id) === Number(empId));
        if (uObj) {
          nombreFinal = uObj.nombre || uObj.email;
        } else if (empObj) {
          nombreFinal = empObj.nombres || empObj.nombre;
        }
      }
      if (!nombreFinal) {
        nombreFinal = empId ? `Usuario #${empId}` : 'Sin nombre';
      }
      // Normalizar nombre con mayúscula inicial respetando nombres compuestos
      nombreFinal = String(nombreFinal)
        .trim()
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      // Clave unificada en minúsculas para evitar duplicar nombres por diferencias de mayúsculas (ej. Esteban y esteban)
      const key = nombreFinal.toLowerCase().trim();
      if (!empleadosMap[key]) {
        empleadosMap[key] = {
          empleado_id: empId || key,
          empleado: nombreFinal,
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
        cotizacionId: p.cotizacionId,
        wan: p.wan,
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
        estado: p.estado,
        esOportunidadSinPedido: Boolean(p.esOportunidadSinPedido),
        datosOportunidad: p.datosOportunidad,
        items: p.items || []
      });

      totalComisiones += comisionCalculada;
      totalVentas += total;
      totalPedidos += 1;
    });

    // Vincular oportunidades asignadas a cada colaborador
    Object.values(empleadosMap).forEach((item) => {
      const empIdNum = Number(item.empleado_id) || (typeof item.empleado_id === 'string' && item.empleado_id.startsWith('id_') ? Number(item.empleado_id.replace('id_', '')) : null);
      const opsAsignadas = Object.values(oportunidadesAsignadas).filter((op) => {
        const opId = Number(op.empleadoId || op.usuarioId || op.userId);
        const opNom = (op.empleadoNombre || op.usuarioNombre || '').toLowerCase().trim();
        const itemNom = (item.empleado || '').toLowerCase().trim();
        return (
          (empIdNum && opId === empIdNum) ||
          (opNom && itemNom && (opNom === itemNom || opNom.includes(itemNom) || itemNom.includes(opNom)))
        );
      });
      item.oportunidades_asignadas = opsAsignadas.length;
      item.oportunidades_detalle = opsAsignadas;
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
  }, [filtros, busqueda, empleadosData, usuariosActivos, oportunidadesAsignadas]);

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
      return est === 'cancelado' && (Boolean(p.empleadoId || p.userId || p.usuarioId) || Boolean(p.empleadoNombre || p.usuarioNombre));
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
      title: 'Oportunidades',
      dataIndex: 'oportunidades_asignadas',
      key: 'oportunidades_asignadas',
      align: 'center',
      render: (count) => (
        <Tag color={count > 0 ? 'purple' : 'default'} style={{ fontWeight: 600 }}>
          {count || 0} {count === 1 ? 'activa' : 'activas'}
        </Tag>
      )
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

  const totalOportunidadesGlobal = Object.keys(oportunidadesAsignadas).length;

  const opsSinPedido = useMemo(() => {
    return Object.values(oportunidadesAsignadas).filter(op => {
      const ref = buscarPedidoReferenciado(op.cotizacionId, op.wan);
      const yaEntregado = (ref && (ref.estado || '').toLowerCase() === 'entregado') ||
        ((op.estado || '').toLowerCase() === 'entregado');
      return !yaEntregado;
    });
  }, [oportunidadesAsignadas, buscarPedidoReferenciado]);

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
        <Col xs={24} sm={12} md={true} style={{ flex: '1 1 180px' }}>
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
        <Col xs={24} sm={12} md={true} style={{ flex: '1 1 180px' }}>
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
        <Col xs={24} sm={12} md={true} style={{ flex: '1 1 180px' }}>
          <Card size="small" style={{ borderRadius: 8, background: '#faf5ff', border: '1px solid #e9d5ff' }}>
            <Statistic
              title={<Text strong style={{ color: '#6b21a8' }}>Total Pedidos</Text>}
              value={datosBloques.bloqueEntregados.totalPedidos + datosBloques.bloqueEnEspera.totalPedidos}
              suffix={<span style={{ fontSize: 12, color: '#6b7280' }}>({datosBloques.bloqueCancelados.totalPedidos} canc.)</span>}
              valueStyle={{ color: '#7c3aed', fontWeight: 700, fontSize: 20 }}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={true} style={{ flex: '1 1 180px' }}>
          <Card
            size="small"
            style={{
              borderRadius: 8,
              background: '#fdf4ff',
              border: '1px solid #f5d0fe',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => setModalTodasOpsVisible(true)}
            hoverable
          >
            <Statistic
              title={<Text strong style={{ color: '#86198f' }}>Oportunidades Asignadas</Text>}
              value={totalOportunidadesGlobal}
              suffix={
                opsSinPedido.length > 0 ? (
                  <Tag color="orange" style={{ marginLeft: 6, fontSize: 11 }}>
                    {opsSinPedido.length} sin entregar
                  </Tag>
                ) : null
              }
              valueStyle={{ color: '#a21caf', fontWeight: 700, fontSize: 20 }}
              prefix={<FileTextOutlined />}
            />
            <div style={{ fontSize: 11, color: '#a21caf', marginTop: 4, fontWeight: 500 }}>
              Ver todas las cotizaciones ➔
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={true} style={{ flex: '1 1 180px' }}>
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
        width={800}
      >
        {empleadoDetalle && (
          <div>
            <Descriptions size="small" column={{ xs: 1, sm: 4 }} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="Pedidos">
                <strong>{empleadoDetalle.total_pedidos}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Oportunidades Asignadas">
                <Tag color={(empleadoDetalle.oportunidades_asignadas || 0) > 0 ? 'purple' : 'default'} style={{ fontWeight: 600 }}>
                  {empleadoDetalle.oportunidades_asignadas || 0}
                </Tag>
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

            <Tabs
              defaultActiveKey="pedidos"
              items={[
                {
                  key: 'pedidos',
                  label: (
                    <span>
                      <ShoppingCartOutlined />
                      Pedidos ({empleadoDetalle.pedidos_detalle?.length || 0})
                    </span>
                  ),
                  children: (
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
                        },
                        {
                          title: 'Acción',
                          key: 'accion',
                          align: 'center',
                          render: (_, r) => {
                            const esEntregado = (r.estado || '').toLowerCase() === 'entregado';
                            if (!esEntregado && empleadoDetalle.tipoBloque !== 'cancelados') {
                              return (
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<CheckCircleOutlined />}
                                  style={{ background: '#16a34a', borderColor: '#16a34a' }}
                                  onClick={() => handleAbrirModalEntregar(r)}
                                >
                                  Marcar Entregado
                                </Button>
                              );
                            }
                            if (esEntregado) {
                              return <Tag color="success" icon={<CheckCircleOutlined />}>Entregado</Tag>;
                            }
                            return null;
                          }
                        }
                      ]}
                    />
                  )
                },
                {
                  key: 'oportunidades',
                  label: (
                    <span>
                      <FileTextOutlined />
                      Oportunidades Asignadas ({empleadoDetalle.oportunidades_detalle?.length || 0})
                    </span>
                  ),
                  children: (
                    <Table
                      size="small"
                      dataSource={empleadoDetalle.oportunidades_detalle || []}
                      rowKey={(r) => r.cotizacionId || r.wan || r.asignadoEn}
                      pagination={{ pageSize: 5 }}
                      locale={{ emptyText: 'No tiene oportunidades asignadas actualmente' }}
                      columns={[
                        {
                          title: 'Cotización',
                          dataIndex: 'cotizacionId',
                          key: 'cotizacionId',
                          render: (text) => <Text strong style={{ color: '#7c3aed' }}>#{text}</Text>
                        },
                        {
                          title: 'Vehículo',
                          dataIndex: 'vehiculo',
                          key: 'vehiculo',
                          render: (veh) => <strong>{veh || 'Desc.'}</strong>
                        },
                        {
                          title: 'Aseguradora',
                          dataIndex: 'aseguradora',
                          key: 'aseguradora',
                          render: (aseg) => <Tag color="blue">{aseg || 'INS'}</Tag>
                        },
                        {
                          title: 'Taller',
                          dataIndex: 'taller',
                          key: 'taller',
                          render: (taller) => taller || '-'
                        },
                        {
                          title: 'Pendientes',
                          dataIndex: 'pendientes',
                          key: 'pendientes',
                          align: 'center',
                          render: (p) => <Tag color="orange">{p || 0}</Tag>
                        },
                        {
                          title: 'Fecha Cotización',
                          dataIndex: 'fechaCotizacion',
                          key: 'fechaCotizacion',
                          render: (f) => f || '-'
                        },
                        {
                          title: 'Pedido Referenciado',
                          key: 'pedidoRef',
                          render: (_, r) => {
                            const pedidoRef = buscarPedidoReferenciado(r.cotizacionId, r.wan);
                            if (pedidoRef) {
                              const esEntregado = (pedidoRef.estado || '').toLowerCase() === 'entregado';
                              return (
                                <Tag
                                  color={esEntregado ? 'green' : 'blue'}
                                  icon={esEntregado ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
                                >
                                  #{pedidoRef.numeroPedido || pedidoRef.id} ({pedidoRef.estado || 'En espera'})
                                </Tag>
                              );
                            }
                            const esEntregadoLocal = (r.estado || '').toLowerCase() === 'entregado';
                            if (esEntregadoLocal) {
                              return <Tag color="green" icon={<CheckCircleOutlined />}>Entregado (Local)</Tag>;
                            }
                            return <Tag color="default">Sin Pedido</Tag>;
                          }
                        },
                        {
                          title: 'Acción',
                          key: 'accion',
                          align: 'center',
                          render: (_, r) => {
                            const pedidoRef = buscarPedidoReferenciado(r.cotizacionId, r.wan);
                            const yaEntregado = (pedidoRef && (pedidoRef.estado || '').toLowerCase() === 'entregado') ||
                              ((r.estado || '').toLowerCase() === 'entregado');
                            if (!yaEntregado) {
                              return (
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<CheckCircleOutlined />}
                                  style={{ background: '#16a34a', borderColor: '#16a34a' }}
                                  onClick={() => handleAbrirModalEntregar(r)}
                                >
                                  Marcar como Entregado
                                </Button>
                              );
                            }
                            return <Tag color="success" icon={<CheckCircleOutlined />}>Entregado</Tag>;
                          }
                        }
                      ]}
                    />
                  )
                }
              ]}
            />
          </div>
        )}
      </Modal>

      {/* Modal para Marcar como Entregado */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#16a34a' }} />
            <span>
              Marcar como Entregado — Cotización #{itemAEntregar?.cotizacionId || itemAEntregar?.siniestro || itemAEntregar?.id}
            </span>
          </Space>
        }
        open={modalEntregarVisible}
        onCancel={() => {
          if (!procesandoEntrega) {
            setModalEntregarVisible(false);
            setItemAEntregar(null);
          }
        }}
        confirmLoading={procesandoEntrega}
        onOk={handleConfirmarEntrega}
        okText="Confirmar Entrega"
        cancelText="Cancelar"
        okButtonProps={{ style: { background: '#16a34a', borderColor: '#16a34a' } }}
        destroyOnClose
      >
        {itemAEntregar && (
          <div style={{ marginTop: 12 }}>
            <Descriptions size="small" bordered column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Vehículo">
                <strong>{itemAEntregar.vehiculo || 'No especificado'}</strong>
              </Descriptions.Item>
              {itemAEntregar.aseguradora && (
                <Descriptions.Item label="Aseguradora">
                  <Tag color="blue">{itemAEntregar.aseguradora}</Tag>
                </Descriptions.Item>
              )}
              {itemAEntregar.taller && (
                <Descriptions.Item label="Taller">
                  {itemAEntregar.taller}
                </Descriptions.Item>
              )}
            </Descriptions>

            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Colaborador Responsable:
              </Text>
              <Select
                showSearch
                placeholder="Seleccionar colaborador / usuario"
                style={{ width: '100%' }}
                value={entregaForm.empleadoId}
                onChange={(val) => setEntregaForm({ ...entregaForm, empleadoId: val })}
                filterOption={(input, option) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
                disabled={!esAdmin && Boolean(currentUserId)}
              >
                {usuariosActivos.length > 0 ? (
                  usuariosActivos.map(u => (
                    <Option key={u.id} value={u.id}>
                      {u.nombre || u.email} {u.rol ? `(${u.rol})` : ''} {u.id === currentUserId ? '— (Tú)' : ''}
                    </Option>
                  ))
                ) : (
                  empleadosData.map(emp => (
                    <Option key={emp.id} value={emp.id}>
                      {emp.nombres || emp.nombre}
                    </Option>
                  ))
                )}
              </Select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Monto Total de Venta (₡):
              </Text>
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                value={entregaForm.montoTotal}
                onChange={(val) => setEntregaForm({ ...entregaForm, montoTotal: val })}
                formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/₡\s?|(,*)/g, '')}
                placeholder="Ingresar total en colones"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Porcentaje de Comisión:
              </Text>
              <Select
                style={{ width: '100%' }}
                value={entregaForm.porcentajeComision}
                onChange={(val) => setEntregaForm({ ...entregaForm, porcentajeComision: val })}
              >
                <Option value={3}>3% — Horario Ordinario (08:00 a 17:00)</Option>
                <Option value={5}>5% — Fuera de Horario</Option>
              </Select>
            </div>

            {/* Preview de Comisión */}
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '12px 16px',
              borderRadius: 6,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Text strong style={{ color: '#15803d' }}>
                Comisión Calculada ({entregaForm.porcentajeComision}%):
              </Text>
              <Text strong style={{ color: '#16a34a', fontSize: 16 }}>
                {formatColones((Number(entregaForm.montoTotal) || 0) * (Number(entregaForm.porcentajeComision) || 0) / 100)}
              </Text>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Todas las Oportunidades Asignadas */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: '#a21caf' }} />
            <span>Todas las Oportunidades Asignadas ({Object.keys(oportunidadesAsignadas).length})</span>
          </Space>
        }
        open={modalTodasOpsVisible}
        onCancel={() => setModalTodasOpsVisible(false)}
        footer={[
          <Button key="cerrar" type="primary" onClick={() => setModalTodasOpsVisible(false)}>
            Cerrar
          </Button>
        ]}
        width={950}
      >
        <Table
          size="small"
          dataSource={Object.values(oportunidadesAsignadas)}
          rowKey={(r) => r.cotizacionId || r.wan || r.asignadoEn}
          pagination={{ pageSize: 8 }}
          columns={[
            {
              title: 'Cotización',
              dataIndex: 'cotizacionId',
              key: 'cotizacionId',
              render: (text) => <Text strong style={{ color: '#7c3aed' }}>#{text}</Text>
            },
            {
              title: 'Vehículo',
              dataIndex: 'vehiculo',
              key: 'vehiculo',
              render: (v) => <strong>{v || 'Desc.'}</strong>
            },
            {
              title: 'Colaborador',
              key: 'empleado',
              render: (_, r) => {
                const nombre = r.empleadoNombre || r.usuarioNombre || (r.empleadoId || r.usuarioId || r.userId ? `Usuario #${r.empleadoId || r.usuarioId || r.userId}` : 'Sin asignar');
                return (
                  <Tag color="blue" icon={<UserOutlined />}>
                    {nombre}
                  </Tag>
                );
              }
            },
            {
              title: 'Pedido Referenciado',
              key: 'pedidoRef',
              render: (_, r) => {
                const ref = buscarPedidoReferenciado(r.cotizacionId, r.wan);
                if (ref) {
                  const esEntregado = (ref.estado || '').toLowerCase() === 'entregado';
                  return (
                    <Tag color={esEntregado ? 'green' : 'blue'} icon={esEntregado ? <CheckCircleOutlined /> : <ClockCircleOutlined />}>
                      #{ref.numeroPedido || ref.id} ({ref.estado || 'En espera'})
                    </Tag>
                  );
                }
                const esEntregadoLocal = (r.estado || '').toLowerCase() === 'entregado';
                if (esEntregadoLocal) {
                  return <Tag color="green" icon={<CheckCircleOutlined />}>Entregado (Local)</Tag>;
                }
                return <Tag color="default">Sin Pedido</Tag>;
              }
            },
            {
              title: 'Total',
              key: 'total',
              align: 'right',
              render: (_, r) => formatColones(r.totalPedido || 0)
            },
            {
              title: 'Acción',
              key: 'accion',
              align: 'center',
              render: (_, r) => {
                const ref = buscarPedidoReferenciado(r.cotizacionId, r.wan);
                const yaEntregado = (ref && (ref.estado || '').toLowerCase() === 'entregado') ||
                  ((r.estado || '').toLowerCase() === 'entregado');
                if (!yaEntregado) {
                  return (
                    <Button
                      type="primary"
                      size="small"
                      icon={<CheckCircleOutlined />}
                      style={{ background: '#16a34a', borderColor: '#16a34a' }}
                      onClick={() => handleAbrirModalEntregar(r)}
                    >
                      Marcar como Entregado
                    </Button>
                  );
                }
                return <Tag color="success" icon={<CheckCircleOutlined />}>Entregado</Tag>;
              }
            }
          ]}
        />
      </Modal>
    </div>
  );
};

export default InsVentasEmpleados;
