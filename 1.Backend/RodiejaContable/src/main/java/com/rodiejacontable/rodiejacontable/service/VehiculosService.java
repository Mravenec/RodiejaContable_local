package com.rodiejacontable.rodiejacontable.service;

import com.rodiejacontable.database.jooq.enums.VehiculosEstado;
import com.rodiejacontable.database.jooq.tables.pojos.Vehiculos;
import com.rodiejacontable.rodiejacontable.exception.ResourceAlreadyExistsException;
import com.rodiejacontable.rodiejacontable.exception.ResourceNotFoundException;
import com.rodiejacontable.rodiejacontable.repository.GeneracionesRepository;
import com.rodiejacontable.rodiejacontable.repository.VehiculosRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.cache.annotation.Cacheable;

@Service
public class VehiculosService {

    @Autowired
    private VehiculosRepository vehiculosRepository;
    
    @Autowired
    private GeneracionesRepository generacionesRepository;
    
    public List<Vehiculos> findAll() {
        return vehiculosRepository.findAll();
    }
    
    public List<Vehiculos> findByEstado(VehiculosEstado estado) {
        return vehiculosRepository.findByEstado(estado);
    }
    
    public List<Vehiculos> findByGeneracionId(Integer generacionId) {
        // Verificar que la generación existe
        generacionesRepository.findById(generacionId)
            .orElseThrow(() -> new ResourceNotFoundException("Generación no encontrada con ID: " + generacionId));
            
        return vehiculosRepository.findByGeneracionId(generacionId);
    }
    
    public List<Vehiculos> findByAnio(Integer anio) {
        return vehiculosRepository.findByAnio(anio);
    }
    
    public List<Vehiculos> findActivos() {
        return vehiculosRepository.findActivos();
    }
    
    public Vehiculos findById(Integer id) {
        return vehiculosRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehículo no encontrado con ID: " + id));
    }
    
    @Transactional
    public Vehiculos create(Vehiculos vehiculo) {
        // Validar que la generación existe
        generacionesRepository.findById(vehiculo.getGeneracionId())
            .orElseThrow(() -> new ResourceNotFoundException("Generación no encontrada con ID: " + vehiculo.getGeneracionId()));
            
        // Validar longitud máxima de cilindraje (200 caracteres)
        if (vehiculo.getCilindraje() != null && vehiculo.getCilindraje().length() > 200) {
            throw new IllegalArgumentException("El cilindraje no puede exceder 200 caracteres");
        }
        
        // Establecer valores por defecto
        if (vehiculo.getFechaIngreso() == null) {
            vehiculo.setFechaIngreso(LocalDate.now());
        }
        
        // No sobrescribir el estado si ya viene definido
        if (vehiculo.getEstado() == null) {
            vehiculo.setEstado(VehiculosEstado.DISPONIBLE);
        }
        
        if (vehiculo.getActivo() == null) {
            vehiculo.setActivo((byte) 1);
        }
        
        // No establecer inversion_total ya que se calcula automáticamente en la base de datos
        // usando la fórmula: (precio_compra + costo_grua + comisiones)
        vehiculo.setInversionTotal(null);
        
        LocalDateTime now = LocalDateTime.now();
        if (vehiculo.getFechaCreacion() == null) {
            vehiculo.setFechaCreacion(now);
        }
        vehiculo.setFechaActualizacion(now);
        
        // El código de vehículo será generado automáticamente por el trigger de la base de datos
        vehiculo.setCodigoVehiculo(null);
        
        return vehiculosRepository.save(vehiculo);
    }
    
    @Transactional
    public Vehiculos update(Integer id, Vehiculos vehiculo) {
        // Verificar que el vehículo existe
        Vehiculos existingVehiculo = findById(id);
        
        // Actualizar los campos que envía el frontend
        if (vehiculo.getGeneracionId() != null) {
            existingVehiculo.setGeneracionId(vehiculo.getGeneracionId());
        }
        if (vehiculo.getAnio() != null) {
            existingVehiculo.setAnio(vehiculo.getAnio());
        }
        if (vehiculo.getPrecioCompra() != null) {
            existingVehiculo.setPrecioCompra(vehiculo.getPrecioCompra());
        }
        if (vehiculo.getCostoGrua() != null) {
            existingVehiculo.setCostoGrua(vehiculo.getCostoGrua());
        }
        if (vehiculo.getComisiones() != null) {
            existingVehiculo.setComisiones(vehiculo.getComisiones());
        }
        if (vehiculo.getPrecioVenta() != null) {
            existingVehiculo.setPrecioVenta(vehiculo.getPrecioVenta());
        }
        if (vehiculo.getImagenUrl() != null) {
            existingVehiculo.setImagenUrl(vehiculo.getImagenUrl());
        }
        if (vehiculo.getFechaIngreso() != null) {
            existingVehiculo.setFechaIngreso(vehiculo.getFechaIngreso());
        }
        if (vehiculo.getFechaVenta() != null) {
            existingVehiculo.setFechaVenta(vehiculo.getFechaVenta());
        }
        if (vehiculo.getEstado() != null) {
            existingVehiculo.setEstado(vehiculo.getEstado());
        }
        if (vehiculo.getNotas() != null) {
            existingVehiculo.setNotas(vehiculo.getNotas());
        }
        if (vehiculo.getCilindraje() != null) {
            if (vehiculo.getCilindraje().length() > 200) {
                throw new IllegalArgumentException("El cilindraje no puede exceder 200 caracteres");
            }
            existingVehiculo.setCilindraje(vehiculo.getCilindraje());
        }
        if (vehiculo.getTraccion() != null) {
            existingVehiculo.setTraccion(vehiculo.getTraccion());
        }
        if (vehiculo.getTransmision() != null) {
            existingVehiculo.setTransmision(vehiculo.getTransmision());
        }
        if (vehiculo.getCombustible() != null) {
            existingVehiculo.setCombustible(vehiculo.getCombustible());
        }
        
        // Usar el Repository con la lógica correcta
        return vehiculosRepository.update(existingVehiculo);
    }
    
    @Transactional
    public void delete(Integer id) {
        // Verificar que el vehículo existe
        findById(id);
        
        // Eliminar el vehículo
        vehiculosRepository.delete(id);
    }
    
    @Transactional
    public Vehiculos updateEstado(Integer id, VehiculosEstado nuevoEstado) {
        Vehiculos vehiculo = findById(id);
        vehiculo.setEstado(nuevoEstado);
        return vehiculosRepository.update(vehiculo);
    }
    
    /**
     * Obtiene la estructura jerárquica completa de vehículos agrupados por marca > modelo > generación
     * @return Mapa con la estructura jerárquica de vehículos
     */
    @Cacheable(value = "vehiculosHierarchy", unless = "#result == null || #result.isEmpty()")
    public Map<String, Object> getVehiculosHierarchy() {
        return vehiculosRepository.findHierarchicalVehicles();
    }
    
    @Transactional
    public void actualizarEstado(Integer id, VehiculosEstado estado) {
        // Verificar que el vehículo existe
        findById(id);
        
        // Actualizar el estado
        vehiculosRepository.actualizarEstado(id, estado);
    }
    
    @Transactional
    public void marcarComoVendido(Integer id, BigDecimal precioVenta, LocalDate fechaVenta) {
        // Verificar que el vehículo existe
        Vehiculos vehiculo = findById(id);
        
        // Validar que el vehículo no esté ya vendido
        if (vehiculo.getEstado() == VehiculosEstado.VENDIDO) {
            throw new IllegalStateException("El vehículo ya ha sido marcado como vendido");
        }
        
        // Validar que se proporcione un precio de venta
        if (precioVenta == null || precioVenta.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("El precio de venta debe ser mayor a cero");
        }
        
        // Validar la fecha de venta
        if (fechaVenta == null) {
            fechaVenta = LocalDate.now();
        } else if (fechaVenta.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("La fecha de venta no puede ser futura");
        }
        
        // Marcar como vendido
        vehiculosRepository.marcarComoVendido(id, precioVenta, fechaVenta);
    }
}
