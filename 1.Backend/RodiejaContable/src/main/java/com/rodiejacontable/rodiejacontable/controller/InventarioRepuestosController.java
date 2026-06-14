package com.rodiejacontable.rodiejacontable.controller;

import com.rodiejacontable.database.jooq.tables.pojos.InventarioRepuestos;
import com.rodiejacontable.rodiejacontable.service.InventarioRepuestosService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventario-repuestos")
public class InventarioRepuestosController {

    private final InventarioRepuestosService inventarioRepuestosService;

    @Autowired
    public InventarioRepuestosController(InventarioRepuestosService inventarioRepuestosService) {
        this.inventarioRepuestosService = inventarioRepuestosService;
    }

    @PostMapping
    public ResponseEntity<InventarioRepuestos> crearRepuesto(@RequestBody InventarioRepuestos repuesto) {
        try {
            InventarioRepuestos nuevoRepuesto = inventarioRepuestosService.crearRepuesto(repuesto);
            return new ResponseEntity<>(nuevoRepuesto, HttpStatus.CREATED);
        } catch (IllegalStateException e) {
            return new ResponseEntity<>(null, HttpStatus.CONFLICT);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * ✅ Endpoint para insertar repuesto SIN vehículo origen usando el SP
     */
    @PostMapping("/sin-vehiculo")
    public ResponseEntity<String> crearRepuestoSinVehiculoOrigen(@RequestBody Map<String, Object> payload) {
        try {
            inventarioRepuestosService.crearRepuestoSinVehiculoOrigen(
                    (Integer) payload.get("generacionId"),
                    (String) payload.get("marcaNombre"),
                    payload.get("parteVehiculoId") != null ? Integer.parseInt(payload.get("parteVehiculoId").toString()) : null,
                    (String) payload.get("descripcion"),
                    payload.get("precioCosto") != null ? new BigDecimal(payload.get("precioCosto").toString()) : BigDecimal.ZERO,
                    payload.get("precioVenta") != null ? new BigDecimal(payload.get("precioVenta").toString()) : null,
                    payload.get("precioMayoreo") != null ? new BigDecimal(payload.get("precioMayoreo").toString()) : null,
                    (String) payload.get("bodega"),
                    (String) payload.get("zona"),
                    (String) payload.get("pared"),
                    (String) payload.get("malla"),
                    (String) payload.get("estante"),
                    (String) payload.get("piso"),
                    (String) payload.get("estado"),
                    (String) payload.get("condicion"),
                    (String) payload.get("imagenUrl"), // ✅ Nuevo campo
                    payload.get("cantidad") != null ? Integer.parseInt(payload.get("cantidad").toString()) : 1 // ✅ Nueva cantidad
            );
            return new ResponseEntity<>("Repuesto(s) genérico(s) creado(s) exitosamente", HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>("Error: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<InventarioRepuestos> actualizarRepuesto(
            @PathVariable Integer id, 
            @RequestBody InventarioRepuestos repuestoActualizado) {
        try {
            InventarioRepuestos repuesto = inventarioRepuestosService.actualizarRepuesto(id, repuestoActualizado);
            return new ResponseEntity<>(repuesto, HttpStatus.OK);
        } catch (IllegalStateException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<InventarioRepuestos> obtenerPorId(@PathVariable Integer id) {
        return inventarioRepuestosService.obtenerPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/vehiculo/{vehiculoId}")
    public ResponseEntity<List<InventarioRepuestos>> obtenerPorVehiculoOrigenId(@PathVariable Integer vehiculoId) {
        List<InventarioRepuestos> repuestos = inventarioRepuestosService.obtenerPorVehiculoOrigenId(vehiculoId);
        if (repuestos.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        }
        return new ResponseEntity<>(repuestos, HttpStatus.OK);
    }

    @GetMapping("/buscar")
    public ResponseEntity<List<InventarioRepuestos>> buscarPorCodigoRepuesto(
            @RequestParam(required = false) String codigo) {
        if (codigo == null || codigo.trim().isEmpty()) {
            List<InventarioRepuestos> repuestos = inventarioRepuestosService.obtenerTodos();
            return new ResponseEntity<>(repuestos, HttpStatus.OK);
        }
        
        List<InventarioRepuestos> repuestos = inventarioRepuestosService.buscarPorCodigoRepuesto(codigo);
        if (repuestos.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        }
        return new ResponseEntity<>(repuestos, HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<List<InventarioRepuestos>> obtenerTodos() {
        List<InventarioRepuestos> repuestos = inventarioRepuestosService.obtenerTodos();
        return ResponseEntity.ok(repuestos);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<HttpStatus> eliminarRepuesto(@PathVariable Integer id) {
        try {
            inventarioRepuestosService.eliminarRepuesto(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (IllegalStateException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}