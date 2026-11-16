import React, { useState, useEffect, useCallback } from 'react';
import transaccionesCompletasService from '../../api/transaccionesCompletas';
import vehiculosService from '../../api/vehiculos';
import reportesService from '../../api/reportes';
import {
  Card,
  Row,
  Col,
  Table,
  Typography,
  Progress,
  Tag,
  Button,
  DatePicker,
  Input,
  Space,
  message,
  Tooltip
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
  ArrowDownOutlined,
  FileExcelOutlined,
  MailOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import ModalEnviarReporteEmail from '../../components/reportes/ModalEnviarReporteEmail';
import DashboardKpiCard from '../../components/common/DashboardKpiCard';
import { MESES_NOMBRES, parseFecha } from '../../utils/dateUtils';
import { formatCurrency, calcularPorcentajes } from '../../utils/formatters';

const { Title, Text } = Typography;

// Función para agrupar transacciones por mes
const agruparTransaccionesPorMes = (transacciones) => {
  if (!Array.isArray(transacciones) || transacciones.length === 0) {
    return [];
  }

  const agrupado = {};

  transacciones.forEach((transaccion) => {
    const fechaTransaccion = transaccion.fecha || transaccion.fechaTransaccion || transaccion.createdAt;
    const fObj = parseFecha(fechaTransaccion);

    if (fObj && !isNaN(fObj.getTime())) {
      const mesNum = fObj.getMonth() + 1;
      const mesNombre = MESES_NOMBRES[mesNum - 1];
      const anio = fObj.getFullYear();
      const key = `${anio}-${mesNum}`;

      if (!agrupado[key]) {
        agrupado[key] = {
          mes: mesNum,
          nombreMes: mesNombre,
          anio: anio,
          totalTransacciones: 0,
          totalVentas: 0,
          totalIngresos: 0,
          totalComisiones: 0
        };
      }

      const monto = parseFloat(transaccion.monto || 0);
      const comision = parseFloat(transaccion.comisionEmpleado || transaccion.comision || 0);

      agrupado[key].totalTransacciones += 1;
      agrupado[key].totalVentas += 1;
      agrupado[key].totalIngresos += monto;
      agrupado[key].totalComisiones += comision;
    }
  });

  return Object.values(agrupado).sort((a, b) => {
    if (a.anio !== b.anio) return a.anio - b.anio;
    return a.mes - b.mes;
  });
};

const Reportes = () => {
  const [loading, setLoading] = useState({
    general: true,
    exportarAudatex: false
  });
  const [modalEmailVisible, setModalEmailVisible] = useState(false);

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

  // Estados para filtros de exportación Audatex y Dashboard (inicializado al mes en curso)
  const [fechaRange, setFechaRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [marcaFiltro, setMarcaFiltro] = useState('');

  // Cargar datos según el rango de fechas seleccionado
  const cargarDatos = useCallback(async (rango) => {
    try {
      setLoading(prev => ({ ...prev, general: true }));

      const hayRango = Boolean(rango && rango[0] && rango[1]);
      const fechaInicio = hayRango ? rango[0].format('YYYY-MM-DD') : null;
      const fechaFin = hayRango ? rango[1].format('YYYY-MM-DD') : null;

      const [transaccionesAll, vehiculosData] = await Promise.all([
        hayRango
          ? transaccionesCompletasService.getTransaccionesPorRangoFechas(fechaInicio, fechaFin).catch(() => [])
          : transaccionesCompletasService.getTransacciones().catch(() => []),
        vehiculosService.getVehiculosCompletos().catch(() => [])
      ]);

      const transaccionesLista = Array.isArray(transaccionesAll) ? transaccionesAll : [];

      // Filtrar transacciones de tipo Ingreso / Venta
      const transaccionesIngresos = transaccionesLista.filter(t => {
        const cat = (t.categoria || '').toUpperCase();
        const tipo = (t.tipoTransaccion || t.tipo_transaccion || '').toUpperCase();
        return cat === 'INGRESO' || tipo.includes('VENTA');
      });

      const cantidadVentas = transaccionesIngresos.length;
      const ingresosTotales = transaccionesIngresos.reduce((sum, t) => sum + (parseFloat(t.monto) || 0), 0);
      const promedio = cantidadVentas > 0 ? (ingresosTotales / cantidadVentas) : 0;

      // Calcular vehículos en stock real (Disponibles, en Reparación o Reservados)
      const stockReal = (vehiculosData || []).filter(v =>
        v.estado === 'DISPONIBLE' || v.estado === 'REPARACION' || v.estado === 'RESERVADO'
      ).length;

      const tasaConv = (cantidadVentas > 0 && (cantidadVentas + stockReal) > 0)
        ? Math.round((cantidadVentas / (cantidadVentas + stockReal)) * 100)
        : 0;

      setMetricas({
        totalVentas: cantidadVentas,
        totalIngresos: ingresosTotales,
        promedioVenta: promedio,
        vehiculosStock: stockReal,
        tasaConversion: tasaConv,
      });

      // Ventas agrupadas por mes para la tabla mensual
      const transaccionesAgrupadasPorMes = agruparTransaccionesPorMes(transaccionesIngresos);
      setVentasMensuales(Array.isArray(transaccionesAgrupadasPorMes) ? transaccionesAgrupadasPorMes : []);

      // Resumen Financiero: Vehículos y Repuestos en el rango
      let vehVentas = 0, vehCostos = 0, vehComisiones = 0;
      let repVentas = 0, repCostos = 0, repComisiones = 0;

      transaccionesLista.forEach(t => {
        const monto = parseFloat(t.monto || 0);
        const comision = parseFloat(t.comisionEmpleado || t.comision_empleado || 0);
        const tipo = (t.tipoTransaccion || t.tipo_transaccion || '').toUpperCase();
        const categoria = (t.categoria || '').toUpperCase();

        const esRepuesto = tipo.includes('REPUESTO') || tipo.includes('MAYOREO') || Boolean(t.codigoRepuesto && !tipo.includes('VEH'));
        const esVehiculo = tipo.includes('VEH') || tipo.includes('GRÚA') || tipo.includes('GRUA') || tipo.includes('REPARAC') || Boolean(t.codigoVehiculo && !esRepuesto);

        if (esRepuesto) {
          if (categoria === 'INGRESO' || tipo.includes('VENTA')) {
            repVentas += monto;
          } else if (categoria === 'EGRESO' || tipo.includes('COMPRA') || tipo.includes('GASTO')) {
            repCostos += monto;
          }
          repComisiones += comision;
        } else if (esVehiculo) {
          if (categoria === 'INGRESO' || tipo.includes('VENTA')) {
            vehVentas += monto;
          } else if (categoria === 'EGRESO' || tipo.includes('COMPRA') || tipo.includes('REPARAC') || tipo.includes('GRUA') || tipo.includes('REEMBOLSO')) {
            vehCostos += monto;
          }
          vehComisiones += comision;
        }
      });

      setResumenVehiculos({
        ventas: vehVentas,
        inversion: vehCostos + vehComisiones,
        ganancia: vehVentas - (vehCostos + vehComisiones)
      });

      setResumenRepuestos({
        ventas: repVentas,
        costos: repCostos + repComisiones,
        ganancia: repVentas - (repCostos + repComisiones)
      });

      // Top Vendedores y Comisiones para el período seleccionado
      const empMap = {};
      transaccionesIngresos.forEach(t => {
        const emp = t.empleado;
        if (!emp || !emp.trim()) return;
        const nombreEmp = emp.trim();
        if (!empMap[nombreEmp]) {
          empMap[nombreEmp] = {
            id: nombreEmp,
            empleado: nombreEmp,
            totalTransacciones: 0,
            transaccionesVenta: 0,
            totalVentas: 0,
            totalComisiones: 0
          };
        }
        empMap[nombreEmp].totalTransacciones += 1;
        empMap[nombreEmp].transaccionesVenta += 1;
        empMap[nombreEmp].totalVentas += parseFloat(t.monto || 0);
        empMap[nombreEmp].totalComisiones += parseFloat(t.comisionEmpleado || t.comision_empleado || 0);
      });

      const empleadosLista = Object.values(empMap);
      const topOrdenados = [...empleadosLista].sort((a, b) => b.totalTransacciones - a.totalTransacciones).slice(0, 5);
      setTopEmpleados(calcularPorcentajes(topOrdenados));

      const comisionesLista = empleadosLista.filter(c => c.totalTransacciones > 0);
      setComisiones(comisionesLista);

    } catch (error) {
      console.error('Error al cargar datos del reporte:', error);
      message.error('Error al cargar datos de reportes');
    } finally {
      setLoading(prev => ({ ...prev, general: false }));
    }
  }, []);

  // Cargar datos cada vez que cambia el rango de fechas
  useEffect(() => {
    cargarDatos(fechaRange);
  }, [fechaRange, cargarDatos]);

  // ROD-17: Función para exportar oportunidades de Audatex
  const handleExportarAudatex = async () => {
    try {
      setLoading(prev => ({ ...prev, exportarAudatex: true }));

      const params = {};
      if (fechaRange && fechaRange[0]) {
        params.desde = fechaRange[0].format('YYYY-MM-DD');
      }
      if (fechaRange && fechaRange[1]) {
        params.hasta = fechaRange[1].format('YYYY-MM-DD');
      }
      if (marcaFiltro) {
        params.armadora = marcaFiltro;
      }

      const blob = await reportesService.exportarOportunidadesAudatex(params);

      // Generar nombre de archivo con timestamp
      const timestamp = dayjs().format('YYYYMMDD_HHmm');
      const filename = `oportunidades_inpart_${timestamp}.xlsx`;

      reportesService.descargarArchivo(blob, filename);
      message.success('Excel exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar oportunidades de Audatex:', error);
      message.error('Error al exportar el archivo Excel');
    } finally {
      setLoading(prev => ({ ...prev, exportarAudatex: false }));
    }
  };

  const handleEnviarAudatexEmail = async (opciones) => {
    const params = {};
    if (fechaRange && fechaRange[0]) {
      params.desde = fechaRange[0].format('YYYY-MM-DD');
    }
    if (fechaRange && fechaRange[1]) {
      params.hasta = fechaRange[1].format('YYYY-MM-DD');
    }
    if (marcaFiltro) {
      params.armadora = marcaFiltro;
    }

    const formData = new FormData();
    if (opciones.asunto) formData.append('asunto', opciones.asunto);
    if (opciones.periodo) formData.append('periodo', opciones.periodo);
    if (opciones.mensaje) formData.append('mensaje', opciones.mensaje);
    if (marcaFiltro) formData.append('marcaFiltro', marcaFiltro);

    if (opciones.adjuntarExcel) {
      const blob = await reportesService.exportarOportunidadesAudatex(params);
      const timestamp = dayjs().format('YYYYMMDD_HHmm');
      const filename = `oportunidades_inpart_${timestamp}.xlsx`;
      formData.append('archivo', blob, filename);
    }

    await reportesService.enviarReporteAudatexEmail(formData);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <Title level={2} style={{ margin: 0, fontSize: '24px' }}>Reportes Generales</Title>

        {/* ROD-17: Botón de exportar oportunidades Audatex */}
        <Space wrap align="center">
          {fechaRange && fechaRange[0] && fechaRange[1] && (
            <Tag 
              color="blue" 
              closable 
              onClose={() => setFechaRange([null, null])} 
              style={{ borderRadius: '12px', padding: '2px 10px', fontWeight: 500 }}
            >
              Rango: {fechaRange[0].format('DD/MM/YYYY')} - {fechaRange[1].format('DD/MM/YYYY')}
            </Tag>
          )}
          <DatePicker.RangePicker
            value={fechaRange}
            onChange={setFechaRange}
            format="YYYY-MM-DD"
            placeholder={['Desde', 'Hasta']}
            style={{ marginRight: 8 }}
          />
          {marcaFiltro && (
            <Tag 
              color="purple" 
              closable 
              onClose={() => setMarcaFiltro('')} 
              style={{ borderRadius: '12px', padding: '2px 10px', fontWeight: 500 }}
            >
              Marca: {marcaFiltro}
            </Tag>
          )}
          <Input
            placeholder="Filtrar por marca/modelo"
            value={marcaFiltro}
            onChange={(e) => setMarcaFiltro(e.target.value)}
            style={{ width: 200, marginRight: 8 }}
            allowClear
          />
          <Tooltip title="Enviar reporte de oportunidades por correo electrónico">
            <Button
              icon={<MailOutlined />}
              onClick={() => setModalEmailVisible(true)}
              className="btn-correo"
            >
              Enviar por Correo
            </Button>
          </Tooltip>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            onClick={handleExportarAudatex}
            loading={loading.exportarAudatex}
            className="btn-excel"
          >
            Exportar Oportunidades InPart
          </Button>
        </Space>
      </div>

      {/* Métricas principales */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap' }}>
        <Col xs={24} sm={12} lg={6} style={{ minWidth: 220, flex: 1 }}>
          <DashboardKpiCard
            title="Ventas Totales"
            value={metricas.totalVentas}
            isCurrency={false}
            suffix=" unidades"
            type="info"
            icon={<ShoppingCartOutlined />}
            footer="Volumen total de transacciones"
            loading={loading.general}
          />
        </Col>
        <Col xs={24} sm={12} lg={6} style={{ minWidth: 220, flex: 1 }}>
          <DashboardKpiCard
            title="Ingresos Totales"
            value={metricas.totalIngresos}
            isCurrency={true}
            type="success"
            icon={<DollarOutlined />}
            footer="Facturación acumulada del negocio"
            loading={loading.general}
          />
        </Col>
        <Col xs={24} sm={12} lg={6} style={{ minWidth: 220, flex: 1 }}>
          <DashboardKpiCard
            title="Vehículos en Stock"
            value={metricas.vehiculosStock}
            isCurrency={false}
            suffix=" unidades"
            type="purple"
            icon={<CarOutlined />}
            footer="Inventario activo en patio"
            loading={loading.general}
          />
        </Col>
        <Col xs={24} sm={12} lg={6} style={{ minWidth: 220, flex: 1 }}>
          <DashboardKpiCard
            title="Tasa de Conversión"
            value={metricas.tasaConversion}
            isCurrency={false}
            suffix="%"
            type="warning"
            icon={<TrophyOutlined />}
            footer="Efectividad sobre cotizaciones"
            loading={loading.general}
          />
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
          <DashboardKpiCard
            title="Vehículos - Ganancia Neta"
            value={resumenVehiculos.ganancia}
            type="featured-blue"
            icon={<CarOutlined />}
            tag={
              <Tag color="blue" style={{ margin: 0, borderRadius: '10px', fontWeight: 600, fontSize: '11px' }}>
                Vehículos
              </Tag>
            }
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #bae7ff', fontSize: '12px' }}>
              <span style={{ color: '#52c41a', fontWeight: 600 }}>
                <ArrowUpOutlined /> Ingresos: {formatCurrency(resumenVehiculos.ventas)}
              </span>
              <span style={{ color: '#ff4d4f', fontWeight: 600 }}>
                <ArrowDownOutlined /> Costos: {formatCurrency(resumenVehiculos.inversion)}
              </span>
            </div>
          </DashboardKpiCard>
        </Col>

        <Col xs={24} md={8}>
          <DashboardKpiCard
            title="Repuestos - Ganancia Neta"
            value={resumenRepuestos.ganancia}
            type="featured-orange"
            icon={<ToolOutlined />}
            tag={
              <Tag color="orange" style={{ margin: 0, borderRadius: '10px', fontWeight: 600, fontSize: '11px' }}>
                Repuestos
              </Tag>
            }
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #ffd591', fontSize: '12px' }}>
              <span style={{ color: '#52c41a', fontWeight: 600 }}>
                <ArrowUpOutlined /> Ingresos: {formatCurrency(resumenRepuestos.ventas)}
              </span>
              <span style={{ color: '#ff4d4f', fontWeight: 600 }}>
                <ArrowDownOutlined /> Costos: {formatCurrency(resumenRepuestos.costos)}
              </span>
            </div>
          </DashboardKpiCard>
        </Col>

        <Col xs={24} md={8}>
          <DashboardKpiCard
            title="Ventas Global - Ingresos Brutos"
            value={metricas.totalIngresos}
            type="featured-green"
            icon={<ShoppingCartOutlined />}
            tag={
              <Tag color="green" style={{ margin: 0, borderRadius: '10px', fontWeight: 600, fontSize: '11px' }}>
                Global
              </Tag>
            }
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #d9f7be', fontSize: '12px' }}>
              <span style={{ color: '#595959', fontWeight: 500 }}>
                {metricas.totalVentas} transacciones
              </span>
              <span style={{ color: '#262626', fontWeight: 600 }}>
                Ticket Prom.: {formatCurrency(metricas.promedioVenta)}
              </span>
            </div>
          </DashboardKpiCard>
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

      <ModalEnviarReporteEmail
        visible={modalEmailVisible}
        onCancel={() => setModalEmailVisible(false)}
        tipoReporte="Oportunidades InPart"
        periodo={fechaRange && fechaRange[0] && fechaRange[1] ? `${fechaRange[0].format('DD/MM/YYYY')} - ${fechaRange[1].format('DD/MM/YYYY')}` : 'Todo el histórico'}
        metricasPersonalizadas={[
          { label: 'Filtro Marca / Armadora', value: marcaFiltro || 'Todas las marcas', color: '#1890ff' }
        ]}
        onEnviar={handleEnviarAudatexEmail}
      />
    </div>
  );
};

export default Reportes;
