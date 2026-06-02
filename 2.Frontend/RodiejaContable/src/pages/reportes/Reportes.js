import React, { useState, useEffect } from 'react';
import VentasEmpleadosService from '../../api/ventasEmpleados';
import { getTransaccionesIngresos } from '../../api/transacciones';
import transaccionesCompletasService from '../../api/transaccionesCompletas';
import vehiculosService from '../../api/vehiculos';
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
  BarChartOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
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

      // 1 y 2. Cargar ventas mensuales y métricas
      try {
        const estadisticas = await VentasEmpleadosService.getEstadisticasVentas().catch(() => ({}));

        const [transaccionesData, vehiculosData] = await Promise.all([
          getTransaccionesIngresos().catch(() => []),
          vehiculosService.getVehiculosCompletos().catch(() => [])
        ]);

        const cantidadVentas = transaccionesData.length;
        const ingresosTotales = transaccionesData.reduce((sum, t) => sum + (t.monto || 0), 0);
        const promedio = cantidadVentas > 0 ? (ingresosTotales / cantidadVentas) : 0;

        // Calcular vehículos en stock real (Disponibles o en Reparación)
        let stockReal = 0;
        if (vehiculosData && vehiculosData.length > 0) {
          stockReal = vehiculosData.filter(v => v.estado === 'DISPONIBLE' || v.estado === 'REPARACION' || v.estado === 'RESERVADO').length;
        } else {
          stockReal = estadisticas?.vehiculosStock || 0;
        }

        let tasaConv = 0;
        if (cantidadVentas > 0 && stockReal > 0) {
          tasaConv = Math.round((cantidadVentas / (cantidadVentas + stockReal)) * 100);
        } else {
          tasaConv = estadisticas?.tasaConversion || 0;
        }

        setMetricas({
          totalVentas: cantidadVentas, // cantidad real de registros/ventas
          totalIngresos: ingresosTotales,
          promedioVenta: promedio,
          vehiculosStock: stockReal,
          tasaConversion: tasaConv,
        });

        const transaccionesAgrupadasPorMes = agruparTransaccionesPorMes(transaccionesData);
        setVentasMensuales(Array.isArray(transaccionesAgrupadasPorMes) ? transaccionesAgrupadasPorMes : []);
      } catch (error) {
        console.error('Error al cargar métricas y ventas:', error);
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
        const transaccionesAll = await transaccionesCompletasService.getTransacciones();

        let vehVentas = 0, vehCostos = 0, vehComisiones = 0;
        let repVentas = 0, repCostos = 0, repComisiones = 0;

        if (Array.isArray(transaccionesAll)) {
          transaccionesAll.forEach(t => {
            const monto = parseFloat(t.monto || 0);
            const comision = parseFloat(t.comisionEmpleado || 0);
            const categoria = (t.categoria || t.tipoTransaccion || '').toUpperCase();

            if (t.codigoVehiculo) {
              if (categoria === 'INGRESO' || categoria === 'VENTA') vehVentas += monto;
              else if (categoria === 'EGRESO' || categoria === 'COMPRA' || categoria === 'REPARACION') vehCostos += monto;
              vehComisiones += comision;
            } else if (t.codigoRepuesto) {
              if (categoria === 'INGRESO' || categoria === 'VENTA') repVentas += monto;
              else if (categoria === 'EGRESO' || categoria === 'COMPRA' || categoria === 'REPARACION') repCostos += monto;
              repComisiones += comision;
            }
          });
        }

        setResumenVehiculos({
          ventas: vehVentas,
          inversion: vehCostos,
          ganancia: vehVentas - vehCostos - vehComisiones
        });

        setResumenRepuestos({
          ventas: repVentas,
          costos: repCostos,
          ganancia: repVentas - repCostos - repComisiones
        });
      } catch (error) {
        console.error('Error al calcular flujo financiero:', error);
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
            <Title level={4} style={{ margin: 0 }}>Flujo Financiero</Title>
          </div>
        </Col>

        <Col xs={24} md={8}>
          <Card
            hoverable
            bordered={false}
            style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden', height: '100%', transition: 'all 0.3s ease' }}
            bodyStyle={{ padding: 0 }}
          >
            {/* Cabecera con gradiente azul */}
            <div style={{ background: 'linear-gradient(135deg, #1890ff 0%, #0050b3 100%)', padding: '24px', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <CarOutlined style={{ color: '#fff', fontSize: '20px' }} />
                </div>
                <Title level={4} style={{ margin: 0, color: 'white' }}>Vehículos</Title>
              </div>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', display: 'block', marginBottom: 4, fontWeight: 500 }}>Ganancia Neta</Text>
              <Title level={2} style={{ margin: 0, color: 'white' }}>{formatCurrency(resumenVehiculos.ganancia)}</Title>
            </div>

            {/* Detalles numéricos */}
            <div style={{ padding: '24px' }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title={<span style={{ fontSize: '13px', color: '#8c8c8c' }}>Ingresos</span>}
                    value={resumenVehiculos.ventas}
                    precision={0}
                    valueStyle={{ fontSize: '16px', fontWeight: 600, color: '#52c41a' }}
                    prefix={<ArrowUpOutlined style={{ fontSize: '14px' }} />}
                    formatter={value => formatCurrency(value)}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={<span style={{ fontSize: '13px', color: '#8c8c8c' }}>Costos & Comisiones</span>}
                    value={resumenVehiculos.inversion}
                    precision={0}
                    valueStyle={{ fontSize: '16px', fontWeight: 600, color: '#ff4d4f' }}
                    prefix={<ArrowDownOutlined style={{ fontSize: '14px' }} />}
                    formatter={value => formatCurrency(value)}
                  />
                </Col>
              </Row>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            hoverable
            bordered={false}
            style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden', height: '100%', transition: 'all 0.3s ease' }}
            bodyStyle={{ padding: 0 }}
          >
            {/* Cabecera con gradiente morado */}
            <div style={{ background: 'linear-gradient(135deg, #722ed1 0%, #391085 100%)', padding: '24px', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <ToolOutlined style={{ color: '#fff', fontSize: '20px' }} />
                </div>
                <Title level={4} style={{ margin: 0, color: 'white' }}>Repuestos</Title>
              </div>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', display: 'block', marginBottom: 4, fontWeight: 500 }}>Ganancia Neta</Text>
              <Title level={2} style={{ margin: 0, color: 'white' }}>{formatCurrency(resumenRepuestos.ganancia)}</Title>
            </div>

            {/* Detalles numéricos */}
            <div style={{ padding: '24px' }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title={<span style={{ fontSize: '13px', color: '#8c8c8c' }}>Ingresos</span>}
                    value={resumenRepuestos.ventas}
                    precision={0}
                    valueStyle={{ fontSize: '16px', fontWeight: 600, color: '#52c41a' }}
                    prefix={<ArrowUpOutlined style={{ fontSize: '14px' }} />}
                    formatter={value => formatCurrency(value)}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={<span style={{ fontSize: '13px', color: '#8c8c8c' }}>Costos & Comisiones</span>}
                    value={resumenRepuestos.costos}
                    precision={0}
                    valueStyle={{ fontSize: '16px', fontWeight: 600, color: '#ff4d4f' }}
                    prefix={<ArrowDownOutlined style={{ fontSize: '14px' }} />}
                    formatter={value => formatCurrency(value)}
                  />
                </Col>
              </Row>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            hoverable
            bordered={false}
            style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden', height: '100%', transition: 'all 0.3s ease' }}
            bodyStyle={{ padding: 0 }}
          >
            {/* Cabecera con gradiente verde */}
            <div style={{ background: 'linear-gradient(135deg, #52c41a 0%, #237804 100%)', padding: '24px', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <ShoppingCartOutlined style={{ color: '#fff', fontSize: '20px' }} />
                </div>
                <Title level={4} style={{ margin: 0, color: 'white' }}>Ventas Global</Title>
              </div>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', display: 'block', marginBottom: 4, fontWeight: 500 }}>Ingresos Brutos</Text>
              <Title level={2} style={{ margin: 0, color: 'white' }}>{formatCurrency(metricas.totalIngresos)}</Title>
            </div>

            {/* Detalles numéricos */}
            <div style={{ padding: '24px' }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title={<span style={{ fontSize: '13px', color: '#8c8c8c' }}>Transacciones</span>}
                    value={metricas.totalVentas}
                    valueStyle={{ fontSize: '16px', fontWeight: 600, color: '#595959' }}
                    formatter={value => `${value} regs.`}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={<span style={{ fontSize: '13px', color: '#8c8c8c' }}>Ticket Promedio</span>}
                    value={metricas.promedioVenta}
                    precision={0}
                    valueStyle={{ fontSize: '16px', fontWeight: 600, color: '#595959' }}
                    formatter={value => formatCurrency(value)}
                  />
                </Col>
              </Row>
            </div>
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
