import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Typography, Button, Space,
  Select, message, Statistic, Tabs, Tag,
  Tooltip, Empty, Layout, Badge, Input, Collapse
} from 'antd';
import {
  BarChartOutlined, ReloadOutlined,
  CarOutlined, UnorderedListOutlined,
  CalendarOutlined, DashboardOutlined, ToolOutlined,
  FilterOutlined, FileExcelOutlined,
  ArrowUpOutlined, ArrowDownOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import inventarioService from '../../api/inventario';
import vehiculosService from '../../api/vehiculos';
import transaccionesCompletasService from '../../api/transaccionesCompletas';
import finanzasService from '../../api/finanzas';
import { usePartesVehiculo } from '../../hooks';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Option } = Select;
const { Content } = Layout;

const ReporteRepuestos = () => {
  const navigate = useNavigate();

  // Estados
  const [data, setData] = useState([]);
  const [filtros, setFiltros] = useState({
    mes: moment().month() + 1,
    anio: moment().year(),
    vehiculoDesarmadoId: null,
    parteVehiculo: null,
    estadoRepuesto: null,
    busqueda: ''
  });

  const [totales, setTotales] = useState({
    ingresos: 0,
    egresos: 0,
    comisiones: 0,
    balanceNeto: 0
  });

  const [vehiculosDesarmados, setVehiculosDesarmados] = useState([]);
  const [loadingVehiculos, setLoadingVehiculos] = useState(false);

  const [movimientos, setMovimientos] = useState([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);


  // Cargar partes de vehículo desde API (para el selector de filtros)
  const { data: partesVehiculo = [] } = usePartesVehiculo();


  const loading = loadingMovimientos || loadingVehiculos;

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

      if (filtros.mes && filtros.anio) {
        const fechaBase = moment().year(filtros.anio).month(filtros.mes - 1);
        params.fechaInicio = fechaBase.clone().startOf('month').format('YYYY-MM-DD');
        params.fechaFin = fechaBase.clone().endOf('month').format('YYYY-MM-DD');
      }

      // Fetch all transacciones, all repuestos, and all dismantled vehicles concurrently
      const [transaccionesResVista, transaccionesFinanzasRaw, repuestosRes, desarmadosRes] = await Promise.all([
        (params.fechaInicio && params.fechaFin)
          ? transaccionesCompletasService.getTransaccionesPorRangoFechas(params.fechaInicio, params.fechaFin)
          : transaccionesCompletasService.getTransacciones(),
        finanzasService.getTransacciones(),
        inventarioService.getRepuestos(),
        vehiculosService.getVehiculosPorEstado('DESARMADO')
      ]);

      // Merge repuestoId y vehiculoId desde las transacciones crudas a la vista completas
      const mapRawTransacciones = new Map();
      (transaccionesFinanzasRaw || []).forEach(tr => {
        mapRawTransacciones.set(tr.id, {
          vehiculoId: tr.vehiculoId || tr.vehiculo_id,
          repuestoId: tr.repuestoId || tr.repuesto_id
        });
      });

      const transaccionesRes = transaccionesResVista.map(t => {
        const rawInfo = mapRawTransacciones.get(t.id);
        return {
          ...t,
          vehiculoId: rawInfo?.vehiculoId || t.vehiculoId,
          repuestoId: rawInfo?.repuestoId || t.repuestoId
        };
      });

      // Extract valid repuesto IDs and Codes from the inventory view
      const repuestosIdsValid = new Set(repuestosRes.map(r => r.id));
      const repuestosCodigosValid = new Set(repuestosRes.map(r => r.codigo).filter(Boolean));

      // Extract valid dismantled vehicles IDs and Codes
      const desarmadosIds = new Set((desarmadosRes || []).map(v => v.id));
      const desarmadosCodigos = new Set((desarmadosRes || []).map(v => v.codigoVehiculo).filter(Boolean));

      const repuestosMap = new Map();
      const vehiculoOrigenMap = new Map();
      repuestosRes.forEach(r => {
        const nombreRepuesto = r.descripcion || r.parteVehiculo || r.codigo;
        const info = {
          nombre: nombreRepuesto,
          parteVehiculo: r.parteVehiculo,
          parteVehiculoId: r.parteVehiculoId,
          estado: r.estado
        };
        const vehRef = r.vehiculoOrigenId || r.vehiculoId || r.codigoVehiculo;
        const vehRefStr = vehRef ? vehRef.toString() : null;

        if (r.codigo) {
          repuestosMap.set(r.codigo, info);
          if (vehRefStr) vehiculoOrigenMap.set(r.codigo, vehRefStr);
        }
        if (r.id) {
          repuestosMap.set(r.id.toString(), info);
          if (vehRefStr) vehiculoOrigenMap.set(r.id.toString(), vehRefStr);
        }
      });

      const vehiculosMap = new Map();
      const vehiculoIdToCodigoMap = new Map();
      (desarmadosRes || []).forEach(v => {
        const nombreVehiculo = `${v.marca || ''} ${v.modelo || ''} ${v.generacion || ''}`.trim();
        if (v.codigoVehiculo) {
          vehiculosMap.set(v.codigoVehiculo, nombreVehiculo);
          if (v.id) vehiculoIdToCodigoMap.set(v.id.toString(), v.codigoVehiculo);
        }
        if (v.id) vehiculosMap.set(v.id.toString(), nombreVehiculo);
      });

      // FILTRO AMPLIO: Repuestos y Carros Desarmados
      const movimientosRepuestos = transaccionesRes.filter(t => {
        // 1. Transaction explicitly tied to a valid repuesto
        const matchesRepuestoId = t.repuestoId != null && repuestosIdsValid.has(t.repuestoId);
        const matchesRepuestoCodigo = t.codigoRepuesto != null && repuestosCodigosValid.has(t.codigoRepuesto);
        const matchesRepuesto = matchesRepuestoId || matchesRepuestoCodigo;

        // 2. Transaction tied to a dismantled vehicle
        const matchesDesarmadoId = t.vehiculoId != null && desarmadosIds.has(t.vehiculoId);
        const matchesDesarmadoCodigo = t.codigoVehiculo != null && desarmadosCodigos.has(t.codigoVehiculo);
        const matchesDesarmado = matchesDesarmadoId || matchesDesarmadoCodigo;

        // 3. Check by transaction type keyword
        const tipoLower = (t.tipoTransaccion || t.categoria || '').toLowerCase();
        const esTipoRepuesto = tipoLower.includes('repuesto') || tipoLower.includes('mayoreo') || tipoLower.includes('desarme');

        // Return true if any of these conditions are met, or if it generally has a repuesto code
        let matchesAny = false;
        if (matchesRepuesto || matchesDesarmado || esTipoRepuesto) matchesAny = true;
        else if (t.codigoRepuesto != null || t.repuestoId != null) matchesAny = true; // Fallback

        if (!matchesAny) return false;

        // Filtro por Vehículo Desarmado (Igual que VehiculosJerarquicos.js)
        if (filtros.vehiculoDesarmadoId) {
          const targetVehiculoId = parseInt(filtros.vehiculoDesarmadoId, 10);

          // 1. Obtener todos los repuestos (físicos) de este vehículo
          const repuestosAsociados = repuestosRes.filter(r =>
            (r.vehiculoOrigenId && parseInt(r.vehiculoOrigenId, 10) === targetVehiculoId) ||
            (r.vehiculoId && parseInt(r.vehiculoId, 10) === targetVehiculoId)
          );

          const repuestosAsociadosIds = new Set(repuestosAsociados.map(r => parseInt(r.id, 10)));
          const repuestosAsociadosCodigos = new Set(repuestosAsociados.map(r => r.codigo).filter(Boolean));

          // 2. Comprobar si la transacción pertenece directamente al vehículo
          const matchesVehicleId = t.vehiculoId != null && parseInt(t.vehiculoId, 10) === targetVehiculoId;
          const matchesVehicleCode = vehiculoIdToCodigoMap.get(targetVehiculoId.toString()) && t.codigoVehiculo === vehiculoIdToCodigoMap.get(targetVehiculoId.toString());
          const matchesVehicle = matchesVehicleId || matchesVehicleCode;

          // 3. Comprobar si la transacción pertenece a alguno de los repuestos del vehículo
          const matchesRepuestoId = t.repuestoId != null && repuestosAsociadosIds.has(parseInt(t.repuestoId, 10));
          const matchesRepuestoCode = t.codigoRepuesto != null && repuestosAsociadosCodigos.has(t.codigoRepuesto);
          const matchesRepuesto = matchesRepuestoId || matchesRepuestoCode;

          if (!(matchesVehicle || matchesRepuesto)) {
            return false;
          }
        }

        // Filtro por Tipo de Parte
        if (filtros.parteVehiculo) {
          let repuestoInfo = null;
          if (t.codigoRepuesto) repuestoInfo = repuestosMap.get(t.codigoRepuesto);
          else if (t.repuestoId) repuestoInfo = repuestosMap.get(t.repuestoId.toString());

          if (!repuestoInfo || repuestoInfo.parteVehiculoId !== filtros.parteVehiculo) {
            return false;
          }
        }

        // Filtro por Estado de Repuesto
        if (filtros.estadoRepuesto) {
          let repuestoInfo = null;
          if (t.codigoRepuesto) repuestoInfo = repuestosMap.get(t.codigoRepuesto);
          else if (t.repuestoId) repuestoInfo = repuestosMap.get(t.repuestoId.toString());

          if (!repuestoInfo || repuestoInfo.estado !== filtros.estadoRepuesto) {
            return false;
          }
        }

        // Aplicar filtro de búsqueda si existe
        if (filtros.busqueda && filtros.busqueda.trim() !== '') {
          const query = filtros.busqueda.toLowerCase();
          const desc = (t.descripcion || '').toLowerCase();
          const ref = (t.referencia || '').toLowerCase();
          const codR = (t.codigoRepuesto || '').toLowerCase();
          const codV = (t.codigoVehiculo || '').toLowerCase();

          if (!desc.includes(query) && !ref.includes(query) && !codR.includes(query) && !codV.includes(query)) {
            return false;
          }
        }

        return true;
      }).map(t => {
        const infoOrigen = [];

        // Extraer nombre de Repuesto
        if (t.codigoRepuesto && repuestosMap.has(t.codigoRepuesto)) {
          infoOrigen.push(`Pieza: ${repuestosMap.get(t.codigoRepuesto).nombre}`);
        } else if (t.repuestoId && repuestosMap.has(t.repuestoId.toString())) {
          infoOrigen.push(`Pieza: ${repuestosMap.get(t.repuestoId.toString()).nombre}`);
        } else if (t.codigoRepuesto) {
          infoOrigen.push(`Pieza: ${t.codigoRepuesto}`);
        }

        // Extraer nombre de Vehículo
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

      const ordenados = movimientosRepuestos.sort((a, b) => {
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
        const categoria = (t.categoria || '').toUpperCase();

        // Determinar si la comisión fue pagada
        const estaPagada = t.comisionPagada === true || t.comisionPagada === 1 || t.comisionPagada === '1';
        const comision = estaPagada ? parseFloat(t.comisionEmpleado || 0) : 0;

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

        if (categoria === 'INGRESO') {
          tIngresos += monto;
          md.totalIngresos += monto;
        } else if (categoria === 'EGRESO') {
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
      console.error('Error al cargar movimientos de repuestos:', error);
      message.error('Error al cargar el historial de movimientos');
    } finally {
      setLoadingMovimientos(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargarVehiculosDesarmados();
  }, [cargarVehiculosDesarmados]);

  useEffect(() => {
    cargarMovimientosRepuestos();
  }, [cargarMovimientosRepuestos]);

  const aplicarFiltros = (valores) => {
    setFiltros(prev => ({ ...prev, ...valores }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      mes: null,
      anio: null,
      vehiculoDesarmadoId: null,
      parteVehiculo: null,
      estadoRepuesto: null,
      busqueda: ''
    });
  };

  // Opciones completas para parte del vehículo - Ahora dinámicas desde usePartesVehiculo
  const getParteOptions = () => partesVehiculo.map(p => ({ value: p.id, label: p.nombre }));

  const exportarAExcel = () => {
    if (data.length === 0) {
      message.warning('No hay datos para exportar');
      return;
    }

    const exportData = data.map(item => ({
      'Año': item.anio,
      'Mes': item.nombreMes,
      'Ingresos': item.totalIngresos,
      'Egresos': item.totalEgresos,
      'Comisiones': item.totalComisiones,
      'Balance Neto': item.balanceNeto
    }));

    exportData.push({
      'Año': 'TOTALES',
      'Mes': '',
      'Ingresos': totales.ingresos,
      'Egresos': totales.egresos,
      'Comisiones': totales.comisiones,
      'Balance Neto': totales.balanceNeto
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const nombreHoja = (filtros.mes && filtros.anio) 
      ? `${meses[filtros.mes - 1]} ${filtros.anio}` 
      : `Reporte ${moment().format('MMM YYYY')}`;
      
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja.substring(0, 31));

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
      title: 'Ingresos',
      dataIndex: 'totalIngresos',
      key: 'totalIngresos',
      render: (val) => <Text style={{ color: '#1890ff' }}>₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(val)}</Text>,
      align: 'right',
      sorter: (a, b) => a.totalIngresos - b.totalIngresos
    },
    {
      title: 'Egresos',
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
      title: 'Balance Neto',
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
      title: 'Gestión',
      key: 'acciones',
      align: 'center',
      render: (_, record) => (
        <Tooltip title="Extraer nueva pieza de este vehículo">
          <Button
            type="primary"
            shape="round"
            icon={<ToolOutlined />}
            onClick={() => navigate(`/inventario/nuevo?vehiculoId=${record.id}`)}
          >
            Extraer
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
      title: 'Detalle de la Pieza / Activo',
      key: 'repuesto',
      width: '35%',
      render: (_, record) => {
        let title = '';
        if (record.codigoRepuesto || record.repuestoId != null) {
          title = record.codigoRepuesto || `Repuesto ID: ${record.repuestoId}`;
        } else if (record.codigoVehiculo || record.vehiculoId != null) {
          title = `Vehículo ${record.codigoVehiculo || 'ID: ' + record.vehiculoId}`;
        } else {
          title = record.referencia ? `Ref: ${record.referencia}` : `Transacción: ${record.tipoTransaccion || record.categoria || 'General'}`;
        }

        return (
          <div style={{ padding: '4px 0' }}>
            <Text strong style={{ color: '#1f1f1f' }}>{title}</Text>
            <div style={{ fontSize: '13px', color: '#595959', marginTop: '2px', lineHeight: '1.4' }}>
              {record.descripcion}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Origen',
      key: 'vehiculoOrigen',
      width: '20%',
      render: (_, record) => record._infoOrigen ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {record._infoOrigen.split(' | ').map((info, i) => {
            const isVehiculo = info.startsWith('Vehículo:');
            const text = info.replace('Vehículo: ', '').replace('Pieza: ', '');
            return (
              <Tooltip title={info} key={i}>
                <div style={{ fontSize: '12px', lineHeight: '1.3', color: '#595959', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isVehiculo ? <CarOutlined style={{ marginRight: 4, color: '#8c8c8c' }} /> : <ToolOutlined style={{ marginRight: 4, color: '#8c8c8c' }} />}
                  {text}
                </div>
              </Tooltip>
            );
          })}
        </div>
      ) : <Text type="secondary" style={{ fontSize: '12px' }}>Múltiple / Ninguno</Text>
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
      {/* Encabezado Simple */}
      <div style={{ marginBottom: 24, marginTop: 8 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={3} style={{ margin: 0, color: '#262626' }}>
              <DashboardOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              Reporte de Repuestos
            </Title>
            <Text type="secondary" style={{ marginTop: 4, display: 'block' }}>
              Análisis financiero, desarmes disponibles y trazabilidad de piezas.
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
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '12px' }}>Vehículo Desarmado</Text>
                  <Select
                    allowClear
                    showSearch
                    placeholder="Todos"
                    style={{ width: '100%' }}
                    value={filtros.vehiculoDesarmadoId}
                    onChange={(val) => aplicarFiltros({ vehiculoDesarmadoId: val })}
                    optionFilterProp="children"
                  >
                    {vehiculosDesarmados.map(v => (
                      <Option key={v.id} value={v.id}>{v.codigoVehiculo} - {v.marca} {v.modelo}</Option>
                    ))}
                  </Select>
                </Col>
                <Col xs={24} sm={12} md={4}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '12px' }}>Tipo de Parte</Text>
                  <Select
                    allowClear
                    showSearch
                    placeholder="Todas"
                    style={{ width: '100%' }}
                    value={filtros.parteVehiculo}
                    onChange={(val) => aplicarFiltros({ parteVehiculo: val })}
                    optionFilterProp="children"
                  >
                    {getParteOptions().map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col xs={24} sm={12} md={5}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '12px' }}>Estado</Text>
                  <Select
                    allowClear
                    placeholder="Todos"
                    style={{ width: '100%' }}
                    value={filtros.estadoRepuesto}
                    onChange={(val) => aplicarFiltros({ estadoRepuesto: val })}
                  >
                    <Option value="STOCK">En Stock</Option>
                    <Option value="VENDIDO">Vendido</Option>
                    <Option value="AGOTADO">Agotado</Option>
                    <Option value="DAÑADO">Dañado</Option>
                    <Option value="USADO_INTERNO">Usado Interno</Option>
                  </Select>
                </Col>
                <Col xs={24} sm={24} md={3}>
                  <Button block icon={<ReloadOutlined />} onClick={() => {
                    limpiarFiltros();
                  }} style={{ borderRadius: '6px' }}>
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
              title={<span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Ingresos Totales</span>}
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
              title={<span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Egresos / Costos</span>}
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
              title={<span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Comisiones (Pagadas)</span>}
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
              title={<span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Balance Neto</span>}
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
            key: '4',
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
