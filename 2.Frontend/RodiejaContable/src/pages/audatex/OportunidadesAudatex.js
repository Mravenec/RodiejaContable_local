import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, DatePicker, Input, Space, Typography, message, Tag } from 'antd';
import { 
  SearchOutlined, 
  DownloadOutlined, 
  ReloadOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { audatexService } from '../../api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const defaultFiltros = {
  armadora: '',
  aseguradora: '',
  desde: dayjs(),
  hasta: dayjs(),
  minPendientes: null
};

const OportunidadesAudatex = () => {
  const [loading, setLoading] = useState(false);
  const [oportunidades, setOportunidades] = useState([]);
  const [filtros, setFiltros] = useState({ ...defaultFiltros });
  const [appliedFiltros, setAppliedFiltros] = useState({ ...defaultFiltros });

  // Cargar oportunidades de Audatex
  const cargarOportunidades = useCallback(async (currentFilters = appliedFiltros) => {
    try {
      setLoading(true);
      const params = {};
      if (currentFilters.armadora) params.armadora = currentFilters.armadora;
      if (currentFilters.aseguradora) params.aseguradora = currentFilters.aseguradora;
      if (currentFilters.desde) params.desde = currentFilters.desde.format('YYYY-MM-DD');
      if (currentFilters.hasta) params.hasta = currentFilters.hasta.format('YYYY-MM-DD');
      if (currentFilters.minPendientes) params.minPendientes = currentFilters.minPendientes;

      const response = await audatexService.obtenerOportunidades(params);
      const data = response.data || {};
      setOportunidades(data.oportunidades || []);
      message.success(`Se cargaron ${data.total || 0} oportunidades`);
    } catch (error) {
      console.error('Error cargando oportunidades:', error);
      message.error('Error al cargar las oportunidades de Audatex');
    } finally {
      setLoading(false);
    }
  }, [appliedFiltros]);

  // Exportar a Excel
  const handleExportar = async () => {
    try {
      const params = {};
      if (appliedFiltros.armadora) params.armadora = appliedFiltros.armadora;
      if (appliedFiltros.aseguradora) params.aseguradora = appliedFiltros.aseguradora;
      if (appliedFiltros.desde) params.desde = appliedFiltros.desde.format('YYYY-MM-DD');
      if (appliedFiltros.hasta) params.hasta = appliedFiltros.hasta.format('YYYY-MM-DD');
      if (appliedFiltros.minPendientes) params.minPendientes = appliedFiltros.minPendientes;

      const response = await audatexService.exportarExcel(params);
      const blob = response.data;
      
      // Crear nombre de archivo con fecha
      const fecha = dayjs().format('YYYYMMDD_HHmm');
      const filename = `oportunidades_audatex_${fecha}.xlsx`;
      
      // Descargar archivo
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      message.success('Archivo Excel exportado exitosamente');
    } catch (error) {
      console.error('Error exportando:', error);
      message.error('Error al exportar a Excel');
    }
  };

  // Invalidar caché y recargar
  const handleInvalidarCache = async () => {
    try {
      await audatexService.invalidarCache();
      message.success('Caché invalidado. Recargando oportunidades...');
      cargarOportunidades(appliedFiltros);
    } catch (error) {
      console.error('Error invalidando caché:', error);
      message.error('Error al invalidar el caché');
    }
  };

  const handleFiltrar = () => {
    setAppliedFiltros({ ...filtros });
  };

  const handleLimpiar = () => {
    setFiltros({ ...defaultFiltros });
    setAppliedFiltros({ ...defaultFiltros });
  };

  // Cargar al montar
  useEffect(() => {
    cargarOportunidades();
  }, [cargarOportunidades]);

  const columns = [
    {
      title: 'Aseguradora',
      dataIndex: 'aseguradora',
      key: 'aseguradora',
      sorter: (a, b) => a.aseguradora.localeCompare(b.aseguradora),
    },
    {
      title: 'Cotización ID',
      dataIndex: 'cotizacionId',
      key: 'cotizacionId',
    },
    {
      title: 'Taller',
      dataIndex: 'taller',
      key: 'taller',
    },
    {
      title: 'Póliza',
      dataIndex: 'poliza',
      key: 'poliza',
    },
    {
      title: 'Siniestro',
      dataIndex: 'siniestro',
      key: 'siniestro',
    },
    {
      title: 'Matrícula',
      dataIndex: 'matricula',
      key: 'matricula',
    },
    {
      title: 'Armadora',
      dataIndex: 'armadora',
      key: 'armadora',
      sorter: (a, b) => a.armadora.localeCompare(b.armadora),
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaCotizacion',
      key: 'fechaCotizacion',
      sorter: (a, b) => a.fechaCotizacion.localeCompare(b.fechaCotizacion),
    },
    {
      title: 'Pendientes',
      dataIndex: 'pendientes',
      key: 'pendientes',
      sorter: (a, b) => a.pendientes - b.pendientes,
      render: (pendientes) => (
        <Tag color={pendientes > 0 ? 'orange' : 'green'} style={{ fontWeight: 'bold' }}>
          {pendientes}
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>Oportunidades Audatex InPart</Title>
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleInvalidarCache}
          >
            Sincronizar
          </Button>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={handleExportar}
          >
            Exportar Excel
          </Button>
        </Space>
      </div>

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
            onChange={(dates) => setFiltros({ ...filtros, desde: dates ? dates[0] : null, hasta: dates ? dates[1] : null })}
            format="YYYY-MM-DD"
            placeholder={['Desde', 'Hasta']}
          />
          <Input
            type="number"
            placeholder="Min. pendientes"
            value={filtros.minPendientes}
            onChange={(e) => setFiltros({ ...filtros, minPendientes: e.target.value ? parseInt(e.target.value) : null })}
            style={{ width: 150 }}
          />
          <Button 
            type="primary" 
            icon={<SearchOutlined />} 
            onClick={handleFiltrar}
          >
            Filtrar
          </Button>
          <Button 
            onClick={handleLimpiar}
          >
            Limpiar
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={oportunidades}
          rowKey="cotizacionId"
          loading={loading}
          pagination={{ 
            defaultPageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total: ${total} oportunidades`
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default OportunidadesAudatex;
