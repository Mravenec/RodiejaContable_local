package com.rodiejacontable.rodiejacontable.service;

import com.rodiejacontable.database.jooq.enums.TransaccionesFinancierasEstado;
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
        tiposTransaccionesRepository.findById(transaccion.getTipoTransaccionId())
            .orElseThrow(() -> new ResourceNotFoundException("Tipo de transacción no encontrado con ID: " + transaccion.getTipoTransaccionId()));
        
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
}
