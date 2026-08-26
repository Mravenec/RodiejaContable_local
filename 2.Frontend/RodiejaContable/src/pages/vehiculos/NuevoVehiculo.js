import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Select,
  DatePicker,
  InputNumber,
  message,
  Steps,
  Row,
  Col,
  Divider,
  Tag,
  Upload,
  Space
} from 'antd';
import {
  SaveOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  CloseOutlined,
  CheckOutlined,
  EditOutlined,
  UploadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { Loading } from '../../components/Loading';
import { useMarcas } from '../../hooks/useMarcas';
import { useModelos } from '../../hooks/useModelos';
import { useGeneraciones } from '../../hooks/useGeneraciones';
import { useCreateVehiculo, useUpdateVehiculo, useVehiculo } from '../../hooks/useVehiculos';

const { Title, Text } = Typography;
const { Step } = Steps;
const { TextArea } = Input;
const { Option } = Select;

// Opciones para los nuevos campos enum
const TRACCION_OPTIONS = [
  { value: '4x2', label: '4x2' },
  { value: '4x4', label: '4x4' }
];

const TRANSMISION_OPTIONS = [
  { value: 'Automatico', label: 'Automático' },
  { value: 'Manual', label: 'Manual' }
];

const COMBUSTIBLE_OPTIONS = [
  { value: 'Gasolina', label: 'Gasolina' },
  { value: 'Diesel', label: 'Diésel' },
  { value: 'Eléctrico', label: 'Eléctrico' }
];

const NuevoVehiculo = ({ editMode = false }) => {
  const [form] = Form.useForm();
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para manejar la selección en cascada
  const [marcaId, setMarcaId] = useState(null);
  const [editingMarcaId, setEditingMarcaId] = useState(null);
  const [editingMarcaNombre, setEditingMarcaNombre] = useState('');
  const [modeloId, setModeloId] = useState(null);
  const [selectedGeneracionId, setSelectedGeneracionId] = useState(null);

  // Estados para manejar valores del formulario manualmente
  const [anioValue, setAnioValue] = useState(new Date().getFullYear());

  // Estado para los años disponibles
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [estadoValue, setEstadoValue] = useState('DISPONIBLE');
  const [notasValue, setNotasValue] = useState('');
  const [precioCompraValue, setPrecioCompraValue] = useState(null);
  const [costoGruaValue, setCostoGruaValue] = useState(0);
  const [comisionesValue, setComisionesValue] = useState(0);

  // Estados para los nuevos campos enum
  const [traccionValue, setTraccionValue] = useState('4x2');
  const [transmisionValue, setTransmisionValue] = useState('Automatico');
  const [combustibleValue, setCombustibleValue] = useState('Gasolina');
  const [cilindrajeValue, setCilindrajeValue] = useState('');
  const [imagenUrlValue, setImagenUrlValue] = useState(null);

  // Estado para el modal de nueva marca
  const [nuevaMarcaModal, setNuevaMarcaModal] = useState(false);
  const [nuevaMarcaNombre, setNuevaMarcaNombre] = useState('');
  const [creandoMarca, setCreandoMarca] = useState(false);

  // Estado para el modal de nuevo modelo
  const [nuevoModeloModal, setNuevoModeloModal] = useState(false);
  const [nuevoModeloNombre, setNuevoModeloNombre] = useState('');
  const [creandoModelo, setCreandoModelo] = useState(false);

  // Estado para la edición de modelos
  const [editingModeloId, setEditingModeloId] = useState(null);
  const [editingModeloNombre, setEditingModeloNombre] = useState('');

  // Estado para la edición de generaciones
  const [editingGeneracionId, setEditingGeneracionId] = useState(null);
  const [editingGeneracionNombre, setEditingGeneracionNombre] = useState('');
  const [editingAnioInicio, setEditingAnioInicio] = useState(new Date().getFullYear());
  const [editingAnioFin, setEditingAnioFin] = useState(new Date().getFullYear());

  // Estado para el modal de nueva generación
  const [nuevaGeneracionModal, setNuevaGeneracionModal] = useState(false);
  const [nuevaGeneracionNombre, setNuevaGeneracionNombre] = useState('');
  const [anioInicio, setAnioInicio] = useState(new Date().getFullYear());
  const [anioFin, setAnioFin] = useState(new Date().getFullYear());
  const [creandoGeneracion, setCreandoGeneracion] = useState(false);



  // Hooks para cargar datos
  const {
    data: generaciones = [],
    isLoading: isLoadingGeneraciones,
    error: errorGeneraciones,
    createGeneracion,
    updateGeneracion
  } = useGeneraciones(modeloId);

  // Este es el hook que obtiene la lista de marcas, incluyendo 'Toyota'
  const {
    data: marcas = [],
    isLoading: isLoadingMarcas,
    error: errorMarcas,
    createMarcaMutation,
    updateMarca
  } = useMarcas();

  const {
    data: modelos = [],
    isLoading: isLoadingModelos,
    error: errorModelos,
    createModelo,
    updateModelo
  } = useModelos(marcaId);


  // Efecto para actualizar los años disponibles cuando cambia la generación seleccionada
  useEffect(() => {
    if (!selectedGeneracionId || !generaciones || generaciones.length === 0) {
      setAniosDisponibles([]);
      return;
    }

    // Buscar la generación seleccionada
    const generacionSeleccionada = generaciones.find(g => g.id === selectedGeneracionId);
    if (!generacionSeleccionada) {
      setAniosDisponibles([]);
      return;
    }

    const anioInicio = generacionSeleccionada.anioInicio || new Date().getFullYear();
    const anioFin = generacionSeleccionada.anioFin || new Date().getFullYear();

    const anios = [];
    for (let i = anioInicio; i <= anioFin; i++) {
      anios.push(i);
    }

    setAniosDisponibles(anios.sort((a, b) => b - a)); // Orden descendente
    
    // Auto-seleccionar el año fin (o el mayor año disponible)
    if (anios.length > 0) {
      const maxAnio = Math.max(...anios);
      setAnioValue(maxAnio);
      form.setFieldsValue({ anio: maxAnio });
    }
  }, [selectedGeneracionId, generaciones, form]);



  // Mostrar errores si los hay
  useEffect(() => {
    if (errorMarcas) {
      message.error('Error al cargar las marcas: ' + (errorMarcas.message || 'Error desconocido'));
    }
    if (errorModelos) {
      message.error('Error al cargar los modelos: ' + (errorModelos.message || 'Error desconocido'));
    }
    if (errorGeneraciones) {
      message.error('Error al cargar las generaciones: ' + (errorGeneraciones.message || 'Error desconocido'));
    }
  }, [errorMarcas, errorModelos, errorGeneraciones]);

  // Cargar datos del vehículo si está en modo edición - ACTUALIZADO
  const { isLoading: isLoadingVehiculo } = useVehiculo(id, {
    enabled: editMode,
    onSuccess: (data) => {
      console.log('✅ Datos del vehículo cargados:', data);

      // Establecer los IDs para cargar los datos relacionados
      setMarcaId(data.marcaId);
      setModeloId(data.modeloId);
      setSelectedGeneracionId(data.generacionId);

      // Establecer valores de estado
      setAnioValue(data.anio);
      setEstadoValue(data.estado);
      setNotasValue(data.notas || '');
      setPrecioCompraValue(data.precioCompra);
      setCostoGruaValue(data.costoGrua || 0);
      setComisionesValue(data.comisiones || 0);

      // Establecer valores de los nuevos campos enum
      setTraccionValue(data.traccion || '4x2');
      setTransmisionValue(data.transmision || 'Automatico');
      setCombustibleValue(data.combustible || 'Gasolina');
      setCilindrajeValue(data.cilindraje || '');
      setImagenUrlValue(data.imagenUrl || null);

      // Crear objeto con los datos formateados para el formulario
      const datosFormateados = {
        ...data,
        fechaIngreso: data.fechaIngreso ? dayjs(data.fechaIngreso) : dayjs(),
        marcaId: data.marcaId,
        modeloId: data.modeloId,
        generacionId: data.generacionId,
        costoGrua: data.costoGrua || 0,
        comisiones: data.comisiones || 0
      };

      console.log('📋 Datos formateados para el formulario:', datosFormateados);

      // Establecer los valores del formulario después de un delay
      setTimeout(() => {
        form.setFieldsValue(datosFormateados);
        console.log('✏️ Valores establecidos en el formulario');
      }, 1000);
    },
    onError: (error) => {
      console.error('❌ Error al cargar el vehículo:', error);
      message.error('Error al cargar los datos del vehículo: ' + (error.message || 'Error desconocido'));
    }
  });

  // Efecto para establecer valores iniciales en modo creación - CORREGIDO
  useEffect(() => {
    if (!editMode && !modeloId) {
      const defaultValues = {
        estado: 'DISPONIBLE',
        fechaIngreso: dayjs(),
        anio: new Date().getFullYear(),
        costoGrua: 0,
        comisiones: 0
      };

      setEstadoValue('DISPONIBLE');
      setAnioValue(new Date().getFullYear());
      setCostoGruaValue(0);
      setComisionesValue(0);

      // Establecer valores por defecto para los nuevos campos enum
      setTraccionValue('4x2');
      setTransmisionValue('Automatico');
      setCombustibleValue('Gasolina');
      setCilindrajeValue('');

      form.setFieldsValue(defaultValues);
      console.log('🆕 Valores iniciales establecidos para nuevo vehículo');
    }
  }, [form, editMode, modeloId]);

  // Manejar cambios en los valores del formulario
  const handleFormValuesChange = (changedValues, allValues) => {
    console.log('🔄 Cambio en el formulario:', { changedValues, allValues });

    // Si cambia la marca, limpiar modelo y generación
    if ('marcaId' in changedValues) {
      handleMarcaChange(changedValues.marcaId);
    }

    // Si cambia el modelo, limpiar generación SOLO si es diferente al actual
    if ('modeloId' in changedValues && changedValues.modeloId !== modeloId) {
      handleModeloChange(changedValues.modeloId);
    }

    // Si cambia la generación, actualizarla
    if ('generacionId' in changedValues) {
      console.log('🎯 Generación seleccionada:', changedValues.generacionId);
      setSelectedGeneracionId(changedValues.generacionId);
    }
  };

  // Resetear modelos y generaciones cuando cambia la marca
  const handleMarcaChange = (value) => {
    console.log('🏷️ Marca seleccionada:', value);
    setMarcaId(value);
    setModeloId(null);
    setSelectedGeneracionId(null);
    form.setFieldsValue({ modeloId: undefined, generacionId: undefined });
    console.log('🧹 Campos limpiados por cambio de marca');
  };

  // Resetear generaciones cuando cambia el modelo
  const handleModeloChange = (value) => {
    console.log('🚗 Modelo seleccionado:', value);
    setModeloId(value);
    setSelectedGeneracionId(null);
    form.setFieldsValue({ generacionId: undefined });
    console.log('🧹 Campo generación limpiado por cambio de modelo');
  };

  // Función para manejar la edición de un modelo
  const handleEditarModelo = (modelo) => {
    setEditingModeloId(modelo.id);
    setEditingModeloNombre(modelo.nombre);
  };

  // Función para guardar los cambios del modelo editado
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

  // Función para cancelar la edición de un modelo
  const handleCancelarEdicionModelo = () => {
    setEditingModeloId(null);
    setEditingModeloNombre('');
  };

  // Función para manejar la edición de una marca
  const handleEditarMarca = (marca) => {
    setEditingMarcaId(marca.id);
    setEditingMarcaNombre(marca.nombre);
  };

  // Función para guardar los cambios de la marca editada
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

  // Función para cancelar la edición
  const handleCancelarEdicionMarca = () => {
    setEditingMarcaId(null);
    setEditingMarcaNombre('');
  };

  // Función para manejar la creación de una nueva marca
  const handleNuevaMarca = async () => {
    if (!nuevaMarcaNombre.trim()) {
      message.warning('Por favor ingresa el nombre de la marca');
      return;
    }

    try {
      setCreandoMarca(true);
      const response = await createMarcaMutation.mutateAsync({ nombre: nuevaMarcaNombre.trim() });

      // Actualizar el formulario con la nueva marca seleccionada
      if (response?.data?.id) {
        setMarcaId(response.data.id);
        form.setFieldsValue({ marcaId: response.data.id });
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

  // Función para manejar el cambio de generación
  const handleGeneracionChange = (value) => {
    console.log('🔧 Generación seleccionada:', value);
    setSelectedGeneracionId(value);
    form.setFieldsValue({ generacionId: value });
  };

  // Función para manejar la edición de una generación
  const handleEditarGeneracion = (generacion) => {
    setEditingGeneracionId(generacion.id);
    setEditingGeneracionNombre(generacion.nombre);
    setEditingAnioInicio(generacion.anioInicio || new Date().getFullYear());
    setEditingAnioFin(generacion.anioFin || new Date().getFullYear());
  };

  // Función para guardar la edición de una generación
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
      // Usar los años de edición actuales para reconstruir la lista de años
      const anios = [];
      const start = editingAnioInicio || new Date().getFullYear();
      const end = editingAnioFin || new Date().getFullYear();
      for (let i = start; i <= end; i++) {
        anios.push(i);
      }
      setAniosDisponibles(anios);
    }
  };

  // Función para cancelar la edición de una generación
  const handleCancelarEdicionGeneracion = () => {
    setEditingGeneracionId(null);
    setEditingGeneracionNombre('');
    setEditingAnioInicio(new Date().getFullYear());
    setEditingAnioFin(new Date().getFullYear());
  };

  // Función para manejar la creación de un nuevo modelo
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

      // Actualizar la lista de modelos y seleccionar el nuevo modelo
      if (response?.data?.id) {
        setModeloId(response.data.id);
        form.setFieldsValue({ modeloId: response.data.id });
        message.success(`Modelo "${nuevoModeloNombre}" creado exitosamente`);
        setNuevoModeloModal(false);
        setNuevoModeloNombre('');
      }
    } catch (error) {
      console.error('Error al crear el modelo:', error);
      message.error('Error al crear el modelo. Por favor intenta nuevamente.');
    } finally {
      setCreandoModelo(false);
    }
  };

  // Función para manejar la creación de una nueva generación
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

        // Update available years
        const startYear = newGeneration.anioInicio || new Date().getFullYear();
        const endYear = newGeneration.anioFin || new Date().getFullYear();
        const anios = [];
        for (let i = startYear; i <= endYear; i++) {
          anios.push(i);
        }
        setAniosDisponibles(anios);

        setNuevaGeneracionModal(false);
        setNuevaGeneracionNombre('');
        setAnioInicio(new Date().getFullYear());
        setAnioFin(new Date().getFullYear());
      }
    } catch (error) {
      console.error('Error al crear la generación:', error);
      message.error('Error al crear la generación. Por favor intenta nuevamente.');
    } finally {
      setCreandoGeneracion(false);
    }
  };

  const createVehiculo = useCreateVehiculo({
    onSuccess: () => {
      // message.success('Vehículo guardado exitosamente');
      // Use a slightly longer timeout and ensure navigation happens after state updates
      setTimeout(() => {
        navigate('/vehiculos', {
          replace: true,
          state: { from: 'create' }  // Optional: for tracking navigation source
        });
      }, 1000);  // Increased from 500ms to 1000ms
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Error al guardar el vehículo';
      console.error('❌ Error al guardar:', error);
      message.error(errorMessage);
    },
    onSettled: () => {
      // Ensure this runs after navigation
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1500);
    }
  });

  const updateVehiculo = useUpdateVehiculo({
    onSuccess: () => {
      // message.success('Vehículo actualizado exitosamente');
      // Usar window.location para asegurar la recarga completa de la página
      window.location.href = '/vehiculos';
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Error al actualizar el vehículo';
      console.error('❌ Error al actualizar:', error);
      message.error(errorMessage);
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  // Reglas de validación para los campos del formulario
  const formRules = {
    marcaId: [
      { required: true, message: 'Por favor seleccione una marca' }
    ],
    modeloId: [
      { required: true, message: 'Por favor seleccione un modelo' }
    ],
    generacionId: [
      { required: true, message: 'Por favor seleccione una generación' }
    ],
    precioCompra: [
      { required: true, message: 'Por favor ingrese el precio de compra' }
    ],
    fechaIngreso: [
      { required: true, message: 'Por favor seleccione la fecha de ingreso' }
    ]
  };

  const onFinish = async (values) => {
    console.log('🚀 === INICIANDO ENVÍO DEL FORMULARIO ===');
    setIsSubmitting(true);

    try {
      // Usar valores del estado como respaldo para los campos del formulario - ACTUALIZADO
      const formData = {
        ...values,
        anio: values.anio ? parseInt(values.anio) : parseInt(anioValue || new Date().getFullYear()),
        estado: values.estado || estadoValue || 'DISPONIBLE',
        notas: values.notas || notasValue || null,
        precioCompra: values.precioCompra ? parseFloat(values.precioCompra) : parseFloat(precioCompraValue || 0),
        costoGrua: values.costoGrua ? parseFloat(values.costoGrua) : parseFloat(costoGruaValue || 0),
        comisiones: values.comisiones ? parseFloat(values.comisiones) : parseFloat(comisionesValue || 0),
        generacionId: values.generacionId ? parseInt(values.generacionId) : parseInt(selectedGeneracionId || 0),
        marcaId: values.marcaId ? parseInt(values.marcaId) : parseInt(marcaId || 0),
        modeloId: values.modeloId ? parseInt(values.modeloId) : parseInt(modeloId || 0),
        // Formatear la fecha correctamente
        fechaIngreso: values.fechaIngreso ? values.fechaIngreso.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')
      };

      console.log('📝 Datos del formulario (combinados con estado):', formData);
      console.log('💰 Valores financieros específicos:', {
        precioCompra: formData.precioCompra,
        costoGrua: formData.costoGrua,
        comisiones: formData.comisiones
      });

      // Validar que se haya seleccionado una generación
      if (!formData.generacionId || isNaN(formData.generacionId) || formData.generacionId <= 0) {
        const errorMsg = 'Debe seleccionar una generación válida';
        console.error('❌', errorMsg);
        message.error(errorMsg);
        setIsSubmitting(false);
        return;
      }

      // Validar año
      if (!formData.anio || isNaN(formData.anio) || formData.anio < 1900 || formData.anio > new Date().getFullYear() + 1) {
        const errorMsg = `El año debe estar entre 1900 y ${new Date().getFullYear() + 1}`;
        console.error('❌', errorMsg);
        message.error(errorMsg);
        setIsSubmitting(false);
        return;
      }

      // Validar precio de compra
      if (formData.precioCompra === undefined || formData.precioCompra === null || isNaN(formData.precioCompra) || formData.precioCompra <= 0) {
        const errorMsg = 'El precio de compra es requerido y debe ser mayor a 0';
        console.error('❌', errorMsg);
        message.error(errorMsg);
        setIsSubmitting(false);
        return;
      }

      // Buscar la generación seleccionada para verificar que existe
      const generacionSeleccionada = generaciones.find(g => g.id === formData.generacionId);

      if (!generacionSeleccionada) {
        const errorMsg = 'La generación seleccionada no es válida';
        console.error('❌', errorMsg, 'ID:', formData.generacionId);
        console.error('🏗️ Generaciones disponibles:', generaciones.map(g => ({ id: g.id, nombre: g.nombre })));
        message.error(errorMsg);
        setIsSubmitting(false);
        return;
      }

      console.log('✅ Generación encontrada:', generacionSeleccionada);

      // Preparar los datos para enviar al backend
      const vehiculoData = {
        generacionId: formData.generacionId,
        anio: formData.anio,
        precioCompra: formData.precioCompra,
        costoGrua: formData.costoGrua,
        comisiones: formData.comisiones,
        fechaIngreso: formData.fechaIngreso,
        estado: formData.estado,
        notas: formData.notas,
        // Agregar los nuevos campos enum
        traccion: traccionValue,
        transmision: transmisionValue,
        combustible: combustibleValue,
        cilindraje: formData.cilindraje || cilindrajeValue || null,
        imagenUrl: formData.imagenUrl || imagenUrlValue || null
      };

      console.log('📤 Datos finales a enviar:', vehiculoData);

      // Validar estructura antes de enviar
      const requiredFields = ['generacionId', 'anio', 'precioCompra', 'fechaIngreso', 'estado', 'traccion', 'transmision', 'combustible'];
      const missingFields = requiredFields.filter(field =>
        vehiculoData[field] === null || vehiculoData[field] === undefined
      );

      if (missingFields.length > 0) {
        const errorMsg = `Faltan campos requeridos: ${missingFields.join(', ')}`;
        console.error('❌', errorMsg);
        message.error(errorMsg);
        setIsSubmitting(false);
        return;
      }

      console.log('✅ Todos los campos requeridos están presentes');

      // Llamar a la API para crear o actualizar el vehículo
      if (editMode && id) {
        console.log('🔄 Actualizando vehículo existente...');
        await updateVehiculo.mutateAsync({ id, ...vehiculoData });
      } else {
        console.log('🆕 Creando nuevo vehículo...');
        console.log('📤 Datos que se enviarán:', vehiculoData);
        await createVehiculo.mutateAsync(vehiculoData);
      }
    } catch (error) {
      console.error('❌ Error al procesar el formulario:', error);

      // Manejo detallado de errores
      let errorMessage = 'Error al procesar el formulario';

      if (error.response) {
        // El servidor respondió con un código de estado fuera del rango 2xx
        if (error.response.data) {
          if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.data.error) {
            errorMessage = error.response.data.error;
          } else if (error.response.status === 400) {
            errorMessage = 'Datos inválidos. Por favor verifique la información ingresada.';
          } else if (error.response.status === 401 || error.response.status === 403) {
            errorMessage = 'No tiene permisos para realizar esta acción';
          } else if (error.response.status === 404) {
            errorMessage = 'Recurso no encontrado';
          } else if (error.response.status >= 500) {
            errorMessage = 'Error en el servidor. Por favor intente más tarde.';
          }
        }
      } else if (error.request) {
        // La solicitud fue hecha pero no se recibió respuesta
        errorMessage = 'No se recibió respuesta del servidor. Verifique su conexión a internet.';
      } else if (error.message) {
        // Algo sucedió en la configuración de la solicitud
        errorMessage = error.message;
      }

      console.error('📌 Detalles del error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
        request: error.request
      });

      message.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleNext = async () => {
    try {
      console.log('🔄 Iniciando proceso de siguiente paso...');

      // PASO 1: Obtener valores actuales del formulario
      const currentValues = form.getFieldsValue();
      console.log('📋 Valores actuales en formulario:', currentValues);

      // PASO 2: Forzar que se mantengan los valores en el formulario
      let paso1Values = {};
      if (currentStep === 0) {
        console.log('💾 Guardando valores del paso 1...');

        // Usar valores de estado como respaldo
        paso1Values = {
          marcaId: currentValues.marcaId || marcaId,
          modeloId: currentValues.modeloId || modeloId,
          generacionId: currentValues.generacionId || selectedGeneracionId,
          anio: currentValues.anio || anioValue,
          estado: currentValues.estado || estadoValue,
          notas: currentValues.notas || notasValue
        };

        console.log('📝 Valores a persistir:', paso1Values);

        // Forzar que los valores se mantengan en el formulario
        Object.keys(paso1Values).forEach(key => {
          if (paso1Values[key]) {
            form.setFieldsValue({ [key]: paso1Values[key] });
          }
        });

        console.log('✅ Valores forzados en el formulario');
      }

      // Verificar que se guardaron correctamente
      const valoresVerificacion = form.getFieldsValue();
      console.log('✅ Verificación post-guardado:', valoresVerificacion);

      // Validaciones manuales críticas (solo si estamos en el paso 1)
      if (currentStep === 0 && paso1Values) {
        if (!paso1Values.anio) {
          message.error('Por favor ingrese el año del vehículo antes de continuar');
          return;
        }

        if (!paso1Values.generacionId) {
          message.error('Por favor seleccione una generación antes de continuar');
          return;
        }

        console.log('✅ Validaciones manuales pasaron correctamente');
      }

      // PASO 3: Validar campos usando Ant Design
      let fieldsToValidate = [];

      if (currentStep === 0) {
        fieldsToValidate = ['marcaId', 'modeloId', 'generacionId', 'anio', 'estado'];
      } else if (currentStep === 1) {
        fieldsToValidate = ['precioCompra', 'fechaIngreso'];
      }

      console.log('🔍 Validando campos con Ant Design:', fieldsToValidate);

      try {
        const validatedValues = await form.validateFields(fieldsToValidate);
        console.log('✅ Validación Ant Design exitosa:', validatedValues);

        // Verificación final específica para el año
        if (currentStep === 0 && !validatedValues.anio) {
          throw new Error('El año no está presente después de la validación');
        }

      } catch (validationError) {
        console.error('❌ Error en validación Ant Design:', validationError);

        if (validationError.errorFields && validationError.errorFields.length > 0) {
          const errorMessages = validationError.errorFields.map(field =>
            `${field.name[0]}: ${field.errors[0]}`
          );
          message.error(`Faltan campos: ${errorMessages.join(', ')}`);
        } else {
          message.error('Por favor complete todos los campos requeridos');
        }
        return;
      }

      // PASO 4: Avanzar al siguiente paso
      console.log('🎉 Todo validado correctamente, avanzando al paso:', currentStep + 1);
      setCurrentStep(currentStep + 1);

    } catch (error) {
      console.error('❌ Error general en handleNext:', error);
      message.error('Error inesperado: ' + error.message);
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const steps = [
    {
      title: 'Información Básica',
      content: (
        <>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                label="Marca"
                name="marcaId"
                rules={formRules.marcaId}
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
                  dropdownRender={(menu) => {
                    return (
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
                    );
                  }}
                >
                  {marcas.map((marca) => (
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
                  {nuevaMarcaModal && (
                    <Option className="add-new-option" value="" style={{ display: 'none' }}>
                      {nuevaMarcaNombre}
                    </Option>
                  )}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Modelo"
                name="modeloId"
                rules={formRules.modeloId}
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
                  dropdownRender={(menu) => {
                    return (
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
                    );
                  }}
                >
                  {modelos.map((modelo) => (
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
                  {nuevoModeloModal && (
                    <Option className="add-new-option" value="" style={{ display: 'none' }}>
                      {nuevoModeloNombre}
                    </Option>
                  )}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Generación"
                name="generacionId"
                rules={formRules.generacionId}
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
                  {generaciones.map((generacion) => {
                    const startYear = generacion.anioInicio || new Date().getFullYear();
                    const endYear = generacion.anioFin || new Date().getFullYear();
                    const displayText = `${generacion.nombre} (${startYear}-${endYear})`;

                    return (
                      <Option key={generacion.id} value={generacion.id} label={displayText}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          {editingGeneracionId === generacion.id ? (
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
                                  handleEditarGeneracion(generacion);
                                }}
                                size="small"
                              />
                            </>
                          )}
                        </div>
                      </Option>
                    );
                  })}
                  {nuevaGeneracionModal && (
                    <Option className="add-new-option" value="" style={{ display: 'none' }}>
                      {nuevaGeneracionNombre} ({anioInicio} - {anioFin})
                    </Option>
                  )}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="anio"
                label="Año"
                rules={[
                  { required: true, message: 'Por favor seleccione el año' }
                ]}
                preserve={true}
              >
                <Select
                  showSearch
                  style={{ width: '100%' }}
                  placeholder={aniosDisponibles.length > 0 ? "Seleccione el año" : "Seleccione una generación primero"}
                  optionFilterProp="children"
                  value={anioValue}
                  disabled={!selectedGeneracionId || aniosDisponibles.length === 0}
                  onChange={(value) => {
                    console.log('📅 Año seleccionado:', value, 'Tipo:', typeof value);
                    setAnioValue(value);
                    form.setFieldsValue({ anio: value });
                  }}
                  filterOption={(input, option) =>
                    option.children.toString().toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {aniosDisponibles.map(anio => (
                    <Option key={anio} value={anio}>
                      {anio}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="estado"
                label="Estado del vehículo"
                rules={[{ required: true, message: 'Por favor selecciona el estado del vehículo' }]}
                preserve={true}
              >
                <Select
                  placeholder="Selecciona el estado"
                  style={{ width: '100%' }}
                  value={estadoValue}
                  onChange={(value) => {
                    console.log('📋 Estado cambiado:', value);
                    setEstadoValue(value);
                    form.setFieldsValue({ estado: value });
                  }}
                >
                  <Option value="DISPONIBLE">Disponible</Option>
                  <Option value="REPARACION">En reparación</Option>
                  <Option value="DESARMADO">Desarmado</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="traccion"
                label="Tracción"
                preserve={true}
                rules={[{ required: true, message: 'Por favor seleccione la tracción' }]}
              >
                <Select
                  placeholder="Selecciona la tracción"
                  style={{ width: '100%' }}
                  value={traccionValue}
                  onChange={(value) => {
                    console.log('🚗 Tracción cambiada:', value);
                    setTraccionValue(value);
                    form.setFieldsValue({ traccion: value });
                  }}
                >
                  {TRACCION_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="transmision"
                label="Transmisión"
                preserve={true}
                rules={[{ required: true, message: 'Por favor seleccione la transmisión' }]}
              >
                <Select
                  placeholder="Selecciona la transmisión"
                  style={{ width: '100%' }}
                  value={transmisionValue}
                  onChange={(value) => {
                    console.log('⚙️ Transmisión cambiada:', value);
                    setTransmisionValue(value);
                    form.setFieldsValue({ transmision: value });
                  }}
                >
                  {TRANSMISION_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="combustible"
                label="Combustible"
                preserve={true}
                rules={[{ required: true, message: 'Por favor seleccione el combustible' }]}
              >
                <Select
                  placeholder="Selecciona el tipo de combustible"
                  style={{ width: '100%' }}
                  value={combustibleValue}
                  onChange={(value) => {
                    console.log('⛽ Combustible cambiado:', value);
                    setCombustibleValue(value);
                    form.setFieldsValue({ combustible: value });
                  }}
                >
                  {COMBUSTIBLE_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="cilindraje"
                label="Cilindraje"
                rules={[
                  { max: 200, message: 'El cilindraje no puede exceder 200 caracteres' }
                ]}
                preserve={true}
              >
                <Input
                  placeholder="Ej: 1.8L, 1600cc, V6 3.5L, Eléctrico"
                  maxLength={200}
                  value={cilindrajeValue}
                  onChange={(e) => {
                    setCilindrajeValue(e.target.value);
                    form.setFieldsValue({ cilindraje: e.target.value });
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item
                name="notas"
                label="Notas"
                preserve={true}
              >
                <TextArea
                  rows={4}
                  placeholder="Ingresa notas adicionales sobre el vehículo"
                  maxLength={500}
                  showCount
                  value={notasValue}
                  onChange={(e) => {
                    console.log('📝 Notas cambiadas:', e.target.value);
                    setNotasValue(e.target.value);
                    form.setFieldsValue({ notas: e.target.value });
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
        </>
      ),
    },
    {
      title: 'Información Financiera',
      content: (
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="precioCompra"
              label={<span style={{ color: '#cf1322' }}>Precio de compra</span>}
              rules={formRules.precioCompra}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={1000}
                formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/[₡\s,]/g, '')}
                precision={2}
                placeholder="0.00"
                value={precioCompraValue}
                onChange={(value) => {
                  console.log('💰 Precio de compra cambiado:', value, 'Tipo:', typeof value);
                  setPrecioCompraValue(value);
                  form.setFieldsValue({ precioCompra: value });
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="costoGrua"
              label={<span style={{ color: '#cf1322' }}>Costo de grúa (Opcional)</span>}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={100}
                formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/[₡\s,]/g, '')}
                precision={2}
                placeholder="0.00"
                value={costoGruaValue}
                onChange={(value) => {
                  console.log('🚛 Costo grúa cambiado:', value, 'Tipo:', typeof value);
                  setCostoGruaValue(value || 0);
                  form.setFieldsValue({ costoGrua: value || 0 });
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="comisiones"
              label={<span style={{ color: '#cf1322' }}>Comisiones (Opcional)</span>}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={100}
                formatter={value => `₡ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/[₡\s,]/g, '')}
                precision={2}
                placeholder="0.00"
                value={comisionesValue}
                onChange={(value) => {
                  console.log('💼 Comisiones cambiadas:', value, 'Tipo:', typeof value);
                  setComisionesValue(value || 0);
                  form.setFieldsValue({ comisiones: value || 0 });
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="fechaIngreso"
              label="Fecha de ingreso"
              rules={formRules.fechaIngreso}
            >
              <DatePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                disabledDate={(current) => {
                  return current && current > dayjs().endOf('day');
                }}
              />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      title: 'Imágenes',
      content: (
        <div>
          <Form.Item label="Foto del vehículo (Subir o URL)">
            <Space direction="vertical" style={{ width: '100%', maxWidth: '400px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Upload
                  name="file"
                  action="http://localhost:8080/api/upload/vehiculo"
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
                  onChange={(e) => setImagenUrlValue(e.target.value)}
                />
              </Form.Item>
            </Space>
          </Form.Item>
        </div>
      ),
    },
    {
      title: 'Confirmar',
    },
  ];

  // Mostrar loading solo cuando sea necesario
  const isLoading = isLoadingMarcas || (editMode && isLoadingVehiculo);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* ── Header de navegación ─────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/vehiculos')}
          style={{ color: '#595959', fontWeight: 500 }}
          disabled={isSubmitting}
        >
          Volver al listado
        </Button>
        <Title level={3} style={{ margin: 0, fontWeight: 600 }}>
          {editMode ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}
        </Title>
        <div style={{ width: '136px' }}></div> {/* Spacer para centrar el título */}
      </div>

      <Card
        bordered={false}
        style={{ borderRadius: '12px', border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
        bodyStyle={{ padding: '32px' }}
      >
        <Steps current={currentStep} style={{ marginBottom: '32px', maxWidth: '800px', margin: '0 auto 32px' }}>
          {steps.map(item => (
            <Step key={item.title} title={item.title} />
          ))}
        </Steps>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          onValuesChange={handleFormValuesChange}
          autoComplete="off"
        >
          <div style={{ minHeight: '300px' }}>
            {/* Resumen Detallado del Vehículo */}
            {currentStep === 3 && (
              <Card bordered={false} style={{ borderRadius: '10px', border: '1px solid #f0f0f0', marginBottom: '24px' }}>
                {/* ── Identificación ── */}
                <Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Identificación
                </Text>
                <Divider style={{ marginTop: '8px', marginBottom: '16px' }} />
                <Row gutter={[24, 16]}>
                  <Col xs={12} sm={8} md={6}>
                    <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Marca</Text>
                    <Text strong style={{ fontSize: '15px' }}>{marcas.find(m => m.id === parseInt(marcaId || 0))?.nombre || '—'}</Text>
                  </Col>
                  <Col xs={12} sm={8} md={6}>
                    <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Modelo</Text>
                    <Text strong style={{ fontSize: '15px' }}>{modelos.find(m => m.id === parseInt(modeloId || 0))?.nombre || '—'}</Text>
                  </Col>
                  <Col xs={12} sm={8} md={6}>
                    <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Generación</Text>
                    <Text strong>{generaciones.find(g => g.id === parseInt(selectedGeneracionId || 0))?.nombre || '—'}</Text>
                  </Col>
                  <Col xs={12} sm={8} md={6}>
                    <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Año</Text>
                    <Text strong style={{ color: '#1890ff', fontSize: '15px' }}>{anioValue || new Date().getFullYear()}</Text>
                  </Col>
                </Row>

                {/* ── Especificaciones Técnicas ── */}
                <Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginTop: '24px' }}>
                  Especificaciones Técnicas
                </Text>
                <Divider style={{ marginTop: '8px', marginBottom: '16px' }} />
                <Row gutter={[24, 16]}>
                  <Col xs={12} sm={8} md={6}>
                    <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Transmisión</Text>
                    <Tag color="blue">{transmisionValue || 'N/E'}</Tag>
                  </Col>
                  <Col xs={12} sm={8} md={6}>
                    <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Tracción</Text>
                    <Tag color="green">{traccionValue || 'N/E'}</Tag>
                  </Col>
                  <Col xs={12} sm={8} md={6}>
                    <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Combustible</Text>
                    <Tag color="orange">{combustibleValue || 'N/E'}</Tag>
                  </Col>
                  <Col xs={12} sm={8} md={6}>
                    <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Cilindraje</Text>
                    <Tag color="purple">{cilindrajeValue || 'N/E'}</Tag>
                  </Col>
                </Row>

                {/* ── Información Financiera ── */}
                <Text strong style={{ color: '#cf1322', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginTop: '24px' }}>
                  Información Financiera
                </Text>
                <Divider style={{ marginTop: '8px', marginBottom: '16px', borderColor: '#cf1322' }} />
                <Row gutter={[24, 16]}>
                  <Col xs={12} sm={8} md={8}>
                    <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Precio de Compra</Text>
                    <Text strong style={{ color: '#cf1322', fontSize: '15px' }}>
                      {precioCompraValue ? `₡ ${parseFloat(precioCompraValue || 0).toLocaleString('es-CR', { minimumFractionDigits: 2 })}` : '₡ 0.00'}
                    </Text>
                  </Col>
                  <Col xs={12} sm={8} md={8}>
                    <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Costo de Grúa</Text>
                    <Text>{costoGruaValue ? `₡ ${parseFloat(costoGruaValue || 0).toLocaleString('es-CR', { minimumFractionDigits: 2 })}` : '₡ 0.00'}</Text>
                  </Col>
                  <Col xs={12} sm={8} md={8}>
                    <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Comisiones</Text>
                    <Text>{comisionesValue ? `₡ ${parseFloat(comisionesValue || 0).toLocaleString('es-CR', { minimumFractionDigits: 2 })}` : '₡ 0.00'}</Text>
                  </Col>
                </Row>

                <div style={{ marginTop: '24px', padding: '16px', background: '#fafafa', borderRadius: '8px', border: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary" strong>Inversión Total Estimada</Text>
                  <Text strong style={{ color: '#cf1322', fontSize: '20px' }}>
                    ₡ {parseFloat((precioCompraValue || 0) + (costoGruaValue || 0) + (comisionesValue || 0)).toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                  </Text>
                </div>
              </Card>
            )}

            {steps[currentStep].content}
          </div>

          <div style={{ marginTop: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                {currentStep > 0 && (
                  <Button
                    onClick={handlePrev}
                    disabled={isSubmitting}
                  >
                    Anterior
                  </Button>
                )}
              </div>
              <div>
                {currentStep < steps.length - 1 && (
                  <Button
                    type="primary"
                    onClick={handleNext}
                    disabled={isSubmitting}
                  >
                    Siguiente
                  </Button>
                )}
                {currentStep === steps.length - 1 && (
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={isSubmitting}
                  >
                    {editMode ? 'Actualizar' : 'Guardar'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default NuevoVehiculo;
