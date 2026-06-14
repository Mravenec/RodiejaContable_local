package com.rodiejacontable.rodiejacontable.service;

import com.rodiejacontable.database.jooq.enums.VistaInventarioCompletoEstado;

import com.rodiejacontable.database.jooq.tables.pojos.VistaInventarioCompleto;
import com.rodiejacontable.rodiejacontable.repository.VistaInventarioCompletoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class VistaInventarioCompletoService {

    @Autowired
    private VistaInventarioCompletoRepository repository;

    public List<VistaInventarioCompleto> findAll() {
        return repository.findAll();
    }

    public Optional<VistaInventarioCompleto> findById(Integer id) {
        return repository.findById(id);
    }

    public List<VistaInventarioCompleto> findByEstado(VistaInventarioCompletoEstado estado) {
        return repository.findByEstado(estado);
    }

    public List<VistaInventarioCompleto> findByParteVehiculo(String parteVehiculo) {
        return repository.findByParteVehiculo(parteVehiculo);
    }

    public List<VistaInventarioCompleto> findByMarca(String marca) {
        return repository.findByMarca(marca);
    }

    public List<VistaInventarioCompleto> findByModelo(String modelo) {
        return repository.findByModelo(modelo);
    }

    public List<VistaInventarioCompleto> findByAnioVehiculo(Integer anioVehiculo) {
        return repository.findByAnioVehiculo(anioVehiculo);
    }

    public List<VistaInventarioCompleto> buscarPorCodigoODescripcion(String termino) {
        return repository.buscarPorCodigoODescripcion(termino);
    }

    public List<VistaInventarioCompleto> buscarConFiltros(
            String codigoRepuesto,
            String descripcion,
            String marca,
            String modelo,
            Integer anioVehiculo,
            String parteVehiculo,
            VistaInventarioCompletoEstado estado,
            BigDecimal precioMin,
            BigDecimal precioMax) {
        
        return repository.findAll().stream()
                .filter(item -> codigoRepuesto == null || item.getCodigoRepuesto().toLowerCase().contains(codigoRepuesto.toLowerCase()))
                .filter(item -> descripcion == null || item.getDescripcion().toLowerCase().contains(descripcion.toLowerCase()))
                .filter(item -> marca == null || (item.getMarca() != null && item.getMarca().equalsIgnoreCase(marca)))
                .filter(item -> modelo == null || (item.getModelo() != null && item.getModelo().equalsIgnoreCase(modelo)))
                .filter(item -> anioVehiculo == null || (item.getAnioVehiculo() != null && item.getAnioVehiculo().equals(anioVehiculo)))
                .filter(item -> parteVehiculo == null || (item.getParteVehiculo() != null && item.getParteVehiculo().equalsIgnoreCase(parteVehiculo)))
                .filter(item -> estado == null || item.getEstado() == estado)
                .filter(item -> (precioMin == null || item.getPrecioVenta() == null || item.getPrecioVenta().compareTo(precioMin) >= 0) &&
                               (precioMax == null || item.getPrecioVenta() == null || item.getPrecioVenta().compareTo(precioMax) <= 0))
                .collect(Collectors.toList());
    }

    public Map<String, Object> getResumenInventario() {
        List<VistaInventarioCompleto> items = repository.findAll();
        
        long totalItems = items.size();
        long totalEnStock = items.stream()
                .filter(item -> item.getEstado() == VistaInventarioCompletoEstado.STOCK)
                .count();
        
        BigDecimal valorTotalInventario = items.stream()
                .map(VistaInventarioCompleto::getPrecioVenta)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        Map<String, Long> conteoPorParte = items.stream()
                .collect(Collectors.groupingBy(VistaInventarioCompleto::getParteVehiculo, Collectors.counting()));
        
        Map<String, Object> resumen = new HashMap<>();
        resumen.put("totalItems", totalItems);
        resumen.put("totalEnStock", totalEnStock);
        resumen.put("valorTotalInventario", valorTotalInventario);
        resumen.put("conteoPorParte", conteoPorParte);
        
        return resumen;
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
}
