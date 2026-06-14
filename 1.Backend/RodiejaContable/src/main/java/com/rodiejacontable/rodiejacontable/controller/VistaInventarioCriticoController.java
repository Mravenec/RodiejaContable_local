package com.rodiejacontable.rodiejacontable.controller;

import com.rodiejacontable.database.jooq.enums.VistaInventarioCriticoEstado;

import com.rodiejacontable.database.jooq.tables.pojos.VistaInventarioCritico;
import com.rodiejacontable.rodiejacontable.service.VistaInventarioCriticoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventario-critico")
public class VistaInventarioCriticoController {

    @Autowired
    private VistaInventarioCriticoService inventarioCriticoService;

    @GetMapping
    public List<VistaInventarioCritico> getAllInventarioCritico() {
        return inventarioCriticoService.findAll();
    }

    @GetMapping("/buscar")
    public List<VistaInventarioCritico> buscarConFiltros(
            @RequestParam(required = false) String codigo,
            @RequestParam(required = false) String descripcion,
            @RequestParam(required = false) String parteVehiculo,
            @RequestParam(required = false) VistaInventarioCriticoEstado estado,
            @RequestParam(required = false) String clasificacionMargen,
            @RequestParam(required = false) String clasificacionRotacion,
            @RequestParam(required = false) Integer diasMinimos,
            @RequestParam(required = false) String vehiculoOrigen,
            @RequestParam(required = false) Integer anioVehiculo) {
        
        return inventarioCriticoService.buscarConFiltros(
                codigo, descripcion, parteVehiculo, estado, 
                clasificacionMargen, clasificacionRotacion, 
                diasMinimos, vehiculoOrigen, anioVehiculo
        );
    }

    @GetMapping("/estado/{estado}")
    public List<VistaInventarioCritico> getByEstado(@PathVariable VistaInventarioCriticoEstado estado) {
        return inventarioCriticoService.findByEstado(estado);
    }

    @GetMapping("/parte-vehiculo/{parte}")
    public List<VistaInventarioCritico> getByParteVehiculo(
            @PathVariable String parte) {
        return inventarioCriticoService.findByParteVehiculo(parte);
    }

    @GetMapping("/clasificacion-margen/{clasificacion}")
    public List<VistaInventarioCritico> getByClasificacionMargen(
            @PathVariable String clasificacion) {
        return inventarioCriticoService.findByClasificacionMargen(clasificacion);
    }

    @GetMapping("/clasificacion-rotacion/{clasificacion}")
    public List<VistaInventarioCritico> getByClasificacionRotacion(
            @PathVariable String clasificacion) {
        return inventarioCriticoService.findByClasificacionRotacion(clasificacion);
    }

    @GetMapping("/dias-inventario/mayor-que/{dias}")
    public List<VistaInventarioCritico> getByDiasEnInventarioGreaterThan(
            @PathVariable Integer dias) {
        return inventarioCriticoService.findByDiasEnInventarioGreaterThan(dias);
    }

    @GetMapping("/vehiculo/{vehiculo}")
    public List<VistaInventarioCritico> getByVehiculoOrigen(
            @PathVariable String vehiculo) {
        return inventarioCriticoService.findByVehiculoOrigen(vehiculo);
    }

    @GetMapping("/anio-vehiculo/{anio}")
    public List<VistaInventarioCritico> getByAnioVehiculo(
            @PathVariable Integer anio) {
        return inventarioCriticoService.findByAnioVehiculo(anio);
    }

    @GetMapping("/resumen")
    public Map<String, Object> getResumenInventarioCritico() {
        return inventarioCriticoService.getResumenInventarioCritico();
    }

    @GetMapping("/opciones/clasificaciones-margen")
    public List<String> getClasificacionesMargenDisponibles() {
        return inventarioCriticoService.getClasificacionesMargenDisponibles();
    }

    @GetMapping("/opciones/clasificaciones-rotacion")
    public List<String> getClasificacionesRotacionDisponibles() {
        return inventarioCriticoService.getClasificacionesRotacionDisponibles();
    }

    @GetMapping("/opciones/anios-vehiculo")
    public List<Integer> getAniosVehiculoDisponibles() {
        return inventarioCriticoService.getAniosVehiculoDisponibles();
    }



    @GetMapping("/opciones/estados")
    public VistaInventarioCriticoEstado[] getEstados() {
        return VistaInventarioCriticoEstado.values();
    }
}
