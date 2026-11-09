import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Typography,
  Button,
  Space,
  Statistic,
  Select,
  Tag,
  message,
  Spin,
  Empty,
  Modal,
  Form,
  Input,
  Collapse,
  Layout,
  Tabs,
  Tooltip
} from 'antd';
import {
  ShoppingCartOutlined,
  DownloadOutlined,
  FilterOutlined,
  ReloadOutlined,
  BarChartOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  InboxOutlined,
  FileExcelOutlined,
  DashboardOutlined,
  ArrowUpOutlined,
  MailOutlined
} from '@ant-design/icons';
import moment from 'moment';
import ventasEmpleadosService from '../../api/ventasEmpleados';
import { buscarTransacciones } from '../../api/transacciones';
import reportesService from '../../api/reportes';
import ModalEnviarReporteEmail from '../../components/reportes/ModalEnviarReporteEmail';
import { formatCurrency } from '../../utils/formatters';
import { useVistaExcelMesActual, useVistaExcelMesEspecifico, useGenerarReporteVentasExcel } from '../../hooks/useReportes';
import { useEmpleados } from '../../hooks/useEmpleados';

import ComisionesPendientes from '../../components/finanzas/ComisionesPendientes';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;
const { Content } = Layout;

const MESES_NOMBRES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const tiposProducto = [
  { value: 'VEHICULO', label: 'Vehículo' },
  { value: 'REPUESTO', label: 'Repuesto' },
  { value: 'SERVICIO', label: 'Servicio' }
];

const estadosVenta = [
  { value: 'COMPLETADA', label: 'Completada', color: 'success' },
  { value: 'PENDIENTE', label: 'Pendiente', color: 'processing' },
  { value: 'CANCELADA', label: 'Cancelada', color: 'error' }
];

const VentasReportes = () => {
  const { user } = useAuth();
  // Estados para datos y carga
  const [ventas, setVentas] = useState([]);
  const [estadisticas, setEstadisticas] = useState({});
  const { data: empleadosData = [], isLoading: loadingEmpleados, refetch: refetchEmpleados } = useEmpleados();
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [loading, setLoading] = useState({
    ventas: false,
    estadisticas: false,
    exportar: false,
    exportandoExcel: false
  });
  const [modalEmailVisible, setModalEmailVisible] = useState(false);

  const empleados = React.useMemo(() => {
    return empleadosData.map(e => ({
      ...e,
      nombreCompleto: e.nombreCompleto || `${e.nombres} ${e.apellidos}`.trim()
    }));
  }, [empleadosData]);
  const [filtros, setFiltros] = useState({
    mes: null,
    anio: null,
    estado: 'todos',
    vendedor: null,
    busqueda: '',
    tipoProducto: null
  });




  // Columnas para la tabla de ventas por empleado (agrupadas)
  const columnsVentasAgrupadas = [
    {
      title: 'Empleado',
      dataIndex: 'empleado',
      key: 'empleado',
      render: (text) => <Text strong>{text}</Text>,
      sorter: (a, b) => a.empleado.localeCompare(b.empleado)
    },
    {
      title: 'Cantidad de Ventas',
      dataIndex: 'cantidadVentas',
      key: 'cantidadVentas',
      align: 'center',
      sorter: (a, b) => a.cantidadVentas - b.cantidadVentas
    },
    {
      title: 'Total Ventas',
      dataIndex: 'totalVentas',
      key: 'totalVentas',
      render: (value) => (
        <Text strong>
          ₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}
        </Text>
      ),
      align: 'right',
      sorter: (a, b) => a.totalVentas - b.totalVentas
    },
    {
      title: 'Total Comisiones',
      dataIndex: 'totalComisiones',
      key: 'totalComisiones',
      render: (value) => (
        <Text type={value > 0 ? 'success' : 'default'}>
          ₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}
        </Text>
      ),
      align: 'right',
      sorter: (a, b) => a.totalComisiones - b.totalComisiones
    }
  ];

  // Función para cargar datos iniciales
  const cargarDatosIniciales = useCallback(async () => {
    try {
      await refetchEmpleados();
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
      message.error('Error al cargar datos iniciales');
    }
  }, [refetchEmpleados]);

  // Función para cargar ventas por empleado con filtros
  const cargarVentas = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, ventas: true }));

      const params = {};

      // Si hay mes y año seleccionados, extraemos inicio y fin
      if (filtros.mes && filtros.anio) {
        // moment usa meses indexados en 0 (enero = 0), por lo que restamos 1 al mes
        const fechaBase = moment().year(filtros.anio).month(filtros.mes - 1);
        params.fechaInicio = fechaBase.clone().startOf('month').format('YYYY-MM-DD');
        params.fechaFin = fechaBase.clone().endOf('month').format('YYYY-MM-DD');
      } else if (filtros.anio) {
        const fechaBase = moment().year(filtros.anio);
        params.fechaInicio = fechaBase.clone().startOf('year').format('YYYY-MM-DD');
        params.fechaFin = fechaBase.clone().endOf('year').format('YYYY-MM-DD');
      } else if (filtros.mes) {
        const fechaBase = moment().month(filtros.mes - 1);
        params.fechaInicio = fechaBase.clone().startOf('month').format('YYYY-MM-DD');
        params.fechaFin = fechaBase.clone().endOf('month').format('YYYY-MM-DD');
      }

      // Agregar parámetro de búsqueda si existe
      if (filtros.busqueda && filtros.busqueda.trim()) {
        params.busqueda = filtros.busqueda.trim();
      }

      // Agregar otros filtros
      if (filtros.vendedor) {
        params.vendedorId = filtros.vendedor;
      }

      if (filtros.estado && filtros.estado !== 'todos') {
        params.estado = filtros.estado;
      }

      if (filtros.tipoProducto) {
        params.tipoProducto = filtros.tipoProducto;
      }

      // Buscar transacciones usando la nueva API
      // Pasamos categoria INGRESO para traer solo ventas
      let queryParams = { categoria: 'INGRESO' };

      if (params.fechaInicio) queryParams.fechaInicio = params.fechaInicio;
      if (params.fechaFin) queryParams.fechaFin = params.fechaFin;
      if (params.estado) queryParams.estado = params.estado;

      const response = await buscarTransacciones(queryParams);

      let datosTransacciones = response.transacciones || response || [];

      // Filtrar para mostrar SOLO transacciones que tienen un empleado asociado
      datosTransacciones = datosTransacciones.filter(t => t.empleado && t.empleado.trim() !== '');

      // Filtrar localmente por vendedor/empleado
      if (params.vendedorId) {
        const empleadoSeleccionado = empleados.find(e => e.id === params.vendedorId);
        if (empleadoSeleccionado) {
          const empNom = (empleadoSeleccionado.nombres || empleadoSeleccionado.nombre || empleadoSeleccionado.nombreCompleto || '').toLowerCase().trim();
          datosTransacciones = datosTransacciones.filter(t => {
            const tEmp = (t.empleado || '').toLowerCase().trim();
            return tEmp.includes(empNom) || empNom.includes(tEmp);
          });
        }
      }

      // Filtrar por término de búsqueda
      if (params.busqueda) {
        const lowerSearch = params.busqueda.toLowerCase();
        datosTransacciones = datosTransacciones.filter(t =>
          (t.codigoTransaccion && t.codigoTransaccion.toLowerCase().includes(lowerSearch)) ||
          (t.empleado && t.empleado.toLowerCase().includes(lowerSearch)) ||
          (t.descripcion && t.descripcion.toLowerCase().includes(lowerSearch)) ||
          (t.referencia && t.referencia.toLowerCase().includes(lowerSearch)) ||
          (t.tipoTransaccion && t.tipoTransaccion.toLowerCase().includes(lowerSearch)) ||
          (t.marca && t.marca.toLowerCase().includes(lowerSearch)) ||
          (t.modelo && t.modelo.toLowerCase().includes(lowerSearch)) ||
          (t.codigoVehiculo && t.codigoVehiculo.toLowerCase().includes(lowerSearch)) ||
          (t.codigoRepuesto && t.codigoRepuesto.toLowerCase().includes(lowerSearch))
        );
      }

      // Filtrar por tipo de producto
      if (params.tipoProducto) {
        const tipoP = params.tipoProducto.toUpperCase();
        datosTransacciones = datosTransacciones.filter(t => {
          if (tipoP === 'VEHICULO') {
            return Boolean(t.codigoVehiculo) || (t.tipoTransaccion && t.tipoTransaccion.toUpperCase().includes('VEHICULO'));
          }
          if (tipoP === 'REPUESTO') {
            return Boolean(t.codigoRepuesto) || (t.tipoTransaccion && t.tipoTransaccion.toUpperCase().includes('REPUESTO'));
          }
          if (tipoP === 'SERVICIO') {
            return t.tipoTransaccion && t.tipoTransaccion.toUpperCase().includes('SERVICIO');
          }
          return true;
        });
      }

      setVentas(datosTransacciones);
    } catch (error) {
      console.error('Error al cargar ventas:', error);
      message.error('Error al cargar las ventas');
      // Vaciar la lista cuando hay error
      setVentas([]);
    } finally {
      setLoading(prev => ({ ...prev, ventas: false }));
    }
  }, [filtros, empleados]);

  // Función para cargar estadísticas
  const cargarEstadisticas = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, estadisticas: true }));
      const params = {};

      if (filtros.mes && filtros.anio) {
        const fechaBase = moment().year(filtros.anio).month(filtros.mes - 1);
        params.fechaInicio = fechaBase.clone().startOf('month').format('YYYY-MM-DD');
        params.fechaFin = fechaBase.clone().endOf('month').format('YYYY-MM-DD');
      }

      if (filtros.vendedor) {
        params.vendedorId = filtros.vendedor;
      }

      const data = await ventasEmpleadosService.getEstadisticasVentas(params);
      setEstadisticas(data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
      message.error('Error al cargar estadísticas');
    } finally {
      setLoading(prev => ({ ...prev, estadisticas: false }));
    }
  }, [filtros]);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, [cargarDatosIniciales]);

  // Efecto para cargar datos cuando cambian los filtros
  useEffect(() => {
    cargarVentas();
    cargarEstadisticas();
  }, [cargarVentas, cargarEstadisticas]);

  // Agrupar ventas por empleado
  const ventasAgrupadas = React.useMemo(() => {
    const agrupar = {};
    ventas.forEach(v => {
      const emp = v.empleado;
      if (!agrupar[emp]) {
        agrupar[emp] = {
          empleado: emp,
          cantidadVentas: 0,
          totalVentas: 0,
          totalComisiones: 0
        };
      }
      agrupar[emp].cantidadVentas += 1;
      agrupar[emp].totalVentas += (v.monto || 0);
      agrupar[emp].totalComisiones += (v.comisionEmpleado || 0);
    });
    return Object.values(agrupar);
  }, [ventas]);


  // Aplicar filtros
  const aplicarFiltros = (values) => {
    setFiltros(prev => ({
      ...prev,
      ...values
    }));
  };

  const labelPeriodo = useMemo(() => {
    if (filtros.mes && filtros.anio) {
      return `${MESES_NOMBRES[filtros.mes - 1]} ${filtros.anio}`;
    }
    if (filtros.mes) return MESES_NOMBRES[filtros.mes - 1];
    if (filtros.anio) return `${filtros.anio}`;
    return null;
  }, [filtros.mes, filtros.anio]);

  const labelVendedor = useMemo(() => {
    if (!filtros.vendedor) return null;
    const emp = empleados.find(e => e.id === filtros.vendedor);
    return emp ? emp.nombreCompleto : `Vendedor #${filtros.vendedor}`;
  }, [filtros.vendedor, empleados]);

  const labelEstado = useMemo(() => {
    if (!filtros.estado || filtros.estado === 'todos') return null;
    const est = estadosVenta.find(e => e.value === filtros.estado);
    return est ? est.label : filtros.estado;
  }, [filtros.estado]);

  const labelTipoProducto = useMemo(() => {
    if (!filtros.tipoProducto) return null;
    const tp = tiposProducto.find(t => t.value === filtros.tipoProducto);
    return tp ? tp.label : filtros.tipoProducto;
  }, [filtros.tipoProducto]);

  const cantidadFiltrosActivos = useMemo(() => {
    let count = 0;
    if (filtros.busqueda && filtros.busqueda.trim() !== '') count++;
    if (filtros.mes || filtros.anio) count++;
    if (filtros.vendedor) count++;
    if (filtros.estado && filtros.estado !== 'todos') count++;
    if (filtros.tipoProducto) count++;
    return count;
  }, [filtros]);

  const tieneFiltrosActivos = cantidadFiltrosActivos > 0;

  const removerFiltro = (nombre) => {
    if (nombre === 'periodo') {
      aplicarFiltros({ mes: null, anio: null });
    } else if (nombre === 'busqueda') {
      aplicarFiltros({ busqueda: '' });
    } else if (nombre === 'estado') {
      aplicarFiltros({ estado: 'todos' });
    } else {
      aplicarFiltros({ [nombre]: null });
    }
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltros({
      mes: null,
      anio: null,
      estado: 'todos',
      vendedor: null,
      busqueda: '',
      tipoProducto: null
    });
  };

  const obtenerRangoFechasFiltro = () => {
    const params = {};
    if (filtros.mes && filtros.anio) {
      const fechaBase = moment().year(filtros.anio).month(filtros.mes - 1);
      params.fechaInicio = fechaBase.clone().startOf('month').format('YYYY-MM-DD');
      params.fechaFin = fechaBase.clone().endOf('month').format('YYYY-MM-DD');
    } else if (filtros.anio) {
      const fechaBase = moment().year(filtros.anio);
      params.fechaInicio = fechaBase.clone().startOf('year').format('YYYY-MM-DD');
      params.fechaFin = fechaBase.clone().endOf('year').format('YYYY-MM-DD');
    } else if (filtros.mes) {
      const fechaBase = moment().month(filtros.mes - 1);
      params.fechaInicio = fechaBase.clone().startOf('month').format('YYYY-MM-DD');
      params.fechaFin = fechaBase.clone().endOf('month').format('YYYY-MM-DD');
    }
    return params;
  };

  // Exportar a Excel el reporte oficial generado por el Backend (Resumen Empleados + Detalle Ventas)
  const exportarAExcel = async () => {
    try {
      setLoading(prev => ({ ...prev, exportar: true }));
      message.loading({ content: 'Generando reporte oficial de ventas...', key: 'exp-vts' });
      const params = obtenerRangoFechasFiltro();
      const blob = await reportesService.exportarExcelVentasBackend(params);
      const nombreArchivo = reportesService.obtenerNombreArchivoConMes('Reporte_Ventas', filtros.mes, filtros.anio);
      reportesService.descargarArchivo(blob, nombreArchivo);
      message.success({ content: 'Reporte de ventas exportado exitosamente', key: 'exp-vts' });
    } catch (error) {
      console.error('Error al exportar ventas a Excel:', error);
      message.error({ content: 'Error al exportar el archivo Excel', key: 'exp-vts' });
    } finally {
      setLoading(prev => ({ ...prev, exportar: false }));
    }
  };


  // Obtener métricas de las estadísticas (dinámicas si hay filtros activos)
  const totalVentasCount = tieneFiltrosActivos
    ? ventas.length
    : (estadisticas?.totalVentasCount || estadisticas?.totalTransacciones || ventas.length);
  const totalIngresos = tieneFiltrosActivos
    ? ventas.reduce((sum, v) => sum + (v.monto || 0), 0)
    : (estadisticas?.totalVentas || ventas.reduce((sum, v) => sum + (v.monto || 0), 0));
  const ventasCompletadas = tieneFiltrosActivos
    ? ventas.filter(v => (v.estado || '').toUpperCase() === 'COMPLETADA').length
    : (estadisticas?.totalVentasCount || estadisticas?.totalTransacciones || ventas.length);
  const tasaConversion = estadisticas?.tasaConversion || 0;

  // Hooks para vista Excel
  const mesExcel = filtros.mes || new Date().getMonth() + 1;
  const anioExcel = filtros.anio || new Date().getFullYear();

  const { data: vistaExcelActual, isLoading: loadingVistaExcelActual } = useVistaExcelMesActual();
  const { data: vistaExcelEspecifico, isLoading: loadingVistaExcelEspecifico } = useVistaExcelMesEspecifico(
    anioExcel,
    mesExcel
  );
  const { isLoading: exportandoExcel } = useGenerarReporteVentasExcel();

  const datosVistaExcel = React.useMemo(() => {
    let data = vistaExcelEspecifico || vistaExcelActual || [];
    data = data.filter(item => (item.nombreDel && item.nombreDel.trim() !== '') || (item.vendedor && item.vendedor.trim() !== ''));

    // Filtro por búsqueda
    if (filtros.busqueda && filtros.busqueda.trim()) {
      const q = filtros.busqueda.toLowerCase().trim();
      data = data.filter(item =>
        (item.nombreDel && item.nombreDel.toLowerCase().includes(q)) ||
        (item.vendedor && item.vendedor.toLowerCase().includes(q)) ||
        (item.descripcionLinea && item.descripcionLinea.toLowerCase().includes(q)) ||
        (item.formaDePago && item.formaDePago.toLowerCase().includes(q)) ||
        (item.nfactura && item.nfactura.toLowerCase().includes(q)) ||
        (item.nombreMes && item.nombreMes.toLowerCase().includes(q))
      );
    }

    // Filtro por vendedor
    if (filtros.vendedor) {
      const empSel = empleados.find(e => e.id === filtros.vendedor);
      if (empSel) {
        const empNom = (empSel.nombres || empSel.nombre || empSel.nombreCompleto || '').toLowerCase().trim();
        data = data.filter(item => {
          const vName = (item.nombreDel || item.vendedor || '').toLowerCase().trim();
          return vName.includes(empNom) || empNom.includes(vName);
        });
      }
    }

    // Filtro por tipo de producto
    if (filtros.tipoProducto) {
      const tp = filtros.tipoProducto.toUpperCase();
      data = data.filter(item => {
        const desc = (item.descripcionLinea || '').toUpperCase();
        if (tp === 'VEHICULO') return desc.includes('VEHICULO') || desc.includes('AUTO') || desc.includes('CARRO');
        if (tp === 'REPUESTO') return desc.includes('REPUESTO') || desc.includes('PIEZA');
        if (tp === 'SERVICIO') return desc.includes('SERVICIO') || desc.includes('TALLER') || desc.includes('MANO DE OBRA');
        return true;
      });
    }

    return data;
  }, [vistaExcelEspecifico, vistaExcelActual, filtros.busqueda, filtros.vendedor, filtros.tipoProducto, empleados]);

  // Exportar el Reporte de Ventas oficial generado por el Backend (Resumen Empleados + Detalle Ventas)
  const exportarAExcelCompleto = async () => {
    try {
      message.loading({ content: 'Generando reporte oficial de ventas...', key: 'exp-vts' });
      const params = obtenerRangoFechasFiltro();
      const blob = await reportesService.exportarExcelVentasBackend(params);
      const nombreArchivo = reportesService.obtenerNombreArchivoConMes('Reporte_Ventas', filtros.mes, filtros.anio);
      reportesService.descargarArchivo(blob, nombreArchivo);
      message.success({ content: 'Reporte de ventas exportado exitosamente', key: 'exp-vts' });
    } catch (error) {
      console.error('Error al exportar ventas a Excel:', error);
      message.error({ content: 'Error al exportar el archivo Excel', key: 'exp-vts' });
    }
  };

  const handleEnviarEmail = async (opciones) => {
    const formData = new FormData();
    if (opciones.asunto) formData.append('asunto', opciones.asunto);
    if (opciones.periodo) formData.append('periodo', opciones.periodo);
    if (opciones.mensaje) formData.append('mensaje', opciones.mensaje);
    formData.append('totalVentas', totalIngresos || 0);
    const comisionesSum = ventasAgrupadas.reduce((sum, v) => sum + (v.totalComisiones || 0), 0);
    formData.append('totalComisiones', comisionesSum || 0);
    formData.append('balanceNeto', (totalIngresos || 0) - (comisionesSum || 0));
    formData.append('cantidadVentas', totalVentasCount || 0);

    if (opciones.adjuntarExcel) {
      try {
        const params = obtenerRangoFechasFiltro();
        const excelBlob = await reportesService.exportarExcelVentasBackend(params);
        const nombreArchivo = reportesService.obtenerNombreArchivoConMes('Reporte_Ventas', filtros.mes, filtros.anio);
        formData.append('archivo', excelBlob, nombreArchivo);
      } catch (err) {
        console.warn('No se pudo adjuntar el Excel del backend:', err);
      }
    }

    await reportesService.enviarReporteVentasEmail(formData);
  };

  // Columnas para la tabla de vista Excel
  const columnsVistaExcel = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      render: (fecha) => {
        if (Array.isArray(fecha) && fecha.length >= 3) {
          return moment([fecha[0], fecha[1] - 1, fecha[2]]).format('DD/MM/YYYY');
        }
        return moment(fecha).format('DD/MM/YYYY');
      },
      width: 120,
      sorter: (a, b) => {
        const dateA = Array.isArray(a.fecha) ? moment([a.fecha[0], a.fecha[1] - 1, a.fecha[2]]) : moment(a.fecha);
        const dateB = Array.isArray(b.fecha) ? moment([b.fecha[0], b.fecha[1] - 1, b.fecha[2]]) : moment(b.fecha);
        return dateA - dateB;
      }
    },
    {
      title: 'Vendedor',
      dataIndex: 'nombreDel',
      key: 'nombreDel',
      width: 120,
      sorter: (a, b) => a.nombreDel.localeCompare(b.nombreDel)
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcionLinea',
      key: 'descripcionLinea',
      width: 200,
      sorter: (a, b) => a.descripcionLinea.localeCompare(b.descripcionLinea)
    },
    {
      title: 'Comisión',
      dataIndex: 'comision',
      key: 'comision',
      render: (value) => (
        <Text type="success">
          ₡{new Intl.NumberFormat('es-CR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(value)}
        </Text>
      ),
      align: 'right',
      width: 120,
      sorter: (a, b) => a.comision - b.comision
    },
    {
      title: 'Forma de Pago',
      dataIndex: 'formaDePago',
      key: 'formaDePago',
      width: 120,
      render: (text) => (
        <Tag color={text === 'EFECTIVO' ? 'green' : text === 'TRANSFERENCIA' ? 'blue' : 'default'}>
          {text}
        </Tag>
      ),
      sorter: (a, b) => a.formaDePago.localeCompare(b.formaDePago)
    },
    {
      title: 'Precio Unitario',
      dataIndex: 'precioUnitario',
      key: 'precioUnitario',
      render: (value) => (
        <Text strong>
          ₡{new Intl.NumberFormat('es-CR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(value)}
        </Text>
      ),
      align: 'right',
      width: 150,
      sorter: (a, b) => a.precioUnitario - b.precioUnitario
    },



    {
      title: 'Mes/Año',
      key: 'periodo',
      render: (record) => `${record.nombreMes} ${record.anio}`,
      width: 100,
      sorter: (a, b) => {
        if (a.anio !== b.anio) return a.anio - b.anio;
        return a.mes - b.mes;
      }
    },

  ];

  return (
    <Content style={{ padding: '0 24px', minHeight: 280 }}>
      {/* Encabezado */}
      <div style={{ marginBottom: 24, marginTop: 8 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={3} style={{ margin: 0, color: '#262626' }}>
              <DashboardOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              Reportes de Ventas Empleados
            </Title>
            <Text type="secondary" style={{ marginTop: 4, display: 'block' }}>
              Análisis financiero, comisiones y trazabilidad de operaciones de ventas.
            </Text>
          </Col>
          <Col>
            <Tooltip title="Enviar reporte por correo electrónico">
              <Button
                icon={<MailOutlined />}
                onClick={() => setModalEmailVisible(true)}
              >
                Enviar por Correo
              </Button>
            </Tooltip>
          </Col>
        </Row>
      </div>

      {/* Control Panel de Filtros */}
      <Collapse
        defaultActiveKey={['1']}
        style={{ marginBottom: 24, borderRadius: '8px', boxShadow: '0 1px 2px -2px rgba(0, 0, 0, 0.16)', background: '#fff' }}
        items={[
          {
            key: '1',
            label: (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text strong style={{ fontSize: '15px', color: '#262626' }}>
                    <FilterOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                    Parámetros de Análisis
                  </Text>
                  {cantidadFiltrosActivos > 0 && (
                    <Tag color="blue" style={{ borderRadius: '10px', margin: 0 }}>
                      {cantidadFiltrosActivos} activo{cantidadFiltrosActivos > 1 ? 's' : ''}
                    </Tag>
                  )}
                </div>

                {tieneFiltrosActivos && (
                  <div 
                    onClick={(e) => e.stopPropagation()} 
                    style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}
                  >
                    {labelPeriodo && (
                      <Tag 
                        color="blue" 
                        closable 
                        onClose={(e) => { e.stopPropagation(); removerFiltro('periodo'); }} 
                        style={{ borderRadius: '12px', padding: '1px 8px', fontWeight: 500, margin: 0 }}
                      >
                        Período: {labelPeriodo}
                      </Tag>
                    )}
                    {filtros.busqueda && (
                      <Tag 
                        color="blue" 
                        closable 
                        onClose={(e) => { e.stopPropagation(); removerFiltro('busqueda'); }} 
                        style={{ borderRadius: '12px', padding: '1px 8px', fontWeight: 500, margin: 0 }}
                      >
                        Búsqueda: "{filtros.busqueda}"
                      </Tag>
                    )}
                    {labelVendedor && (
                      <Tag 
                        color="purple" 
                        closable 
                        onClose={(e) => { e.stopPropagation(); removerFiltro('vendedor'); }} 
                        style={{ borderRadius: '12px', padding: '1px 8px', fontWeight: 500, margin: 0 }}
                      >
                        Vendedor: {labelVendedor}
                      </Tag>
                    )}
                    {labelEstado && (
                      <Tag 
                        color={filtros.estado === 'COMPLETADA' ? 'success' : filtros.estado === 'PENDIENTE' ? 'processing' : 'error'} 
                        closable 
                        onClose={(e) => { e.stopPropagation(); removerFiltro('estado'); }} 
                        style={{ borderRadius: '12px', padding: '1px 8px', fontWeight: 500, margin: 0 }}
                      >
                        Estado: {labelEstado}
                      </Tag>
                    )}
                    {labelTipoProducto && (
                      <Tag 
                        color="cyan" 
                        closable 
                        onClose={(e) => { e.stopPropagation(); removerFiltro('tipoProducto'); }} 
                        style={{ borderRadius: '12px', padding: '1px 8px', fontWeight: 500, margin: 0 }}
                      >
                        Tipo: {labelTipoProducto}
                      </Tag>
                    )}
                    <Button 
                      type="link" 
                      size="small" 
                      onClick={(e) => { e.stopPropagation(); limpiarFiltros(); }} 
                      style={{ padding: '0 4px', fontSize: '12px', height: 'auto' }}
                    >
                      Limpiar todos
                    </Button>
                  </div>
                )}
              </div>
            ),
            children: (
              <Row gutter={[24, 16]} align="bottom">
                <Col xs={24} sm={12} md={4}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Búsqueda</Text>
                    {filtros.busqueda && (
                      <Tag color="blue" closable onClose={() => removerFiltro('busqueda')} style={{ margin: 0, fontWeight: 500 }}>
                        "{filtros.busqueda}"
                      </Tag>
                    )}
                  </div>
                  <Search
                    placeholder="Buscar..."
                    allowClear
                    value={filtros.busqueda}
                    onChange={(e) => aplicarFiltros({ busqueda: e.target.value })}
                    onSearch={(value) => aplicarFiltros({ busqueda: value })}
                    loading={loading.ventas}
                    style={{ width: '100%', borderRadius: '6px' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={4}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Mes a Consultar</Text>
                    {labelPeriodo && (
                      <Tag color="blue" closable onClose={() => removerFiltro('periodo')} style={{ margin: 0, fontWeight: 500 }}>
                        {labelPeriodo}
                      </Tag>
                    )}
                  </div>
                  <Space.Compact style={{ width: '100%' }}>
                    <Select
                      style={{ width: '60%', borderRadius: '6px 0 0 6px' }}
                      placeholder="Mes"
                      value={filtros.mes}
                      onChange={(value) => aplicarFiltros({ mes: value })}
                      allowClear
                    >
                      <Option value={1}>Ene</Option>
                      <Option value={2}>Feb</Option>
                      <Option value={3}>Mar</Option>
                      <Option value={4}>Abr</Option>
                      <Option value={5}>May</Option>
                      <Option value={6}>Jun</Option>
                      <Option value={7}>Jul</Option>
                      <Option value={8}>Ago</Option>
                      <Option value={9}>Sep</Option>
                      <Option value={10}>Oct</Option>
                      <Option value={11}>Nov</Option>
                      <Option value={12}>Dic</Option>
                    </Select>
                    <Select
                      style={{ width: '40%', borderRadius: '0 6px 6px 0' }}
                      placeholder="Año"
                      value={filtros.anio}
                      onChange={(value) => aplicarFiltros({ anio: value })}
                      allowClear
                    >
                      <Option value={2024}>24</Option>
                      <Option value={2025}>25</Option>
                      <Option value={2026}>26</Option>
                    </Select>
                  </Space.Compact>
                </Col>
                <Col xs={24} sm={12} md={4}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Vendedor</Text>
                    {labelVendedor && (
                      <Tag color="purple" closable onClose={() => removerFiltro('vendedor')} style={{ margin: 0, fontWeight: 500 }}>
                        {labelVendedor}
                      </Tag>
                    )}
                  </div>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Todos"
                    value={filtros.vendedor}
                    onChange={(value) => aplicarFiltros({ vendedor: value })}
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                    loading={loadingEmpleados}
                  >
                    {empleados.map(empleado => (
                      <Option key={empleado.id} value={empleado.id}>
                        {empleado.nombreCompleto}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col xs={24} sm={12} md={4}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Estado</Text>
                    {labelEstado && (
                      <Tag 
                        color={filtros.estado === 'COMPLETADA' ? 'success' : filtros.estado === 'PENDIENTE' ? 'processing' : 'error'} 
                        closable 
                        onClose={() => removerFiltro('estado')} 
                        style={{ margin: 0, fontWeight: 500 }}
                      >
                        {labelEstado}
                      </Tag>
                    )}
                  </div>
                  <Select
                    style={{ width: '100%' }}
                    value={filtros.estado}
                    onChange={(value) => aplicarFiltros({ estado: value })}
                    placeholder="Todos"
                  >
                    <Option value="todos">Todos</Option>
                    {estadosVenta.map(estado => (
                      <Option key={estado.value} value={estado.value}>
                        {estado.label}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col xs={24} sm={12} md={4}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Tipo Producto</Text>
                    {labelTipoProducto && (
                      <Tag color="cyan" closable onClose={() => removerFiltro('tipoProducto')} style={{ margin: 0, fontWeight: 500 }}>
                        {labelTipoProducto}
                      </Tag>
                    )}
                  </div>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Todos"
                    value={filtros.tipoProducto}
                    onChange={(value) => aplicarFiltros({ tipoProducto: value })}
                    allowClear
                  >
                    {tiposProducto.map(tipo => (
                      <Option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col xs={24} sm={24} md={4}>
                  <Button 
                    block 
                    icon={<ReloadOutlined />} 
                    onClick={limpiarFiltros} 
                    disabled={!tieneFiltrosActivos || loading.ventas} 
                    style={{ borderRadius: '6px' }}
                  >
                    Reset
                  </Button>
                </Col>
              </Row>
            )
          }
        ]}
      />

      {/* Métricas principales */}
      <Spin spinning={loading.estadisticas}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} bodyStyle={{ padding: '24px' }} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}>
              <Statistic
                title={<span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Ventas Totales</span>}
                value={totalVentasCount}
                prefix={<ShoppingCartOutlined style={{ fontSize: '20px' }} />}
                valueStyle={{ color: '#1890ff', fontWeight: 600, fontSize: '24px' }}
                loading={loading.estadisticas}
                formatter={value => new Intl.NumberFormat('es-CR').format(value)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} bodyStyle={{ padding: '24px' }} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}>
              <Statistic
                title={<span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Ingresos Totales</span>}
                value={totalIngresos}
                precision={2}
                prefix={<ArrowUpOutlined style={{ fontSize: '20px' }} />}
                valueStyle={{ color: '#52c41a', fontWeight: 600, fontSize: '24px' }}
                loading={loading.estadisticas}
                formatter={value => `₡${new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} bodyStyle={{ padding: '24px' }} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}>
              <Statistic
                title={<span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Ventas Completadas</span>}
                value={ventasCompletadas}
                prefix={<CheckCircleOutlined style={{ fontSize: '20px' }} />}
                valueStyle={{ color: '#722ed1', fontWeight: 600, fontSize: '24px' }}
                loading={loading.estadisticas}
                formatter={value => new Intl.NumberFormat('es-CR').format(value)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} bodyStyle={{ padding: '24px' }} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}>
              <Statistic
                title={<span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Tasa de Conversión</span>}
                value={tasaConversion}
                precision={2}
                suffix="%"
                valueStyle={{ color: '#fa8c16', fontWeight: 600, fontSize: '24px' }}
                loading={loading.estadisticas}
                formatter={value => new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}
              />
            </Card>
          </Col>
        </Row>
      </Spin>

      <Tabs
        defaultActiveKey="1"
        size="large"
        style={{ background: 'transparent' }}
        items={[
          {
            key: '1',
            label: (
              <span style={{ fontSize: '16px', fontWeight: 500 }}>
                <BarChartOutlined /> Reporte General
              </span>
            ),
            children: (
              <div style={{ marginTop: '8px' }}>
                {/* Sección Vista Excel de Ventas Mensuales */}
                <Card
                  title={
                    <span style={{ fontWeight: 600, fontSize: '18px' }}>
                      <BarChartOutlined style={{ marginRight: 8 }} />
                      Vista Excel de Ventas Mensuales
                    </span>
                  }
                  extra={
                    <Button
                      icon={<FileExcelOutlined />}
                      onClick={exportarAExcelCompleto}
                      loading={exportandoExcel}
                      type="primary"
                      style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', boxShadow: '0 2px 4px rgba(82,196,26,0.2)' }}
                    >
                      Exportar a Excel
                    </Button>
                  }
                  bordered={false}
                  style={{ marginBottom: 24, borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)', border: '1px solid #f0f0f0' }}
                  headStyle={{ borderBottom: '1px solid #f0f0f0', padding: '0 24px', minHeight: '64px' }}
                  bodyStyle={{ padding: '0' }}
                >
                  <div style={{ padding: '24px' }}>
                    <Table
                      columns={columnsVistaExcel}
                      dataSource={datosVistaExcel}
                      rowKey="id"
                      loading={loadingVistaExcelActual || loadingVistaExcelEspecifico}
                      scroll={{ x: 1200 }}
                      size="middle"
                      pagination={{
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} registros`
                      }}
                      locale={{
                        emptyText: (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                              <span>
                                <InboxOutlined style={{ fontSize: 20, color: '#999', marginRight: 8 }} />
                                {!filtros.mes && !filtros.anio
                                  ? 'Selecciona un mes y año específicos en el filtro superior'
                                  : 'No hay datos para el período seleccionado'}
                              </span>
                            }
                          />
                        )
                      }}
                    />
                  </div>
                </Card>


                {/* Tabla de ventas */}
                <Card
                  title={
                    <Space>
                      <span style={{ fontWeight: 600, fontSize: '18px' }}>
                        <TeamOutlined style={{ marginRight: 8 }} />
                        Ventas por Empleado
                      </span>
                      {filtros.vendedor && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                          Filtrado por: {empleados.find(e => e.id === filtros.vendedor)?.nombreCompleto || 'Vendedor'}
                        </Tag>
                      )}
                    </Space>
                  }
                  extra={
                    <Space>
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', boxShadow: '0 2px 4px rgba(82,196,26,0.2)' }}
                        onClick={exportarAExcel}
                        loading={loading.exportar}
                      >
                        Exportar a Excel
                      </Button>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={cargarDatosIniciales}
                        loading={loading.ventas}
                        type="text"
                      >
                        Actualizar
                      </Button>
                    </Space>
                  }
                  bordered={false}
                  style={{ marginBottom: 24, borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)', border: '1px solid #f0f0f0' }}
                  headStyle={{ borderBottom: '1px solid #f0f0f0', padding: '0 24px', minHeight: '64px' }}
                  bodyStyle={{ padding: '0' }}
                >
                  <div style={{ padding: '24px' }}>
                    <Table
                      columns={columnsVentasAgrupadas}
                      dataSource={ventasAgrupadas}
                      rowKey="empleado"
                      pagination={{
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} registros`
                      }}
                      loading={loading.ventas}
                      scroll={{ x: 1000 }}
                      size="middle"
                      locale={{
                        emptyText: (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                              <span>
                                <InboxOutlined style={{ fontSize: 20, color: '#999', marginRight: 8 }} />
                                No hay datos de ventas por empleado
                              </span>
                            }
                          />
                        )
                      }}
                    />
                  </div>
                </Card>

              </div>
            )
          },
          user?.rol !== 'CONTADOR' && {
            key: '2',
            label: (
              <span style={{ fontSize: '16px', fontWeight: 500 }}>
                <TeamOutlined /> Pago de Comisiones
              </span>
            ),
            children: (
              <div style={{ marginTop: '8px' }}>
                <ComisionesPendientes
                  mesFiltro={filtros.mes}
                  anioFiltro={filtros.anio}
                />
              </div>
            )
          }
        ].filter(Boolean)}
      />

      {/* Modal para ver detalles de venta */}
      <Modal
        title="Detalle de Venta"
        visible={!!ventaSeleccionada}
        onCancel={() => setVentaSeleccionada(null)}
        footer={null}
        width={700}
      >
        <Form
          layout="vertical"
          initialValues={ventaSeleccionada || {}}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="ID de Venta" name="id">
                <Input readOnly />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Fecha" name="fecha">
                <Input readOnly />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Vendedor" name={['vendedor', 'nombreCompleto']}>
                <Input readOnly />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Cliente" name={['cliente', 'nombreCompleto']}>
                <Input readOnly />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Monto Total" name="montoTotal">
            <Input
              readOnly
              style={{ fontWeight: 'bold' }}
              prefix="₡"
              value={ventaSeleccionada?.montoTotal ? new Intl.NumberFormat('es-CR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }).format(ventaSeleccionada.montoTotal) : '0.00'}
            />
          </Form.Item>

          <Form.Item label="Estado" name="estado">
            <Input readOnly />
          </Form.Item>
        </Form>
      </Modal>

      {/* Estilos */}
      <style jsx global>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .filter-label {
          margin-bottom: 4px;
          font-weight: 500;
        }
        
        .ventas-table-card :global(.ant-card-head) {
          border-bottom: 1px solid #f0f0f0;
        }
        
        .ventas-table-card :global(.ant-table-thead > tr > th) {
          background: #fafafa;
          font-weight: 600;
        }
        
        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: 16px;
            align-items: flex-start;
          }
          
          .ventas-table-card :global(.ant-table) {
            overflow-x: auto;
          }
        }
      `}</style>

      <ModalEnviarReporteEmail
        visible={modalEmailVisible}
        onCancel={() => setModalEmailVisible(false)}
        tipoReporte="Ventas"
        periodo={labelPeriodo || `${MESES_NOMBRES[mesExcel - 1]} ${anioExcel}`}
        metricasPersonalizadas={[
          { label: 'Ventas Totales', value: formatCurrency(totalIngresos || 0), color: '#52c41a' },
          { label: 'Comisiones Equipo', value: formatCurrency((ventasAgrupadas || []).reduce((sum, v) => sum + (v.totalComisiones || 0), 0)), color: '#fa8c16' },
          { label: 'Operaciones', value: `${totalVentasCount || 0} ventas`, color: '#1890ff' }
        ]}
        onEnviar={handleEnviarEmail}
      />
    </Content>
  );
};

export default VentasReportes;
