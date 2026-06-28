import re

filepath = "/home/kimberly/Escritorio/personal/RodiejaContable/2.Frontend/RodiejaContable/src/pages/audatex/OportunidadesAudatex.js"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
old_import = "import { Table, Input, Space, Button, Card, Typography, Spin, Popconfirm,\n  message, Tag, Alert, Modal\n} from 'antd';"
new_import = "import { Table, Input, Space, Button, Card, Typography, Spin, Popconfirm,\n  message, Tag, Alert, Modal, Tabs, Descriptions\n} from 'antd';"
if old_import in content:
    content = content.replace(old_import, new_import, 1)
else:
    # Just in case, try regex
    content = re.sub(r'import\s+\{([^}]+)\}\s+from\s+\'antd\';', lambda m: "import {" + m.group(1) + ", Tabs, Descriptions} from 'antd';" if 'Tabs' not in m.group(1) else m.group(0), content)

# 2. Add "Vehículo" column
old_col = """{ title: 'Siniestro', dataIndex: 'siniestro', key: 'siniestro' },
    { title: 'Matrícula', dataIndex: 'matricula', key: 'matricula' },
    {
      title: 'Armadora', dataIndex: 'armadora', key: 'armadora',"""
      
new_col = """{ title: 'Siniestro', dataIndex: 'siniestro', key: 'siniestro' },
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
    },"""
content = content.replace(old_col, new_col, 1)

# Remove the old Matrícula and Armadora columns if they are not needed, or let's just replace them.
# I replaced `Matrícula` and started replacing `Armadora`. Let's replace both fully:
old_col_full = """{ title: 'Siniestro', dataIndex: 'siniestro', key: 'siniestro' },
    { title: 'Matrícula', dataIndex: 'matricula', key: 'matricula' },
    {
      title: 'Armadora', dataIndex: 'armadora', key: 'armadora',
      sorter: (a, b) => (a.armadora || '').localeCompare(b.armadora || '')
    },"""
content = content.replace(old_col_full, new_col, 1)


# 3. Modify expandedRowRender
old_expand = """expandedRowRender: (record) => {
                const repuestos = record.repuestos || [];
                if (!repuestos.length) return null;
                return (
                  <div style={{ padding: '8px 16px 16px 40px' }}>
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
                      </tbody>
                    </table>
                  </div>
                );
              },"""

new_expand = """expandedRowRender: (record) => {
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

                const datosTab = (
                  <Descriptions bordered size="small" column={{ xxl: 4, xl: 3, lg: 3, md: 3, sm: 2, xs: 1 }}>
                    {Object.entries(datos).map(([key, value]) => (
                      <Descriptions.Item label={key} key={key}>{value}</Descriptions.Item>
                    ))}
                  </Descriptions>
                );
                
                return (
                  <div style={{ padding: '8px 16px 16px 40px', background: '#fafafa', borderRadius: '4px' }}>
                    <Tabs defaultActiveKey="1" items={[
                      { key: '1', label: 'Repuestos', children: repuestosTab },
                      { key: '2', label: 'Datos de Cotización', children: Object.keys(datos).length > 0 ? datosTab : <div style={{padding: 16}}>No hay datos de cotización extra disponibles.</div> }
                    ]} />
                  </div>
                );
              },"""
content = content.replace(old_expand, new_expand, 1)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Frontend modificado")
