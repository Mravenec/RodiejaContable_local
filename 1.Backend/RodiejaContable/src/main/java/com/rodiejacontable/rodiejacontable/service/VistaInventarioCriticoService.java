package com.rodiejacontable.rodiejacontable.service;

import com.rodiejacontable.database.jooq.enums.VistaInventarioCriticoEstado;

import com.rodiejacontable.database.jooq.tables.pojos.VistaInventarioCritico;
import com.rodiejacontable.rodiejacontable.repository.VistaInventarioCriticoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class VistaInventarioCriticoService {

    @Autowired
    private VistaInventarioCriticoRepository repository;

    public List<VistaInventarioCritico> findAll() {
        return repository.findAll();
    }

    public List<VistaInventarioCritico> findByEstado(VistaInventarioCriticoEstado estado) {
        return repository.findByEstado(estado);
    }

    public List<VistaInventarioCritico> findByParteVehiculo(String parteVehiculo) {
        return repository.findByParteVehiculo(parteVehiculo);
    }

    public List<VistaInventarioCritico> findByClasificacionMargen(String clasificacion) {
        return repository.findByClasificacionMargen(clasificacion);
    }

    public List<VistaInventarioCritico> findByClasificacionRotacion(String clasificacion) {
        return repository.findByClasificacionRotacion(clasificacion);
    }

    public List<VistaInventarioCritico> findByDiasEnInventarioGreaterThan(Integer dias) {
        return repository.findByDiasEnInventarioGreaterThan(dias);
    }

    public List<VistaInventarioCritico> findByVehiculoOrigen(String vehiculoOrigen) {
        return repository.findByVehiculoOrigen(vehiculoOrigen);
    }

    public List<VistaInventarioCritico> findByAnioVehiculo(Integer anio) {
        return repository.findByAnioVehiculo(anio);
    }

    public List<VistaInventarioCritico> buscarConFiltros(
            String codigoRepuesto,
            String descripcion,
            String parteVehiculo,
            VistaInventarioCriticoEstado estado,
            String clasificacionMargen,
            String clasificacionRotacion,
            Integer diasMinimosInventario,
            String vehiculoOrigen,
            Integer anioVehiculo) {
        
        return repository.findAll().stream()
                .filter(item -> codigoRepuesto == null || 
                    (item.getCodigoRepuesto() != null && 
                     item.getCodigoRepuesto().toLowerCase().contains(codigoRepuesto.toLowerCase())))
                .filter(item -> descripcion == null || 
                    (item.getDescripcion() != null && 
                     item.getDescripcion().toLowerCase().contains(descripcion.toLowerCase())))
                .filter(item -> parteVehiculo == null || (item.getParteVehiculo() != null && item.getParteVehiculo().equalsIgnoreCase(parteVehiculo)))
                .filter(item -> estado == null || item.getEstado() == estado)
                .filter(item -> clasificacionMargen == null || 
                    (item.getClasificacionMargen() != null && 
                     item.getClasificacionMargen().equalsIgnoreCase(clasificacionMargen)))
                .filter(item -> clasificacionRotacion == null || 
                    (item.getClasificacionRotacion() != null && 
                     item.getClasificacionRotacion().equalsIgnoreCase(clasificacionRotacion)))
                .filter(item -> diasMinimosInventario == null || 
                    (item.getDiasEnInventario() != null && 
                     item.getDiasEnInventario() > diasMinimosInventario))
                .filter(item -> vehiculoOrigen == null || 
                    (item.getVehiculoOrigen() != null && 
                     item.getVehiculoOrigen().equalsIgnoreCase(vehiculoOrigen)))
                .filter(item -> anioVehiculo == null || 
                    (item.getAnioVehiculo() != null && 
                     item.getAnioVehiculo().equals(anioVehiculo)))
                .collect(Collectors.toList());
    }

    public Map<String, Object> getResumenInventarioCritico() {
        List<VistaInventarioCritico> items = repository.findAll();
        
        long totalItems = items.size();
        
        // Conteo por estado
        Map<VistaInventarioCriticoEstado, Long> conteoPorEstado = items.stream()
                .collect(Collectors.groupingBy(VistaInventarioCritico::getEstado, Collectors.counting()));
        
        // Conteo por clasificación de margen
        Map<String, Long> conteoPorMargen = items.stream()
                .filter(item -> item.getClasificacionMargen() != null)
                .collect(Collectors.groupingBy(VistaInventarioCritico::getClasificacionMargen, Collectors.counting()));
        
        // Conteo por clasificación de rotación
        Map<String, Long> conteoPorRotacion = items.stream()
                .filter(item -> item.getClasificacionRotacion() != null)
                .collect(Collectors.groupingBy(VistaInventarioCritico::getClasificacionRotacion, Collectors.counting()));
        
        // Promedio de días en inventario
        double promedioDiasInventario = items.stream()
                .filter(item -> item.getDiasEnInventario() != null)
                .mapToInt(VistaInventarioCritico::getDiasEnInventario)
                .average()
                .orElse(0.0);
        
        Map<String, Object> resumen = new HashMap<>();
        resumen.put("totalItems", totalItems);
        resumen.put("conteoPorEstado", conteoPorEstado);
        resumen.put("conteoPorMargen", conteoPorMargen);
        resumen.put("conteoPorRotacion", conteoPorRotacion);
        resumen.put("promedioDiasInventario", promedioDiasInventario);
        
        return resumen;
    }

    public List<String> getClasificacionesMargenDisponibles() {
        return repository.findDistinctClasificacionesMargen();
    }

    public List<String> getClasificacionesRotacionDisponibles() {
        return repository.findDistinctClasificacionesRotacion();
    }

    public List<Integer> getAniosVehiculoDisponibles() {
        return repository.findDistinctAniosVehiculo();
    }
}
