import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card, Table, Button, DatePicker, Input, Space, Typography,
  message, Tag, Alert, Modal
} from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
  ReloadOutlined,
  FilterOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { audatexService } from '../../api';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx-js-style';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const defaultFiltros = {
  armadora: '',
  aseguradora: '',
  desde: dayjs().subtract(30, 'day'),
  hasta: dayjs(),
  minPendientes: null,
};

const OportunidadesAudatex = () => {
  const [oportunidades, setOportunidades] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [streamDone, setStreamDone] = useState(false);
  const [totalCargado, setTotalCargado] = useState(0);
  const [filtros, setFiltros] = useState({ ...defaultFiltros });
  const [appliedFiltros, setAppliedFiltros] = useState({ ...defaultFiltros });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [detalleModalVisible, setDetalleModalVisible] = useState(false);
  const [detalleCotizacion, setDetalleCotizacion] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const abortRef = useRef(null);
  const startedRef = useRef(false); // evita doble-mount de React StrictMode en dev
  const tableRef = useRef(null);
  const pendingQueueRef = useRef([]);
  const drainActiveRef = useRef(false);
  const keyCounterRef = useRef(0);
  const streamReaderDoneRef = useRef(false);

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
    setOportunidades(prev => {
      if (prev.some(o => o.cotizacionId === item.cotizacionId)) return prev;
      return [...prev, { ...item, _key: keyCounterRef.current++ }];
    });
    setTotalCargado(c => c + 1);
    setTimeout(tick, INTERVALO_FILA_MS);
  }, [finalizarStreamSiColaVacia]);

  const encolarOportunidad = useCallback((item) => {
    if (!item?.cotizacionId) return;
    pendingQueueRef.current.push(item);
    if (!drainActiveRef.current) {
      drainActiveRef.current = true;
      drenarSiguiente();
    }
  }, [drenarSiguiente]);

  // ── Streaming con fetch + ReadableStream ──────────────────────────────────
  const cargarOportunidadesStream = useCallback(async (currentFilters = appliedFiltros) => {
    // Cancelar stream anterior si existe
    if (abortRef.current) abortRef.current.abort();
    detenerCola();
    const controller = new AbortController();
    abortRef.current = controller;

    setOportunidades([]);
    setTotalCargado(0);
    setStreamDone(false);
    setStreaming(true);
    setCurrentPage(1);
    streamReaderDoneRef.current = false;

    const params = new URLSearchParams();
    if (currentFilters.armadora) params.set('armadora', currentFilters.armadora);
    if (currentFilters.aseguradora) params.set('aseguradora', currentFilters.aseguradora);
    if (currentFilters.desde) params.set('desde', currentFilters.desde.format('YYYY-MM-DD'));
    if (currentFilters.hasta) params.set('hasta', currentFilters.hasta.format('YYYY-MM-DD'));
    if (currentFilters.minPendientes) params.set('minPendientes', currentFilters.minPendientes);

    const token = localStorage.getItem('token');
    const url = `http://localhost:8080/api/audatex/oportunidades/stream?${params.toString()}`;

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
        buffer = lines.pop(); // la última línea podría estar incompleta

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            const raw = line.slice(5).trim();
            try {
              const parsed = JSON.parse(raw);
              if (eventName === 'oportunidad') {
                encolarOportunidad(parsed);
              } else if (eventName === 'pagina') {
                const lote = Array.isArray(parsed) ? parsed : [parsed];
                lote.forEach(encolarOportunidad);
              } else if (eventName === 'done') {
                setStreamDone(true);
                message.success({
                  content: `✓ Todas las oportunidades cargadas — ${parsed.total} en total`,
                  icon: <CheckCircleOutlined />,
                  duration: 5,
                });
              } else if (eventName === 'error') {
                message.error(`Error del portal: ${parsed.error}`);
              }
              eventName = '';
            } catch (_) { }
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error streaming oportunidades:', err);
        message.error('Error al conectar con el portal Audatex');
      }
    } finally {
      streamReaderDoneRef.current = true;
      finalizarStreamSiColaVacia();
      abortRef.current = null;
    }
  }, [appliedFiltros, detenerCola, encolarOportunidad, finalizarStreamSiColaVacia]);

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
    font:   { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    fill:   { fgColor: { rgb: bgHex } },
    border: {
      top:    { style: 'thin', color: { rgb: 'CCCCCC' } },
      bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
      left:   { style: 'thin', color: { rgb: 'CCCCCC' } },
      right:  { style: 'thin', color: { rgb: 'CCCCCC' } },
    },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  });




  // Estilo de bloque por cotizacionId — paleta de 4 colores alternados
  const BLOCK_PALETTES = ['DBEAFE', 'DCFCE7', 'FEF9C3', 'F3E8FF']; // azul/verde/amarillo/lila
  const blockRowStyle = (blockIdx) => ({
    fill: { fgColor: { rgb: BLOCK_PALETTES[blockIdx % BLOCK_PALETTES.length] } },
    border: {
      top:    { style: 'hair', color: { rgb: 'C7D2DB' } },
      bottom: { style: 'hair', color: { rgb: 'C7D2DB' } },
      left:   { style: 'thin', color: { rgb: 'A3B4C6' } },
      right:  { style: 'thin', color: { rgb: 'A3B4C6' } },
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

  // ── Exportar Excel — 2 hojas: Oportunidades + Repuestos ─────────────────
  const handleExportar = () => {
    if (!oportunidades.length) {
      message.warning('No hay oportunidades cargadas para exportar');
      return;
    }

    const wb = XLSX.utils.book_new();

    // ── Hoja 1: Oportunidades — azul corporativo ──────────────────────────
    const oportHeaders = ['Cotizacion ID','Aseguradora','Taller','Poliza','Siniestro','Matricula','Armadora','Fecha','Pendientes','Total Repuestos'];
    const oportData = oportunidades.map(({ _key, repuestos, ...row }) => ({
      'Cotizacion ID':    row.cotizacionId    ?? '',
      'Aseguradora':      row.aseguradora     ?? '',
      'Taller':           row.taller          ?? '',
      'Poliza':           row.poliza          ?? '',
      'Siniestro':        row.siniestro       ?? '',
      'Matricula':        row.matricula       ?? '',
      'Armadora':         row.armadora        ?? '',
      'Fecha':            row.fechaCotizacion ?? '',
      'Pendientes':       row.pendientes      ?? 0,
      'Total Repuestos':  Array.isArray(repuestos) ? repuestos.length : 0,
    }));
    const wsOport = XLSX.utils.json_to_sheet(oportData, { header: oportHeaders });
    wsOport['!cols'] = [
      { wch: 20 }, { wch: 22 }, { wch: 30 }, { wch: 18 }, { wch: 18 },
      { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 15 },
    ];
    applyBlockStyles(wsOport, oportHeaders, '1D4ED8', oportData.map((_, i) => i));
    XLSX.utils.book_append_sheet(wb, wsOport, 'Oportunidades');

    // ── Hoja 2: Repuestos — con grupos desplegables por Cotizacion ID ──────
    const repHeaders = ['Cotizacion ID','Aseguradora','Taller','#','Grupo Pieza','PartNumber','Part Serial Number','Descripcion Pieza'];
    const repuestosData = [];
    const repBlockMap   = [];
    const repRowMeta    = [{ hpt: 22 }]; // fila 0 = cabecera

    let blockIdx = -1;
    let lastCotizId = null;

    oportunidades.forEach(({ repuestos, cotizacionId, taller, aseguradora }) => {
      if (!Array.isArray(repuestos) || repuestos.length === 0) return;
      if (cotizacionId !== lastCotizId) { blockIdx++; lastCotizId = cotizacionId; }

      // Fila resumen (siempre visible, muestra el +/-)
      repuestosData.push({
        'Cotizacion ID':      `▼ ${cotizacionId ?? ''}`,
        'Aseguradora':        aseguradora ?? '',
        'Taller':             taller ?? '',
        '#':                  `${repuestos.length} pza`,
        'Grupo Pieza':        '',
        'PartNumber':         '',
        'Part Serial Number': '',
        'Descripcion Pieza':  '',
      });
      repBlockMap.push({ blockIdx, isSummary: true });
      repRowMeta.push({ hpt: 20 }); // fila resumen, NO grouped

      // Filas de detalle (colapsables)
      repuestos.forEach((rep, idx) => {
        repuestosData.push({
          'Cotizacion ID':       '',
          'Aseguradora':         '',
          'Taller':              '',
          '#':                   idx + 1,
          'Grupo Pieza':         rep['Grupo Pieza']        ?? '',
          'PartNumber':          rep['PartNumber']          ?? '',
          'Part Serial Number':  rep['Part Serial Number'] ?? '',
          'Descripcion Pieza':   rep['Descripcion Pieza']  ?? '',
        });
        repBlockMap.push({ blockIdx, isSummary: false });
        repRowMeta.push({ level: 1, hpt: 18, hidden: true }); // colapsado por defecto
      });
    });

    if (repuestosData.length > 0) {
      const wsRep = XLSX.utils.json_to_sheet(repuestosData, { header: repHeaders });
      wsRep['!cols'] = [
        { wch: 24 }, { wch: 22 }, { wch: 30 }, { wch: 8 },
        { wch: 14 }, { wch: 20 }, { wch: 32 }, { wch: 38 },
      ];
      // Grupos arriba del detalle (summaryBelow: false)
      wsRep['!sheetPr'] = { outlinePr: { summaryBelow: 0, summaryRight: 0 } };

      // ── Estilos por fila ─────────────────────────────────────────────────
      // Paleta compartida con hoja Oportunidades
      const PASTEL_LIGHT  = ['DBEAFE','DCFCE7','FEF9C3','F3E8FF']; // igual a Oportunidades
      const PASTEL_MEDIUM = ['BFDBFE','A7F3D0','FDE68A','DDD6FE']; // tono medio para resumen
      const summaryStyleLight = (bIdx) => ({
        font:  { bold: false, sz: 11, color: { rgb: '1E293B' } },  // texto oscuro
        fill:  { fgColor: { rgb: PASTEL_MEDIUM[bIdx % 4] } },
        border: {
          top:    { style: 'thin', color: { rgb: '94A3B8' } },
          bottom: { style: 'thin', color: { rgb: '94A3B8' } },
          left:   { style: 'thin', color: { rgb: '94A3B8' } },
          right:  { style: 'thin', color: { rgb: '94A3B8' } },
        },
        alignment: { vertical: 'center' },
      });
      const detailStyle = (bIdx) => ({
        fill:   { fgColor: { rgb: PASTEL_LIGHT[bIdx % 4] } },
        border: {
          top:    { style: 'hair', color: { rgb: 'D1D5DB' } },
          bottom: { style: 'hair', color: { rgb: 'D1D5DB' } },
          left:   { style: 'hair', color: { rgb: 'CBD5E1' } },
          right:  { style: 'hair', color: { rgb: 'CBD5E1' } },
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
    message.success(`Excel exportado — ${oportunidades.length} oportunidades, ${repuestosData.length} repuestos${nota}`);
  };

  // ── Invalidar caché y recargar ────────────────────────────────────────────
  const handleSincronizar = async () => {
    try {
      await audatexService.invalidarCache();
      message.info('Caché invalidado. Iniciando carga...');
      cargarOportunidadesStream(appliedFiltros);
    } catch (err) {
      console.error('Error invalidando caché:', err);
      message.error('Error al invalidar el caché');
    }
  };

  const handleFiltrar = () => {
    const nuevos = { ...filtros };
    setAppliedFiltros(nuevos);
    cargarOportunidadesStream(nuevos);
  };

  const handleLimpiar = () => {
    setFiltros({ ...defaultFiltros });
    setAppliedFiltros({ ...defaultFiltros });
    cargarOportunidadesStream({ ...defaultFiltros });
  };

  const handleVerDetalle = async (cotizacionId, record) => {
    setCargandoDetalle(true);
    setDetalleModalVisible(true);
    setDetalleCotizacion(null);

    // Si el record ya trae repuestos del stream, usarlos sin fetch adicional
    if (record && record.repuestos !== undefined) {
      const wan = record.wan || cotizacionId;
      const repuestos = record.repuestos || [];
      const detalle = {
        wan,
        tablas: repuestos.length > 0
          ? [{ id: 'Lista de Repuestos', data: repuestos }]
          : [],
      };
      setDetalleCotizacion(detalle);
      setCargandoDetalle(false);
      return;
    }

    // Fallback: fetch al backend (para items sin repuestos embebidos)
    try {
      const token = localStorage.getItem('token');
      const wan = record?.wan || cotizacionId;
      const response = await fetch(`http://localhost:8080/api/audatex/oportunidades/${encodeURIComponent(wan)}/detalle`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al obtener detalle');
      const data = await response.json();
      setDetalleCotizacion(data);
    } catch (err) {
      console.error(err);
      message.error('No se pudo cargar el detalle de la cotización');
      setDetalleModalVisible(false);
    } finally {
      setCargandoDetalle(false);
    }
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
    cargarOportunidadesStream();
    return () => {
      startedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
      detenerCola();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Columnas ──────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Aseguradora', dataIndex: 'aseguradora', key: 'aseguradora',
      sorter: (a, b) => (a.aseguradora || '').localeCompare(b.aseguradora || '')
    },
    { title: 'Cotización ID', dataIndex: 'cotizacionId', key: 'cotizacionId' },
    { title: 'Taller', dataIndex: 'taller', key: 'taller' },
    { title: 'Póliza', dataIndex: 'poliza', key: 'poliza' },
    { title: 'Siniestro', dataIndex: 'siniestro', key: 'siniestro' },
    { title: 'Matrícula', dataIndex: 'matricula', key: 'matricula' },
    {
      title: 'Armadora', dataIndex: 'armadora', key: 'armadora',
      sorter: (a, b) => (a.armadora || '').localeCompare(b.armadora || '')
    },
    {
      title: 'Fecha', dataIndex: 'fechaCotizacion', key: 'fechaCotizacion',
      sorter: (a, b) => (a.fechaCotizacion || '').localeCompare(b.fechaCotizacion || '')
    },
    {
      title: 'Pendientes', dataIndex: 'pendientes', key: 'pendientes',
      sorter: (a, b) => (a.pendientes || 0) - (b.pendientes || 0),
      render: (v) => (
        <Tag color={v > 0 ? 'orange' : 'green'} style={{ fontWeight: 'bold' }}>{v}</Tag>
      ),
    },
    {
      title: 'Repuestos', key: 'repuestos',
      render: (_, record) => {
        const count = record.repuestos?.length ?? '…';
        const color = typeof count === 'number' && count > 0 ? 'blue' : 'default';
        return <Tag color={color}>{typeof count === 'number' ? `${count} pza` : count}</Tag>;
      }
    },
    {
      title: 'Acciones', key: 'acciones',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          size="small"
          onClick={() => handleVerDetalle(record.wan || record.cotizacionId, record)}
        >
          Detalle
        </Button>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>

      {/* Encabezado */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>Oportunidades Audatex InPart</Title>
        <Space>
          {streaming && (
            <Button danger onClick={handleDetener} icon={<LoadingOutlined spin />}>
              Detener
            </Button>
          )}
          <Button icon={<ReloadOutlined />} onClick={handleSincronizar} disabled={streaming}>
            Sincronizar
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportar}>
            Exportar Excel
          </Button>
        </Space>
      </div>

      {/* Barra de progreso mientras carga */}
      {streaming && (
        <Alert
          style={{ marginBottom: '12px' }}
          type="info"
          icon={<LoadingOutlined spin />}
          showIcon
          message={
            <span>
              Cargando oportunidades desde el portal…{' '}
              <strong>{totalCargado}</strong> cargadas hasta ahora
            </span>
          }
        />
      )}
      {streamDone && !streaming && (
        <Alert
          style={{ marginBottom: '12px' }}
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message={`Carga completa — ${totalCargado} oportunidades disponibles`}
          closable
        />
      )}

      {/* Filtros */}
      <Card style={{ marginBottom: '16px' }}>
        <Space size="middle" wrap>
          <Input
            placeholder="Filtrar por armadora"
            value={filtros.armadora}
            onChange={(e) => setFiltros({ ...filtros, armadora: e.target.value })}
            style={{ width: 200 }}
            prefix={<FilterOutlined />}
          />
          <Input
            placeholder="Filtrar por aseguradora"
            value={filtros.aseguradora}
            onChange={(e) => setFiltros({ ...filtros, aseguradora: e.target.value })}
            style={{ width: 200 }}
            prefix={<FilterOutlined />}
          />
          <RangePicker
            value={[filtros.desde, filtros.hasta]}
            onChange={(dates) =>
              setFiltros({ ...filtros, desde: dates ? dates[0] : null, hasta: dates ? dates[1] : null })
            }
            format="YYYY-MM-DD"
            placeholder={['Desde', 'Hasta']}
          />
          <Input
            type="number"
            placeholder="Min. pendientes"
            value={filtros.minPendientes}
            onChange={(e) =>
              setFiltros({ ...filtros, minPendientes: e.target.value ? parseInt(e.target.value) : null })
            }
            style={{ width: 150 }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleFiltrar} disabled={streaming}>
            Filtrar
          </Button>
          <Button onClick={handleLimpiar} disabled={streaming}>
            Limpiar
          </Button>
        </Space>
      </Card>

      {/* Tabla progresiva — Ant Design maneja la paginación internamente */}
      <Card>
        <div ref={tableRef}>
          <Table
            columns={columns}
            dataSource={oportunidades}
            rowKey={(record) => record._key}
            loading={streaming && oportunidades.length === 0}
            pagination={{
              current: currentPage,
              pageSize,
              total: oportunidades.length,
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

      {/* Modal de Detalle */}
      <Modal
        title={`Detalle de Cotización`}
        open={detalleModalVisible}
        onCancel={() => setDetalleModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setDetalleModalVisible(false)}>
            Cerrar
          </Button>
        ]}
        width={900}
        centered
        bodyStyle={{ maxHeight: '80vh', overflowY: 'auto', padding: '20px' }}
      >
        {cargandoDetalle ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <LoadingOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 16 }} spin />
            <Title level={4}>Cargando detalles...</Title>
            <p style={{ color: '#888' }}>Extrayendo la cotización del portal Audatex.</p>
          </div>
        ) : detalleCotizacion ? (
          <div>
            <div style={{ marginBottom: 24, textAlign: 'center' }}>
              <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
                ID Audatex (WAN): {detalleCotizacion.wan}
              </Tag>
            </div>

            {/* Repuestos Tablas */}
            {detalleCotizacion.tablas && detalleCotizacion.tablas.map((tabla, i) => {
              // Columnas que no queremos mostrar (inputs de formulario, selectores, precios vacíos)
              const columnasExcluidas = [
                'tipo pieza', 'stock actual', 'plazo de entrega *', 'precio item *',
                'precio proveedor', 'no cotizar', 'razón', 'precio', 'tiempo entrega',
                'seleccionar todos', 'elija', '-'
              ];

              // Limpiar columnas vacías y columnas sin nombre (col_X)
              const rawKeys = Object.keys(tabla.data[0] || {});
              const validKeys = rawKeys.filter(k => {
                const kLower = k.toLowerCase().trim();
                // Excluir si está en la lista negra
                if (columnasExcluidas.some(ex => kLower.includes(ex) || kLower === ex)) return false;

                // Excluir si es col_X y está vacía
                if (k.startsWith('col_')) {
                  return tabla.data.some(row => row[k] && row[k].trim() !== '' && row[k].trim().toLowerCase() !== 'elija');
                }
                return true;
              });

              const cols = validKeys.map(k => ({
                title: k.startsWith('col_') ? '' : k,
                dataIndex: k,
                key: k,
                render: (text) => text || '-'
              }));

              return (
                <Card
                  key={i}
                  title={`Tabla de Repuestos (${tabla.id})`}
                  size="small"
                  style={{ marginBottom: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                >
                  <Table
                    dataSource={tabla.data.map((row, idx) => ({ ...row, key: idx }))}
                    columns={cols}
                    pagination={{ pageSize: 15 }}
                    size="small"
                    bordered
                    scroll={{ x: 'max-content' }}
                  />
                </Card>
              );
            })}

            {(!detalleCotizacion.tablas || detalleCotizacion.tablas.length === 0) && (
              <Alert
                message="Sin repuestos"
                description="No se encontraron tablas de repuestos en el detalle de esta cotización."
                type="info"
                showIcon
              />
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default OportunidadesAudatex;
