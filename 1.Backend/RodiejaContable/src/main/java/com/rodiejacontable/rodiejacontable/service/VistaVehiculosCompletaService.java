package com.rodiejacontable.rodiejacontable.service;

import com.rodiejacontable.rodiejacontable.repository.VistaVehiculosCompletaRepository;
import com.rodiejacontable.database.jooq.enums.VistaVehiculosCompletaEstado;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
public class VistaVehiculosCompletaService {

    private final VistaVehiculosCompletaRepository repository;

    @Autowired
    public VistaVehiculosCompletaService(VistaVehiculosCompletaRepository repository) {
        this.repository = repository;
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findAll() {
        return repository.findAll();
    }

    public Optional<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findById(Integer id) {
        return repository.findById(id);
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findActivos() {
        return repository.findActivos();
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findVehiculosParaEgreso() {
        return repository.findVehiculosParaEgreso();
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findByEstado(
            VistaVehiculosCompletaEstado estado) {
        return repository.findByEstado(estado);
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findByMarca(String marca) {
        return repository.findByMarca(marca);
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findByModelo(String modelo) {
        return repository.findByModelo(modelo);
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findByAnio(Integer anio) {
        return repository.findByAnio(anio);
    }
    
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findByPrecioVentaBetween(BigDecimal minPrecio, BigDecimal maxPrecio) {
        return repository.findByPrecioVentaBetween(minPrecio, maxPrecio);
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findByRangoFechasIngreso(
            LocalDate fechaInicio, LocalDate fechaFin) {
        return repository.findByRangoFechasIngreso(fechaInicio, fechaFin);
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findVehiculosVendidos() {
        return repository.findVehiculosVendidos();
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findVehiculosEnInventario() {
        return repository.findVehiculosEnInventario();
    }

    public List<String> getMarcasDisponibles() {
        return repository.findDistinctMarcas();
    }

    public List<String> getModelosDisponibles() {
        return repository.findDistinctModelos();
    }

    public List<Integer> getAniosDisponibles() {
        return repository.findDistinctAnios();
    }

    public Map<String, Object> getEstadisticasVehiculos() {
        return repository.getEstadisticasGenerales();
    }

    public Map<String, Object> getEstadisticasPorMarca(String marca) {
        List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> vehiculos = repository.findByMarca(marca);
        
        if (vehiculos == null || vehiculos.isEmpty()) {
            return Map.of(
                "marca", marca,
                "inversionTotal", BigDecimal.ZERO,
                "ventasTotales", BigDecimal.ZERO,
                "gananciaNeta", BigDecimal.ZERO,
                "totalVehiculos", 0,
                "vehiculosVendidos", 0,
                "vehiculosEnInventario", 0
            );
        }
        
        BigDecimal inversionTotal = vehiculos.stream()
                .map(com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta::getInversionTotal)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
                
        BigDecimal ventasTotales = vehiculos.stream()
                .filter(Objects::nonNull)
                .filter(v -> v.getEstado() == VistaVehiculosCompletaEstado.VENDIDO && v.getPrecioVenta() != null)
                .map(com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta::getPrecioVenta)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
                
        long totalVehiculos = vehiculos.size();
        long vehiculosVendidos = vehiculos.stream()
                .filter(Objects::nonNull)
                .filter(v -> v.getEstado() == VistaVehiculosCompletaEstado.VENDIDO)
                .count();
                
        long vehiculosEnInventario = vehiculos.stream()
                .filter(Objects::nonNull)
                .filter(v -> v.getEstado() == VistaVehiculosCompletaEstado.DISPONIBLE)
                .count();
        
        BigDecimal gananciaNeta = BigDecimal.ZERO;
        if (ventasTotales != null && inversionTotal != null) {
            gananciaNeta = ventasTotales.subtract(inversionTotal);
        }
        
        return Map.of(
                "marca", marca != null ? marca : "",
                "inversionTotal", inversionTotal != null ? inversionTotal : BigDecimal.ZERO,
                "ventasTotales", ventasTotales != null ? ventasTotales : BigDecimal.ZERO,
                "gananciaNeta", gananciaNeta,
                "totalVehiculos", totalVehiculos,
                "vehiculosVendidos", vehiculosVendidos,
                "vehiculosEnInventario", vehiculosEnInventario
        );
    }
    
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findByTipoVehiculo(String tipo) {
        if (tipo == null || tipo.trim().isEmpty()) {
            return Collections.emptyList();
        }
        return repository.findByTipoVehiculo(tipo);
    }
    
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findByTipoTransmision(String transmision) {
        if (transmision == null || transmision.trim().isEmpty()) {
            return Collections.emptyList();
        }
        return repository.findByTipoTransmision(transmision);
    }
}
