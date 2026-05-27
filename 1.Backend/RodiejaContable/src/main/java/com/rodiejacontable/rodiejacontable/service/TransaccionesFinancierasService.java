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
        
        return transaccionesRepository.save(transaccion);
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
        findById(id);
        
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
    
    @Transactional
    public TransaccionesFinancieras reembolsarTransaccion(Integer transaccionId) {
        TransaccionesFinancieras original = findById(transaccionId);
        
        if (original.getEstado() != TransaccionesFinancierasEstado.COMPLETADA) {
            throw new IllegalArgumentException("Solo se pueden reembolsar transacciones completadas.");
        }
        
        TiposTransacciones tipoVenta = tiposTransaccionesRepository.findById(original.getTipoTransaccionId())
                .orElseThrow(() -> new ResourceNotFoundException("Tipo de transacción original no encontrado."));
        if (tipoVenta.getCategoria() != TiposTransaccionesCategoria.INGRESO) {
            throw new IllegalArgumentException("Solo se pueden reembolsar transacciones de tipo INGRESO.");
        }
        
        String nombreReembolso = "Reembolso " + tipoVenta.getNombre();
        // Limitar a 50 caracteres si es necesario (asumiendo que el campo nombre tiene límite)
        if (nombreReembolso.length() > 50) {
            nombreReembolso = nombreReembolso.substring(0, 50);
        }

        TiposTransacciones tipoReembolso = tiposTransaccionesRepository.findByNombre(nombreReembolso)
                .orElseGet(() -> {
                    TiposTransacciones nuevoTipo = new TiposTransacciones();
                    String nombreG = "Reembolso " + tipoVenta.getNombre();
                    if (nombreG.length() > 50) nombreG = nombreG.substring(0, 50);
                    nuevoTipo.setNombre(nombreG);
                    
                    String descG = "Egreso por reembolso de " + tipoVenta.getNombre();
                    if (descG.length() > 100) descG = descG.substring(0, 100);
                    nuevoTipo.setDescripcion(descG);
                    
                    nuevoTipo.setCategoria(TiposTransaccionesCategoria.EGRESO);
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
        reembolso.setGeneracionId(original.getGeneracionId());
        reembolso.setMonto(original.getMonto());
        reembolso.setComisionEmpleado(original.getComisionEmpleado() != null ? original.getComisionEmpleado().negate() : BigDecimal.ZERO);
        reembolso.setDescripcion("Reembolso de: " + (original.getDescripcion() != null ? original.getDescripcion() : tipoVenta.getNombre()));
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
