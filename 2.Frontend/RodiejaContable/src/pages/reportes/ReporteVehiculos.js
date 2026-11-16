import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Row, Col, Table, Typography, Button, Space,
  Select, message, Tabs, Tag,
  Tooltip, Empty, Layout, Badge, Input, Collapse
} from 'antd';
import {
  BarChartOutlined, ReloadOutlined,
  CarOutlined, UnorderedListOutlined,
  DashboardOutlined,
  FilterOutlined, FileExcelOutlined,
  ArrowUpOutlined, ArrowDownOutlined,
  CalendarOutlined, MailOutlined,
  DollarOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import vehiculosService from '../../api/vehiculos';
import transaccionesCompletasService from '../../api/transaccionesCompletas';
import reportesService from '../../api/reportes';
import ModalEnviarReporteEmail from '../../components/reportes/ModalEnviarReporteEmail';
import DashboardKpiCard from '../../components/common/DashboardKpiCard';
import { MESES_NOMBRES } from '../../utils/dateUtils';
import * as XLSX from 'xlsx';


const { Title, Text } = Typography;
const { Option } = Select;
const { Content } = Layout;

const parseFecha = (fecha) => {
  if (!fecha) return null;
  if (Array.isArray(fecha)) {
    return new Date(fecha[0], fecha[1] - 1, fecha[2]);
  }
  if (typeof fecha === 'string') {
    const parts = fecha.split('T')[0].split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
  }
  return new Date(fecha);
};

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
  const [modalEmailVisible, setModalEmailVisible] = useState(false);

  const loading = loadingMovimientos || loadingVehiculos;



  const cargarMovimientosYVehiculos = useCallback(async () => {
    try {
      setLoadingMovimientos(true);
      setLoadingVehiculos(true);

      const params = {};
      if (filtros.mes || filtros.anio) {
        const targetAnio = filtros.anio || moment().year();
        if (filtros.mes) {
          const fechaBase = moment([targetAnio, filtros.mes - 1, 1]);
          params.fechaInicio = fechaBase.clone().startOf('month').format('YYYY-MM-DD');
          params.fechaFin = fechaBase.clone().endOf('month').format('YYYY-MM-DD');
        } else {
          params.fechaInicio = `${targetAnio}-01-01`;
          params.fechaFin = `${targetAnio}-12-31`;
        }
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
        // Filtro por Fecha (Mes y/o Año)
        if (filtros.mes || filtros.anio) {
          const fObj = parseFecha(t.fecha);
          if (fObj && !isNaN(fObj.getTime())) {
            if (filtros.mes && (fObj.getMonth() + 1) !== filtros.mes) {
              return false;
            }
            if (filtros.anio && fObj.getFullYear() !== filtros.anio) {
              return false;
            }
          }
        }

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
        const fechaA = parseFecha(a.fecha);
        const fechaB = parseFecha(b.fecha);
        return (fechaB?.getTime() || 0) - (fechaA?.getTime() || 0);
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

        // Determinar si la comisión fue pagada
        const estaPagada = t.comisionPagada === true || t.comisionPagada === 1 || t.comisionPagada === '1';
        const comision = estaPagada ? parseFloat(t.comisionEmpleado || 0) : 0;

        const fechaObj = parseFecha(t.fecha);

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

  const labelPeriodo = useMemo(() => {
    if (filtros.mes && filtros.anio) {
      return `${MESES_NOMBRES[filtros.mes - 1]} ${filtros.anio}`;
    }
    if (filtros.mes) return MESES_NOMBRES[filtros.mes - 1];
    if (filtros.anio) return `${filtros.anio}`;
    return null;
  }, [filtros.mes, filtros.anio]);

  const labelVehiculo = useMemo(() => {
    if (!filtros.vehiculoId) return null;
    const v = vehiculosListado.find(item => item.id === filtros.vehiculoId);
    if (!v) return `Vehículo #${filtros.vehiculoId}`;
    return `${v.codigoVehiculo || ''} ${v.marca || ''} ${v.modelo || ''}`.trim();
  }, [filtros.vehiculoId, vehiculosListado]);

  const cantidadFiltrosActivos = useMemo(() => {
    let count = 0;
    if (filtros.busqueda && filtros.busqueda.trim() !== '') count++;
    if (filtros.mes || filtros.anio) count++;
    if (filtros.vehiculoId) count++;
    if (filtros.estadoVehiculo) count++;
    return count;
  }, [filtros]);

  const tieneFiltrosActivos = cantidadFiltrosActivos > 0;

  const removerFiltro = (nombre) => {
    if (nombre === 'periodo') {
      aplicarFiltros({ mes: null, anio: null });
    } else if (nombre === 'busqueda') {
      aplicarFiltros({ busqueda: '' });
    } else {
      aplicarFiltros({ [nombre]: null });
    }
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

  // VEHÍCULOS VENDIDOS FILTRADOS POR EL PERÍODO (MES Y/O AÑO)
  const vehiculosVendidos = useMemo(() => {
    return (vehiculosListado || []).filter(v => {
      if (v.estado !== 'VENDIDO') return false;

      // Filtro por vehículo específico si fue seleccionado en filtros
      if (filtros.vehiculoId && parseInt(v.id, 10) !== parseInt(filtros.vehiculoId, 10)) {
        return false;
      }

      // Si el usuario filtró un estado diferente a VENDIDO en el dropdown general
      if (filtros.estadoVehiculo && filtros.estadoVehiculo !== 'VENDIDO') {
        return false;
      }

      // Filtro por búsqueda
      if (filtros.busqueda && filtros.busqueda.trim() !== '') {
        const q = filtros.busqueda.toLowerCase();
        const matches = (v.codigoVehiculo || '').toLowerCase().includes(q) ||
          (v.marca || v.marcaNombre || '').toLowerCase().includes(q) ||
          (v.modelo || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Filtro por fecha (Mes / Año): comparamos con fechaVenta o fecha de transacción
      if (filtros.mes || filtros.anio) {
        let fVenta = parseFecha(v.fechaVenta || v.fecha_venta);

        // Si no tiene fechaVenta registrada, buscar si hay una transacción de venta asociada
        if (!fVenta || isNaN(fVenta.getTime())) {
          const trxVenta = (movimientos || []).find(t => {
            const isThisVeh = (t.vehiculoId && parseInt(t.vehiculoId, 10) === parseInt(v.id, 10)) ||
              (t.codigoVehiculo && t.codigoVehiculo === v.codigoVehiculo);
            const isVenta = (t.categoria === 'VENTA' || t.tipoTransaccion === 'INGRESO' || (t.descripcion || '').toLowerCase().includes('venta'));
            return isThisVeh && isVenta;
          });
          if (trxVenta) {
            fVenta = parseFecha(trxVenta.fecha);
          }
        }

        if (fVenta && !isNaN(fVenta.getTime())) {
          if (filtros.mes && (fVenta.getMonth() + 1) !== filtros.mes) return false;
          if (filtros.anio && fVenta.getFullYear() !== filtros.anio) return false;
        } else {
          // Si hay filtro de fecha activo y no hay fecha de venta comprobable
          return false;
        }
      }

      return true;
    });
  }, [vehiculosListado, movimientos, filtros.mes, filtros.anio, filtros.vehiculoId, filtros.estadoVehiculo, filtros.busqueda]);

  // Obtener precio de venta alineado con VehiculosJerarquicos (precioVenta o costoRecuperado)
  const obtenerPrecioVenta = (v) => {
    const pV = Number(v?.precioVenta ?? v?.precio_venta ?? 0);
    const cR = Number(v?.costoRecuperado ?? v?.costo_recuperado ?? 0);
    return pV > 0 ? pV : cR;
  };

  const statsVendidos = useMemo(() => {
    let totInversion = 0;
    let totVenta = 0;

    vehiculosVendidos.forEach(v => {
      const inv = Number(v.inversionTotal ?? v.inversion_total ?? 0);
      const ven = obtenerPrecioVenta(v);
      totInversion += inv;
      totVenta += ven;
    });

    const ganancia = totVenta - totInversion;
    const margen = totInversion > 0 ? (ganancia / totInversion) * 100 : 0;

    return {
      cantidad: vehiculosVendidos.length,
      totInversion,
      totVenta,
      ganancia,
      margen
    };
  }, [vehiculosVendidos]);

  const exportarAExcelCliente = () => {
    const wb = XLSX.utils.book_new();

    if (data.length > 0) {
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
      let nombreHoja = 'Histórico Completo';
      if (filtros.mes && filtros.anio) {
        nombreHoja = `${MESES_NOMBRES[filtros.mes - 1]} ${filtros.anio}`;
      } else if (filtros.mes) {
        nombreHoja = `${MESES_NOMBRES[filtros.mes - 1]}`;
      } else if (filtros.anio) {
        nombreHoja = `Año ${filtros.anio}`;
      }

      XLSX.utils.book_append_sheet(wb, ws, nombreHoja.substring(0, 31));
      ws['!cols'] = [
        { wch: 10 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 18 }
      ];
    }

    if (vehiculosVendidos.length > 0) {
      const exportVendidos = vehiculosVendidos.map(v => {
        const inv = Number(v.inversionTotal ?? v.inversion_total ?? 0);
        const ven = obtenerPrecioVenta(v);
        const gan = ven - inv;
        const mar = inv > 0 ? (gan / inv) * 100 : 0;
        return {
          'Código': v.codigoVehiculo,
          'Marca': v.marca || v.marcaNombre || '',
          'Modelo': v.modelo || '',
          'Año': v.anio || '',
          'Fecha Ingreso': v.fechaIngreso || v.fecha_ingreso || '',
          'Fecha Venta': v.fechaVenta || v.fecha_venta || '',
          'Inversión Total': inv,
          'Precio Venta': ven,
          'Ganancia Neta': gan,
          '% Margen (ROI)': `${mar.toFixed(2)}%`
        };
      });

      exportVendidos.push({
        'Código': 'TOTALES',
        'Marca': `${statsVendidos.cantidad} vehículos`,
        'Modelo': '',
        'Año': '',
        'Fecha Ingreso': '',
        'Fecha Venta': '',
        'Inversión Total': statsVendidos.totInversion,
        'Precio Venta': statsVendidos.totVenta,
        'Ganancia Neta': statsVendidos.ganancia,
        '% Margen (ROI)': `${statsVendidos.margen.toFixed(2)}%`
      });

      const wsVendidos = XLSX.utils.json_to_sheet(exportVendidos);
      XLSX.utils.book_append_sheet(wb, wsVendidos, 'Vehículos Vendidos');
      wsVendidos['!cols'] = [
        { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 15 }
      ];
    }

    if (movimientos && movimientos.length > 0) {
      const exportMov = movimientos.map(m => {
        const isIng = m.tipoTransaccion === 'INGRESO' || m.categoria === 'INGRESO' || m.categoria === 'VENTA';
        const monto = Number(m.monto || 0);
        const f = parseFecha(m.fecha);
        return {
          'Fecha': f && !isNaN(f.getTime()) ? moment(f).format('DD/MM/YYYY') : '-',
          'Clasificación': m.tipoTransaccion || m.categoria || 'DESCONOCIDO',
          'Referencia': m.referencia || `TRX: ${m.codigoTransaccion || m.id}`,
          'Descripción': m.descripcion || '',
          'Vehículo': m._infoOrigen || m.codigoVehiculo || 'N/A',
          'Ingreso (₡)': isIng ? monto : 0,
          'Egreso (₡)': !isIng ? monto : 0,
          'Comisión (₡)': Number(m.comisionEmpleado || 0),
          'Comisión Pagada': (m.comisionPagada === true || m.comisionPagada === 1 || m.comisionPagada === '1') ? 'Sí' : 'No'
        };
      });

      const wsMov = XLSX.utils.json_to_sheet(exportMov);
      XLSX.utils.book_append_sheet(wb, wsMov, 'Detalle Movimientos');
      wsMov['!cols'] = [
        { wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 38 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 16 }
      ];
    }

    let nombreArchivoCliente = 'Reporte_Vehiculos_Historico_Completo.xlsx';
    if (filtros.mes && filtros.anio) {
      nombreArchivoCliente = `Reporte_Vehiculos_${MESES_NOMBRES[filtros.mes - 1]}_${filtros.anio}.xlsx`;
    } else if (filtros.anio) {
      nombreArchivoCliente = `Reporte_Vehiculos_Anio_${filtros.anio}.xlsx`;
    }

    XLSX.writeFile(wb, nombreArchivoCliente);
    message.success('Reporte exportado exitosamente');
  };

  const obtenerRangoFechasFiltro = () => {
    const params = {};
    if (filtros.mes || filtros.anio) {
      const targetAnio = filtros.anio || moment().year();
      if (filtros.mes) {
        const fechaBase = moment([targetAnio, filtros.mes - 1, 1]);
        params.fechaInicio = fechaBase.clone().startOf('month').format('YYYY-MM-DD');
        params.fechaFin = fechaBase.clone().endOf('month').format('YYYY-MM-DD');
      } else {
        params.fechaInicio = `${targetAnio}-01-01`;
        params.fechaFin = `${targetAnio}-12-31`;
      }
    }
    return params;
  };

  const construirPayloadVehiculos = () => ({
    vehiculosVendidos: (vehiculosVendidos || []).map(v => ({
      id: v.id,
      codigoVehiculo: v.codigoVehiculo,
      marca: v.marca || v.marcaNombre || '',
      modelo: v.modelo || '',
      anio: v.anio || '',
      generacion: typeof v.generacion === 'string' ? v.generacion : (v.generacion?.nombre || ''),
      fechaIngreso: v.fechaIngreso || v.fecha_ingreso || '',
      fechaVenta: v.fechaVenta || v.fecha_venta || '',
      inversionTotal: Number(v.inversionTotal ?? v.inversion_total ?? 0),
      precioVenta: obtenerPrecioVenta(v),
      costoRecuperado: Number(v.costoRecuperado ?? v.costo_recuperado ?? 0)
    })),
    totales,
    statsVendidos
  });

  // Exportar el Reporte de Vehículos (con soporte para exportar TODO el histórico si se limpian los filtros de mes)
  const exportarAExcel = async () => {
    try {
      message.loading({ content: 'Generando reporte de vehículos (3 hojas)...', key: 'exp-veh' });

      const esHistorico = !filtros.mes && !filtros.anio;
      const esAnual = !filtros.mes && Boolean(filtros.anio);

      const params = {};
      if (esHistorico) {
        params.todos = true;
      } else if (esAnual) {
        params.fechaInicio = `${filtros.anio}-01-01`;
        params.fechaFin = `${filtros.anio}-12-31`;
      } else {
        const targetAnio = filtros.anio || moment().year();
        const fechaBase = moment([targetAnio, filtros.mes - 1, 1]);
        params.fechaInicio = fechaBase.clone().startOf('month').format('YYYY-MM-DD');
        params.fechaFin = fechaBase.clone().endOf('month').format('YYYY-MM-DD');
      }

      const payload = {
        ...construirPayloadVehiculos(),
        todos: esHistorico
      };

      let nombreArchivo = 'Reporte_Vehiculos_Historico_Completo.xlsx';
      if (!esHistorico) {
        if (esAnual) {
          nombreArchivo = `Reporte_Vehiculos_Anio_${filtros.anio}.xlsx`;
        } else {
          nombreArchivo = reportesService.obtenerNombreArchivoConMes('Reporte_Vehiculos', filtros.mes, filtros.anio);
        }
      }

      const blob = await reportesService.exportarExcelVehiculosBackend(params, payload);
      reportesService.descargarArchivo(blob, nombreArchivo);
      message.success({ content: 'Reporte de vehículos exportado exitosamente con 3 hojas', key: 'exp-veh' });
    } catch (error) {
      console.warn('Backend export falló, usando exportación en navegador:', error);
      exportarAExcelCliente();
    }
  };

  const handleEnviarEmail = async (opciones) => {
    const formData = new FormData();
    if (opciones.asunto) formData.append('asunto', opciones.asunto);
    if (opciones.periodo) formData.append('periodo', opciones.periodo);
    if (opciones.mensaje && opciones.mensaje.trim() !== '') formData.append('mensaje', opciones.mensaje.trim());
    formData.append('ingresos', totales?.ingresos || 0);
    formData.append('egresos', totales?.egresos || 0);
    formData.append('comisiones', totales?.comisiones || 0);
    formData.append('balanceNeto', totales?.balanceNeto || 0);
    formData.append('cantidadVehiculos', vehiculosListado?.length || 0);

    const payloadVendidos = (vehiculosVendidos || []).map(v => {
      const inv = Number(v.inversionTotal ?? v.inversion_total ?? 0);
      const ven = obtenerPrecioVenta(v);
      const gan = ven - inv;
      const mar = inv > 0 ? (gan / inv) * 100 : 0;
      return {
        id: v.id,
        codigoVehiculo: v.codigoVehiculo,
        marca: v.marca || v.marcaNombre || '',
        modelo: v.modelo || '',
        anio: v.anio || '',
        fechaVenta: v.fechaVenta || v.fecha_venta || '',
        inversionTotal: inv,
        precioVenta: ven,
        ganancia: gan,
        margen: mar
      };
    });
    formData.append('vehiculosVendidos', JSON.stringify(payloadVendidos));

    if (opciones.adjuntarExcel) {
      try {
        const params = obtenerRangoFechasFiltro();
        const payload = construirPayloadVehiculos();
        const excelBlob = await reportesService.exportarExcelVehiculosBackend(params, payload);
        const nombreArchivo = reportesService.obtenerNombreArchivoConMes('Reporte_Vehiculos', filtros.mes, filtros.anio);
        formData.append('archivo', excelBlob, nombreArchivo);
      } catch (err) {
        console.warn('No se pudo adjuntar el Excel del backend:', err);
      }
    }

    await reportesService.enviarReporteVehiculosEmail(formData);
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
      title: 'Precio Venta',
      key: 'precioVenta',
      align: 'right',
      render: (_, record) => {
        if (record.estado !== 'VENDIDO') return <Text type="secondary">-</Text>;
        const p = Number(record.precioVenta ?? record.precio_venta ?? 0);
        return p > 0 ? (
          <Text strong style={{ color: '#1890ff' }}>
            ₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(p)}
          </Text>
        ) : <Text type="secondary">-</Text>;
      }
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

  const columnasVehiculosVendidos = [
    {
      title: 'Vehículo',
      key: 'vehiculo',
      width: '24%',
      render: (_, record) => (
        <Space direction="vertical" size={1}>
          <Text strong style={{ fontSize: '14px', color: '#1890ff' }}>
            {record.codigoVehiculo}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.marca || record.marcaNombre || ''} {record.modelo || ''} {record.anio ? `(${record.anio})` : ''}
          </Text>
          {record.generacion && (
            <Tag style={{ fontSize: '11px', marginTop: 2, borderRadius: 4 }}>
              {typeof record.generacion === 'string' ? record.generacion : (record.generacion?.nombre || '')}
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Período en Inventario',
      key: 'fechas',
      width: '18%',
      render: (_, record) => {
        const fIngreso = parseFecha(record.fechaIngreso || record.fecha_ingreso);
        const fVenta = parseFecha(record.fechaVenta || record.fecha_venta);
        const formatFecha = (d) => d && !isNaN(d.getTime()) ? moment(d).format('DD/MM/YYYY') : '-';

        let diasStock = null;
        if (fIngreso && fVenta && !isNaN(fIngreso.getTime()) && !isNaN(fVenta.getTime())) {
          diasStock = Math.max(0, moment(fVenta).diff(moment(fIngreso), 'days'));
        }

        return (
          <Space direction="vertical" size={1}>
            <div style={{ fontSize: '12px' }}>
              <Text type="secondary">Ingreso: </Text>
              <Text>{formatFecha(fIngreso)}</Text>
            </div>
            <div style={{ fontSize: '12px' }}>
              <Text type="secondary">Venta: </Text>
              <Text strong style={{ color: '#262626' }}>{formatFecha(fVenta)}</Text>
            </div>
            {diasStock !== null && (
              <Tag color="cyan" style={{ fontSize: '11px', borderRadius: 4, width: 'fit-content' }}>
                {diasStock} {diasStock === 1 ? 'día' : 'días'} en stock
              </Tag>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Inversión Total',
      key: 'inversionTotal',
      align: 'right',
      width: '15%',
      render: (_, record) => {
        const inv = Number(record.inversionTotal ?? record.inversion_total ?? 0);
        return (
          <Space direction="vertical" size={0} style={{ textAlign: 'right' }}>
            <Text strong>₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(inv)}</Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>Costo acumulado</Text>
          </Space>
        );
      },
      sorter: (a, b) => Number(a.inversionTotal ?? a.inversion_total ?? 0) - Number(b.inversionTotal ?? b.inversion_total ?? 0)
    },
    {
      title: 'Precio Venta',
      key: 'precioVenta',
      align: 'right',
      width: '15%',
      render: (_, record) => {
        const venta = obtenerPrecioVenta(record);
        return (
          <Space direction="vertical" size={0} style={{ textAlign: 'right' }}>
            <Text strong style={{ color: '#1890ff', fontSize: '14px' }}>
              ₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(venta)}
            </Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>Ingreso facturado</Text>
          </Space>
        );
      },
      sorter: (a, b) => obtenerPrecioVenta(a) - obtenerPrecioVenta(b)
    },
    {
      title: 'Ganancia Neta',
      key: 'ganancia',
      align: 'right',
      width: '16%',
      render: (_, record) => {
        const inv = Number(record.inversionTotal ?? record.inversion_total ?? 0);
        const venta = obtenerPrecioVenta(record);
        const ganancia = venta - inv;
        const esPositivo = ganancia >= 0;

        return (
          <Badge
            status={esPositivo ? 'success' : 'error'}
            text={
              <Text strong style={{ color: esPositivo ? '#52c41a' : '#f5222d', fontSize: '14px' }}>
                {esPositivo ? '+' : ''}₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(ganancia)}
              </Text>
            }
          />
        );
      },
      sorter: (a, b) => {
        const gA = obtenerPrecioVenta(a) - Number(a.inversionTotal ?? a.inversion_total ?? 0);
        const gB = obtenerPrecioVenta(b) - Number(b.inversionTotal ?? b.inversion_total ?? 0);
        return gA - gB;
      }
    },
    {
      title: '% Margen (ROI)',
      key: 'margen',
      align: 'center',
      width: '12%',
      render: (_, record) => {
        const inv = Number(record.inversionTotal ?? record.inversion_total ?? 0);
        const venta = obtenerPrecioVenta(record);
        if (inv <= 0) return <Text type="secondary">N/A</Text>;

        const margen = ((venta - inv) / inv) * 100;
        const color = margen >= 20 ? 'success' : margen >= 0 ? 'gold' : 'error';

        return (
          <Tag color={color} style={{ fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>
            {margen >= 0 ? `+${margen.toFixed(1)}%` : `${margen.toFixed(1)}%`}
          </Tag>
        );
      },
      sorter: (a, b) => {
        const invA = Number(a.inversionTotal ?? a.inversion_total ?? 0);
        const invB = Number(b.inversionTotal ?? b.inversion_total ?? 0);
        const rA = invA > 0 ? (obtenerPrecioVenta(a) - invA) / invA : -999;
        const rB = invB > 0 ? (obtenerPrecioVenta(b) - invB) / invB : -999;
        return rA - rB;
      }
    },
    {
      title: 'Acciones',
      key: 'acciones',
      align: 'center',
      width: '10%',
      render: (_, record) => (
        <Tooltip title="Ver ficha financiera del vehículo">
          <Button
            type="primary"
            shape="round"
            size="small"
            icon={<DashboardOutlined />}
            onClick={() => navigate(`/vehiculos/${record.id}`)}
          >
            Ficha
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
      width: 130,
      render: (fecha) => {
        if (!fecha) return '-';
        let formatted = '';
        if (Array.isArray(fecha)) {
          formatted = `${String(fecha[2]).padStart(2, '0')}/${String(fecha[1]).padStart(2, '0')}/${fecha[0]}`;
        } else {
          formatted = moment(fecha).format('DD/MM/YYYY');
        }
        return (
          <Space style={{ whiteSpace: 'nowrap' }}>
            <CalendarOutlined style={{ color: '#bfbfbf' }} />
            <Text>{formatted}</Text>
          </Space>
        );
      }
    },
    {
      title: 'Clasificación',
      key: 'tipo',
      width: 150,
      render: (_, record) => {
        const isIngreso = record.tipoTransaccion === 'INGRESO' || record.categoria === 'INGRESO' || record.categoria === 'VENTA';
        return (
          <Tag color={isIngreso ? 'success' : 'error'} style={{ borderRadius: '4px', padding: '0 8px', whiteSpace: 'nowrap' }}>
            {record.tipoTransaccion || record.categoria || 'DESCONOCIDO'}
          </Tag>
        );
      }
    },
    {
      title: 'Detalle de la Transacción',
      key: 'detalle',
      minWidth: 220,
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
      width: 190,
      render: (_, record) => record._infoOrigen ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {record._infoOrigen.split(' | ').map((info, i) => {
            const isVehiculo = info.startsWith('Vehículo:');
            const text = info.replace('Vehículo: ', '');
            return (
              <Tooltip title={info} key={i}>
                <div style={{ fontSize: '12px', lineHeight: '1.3', color: '#595959', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
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
      title: 'Ingresos',
      key: 'ingreso',
      align: 'right',
      width: 150,
      render: (_, record) => {
        const isIngreso = record.tipoTransaccion === 'INGRESO' || record.categoria === 'INGRESO' || record.categoria === 'VENTA';
        if (!isIngreso) {
          return <Text type="secondary" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>-</Text>;
        }
        return (
          <Text strong style={{ fontSize: '14px', color: '#52c41a', whiteSpace: 'nowrap' }}>
            + ₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(record.monto || 0)}
          </Text>
        );
      }
    },
    {
      title: 'Egresos',
      key: 'egreso',
      align: 'right',
      width: 150,
      render: (_, record) => {
        const isIngreso = record.tipoTransaccion === 'INGRESO' || record.categoria === 'INGRESO' || record.categoria === 'VENTA';
        if (isIngreso) {
          return <Text type="secondary" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>-</Text>;
        }
        return (
          <Text strong style={{ fontSize: '14px', color: '#f5222d', whiteSpace: 'nowrap' }}>
            - ₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(record.monto || 0)}
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
            <Space>
              <Tooltip title="Enviar reporte por correo electrónico">
                <Button
                  icon={<MailOutlined />}
                  onClick={() => setModalEmailVisible(true)}
                >
                  Enviar por Correo
                </Button>
              </Tooltip>
              <Tooltip title="Exportar a Microsoft Excel">
                <Button
                  type="primary"
                  icon={<FileExcelOutlined />}
                  onClick={exportarAExcel}
                  style={{
                    backgroundColor: '#52c41a',
                    borderColor: '#52c41a',
                    color: '#fff'
                  }}
                >
                  Exportar
                </Button>
              </Tooltip>
            </Space>
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
                    {labelVehiculo && (
                      <Tag 
                        color="purple" 
                        closable 
                        onClose={(e) => { e.stopPropagation(); removerFiltro('vehiculoId'); }} 
                        style={{ borderRadius: '12px', padding: '1px 8px', fontWeight: 500, margin: 0 }}
                      >
                        Vehículo: {labelVehiculo}
                      </Tag>
                    )}
                    {filtros.estadoVehiculo && (
                      <Tag 
                        color={filtros.estadoVehiculo === 'DISPONIBLE' ? 'success' : filtros.estadoVehiculo === 'REPARACION' ? 'warning' : 'blue'} 
                        closable 
                        onClose={(e) => { e.stopPropagation(); removerFiltro('estadoVehiculo'); }} 
                        style={{ borderRadius: '12px', padding: '1px 8px', fontWeight: 500, margin: 0 }}
                      >
                        Estado: {filtros.estadoVehiculo}
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
              <Row gutter={[16, 16]} align="bottom">
                <Col xs={24} sm={12} md={8} lg={5}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>Búsqueda</Text>
                    {filtros.busqueda && (
                      <Tag color="blue" closable onClose={() => removerFiltro('busqueda')} style={{ margin: 0, fontWeight: 500 }}>
                        "{filtros.busqueda}"
                      </Tag>
                    )}
                  </div>
                  <Input.Search
                    placeholder="Buscar..."
                    allowClear
                    value={filtros.busqueda}
                    onSearch={(val) => aplicarFiltros({ busqueda: val })}
                    onChange={(e) => {
                      if (!e.target.value) aplicarFiltros({ busqueda: '' });
                      else aplicarFiltros({ busqueda: e.target.value });
                    }}
                    style={{ width: '100%', borderRadius: '6px' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={8} lg={5}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>Mes a Consultar</Text>
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
                      onChange={(value) => {
                        if (value && !filtros.anio) {
                          aplicarFiltros({ mes: value, anio: moment().year() });
                        } else {
                          aplicarFiltros({ mes: value });
                        }
                      }}
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
                <Col xs={24} sm={12} md={8} lg={6}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>Vehículo</Text>
                    {labelVehiculo && (
                      <Tag color="purple" closable onClose={() => removerFiltro('vehiculoId')} style={{ margin: 0, fontWeight: 500 }}>
                        {labelVehiculo}
                      </Tag>
                    )}
                  </div>
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
                <Col xs={24} sm={12} md={8} lg={4}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>Estado</Text>
                    {filtros.estadoVehiculo && (
                      <Tag 
                        color={filtros.estadoVehiculo === 'DISPONIBLE' ? 'success' : filtros.estadoVehiculo === 'REPARACION' ? 'warning' : 'blue'} 
                        closable 
                        onClose={() => removerFiltro('estadoVehiculo')} 
                        style={{ margin: 0, fontWeight: 500 }}
                      >
                        {filtros.estadoVehiculo}
                      </Tag>
                    )}
                  </div>
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
                <Col xs={24} sm={24} md={8} lg={4}>
                  <Button 
                    block 
                    icon={<ReloadOutlined />} 
                    onClick={limpiarFiltros} 
                    disabled={!tieneFiltrosActivos}
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

      {/* Resumen Global Siempre Visible */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap' }}>
        <Col xs={24} sm={12} md={12} lg={8} xl style={{ minWidth: 210, flex: 1 }}>
          <DashboardKpiCard
            title="Ingresos por Ventas"
            value={totales.ingresos}
            type="success"
            icon={<ArrowUpOutlined />}
            footer="Cobros y liquidación de vehículos"
          />
        </Col>

        <Col xs={24} sm={12} md={12} lg={8} xl style={{ minWidth: 210, flex: 1 }}>
          <DashboardKpiCard
            title="Inversión y Reparación"
            value={totales.egresos}
            type="danger"
            icon={<ArrowDownOutlined />}
            footer="Compra de vehículos y talleres"
          />
        </Col>

        <Col xs={24} sm={12} md={12} lg={8} xl style={{ minWidth: 210, flex: 1 }}>
          <DashboardKpiCard
            title="Comisiones Pagadas"
            value={totales.comisiones}
            type="warning"
            icon={<DollarOutlined />}
            footer="Pago a vendedores y equipo"
          />
        </Col>

        <Col xs={24} sm={12} md={12} lg={8} xl style={{ minWidth: 210, flex: 1 }}>
          <DashboardKpiCard
            title="Balance Flujo Caja"
            value={totales.balanceNeto}
            type={totales.balanceNeto >= 0 ? 'success' : 'danger'}
            showSign
            tag={
              <Tag
                color={totales.balanceNeto >= 0 ? 'success' : 'error'}
                style={{ margin: 0, borderRadius: '10px', fontWeight: 600, fontSize: '11px' }}
              >
                {totales.balanceNeto >= 0 ? 'Superávit' : 'Déficit'}
              </Tag>
            }
            footer={totales.balanceNeto >= 0 ? 'Flujo de caja positivo' : 'Déficit del período'}
          />
        </Col>

        <Col xs={24} sm={12} md={12} lg={8} xl style={{ minWidth: 240, flex: 1.15 }}>
          <DashboardKpiCard
            title="Ganancia Vehículos"
            value={statsVendidos.ganancia}
            type="featured-green"
            showSign
            tag={
              <Tag color="green" style={{ margin: 0, borderRadius: '10px', fontWeight: 600, fontSize: '11px' }}>
                {statsVendidos.cantidad} {statsVendidos.cantidad === 1 ? 'vendido' : 'vendidos'}
              </Tag>
            }
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #d9f7be', fontSize: '11px' }}>
              <span style={{ color: '#595959' }}>Venta: <strong>₡{statsVendidos.totVenta.toLocaleString('es-CR')}</strong></span>
              <Tag color={statsVendidos.margen >= 0 ? 'success' : 'error'} style={{ margin: 0, fontWeight: 600, fontSize: '11px', borderRadius: '10px' }}>
                ROI: {statsVendidos.margen >= 0 ? '+' : ''}{statsVendidos.margen.toFixed(1)}%
              </Tag>
            </div>
          </DashboardKpiCard>
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
            key: '4',
            label: (
              <span style={{ fontSize: '16px', fontWeight: 500 }}>
                <DollarOutlined /> Ganancias de Vehículos Vendidos
                {statsVendidos.cantidad > 0 && (
                  <Badge
                    count={statsVendidos.cantidad}
                    style={{ backgroundColor: '#52c41a', marginLeft: 8 }}
                  />
                )}
              </span>
            ),
            children: (
              <div style={{ marginTop: '8px' }}>
                <Card
                  bordered={false}
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: '#262626' }}>
                        Rentabilidad de Unidades Vendidas {labelPeriodo ? `(${labelPeriodo})` : '(Histórico Completo)'}
                      </span>
                      <Space>
                        <Tag color="blue" style={{ fontSize: '13px', padding: '4px 10px', borderRadius: '6px' }}>
                          Total Ventas: ₡{statsVendidos.totVenta.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                        </Tag>
                        <Tag color={statsVendidos.ganancia >= 0 ? 'success' : 'error'} style={{ fontSize: '13px', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
                          Ganancia Neta: {statsVendidos.ganancia >= 0 ? '+' : ''}₡{statsVendidos.ganancia.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                        </Tag>
                      </Space>
                    </div>
                  }
                  style={{ borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                >
                  <Table
                    columns={columnasVehiculosVendidos}
                    dataSource={vehiculosVendidos}
                    rowKey="id"
                    loading={loadingVehiculos}
                    pagination={{ defaultPageSize: 10, showSizeChanger: true }}
                    size="middle"
                    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`No hay vehículos vendidos para ${labelPeriodo || 'el filtro seleccionado'}`} /> }}
                    summary={() => (
                      <Table.Summary fixed>
                        <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 600 }}>
                          <Table.Summary.Cell index={0} colSpan={2}>
                            TOTAL VENDIDOS ({statsVendidos.cantidad} {statsVendidos.cantidad === 1 ? 'vehículo' : 'vehículos'})
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right">
                            ₡{statsVendidos.totInversion.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right">
                            <Text style={{ color: '#1890ff' }}>
                              ₡{statsVendidos.totVenta.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right">
                            <Text style={{ color: statsVendidos.ganancia >= 0 ? '#52c41a' : '#f5222d', fontSize: '15px' }}>
                              {statsVendidos.ganancia >= 0 ? '+' : ''}₡{statsVendidos.ganancia.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={4} align="center">
                            <Tag color={statsVendidos.margen >= 20 ? 'success' : statsVendidos.margen >= 0 ? 'gold' : 'error'} style={{ fontWeight: 600 }}>
                              {statsVendidos.margen >= 0 ? `+${statsVendidos.margen.toFixed(1)}%` : `${statsVendidos.margen.toFixed(1)}%`}
                            </Tag>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={5} />
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
                    scroll={{ x: 1000 }}
                    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No existen transacciones en el rango seleccionado" /> }}
                    summary={() => {
                      let totalIng = 0;
                      let totalEgr = 0;
                      (movimientos || []).forEach(m => {
                        const isIng = m.tipoTransaccion === 'INGRESO' || m.categoria === 'INGRESO' || m.categoria === 'VENTA';
                        const monto = m.monto || 0;
                        if (isIng) totalIng += monto;
                        else totalEgr += monto;
                      });
                      return (
                        <Table.Summary fixed>
                          <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 600 }}>
                            <Table.Summary.Cell index={0} colSpan={4}>
                              <Text strong style={{ whiteSpace: 'nowrap' }}>TOTAL / SUMATORIA</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right">
                              <Text strong style={{ color: '#52c41a', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                + ₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(totalIng)}
                              </Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right">
                              <Text strong style={{ color: '#f5222d', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                - ₡{new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2 }).format(totalEgr)}
                              </Text>
                            </Table.Summary.Cell>
                          </Table.Summary.Row>
                        </Table.Summary>
                      );
                    }}
                  />
                </Card>
              </div>
            )
          }
        ]}
      />

      <ModalEnviarReporteEmail
        visible={modalEmailVisible}
        onCancel={() => setModalEmailVisible(false)}
        tipoReporte="Vehículos"
        periodo={(filtros.mes && filtros.anio) ? `${MESES_NOMBRES[filtros.mes - 1]} ${filtros.anio}` : `Año ${filtros.anio || moment().year()}`}
        totales={totales}
        statsVendidos={statsVendidos}
        vehiculosVendidos={vehiculosVendidos}
        onEnviar={handleEnviarEmail}
      />
    </Content>
  );
};

export default ReporteVehiculos;
