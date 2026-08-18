import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card, Table, Button, DatePicker, Input, Space, Typography,
  message, Tag, Alert,
  Tabs, Descriptions, Row, Col, Select
} from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
  ReloadOutlined,
  FilterOutlined,
  LoadingOutlined,
  FormOutlined,
  UpOutlined,
  DownOutlined
} from '@ant-design/icons';
import { audatexService } from '../../api';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx-js-style';
import { useGeo } from '../../hooks/useGeo';
import CotizarDrawer from './CotizarDrawer';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

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

const getDistritoSeguro = (row) => {
  let d = getSafeString(row.distrito);
  if (d) return d;
  if (row.datosCotizacion) return getSafeString(row.datosCotizacion['Distrito']) || getSafeString(row.datosCotizacion['Colonia']) || '-';
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
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [oportunidadSeleccionada, setOportunidadSeleccionada] = useState(null);

  const { provincias, cantones, loadingProvincias, loadingCantones, fetchProvincias, fetchCantones } = useGeo();

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
    { title: 'Cotización ID', dataIndex: 'cotizacionId', key: 'cotizacionId' },
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
      title: 'Acciones', key: 'acciones',
      render: (_, record) => (
        <Button
          type="primary"
          size="middle"
          shape="round"
          icon={<FormOutlined />}
          style={{
            background: 'linear-gradient(90deg, #1890ff, #096dd9)',
            border: 'none',
            fontWeight: 'bold',
            padding: '0 20px'
          }}
          onClick={(e) => {
            e.stopPropagation();
            setOportunidadSeleccionada(record);
            setDrawerVisible(true);
          }}
        >
          Cotizar
        </Button>
      )
    }
  ];

  // ── Filtro Local (Frontend) ────────────────────────────────────────────────
  const oportunidadesFiltradas = React.useMemo(() => {
    return oportunidades.filter(op => {
      const mMarca = normalizeString(appliedFiltros.marca);
      const mModelo = normalizeString(appliedFiltros.modelo);
      const mAnio = normalizeString(appliedFiltros.anio);
      const mRepuesto = normalizeString(appliedFiltros.repuesto);

      const vMarca = normalizeString(getMarcaSegura(op));
      const vModelo = normalizeString(getModeloSeguro(op));
      const vAnio = normalizeString(getAnioSeguro(op));

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

      const matchMinPendientes = appliedFiltros.minPendientes === null || appliedFiltros.minPendientes === undefined || (op.pendientes || 0) >= appliedFiltros.minPendientes;

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

      if (opDate && opDate.isValid()) {
        if (appliedFiltros.desde) {
          matchDesde = opDate.isSame(appliedFiltros.desde, 'day') || opDate.isAfter(appliedFiltros.desde, 'day');
        }
        if (appliedFiltros.hasta) {
          matchHasta = opDate.isSame(appliedFiltros.hasta, 'day') || opDate.isBefore(appliedFiltros.hasta, 'day');
        }
      }

      return matchMarca && matchModelo && matchAnio && matchRepuesto && matchProvincia && matchCanton && matchMinPendientes && matchDesde && matchHasta;
    }).sort((a, b) => parseFechaCotizacion(b.fechaCotizacion) - parseFechaCotizacion(a.fechaCotizacion));
  }, [oportunidades, appliedFiltros.marca, appliedFiltros.modelo, appliedFiltros.anio, appliedFiltros.repuesto, appliedFiltros.provincia, appliedFiltros.canton, appliedFiltros.minPendientes, appliedFiltros.desde, appliedFiltros.hasta, provincias, cantones]);

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
            <Col xs={24} sm={12} md={8} lg={6}>
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
            <Col xs={24} sm={12} md={8} lg={6}>
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
            <Col xs={24} sm={12} md={8} lg={6}>
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
            <Col xs={24} sm={12} md={8} lg={6}>
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

            <Col xs={24} sm={12} md={8} lg={6}>
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
            <Col xs={24} sm={12} md={8} lg={6}>
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

            <Col xs={24} sm={12} md={8} lg={8}>
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
            <Col xs={24} sm={12} md={8} lg={4}>
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
          </Row>
        )}
      </Card>

      {/* Tabla progresiva — Ant Design maneja la paginación internamente */}
      <Card>
        <div ref={tableRef}>
          <Table
            columns={columns}
            dataSource={oportunidadesFiltradas}
            rowKey={(record) => record._key}
            loading={streaming && oportunidades.length === 0}
            expandable={{
              expandRowByClick: false,
              expandedRowKeys,
              onExpandedRowsChange: setExpandedRowKeys,
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
          />
        </div>
      </Card>

      <CotizarDrawer
        visible={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setOportunidadSeleccionada(null);
        }}
        oportunidad={oportunidadSeleccionada}
        filtroRepuesto={appliedFiltros.repuesto}
      />
    </div>
  );
};

export default OportunidadesAudatex;
