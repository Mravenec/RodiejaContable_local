import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Typography, Button, Space,
  Select, message, Statistic, Tabs, Tag,
  Tooltip, Empty, Layout, Badge, Input, Collapse
} from 'antd';
import {
  BarChartOutlined, ReloadOutlined,
  CarOutlined, UnorderedListOutlined,
  DashboardOutlined, 
  FilterOutlined, FileExcelOutlined,
  ArrowUpOutlined, ArrowDownOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import vehiculosService from '../../api/vehiculos';
import transaccionesCompletasService from '../../api/transaccionesCompletas';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Option } = Select;
const { Content } = Layout;

const ReporteVehiculos = () => {
  const navigate = useNavigate();

  // Estados
  const [data, setData] = useState([]);
  const [vehiculosListado, setVehiculosListado] = useState([]);
  
  const [filtros, setFiltros] = useState({
    mes: moment().month() + 1,
    anio: moment().year(),
    vehiculoId: null,
    estadoVehiculo: null,
    busqueda: ''
  });

  const [totales, setTotales] = useState({
    ingresos: 0,
    egresos: 0,
    comisiones: 0,
    balanceNeto: 0
  });

  const [vehiculosFiltrados, setVehiculosFiltrados] = useState([]);
  const [loadingVehiculos, setLoadingVehiculos] = useState(false);

  const [movimientos, setMovimientos] = useState([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);

  const loading = loadingMovimientos || loadingVehiculos;



  const cargarMovimientosYVehiculos = useCallback(async () => {
    try {
      setLoadingMovimientos(true);
      setLoadingVehiculos(true);
      
      const params = {};
      if (filtros.mes && filtros.anio) {
        const fechaBase = moment().year(filtros.anio).month(filtros.mes - 1);
        params.fechaInicio = fechaBase.clone().startOf('month').format('YYYY-MM-DD');
        params.fechaFin = fechaBase.clone().endOf('month').format('YYYY-MM-DD');
      }

      // Fetch all vehicles and transactions concurrently
      const [vehiculosRes, transaccionesResVista] = await Promise.all([
        vehiculosService.getVehiculosCompletos(),
        (params.fechaInicio && params.fechaFin)
          ? transaccionesCompletasService.getTransaccionesPorRangoFechas(params.fechaInicio, params.fechaFin)
          : transaccionesCompletasService.getTransacciones()
      ]);

      // 1. Filtrar los vehículos que NO sean desarmados
      const vehiculosNoDesarmados = (vehiculosRes || []).filter(v => v.estado !== 'DESARMADO');
      
      const vehiculosIdsValid = new Set(vehiculosNoDesarmados.map(v => v.id));
      const vehiculosCodigosValid = new Set(vehiculosNoDesarmados.map(v => v.codigoVehiculo).filter(Boolean));
      const vehiculosMap = new Map();
      
      vehiculosNoDesarmados.forEach(v => {
        const genStr = typeof v.generacion === 'string' ? v.generacion : (v.generacion?.nombre || v.generacionNombre || '');
        const nombreVehiculo = `${v.marca || v.marcaNombre || ''} ${v.modelo || ''} ${genStr}`.trim();
        if (v.codigoVehiculo) vehiculosMap.set(v.codigoVehiculo, nombreVehiculo);
        if (v.id) vehiculosMap.set(v.id.toString(), nombreVehiculo);
      });

      // FILTRO DE VEHÍCULOS: Aplicar filtros de la UI
      const vehiculosList = vehiculosNoDesarmados.filter(v => {
        if (filtros.vehiculoId) {
          if (parseInt(v.id, 10) !== parseInt(filtros.vehiculoId, 10)) return false;
        }
        if (filtros.estadoVehiculo && v.estado !== filtros.estadoVehiculo) return false;
        if (filtros.busqueda) {
          const q = filtros.busqueda.toLowerCase();
          const matches = (v.codigoVehiculo || '').toLowerCase().includes(q) || 
                          (v.marca || v.marcaNombre || '').toLowerCase().includes(q) ||
                          (v.modelo || '').toLowerCase().includes(q);
          if (!matches) return false;
        }
        return true;
      });
      setVehiculosFiltrados(vehiculosList);
      setVehiculosListado(vehiculosNoDesarmados);
      
      // Subset of valid IDs based on filters to apply to transactions
      const filteredVehiculosIds = new Set(vehiculosList.map(v => v.id));
      const filteredVehiculosCodigos = new Set(vehiculosList.map(v => v.codigoVehiculo).filter(Boolean));

      // 2. Filtrar transacciones para quedarse SOLO con el historial de estos vehículos
      const movimientosVehiculos = (transaccionesResVista || []).filter(t => {
        // Verificar si la transacción pertenece a uno de los vehículos permitidos
        const matchesVehiculoId = t.vehiculoId != null && vehiculosIdsValid.has(parseInt(t.vehiculoId, 10));
        const matchesVehiculoCodigo = t.codigoVehiculo != null && vehiculosCodigosValid.has(t.codigoVehiculo);
        
        if (!(matchesVehiculoId || matchesVehiculoCodigo)) {
          return false; // Ignorar transacciones que no son de vehículos válidos (ej. repuestos puros, desarmados)
        }
        
        // Aplicar filtros de la UI sobre la transacción (busqueda)
        if (filtros.busqueda && filtros.busqueda.trim() !== '') {
          const query = filtros.busqueda.toLowerCase();
          const desc = (t.descripcion || '').toLowerCase();
          const ref = (t.referencia || '').toLowerCase();
          const codV = (t.codigoVehiculo || '').toLowerCase();

          if (!desc.includes(query) && !ref.includes(query) && !codV.includes(query)) {
            return false;
          }
        }
        
        // Aplicar filtro de generacion/estado usando los sets filtrados
        if (filtros.vehiculoId || filtros.estadoVehiculo) {
            const isFilteredId = t.vehiculoId != null && filteredVehiculosIds.has(parseInt(t.vehiculoId, 10));
            const isFilteredCodigo = t.codigoVehiculo != null && filteredVehiculosCodigos.has(t.codigoVehiculo);
            if (!(isFilteredId || isFilteredCodigo)) return false;
        }

        return true;
      }).map(t => {
        const infoOrigen = [];
        if (t.codigoVehiculo && vehiculosMap.has(t.codigoVehiculo)) {
          infoOrigen.push(`Vehículo: ${vehiculosMap.get(t.codigoVehiculo)} (${t.codigoVehiculo})`);
        } else if (t.vehiculoId && vehiculosMap.has(t.vehiculoId.toString())) {
          infoOrigen.push(`Vehículo: ${vehiculosMap.get(t.vehiculoId.toString())}`);
        } else if (t.codigoVehiculo) {
          infoOrigen.push(`Vehículo: ${t.codigoVehiculo}`);
        } else if (t.marca && t.modelo) {
          infoOrigen.push(`Vehículo: ${t.marca} ${t.modelo} ${t.generacion || ''}`.trim());
        }

        return {
          ...t,
          _infoOrigen: infoOrigen.length > 0 ? infoOrigen.join(' | ') : null
        };
      });

      const ordenados = movimientosVehiculos.sort((a, b) => {
        const fechaA = new Date(Array.isArray(a.fecha) ? `${a.fecha[0]}-${String(a.fecha[1]).padStart(2, '0')}-${String(a.fecha[2]).padStart(2, '0')}` : a.fecha);
        const fechaB = new Date(Array.isArray(b.fecha) ? `${b.fecha[0]}-${String(b.fecha[1]).padStart(2, '0')}-${String(b.fecha[2]).padStart(2, '0')}` : b.fecha);
        return fechaB - fechaA;
      });

      setMovimientos(ordenados);

      // CÁLCULO DINÁMICO DE TOTALES Y TABLA MENSUAL "FLUJO FINANCIERO"
      let tIngresos = 0;
      let tEgresos = 0;
      let tComisiones = 0;
      const monthlyDataMap = {};

      ordenados.forEach(t => {
        const monto = parseFloat(t.monto || 0);
        const categoria = (t.categoria || t.tipoTransaccion || '').toUpperCase();
        const comision = parseFloat(t.comisionEmpleado || 0);

        let fechaObj = null;
        if (Array.isArray(t.fecha)) {
          fechaObj = new Date(t.fecha[0], t.fecha[1] - 1, t.fecha[2]);
        } else if (t.fecha) {
          fechaObj = new Date(t.fecha);
        }

        let monthKey = 'Desconocido';
        let nombreMes = 'Desconocido';
        let anio = '';

        if (fechaObj && !isNaN(fechaObj.getTime())) {
          anio = fechaObj.getFullYear();
          nombreMes = fechaObj.toLocaleString('es-ES', { month: 'long' });
          nombreMes = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
          monthKey = `${anio}-${fechaObj.getMonth()}`;
        }

        if (!monthlyDataMap[monthKey]) {
          monthlyDataMap[monthKey] = {
            periodo: `${nombreMes} ${anio}`,
            nombreMes,
            anio,
            totalIngresos: 0,
            totalEgresos: 0,
            totalComisiones: 0,
            balanceNeto: 0,
            monthIndex: fechaObj ? fechaObj.getMonth() : -1
          };
        }

        const md = monthlyDataMap[monthKey];

        if (categoria === 'INGRESO' || categoria === 'VENTA') {
          tIngresos += monto;
          md.totalIngresos += monto;
        } else if (categoria === 'EGRESO' || categoria === 'COMPRA' || categoria === 'REPARACION') {
          tEgresos += monto;
          md.totalEgresos += monto;
        }

        tComisiones += comision;
        md.totalComisiones += comision;

        md.balanceNeto = md.totalIngresos - md.totalEgresos - md.totalComisiones;
      });

      const processedData = Object.values(monthlyDataMap).sort((a, b) => {
        if (a.anio !== b.anio) return a.anio - b.anio;
        return a.monthIndex - b.monthIndex;
      });

      setData(processedData);
      setTotales({
        ingresos: tIngresos,
        egresos: tEgresos,
        comisiones: tComisiones,
        balanceNeto: tIngresos - tEgresos - tComisiones
      });

    } catch (error) {
      console.error('Error al cargar movimientos y vehículos:', error);
      message.error('Error al cargar el reporte');
    } finally {
      setLoadingMovimientos(false);
      setLoadingVehiculos(false);
    }
  }, [filtros]);



  useEffect(() => {
    cargarMovimientosYVehiculos();
  }, [cargarMovimientosYVehiculos]);

  const aplicarFiltros = (valores) => {
    setFiltros(prev => ({ ...prev, ...valores }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      mes: null,
      anio: null,
      vehiculoId: null,
      estadoVehiculo: null,
      busqueda: ''
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
      'Ingresos': item.totalIngresos,
      'Inversión/Egresos': item.totalEgresos,
      'Comisiones': item.totalComisiones,
      'Ganancia Neta': item.balanceNeto
    }));

    exportData.push({
      'Año': 'TOTALES',
      'Mes': '',
      'Ingresos': totales.ingresos,
      'Inversión/Egresos': totales.egresos,
      'Comisiones': totales.comisiones,
      'Ganancia Neta': totales.balanceNeto
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte Vehículos');

    const colWidths = [
      { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `Reporte_Vehiculos_${moment().format('YYYY-MM-DD')}.xlsx`);
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
      title: 'Ingresos por Ventas',
      dataIndex: 'totalIngresos',
      key: 'totalIngresos',
      render: (val) => <Text style={{ color: '#1890ff' }}>₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(val)}</Text>,
      align: 'right',
      sorter: (a, b) => a.totalIngresos - b.totalIngresos
    },
    {
      title: 'Inversión y Reparación',
      dataIndex: 'totalEgresos',
      key: 'totalEgresos',
      render: (val) => `₡${new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(val)}`,
      align: 'right',
      sorter: (a, b) => a.totalEgresos - b.totalEgresos
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
      title: 'Ganancia Neta Real',
      dataIndex: 'balanceNeto',
      key: 'balanceNeto',
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
      sorter: (a, b) => a.balanceNeto - b.balanceNeto
    }
  ];

  const columnasVehiculos = [
    {
      title: 'Vehículo',
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
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (text) => {
        const colors = { 'DISPONIBLE': 'success', 'REPARACION': 'warning', 'VENDIDO': 'red', 'RESERVADO': 'processing' };
        return <Tag color={colors[text] || 'default'}>{text}</Tag>;
      }
    },
    {
      title: 'Antigüedad (Ingreso)',
      dataIndex: 'fechaIngreso',
      key: 'fechaIngreso',
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
      title: 'Inversión Acumulada',
      dataIndex: 'inversionTotal',
      key: 'inversionTotal',
      align: 'right',
      render: (val) => (
        <Text strong>₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(val || 0)}</Text>
      )
    },
    {
      title: 'Gestión',
      key: 'acciones',
      align: 'center',
      render: (_, record) => (
        <Tooltip title="Ver detalle financiero del vehículo">
          <Button
            type="primary"
            shape="round"
            icon={<DashboardOutlined />}
            onClick={() => navigate(`/vehiculos/${record.id}`)}
          >
            Ver Ficha
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
        const isIngreso = record.tipoTransaccion === 'INGRESO' || record.categoria === 'INGRESO' || record.categoria === 'VENTA';
        return (
          <Tag color={isIngreso ? 'success' : 'error'} style={{ borderRadius: '4px', padding: '0 8px' }}>
            {record.tipoTransaccion || record.categoria || 'DESCONOCIDO'}
          </Tag>
        );
      }
    },
    {
      title: 'Detalle de la Transacción',
      key: 'detalle',
      width: '35%',
      render: (_, record) => (
        <div style={{ padding: '4px 0' }}>
          <Text strong style={{ color: '#1f1f1f' }}>{record.referencia || `TRX: ${record.codigoTransaccion || record.id}`}</Text>
          <div style={{ fontSize: '13px', color: '#595959', marginTop: '2px', lineHeight: '1.4' }}>
            {record.descripcion}
          </div>
        </div>
      )
    },
    {
      title: 'Vehículo',
      key: 'vehiculoAsociado',
      width: '20%',
      render: (_, record) => record._infoOrigen ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {record._infoOrigen.split(' | ').map((info, i) => {
            const isVehiculo = info.startsWith('Vehículo:');
            const text = info.replace('Vehículo: ', '');
            return (
              <Tooltip title={info} key={i}>
                <div style={{ fontSize: '12px', lineHeight: '1.3', color: '#595959', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isVehiculo ? <CarOutlined style={{ marginRight: 4, color: '#8c8c8c' }} /> : null}
                  {text}
                </div>
              </Tooltip>
            );
          })}
        </div>
      ) : <Text type="secondary">N/A</Text>
    },
    {
      title: 'Impacto Financiero',
      dataIndex: 'monto',
      key: 'monto',
      align: 'right',
      width: '15%',
      render: (monto, record) => {
        const isIngreso = record.tipoTransaccion === 'INGRESO' || record.categoria === 'INGRESO' || record.categoria === 'VENTA';
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
      {/* Encabezado Simple */}
      <div style={{ marginBottom: 24, marginTop: 8 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={3} style={{ margin: 0, color: '#262626' }}>
              <DashboardOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              Reporte de Vehículos
            </Title>
            <Text type="secondary" style={{ marginTop: 4, display: 'block' }}>
              Análisis financiero, control de vehículos y trazabilidad de operaciones de compra-venta.
            </Text>
          </Col>
          <Col>
            <Tooltip title="Exportar a Microsoft Excel">
              <Button type="primary" icon={<FileExcelOutlined />} onClick={exportarAExcel}>
                Exportar
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
              <Text strong style={{ fontSize: '15px', color: '#262626' }}>
                <FilterOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                Parámetros de Análisis
              </Text>
            ),
            children: (
              <Row gutter={[24, 16]} align="bottom">
                <Col xs={24} sm={12} md={5}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '12px' }}>Búsqueda</Text>
                  <Input.Search
                    placeholder="Buscar..."
                    allowClear
                    onSearch={(val) => aplicarFiltros({ busqueda: val })}
                    onChange={(e) => {
                      if (!e.target.value) aplicarFiltros({ busqueda: '' });
                    }}
                    style={{ width: '100%', borderRadius: '6px' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={5}>
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
                      <Option value={2023}>23</Option>
                      <Option value={2024}>24</Option>
                      <Option value={2025}>25</Option>
                      <Option value={2026}>26</Option>
                    </Select>
                  </Space.Compact>
                </Col>
                <Col xs={24} sm={12} md={5}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '12px' }}>Vehículo</Text>
                  <Select
                    allowClear
                    showSearch
                    placeholder="Todos"
                    style={{ width: '100%' }}
                    value={filtros.vehiculoId}
                    onChange={(val) => aplicarFiltros({ vehiculoId: val })}
                    optionFilterProp="children"
                  >
                    {vehiculosListado.map(vehiculo => {
                      const codigo = vehiculo.codigoVehiculo || 'SIN_CODIGO';
                      const anio = vehiculo.anio || 'Año N/A';
                      const estado = vehiculo.estado || 'SIN_ESTADO';
                      const marca = vehiculo.marca || vehiculo.marcaNombre || 'Marca N/A';
                      const modelo = vehiculo.modelo || 'Modelo N/A';
                      
                      let estadoAmigable = estado;
                      if (estado === 'DESARMADO') {
                        estadoAmigable = 'Para repuestos';
                      } else if (estado === 'REPARACION') {
                        estadoAmigable = 'Para reparar';
                      } else if (estado !== 'SIN_ESTADO') {
                        estadoAmigable = estado.charAt(0).toUpperCase() + estado.slice(1).toLowerCase();
                      }
                      
                      const displayText = `${codigo} — ${marca} ${modelo} ${anio} (${estadoAmigable})`;
                      
                      return (
                        <Option key={vehiculo.id} value={vehiculo.id} title={displayText}>
                          {displayText}
                        </Option>
                      );
                    })}
                  </Select>
                </Col>
                <Col xs={24} sm={12} md={5}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '12px' }}>Estado</Text>
                  <Select
                    allowClear
                    placeholder="Todos"
                    style={{ width: '100%' }}
                    value={filtros.estadoVehiculo}
                    onChange={(val) => aplicarFiltros({ estadoVehiculo: val })}
                  >
                    <Option value="DISPONIBLE">Disponible</Option>
                    <Option value="REPARACION">En Reparación</Option>
                    <Option value="VENDIDO">Vendido</Option>
                  </Select>
                </Col>
                <Col xs={24} sm={24} md={4}>
                  <Button block icon={<ReloadOutlined />} onClick={limpiarFiltros} style={{ borderRadius: '6px' }}>
                    Reset
                  </Button>
                </Col>
              </Row>
            )
          }
        ]}
      />

      {/* Resumen Global (4 Cuadros) Siempre Visible */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} bodyStyle={{ padding: '24px' }} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}>
            <Statistic
              title={<span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Ingresos por Ventas</span>}
              value={totales.ingresos}
              precision={2}
              prefix={<ArrowUpOutlined style={{ fontSize: '20px' }} />}
              valueStyle={{ color: '#52c41a', fontWeight: 600, fontSize: '24px' }}
              formatter={(value) => `₡${value.toLocaleString('es-CR')}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} bodyStyle={{ padding: '24px' }} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}>
            <Statistic
              title={<span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Inversión y Reparación</span>}
              value={totales.egresos}
              precision={2}
              prefix={<ArrowDownOutlined style={{ fontSize: '20px' }} />}
              valueStyle={{ color: '#f5222d', fontWeight: 600, fontSize: '24px' }}
              formatter={(value) => `₡${value.toLocaleString('es-CR')}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} bodyStyle={{ padding: '24px' }} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}>
            <Statistic
              title={<span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Comisiones Totales</span>}
              value={totales.comisiones}
              precision={2}
              prefix={<ArrowDownOutlined style={{ fontSize: '20px' }} />}
              valueStyle={{ color: '#faad14', fontWeight: 600, fontSize: '24px' }}
              formatter={(value) => `₡${value.toLocaleString('es-CR')}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} bodyStyle={{ padding: '24px' }} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}>
            <Statistic
              title={<span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Ganancia Neta</span>}
              value={Math.abs(totales.balanceNeto)}
              precision={2}
              prefix={totales.balanceNeto >= 0 ? <ArrowUpOutlined style={{ fontSize: '20px' }} /> : <ArrowDownOutlined style={{ fontSize: '20px' }} />}
              valueStyle={{ color: totales.balanceNeto >= 0 ? '#52c41a' : '#f5222d', fontWeight: 600, fontSize: '24px' }}
              formatter={(value) => `${totales.balanceNeto < 0 ? '-' : ''}₡${value.toLocaleString('es-CR')}`}
            />
          </Card>
        </Col>
      </Row>

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
                            <Text style={{ color: '#1890ff' }}>₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(totales.ingresos)}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right">
                            ₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(totales.egresos)}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right">
                            ₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(totales.comisiones)}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={4} align="right">
                            <Text style={{ color: totales.balanceNeto >= 0 ? '#52c41a' : '#f5222d', fontSize: '15px' }}>
                              ₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(totales.balanceNeto)}
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
                <CarOutlined /> Vehículos Activos y Vendidos
              </span>
            ),
            children: (
              <div style={{ marginTop: '8px' }}>
                <Card
                  bordered={false}
                  title={<span style={{ fontWeight: 600, color: '#262626' }}>Listado de Vehículos (Excepto Desarmados)</span>}
                  style={{ borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                >
                  <Table
                    columns={columnasVehiculos}
                    dataSource={vehiculosFiltrados}
                    rowKey="id"
                    loading={loadingVehiculos}
                    pagination={{ defaultPageSize: 10, showSizeChanger: true }}
                    size="middle"
                    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hay vehículos que coincidan con el filtro" /> }}
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
                  title={<span style={{ fontWeight: 600, color: '#262626' }}>Trazabilidad Operativa (Compras, Reparaciones, Ventas)</span>}
                  style={{ borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                >
                  <Table
                    columns={columnasMovimientos}
                    dataSource={movimientos}
                    rowKey="id"
                    loading={loadingMovimientos}
                    pagination={{ defaultPageSize: 10, showSizeChanger: true }}
                    size="middle"
                    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No existen transacciones en el rango seleccionado" /> }}
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

export default ReporteVehiculos;
