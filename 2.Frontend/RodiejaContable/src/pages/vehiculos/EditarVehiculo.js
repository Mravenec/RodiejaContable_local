import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Typography,
  Tabs,
  Tag,
  Spin,
  message,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Switch,
  Space,
  Upload,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  MoneyCollectOutlined,
  ToolOutlined,
  FileTextOutlined,
  UploadOutlined,
  DeleteOutlined,
  PlusOutlined,
  CloseOutlined,
  CheckOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useUpdateVehiculo } from '../../hooks/useVehiculos';
import { useMarcas } from '../../hooks/useMarcas';
import { useModelos } from '../../hooks/useModelos';
import { useGeneraciones } from '../../hooks/useGeneraciones';
import vehiculoService from '../../api/vehiculos';
import finanzaService from '../../api/finanzas';
import inventarioService from '../../api/inventario';
import { getTiposTransacciones } from '../../api/transacciones';
import { formatCurrency } from '../../utils/formatters';
import api from '../../api/axios';
import dayjs from 'dayjs';
import ImageCarousel from '../../components/common/ImageCarousel';
import { API_BASE_URL } from '../../api/config';


// Servicio para repuestos
const repuestosService = {
  async getRepuestosPorVehiculo(vehiculoId) {
    try {
      const allRepuestos = await inventarioService.getRepuestos();
      return allRepuestos.filter(repuesto => repuesto.vehiculoOrigenId === parseInt(vehiculoId));
    } catch (error) {
      console.error('Error fetching repuestos:', error);
      return [];
    }
  }
};

// Servicio para transacciones
const transaccionesService = {
  async getTransaccionesPorVehiculo(vehiculoId) {
    try {
      let allTransacciones, tiposTransaccion;

      try {
        [allTransacciones, tiposTransaccion] = await Promise.all([
          finanzaService.getTransacciones(),
          getTiposTransacciones()
        ]);

        if (!Array.isArray(allTransacciones)) allTransacciones = [];
        if (!Array.isArray(tiposTransaccion)) tiposTransaccion = [];
      } catch (fetchError) {
        throw fetchError;
      }

      const tiposMap = tiposTransaccion.reduce((acc, tipo) => {
        acc[tipo.id] = tipo;
        return acc;
      }, {});

      let repuestos = [];
      try {
        repuestos = await repuestosService.getRepuestosPorVehiculo(vehiculoId);
      } catch (repuestoError) {
        console.error('Error fetching repuestos:', repuestoError);
      }

      const repuestoIds = repuestos.map(r => r.id);

      const filteredTransacciones = allTransacciones.filter(transaccion => {
        const matchesVehicle = transaccion.vehiculoId != null &&
          (transaccion.vehiculoId === vehiculoId ||
            transaccion.vehiculoId === parseInt(vehiculoId));

        const matchesRepuesto = transaccion.repuestoId != null &&
          repuestoIds.includes(transaccion.repuestoId);

        return matchesVehicle || matchesRepuesto;
      });

      return filteredTransacciones
        .map(transaccion => ({
          ...transaccion,
          tipo_transaccion: tiposMap[transaccion.tipoTransaccionId] || {
            nombre: 'Tipo desconocido',
            categoria: transaccion.monto > 0 ? 'INGRESO' : 'EGRESO'
          },
          fecha: Array.isArray(transaccion.fecha)
            ? new Date(transaccion.fecha[0], transaccion.fecha[1] - 1, transaccion.fecha[2])
            : new Date(transaccion.fecha)
        }))
        .sort((a, b) => b.fecha - a.fecha);
    } catch (error) {
      console.error('Error fetching transacciones:', error);
      return [];
    }
  }
};



const EditarVehiculo = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // Estados
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vehiculo, setVehiculo] = useState(null);
  const [transacciones, setTransacciones] = useState([]);
  const [repuestos, setRepuestos] = useState([]);
  const [allVehiculos, setAllVehiculos] = useState([]);
  const [loadingTransacciones, setLoadingTransacciones] = useState(false);
  const [loadingRepuestos, setLoadingRepuestos] = useState(false);
  const [imagenUrlValue, setImagenUrlValue] = useState(null);

  // Estados para selección en cascada
  const [marcaId, setMarcaId] = useState(null);
  const [modeloId, setModeloId] = useState(null);
  const [selectedGeneracionId, setSelectedGeneracionId] = useState(null);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);

  // Estados para creación/edición de marcas
  const [nuevaMarcaModal, setNuevaMarcaModal] = useState(false);
  const [nuevaMarcaNombre, setNuevaMarcaNombre] = useState('');
  const [creandoMarca, setCreandoMarca] = useState(false);
  const [editingMarcaId, setEditingMarcaId] = useState(null);
  const [editingMarcaNombre, setEditingMarcaNombre] = useState('');

  // Estados para creación/edición de modelos
  const [nuevoModeloModal, setNuevoModeloModal] = useState(false);
  const [nuevoModeloNombre, setNuevoModeloNombre] = useState('');
  const [creandoModelo, setCreandoModelo] = useState(false);
  const [editingModeloId, setEditingModeloId] = useState(null);
  const [editingModeloNombre, setEditingModeloNombre] = useState('');

  // Estados para creación/edición de generaciones
  const [nuevaGeneracionModal, setNuevaGeneracionModal] = useState(false);
  const [nuevaGeneracionNombre, setNuevaGeneracionNombre] = useState('');
  const [anioInicio, setAnioInicio] = useState(new Date().getFullYear());
  const [anioFin, setAnioFin] = useState(new Date().getFullYear());
  const [creandoGeneracion, setCreandoGeneracion] = useState(false);
  const [editingGeneracionId, setEditingGeneracionId] = useState(null);
  const [editingGeneracionNombre, setEditingGeneracionNombre] = useState('');
  const [editingAnioInicio, setEditingAnioInicio] = useState(new Date().getFullYear());
  const [editingAnioFin, setEditingAnioFin] = useState(new Date().getFullYear());

  // Hooks para cargar marcas, modelos y generaciones
  const {
    data: marcas = [],
    isLoading: isLoadingMarcas,
    createMarcaMutation,
    updateMarca
  } = useMarcas();

  const {
    data: modelos = [],
    isLoading: isLoadingModelos,
    createModelo,
    updateModelo
  } = useModelos(marcaId);

  const {
    data: generaciones = [],
    isLoading: isLoadingGeneraciones,
    createGeneracion,
    updateGeneracion
  } = useGeneraciones(modeloId);

  // Use the same update logic as the hook
  const updateVehiculo = useUpdateVehiculo({
    onSuccess: () => {
      navigate(`/vehiculos/${id}`);
    },
    onError: (error) => {
      console.error('Error actualizando vehículo:', error);
    }
  });

  // Load vehicle data using the same logic as VehiculoDetalle
  const loadVehicleData = useCallback(async () => {
    try {
      setLoading(true);

      // Get vehicle by ID directly from API
      const vehiculoEncontrado = await vehiculoService.getVehiculo(parseInt(id, 10));

      if (!vehiculoEncontrado) {
        throw new Error('Vehículo no encontrado');
      }

      // The vehiculosResponse already includes generacion attached from vehiculoService
      let vehiculoConGeneracion = vehiculoEncontrado;

      // If generacion is present but lacks nested modelo/marca, fetch them
      if (vehiculoConGeneracion.generacion && vehiculoConGeneracion.generacion.modeloId && !vehiculoConGeneracion.generacion.modelo) {
        try {
          const generacion = vehiculoConGeneracion.generacion;

          // Fetch modelo
          const modeloResponse = await api.get(`/modelos/${generacion.modeloId}`);
          const modelo = modeloResponse.data || { id: generacion.modeloId };

          // Fetch marca
          const marcaResponse = await api.get(`/marcas/${modelo.marcaId}`);
          const marca = marcaResponse.data || { id: modelo.marcaId, nombre: 'Marca no disponible' };

          // Attach nested structure
          vehiculoConGeneracion = {
            ...vehiculoEncontrado,
            generacion: {
              ...generacion,
              modelo: {
                ...modelo,
                marca: marca
              }
            }
          };

          console.log('Vehículo completo con jerarquía:', vehiculoConGeneracion);
        } catch (nestedError) {
          console.error('Error fetching nested data (modelo/marca):', nestedError);
          // Fallback: attach empty objects to avoid crashes
          vehiculoConGeneracion = {
            ...vehiculoEncontrado,
            generacion: {
              ...vehiculoEncontrado.generacion,
              modelo: {
                nombre: 'Modelo no disponible',
                marca: { nombre: 'Marca no disponible' }
              }
            }
          };
        }
      }

      setVehiculo(vehiculoConGeneracion);

      // Cargar lista de vehículos para correlativos de código
      try {
        const todos = await vehiculoService.getVehiculos();
        setAllVehiculos(Array.isArray(todos) ? todos : []);
      } catch (err) {
        console.error('Error cargando vehículos para correlativos:', err);
      }

    } catch (error) {
      console.error('Error loading vehicle:', error);
      message.error(`Error al cargar el vehículo: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadVehicleData();
  }, [loadVehicleData]);

  // Actualizar los años disponibles según la generación seleccionada
  useEffect(() => {
    if (!selectedGeneracionId || !generaciones || generaciones.length === 0) {
      setAniosDisponibles([]);
      return;
    }

    const generacionSeleccionada = generaciones.find(g => g.id === selectedGeneracionId);
    if (!generacionSeleccionada) {
      setAniosDisponibles([]);
      return;
    }

    const anioIni = generacionSeleccionada.anioInicio || 1990;
    const anioEnd = generacionSeleccionada.anioFin || new Date().getFullYear();

    const anios = [];
    for (let i = anioIni; i <= anioEnd; i++) {
      anios.push(i);
    }
    setAniosDisponibles(anios.sort((a, b) => b - a));
  }, [selectedGeneracionId, generaciones]);

  // Regenerar código del vehículo basado en Marca y Modelo
  const regenerarCodigo = useCallback((targetMarcaId, targetModeloId) => {
    const targetMarca = marcas.find(m => m.id === targetMarcaId);
    const targetModelo = modelos.find(m => m.id === targetModeloId);

    if (!targetMarca || !targetModelo) return;

    const cleanMarca = (targetMarca.nombre || '').replace(/\s+/g, '').toUpperCase();
    const cleanModelo = (targetModelo.nombre || '').replace(/\s+/g, '').toUpperCase();
    const prefix = `${cleanMarca.slice(0, 2)}${cleanModelo.slice(0, 2)}`.slice(0, 5);

    if (!prefix) return;

    // Si el vehículo actual ya tenía un código con este prefijo, mantenemos su código original
    if (vehiculo?.codigoVehiculo && vehiculo.codigoVehiculo.startsWith(`${prefix}-`)) {
      form.setFieldsValue({ codigoVehiculo: vehiculo.codigoVehiculo });
      return;
    }

    // Buscar el máximo correlativo existente en otros vehículos con ese prefijo
    let maxNum = 0;
    if (Array.isArray(allVehiculos)) {
      allVehiculos.forEach(v => {
        if (v.id !== vehiculo?.id && v.codigoVehiculo && v.codigoVehiculo.startsWith(`${prefix}-`)) {
          const parts = v.codigoVehiculo.split('-');
          const num = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
    }

    const nextCorrelativo = String(maxNum + 1).padStart(3, '0');
    const nuevoCodigo = `${prefix}-${nextCorrelativo}`;
    form.setFieldsValue({ codigoVehiculo: nuevoCodigo });
  }, [marcas, modelos, vehiculo, allVehiculos, form]);

  // Manejadores de cambios en cascada
  const handleMarcaChange = (value) => {
    setMarcaId(value);
    setModeloId(null);
    setSelectedGeneracionId(null);
    form.setFieldsValue({ modeloId: undefined, generacionId: undefined });
  };

  const handleModeloChange = (value) => {
    setModeloId(value);
    setSelectedGeneracionId(null);
    form.setFieldsValue({ generacionId: undefined });
    regenerarCodigo(marcaId, value);
  };

  const handleGeneracionChange = (value) => {
    setSelectedGeneracionId(value);
    form.setFieldsValue({ generacionId: value });
    if (marcaId && modeloId) {
      regenerarCodigo(marcaId, modeloId);
    }
  };

  // ─── CRUD de Marcas ──────────────────────────────────
  const handleNuevaMarca = async () => {
    if (!nuevaMarcaNombre.trim()) {
      message.warning('Por favor ingresa el nombre de la marca');
      return;
    }

    try {
      setCreandoMarca(true);
      const response = await createMarcaMutation.mutateAsync({ nombre: nuevaMarcaNombre.trim() });
      if (response?.data?.id) {
        setMarcaId(response.data.id);
        form.setFieldsValue({ marcaId: response.data.id, modeloId: undefined, generacionId: undefined });
        message.success(`Marca "${nuevaMarcaNombre}" creada exitosamente`);
        setNuevaMarcaModal(false);
        setNuevaMarcaNombre('');
      }
    } catch (error) {
      console.error('Error al crear la marca:', error);
      message.error('Error al crear la marca. Por favor intenta nuevamente.');
    } finally {
      setCreandoMarca(false);
    }
  };

  const handleEditarMarca = (m) => {
    setEditingMarcaId(m.id);
    setEditingMarcaNombre(m.nombre);
  };

  const handleGuardarEdicionMarca = async () => {
    if (!editingMarcaNombre.trim()) {
      message.warning('El nombre de la marca no puede estar vacío');
      return;
    }

    try {
      await updateMarca.mutateAsync({
        id: editingMarcaId,
        nombre: editingMarcaNombre.trim()
      });
      setEditingMarcaId(null);
      setEditingMarcaNombre('');
    } catch (error) {
      console.error('Error al actualizar la marca:', error);
      message.error('Error al actualizar la marca');
    }
  };

  const handleCancelarEdicionMarca = () => {
    setEditingMarcaId(null);
    setEditingMarcaNombre('');
  };

  // ─── CRUD de Modelos ─────────────────────────────────
  const handleNuevoModelo = async () => {
    if (!nuevoModeloNombre.trim()) {
      message.warning('Por favor ingresa el nombre del modelo');
      return;
    }

    if (!marcaId) {
      message.warning('Por favor selecciona una marca primero');
      return;
    }

    try {
      setCreandoModelo(true);
      const response = await createModelo.mutateAsync({
        nombre: nuevoModeloNombre.trim(),
        marcaId: marcaId
      });

      if (response?.data?.id) {
        setModeloId(response.data.id);
        form.setFieldsValue({ modeloId: response.data.id, generacionId: undefined });
        message.success(`Modelo "${nuevoModeloNombre}" creado exitosamente`);
        setNuevoModeloModal(false);
        setNuevoModeloNombre('');
        regenerarCodigo(marcaId, response.data.id);
      }
    } catch (error) {
      console.error('Error al crear el modelo:', error);
      message.error('Error al crear el modelo. Por favor intenta nuevamente.');
    } finally {
      setCreandoModelo(false);
    }
  };

  const handleEditarModelo = (mo) => {
    setEditingModeloId(mo.id);
    setEditingModeloNombre(mo.nombre);
  };

  const handleGuardarEdicionModelo = async () => {
    if (!editingModeloNombre.trim()) {
      message.warning('El nombre del modelo no puede estar vacío');
      return;
    }

    try {
      await updateModelo.mutateAsync({
        id: editingModeloId,
        nombre: editingModeloNombre.trim(),
        marcaId: marcaId
      });
      setEditingModeloId(null);
      setEditingModeloNombre('');
    } catch (error) {
      console.error('Error al actualizar el modelo:', error);
      message.error('Error al actualizar el modelo');
    }
  };

  const handleCancelarEdicionModelo = () => {
    setEditingModeloId(null);
    setEditingModeloNombre('');
  };

  // ─── CRUD de Generaciones ────────────────────────────
  const handleNuevaGeneracion = async () => {
    if (!nuevaGeneracionNombre.trim()) {
      message.warning('Por favor ingresa el nombre de la generación');
      return;
    }

    if (!modeloId) {
      message.warning('Por favor selecciona un modelo primero');
      return;
    }

    try {
      setCreandoGeneracion(true);
      const response = await createGeneracion.mutateAsync({
        nombre: nuevaGeneracionNombre.trim(),
        modeloId: modeloId,
        anioInicio: parseInt(anioInicio, 10),
        anioFin: parseInt(anioFin, 10)
      });

      if (response?.data?.id) {
        const newGeneration = response.data;
        setSelectedGeneracionId(newGeneration.id);
        form.setFieldsValue({ generacionId: newGeneration.id });
        message.success(`Generación "${nuevaGeneracionNombre}" creada exitosamente`);
        setNuevaGeneracionModal(false);
        setNuevaGeneracionNombre('');
        if (marcaId && modeloId) {
          regenerarCodigo(marcaId, modeloId);
        }
      }
    } catch (error) {
      console.error('Error al crear la generación:', error);
      message.error('Error al crear la generación. Por favor intenta nuevamente.');
    } finally {
      setCreandoGeneracion(false);
    }
  };

  const handleEditarGeneracion = (g) => {
    setEditingGeneracionId(g.id);
    setEditingGeneracionNombre(g.nombre);
    setEditingAnioInicio(g.anioInicio || new Date().getFullYear());
    setEditingAnioFin(g.anioFin || new Date().getFullYear());
  };

  const handleGuardarEdicionGeneracion = async () => {
    if (!editingGeneracionId || !editingGeneracionNombre.trim()) return;

    try {
      await updateGeneracion.mutateAsync({
        id: editingGeneracionId,
        nombre: editingGeneracionNombre.trim(),
        anioInicio: editingAnioInicio,
        anioFin: editingAnioFin,
        modeloId: modeloId
      });

      setEditingGeneracionId(null);
      setEditingGeneracionNombre('');
    } catch (error) {
      console.error('Error al actualizar la generación:', error);
      message.error('Error al actualizar la generación');
    }
  };

  const handleCancelarEdicionGeneracion = () => {
    setEditingGeneracionId(null);
    setEditingGeneracionNombre('');
    setEditingAnioInicio(new Date().getFullYear());
    setEditingAnioFin(new Date().getFullYear());
  };

  // Update form when vehicle data changes and load transactions/repuestos
  useEffect(() => {
    if (vehiculo) {
      console.log('Vehicle data loaded, updating form:', vehiculo);

      // Handle both imagenUrl and imagen_url field names
      const imagenUrl = vehiculo.imagenUrl || vehiculo.imagen_url || '';
      setImagenUrlValue(imagenUrl);

      // Identificar IDs de marca, modelo y generación para la cascada
      const mId = vehiculo.generacion?.modelo?.marcaId || vehiculo.generacion?.modelo?.marca?.id || vehiculo.marcaId;
      const moId = vehiculo.generacion?.modeloId || vehiculo.generacion?.modelo?.id || vehiculo.modeloId;
      const gId = vehiculo.generacionId;

      if (mId) setMarcaId(mId);
      if (moId) setModeloId(moId);
      if (gId) setSelectedGeneracionId(gId);

      // Handle date parsing more robustly
      let fechaIngresoDayjs = null;
      let fechaVentaDayjs = null;

      if (vehiculo.fechaIngreso) {
        try {
          if (Array.isArray(vehiculo.fechaIngreso)) {
            const [y, m, d] = vehiculo.fechaIngreso;
            fechaIngresoDayjs = dayjs(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, 'YYYY-MM-DD');
          } else {
            fechaIngresoDayjs = dayjs(vehiculo.fechaIngreso);
            if (!fechaIngresoDayjs.isValid()) {
              fechaIngresoDayjs = dayjs(vehiculo.fechaIngreso, ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD']);
            }
          }
        } catch (error) {
          console.error('Error parsing fechaIngreso:', error, 'Raw value:', vehiculo.fechaIngreso);
        }
      }

      if (vehiculo.fechaVenta) {
        try {
          if (Array.isArray(vehiculo.fechaVenta)) {
            const [y, m, d] = vehiculo.fechaVenta;
            fechaVentaDayjs = dayjs(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, 'YYYY-MM-DD');
          } else {
            fechaVentaDayjs = dayjs(vehiculo.fechaVenta);
            if (!fechaVentaDayjs.isValid()) {
              fechaVentaDayjs = dayjs(vehiculo.fechaVenta, ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD']);
            }
          }
        } catch (error) {
          console.error('Error parsing fechaVenta:', error, 'Raw value:', vehiculo.fechaVenta);
        }
      }

      console.log('Setting form values:', {
        marcaId: mId,
        modeloId: moId,
        codigoVehiculo: vehiculo.codigoVehiculo,
        generacionId: vehiculo.generacionId,
        imagenUrl: imagenUrl,
        anio: vehiculo.anio,
        precioCompra: vehiculo.precioCompra,
        costoGrua: vehiculo.costoGrua || 0,
        comisiones: vehiculo.comisiones || 0,
        inversionTotal: vehiculo.inversionTotal || 0,
        fechaIngreso: fechaIngresoDayjs,
        fechaVenta: fechaVentaDayjs,
        estado: vehiculo.estado || 'DISPONIBLE',
        precioVenta: vehiculo.precioVenta,
        activo: vehiculo.activo !== false,
        notas: vehiculo.notas
      });

      form.setFieldsValue({
        marcaId: mId,
        modeloId: moId,
        codigoVehiculo: vehiculo.codigoVehiculo,
        generacionId: vehiculo.generacionId,
        imagenUrl: imagenUrl,
        anio: vehiculo.anio,
        precioCompra: vehiculo.precioCompra,
        costoGrua: vehiculo.costoGrua || 0,
        comisiones: vehiculo.comisiones || 0,
        inversionTotal: vehiculo.inversionTotal || 0,
        fechaIngreso: fechaIngresoDayjs,
        fechaVenta: fechaVentaDayjs,
        estado: vehiculo.estado || 'DISPONIBLE',
        precioVenta: vehiculo.precioVenta,
        activo: vehiculo.activo !== false,
        notas: vehiculo.notas,
        costoRecuperado: vehiculo.costoRecuperado || 0,
        cilindraje: vehiculo.cilindraje || '',
        traccion: vehiculo.traccion || null,
        transmision: vehiculo.transmision || null,
        combustible: vehiculo.combustible || null
      });

      // Load transactions and repuestos for this vehicle
      if (vehiculo.id) {
        loadTransactions(vehiculo.id);
        loadRepuestos(vehiculo.id);
      }
    }
  }, [vehiculo, form]);

  const loadRepuestos = async (vehiculoId) => {
    try {
      setLoadingRepuestos(true);
      const repuestosData = await repuestosService.getRepuestosPorVehiculo(vehiculoId);
      setRepuestos(repuestosData);
    } catch (error) {
      console.error('Error cargando repuestos:', error);
      message.warning('No se pudieron cargar los repuestos');
    } finally {
      setLoadingRepuestos(false);
    }
  };

  const loadTransactions = async (vehiculoId) => {
    try {
      setLoadingTransacciones(true);
      const transaccionesData = await transaccionesService.getTransaccionesPorVehiculo(vehiculoId);
      setTransacciones(Array.isArray(transaccionesData) ? transaccionesData : []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransacciones([]);
      message.error('Error al cargar las transacciones');
    } finally {
      setLoadingTransacciones(false);
    }
  };

  // Load transactions when vehicle data is available
  useEffect(() => {
    if (vehiculo?.id) {
      loadTransactions(vehiculo.id);
      loadRepuestos(vehiculo.id);
    }
  }, [vehiculo?.id]);

  const onFinish = async (values) => {
    try {
      setSaving(true);

      const formattedValues = {
        codigoVehiculo: values.codigoVehiculo ? values.codigoVehiculo.trim() : null,
        generacionId: values.generacionId ? parseInt(values.generacionId, 10) : null,
        anio: values.anio ? parseInt(values.anio, 10) : null,
        precioCompra: values.precioCompra !== undefined && values.precioCompra !== null && values.precioCompra !== '' ? parseFloat(values.precioCompra) : null,
        costoGrua: values.costoGrua !== undefined && values.costoGrua !== null && values.costoGrua !== '' ? parseFloat(values.costoGrua) : 0,
        comisiones: values.comisiones !== undefined && values.comisiones !== null && values.comisiones !== '' ? parseFloat(values.comisiones) : 0,
        precioVenta: values.precioVenta !== undefined && values.precioVenta !== null && values.precioVenta !== '' ? parseFloat(values.precioVenta) : null,
        imagenUrl: values.imagenUrl || imagenUrlValue || '',
        fechaIngreso: values.fechaIngreso && values.fechaIngreso.isValid() ? values.fechaIngreso.format('YYYY-MM-DD') : null,
        fechaVenta: values.fechaVenta && values.fechaVenta.isValid() ? values.fechaVenta.format('YYYY-MM-DD') : null,
        estado: values.estado,
        notas: values.notas || '',
        traccion: values.traccion || null,
        transmision: values.transmision || null,
        combustible: values.combustible || null,
        cilindraje: values.cilindraje || null
      };

      // Remove calculated fields from payload as they're handled in backend
      delete formattedValues.inversionTotal;
      delete formattedValues.costoRecuperado;
      delete formattedValues.costoPendiente;

      // Debug: Log the data being sent
      console.log('Sending to API:', JSON.stringify(formattedValues, null, 2));

      // Use the hook to update the vehicle
      updateVehiculo.mutate({ id, ...formattedValues });

    } catch (error) {
      console.error('Error actualizando vehículo:', error);
      message.error('Error al actualizar el vehículo');
    } finally {
      setSaving(false);
    }
  };

  // Helper functions (copiados de VehiculoDetalle)
  const getEstadoTag = (estado) => {
    const estados = {
      DISPONIBLE: { color: 'success', text: 'Disponible' },
      VENDIDO: { color: 'error', text: 'Vendido' },
      DESARMADO: { color: 'warning', text: 'Desarmado' },
      REPARACION: { color: 'processing', text: 'En Reparación' }
    };

    const estadoInfo = estados[estado] || { color: 'default', text: 'Desconocido' };
    return <Tag color={estadoInfo.color}>{estadoInfo.text}</Tag>;
  };

  const getEstadoRepuestoTag = (estado) => {
    const estados = {
      STOCK: { color: 'success', text: 'Disponible' },
      VENDIDO: { color: 'error', text: 'Vendido' },
      RESERVADO: { color: 'warning', text: 'Reservado' },
      DAÑADO: { color: 'error', text: 'Dañado' }
    };

    const estadoInfo = estados[estado] || { color: 'default', text: estado || 'Desconocido' };
    return <Tag color={estadoInfo.color}>{estadoInfo.text}</Tag>;
  };

  const renderTipoTransaccion = (tipo) => {
    if (!tipo) {
      return <Tag color="default">No especificado</Tag>;
    }

    const isIngreso = tipo.categoria === 'INGRESO';
    const color = isIngreso ? 'green' : 'red';
    const nombre = tipo.nombre || 'Desconocido';

    return <Tag color={color}>{nombre}</Tag>;
  };

  const formatCurrencyWithColor = (amount, tipo) => {
    const formattedAmount = new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0
    }).format(amount);

    if (tipo !== undefined) {
      const isIngreso = tipo === 'INGRESO';
      return (
        <span style={{ color: isIngreso ? '#52c41a' : '#f5222d' }}>
          {isIngreso ? '+' : '-'} {formattedAmount}
        </span>
      );
    }

    return formattedAmount;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'No especificada';

    try {
      if (Array.isArray(dateValue)) {
        const [year, month, day] = dateValue;
        return new Date(year, month - 1, day).toLocaleDateString();
      }

      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? 'Fecha inválida' : date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Fecha inválida';
    }
  };

  const getMarcaModelo = () => {
    const currentMarca = marcas.find(m => m.id === marcaId)?.nombre || vehiculo?.generacion?.modelo?.marca?.nombre || 'Marca no disponible';
    const currentModelo = modelos.find(m => m.id === modeloId)?.nombre || vehiculo?.generacion?.modelo?.nombre || 'Modelo no disponible';
    const currentGeneracion = generaciones.find(g => g.id === selectedGeneracionId)?.nombre || vehiculo?.generacion?.nombre || 'Generación';
    return { marca: currentMarca, modelo: currentModelo, generacion: currentGeneracion };
  };

  const { marca, modelo, generacion: generacionNombre } = getMarcaModelo();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* ── Header de navegación ─────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/vehiculos/${id}`)}
          style={{ color: '#595959', fontWeight: 500 }}
        >
          Volver al detalle
        </Button>
        <Space>
          <Button onClick={() => navigate(`/vehiculos/${id}`)}>Cancelar</Button>
          <Button
            type="primary"
            htmlType="submit"
            form="editar-vehiculo-form"
            loading={loading || saving}
            icon={<SaveOutlined />}
            style={{ borderRadius: '6px' }}
          >
            Guardar Cambios
          </Button>
        </Space>
      </div>

      <Form
        id="editar-vehiculo-form"
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        {/* ── Hero Card: imagen + datos principales ─── */}
        <Card
          bordered={false}
          style={{ borderRadius: '10px', border: '1px solid #f0f0f0', marginBottom: '16px', overflow: 'hidden' }}
          bodyStyle={{ padding: 0 }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {/* Imagen */}
            <div style={{ flex: '0 0 220px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
              <ImageCarousel
                imageUrlString={vehiculo?.imagenUrl || vehiculo?.imagen_url || ''}
                alt={`${marca} ${modelo}`}
                width="220px"
                height="160px"
                borderRadius="8px"
                preview={true}
              />
            </div>

            {/* Info principal */}
            <div style={{ flex: 1, padding: '20px 24px', minWidth: '260px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {generacionNombre}
                  </Typography.Text>
                  <Typography.Title level={3} style={{ margin: '4px 0 8px' }}>
                    {marca} {modelo}
                  </Typography.Title>
                  {getEstadoTag(vehiculo?.estado)}
                  <Typography.Text type="secondary" style={{ display: 'block', marginTop: '6px', fontSize: '13px' }}>
                    Código: <strong>{vehiculo?.codigoVehiculo || '—'}</strong>
                  </Typography.Text>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {(vehiculo?.precioVenta > 0 || vehiculo?.precioCompra > 0) && (
                    <>
                      <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                        {vehiculo?.precioVenta > 0 ? 'Precio de venta' : 'Precio de compra'}
                      </Typography.Text>
                      <Typography.Title level={3} style={{ margin: '2px 0', color: '#1890ff' }}>
                        {formatCurrency(vehiculo?.precioVenta || vehiculo?.precioCompra)}
                      </Typography.Title>
                    </>
                  )}
                  <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                    Inversión: {formatCurrency(vehiculo?.inversionTotal || 0)}
                  </Typography.Text>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Pestañas de edición ──────────────────────── */}
        <Card bordered={false} style={{ borderRadius: '10px', border: '1px solid #f0f0f0' }}>
          <Tabs defaultActiveKey="1">
            {/* ─── TAB 1: Información General ─── */}
            <Tabs.TabPane tab={<span><FileTextOutlined /> Información General</span>} key="1">

              {/* Sección: Identificación */}
              <Typography.Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Identificación
              </Typography.Text>
              <Divider style={{ marginTop: '8px', marginBottom: '16px' }} />
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    label="Marca"
                    name="marcaId"
                    rules={[{ required: true, message: 'Por favor selecciona una marca' }]}
                  >
                    <Select
                      placeholder="Selecciona una marca"
                      loading={isLoadingMarcas}
                      onChange={handleMarcaChange}
                      showSearch
                      optionFilterProp="label"
                      filterOption={(input, option) =>
                        option.props.className === 'add-new-option' ||
                        (option.label && option.label.toLowerCase().includes(input.toLowerCase()))
                      }
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
                      {marcas.map((m) => (
                        <Select.Option key={m.id} value={m.id} label={m.nombre}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            {editingMarcaId === m.id ? (
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
                                <span>{m.nombre}</span>
                                <Button
                                  type="text"
                                  icon={<EditOutlined />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditarMarca(m);
                                  }}
                                  size="small"
                                />
                              </>
                            )}
                          </div>
                        </Select.Option>
                      ))}
                      {nuevaMarcaModal && (
                        <Select.Option className="add-new-option" value="" style={{ display: 'none' }}>
                          {nuevaMarcaNombre}
                        </Select.Option>
                      )}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    label="Modelo"
                    name="modeloId"
                    rules={[{ required: true, message: 'Por favor selecciona un modelo' }]}
                  >
                    <Select
                      placeholder="Selecciona un modelo"
                      loading={isLoadingModelos}
                      onChange={handleModeloChange}
                      disabled={!marcaId}
                      showSearch
                      optionFilterProp="label"
                      filterOption={(input, option) =>
                        option.props.className === 'add-new-option' ||
                        (option.label && option.label.toLowerCase().includes(input.toLowerCase()))
                      }
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
                                icon={<PlusOutlined />}
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
                                color: '#1890ff',
                                opacity: marcaId ? 1 : 0.5,
                                pointerEvents: marcaId ? 'auto' : 'none'
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
                      {modelos.map((mo) => (
                        <Select.Option key={mo.id} value={mo.id} label={mo.nombre}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            {editingModeloId === mo.id ? (
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
                                <span>{mo.nombre}</span>
                                <Button
                                  type="text"
                                  icon={<EditOutlined />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditarModelo(mo);
                                  }}
                                  size="small"
                                />
                              </>
                            )}
                          </div>
                        </Select.Option>
                      ))}
                      {nuevoModeloModal && (
                        <Select.Option className="add-new-option" value="" style={{ display: 'none' }}>
                          {nuevoModeloNombre}
                        </Select.Option>
                      )}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    label="Generación"
                    name="generacionId"
                    rules={[{ required: true, message: 'Por favor selecciona una generación' }]}
                  >
                    <Select
                      placeholder="Selecciona una generación"
                      loading={isLoadingGeneraciones}
                      onChange={handleGeneracionChange}
                      disabled={!modeloId}
                      showSearch
                      optionFilterProp="label"
                      filterOption={(input, option) =>
                        option.props.className === 'add-new-option' ||
                        (option.label && option.label.toLowerCase().includes(input.toLowerCase()))
                      }
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
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setNuevaGeneracionModal(false);
                                    setNuevaGeneracionNombre('');
                                  } else if (e.key === 'Enter') {
                                    handleNuevaGeneracion();
                                  }
                                }}
                              />
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <InputNumber
                                  size="small"
                                  placeholder="Año inicio"
                                  min={1900}
                                  max={2100}
                                  value={anioInicio}
                                  onChange={(value) => setAnioInicio(value)}
                                  style={{ width: '50%' }}
                                />
                                <InputNumber
                                  size="small"
                                  placeholder="Año fin"
                                  min={anioInicio}
                                  max={2100}
                                  value={anioFin}
                                  onChange={(value) => setAnioFin(value)}
                                  style={{ width: '50%' }}
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <Button
                                  type="text"
                                  danger
                                  icon={<CloseOutlined />}
                                  onClick={() => {
                                    setNuevaGeneracionModal(false);
                                    setNuevaGeneracionNombre('');
                                  }}
                                  disabled={creandoGeneracion}
                                  title="Cancelar"
                                />
                                <Button
                                  type="text"
                                  icon={<CheckOutlined />}
                                  onClick={handleNuevaGeneracion}
                                  loading={creandoGeneracion}
                                  disabled={!nuevaGeneracionNombre.trim()}
                                  title="Agregar"
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
                                color: '#1890ff',
                                opacity: modeloId ? 1 : 0.5,
                                pointerEvents: modeloId ? 'auto' : 'none'
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setNuevaGeneracionModal(true);
                                setNuevaGeneracionNombre('');
                              }}
                            >
                              <PlusOutlined style={{ marginRight: 8 }} />
                              Agregar nueva generación
                            </div>
                          )}
                        </div>
                      )}
                    >
                      {generaciones.map((g) => {
                        const startYear = g.anioInicio || 1990;
                        const endYear = g.anioFin || new Date().getFullYear();
                        const displayText = `${g.nombre} (${startYear}–${endYear})`;

                        return (
                          <Select.Option key={g.id} value={g.id} label={displayText}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                              {editingGeneracionId === g.id ? (
                                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '8px' }}>
                                  <Input
                                    value={editingGeneracionNombre}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      setEditingGeneracionNombre(e.target.value);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    style={{ width: '100%' }}
                                    autoFocus
                                  />
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <InputNumber
                                      value={editingAnioInicio}
                                      min={1900}
                                      max={2100}
                                      onChange={(value) => setEditingAnioInicio(value)}
                                      style={{ width: '50%' }}
                                    />
                                    <InputNumber
                                      value={editingAnioFin}
                                      min={editingAnioInicio}
                                      max={2100}
                                      onChange={(value) => setEditingAnioFin(value)}
                                      style={{ width: '50%' }}
                                    />
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
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
                                </div>
                              ) : (
                                <>
                                  <span>{displayText}</span>
                                  <Button
                                    type="text"
                                    icon={<EditOutlined />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditarGeneracion(g);
                                    }}
                                    size="small"
                                  />
                                </>
                              )}
                            </div>
                          </Select.Option>
                        );
                      })}
                      {nuevaGeneracionModal && (
                        <Select.Option className="add-new-option" value="" style={{ display: 'none' }}>
                          {nuevaGeneracionNombre} ({anioInicio} - {anioFin})
                        </Select.Option>
                      )}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Año" name="anio" rules={[{ required: true, message: 'Requerido' }]}>
                    {aniosDisponibles.length > 0 ? (
                      <Select
                        showSearch
                        style={{ width: '100%' }}
                        placeholder="Selecciona el año"
                        filterOption={(input, option) =>
                          option.children.toString().toLowerCase().includes(input.toLowerCase())
                        }
                      >
                        {aniosDisponibles.map(a => (
                          <Select.Option key={a} value={a}>
                            {a}
                          </Select.Option>
                        ))}
                      </Select>
                    ) : (
                      <InputNumber style={{ width: '100%' }} placeholder="Ej: 2020" min={1900} max={new Date().getFullYear() + 1} />
                    )}
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Código" name="codigoVehiculo" rules={[{ required: true, message: 'Requerido' }]}>
                    <Input placeholder="Ej: TOCO-001" />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Estado" name="estado" rules={[{ required: true, message: 'Requerido' }]}>
                    <Select placeholder="Selecciona estado">
                      <Select.Option value="DISPONIBLE">Disponible</Select.Option>
                      <Select.Option value="VENDIDO">Vendido</Select.Option>
                      <Select.Option value="DESARMADO">Desarmado</Select.Option>
                      <Select.Option value="REPARACION">En Reparación</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Fecha de Ingreso" name="fechaIngreso" rules={[{ required: true, message: 'Requerido' }]}>
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Selecciona fecha" />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12} md={16}>
                  <Form.Item label="Foto del vehículo (Subir o URL)">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Upload
                          name="file"
                          action={`${API_BASE_URL}/api/upload/vehiculo`}
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
                              form.setFieldsValue({ imagenUrl: serverUrl });
                              setImagenUrlValue(serverUrl);
                              setVehiculo(prev => ({ ...prev, imagenUrl: serverUrl }));
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
                            form.setFieldsValue({ imagenUrl: '' });
                            setImagenUrlValue('');
                            setVehiculo(prev => ({ ...prev, imagenUrl: '' }));
                          }}
                          disabled={!imagenUrlValue}
                        />
                      </div>
                      <Form.Item
                        name="imagenUrl"
                        style={{ marginBottom: 0 }}
                      >
                        <Input
                          placeholder="https://ejemplo.com/imagen.jpg o ruta local"
                          allowClear
                          onChange={(e) => {
                            setImagenUrlValue(e.target.value);
                            setVehiculo(prev => ({ ...prev, imagenUrl: e.target.value }));
                          }}
                        />
                      </Form.Item>
                    </Space>
                  </Form.Item>
                </Col>
              </Row>

              {/* Sección: Especificaciones Técnicas */}
              <Typography.Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Especificaciones Técnicas
              </Typography.Text>
              <Divider style={{ marginTop: '8px', marginBottom: '16px' }} />
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="Transmisión" name="transmision">
                    <Select placeholder="Selecciona">
                      <Select.Option value="Automatico">Automático</Select.Option>
                      <Select.Option value="Manual">Manual</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="Tracción" name="traccion">
                    <Select placeholder="Selecciona">
                      <Select.Option value="4x2">4x2</Select.Option>
                      <Select.Option value="4x4">4x4</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="Combustible" name="combustible">
                    <Select placeholder="Selecciona">
                      <Select.Option value="Gasolina">Gasolina</Select.Option>
                      <Select.Option value="Diesel">Diésel</Select.Option>
                      <Select.Option value="Eléctrico">Eléctrico</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="Cilindraje" name="cilindraje" rules={[{ max: 200 }]}>
                    <Input placeholder="Ej: 1.8L, 1600cc" maxLength={200} />
                  </Form.Item>
                </Col>
              </Row>

              {/* Sección: Información Financiera */}
              <Typography.Text strong style={{ color: '#cf1322', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Información Financiera
              </Typography.Text>
              <Divider style={{ marginTop: '8px', marginBottom: '16px', borderColor: '#cf1322' }} />
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label={<span style={{ color: '#cf1322' }}>Precio de Compra</span>} name="precioCompra" rules={[{ required: true, message: 'Requerido' }]}>
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={v => `₡ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={v => v.replace(/₡\s?|(,*)/g, '')}
                      min={0} precision={2}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label={<span style={{ color: '#cf1322' }}>Costo de Grúa</span>} name="costoGrua">
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={v => `₡ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={v => v.replace(/₡\s?|(,*)/g, '')}
                      min={0} precision={2}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label={<span style={{ color: '#cf1322' }}>Comisiones</span>} name="comisiones">
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={v => `₡ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={v => v.replace(/₡\s?|(,*)/g, '')}
                      min={0} precision={2}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Precio de Venta" name="precioVenta">
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={v => `₡ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={v => v.replace(/₡\s?|(,*)/g, '')}
                      min={0}
                      precision={2}
                      onChange={(value) => {
                        if (value === null || value === undefined || value === '') {
                          form.setFieldValue('precioVenta', 0);
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Fecha de Venta" name="fechaVenta">
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Vehículo Activo" name="activo" valuePropName="checked">
                    <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
                  </Form.Item>
                </Col>
              </Row>

              {/* Notas */}
              <Row gutter={[16, 0]}>
                <Col span={24}>
                  <Form.Item label="Notas" name="notas">
                    <Input.TextArea rows={3} placeholder="Notas adicionales sobre el vehículo..." />
                  </Form.Item>
                </Col>
              </Row>
            </Tabs.TabPane>

            {/* ─── TAB 2: Repuestos ─── */}
            <Tabs.TabPane tab={<span><ToolOutlined /> Repuestos</span>} key="2">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <Typography.Text strong>Repuestos extraídos de este vehículo</Typography.Text>
                <Button type="primary" size="small" onClick={() => navigate(`/inventario/nuevo?vehiculoId=${vehiculo.id}`)}>
                  + Agregar Repuesto
                </Button>
              </div>
              {loadingRepuestos ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><Spin /></div>
              ) : repuestos && repuestos.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        {['Código', 'Parte', 'Descripción', 'Precio Venta', 'Estado', 'Ubicación', ''].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Precio Venta' ? 'right' : 'left', fontWeight: 600, color: '#595959', borderBottom: '2px solid #f0f0f0', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {repuestos.map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/inventario/${r.id}`)}>{r.codigoRepuesto || '—'}</Button>
                          </td>
                          <td style={{ padding: '10px 12px' }}><Tag color="blue">{r.parteVehiculo || 'N/A'}</Tag></td>
                          <td style={{ padding: '10px 12px', color: '#595959' }}>{r.descripcion || '—'}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 500 }}>{formatCurrency(r.precioVenta || 0)}</td>
                          <td style={{ padding: '10px 12px' }}>{getEstadoRepuestoTag(r.estado)}</td>
                          <td style={{ padding: '10px 12px', color: '#8c8c8c', fontSize: '12px' }}>{r.codigoUbicacion || '—'}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <Button type="link" size="small" onClick={() => navigate(`/inventario/${r.id}`)}>Ver</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px', color: '#bfbfbf' }}>
                  <ToolOutlined style={{ fontSize: '36px', marginBottom: '12px', display: 'block' }} />
                  <Typography.Text type="secondary">No hay repuestos registrados para este vehículo.</Typography.Text>
                  <br />
                  <Button type="primary" style={{ marginTop: '16px' }} onClick={() => navigate(`/inventario/nuevo?vehiculoId=${vehiculo.id}`)}>
                    Agregar Repuesto
                  </Button>
                </div>
              )}
            </Tabs.TabPane>

            {/* ─── TAB 3: Transacciones ─── */}
            <Tabs.TabPane tab={<span><MoneyCollectOutlined /> Transacciones</span>} key="3">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <Typography.Text strong>Historial de transacciones del vehículo</Typography.Text>
                <Button type="primary" size="small" onClick={() => navigate(`/finanzas/transaccion/nueva?vehiculoId=${vehiculo.id}`)}>
                  + Nueva Transacción
                </Button>
              </div>
              {loadingTransacciones ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><Spin /></div>
              ) : transacciones && transacciones.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        {['Fecha', 'Tipo', 'Monto', 'Descripción', ''].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Monto' ? 'right' : 'left', fontWeight: 600, color: '#595959', borderBottom: '2px solid #f0f0f0', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transacciones.map((t) => (
                        <tr key={t.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#595959' }}>{formatDate(t.fecha)}</td>
                          <td style={{ padding: '10px 12px' }}>{renderTipoTransaccion(t.tipo_transaccion)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                            {formatCurrencyWithColor(t.monto, t.tipo_transaccion?.categoria)}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#595959' }}>{t.descripcion || '—'}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <Button type="link" size="small" onClick={() => navigate(`/finanzas/${t.id}`)}>Ver</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px', color: '#bfbfbf' }}>
                  <MoneyCollectOutlined style={{ fontSize: '36px', marginBottom: '12px', display: 'block' }} />
                  <Typography.Text type="secondary">No hay transacciones registradas para este vehículo.</Typography.Text>
                </div>
              )}
            </Tabs.TabPane>
          </Tabs>
        </Card>
      </Form>
    </div>
  );
};

export default EditarVehiculo;

