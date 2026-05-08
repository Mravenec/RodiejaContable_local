package com.rodiejacontable.rodiejacontable.controller;

import com.rodiejacontable.database.jooq.enums.TransaccionesFinancierasEstado;
import com.rodiejacontable.database.jooq.tables.pojos.TransaccionesFinancieras;
import com.rodiejacontable.rodiejacontable.service.TransaccionesFinancierasService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/transacciones-financieras")
public class TransaccionesFinancierasController {

    @Autowired
    private TransaccionesFinancierasService transaccionesService;
    
    @GetMapping
    public ResponseEntity<List<TransaccionesFinancieras>> getAll() {
        List<TransaccionesFinancieras> transacciones = transaccionesService.findAll();
        return new ResponseEntity<>(transacciones, HttpStatus.OK);
    }
    
    @GetMapping("/rango-fechas")
    public ResponseEntity<List<TransaccionesFinancieras>> getByFechaBetween(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin) {
        
        List<TransaccionesFinancieras> transacciones = transaccionesService.findByFechaBetween(fechaInicio, fechaFin);
        return new ResponseEntity<>(transacciones, HttpStatus.OK);
    }
    
    @GetMapping("/tipo/{tipoTransaccionId}")
    public ResponseEntity<List<TransaccionesFinancieras>> getByTipoTransaccionId(
            @PathVariable Integer tipoTransaccionId) {
        
        List<TransaccionesFinancieras> transacciones = transaccionesService.findByTipoTransaccionId(tipoTransaccionId);
        return new ResponseEntity<>(transacciones, HttpStatus.OK);
    }
    
    @GetMapping("/vehiculo/{vehiculoId}")
    public ResponseEntity<List<TransaccionesFinancieras>> getByVehiculoId(
            @PathVariable Integer vehiculoId) {
        
        List<TransaccionesFinancieras> transacciones = transaccionesService.findByVehiculoId(vehiculoId);
        return new ResponseEntity<>(transacciones, HttpStatus.OK);
    }
    
    @GetMapping("/empleado/{empleadoId}")
    public ResponseEntity<List<TransaccionesFinancieras>> getByEmpleadoId(
            @PathVariable Integer empleadoId) {
        
        List<TransaccionesFinancieras> transacciones = transaccionesService.findByEmpleadoId(empleadoId);
        return new ResponseEntity<>(transacciones, HttpStatus.OK);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<TransaccionesFinancieras> getById(@PathVariable Integer id) {
        TransaccionesFinancieras transaccion = transaccionesService.findById(id);
        return new ResponseEntity<>(transaccion, HttpStatus.OK);
    }
    
    @PostMapping
    public ResponseEntity<TransaccionesFinancieras> create(@RequestBody TransaccionesFinancieras transaccion) {
        TransaccionesFinancieras nuevaTransaccion = transaccionesService.create(transaccion);
        return new ResponseEntity<>(nuevaTransaccion, HttpStatus.CREATED);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<TransaccionesFinancieras> update(
            @PathVariable Integer id, 
            @RequestBody TransaccionesFinancieras transaccion) {
        
        try {
            System.out.println("PUT Request - ID: " + id);
            System.out.println("PUT Request - Transacción recibida: " + transaccion);
            System.out.println("PUT Request - Fecha recibida: " + transaccion.getFecha());
            System.out.println("PUT Request - Descripción: " + transaccion.getDescripcion());
            
            transaccion.setId(id); // Asegurar que el ID del path coincida con el del body
            TransaccionesFinancieras transaccionActualizada = transaccionesService.update(id, transaccion);
            return new ResponseEntity<>(transaccionActualizada, HttpStatus.OK);
        } catch (Exception e) {
            System.err.println("Error en PUT endpoint: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        transaccionesService.delete(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
    
    @PatchMapping("/{id}/estado")
    public ResponseEntity<Void> updateEstado(
            @PathVariable Integer id,
            @RequestParam TransaccionesFinancierasEstado estado) {
        
        transaccionesService.actualizarEstado(id, estado);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
    
    @GetMapping("/total-por-tipo-y-periodo")
    public ResponseEntity<BigDecimal> getTotalMontoByTipoTransaccionAndPeriodo(
            @RequestParam Integer tipoTransaccionId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin) {
        
        BigDecimal total = transaccionesService.getTotalMontoByTipoTransaccionAndPeriodo(
            tipoTransaccionId, fechaInicio, fechaFin);
        return new ResponseEntity<>(total, HttpStatus.OK);
    }
    
    @GetMapping("/total-mensual-por-tipo")
    public ResponseEntity<BigDecimal> getTotalMensualByTipoTransaccion(
            @RequestParam Integer tipoTransaccionId,
            @RequestParam int year,
            @RequestParam int month) {
        
        BigDecimal total = transaccionesService.getTotalMensualByTipoTransaccion(tipoTransaccionId, year, month);
        return new ResponseEntity<>(total, HttpStatus.OK);
    }
}
