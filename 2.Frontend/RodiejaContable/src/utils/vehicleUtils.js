import { Tag, Typography, Row, Col, Card, Statistic } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * Renderiza el estado de un vehículo con el color correspondiente
 * @param {string} estado - Estado del vehículo
 * @returns {JSX.Element} Componente Tag con el estado
 */
export const renderEstado = (estado) => {
  const estados = {
    DISPONIBLE: { color: 'green', text: 'Disponible' },
    VENDIDO: { color: 'red', text: 'Vendido' },
    DESARMADO: { color: 'orange', text: 'Desarmado' },
    REPARACION: { color: 'blue', text: 'En reparación' },
    RESERVADO: { color: 'purple', text: 'Reservado' },
    ENTREGADO: { color: 'cyan', text: 'Entregado' }
  };

  const estadoInfo = estados[estado] || { color: 'default', text: estado };
  return <Tag color={estadoInfo.color}>{estadoInfo.text}</Tag>;
};

// formatCurrency is now imported from formatters.js

/**
 * Renderiza las estadísticas de una generación de vehículos
 * @param {Object} generacion - Datos de la generación
 * @returns {JSX.Element} Componente con las estadísticas
 */
export const renderEstadisticasGeneracion = (generacion) => {
  return (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      <Col span={8}>
        <Card size="small">
          <Statistic 
            title="Inversión Total" 
            value={generacion.totalInversion} 
            precision={2}
            prefix="$"
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
      <Col span={8}>
        <Card size="small">
          <Statistic 
            title="Ingresos" 
            value={generacion.totalIngresos} 
            precision={2}
            prefix="$"
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
      <Col span={8}>
        <Card size="small">
          <Statistic 
            title="Egresos" 
            value={generacion.totalEgresos} 
            precision={2}
            prefix="$"
            valueStyle={{ color: '#cf1322' }}
          />
        </Card>
      </Col>
      <Col span={24} style={{ marginTop: 16 }}>
        <Card size="small" type="inner">
          <Statistic 
            title="Balance Neto" 
            value={generacion.balanceNeto} 
            precision={2}
            prefix={generacion.balanceNeto >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            valueStyle={{ 
              color: generacion.balanceNeto >= 0 ? '#3f8600' : '#cf1322',
              fontSize: '1.5em'
            }}
          />
        </Card>
      </Col>
    </Row>
  );
};

/**
 * Renderiza la información de un vehículo
 * @param {Object} vehiculo - Datos del vehículo
 * @param {Function} renderEstado - Función para renderizar el estado
 * @param {Function} formatCurrency - Función para formatear moneda
 * @returns {JSX.Element} Componente con la información del vehículo
 */
export const renderVehiculoInfo = (vehiculo, renderEstado, formatCurrency) => {
  return (
    <div style={{ padding: '8px 0' }}>
      <Row gutter={16}>
        <Col span={8}>
          <Text strong>Año:</Text> {vehiculo.anio}
        </Col>
        <Col span={8}>
          <Text strong>Estado:</Text> {renderEstado(vehiculo.estado)}
        </Col>
        <Col span={8}>
          <Text strong>Inversión Total:</Text> {formatCurrency(vehiculo.inversionTotal)}
        </Col>
      </Row>
      {vehiculo.notas && (
        <Row style={{ marginTop: 8 }}>
          <Col span={24}>
            <Text strong>Notas:</Text> {vehiculo.notas}
          </Col>
        </Row>
      )}
    </div>
  );
};

/**
 * Maneja la expansión de un vehículo para cargar sus transacciones
 * @param {string} vehiculoId - ID del vehículo
 * @param {boolean} expanded - Indica si el panel está expandido
 * @param {Object} transacciones - Estado actual de las transacciones
 * @param {Function} setTransacciones - Función para actualizar el estado de transacciones
 * @param {Function} setLoadingTransacciones - Función para actualizar el estado de carga
 * @param {Function} vehiculoService - Servicio para obtener las transacciones
 */
export const handleExpand = async (
  vehiculoId, 
  expanded, 
  transacciones, 
  setTransacciones, 
  setLoadingTransacciones,
  vehiculoService
) => {
  if (expanded && !transacciones[vehiculoId]) {
    try {
      setLoadingTransacciones(prev => ({ ...prev, [vehiculoId]: true }));
      const data = await vehiculoService.getTransaccionesVehiculo(vehiculoId);
      setTransacciones(prev => ({
        ...prev,
        [vehiculoId]: data
      }));
    } catch (err) {
      console.error('Error al cargar transacciones:', err);
      // Inicializar con array vacío para evitar intentar cargar de nuevo
      setTransacciones(prev => ({
        ...prev,
        [vehiculoId]: []
      }));
    } finally {
      setLoadingTransacciones(prev => ({ ...prev, [vehiculoId]: false }));
    }
  }
};
