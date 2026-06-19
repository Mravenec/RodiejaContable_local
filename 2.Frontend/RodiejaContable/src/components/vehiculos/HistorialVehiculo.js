import React, { useState, useEffect, useCallback } from 'react';
import { Card, Timeline, Typography, Tag, Spin, Empty } from 'antd';
import { 
  HistoryOutlined,
  UserOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import api from '../../api/axios';

const { Text, Paragraph } = Typography;

const HistorialVehiculo = ({ vehiculoId }) => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);

  const cargarHistorial = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/historial-vehiculos/vehiculo/${vehiculoId}`);
      
      const historialConObservaciones = response.data.filter(item => 
        item.observaciones && 
        item.observaciones !== null && 
        item.observaciones !== undefined && 
        String(item.observaciones).trim() !== ''
      );
      
      setHistorial(historialConObservaciones);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      setHistorial([]);
    } finally {
      setLoading(false);
    }
  }, [vehiculoId]);

  useEffect(() => {
    if (vehiculoId) {
      cargarHistorial();
    }
  }, [vehiculoId, cargarHistorial]);

  const getAccionColor = (accion) => {
    const colores = {
      'INSERT': 'green',
      'UPDATE': 'blue',
      'DELETE': 'red'
    };
    return colores[accion] || 'default';
  };

  const getAccionIcon = (accion) => {
    const iconos = {
      'INSERT': '📝',
      'UPDATE': '✏️',
      'DELETE': '🗑️'
    };
    return iconos[accion] || '📋';
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Fecha no disponible';
    
    try {
      const date = new Date(fecha);
      return date.toLocaleString('es-CR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const getCampoModificadoTag = (campo) => {
    const campos = {
      'estado': { color: 'processing', text: 'Estado' },
      'precio_compra': { color: 'gold', text: 'Precio Compra' },
      'precio_venta': { color: 'green', text: 'Precio Venta' },
      'generacion_id': { color: 'purple', text: 'Descripción' }
    };
    return campos[campo] || { color: 'default', text: campo };
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text>Cargando historial de cambios...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HistoryOutlined style={{ color: '#1890ff' }} />
            <span>Historial de Cambios</span>
          </div>
        }
        extra={
          <Tag color="blue">
            {historial.length} cambios registrados
          </Tag>
        }
      >
        {historial.length === 0 ? (
          <Empty 
            description="No hay cambios con observaciones registrados para este vehículo"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Timeline
            mode="left"
            items={historial.map((item, index) => ({
              key: item.id || index,
              dot: (
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: getAccionColor(item.accion) === 'green' ? '#52c41a' : 
                                   getAccionColor(item.accion) === 'blue' ? '#1890ff' : 
                                   getAccionColor(item.accion) === 'red' ? '#f5222d' : '#d9d9d9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px'
                }}>
                  {getAccionIcon(item.accion)}
                </div>
              ),
              children: (
                <div style={{ 
                  paddingBottom: index < historial.length - 1 ? '16px' : '0',
                  borderLeft: index < historial.length - 1 ? '2px solid #f0f0f0' : 'none',
                  paddingLeft: '16px'
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Tag color={getAccionColor(item.accion)}>
                        {item.accion}
                      </Tag>
                      {getCampoModificadoTag(item.campoModificado) && (
                        <Tag color={getCampoModificadoTag(item.campoModificado).color}>
                          {getCampoModificadoTag(item.campoModificado).text}
                        </Tag>
                      )}
                    </div>
                    
                    <div style={{ 
                      backgroundColor: '#f6ffed', 
                      border: '1px solid #b7eb8f',
                      borderRadius: '6px',
                      padding: '12px',
                      marginTop: '8px'
                    }}>
                      <Paragraph 
                        style={{ 
                          margin: 0, 
                          fontSize: '14px',
                          color: '#135200'
                        }}
                      >
                        {item.observaciones}
                      </Paragraph>
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginTop: '8px',
                      fontSize: '12px',
                      color: '#8c8c8c'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <UserOutlined />
                        <Text type="secondary">{item.usuario || 'Sistema'}</Text>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CalendarOutlined />
                        <Text type="secondary">{formatearFecha(item.fechaCambio)}</Text>
                      </div>
                    </div>

                    {(item.valorAnterior !== null || item.valorNuevo !== null) && (
                      <div style={{ 
                        marginTop: '8px',
                        padding: '8px',
                        backgroundColor: '#fafafa',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        <Text type="secondary">
                          Cambio: {item.valorAnterior !== null ? `"${item.valorAnterior}"` : 'NULL'} → {item.valorNuevo !== null ? `"${item.valorNuevo}"` : 'NULL'}
                        </Text>
                      </div>
                    )}
                  </div>
                </div>
              )
            }))}
          />
        )}
      </Card>
    </div>
  );
};

export default HistorialVehiculo;
