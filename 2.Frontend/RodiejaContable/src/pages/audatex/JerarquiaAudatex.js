import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Typography, message, Tag, Button, Alert, Space } from 'antd';
import { ReloadOutlined, LoadingOutlined, CheckCircleOutlined } from '@ant-design/icons';
import vehiculoService from '../../api/vehiculos';

const { Title } = Typography;

const isNullish = (v) => v === null || v === undefined || v === '{null}';
const toStr = (v, d = '') => (isNullish(v) ? d : String(v));
const toNum = (v, d = 0) => (isNullish(v) || v === '' ? d : Number(v));

const normalizarJerarquia = (data) => {
  const marcas = Array.isArray(data?.marcas) ? data.marcas : (Array.isArray(data) ? data : []);
  return marcas.map(m => ({
    key: `marca_${m.id}`,
    id: m.id,
    nombre: toStr(m.nombre, 'Sin marca'),
    tipo: 'marca',
    children: (Array.isArray(m.modelos) ? m.modelos : []).map(mo => ({
      key: `modelo_${mo.id}`,
      id: mo.id,
      nombre: toStr(mo.nombre, 'Sin modelo'),
      marca_nombre: m.nombre,
      tipo: 'modelo',
      children: (Array.isArray(mo.generaciones) ? mo.generaciones : []).map(g => ({
        key: `gen_${g.id || g.generacion_id}`,
        id: g.id || g.generacion_id,
        nombre: toStr(g.nombre, 'Generación'),
        marca_nombre: m.nombre,
        modelo_nombre: mo.nombre,
        anio_inicio: toNum(g.anio_inicio || g.anioInicio),
        anio_fin: toNum(g.anio_fin || g.anioFin),
        tipo: 'generacion',
        vehiculos: Array.isArray(g.vehiculos) ? g.vehiculos.map(v => ({
           id: v.id,
           codigo: v.codigo_vehiculo || v.codigoVehiculo,
           estado: v.estado,
           anio: v.anio,
           inversion_total: toNum(v.inversion_total || v.inversionTotal)
        })) : []
      })).sort((a,b) => a.anio_inicio - b.anio_inicio)
    })).sort((a,b) => a.nombre.localeCompare(b.nombre))
  })).sort((a,b) => a.nombre.localeCompare(b.nombre));
};

const JerarquiaAudatex = () => {
  const [loading, setLoading] = useState(false);
  const [jerarquia, setJerarquia] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  
  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [vehResp, audResp] = await Promise.all([
        vehiculoService.getVehiculosAgrupados(),
        fetch(`http://localhost:8080/api/audatex/oportunidades/sync`, {
           headers: { Authorization: `Bearer ${token}` }
        }).then(res => res.json())
      ]);
      
      const vehData = vehResp?.data ?? vehResp;
      const opts = audResp.oportunidades || [];
      
      const normalizado = normalizarJerarquia(vehData);
      setJerarquia(normalizado);
      setOportunidades(opts);
      
    } catch (e) {
      console.error(e);
      message.error("Error al cargar la jerarquía o las oportunidades");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const normalizeStr = (str) => (str || '').toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  // Cross reference logic
  const countOportunidades = (nodo) => {
    if (nodo.tipo === 'generacion') {
       // Filter opportunities that match Marca + Modelo + Year bounds
       const mMarca = normalizeStr(nodo.marca_nombre);
       const mModelo = normalizeStr(nodo.modelo_nombre);
       
       return oportunidades.filter(op => {
         const vMarca = normalizeStr(op.marca || op.armadora || (op.datosCotizacion && (op.datosCotizacion['Marca'] || op.datosCotizacion['Armadora'])));
         const vModelo = normalizeStr(op.datosCotizacion && (op.datosCotizacion['Descripción'] || op.datosCotizacion['Modelo']));
         const vAnioStr = op.anio || (op.datosCotizacion && (op.datosCotizacion['Año Modelo'] || op.datosCotizacion['Año Fabricación']));
         const vAnio = parseInt(vAnioStr, 10);
         
         const matchMarca = !mMarca || vMarca.includes(mMarca) || mMarca.includes(vMarca);
         const matchModelo = !mModelo || vModelo.includes(mModelo) || mModelo.includes(vModelo);
         
         let matchAnio = true;
         if (!isNaN(vAnio) && nodo.anio_inicio) {
            matchAnio = vAnio >= nodo.anio_inicio;
            if (nodo.anio_fin) matchAnio = matchAnio && vAnio <= nodo.anio_fin;
         }
         
         return matchMarca && matchModelo && matchAnio;
       });
    } else if (nodo.tipo === 'modelo' || nodo.tipo === 'marca') {
       // Sum children
       let ops = [];
       (nodo.children || []).forEach(child => {
           ops = [...ops, ...countOportunidades(child)];
       });
       // Deduplicate by cotizacionId
       const unique = [];
       const seen = new Set();
       ops.forEach(op => {
          if (!seen.has(op.cotizacionId)) {
             seen.add(op.cotizacionId);
             unique.push(op);
          }
       });
       return unique;
    }
    return [];
  };

  const procesarJerarquia = (nodos) => {
      return nodos.map(nodo => {
         const ops = countOportunidades(nodo);
         
         let stock = 0;
         if (nodo.tipo === 'generacion') {
            stock = nodo.vehiculos.reduce((sum, v) => sum + (v.estado === 'DESARMADO' || v.estado === 'STOCK' ? v.inversion_total : 0), 0);
         } else if (nodo.children) {
            const processedChildren = procesarJerarquia(nodo.children);
            nodo.children = processedChildren;
            stock = processedChildren.reduce((sum, c) => sum + c.stockValue, 0);
         }
         
         return {
            ...nodo,
            opsCount: ops.length,
            stockValue: stock
         };
      });
  };
  
  const dataSource = procesarJerarquia(jerarquia);
  
  const totalActivas = oportunidades.length;
  const totalStock = dataSource.reduce((acc, curr) => acc + curr.stockValue, 0);
  const totalMatch = dataSource.reduce((acc, curr) => acc + curr.opsCount, 0); // approx

  const columns = [
    {
      title: 'Jerarquía',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (text, record) => {
         if (record.tipo === 'marca') return <strong>🏢 {text}</strong>;
         if (record.tipo === 'modelo') return <span>🚗 {text}</span>;
         if (record.tipo === 'generacion') return <span>{text} ({record.anio_inicio} - {record.anio_fin || '...'})</span>;
         return text;
      }
    },
    {
      title: 'Oportunidades InPart',
      dataIndex: 'opsCount',
      key: 'opsCount',
      align: 'center',
      render: (val) => val > 0 ? <Tag color="green" style={{ fontWeight: 'bold' }}>{val}</Tag> : <span style={{ color: '#ccc' }}>0</span>
    },
    {
      title: 'Vehículos Desarmados',
      key: 'vehiculos',
      align: 'center',
      render: (_, record) => {
         if (record.tipo === 'generacion') {
             const count = record.vehiculos.filter(v => v.estado === 'DESARMADO' || v.estado === 'STOCK').length;
             return count > 0 ? <Tag color="blue">{count}</Tag> : <span style={{ color: '#ccc' }}>0</span>;
         }
         return '-';
      }
    },
    {
      title: 'Valor en Stock',
      dataIndex: 'stockValue',
      key: 'stockValue',
      align: 'right',
      render: (val) => val > 0 ? `₡${val.toLocaleString('es-CR')}` : <span style={{ color: '#ccc' }}>₡0</span>
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700 }}>🛒 Cotizaciones InPart · Jerarquía</Title>
          <div style={{ color: '#8c8c8c', fontSize: '14px', marginTop: '4px' }}>Distribución de oportunidades de Audatex vs el Stock en Inventario</div>
        </div>
        <Space>
          <Button type="default" icon={<ReloadOutlined />} onClick={cargarDatos} disabled={loading} style={{ color: '#1890ff', borderColor: '#1890ff' }}>
            Refrescar
          </Button>
        </Space>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: 600, letterSpacing: '0.05em' }}>TOTAL OPORTUNIDADES</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#52c41a' }}>{totalActivas}</div>
        </div>
        <div style={{ background: '#fff7e6', border: '1px solid #ffd591', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: 600, letterSpacing: '0.05em' }}>MATCHES EN JERARQUÍA</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#faad14' }}>{totalMatch}</div>
        </div>
        <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: 600, letterSpacing: '0.05em' }}>VALOR STOCK VINCULADO</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#1890ff' }}>₡{totalStock.toLocaleString('es-CR')}</div>
        </div>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={false}
          rowKey="key"
          expandable={{
             defaultExpandAllRows: false
          }}
        />
      </Card>
    </div>
  );
};

export default JerarquiaAudatex;
