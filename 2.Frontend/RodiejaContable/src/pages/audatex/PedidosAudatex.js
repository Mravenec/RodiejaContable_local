import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Table, Typography, Tag, Button, message, Space, Input, DatePicker, Row, Col, Select, Tabs, Descriptions } from 'antd';
import { ReloadOutlined, SyncOutlined, LoadingOutlined, SearchOutlined, DownloadOutlined, FilterOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import { audatexAPI } from '../../api/audatex';
import { useGeo } from '../../hooks/useGeo';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx-js-style';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const getSafeString = (val) => (val && val !== 'null' && val !== '-' ? val.trim() : '');

const getDetalleJson = (row) => {
  if (row._parsedDetalle) return row._parsedDetalle;
  let datos = {};
  try {
    if (row.detalleJson) {
      datos = typeof row.detalleJson === 'string' ? JSON.parse(row.detalleJson) : row.detalleJson;
    } else if (row.detalle_json) {
      datos = typeof row.detalle_json === 'string' ? JSON.parse(row.detalle_json) : row.detalle_json;
    } else if (row.datosCotizacion) {
      datos = typeof row.datosCotizacion === 'string' ? JSON.parse(row.datosCotizacion) : row.datosCotizacion;
    }
  } catch (e) {
    // Ignore JSON parse errors and return empty/partial object
  }
  row._parsedDetalle = datos || {};
  return row._parsedDetalle;
};

const getMarcaSegura = (row) => {
  let m = getSafeString(row.marca) || getSafeString(row.armadora);
  if (m) return m;
  const d = getDetalleJson(row);
  return d['Marca'] || d['Armadora'] || 'Desc.';
};

const getModeloSeguro = (row) => {
  let m = getSafeString(row.modelo);
  if (m) return m;
  const d = getDetalleJson(row);
  return d['Modelo'] || d['Descripción'] || d['Descripcion'] || '-';
};

const getAnioSeguro = (row) => {
  let a = getSafeString(row.anio);
  if (a) return a;
  const d = getDetalleJson(row);
  return d['Año Modelo'] || d['Año Fabricación'] || d['Ano Modelo'] || '-';
};

const getProvinciaSegura = (row) => {
  const d = getDetalleJson(row);
  return getSafeString(d['Estado']) || getSafeString(d['Provincia']) || '-';
};

const getCantonSeguro = (row) => {
  let c = getSafeString(row.ciudad);
  if (c) return c;
  const d = getDetalleJson(row);
  return getSafeString(d['Ciudad']) || getSafeString(d['Cantón']) || getSafeString(d['Canton']) || '-';
};

const normalizeString = (str) => (str || '').toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const samePedido = (a, b) => {
  if (!a || !b) return false;
  if (a.wan && b.wan) return a.wan === b.wan;
  if (a.cotizacionId && b.cotizacionId) return a.cotizacionId === b.cotizacionId;
  if (a.id && b.id) return a.id === b.id;
  return false;
};

const findPedidoIndex = (list, item) => list.findIndex((o) => samePedido(o, item));

const defaultFiltros = {
  marca: '',
  modelo: '',
  anio: '',
  repuesto: '',
  cotizacionId: '',
  numeroPedido: '',
  provincia: null,
  canton: null,
  estado: null,
  desde: dayjs().subtract(30, 'day'),
  hasta: dayjs(),
};

const PedidosAudatex = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [filtros, setFiltros] = useState({ ...defaultFiltros });
  const [appliedFiltros, setAppliedFiltros] = useState({ ...defaultFiltros });
  const [mostrarFiltros, setMostrarFiltros] = useState(true);

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
  const startedRef = useRef(false);
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
    setPedidos((prev) => {
      const idx = findPedidoIndex(prev, item);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...item, _key: updated[idx]._key || keyCounterRef.current++ };
        return updated;
      }
      return [...prev, { ...item, _key: keyCounterRef.current++ }];
    });
    setTimeout(tick, INTERVALO_FILA_MS);
  }, [finalizarStreamSiColaVacia]);

  const encolarPedido = useCallback((item) => {
    if (!item?.wan && !item?.cotizacionId && !item?.id) return;
    pendingQueueRef.current.push(item);
    if (!drainActiveRef.current) {
      drainActiveRef.current = true;
      drenarSiguiente();
    }
  }, [drenarSiguiente]);

  const aplicarDatosBd = useCallback((bdPedidos) => {
    setPedidos((prev) =>
      bdPedidos.map((item) => {
        const idx = findPedidoIndex(prev, item);
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

  const cargarPedidosStream = useCallback(async (options = {}) => {
    const { triggerSync = false } = options;
    if (abortRef.current) abortRef.current.abort();
    detenerCola();
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    streamReaderDoneRef.current = false;

    const token = localStorage.getItem('token');

    try {
      setLoading(true);
      const response = await audatexAPI.obtenerPedidos();
      aplicarDatosBd(response.data?.pedidos || []);
    } catch (e) {
      console.warn('Fallo en GET inicial de pedidos', e);
    } finally {
      setLoading(false);
    }

    if (triggerSync) {
      try {
        await fetch('http://localhost:8080/api/audatex/pedidos/sync/incremental', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        iniciarIndicadorSync();
      } catch (e) {
        console.warn('Fallo al iniciar sync incremental pedidos', e);
      }
    }

    setStreaming(false);

    const url = `http://localhost:8080/api/audatex/pedidos/sync/stream`;

    (async () => {
      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

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
                if (eventName === 'deltaPedido' || eventName === 'delta') {
                  encolarPedido(parsed);
                }
                eventName = '';
              } catch (_) { }
            }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error SSE sync pedidos:', err);
        }
      } finally {
        streamReaderDoneRef.current = true;
        finalizarStreamSiColaVacia();
        if (abortRef.current === controller) abortRef.current = null;
      }
    })();
  }, [detenerCola, encolarPedido, finalizarStreamSiColaVacia, aplicarDatosBd, iniciarIndicadorSync]);

  const handleDetener = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      detenerCola();
      setStreaming(false);
      message.info('Carga detenida manualmente');
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    cargarPedidosStream({ triggerSync: true });
    return () => {
      if (abortRef.current) abortRef.current.abort();
      detenerCola();
    };
  }, [cargarPedidosStream, detenerCola]);

  const getStatusTag = (status) => {
    switch (status) {
      case 'Aguardando Confirmación': return <Tag color="blue">Cotizado / Esperando</Tag>;
      case 'En procesamiento': return <Tag color="orange">En Proceso</Tag>;
      case 'Entregado': return <Tag color="green">Entregado (Facturado)</Tag>;
      case 'Recibido': return <Tag color="cyan">Recibido</Tag>;
      case 'Cancelado': return <Tag color="red">Cancelado</Tag>;
      default: return <Tag>{status || 'Desconocido'}</Tag>;
    }
  };

  const getMs = (dateStr) => {
    if (!dateStr) return 0;
    const d = dayjs(dateStr);
    if (d.isValid() && dateStr.toString().includes('-')) return d.valueOf();
    if (typeof dateStr === 'string' && dateStr.includes('/')) {
      const parts = dateStr.split(/[\s/:]+/);
      if (parts.length >= 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        const hour = parts[3] ? parseInt(parts[3], 10) : 0;
        const minute = parts[4] ? parseInt(parts[4], 10) : 0;
        return new Date(year, month, day, hour, minute).getTime();
      }
    }
    return 0;
  };

  const handleLimpiar = () => {
    setFiltros({ ...defaultFiltros });
    setAppliedFiltros({ ...defaultFiltros });
  };

  const handleFiltrar = () => {
    setAppliedFiltros({ ...filtros });
  };

  const pedidosFiltrados = pedidos.filter((p) => {
    const mMarca = normalizeString(appliedFiltros.marca);
    const mModelo = normalizeString(appliedFiltros.modelo);
    const mAnio = normalizeString(appliedFiltros.anio);
    const mRepuesto = normalizeString(appliedFiltros.repuesto);
    const mCotizacionId = normalizeString(appliedFiltros.cotizacionId);
    const mNumeroPedido = normalizeString(appliedFiltros.numeroPedido);
    const mEstado = appliedFiltros.estado;
    const mProvincia = appliedFiltros.provincia ? normalizeString(provincias.find(pr => pr.id === appliedFiltros.provincia)?.nombre) : '';
    const mCanton = appliedFiltros.canton ? normalizeString(cantones.find(c => c.id === appliedFiltros.canton)?.nombre) : '';

    const vMarca = normalizeString(getMarcaSegura(p));
    const vModelo = normalizeString(getModeloSeguro(p));
    const vAnio = normalizeString(getAnioSeguro(p));
    const vCotizacionId = normalizeString(p.cotizacionId || '');
    const vNumeroPedido = normalizeString(p.numeroPedido || '');
    const vProvincia = normalizeString(getProvinciaSegura(p));
    const vCanton = normalizeString(getCantonSeguro(p));

    const matchMarca = !mMarca || vMarca.includes(mMarca);
    const matchModelo = !mModelo || vModelo.includes(mModelo);
    const matchAnio = !mAnio || vAnio.includes(mAnio);
    const matchCotizacionId = !mCotizacionId || vCotizacionId.includes(mCotizacionId);
    const matchNumeroPedido = !mNumeroPedido || vNumeroPedido.includes(mNumeroPedido);
    const matchEstado = !mEstado || p.estado === mEstado;
    const matchProvincia = !mProvincia || vProvincia.includes(mProvincia);
    const matchCanton = !mCanton || vCanton.includes(mCanton);

    const matchRepuesto = !mRepuesto || (Array.isArray(p.items) && p.items.some(r =>
      normalizeString(r.descripcion).includes(mRepuesto) ||
      normalizeString(r.tipoPieza).includes(mRepuesto)
    ));

    if (!matchMarca || !matchModelo || !matchAnio || !matchCotizacionId || !matchNumeroPedido || !matchRepuesto || !matchEstado || !matchProvincia || !matchCanton) return false;

    if (appliedFiltros.desde && appliedFiltros.hasta) {
      const pDate = getMs(p.fecha || p.fechaCreacion);
      if (pDate > 0) {
        const start = appliedFiltros.desde.startOf('day').valueOf();
        const end = appliedFiltros.hasta.endOf('day').valueOf();
        if (pDate < start || pDate > end) return false;
      }
    }
    return true;
  }).sort((a, b) => {
    const valA = a.fecha || a.fechaCreacion;
    const valB = b.fecha || b.fechaCreacion;
    return getMs(valB) - getMs(valA);
  });

  const handleExportar = () => {
    if (!pedidosFiltrados.length) {
      message.warning('No hay pedidos cargados para exportar');
      return;
    }

    const wb = XLSX.utils.book_new();
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

    const pedHeaders = ['No. Pedido', 'Cotizacion ID', 'Marca', 'Modelo', 'Año', 'Provincia', 'Cantón', 'Total', 'Estado', 'Fecha'];
    const pedData = pedidosFiltrados.map((row) => ({
      'No. Pedido': row.numeroPedido || '',
      'Cotizacion ID': row.cotizacionId || '',
      'Marca': getMarcaSegura(row),
      'Modelo': getModeloSeguro(row),
      'Año': getAnioSeguro(row),
      'Provincia': getProvinciaSegura(row),
      'Cantón': getCantonSeguro(row),
      'Total': row.totalPedido || 0,
      'Estado': row.estado || '',
      'Fecha': row.fecha || (row.fechaCreacion ? dayjs(row.fechaCreacion).format('DD/MM/YYYY HH:mm') : ''),
    }));

    const wsPed = XLSX.utils.json_to_sheet(pedData, { header: pedHeaders });
    wsPed['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 20 }];
    pedHeaders.forEach((_, ci) => {
      const addr = XLSX.utils.encode_cell({ r: 0, c: ci });
      if (wsPed[addr]) wsPed[addr].s = hdrStyle('0F172A');
    });

    // Format 'Total' column as currency in Pedidos
    const totalColIdx = pedHeaders.indexOf('Total');
    if (totalColIdx !== -1) {
      for (let R = 1; R <= pedData.length; ++R) {
        const addr = XLSX.utils.encode_cell({ r: R, c: totalColIdx });
        if (wsPed[addr]) wsPed[addr].z = '"₡"#,##0.00';
      }
    }

    XLSX.utils.book_append_sheet(wb, wsPed, 'Pedidos');

    const repHeaders = ['Detalle (Pedido / Repuesto)', 'Tipo Pieza', 'Días Entrega', 'Cantidad', 'Precio Ofrecido'];
    const repuestosData = [];
    const repBlockMap = [];
    const repRowMeta = [{ hpt: 22 }]; // fila 0 = cabecera
    let blockIdx = -1;

    pedidosFiltrados.forEach((row) => {
      const items = row.items || [];
      if (items.length === 0) return;
      blockIdx++;

      // Fila resumen
      repuestosData.push({
        'Detalle (Pedido / Repuesto)': `▼ Pedido: ${row.numeroPedido || 'S/N'} | Cot: ${row.cotizacionId || 'S/N'} (${items.length} piezas)`,
        'Tipo Pieza': '',
        'Días Entrega': '',
        'Cantidad': '',
        'Precio Ofrecido': row.totalPedido || 0,
      });
      repBlockMap.push({ blockIdx, isSummary: true });
      repRowMeta.push({ hpt: 20 }); // NO grouped

      // Filas detalle
      items.forEach((item, idx) => {
        repuestosData.push({
          'Detalle (Pedido / Repuesto)': item.descripcion || '',
          'Tipo Pieza': item.tipoPieza || '',
          'Días Entrega': item.diasEntrega || '',
          'Cantidad': item.cantidad || 0,
          'Precio Ofrecido': item.precioOfrecido || 0,
        });
        repBlockMap.push({ blockIdx, isSummary: false });
        repRowMeta.push({ level: 1, hpt: 18, hidden: true }); // Colapsado por defecto
      });
    });

    if (repuestosData.length > 0) {
      const wsRep = XLSX.utils.json_to_sheet(repuestosData, { header: repHeaders });
      wsRep['!cols'] = [{ wch: 60 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];
      wsRep['!sheetPr'] = { outlinePr: { summaryBelow: 0, summaryRight: 0 } };

      const PASTEL_LIGHT = ['DBEAFE', 'DCFCE7', 'FEF9C3', 'F3E8FF'];
      const PASTEL_MEDIUM = ['BFDBFE', 'A7F3D0', 'FDE68A', 'DDD6FE'];
      const summaryStyleLight = (bIdx) => ({
        font: { bold: false, sz: 11, color: { rgb: '1E293B' } },
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

      repHeaders.forEach((_, ci) => {
        const addr = XLSX.utils.encode_cell({ r: 0, c: ci });
        if (wsRep[addr]) wsRep[addr].s = hdrStyle('065F46');
      });

      const precioColIdx = repHeaders.indexOf('Precio Ofrecido');

      repBlockMap.forEach(({ blockIdx: bi, isSummary }, di) => {
        const ri = di + 1;
        repHeaders.forEach((_, ci) => {
          const addr = XLSX.utils.encode_cell({ r: ri, c: ci });
          if (wsRep[addr]) {
            wsRep[addr].s = isSummary ? summaryStyleLight(bi) : detailStyle(bi);
            if (ci === precioColIdx && typeof wsRep[addr].v === 'number') {
              wsRep[addr].z = '"₡"#,##0.00';
            }
          }
        });
      });

      wsRep['!rows'] = repRowMeta;
      XLSX.utils.book_append_sheet(wb, wsRep, 'Repuestos');
    }

    XLSX.writeFile(wb, `pedidos_audatex_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`);
    message.success(`Excel exportado — ${pedidosFiltrados.length} pedidos, ${repuestosData.length} repuestos`);
  };

  const columns = [
    { title: 'No. Pedido', dataIndex: 'numeroPedido', key: 'numeroPedido', render: (text) => text || '-' },
    { title: 'Cotización ID', dataIndex: 'cotizacionId', key: 'cotizacionId', render: (text) => <Typography.Text copyable>{text}</Typography.Text> },
    { title: 'Marca', key: 'marca', render: (_, record) => getMarcaSegura(record) },
    { title: 'Modelo', key: 'modelo', render: (_, record) => getModeloSeguro(record) },
    { title: 'Año', key: 'anio', render: (_, record) => getAnioSeguro(record) },
    { title: 'Provincia', key: 'provincia', render: (_, record) => getProvinciaSegura(record) },
    { title: 'Cantón', key: 'canton', render: (_, record) => getCantonSeguro(record) },
    { title: 'Total (₡)', dataIndex: 'totalPedido', key: 'totalPedido', render: (val) => val ? `₡${new Intl.NumberFormat('es-CR').format(val)}` : '-', align: 'right' },
    { title: 'Estado', dataIndex: 'estado', key: 'estado', render: getStatusTag },
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', render: (val, record) => val || (record.fechaCreacion ? dayjs(record.fechaCreacion).format('DD/MM/YYYY HH:mm') : '-') }
  ];



  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Space>
          <Title level={3} style={{ margin: 0 }}>Pedidos Audatex InPart</Title>
          {syncing && <Tag icon={<SyncOutlined spin />} color="processing">Sincronizando...</Tag>}
          {streaming && <Tag icon={<LoadingOutlined spin />} color="orange">Streaming...</Tag>}
          <Text type="secondary">{pedidosFiltrados.length} pedidos</Text>
        </Space>
        <Space>
          {streaming && (
            <Button danger onClick={handleDetener} icon={<LoadingOutlined spin />}>
              Detener
            </Button>
          )}
          <Button type="default" icon={<ReloadOutlined />} onClick={() => cargarPedidosStream({ triggerSync: true })} disabled={streaming && pedidos.length === 0} style={{ color: '#1890ff', borderColor: '#1890ff' }}>
            Refrescar
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportar} style={{ background: '#52c41a', borderColor: '#52c41a' }}>
            Exportar Excel
          </Button>
        </Space>
      </div>

      <Card bordered={false} style={{ marginBottom: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)', background: '#ffffff' }} bodyStyle={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mostrarFiltros ? '20px' : '0' }}>
          <Title level={5} style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setMostrarFiltros(!mostrarFiltros)}>
            <FilterOutlined style={{ marginRight: '8px', color: '#3b82f6' }} />
            Filtros de Búsqueda
            {mostrarFiltros ? <UpOutlined style={{ marginLeft: '8px', fontSize: '12px', color: '#94a3b8' }} /> : <DownOutlined style={{ marginLeft: '8px', fontSize: '12px', color: '#94a3b8' }} />}
          </Title>
          <Space>
            <Button onClick={handleLimpiar} style={{ borderRadius: '8px' }}>Limpiar</Button>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleFiltrar} style={{ borderRadius: '8px', background: '#3b82f6' }}>Filtrar</Button>
          </Space>
        </div>

        {mostrarFiltros && (
          <Row gutter={[16, 20]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Marca</div>
              <Input placeholder="Ej: Toyota" value={filtros.marca} onChange={(e) => setFiltros({ ...filtros, marca: e.target.value })} style={{ width: '100%', borderRadius: '8px' }} prefix={<FilterOutlined style={{ color: '#cbd5e1' }} />} allowClear />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Modelo</div>
              <Input placeholder="Ej: Yaris" value={filtros.modelo} onChange={(e) => setFiltros({ ...filtros, modelo: e.target.value })} style={{ width: '100%', borderRadius: '8px' }} prefix={<FilterOutlined style={{ color: '#cbd5e1' }} />} allowClear />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Año</div>
              <Input placeholder="Ej: 2020" value={filtros.anio} onChange={(e) => setFiltros({ ...filtros, anio: e.target.value })} style={{ width: '100%', borderRadius: '8px' }} prefix={<FilterOutlined style={{ color: '#cbd5e1' }} />} allowClear />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Repuesto</div>
              <Input placeholder="Ej: Bumper" value={filtros.repuesto} onChange={(e) => setFiltros({ ...filtros, repuesto: e.target.value })} style={{ width: '100%', borderRadius: '8px' }} prefix={<FilterOutlined style={{ color: '#cbd5e1' }} />} allowClear />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Cotización ID</div>
              <Input placeholder="Ej: C-12345" value={filtros.cotizacionId} onChange={(e) => setFiltros({ ...filtros, cotizacionId: e.target.value })} style={{ width: '100%', borderRadius: '8px' }} prefix={<FilterOutlined style={{ color: '#cbd5e1' }} />} allowClear />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>No. Pedido</div>
              <Input placeholder="Ej: 9876" value={filtros.numeroPedido} onChange={(e) => setFiltros({ ...filtros, numeroPedido: e.target.value })} style={{ width: '100%', borderRadius: '8px' }} prefix={<FilterOutlined style={{ color: '#cbd5e1' }} />} allowClear />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Provincia</div>
              <Select placeholder="Seleccione" allowClear loading={loadingProvincias} value={filtros.provincia} onChange={(val) => setFiltros({ ...filtros, provincia: val, canton: null })} style={{ width: '100%' }} options={provincias.map(p => ({ value: p.id, label: p.nombre }))} />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Cantón</div>
              <Select placeholder="Seleccione" allowClear loading={loadingCantones} disabled={!filtros.provincia} value={filtros.canton} onChange={(val) => setFiltros({ ...filtros, canton: val })} style={{ width: '100%' }} options={cantones.map(c => ({ value: c.id, label: c.nombre }))} />
            </Col>
            <Col xs={24} sm={12} md={8} lg={8}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Estado</div>
              <Select
                placeholder="Todos los estados"
                allowClear
                value={filtros.estado}
                onChange={(val) => setFiltros({ ...filtros, estado: val })}
                style={{ width: '100%' }}
                options={[
                  { value: 'Aguardando Confirmación', label: 'Cotizado / Esperando' },
                  { value: 'En procesamiento', label: 'En Proceso' },
                  { value: 'Entregado', label: 'Entregado (Facturado)' },
                  { value: 'Recibido', label: 'Recibido' },
                  { value: 'Cancelado', label: 'Cancelado' }
                ]}
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
          </Row>
        )}
      </Card>

      <Card bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={pedidosFiltrados}
          rowKey={(r) => r._key ?? r.id ?? r.wan ?? r.cotizacionId}
          loading={loading}
          pagination={{ pageSize: 15 }}
          scroll={{ x: 'max-content' }}
          expandable={{
            rowExpandable: (record) => {
              return Array.isArray(record.items) && record.items.length > 0;
            },
            expandedRowRender: (record) => {
              const items = record.items || [];
              const d = getDetalleJson(record);

              const generalDatos = [
                ['Aseguradora', record.aseguradora || d['aseguradora'] || d['Aseguradora'] || '-'],
                ['Siniestro', record.siniestro || d['siniestro'] || d['Siniestro'] || '-'],
                ['Fecha Creado', record.fecha || (record.fechaCreacion ? dayjs(record.fechaCreacion).format('DD/MM/YYYY HH:mm') : '-')]
              ].filter(([_, v]) => v !== '-');

              const vehiculoDatos = [
                ['Marca', getMarcaSegura(record)],
                ['Modelo', getModeloSeguro(record)],
                ['Año', getAnioSeguro(record)],
                ['VIN', record.vin || d['VIN'] || d['Vin'] || d['vin'] || '-'],
                ['Placa/Matrícula', record.matricula || d['matricula'] || d['Matricula'] || d['Placa'] || '-'],
              ].filter(([_, v]) => v !== '-');

              const tallerDatos = [
                ['Taller', record.taller || d['taller'] || d['Taller'] || d['Centro de Reparación'] || '-'],
                ['Provincia', getProvinciaSegura(record)],
                ['Cantón', getCantonSeguro(record)],
                ['Dirección', record.direccion || d['direccion'] || d['Direccion'] || d['Colonia'] || '-'],
                ['Teléfono', record.telefono || d['telefono'] || d['Telefono'] || '-'],
              ].filter(([_, v]) => v && v !== '-');

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

              const repuestosTab = (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: '8px' }}>
                  <thead>
                    <tr style={{ background: '#EFF6FF', color: '#1e40af', textAlign: 'left' }}>
                      <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Descripción</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Tipo Pieza</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Días Entrega</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Cantidad</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Precio Ofrecido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: '8px', textAlign: 'center', color: '#94a3b8' }}>No hay repuestos registrados</td></tr>
                    ) : items.map((item, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#F8FAFC' : '#FFFFFF' }}>
                        <td style={{ padding: '4px 8px', borderBottom: '1px solid #f1f5f9' }}>{item.descripcion || '-'}</td>
                        <td style={{ padding: '4px 8px', borderBottom: '1px solid #f1f5f9' }}>{item.tipoPieza || '-'}</td>
                        <td style={{ padding: '4px 8px', borderBottom: '1px solid #f1f5f9' }}>{item.diasEntrega ? `${item.diasEntrega} días` : '-'}</td>
                        <td style={{ padding: '4px 8px', borderBottom: '1px solid #f1f5f9' }}>{item.cantidad}</td>
                        <td style={{ padding: '4px 8px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>₡{new Intl.NumberFormat('es-CR').format(item.precioOfrecido)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );

              return (
                <div style={{ margin: '10px 30px', background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                  <Tabs
                    defaultActiveKey="1"
                    items={[
                      { key: '1', label: 'Repuestos Cotizados', children: repuestosTab },
                      { key: '2', label: 'Datos Siniestro e Entrega', children: datosTab }
                    ]}
                  />
                </div>
              );
            }
          }}
        />
      </Card>
    </div>
  );
};

export default PedidosAudatex;
