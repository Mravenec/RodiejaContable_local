package com.rodiejacontable.rodiejacontable.controller;

import com.rodiejacontable.database.jooq.tables.pojos.ParteVehiculo;
import com.rodiejacontable.rodiejacontable.service.ParteVehiculoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/partes-vehiculo")
public class ParteVehiculoController {

    private final ParteVehiculoService service;

    @Autowired
    public ParteVehiculoController(ParteVehiculoService service) {
        this.service = service;
    }

    @GetMapping("/activos")
    public ResponseEntity<List<ParteVehiculo>> obtenerTodosActivos() {
        return ResponseEntity.ok(service.obtenerTodosActivos());
    }

    @GetMapping
    public ResponseEntity<List<ParteVehiculo>> obtenerTodos() {
        return ResponseEntity.ok(service.obtenerTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ParteVehiculo> obtenerPorId(@PathVariable Integer id) {
        try {
            return ResponseEntity.ok(service.obtenerPorId(id));
        } catch (IllegalStateException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<ParteVehiculo> crear(@RequestBody ParteVehiculo parteVehiculo) {
        return new ResponseEntity<>(service.crear(parteVehiculo), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ParteVehiculo> actualizar(@PathVariable Integer id, @RequestBody ParteVehiculo parteVehiculo) {
        try {
            return ResponseEntity.ok(service.actualizar(id, parteVehiculo));
        } catch (IllegalStateException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        try {
            service.eliminar(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
