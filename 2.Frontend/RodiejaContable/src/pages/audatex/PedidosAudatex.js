import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Table, Typography, Tag, Button, message, Space, Input, DatePicker, Row, Col, Select } from 'antd';
import { ReloadOutlined, SyncOutlined, LoadingOutlined, SearchOutlined, StopOutlined, DownloadOutlined, FilterOutlined } from '@ant-design/icons';
import { audatexAPI } from '../../api/audatex';
import finanzasService from '../../api/finanzas';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx-js-style';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const getSafeString = (val) => (val && val !== 'null' && val !== '-' ? val.trim() : '');

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
  estado: null,
  desde: dayjs().subtract(30, 'day'),
  hasta: dayjs(),
};

const PedidosAudatex = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [facturando, setFacturando] = useState({});
  const [filtros, setFiltros] = useState({ ...defaultFiltros });
  const [appliedFiltros, setAppliedFiltros] = useState({ ...defaultFiltros });

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

  // ── Carga principal: BD instantánea + SSE deltas ─────────────────────────
  const cargarPedidosStream = useCallback(async (options = {}) => {
    const { triggerSync = false } = options;
    if (abortRef.current) abortRef.current.abort();
    detenerCola();
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    streamReaderDoneRef.current = false;

    const token = localStorage.getItem('token');

    // 1. Carga instantánea desde BD
    try {
      setLoading(true);
      const response = await audatexAPI.obtenerPedidos();
      aplicarDatosBd(response.data?.pedidos || []);
    } catch (e) {
      console.warn('Fallo en GET inicial de pedidos', e);
    } finally {
      setLoading(false);
    }

    // 2. Sync incremental en background
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

    // 3. SSE para deltas — en background
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
              } catch (_) { /* ignore malformed SSE chunk */ }
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

  // ── Mount ────────────────────────────────────────
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    cargarPedidosStream({ triggerSync: true });
    return () => {
      if (abortRef.current) abortRef.current.abort();
      detenerCola();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFacturar = async (pedidoId) => {
    try {
      setFacturando((prev) => ({ ...prev, [pedidoId]: true }));
      await finanzasService.facturarPedidoAudatex(pedidoId);
      message.success('Pedido facturado exitosamente. Se generó la transacción financiera.');
      cargarPedidosStream();
    } catch (error) {
      console.error('Error al facturar pedido:', error);
      message.error(error.message || 'Error al intentar facturar el pedido');
    } finally {
      setFacturando((prev) => ({ ...prev, [pedidoId]: false }));
    }
  };

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

  // Función robusta para parsear la fecha ya sea ISO o DD/MM/YYYY
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

  // Filtrado local por búsqueda y ordenamiento por fecha descendente
  const pedidosFiltrados = pedidos.filter((p) => {
    const mMarca = normalizeString(appliedFiltros.marca);
    const mModelo = normalizeString(appliedFiltros.modelo);
    const mAnio = normalizeString(appliedFiltros.anio);
    const mRepuesto = normalizeString(appliedFiltros.repuesto);
    const mCotizacionId = normalizeString(appliedFiltros.cotizacionId);
    const mNumeroPedido = normalizeString(appliedFiltros.numeroPedido);
    const mEstado = appliedFiltros.estado;

    const vVehiculo = normalizeString(p.vehiculo || '');
    const vArmadora = normalizeString(p.armadora || '');
    const vCotizacionId = normalizeString(p.cotizacionId || '');
    const vNumeroPedido = normalizeString(p.numeroPedido || '');

    const matchMarca = !mMarca || vArmadora.includes(mMarca) || vVehiculo.includes(mMarca);
    const matchModelo = !mModelo || vVehiculo.includes(mModelo);
    const matchAnio = !mAnio || vVehiculo.includes(mAnio);
    const matchCotizacionId = !mCotizacionId || vCotizacionId.includes(mCotizacionId);
    const matchNumeroPedido = !mNumeroPedido || vNumeroPedido.includes(mNumeroPedido);
    const matchEstado = !mEstado || p.estado === mEstado;

    const matchRepuesto = !mRepuesto || (Array.isArray(p.items) && p.items.some(r => 
      normalizeString(r.descripcion).includes(mRepuesto) || 
      normalizeString(r.tipoPieza).includes(mRepuesto)
    ));

    if (!matchMarca || !matchModelo || !matchAnio || !matchCotizacionId || !matchNumeroPedido || !matchRepuesto || !matchEstado) return false;
    
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
    
    // Hoja 1: Pedidos
    const pedHeaders = ['No. Pedido', 'Cotizacion ID', 'Aseguradora', 'Siniestro', 'Vehiculo', 'Total', 'Estado', 'Fecha'];
    const pedData = pedidosFiltrados.map((row) => ({
      'No. Pedido': row.numeroPedido || '',
      'Cotizacion ID': row.cotizacionId || '',
      'Aseguradora': row.aseguradora || '',
      'Siniestro': row.siniestro || '',
      'Vehiculo': row.vehiculo || (row.armadora ? `${row.armadora} - ${row.matricula || ''}` : ''),
      'Total': row.totalPedido || 0,
      'Estado': row.estado || '',
      'Fecha': row.fecha || (row.fechaCreacion ? dayjs(row.fechaCreacion).format('DD/MM/YYYY HH:mm') : ''),
    }));

    const wsPed = XLSX.utils.json_to_sheet(pedData, { header: pedHeaders });
    wsPed['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 35 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 20 }];
    pedHeaders.forEach((_, ci) => {
      const addr = XLSX.utils.encode_cell({ r: 0, c: ci });
      if (wsPed[addr]) wsPed[addr].s = hdrStyle('0F172A');
    });
    XLSX.utils.book_append_sheet(wb, wsPed, 'Pedidos');

    // Hoja 2: Repuestos
    const repHeaders = ['No. Pedido', 'Cotizacion ID', 'Descripción', 'Tipo Pieza', 'Días Entrega', 'Cantidad', 'Precio Ofrecido'];
    const repuestosData = [];
    
    pedidosFiltrados.forEach((row) => {
      const items = row.items || [];
      items.forEach((item) => {
        repuestosData.push({
          'No. Pedido': row.numeroPedido || '',
          'Cotizacion ID': row.cotizacionId || '',
          'Descripción': item.descripcion || '',
          'Tipo Pieza': item.tipoPieza || '',
          'Días Entrega': item.diasEntrega || '',
          'Cantidad': item.cantidad || 0,
          'Precio Ofrecido': item.precioOfrecido || 0,
        });
      });
    });

    if (repuestosData.length > 0) {
      const wsRep = XLSX.utils.json_to_sheet(repuestosData, { header: repHeaders });
      wsRep['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];
      repHeaders.forEach((_, ci) => {
        const addr = XLSX.utils.encode_cell({ r: 0, c: ci });
        if (wsRep[addr]) wsRep[addr].s = hdrStyle('065F46');
      });
      XLSX.utils.book_append_sheet(wb, wsRep, 'Repuestos');
    }

    XLSX.writeFile(wb, `pedidos_audatex_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`);
    message.success(`Excel exportado — ${pedidosFiltrados.length} pedidos, ${repuestosData.length} repuestos`);
  };

  const columns = [
    {
      title: 'No. Pedido',
      dataIndex: 'numeroPedido',
      key: 'numeroPedido',
      render: (text) => text || '-',
    },
    {
      title: 'Cotización ID',
      dataIndex: 'cotizacionId',
      key: 'cotizacionId',
      render: (text) => <Typography.Text copyable>{text}</Typography.Text>
    },
    {
      title: 'Aseguradora',
      dataIndex: 'aseguradora',
      key: 'aseguradora',
    },
    {
      title: 'Siniestro',
      dataIndex: 'siniestro',
      key: 'siniestro',
    },
    {
      title: 'Vehículo',
      dataIndex: 'vehiculo',
      key: 'vehiculo',
      render: (text, record) => {
        if (text) return text;
        if (record.armadora && record.matricula) return `${record.armadora} - ${record.matricula}`;
        return record.armadora || '-';
      },
    },
    {
      title: 'Total (₡)',
      dataIndex: 'totalPedido',
      key: 'totalPedido',
      render: (val) => val ? `₡${new Intl.NumberFormat('es-CR').format(val)}` : '-',
      align: 'right'
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: getStatusTag,
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      render: (val, record) => {
        // Priorizar la fecha cruda del portal (val) si existe. Si no, fechaCreacion.
        if (val) return val;
        if (record.fechaCreacion) return dayjs(record.fechaCreacion).format('DD/MM/YYYY HH:mm');
        return '-';
      },
    }
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
          <Button icon={<DownloadOutlined />} onClick={handleExportar}>
            Exportar
          </Button>
          {streaming ? (
            <Button icon={<StopOutlined />} danger onClick={handleDetener}>Detener</Button>
          ) : (
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => cargarPedidosStream({ triggerSync: true })}
              loading={loading}
            >
              Sincronizar
            </Button>
          )}
        </Space>
      </div>

      <Card 
        bordered={false} 
        style={{ marginBottom: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)', background: '#ffffff' }}
        bodyStyle={{ padding: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <Title level={5} style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center' }}>
            <FilterOutlined style={{ marginRight: '8px', color: '#3b82f6' }} />
            Filtros de Búsqueda
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
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>Cotización ID</div>
            <Input
              placeholder="Ej: C-12345"
              value={filtros.cotizacionId}
              onChange={(e) => setFiltros({ ...filtros, cotizacionId: e.target.value })}
              style={{ width: '100%', borderRadius: '8px' }}
              prefix={<FilterOutlined style={{ color: '#cbd5e1' }} />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>No. Pedido</div>
            <Input
              placeholder="Ej: 9876"
              value={filtros.numeroPedido}
              onChange={(e) => setFiltros({ ...filtros, numeroPedido: e.target.value })}
              style={{ width: '100%', borderRadius: '8px' }}
              prefix={<FilterOutlined style={{ color: '#cbd5e1' }} />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
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
              return (
                <div style={{ margin: '10px 30px' }}>
                  <Typography.Text strong>Repuestos Cotizados</Typography.Text>
                  <table style={{ width: '100%', maxWidth: '900px', borderCollapse: 'collapse', fontSize: 13, marginTop: '8px' }}>
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
                      {items.map((item, i) => (
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
