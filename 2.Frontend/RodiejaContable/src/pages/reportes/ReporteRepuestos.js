import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Row, Col, Table, Typography, Button, Space,
  Select, DatePicker, message, Statistic, Tabs, Tag,
  Tooltip, Empty, Layout, Badge
} from 'antd';
import { 
  BarChartOutlined, ReloadOutlined, 
  CarOutlined, UnorderedListOutlined,
  DollarCircleOutlined, FallOutlined, RiseOutlined,
  CalendarOutlined, DashboardOutlined, ToolOutlined,
  FilterOutlined, FileExcelOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import reportesService from '../../api/reportes';
import vehiculosService from '../../api/vehiculos';
import transaccionesCompletasService from '../../api/transaccionesCompletas';
import locale from 'antd/es/date-picker/locale/es_ES';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Content } = Layout;

const ReporteRepuestos = () => {
  const navigate = useNavigate();

  // Estados
  const [data, setData] = useState([]);
  const [generaciones, setGeneraciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    fechaInicio: null,
    fechaFin: null,
    generacionId: null
  });

  const [totales, setTotales] = useState({
    ventas: 0,
    costos: 0,
    comisiones: 0,
    gananciaNeta: 0
  });

  const [vehiculosDesarmados, setVehiculosDesarmados] = useState([]);
  const [loadingVehiculos, setLoadingVehiculos] = useState(false);

  const [movimientos, setMovimientos] = useState([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);

  const cargarGeneraciones = async () => {
    try {
      const res = await vehiculosService.getGeneraciones();
      setGeneraciones(res);
    } catch (error) {
      console.error('Error al cargar generaciones', error);
      message.error('Error al cargar generaciones');
    }
  };

  const cargarReporteMensual = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (filtros.fechaInicio && filtros.fechaFin) {
        params.fechaInicio = filtros.fechaInicio.format('YYYY-MM-DD');
        params.fechaFin = filtros.fechaFin.format('YYYY-MM-DD');
      }
      
      if (filtros.generacionId) {
        params.generacionId = filtros.generacionId;
      }
      
      const res = await reportesService.getReporteRepuestosMensual(params);
      
      const processedData = res.map(item => ({
        ...item,
        totalVentas: Number(item.totalVentas || 0),
        totalCostos: Number(item.totalCostos || 0),
        totalComisiones: Number(item.totalComisiones || 0),
        gananciaNeta: Number(item.gananciaNeta || 0),
        periodo: `${item.nombreMes} ${item.anio}`
      }));
      
      setData(processedData);
      
      const tVentas = processedData.reduce((acc, curr) => acc + curr.totalVentas, 0);
      const tCostos = processedData.reduce((acc, curr) => acc + curr.totalCostos, 0);
      const tComisiones = processedData.reduce((acc, curr) => acc + curr.totalComisiones, 0);
      const tGanancia = processedData.reduce((acc, curr) => acc + curr.gananciaNeta, 0);
      
      setTotales({
        ventas: tVentas,
        costos: tCostos,
        comisiones: tComisiones,
        gananciaNeta: tGanancia
      });
      
    } catch (error) {
      console.error('Error al cargar el reporte de repuestos:', error);
      message.error('Error al cargar el reporte de repuestos');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  const cargarVehiculosDesarmados = useCallback(async () => {
    try {
      setLoadingVehiculos(true);
      const res = await vehiculosService.getVehiculosPorEstado('DESARMADO');
      setVehiculosDesarmados(res || []);
    } catch (error) {
      console.error('Error al cargar vehículos desarmados:', error);
      message.error('Error al cargar los vehículos para desarme');
    } finally {
      setLoadingVehiculos(false);
    }
  }, []);

  const cargarMovimientosRepuestos = useCallback(async () => {
    try {
      setLoadingMovimientos(true);
      const params = {};
      
      if (filtros.fechaInicio && filtros.fechaFin) {
        params.fechaInicio = filtros.fechaInicio.format('YYYY-MM-DD');
        params.fechaFin = filtros.fechaFin.format('YYYY-MM-DD');
      }

      let res = [];
      if (params.fechaInicio && params.fechaFin) {
        res = await transaccionesCompletasService.getTransaccionesPorRangoFechas(params.fechaInicio, params.fechaFin);
      } else {
        res = await transaccionesCompletasService.getTransacciones();
      }

      const movimientosRepuestos = res.filter(t => t.codigoRepuesto != null || t.repuestoId != null);

      const ordenados = movimientosRepuestos.sort((a, b) => {
        const fechaA = new Date(Array.isArray(a.fecha) ? `${a.fecha[0]}-${String(a.fecha[1]).padStart(2, '0')}-${String(a.fecha[2]).padStart(2, '0')}` : a.fecha);
        const fechaB = new Date(Array.isArray(b.fecha) ? `${b.fecha[0]}-${String(b.fecha[1]).padStart(2, '0')}-${String(b.fecha[2]).padStart(2, '0')}` : b.fecha);
        return fechaB - fechaA;
      });

      setMovimientos(ordenados);

    } catch (error) {
      console.error('Error al cargar movimientos de repuestos:', error);
      message.error('Error al cargar el historial de movimientos');
    } finally {
      setLoadingMovimientos(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargarGeneraciones();
    cargarVehiculosDesarmados();
  }, [cargarVehiculosDesarmados]);

  useEffect(() => {
    cargarReporteMensual();
    cargarMovimientosRepuestos();
  }, [cargarReporteMensual, cargarMovimientosRepuestos]);

  const aplicarFiltros = (valores) => {
    setFiltros(prev => ({ ...prev, ...valores }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      fechaInicio: null,
      fechaFin: null,
      generacionId: null
    });
  };

  const exportarAExcel = () => {
    if (data.length === 0) {
      message.warning('No hay datos para exportar');
      return;
    }

    const exportData = data.map(item => ({
      'Año': item.anio,
      'Mes': item.nombreMes,
      'Total Ventas': item.totalVentas,
      'Total Costos': item.totalCostos,
      'Comisiones': item.totalComisiones,
      'Ganancia Neta': item.gananciaNeta
    }));

    exportData.push({
      'Año': 'TOTALES',
      'Mes': '',
      'Total Ventas': totales.ventas,
      'Total Costos': totales.costos,
      'Comisiones': totales.comisiones,
      'Ganancia Neta': totales.gananciaNeta
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte Repuestos');
    
    const colWidths = [
      { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `Reporte_Repuestos_${moment().format('YYYY-MM-DD')}.xlsx`);
    message.success('Reporte exportado exitosamente');
  };

  // ----- Columnas de Tablas -----

  const columnasReporte = [
    {
      title: 'Período',
      key: 'periodo',
      render: (_, record) => (
        <Space>
          <CalendarOutlined style={{ color: '#8c8c8c' }} />
          <Text strong>{record.nombreMes}</Text>
          <Text type="secondary">{record.anio}</Text>
        </Space>
      ),
      sorter: (a, b) => a.anio - b.anio
    },
    {
      title: 'Ventas Brutas',
      dataIndex: 'totalVentas',
      key: 'totalVentas',
      render: (val) => <Text style={{ color: '#1890ff' }}>₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(val)}</Text>,
      align: 'right',
      sorter: (a, b) => a.totalVentas - b.totalVentas
    },
    {
      title: 'Costo Operativo',
      dataIndex: 'totalCostos',
      key: 'totalCostos',
      render: (val) => `₡${new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(val)}`,
      align: 'right',
      sorter: (a, b) => a.totalCostos - b.totalCostos
    },
    {
      title: 'Comisiones',
      dataIndex: 'totalComisiones',
      key: 'totalComisiones',
      render: (val) => `₡${new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(val)}`,
      align: 'right',
      sorter: (a, b) => a.totalComisiones - b.totalComisiones
    },
    {
      title: 'Margen de Ganancia',
      dataIndex: 'gananciaNeta',
      key: 'gananciaNeta',
      render: (val) => (
        <Badge 
          status={val >= 0 ? "success" : "error"} 
          text={
            <Text type={val >= 0 ? "success" : "danger"} strong>
              ₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(val)}
            </Text>
          } 
        />
      ),
      align: 'right',
      sorter: (a, b) => a.gananciaNeta - b.gananciaNeta
    }
  ];

  const columnasVehiculos = [
    {
      title: 'Vehículo para Desarme',
      key: 'vehiculo',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.codigoVehiculo}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.marca || record.marcaNombre || ''} {record.modelo || ''} {record.anio || ''}
          </Text>
        </Space>
      )
    },
    {
      title: 'Generación',
      dataIndex: 'generacion',
      key: 'generacion',
      render: (text, record) => <Tag color="blue">{text || record.generacionNombre || '-'}</Tag>
    },
    {
      title: 'Antigüedad (Ingreso)',
      dataIndex: 'fechaIngreso',
      key: 'fechaIngreso',
      render: (fecha) => {
        if (!fecha) return '-';
        let formatted = '';
        if (Array.isArray(fecha)) {
          formatted = `${fecha[2]}/${fecha[1]}/${fecha[0]}`;
        } else {
          formatted = moment(fecha).format('DD/MM/YYYY');
        }
        return (
          <Space>
            <CalendarOutlined style={{ color: '#bfbfbf' }} />
            <Text>{formatted}</Text>
          </Space>
        );
      }
    },
    {
      title: 'Inversión Base',
      dataIndex: 'inversionTotal',
      key: 'inversionTotal',
      align: 'right',
      render: (val) => <Text>₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(val || 0)}</Text>
    },
    {
      title: 'Capital Recuperado',
      dataIndex: 'costoRecuperado',
      key: 'costoRecuperado',
      align: 'right',
      render: (val) => (
        <Space>
          <RiseOutlined style={{ color: '#52c41a' }} />
          <Text strong type="success">
            ₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(val || 0)}
          </Text>
        </Space>
      )
    },
    {
      title: 'Gestión',
      key: 'acciones',
      align: 'center',
      render: (_, record) => (
        <Tooltip title="Ver el desglose de piezas en Inventario">
          <Button 
            type="primary" 
            shape="round"
            icon={<ToolOutlined />}
            onClick={() => navigate('/inventario', { state: { filtroVehiculo: record.codigoVehiculo } })}
          >
            Extraer Piezas
          </Button>
        </Tooltip>
      )
    }
  ];

  const columnasMovimientos = [
    {
      title: 'Registro',
      dataIndex: 'fecha',
      key: 'fecha',
      width: '15%',
      render: (fecha) => {
        if (!fecha) return '-';
        let formatted = '';
        if (Array.isArray(fecha)) {
          formatted = `${String(fecha[2]).padStart(2, '0')}/${String(fecha[1]).padStart(2, '0')}/${fecha[0]}`;
        } else {
          formatted = moment(fecha).format('DD/MM/YYYY');
        }
        return (
          <Space>
            <CalendarOutlined style={{ color: '#bfbfbf' }} />
            <Text>{formatted}</Text>
          </Space>
        );
      }
    },
    {
      title: 'Clasificación',
      key: 'tipo',
      width: '15%',
      render: (_, record) => {
        const isIngreso = record.tipoTransaccion === 'INGRESO' || record.categoria === 'INGRESO';
        return (
          <Tag color={isIngreso ? 'success' : 'error'} style={{ borderRadius: '4px', padding: '0 8px' }}>
            {record.tipoTransaccion || record.categoria || 'DESCONOCIDO'}
          </Tag>
        );
      }
    },
    {
      title: 'Detalle de la Pieza',
      key: 'repuesto',
      width: '35%',
      render: (_, record) => (
        <div style={{ padding: '4px 0' }}>
          <Text strong style={{ color: '#1f1f1f' }}>{record.codigoRepuesto || `ID: ${record.repuestoId}`}</Text>
          <div style={{ fontSize: '13px', color: '#595959', marginTop: '2px', lineHeight: '1.4' }}>
            {record.descripcion}
          </div>
        </div>
      )
    },
    {
      title: 'Origen',
      key: 'vehiculoOrigen',
      width: '20%',
      render: (_, record) => record.codigoVehiculo ? (
        <Tag icon={<CarOutlined />} color="default">
          {record.codigoVehiculo}
        </Tag>
      ) : <Text type="secondary">Múltiple / Ninguno</Text>
    },
    {
      title: 'Impacto Financiero',
      dataIndex: 'monto',
      key: 'monto',
      align: 'right',
      width: '15%',
      render: (monto, record) => {
        const isIngreso = record.tipoTransaccion === 'INGRESO' || record.categoria === 'INGRESO';
        return (
          <Text strong style={{ fontSize: '15px', color: isIngreso ? '#52c41a' : '#f5222d' }}>
            {isIngreso ? '+' : '-'} ₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(monto || 0)}
          </Text>
        );
      }
    }
  ];

  return (
    <Content style={{ padding: '0 24px', minHeight: 280 }}>
      {/* Header Premium */}
      <div style={{ 
        marginBottom: 24, 
        padding: '24px 32px', 
        background: 'linear-gradient(90deg, #1890ff 0%, #0050b3 100%)',
        borderRadius: '8px',
        color: 'white',
        boxShadow: '0 4px 12px rgba(24, 144, 255, 0.15)'
      }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={2} style={{ color: 'white', margin: 0, fontWeight: 600 }}>
              <DashboardOutlined style={{ marginRight: 12, opacity: 0.9 }} />
              Inteligencia de Repuestos
            </Title>
            <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '15px', marginTop: '8px', display: 'block' }}>
              Análisis financiero, desarmes disponibles y trazabilidad de piezas.
            </Text>
          </Col>
          <Col>
            <Tooltip title="Exportar la vista actual a Microsoft Excel">
              <Button 
                size="large" 
                icon={<FileExcelOutlined />} 
                onClick={exportarAExcel}
                style={{ 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  border: '1px solid rgba(255,255,255,0.4)',
                  color: 'white',
                  backdropFilter: 'blur(4px)'
                }}
              >
                Exportar Reporte
              </Button>
            </Tooltip>
          </Col>
        </Row>
      </div>

      {/* Control Panel de Filtros */}
      <Card 
        bordered={false}
        style={{ marginBottom: 24, borderRadius: '8px', boxShadow: '0 1px 2px -2px rgba(0, 0, 0, 0.16)' }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Text strong style={{ fontSize: '15px', color: '#262626' }}>
            <FilterOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Parámetros de Análisis
          </Text>
          <Row gutter={[24, 16]} align="bottom">
            <Col xs={24} sm={12} md={9}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '12px' }}>Rango Temporal</Text>
              <RangePicker 
                locale={locale}
                style={{ width: '100%', borderRadius: '6px' }}
                value={filtros.fechaInicio ? [filtros.fechaInicio, filtros.fechaFin] : []}
                onChange={(dates) => aplicarFiltros({
                  fechaInicio: dates ? dates[0] : null,
                  fechaFin: dates ? dates[1] : null
                })}
              />
            </Col>
            <Col xs={24} sm={12} md={9}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '12px' }}>Familia / Generación</Text>
              <Select
                allowClear
                placeholder="Seleccione para segmentar"
                style={{ width: '100%' }}
                value={filtros.generacionId}
                onChange={(val) => aplicarFiltros({ generacionId: val })}
              >
                {generaciones.map(g => (
                  <Option key={g.id} value={g.id}>{g.nombre}</Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={24} md={6}>
              <Button block icon={<ReloadOutlined />} onClick={limpiarFiltros} style={{ borderRadius: '6px' }}>
                Restablecer Vista
              </Button>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* Navegación por Pestañas */}
      <Tabs 
        defaultActiveKey="1" 
        size="large"
        style={{ background: 'transparent' }}
        items={[
          {
            key: '1',
            label: (
              <span style={{ fontSize: '16px', fontWeight: 500 }}>
                <BarChartOutlined /> Flujo Financiero
              </span>
            ),
            children: (
              <div style={{ marginTop: '8px' }}>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={24} sm={12} md={6}>
                    <Card bordered={false} style={{ borderRadius: '8px', borderLeft: '4px solid #1890ff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <Statistic 
                        title={<Text type="secondary">Ingresos por Ventas</Text>}
                        value={totales.ventas} 
                        precision={2} 
                        prefix={<DollarCircleOutlined />} 
                        valueStyle={{ color: '#1890ff', fontWeight: 600 }} 
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card bordered={false} style={{ borderRadius: '8px', borderLeft: '4px solid #faad14', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <Statistic 
                        title={<Text type="secondary">Costo de Inversión</Text>}
                        value={totales.costos} 
                        precision={2} 
                        prefix={<FallOutlined />} 
                        valueStyle={{ color: '#faad14', fontWeight: 600 }} 
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card bordered={false} style={{ borderRadius: '8px', borderLeft: '4px solid #f5222d', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <Statistic 
                        title={<Text type="secondary">Comisiones Deducidas</Text>}
                        value={totales.comisiones} 
                        precision={2} 
                        prefix={<FallOutlined />} 
                        valueStyle={{ color: '#f5222d', fontWeight: 600 }} 
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card bordered={false} style={{ borderRadius: '8px', borderLeft: `4px solid ${totales.gananciaNeta >= 0 ? '#52c41a' : '#f5222d'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <Statistic 
                        title={<Text type="secondary" strong>Rendimiento Neto</Text>}
                        value={totales.gananciaNeta} 
                        precision={2} 
                        prefix={<RiseOutlined />} 
                        valueStyle={{ color: totales.gananciaNeta >= 0 ? '#52c41a' : '#f5222d', fontWeight: 700 }} 
                      />
                    </Card>
                  </Col>
                </Row>

                <Card 
                  bordered={false} 
                  title={<span style={{ fontWeight: 600, color: '#262626' }}>Desglose de Periodos</span>}
                  style={{ borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                >
                  <Table 
                    columns={columnasReporte} 
                    dataSource={data} 
                    rowKey="periodo"
                    loading={loading}
                    pagination={{ defaultPageSize: 10, showSizeChanger: true }}
                    size="middle"
                    locale={{ emptyText: <Empty description="No hay datos financieros para el periodo seleccionado" /> }}
                    summary={() => (
                      <Table.Summary fixed>
                        <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 600 }}>
                          <Table.Summary.Cell index={0} colSpan={1}>CONSOLIDADO GLOBAL</Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right">
                            <Text style={{ color: '#1890ff' }}>₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(totales.ventas)}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right">
                            ₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(totales.costos)}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right">
                            ₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(totales.comisiones)}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={4} align="right">
                            <Text style={{ color: totales.gananciaNeta >= 0 ? '#52c41a' : '#f5222d', fontSize: '15px' }}>
                              ₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(totales.gananciaNeta)}
                            </Text>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    )}
                  />
                </Card>
              </div>
            )
          },
          {
            key: '2',
            label: (
              <span style={{ fontSize: '16px', fontWeight: 500 }}>
                <CarOutlined /> Activos de Desarme
              </span>
            ),
            children: (
              <div style={{ marginTop: '8px' }}>
                <Card 
                  bordered={false} 
                  title={<span style={{ fontWeight: 600, color: '#262626' }}>Vehículos Autorizados para Extracción de Partes</span>}
                  style={{ borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                >
                  <Table
                    columns={columnasVehiculos}
                    dataSource={vehiculosDesarmados}
                    rowKey="id"
                    loading={loadingVehiculos}
                    pagination={{ defaultPageSize: 10 }}
                    size="middle"
                    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hay vehículos en estado DESARMADO" /> }}
                  />
                </Card>
              </div>
            )
          },
          {
            key: '3',
            label: (
              <span style={{ fontSize: '16px', fontWeight: 500 }}>
                <UnorderedListOutlined /> Auditoría de Transacciones
              </span>
            ),
            children: (
              <div style={{ marginTop: '8px' }}>
                <Card 
                  bordered={false} 
                  title={<span style={{ fontWeight: 600, color: '#262626' }}>Trazabilidad Operativa (Compras, Ventas y Devoluciones)</span>}
                  style={{ borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                >
                  <Table
                    columns={columnasMovimientos}
                    dataSource={movimientos}
                    rowKey="id"
                    loading={loadingMovimientos}
                    pagination={{ defaultPageSize: 10, showSizeChanger: true }}
                    size="middle"
                    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No existen transacciones de repuestos en el rango seleccionado" /> }}
                  />
                </Card>
              </div>
            )
          }
        ]}
      />
    </Content>
  );
};

export default ReporteRepuestos;
