import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import VentasEmpleadosService from '../../api/ventasEmpleados';
import { getTransaccionesIngresos } from '../../api/transacciones';
import api from '../../api/axios';
import { 
  Card, 
  Tabs, 
  Row, 
  Col, 
  Select, 
  Button, 
  Table, 
  Typography, 
  Statistic,
  Progress,
  Divider
} from 'antd';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  BarChartOutlined, 
  PieChartOutlined, 
  LineChartOutlined, 
  DollarOutlined, 
  CarOutlined, 
  ShoppingCartOutlined,
  UserOutlined,
  ToolOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// Colores para el gráfico de pastel
const COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#faad14'];

// Función para formatear moneda
const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '₡0';
  }
  return `₡${Number(value).toLocaleString('es-CR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
};

const Reportes = () => {
  // Obtener fecha actual fuera del componente para evitar problemas de acceso
  const ahora = new Date();
  
  const [loading, setLoading] = useState({
    ventasMensuales: false,
    topEmpleados: false,
    ventasRecientes: false,
    metricas: false,
    analisis: false
  });
  // const [rangoFechas, setRangoFechas] = useState(null);
  // const [filtroTipo, setFiltroTipo] = useState('todos');
  // const [filtroEstado, setFiltroEstado] = useState('todos');
  // const [anioActual] = useState(new Date().getFullYear());
  
  // Estados para análisis financiero
  const [anioSeleccionado, setAnioSeleccionado] = useState(ahora.getFullYear());
  const [mesSeleccionado, setMesSeleccionado] = useState(ahora.getMonth() + 1);
  const [analisisFinanciero, setAnalisisFinanciero] = useState(null);
  const [loadingAnalisis, setLoadingAnalisis] = useState(false);
  
  // Estados para los datos de la API
  const [ventasMensuales, setVentasMensuales] = useState([]);
  const [topEmpleados, setTopEmpleados] = useState([]);
  const [setVentasRecientes] = useState([]);
  const [comisiones, setComisiones] = useState([]);
  const [metricas, setMetricas] = useState({
    totalVentas: 0,
    totalIngresos: 0,
    promedioVenta: 0,
    vehiculosStock: 0,
    tasaConversion: 0,
  });
  
  // Cargar datos iniciales
  useEffect(() => {
    console.log('Cargando datos iniciales...');
    cargarDatosIniciales();
    
    // Cargar automáticamente el análisis financiero del período actual
    const anioActual = ahora.getFullYear();
    const mesActual = ahora.getMonth() + 1;
    
    console.log(`Cargando análisis financiero automático: ${anioActual}/${mesActual}`);
    fetchAnalisisFinanciero(anioActual, mesActual);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const cargarDatosIniciales = async () => {
    try {
      console.log('Iniciando carga de datos...');
      
      // Cargar métricas generales
      setLoading(prev => ({ ...prev, metricas: true }));
      try {
        console.log('=== CARGANDO MÉTRICAS DESDE VENTAS EMPLEADOS SERVICE ===');
        const estadisticas = await VentasEmpleadosService.getEstadisticasVentas();
        console.log('Métricas crudas recibidas:', estadisticas);
        console.log('Estructura de estadisticas:', Object.keys(estadisticas || {}));
        console.log('totalIngresos específico:', estadisticas?.totalIngresos);
        console.log('totalIngresos tipo:', typeof estadisticas?.totalIngresos);
        
        // Si no hay ingresos desde el API, intentar calcularlos desde transacciones
        let ingresosTotales = estadisticas?.totalIngresos || 0;
        
        if (ingresosTotales === 0) {
          console.log('Intentando calcular ingresos desde transacciones...');
          try {
            const transacciones = await getTransaccionesIngresos();
            const totalCalculado = transacciones.reduce((sum, t) => sum + (t.monto || 0), 0);
            console.log('Ingresos calculados desde transacciones:', totalCalculado);
            ingresosTotales = totalCalculado;
          } catch (error) {
            console.error('Error al calcular ingresos desde transacciones:', error);
          }
        }
        
        setMetricas({
          totalVentas: estadisticas.totalVentas || 0,
          totalIngresos: ingresosTotales,
          promedioVenta: estadisticas.promedioVenta || 0,
          vehiculosStock: estadisticas.vehiculosStock || 0,
          tasaConversion: estadisticas.tasaConversion || 0,
        });
        
        console.log('Métricas establecidas:', {
          totalVentas: estadisticas.totalVentas || 0,
          totalIngresos: ingresosTotales,
          promedioVenta: estadisticas.promedioVenta || 0,
          vehiculosStock: estadisticas.vehiculosStock || 0,
          tasaConversion: estadisticas.tasaConversion || 0,
        });
      } catch (error) {
        console.error('Error al cargar métricas:', error);
        console.error('Error completo:', error);
        
        // Intentar calcular desde transacciones como fallback
        try {
          console.log('Fallback: calculando ingresos desde transacciones...');
          const transacciones = await getTransaccionesIngresos();
          const totalCalculado = transacciones.reduce((sum, t) => sum + (t.monto || 0), 0);
          console.log('Ingresos calculados desde transacciones (fallback):', totalCalculado);
          
          setMetricas({
            totalVentas: 0,
            totalIngresos: totalCalculado,
            promedioVenta: 0,
            vehiculosStock: 0,
            tasaConversion: 0,
          });
        } catch (fallbackError) {
          console.error('Error en fallback:', fallbackError);
          // Usar valores por defecto si hay un error
          setMetricas({
            totalVentas: 0,
            totalIngresos: 0,
            promedioVenta: 0,
            vehiculosStock: 0,
            tasaConversion: 0,
          });
        }
      }
      
      // Cargar ventas mensuales con manejo de error 404
      setLoading(prev => ({ ...prev, ventasMensuales: true }));
      try {
        // Usar el endpoint de transacciones de ingresos para obtener datos más detallados
        const transaccionesData = await getTransaccionesIngresos();
        console.log('Transacciones de ingresos crudas:', transaccionesData);
        
        // Agrupar transacciones por mes
        const transaccionesAgrupadasPorMes = agruparTransaccionesPorMes(transaccionesData);
        console.log('Transacciones agrupadas por mes:', transaccionesAgrupadasPorMes);
        
        setVentasMensuales(Array.isArray(transaccionesAgrupadasPorMes) ? transaccionesAgrupadasPorMes : []);
      } catch (error) {
        console.error('Error al cargar ventas mensuales:', error);
        setVentasMensuales([]);
      }
      
      // Cargar top empleados
      setLoading(prev => ({ ...prev, topEmpleados: true }));
      try {
        const topEmpleadosData = await VentasEmpleadosService.getTopEmpleados(5);
        console.log('Top empleados cargados:', topEmpleadosData);
        
        // Calcular porcentajes reales
        const empleadosConPorcentajes = calcularPorcentajes(topEmpleadosData);
        console.log('Empleados con porcentajes calculados:', empleadosConPorcentajes);
        
        setTopEmpleados(Array.isArray(empleadosConPorcentajes) ? empleadosConPorcentajes : []);
      } catch (error) {
        console.error('Error al cargar top empleados:', error);
        setTopEmpleados([]);
      }
      
      // Cargar ventas recientes
      setLoading(prev => ({ ...prev, ventasRecientes: true }));
      try {
        const ventasRecientesData = await VentasEmpleadosService.getVentasPorEmpleado({
          limite: 5,
          ordenarPor: 'fecha',
          orden: 'desc'
        });
        console.log('Ventas recientes cargadas:', ventasRecientesData);
        setVentasRecientes(Array.isArray(ventasRecientesData) ? ventasRecientesData : []);
      } catch (error) {
        console.error('Error al cargar ventas recientes:', error);
        setVentasRecientes([]);
      }
      
      // Cargar comisiones
      try {
        const comisionesData = await VentasEmpleadosService.getVentasPorEmpleado();
        console.log('Comisiones cargadas:', comisionesData);
        
        // Filtrar solo empleados con ventas reales (transacciones > 0 y comisiones > 0)
        const comisionesConVentas = Array.isArray(comisionesData) ? comisionesData.filter(c => 
          (c.totalTransacciones || c.total_transacciones || 0) > 0 &&
          (c.totalComisiones || c.total_comision || 0) > 0
        ) : [];
        
        setComisiones(comisionesConVentas);
      } catch (error) {
        console.error('Error al cargar comisiones:', error);
        setComisiones([]);
      }
      
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
      // message.error('Error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setLoading({
        ventasMensuales: false,
        topEmpleados: false,
        ventasRecientes: false,
        metricas: false
      });
    }
  };
  
  // const columnsVentas = [
  //   {
  //     title: 'ID Venta',
  //     dataIndex: 'id',
  //     key: 'id',
  //     render: (text) => <Text strong>{text}</Text>,
  //   },
  //   {
  //     title: 'Fecha',
  //     dataIndex: 'fecha',
  //     key: 'fecha',
  //   },
  //   {
  //     title: 'Cliente',
  //     dataIndex: 'cliente',
  //     key: 'cliente',
  //   },
  //   {
  //     title: 'Vehículo',
  //     dataIndex: 'vehiculo',
  //     key: 'vehiculo',
  //   },
  //   {
  //     title: 'Vendedor',
  //     dataIndex: 'vendedor',
  //     key: 'vendedor',
  //   },
  //   {
  //     title: 'Monto',
  //     dataIndex: 'monto',
  //     key: 'monto',
  //     render: (monto) => (
  //       <Text strong>
  //         ${(monto || 0).toLocaleString('es-CR', {
  //           minimumFractionDigits: 2,
  //           maximumFractionDigits: 2
  //         })}
  //       </Text>
  //     ),
  //   },
  //   {
  //     title: 'Estado',
  //     dataIndex: 'estado',
  //     key: 'estado',
  //     render: (estado) => {
  //       const estadoConfig = {
  //         completado: { color: 'success', text: 'Completado' },
  //         pendiente: { color: 'processing', text: 'Pendiente' },
  //         cancelado: { color: 'error', text: 'Cancelado' },
  //       };
        
  //       const config = estadoConfig[estado] || { color: 'default', text: estado };
        
  //       return (
  //         <Tag color={config.color}>
  //           {config.text}
  //         </Tag>
  //       );
  //     },
  //   },
  // ];
  
  // const aplicarFiltros = async () => {
  //   try {
  //     setLoading({
  //       ventasMensuales: true,
  //       topEmpleados: true,
  //       ventasRecientes: true,
  //       metricas: true
  //     });
      
  //     const filtros = {};
      
  //     if (rangoFechas && rangoFechas[0] && rangoFechas[1]) {
  //       filtros.fechaInicio = format(rangoFechas[0], 'yyyy-MM-dd');
  //       filtros.fechaFin = format(rangoFechas[1], 'yyyy-MM-dd');
  //     }
      
  //     if (filtroTipo !== 'todos') {
  //       filtros.tipo = filtroTipo;
  //     }
      
  //     if (filtroEstado !== 'todos') {
  //       filtros.estado = filtroEstado;
  //     }
      
  //     // Aplicar filtros a las consultas
  //     const [ventasMensualesData, topEmpleadosData, ventasRecientesData, estadisticas] = await Promise.all([
  //       VentasEmpleadosService.getVentasMensuales(anioActual, filtros),
  //       VentasEmpleadosService.getTopEmpleados(5, filtros),
  //       VentasEmpleadosService.getVentasPorEmpleado({
  //         ...filtros,
  //         limite: 5,
  //         ordenarPor: 'fecha',
  //         orden: 'desc'
  //       }),
  //       VentasEmpleadosService.getEstadisticasVentas(filtros)
  //     ]);
      
  //     setVentasMensuales(ventasMensualesData);
  //     setTopEmpleados(topEmpleadosData);
  //     setVentasRecientes(ventasRecientesData);
  //     setMetricas({
  //       totalVentas: estadisticas.totalVentas || 0,
  //       totalIngresos: estadisticas.totalIngresos || 0,
  //       promedioVenta: estadisticas.promedioVenta || 0,
  //       vehiculosStock: estadisticas.vehiculosStock || 0,
  //       tasaConversion: estadisticas.tasaConversion || 0,
  //     });
      
  //   } catch (error) {
  //     console.error('Error al aplicar filtros:', error);
  //   } finally {
  //     setLoading({
  //       ventasMensuales: false,
  //       topEmpleados: false,
  //       ventasRecientes: false,
  //       metricas: false
  //     });
  //   }
  // };
  
  // const limpiarFiltros = async () => {
  //   setRangoFechas(null);
  //   setFiltroTipo('todos');
  //   setFiltroEstado('todos');
    
  //   // Recargar datos sin filtros
  //   await cargarDatosIniciales();
  // };
  
  // const exportarReporte = async (formato) => { ... };
  
  // Función para obtener análisis financiero por año y mes
  const fetchAnalisisFinanciero = async (anio, mes) => {
    try {
      console.log(`=== OBTENIENDO ANÁLISIS FINANCIERO: ${anio}/${mes || 'todos'} ===`);
      setLoadingAnalisis(true);
      
      let response;
      if (mes) {
        // Obtener análisis financiero por año y mes específico
        console.log(`Haciendo llamada a: /analisis-financiero/anio/${anio}/mes/${mes}`);
        response = await api.get(`/analisis-financiero/anio/${anio}/mes/${mes}`);
      } else {
        // Obtener análisis financiero por año completo
        console.log(`Haciendo llamada a: /analisis-financiero/anio/${anio}`);
        response = await api.get(`/analisis-financiero/anio/${anio}`);
      }
      
      console.log('Análisis financiero obtenido:', response.data);
      setAnalisisFinanciero(response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error al obtener análisis financiero:', error);
      setAnalisisFinanciero(null);
      
      // Mensaje de error más específico
      if (error.response?.status === 404) {
        // message.warning('No se encontraron datos para el período seleccionado');
      } else if (error.response?.status === 500) {
        message.error('Error del servidor al obtener análisis financiero');
      } else {
        message.error('Error al cargar análisis financiero');
      }
      
      return null;
    } finally {
      setLoadingAnalisis(false);
    }
  };
  
  // Función para calcular porcentajes de ventas
  const calcularPorcentajes = (empleados) => {
    if (!Array.isArray(empleados) || empleados.length === 0) {
      return empleados;
    }
    
    // Calcular el total de ventas de todos los empleados
    const totalVentas = empleados.reduce((total, emp) => {
      return total + (emp.totalTransacciones || emp.transaccionesVenta || 0);
    }, 0);
    
    console.log('Total de ventas para calcular porcentajes:', totalVentas);
    
    // Calcular el porcentaje para cada empleado
    return empleados.map(emp => {
      const ventasEmpleado = emp.totalTransacciones || emp.transaccionesVenta || 0;
      const porcentaje = totalVentas > 0 ? Math.round((ventasEmpleado / totalVentas) * 100) : 0;
      
      console.log(`Empleado ${emp.empleado || emp.nombre}: ${ventasEmpleado} ventas, ${porcentaje}%`);
      console.log('Estructura completa del empleado:', emp);
      
      return {
        ...emp,
        porcentaje: porcentaje
      };
    });
  };
  
  // Función para agrupar transacciones por mes
  const agruparTransaccionesPorMes = (transacciones) => {
    console.log('Agrupando transacciones por mes. Datos recibidos:', transacciones);
    console.log('Tipo de datos:', typeof transacciones);
    console.log('Longitud:', transacciones?.length);
    
    if (!Array.isArray(transacciones) || transacciones.length === 0) {
      console.log('No hay transacciones para agrupar');
      return [];
    }
    
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    const agrupado = {};
    
    // Agrupar por mes
    transacciones.forEach((transaccion, index) => {
      console.log(`Procesando transacción ${index + 1}:`, transaccion);
      
      // Extraer mes de la fecha de la transacción
      const fechaTransaccion = transaccion.fecha || transaccion.createdAt;
      console.log(`Fecha extraída: ${fechaTransaccion}`);
      
      if (fechaTransaccion) {
        const fecha = new Date(fechaTransaccion);
        const mesNum = fecha.getMonth() + 1; // getMonth() devuelve 0-11, necesitamos 1-12
        const mesNombre = meses[mesNum - 1];
        const anio = fecha.getFullYear();
        
        console.log(`Transacción del mes ${mesNum} (${mesNombre}) ${anio}`);
        
        if (!agrupado[mesNum]) {
          agrupado[mesNum] = {
            mes: mesNum,
            nombreMes: mesNombre,
            anio: anio,
            totalTransacciones: 0,
            totalVentas: 0,
            totalIngresos: 0,
            totalComisiones: 0
          };
        }
        
        // Sumar valores de la transacción
        const monto = transaccion.monto || 0;
        const comision = transaccion.comision || transaccion.comisionEmpleado || 0;
        
        agrupado[mesNum].totalTransacciones += 1;
        agrupado[mesNum].totalVentas += 1; // Cada transacción es una venta
        agrupado[mesNum].totalIngresos += monto;
        agrupado[mesNum].totalComisiones += comision;
        
        console.log(`Valores sumados - Monto: ${monto}, Comisión: ${comision}`);
      } else {
        console.warn(`Transacción ${index + 1} no tiene fecha válida:`, transaccion);
      }
    });
    
    // Convertir a array y ordenar por mes
    const resultado = Object.values(agrupado).sort((a, b) => a.mes - b.mes);
    console.log('Resultado agrupado por mes:', resultado);
    
    return resultado;
  };
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3}>Reportes y Análisis</Title>
      </div>
      
      {/* Métricas principales */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }} loading={loading.metricas}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Ventas Totales"
              value={metricas.totalVentas}
              prefix={<ShoppingCartOutlined style={{ color: '#1890ff' }} />}
              suffix="unidades"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Ingresos Totales"
              value={metricas.totalIngresos}
              precision={2}
              prefix="₡"
              suffix=""
              prefixCls="ant-statistic-content-value"
              valueStyle={{ color: '#52c41a' }}
            />
            {console.log('=== RENDERIZANDO INGRESOS TOTALES ===')}
            {console.log('metricas.totalIngresos:', metricas.totalIngresos)}
            {console.log('tipo de metricas.totalIngresos:', typeof metricas.totalIngresos)}
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Vehículos en Stock"
              value={metricas.vehiculosStock}
              prefix={<CarOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tasa de Conversión"
              value={metricas.tasaConversion}
              suffix="%"
              prefix={<DollarOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
      </Row>
      
      {/* Pestañas de reportes */}
      <Tabs defaultActiveKey="resumen" loading={loading.ventasMensuales || loading.topEmpleados || loading.ventasRecientes}>
        <TabPane
          tab={
            <span>
              <BarChartOutlined />
              Resumen General
            </span>
          }
          key="resumen"
        >
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={16}>
              <Card 
                title="Ventas Mensuales" 
                extra={
                  <Select 
                    defaultValue="2023" 
                    style={{ width: 120 }}
                    onChange={async (value) => {
                      try {
                        setLoading(prev => ({ ...prev, ventasMensuales: true }));
                        // Usar el endpoint de transacciones de ingresos
                        const transaccionesData = await getTransaccionesIngresos();
                        console.log('Transacciones de ingresos para año seleccionado:', transaccionesData);
                        
                        // Filtrar por año si es necesario y agrupar por mes
                        const transaccionesFiltradas = transaccionesData.filter(transaccion => {
                          const fechaTransaccion = transaccion.fecha || transaccion.createdAt;
                          if (fechaTransaccion) {
                            const fecha = new Date(fechaTransaccion);
                            return fecha.getFullYear() === parseInt(value);
                          }
                          return false;
                        });
                        
                        const transaccionesAgrupadasPorMes = agruparTransaccionesPorMes(transaccionesFiltradas);
                        console.log('Transacciones agrupadas por mes:', transaccionesAgrupadasPorMes);
                        
                        setVentasMensuales(Array.isArray(transaccionesAgrupadasPorMes) ? transaccionesAgrupadasPorMes : []);
                      } catch (error) {
                        console.error(`Error al cargar ventas para el año ${value}:`, error);
                        setVentasMensuales([]);
                      } finally {
                        setLoading(prev => ({ ...prev, ventasMensuales: false }));
                      }
                    }}
                  >
                    {Array.from({length: 6}, (_, i) => {
                      const anio = new Date().getFullYear() - i;
                      return (
                        <Option key={anio} value={anio.toString()}>{anio}</Option>
                      );
                    })}
                  </Select>
                }
              >
                {ventasMensuales.length > 0 ? (
                  <div>
                    <div style={{ height: '300px', marginBottom: 16 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={ventasMensuales}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="nombreMes" 
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip 
                            formatter={(value, name) => {
                              if (name === 'totalTransacciones') {
                                return [`${value} ventas`, 'Ventas'];
                              }
                              if (name === 'totalIngresos') {
                                return [`₡${value.toLocaleString('es-CR')}`, 'Ingresos'];
                              }
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Bar 
                            dataKey="totalTransacciones" 
                            fill="#1890ff" 
                            name="Ventas"
                          />
                          <Bar 
                            dataKey="totalIngresos" 
                            fill="#52c41a" 
                            name="Ingresos"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <Table 
                      dataSource={ventasMensuales}
                      columns={[
                        { 
                          title: 'Mes', 
                          dataIndex: 'mes', 
                          key: 'mes',
                          render: (text, record) => {
                            // Intentar obtener el mes desde diferentes campos de fecha
                            const fechaVenta = record.fecha || record.fechaTransaccion || record.createdAt;
                            
                            if (fechaVenta) {
                              const fecha = new Date(fechaVenta);
                              const mesNum = fecha.getMonth() + 1;
                              const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                              return meses[mesNum - 1];
                            }
                            
                            // Fallback a los campos existentes
                            const nombreMes = record.nombreMes || record.mesNombre || record.mes;
                            if (nombreMes !== undefined && nombreMes !== null) {
                              if (typeof nombreMes === 'number') {
                                const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                                            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                                return meses[nombreMes - 1] || `Mes ${nombreMes}`;
                              }
                              return nombreMes;
                            }
                            
                            return text ? `Mes ${text}` : 'Sin datos';
                          }
                        },
                        { 
                          title: 'Total Ventas', 
                          dataIndex: 'totalTransacciones', 
                          key: 'totalTransacciones',
                          render: (value, record) => {
                            // Usar el mismo campo que funciona en Top Vendedores
                            const totalVentas = record.totalTransacciones || record.transaccionesVenta || 0;
                            return totalVentas > 0 ? totalVentas.toLocaleString('es-CR') : '0';
                          },
                          sorter: (a, b) => (a.totalTransacciones || 0) - (b.totalTransacciones || 0),
                        },
                        { 
                          title: 'Ingresos Totales', 
                          dataIndex: 'totalIngresos', 
                          key: 'totalIngresos',
                          render: (value) => `₡${(value || 0).toLocaleString('es-CR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}`,
                          sorter: (a, b) => (a.totalIngresos || 0) - (b.totalIngresos || 0),
                        },
                        { 
                          title: 'Año', 
                          dataIndex: 'anio', 
                          key: 'anio',
                        }
                      ]}
                      size="small"
                      pagination={false}
                      rowKey={(record) => `${record.mes}-${record.anio}`}
                    />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#8c8c8c' }}>
                    <BarChartOutlined style={{ fontSize: 40, opacity: 0.5 }} />
                    <p>No hay datos disponibles</p>
                  </div>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="Top Vendedores">
                {console.log('Top empleados para el gráfico:', topEmpleados)}
                {topEmpleados.length > 0 ? (
                  <div style={{ height: '300px', marginBottom: 16 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topEmpleados}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(data) => {
                            console.log('Datos del label:', data);
                            const nombreEmpleado = data.empleado || data.nombre || data.nombres || 'Empleado';
                            const porcentajeValor = data.porcentaje || 0;
                            return `${nombreEmpleado}: ${porcentajeValor}%`;
                          }}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="totalTransacciones"
                        >
                          {topEmpleados.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value, name, props) => {
                            const empleado = props.payload;
                            return [
                              `${empleado.totalTransacciones || empleado.transaccionesVenta || 0} ventas`,
                              empleado.empleado || empleado.nombre || 'Empleado'
                            ];
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ height: '300px', marginBottom: 16, textAlign: 'center' }}>
                    <div style={{ textAlign: 'center', color: '#8c8c8c', margin: '20px 0' }}>
                      <PieChartOutlined style={{ fontSize: 60, opacity: 0.3 }} />
                      <p>No hay datos de vendedores disponibles</p>
                    </div>
                  </div>
                )}
                {topEmpleados.map((empleado, index) => (
                  <div key={empleado.id || index} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text>{empleado.empleado || empleado.nombre || 'Empleado'}</Text>
                      <Text strong>{empleado.totalTransacciones || empleado.transaccionesVenta || 0} ventas</Text>
                    </div>
                    <Progress 
                      percent={empleado.porcentaje || 0} 
                      showInfo={false} 
                      strokeColor={index % 2 === 0 ? '#1890ff' : '#52c41a'}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        ₡{(empleado.totalVentas || empleado.totalIngresos || 0).toLocaleString('es-CR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {empleado.porcentaje || 0}% del total
                      </Text>
                    </div>
                  </div>
                ))}
              </Card>
            </Col>
          </Row>
          
          {/* Análisis Financiero en Resumen General */}
          <Card style={{ marginTop: 24 }}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={8}>
                <div>Año:</div>
                <Select 
                  style={{ width: '100%' }} 
                  value={anioSeleccionado}
                  onChange={setAnioSeleccionado}
                >
                  {Array.from({length: 6}, (_, i) => {
                    const anio = new Date().getFullYear() - i;
                    return (
                      <Option key={anio} value={anio}>{anio}</Option>
                    );
                  })}
                </Select>
              </Col>
              <Col xs={24} md={8}>
                <div>Mes (opcional):</div>
                <Select 
                  style={{ width: '100%' }} 
                  value={mesSeleccionado}
                  onChange={setMesSeleccionado}
                  allowClear
                  placeholder="Todos los meses"
                >
                  <Option value={1}>Enero</Option>
                  <Option value={2}>Febrero</Option>
                  <Option value={3}>Marzo</Option>
                  <Option value={4}>Abril</Option>
                  <Option value={5}>Mayo</Option>
                  <Option value={6}>Junio</Option>
                  <Option value={7}>Julio</Option>
                  <Option value={8}>Agosto</Option>
                  <Option value={9}>Septiembre</Option>
                  <Option value={10}>Octubre</Option>
                  <Option value={11}>Noviembre</Option>
                  <Option value={12}>Diciembre</Option>
                </Select>
              </Col>
              <Col xs={24} md={8} style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
                <Button 
                  type="primary" 
                  onClick={() => {
                    console.log('Botón Analizar Período clickeado en Resumen General');
                    console.log('Año seleccionado:', anioSeleccionado);
                    console.log('Mes seleccionado:', mesSeleccionado);
                    fetchAnalisisFinanciero(anioSeleccionado, mesSeleccionado);
                  }}
                  loading={loadingAnalisis}
                  block
                >
                  Analizar Período
                </Button>
              </Col>
            </Row>
            
            {analisisFinanciero && (
              <div style={{ marginTop: 24, padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                <Title level={5} style={{ marginBottom: 16 }}>
                  Análisis Financiero {mesSeleccionado ? `- ${new Date(2000, mesSeleccionado - 1, 1).toLocaleDateString('es-ES', { month: 'long' })}` : '- Anual'} {anioSeleccionado}
                </Title>
                
                {/* Métricas Principales */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small">
                      <Statistic
                        title="Ingresos Brutos"
                        value={analisisFinanciero.totalIngresosBrutos || 0}
                        precision={2}
                        prefix="₡"
                        valueStyle={{ color: '#52c41a' }}
                        formatter={value => formatCurrency(value)}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small">
                      <Statistic
                        title="Egresos Totales"
                        value={analisisFinanciero.totalEgresos || 0}
                        precision={2}
                        prefix="₡"
                        valueStyle={{ color: '#f5222d' }}
                        formatter={value => formatCurrency(value)}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small">
                      <Statistic
                        title="Ingresos Netos"
                        value={analisisFinanciero.totalIngresosNetos || 0}
                        precision={2}
                        prefix="₡"
                        valueStyle={{ color: '#1890ff' }}
                        formatter={value => formatCurrency(value)}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small">
                      <Statistic
                        title="Balance Neto"
                        value={analisisFinanciero.balanceNeto || 0}
                        precision={2}
                        prefix="₡"
                        valueStyle={{ 
                          color: (analisisFinanciero.balanceNeto || 0) >= 0 ? '#52c41a' : '#f5222d'
                        }}
                        formatter={value => formatCurrency(value)}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Métricas Secundarias */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small">
                      <Statistic
                        title="Total Transacciones"
                        value={analisisFinanciero.totalTransacciones || 0}
                        suffix="operaciones"
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small">
                      <Statistic
                        title="Vehículos Vendidos"
                        value={analisisFinanciero.vehiculosVendidos || 0}
                        suffix="unidades"
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small">
                      <Statistic
                        title="Repuestos Vendidos"
                        value={analisisFinanciero.repuestosVendidos || 0}
                        suffix="unidades"
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small">
                      <Statistic
                        title="Comisiones"
                        value={analisisFinanciero.totalComisiones || 0}
                        precision={2}
                        prefix="₡"
                        valueStyle={{ color: '#722ed1' }}
                        formatter={value => formatCurrency(value)}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Métricas de Rendimiento */}
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small">
                      <Statistic
                        title="Promedio Venta"
                        value={analisisFinanciero.promedioVenta || 0}
                        precision={2}
                        prefix="₡"
                        valueStyle={{ color: '#13c2c2' }}
                        formatter={value => formatCurrency(value)}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small">
                      <Statistic
                        title="Ratio Ingresos/Egresos"
                        value={analisisFinanciero.ratioIngresosEgresos || 0}
                        precision={2}
                        suffix="x"
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small">
                      <Statistic
                        title="% Comisiones"
                        value={analisisFinanciero.porcentajeComisiones || 0}
                        precision={2}
                        suffix="%"
                        valueStyle={{ color: '#eb2f96' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small">
                      <Statistic
                        title="Margen Utilidad"
                        value={analisisFinanciero.margenUtilidadPorc || 0}
                        precision={2}
                        suffix="%"
                        valueStyle={{ 
                          color: (analisisFinanciero.margenUtilidadPorc || 0) >= 0 ? '#52c41a' : '#f5222d'
                        }}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Información del Período */}
                <div style={{ marginTop: 16, padding: '12px', backgroundColor: '#e6f7ff', borderRadius: '6px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Período: {analisisFinanciero.nombreMes || 'Anual'} {analisisFinanciero.anio} | 
                    Mes: {analisisFinanciero.mes || 'Todos'}
                  </Text>
                </div>
              </div>
            )}
            
            {!analisisFinanciero && !loadingAnalisis && (
              <div style={{ marginTop: 24, textAlign: 'center', padding: '20px', color: '#8c8c8c' }}>
                <Text type="secondary">
                  Seleccione un período y haga clic en "Analizar Período" para ver el análisis financiero
                </Text>
              </div>
            )}
            
            {loadingAnalisis && (
              <div style={{ marginTop: 24, textAlign: 'center', padding: '20px' }}>
                <Text>Cargando análisis financiero...</Text>
              </div>
            )}
          </Card>
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <PieChartOutlined />
              Inventario
            </span>
          }
          key="inventario"
        >
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Title level={4}>Reportes de Inventario</Title>
            <Text type="secondary">Análisis de niveles de inventario, rotación y más</Text>
            <div style={{ marginTop: 24 }}>
              <img 
                src="https://via.placeholder.com/800x400?text=Reportes+de+Inventario" 
                alt="Reportes de Inventario" 
                style={{ maxWidth: '100%', border: '1px solid #f0f0f0', borderRadius: '8px' }}
              />
            </div>
          </div>
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <DollarOutlined />
              Financiero
            </span>
          }
          key="financiero"
        >
          {/* Análisis Financiero Detallado */}
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={8}>
              <div>Año:</div>
              <Select 
                style={{ width: '100%' }} 
                value={anioSeleccionado}
                onChange={setAnioSeleccionado}
              >
                {Array.from({length: 6}, (_, i) => {
                  const anio = new Date().getFullYear() - i;
                  return (
                    <Option key={anio} value={anio}>{anio}</Option>
                  );
                })}
              </Select>
            </Col>
            <Col xs={24} md={8}>
              <div>Mes (opcional):</div>
              <Select 
                style={{ width: '100%' }} 
                value={mesSeleccionado}
                onChange={setMesSeleccionado}
                allowClear
                placeholder="Todos los meses"
              >
                <Option value={1}>Enero</Option>
                <Option value={2}>Febrero</Option>
                <Option value={3}>Marzo</Option>
                <Option value={4}>Abril</Option>
                <Option value={5}>Mayo</Option>
                <Option value={6}>Junio</Option>
                <Option value={7}>Julio</Option>
                <Option value={8}>Agosto</Option>
                <Option value={9}>Septiembre</Option>
                <Option value={10}>Octubre</Option>
                <Option value={11}>Noviembre</Option>
                <Option value={12}>Diciembre</Option>
              </Select>
            </Col>
            <Col xs={24} md={8} style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
              <Button 
                type="primary" 
                onClick={() => {
                  console.log('Botón Analizar Período clickeado');
                  console.log('Año seleccionado:', anioSeleccionado);
                  console.log('Mes seleccionado:', mesSeleccionado);
                  fetchAnalisisFinanciero(anioSeleccionado, mesSeleccionado);
                }}
                loading={loadingAnalisis}
                block
              >
                Analizar Período
              </Button>
            </Col>
          </Row>
          
          {analisisFinanciero && (
            <div style={{ marginTop: 24, padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
              <Title level={5} style={{ marginBottom: 16 }}>
                Análisis Financiero {mesSeleccionado ? `- ${new Date(2000, mesSeleccionado - 1, 1).toLocaleDateString('es-ES', { month: 'long' })}` : '- Anual'} {anioSeleccionado}
              </Title>
              
              {/* Métricas Principales */}
              <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small">
                    <Statistic
                      title="Ingresos Brutos"
                      value={analisisFinanciero.totalIngresosBrutos || 0}
                      precision={2}
                      prefix="₡"
                      valueStyle={{ color: '#52c41a' }}
                      formatter={value => formatCurrency(value)}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small">
                    <Statistic
                      title="Egresos Totales"
                      value={analisisFinanciero.totalEgresos || 0}
                      precision={2}
                      prefix="₡"
                      valueStyle={{ color: '#f5222d' }}
                      formatter={value => formatCurrency(value)}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small">
                    <Statistic
                      title="Ingresos Netos"
                      value={analisisFinanciero.totalIngresosNetos || 0}
                      precision={2}
                      prefix="₡"
                      valueStyle={{ color: '#1890ff' }}
                      formatter={value => formatCurrency(value)}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small">
                    <Statistic
                      title="Balance Neto"
                      value={analisisFinanciero.balanceNeto || 0}
                      precision={2}
                      prefix="₡"
                      valueStyle={{ 
                        color: (analisisFinanciero.balanceNeto || 0) >= 0 ? '#52c41a' : '#f5222d'
                      }}
                      formatter={value => formatCurrency(value)}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Métricas Secundarias */}
              <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small">
                    <Statistic
                      title="Total Transacciones"
                      value={analisisFinanciero.totalTransacciones || 0}
                      suffix="operaciones"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small">
                    <Statistic
                      title="Vehículos Vendidos"
                      value={analisisFinanciero.vehiculosVendidos || 0}
                      suffix="unidades"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small">
                    <Statistic
                      title="Repuestos Vendidos"
                      value={analisisFinanciero.repuestosVendidos || 0}
                      suffix="unidades"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small">
                    <Statistic
                      title="Comisiones"
                      value={analisisFinanciero.totalComisiones || 0}
                      precision={2}
                      prefix="₡"
                      valueStyle={{ color: '#722ed1' }}
                      formatter={value => formatCurrency(value)}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Métricas de Rendimiento */}
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small">
                    <Statistic
                      title="Promedio Venta"
                      value={analisisFinanciero.promedioVenta || 0}
                      precision={2}
                      prefix="₡"
                      valueStyle={{ color: '#13c2c2' }}
                      formatter={value => formatCurrency(value)}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small">
                    <Statistic
                      title="Ratio Ingresos/Egresos"
                      value={analisisFinanciero.ratioIngresosEgresos || 0}
                      precision={2}
                      suffix="x"
                      valueStyle={{ color: '#fa8c16' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small">
                    <Statistic
                      title="% Comisiones"
                      value={analisisFinanciero.porcentajeComisiones || 0}
                      precision={2}
                      suffix="%"
                      valueStyle={{ color: '#eb2f96' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small">
                    <Statistic
                      title="Margen Utilidad"
                      value={analisisFinanciero.margenUtilidadPorc || 0}
                      precision={2}
                      suffix="%"
                      valueStyle={{ 
                        color: (analisisFinanciero.margenUtilidadPorc || 0) >= 0 ? '#52c41a' : '#f5222d'
                      }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Información del Período */}
              <div style={{ marginTop: 16, padding: '12px', backgroundColor: '#e6f7ff', borderRadius: '6px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Período: {analisisFinanciero.nombreMes || 'Anual'} {analisisFinanciero.anio} | 
                  Mes: {analisisFinanciero.mes || 'Todos'}
                </Text>
              </div>
            </div>
          )}
          
          {!analisisFinanciero && !loadingAnalisis && (
            <div style={{ marginTop: 24, textAlign: 'center', padding: '20px', color: '#8c8c8c' }}>
              <Text type="secondary">
                Seleccione un período y haga clic en "Analizar Período" para ver el análisis financiero
              </Text>
            </div>
          )}
          
          {loadingAnalisis && (
            <div style={{ marginTop: 24, textAlign: 'center', padding: '20px' }}>
              <Text>Cargando análisis financiero...</Text>
            </div>
          )}
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <UserOutlined />
              Comisiones
            </span>
          }
          key="comisiones"
        >
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} lg={12}>
              <Card 
                title="Comisiones del Mes"
                bodyStyle={{ padding: { xs: '12px', sm: '16px', md: '24px' } }}
              >
                {comisiones && comisiones.length > 0 ? (
                  <div>
                    {comisiones.map((comision, index) => (
                      <div key={index} style={{ 
                        marginBottom: 12,
                        padding: { xs: '8px', sm: '12px' },
                        backgroundColor: { xs: '#f9f9f9', sm: 'transparent' },
                        borderRadius: '4px'
                      }}>
                        <Row gutter={[8, 8]} align="middle">
                          <Col xs={24} sm={10}>
                            <UserOutlined style={{ marginRight: 8 }} />
                            <Text strong style={{ fontSize: { xs: '13px', sm: '14px' } }}>
                              {comision.empleado || comision.nombreEmpleado || comision.nombre_empleado || 'Empleado'}
                            </Text>
                          </Col>
                          <Col xs={12} sm={6}>
                            <Text strong style={{ fontSize: { xs: '12px', sm: '14px' } }}>
                              {comision.totalTransacciones || comision.total_transacciones || 0} {window.innerWidth < 576 ? 'trans.' : 'transacciones'}
                            </Text>
                          </Col>
                          <Col xs={12} sm={8} style={{ textAlign: { xs: 'right', sm: 'left' } }}>
                            <Text type="success" style={{ fontSize: { xs: '13px', sm: '14px' } }}>
                              {formatCurrency(comision.totalComisiones || comision.total_comision || 0)}
                            </Text>
                          </Col>
                          <Col xs={24}>
                            <Text type="secondary" style={{ fontSize: { xs: '12px', sm: '13px' } }}>
                              Ventas: {formatCurrency(comision.totalVentas || comision.total_ventas || 0)}
                            </Text>
                          </Col>
                        </Row>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Text type="secondary">No hay datos de comisiones disponibles</Text>
                )}
              </Card>
            </Col>
            
            <Col xs={24} lg={12}>
              <Card 
                title="Estadísticas de Ventas"
                bodyStyle={{ padding: { xs: '12px', sm: '16px', md: '24px' } }}
              >
                <Row gutter={16}>
                  <Col xs={24} sm={8}>
                    <Card size="small" bodyStyle={{ padding: '12px 16px' }}>
                      <Statistic
                        title="Ventas del Mes"
                        value={comisiones.reduce((total, c) => total + (c.totalVentas || c.total_ventas || 0), 0)}
                        prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                        valueStyle={{ 
                          fontSize: { xs: '16px', sm: '18px' },
                          fontWeight: 500
                        }}
                        formatter={value => formatCurrency(value)}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card size="small" bodyStyle={{ padding: '12px 16px' }}>
                      <Statistic
                        title="Total Transacciones"
                        value={comisiones.reduce((total, c) => total + (c.totalTransacciones || c.total_transacciones || 0), 0)}
                        prefix={<CarOutlined style={{ color: '#1890ff' }} />}
                        valueStyle={{ 
                          fontSize: { xs: '16px', sm: '18px' },
                          fontWeight: 500
                        }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card size="small" bodyStyle={{ padding: '12px 16px' }}>
                      <Statistic
                        title="Total Comisiones"
                        value={comisiones.reduce((total, c) => total + (c.totalComisiones || c.total_comision || 0), 0)}
                        prefix={<ToolOutlined style={{ color: '#722ed1' }} />}
                        valueStyle={{ 
                          fontSize: { xs: '16px', sm: '18px' },
                          fontWeight: 500
                        }}
                        formatter={value => formatCurrency(value)}
                      />
                    </Card>
                  </Col>
                </Row>
                
                <Divider style={{ margin: '16px 0' }} />
                
                <div>
                  <Title level={5} style={{ marginBottom: 16, fontSize: { xs: '16px', sm: '18px' } }}>
                    Resumen de Comisiones
                  </Title>
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Statistic
                        title="Empleados Activos"
                        value={comisiones.length}
                        suffix="empleados"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                    <Col xs={24} sm={12}>
                      <Statistic
                        title="Promedio Comisión"
                        value={comisiones.length > 0 ? 
                          (comisiones.reduce((total, c) => total + (c.totalComisiones || c.total_comision || 0), 0) / comisiones.length) : 0}
                        formatter={value => formatCurrency(value)}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                  </Row>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <LineChartOutlined />
              Rendimiento
            </span>
          }
          key="rendimiento"
        >
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Title level={4}>Rendimiento y Métricas</Title>
            <Text type="secondary">Métricas de rendimiento, KPI y análisis comparativos</Text>
            <div style={{ marginTop: 24 }}>
              <img 
                src="https://via.placeholder.com/800x400?text=Métricas+de+Rendimiento" 
                alt="Métricas de Rendimiento" 
                style={{ maxWidth: '100%', border: '1px solid #f0f0f0', borderRadius: '8px' }}
              />
            </div>
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Reportes;
