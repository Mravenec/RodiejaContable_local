import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Tag,
  Spin,
  Checkbox,
  Upload,
  Space
} from 'antd';
import {
  SaveOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  UploadOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import InventarioService from '../../api/inventario';
import vehiculoService from '../../api/vehiculos';
import api from '../../api/axios';
import { usePartesVehiculo } from '../../hooks/usePartesVehiculo';
import { useVehiculosParaTransacciones } from '../../hooks/useVehiculosParaTransacciones';
import { useMarcas } from '../../hooks/useMarcas';
import { useModelos } from '../../hooks/useModelos';
import { useGeneraciones } from '../../hooks/useGeneraciones';
import { API_BASE_URL } from '../../api/config';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const EditarRepuesto = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [repuestoActual, setRepuestoActual] = useState(null);
  const [vehiculoOrigen, setVehiculoOrigen] = useState(null);
  const [ubicacionFisicaHabilitada, setUbicacionFisicaHabilitada] = useState(false);
  const [imagenUrlValue, setImagenUrlValue] = useState(null);

  const [precioCostoUnitario, setPrecioCostoUnitario] = useState(0);
  const [cantidad, setCantidad] = useState(1);

  const queryClient = useQueryClient();
  const { data: partesVehiculo = [], isLoading: loadingPartes } = usePartesVehiculo();
  const { data: vehiculosDesarmados = [] } = useVehiculosParaTransacciones();

  // Estados para la cadena de selección (solo para repuestos genéricos)
  const [marcaSeleccionada, setMarcaSeleccionada] = useState(null);
  const [modeloSeleccionado, setModeloSeleccionado] = useState(null);
  const [generacionSeleccionada, setGeneracionSeleccionada] = useState(null);

  // Modal states for creating new (inline)
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

  // Hooks para cargar datos
  const { data: marcas = [], isLoading: loadingMarcas, updateMarca } = useMarcas();
  const { data: modelos = [], isLoading: loadingModelos, updateModelo } = useModelos(
    marcaSeleccionada,
    !!marcaSeleccionada
  );
  const { data: generaciones = [], isLoading: loadingGeneraciones, updateGeneracion } = useGeneraciones(
    modeloSeleccionado,
    !!modeloSeleccionado
  );

  // Estados para editar Marca
  const [editingMarcaId, setEditingMarcaId] = useState(null);
  const [editingMarcaNombre, setEditingMarcaNombre] = useState('');

  // Estados para editar Modelo
  const [editingModeloId, setEditingModeloId] = useState(null);
  const [editingModeloNombre, setEditingModeloNombre] = useState('');

  // Estados para editar Generacion
  const [editingGeneracionId, setEditingGeneracionId] = useState(null);
  const [editingGeneracionNombre, setEditingGeneracionNombre] = useState('');
  const [editingGeneracionAnioInicio, setEditingGeneracionAnioInicio] = useState(new Date().getFullYear());
  const [editingGeneracionAnioFin, setEditingGeneracionAnioFin] = useState(new Date().getFullYear());


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


  // Handlers para editar Marca
  const handleEditarMarca = (marca) => {
    setEditingMarcaId(marca.id);
    setEditingMarcaNombre(marca.nombre);
  };
  const handleCancelarEdicionMarca = () => {
    setEditingMarcaId(null);
    setEditingMarcaNombre('');
  };
  const handleGuardarEdicionMarca = async () => {
    if (!editingMarcaNombre.trim()) {
      message.warning('El nombre de la marca no puede estar vacío');
      return;
    }
    try {
      await updateMarca.mutateAsync({ id: editingMarcaId, nombre: editingMarcaNombre.trim() });
      setEditingMarcaId(null);
      setEditingMarcaNombre('');
    } catch (error) {
      // El hook maneja el mensaje de error
    }
  };

  // Handlers para editar Modelo
  const handleEditarModelo = (modelo) => {
    setEditingModeloId(modelo.id);
    setEditingModeloNombre(modelo.nombre);
  };
  const handleCancelarEdicionModelo = () => {
    setEditingModeloId(null);
    setEditingModeloNombre('');
  };
  const handleGuardarEdicionModelo = async () => {
    if (!editingModeloNombre.trim()) {
      message.warning('El nombre del modelo no puede estar vacío');
      return;
    }
    try {
      await updateModelo.mutateAsync({ id: editingModeloId, nombre: editingModeloNombre.trim(), marcaId: marcaSeleccionada });
      setEditingModeloId(null);
      setEditingModeloNombre('');
    } catch (error) { }
  };

  // Handlers para editar Generacion
  const handleEditarGeneracion = (generacion) => {
    setEditingGeneracionId(generacion.id);
    setEditingGeneracionNombre(generacion.nombre);
    setEditingGeneracionAnioInicio(generacion.anioInicio || new Date().getFullYear());
    setEditingGeneracionAnioFin(generacion.anioFin || new Date().getFullYear());
  };
  const handleCancelarEdicionGeneracion = () => {
    setEditingGeneracionId(null);
    setEditingGeneracionNombre('');
  };
  const handleGuardarEdicionGeneracion = async () => {
    if (!editingGeneracionNombre.trim()) {
      message.warning('El nombre no puede estar vacío');
      return;
    }
    try {
      await updateGeneracion.mutateAsync({
        id: editingGeneracionId,
        nombre: editingGeneracionNombre.trim(),
        anioInicio: editingGeneracionAnioInicio,
        anioFin: editingGeneracionAnioFin,
        modeloId: modeloSeleccionado
      });
      setEditingGeneracionId(null);
      setEditingGeneracionNombre('');
    } catch (error) { }
  };


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

  // Estados para nueva parte de vehículo
  const [nuevaParteModal, setNuevaParteModal] = useState(false);
  const [nuevaParteNombre, setNuevaParteNombre] = useState('');
  const [creandoParte, setCreandoParte] = useState(false);

  const [editingParteId, setEditingParteId] = useState(null);
  const [editingParteNombre, setEditingParteNombre] = useState('');

  // Opciones base
  // Opciones base ya no se usan, se obtienen dinámicamente

  const getCondicionOptions = (esGenerico) => {
    if (!esGenerico) {
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

  useEffect(() => {
    const fetchRepuesto = async () => {
      try {
        setFetching(true);
        const data = await InventarioService.getRepuestoPorId(id);
        if (!data) throw new Error("No se encontraron los datos del repuesto");

        setRepuestoActual(data);
        setImagenUrlValue(data.imagenUrl || null);

        // Si pertenece a un vehículo, obtener sus datos
        if (data.vehiculoOrigenId) {
          try {
            const vData = await vehiculoService.getVehiculoCompletoPorId(data.vehiculoOrigenId);
            setVehiculoOrigen(vData);
          } catch (vErr) {
            console.error('Error fetching vehiculo:', vErr);
          }
        }

        // El costo unitario es lo que guarda la bd.
        // Si hay una cantidad > 1, calculamos el costo total multiplicando
        const cant = data.cantidad !== undefined && data.cantidad !== null ? data.cantidad : 1;
        const pCosto = parseFloat(data.precioCosto || 0);

        setCantidad(cant);
        setPrecioCostoUnitario(pCosto);

        // Formatear los guiones bajos según si es genérico o no, ya que el API a veces lo mezcla
        let condicionFormat = data.condicion;
        if (!condicionFormat) {
          condicionFormat = data.vehiculoOrigenId ? '_100_25_' : '100%-';
        }

        const esGenerico = data.vehiculoOrigenId == null;
        const defaultSep = esGenerico ? '-' : '_';

        if (esGenerico && data.generacionId) {
          try {
            // we need to get the generacion to know the modelo and marca
            const genRes = await api.get(`/generaciones/${data.generacionId}`);
            if (genRes.data) {
              setGeneracionSeleccionada(genRes.data.id);
              const modeloId = genRes.data.modeloId || genRes.data.modelo_id;
              if (modeloId) {
                setModeloSeleccionado(modeloId);
                const modRes = await api.get(`/modelos/${modeloId}`);
                if (modRes.data) {
                  const marcaId = modRes.data.marcaId || modRes.data.marca_id;
                  if (marcaId) {
                    setMarcaSeleccionada(marcaId);
                    form.setFieldsValue({
                      marca_id: marcaId,
                      modelo_id: modeloId,
                      generacion_id: genRes.data.id
                    });
                  }
                }
              }
            }
          } catch (e) {
            console.error("Error fetching generacion details", e);
          }
        }

        // Determinar si ya tiene una ubicación asignada
        const tieneUbicacion = (data.bodega && data.bodega !== `0${defaultSep}` && data.bodega !== '0-' && data.bodega !== '0_');
        setUbicacionFisicaHabilitada(tieneUbicacion);

        form.setFieldsValue({
          vehiculo_origen_id: data.vehiculoOrigenId,
          parte_vehiculo_id: data.parteVehiculoId,
          descripcion: data.descripcion,
          imagen_url: data.imagenUrl,
          precio_costo: pCosto,
          cantidad: cant,
          estado: data.estado || 'STOCK',
          condicion: condicionFormat,
          bodega: data.bodega || '0-',
          zona: data.zona || '0-',
          pared: data.pared || '0-',
          malla: data.malla || '0-',
          horizontal: data.horizontal || '0-',
          estante: data.estante || 'E1',
          nivel: data.nivel || '0-',
          piso: data.piso || 'P1-',
          plastica: data.plastica,
          carton: data.carton,
          posicion: data.posicion
        });
      } catch (error) {
        console.error('Error fetching repuesto:', error);
        message.error('No se pudo cargar el repuesto');
        navigate('/inventario');
      } finally {
        setFetching(false);
      }
    };
    fetchRepuesto();
  }, [id, form, navigate]);

  // Función para crear nueva parte de vehículo
  const handleNuevaParte = async () => {
    if (!nuevaParteNombre.trim()) {
      message.warning('Por favor ingrese el nombre de la parte de vehículo');
      return;
    }

    setCreandoParte(true);
    try {
      const response = await api.post('/partes-vehiculo', {
        nombre: nuevaParteNombre.trim(),
        activo: 1
      });

      message.success('Parte de vehículo creada exitosamente');
      setNuevaParteModal(false);
      setNuevaParteNombre('');

      queryClient.invalidateQueries('partesVehiculoActivas');

      if (response.data && response.data.id) {
        form.setFieldsValue({ parte_vehiculo_id: response.data.id });
      }
    } catch (error) {
      console.error('Error al crear parte de vehículo:', error);
      message.error('Error al crear parte de vehículo: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreandoParte(false);
    }
  };

  const handleEditarParte = (parte) => {
    setEditingParteId(parte.id);
    setEditingParteNombre(parte.nombre);
  };

  const handleCancelarEdicionParte = () => {
    setEditingParteId(null);
    setEditingParteNombre('');
  };

  const { updateParteVehiculoMutation } = usePartesVehiculo();

  const handleGuardarEdicionParte = async () => {
    if (!editingParteNombre.trim()) {
      message.warning('El nombre no puede estar vacío');
      return;
    }

    try {
      await updateParteVehiculoMutation.mutateAsync({
        id: editingParteId,
        nombre: editingParteNombre.trim(),
        activo: 1
      });
      setEditingParteId(null);
      setEditingParteNombre('');
    } catch (error) {
      // El hook usePartesVehiculo ya maneja el mensaje de error
    }
  };

  // Cálculos dinámicos
  const costoTotalCalculado = precioCostoUnitario * cantidad;
  const precioVentaCalculado = precioCostoUnitario * 1.5;
  const formula15Calculada = precioCostoUnitario * 1.15;
  const formula30Calculada = precioCostoUnitario * 1.30;

  useEffect(() => {
    form.setFieldsValue({ precio_venta: precioVentaCalculado });
  }, [precioVentaCalculado, form]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const cant = values.cantidad !== undefined && values.cantidad !== null ? values.cantidad : 1;
      const costoUni = values.precio_costo || 0;
      const pVenta = costoUni * 1.5;

      const payload = {
        vehiculoOrigenId: !esGenerico ? values.vehiculo_origen_id : null,
        generacionId: esGenerico ? generacionSeleccionada : null,
        parteVehiculoId: values.parte_vehiculo_id,
        descripcion: values.descripcion,
        precioCosto: costoUni,
        precioVenta: pVenta,

        cantidad: cant,
        estado: values.estado,
        condicion: values.condicion,
        bodega: ubicacionFisicaHabilitada ? values.bodega : `_0_`,
        zona: ubicacionFisicaHabilitada ? values.zona : `_0_`,
        pared: ubicacionFisicaHabilitada ? values.pared : `_0_`,
        malla: ubicacionFisicaHabilitada ? values.malla : `_0_`,
        horizontal: ubicacionFisicaHabilitada ? values.horizontal : `_0_`,
        estante: ubicacionFisicaHabilitada ? values.estante : `E1`,
        nivel: ubicacionFisicaHabilitada ? values.nivel : `_0_`,
        piso: ubicacionFisicaHabilitada ? values.piso : `P1_`,
        plastica: ubicacionFisicaHabilitada ? values.plastica : null,
        carton: ubicacionFisicaHabilitada ? values.carton : null,
        posicion: ubicacionFisicaHabilitada ? values.posicion : null,
        imagenUrl: values.imagen_url || imagenUrlValue || null
      };

      await InventarioService.actualizarRepuesto(id, payload);
      queryClient.invalidateQueries('repuestos');
      navigate(`/inventario/${id}`);
    } catch (error) {
      console.error('Error al actualizar:', error);
      const errorMsg = error.response?.data?.message || error.message;
      message.error('Error al actualizar el repuesto: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div style={{ textAlign: 'center', marginTop: 50 }}><Spin size="large" /></div>;
  }

  const esGenerico = repuestoActual?.vehiculoOrigenId == null;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* ── Header de navegación ─────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/inventario')}
          style={{ color: '#595959', fontWeight: 500 }}
          disabled={loading}
        >
          Volver
        </Button>
        <Title level={3} style={{ margin: 0, fontWeight: 600 }}>
          Editar Repuesto {repuestoActual?.codigo}
        </Title>
        <div style={{ width: '100px' }}></div> {/* Spacer */}
      </div>

      <Card
        bordered={false}
        style={{ borderRadius: '12px', border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
        bodyStyle={{ padding: '32px' }}
      >
        <div style={{ marginBottom: 24, padding: 16, backgroundColor: esGenerico ? '#f6ffed' : '#f0f8ff', borderRadius: 8 }}>
          <Text strong style={{ fontSize: 16 }}>Origen del Repuesto: </Text>
          {esGenerico ? (
            <Tag color="geekblue" style={{ fontSize: 14, padding: '4px 8px' }}>Genérico / Comprado</Tag>
          ) : (
            <Tag color="purple" style={{ fontSize: 14, padding: '4px 8px' }}>
              Vehículo Desarmado: {vehiculoOrigen ? (() => {
                const codigo = vehiculoOrigen.codigoVehiculo || vehiculoOrigen.codigo_vehiculo || 'SIN_CODIGO';
                const anio = vehiculoOrigen.anio || 'Año N/A';
                const estado = vehiculoOrigen.estado || 'SIN_ESTADO';
                const marca = vehiculoOrigen.marcaNombre || vehiculoOrigen.marca || 'Marca N/A';
                const modelo = vehiculoOrigen.modelo || 'Modelo N/A';

                let estadoAmigable = estado;
                if (estado === 'DESARMADO') {
                  estadoAmigable = 'Para repuestos';
                } else if (estado === 'REPARACION') {
                  estadoAmigable = 'Para reparar';
                } else if (estado !== 'SIN_ESTADO') {
                  estadoAmigable = estado.charAt(0).toUpperCase() + estado.slice(1).toLowerCase();
                }

                return `${codigo} — ${marca} ${modelo} ${anio} (${estadoAmigable})`;
              })() : 'Cargando...'}
            </Tag>
          )}
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          {!esGenerico && (
            <Form.Item
              name="vehiculo_origen_id"
              label="Vehículo Origen"
              rules={[{ required: true, message: 'Seleccione el vehículo de origen' }]}
            >
              <Select
                placeholder="Buscar por código, marca, modelo o generación"
                showSearch
                filterOption={(input, option) => {
                  const searchText = option.label || '';
                  return searchText.toLowerCase().includes(input.toLowerCase());
                }}
              >
                {vehiculosDesarmados.map(v => {
                  const label = `${v.codigoVehiculo || v.codigo_vehiculo} — ${v.marcaNombre || v.marca} ${v.modelo} ${v.anio} (${v.estado})`;
                  return (
                    <Option key={v.id} value={v.id} label={label}>
                      {label}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
          )}



          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '16px' }}>
                Información del Repuesto
              </Text>

              <Form.Item
                name="parte_vehiculo_id"
                label="Parte del Vehículo"
                rules={[{ required: true, message: 'Seleccione la parte del vehículo' }]}
              >
                <Select
                  placeholder="Seleccione la parte del vehículo"
                  loading={loadingPartes}
                  showSearch
                  optionFilterProp="label"
                  optionLabelProp="label"
                  dropdownRender={(menu) => (
                    <div>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      {nuevaParteModal ? (
                        <div style={{ padding: '8px', display: 'flex', gap: '8px' }}>
                          <Input
                            autoFocus
                            size="small"
                            placeholder="Nombre de la parte"
                            value={nuevaParteNombre}
                            onChange={(e) => setNuevaParteNombre(e.target.value)}
                            onPressEnter={handleNuevaParte}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setNuevaParteModal(false);
                                setNuevaParteNombre('');
                              }
                            }}
                            style={{ flex: 1 }}
                          />
                          <Button
                            type="text"
                            icon={<CheckOutlined style={{ color: '#52c41a' }} />}
                            onClick={handleNuevaParte}
                            loading={creandoParte}
                            disabled={!nuevaParteNombre.trim()}
                            title="Agregar"
                          />
                          <Button
                            type="text"
                            danger
                            icon={<CloseOutlined />}
                            onClick={() => {
                              setNuevaParteModal(false);
                              setNuevaParteNombre('');
                            }}
                            disabled={creandoParte}
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
                            setNuevaParteModal(true);
                            setNuevaParteNombre('');
                          }}
                        >
                          <PlusOutlined style={{ marginRight: 8 }} />
                          Agregar nueva parte de vehículo
                        </div>
                      )}
                    </div>
                  )}
                >
                  {partesVehiculo.map(parte => (
                    <Option key={parte.id} value={parte.id} label={parte.nombre}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        {editingParteId === parte.id ? (
                          <div style={{ display: 'flex', width: '100%', gap: '8px' }}>
                            <Input
                              value={editingParteNombre}
                              onChange={(e) => {
                                e.stopPropagation();
                                setEditingParteNombre(e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              style={{ flex: 1 }}
                              autoFocus
                            />
                            <Button
                              type="text"
                              icon={<CheckOutlined style={{ color: 'green' }} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGuardarEdicionParte();
                              }}
                              size="small"
                            />
                            <Button
                              type="text"
                              icon={<CloseOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelarEdicionParte();
                              }}
                              size="small"
                            />
                          </div>
                        ) : (
                          <>
                            <span>{parte.nombre}</span>
                            <Button
                              type="text"
                              icon={<EditOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditarParte(parte);
                              }}
                              size="small"
                            />
                          </>
                        )}
                      </div>
                    </Option>
                  ))}
                  {nuevaParteModal && (
                    <Option className="add-new-option" value="" style={{ display: 'none' }}>
                      {nuevaParteNombre}
                    </Option>
                  )}
                </Select>
              </Form.Item>

              <Form.Item
                name="descripcion"
                label="Descripción"
                rules={[{ required: true, message: 'Ingrese una descripción' }]}
              >
                <TextArea rows={3} placeholder="Descripción detallada del repuesto" />
              </Form.Item>

              <Form.Item label="Foto del repuesto (Subir o URL)">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Upload
                      name="file"
                      action={`${API_BASE_URL}/api/upload/repuesto`}
                      headers={{
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                      }}
                      listType="picture"
                      maxCount={1}
                      showUploadList={false}
                      style={{ flex: 1 }}
                      onChange={(info) => {
                        if (info.file.status === 'done') {
                          message.success(`${info.file.name} subido exitosamente`);
                          const serverUrl = info.file.response.url;
                          form.setFieldsValue({ imagen_url: serverUrl });
                          setImagenUrlValue(serverUrl);
                        } else if (info.file.status === 'error') {
                          message.error(`${info.file.name} falló al subir.`);
                        }
                      }}
                    >
                      <Button icon={<UploadOutlined />} style={{ width: '100%' }}>Seleccionar archivo</Button>
                    </Upload>
                    <Button 
                      icon={<DeleteOutlined />} 
                      danger
                      title="Limpiar imagen"
                      onClick={() => {
                        form.setFieldsValue({ imagen_url: '' });
                        setImagenUrlValue('');
                      }}
                      disabled={!imagenUrlValue}
                    />
                  </div>
                  <Form.Item 
                    name="imagen_url" 
                    style={{ marginBottom: 0 }}
                  >
                    <Input 
                      placeholder="https://ejemplo.com/imagen.jpg o ruta local" 
                      allowClear 
                      onChange={(e) => setImagenUrlValue(e.target.value)}
                    />
                  </Form.Item>
                </Space>
              </Form.Item>

              {esGenerico && (
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
                      optionLabelProp="label"
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
                        <Option key={marca.id} value={marca.id} label={marca.nombre}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            {editingMarcaId === marca.id ? (
                              <div style={{ display: 'flex', width: '100%', gap: '8px' }}>
                                <Input
                                  value={editingMarcaNombre}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    setEditingMarcaNombre(e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  style={{ flex: 1 }}
                                  autoFocus
                                />
                                <Button
                                  type="text"
                                  icon={<CheckOutlined style={{ color: 'green' }} />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleGuardarEdicionMarca();
                                  }}
                                  size="small"
                                />
                                <Button
                                  type="text"
                                  icon={<CloseOutlined />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelarEdicionMarca();
                                  }}
                                  size="small"
                                />
                              </div>
                            ) : (
                              <>
                                <span>{marca.nombre}</span>
                                <Button
                                  type="text"
                                  icon={<EditOutlined />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditarMarca(marca);
                                  }}
                                  size="small"
                                />
                              </>
                            )}
                          </div>
                        </Option>
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
                      optionLabelProp="label"
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
                        <Option key={modelo.id} value={modelo.id} label={modelo.nombre}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            {editingModeloId === modelo.id ? (
                              <div style={{ display: 'flex', width: '100%', gap: '8px' }}>
                                <Input
                                  value={editingModeloNombre}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    setEditingModeloNombre(e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  style={{ flex: 1 }}
                                  autoFocus
                                />
                                <Button
                                  type="text"
                                  icon={<CheckOutlined style={{ color: 'green' }} />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleGuardarEdicionModelo();
                                  }}
                                  size="small"
                                />
                                <Button
                                  type="text"
                                  icon={<CloseOutlined />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelarEdicionModelo();
                                  }}
                                  size="small"
                                />
                              </div>
                            ) : (
                              <>
                                <span>{modelo.nombre}</span>
                                <Button
                                  type="text"
                                  icon={<EditOutlined />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditarModelo(modelo);
                                  }}
                                  size="small"
                                />
                              </>
                            )}
                          </div>
                        </Option>
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
                      optionLabelProp="label"
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
                        <Option key={generacion.id} value={generacion.id} label={`${generacion.nombre} (${generacion.anioInicio || generacion.anio_inicio}-${generacion.anioFin || generacion.anio_fin})`}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            {editingGeneracionId === generacion.id ? (
                              <div style={{ display: 'flex', width: '100%', gap: '8px', alignItems: 'center' }}>
                                <Input
                                  value={editingGeneracionNombre}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    setEditingGeneracionNombre(e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  style={{ flex: 2 }}
                                  autoFocus
                                />
                                <Input
                                  value={editingGeneracionAnioInicio}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    setEditingGeneracionAnioInicio(e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  style={{ flex: 1 }}
                                  placeholder="Inicio"
                                />
                                <Input
                                  value={editingGeneracionAnioFin}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    setEditingGeneracionAnioFin(e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  style={{ flex: 1 }}
                                  placeholder="Fin"
                                />
                                <Button
                                  type="text"
                                  icon={<CheckOutlined style={{ color: 'green' }} />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleGuardarEdicionGeneracion();
                                  }}
                                  size="small"
                                />
                                <Button
                                  type="text"
                                  icon={<CloseOutlined />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelarEdicionGeneracion();
                                  }}
                                  size="small"
                                />
                              </div>
                            ) : (
                              <>
                                <span>{generacion.nombre} ({generacion.anioInicio || generacion.anio_inicio}-{generacion.anioFin || generacion.anio_fin})</span>
                                <Button
                                  type="text"
                                  icon={<EditOutlined />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditarGeneracion(generacion);
                                  }}
                                  size="small"
                                />
                              </>
                            )}
                          </div>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </div>
              )}

            </Col>

            <Col xs={24} md={12}>
              <Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '16px' }}>
                Precios y Estado
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
                      formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      value={precioVentaCalculado}
                      disabled
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
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
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="cantidad" label="Cantidad">
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      onChange={(value) => {
                        const val = value !== null ? value : 0;
                        setCantidad(val);

                        // Si hay cantidad mayor a 0 y estaba agotado, pasarlo a STOCK
                        if (val > 0 && form.getFieldValue('estado') === 'AGOTADO') {
                          form.setFieldsValue({ estado: 'STOCK' });
                        }
                        // Si la cantidad es 0, pasarlo automáticamente a AGOTADO
                        else if (val === 0) {
                          form.setFieldsValue({ estado: 'AGOTADO' });
                        }
                      }}
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
                      <Option value="VENDIDO" disabled={repuestoActual?.estado !== 'VENDIDO'}>Vendido</Option>
                      <Option value="AGOTADO">Agotado</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="condicion" label="Condición">
                <Select>
                  {getCondicionOptions(esGenerico).map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

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

          {ubicacionFisicaHabilitada && (
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
                      <Option value={`_0_`}>Sin especificar</Option>
                      <Option value={`R_`}>Bodega R</Option>
                      <Option value={`D_`}>Bodega D</Option>
                      <Option value={`C_`}>Bodega C</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="zona" label="Zona">
                    <Select>
                      <Option value={`_0_`}>Sin especificar</Option>
                      {Array.from({ length: 22 }, (_, i) => (
                        <Option key={`Z${i + 1}_`} value={`Z${i + 1}_`}>Zona {i + 1}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="pared" label="Pared">
                    <Select>
                      <Option value={`_0_`}>Sin especificar</Option>
                      <Option value={`PE_`}>Pared Este</Option>
                      <Option value={`PO_`}>Pared Oeste</Option>
                      <Option value={`PN_`}>Pared Norte</Option>
                      <Option value={`PS_`}>Pared Sur</Option>
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
                      <Option value={`_0_`}>Sin especificar</Option>
                      {Array.from({ length: 200 }, (_, i) => (
                        <Option key={`V${i + 1}`} value={`V${i + 1}`}>Malla {i + 1}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="piso" label="Piso">
                    <Select>
                      {Array.from({ length: 21 }, (_, i) => (
                        <Option key={`P${i + 1}_`} value={`P${i + 1}_`}>Piso {i + 1}</Option>
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
                        <Option key={`CP${i + 1}_`} value={`CP${i + 1}_`}>CP {i + 1}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="carton" label="Cartón (Opcional)">
                    <Select allowClear>
                      {Array.from({ length: 52 }, (_, i) => (
                        <Option key={`MM${i + 1}_`} value={`MM${i + 1}_`}>MM {i + 1}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="posicion" label="Posición (Opcional)">
                <Input placeholder="Posición específica" />
              </Form.Item>
            </div>
          )}

          <Divider style={{ margin: '32px 0 24px' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button
              size="large"
              onClick={() => navigate('/inventario')}
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
              Guardar Cambios
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default EditarRepuesto;
