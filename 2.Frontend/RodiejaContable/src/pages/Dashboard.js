import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, Typography, message, Button, Dropdown } from 'antd';
import {
  CarOutlined,
  DollarOutlined,
  UserOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  BarChartOutlined,
  ToolOutlined,
  DownOutlined
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Loading } from '../components/Loading';
import { dashboardService } from '../api';
import vehiculoService from '../api/vehiculos';
import ventasEmpleadosService from '../api/ventasEmpleados'; // Importar como en VentasReportes.js

import { formatCurrency } from '../utils/formatters';

// Colores para el gráfico de pastel
const COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#faad14'];

console.log('=== DASHBOARD.JS IMPORTADO ===');
console.log('Versión Dashboard.js:', '1.0.0');

const { Title, Text } = Typography;

const Dashboard = () => {
  console.log('=== DASHBOARD COMPONENT MONTADO ===');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalVentas: 0,
    totalVehiculos: 0,
    totalRepuestos: 0,
    totalClientes: 0,
    totalEgresos: 0,
    margenBeneficio: 0,
    roiPromedio: 0,
    ventasMensuales: [],
    vehiculosMasVendidos: [],
    repuestosMasVendidos: [],
    comisiones: [],
    vehiculosActivos: [],
    repuestosCriticos: [],
    topEmpleados: []
  });

  // Fetch dashboard data
  useEffect(() => {
    console.log('=== useEffect INICIADO ===');
    const fetchDashboardData = async () => {
      try {
        console.log('=== INICIANDO fetchDashboardData ===');
        setLoading(true);

        // Fetch dashboard stats
        console.log('Fetching dashboard stats...');
        const stats = await dashboardService.getDashboardStats();
        console.log('Dashboard stats obtenidos:', stats);

        // Fetch additional data in parallel
        console.log('Fetching datos adicionales en paralelo...');
        const [
          ventasMensuales,
          vehiculosMasVendidos,
          repuestosMasVendidos,
          comisiones,
          vehiculosActivos,
          repuestosCriticos,
          topEmpleados
        ] = await Promise.all([
          dashboardService.getVentasMensuales(),
          dashboardService.getVehiculosMasVendidos(),
          dashboardService.getRepuestosMasVendidos(),
          ventasEmpleadosService.getVentasPorEmpleado(), // Usar mismo servicio que VentasReportes.js
          vehiculoService.getVehiculosActivos(),
          dashboardService.getAlertasInventario(),
          ventasEmpleadosService.getTopEmpleados(5)
        ]);

        // Formatear ventasMensuales para tener nombreMes
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const ventasFormat = (ventasMensuales || []).map(v => {
          const mesNum = v.mes || new Date(v.fecha || v.createdAt).getMonth() + 1;
          return {
            ...v,
            nombreMes: meses[mesNum - 1] || `Mes ${mesNum}`,
            totalTransacciones: v.totalTransacciones || v.totalVentas || v.transaccionesVenta || 0,
            totalIngresos: v.totalIngresos || v.monto || v.ingresosNetos || v.totalIngresosNetos || 0
          };
        });

        // Calcular porcentajes para topEmpleados
        let empleadosConPorcentajes = [];
        if (Array.isArray(topEmpleados) && topEmpleados.length > 0) {
          const totalVentas = topEmpleados.reduce((total, emp) => total + (emp.totalTransacciones || emp.transaccionesVenta || 0), 0);
          empleadosConPorcentajes = topEmpleados.map(emp => {
            const ventasEmpleado = emp.totalTransacciones || emp.transaccionesVenta || 0;
            return {
              ...emp,
              porcentaje: totalVentas > 0 ? Math.round((ventasEmpleado / totalVentas) * 100) : 0
            };
          });
        }

        console.log('Datos adicionales obtenidos:', {
          ventasMensuales: ventasMensuales?.length || 0,
          vehiculosMasVendidos: vehiculosMasVendidos?.length || 0,
          repuestosMasVendidos: repuestosMasVendidos?.length || 0,
          comisiones: comisiones?.length || 0,
          vehiculosActivos: vehiculosActivos?.length || 0,
          repuestosCriticos: repuestosCriticos?.length || 0
        });

        // Logging detallado de comisiones
        if (comisiones && comisiones.length > 0) {
          console.log('=== ESTRUCTURA DE COMISIONES ===');
          console.log('Primera comisión:', comisiones[0]);
          console.log('Campos disponibles:', Object.keys(comisiones[0]));

          // Filtrar solo empleados con ventas reales (transacciones > 0)
          const comisionesConVentas = comisiones.filter(c =>
            (c.totalTransacciones || c.total_transacciones || 0) > 0
          );
          console.log('Comisiones con ventas reales:', comisionesConVentas.length);

          // Actualizar el estado con los datos filtrados
          setDashboardData({
            ...stats,
            ventasMensuales: ventasFormat,
            vehiculosMasVendidos: Array.isArray(vehiculosMasVendidos) ? vehiculosMasVendidos : [],
            repuestosMasVendidos: Array.isArray(repuestosMasVendidos) ? repuestosMasVendidos : [],
            comisiones: Array.isArray(comisionesConVentas) ? comisionesConVentas : [], // Usar datos filtrados
            vehiculosActivos: Array.isArray(vehiculosActivos) ? vehiculosActivos : [],
            repuestosCriticos: Array.isArray(repuestosCriticos) ? repuestosCriticos : [],
            topEmpleados: empleadosConPorcentajes
          });
        } else {
          console.log('=== NO HAY DATOS DE COMISIONES ===');
          setDashboardData({
            ...stats,
            ventasMensuales: ventasFormat,
            vehiculosMasVendidos: Array.isArray(vehiculosMasVendidos) ? vehiculosMasVendidos : [],
            repuestosMasVendidos: Array.isArray(repuestosMasVendidos) ? repuestosMasVendidos : [],
            comisiones: Array.isArray(comisiones) ? comisiones : [],
            vehiculosActivos: Array.isArray(vehiculosActivos) ? vehiculosActivos : [],
            repuestosCriticos: Array.isArray(repuestosCriticos) ? repuestosCriticos : [],
            topEmpleados: empleadosConPorcentajes
          });
        }
      } catch (error) {
        console.error('=== ERROR EN fetchDashboardData ===', error);
        console.error('Error completo:', error);
        message.error('Error al cargar datos del dashboard');
      } finally {
        console.log('=== fetchDashboardData FINALIZADO ===');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <Loading />;

  const {
    totalVentas: ingresosTotales,
    totalEgresos: egresosTotales,
    totalVehiculos,
    totalRepuestos,
    ventasMensuales,
    vehiculosMasVendidos,
    repuestosMasVendidos,
    comisiones: ventasPorEmpleado,
    vehiculosActivos,
    repuestosCriticos,
    topEmpleados,
    roiPromedio
  } = dashboardData;

  // Calcular valores derivados
  const balance = ingresosTotales - egresosTotales;
  const vehiculosEnVenta = vehiculosActivos?.filter(v => v.estado === 'DISPONIBLE').length || 0;
  const repuestosBajoStock = repuestosCriticos?.length || 0;

  // Calcular estadísticas de ventas reales
  const ahora = new Date();
  const anioActual = ahora.getFullYear();
  const mesActual = ahora.getMonth() + 1; // Los meses van de 1-12
  console.log('🔥 AÑO/MES ACTUAL BUSCADO:', anioActual, mesActual);

  // Buscar el mes actual en los datos - CORREGIDO: buscar por año y mes por separado
  const ventasMesActual = ventasMensuales.find(v => {
    console.log(`🔥 Verificando registro: anio=${v.anio}, mes=${v.mes} ¿Coincide con ${anioActual}/${mesActual}? ${v.anio === anioActual && v.mes === mesActual}`);
    return v.anio === anioActual && v.mes === mesActual;
  });

  // Buscar el mes anterior en los datos
  let anioAnterior = anioActual;
  let mesAnterior = mesActual - 1;
  if (mesAnterior === 0) {
    mesAnterior = 12;
    anioAnterior = anioActual - 1;
  }

  const mesAnteriorData = ventasMensuales.find(v => {
    console.log(`🔥 Verificando mes anterior: anio=${v.anio}, mes=${v.mes} ¿Coincide con ${anioAnterior}/${mesAnterior}? ${v.anio === anioAnterior && v.mes === mesAnterior}`);
    return v.anio === anioAnterior && v.mes === mesAnterior;
  });

  // Calcular ventas de empleados del mes actual
  const ventasEmpleadosMesActual = ventasPorEmpleado
    .filter(v => v.totalVentas > 0)
    .reduce((total, empleado) => total + empleado.totalVentas, 0);

  // Calcular ventas de vehículos específicas (basado en análisis financiero)
  const ventasVehiculosMesActual = ventasMesActual?.vehiculosVendidos * ventasMesActual?.promedioVenta || 0;

  // Calcular ventas de empleados del mes anterior usando datos reales
  const ventasEmpleadosMesAnterior = mesAnteriorData ?
    mesAnteriorData.ventasPorEmpleado?.reduce((total, empleado) => total + empleado.totalVentas, 0) || 0 : 0;

  console.log('🔥 VENTAS MENSUALES COMPLETAS:', ventasMensuales);
  console.log('🔥 VENTAS MES ACTUAL ENCONTRADO:', ventasMesActual);
  console.log('🔥 VENTAS MES ANTERIOR ENCONTRADO:', mesAnteriorData);
  console.log('🔥 VENTAS POR EMPLEADO:', ventasPorEmpleado);
  console.log('🔥 SUMA VENTAS EMPLEADOS MES ACTUAL:', ventasEmpleadosMesActual);
  console.log('🔥 VENTAS VEHÍCULOS MES ACTUAL:', ventasVehiculosMesActual);

  // ✅ CORRECCIÓN: Usar ventas de vehículos en lugar de ingresos totales
  const estadisticasVentas = {
    ingresos_mes_actual: ventasMesActual?.totalIngresosNetos || 0,  // ← Ingresos completos
    egresos_mes_actual: ventasMesActual?.totalEgresos || 0,        // ← Egresos completos
    ventas_mes_actual: ventasVehiculosMesActual || 0,              // ← VENTAS DE VEHÍCULOS ESPECÍFICAS
    vehiculos_vendidos_mes: ventasMesActual?.vehiculosVendidos || 0, // ← Vehículos vendidos
    repuestos_vendidos_mes: ventasMesActual?.repuestosVendidos || 0, // ← Repuestos vendidos
    variacion_ventas: ventasEmpleadosMesAnterior > 0 ?
      ((ventasVehiculosMesActual || 0) - ventasEmpleadosMesAnterior) / ventasEmpleadosMesAnterior * 100 : 0
  };

  // Log para debugging (opcional - puedes eliminarlo en producción)
  console.log('=== ESTADÍSTICAS DE VENTAS ===');
  console.log('Año/mes actual buscado:', anioActual, mesActual);
  console.log('Año/mes anterior buscado:', anioAnterior, mesAnterior);
  console.log('Datos mes actual encontrados:', ventasMesActual);
  console.log('Datos mes anterior encontrados:', mesAnteriorData);
  console.log('Ventas empleados mes actual:', ventasEmpleadosMesActual);
  console.log('Estadísticas calculadas:', estadisticasVentas);


  return (
    <div className="dashboard-container" style={{ padding: { xs: '12px', sm: '16px', md: '24px' } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <Title level={2} style={{ margin: 0, fontSize: { xs: '20px', sm: '24px' } }}>Panel de Control</Title>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button type="primary" style={{ backgroundColor: '#1890ff', borderColor: '#1890ff', boxShadow: '0 2px 4px rgba(24,144,255,0.2)' }} icon={<CarOutlined />} size="middle" onClick={() => navigate('/vehiculos/nuevo')}>Nuevo Vehículo</Button>
          <Button type="primary" style={{ backgroundColor: '#722ed1', borderColor: '#722ed1', boxShadow: '0 2px 4px rgba(114,46,209,0.2)' }} icon={<ToolOutlined />} size="middle" onClick={() => navigate('/inventario/nuevo')}>Nuevo Repuesto</Button>
          <Button type="primary" style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', boxShadow: '0 2px 4px rgba(82,196,26,0.2)' }} icon={<DollarOutlined />} size="middle" onClick={() => navigate('/finanzas/nueva')}>Transacción</Button>
          
          <Dropdown
            menu={{
              items: [
                {
                  key: '1',
                  label: 'Reporte de Vehículos',
                  icon: <CarOutlined />,
                  onClick: () => navigate('/reportes/vehiculos'),
                },
                {
                  key: '2',
                  label: 'Reporte de Repuestos',
                  icon: <ToolOutlined />,
                  onClick: () => navigate('/reportes/repuestos'),
                },
                {
                  key: '3',
                  label: 'Reporte de Ventas',
                  icon: <DollarOutlined />,
                  onClick: () => navigate('/reportes/ventas'),
                },
              ],
            }}
          >
            <Button type="primary" style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2', boxShadow: '0 2px 4px rgba(19,194,194,0.2)' }} icon={<BarChartOutlined />} size="middle">
              Reportes <DownOutlined />
            </Button>
          </Dropdown>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bodyStyle={{ padding: { xs: '12px', sm: '16px', md: '24px' } }}>
            <Statistic
              title="Vehículos en Inventario"
              value={totalVehiculos}
              prefix={<CarOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ fontSize: { xs: '18px', sm: '22px', md: '24px' } }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">{vehiculosEnVenta} disponibles para venta</Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bodyStyle={{ padding: { xs: '12px', sm: '16px', md: '24px' } }}>
            <Statistic
              title="Repuestos en Inventario"
              value={totalRepuestos}
              prefix={<ToolOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ fontSize: { xs: '18px', sm: '22px', md: '24px' } }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type={repuestosBajoStock > 0 ? 'danger' : 'secondary'}>
                {repuestosBajoStock} con stock bajo
              </Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bodyStyle={{ padding: { xs: '12px', sm: '16px', md: '24px' } }}>
            <Statistic
              title="Ingresos Totales"
              value={ingresosTotales}
              precision={2}
              valueStyle={{
                color: '#52c41a',
                fontSize: { xs: '18px', sm: '22px', md: '24px' }
              }}
              prefix={<DollarOutlined />}
              formatter={value => formatCurrency(value)}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="success">
                Último mes: {formatCurrency(estadisticasVentas.ingresos_mes_actual || 0)}
              </Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bodyStyle={{ padding: { xs: '12px', sm: '16px', md: '24px' } }}>
            <Statistic
              title="Egresos Totales"
              value={egresosTotales}
              precision={2}
              valueStyle={{
                color: '#f5222d',
                fontSize: { xs: '18px', sm: '22px', md: '24px' }
              }}
              prefix={<DollarOutlined />}
              formatter={value => formatCurrency(value)}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="danger">
                Último mes: {formatCurrency(estadisticasVentas.egresos_mes_actual || 0)}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24} lg={12}>
          <Card
            title="Balance General"
            bordered={false}
            bodyStyle={{ padding: '24px 0' }}
            headStyle={{ borderBottom: 'none', padding: '0 24px', fontSize: '18px', fontWeight: 600 }}
            style={{ borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}
          >
            <div style={{ padding: '0 24px' }}>
              <Statistic
                value={balance}
                precision={2}
                valueStyle={{ color: balance >= 0 ? '#52c41a' : '#f5222d', fontSize: '32px', fontWeight: 600 }}
                prefix={balance >= 0 ? <ArrowUpOutlined style={{ fontSize: '20px' }} /> : <ArrowDownOutlined style={{ fontSize: '20px' }} />}
                formatter={value => formatCurrency(value)}
              />
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {balance >= 0 ? 'Ganancias netas del periodo' : 'Pérdidas netas del periodo'}
              </Text>
            </div>

            <div style={{ margin: '32px 0', padding: '0 24px' }}>
              <Row gutter={[32, 24]}>
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Top Vehículos</Text>
                  <div style={{ marginTop: 16 }}>
                    {vehiculosMasVendidos.length > 0 ? (
                      vehiculosMasVendidos.slice(0, 3).map((item, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                          <Text ellipsis style={{ maxWidth: '85%' }}>{item.nombre || item.codigo_vehiculo || 'Sin nombre'}</Text>
                          <Text strong style={{ color: '#595959' }}>{item.cantidad || 1}</Text>
                        </div>
                      ))
                    ) : (
                      <Text type="secondary" style={{ fontSize: '13px' }}>No hay vehículos vendidos</Text>
                    )}
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Top Repuestos</Text>
                  <div style={{ marginTop: 16 }}>
                    {repuestosMasVendidos.length > 0 ? (
                      repuestosMasVendidos.slice(0, 3).map((item, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                          <Text ellipsis style={{ maxWidth: '85%' }}>{item.nombre || item.descripcion || item.parte_vehiculo || 'Sin descripción'}</Text>
                          <Text strong style={{ color: '#595959' }}>{item.cantidad || 1}</Text>
                        </div>
                      ))
                    ) : (
                      <Text type="secondary" style={{ fontSize: '13px' }}>No hay repuestos vendidos</Text>
                    )}
                  </div>
                </Col>
              </Row>
            </div>

            <div style={{ padding: '0 24px' }}>
              <Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Rentabilidad (ROI)</Text>
              <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 8 }}>
                <Text style={{ fontSize: '24px', fontWeight: 600, color: roiPromedio >= 0 ? '#52c41a' : '#f5222d', marginRight: 8 }}>
                  {roiPromedio > 0 ? '+' : ''}{roiPromedio?.toFixed(2) || '0.00'}%
                </Text>
                {roiPromedio >= 0 ? <ArrowUpOutlined style={{ color: '#52c41a' }} /> : <ArrowDownOutlined style={{ color: '#f5222d' }} />}
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Rendimiento del Equipo"
            bordered={false}
            bodyStyle={{ padding: '24px 0' }}
            headStyle={{ borderBottom: 'none', padding: '0 24px', fontSize: '18px', fontWeight: 600 }}
            style={{ borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}
          >
            <div style={{ padding: '0 24px', marginBottom: 40 }}>
              {ventasPorEmpleado && ventasPorEmpleado.length > 0 ? (
                <div>
                  {ventasPorEmpleado.slice(0, 4).map((comision, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: index < Math.min(ventasPorEmpleado.length, 4) - 1 ? '1px solid #f0f0f0' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                          <UserOutlined style={{ color: '#8c8c8c', fontSize: '16px' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '14px', color: '#262626' }}>{comision.empleado || comision.nombreEmpleado || comision.nombre_empleado || 'Empleado'}</div>
                          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{comision.totalTransacciones || comision.total_transacciones || 0} ventas cerradas</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: '#52c41a', fontSize: '14px' }}>{formatCurrency(comision.totalComisiones || comision.total_comision || 0)}</div>
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Comisión</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary" style={{ display: 'block', padding: '12px 0' }}>No hay datos de rendimiento disponibles</Text>
              )}
            </div>

            <div style={{ padding: '0 24px' }}>
              <Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Métricas Mensuales</Text>
              <Row gutter={24} style={{ marginTop: 16 }}>
                <Col xs={8}>
                  <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: 4 }}>Ingresos</div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#262626' }}>{formatCurrency(estadisticasVentas.ventas_mes_actual || 0)}</div>
                </Col>
                <Col xs={8}>
                  <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: 4 }}>Vehículos</div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#262626' }}>{estadisticasVentas.vehiculos_vendidos_mes || 0} unid.</div>
                </Col>
                <Col xs={8}>
                  <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: 4 }}>Repuestos</div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#262626' }}>{estadisticasVentas.repuestos_vendidos_mes || 0} unid.</div>
                </Col>
              </Row>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Gráficos y Top Vendedores */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <BarChartOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                <span>Evolución de Ventas e Ingresos</span>
              </div>
            }
            bodyStyle={{ padding: '24px' }}
            style={{
              borderRadius: '8px',
              boxShadow: '0 1px 2px -2px rgba(0,0,0,0.16), 0 3px 6px 0 rgba(0,0,0,0.12), 0 5px 12px 4px rgba(0,0,0,0.09)'
            }}
          >
            {ventasMensuales && ventasMensuales.length > 0 ? (
              <div style={{ height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ventasMensuales}
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e8e8" />
                    <XAxis
                      dataKey="nombreMes"
                      tick={{ fontSize: 12, fill: '#8c8c8c' }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 12, fill: '#8c8c8c' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12, fill: '#8c8c8c' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `₡${(value / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 6px 16px 0 rgba(0,0,0,0.08), 0 3px 6px -4px rgba(0,0,0,0.12), 0 9px 28px 8px rgba(0,0,0,0.05)'
                      }}
                      formatter={(value, name) => {
                        if (name === 'Ventas (unidades)') {
                          return [`${value} unidades`, 'Ventas'];
                        }
                        if (name === 'Ingresos Netos') {
                          return [`₡${value.toLocaleString('es-CR')}`, 'Ingresos Netos'];
                        }
                        return [value, name];
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar
                      yAxisId="left"
                      dataKey="totalTransacciones"
                      fill="#1890ff"
                      name="Ventas (unidades)"
                      radius={[4, 4, 0, 0]}
                      barSize={30}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="totalIngresos"
                      fill="#52c41a"
                      name="Ingresos Netos"
                      radius={[4, 4, 0, 0]}
                      barSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '320px', textAlign: 'center', padding: '20px', color: '#8c8c8c', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <BarChartOutlined style={{ fontSize: 48, opacity: 0.3, marginBottom: 16 }} />
                <p style={{ fontSize: '16px' }}>No hay suficientes datos de ventas para mostrar la evolución mensual</p>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <UserOutlined style={{ marginRight: 8, color: '#722ed1' }} />
                <span>Top Vendedores del Mes</span>
              </div>
            }
            bodyStyle={{ padding: '24px' }}
            style={{
              borderRadius: '8px',
              boxShadow: '0 1px 2px -2px rgba(0,0,0,0.16), 0 3px 6px 0 rgba(0,0,0,0.12), 0 5px 12px 4px rgba(0,0,0,0.09)',
              height: '100%'
            }}
          >
            {topEmpleados && topEmpleados.length > 0 ? (
              <div style={{ height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topEmpleados}
                      cx="50%"
                      cy="45%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      labelLine={false}
                      label={(data) => {
                        const porcentajeValor = data.porcentaje || 0;
                        return porcentajeValor > 5 ? `${porcentajeValor}%` : ''; // Solo mostrar label si es > 5% para que no se superpongan
                      }}
                      fill="#8884d8"
                      dataKey="totalTransacciones"
                    >
                      {topEmpleados.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 6px 16px 0 rgba(0,0,0,0.08)'
                      }}
                      formatter={(value, name, props) => {
                        const empleado = props.payload;
                        return [
                          `${empleado.totalTransacciones || empleado.transaccionesVenta || 0} ventas cerradas`,
                          empleado.empleado || empleado.nombre || 'Empleado'
                        ];
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value, entry) => {
                        const payload = entry.payload;
                        return <span style={{ color: '#595959', fontSize: '13px', fontWeight: 500 }}>{payload.empleado || payload.nombre || 'Empleado'}</span>;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '320px', textAlign: 'center', color: '#8c8c8c', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <UserOutlined style={{ fontSize: 48, opacity: 0.3, marginBottom: 16 }} />
                <p style={{ fontSize: '16px' }}>No hay datos de rendimiento de vendedores</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>


    </div>
  );
};

export default Dashboard;
