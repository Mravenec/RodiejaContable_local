import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Select,
  InputNumber,
  message,
  Row,
  Col,
  Divider,
  Radio,
  Checkbox
} from 'antd';
import {
  SaveOutlined,
  ArrowLeftOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useMarcas } from '../../hooks/useMarcas';
import { useModelos } from '../../hooks/useModelos';
import { useGeneraciones } from '../../hooks/useGeneraciones';
import { useVehiculos } from '../../hooks/useVehiculos';
import api from '../../api/axios';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const NuevoRepuesto = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Obtener vehiculoId de los query parameters
  const queryParams = new URLSearchParams(location.search);
  const vehiculoId = queryParams.get('vehiculoId');

  const [loading, setLoading] = useState(false);
  const [tipoRepuesto, setTipoRepuesto] = useState('con_vehiculo');
  const [ubicacionFisicaHabilitada, setUbicacionFisicaHabilitada] = useState(false);
  const [precioCostoUnitario, setPrecioCostoUnitario] = useState(0);
  const [cantidad, setCantidad] = useState(1);

  // Determinar si el selector debe estar deshabilitado (modo lectura)
  const selectorDeshabilitado = !!vehiculoId;

  // Estados para la cadena de selección (solo para repuestos SIN vehículo)
  const [marcaSeleccionada, setMarcaSeleccionada] = useState(null);
  const [modeloSeleccionado, setModeloSeleccionado] = useState(null);
  const [generacionSeleccionada, setGeneracionSeleccionada] = useState(null);

  // Estados para manejar nuevo marca/modelo/generacion inline
  const [nuevaMarcaModal, setNuevaMarcaModal] = useState(false);
  const [nuevaMarcaNombre, setNuevaMarcaNombre] = useState('');
  const [creandoMarca, setCreandoMarca] = useState(false);

  const [nuevoModeloModal, setNuevoModeloModal] = useState(false);
  const [nuevoModeloNombre, setNuevoModeloNombre] = useState('');
  const [creandoModelo, setCreandoModelo] = useState(false);

  const [nuevaGeneracionModal, setNuevaGeneracionModal] = useState(false);
  const [nuevaGeneracionNombre, setNuevaGeneracionNombre] = useState('');
  const [nuevaGeneracionAnioInicio, setNuevaGeneracionAnioInicio] = useState('');
  const [nuevaGeneracionAnioFin, setNuevaGeneracionAnioFin] = useState('');
  const [creandoGeneracion, setCreandoGeneracion] = useState(false);

  // Cálculos dinámicos
  const costoTotalCalculado = precioCostoUnitario * (cantidad > 0 ? cantidad : 1);
  const precioVentaCalculado = precioCostoUnitario * 1.5;
  const formula15Calculada = precioCostoUnitario * 1.15;
  const formula30Calculada = precioCostoUnitario * 1.30;

  // Actualizar el campo precio_venta en el formulario cuando cambia el valor calculado
  useEffect(() => {
    form.setFieldsValue({ precio_venta: precioVentaCalculado });
  }, [precioVentaCalculado, form]);

  // Función para crear nueva marca
  const handleNuevaMarca = async () => {
    if (!nuevaMarcaNombre.trim()) {
      message.warning('Por favor ingrese el nombre de la marca');
      return;
    }

    setCreandoMarca(true);
    try {
      const response = await api.post('/marcas', {
        nombre: nuevaMarcaNombre.trim()
      });

      console.log('Marca creada:', response.data);
      message.success('Marca creada exitosamente');

      setNuevaMarcaModal(false);
      setNuevaMarcaNombre('');

      // Refrescar la lista de marcas
      queryClient.invalidateQueries('marcas');

    } catch (error) {
      console.error('Error al crear marca:', error);
      message.error('Error al crear marca: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreandoMarca(false);
    }
  };

  // Función para crear nuevo modelo
  const handleNuevoModelo = async () => {
    if (!nuevoModeloNombre.trim()) {
      message.warning('Por favor ingrese el nombre del modelo');
      return;
    }

    setCreandoModelo(true);
    try {
      const response = await api.post('/modelos', {
        nombre: nuevoModeloNombre.trim(),
        marcaId: marcaSeleccionada
      });

      console.log('Modelo creado:', response.data);
      message.success('Modelo creado exitosamente');

      setNuevoModeloModal(false);
      setNuevoModeloNombre('');

      // Refrescar la lista de modelos
      queryClient.invalidateQueries('modelos');

    } catch (error) {
      console.error('Error al crear modelo:', error);
      message.error('Error al crear modelo: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreandoModelo(false);
    }
  };

  // Función para crear nueva generación
  const handleNuevaGeneracion = async () => {
    if (!nuevaGeneracionNombre.trim()) {
      message.warning('Por favor ingrese el nombre de la generación');
      return;
    }
    if (!nuevaGeneracionAnioInicio || !nuevaGeneracionAnioFin) {
      message.warning('Por favor ingrese los años de inicio y fin');
      return;
    }

    setCreandoGeneracion(true);
    try {
      const response = await api.post('/generaciones', {
        nombre: nuevaGeneracionNombre.trim(),
        anioInicio: parseInt(nuevaGeneracionAnioInicio),
        anioFin: parseInt(nuevaGeneracionAnioFin),
        modeloId: modeloSeleccionado
      });

      console.log('Generación creada:', response.data);
      message.success('Generación creada exitosamente');

      setNuevaGeneracionModal(false);
      setNuevaGeneracionNombre('');
      setNuevaGeneracionAnioInicio('');
      setNuevaGeneracionAnioFin('');

      // Refrescar la lista de generaciones
      queryClient.invalidateQueries('generaciones');

    } catch (error) {
      console.error('Error al crear generación:', error);
      message.error('Error al crear generación: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreandoGeneracion(false);
    }
  };

  // Hooks para cargar datos
  const { data: marcas = [], isLoading: loadingMarcas } = useMarcas();
  const { data: modelos = [], isLoading: loadingModelos } = useModelos(
    marcaSeleccionada,
    tipoRepuesto === 'sin_vehiculo' && !!marcaSeleccionada
  );
  const { data: generaciones = [], isLoading: loadingGeneraciones } = useGeneraciones(
    modeloSeleccionado,
    tipoRepuesto === 'sin_vehiculo' && !!modeloSeleccionado
  );

  // Para repuestos CON vehículo: cargar vehículos solo cuando sea necesario
  const { data: todosVehiculos = [], isLoading: loadingVehiculos } = useVehiculos(
    {},
    tipoRepuesto === 'con_vehiculo'
  );

  // Filtrar solo vehículos DESARMADOS
  const vehiculosDesarmados = React.useMemo(() => {
    if (tipoRepuesto !== 'con_vehiculo') return [];
    return todosVehiculos.filter(v =>
      v.estado && v.estado.toUpperCase() === 'DESARMADO'
    );
  }, [todosVehiculos, tipoRepuesto]);

  // Función para obtener texto completo del vehículo
  const getVehiculoDisplayText = (vehiculo) => {
    const codigo = vehiculo.codigoVehiculo || vehiculo.codigo_vehiculo || 'Sin código';
    const anio = vehiculo.anio || '';

    let marca = '';
    let modelo = '';
    let generacion = '';

    if (vehiculo.generacion) {
      if (typeof vehiculo.generacion === 'object') {
        marca = vehiculo.generacion.marca || '';
        modelo = vehiculo.generacion.modelo || '';
        generacion = vehiculo.generacion.nombre || '';
      }
    }

    const partes = [codigo, anio, marca, modelo, generacion].filter(p => p);
    return partes.join(' ');
  };

  // Opciones para parte_vehiculo según tipo
  const getParteOptions = () => {
    if (tipoRepuesto === 'con_vehiculo') {
      return [
        { value: 'MOTOR', label: 'Motor' },
        { value: 'CHASIS', label: 'Chasis' },
        { value: 'CARROCERIA', label: 'Carrocería' },
        { value: 'COMPUTADORA', label: 'Computadora' },
        { value: 'CAJA_DE_CAMBIO', label: 'Caja de Cambio' },
        { value: 'AIRBAGS_O_BOLSAS_DE_AIRE', label: 'Airbags o Bolsas de Aire' },
        { value: 'EJES_Y_DIFERENCIA', label: 'Ejes y Diferencia' },
        { value: 'SUSPENSION_Y_AMORTIGUAMIENTO', label: 'Suspensión y Amortiguamiento' },
        { value: 'EMBRAGUE', label: 'Embrague' },
        { value: 'SISTEMA_DE_FRENOS', label: 'Sistema de Frenos' },
        { value: 'TANQUE_DE_GASOLINA', label: 'Tanque de Gasolina' },
        { value: 'DISTRIBUIDOR', label: 'Distribuidor' },
        { value: 'RADIADOR', label: 'Radiador' },
        { value: 'VENTILADOR', label: 'Ventilador' },
        { value: 'BOMBA_DE_AGUA', label: 'Bomba de Agua' },
        { value: 'BATERIA', label: 'Batería' },
        { value: 'AROS_Y_LLANTAS', label: 'Aros y Llantas' },
        { value: 'SISTEMA_DE_DIRECCION', label: 'Sistema de Dirección' },
        { value: 'SISTEMA_ELECTRICO', label: 'Sistema Eléctrico' },
        { value: 'FUSIBLES', label: 'Fusibles' },
        { value: 'ALTERNADOR', label: 'Alternador' },
        { value: 'VALVULAS_DE_ESCAPE', label: 'Válvulas de Escape' },
        { value: 'TURBO', label: 'Turbo' }
      ];
    } else {
      return [
        { value: 'MOTOR', label: 'Motor' },
        { value: 'CHASIS', label: 'Chasis' },
        { value: 'CARROCERIA', label: 'Carrocería' },
        { value: 'COMPUTADORA', label: 'Computadora' },
        { value: 'CAJA DE CAMBIO', label: 'Caja de Cambio' },
        { value: 'AIRBAGS O BOLSAS DE AIRE', label: 'Airbags o Bolsas de Aire' },
        { value: 'EJES Y DIFERENCIA', label: 'Ejes y Diferencia' },
        { value: 'SUSPENSION Y AMORTIGUAMIENTO', label: 'Suspensión y Amortiguamiento' },
        { value: 'EMBRAGUE', label: 'Embrague' },
        { value: 'SISTEMA DE FRENOS', label: 'Sistema de Frenos' },
        { value: 'TANQUE DE GASOLINA', label: 'Tanque de Gasolina' },
        { value: 'DISTRIBUIDOR', label: 'Distribuidor' },
        { value: 'RADIADOR', label: 'Radiador' },
        { value: 'VENTILADOR', label: 'Ventilador' },
        { value: 'BOMBA DE AGUA', label: 'Bomba de Agua' },
        { value: 'BATERIA', label: 'Batería' },
        { value: 'AROS Y LLANTAS', label: 'Aros y Llantas' },
        { value: 'SISTEMA DE DIRECCION', label: 'Sistema de Dirección' },
        { value: 'SISTEMA ELECTRICO', label: 'Sistema Eléctrico' },
        { value: 'FUSIBLES', label: 'Fusibles' },
        { value: 'ALTERNADOR', label: 'Alternador' },
        { value: 'VÁLVULAS DE ESCAPE', label: 'Válvulas de Escape' },
        { value: 'TURBO', label: 'Turbo' }
      ];
    }
  };

  // Opciones para condicion según tipo
  const getCondicionOptions = () => {
    if (tipoRepuesto === 'con_vehiculo') {
      return [
        { value: '_100_25_', label: 'Nuevo' },
        { value: '_50_25_', label: 'Usado' },
        { value: '_0_25_', label: 'Con detalles' }
      ];
    } else {
      return [
        { value: '100%-', label: 'Nuevo' },
        { value: '50%-', label: 'Usado' },
        { value: '0%-', label: 'Con detalles' }
      ];
    }
  };

  // Separador para ubicaciones según tipo
  const separator = tipoRepuesto === 'con_vehiculo' ? '_' : '-';

  // Efecto para establecer automáticamente el vehículo si viene en la URL
  useEffect(() => {
    console.log('🔍 useEffect ejecutado. vehiculoId:', vehiculoId);
    console.log('🔍 Vehículos desarmados disponibles:', vehiculosDesarmados.map(v => ({ id: v.id, codigo: v.codigoVehiculo, estado: v.estado })));

    if (vehiculoId && vehiculosDesarmados.length > 0) {
      const vehiculoExiste = vehiculosDesarmados.find(v => v.id === parseInt(vehiculoId));
      console.log('🚗 Vehículo encontrado:', vehiculoExiste);

      if (vehiculoExiste) {
        form.setFieldsValue({
          vehiculo_origen_id: parseInt(vehiculoId)
        });
        console.log('✅ Vehículo establecido en formulario');
      } else {
        console.log('⚠️ El vehículo no está desarmado o no existe');
      }
    }
  }, [vehiculoId, form, vehiculosDesarmados]);

  // Handlers para los dropdowns (solo para repuestos sin vehículo)
  const onMarcaChange = (marcaId) => {
    setMarcaSeleccionada(marcaId);
    setModeloSeleccionado(null);
    setGeneracionSeleccionada(null);
    form.setFieldsValue({
      modelo_id: undefined,
      generacion_id: undefined
    });
  };

  const onModeloChange = (modeloId) => {
    setModeloSeleccionado(modeloId);
    setGeneracionSeleccionada(null);
    form.setFieldsValue({
      generacion_id: undefined
    });
  };

  const onGeneracionChange = (generacionId) => {
    setGeneracionSeleccionada(generacionId);
  };

  const onTipoRepuestoChange = (e) => {
    const nuevoTipo = e.target.value;
    setTipoRepuesto(nuevoTipo);

    // Resetear todos los campos relevantes
    setMarcaSeleccionada(null);
    setModeloSeleccionado(null);
    setGeneracionSeleccionada(null);

    form.setFieldsValue({
      marca_id: undefined,
      modelo_id: undefined,
      generacion_id: undefined,
      vehiculo_origen_id: undefined,
      parte_vehiculo: undefined,
      condicion: undefined,
      bodega: undefined,
      zona: undefined,
      pared: undefined,
      malla: undefined,
      horizontal: undefined,
      nivel: undefined,
      piso: undefined,
      plastica: undefined,
      carton: undefined
    });
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      console.log('Valores del formulario:', values);
      console.log('Tipo de repuesto:', tipoRepuesto);

      if (tipoRepuesto === 'con_vehiculo') {
        // ✅ REPUESTO CON VEHÍCULO ORIGEN
        if (!values.vehiculo_origen_id) {
          throw new Error('Debe seleccionar un vehículo de origen');
        }

        const descripcionModificada = values.originalidad ? `[${values.originalidad}] ${values.descripcion || ''}` : (values.descripcion || '');

        // Calcular costo unitario y precio de venta
        const costoUnitario = values.precio_costo || 0;
        const precioVentaCalculado = costoUnitario * 1.5;

        // Mapear de formato BD a formato Enum Java (Jackson)
        const mapEnum = (val) => {
          if (!val) return null;
          if (val === '0-' || val === '0_') return '_0_';
          if (val === '100%-') return '_100_25_';
          if (val === '50%-') return '_50_25_';
          if (val === '0%-') return '_0_25_';
          return val.replace('-', '_');
        };

        const repuestoData = {
          vehiculoOrigenId: values.vehiculo_origen_id,
          parteVehiculo: values.parte_vehiculo,
          descripcion: descripcionModificada,
          precioCosto: costoUnitario,
          precioVenta: precioVentaCalculado,

          bodega: ubicacionFisicaHabilitada ? mapEnum(values.bodega) : null,
          zona: ubicacionFisicaHabilitada ? mapEnum(values.zona) : null,
          pared: ubicacionFisicaHabilitada ? mapEnum(values.pared) : null,
          malla: ubicacionFisicaHabilitada ? values.malla : null,
          horizontal: ubicacionFisicaHabilitada ? mapEnum(values.horizontal) : null,
          estante: ubicacionFisicaHabilitada ? values.estante : null,
          nivel: ubicacionFisicaHabilitada ? mapEnum(values.nivel) : null,
          piso: ubicacionFisicaHabilitada ? mapEnum(values.piso) : null,
          plastica: ubicacionFisicaHabilitada ? values.plastica : null,
          carton: ubicacionFisicaHabilitada ? values.carton : null,
          posicion: ubicacionFisicaHabilitada ? values.posicion : null,
          estado: values.estado || 'STOCK',
          condicion: mapEnum(values.condicion || '100%-'),
          imagenUrl: values.imagen_url || null,
          cantidad: values.cantidad || 1
        };

        console.log('Datos a enviar (con vehículo):', repuestoData);

        const response = await api.post('/inventario-repuestos', repuestoData);
        console.log('Respuesta del servidor:', response.data);

        // message.success('Repuesto creado correctamente');
        navigate('/inventario');

      } else {
        // ✅ REPUESTO SIN VEHÍCULO ORIGEN
        if (!generacionSeleccionada) {
          throw new Error('Debe seleccionar una generación para el repuesto genérico');
        }

        const descripcionModificada = values.originalidad ? `[${values.originalidad}] ${values.descripcion || ''}` : (values.descripcion || '');

        const marcaNombre = marcas.find(m => m.id === marcaSeleccionada)?.nombre || 'Generic';

        // Calcular costo unitario y precio de venta
        const costoUnitario = values.precio_costo || 0;
        const precioVentaCalculado = costoUnitario * 1.5;

        const procedureData = {
          generacionId: generacionSeleccionada,
          marcaNombre: marcaNombre,
          parteVehiculo: values.parte_vehiculo,
          descripcion: descripcionModificada,
          precioCosto: costoUnitario,
          precioVenta: precioVentaCalculado,

          bodega: ubicacionFisicaHabilitada ? values.bodega : null,
          zona: ubicacionFisicaHabilitada ? values.zona : null,
          pared: ubicacionFisicaHabilitada ? values.pared : null,
          malla: ubicacionFisicaHabilitada ? values.malla : null,
          horizontal: ubicacionFisicaHabilitada ? values.horizontal : null,
          estante: ubicacionFisicaHabilitada ? values.estante : null,
          nivel: ubicacionFisicaHabilitada ? values.nivel : null,
          piso: ubicacionFisicaHabilitada ? values.piso : null,
          plastica: ubicacionFisicaHabilitada ? values.plastica : null,
          carton: ubicacionFisicaHabilitada ? values.carton : null,
          posicion: ubicacionFisicaHabilitada ? values.posicion : null,
          estado: values.estado || 'STOCK',
          condicion: values.condicion || '100%-',
          imagenUrl: values.imagen_url || null,
          cantidad: values.cantidad || 1
        };

        console.log('Datos a enviar (sin vehículo):', procedureData);

        const response = await api.post('/inventario-repuestos/sin-vehiculo', procedureData);
        console.log('Respuesta del servidor:', response.data);

        // message.success('Repuesto genérico creado correctamente');
        navigate('/inventario');
      }

    } catch (error) {
      console.error('Error completo:', error);
      let errorMsg = error.response?.data?.message || error.response?.data || error.message;
      if (typeof errorMsg === 'object') {
        errorMsg = JSON.stringify(errorMsg);
      }
      message.error('Error al guardar el repuesto: ' + errorMsg);
    } finally {
      setLoading(false);
    }
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
          disabled={loading}
        >
          Volver
        </Button>
        <Title level={3} style={{ margin: 0, fontWeight: 600 }}>
          Registrar Nuevo Repuesto
        </Title>
        <div style={{ width: '100px' }}></div> {/* Spacer */}
      </div>

      <Card
        bordered={false}
        style={{ borderRadius: '12px', border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
        bodyStyle={{ padding: '32px' }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            estado: 'STOCK',
            condicion: '100%-',
            originalidad: 'Original',
            precio_costo: 0,
            precio_venta: 0,
            cantidad: 1,
            bodega: '0-',
            zona: '0-',
            pared: '0-',
            malla: '0-',
            horizontal: '0-',
            estante: 'E1',
            nivel: '0-',
            piso: 'P1-',
            plastica: null,
            carton: null
          }}
        >
          {/* Selector del tipo de repuesto */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Form.Item name="tipo_repuesto_radio" style={{ marginBottom: 0 }}>
              <Radio.Group
                value={tipoRepuesto}
                onChange={onTipoRepuestoChange}
                buttonStyle="solid"
                size="large"
              >
                <Radio.Button value="con_vehiculo" style={{ padding: '0 32px' }}>Repuesto de Vehículo Específico</Radio.Button>
                <Radio.Button value="sin_vehiculo" style={{ padding: '0 32px' }}>Repuesto Genérico</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </div>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '16px' }}>
                Información del Repuesto
              </Text>

              <Form.Item
                name="parte_vehiculo"
                label="Parte del Vehículo"
                rules={[{ required: true, message: 'Seleccione la parte del vehículo' }]}
              >
                <Select placeholder="Seleccione la parte del vehículo">
                  {getParteOptions().map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="originalidad"
                label="Tipo de Repuesto (Originalidad)"
                rules={[{ required: true, message: 'Seleccione si es Original o Genérico' }]}
              >
                <Radio.Group>
                  <Radio value="Original">Original</Radio>
                  <Radio value="Genérico">Genérico</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                name="descripcion"
                label="Descripción"
                rules={[{ required: true, message: 'Ingrese una descripción' }]}
              >
                <TextArea rows={3} placeholder="Descripción detallada del repuesto" />
              </Form.Item>

              <Form.Item name="imagen_url" label="URL de Imagen (Opcional)">
                <Input placeholder="https://ejemplo.com/imagen.jpg" />
              </Form.Item>

              {/* Selección según el tipo de repuesto */}
              {tipoRepuesto === 'con_vehiculo' ? (
                <div style={{ backgroundColor: '#f0f8ff', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                  <h4 style={{ color: '#1890ff', marginBottom: '12px' }}>
                    Seleccionar Vehículo de Origen
                    {selectorDeshabilitado && (
                      <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                        (Vehículo preseleccionado - modo lectura)
                      </span>
                    )}
                  </h4>

                  {loadingVehiculos ? (
                    <p>Cargando vehículos...</p>
                  ) : vehiculosDesarmados.length === 0 ? (
                    <p style={{ color: '#ff4d4f' }}>No hay vehículos desarmados disponibles</p>
                  ) : (
                    <Form.Item
                      name="vehiculo_origen_id"
                      label="Vehículo Origen (Solo vehículos desarmados)"
                      rules={[{ required: true, message: 'Seleccione el vehículo de origen' }]}
                    >
                      <Select
                        placeholder="Buscar por código, marca, modelo o generación"
                        showSearch
                        disabled={selectorDeshabilitado}
                        filterOption={(input, option) => {
                          const searchText = getVehiculoDisplayText(option.vehiculo);
                          return searchText.toLowerCase().includes(input.toLowerCase());
                        }}
                        optionLabelProp="label"
                      >
                        {vehiculosDesarmados.map(vehiculo => {
                          const codigo = vehiculo.codigoVehiculo || vehiculo.codigo_vehiculo || 'Sin código';
                          const anio = vehiculo.anio || '';
                          let marca = '';
                          let modelo = '';
                          let generacion = '';

                          if (vehiculo.generacion) {
                            if (typeof vehiculo.generacion === 'object') {
                              marca = vehiculo.generacion.marca || '';
                              modelo = vehiculo.generacion.modelo || '';
                              generacion = vehiculo.generacion.nombre || '';
                            }
                          }

                          const label = `${codigo} - ${anio}${marca ? ` ${marca}` : ''}${modelo ? ` ${modelo}` : ''}${generacion ? ` ${generacion}` : ''}`;

                          return (
                            <Option
                              key={vehiculo.id}
                              value={vehiculo.id}
                              label={label}
                              vehiculo={vehiculo}
                            >
                              <div>
                                <div style={{ fontWeight: 'bold' }}>{codigo}</div>
                                <div style={{ fontSize: '0.9em', color: '#666' }}>
                                  {anio}{marca ? ` | ${marca}` : ''}{modelo ? ` ${modelo}` : ''}{generacion ? ` (${generacion})` : ''}
                                </div>
                              </div>
                            </Option>
                          );
                        })}
                      </Select>
                    </Form.Item>
                  )}
                </div>
              ) : (
                <div style={{ backgroundColor: '#f6ffed', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                  <h4 style={{ color: '#52c41a', marginBottom: '12px' }}>Clasificar Repuesto Genérico</h4>

                  <Form.Item
                    name="marca_id"
                    label="Marca"
                    rules={[{ required: true, message: 'Seleccione una marca' }]}
                  >
                    <Select
                      placeholder="Seleccione una marca"
                      loading={loadingMarcas}
                      onChange={onMarcaChange}
                      value={marcaSeleccionada}
                      dropdownRender={(menu) => (
                        <div>
                          {menu}
                          <Divider style={{ margin: '8px 0' }} />
                          {nuevaMarcaModal ? (
                            <div style={{ padding: '8px', display: 'flex', gap: '8px' }}>
                              <Input
                                autoFocus
                                size="small"
                                placeholder="Nombre de la marca"
                                value={nuevaMarcaNombre}
                                onChange={(e) => setNuevaMarcaNombre(e.target.value)}
                                onPressEnter={handleNuevaMarca}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setNuevaMarcaModal(false);
                                    setNuevaMarcaNombre('');
                                  }
                                }}
                                style={{ flex: 1 }}
                              />
                              <Button
                                type="text"
                                icon={<CheckOutlined style={{ color: '#52c41a' }} />}
                                onClick={handleNuevaMarca}
                                loading={creandoMarca}
                                disabled={!nuevaMarcaNombre.trim()}
                                title="Agregar"
                              />
                              <Button
                                type="text"
                                danger
                                icon={<CloseOutlined />}
                                onClick={() => {
                                  setNuevaMarcaModal(false);
                                  setNuevaMarcaNombre('');
                                }}
                                disabled={creandoMarca}
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
                                setNuevaMarcaModal(true);
                                setNuevaMarcaNombre('');
                              }}
                            >
                              <PlusOutlined style={{ marginRight: 8 }} />
                              Agregar nueva marca
                            </div>
                          )}
                        </div>
                      )}
                    >
                      {marcas.map(marca => (
                        <Option key={marca.id} value={marca.id}>{marca.nombre}</Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="modelo_id"
                    label="Modelo"
                    rules={[{ required: true, message: 'Seleccione un modelo' }]}
                  >
                    <Select
                      placeholder="Seleccione un modelo"
                      loading={loadingModelos}
                      disabled={!marcaSeleccionada}
                      onChange={onModeloChange}
                      value={modeloSeleccionado}
                      dropdownRender={(menu) => (
                        <div>
                          {menu}
                          <Divider style={{ margin: '8px 0' }} />
                          {nuevoModeloModal ? (
                            <div style={{ padding: '8px', display: 'flex', gap: '8px' }}>
                              <Input
                                autoFocus
                                size="small"
                                placeholder="Nombre del modelo"
                                value={nuevoModeloNombre}
                                onChange={(e) => setNuevoModeloNombre(e.target.value)}
                                onPressEnter={handleNuevoModelo}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setNuevoModeloModal(false);
                                    setNuevoModeloNombre('');
                                  }
                                }}
                                style={{ flex: 1 }}
                              />
                              <Button
                                type="text"
                                icon={<CheckOutlined style={{ color: '#52c41a' }} />}
                                onClick={handleNuevoModelo}
                                loading={creandoModelo}
                                disabled={!nuevoModeloNombre.trim()}
                                title="Agregar"
                              />
                              <Button
                                type="text"
                                danger
                                icon={<CloseOutlined />}
                                onClick={() => {
                                  setNuevoModeloModal(false);
                                  setNuevoModeloNombre('');
                                }}
                                disabled={creandoModelo}
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
                                setNuevoModeloModal(true);
                                setNuevoModeloNombre('');
                              }}
                            >
                              <PlusOutlined style={{ marginRight: 8 }} />
                              Agregar nuevo modelo
                            </div>
                          )}
                        </div>
                      )}
                    >
                      {modelos.map(modelo => (
                        <Option key={modelo.id} value={modelo.id}>{modelo.nombre}</Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="generacion_id"
                    label="Generación"
                    rules={[{ required: true, message: 'Seleccione una generación' }]}
                  >
                    <Select
                      placeholder="Seleccione una generación"
                      loading={loadingGeneraciones}
                      disabled={!modeloSeleccionado}
                      onChange={onGeneracionChange}
                      value={generacionSeleccionada}
                      dropdownRender={(menu) => (
                        <div>
                          {menu}
                          <Divider style={{ margin: '8px 0' }} />
                          {nuevaGeneracionModal ? (
                            <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <Input
                                autoFocus
                                size="small"
                                placeholder="Nombre de la generación"
                                value={nuevaGeneracionNombre}
                                onChange={(e) => setNuevaGeneracionNombre(e.target.value)}
                                style={{ width: '100%' }}
                              />
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <Input
                                  size="small"
                                  placeholder="Año inicio"
                                  value={nuevaGeneracionAnioInicio}
                                  onChange={(e) => setNuevaGeneracionAnioInicio(e.target.value)}
                                  style={{ flex: 1 }}
                                />
                                <Input
                                  size="small"
                                  placeholder="Año fin"
                                  value={nuevaGeneracionAnioFin}
                                  onChange={(e) => setNuevaGeneracionAnioFin(e.target.value)}
                                  style={{ flex: 1 }}
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <Button
                                  type="text"
                                  icon={<CheckOutlined style={{ color: '#52c41a' }} />}
                                  onClick={handleNuevaGeneracion}
                                  loading={creandoGeneracion}
                                  disabled={!nuevaGeneracionNombre.trim() || !nuevaGeneracionAnioInicio || !nuevaGeneracionAnioFin}
                                  title="Agregar"
                                />
                                <Button
                                  type="text"
                                  danger
                                  icon={<CloseOutlined />}
                                  onClick={() => {
                                    setNuevaGeneracionModal(false);
                                    setNuevaGeneracionNombre('');
                                    setNuevaGeneracionAnioInicio('');
                                    setNuevaGeneracionAnioFin('');
                                  }}
                                  disabled={creandoGeneracion}
                                  title="Cancelar"
                                />
                              </div>
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
                                setNuevaGeneracionModal(true);
                                setNuevaGeneracionNombre('');
                                setNuevaGeneracionAnioInicio('');
                                setNuevaGeneracionAnioFin('');
                              }}
                            >
                              <PlusOutlined style={{ marginRight: 8 }} />
                              Agregar nueva generación
                            </div>
                          )}
                        </div>
                      )}
                    >
                      {generaciones.map(generacion => (
                        <Option key={generacion.id} value={generacion.id}>
                          {generacion.nombre} ({generacion.anioInicio || generacion.anio_inicio}-{generacion.anioFin || generacion.anio_fin})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </div>
              )}
            </Col>

            <Col xs={24} md={12}>
              <Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '16px' }}>
                Precios y Costos
              </Text>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="precio_costo"
                    label="Costo Unitario"
                    rules={[{ required: true, message: 'Ingrese el costo unitario' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      step={1000}
                      precision={2}
                      formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value.replace(/₡\s?|(,*)/g, '')}
                      onChange={(value) => setPrecioCostoUnitario(value || 0)}
                    />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    label="Costo Total (Calculado)"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      value={costoTotalCalculado}
                      disabled
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="precio_venta"
                    label="Precio de Venta Unitario (Calculado)"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      step={1000}
                      precision={2}
                      formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value.replace(/₡\s?|(,*)/g, '')}
                      value={precioVentaCalculado}
                      disabled
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Fórmula 15% (Lectura)">
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      value={formula15Calculada}
                      disabled
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Fórmula 30% (Lectura)">
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      value={formula30Calculada}
                      disabled
                    />
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f8ff', borderRadius: '6px' }}>
                <Text strong>Costo Unitario: ₡ {precioCostoUnitario.toFixed(2)}</Text>
                <br />
                <Text type="secondary">Costo unitario * Cantidad = ₡ {precioCostoUnitario.toFixed(2)} * {cantidad} = ₡ {costoTotalCalculado.toFixed(2)}</Text>
              </div>

              <Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', margin: '32px 0 16px' }}>
                Estado y Stock
              </Text>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="cantidad" label="Cantidad">
                    <InputNumber
                      style={{ width: '100%' }}
                      min={1}
                      onChange={(value) => setCantidad(value || 1)}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="estado" label="Estado" rules={[{ required: true }]}>
                    <Select>
                      <Option value="STOCK">En Stock</Option>
                      <Option value="PROCESO">En Proceso</Option>
                      <Option value="DAÑADO">Dañado</Option>
                      <Option value="USADO_INTERNO">Usado Interno</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="condicion" label="Condición">
                <Select>
                  {getCondicionOptions().map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', margin: '32px 0 16px' }}>
                Ubicación Física
              </Text>

              <div style={{ marginBottom: '16px' }}>
                <Checkbox
                  checked={ubicacionFisicaHabilitada}
                  onChange={(e) => setUbicacionFisicaHabilitada(e.target.checked)}
                >
                  Habilitar formulario de ubicación física (opcional)
                </Checkbox>
              </div>

              {ubicacionFisicaHabilitada ? (
                <div style={{
                  padding: '16px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  backgroundColor: '#fafafa'
                }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="bodega" label="Bodega">
                        <Select>
                          <Option value={`0${separator}`}>Sin especificar</Option>
                          <Option value={`R${separator}`}>Bodega R</Option>
                          <Option value={`D${separator}`}>Bodega D</Option>
                          <Option value={`C${separator}`}>Bodega C</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="zona" label="Zona">
                        <Select>
                          <Option value={`0${separator}`}>Sin especificar</Option>
                          {Array.from({ length: 22 }, (_, i) => (
                            <Option key={`Z${i + 1}${separator}`} value={`Z${i + 1}${separator}`}>Zona {i + 1}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="pared" label="Pared">
                        <Select>
                          <Option value={`0${separator}`}>Sin especificar</Option>
                          <Option value={`PE${separator}`}>Pared Este</Option>
                          <Option value={`PO${separator}`}>Pared Oeste</Option>
                          <Option value={`PN${separator}`}>Pared Norte</Option>
                          <Option value={`PS${separator}`}>Pared Sur</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="estante" label="Estante">
                        <Select>
                          {Array.from({ length: 14 }, (_, i) => (
                            <Option key={`E${i + 1}`} value={`E${i + 1}`}>Estante {i + 1}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="malla" label="Malla">
                        <Select>
                          <Option value={`0${separator}`}>Sin especificar</Option>
                          {Array.from({ length: 200 }, (_, i) => (
                            <Option key={`V${i + 1}`} value={`V${i + 1}`}>Malla {i + 1}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="horizontal" label="Horizontal">
                        <Select>
                          <Option value={`0${separator}`}>Sin especificar</Option>
                          <Option value={`HA${separator}`}>HA</Option>
                          <Option value={`HB${separator}`}>HB</Option>
                          <Option value={`HC${separator}`}>HC</Option>
                          <Option value={`HD${separator}`}>HD</Option>
                          <Option value={`HE${separator}`}>HE</Option>
                          <Option value={`HF${separator}`}>HF</Option>
                          <Option value={`HG${separator}`}>HG</Option>
                          <Option value={`HH${separator}`}>HH</Option>
                          <Option value={`HI${separator}`}>HI</Option>
                          <Option value={`HJ${separator}`}>HJ</Option>
                          <Option value={`HK${separator}`}>HK</Option>
                          <Option value={`HL${separator}`}>HL</Option>
                          <Option value={`HM${separator}`}>HM</Option>
                          <Option value={`HN${separator}`}>HN</Option>
                          <Option value={`HO${separator}`}>HO</Option>
                          <Option value={`HP${separator}`}>HP</Option>
                          <Option value={`HQ${separator}`}>HQ</Option>
                          <Option value={`HR${separator}`}>HR</Option>
                          <Option value={`HS${separator}`}>HS</Option>
                          <Option value={`HT${separator}`}>HT</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="nivel" label="Nivel">
                        <Select>
                          <Option value={`0${separator}`}>Sin especificar</Option>
                          {Array.from({ length: 22 }, (_, i) => (
                            <Option key={`N${i + 1}${separator}`} value={`N${i + 1}${separator}`}>Nivel {i + 1}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="piso" label="Piso">
                        <Select>
                          {Array.from({ length: 21 }, (_, i) => (
                            <Option key={`P${i + 1}${separator}`} value={`P${i + 1}${separator}`}>Piso {i + 1}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="plastica" label="Plástica (Opcional)">
                        <Select allowClear>
                          {Array.from({ length: 52 }, (_, i) => (
                            <Option key={`CP${i + 1}${separator}`} value={`CP${i + 1}${separator}`}>CP {i + 1}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="carton" label="Cartón (Opcional)">
                        <Select allowClear>
                          {Array.from({ length: 52 }, (_, i) => (
                            <Option key={`MM${i + 1}${separator}`} value={`MM${i + 1}${separator}`}>MM {i + 1}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="posicion" label="Posición (Opcional)">
                    <Input placeholder="Posición específica" />
                  </Form.Item>
                </div>
              ) : (
                <div style={{
                  padding: '16px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  backgroundColor: '#f5f5f5',
                  textAlign: 'center',
                  color: '#999'
                }}>
                  <InfoCircleOutlined style={{ marginRight: '8px' }} />
                  La ubicación física no será registrada. El repuesto se guardará sin asignación de ubicación.
                </div>
              )}
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
              loading={loading}
              size="large"
              style={{ borderRadius: '6px', padding: '0 32px' }}
            >
              Guardar Repuesto
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default NuevoRepuesto;