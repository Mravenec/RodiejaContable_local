import React, { useState, useEffect, useCallback } from 'react';
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
  Tabs
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
  ArrowUpOutlined
} from '@ant-design/icons';
import moment from 'moment';
import ventasEmpleadosService from '../../api/ventasEmpleados';
import { buscarTransacciones } from '../../api/transacciones';
import { useVistaExcelMesActual, useVistaExcelMesEspecifico, useGenerarReporteVentasExcel } from '../../hooks/useReportes';
import { useEmpleados } from '../../hooks/useEmpleados';
import * as XLSX from 'xlsx';
import ComisionesPendientes from '../../components/finanzas/ComisionesPendientes';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;
const { Content } = Layout;

const VentasReportes = () => {
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

  // Tipos de productos y estados
  const tiposProducto = [
    { value: 'VEHICULO', label: 'Vehículo' },
    { value: 'REPUESTO', label: 'Repuesto' },
    { value: 'SERVICIO', label: 'Servicio' }
  ];

  const estadosVenta = [
    { value: 'completado', label: 'Completado', color: 'success' },
    { value: 'pendiente', label: 'Pendiente', color: 'processing' },
    { value: 'cancelado', label: 'Cancelado', color: 'error' },
    { value: 'reembolsado', label: 'Reembolsado', color: 'warning' }
  ];


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

      // Filtrar localmente por vendedor/empleado y búsqueda (si la API no soporta texto libre en /buscar)
      if (params.vendedorId) {
        const empleadoSeleccionado = empleados.find(e => e.id === params.vendedorId);
        if (empleadoSeleccionado) {
          datosTransacciones = datosTransacciones.filter(t => t.empleado === empleadoSeleccionado.nombreCompleto);
        }
      }

      if (params.busqueda) {
        const lowerSearch = params.busqueda.toLowerCase();
        datosTransacciones = datosTransacciones.filter(t =>
          (t.codigoTransaccion && t.codigoTransaccion.toLowerCase().includes(lowerSearch)) ||
          (t.empleado && t.empleado.toLowerCase().includes(lowerSearch)) ||
          (t.cliente && t.cliente.toLowerCase().includes(lowerSearch)) ||
          (t.codigoVehiculo && t.codigoVehiculo.toLowerCase().includes(lowerSearch)) ||
          (t.codigoRepuesto && t.codigoRepuesto.toLowerCase().includes(lowerSearch))
        );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

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

  // Exportar a Excel usando los datos locales
  const exportarAExcel = () => {
    try {
      setLoading(prev => ({ ...prev, exportar: true }));

      const exportData = ventasAgrupadas.map(v => ({
        'Empleado': v.empleado,
        'Cantidad de Ventas': v.cantidadVentas,
        'Total Ventas': v.totalVentas,
        'Total Comisiones': v.totalComisiones
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ventas por Empleado");
      XLSX.writeFile(wb, `resumen-ventas-empleados-${moment().format('YYYYMMDD')}.xlsx`);

      message.success('Reporte exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar el reporte:', error);
      message.error('Error al generar el archivo Excel');
    } finally {
      setLoading(prev => ({ ...prev, exportar: false }));
    }
  };


  // // Función para exportar a Excel con múltiples hojas por mes
  // const exportarVistaExcel = async () => {
  //   try {
  //     setLoading(prev => ({ ...prev, exportandoExcel: true }));

  //     // Obtener datos actuales
  //     const datosActuales = vistaExcelEspecifico || vistaExcelActual || [];

  //     if (!datosActuales || datosActuales.length === 0) {
  //       message.warning('No hay datos para exportar');
  //       return;
  //     }

  //     // Agrupar datos por mes
  //     const datosPorMes = {};
  //     datosActuales.forEach(item => {
  //       const claveMes = `${item.nombreMes}_${item.anio}`;
  //       if (!datosPorMes[claveMes]) {
  //         datosPorMes[claveMes] = [];
  //       }
  //       datosPorMes[claveMes].push(item);
  //     });

  //     // Crear workbook
  //     const wb = XLSX.utils.book_new();

  //     // Procesar cada mes como una hoja diferente
  //     Object.keys(datosPorMes).forEach(claveMes => {
  //       const datosMes = datosPorMes[claveMes];

  //       // Preparar datos para la hoja
  //       const datosHoja = datosMes.map((item, index) => ({
  //         '#': index + 1,
  //         'Vendedor': item.nombreDel,
  //         'Descripción': item.descripcionLinea,
  //         'Factura': item.nfactura,
  //         'Precio Unitario': item.precioUnitario,
  //         'Comisión': item.comision,
  //         'Forma de Pago': item.formaDePago,
  //         'Fecha': Array.isArray(item.fecha) 
  //           ? moment([item.fecha[0], item.fecha[1] - 1, item.fecha[2]]).format('DD/MM/YYYY')
  //           : moment(item.fecha).format('DD/MM/YYYY'),
  //         'Ingresos Brutos Vendedor': item.ingresosBrutoAcumuladosVendedor,
  //         'Comisión Acumulada': item.comisionAcumuladaDelVendedor,
  //         'Ingreso Neto Vendedor': item.ingresoNetoVendedor,
  //         'Comisión Acumulada Equipo': item.comisionAcumuladaEquipoMes,
  //         'Ingresos Brutos Equipo': item.ingresosBrutoAcumuladosEquipoMes,
  //         'Ingreso Neto Rodieja': item.ingresoNetoParaRodiejaMes
  //       }));

  //       // Agregar fila de totales al final
  //       const totales = {
  //         '#': 'TOTAL',
  //         'Vendedor': '',
  //         'Descripción': '',
  //         'Factura': '',
  //         'Precio Unitario': datosMes.reduce((sum, item) => sum + item.precioUnitario, 0),
  //         'Comisión': datosMes.reduce((sum, item) => sum + item.comision, 0),
  //         'Forma de Pago': '',
  //         'Fecha': '',
  //         'Ingresos Brutos Vendedor': datosMes[0]?.ingresosBrutoAcumuladosVendedor || 0,
  //         'Comisión Acumulada': datosMes[0]?.comisionAcumuladaDelVendedor || 0,
  //         'Ingreso Neto Vendedor': datosMes[0]?.ingresoNetoVendedor || 0,
  //         'Comisión Acumulada Equipo': datosMes[0]?.comisionAcumuladaEquipoMes || 0,
  //         'Ingresos Brutos Equipo': datosMes[0]?.ingresosBrutoAcumuladosEquipoMes || 0,
  //         'Ingreso Neto Rodieja': datosMes[0]?.ingresoNetoParaRodiejaMes || 0
  //       };
  //       datosHoja.push(totales);

  //       // Crear worksheet
  //       const ws = XLSX.utils.json_to_sheet(datosHoja);

  //       // Ajustar anchos de columna
  //       const colWidths = [
  //         { wch: 5 },  // #
  //         { wch: 15 }, // Vendedor
  //         { wch: 30 }, // Descripción
  //         { wch: 20 }, // Factura
  //         { wch: 15 }, // Precio Unitario
  //         { wch: 12 }, // Comisión
  //         { wch: 15 }, // Forma de Pago
  //         { wch: 12 }, // Fecha
  //         { wch: 20 }, // Ingresos Brutos Vendedor
  //         { wch: 18 }, // Comisión Acumulada
  //         { wch: 18 }, // Ingreso Neto Vendedor
  //         { wch: 20 }, // Comisión Acumulada Equipo
  //         { wch: 20 }, // Ingresos Brutos Equipo
  //         { wch: 18 }  // Ingreso Neto Rodieja
  //       ];
  //       ws['!cols'] = colWidths;

  //       // Agregar hoja al workbook
  //       XLSX.utils.book_append_sheet(wb, ws, claveMes.substring(0, 31)); // Limitar nombre de hoja
  //     });

  //     // Generar y descargar archivo
  //     const nombreArchivo = `vista-excel-ventas-${moment().format('YYYYMMDD-HHmmss')}.xlsx`;
  //     XLSX.writeFile(wb, nombreArchivo);

  //     message.success('Archivo Excel exportado correctamente');
  //   } catch (error) {
  //     console.error('Error al exportar a Excel:', error);
  //     message.error('Error al exportar a Excel');
  //   } finally {
  //     setLoading(prev => ({ ...prev, exportandoExcel: false }));
  //   }
  // };


  // Obtener métricas de las estadísticas
  const totalVentasCount = estadisticas?.totalVentasCount || estadisticas?.totalTransacciones || 0;
  const totalIngresos = estadisticas?.totalVentas || 0;
  const ventasCompletadas = estadisticas?.totalVentasCount || estadisticas?.totalTransacciones || 0;
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
    const data = vistaExcelEspecifico || vistaExcelActual || [];
    return data.filter(item => item.nombreDel && item.nombreDel.trim() !== '');
  }, [vistaExcelEspecifico, vistaExcelActual]);

  // Función para exportar a Excel con múltiples hojas
  const exportarAExcelCompleto = () => {
    const datosActuales = datosVistaExcel;

    if (!datosActuales || datosActuales.length === 0) {
      message.warning('No hay datos para exportar');
      return;
    }

    try {
      // Agrupar datos por mes
      const datosPorMes = {};
      datosActuales.forEach(item => {
        const claveMes = `${item.nombreMes}_${item.anio}`;
        if (!datosPorMes[claveMes]) {
          datosPorMes[claveMes] = [];
        }
        datosPorMes[claveMes].push(item);
      });

      // Debug: Mostrar primeros datos para verificar campos
      console.log('🔍 [DEBUG] Primer item de datos:', datosActuales[0]);
      console.log('🔍 [DEBUG] Campos disponibles:', Object.keys(datosActuales[0] || {}));

      // Crear workbook
      const wb = XLSX.utils.book_new();

      // Crear hojas para cada mes
      Object.keys(datosPorMes).forEach(claveMes => {
        const datos = datosPorMes[claveMes];
        const primerItem = datos[0];

        // Preparar datos para la hoja
        const datosHoja = datos.map(item => ({
          'Fecha': Array.isArray(item.fecha) ?
            `${item.fecha[2]}/${item.fecha[1]}/${item.fecha[0]}` :
            moment(item.fecha).format('DD/MM/YYYY'),
          'Vendedor': item.nombreDel || '',
          'Descripción/Observación': item.descripcionLinea || '',
          'Forma de Pago': item.formaDePago || '',
          'Ingreso': item.precioUnitario || 0,
          'Comisión Equipo': item.comision || 0
        }));

        // Crear hoja

        // Agregar título y subtítulo
        const titulo = `REPORTE DE VENTAS EMPLEADOS - ${primerItem.nombreMes} ${primerItem.anio}`;
        const comisionFormateada = new Intl.NumberFormat('es-CR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(primerItem.comisionAcumuladaEquipoMes || 0);
        const ingresosFormateados = new Intl.NumberFormat('es-CR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(primerItem.ingresosBrutoAcumuladosEquipoMes || 0);
        const ingresoNetoFormateado = new Intl.NumberFormat('es-CR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(primerItem.ingresoNetoParaRodiejaMes || 0);
        const subtituloComision = `Comisión Acumulada: ₡${comisionFormateada}`;
        const subtituloIngresosBrutos = `Ingresos Brutos: ₡${ingresosFormateados}`;
        const subtituloIngresoNeto = `Ingreso Neto Rodieja: ₡${ingresoNetoFormateado}`;

        // Crear array con títulos y datos
        const datosConTitulo = [
          [titulo],
          [subtituloComision, '', '', subtituloIngresosBrutos, '', '', subtituloIngresoNeto, ''],
          [], // Fila vacía
          ['Fecha', 'Vendedor', 'Descripción/Observación', 'Forma de Pago', 'Ingreso', 'Comisión Equipo'],
          ...Object.values(datosHoja).map(row => Object.values(row))
        ];

        // Recrear hoja con títulos
        const wsConTitulo = XLSX.utils.aoa_to_sheet(datosConTitulo);

        // Agregar colores de fondo a los títulos
        // Color para el título principal (azul oscuro)
        wsConTitulo['A1'].s = {
          fill: { fgColor: { rgb: "FF2E75B6" } },
          font: { sz: 16, bold: true, color: { rgb: "FFFFFFFF" } },
          alignment: { horizontal: "center" }
        };

        // Color para el subtítulo (verde) - aplicado a grupos de 3 celdas
        const subtitleStyle = {
          fill: { fgColor: { rgb: "FF70AD47" } },
          font: { sz: 12, bold: true, color: { rgb: "FFFFFFFF" } },
          alignment: { horizontal: "center" }
        };

        // Aplicar estilo a las celdas de comisión (A2, B2, C2)
        wsConTitulo['A2'].s = subtitleStyle;
        wsConTitulo['B2'].s = subtitleStyle;
        wsConTitulo['C2'].s = subtitleStyle;

        // Aplicar estilo a las celdas de ingresos brutos (D2, E2, F2)
        wsConTitulo['D2'].s = subtitleStyle;
        wsConTitulo['E2'].s = subtitleStyle;
        wsConTitulo['F2'].s = subtitleStyle;

        // Aplicar estilo a las celdas de ingreso neto (G2, H2)
        wsConTitulo['G2'].s = subtitleStyle;
        wsConTitulo['H2'].s = subtitleStyle;

        // Estilo para los títulos de columnas (negrita)
        const headerStyle = {
          font: { bold: true, sz: 12 },
          fill: { fgColor: { rgb: "FFF2CC" } },
          alignment: { horizontal: "center", vertical: "center" }
        };

        // Aplicar estilo de negrita a los títulos de columnas (fila 4)
        const columnHeaders = ['A4', 'B4', 'C4', 'D4', 'E4', 'F4'];
        columnHeaders.forEach(cell => {
          if (wsConTitulo[cell]) {
            wsConTitulo[cell].s = headerStyle;
          } else {
            // Si la celda no existe, crearla con el estilo
            const col = cell.charCodeAt(0) - 65; // Convertir A=0, B=1, etc.
            wsConTitulo[cell] = {
              v: ['Fecha', 'Vendedor', 'Descripción/Observación', 'Forma de Pago', 'Ingreso', 'Comisión Equipo'][col],
              s: headerStyle
            };
          }
        });

        // Aplicar el estilo a todas las celdas del título (merge effect)
        const range = XLSX.utils.decode_range(wsConTitulo['!ref']);
        for (let col = 0; col <= range.e.c; col++) {
          const cellTitle = XLSX.utils.encode_cell({ r: 0, c: col });

          if (col > 0) { // Copiar estilo a otras columnas del título
            wsConTitulo[cellTitle] = { v: '', s: wsConTitulo['A1'].s };
          }
        }

        // Ajustar ancho de columnas
        const colWidths = [
          { wch: 12 },  // Fecha
          { wch: 15 },  // Vendedor
          { wch: 40 },  // Descripción/Observación
          { wch: 15 },  // Forma de Pago
          { wch: 15 },  // Ingreso
          { wch: 15 }   // Comisión Equipo
        ];
        wsConTitulo['!cols'] = colWidths;

        // Agregar hoja al workbook
        XLSX.utils.book_append_sheet(wb, wsConTitulo, claveMes);
      });

      // Generar y descargar archivo
      const nombreArchivo = `Reporte_Ventas_Completo_${moment().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
      XLSX.writeFile(wb, nombreArchivo);
      message.success('Reporte exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      message.error('Error al exportar el reporte a Excel');
    }
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
              <Text strong style={{ fontSize: '15px', color: '#262626' }}>
                <FilterOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                Parámetros de Análisis
              </Text>
            ),
            children: (
              <Row gutter={[24, 16]} align="bottom">
                <Col xs={24} sm={12} md={4}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '12px' }}>Búsqueda</Text>
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
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '12px' }}>Mes a Consultar</Text>
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
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '12px' }}>Vendedor</Text>
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
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '12px' }}>Estado</Text>
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
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '12px' }}>Tipo Producto</Text>
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
                  <Button block icon={<ReloadOutlined />} onClick={limpiarFiltros} disabled={loading.ventas} style={{ borderRadius: '6px' }}>
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
          {
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
        ]}
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
    </Content>
  );
};

export default VentasReportes;
