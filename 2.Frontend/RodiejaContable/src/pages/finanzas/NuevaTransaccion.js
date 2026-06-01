import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  Typography, 
  Select, 
  InputNumber,
  DatePicker,
  message,
  Row,
  Col,
  Divider,
  Tabs,
  Alert
} from 'antd';
import { 
  SaveOutlined, 
  ArrowLeftOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useCreateTransaccion } from '../../hooks/useFinanzas';
import { useTiposByCategoria, useVehiculosParaTransacciones, useVehiculosParaEgreso, useEmpleados, useRepuestos } from '../../hooks';
import api from '../../api/axios';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

const NuevaTransaccion = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  const prefilledData = React.useMemo(() => location.state || {}, [location.state]);
  
  const [tipoTransaccion, setTipoTransaccion] = useState(prefilledData.tipoTransaccion || 'INGRESO');
  const [monto, setMonto] = useState(prefilledData.monto || 0);
  const [comision, setComision] = useState(0);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState(prefilledData.vehiculoId || null);
  const [esReembolso, setEsReembolso] = useState(false);
  
  // Estados para manejar nuevo empleado inline
  const [nuevoEmpleadoModal, setNuevoEmpleadoModal] = useState(false);
  const [nuevoEmpleadoNombre, setNuevoEmpleadoNombre] = useState('');
  const [creandoEmpleado, setCreandoEmpleado] = useState(false);
  
  // Estados para manejar edición de empleado inline
  const [editandoEmpleadoModal, setEditandoEmpleadoModal] = useState(false);
  const [empleadoEditando, setEmpleadoEditando] = useState(null);
  const [editandoEmpleadoNombre, setEditandoEmpleadoNombre] = useState('');
  const [actualizandoEmpleado, setActualizandoEmpleado] = useState(false);
  
  // Hooks para cargar datos
  const { data: tiposIngreso, isLoading: loadingTiposIngreso } = useTiposByCategoria('INGRESO');
  const { data: tiposEgreso, isLoading: loadingTiposEgreso } = useTiposByCategoria('EGRESO');
  const { data: empleados = [], isLoading: loadingEmpleados } = useEmpleados();
  const { vehiculos: vehiculosIngreso = [], loadingVehiculos: loadingVehiculosIngreso, errorVehiculos: errorVehiculosIngreso } = useVehiculosParaTransacciones();
  const { vehiculos: vehiculosEgreso = [], loadingVehiculos: loadingVehiculosEgreso, errorVehiculos: errorVehiculosEgreso } = useVehiculosParaEgreso();
  
  const vehiculos = tipoTransaccion === 'EGRESO' ? vehiculosEgreso : vehiculosIngreso;
  const loadingVehiculos = tipoTransaccion === 'EGRESO' ? loadingVehiculosEgreso : loadingVehiculosIngreso;
  const errorVehiculos = tipoTransaccion === 'EGRESO' ? errorVehiculosEgreso : errorVehiculosIngreso;
  const estadoRepuestos = esReembolso ? (tipoTransaccion === 'EGRESO' ? 'VENDIDO' : 'STOCK') : 'STOCK';
  const { data: repuestos = [], isLoading: loadingRepuestos } = useRepuestos({ estado: estadoRepuestos });
  
  // Hook para crear transacción
  const { mutate: crearTransaccion, isLoading: isCreating } = useCreateTransaccion({
    onSuccess: () => {
      // message.success('Transacción creada exitosamente');
      form.resetFields();
      setMonto(0);
      setComision(0);
      setVehiculoSeleccionado(null);
      navigate(-1);
    },
    onError: (error) => {
      console.error('Error al crear transacción:', error);
      let errorMessage = 'Error al crear transacción';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Si es un error de clave foránea, dar una pista más útil
      if (errorMessage.includes('LLAVE EXTRanjera') || errorMessage.includes('foreign key')) {
        errorMessage = 'El tipo de transacción seleccionado no es válido. Por favor, recargue la página e intente nuevamente.';
      }
      
      message.error(errorMessage);
    }
  });

  // Función para crear nuevo empleado
  const handleNuevoEmpleado = async () => {
    if (!nuevoEmpleadoNombre.trim()) {
      message.warning('Por favor ingrese el nombre del empleado');
      return;
    }

    setCreandoEmpleado(true);
    try {
      // Llamar a la API real para crear el empleado
      const response = await api.post('/empleados', {
        nombre: nuevoEmpleadoNombre.trim()
      });
      
      console.log('Empleado creado:', response.data);
      // message.success('Empleado creado exitosamente');
      
      // Limpiar formulario
      setNuevoEmpleadoModal(false);
      setNuevoEmpleadoNombre('');
      
      // Refrescar la lista de empleados inmediatamente
      queryClient.invalidateQueries('empleados');
      
    } catch (error) {
      console.error('Error al crear empleado:', error);
      message.error('Error al crear empleado: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreandoEmpleado(false);
    }
  };

  // Función para editar empleado existente
  const handleEditarEmpleado = async () => {
    if (!editandoEmpleadoNombre.trim()) {
      message.warning('Por favor ingrese el nombre del empleado');
      return;
    }

    setActualizandoEmpleado(true);
    try {
      // Llamar a la API real para actualizar el empleado
      const response = await api.put(`/empleados/${empleadoEditando.id}`, {
        nombre: editandoEmpleadoNombre.trim()
      });
      
      console.log('Empleado actualizado:', response.data);
      // message.success('Empleado actualizado exitosamente');
      
      // Limpiar formulario
      setEditandoEmpleadoModal(false);
      setEmpleadoEditando(null);
      setEditandoEmpleadoNombre('');
      
      // Refrescar la lista de empleados inmediatamente
      queryClient.invalidateQueries('empleados');
      
    } catch (error) {
      console.error('Error al actualizar empleado:', error);
      message.error('Error al actualizar empleado: ' + (error.response?.data?.message || error.message));
    } finally {
      setActualizandoEmpleado(false);
    }
  };

  // Función para iniciar edición de empleado
  const iniciarEdicionEmpleado = (empleado) => {
    setEmpleadoEditando(empleado);
    setEditandoEmpleadoNombre(empleado.nombre || empleado.nombres || '');
    setEditandoEmpleadoModal(true);
  };

  // Función para calcular comisión
  const calcularComision = useCallback((monto) => {
    // 3% de comisión para transacciones de ingreso
    return tipoTransaccion === 'INGRESO' ? monto * 0.03 : 0;
  }, [tipoTransaccion]);

  // Efecto para actualizar la comisión cuando cambia el monto o el tipo
  useEffect(() => {
    if (monto > 0 && tipoTransaccion === 'INGRESO') {
      setComision(calcularComision(monto));
    } else {
      setComision(0);
    }
  }, [monto, tipoTransaccion, calcularComision]);

  // Efecto para establecer el primer tipo de transacción disponible cuando se cargan los datos
  useEffect(() => {
    // Si viene pre-cargado como venta de vehículo, buscar el tipo correspondiente
    if (prefilledData.esVentaVehiculo && tipoTransaccion === 'INGRESO' && tiposIngreso && tiposIngreso.length > 0) {
      const ventaType = tiposIngreso.find(t => t.nombre.toLowerCase().includes('venta') && t.nombre.toLowerCase().includes('veh'));
      if (ventaType) {
        form.setFieldsValue({ tipo: ventaType.id });
        return;
      }
    }
    
    // Fallback: primer elemento de la lista si el valor actual no está definido
    const currentTipo = form.getFieldValue('tipo');
    if (!currentTipo) {
      if (tipoTransaccion === 'INGRESO' && tiposIngreso && tiposIngreso.length > 0) {
        form.setFieldsValue({ tipo: tiposIngreso[0].id });
      } else if (tipoTransaccion === 'EGRESO' && tiposEgreso && tiposEgreso.length > 0) {
        form.setFieldsValue({ tipo: tiposEgreso[0].id });
      }
    }
  }, [tiposIngreso, tiposEgreso, tipoTransaccion, form, prefilledData.esVentaVehiculo]);
  
  // Efecto para rellenar los datos del formulario si vienen del location state
  useEffect(() => {
    if (prefilledData.vehiculoId) {
      form.setFieldsValue({ vehiculo_id: prefilledData.vehiculoId });
    }
    if (prefilledData.monto) {
      form.setFieldsValue({ monto: prefilledData.monto });
    }
  }, [form, prefilledData]);

  // Función para filtrar repuestos según vehículo seleccionado
  const getRepuestosFiltrados = useCallback(() => {
    if (!vehiculoSeleccionado) {
      // Si no hay vehículo seleccionado, mostrar todos los repuestos
      return repuestos;
    }
    // Si hay vehículo seleccionado, mostrar solo los repuestos de ese vehículo
    return repuestos.filter(repuesto => repuesto.vehiculoOrigenId === vehiculoSeleccionado);
  }, [repuestos, vehiculoSeleccionado]);

  // Manejador de cambios en el selector de vehículo
  const handleVehiculoChange = useCallback((vehiculoId) => {
    setVehiculoSeleccionado(vehiculoId);
    // Limpiar el campo de repuesto cuando cambia el vehículo
    form.setFieldsValue({ repuesto_id: null });
    
    // Auto-popular monto si es "Costo de Grúa" y hay un vehículo seleccionado
    const tipoActualId = form.getFieldValue('tipo');
    if (tipoActualId && vehiculoId) {
      const tipoSeleccionado = [...(tiposIngreso || []), ...(tiposEgreso || [])]
        .find(t => t.id === tipoActualId);
      
      if (tipoSeleccionado) {
        const nombreTipo = tipoSeleccionado.nombre.toLowerCase();
        const esCostoGrua = nombreTipo.includes('grúa') || nombreTipo.includes('grua');
        const esVentaVehiculo = nombreTipo.includes('venta') && nombreTipo.includes('veh');
        const esCompraVehiculo = nombreTipo.includes('compra') && nombreTipo.includes('veh');
        
        const vehiculo = vehiculos.find(v => v.id === vehiculoId);
        if (vehiculo) {
          let nuevoMonto = 0;
          let campoBuscado = '';
          
          if (esCostoGrua) {
            nuevoMonto = parseFloat(vehiculo.costoGrua);
            campoBuscado = 'costo de grúa';
          }
          else if (esVentaVehiculo) {
            nuevoMonto = parseFloat(vehiculo.precioVenta);
            campoBuscado = 'precio de venta';
          }
          else if (esCompraVehiculo) {
            nuevoMonto = parseFloat(vehiculo.precioCompra);
            campoBuscado = 'precio de compra';
          }
          
          if (nuevoMonto > 0) {
            form.setFieldsValue({ monto: nuevoMonto });
            setMonto(nuevoMonto);
          } else if (esCostoGrua || esVentaVehiculo || esCompraVehiculo) {
            // El vehículo no tiene el precio registrado
            form.setFieldsValue({ monto: 0 });
            setMonto(0);
            message.info(`El vehículo seleccionado no tiene un ${campoBuscado} registrado.`);
          }
        }
      }
    }
    
    // Si se selecciona "-- Seleccione un vehículo --" (null), resetear al estado inicial
    if (vehiculoId === null) {
      // Resetear al estado inicial como si no hubiera vehículo seleccionado
      setVehiculoSeleccionado(null);
    }
  }, [form, tiposIngreso, tiposEgreso, vehiculos]);

  const onFinish = async (values) => {
    try {
      const esEgreso = tipoTransaccion === 'EGRESO';
      const montoValor = parseFloat(monto) || 0;
      
      if (montoValor <= 0) {
        message.error('El monto debe ser mayor a 0');
        return;
      }
      
      // Validar que se haya seleccionado un tipo de transacción
      if (!values.tipo) {
        message.error('Debe seleccionar un tipo de transacción');
        return;
      }
      
      // Preparar el payload base
      const payload = {
        fecha: values.fecha.format('YYYY-MM-DD'),
        tipoTransaccionId: values.tipo,
        monto: esEgreso ? Math.abs(montoValor) : montoValor,
        descripcion: values.descripcion || null,
        estado: 'COMPLETADA'
      };
      
      if (esEgreso) {
        // Agregar campos específicos de egresos
        Object.assign(payload, {
          empleadoId: values.empleado_id || null,
          vehiculoId: values.vehiculo_id || null,
          repuestoId: values.repuesto_id || null,
          comisionEmpleado: 0,
          proveedor: values.proveedor || null,
          metodoPago: values.metodo_pago || 'EFECTIVO'
        });
        
        // Agregar tipo de transferencia a la descripción si existe
        if (values.tipoTransferencia) {
          const nombreTransferencia = {
            'SINPE': 'SINPE',
            'TARJETA': 'Tarjeta',
            'EFECTIVO': 'Efectivo',
            'TRANSFERENCIA': 'Transferencia bancaria'
          }[values.tipoTransferencia] || values.tipoTransferencia;
          
          // Concatenar a la descripción existente con salto de línea
          const descripcionBase = payload.descripcion || '';
          const separador = descripcionBase ? '\n' : '';
          payload.descripcion = `${descripcionBase}${separador}Transferencia: ${nombreTransferencia}`;
        }
      } else {
        // Para ingresos, vehículo es opcional
        // No se requiere validación de vehículo
        
        // Agregar campos específicos de ingresos
        Object.assign(payload, {
          empleadoId: values.empleado_id || null,
          vehiculoId: values.vehiculo_id,
          repuestoId: values.repuesto_id || null,
          comisionEmpleado: parseFloat(comision) || 0
        });
        
        // Agregar tipo de transferencia a la descripción si existe
        if (values.tipoTransferencia) {
          const nombreTransferencia = {
            'SINPE': 'SINPE',
            'TARJETA': 'Tarjeta',
            'EFECTIVO': 'Efectivo',
            'TRANSFERENCIA': 'Transferencia bancaria'
          }[values.tipoTransferencia] || values.tipoTransferencia;
          
          // Concatenar a la descripción existente con salto de línea
          const descripcionBase = payload.descripcion || '';
          const separador = descripcionBase ? '\n' : '';
          payload.descripcion = `${descripcionBase}${separador}Transferencia: ${nombreTransferencia}`;
        }
      }
      
      console.log('🚀 [FRONTEND] Enviando transacción:', payload);
      console.log('📋 [FRONTEND] Detalles del payload:', {
        tipoTransaccionId: payload.tipoTransaccionId,
        monto: payload.monto,
        esEgreso: esEgreso,
        vehiculoId: payload.vehiculoId,
        repuestoId: payload.repuestoId,
        empleadoId: payload.empleadoId
      });
      
      crearTransaccion(payload);
    } catch (error) {
      console.error('Error al preparar los datos:', error);
      message.error(error.response?.data?.message || 'Error al procesar los datos del formulario');
    }
  };

  const handleTipoTransaccionChange = (value) => {
    // Actualizar el tipo de transacción (INGRESO/EGRESO) basado en la selección
    const tipoSeleccionado = [...(tiposIngreso || []), ...(tiposEgreso || [])]
      .find(t => t.id === value);
      
    if (tipoSeleccionado) {
      setTipoTransaccion(tipoSeleccionado.categoria);
      setEsReembolso(tipoSeleccionado.nombre.toLowerCase().includes('reembolso'));
      
      // Auto-popular monto si es relacionado a vehículo y hay uno seleccionado
      const nombreTipo = tipoSeleccionado.nombre.toLowerCase();
      const esCostoGrua = nombreTipo.includes('grúa') || nombreTipo.includes('grua');
      const esVentaVehiculo = nombreTipo.includes('venta') && nombreTipo.includes('veh');
      const esCompraVehiculo = nombreTipo.includes('compra') && nombreTipo.includes('veh');
      
      if (vehiculoSeleccionado) {
        const vehiculo = vehiculos.find(v => v.id === vehiculoSeleccionado);
        if (vehiculo) {
          let nuevoMonto = 0;
          let campoBuscado = '';
          
          if (esCostoGrua) {
            nuevoMonto = parseFloat(vehiculo.costoGrua);
            campoBuscado = 'costo de grúa';
          }
          else if (esVentaVehiculo) {
            nuevoMonto = parseFloat(vehiculo.precioVenta);
            campoBuscado = 'precio de venta';
          }
          else if (esCompraVehiculo) {
            nuevoMonto = parseFloat(vehiculo.precioCompra);
            campoBuscado = 'precio de compra';
          }
          
          if (nuevoMonto > 0) {
            form.setFieldsValue({ monto: nuevoMonto });
            setMonto(nuevoMonto);
          } else if (esCostoGrua || esVentaVehiculo || esCompraVehiculo) {
            // El vehículo no tiene el precio registrado
            form.setFieldsValue({ monto: 0 });
            setMonto(0);
            message.info(`El vehículo seleccionado no tiene un ${campoBuscado} registrado.`);
          }
        }
      }
      
      // Resetear campos específicos cuando cambia entre ingreso/egreso
      if (tipoSeleccionado.categoria === 'INGRESO') {
        form.setFieldsValue({ 
          vehiculo_id: undefined, 
          repuesto_id: undefined,
          proveedor: undefined,
          metodo_pago: undefined
        });
      } else {
        form.setFieldsValue({ 
          vehiculo_id: undefined,
          repuesto_id: undefined,
          comision: 0
        });
      }
    }
  };

  // Función para manejar la selección de un repuesto
  const handleRepuestoChange = (value) => {
    const repuesto = repuestos.find(r => r.id === value);
    if (repuesto) {
      if (esReembolso) {
        const montoReembolso = tipoTransaccion === 'EGRESO' ? repuesto.precioVenta : repuesto.precioCosto;
        form.setFieldsValue({ monto: montoReembolso });
        setMonto(montoReembolso || 0);
      } else if (tipoTransaccion === 'EGRESO') {
        form.setFieldsValue({ monto: repuesto.precioCosto });
        setMonto(repuesto.precioCosto || 0);
      } else if (tipoTransaccion === 'INGRESO') {
        form.setFieldsValue({ monto: repuesto.precioVenta });
        setMonto(repuesto.precioVenta || 0);
      }
    }
  };




  const handleMontoChange = (value) => {
    const montoNumerico = parseFloat(value) || 0;
    setMonto(montoNumerico);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* ── Header de navegación ─────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ color: '#595959', fontWeight: 500 }}
        >
          Volver
        </Button>
        <Title level={3} style={{ margin: 0, fontWeight: 600 }}>
          Nueva Transacción
        </Title>
        <div style={{ width: '100px' }}></div> {/* Spacer */}
      </div>

      <Card
        bordered={false}
        style={{ borderRadius: '12px', border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
        bodyStyle={{ padding: '32px' }}
      >
        <Tabs 
          defaultActiveKey={tipoTransaccion.toLowerCase()}
          onChange={(key) => setTipoTransaccion(key.toUpperCase())}
        >
          <TabPane 
            tab={
              <span>
                <ArrowUpOutlined style={{ color: '#52c41a' }} />
                Ingreso
              </span>
            } 
            key="ingreso"
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{
                fecha: dayjs(),
                tipo: 1,
                monto: 0,
                comision: 0
              }}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="fecha"
                    label="Fecha"
                    rules={[{ required: true, message: 'Seleccione la fecha' }]}
                  >
                    <DatePicker 
                      style={{ width: '100%' }} 
                      format="DD/MM/YYYY"
                      placeholder="Seleccione fecha"
                      defaultValue={dayjs()}
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="tipo"
                    label="Tipo de Transacción"
                    rules={[{ required: true, message: 'Seleccione el tipo de transacción' }]}
                    extra={esReembolso && <Text type="warning">Seleccione el repuesto en STOCK que está siendo devuelto al proveedor. Se eliminará del inventario al guardar.</Text>}
                  >
                    <Select 
                      placeholder={loadingTiposIngreso ? 'Cargando...' : 'Seleccione el tipo'}
                      onChange={handleTipoTransaccionChange}
                      loading={loadingTiposIngreso}
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                    >
                      {tiposIngreso?.map(tipo => (
                        <Option key={tipo.id} value={tipo.id}>
                          {tipo.nombre}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  
                  {/* Tipo de Transferencia - Justo debajo de Tipo de Transacción */}
                  <Form.Item
                    name="tipoTransferencia"
                    label="Tipo de Transferencia"
                  >
                    <Select 
                      placeholder="Seleccione el tipo de transferencia"
                    >
                      <Option value="SINPE">SINPE</Option>
                      <Option value="TARJETA">Tarjeta</Option>
                      <Option value="EFECTIVO">Efectivo</Option>
                      <Option value="TRANSFERENCIA">Transferencia bancaria</Option>
                    </Select>
                  </Form.Item>
                  
                  <Form.Item
                    name="monto"
                    label="Monto"
                    rules={[{ 
                      required: true, 
                      message: 'Ingrese el monto',
                      validator: (_, value) => {
                        if (!value && value !== 0) {
                          return Promise.reject('Por favor ingrese un monto');
                        }
                        if (parseFloat(value) <= 0) {
                          return Promise.reject('El monto debe ser mayor a 0');
                        }
                        return Promise.resolve();
                      }
                    }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value.replace(/₡\s?|(,*)/g, '')}
                      placeholder="0.00"
                      min={0}
                      step={0.01}
                      onChange={(value) => setMonto(value)}
                    />
                  </Form.Item>
                </Col>
                
                <Col xs={24} md={12}>
                  <Form.Item
                    name="empleado_id"
                    label={tipoTransaccion === 'EGRESO' ? 'Empleado Responsable (opcional)' : 'Empleado (opcional)'}
                    rules={[]}
                  >
                    <Select 
                      placeholder={loadingEmpleados ? 'Cargando empleados...' : 
                                 empleados.length === 0 ? 'No hay empleados disponibles' : 
                                 'Seleccione un empleado'}
                      loading={loadingEmpleados}
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        option && option.children 
                          ? option.children.toLowerCase().includes(input.toLowerCase())
                          : option.props.className === 'add-new-option' // Always show add new option
                      }
                      dropdownRender={(menu) => {
                        return (
                          <div>
                            {menu}
                            <Divider style={{ margin: '8px 0' }} />
                            { editandoEmpleadoModal ? (
                              <div style={{ padding: '8px', display: 'flex', gap: '8px' }}>
                                <Input
                                  autoFocus
                                  size="small"
                                  placeholder="Editar nombre del empleado"
                                  value={editandoEmpleadoNombre}
                                  onChange={(e) => setEditandoEmpleadoNombre(e.target.value)}
                                  onPressEnter={handleEditarEmpleado}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      setEditandoEmpleadoModal(false);
                                      setEmpleadoEditando(null);
                                      setEditandoEmpleadoNombre('');
                                    }
                                  }}
                                  style={{ flex: 1 }}
                                />
                                <Button
                                  type="text"
                                  icon={<CheckOutlined style={{ color: '#52c41a' }} />}
                                  onClick={handleEditarEmpleado}
                                  loading={actualizandoEmpleado}
                                  disabled={!editandoEmpleadoNombre.trim()}
                                  title="Actualizar"
                                />
                                <Button
                                  type="text"
                                  danger
                                  icon={<CloseOutlined />}
                                  onClick={() => {
                                    setEditandoEmpleadoModal(false);
                                    setEmpleadoEditando(null);
                                    setEditandoEmpleadoNombre('');
                                  }}
                                  disabled={actualizandoEmpleado}
                                  title="Cancelar"
                                />
                              </div>
                            ) : nuevoEmpleadoModal ? (
                              <div style={{ padding: '8px', display: 'flex', gap: '8px' }}>
                                <Input
                                  autoFocus
                                  size="small"
                                  placeholder="Nombre del empleado"
                                  value={nuevoEmpleadoNombre}
                                  onChange={(e) => setNuevoEmpleadoNombre(e.target.value)}
                                  onPressEnter={handleNuevoEmpleado}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      setNuevoEmpleadoModal(false);
                                      setNuevoEmpleadoNombre('');
                                    }
                                  }}
                                  style={{ flex: 1 }}
                                />
                                <Button
                                  type="text"
                                  icon={<CheckOutlined style={{ color: '#52c41a' }} />}
                                  onClick={handleNuevoEmpleado}
                                  loading={creandoEmpleado}
                                  disabled={!nuevoEmpleadoNombre.trim()}
                                  title="Agregar"
                                />
                                <Button
                                  type="text"
                                  danger
                                  icon={<CloseOutlined />}
                                  onClick={() => {
                                    setNuevoEmpleadoModal(false);
                                    setNuevoEmpleadoNombre('');
                                  }}
                                  disabled={creandoEmpleado}
                                  title="Cancelar"
                                />
                              </div>
                            ) : (
                              <div 
                                style={{ 
                                  padding: '4px 8px', 
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  color: '#1890ff'
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setNuevoEmpleadoModal(true);
                                  setNuevoEmpleadoNombre('');
                                }}
                              >
                                <PlusOutlined style={{ marginRight: 8 }} />
                                Agregar nuevo empleado
                              </div>
                            )}
                          </div>
                        );
                      }}
                    >
                      {empleados.map(empleado => (
                        <Option key={empleado.id} value={empleado.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span>{empleado.nombre || `${empleado.nombres} ${empleado.apellidos}`}</span>
                            <EditOutlined 
                              style={{ 
                                fontSize: '12px', 
                                color: '#722ed1', 
                                cursor: 'pointer',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                transition: 'all 0.2s'
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                iniciarEdicionEmpleado(empleado);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f0f0f0';
                                e.currentTarget.style.color = '#531dab';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#722ed1';
                              }}
                              title="Editar empleado"
                            />
                          </div>
                        </Option>
                      ))}
                    </Select>
                    {empleados.length === 0 && !loadingEmpleados && (
                      <Text type="warning">No hay empleados disponibles. Por favor, agregue empleados primero.</Text>
                    )}
                  </Form.Item>
                  
                  <Form.Item
                    name="vehiculo_id"
                    label="Vehículo (opcional)"
                    rules={[]}
                  >
                    <Select 
                      placeholder={
                        loadingVehiculos ? 'Cargando vehículos...' : 
                        errorVehiculos ? 'Error al cargar vehículos' :
                        vehiculos.length === 0 ? 'No hay vehículos disponibles' : 
                        'Seleccione un vehículo'
                      }
                      loading={loadingVehiculos}
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        option?.children?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                      onChange={handleVehiculoChange}
                      allowClear
                    >
                      <Option key="placeholder" value={null} disabled>
                        Seleccione un vehículo
                      </Option>
                      {vehiculos.map(vehiculo => {
                        // Formatear la información del vehículo según la estructura del backend
                        const codigo = vehiculo.codigoVehiculo || 'SIN_CODIGO';
                        const anio = vehiculo.anio || 'Año N/A';
                        const estado = vehiculo.estado || 'SIN_ESTADO';
                        const marca = vehiculo.marca || 'Marca N/A';
                        const modelo = vehiculo.modelo || 'Modelo N/A';
                        
                        // Formatear estado para que sea más amigable visualmente
                        let estadoAmigable = estado;
                        if (estado === 'DESARMADO') {
                          estadoAmigable = 'Para repuestos';
                        } else if (estado === 'REPARACION') {
                          estadoAmigable = 'Para reparar';
                        } else if (estado !== 'SIN_ESTADO') {
                          estadoAmigable = estado.charAt(0).toUpperCase() + estado.slice(1).toLowerCase();
                        }
                            
                        // Crear el texto de visualización: TOCO-001 — Toyota Corolla 2021 (Disponible)
                        const displayText = `${codigo} — ${marca} ${modelo} ${anio} (${estadoAmigable})`;
                        
                        return (
                          <Option 
                            key={vehiculo.id} 
                            value={vehiculo.id}
                            title={displayText}
                          >
                            {displayText}
                          </Option>
                        );
                      })}
                    </Select>
                    {errorVehiculos && (
                      <Alert 
                        message="Error" 
                        description="No se pudieron cargar los vehículos. Por favor, intente nuevamente." 
                        type="error" 
                        showIcon 
                        className="mt-2"
                      />
                    )}
                    {vehiculos.length === 0 && !loadingVehiculos && !errorVehiculos && (
                      <Text type="warning">No hay vehículos disponibles. Por favor, agregue vehículos primero.</Text>
                    )}
                  </Form.Item>
                  
                  <Form.Item
                    name="repuesto_id"
                    label={tipoTransaccion === 'INGRESO' ? 'Repuesto (opcional)' : 'Repuesto'}
                  >
                    <Select 
                      placeholder={
                        loadingRepuestos ? 'Cargando repuestos...' : 
                        getRepuestosFiltrados().length === 0 ? 
                          (vehiculoSeleccionado ? 'No hay repuestos para este vehículo' : 'No hay repuestos disponibles') :
                          'Seleccione el repuesto'
                      }
                      onChange={handleRepuestoChange}
                      loading={loadingRepuestos}
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        option?.children?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                    >
                      {getRepuestosFiltrados().map(repuesto => (
                        <Option key={repuesto.id} value={repuesto.id}>
                          {repuesto.descripcion} - {repuesto.codigo} {repuesto.ubicacion ? `(${repuesto.ubicacion})` : ''}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  
                  <Form.Item
                    name="descripcion"
                    label="Descripción"
                  >
                    <TextArea rows={3} placeholder="Descripción de la transacción" />
                  </Form.Item>
                </Col>
              </Row>
              
              <Divider style={{ margin: '32px 0 24px' }} />
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <Button 
                  size="large"
                  onClick={() => navigate(-1)}
                  style={{ borderRadius: '6px' }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  icon={<SaveOutlined />}
                  loading={isCreating}
                  disabled={isCreating}
                  size="large"
                  style={{ borderRadius: '6px', padding: '0 32px' }}
                >
                  {isCreating ? 'Guardando...' : 'Guardar Transacción'}
                </Button>
              </div>
            </Form>
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <ArrowDownOutlined style={{ color: '#f5222d' }} />
                Egreso
              </span>
            } 
            key="egreso"
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{
                fecha: dayjs(),
                monto: 0
              }}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="fecha"
                    label="Fecha"
                    rules={[{ required: true, message: 'Seleccione la fecha' }]}
                  >
                    <DatePicker 
                      style={{ width: '100%' }} 
                      format="DD/MM/YYYY"
                      placeholder="Seleccione fecha"
                      defaultValue={dayjs()}
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="tipo"
                    label="Tipo de Egreso"
                    rules={[{ required: true, message: 'Seleccione el tipo de egreso' }]}
                    extra={esReembolso && <Text type="warning">Seleccione el repuesto vendido que está siendo devuelto. Volverá automáticamente al inventario (STOCK) al guardar.</Text>}
                  >
                    <Select 
                      placeholder={loadingTiposEgreso ? 'Cargando...' : 'Seleccione el tipo'}
                      onChange={handleTipoTransaccionChange}
                      loading={loadingTiposEgreso}
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                    >
                      {tiposEgreso?.map(tipo => (
                        <Option key={tipo.id} value={tipo.id}>
                          {tipo.nombre}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  
                  {/* Tipo de Transferencia - Justo debajo de Tipo de Egreso */}
                  <Form.Item
                    name="tipoTransferencia"
                    label="Tipo de Transferencia"
                  >
                    <Select 
                      placeholder="Seleccione el tipo de transferencia"
                    >
                      <Option value="SINPE">SINPE</Option>
                      <Option value="TARJETA">Tarjeta</Option>
                      <Option value="EFECTIVO">Efectivo</Option>
                      <Option value="TRANSFERENCIA">Transferencia bancaria</Option>

                    </Select>
                  </Form.Item>
                  
                  <Form.Item
                    name="monto"
                    label="Monto"
                    rules={[{ 
                      required: true, 
                      message: 'Ingrese el monto',
                      validator: (_, value) => {
                        if (!value && value !== 0) {
                          return Promise.reject('Por favor ingrese un monto');
                        }
                        if (parseFloat(value) <= 0) {
                          return Promise.reject('El monto debe ser mayor a 0');
                        }
                        return Promise.resolve();
                      }
                    }]}
                  >
                    <InputNumber 
                      style={{ width: '100%' }} 
                      min={0.01}
                      step={0.01} 
                      precision={2}
                      formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value.replace(/₡\s?|(,*)/g, '')}
                      onChange={handleMontoChange}
                    />
                  </Form.Item>
                </Col>
                
                <Col xs={24} md={12}>

                  <Form.Item
                    name="vehiculo_id"
                    label="Vehículo (opcional)"
                    rules={[]}
                  >
                    <Select 
                      placeholder={
                        loadingVehiculos ? 'Cargando vehículos...' : 
                        errorVehiculos ? 'Error al cargar vehículos' :
                        vehiculos.length === 0 ? 'No hay vehículos disponibles' : 
                        'Seleccione un vehículo'
                      }
                      loading={loadingVehiculos}
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        option?.children?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                      onChange={handleVehiculoChange}
                      allowClear
                    >
                      <Option key="placeholder" value={null} disabled>
                        Seleccione un vehículo
                      </Option>
                      {vehiculos.map(vehiculo => {
                        // Formatear la información del vehículo según la estructura del backend
                        const codigo = vehiculo.codigoVehiculo || 'SIN_CODIGO';
                        const anio = vehiculo.anio || 'Año N/A';
                        const estado = vehiculo.estado || 'SIN_ESTADO';
                        const marca = vehiculo.marca || 'Marca N/A';
                        const modelo = vehiculo.modelo || 'Modelo N/A';
                        
                        // Formatear estado para que sea más amigable visualmente
                        let estadoAmigable = estado;
                        if (estado === 'DESARMADO') {
                          estadoAmigable = 'Para repuestos';
                        } else if (estado === 'REPARACION') {
                          estadoAmigable = 'Para reparar';
                        } else if (estado !== 'SIN_ESTADO') {
                          estadoAmigable = estado.charAt(0).toUpperCase() + estado.slice(1).toLowerCase();
                        }
                            
                        // Crear el texto de visualización: TOCO-001 — Toyota Corolla 2021 (Disponible)
                        const displayText = `${codigo} — ${marca} ${modelo} ${anio} (${estadoAmigable})`;
                        
                        return (
                          <Option 
                            key={vehiculo.id} 
                            value={vehiculo.id}
                            title={displayText}
                          >
                            {displayText}
                          </Option>
                        );
                      })}
                    </Select>
                    {errorVehiculos && (
                      <Alert 
                        message="Error" 
                        description="No se pudieron cargar los vehículos. Por favor, intente nuevamente." 
                        type="error" 
                        showIcon 
                        className="mt-2"
                      />
                    )}
                    {vehiculos.length === 0 && !loadingVehiculos && !errorVehiculos && (
                      <Text type="warning">No hay vehículos disponibles. Por favor, agregue vehículos primero.</Text>
                    )}
                  </Form.Item>
                  
                  <Form.Item
                    name="repuesto_id"
                    label="Repuesto (opcional)"
                  >
                    <Select 
                      placeholder={
                        loadingRepuestos ? 'Cargando repuestos...' : 
                        getRepuestosFiltrados().length === 0 ? 
                          (vehiculoSeleccionado ? 'No hay repuestos para este vehículo' : 'No hay repuestos disponibles') :
                          'Seleccione el repuesto'
                      }
                      onChange={handleRepuestoChange}
                      loading={loadingRepuestos}
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        option?.children?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                    >
                      {getRepuestosFiltrados().map(repuesto => (
                        <Option key={repuesto.id} value={repuesto.id}>
                          {repuesto.descripcion} - {repuesto.codigo} {repuesto.ubicacion ? `(${repuesto.ubicacion})` : ''}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  
                  <Form.Item
                    name="descripcion"
                    label="Descripción"
                  >
                    <TextArea rows={4} placeholder="Descripción detallada del egreso" />
                  </Form.Item>
                </Col>
              </Row>
              
              <Divider style={{ margin: '32px 0 24px' }} />
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <Button 
                  size="large"
                  onClick={() => navigate(-1)}
                  style={{ borderRadius: '6px' }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  icon={<SaveOutlined />}
                  loading={isCreating}
                  size="large"
                  style={{ borderRadius: '6px', padding: '0 32px' }}
                >
                  Registrar Egreso
                </Button>
              </div>
            </Form>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default NuevaTransaccion;
