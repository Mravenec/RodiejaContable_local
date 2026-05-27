import React, { useState, useEffect } from 'react';
import VentasEmpleadosService from '../../api/ventasEmpleados';
import { getTransaccionesIngresos } from '../../api/transacciones';
import reportesService from '../../api/reportes';
import { 
  Card, 
  Row, 
  Col, 
  Table, 
  Typography, 
  Statistic,
  Progress,
  Tag
} from 'antd';
import { 
  DollarOutlined, 
  CarOutlined, 
  ShoppingCartOutlined,
  UserOutlined,
  TrophyOutlined,
  CalendarOutlined,
  ToolOutlined,
  BarChartOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

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
  const [loading, setLoading] = useState({
    general: true
  });
  
  // Estados para los datos de la API
  const [ventasMensuales, setVentasMensuales] = useState([]);
  const [topEmpleados, setTopEmpleados] = useState([]);
  const [comisiones, setComisiones] = useState([]);
  const [resumenVehiculos, setResumenVehiculos] = useState({ ventas: 0, inversion: 0, ganancia: 0 });
  const [resumenRepuestos, setResumenRepuestos] = useState({ ventas: 0, costos: 0, ganancia: 0 });
  
  const [metricas, setMetricas] = useState({
    totalVentas: 0,
    totalIngresos: 0,
    promedioVenta: 0,
    vehiculosStock: 0,
    tasaConversion: 0,
  });
  
  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const cargarDatosIniciales = async () => {
    try {
      setLoading({ general: true });
      
      // 1. Cargar métricas generales
      try {
        const estadisticas = await VentasEmpleadosService.getEstadisticasVentas();
        let ingresosTotales = estadisticas?.totalIngresos || 0;
        
        if (ingresosTotales === 0) {
          const transacciones = await getTransaccionesIngresos();
          ingresosTotales = transacciones.reduce((sum, t) => sum + (t.monto || 0), 0);
        }
        
        setMetricas({
          totalVentas: estadisticas?.totalVentas || 0,
          totalIngresos: ingresosTotales,
          promedioVenta: estadisticas?.promedioVenta || 0,
          vehiculosStock: estadisticas?.vehiculosStock || 0,
          tasaConversion: estadisticas?.tasaConversion || 0,
        });
      } catch (error) {
        console.error('Error al cargar métricas:', error);
      }
      
      // 2. Cargar ventas mensuales
      try {
        const transaccionesData = await getTransaccionesIngresos();
        const transaccionesAgrupadasPorMes = agruparTransaccionesPorMes(transaccionesData);
        setVentasMensuales(Array.isArray(transaccionesAgrupadasPorMes) ? transaccionesAgrupadasPorMes : []);
      } catch (error) {
        console.error('Error al cargar ventas mensuales:', error);
        setVentasMensuales([]);
      }
      
      // 3. Cargar top empleados
      try {
        const topEmpleadosData = await VentasEmpleadosService.getTopEmpleados(5);
        const empleadosConPorcentajes = calcularPorcentajes(topEmpleadosData);
        setTopEmpleados(Array.isArray(empleadosConPorcentajes) ? empleadosConPorcentajes : []);
      } catch (error) {
        console.error('Error al cargar top empleados:', error);
        setTopEmpleados([]);
      }
      
      // 4. Cargar comisiones
      try {
        const comisionesData = await VentasEmpleadosService.getVentasPorEmpleado();
        const comisionesConVentas = Array.isArray(comisionesData) ? comisionesData.filter(c => 
          (c.totalTransacciones || c.total_transacciones || 0) > 0 &&
          (c.totalComisiones || c.total_comision || 0) > 0
        ) : [];
        setComisiones(comisionesConVentas);
      } catch (error) {
        console.error('Error al cargar comisiones:', error);
        setComisiones([]);
      }
      
      // 5. Cargar resúmenes de utilidades (Vehículos y Repuestos)
      try {
        const [repuestos, vehiculos] = await Promise.all([
          reportesService.getReporteRepuestosMensual(),
          reportesService.getReporteVehiculosMensual()
        ]);
        
        if (Array.isArray(vehiculos)) {
          setResumenVehiculos({
            ventas: vehiculos.reduce((acc, curr) => acc + Number(curr.totalVentas || 0), 0),
            inversion: vehiculos.reduce((acc, curr) => acc + Number(curr.totalInversion || 0), 0),
            ganancia: vehiculos.reduce((acc, curr) => acc + Number(curr.gananciaNeta || 0), 0)
          });
        }
        
        if (Array.isArray(repuestos)) {
          setResumenRepuestos({
            ventas: repuestos.reduce((acc, curr) => acc + Number(curr.totalVentas || 0), 0),
            costos: repuestos.reduce((acc, curr) => acc + Number(curr.totalCostos || 0), 0),
            ganancia: repuestos.reduce((acc, curr) => acc + Number(curr.gananciaNeta || 0), 0)
          });
        }
      } catch (error) {
        console.error('Error al cargar resúmenes de utilidades:', error);
      }
      
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
    } finally {
      setLoading({ general: false });
    }
  };
  
  // Función para calcular porcentajes de ventas
  const calcularPorcentajes = (empleados) => {
    if (!Array.isArray(empleados) || empleados.length === 0) {
      return empleados;
    }
    
    const totalVentas = empleados.reduce((total, emp) => {
      return total + (emp.totalTransacciones || emp.transaccionesVenta || 0);
    }, 0);
    
    return empleados.map(emp => {
      const ventasEmpleado = emp.totalTransacciones || emp.transaccionesVenta || 0;
      const porcentaje = totalVentas > 0 ? Math.round((ventasEmpleado / totalVentas) * 100) : 0;
      
      return {
        ...emp,
        porcentaje: porcentaje
      };
    });
  };
  
  // Función para agrupar transacciones por mes
  const agruparTransaccionesPorMes = (transacciones) => {
    if (!Array.isArray(transacciones) || transacciones.length === 0) {
      return [];
    }
    
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    const agrupado = {};
    
    transacciones.forEach((transaccion) => {
      const fechaTransaccion = transaccion.fecha || transaccion.createdAt;
      
      if (fechaTransaccion) {
        const fecha = new Date(fechaTransaccion);
        const mesNum = fecha.getMonth() + 1;
        const mesNombre = meses[mesNum - 1];
        const anio = fecha.getFullYear();
        
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
        
        const monto = transaccion.monto || 0;
        const comision = transaccion.comision || transaccion.comisionEmpleado || 0;
        
        agrupado[mesNum].totalTransacciones += 1;
        agrupado[mesNum].totalVentas += 1;
        agrupado[mesNum].totalIngresos += monto;
        agrupado[mesNum].totalComisiones += comision;
      }
    });
    
    return Object.values(agrupado).sort((a, b) => a.mes - b.mes);
  };
  
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <Title level={2} style={{ margin: 0, fontSize: '24px' }}>Reportes Generales</Title>
      </div>
      
      {/* Métricas principales */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} bodyStyle={{ padding: '24px' }} style={{ borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)', border: '1px solid #f0f0f0' }} loading={loading.general}>
            <Statistic
              title={<span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Ventas Totales</span>}
              value={metricas.totalVentas}
              prefix={<ShoppingCartOutlined style={{ fontSize: '20px' }} />}
              suffix="unidades"
              valueStyle={{ color: '#1890ff', fontWeight: 600, fontSize: '24px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} bodyStyle={{ padding: '24px' }} style={{ borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)', border: '1px solid #f0f0f0' }} loading={loading.general}>
            <Statistic
              title={<span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Ingresos Totales</span>}
              value={metricas.totalIngresos}
              precision={2}
              prefix={<DollarOutlined style={{ fontSize: '20px' }} />}
              valueStyle={{ color: '#52c41a', fontWeight: 600, fontSize: '24px' }}
              formatter={value => formatCurrency(value)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} bodyStyle={{ padding: '24px' }} style={{ borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)', border: '1px solid #f0f0f0' }} loading={loading.general}>
            <Statistic
              title={<span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Vehículos en Stock</span>}
              value={metricas.vehiculosStock}
              prefix={<CarOutlined style={{ fontSize: '20px' }} />}
              valueStyle={{ color: '#722ed1', fontWeight: 600, fontSize: '24px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} bodyStyle={{ padding: '24px' }} style={{ borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)', border: '1px solid #f0f0f0' }} loading={loading.general}>
            <Statistic
              title={<span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Tasa de Conversión</span>}
              value={metricas.tasaConversion}
              suffix="%"
              prefix={<TrophyOutlined style={{ fontSize: '20px' }} />}
              valueStyle={{ color: '#fa8c16', fontWeight: 600, fontSize: '24px' }}
            />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]}>
        {/* Tabla de Ingresos Mensuales */}
        <Col xs={24}>
          <Card 
            title={
              <span style={{ fontWeight: 600, fontSize: '18px' }}>
                <CalendarOutlined style={{ marginRight: 8 }} />
                Ingresos Mensuales
              </span>
            }
            bordered={false}
            style={{ marginBottom: 24, borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)', border: '1px solid #f0f0f0' }}
            headStyle={{ borderBottom: '1px solid #f0f0f0', padding: '0 24px', minHeight: '64px' }}
            bodyStyle={{ padding: '0' }}
          >
            <div style={{ padding: '24px' }}>
              <Table 
                dataSource={ventasMensuales}
                loading={loading.general}
                columns={[
                  { 
                    title: 'Mes', 
                    dataIndex: 'nombreMes', 
                    key: 'nombreMes',
                    render: (text) => <Text strong>{text}</Text>
                  },
                  { 
                    title: 'Año', 
                    dataIndex: 'anio', 
                    key: 'anio',
                  },
                  { 
                    title: 'Total Ventas', 
                    dataIndex: 'totalTransacciones', 
                    key: 'totalTransacciones',
                    render: (value) => <Tag color="blue">{value} ventas</Tag>,
                  },
                  { 
                    title: 'Ingresos Totales', 
                    dataIndex: 'totalIngresos', 
                    key: 'totalIngresos',
                    render: (value) => <Text type="success" strong>{formatCurrency(value)}</Text>,
                  }
                ]}
                pagination={false}
                rowKey={(record) => `${record.mes}-${record.anio}`}
              />
            </div>
          </Card>
        </Col>
        
        {/* Sección de Resúmenes */}
        <Col xs={24}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', marginTop: '8px' }}>
            <BarChartOutlined style={{ fontSize: '20px', marginRight: '8px', color: '#1890ff' }} />
            <Title level={4} style={{ margin: 0 }}>Análisis de Utilidades Anuales</Title>
          </div>
        </Col>
        
        <Col xs={24} md={8}>
          <Card bordered={false} style={{ borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)', border: '1px solid #f0f0f0', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#e6f7ff', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <CarOutlined style={{ color: '#1890ff' }} />
              </div>
              <Title level={5} style={{ margin: 0 }}>Reporte Vehículos</Title>
            </div>
            <Row gutter={[0, 16]}>
              <Col span={24} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                <Text type="secondary">Total Ventas</Text>
                <Text strong>{formatCurrency(resumenVehiculos.ventas)}</Text>
              </Col>
              <Col span={24} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                <Text type="secondary">Inversión (Costos)</Text>
                <Text type="danger">{formatCurrency(resumenVehiculos.inversion)}</Text>
              </Col>
              <Col span={24} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <Text strong>Ganancia Neta</Text>
                <Text type="success" strong style={{ fontSize: '16px' }}>{formatCurrency(resumenVehiculos.ganancia)}</Text>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card bordered={false} style={{ borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)', border: '1px solid #f0f0f0', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#f9f0ff', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <ToolOutlined style={{ color: '#722ed1' }} />
              </div>
              <Title level={5} style={{ margin: 0 }}>Reporte Repuestos</Title>
            </div>
            <Row gutter={[0, 16]}>
              <Col span={24} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                <Text type="secondary">Total Ventas</Text>
                <Text strong>{formatCurrency(resumenRepuestos.ventas)}</Text>
              </Col>
              <Col span={24} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                <Text type="secondary">Costos</Text>
                <Text type="danger">{formatCurrency(resumenRepuestos.costos)}</Text>
              </Col>
              <Col span={24} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <Text strong>Ganancia Neta</Text>
                <Text type="success" strong style={{ fontSize: '16px' }}>{formatCurrency(resumenRepuestos.ganancia)}</Text>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card bordered={false} style={{ borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)', border: '1px solid #f0f0f0', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#f6ffed', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <ShoppingCartOutlined style={{ color: '#52c41a' }} />
              </div>
              <Title level={5} style={{ margin: 0 }}>Reporte de Ventas Global</Title>
            </div>
            <Row gutter={[0, 16]}>
              <Col span={24} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                <Text type="secondary">Transacciones Totales</Text>
                <Tag color="green">{metricas.totalVentas} regs.</Tag>
              </Col>
              <Col span={24} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                <Text type="secondary">Ticket Promedio</Text>
                <Text strong>{formatCurrency(metricas.promedioVenta)}</Text>
              </Col>
              <Col span={24} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <Text strong>Ingresos Brutos</Text>
                <Text type="success" strong style={{ fontSize: '16px' }}>{formatCurrency(metricas.totalIngresos)}</Text>
              </Col>
            </Row>
          </Card>
        </Col>
        
        {/* Top Vendedores */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <span style={{ fontWeight: 600, fontSize: '18px' }}>
                <UserOutlined style={{ marginRight: 8 }} />
                Top Vendedores
              </span>
            }
            bordered={false}
            style={{ marginBottom: 24, borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)', border: '1px solid #f0f0f0', height: '100%' }}
            headStyle={{ borderBottom: '1px solid #f0f0f0', padding: '0 24px', minHeight: '64px' }}
            bodyStyle={{ padding: '0' }}
          >
            <div style={{ padding: '24px' }}>
              <Table 
                dataSource={topEmpleados}
                loading={loading.general}
                columns={[
                  { 
                    title: 'Vendedor', 
                    key: 'empleado',
                    render: (record) => <Text strong>{record.empleado || record.nombre || 'Empleado'}</Text>
                  },
                  { 
                    title: 'Ventas', 
                    key: 'ventas',
                    render: (record) => <Tag color="cyan">{record.totalTransacciones || record.transaccionesVenta || 0}</Tag>
                  },
                  { 
                    title: 'Participación', 
                    key: 'porcentaje',
                    render: (record) => (
                      <div style={{ width: 120 }}>
                        <Progress percent={record.porcentaje || 0} size="small" />
                      </div>
                    )
                  }
                ]}
                pagination={false}
                rowKey={(record, index) => record.id || index}
              />
            </div>
          </Card>
        </Col>
        
        {/* Comisiones del Mes */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <span style={{ fontWeight: 600, fontSize: '18px' }}>
                <ToolOutlined style={{ marginRight: 8 }} />
                Comisiones del Mes
              </span>
            }
            bordered={false}
            style={{ marginBottom: 24, borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)', border: '1px solid #f0f0f0', height: '100%' }}
            headStyle={{ borderBottom: '1px solid #f0f0f0', padding: '0 24px', minHeight: '64px' }}
            bodyStyle={{ padding: '0' }}
          >
            <div style={{ padding: '24px' }}>
              <Table 
                dataSource={comisiones}
                loading={loading.general}
                columns={[
                  { 
                    title: 'Empleado', 
                    key: 'empleado',
                    render: (record) => <Text strong>{record.empleado || record.nombreEmpleado || record.nombre_empleado || 'Empleado'}</Text>
                  },
                  { 
                    title: 'Ventas', 
                    key: 'ventas',
                    render: (record) => <Text>{formatCurrency(record.totalVentas || record.total_ventas || 0)}</Text>
                  },
                  { 
                    title: 'Comisiones', 
                    key: 'comisiones',
                    render: (record) => <Text type="success" strong>{formatCurrency(record.totalComisiones || record.total_comision || 0)}</Text>
                  }
                ]}
                pagination={{ pageSize: 5 }}
                rowKey={(record, index) => index}
              />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Reportes;
