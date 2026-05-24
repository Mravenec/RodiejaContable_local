package com.rodiejacontable.rodiejacontable.controller;

import com.rodiejacontable.rodiejacontable.service.VistaVehiculosCompletaService;
import com.rodiejacontable.database.jooq.enums.VistaVehiculosCompletaEstado;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/vehiculos")
public class VistaVehiculosCompletaController {

    private final VistaVehiculosCompletaService service;

    @Autowired
    public VistaVehiculosCompletaController(VistaVehiculosCompletaService service) {
        this.service = service;
    }

    @GetMapping
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> getAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> getById(@PathVariable Integer id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/activos")
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> getActivos() {
        return service.findActivos();
    }

    @GetMapping("/para-egreso")
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> getVehiculosParaEgreso() {
        return service.findVehiculosParaEgreso();
    }

    @GetMapping("/estado/{estado}")
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> getByEstado(
            @PathVariable VistaVehiculosCompletaEstado estado) {
        return service.findByEstado(estado);
    }

    @GetMapping("/marca/{marca}")
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> getByMarca(
            @PathVariable String marca) {
        return service.findByMarca(marca);
    }

    @GetMapping("/modelo/{modelo}")
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> getByModelo(
            @PathVariable String modelo) {
        return service.findByModelo(modelo);
    }

    @GetMapping("/anio/{anio}")
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> getByAnio(
            @PathVariable Integer anio) {
        return service.findByAnio(anio);
    }

    @GetMapping("/rango-fechas")
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> getByRangoFechasIngreso(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin) {
        return service.findByRangoFechasIngreso(fechaInicio, fechaFin);
    }

    @GetMapping("/vendidos")
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> getVehiculosVendidos() {
        return service.findVehiculosVendidos();
    }

    @GetMapping("/inventario")
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> getVehiculosEnInventario() {
        return service.findVehiculosEnInventario();
    }

    @GetMapping("/marcas")
    public List<String> getMarcasDisponibles() {
        return service.getMarcasDisponibles();
    }

    @GetMapping("/modelos")
    public List<String> getModelosDisponibles() {
        return service.getModelosDisponibles();
    }

    @GetMapping("/anios")
    public List<Integer> getAniosDisponibles() {
        return service.getAniosDisponibles();
    }

    @GetMapping("/estadisticas")
    public Map<String, Object> getEstadisticas() {
        return service.getEstadisticasVehiculos();
    }

    @GetMapping("/rango-precios")
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> getByPrecioVentaBetween(
            @RequestParam BigDecimal min,
            @RequestParam BigDecimal max) {
        return service.findByPrecioVentaBetween(min, max);
    }

    @GetMapping("/estadisticas/marca/{marca}")
    public Map<String, Object> getEstadisticasPorMarca(@PathVariable String marca) {
        return service.getEstadisticasPorMarca(marca);
    }
    
    /**
     * Busca vehículos cuyo modelo o generación contengan el texto proporcionado
     * (búsqueda insensible a mayúsculas/minúsculas)
     * @param busqueda Texto a buscar en modelo o generación
     * @return Lista de vehículos que coinciden con la búsqueda
     */
    @GetMapping("/tipo-vehiculo/{busqueda}")
    public ResponseEntity<?> buscarPorModeloOGeneracion(@PathVariable String busqueda) {
        List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> vehiculos = service.findByTipoVehiculo(busqueda);
        if (vehiculos.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "No se encontraron vehículos que coincidan con: " + busqueda));
        }
        return ResponseEntity.ok(Map.of("total", vehiculos.size(), "vehiculos", vehiculos));
    }
    
    /**
     * Busca vehículos cuyo modelo o generación contengan el tipo de transmisión
     * (búsqueda insensible a mayúsculas/minúsculas)
     * @param transmision Tipo de transmisión a buscar (ej: AUTOMATICA, MECANICA, CVT, etc.)
     * @return Lista de vehículos que coinciden con el tipo de transmisión
     */
    @GetMapping("/tipo-transmision/{transmision}")
    public ResponseEntity<?> buscarPorTipoTransmision(@PathVariable String transmision) {
        List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> vehiculos = service.findByTipoTransmision(transmision);
        if (vehiculos.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "No se encontraron vehículos con transmisión: " + transmision));
        }
        return ResponseEntity.ok(Map.of("total", vehiculos.size(), "vehiculos", vehiculos));
    }
    
    /**
     * Búsqueda avanzada de vehículos con múltiples filtros
     * @param marca Marca del vehículo (opcional)
     * @param modelo Modelo del vehículo (opcional)
     * @param anio Año del vehículo (opcional)
     * @param tipoVehiculo Tipo de vehículo (opcional)
     * @param estado Estado del vehículo (opcional)
     * @param precioMin Precio mínimo de venta (opcional)
     * @param precioMax Precio máximo de venta (opcional)
     * @return Lista de vehículos que coinciden con los filtros
     */
    @GetMapping("/buscar")
    public ResponseEntity<?> buscarVehiculos(
            @RequestParam(required = false) String marca,
            @RequestParam(required = false) String modelo,
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) String tipoVehiculo,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) BigDecimal precioMin,
            @RequestParam(required = false) BigDecimal precioMax) {
            
        List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> resultados = new ArrayList<>();
        
        // Aplicar filtros según los parámetros proporcionados
        if (marca != null) {
            resultados = service.findByMarca(marca);
        } else if (modelo != null) {
            resultados = service.findByModelo(modelo);
        } else if (anio != null) {
            resultados = service.findByAnio(anio);
        } else if (tipoVehiculo != null) {
            resultados = service.findByTipoVehiculo(tipoVehiculo);
        } else if (estado != null) {
            try {
                VistaVehiculosCompletaEstado estadoEnum = VistaVehiculosCompletaEstado.valueOf(estado);
                resultados = service.findByEstado(estadoEnum);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Estado no válido. Los valores válidos son: " + 
                                Arrays.toString(VistaVehiculosCompletaEstado.values())));
            }
        } else if (precioMin != null && precioMax != null) {
            resultados = service.findByPrecioVentaBetween(precioMin, precioMax);
        } else {
            // Si no se proporcionan filtros, devolver todos los vehículos
            resultados = service.findAll();
        }
        
        // Aplicar filtros adicionales en memoria
        if (marca != null) {
            resultados = resultados.stream()
                    .filter(v -> v.getMarca().equalsIgnoreCase(marca))
                    .collect(Collectors.toList());
        }
        
        if (modelo != null) {
            resultados = resultados.stream()
                    .filter(v -> v.getModelo().equalsIgnoreCase(modelo))
                    .collect(Collectors.toList());
        }
        
        if (anio != null) {
            resultados = resultados.stream()
                    .filter(v -> v.getAnio().equals(anio))
                    .collect(Collectors.toList());
        }
        
        if (tipoVehiculo != null) {
            resultados = resultados.stream()
                    .filter(v -> v.getModelo() != null && 
                               v.getModelo().equalsIgnoreCase(tipoVehiculo))
                    .collect(Collectors.toList());
        }
        
        if (estado != null) {
            try {
                VistaVehiculosCompletaEstado estadoEnum = VistaVehiculosCompletaEstado.valueOf(estado);
                resultados = resultados.stream()
                        .filter(v -> v.getEstado() == estadoEnum)
                        .collect(Collectors.toList());
            } catch (IllegalArgumentException e) {
                // Ya manejado arriba
            }
        }
        
        if (precioMin != null) {
            resultados = resultados.stream()
                    .filter(v -> v.getPrecioVenta() != null && 
                               v.getPrecioVenta().compareTo(precioMin) >= 0)
                    .collect(Collectors.toList());
        }
        
        if (precioMax != null) {
            resultados = resultados.stream()
                    .filter(v -> v.getPrecioVenta() != null && 
                               v.getPrecioVenta().compareTo(precioMax) <= 0)
                    .collect(Collectors.toList());
        }
        
        if (resultados.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "No se encontraron vehículos con los criterios de búsqueda especificados"));
        }
        
        return ResponseEntity.ok(Map.of(
                "total", resultados.size(),
                "vehiculos", resultados
        ));
    }
}
