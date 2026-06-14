package com.rodiejacontable.rodiejacontable.controller;

import com.rodiejacontable.database.jooq.enums.VistaInventarioCompletoEstado;

import com.rodiejacontable.database.jooq.tables.pojos.VistaInventarioCompleto;
import com.rodiejacontable.rodiejacontable.service.VistaInventarioCompletoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/inventario")
public class VistaInventarioCompletoController {

    @Autowired
    private VistaInventarioCompletoService inventarioService;

    @GetMapping
    public List<VistaInventarioCompleto> getAllInventario() {
        return inventarioService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<VistaInventarioCompleto> getInventarioById(@PathVariable Integer id) {
        Optional<VistaInventarioCompleto> inventario = inventarioService.findById(id);
        return inventario.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/buscar")
    public List<VistaInventarioCompleto> buscarConFiltros(
            @RequestParam(required = false) String codigo,
            @RequestParam(required = false) String descripcion,
            @RequestParam(required = false) String marca,
            @RequestParam(required = false) String modelo,
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) String parte,
            @RequestParam(required = false) VistaInventarioCompletoEstado estado,
            @RequestParam(required = false) BigDecimal precioMin,
            @RequestParam(required = false) BigDecimal precioMax) {
        
        return inventarioService.buscarConFiltros(
                codigo, descripcion, marca, modelo, anio, parte, estado, precioMin, precioMax
        );
    }

    @GetMapping("/estado/{estado}")
    public List<VistaInventarioCompleto> getByEstado(@PathVariable VistaInventarioCompletoEstado estado) {
        return inventarioService.findByEstado(estado);
    }

    @GetMapping("/parte-vehiculo/{parte}")
    public List<VistaInventarioCompleto> getByParteVehiculo(@PathVariable String parte) {
        return inventarioService.findByParteVehiculo(parte);
    }

    @GetMapping("/marca/{marca}")
    public List<VistaInventarioCompleto> getByMarca(@PathVariable String marca) {
        return inventarioService.findByMarca(marca);
    }

    @GetMapping("/modelo/{modelo}")
    public List<VistaInventarioCompleto> getByModelo(@PathVariable String modelo) {
        return inventarioService.findByModelo(modelo);
    }

    @GetMapping("/anio/{anio}")
    public List<VistaInventarioCompleto> getByAnioVehiculo(@PathVariable Integer anio) {
        return inventarioService.findByAnioVehiculo(anio);
    }

    @GetMapping("/buscar/{termino}")
    public List<VistaInventarioCompleto> buscarPorCodigoODescripcion(@PathVariable String termino) {
        return inventarioService.buscarPorCodigoODescripcion(termino);
    }

    @GetMapping("/resumen")
    public Map<String, Object> getResumenInventario() {
        return inventarioService.getResumenInventario();
    }

    @GetMapping("/opciones/marcas")
    public List<String> getMarcasDisponibles() {
        return inventarioService.getMarcasDisponibles();
    }

    @GetMapping("/opciones/modelos")
    public List<String> getModelosDisponibles() {
        return inventarioService.getModelosDisponibles();
    }

    @GetMapping("/opciones/anios")
    public List<Integer> getAniosDisponibles() {
        return inventarioService.getAniosDisponibles();
    }



    @GetMapping("/opciones/estados")
    public VistaInventarioCompletoEstado[] getEstados() {
        return VistaInventarioCompletoEstado.values();
    }
}
