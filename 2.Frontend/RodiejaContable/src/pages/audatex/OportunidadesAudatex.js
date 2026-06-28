import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card, Table, Button, DatePicker, Input, Space, Typography,
  message, Tag, Alert
, Tabs, Descriptions, Row, Col, Divider} from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
  ReloadOutlined,
  FilterOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
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
    {
      title: 'Vehículo', key: 'vehiculo',
      render: (_, record) => {
        const marca = record.marca || record.armadora || 'Desc.';
        const modelo = record.modelo || '';
        const anio = record.anio || '';
        const matricula = record.matricula || '';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontWeight: 500 }}>{marca} {modelo} <span style={{ color: '#888', fontSize: '0.85em' }}>{anio}</span></span>
            {matricula && <Tag color="blue" style={{ width: 'fit-content', margin: 0 }}>{matricula}</Tag>}
          </div>
        );
      }
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
      title: 'Acciones', key: 'acciones',
      render: (_, record) => (
        <Button type="primary" size="small" onClick={(e) => {
          e.stopPropagation(); // Evita que se despliegue la fila al clickear el botón
          message.info(`Cotizar oportunidad ${record.cotizacionId || ''}`);
        }}>
          Cotizar
        </Button>
      )
    }
  ];

  const thStyle = {
    padding: '8px 12px', textAlign: 'left', fontWeight: 600,
    borderBottom: '2px solid #BFDBFE', whiteSpace: 'nowrap',
  };
  const tdStyle = {
    padding: '7px 12px', borderBottom: '1px solid #E2E8F0', color: '#334155',
  };

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
            expandable={{
              expandRowByClick: false,
              rowExpandable: (record) => Array.isArray(record.repuestos) && record.repuestos.length > 0,
              expandedRowRender: (record) => {
                const repuestos = record.repuestos || [];
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
                          <td style={tdStyle}>{rep['Grupo Pieza'] || '-'}</td>
                          <td style={{ ...tdStyle, fontWeight: 500 }}>{rep['PartNumber'] || '-'}</td>
                          <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>{rep['Part Serial Number'] || '-'}</td>
                          <td style={tdStyle}>{rep['Descripcion Pieza'] || '-'}</td>
                        </tr>
                      ))}
                      {repuestos.length === 0 && <tr><td colSpan={5} style={{textAlign: 'center', padding: 16}}>No hay repuestos disponibles</td></tr>}
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
                  <Descriptions bordered size="small" column={2}>
                    {arr.map(([key, value]) => (
                      <Descriptions.Item label={<span style={{color: '#64748b'}}>{key}</span>} key={key} span={key === 'Descripción' || key === 'Características Vehículo' ? 2 : 1}>
                        <strong style={{color: '#334155'}}>{value}</strong>
                      </Descriptions.Item>
                    ))}
                  </Descriptions>
                );

                const datosTab = (
                  <div style={{ padding: '8px 0' }}>
                    <Row gutter={[24, 24]}>
                      <Col xs={24} lg={12}>
                        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                          <Typography.Title level={5} style={{ marginTop: 0, color: '#1e40af' }}>Información del Siniestro</Typography.Title>
                          {generalDatos.length > 0 ? renderDesc(generalDatos) : <p style={{color: '#94a3b8'}}>No hay datos de siniestro</p>}
                        </div>
                      </Col>
                      <Col xs={24} lg={12}>
                        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                          <Typography.Title level={5} style={{ marginTop: 0, color: '#1e40af' }}>Detalles del Vehículo</Typography.Title>
                          {vehiculoDatos.length > 0 ? renderDesc(vehiculoDatos) : <p style={{color: '#94a3b8'}}>No hay datos del vehículo</p>}
                        </div>
                      </Col>
                      <Col xs={24}>
                        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                          <Typography.Title level={5} style={{ marginTop: 0, color: '#1e40af' }}>Lugar de Entrega / Taller</Typography.Title>
                          <Descriptions bordered size="small" column={{ xxl: 4, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
                            {tallerDatos.map(([key, value]) => (
                              <Descriptions.Item label={<span style={{color: '#64748b'}}>{key}</span>} key={key}>
                                <strong style={{color: '#334155'}}>{value}</strong>
                              </Descriptions.Item>
                            ))}
                          </Descriptions>
                          {tallerDatos.length === 0 && <p style={{color: '#94a3b8'}}>No hay datos del taller</p>}
                        </div>
                      </Col>
                    </Row>
                  </div>
                );
                
                return (
                  <div style={{ padding: '8px 16px 16px 40px', background: '#fafafa', borderRadius: '4px' }}>
                    <Tabs defaultActiveKey="1" items={[
                      { key: '1', label: 'Repuestos', children: repuestosTab },
                      { key: '2', label: 'Datos de Cotización', children: Object.keys(datos).length > 0 ? datosTab : <div style={{padding: 16}}>No hay datos de cotización extra disponibles.</div> }
                    ]} />
                  </div>
                );
              },
            }}
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

    </div>
  );
};

export default OportunidadesAudatex;
