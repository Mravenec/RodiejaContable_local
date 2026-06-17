import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  message,
  Spin,
  Empty,
  Modal,
  Descriptions
} from 'antd';
import {
  MoneyCollectOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';
import usePagosComisiones from '../../hooks/usePagosComisiones';
import pagosComisionesService from '../../api/pagosComisiones';



const ComisionesPendientes = ({ mesFiltro, anioFiltro }) => {
  const anio = anioFiltro || moment().year();
  const mes = mesFiltro || moment().month() + 1;
  
  const [loading, setLoading] = useState(false);
  const [comisionesPendientes, setComisionesPendientes] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  // Hook para manejar pagos
  const {
    procesarPago,
    loadingPagos,
    pagoModalVisible,
    empleadoSeleccionado,
    cancelarPago,
    mostrarDialogoPago
  } = usePagosComisiones(empleados);

  // Cargar comisiones pendientes
  const cargarComisionesPendientes = async () => {
    try {
      setLoading(true);
      const data = await pagosComisionesService.getComisionesPendientes(anio, mes);
      setComisionesPendientes(data);
    } catch (error) {
      console.error('Error al cargar comisiones pendientes:', error);
      message.error('Error al cargar las comisiones pendientes');
      setComisionesPendientes([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar empleados
  const cargarEmpleados = async () => {
    try {
      // Aquí podrías cargar empleados desde tu API
      // Por ahora usaremos los datos de comisiones pendientes
      const empleadosUnicos = comisionesPendientes.map(c => ({
        id: c.empleadoId,
        nombre: c.nombreEmpleado
      }));
      setEmpleados(empleadosUnicos);
    } catch (error) {
      console.error('Error al cargar empleados:', error);
    }
  };

  useEffect(() => {
    cargarComisionesPendientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio, mes]);

  useEffect(() => {
    cargarEmpleados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comisionesPendientes]);

  // Manejar pago
  const handlePagar = async (empleado) => {
    const exito = await procesarPago(empleado, anio, mes);
    if (exito) {
      // Recargar comisiones pendientes
      await cargarComisionesPendientes();
    }
  };

  // Columnas de la tabla
  const columns = [
    {
      title: 'Empleado',
      dataIndex: 'nombreEmpleado',
      key: 'nombreEmpleado',
      render: (text) => <span style={{ fontWeight: 'bold' }}>{text}</span>,
      sorter: (a, b) => a.nombreEmpleado.localeCompare(b.nombreEmpleado)
    },
    {
      title: 'Total Comisiones',
      dataIndex: 'totalComisionesPendientes',
      key: 'totalComisionesPendientes',
      render: (value) => (
        <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
          ₡{new Intl.NumberFormat('es-CR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(value)}
        </span>
      ),
      align: 'right',
      sorter: (a, b) => a.totalComisionesPendientes - b.totalComisionesPendientes
    },
    {
      title: 'Cantidad Transacciones',
      dataIndex: 'cantidadTransacciones',
      key: 'cantidadTransacciones',
      align: 'center',
      sorter: (a, b) => a.cantidadTransacciones - b.cantidadTransacciones
    },
    {
      title: 'Promedio Venta',
      dataIndex: 'promedioVenta',
      key: 'promedioVenta',
      render: (value) => (
        <span>
          ₡{new Intl.NumberFormat('es-CR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(value)}
        </span>
      ),
      align: 'right',
      sorter: (a, b) => a.promedioVenta - b.promedioVenta
    },
    {
      title: '% Comisión',
      dataIndex: 'porcentajeComision',
      key: 'porcentajeComision',
      render: (value) => (
        <Tag color="blue">
          {value}%
        </Tag>
      ),
      align: 'center',
      sorter: (a, b) => a.porcentajeComision - b.porcentajeComision
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<MoneyCollectOutlined />}
            onClick={() => mostrarDialogoPago({
              empleado: record.nombreEmpleado,
              empleadoId: record.empleadoId,
              totalComisiones: record.totalComisionesPendientes
            })}
            loading={loadingPagos}
            size="small"
          >
            Pagar
          </Button>
        </Space>
      ),
      width: 120
    }
  ];

  return (
    <div className="comisiones-pendientes">
      <Card
        title={
          <Space>
            <ClockCircleOutlined />
            <span>Comisiones Pendientes de Pago</span>
          </Space>
        }
      >
        <Spin spinning={loading}>
          {comisionesPendientes.length === 0 ? (
            <Empty
              description="No hay comisiones pendientes para este período"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Table
              columns={columns}
              dataSource={comisionesPendientes}
              rowKey="empleadoId"
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} de ${total} empleados`,
                pageSizeOptions: ['10', '20', '50', '100']
              }}
              size="small"
              scroll={{ x: 800 }}
            />
          )}
        </Spin>
      </Card>

      {/* Modal de confirmación de pago */}
      <Modal
        title="Confirmar Pago de Comisiones"
        visible={pagoModalVisible}
        onOk={() => handlePagar(empleadoSeleccionado)}
        onCancel={cancelarPago}
        confirmLoading={loadingPagos}
        okText="Confirmar Pago"
        cancelText="Cancelar"
      >
        {empleadoSeleccionado && (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Empleado">
              {empleadoSeleccionado.empleado}
            </Descriptions.Item>
            <Descriptions.Item label="Período">
              {moment([anio, mes - 1]).format('MMMM YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Monto a Pagar">
              <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                ₡{new Intl.NumberFormat('es-CR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }).format(empleadoSeleccionado.totalComisiones)}
              </span>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default ComisionesPendientes;
