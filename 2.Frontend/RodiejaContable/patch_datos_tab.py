import re

filepath = "/home/kimberly/Escritorio/personal/RodiejaContable/2.Frontend/RodiejaContable/src/pages/audatex/OportunidadesAudatex.js"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add Row, Col, Divider to imports if missing
imports = re.search(r'import\s+\{([^}]+)\}\s+from\s+\'antd\';', content)
if imports:
    import_str = imports.group(1)
    for comp in ['Row', 'Col', 'Divider']:
        if comp not in import_str:
            import_str += f", {comp}"
    new_imports = f"import {{{import_str}}} from 'antd';"
    content = content.replace(imports.group(0), new_imports)

# Replace the datosTab logic
old_datos_tab = """                const datosTab = (
                  <Descriptions bordered size="small" column={{ xxl: 4, xl: 3, lg: 3, md: 3, sm: 2, xs: 1 }}>
                    {Object.entries(datos).map(([key, value]) => (
                      <Descriptions.Item label={key} key={key}>{value}</Descriptions.Item>
                    ))}
                  </Descriptions>
                );"""

new_datos_tab = """                // Omitir Número Cotización y organizar por categorías
                const filteredDatos = { ...datos };
                delete filteredDatos['Número Cotización'];
                
                const grupoVehiculo = ['Descripción', 'Armadora', 'Marca', 'Modelo', 'Color', 'Matricula', 'Chasis', 'Año Modelo', 'Año Fabricación', 'KM', 'Características Vehículo'];
                const grupoTaller = ['RFC', 'Inscripción Estadual', 'País', 'Estado', 'Ciudad', 'Codigo Postal', 'Calle', 'Colonia', 'Nombre Contacto', 'Teléfono', 'E-mail'];
                
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
                );"""

if old_datos_tab in content:
    content = content.replace(old_datos_tab, new_datos_tab)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("UI Mejorada!")
else:
    print("ERROR: No se pudo reemplazar el layout de datosTab.")

