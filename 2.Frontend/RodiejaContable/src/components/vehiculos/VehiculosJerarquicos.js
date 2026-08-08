// src/components/VehiculosJerarquicos.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Card,
  Table,
  Collapse,
  Button,
  Spin,
  Empty,
  Typography,
  Tag,
  Row,
  Col,
  Space,
  message,
  Input,
  Tabs,
  Image
} from 'antd';
import {
  CarOutlined,
  DownOutlined,
  UpOutlined,
  RightOutlined,
  CheckOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  ToolOutlined,
  DollarOutlined
} from '@ant-design/icons';

import vehiculoService from '../../api/vehiculos';
import finanzaService from '../../api/finanzas';
import inventarioService from '../../api/inventario';
import { getTiposTransacciones } from '../../api/transacciones';
import generacionesAPI from '../../api/generaciones';
import { renderEstado } from '../../utils/vehicleUtils';
import api from '../../api/axios';

const { Panel } = Collapse;
const { Text } = Typography;
const { TabPane } = Tabs;

/* ========================= Servicios para transacciones ========================= */
// Servicio para repuestos (copiado de VehiculoDetalle)
const repuestosService = {
  async getRepuestosPorVehiculo(vehiculoId) {
    try {
      // Use the inventarioService to get all repuestos
      const allRepuestos = await inventarioService.getRepuestos();
      return allRepuestos.filter(repuesto => repuesto.vehiculoOrigenId === parseInt(vehiculoId));
    } catch (error) {
      console.error('Error fetching repuestos:', error);
      return [];
    }
  }
};

// Servicio para transacciones (copiado de VehiculoDetalle)
const transaccionesService = {
  async getTransaccionesPorVehiculo(vehiculoId) {
    try {
      console.log('Fetching transactions for vehicle ID:', vehiculoId);

      let allTransacciones, tiposTransaccion;

      try {
        // Use Promise.all to fetch transactions and transaction types in parallel
        [allTransacciones, tiposTransaccion] = await Promise.all([
          finanzaService.getTransacciones(),
          getTiposTransacciones()
        ]);

        console.log('All transactions from API:', allTransacciones);
        console.log('Transaction types from API:', tiposTransaccion);

        // Ensure we have arrays to work with
        if (!Array.isArray(allTransacciones)) {
          console.error('Unexpected transactions format:', allTransacciones);
          allTransacciones = [];
        }

        if (!Array.isArray(tiposTransaccion)) {
          console.error('Unexpected transaction types format:', tiposTransaccion);
          tiposTransaccion = [];
        }
      } catch (fetchError) {
        console.error('Error fetching data:', {
          error: fetchError.message,
          stack: fetchError.stack
        });
        throw fetchError;
      }

      // Create a map of tipos for quick lookup
      const tiposMap = tiposTransaccion.reduce((acc, tipo) => {
        acc[tipo.id] = tipo;
        return acc;
      }, {});

      console.log('Tipos map:', tiposMap);

      // First, get all repuestos for this vehicle to find their IDs
      let repuestos = [];
      try {
        // Use the repuestosService to get repuestos for this vehicle
        repuestos = await repuestosService.getRepuestosPorVehiculo(vehiculoId);
        console.log(`Found ${repuestos.length} repuestos for vehicle ${vehiculoId}:`, repuestos.map(r => r.id));
      } catch (repuestoError) {
        console.error('Error fetching repuestos:', repuestoError);
      }

      const repuestoIds = repuestos.map(r => r.id);

      // Filter transactions for the specific vehicle or its repuestos
      console.log('All transaction vehicle/repuesto IDs:', allTransacciones.map(t => ({
        id: t.id,
        vehiculoId: t.vehiculoId,
        repuestoId: t.repuestoId,
        isRepuestoTransaction: repuestoIds.includes(t.repuestoId),
        matchesVehicle: t.vehiculoId === vehiculoId || t.vehiculoId === parseInt(vehiculoId)
      })));

      const filteredTransacciones = allTransacciones.filter(transaccion => {
        // Check if transaction is directly for this vehicle
        const matchesVehicle = transaccion.vehiculoId != null &&
          (transaccion.vehiculoId === vehiculoId ||
            transaccion.vehiculoId === parseInt(vehiculoId));

        // Check if transaction is for a repuesto that belongs to this vehicle
        const matchesRepuesto = transaccion.repuestoId != null &&
          repuestoIds.includes(transaccion.repuestoId);

        console.log(`Transaction ${transaccion.id}:`, {
          transVehiculoId: transaccion.vehiculoId,
          transRepuestoId: transaccion.repuestoId,
          targetVehiculoId: vehiculoId,
          matchesVehicle,
          matchesRepuesto,
          matches: matchesVehicle || matchesRepuesto
        });

        return matchesVehicle || matchesRepuesto;
      });

      console.log('Filtered transactions:', filteredTransacciones);

      // Map transactions with their type information
      const vehiculoTransacciones = filteredTransacciones
        .map(transaccion => {
          const tipo = tiposMap[transaccion.tipoTransaccionId] || {
            nombre: 'Tipo desconocido',
            categoria: transaccion.monto > 0 ? 'INGRESO' : 'EGRESO'
          };

          return {
            ...transaccion,
            tipo_transaccion: tipo,
            // Ensure we have a proper date string for sorting
            fecha: Array.isArray(transaccion.fecha)
              ? new Date(transaccion.fecha[0], transaccion.fecha[1] - 1, transaccion.fecha[2])
              : new Date(transaccion.fecha)
          };
        })
        .sort((a, b) => b.fecha - a.fecha); // Sort by date descending

      console.log('Processed transactions:', vehiculoTransacciones);
      return vehiculoTransacciones;
    } catch (error) {
      console.error('Error fetching transacciones:', error);
      return [];
    }
  }
};

/* ========================= Helpers ========================= */
const isNullish = (v) => v === null || v === undefined || v === '{null}';
const toNum = (v, d = 0) => (isNullish(v) || v === '' ? d : Number(v));
const toStr = (v, d = '') => (isNullish(v) ? d : String(v));

// Formatear monto con separadores de miles y símbolo de colones
const formatMonto = (monto) => {
  if (monto === null || monto === undefined || isNaN(monto)) return '₡0';
  return `₡${parseFloat(monto).toLocaleString('es-CR')}`;
};

// Objetos para almacenar los tipos de transacciones
let categoriaPorTipoId = {};

// Helpers para transacciones
const getCategoriaTransaccion = (record) => {
  // Primero intenta obtener la categoría del mapeo por ID
  if (record?.tipoTransaccionId && categoriaPorTipoId[record.tipoTransaccionId]) {
    return categoriaPorTipoId[record.tipoTransaccionId];
  }
  // Si no hay ID o no está en el mapeo, intenta obtener la categoría de otros campos
  return toStr(
    record?.tipo_transaccion?.categoria ?? record?.categoria ?? record?.tipo,
    ''
  ).toUpperCase();
};

const esIngreso = (record) => getCategoriaTransaccion(record) === 'INGRESO';


const getMontoTransaccion = (record) => {
  return Math.abs(toNum(record?.monto ?? record?.valor ?? record?.importe, 0));
};

/** Acepta string ISO, Date, o array [yyyy, m, d, (hh, mm, ss)] */
const arrDateToDate = (arr) => {
  if (!Array.isArray(arr) || arr.length < 3) return null;
  const [y, m, d, hh = 0, mm = 0, ss = 0] = arr.map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, hh, mm, ss);
  return isNaN(dt.getTime()) ? null : dt;
};
const toDate = (v) => {
  if (isNullish(v)) return null;
  if (Array.isArray(v)) return arrDateToDate(v);
  const dt = new Date(String(v));
  return isNaN(dt.getTime()) ? null : dt;
};
const toDateStr = (v) => {
  const dt = toDate(v);
  return dt ? dt.toLocaleDateString() : '-';
};

/* ========== Normalización: soporta snake_case y camelCase ========== */
/**
 * @param {any} data respuesta del servicio de vehículos agrupados (marcas->modelos->generaciones->vehículos)
 * @param {Object} genIdx índices de /generaciones: { byId, byModelId, byModelName, byModelYears, byNameUnique, byYearsUnique }
 */
const normalizarEOrdenar = (
  data,
  genIdx = {
    byId: new Map(),
    byModelId: new Map(),
    byModelName: new Map(),
    byModelYears: new Map(),
    byNameUnique: new Map(),
    byYearsUnique: new Map()
  }
) => {
  const marcas = Array.isArray(data?.marcas) ? data.marcas : (Array.isArray(data) ? data : []);

  const normVehiculo = (v) => {
    const codigo = v.codigo_vehiculo ?? v.codigoVehiculo;
    const generacionId = v.generacion_id ?? v.generacionId;
    const precioCompra = v.precio_compra ?? v.precioCompra;
    const costoGrua = v.costo_grua ?? v.costoGrua;
    const inversionTotal = v.inversion_total ?? v.inversionTotal;
    const costoRecuperado = v.costo_recuperado ?? v.costoRecuperado;
    const costoPendiente = v.costo_pendiente ?? v.costoPendiente;
    const fechaIngreso = v.fecha_ingreso ?? v.fechaIngreso;
    const precioVenta = v.precio_venta ?? v.precioVenta;
    const fechaVenta = v.fecha_venta ?? v.fechaVenta;
    const fechaCreacion = v.fecha_creacion ?? v.fechaCreacion;
    const fechaActualizacion = v.fecha_actualizacion ?? v.fechaActualizacion;
    const imagenUrl = v.imagen_url ?? v.imagenUrl;

    return {
      id: v.id,
      codigo_vehiculo: toStr(codigo, 'Sin código'),
      generacion_id: generacionId,
      anio: toNum(v.anio),
      precio_compra: toNum(precioCompra),
      costo_grua: toNum(costoGrua),
      comisiones: toNum(v.comisiones),
      inversion_total: toNum(inversionTotal),
      costo_recuperado: toNum(costoRecuperado),
      costo_pendiente: toNum(costoPendiente),
      fecha_ingreso: fechaIngreso,
      estado: toStr(v.estado, 'SIN_ESTADO'),
      precio_venta: isNullish(precioVenta) ? null : Number(precioVenta),
      fecha_venta: isNullish(fechaVenta) ? null : fechaVenta,
      activo: toNum(v.activo, 0),
      notas: isNullish(v.notas) ? null : String(v.notas),
      fecha_creacion: fechaCreacion,
      fecha_actualizacion: fechaActualizacion,
      imagen_url: imagenUrl
    };
  };

  // ✅ CORREGIDO y endurecido: preferir match por nombre/años; el id es último y verificado
  const normGeneracion = (g, parentModeloId) => {
    const idGen = g.id ?? g.generacion_id;
    const modeloId = g.modelo_id ?? g.modeloId ?? parentModeloId;
    const nombre = g.nombre;
    const nombreLower = (nombre ?? '').toLowerCase();
    const aI = g.anio_inicio ?? g.anioInicio;
    const aF = g.anio_fin ?? g.anioFin;

    let fromApi;

    // 1) por (modeloId|nombre)
    if (!fromApi && !isNullish(modeloId) && nombreLower) {
      fromApi = genIdx.byModelName.get(`${modeloId}|${nombreLower}`);
    }

    // 2) por (modeloId|anioInicio|anioFin)
    if (!fromApi && !isNullish(modeloId) && !isNullish(aI) && !isNullish(aF)) {
      fromApi = genIdx.byModelYears.get(`${modeloId}|${aI}|${aF}`);
    }

    // 3) por nombre único global (solo si es único)
    if (!fromApi && nombreLower) {
      const unique = genIdx.byNameUnique.get(nombreLower);
      if (unique) fromApi = unique;
    }

    // 4) por años únicos globales (solo si son únicos)
    if (!fromApi && !isNullish(aI) && !isNullish(aF)) {
      const uniqueYears = genIdx.byYearsUnique.get(`${aI}|${aF}`);
      if (uniqueYears) fromApi = uniqueYears;
    }

    // 5) por id (solo si nombre coincide o explícitamente el modelo coincide y NO hay nombre)
    if (!fromApi && !isNullish(idGen)) {
      const cand = genIdx.byId.get(idGen);
      const nombreCoincide = cand && nombreLower && (cand.nombre ?? '').toLowerCase() === nombreLower;
      const modeloCoincide = cand && (isNullish(modeloId) || cand.modeloId === modeloId);
      if (nombreCoincide || (!nombreLower && modeloCoincide)) {
        fromApi = cand;
      }
    }

    // Valores finales priorizando fromApi (pero sin pisar con nulls)
    const anioInicio = !isNullish(fromApi?.anioInicio) ? fromApi.anioInicio : aI;
    const anioFin = !isNullish(fromApi?.anioFin) ? fromApi.anioFin : aF;

    const totalInversion = !isNullish(fromApi?.totalInversion) ? fromApi.totalInversion : (g.total_inversion ?? g.totalInversion);
    const totalIngresos = !isNullish(fromApi?.totalIngresos) ? fromApi.totalIngresos : (g.total_ingresos ?? g.totalIngresos);
    const totalEgresos = !isNullish(fromApi?.totalEgresos) ? fromApi.totalEgresos : (g.total_egresos ?? g.totalEgresos);
    const balanceNeto = !isNullish(fromApi?.balanceNeto) ? fromApi.balanceNeto : (g.balance_neto ?? g.balanceNeto);

    return {
      id: isNullish(idGen) ? fromApi?.id : idGen,
      modelo_id: isNullish(modeloId) ? fromApi?.modeloId : modeloId,
      nombre: toStr(nombre ?? fromApi?.nombre, 'Sin generación'),
      descripcion: toStr(g.descripcion ?? fromApi?.descripcion, ''),
      anio_inicio: isNullish(anioInicio) ? undefined : Number(anioInicio),
      anio_fin: isNullish(anioFin) ? null : Number(anioFin),
      total_inversion: toNum(totalInversion),
      total_ingresos: toNum(totalIngresos),
      total_egresos: toNum(totalEgresos),
      balance_neto: toNum(balanceNeto),
      activo: toNum(g.activo ?? fromApi?.activo, 0),
      fecha_creacion: toStr(g.fecha_creacion ?? g.fechaCreacion ?? fromApi?.fechaCreacion),
      vehiculos: (Array.isArray(g.vehiculos) ? g.vehiculos.map(normVehiculo) : [])
        .sort((a, b) => (a.anio ?? 0) - (b.anio ?? 0))
    };
  };

  const normModelo = (mo) => ({
    id: mo.id,
    marca_id: mo.marca_id,
    nombre: toStr(mo.nombre, 'Sin modelo'),
    activo: toNum(mo.activo, 0),
    fecha_creacion: toStr(mo.fecha_creacion ?? mo.fechaCreacion),
    generaciones: (Array.isArray(mo.generaciones) ? mo.generaciones.map((g) => normGeneracion(g, mo.id)) : [])
      .sort((a, b) => (a.anio_inicio ?? 0) - (b.anio_inicio ?? 0))
  });

  return marcas
    .map((m) => ({
      id: m.id,
      nombre: toStr(m.nombre, 'Sin marca'),
      activo: toNum(m.activo, 0),
      fecha_creacion: toStr(m.fecha_creacion ?? m.fechaCreacion),
      modelos: (Array.isArray(m.modelos) ? m.modelos.map(normModelo) : [])
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
};

/* ========================= Componente ========================= */
const VehiculosJerarquicos = () => {
  const [loading, setLoading] = useState(true);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [tiposTransaccionesCargados, setTiposTransaccionesCargados] = useState(false);
  const [marcas, setMarcas] = useState([]);
  const [filteredMarcas, setFilteredMarcas] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState({});
  const [transacciones, setTransacciones] = useState({});
  const [repuestos, setRepuestos] = useState({});
  const [loadingTransacciones, setLoadingTransacciones] = useState({});
  const [loadingRepuestos, setLoadingRepuestos] = useState({});
  const [showRawData, setShowRawData] = useState(false);
  const [rawData, setRawData] = useState(null);

  // State for search and expanded sections
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBrandKeys, setActiveBrandKeys] = useState([]);
  const [expandedModelsByMarca, setExpandedModelsByMarca] = useState({});
  const [expandedGensByModelo, setExpandedGensByModelo] = useState({});
  const vehiculoRefs = useRef({});
  const [vehiculoMatchId, setVehiculoMatchId] = useState(null);

  // Handle marking vehicle as available
  const handleMarcarComoDisponible = async (vehiculoId) => {
    try {
      await api.put(`/vehiculos/${vehiculoId}/estado?estado=DISPONIBLE`);
      message.success('Vehículo marcado como disponible exitosamente');
      // Refresh data
      cargarDatos();
    } catch (error) {
      console.error('Error updating vehicle status:', error);
      message.error('Error al actualizar el estado del vehículo');
    }
  };

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);

      // ✅ Traemos ambas fuentes en paralelo:
      // - Vehículos agrupados (estructura jerárquica)
      // - Generaciones (totales ya calculados por BD)
      const [vehResp, genResp] = await Promise.all([
        vehiculoService.getVehiculosAgrupados(),
        generacionesAPI.getAll().catch(() => null)
      ]);

      if (!vehResp) throw new Error('Respuesta vacía del servidor');

      // Soportar axios (data) o respuesta directa
      const vehData = vehResp?.data ?? vehResp;
      const gensList = genResp ? (genResp.data ?? genResp) : [];

      // 🔑 Índices robustos para resolver correctamente cada generación
      const byId = new Map();           // id global del endpoint /generaciones
      const byModelId = new Map();      // `${modeloId}|${id}` para ids locales vs globales
      const byModelName = new Map();    // `${modeloId}|${nombreLower}`
      const byModelYears = new Map();   // `${modeloId}|${anioInicio}|${anioFin}`
      const nameBuckets = new Map();    // nombreLower -> [objs]
      const yearsBuckets = new Map();   // `${anioInicio}|${anioFin}` -> [objs]

      gensList.forEach((g) => {
        const id = g.id;
        const modeloId = g.modeloId ?? g.modelo_id;
        const nombre = (g.nombre ?? '').toLowerCase();
        const anioInicio = g.anioInicio ?? g.anio_inicio;
        const anioFin = g.anioFin ?? g.anio_fin;

        const obj = {
          id,
          modeloId,
          nombre: g.nombre,
          descripcion: g.descripcion,
          anioInicio: toNum(anioInicio, undefined),
          anioFin: toNum(anioFin, undefined),
          totalInversion: toNum(g.totalInversion ?? g.total_inversion),
          totalIngresos: toNum(g.totalIngresos ?? g.total_ingresos),
          totalEgresos: toNum(g.totalEgresos ?? g.total_egresos),
          balanceNeto: toNum(g.balanceNeto ?? g.balance_neto),
          activo: g.activo,
          fechaCreacion: g.fechaCreacion ?? g.fecha_creacion
        };

        if (!isNullish(id)) byId.set(id, obj);
        if (!isNullish(id) && !isNullish(modeloId)) byModelId.set(`${modeloId}|${id}`, obj);
        if (!isNullish(modeloId) && nombre) byModelName.set(`${modeloId}|${nombre}`, obj);
        if (!isNullish(modeloId) && !isNullish(anioInicio) && !isNullish(anioFin)) {
          byModelYears.set(`${modeloId}|${anioInicio}|${anioFin}`, obj);
        }

        // buckets para match "único" global
        if (nombre) {
          const arr = nameBuckets.get(nombre) ?? [];
          arr.push(obj);
          nameBuckets.set(nombre, arr);
        }
        if (!isNullish(anioInicio) && !isNullish(anioFin)) {
          const key = `${anioInicio}|${anioFin}`;
          const arr = yearsBuckets.get(key) ?? [];
          arr.push(obj);
          yearsBuckets.set(key, arr);
        }
      });

      // Indices de acceso directo cuando el bucket es único
      const byNameUnique = new Map();
      nameBuckets.forEach((arr, key) => {
        if (arr.length === 1) byNameUnique.set(key, arr[0]);
      });
      const byYearsUnique = new Map();
      yearsBuckets.forEach((arr, key) => {
        if (arr.length === 1) byYearsUnique.set(key, arr[0]);
      });

      setRawData({ vehiculosAgrupados: vehData, generaciones: gensList });

      // ✅ Normalizamos e INYECTAMOS los totales por generación con los nuevos índices
      const datos = normalizarEOrdenar(vehData, {
        byId,
        byModelId,
        byModelName,
        byModelYears,
        byNameUnique,
        byYearsUnique
      });

      if (!datos.length) {
        message.info('No se encontraron vehículos para mostrar');
      }
      setMarcas(datos);
      setFilteredMarcas(datos); // Initialize filtered list with all brands
      console.log('Data loaded successfully:', datos);
      console.log('Sample marca structure:', datos[0]);
    } catch (error) {
      console.error('Error al cargar los vehículos/generaciones:', error);
      message.error(`Error al cargar los datos: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Find a vehicle by its code in the hierarchy
  const findVehiclePath = useCallback((codigo, marcasList) => {
    if (!codigo) return null;

    const normalizedQuery = codigo.trim().toLowerCase();

    for (const marca of marcasList) {
      for (const modelo of (marca.modelos || [])) {
        for (const generacion of (modelo.generaciones || [])) {
          for (const vehiculo of (generacion.vehiculos || [])) {
            const vehiculoCodigo = (vehiculo.codigo_vehiculo || '').toLowerCase();
            if (vehiculoCodigo === normalizedQuery) {
              return { marca, modelo, generacion, vehiculo };
            }
          }
        }
      }
    }
    return null;
  }, []);

  // Handle search input changes
  const handleSearch = useCallback((value) => {
    console.log('Search called with value:', value);
    console.log('Current marcas:', marcas);

    const query = value.trim().toLowerCase();
    setSearchQuery(query);

    if (!query) {
      console.log('Empty query, showing all marcas');
      setFilteredMarcas(marcas);
      setActiveBrandKeys([]);
      return;
    }

    console.log('Searching for:', query);

    // If it looks like a vehicle code (e.g., TOYA-001)
    if (/^[a-z]{2,4}-\d{2,4}$/i.test(query)) {
      console.log('Detected vehicle code pattern');
      const match = findVehiclePath(query, marcas);
      if (match) {
        const { marca, modelo, generacion, vehiculo } = match;
        console.log('Found vehicle:', match);

        // Set active brand and expand the hierarchy
        setActiveBrandKeys([`marca-${marca.id}`]);
        setExpandedModelsByMarca(prev => ({
          ...prev,
          [marca.id]: [...(prev[marca.id] || []), modelo.id]
        }));
        setExpandedGensByModelo(prev => ({
          ...prev,
          [modelo.id]: [...(prev[modelo.id] || []), generacion.id]
        }));

        // Expand the vehicle and scroll to it
        setTimeout(() => {
          setExpandedKeys(prev => ({ ...prev, [vehiculo.id]: true }));
          setVehiculoMatchId(vehiculo.id);

          // Scroll to the matched vehicle
          if (vehiculoRefs.current[vehiculo.id]) {
            vehiculoRefs.current[vehiculo.id].scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }

          // Remove highlight after 3 seconds
          setTimeout(() => setVehiculoMatchId(null), 3000);
        }, 100);

        // Set filtered to only show the matching brand
        setFilteredMarcas([marca]);
      } else {
        console.log('No vehicle found for code:', query);
        message.warning(`No se encontró ningún vehículo con el código: ${query}`);
        setFilteredMarcas([]);
      }
    } else {
      console.log('General search pattern');
      // Filter by all fields: brand, model, generation, and vehicle code
      const filtered = marcas.filter(marca => {
        const brandMatch = marca.nombre.toLowerCase().includes(query);

        const modelMatch = (marca.modelos || []).some(modelo =>
          modelo.nombre.toLowerCase().includes(query) ||
          (modelo.generaciones || []).some(generacion =>
            generacion.nombre.toLowerCase().includes(query) ||
            (generacion.vehiculos || []).some(vehiculo =>
              (vehiculo.codigo_vehiculo || '').toLowerCase().includes(query)
            )
          )
        );

        return brandMatch || modelMatch;
      });

      console.log('Filtered results:', filtered);
      setFilteredMarcas(filtered);

      // Auto-expand matching brands
      if (filtered.length > 0 && filtered.length <= 5) {
        setActiveBrandKeys(filtered.map(m => `marca-${m.id}`));
      } else {
        setActiveBrandKeys([]);
      }
    }
  }, [marcas, findVehiclePath]);

  // Remove the redundant useEffect since handleSearch already handles filtering


  // Toggle model expansion
  const toggleModel = useCallback((marcaId, modeloId) => {
    setExpandedModelsByMarca(prev => ({
      ...prev,
      [marcaId]: prev[marcaId]?.includes(modeloId)
        ? prev[marcaId].filter(id => id !== modeloId)
        : [...(prev[marcaId] || []), modeloId]
    }));
  }, []);

  // Toggle generation expansion
  const toggleGeneration = useCallback((modeloId, generacionId) => {
    setExpandedGensByModelo(prev => ({
      ...prev,
      [modeloId]: prev[modeloId]?.includes(generacionId)
        ? prev[modeloId].filter(id => id !== generacionId)
        : [...(prev[modeloId] || []), generacionId]
    }));
  }, []);

  useEffect(() => {
    cargarDatos(); // ✅ aquí es donde cambiamos el estado con la data fusionada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array since this should only run once on mount

  // Cargar tipos de transacciones al montar el componente
  useEffect(() => {
    const cargarTiposTransacciones = async () => {
      try {
        setLoadingTipos(true);
        const tipos = await getTiposTransacciones();

        // Actualizar los mapeos de tipos de transacción
        const nuevoCategoriaPorTipoId = {};

        tipos.forEach(tipo => {
          if (tipo.activo) {
            nuevoCategoriaPorTipoId[tipo.id] = tipo.categoria;
          }
        });

        categoriaPorTipoId = nuevoCategoriaPorTipoId;
        setTiposTransaccionesCargados(true);

      } catch (error) {
        console.error('Error al cargar tipos de transacciones:', error);
        message.error('Error al cargar los tipos de transacciones');

        // En caso de error, marcar como cargado para evitar bloqueo infinito
        setTiposTransaccionesCargados(true);
      } finally {
        setLoadingTipos(false);
      }
    };

    if (!tiposTransaccionesCargados) {
      cargarTiposTransacciones();
    }
  }, [tiposTransaccionesCargados]);

  // Cargar vehículos después de que los tipos de transacciones estén listos
  useEffect(() => {
    if (tiposTransaccionesCargados) {
      cargarDatos(); // ✅ recarga para asegurar fusión completa
    }
  }, [tiposTransaccionesCargados, cargarDatos]);

  // Función personalizada para manejar la expansión y carga de transacciones (CORREGIDA)
  const handleExpand = useCallback(async (vehiculoId, expanded) => {
    if (!expanded || transacciones[vehiculoId]) {
      return; // Si no se está expandiendo o ya tenemos las transacciones, no hacer nada
    }

    try {
      setLoadingTransacciones(prev => ({ ...prev, [vehiculoId]: true }));

      // ✅ CORREGIDO: Usar el servicio correcto (copiado de VehiculoDetalle)
      const transaccionesData = await transaccionesService.getTransaccionesPorVehiculo(vehiculoId);

      // Asegurarse de que tenemos un array, incluso si la respuesta es null/undefined
      const transaccionesNormalizadas = Array.isArray(transaccionesData) ? transaccionesData : [];

      // Ordenar por fecha (más reciente primero)
      const transaccionesOrdenadas = [...transaccionesNormalizadas].sort((a, b) => {
        const fechaA = toDate(a.fecha || a.fecha_transaccion);
        const fechaB = toDate(b.fecha || b.fecha_transaccion);
        if (!fechaA && !fechaB) return 0;
        if (!fechaA) return 1;
        if (!fechaB) return -1;
        return fechaB.getTime() - fechaA.getTime();
      });

      setTransacciones(prev => ({
        ...prev,
        [vehiculoId]: transaccionesOrdenadas
      }));

    } catch (error) {
      console.error(`Error al cargar transacciones del vehículo ${vehiculoId}:`, error);
      message.error(`Error al cargar transacciones: ${error.message || 'Error desconocido'}`);

      // Establecer array vacío en caso de error
      setTransacciones(prev => ({
        ...prev,
        [vehiculoId]: []
      }));
    } finally {
      setLoadingTransacciones(prev => ({ ...prev, [vehiculoId]: false }));
    }
  }, [transacciones]);

  // Función para cargar repuestos del vehículo
  const loadRepuestos = useCallback(async (vehiculoId) => {
    if (repuestos[vehiculoId]) {
      return; // Si ya tenemos los repuestos, no hacer nada
    }

    try {
      setLoadingRepuestos(prev => ({ ...prev, [vehiculoId]: true }));
      const repuestosData = await repuestosService.getRepuestosPorVehiculo(vehiculoId);

      setRepuestos(prev => ({
        ...prev,
        [vehiculoId]: Array.isArray(repuestosData) ? repuestosData : []
      }));
    } catch (error) {
      console.error(`Error al cargar repuestos del vehículo ${vehiculoId}:`, error);
      message.warning(`No se pudieron cargar los repuestos: ${error.message || 'Error desconocido'}`);

      // Establecer array vacío en caso de error
      setRepuestos(prev => ({
        ...prev,
        [vehiculoId]: []
      }));
    } finally {
      setLoadingRepuestos(prev => ({ ...prev, [vehiculoId]: false }));
    }
  }, [repuestos]);

  const columnasTransacciones = useMemo(() => ([
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 120,
      responsive: ['md'],
      render: (fecha, record) => {
        const fechaTransaccion = fecha || record.fecha_transaccion || record.fechaTransaccion;
        return toDateStr(fechaTransaccion);
      }
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      render: (text, record) => {
        const descripcion = text || record.concepto || record.detalle || '-';
        const fechaTransaccion = record.fecha || record.fecha_transaccion || record.fechaTransaccion;
        const ingreso = esIngreso(record);

        return (
          <div>
            <div style={{ marginBottom: 4 }}>{toStr(descripcion, '-')}</div>
            <div>
              <span style={{ marginRight: 8, display: 'inline-block' }}>
                {toDateStr(fechaTransaccion)}
              </span>
              <Tag color={ingreso ? 'green' : 'red'}>
                {ingreso ? 'INGRESO' : 'EGRESO'}
              </Tag>
            </div>
          </div>
        );
      }
    },
    {
      title: 'Monto',
      dataIndex: 'monto',
      key: 'monto',
      align: 'right',
      render: (_monto, record) => {
        const ingreso = esIngreso(record);
        const monto = getMontoTransaccion(record);
        const signo = ingreso ? '+' : '-';

        return (
          <Text strong style={{ color: ingreso ? 'green' : 'red' }}>
            {signo} {formatMonto(monto).replace('₡', '')}
          </Text>
        );
      }
    }
  ]), []);

  // Helper function to get estado tag for repuestos (copiado de VehiculoDetalle)
  const getEstadoRepuestoTag = (estado) => {
    const estados = {
      STOCK: { color: 'success', text: 'Disponible' },
      VENDIDO: { color: 'error', text: 'Vendido' },
      RESERVADO: { color: 'warning', text: 'Reservado' },
      DAÑADO: { color: 'error', text: 'Dañado' }
    };

    const estadoInfo = estados[estado] || { color: 'default', text: estado || 'Desconocido' };
    return <Tag color={estadoInfo.color}>{estadoInfo.text}</Tag>;
  };

  const renderVehiculo = (vehiculo) => {
    const tieneTransacciones = transacciones[vehiculo.id]?.length > 0;
    const tieneRepuestos = repuestos[vehiculo.id]?.length > 0;
    const cargandoTransacciones = loadingTransacciones[vehiculo.id];
    const cargandoRepuestos = loadingRepuestos[vehiculo.id];
    const estaExpandido = expandedKeys[vehiculo.id];

    return (
      <Collapse
        ghost
        expandIcon={({ isActive }) => (
          <Button
            type="text"
            size="small"
            icon={isActive ? <DownOutlined /> : <RightOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              const nuevoEstado = !expandedKeys[vehiculo.id];

              // Actualizar estado de expansión
              setExpandedKeys(prev => ({ ...prev, [vehiculo.id]: nuevoEstado }));

              // Cargar transacciones y repuestos si se está expandiendo
              if (nuevoEstado) {
                handleExpand(vehiculo.id, true);
                loadRepuestos(vehiculo.id);
              }
            }}
          />
        )}
        className="vehiculo-collapse"
        activeKey={estaExpandido ? [`veh-${vehiculo.id}`] : []}
      >
        <Panel
          key={`veh-${vehiculo.id}`}
          header={
            <div className="vehiculo-header" style={{ width: '100%' }}>
              <Row gutter={[8, 8]} align="middle" wrap={false}>
                <Col flex="none">
                  <CarOutlined style={{ fontSize: '16px' }} />
                </Col>
                {/* Imagen miniatura del vehículo */}
                <Col flex="none" style={{ marginRight: '8px' }}>
                  {vehiculo.imagen_url ? (
                    <Image
                      width={40}
                      height={40}
                      src={vehiculo.imagen_url}
                      alt={`Vehículo ${vehiculo.codigo_vehiculo}`}
                      style={{
                        objectFit: 'cover',
                        borderRadius: 4,
                        border: '1px solid #d9d9d9'
                      }}
                      placeholder={
                        <div style={{
                          width: 40,
                          height: 40,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f5f5f5',
                          borderRadius: 4,
                          border: '1px solid #d9d9d9'
                        }}>
                          <CarOutlined style={{ fontSize: 16, color: '#bfbfbf' }} />
                        </div>
                      }
                      preview={true}
                    />
                  ) : (
                    <div style={{
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f5f5f5',
                      borderRadius: 4,
                      border: '1px solid #d9d9d9',
                      color: '#bfbfbf'
                    }}>
                      <CarOutlined style={{ fontSize: 16 }} />
                    </div>
                  )}
                </Col>
                <Col flex="auto" style={{ minWidth: 0 }}>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '8px' }}>
                    <Text strong>{toStr(vehiculo.codigo_vehiculo, 'Sin código')}</Text>
                    <Text type="secondary" style={{ marginLeft: '8px' }}>{vehiculo.anio ?? '-'}</Text>
                    <span style={{ marginLeft: '8px' }}>{renderEstado(vehiculo.estado)}</span>
                  </div>
                </Col>
                <Col flex="none">
                  <Space wrap size={[8, 8]} style={{ justifyContent: 'flex-end' }}>
                    {vehiculo.estado === 'REPARACION' && (
                      <Button
                        type="primary"
                        size="small"
                        icon={<CheckOutlined />}
                        style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                        onClick={() => handleMarcarComoDisponible(vehiculo.id)}
                      >
                        Hacer Disponible
                      </Button>
                    )}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8em' }}><Text type="secondary">Inversión</Text></div>
                      <Text strong>{formatMonto(vehiculo.inversion_total)}</Text>
                    </div>
                    {toStr(vehiculo.estado).toUpperCase() === 'VENDIDO' && !isNullish(vehiculo.precio_venta) && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.8em' }}><Text type="secondary">Venta</Text></div>
                        <Text strong style={{ color: 'green' }}>
                          {formatMonto(vehiculo.precio_venta)}
                        </Text>
                      </div>
                    )}
                  </Space>
                </Col>
              </Row>
            </div>
          }
        >
          <div className="vehiculo-detalle" style={{ padding: '8px 0' }}>
            <Card size="small" style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Detalles del vehículo</Text>
                <Row gutter={[16, 8]}>
                  <Col xs={24} sm={12} md={8}>
                    <div>
                      <Text type="secondary" style={{ fontSize: '0.85em' }}>Fecha de ingreso</Text>
                      <div style={{ marginTop: 2 }}>{toDateStr(vehiculo.fecha_ingreso)}</div>
                    </div>
                  </Col>
                  {!isNullish(vehiculo.fecha_venta) && (
                    <Col xs={24} sm={12} md={8}>
                      <div>
                        <Text type="secondary" style={{ fontSize: '0.85em' }}>Fecha de venta</Text>
                        <div style={{ marginTop: 2 }}>{toDateStr(vehiculo.fecha_venta)}</div>
                      </div>
                    </Col>
                  )}
                  <Col xs={12} sm={6} md={4}>
                    <div>
                      <Text type="secondary" style={{ fontSize: '0.85em' }}>Costo grúa</Text>
                      <div style={{ marginTop: 2 }}>{formatMonto(vehiculo.costo_grua)}</div>
                    </div>
                  </Col>
                  <Col xs={12} sm={6} md={4}>
                    <div>
                      <Text type="secondary" style={{ fontSize: '0.85em' }}>Comisiones</Text>
                      <div style={{ marginTop: 2 }}>{formatMonto(vehiculo.comisiones)}</div>
                    </div>
                  </Col>
                  <Col xs={12} sm={6} md={4}>
                    <div>
                      <Text type="secondary" style={{ fontSize: '0.85em' }}>Precio de compra</Text>
                      <div style={{ marginTop: 2 }}>{formatMonto(vehiculo.precio_compra)}</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div>
                      <Text type="secondary" style={{ fontSize: '0.85em', display: 'block', marginBottom: 2 }}>Monto recuperado</Text>
                      <div style={{ color: vehiculo.costo_recuperado < 0 ? '#722ed1' : '#52c41a', marginBottom: 4 }}>{formatMonto(vehiculo.costo_recuperado)}</div>
                      {vehiculo.inversion_total > 0 && (() => {
                        const porcentaje = ((vehiculo.costo_recuperado || 0) / vehiculo.inversion_total) * 100;
                        const porcentajeAbsoluto = Math.abs(porcentaje);
                        const porcentajeBase = Math.min(100, porcentajeAbsoluto);
                        const porcentajeExcedente = Math.max(0, porcentajeAbsoluto - 100);
                        const esNegativo = porcentaje < 0;

                        return (
                          <div>
                            <div style={{
                              width: '100%',
                              backgroundColor: '#f0f0f0',
                              borderRadius: 4,
                              marginTop: 4,
                              height: 6,
                              position: 'relative',
                              overflow: 'hidden'
                            }}>
                              {/* Barra base (hasta 100%) */}
                              {porcentajeAbsoluto > 0 && (
                                <div
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: esNegativo ? '#722ed1' : '#52c41a',
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    transition: 'all 0.3s',
                                    maxWidth: `${Math.min(100, porcentajeBase)}%`
                                  }}
                                />
                              )}

                              {/* Barra de excedente (más del 100%) */}
                              {porcentajeExcedente > 0 && (
                                <div
                                  style={{
                                    width: `${porcentajeExcedente}%`,
                                    height: '100%',
                                    backgroundColor: esNegativo ? '#722ed1' : '#faad14', // Dorado para excedente positivo, morado para excedente negativo
                                    position: 'absolute',
                                    right: 0,
                                    top: 0,
                                    transition: 'all 0.3s',
                                    borderTopRightRadius: 4,
                                    borderBottomRightRadius: 4
                                  }}
                                />
                              )}
                            </div>

                            <div style={{
                              fontSize: 12,
                              color: '#666',
                              marginTop: 4,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span>
                                {porcentaje.toLocaleString('es-CR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}% de la inversión
                              </span>
                              {porcentajeExcedente > 0 && (
                                <span style={{
                                  color: '#d48806', // Color de texto para el excedente
                                  fontWeight: 500,
                                  marginLeft: 8,
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}>
                                  <span style={{
                                    display: 'inline-block',
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: '#faad14',
                                    marginRight: 4
                                  }} />
                                  +{porcentajeExcedente.toFixed(2)}% de ganancia
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </Col>
                  <Col xs={12} sm={6} md={4}>
                    <div>
                      <Text type="secondary" style={{ fontSize: '0.85em' }}>Monto pendiente</Text>
                      <div style={{
                        marginTop: 2, color:
                          vehiculo.costo_pendiente > 0 ? '#f5222d' : // Rojo para deuda
                            vehiculo.costo_pendiente < 0 ? '#d48806' : // Dorado para ganancia (mismo que el texto de ganancia)
                              '#52c41a' // Verde para saldo cero
                      }}>
                        {vehiculo.costo_pendiente < 0 ? '+' : ''}{formatMonto(Math.abs(vehiculo.costo_pendiente))}
                      </div>
                    </div>
                  </Col>
                </Row>
                {!isNullish(vehiculo.notas) && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #f0f0f0' }}>
                    <Text type="secondary" style={{ fontSize: '0.85em' }}>Notas</Text>
                    <div
                      style={{
                        marginTop: 4,
                        whiteSpace: 'pre-line',
                        lineHeight: 1.6,
                        padding: '4px 0'
                      }}
                    >
                      {vehiculo.notas}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card size="small">
              <Tabs defaultActiveKey="1">
                <TabPane tab={<span><DollarOutlined /> Transacciones</span>} key="1">
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                    <Text strong>Historial de transacciones</Text>
                    <Tag style={{ marginLeft: 8, borderRadius: 10 }}>
                      {tieneTransacciones ? transacciones[vehiculo.id].length : '0'}
                    </Tag>
                  </div>

                  {cargandoTransacciones ? (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <Spin size="small" />
                      <div style={{ marginTop: 8 }}>Cargando transacciones...</div>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <Table
                        size="small"
                        columns={columnasTransacciones}
                        dataSource={tieneTransacciones ? transacciones[vehiculo.id] : []}
                        rowKey={(record) => record.id || `${record.fecha}-${record.monto}`}
                        pagination={tieneTransacciones && transacciones[vehiculo.id].length > 10 ? {
                          pageSize: 10,
                          size: 'small',
                          showSizeChanger: false
                        } : false}
                        bordered
                        style={{ minWidth: '600px' }}
                        locale={{
                          emptyText: (
                            <Empty
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              description={
                                <span>
                                  <InfoCircleOutlined style={{ marginRight: 4 }} />
                                  No hay transacciones registradas
                                </span>
                              }
                            />
                          )
                        }}
                      />
                    </div>
                  )}
                </TabPane>

                <TabPane tab={<span><ToolOutlined /> Repuestos</span>} key="2">
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                    <Text strong>Repuestos extraídos de este vehículo</Text>
                    <Tag style={{ marginLeft: 8, borderRadius: 10 }}>
                      {tieneRepuestos ? repuestos[vehiculo.id].length : '0'}
                    </Tag>
                  </div>

                  {cargandoRepuestos ? (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <Spin size="small" />
                      <div style={{ marginTop: 8 }}>Cargando repuestos...</div>
                    </div>
                  ) : tieneRepuestos ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="ant-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>Código</th>
                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>Parte</th>
                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>Descripción</th>
                            <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #f0f0f0' }}>Precio Venta</th>
                            <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>Estado</th>
                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>Ubicación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {repuestos[vehiculo.id].map((repuesto) => (
                            <tr key={repuesto.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                              <td style={{ padding: '8px' }}>
                                <Text strong>{repuesto.codigoRepuesto || 'Sin código'}</Text>
                              </td>
                              <td style={{ padding: '8px' }}>
                                <Tag color="blue">{repuesto.parteVehiculo || 'N/A'}</Tag>
                              </td>
                              <td style={{ padding: '8px' }}>{repuesto.descripcion || 'Sin descripción'}</td>
                              <td style={{ padding: '8px', textAlign: 'right' }}>
                                {formatMonto(repuesto.precioVenta || 0)}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                {getEstadoRepuestoTag(repuesto.estado)}
                              </td>
                              <td style={{ padding: '8px', fontSize: '0.85em' }}>
                                {repuesto.codigoUbicacion || 'Sin ubicación'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px' }}>
                      <ToolOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '16px' }} />
                      <p>No hay repuestos registrados para este vehículo.</p>
                    </div>
                  )}
                </TabPane>
              </Tabs>
            </Card>
          </div>
        </Panel>
      </Collapse>
    );
  };

  // Render a single vehicle card
  const renderVehiculoCard = (vehiculo, generacion, modelo, marca) => {
    const esVehiculoDestacado = vehiculoMatchId === vehiculo.id;

    return (
      <div
        key={`veh-${vehiculo.id}`}
        ref={el => (vehiculoRefs.current[vehiculo.id] = el)}
        style={{
          marginBottom: 16,
          transition: 'all 0.3s ease',
          borderLeft: esVehiculoDestacado ? '4px solid #1890ff' : '4px solid transparent',
          paddingLeft: 8,
          backgroundColor: esVehiculoDestacado ? '#f0f9ff' : 'transparent',
          borderRadius: 4
        }}
      >
        {renderVehiculo(vehiculo)}
      </div>
    );
  };

  // Render a generation with its vehicles (MOSTRAR solamente, sin cálculos)
  const renderGeneracion = (generacion, modelo, marca) => {
    const isExpanded = expandedGensByModelo[modelo.id]?.includes(generacion.id);

    const totalInversion = generacion.total_inversion || 0;
    const totalVentas = generacion.total_ingresos || 0;
    const totalEgresos = generacion.total_egresos || 0;
    const balanceNeto = generacion.balance_neto || 0;

    const balanceColor = balanceNeto > 0 ? '#52c41a' : balanceNeto < 0 ? '#f5222d' : 'inherit';

    const genName = generacion.nombre || 'Sin nombre';
    const years = `${generacion.anio_inicio || '?'}-${isNullish(generacion.anio_fin) ? 'Actual' : generacion.anio_fin}`;
    const descripcion = generacion.descripcion || '';

    return (
      <div key={`gen-${generacion.id}`} style={{ marginBottom: 16 }}>
        <div
          onClick={() => toggleGeneration(modelo.id, generacion.id)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '12px 16px',
            background: '#f9f9f9',
            borderRadius: 4,
            cursor: 'pointer',
            marginBottom: 8,
            borderLeft: '3px solid #1890ff',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: '1.05em' }}>{genName}</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>({years})</Text>
            </div>
            <div style={{ textAlign: 'right', marginRight: 24 }}>
              <div style={{ fontSize: '0.85em', color: '#666' }}>Vehículos</div>
              <Text strong>{generacion.vehiculos?.length || 0}</Text>
            </div>
            {isExpanded ? <UpOutlined style={{ marginLeft: 8 }} /> : <DownOutlined style={{ marginLeft: 8 }} />}
          </div>

          {/* ✅ Descripción de la generación (solo mostrar, viene del API) */}
          {descripcion && (
            <div style={{ marginTop: 2 }}>
              <Text type="secondary" style={{ fontSize: '0.9em' }}>{descripcion}</Text>
            </div>
          )}

          {/* Resumen financiero: SOLO mostrar lo del endpoint */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px dashed #e8e8e8'
          }}>
            <div style={{ textAlign: 'center', minWidth: '100px' }}>
              <div style={{ fontSize: '0.8em', color: '#666' }}>Inversión</div>
              <div style={{ fontWeight: 500 }}>{formatMonto(totalInversion)}</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: '100px' }}>
              <div style={{ fontSize: '0.8em', color: '#666' }}>Ingresos</div>
              <div style={{ color: '#52c41a', fontWeight: 500 }}>{formatMonto(totalVentas)}</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: '100px' }}>
              <div style={{ fontSize: '0.8em', color: '#666' }}>Egresos</div>
              <div style={{ color: '#f5222d', fontWeight: 500 }}>{formatMonto(totalEgresos)}</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: '100px' }}>
              <div style={{ fontSize: '0.8em', color: '#666' }}>Balance Neto</div>
              <div style={{ color: balanceColor, fontWeight: 700 }}>{formatMonto(balanceNeto)}</div>
            </div>
          </div>
        </div>

        {isExpanded && generacion.vehiculos?.length > 0 && (
          <div style={{ marginLeft: 16 }}>
            {generacion.vehiculos.map(vehiculo =>
              renderVehiculoCard(vehiculo, generacion, modelo, marca)
            )}
          </div>
        )}
      </div>
    );
  };

  // Render a model with its generations
  const renderModelo = (modelo, marca) => {
    const isExpanded = expandedModelsByMarca[marca.id]?.includes(modelo.id);

    return (
      <div key={`mod-${modelo.id}`} style={{ marginBottom: 16 }}>
        <div
          onClick={() => toggleModel(marca.id, modelo.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            background: '#f0f0f0',
            borderRadius: 4,
            cursor: 'pointer',
            marginBottom: 8
          }}
        >
          <div style={{ flex: 1 }}>
            <Text strong>{modelo.nombre || 'Sin modelo'}</Text>
          </div>
          <div>
            <Text type="secondary">
              {modelo.generaciones?.length || 0} generación{modelo.generaciones?.length !== 1 ? 'es' : ''}
            </Text>
            {isExpanded ? <UpOutlined style={{ marginLeft: 8 }} /> : <DownOutlined style={{ marginLeft: 8 }} />}
          </div>
        </div>

        {isExpanded && modelo.generaciones?.length > 0 && (
          <div style={{ marginLeft: 16 }}>
            {modelo.generaciones.map(generacion =>
              renderGeneracion(generacion, modelo, marca)
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading || loadingTipos || !tiposTransaccionesCargados) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '300px', padding: '40px 20px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', fontSize: '16px', color: '#666' }}>
          {loading ? 'Cargando vehículos...' :
            loadingTipos ? 'Cargando tipos de transacciones...' :
              'Inicializando...'}
        </div>
      </div>
    );
  }

  return (
    <div className="vehiculos-jerarquicos">
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h1>Vehículos</h1>
            <Text type="secondary">Vista jerárquica de vehículos agrupados por marca, modelo y generación</Text>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input.Search
              placeholder="Buscar por marca, modelo, generación o código de vehículo..."
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
              style={{ width: 300 }}
              onChange={(e) => handleSearch(e.target.value)}
              value={searchQuery}
            />
          </div>
        </div>


      </div>

      {filteredMarcas.length > 0 ? (
        <Collapse
          activeKey={activeBrandKeys}
          onChange={(keys) => setActiveBrandKeys(keys)}
          expandIcon={({ isActive }) => isActive ? <UpOutlined /> : <DownOutlined />}
          style={{ background: 'transparent', border: 'none' }}
          className="marcas-collapse"
        >
          {filteredMarcas.map((marca) => (
            <Panel
              key={`marca-${marca.id}`}
              header={
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <Text strong>{marca.nombre || 'Sin marca'}</Text>
                  <div>
                    <Text type="secondary" style={{ marginRight: 24 }}>
                      {marca.modelos?.length || 0} modelo{marca.modelos?.length !== 1 ? 's' : ''}
                    </Text>
                  </div>
                </div>
              }
              style={{
                background: '#fff',
                marginBottom: 16,
                borderRadius: 4,
                border: '1px solid #f0f0f0',
                overflow: 'hidden'
              }}
            >
              {marca.modelos?.length > 0 ? (
                <div style={{ marginLeft: 8 }}>
                  {marca.modelos.map(modelo => renderModelo(modelo, marca))}
                </div>
              ) : (
                <Empty
                  description="No hay modelos para esta marca"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ margin: '16px 0' }}
                />
              )}
            </Panel>
          ))}
        </Collapse>
      ) : (
        <Card>
          <Empty
            description={
              <span>
                <InfoCircleOutlined style={{ marginRight: 4 }} />
                No se encontraron vehículos que coincidan con la búsqueda
              </span>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      )}
    </div>
  );
};

export default VehiculosJerarquicos;