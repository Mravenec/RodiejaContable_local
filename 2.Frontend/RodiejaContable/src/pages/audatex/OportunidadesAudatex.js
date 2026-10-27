import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Card, Table, Button, DatePicker, Input, Space, Typography,
  message, Tag, Alert,
  Tabs, Descriptions, Row, Col, Select, Modal, Divider
} from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
  ReloadOutlined,
  FilterOutlined,
  LoadingOutlined,
  UpOutlined,
  DownOutlined,
  UserOutlined,
  CheckCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { audatexService } from '../../api';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx-js-style';
import { useGeo } from '../../hooks/useGeo';
import { useAuth } from '../../context/AuthContext';
import usersService from '../../api/users';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const getDetalleJson = (row) => {
  if (row?._parsedDetalle) return row._parsedDetalle;
  let datos = {};
  try {
    if (row?.detalleJson) {
      datos = typeof row.detalleJson === 'string' ? JSON.parse(row.detalleJson) : row.detalleJson;
    } else if (row?.detalle_json) {
      datos = typeof row.detalle_json === 'string' ? JSON.parse(row.detalle_json) : row.detalle_json;
    } else if (row?.datosCotizacion) {
      datos = typeof row.datosCotizacion === 'string' ? JSON.parse(row.datosCotizacion) : row.datosCotizacion;
    }
  } catch (e) {}
  if (row) row._parsedDetalle = datos || {};
  return datos || {};
};

const getSafeString = (val) => (val && val !== 'null' && val !== '-' ? val.trim() : '');

const getMarcaSegura = (row) => {
  let m = getSafeString(row.marca) || getSafeString(row.armadora);
  if (m) return m;
  if (row.datosCotizacion) return row.datosCotizacion['Marca'] || row.datosCotizacion['Armadora'] || 'Desc.';
  return 'Desc.';
};

const getModeloSeguro = (row) => {
  let m = getSafeString(row.modelo);
  if (m) return m;
  if (row.datosCotizacion) return row.datosCotizacion['Modelo'] || row.datosCotizacion['Descripción'] || row.datosCotizacion['Descripcion'] || '-';
  return '-';
};

const getAnioSeguro = (row) => {
  let a = getSafeString(row.anio);
  if (a) return a;
  if (row.datosCotizacion) return row.datosCotizacion['Año Modelo'] || row.datosCotizacion['Año Fabricación'] || row.datosCotizacion['Ano Modelo'] || '-';
  return '-';
};

const getProvinciaSegura = (row) => {
  if (row.datosCotizacion) return getSafeString(row.datosCotizacion['Estado']) || getSafeString(row.datosCotizacion['Provincia']) || '-';
  return '-';
};

const getCantonSeguro = (row) => {
  let c = getSafeString(row.ciudad);
  if (c) return c;
  if (row.datosCotizacion) return getSafeString(row.datosCotizacion['Ciudad']) || getSafeString(row.datosCotizacion['Cantón']) || getSafeString(row.datosCotizacion['Canton']) || '-';
  return '-';
};

const getDireccionSegura = (row) => {
  let d = getSafeString(row.colonia);
  if (d) return d;
  if (row.datosCotizacion) return getSafeString(row.datosCotizacion['Colonia']) || getSafeString(row.datosCotizacion['Dirección']) || getSafeString(row.datosCotizacion['Direccion']) || '-';
  return '-';
};


const parseFechaCotizacion = (dateStr) => {
  if (!dateStr) return 0;
  if (typeof dateStr === 'string' && dateStr.includes('/')) {
    const [datePart, timePart] = dateStr.split(' ');
    if (datePart) {
      const parts = datePart.split('/');
      if (parts.length === 3) {
        const y = parseInt(parts[2], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[0], 10);
        let h = 0, min = 0;
        if (timePart) {
          const tParts = timePart.split(':');
          h = parseInt(tParts[0], 10) || 0;
          min = parseInt(tParts[1], 10) || 0;
        }
        return new Date(y, m, d, h, min).getTime();
      }
    }
  }
  const d = dayjs(dateStr);
  return d.isValid() ? d.isValid() ? d.valueOf() : 0 : 0;
};

const parsearFechaHora = (record) => {
  const rawFecha = record?.fechaCotizacion || record?.fecha || '';
  let parsedDayjs = null;

  if (rawFecha && rawFecha.includes('/')) {
    const parts = rawFecha.split(/[\s/:]+/);
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      const hour = parts[3] ? parseInt(parts[3], 10) : 0;
      const min = parts[4] ? parseInt(parts[4], 10) : 0;
      parsedDayjs = dayjs(new Date(year, month, day, hour, min));
    }
  } else if (rawFecha) {
    parsedDayjs = dayjs(rawFecha);
  } else if (record?.creado_en || record?.fechaCreacion) {
    parsedDayjs = dayjs(record.creado_en || record.fechaCreacion);
  }

  const isValid = parsedDayjs && parsedDayjs.isValid();
  const horaTexto = isValid ? parsedDayjs.format('HH:mm') : (record?.hora || '--:--');
  const fechaTexto = isValid ? parsedDayjs.format('DD/MM/YYYY') : (rawFecha || '-');

  return {
    dayjsObj: isValid ? parsedDayjs : null,
    fechaTexto,
    horaTexto,
    horaNum: isValid ? parsedDayjs.hour() : -1,
    minutoNum: isValid ? parsedDayjs.minute() : 0
  };
};

const normalizeString = (str) => (str || '').toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const HighlightText = ({ text, highlight }) => {
  if (!highlight || !text) return <>{text}</>;
  const strText = text.toString();
  const normText = normalizeString(strText);
  const normHighlight = normalizeString(highlight.toString());
  if (!normHighlight) return <>{text}</>;

  const parts = [];
  let startIndex = 0;
  let index = normText.indexOf(normHighlight, startIndex);

  while (index !== -1) {
    parts.push(strText.slice(startIndex, index));
    parts.push(
      <mark key={index} style={{ backgroundColor: '#fef08a', padding: '0 2px', borderRadius: '2px', color: '#854d0e', fontWeight: 600 }}>
        {strText.slice(index, index + highlight.length)}
      </mark>
    );
    startIndex = index + highlight.length;
    index = normText.indexOf(normHighlight, startIndex);
  }
  parts.push(strText.slice(startIndex));

  return <>{parts}</>;
};

const defaultFiltros = {
  cotizacionId: '',
  numeroPedido: '',
  filtroEstado: 'todos',
  marca: '',
  modelo: '',
  anio: '',
  repuesto: '',
  armadora: '',
  provincia: null,
  canton: null,
  desde: dayjs().subtract(30, 'day'),
  hasta: dayjs(), //today
  minPendientes: 1,
  empleado: null,
};

/** Misma oportunidad por wan o cotizacionId (dedup merge). */
const sameOportunidad = (a, b) => {
  if (!a || !b) return false;
  if (a.wan && b.wan) return a.wan === b.wan;
  if (a.cotizacionId && b.cotizacionId) return a.cotizacionId === b.cotizacionId;
  return false;
};

const findOportunidadIndex = (list, item) => list.findIndex((o) => sameOportunidad(o, item));

const buildSyncParams = (filters) => {
  const params = {};
  if (filters.armadora) params.armadora = filters.armadora;
  if (filters.desde) params.desde = filters.desde.format('YYYY-MM-DD');
  if (filters.hasta) params.hasta = filters.hasta.format('YYYY-MM-DD');
  if (filters.minPendientes) params.minPendientes = filters.minPendientes;
  return params;
};

const OportunidadesAudatex = () => {
  const [oportunidades, setOportunidades] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [filtros, setFiltros] = useState({ ...defaultFiltros });
  const [appliedFiltros, setAppliedFiltros] = useState({ ...defaultFiltros });
  const [mostrarFiltros, setMostrarFiltros] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);

  // Modal de Detalle y Asignación de Oportunidades (Estilo Pedidos INS sin montos)
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOportunidad, setSelectedOportunidad] = useState(null);
  const [usuarioSeleccionadoId, setUsuarioSeleccionadoId] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const { provincias, cantones, loadingProvincias, loadingCantones, fetchProvincias, fetchCantones } = useGeo();
  const { user } = useAuth();
  const esAdmin = (user?.rol || '').toUpperCase() === 'ADMIN';
  const currentUserId = user?.id || user?.userId || null;
  const currentUserName = user?.nombre || user?.email || 'Mi Usuario';

  const [usuariosData, setUsuariosData] = useState([]);
  const usuariosActivos = useMemo(() => {
    return (usuariosData || []).filter((u) => u.activo !== false);
  }, [usuariosData]);

  const cargarUsuarios = useCallback(async () => {
    try {
      const res = await usersService.getUsers();
      setUsuariosData(res.data || res || []);
    } catch (e) {
      console.warn('Error cargando usuarios en OportunidadesAudatex:', e);
    }
  }, []);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  const [asignacionesOportunidades, setAsignacionesOportunidades] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('oportunidades_ins_asignaciones') || '{}');
    } catch (e) {
      return {};
    }
  });

  const handleMarcarRevisada = useCallback(async (recordOrWan) => {
    const wan = typeof recordOrWan === 'string' ? recordOrWan : recordOrWan?.wan;
    const cotId = typeof recordOrWan === 'object' ? recordOrWan?.cotizacionId : null;
    const key = typeof recordOrWan === 'object' ? recordOrWan?._key : null;
    if (!wan && !cotId && !key) return;

    try {
      if (wan) {
        await audatexService.marcarRevisada(wan);
      }
      setOportunidades((prev) =>
        prev.map((o) =>
          (wan && o.wan === wan) ||
          (cotId && o.cotizacionId === cotId) ||
          (key && o._key === key)
            ? { ...o, estado_interaccion: 'REVISADA' }
            : o
        )
      );
    } catch (err) {
      console.warn('Error al marcar revisada:', err);
    }
  }, []);

  const getRowClassName = useCallback((record) => {
    // Si ya se abrió / revisó, se muestra como revisada (gris) sin importar si tenía pedido o no
    if (record.estado_interaccion === 'REVISADA') return 'row-revisada';

    // Si ya cotizó (tiene número de pedido) y aún no ha sido revisada, es de color verde
    if (record.numeroPedido || record.pedidoId) return 'row-cotizada';

    const createdAt = record.creado_en || record.fechaCotizacion;
    if (createdAt) {
      let opDate = null;
      if (typeof createdAt === 'string' && createdAt.includes('/')) {
        opDate = parseFechaCotizacion(createdAt);
      } else {
        opDate = dayjs(createdAt).valueOf();
      }
      if (opDate) {
        const diffMins = (Date.now() - opDate) / (1000 * 60);
        if (diffMins > 30) return 'row-pendiente';
      }
    }
    return '';
  }, []);

  const handleAbrirDetalle = useCallback((record) => {
    if (record.estado_interaccion !== 'REVISADA') {
      handleMarcarRevisada(record);
    }

    setSelectedOportunidad(record);
    const key = record.cotizacionId || record.wan || record._key;
    const asignacion = asignacionesOportunidades[key];

    const asigId = asignacion?.usuarioId || asignacion?.userId || asignacion?.empleadoId || record.usuarioId || record.userId || record.empleadoId || null;

    if (esAdmin) {
      setUsuarioSeleccionadoId(asigId ? Number(asigId) : null);
    } else {
      // Si no es admin, si ya tiene asignado a alguien se mantiene; si está libre, se preselecciona su propio usuario
      setUsuarioSeleccionadoId(asigId ? Number(asigId) : (currentUserId ? Number(currentUserId) : null));
    }

    setModalVisible(true);
  }, [asignacionesOportunidades, handleMarcarRevisada, esAdmin, currentUserId]);

  const handleGuardarAsignacion = useCallback(async () => {
    if (!selectedOportunidad) return;

    // Determinar el ID del usuario a asignar
    const idToAssign = esAdmin ? usuarioSeleccionadoId : (usuarioSeleccionadoId || currentUserId);
    if (!idToAssign) {
      message.warning('Por favor selecciona el usuario responsable de la oportunidad');
      return;
    }

    // Si NO es admin y la oportunidad ya estaba asignada a otro usuario, denegar
    const key = selectedOportunidad.cotizacionId || selectedOportunidad.wan || selectedOportunidad._key;
    const asignacionActual = asignacionesOportunidades[key];
    const actualAsigId = asignacionActual?.usuarioId || asignacionActual?.userId || asignacionActual?.empleadoId || selectedOportunidad.usuarioId || selectedOportunidad.userId || selectedOportunidad.empleadoId;
    if (!esAdmin && actualAsigId && Number(actualAsigId) !== Number(currentUserId)) {
      message.error('No tienes permisos para modificar una oportunidad asignada a otro usuario');
      return;
    }

    try {
      setProcesando(true);
      const uFound = usuariosActivos.find((u) => Number(u.id) === Number(idToAssign));
      const uNombre = uFound
        ? (uFound.nombre || uFound.email)
        : (Number(idToAssign) === Number(currentUserId) ? currentUserName : `Usuario #${idToAssign}`);

      // 1. Persistir asignación en backend para audatex_oportunidades_sync (alimenta el worker de 5 min) y pedidos
      try {
        if (audatexService.asignarUsuarioAOportunidad) {
          await audatexService.asignarUsuarioAOportunidad({
            wan: selectedOportunidad.wan,
            cotizacionId: selectedOportunidad.cotizacionId,
            usuarioId: idToAssign,
            userId: idToAssign,
            pedidoId: selectedOportunidad.pedidoId || null
          });
        } else if (selectedOportunidad.pedidoId) {
          const fnAsignar = audatexService.asignarUsuario || audatexService.asignarEmpleado;
          if (fnAsignar) {
            await fnAsignar(selectedOportunidad.pedidoId, {
              usuarioId: idToAssign,
              userId: idToAssign
            });
          }
        }
      } catch (errApi) {
        console.warn('Backend sincronizar usuario error:', errApi);
      }

      // 2. Persistir en localStorage tanto para pedidos como para oportunidades
      try {
        const storedOps = JSON.parse(localStorage.getItem('oportunidades_ins_asignaciones') || '{}');
        storedOps[key] = {
          usuarioId: idToAssign,
          userId: idToAssign,
          empleadoId: idToAssign,
          usuarioNombre: uNombre,
          empleadoNombre: uNombre,
          cotizacionId: selectedOportunidad.cotizacionId,
          wan: selectedOportunidad.wan,
          vehiculo: `${getMarcaSegura(selectedOportunidad)} ${getModeloSeguro(selectedOportunidad)} ${getAnioSeguro(selectedOportunidad)}`.trim(),
          taller: selectedOportunidad.taller || '',
          aseguradora: selectedOportunidad.aseguradora || 'INS',
          pendientes: selectedOportunidad.pendientes || 0,
          fechaCotizacion: selectedOportunidad.fechaCotizacion || '',
          totalPedido: Number(selectedOportunidad.totalPedido || selectedOportunidad.total_pedido || 0),
          comisionCalculada: Number(selectedOportunidad.comisionCalculada || selectedOportunidad.comision_calculada || 0),
          porcentajeComision: Number(selectedOportunidad.porcentajeComision || 3),
          asignadoEn: new Date().toISOString()
        };
        localStorage.setItem('oportunidades_ins_asignaciones', JSON.stringify(storedOps));
        setAsignacionesOportunidades(storedOps);
      } catch (e) {
        console.warn('Error guardando en localStorage:', e);
      }

      // Actualizar objeto en memoria
      selectedOportunidad.usuarioId = idToAssign;
      selectedOportunidad.userId = idToAssign;
      selectedOportunidad.empleadoId = idToAssign;
      selectedOportunidad.usuarioNombre = uNombre;
      selectedOportunidad.empleadoNombre = uNombre;

      message.success(`¡Usuario ${uNombre} asignado a la oportunidad #${selectedOportunidad.cotizacionId || key} exitosamente!`);
      setModalVisible(false);
    } catch (err) {
      console.error('Error al guardar asignación:', err);
      message.error('Error al procesar la asignación');
    } finally {
      setProcesando(false);
    }
  }, [selectedOportunidad, usuarioSeleccionadoId, currentUserId, currentUserName, esAdmin, usuariosActivos, asignacionesOportunidades]);

  useEffect(() => {
    fetchProvincias();
  }, [fetchProvincias]);

  useEffect(() => {
    if (filtros.provincia) {
      fetchCantones(filtros.provincia);
    }
  }, [filtros.provincia, fetchCantones]);

  const abortRef = useRef(null);
  const startedRef = useRef(false); // evita doble-mount de React StrictMode en dev
  const tableRef = useRef(null);
  const pendingQueueRef = useRef([]);
  const drainActiveRef = useRef(false);
  const keyCounterRef = useRef(0);
  const streamReaderDoneRef = useRef(false);
  const syncTimerRef = useRef(null);

  const INTERVALO_FILA_MS = 80;

  const detenerCola = useCallback(() => {
    pendingQueueRef.current = [];
    drainActiveRef.current = false;
    streamReaderDoneRef.current = false;
    keyCounterRef.current = 0;
  }, []);

  const finalizarStreamSiColaVacia = useCallback(() => {
    if (pendingQueueRef.current.length === 0 && streamReaderDoneRef.current) {
      setStreaming(false);
    }
  }, []);

  const drenarSiguiente = useCallback(function tick() {
    const item = pendingQueueRef.current.shift();
    if (!item) {
      drainActiveRef.current = false;
      finalizarStreamSiColaVacia();
      return;
    }
    if (item.cerrada) {
      setOportunidades((prev) => prev.filter((o) => !sameOportunidad(o, item)));
    } else {
      setOportunidades((prev) => {
        const idx = findOportunidadIndex(prev, item);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...item, _key: updated[idx]._key || keyCounterRef.current++ };
          return updated;
        }
        return [...prev, { ...item, _key: keyCounterRef.current++ }];
      });
    }
    setTimeout(tick, INTERVALO_FILA_MS);
  }, [finalizarStreamSiColaVacia]);

  const encolarOportunidad = useCallback((item) => {
    if (!item?.cotizacionId && !item?.wan) return;
    pendingQueueRef.current.push(item);
    if (!drainActiveRef.current) {
      drainActiveRef.current = true;
      drenarSiguiente();
    }
  }, [drenarSiguiente]);

  const aplicarDatosBd = useCallback((bdOportunidades) => {
    console.log('Aplicando BD', bdOportunidades.length, 'items. Primer item:', bdOportunidades[0]);
    setOportunidades((prev) =>
      bdOportunidades.map((item) => {
        const idx = findOportunidadIndex(prev, item);
        const _key = idx >= 0 ? prev[idx]._key : keyCounterRef.current++;
        return { ...item, _key };
      })
    );
  }, []);

  const iniciarIndicadorSync = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    setSyncing(true);
    syncTimerRef.current = setTimeout(() => setSyncing(false), 120000);
  }, []);

  // ── Sincronización incremental (BD instantánea + deltas SSE) ─────────────────────────
  const cargarOportunidadesStream = useCallback(async (currentFilters = appliedFiltros, options = {}) => {
    const { resetPage = false, triggerSync = false } = options;
    if (abortRef.current) abortRef.current.abort();
    detenerCola();
    const controller = new AbortController();
    abortRef.current = controller;

    // NO vaciar la tabla — la BD previa sigue visible hasta que llegue el snapshot
    setStreaming(true);
    if (resetPage) setCurrentPage(1);
    streamReaderDoneRef.current = false;

    const params = new URLSearchParams(buildSyncParams(currentFilters));
    const token = localStorage.getItem('token');

    // 1. Carga instantánea desde BD (sin setOportunidades([]))
    try {
      const getResponse = await fetch(`http://localhost:8080/api/audatex/oportunidades/sync?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (getResponse.ok) {
        const data = await getResponse.json();
        aplicarDatosBd(data.oportunidades || []);
      }
    } catch (e) {
      console.warn('Fallo en GET inicial de sync', e);
    }

    // 2. Sync incremental 30 días en background (Solo si se solicita explícitamente)
    if (triggerSync) {
      try {
        await audatexService.syncIncremental();
        iniciarIndicadorSync();
      } catch (e) {
        console.warn('Fallo al iniciar sync incremental', e);
      }
    }

    setStreaming(false);

    // 3. SSE para deltas (UPSERT / CERRADA) — en background, no bloquea la UI
    const url = `http://localhost:8080/api/audatex/oportunidades/sync/stream`;

    (async () => {
      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let eventName = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              const raw = line.slice(5).trim();
              try {
                const parsed = JSON.parse(raw);
                if (eventName === 'delta' || eventName === 'oportunidad') {
                  encolarOportunidad(parsed);
                }
                eventName = '';
              } catch (_) { /* ignore malformed SSE chunk */ }
            }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error SSE sync deltas:', err);
        }
      } finally {
        streamReaderDoneRef.current = true;
        finalizarStreamSiColaVacia();
        if (abortRef.current === controller) abortRef.current = null;
      }
    })();
  }, [appliedFiltros, detenerCola, encolarOportunidad, finalizarStreamSiColaVacia, aplicarDatosBd, iniciarIndicadorSync]);

  // Detener stream en curso
  const handleDetener = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      detenerCola();
      setStreaming(false);
      message.info('Carga detenida manualmente');
    }
  };

  // ─ Helpers de estilo xlsx-js-style ─────────────────────────────────────
  const hdrStyle = (bgHex) => ({
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    fill: { fgColor: { rgb: bgHex } },
    border: {
      top: { style: 'thin', color: { rgb: 'CCCCCC' } },
      bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
      left: { style: 'thin', color: { rgb: 'CCCCCC' } },
      right: { style: 'thin', color: { rgb: 'CCCCCC' } },
    },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  });




  // Estilo de bloque por cotizacionId — paleta de 4 colores alternados
  const BLOCK_PALETTES = ['DBEAFE', 'DCFCE7', 'FEF9C3', 'F3E8FF']; // azul/verde/amarillo/lila
  const blockRowStyle = (blockIdx) => ({
    fill: { fgColor: { rgb: BLOCK_PALETTES[blockIdx % BLOCK_PALETTES.length] } },
    border: {
      top: { style: 'hair', color: { rgb: 'C7D2DB' } },
      bottom: { style: 'hair', color: { rgb: 'C7D2DB' } },
      left: { style: 'thin', color: { rgb: 'A3B4C6' } },
      right: { style: 'thin', color: { rgb: 'A3B4C6' } },
    },
    alignment: { vertical: 'center' },
  });

  // Aplica colores de bloque a la hoja de repuestos.
  // blockMap: array de {blockIdx} con un elemento por fila de datos (longitud = totalRows)
  const applyBlockStyles = (ws, headers, bgHex, blockMap) => {
    // Cabecera
    headers.forEach((_, ci) => {
      const addr = XLSX.utils.encode_cell({ r: 0, c: ci });
      if (ws[addr]) ws[addr].s = hdrStyle(bgHex);
    });
    // Filas de datos
    blockMap.forEach((blockIdx, di) => {
      const ri = di + 1; // fila 0 = cabecera
      headers.forEach((_, ci) => {
        const addr = XLSX.utils.encode_cell({ r: ri, c: ci });
        if (ws[addr]) ws[addr].s = blockRowStyle(blockIdx);
      });
    });
    ws['!rows'] = [{ hpt: 22 }];
  };

  // ── Exportar Excel ────────────────────────────────────────────────────────
  // ── Exportar Excel — 2 hojas: Oportunidades + Repuestos ─────────────────
  const handleExportar = () => {
    if (!oportunidadesFiltradas.length) {
      message.warning('No hay oportunidades cargadas para exportar');
      return;
    }

    const wb = XLSX.utils.book_new();

    const mRepuesto = normalizeString(appliedFiltros.repuesto);

    // ── Hoja 1: Oportunidades — azul corporativo ──────────────────────────
    const oportHeaders = ['Cotizacion ID', 'Marca', 'Modelo', 'Año', 'Provincia', 'Canton', 'Direccion', 'Taller', 'Poliza', 'Fecha', 'Pendientes', 'Total Repuestos'];
    const oportData = oportunidadesFiltradas.map(({ _key, repuestos, ...row }) => {
      const repuestosFiltrados = !mRepuesto ? (repuestos || []) : (repuestos || []).filter(r =>
        normalizeString(r['Grupo Pieza']).includes(mRepuesto) ||
        normalizeString(r['PartNumber']).includes(mRepuesto) ||
        normalizeString(r['Part Serial Number']).includes(mRepuesto) ||
        normalizeString(r['Descripcion Pieza']).includes(mRepuesto)
      );

      const vMarca = getMarcaSegura(row);
      const vModelo = getModeloSeguro(row);
      const vAnio = getAnioSeguro(row);
      const vProvincia = getProvinciaSegura(row);
      const vCanton = getCantonSeguro(row);
      const vDireccion = getDireccionSegura(row);

      return {
        'Cotizacion ID': row.cotizacionId ?? '',
        'Marca': vMarca,
        'Modelo': vModelo,
        'Año': vAnio,
        'Provincia': vProvincia !== '-' ? vProvincia : '',
        'Canton': vCanton !== '-' ? vCanton : '',
        'Direccion': vDireccion !== '-' ? vDireccion : '',
        'Taller': row.taller ?? '',
        'Poliza': row.poliza ?? '',
        'Fecha': row.fechaCotizacion ?? '',
        'Pendientes': row.pendientes ?? 0,
        'Total Repuestos': repuestosFiltrados.length,
      };
    });
    const wsOport = XLSX.utils.json_to_sheet(oportData, { header: oportHeaders });
    wsOport['!cols'] = [
      { wch: 20 }, { wch: 18 }, { wch: 25 }, { wch: 10 },
      { wch: 20 }, { wch: 20 }, { wch: 30 },
      { wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 15 },
    ];
    applyBlockStyles(wsOport, oportHeaders, '1D4ED8', oportData.map((_, i) => i));
    XLSX.utils.book_append_sheet(wb, wsOport, 'Oportunidades');

    // ── Hoja 2: Repuestos — con grupos desplegables por Cotizacion ID ──────
    const repHeaders = ['Cotizacion ID', 'Taller', '#', 'Grupo Pieza', 'PartNumber', 'Part Serial Number', 'Descripcion Pieza'];
    const repuestosData = [];
    const repBlockMap = [];
    const repRowMeta = [{ hpt: 22 }]; // fila 0 = cabecera

    let blockIdx = -1;
    let lastCotizId = null;

    oportunidadesFiltradas.forEach(({ repuestos, cotizacionId, taller, aseguradora }) => {
      const repuestosFiltrados = !mRepuesto ? (repuestos || []) : (repuestos || []).filter(r =>
        normalizeString(r['Grupo Pieza']).includes(mRepuesto) ||
        normalizeString(r['PartNumber']).includes(mRepuesto) ||
        normalizeString(r['Part Serial Number']).includes(mRepuesto) ||
        normalizeString(r['Descripcion Pieza']).includes(mRepuesto)
      );

      if (repuestosFiltrados.length === 0) return;
      if (cotizacionId !== lastCotizId) { blockIdx++; lastCotizId = cotizacionId; }

      // Fila resumen (siempre visible, muestra el +/-)
      repuestosData.push({
        'Cotizacion ID': `▼ ${cotizacionId ?? ''}`,
        'Taller': taller ?? '',
        '#': `${repuestosFiltrados.length} pza`,
        'Grupo Pieza': '',
        'PartNumber': '',
        'Part Serial Number': '',
        'Descripcion Pieza': '',
      });
      repBlockMap.push({ blockIdx, isSummary: true });
      repRowMeta.push({ hpt: 20 }); // fila resumen, NO grouped

      // Filas de detalle (colapsables)
      repuestosFiltrados.forEach((rep, idx) => {
        repuestosData.push({
          'Cotizacion ID': '',
          'Taller': '',
          '#': idx + 1,
          'Grupo Pieza': rep['Grupo Pieza'] ?? '',
          'PartNumber': rep['PartNumber'] ?? '',
          'Part Serial Number': rep['Part Serial Number'] ?? '',
          'Descripcion Pieza': rep['Descripcion Pieza'] ?? '',
        });
        repBlockMap.push({ blockIdx, isSummary: false });
        repRowMeta.push({ level: 1, hpt: 18, hidden: true }); // colapsado por defecto
      });
    });

    if (repuestosData.length > 0) {
      const wsRep = XLSX.utils.json_to_sheet(repuestosData, { header: repHeaders });
      wsRep['!cols'] = [
        { wch: 24 }, { wch: 30 }, { wch: 8 },
        { wch: 14 }, { wch: 20 }, { wch: 32 }, { wch: 38 },
      ];
      // Grupos arriba del detalle (summaryBelow: false)
      wsRep['!sheetPr'] = { outlinePr: { summaryBelow: 0, summaryRight: 0 } };

      // ── Estilos por fila ─────────────────────────────────────────────────
      // Paleta compartida con hoja Oportunidades
      const PASTEL_LIGHT = ['DBEAFE', 'DCFCE7', 'FEF9C3', 'F3E8FF']; // igual a Oportunidades
      const PASTEL_MEDIUM = ['BFDBFE', 'A7F3D0', 'FDE68A', 'DDD6FE']; // tono medio para resumen
      const summaryStyleLight = (bIdx) => ({
        font: { bold: false, sz: 11, color: { rgb: '1E293B' } },  // texto oscuro
        fill: { fgColor: { rgb: PASTEL_MEDIUM[bIdx % 4] } },
        border: {
          top: { style: 'thin', color: { rgb: '94A3B8' } },
          bottom: { style: 'thin', color: { rgb: '94A3B8' } },
          left: { style: 'thin', color: { rgb: '94A3B8' } },
          right: { style: 'thin', color: { rgb: '94A3B8' } },
        },
        alignment: { vertical: 'center' },
      });
      const detailStyle = (bIdx) => ({
        fill: { fgColor: { rgb: PASTEL_LIGHT[bIdx % 4] } },
        border: {
          top: { style: 'hair', color: { rgb: 'D1D5DB' } },
          bottom: { style: 'hair', color: { rgb: 'D1D5DB' } },
          left: { style: 'hair', color: { rgb: 'CBD5E1' } },
          right: { style: 'hair', color: { rgb: 'CBD5E1' } },
        },
        alignment: { vertical: 'center' },
      });

      // Cabecera de hoja
      repHeaders.forEach((_, ci) => {
        const addr = XLSX.utils.encode_cell({ r: 0, c: ci });
        if (wsRep[addr]) wsRep[addr].s = hdrStyle('065F46');
      });
      // Filas de datos
      repBlockMap.forEach(({ blockIdx: bi, isSummary }, di) => {
        const ri = di + 1;
        repHeaders.forEach((_, ci) => {
          const addr = XLSX.utils.encode_cell({ r: ri, c: ci });
          if (wsRep[addr]) wsRep[addr].s = isSummary ? summaryStyleLight(bi) : detailStyle(bi);
        });
      });

      wsRep['!rows'] = repRowMeta;
      XLSX.utils.book_append_sheet(wb, wsRep, 'Repuestos');
    }

    XLSX.writeFile(wb, `oportunidades_audatex_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`);

    const nota = streaming ? ' (carga aun en curso)' : '';
    message.success(`Excel exportado — ${oportunidadesFiltradas.length} oportunidades, ${repuestosData.length} repuestos${nota}`);
  };

  // ── Refrescar: sync incremental sin vaciar tabla ────────────────────────────
  const handleSincronizar = async () => {
    try {
      const nuevos = { ...filtros };
      setAppliedFiltros(nuevos);
      message.info('Sincronizando con Audatex (30 días)…');
      await cargarOportunidadesStream(nuevos, { resetPage: false, triggerSync: true });
    } catch (err) {
      console.error('Error al sincronizar:', err);
      message.error('Error al iniciar la sincronización');
    }
  };

  const handleFiltrar = () => {
    const nuevos = { ...filtros };
    setAppliedFiltros(nuevos);
    cargarOportunidadesStream(nuevos, { resetPage: true, triggerSync: false });
  };

  const handleLimpiar = () => {
    setFiltros({ ...defaultFiltros });
    setAppliedFiltros({ ...defaultFiltros });
    cargarOportunidadesStream({ ...defaultFiltros }, { resetPage: true, triggerSync: false });
  };


  useEffect(() => {
    // React StrictMode (dev) ejecuta: setup1 → cleanup1 → setup2.
    // startedRef evita que setup1 y setup2 abran dos streams simultáneos.
    // El cleanup resetea el flag para que setup2 pueda arrancar el stream real.
    // Flujo real:
    //   setup1 → startedRef=true → abre stream1
    //   cleanup1 → startedRef=false → aborta stream1 (servidor lo detecta y sale limpio)
    //   setup2 → startedRef=false → startedRef=true → abre stream2 (este es el real)
    if (startedRef.current) return;
    startedRef.current = true;
    cargarOportunidadesStream(appliedFiltros, { triggerSync: true });
    return () => {
      startedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      detenerCola();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ── Columnas ──────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Cotización ID',
      dataIndex: 'cotizacionId',
      key: 'cotizacionId',
      render: (text, record) => {
        const esCerrada = (record.estado || '').toUpperCase() === 'CERRADA';
        return (
          <Space size={6}>
            <HighlightText text={text ? String(text) : '-'} highlight={appliedFiltros.cotizacionId} />
            {esCerrada && <Tag color="magenta" style={{ fontSize: 10, padding: '0 4px' }}>Cerrada</Tag>}
          </Space>
        );
      }
    },
    {
      title: 'Nº Pedido',
      key: 'numeroPedido',
      align: 'center',
      render: (_, record) => {
        const num = record.numeroPedido || record.pedidoId;
        if (num) {
          const est = (record.pedidoEstado || '').toLowerCase();
          const color = est === 'entregado' ? 'green' : est.includes('aguardando') ? 'gold' : 'blue';
          return (
            <Space direction="vertical" size={0}>
              <Tag color={color} style={{ fontWeight: 600 }}>
                #{num}
              </Tag>
              {record.pedidoEstado && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {record.pedidoEstado}
                </Text>
              )}
            </Space>
          );
        }
        return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
      }
    },
    {
      title: 'Marca', key: 'marca',
      sorter: (a, b) => {
        const marcaA = getMarcaSegura(a);
        const marcaB = getMarcaSegura(b);
        return marcaA.localeCompare(marcaB);
      },
      render: (_, record) => getMarcaSegura(record),
    },
    {
      title: 'Modelo', key: 'modelo',
      sorter: (a, b) => {
        const modeloA = getModeloSeguro(a);
        const modeloB = getModeloSeguro(b);
        return modeloA.localeCompare(modeloB);
      },
      render: (_, record) => getModeloSeguro(record),
    },
    {
      title: 'Año', key: 'anio',
      sorter: (a, b) => {
        const anioA = getAnioSeguro(a).toString();
        const anioB = getAnioSeguro(b).toString();
        return anioA.localeCompare(anioB);
      },
      render: (_, record) => {
        return getAnioSeguro(record);
      }
    },
    {
      title: 'Provincia', key: 'estado',
      render: (_, record) => getProvinciaSegura(record) || '-'
    },
    {
      title: 'Cantón', key: 'ciudad',
      render: (_, record) => getCantonSeguro(record) || '-'
    },
    {
      title: 'Dirección', key: 'colonia',
      render: (_, record) => getDireccionSegura(record) || '-'
    },
    { title: 'Taller', dataIndex: 'taller', key: 'taller' },
    { title: 'Póliza', dataIndex: 'poliza', key: 'poliza' },
    {
      title: 'Fecha', dataIndex: 'fechaCotizacion', key: 'fechaCotizacion',
      sorter: (a, b) => parseFechaCotizacion(a.fechaCotizacion) - parseFechaCotizacion(b.fechaCotizacion),
      defaultSortOrder: 'descend'
    },
    {
      title: 'Pendientes', dataIndex: 'pendientes', key: 'pendientes',
      sorter: (a, b) => (a.pendientes || 0) - (b.pendientes || 0),
      render: (v) => (
        <Tag color={v > 0 ? 'orange' : 'green'} style={{ fontWeight: 'bold' }}>{v}</Tag>
      ),
    },
    {
      title: 'Usuario Responsable',
      key: 'usuario',
      render: (_, record) => {
        const key = record.cotizacionId || record.wan || record._key;
        const asignado = asignacionesOportunidades[key];
        const uNombre = asignado?.usuarioNombre || asignado?.empleadoNombre || record.usuarioNombre || record.empleadoNombre;
        const uId = asignado?.usuarioId || asignado?.empleadoId || record.usuarioId || record.empleadoId;
        const esMio = currentUserId && Number(uId) === Number(currentUserId);

        if (uNombre) {
          return (
            <Tag color={esMio ? 'blue' : 'geekblue'} icon={<UserOutlined />} style={{ fontWeight: 600, padding: '4px 8px' }}>
              {uNombre} {esMio ? ' (Tú)' : ''}
            </Tag>
          );
        }
        return <Tag color="default" style={{ fontStyle: 'italic' }}>Sin asignar</Tag>;
      }
    },
    {
      title: 'Acción',
      key: 'acciones',
      align: 'center',
      render: (_, record) => {
        const key = record.cotizacionId || record.wan || record._key;
        const asignado = asignacionesOportunidades[key];
        const esEntregado = asignado?.estado === 'Entregado';
        const assignedId = asignado?.usuarioId || asignado?.empleadoId || record.usuarioId || record.empleadoId;
        const esMio = currentUserId && Number(assignedId) === Number(currentUserId);

        let btnText = 'Asignar';
        if (esEntregado) {
          btnText = 'Entregado';
        } else if (assignedId) {
          btnText = (esAdmin || esMio) ? 'Gestionar' : 'Ver Detalle';
        } else {
          btnText = esAdmin ? 'Asignar' : 'Autoasignarme';
        }

        return (
          <Button
            type="primary"
            ghost={!esEntregado}
            size="middle"
            icon={esEntregado ? <CheckCircleOutlined /> : <UserOutlined />}
            style={
              esEntregado
                ? { background: '#16a34a', borderColor: '#16a34a', color: '#fff', fontWeight: 600 }
                : { borderRadius: '6px' }
            }
            onClick={(e) => {
              e.stopPropagation();
              handleAbrirDetalle(record);
            }}
          >
            {btnText}
          </Button>
        );
      }
    }
  ];

  // ── Filtro Local (Frontend) ────────────────────────────────────────────────
  const oportunidadesFiltradas = React.useMemo(() => {
    return oportunidades.filter(op => {
      const mCotizacionId = normalizeString(appliedFiltros.cotizacionId);
      const mNumeroPedido = normalizeString(appliedFiltros.numeroPedido);
      const mMarca = normalizeString(appliedFiltros.marca);
      const mModelo = normalizeString(appliedFiltros.modelo);
      const mAnio = normalizeString(appliedFiltros.anio);
      const mRepuesto = normalizeString(appliedFiltros.repuesto);

      const vCotizacionId = normalizeString(
        op.cotizacionId || op.wan || op.datosCotizacion?.['Número Cotización'] || op.datosCotizacion?.['Numero Cotizacion'] || ''
      );
      const vNumeroPedido = normalizeString(op.numeroPedido || op.pedidoId || '');
      const vMarca = normalizeString(getMarcaSegura(op));
      const vModelo = normalizeString(getModeloSeguro(op));
      const vAnio = normalizeString(getAnioSeguro(op));

      const matchCotizacionId = !mCotizacionId || vCotizacionId.includes(mCotizacionId);
      const matchNumeroPedido = !mNumeroPedido || vNumeroPedido.includes(mNumeroPedido);

      let matchEstado = true;
      const esCerrada = (op.estado || '').toUpperCase() === 'CERRADA';
      const tienePedido = Boolean(op.numeroPedido || op.pedidoId);

      if (appliedFiltros.filtroEstado === 'solo_activas') {
        const buscaDirecto = Boolean(mCotizacionId || mNumeroPedido);
        matchEstado = buscaDirecto || !esCerrada;
      } else if (appliedFiltros.filtroEstado === 'cerradas_con_pedido') {
        matchEstado = esCerrada || tienePedido;
      }

      const matchMarca = !mMarca || vMarca.includes(mMarca);
      const matchModelo = !mModelo || vModelo.includes(mModelo);
      const matchAnio = !mAnio || vAnio.includes(mAnio);
      const matchRepuesto = !mRepuesto || (Array.isArray(op.repuestos) && op.repuestos.some(r =>
        normalizeString(r['Grupo Pieza']).includes(mRepuesto) ||
        normalizeString(r['PartNumber']).includes(mRepuesto) ||
        normalizeString(r['Part Serial Number']).includes(mRepuesto) ||
        normalizeString(r['Descripcion Pieza']).includes(mRepuesto)
      ));

      const mProvincia = appliedFiltros.provincia ? normalizeString(provincias.find(p => p.id === appliedFiltros.provincia)?.nombre) : '';
      const mCanton = appliedFiltros.canton ? normalizeString(cantones.find(c => c.id === appliedFiltros.canton)?.nombre) : '';
      const vProvincia = normalizeString(getProvinciaSegura(op));
      const vCanton = normalizeString(getCantonSeguro(op));
      const matchProvincia = !mProvincia || vProvincia.includes(mProvincia);
      const matchCanton = !mCanton || vCanton.includes(mCanton);

      const matchMinPendientes = appliedFiltros.minPendientes === null || appliedFiltros.minPendientes === undefined || tienePedido || (op.pendientes || 0) >= appliedFiltros.minPendientes;

      let matchDesde = true;
      let matchHasta = true;

      let opDate = null;
      if (op.fechaCotizacion) {
        if (typeof op.fechaCotizacion === 'string' && op.fechaCotizacion.includes('/')) {
          const parts = op.fechaCotizacion.split(' ')[0].split('/');
          if (parts.length === 3) {
            const y = parseInt(parts[2], 10);
            const m = parts[1].padStart(2, '0');
            const d = parts[0].padStart(2, '0');
            opDate = dayjs(`${y}-${m}-${d}`);
          }
        } else {
          opDate = dayjs(op.fechaCotizacion);
        }
      }

      if (opDate && opDate.isValid() && !tienePedido) {
        if (appliedFiltros.desde) {
          matchDesde = opDate.isSame(appliedFiltros.desde, 'day') || opDate.isAfter(appliedFiltros.desde, 'day');
        }
        if (appliedFiltros.hasta) {
          matchHasta = opDate.isSame(appliedFiltros.hasta, 'day') || opDate.isBefore(appliedFiltros.hasta, 'day');
        }
      }

      let matchEmpleado = true;
      if (appliedFiltros.empleado) {
        const key = op.cotizacionId || op.wan || op._key;
        const asig = asignacionesOportunidades[key];
        const assignedId = asig?.usuarioId || asig?.empleadoId || op.usuarioId || op.empleadoId;
        matchEmpleado = assignedId && Number(assignedId) === Number(appliedFiltros.empleado);
      }

      return matchCotizacionId && matchNumeroPedido && matchEstado && matchMarca && matchModelo && matchAnio && matchRepuesto && matchProvincia && matchCanton && matchMinPendientes && matchDesde && matchHasta && matchEmpleado;
    }).sort((a, b) => parseFechaCotizacion(b.fechaCotizacion) - parseFechaCotizacion(a.fechaCotizacion));
  }, [oportunidades, appliedFiltros.cotizacionId, appliedFiltros.numeroPedido, appliedFiltros.filtroEstado, appliedFiltros.marca, appliedFiltros.modelo, appliedFiltros.anio, appliedFiltros.repuesto, appliedFiltros.provincia, appliedFiltros.canton, appliedFiltros.minPendientes, appliedFiltros.desde, appliedFiltros.hasta, appliedFiltros.empleado, asignacionesOportunidades, provincias, cantones]);

  const thStyle = {
    padding: '8px 12px', textAlign: 'left', fontWeight: 600,
    borderBottom: '2px solid #BFDBFE', whiteSpace: 'nowrap',
  };
  const tdStyle = {
    padding: '7px 12px', borderBottom: '1px solid #E2E8F0', color: '#334155',
  };

  const stats = React.useMemo(() => {
    let matches = 0;

    oportunidadesFiltradas.forEach(op => {
      if (op.matchInventario) matches++;
    });

    return { matches };
  }, [oportunidadesFiltradas]);

  return (
    <div style={{ padding: '24px' }}>

      {/* Encabezado */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700 }}>🛒 Cotizaciones InPart · Vista Global</Title>
          <div style={{ color: '#8c8c8c', fontSize: '14px', marginTop: '4px' }}>Todas las oportunidades abiertas en Audatex que matchean con tu inventario</div>
        </div>
        <Space>
          {streaming && (
            <Button danger onClick={handleDetener} icon={<LoadingOutlined spin />}>
              Detener
            </Button>
          )}
          <Button type="default" icon={<ReloadOutlined />} onClick={handleSincronizar} disabled={streaming && oportunidades.length === 0} style={{ color: '#1890ff', borderColor: '#1890ff' }}>
            Refrescar
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportar} style={{ background: '#52c41a', borderColor: '#52c41a' }}>
            Exportar Excel del rango
          </Button>
        </Space>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: 600, letterSpacing: '0.05em' }}>TOTAL ACTIVAS</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#52c41a' }}>{oportunidadesFiltradas.length}</div>
        </div>
        <div style={{ background: '#fff7e6', border: '1px solid #ffd591', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: 600, letterSpacing: '0.05em' }}>CON MATCH EN TU INV.</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#faad14' }}>{stats.matches}</div>
        </div>
      </div>

      {/* Indicador de sync en background — tabla siempre visible */}
      {syncing && (
        <Alert
          style={{ marginBottom: '12px' }}
          type="info"
          icon={<LoadingOutlined spin />}
          showIcon
          message={
            <span>
              Sincronizando con Audatex (30 días)…{' '}
              <strong>{oportunidadesFiltradas.length}</strong> oportunidades visibles desde BD
            </span>
          }
        />
      )}
      {streaming && oportunidades.length === 0 && (
        <Alert
          style={{ marginBottom: '12px' }}
          type="info"
          icon={<LoadingOutlined spin />}
          showIcon
          message="Cargando oportunidades desde la base de datos…"
        />
      )}

      {/* Filtros */}
      <Card
        bordered={false}
        style={{
          marginBottom: '24px',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
          background: '#ffffff'
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mostrarFiltros ? '20px' : '0' }}>
          <Title level={5} style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setMostrarFiltros(!mostrarFiltros)}>
            <FilterOutlined style={{ marginRight: '8px', color: '#3b82f6' }} />
            Filtros de Búsqueda
            {mostrarFiltros ? <UpOutlined style={{ marginLeft: '8px', fontSize: '12px', color: '#94a3b8' }} /> : <DownOutlined style={{ marginLeft: '8px', fontSize: '12px', color: '#94a3b8' }} />}
          </Title>
          <Space>
            <Button onClick={handleLimpiar} style={{ borderRadius: '8px' }}>
              Limpiar
            </Button>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleFiltrar} style={{ borderRadius: '8px', background: '#3b82f6' }}>
              Filtrar
            </Button>
          </Space>
        </div>

        {mostrarFiltros && (
          <Row gutter={[16, 20]}>
            <Col xs={24} sm={12} md={8} lg={4}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Cotización ID</div>
              <Input
                placeholder="Ej: 19841"
                value={filtros.cotizacionId}
                onChange={(e) => setFiltros({ ...filtros, cotizacionId: e.target.value })}
                style={{ width: '100%', borderRadius: '8px' }}
                prefix={<FilterOutlined style={{ color: '#cbd5e1' }} />}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Nº Pedido</div>
              <Input
                placeholder="Ej: 19439"
                value={filtros.numeroPedido}
                onChange={(e) => setFiltros({ ...filtros, numeroPedido: e.target.value })}
                style={{ width: '100%', borderRadius: '8px' }}
                prefix={<FilterOutlined style={{ color: '#cbd5e1' }} />}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Estado / Pedido</div>
              <Select
                value={filtros.filtroEstado}
                onChange={(val) => setFiltros({ ...filtros, filtroEstado: val })}
                style={{ width: '100%' }}
                options={[
                  { value: 'solo_activas', label: 'Solo Activas' },
                  { value: 'todos', label: 'Todas' },
                  { value: 'cerradas_con_pedido', label: 'Cerradas con Pedido' }
                ]}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Marca</div>
              <Input
                placeholder="Ej: Toyota"
                value={filtros.marca}
                onChange={(e) => setFiltros({ ...filtros, marca: e.target.value })}
                style={{ width: '100%', borderRadius: '8px' }}
                prefix={<FilterOutlined style={{ color: '#cbd5e1' }} />}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Modelo</div>
              <Input
                placeholder="Ej: Yaris"
                value={filtros.modelo}
                onChange={(e) => setFiltros({ ...filtros, modelo: e.target.value })}
                style={{ width: '100%', borderRadius: '8px' }}
                prefix={<FilterOutlined style={{ color: '#cbd5e1' }} />}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Año</div>
              <Input
                placeholder="Ej: 2020"
                value={filtros.anio}
                onChange={(e) => setFiltros({ ...filtros, anio: e.target.value })}
                style={{ width: '100%', borderRadius: '8px' }}
                prefix={<FilterOutlined style={{ color: '#cbd5e1' }} />}
                allowClear
              />
            </Col>

            <Col xs={24} sm={12} md={8} lg={5}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Repuesto</div>
              <Input
                placeholder="Ej: Bumper"
                value={filtros.repuesto}
                onChange={(e) => setFiltros({ ...filtros, repuesto: e.target.value })}
                style={{ width: '100%', borderRadius: '8px' }}
                prefix={<FilterOutlined style={{ color: '#cbd5e1' }} />}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={3}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Provincia</div>
              <Select
                placeholder="Seleccione"
                allowClear
                loading={loadingProvincias}
                value={filtros.provincia}
                onChange={(val) => setFiltros({ ...filtros, provincia: val, canton: null })}
                style={{ width: '100%' }}
                options={provincias.map(p => ({ value: p.id, label: p.nombre }))}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={3}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Cantón</div>
              <Select
                placeholder="Seleccione"
                allowClear
                loading={loadingCantones}
                disabled={!filtros.provincia}
                value={filtros.canton}
                onChange={(val) => setFiltros({ ...filtros, canton: val })}
                style={{ width: '100%' }}
                options={cantones.map(c => ({ value: c.id, label: c.nombre }))}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Rango de Fechas</div>
              <RangePicker
                value={[filtros.desde, filtros.hasta]}
                onChange={(dates) =>
                  setFiltros({ ...filtros, desde: dates ? dates[0] : null, hasta: dates ? dates[1] : null })
                }
                format="YYYY-MM-DD"
                placeholder={['Desde', 'Hasta']}
                style={{ width: '100%', borderRadius: '8px' }}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={3}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Min. Pendientes</div>
              <Input
                type="number"
                placeholder="Ej: 1"
                value={filtros.minPendientes}
                onChange={(e) =>
                  setFiltros({ ...filtros, minPendientes: e.target.value ? parseInt(e.target.value) : null })
                }
                style={{ width: '100%', borderRadius: '8px' }}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={3}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Responsable</div>
              <Select
                placeholder="Todos"
                allowClear
                value={filtros.empleado}
                onChange={(val) => setFiltros({ ...filtros, empleado: val })}
                style={{ width: '100%' }}
                options={usuariosActivos.map((u) => ({
                  value: u.id,
                  label: `${u.nombre || u.email}${u.id === currentUserId ? ' (Tú)' : ''}`
                }))}
              />
            </Col>
          </Row>
        )}
      </Card>

      {/* Tabla progresiva — Ant Design maneja la paginación internamente */}
      <Card>
        <style>{`
          .row-cotizada { background-color: #f0fdf4 !important; border-left: 5px solid #16a34a !important; }
          .row-cotizada td { background-color: #f0fdf4 !important; }
          .row-pendiente { background-color: #fffbe6 !important; border-left: 5px solid #faad14 !important; }
          .row-revisada { opacity: 0.75; background-color: #fafafa !important; border-left: 5px solid #d9d9d9 !important; }
          .row-cotizada:hover, .row-pendiente:hover, .row-revisada:hover { filter: brightness(0.97); }
        `}</style>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Space size={8} wrap>
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>Leyenda de Estados:</Text>
            <Tag color="success" style={{ fontWeight: 600 }}>● Cotizada / Con Pedido (Verde)</Tag>
            <Tag color="warning" style={{ fontWeight: 600 }}>● Pendiente (&gt; 30 min, Amarillo)</Tag>
            <Tag color="default" style={{ fontWeight: 600 }}>● Revisada (Gris)</Tag>
          </Space>
        </div>
        <div ref={tableRef}>
          <Table
            columns={columns}
            dataSource={oportunidadesFiltradas}
            rowClassName={getRowClassName}
            rowKey={(record) => record._key}
            loading={streaming && oportunidades.length === 0}
            expandable={{
              expandRowByClick: false,
              expandedRowKeys,
              onExpandedRowsChange: setExpandedRowKeys,
              onExpand: (expanded, record) => {
                if (expanded && record.estado_interaccion !== 'REVISADA') {
                  handleMarcarRevisada(record);
                }
              },
              rowExpandable: (record) => Array.isArray(record.repuestos) && record.repuestos.length > 0,
              expandedRowRender: (record) => {
                let repuestos = record.repuestos || [];
                const mRepuesto = normalizeString(appliedFiltros.repuesto);
                if (mRepuesto) {
                  repuestos = repuestos.filter(r =>
                    normalizeString(r['Grupo Pieza']).includes(mRepuesto) ||
                    normalizeString(r['PartNumber']).includes(mRepuesto) ||
                    normalizeString(r['Part Serial Number']).includes(mRepuesto) ||
                    normalizeString(r['Descripcion Pieza']).includes(mRepuesto)
                  );
                }
                const datos = record.datosCotizacion || {};

                const repuestosTab = (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#EFF6FF', color: '#1e40af' }}>
                        <th style={thStyle}>#</th>
                        <th style={thStyle}>Grupo Pieza</th>
                        <th style={thStyle}>PartNumber</th>
                        <th style={thStyle}>Part Serial Number</th>
                        <th style={thStyle}>Descripcion Pieza</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repuestos.map((rep, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#F8FAFC' : '#FFFFFF' }}>
                          <td style={tdStyle}>{i + 1}</td>
                          <td style={tdStyle}><HighlightText text={rep['Grupo Pieza'] || '-'} highlight={appliedFiltros.repuesto} /></td>
                          <td style={{ ...tdStyle, fontWeight: 500 }}><HighlightText text={rep['PartNumber'] || '-'} highlight={appliedFiltros.repuesto} /></td>
                          <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}><HighlightText text={rep['Part Serial Number'] || '-'} highlight={appliedFiltros.repuesto} /></td>
                          <td style={tdStyle}><HighlightText text={rep['Descripcion Pieza'] || '-'} highlight={appliedFiltros.repuesto} /></td>
                        </tr>
                      ))}
                      {repuestos.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 16 }}>No hay repuestos disponibles</td></tr>}
                    </tbody>
                  </table>
                );

                // Omitir Número Cotización y organizar por categorías
                const filteredDatos = { ...datos };
                delete filteredDatos['Número Cotización'];

                const grupoVehiculo = ['Descripción', 'Armadora', 'Marca', 'Modelo', 'Color', 'Matricula', 'Chasis', 'Año Modelo', 'Año Fabricación', 'KM', 'Características Vehículo'];
                const grupoTaller = ['Nombre Taller', 'RFC', 'Inscripción Estadual', 'País', 'Estado', 'Ciudad', 'Codigo Postal', 'Calle', 'Colonia', 'Nombre Contacto', 'Teléfono', 'E-mail'];

                const vehiculoDatos = Object.entries(filteredDatos).filter(([k]) => grupoVehiculo.includes(k));
                const tallerDatos = Object.entries(filteredDatos).filter(([k]) => grupoTaller.includes(k));
                const generalDatos = Object.entries(filteredDatos).filter(([k]) => !grupoVehiculo.includes(k) && !grupoTaller.includes(k));

                const renderDesc = (arr) => (
                  <Descriptions bordered size="small" column={1}>
                    {arr.map(([key, value]) => (
                      <Descriptions.Item label={<span style={{ color: '#64748b', fontSize: 12 }}>{key}</span>} key={key}>
                        <strong style={{ color: '#334155', fontSize: 12 }}>{value}</strong>
                      </Descriptions.Item>
                    ))}
                  </Descriptions>
                );

                const cardStyle = { background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', height: '100%' };
                const titleStyle = { marginTop: 0, marginBottom: '8px', color: '#1e40af', fontSize: '13px', fontWeight: 600 };

                const datosTab = (
                  <div style={{ padding: '8px 0' }}>
                    <Row gutter={[16, 16]} align="stretch">
                      <Col xs={24} md={10}>
                        <div style={cardStyle}>
                          <Typography.Title level={5} style={titleStyle}>Información del Siniestro</Typography.Title>
                          {generalDatos.length > 0 ? renderDesc(generalDatos) : <p style={{ color: '#94a3b8', margin: 0 }}>No hay datos de siniestro</p>}
                        </div>
                      </Col>
                      <Col xs={24} md={10}>
                        <div style={cardStyle}>
                          <Typography.Title level={5} style={titleStyle}>Detalles del Vehículo</Typography.Title>
                          {vehiculoDatos.length > 0 ? renderDesc(vehiculoDatos) : <p style={{ color: '#94a3b8', margin: 0 }}>No hay datos del vehículo</p>}
                        </div>
                      </Col>
                      <Col xs={24} md={10}>
                        <div style={cardStyle}>
                          <Typography.Title level={5} style={titleStyle}>Lugar de Entrega / Taller</Typography.Title>
                          <Descriptions bordered size="small" column={1}>
                            {tallerDatos.map(([key, value]) => (
                              <Descriptions.Item label={<span style={{ color: '#64748b', fontSize: 12 }}>{key}</span>} key={key}>
                                <strong style={{ color: '#334155', fontSize: 12 }}>{value}</strong>
                              </Descriptions.Item>
                            ))}
                          </Descriptions>
                          {tallerDatos.length === 0 && <p style={{ color: '#94a3b8', margin: 0 }}>No hay datos del taller</p>}
                        </div>
                      </Col>
                    </Row>
                  </div>
                );

                return (
                  <div style={{ padding: '8px 16px 16px 40px', background: '#fafafa', borderRadius: '4px' }}>
                    <Tabs defaultActiveKey="1" items={[
                      { key: '1', label: 'Repuestos', children: repuestosTab },
                      { key: '2', label: 'Datos de Cotización', children: Object.keys(datos).length > 0 ? datosTab : <div style={{ padding: 16 }}>No hay datos de cotización extra disponibles.</div> }
                    ]} />
                  </div>
                );
              },
            }}
            pagination={{
              current: currentPage,
              pageSize,
              total: oportunidadesFiltradas.length,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total) =>
                streaming
                  ? `${total} cargadas (cargando más…)`
                  : `Total: ${total} oportunidades`,
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
                tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              },
            }}
            scroll={{ x: 1200 }}
            onRow={(record) => ({
              onClick: () => handleAbrirDetalle(record),
              style: { cursor: 'pointer' }
            })}
          />
        </div>
      </Card>

      {/* Modal / Dialog de Detalle y Asignación de Oportunidad (Igual que en Pedidos sin montos) */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileTextOutlined style={{ color: '#2563eb', fontSize: 20 }} />
            <span>Detalle de Oportunidad #{selectedOportunidad?.cotizacionId || selectedOportunidad?.wan}</span>
            <Tag color="blue">Oportunidad</Tag>
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={780}
        footer={(() => {
          const key = selectedOportunidad?.cotizacionId || selectedOportunidad?.wan || selectedOportunidad?._key;
          const asignado = key ? asignacionesOportunidades[key] : null;
          const assignedId = asignado?.usuarioId || asignado?.userId || asignado?.empleadoId || selectedOportunidad?.usuarioId || selectedOportunidad?.userId || selectedOportunidad?.empleadoId;
          const esAsignadoAOtro = Boolean(assignedId && currentUserId && Number(assignedId) !== Number(currentUserId));

          if (!esAdmin && esAsignadoAOtro) {
            return (
              <Button onClick={() => setModalVisible(false)}>
                Cerrar
              </Button>
            );
          }

          let btnLabel = 'Confirmar Asignación';
          if (!assignedId) {
            btnLabel = esAdmin ? 'Asignar Usuario' : 'Confirmar Autoasignación';
          } else {
            btnLabel = esAdmin ? 'Guardar Cambios' : 'Actualizar Mi Gestión';
          }

          return (
            <Space>
              <Button onClick={() => setModalVisible(false)}>Cerrar</Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={procesando}
                onClick={handleGuardarAsignacion}
                style={{ background: '#2563eb' }}
              >
                {btnLabel}
              </Button>
            </Space>
          );
        })()}
      >
        {selectedOportunidad && (
          <div>
            {/* Resumen del Siniestro y Vehículo (mismo estilo limpio que en Pedidos) */}
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid #e2e8f0' }}>
              <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }}>
                <Descriptions.Item label="Vehículo">
                  <Text strong>{getMarcaSegura(selectedOportunidad)} {getModeloSeguro(selectedOportunidad)} ({getAnioSeguro(selectedOportunidad)})</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Placa / Matrícula">
                  <Tag color="blue">{selectedOportunidad.matricula || getDetalleJson(selectedOportunidad)?.['Placa'] || '-'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Cotización ID">
                  <Text strong>#{selectedOportunidad.cotizacionId || '-'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Aseguradora">
                  <Tag color="cyan">{selectedOportunidad.aseguradora || 'INS'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Taller">
                  {selectedOportunidad.taller || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha y Hora">
                  {parsearFechaHora(selectedOportunidad).fechaTexto} {parsearFechaHora(selectedOportunidad).horaTexto}
                </Descriptions.Item>
              </Descriptions>
            </div>

            {/* Si ya existe el Pedido Confirmado, mostrar bloque de Monto Cargado y Comisión */}
            {(() => {
              const hasPedido = Boolean(selectedOportunidad.pedidoId || selectedOportunidad.pedido_id || selectedOportunidad.numeroPedido || selectedOportunidad.numero_pedido);
              const numPedido = selectedOportunidad.numeroPedido || selectedOportunidad.numero_pedido || selectedOportunidad.pedidoId || selectedOportunidad.pedido_id;
              
              const totalCalculado = (() => {
                const direct = Number(selectedOportunidad.totalPedido || selectedOportunidad.total_pedido || 0);
                if (direct > 0) return direct;
                if (Array.isArray(selectedOportunidad.repuestos)) {
                  const sum = selectedOportunidad.repuestos.reduce((acc, it) => {
                    const p = it.precioOfrecido || it.precio || it.Precio || it['Precio Ofrecido'] || 0;
                    const num = typeof p === 'string' ? Number(p.replace(/[^0-9.-]+/g, '')) : Number(p);
                    const cant = Number(it.cantidad || 1);
                    return acc + (isNaN(num) ? 0 : num * (isNaN(cant) ? 1 : cant));
                  }, 0);
                  if (sum > 0) return sum;
                }
                return 0;
              })();

              const pctComision = Number(selectedOportunidad.porcentajeComision || selectedOportunidad.porcentaje_comision || 3);
              const comisionFinal = Number(selectedOportunidad.comisionCalculada || selectedOportunidad.comision_calculada || Math.round((totalCalculado * pctComision) / 100));

              if (hasPedido) {
                return (
                  <div style={{ background: '#f0fdf4', padding: 14, borderRadius: 8, marginBottom: 16, border: '1px solid #86efac' }}>
                    <Row gutter={16} align="middle">
                      <Col xs={24} sm={8}>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Pedido Confirmado</Text>
                        <Text strong style={{ color: '#166534', fontSize: 15 }}>
                          📦 #{numPedido}
                        </Text>
                        <div>
                          <Tag color="green" style={{ marginTop: 4, fontWeight: 500 }}>
                            {selectedOportunidad.pedidoEstado || selectedOportunidad.pedido_estado || selectedOportunidad.estado || 'Confirmado'}
                          </Tag>
                        </div>
                      </Col>
                      <Col xs={12} sm={8} style={{ textAlign: 'right' }}>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Monto Total Cargado</Text>
                        <Text strong style={{ color: '#15803d', fontSize: 18 }}>
                          ₡{new Intl.NumberFormat('es-CR').format(totalCalculado)}
                        </Text>
                      </Col>
                      <Col xs={12} sm={8} style={{ textAlign: 'right' }}>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                          Comisión ({pctComision}%)
                        </Text>
                        <Text strong style={{ color: '#b45309', fontSize: 18 }}>
                          ₡{new Intl.NumberFormat('es-CR').format(comisionFinal)}
                        </Text>
                      </Col>
                    </Row>
                  </div>
                );
              }

              return (
                <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 6, marginBottom: 16, border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    ℹ️ Estado: <strong>Oportunidad en Cotización</strong> (sin pedido cargado todavía)
                  </Text>
                  <Tag color="default">Sin montos aún</Tag>
                </div>
              );
            })()}

            {/* Repuestos Solicitados (tabla informativa sin montos) */}
            <Divider orientation="left" style={{ margin: '14px 0', fontSize: 13, color: '#475569' }}>
              Repuestos Solicitados ({selectedOportunidad.repuestos?.length || 0})
            </Divider>
            <Table
              size="small"
              pagination={false}
              dataSource={Array.isArray(selectedOportunidad.repuestos) ? selectedOportunidad.repuestos : []}
              rowKey={(item, idx) => item.id || idx}
              columns={[
                {
                  title: '#',
                  key: 'idx',
                  width: 50,
                  render: (_, __, index) => index + 1
                },
                {
                  title: 'Descripción',
                  key: 'descripcion',
                  render: (_, r) => <strong>{r['Descripcion Pieza'] || r['Grupo Pieza'] || r.descripcion || 'Pieza'}</strong>
                },
                {
                  title: 'Part Number',
                  key: 'partNumber',
                  render: (_, r) => <Text code>{r['PartNumber'] || r['Part Serial Number'] || '-'}</Text>
                },
                {
                  title: 'Tipo Pieza / Estado',
                  key: 'tipoPieza',
                  align: 'center',
                  render: (_, r) => <Tag>{r.tipoPieza || r.Estado || r['Estado'] || 'Original'}</Tag>
                },
                {
                  title: 'Cantidad',
                  key: 'cantidad',
                  align: 'center',
                  width: 65,
                  render: (_, r) => r.cantidad || 1
                },
                ...(Boolean(selectedOportunidad.pedidoId || selectedOportunidad.pedido_id || selectedOportunidad.numeroPedido || selectedOportunidad.numero_pedido) ? [
                  {
                    title: 'Precio Ofrecido',
                    key: 'precio',
                    align: 'right',
                    width: 140,
                    render: (_, r) => {
                      const p = r.precioOfrecido || r.precio || r.Precio || r['Precio'] || r['Precio Ofrecido'];
                      const val = typeof p === 'string' ? Number(p.replace(/[^0-9.-]+/g, '')) : Number(p);
                      return val ? <Text strong style={{ color: '#15803d' }}>₡{new Intl.NumberFormat('es-CR').format(val)}</Text> : '-';
                    }
                  }
                ] : [])
              ]}
              locale={{ emptyText: 'No hay repuestos desglosados en esta oportunidad' }}
              style={{ marginBottom: 16 }}
            />

            {/* Selección / Autoasignación del Usuario Responsable (exactamente igual que en Pedidos) */}
            {(() => {
              const key = selectedOportunidad?.cotizacionId || selectedOportunidad?.wan || selectedOportunidad?._key;
              const asignado = key ? asignacionesOportunidades[key] : null;
              const assignedId = asignado?.usuarioId || asignado?.userId || asignado?.empleadoId || selectedOportunidad?.usuarioId || selectedOportunidad?.userId || selectedOportunidad?.empleadoId;
              const assignedName = asignado?.usuarioNombre || asignado?.empleadoNombre || selectedOportunidad?.usuarioNombre || selectedOportunidad?.empleadoNombre;
              const esAsignadoAOtro = Boolean(assignedId && currentUserId && Number(assignedId) !== Number(currentUserId));

              return (
                <div style={{ background: '#eff6ff', padding: 16, borderRadius: 8, border: '1px solid #bfdbfe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <UserOutlined style={{ color: '#2563eb', fontSize: 16 }} />
                      <Text strong style={{ color: '#1e40af' }}>
                        {esAdmin ? 'Usuario Responsable (Gestión Admin):' : 'Usuario Responsable:'}
                      </Text>
                    </div>
                    {!esAdmin && (
                      <Tag color="cyan">Rol: {user?.rol || 'Colaborador'}</Tag>
                    )}
                  </div>

                  {esAdmin ? (
                    <Select
                      placeholder="Seleccione el usuario que atiende esta oportunidad..."
                      value={usuarioSeleccionadoId}
                      onChange={(val) => setUsuarioSeleccionadoId(val)}
                      style={{ width: '100%' }}
                      size="large"
                      showSearch
                      optionFilterProp="children"
                    >
                      {usuariosActivos.map((u) => (
                        <Select.Option key={u.id} value={u.id}>
                          {u.nombre || u.email} {u.rol ? `(${u.rol})` : ''} {u.id === currentUserId ? '— (Tú)' : ''}
                        </Select.Option>
                      ))}
                    </Select>
                  ) : (
                    <div>
                      {esAsignadoAOtro ? (
                        <Alert
                          type="warning"
                          showIcon
                          message={`Asignada actualmente a: ${assignedName || `Usuario #${assignedId}`}`}
                          description="Esta oportunidad ya está asignada a otro usuario. Solo un Administrador puede transferirla o gestionarla."
                        />
                      ) : (
                        <div style={{ padding: '10px 14px', background: '#fff', borderRadius: 6, border: '1px solid #93c5fd', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <Text strong style={{ color: '#1e3a8a', fontSize: 15 }}>
                              👤 {currentUserName}
                            </Text>
                            <div style={{ color: '#64748b', fontSize: 12 }}>
                              {assignedId ? 'Ya asignada a tu cuenta' : 'Se autoasignará a tu usuario al confirmar'}
                            </div>
                          </div>
                          <Tag color="blue">Autoasignación</Tag>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OportunidadesAudatex;
