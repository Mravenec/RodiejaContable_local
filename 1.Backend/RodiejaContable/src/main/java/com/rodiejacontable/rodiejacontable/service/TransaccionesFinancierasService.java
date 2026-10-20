package com.rodiejacontable.rodiejacontable.service;

import com.rodiejacontable.database.jooq.enums.TransaccionesFinancierasEstado;
import com.rodiejacontable.database.jooq.enums.TiposTransaccionesCategoria;
import com.rodiejacontable.database.jooq.tables.pojos.TiposTransacciones;
import com.rodiejacontable.database.jooq.tables.pojos.TransaccionesFinancieras;
import com.rodiejacontable.rodiejacontable.exception.ResourceAlreadyExistsException;
import com.rodiejacontable.rodiejacontable.exception.ResourceNotFoundException;
import com.rodiejacontable.rodiejacontable.repository.TiposTransaccionesRepository;
import com.rodiejacontable.rodiejacontable.repository.TransaccionesFinancierasRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.rodiejacontable.database.jooq.tables.pojos.InventarioRepuestos;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.time.format.TextStyle;
import java.util.Locale;
import java.util.Map;
import java.util.HashMap;

@Service
public class TransaccionesFinancierasService {

    @Autowired
    private TransaccionesFinancierasRepository transaccionesRepository;
    
    @Autowired
    private TiposTransaccionesRepository tiposTransaccionesRepository;
    
    @Autowired
    private InventarioRepuestosService inventarioRepuestosService;
    
    @Autowired
    private VehiculosService vehiculosService;
    
    public List<TransaccionesFinancieras> findAll() {
        return transaccionesRepository.findAll();
    }
    
    public List<TransaccionesFinancieras> findByFechaBetween(LocalDate fechaInicio, LocalDate fechaFin) {
        return transaccionesRepository.findByFechaBetween(fechaInicio, fechaFin);
    }
    
    public List<TransaccionesFinancieras> findByTipoTransaccionId(Integer tipoTransaccionId) {
        // Verificar que el tipo de transacción existe
        tiposTransaccionesRepository.findById(tipoTransaccionId)
            .orElseThrow(() -> new ResourceNotFoundException("Tipo de transacción no encontrado con ID: " + tipoTransaccionId));
            
        return transaccionesRepository.findByTipoTransaccionId(tipoTransaccionId);
    }
    
    public List<TransaccionesFinancieras> findByVehiculoId(Integer vehiculoId) {
        return transaccionesRepository.findByVehiculoId(vehiculoId);
    }
    
    public List<TransaccionesFinancieras> findByEmpleadoId(Integer empleadoId) {
        return transaccionesRepository.findByEmpleadoId(empleadoId);
    }
    
    public TransaccionesFinancieras findById(Integer id) {
        return transaccionesRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transacción financiera no encontrada con ID: " + id));
    }
    
    @Transactional
    public TransaccionesFinancieras create(TransaccionesFinancieras transaccion) {
        // Validar que el código de transacción sea único
        if (transaccionesRepository.existsByCodigoTransaccion(transaccion.getCodigoTransaccion())) {
            throw new ResourceAlreadyExistsException("Ya existe una transacción con el código: " + transaccion.getCodigoTransaccion());
        }
        
        // Validar que el tipo de transacción existe
        TiposTransacciones tipoTransaccion = tiposTransaccionesRepository.findById(transaccion.getTipoTransaccionId())
            .orElseThrow(() -> new ResourceNotFoundException("Tipo de transacción no encontrado con ID: " + transaccion.getTipoTransaccionId()));
        
        // Asignar referencia automáticamente si está vacía
        if (transaccion.getReferencia() == null || transaccion.getReferencia().trim().isEmpty()) {
            String categoria = tipoTransaccion.getCategoria().name(); // INGRESO / EGRESO
            int count = transaccionesRepository.countByTipoTransaccionId(tipoTransaccion.getId()) + 1;
            
            // Limpiar el nombre para la referencia (ej: "Venta Repuesto" -> "VENTA_REPUESTO")
            String nombreLimpio = tipoTransaccion.getNombre()
                .toUpperCase()
                .replaceAll("[^A-Z0-9]", "_");
            if (nombreLimpio.length() > 15) {
                nombreLimpio = nombreLimpio.substring(0, 15);
            }
            
            String prefix = "INGRESO".equals(categoria) ? "MAN-ING" : "MAN-EGR";
            String consecutivo = String.format("%04d", count);
            
            transaccion.setReferencia(prefix + "-" + nombreLimpio + "-" + consecutivo);
        }
        
        // Establecer valores por defecto
        if (transaccion.getFecha() == null) {
            transaccion.setFecha(LocalDate.now());
        }
        
        // Los campos dia, mes y anio son generados automáticamente por la base de datos
        // basados en el campo fecha, por lo que no los establecemos manualmente
        
        if (transaccion.getEstado() == null) {
            transaccion.setEstado(TransaccionesFinancierasEstado.PENDIENTE);
        }
        
        if (transaccion.getActivo() == null) {
            transaccion.setActivo((byte) 1);
        }
        
        LocalDateTime now = LocalDateTime.now();
        if (transaccion.getFechaCreacion() == null) {
            transaccion.setFechaCreacion(now);
        }
        transaccion.setFechaActualizacion(now);
        
        TransaccionesFinancieras saved = transaccionesRepository.save(transaccion);
        
        // Manejo de stock de repuestos si aplica
        if (saved.getRepuestoId() != null && saved.getCantidadRepuesto() != null && saved.getCantidadRepuesto() > 0) {
            InventarioRepuestos repuesto = inventarioRepuestosService.obtenerPorId(saved.getRepuestoId())
                .orElse(null);
                 if (repuesto != null) {
                  int currentStock = repuesto.getCantidad() != null ? repuesto.getCantidad().intValue() : 0;
                  InventarioRepuestos repuestoUpdate = new InventarioRepuestos();

                  if (tipoTransaccion.getCategoria() == TiposTransaccionesCategoria.INGRESO) {
                      // Venta (Ingreso de dinero), disminuimos stock
                      repuestoUpdate.setCantidad(org.jooq.types.UInteger.valueOf(Math.max(0, currentStock - saved.getCantidadRepuesto().intValue())));
                      inventarioRepuestosService.actualizarRepuesto(repuesto.getId(), repuestoUpdate);

                      if (repuesto.getVehiculoOrigenId() != null && saved.getMonto() != null) {
                          try {
                              com.rodiejacontable.database.jooq.tables.pojos.Vehiculos v = vehiculosService.findById(repuesto.getVehiculoOrigenId());
                              BigDecimal actual = v.getCostoRecuperado() != null ? v.getCostoRecuperado() : BigDecimal.ZERO;
                              vehiculosService.actualizarCostoRecuperado(v.getId(), actual.add(saved.getMonto()));
                          } catch (Exception e) {
                              // Ignorar si el vehículo ya no existe
                          }
                      }
                  } else if (tipoTransaccion.getCategoria() == TiposTransaccionesCategoria.EGRESO) {
                      // Compra/Reembolso (Egreso de dinero), aumentamos stock
                      repuestoUpdate.setCantidad(org.jooq.types.UInteger.valueOf(currentStock + saved.getCantidadRepuesto().intValue()));
                      inventarioRepuestosService.actualizarRepuesto(repuesto.getId(), repuestoUpdate);
                    
                    if (repuesto.getVehiculoOrigenId() != null && saved.getMonto() != null) {
                        try {
                            com.rodiejacontable.database.jooq.tables.pojos.Vehiculos v = vehiculosService.findById(repuesto.getVehiculoOrigenId());
                            BigDecimal actual = v.getCostoRecuperado() != null ? v.getCostoRecuperado() : BigDecimal.ZERO;
                            vehiculosService.actualizarCostoRecuperado(v.getId(), actual.subtract(saved.getMonto()));
                        } catch (Exception e) {
                            // Ignorar si el vehículo ya no existe
                        }
                    }
                }
            }
        }
        
        return saved;
    }
    
    @Transactional
    public TransaccionesFinancieras update(Integer id, TransaccionesFinancieras transaccion) {
        // Verificar que la transacción exista
        TransaccionesFinancieras existingTransaccion = findById(id);
        
        // Validar que el código de transacción sea único si se está cambiando
        if (!existingTransaccion.getCodigoTransaccion().equals(transaccion.getCodigoTransaccion()) && 
            transaccionesRepository.existsByCodigoTransaccion(transaccion.getCodigoTransaccion())) {
            throw new ResourceAlreadyExistsException("Ya existe una transacción con el código: " + transaccion.getCodigoTransaccion());
        }
        
        // Validar que el tipo de transacción existe si se está cambiando
        if (!existingTransaccion.getTipoTransaccionId().equals(transaccion.getTipoTransaccionId())) {
            tiposTransaccionesRepository.findById(transaccion.getTipoTransaccionId())
                .orElseThrow(() -> new ResourceNotFoundException("Tipo de transacción no encontrado con ID: " + transaccion.getTipoTransaccionId()));
        }
        
        // Actualizar los campos modificables
        existingTransaccion.setCodigoTransaccion(transaccion.getCodigoTransaccion());
        existingTransaccion.setFecha(transaccion.getFecha() != null ? transaccion.getFecha() : existingTransaccion.getFecha());
        
        // Actualizar la fecha si cambió
        if (transaccion.getFecha() != null) {
            // Si la fecha viene como String del frontend, convertirla a LocalDate
            String className = transaccion.getFecha().getClass().getSimpleName();
            if ("String".equals(className)) {
                try {
                    String fechaStr = transaccion.getFecha().toString();
                    LocalDate fechaParaProcesar = LocalDate.parse(fechaStr);
                    existingTransaccion.setFecha(fechaParaProcesar);
                } catch (Exception e) {
                    System.err.println("Error parseando fecha: " + transaccion.getFecha() + " - " + e.getMessage());
                    // Mantener fecha existente si hay error
                    existingTransaccion.setFecha(existingTransaccion.getFecha());
                }
            } else {
                // Si ya es LocalDate, usarlo directamente
                existingTransaccion.setFecha(transaccion.getFecha());
            }
        }
        // Nota: Los campos dia, mes, anio son columnas generadas en la BD y se actualizan automáticamente
        
        existingTransaccion.setTipoTransaccionId(transaccion.getTipoTransaccionId());
        existingTransaccion.setEmpleadoId(transaccion.getEmpleadoId());
        existingTransaccion.setVehiculoId(transaccion.getVehiculoId());
        existingTransaccion.setRepuestoId(transaccion.getRepuestoId());
        existingTransaccion.setCantidadRepuesto(transaccion.getCantidadRepuesto() != null ? transaccion.getCantidadRepuesto() : existingTransaccion.getCantidadRepuesto());
        existingTransaccion.setGeneracionId(transaccion.getGeneracionId());
        existingTransaccion.setMonto(transaccion.getMonto() != null ? transaccion.getMonto() : existingTransaccion.getMonto());
        existingTransaccion.setComisionEmpleado(transaccion.getComisionEmpleado());
        existingTransaccion.setDescripcion(transaccion.getDescripcion());
        existingTransaccion.setReferencia(transaccion.getReferencia());
        existingTransaccion.setEstado(transaccion.getEstado() != null ? transaccion.getEstado() : existingTransaccion.getEstado());
        existingTransaccion.setActivo(transaccion.getActivo() != null ? transaccion.getActivo() : existingTransaccion.getActivo());
        existingTransaccion.setFechaActualizacion(LocalDateTime.now());
        
        return transaccionesRepository.update(existingTransaccion);
    }
    
    @Transactional
    public void delete(Integer id) {
        // Verificar que la transacción exista
        TransaccionesFinancieras t = findById(id);
        
        // Validar que no sea un reembolso ni haya sido reembolsada ("no se puede deshacer")
        if ((t.getReferencia() != null && t.getReferencia().startsWith("Reembolso ")) ||
            (t.getCodigoTransaccion() != null && t.getCodigoTransaccion().startsWith("REF-"))) {
            throw new IllegalStateException("Un reembolso no se puede deshacer ni eliminar.");
        }
        if (transaccionesRepository.isTransactionRefunded(id)) {
            throw new IllegalStateException("No se puede eliminar una transacción que ya ha sido reembolsada.");
        }
        
        // Eliminar la transacción
        transaccionesRepository.delete(id);
    }
    
    @Transactional
    public void actualizarEstado(Integer id, TransaccionesFinancierasEstado estado) {
        // Verificar que la transacción exista
        findById(id);
        
        // Actualizar el estado
        transaccionesRepository.actualizarEstado(id, estado);
    }
    
    public BigDecimal getTotalMontoByTipoTransaccionAndPeriodo(Integer tipoTransaccionId, LocalDate fechaInicio, LocalDate fechaFin) {
        // Validar que el tipo de transacción existe
        tiposTransaccionesRepository.findById(tipoTransaccionId)
            .orElseThrow(() -> new ResourceNotFoundException("Tipo de transacción no encontrado con ID: " + tipoTransaccionId));
            
        BigDecimal total = transaccionesRepository.getTotalMontoByTipoTransaccionAndPeriodo(tipoTransaccionId, fechaInicio, fechaFin);
        return total != null ? total : BigDecimal.ZERO;
    }
    
    public BigDecimal getTotalMensualByTipoTransaccion(Integer tipoTransaccionId, int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();
        
        return getTotalMontoByTipoTransaccionAndPeriodo(tipoTransaccionId, startDate, endDate);
    }
    
    public Map<String, Object> verificarEstadoReembolso(Integer transaccionId) {
        Map<String, Object> result = new HashMap<>();
        TransaccionesFinancieras t = findById(transaccionId);
        
        boolean esReembolso = (t.getCodigoTransaccion() != null && t.getCodigoTransaccion().startsWith("REF-")) ||
                              (t.getReferencia() != null && t.getReferencia().startsWith("Reembolso ")) ||
                              (t.getDescripcion() != null && t.getDescripcion().toLowerCase().startsWith("reembolso"));
        
        if (!esReembolso && t.getTipoTransaccionId() != null) {
            tiposTransaccionesRepository.findById(t.getTipoTransaccionId()).ifPresent(tipo -> {
                if (tipo.getNombre() != null && tipo.getNombre().toLowerCase().contains("reembolso")) {
                    result.put("esReembolsoTipo", true);
                }
            });
            if (Boolean.TRUE.equals(result.get("esReembolsoTipo"))) {
                esReembolso = true;
            }
        }
        
        boolean yaReembolsada = transaccionesRepository.isTransactionRefunded(transaccionId);
        boolean estadoCompletada = t.getEstado() == TransaccionesFinancierasEstado.COMPLETADA;
        
        boolean puedeReembolsar = estadoCompletada && !esReembolso && !yaReembolsada;
        
        String motivo = "";
        if (!estadoCompletada) {
            motivo = "Solo se pueden reembolsar transacciones completadas.";
        } else if (esReembolso) {
            motivo = "Esta transacción es un reembolso y no se puede deshacer ni reembolsar.";
        } else if (yaReembolsada) {
            motivo = "Esta transacción ya ha sido reembolsada y no se puede reembolsar dos veces.";
        }
        
        result.put("puedeReembolsar", puedeReembolsar);
        result.put("esReembolso", esReembolso);
        result.put("yaReembolsada", yaReembolsada);
        result.put("motivo", motivo);
        return result;
    }

    @Transactional
    public TransaccionesFinancieras reembolsarTransaccion(Integer transaccionId) {
        TransaccionesFinancieras original = findById(transaccionId);
        
        if (original.getEstado() != TransaccionesFinancierasEstado.COMPLETADA) {
            throw new IllegalArgumentException("Solo se pueden reembolsar transacciones completadas.");
        }
        
        // 1. Validar que la transacción no sea un reembolso en sí
        if ((original.getCodigoTransaccion() != null && original.getCodigoTransaccion().startsWith("REF-")) ||
            (original.getReferencia() != null && original.getReferencia().startsWith("Reembolso ")) ||
            (original.getDescripcion() != null && original.getDescripcion().toLowerCase().startsWith("reembolso"))) {
            throw new IllegalStateException("No se puede reembolsar una transacción que ya es un reembolso.");
        }

        // 2. Validar que la transacción no haya sido ya reembolsada previamente ("no se puede reembolsar dos veces")
        if (transaccionesRepository.isTransactionRefunded(transaccionId)) {
            throw new IllegalStateException("Esta transacción ya fue reembolsada y no se puede reembolsar dos veces.");
        }
        
        TiposTransacciones tipoOriginal = tiposTransaccionesRepository.findById(original.getTipoTransaccionId())
                .orElseThrow(() -> new ResourceNotFoundException("Tipo de transacción original no encontrado."));

        if (tipoOriginal.getNombre() != null && tipoOriginal.getNombre().toLowerCase().contains("reembolso")) {
            throw new IllegalStateException("No se puede reembolsar una transacción que ya es de tipo reembolso.");
        }

        // 3. Quitar la comisión de la transacción si tiene empleado asignado o comisión
        if (original.getEmpleadoId() != null || (original.getComisionEmpleado() != null && original.getComisionEmpleado().compareTo(BigDecimal.ZERO) != 0)) {
            original.setComisionEmpleado(BigDecimal.ZERO);
            original.setFechaActualizacion(LocalDateTime.now());
            transaccionesRepository.update(original);
        }

        // 4. Si la transacción correspondía a un vehículo, restablecer su estado a DISPONIBLE
        if (original.getVehiculoId() != null) {
            try {
                vehiculosService.actualizarEstado(original.getVehiculoId(), com.rodiejacontable.database.jooq.enums.VehiculosEstado.DISPONIBLE);
            } catch (Exception e) {
                // Continuar si el vehículo ya no requiere actualización
            }
        }
        
        String nombreReembolso = "Reembolso " + tipoOriginal.getNombre();
        // Limitar a 50 caracteres si es necesario
        if (nombreReembolso.length() > 50) {
            nombreReembolso = nombreReembolso.substring(0, 50);
        }

        TiposTransaccionesCategoria categoriaReembolso = tipoOriginal.getCategoria() == TiposTransaccionesCategoria.INGRESO ? 
                TiposTransaccionesCategoria.EGRESO : TiposTransaccionesCategoria.INGRESO;

        TiposTransacciones tipoReembolso = tiposTransaccionesRepository.findByNombre(nombreReembolso)
                .orElseGet(() -> {
                    TiposTransacciones nuevoTipo = new TiposTransacciones();
                    String nombreG = "Reembolso " + tipoOriginal.getNombre();
                    if (nombreG.length() > 50) nombreG = nombreG.substring(0, 50);
                    nuevoTipo.setNombre(nombreG);
                    
                    String descG = "Reembolso de " + tipoOriginal.getNombre();
                    if (descG.length() > 100) descG = descG.substring(0, 100);
                    nuevoTipo.setDescripcion(descG);
                    
                    nuevoTipo.setCategoria(categoriaReembolso);
                    nuevoTipo.setActivo((byte) 1);
                    return tiposTransaccionesRepository.save(nuevoTipo);
                });
        
        TransaccionesFinancieras reembolso = new TransaccionesFinancieras();
        reembolso.setCodigoTransaccion("REF-" + original.getCodigoTransaccion());
        reembolso.setFecha(LocalDate.now());
        reembolso.setTipoTransaccionId(tipoReembolso.getId());
        reembolso.setEmpleadoId(original.getEmpleadoId());
        reembolso.setVehiculoId(original.getVehiculoId());
        reembolso.setRepuestoId(original.getRepuestoId());
        reembolso.setCantidadRepuesto(original.getCantidadRepuesto());
        reembolso.setGeneracionId(original.getGeneracionId());
        reembolso.setMonto(original.getMonto());
        reembolso.setComisionEmpleado(BigDecimal.ZERO); // La comisión se anula por completo
        reembolso.setDescripcion("Reembolso de: " + (original.getDescripcion() != null ? original.getDescripcion() : tipoOriginal.getNombre()));
        reembolso.setReferencia("Reembolso TR-" + original.getId());
        reembolso.setEstado(TransaccionesFinancierasEstado.COMPLETADA);
        reembolso.setActivo((byte) 1);
        
        LocalDateTime now = LocalDateTime.now();
        reembolso.setFechaCreacion(now);
        reembolso.setFechaActualizacion(now);
        
        return transaccionesRepository.save(reembolso);
    }
    public List<Map<String, Object>> getReporteVentasVehiculosMensual(LocalDate fechaInicio, LocalDate fechaFin, Integer generacionId) {
        List<Map<String, Object>> reportes = transaccionesRepository.getReporteVentasVehiculosMensual(fechaInicio, fechaFin, generacionId);
        
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        
        for (Map<String, Object> roReporte : reportes) {
            Map<String, Object> reporte = new HashMap<>(roReporte);
            
            Object mesObj = reporte.get("mes");
            if (mesObj instanceof Number) {
                int mes = ((Number) mesObj).intValue();
                String nombreMes = java.time.Month.of(mes)
                    .getDisplayName(java.time.format.TextStyle.FULL, new java.util.Locale("es", "ES"));
                // Capitalize first letter
                nombreMes = nombreMes.substring(0, 1).toUpperCase() + nombreMes.substring(1);
                reporte.put("nombreMes", nombreMes);
            }
            
            Number totalVentas = (Number) reporte.get("totalVentas");
            Number totalInversion = (Number) reporte.get("totalInversion");
            Number totalComisiones = (Number) reporte.get("totalComisiones");
            
            double ventas = totalVentas != null ? totalVentas.doubleValue() : 0.0;
            double inversion = totalInversion != null ? totalInversion.doubleValue() : 0.0;
            double comisiones = totalComisiones != null ? totalComisiones.doubleValue() : 0.0;
            
            double gananciaNeta = ventas - inversion - comisiones;
            reporte.put("gananciaNeta", gananciaNeta);
            
            result.add(reporte);
        }
        
        return result;
    }
    
    public List<Map<String, Object>> getReporteVentasRepuestosMensual(LocalDate fechaInicio, LocalDate fechaFin, Integer generacionId) {
        List<Map<String, Object>> reportes = transaccionesRepository.getReporteVentasRepuestosMensual(fechaInicio, fechaFin, generacionId);
        
        // Convert to mutable maps to add properties
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        
        for (Map<String, Object> roReporte : reportes) {
            Map<String, Object> reporte = new HashMap<>(roReporte);
            
            Object mesObj = reporte.get("mes");
            if (mesObj instanceof Number) {
                int mes = ((Number) mesObj).intValue();
                String nombreMes = java.time.Month.of(mes)
                    .getDisplayName(TextStyle.FULL, new Locale("es", "ES"));
                reporte.put("nombreMes", nombreMes.toUpperCase());
            }
            
            Object ventasObj = reporte.get("totalVentas");
            Object costosObj = reporte.get("totalCostos");
            Object comisionesObj = reporte.get("totalComisiones");
            
            BigDecimal ventas = ventasObj instanceof BigDecimal ? (BigDecimal) ventasObj : BigDecimal.ZERO;
            BigDecimal costos = costosObj instanceof BigDecimal ? (BigDecimal) costosObj : BigDecimal.ZERO;
            BigDecimal comisiones = comisionesObj instanceof BigDecimal ? (BigDecimal) comisionesObj : BigDecimal.ZERO;
            
            reporte.put("gananciaNeta", ventas.subtract(costos).subtract(comisiones));
            
            result.add(reporte);
        }
        
        return result;
    }
}
