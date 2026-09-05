package com.rodiejacontable.rodiejacontable.controller;

import com.rodiejacontable.database.jooq.tables.records.PagosComisionesRecord;
import com.rodiejacontable.rodiejacontable.service.PagosComisionesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/pagos-comisiones")
@CrossOrigin(origins = {
        "https://contabilidad.tuprimernegocio.org"
})
public class PagosComisionesController {

    @Autowired
    private PagosComisionesService pagosService;

    // GET /api/pagos-comisiones - Obtener todos los pagos
    @GetMapping
    public ResponseEntity<List<PagosComisionesService.PagoDTO>> getAllPagos() {
        List<PagosComisionesService.PagoDTO> pagos = pagosService.findAll();
        return ResponseEntity.ok(pagos);
    }

    // GET /api/pagos-comisiones/{id} - Obtener pago por ID
    @GetMapping("/{id}")
    public ResponseEntity<PagosComisionesService.PagoDTO> getPagoById(@PathVariable Integer id) {
        Optional<PagosComisionesRecord> pagoOpt = pagosService.findById(id);
        if (pagoOpt.isPresent()) {
            PagosComisionesRecord pago = pagoOpt.get();
            PagosComisionesService.PagoDTO dto = new PagosComisionesService.PagoDTO();
            dto.setId(pago.getId());
            dto.setEmpleadoId(pago.getEmpleadoId());
            dto.setAnio(pago.getAnio());
            dto.setMes(pago.getMes());
            dto.setTotalComisiones(pago.getTotalComisiones());
            dto.setFechaPago(pago.getFechaPago());
            dto.setEstado(pago.getEstado().name());
            dto.setReferenciaPago(pago.getReferenciaPago());
            dto.setNotas(pago.getNotas());
            dto.setFechaRegistro(pago.getFechaRegistro());
            dto.setFechaActualizacion(pago.getFechaActualizacion());
            return ResponseEntity.ok(dto);
        }
        return ResponseEntity.notFound().build();
    }

    // GET /api/pagos-comisiones/empleado/{empleadoId} - Obtener pagos por empleado
    @GetMapping("/empleado/{empleadoId}")
    public ResponseEntity<List<PagosComisionesService.PagoDTO>> getPagosByEmpleado(@PathVariable Integer empleadoId) {
        List<PagosComisionesService.PagoDTO> pagos = pagosService.findByEmpleadoId(empleadoId);
        return ResponseEntity.ok(pagos);
    }

    // GET /api/pagos-comisiones/periodo/{anio}/{mes} - Obtener pagos por período
    @GetMapping("/periodo/{anio}/{mes}")
    public ResponseEntity<List<PagosComisionesService.PagoDTO>> getPagosByPeriodo(
            @PathVariable Integer anio, 
            @PathVariable Integer mes) {
        List<PagosComisionesService.PagoDTO> pagos = pagosService.findByPeriodo(anio, mes);
        return ResponseEntity.ok(pagos);
    }

    // GET /api/pagos-comisiones/estado/{estado} - Obtener pagos por estado
    @GetMapping("/estado/{estado}")
    public ResponseEntity<List<PagosComisionesService.PagoDTO>> getPagosByEstado(@PathVariable String estado) {
        List<PagosComisionesService.PagoDTO> pagos = pagosService.findByEstado(estado);
        return ResponseEntity.ok(pagos);
    }

    // GET /api/pagos-comisiones/pendientes/{anio}/{mes} - Listar comisiones pendientes
    @GetMapping("/pendientes/{anio}/{mes}")
    public ResponseEntity<List<PagosComisionesService.ComisionesPendientesDTO>> getComisionesPendientes(
            @PathVariable Integer anio, 
            @PathVariable Integer mes) {
        List<PagosComisionesService.ComisionesPendientesDTO> pendientes = 
                pagosService.listarComisionesPendientes(anio, mes);
        return ResponseEntity.ok(pendientes);
    }

    // POST /api/pagos-comisiones/registrar - Registrar pago de comisiones
    @PostMapping("/registrar")
    public ResponseEntity<PagosComisionesService.PagoComisionesDTO> registrarPagoComisiones(
            @RequestBody Map<String, Object> requestBody) {
        
        try {
            Integer empleadoId = (Integer) requestBody.get("empleadoId");
            Integer anio = (Integer) requestBody.get("anio");
            Integer mes = (Integer) requestBody.get("mes");
            
            // Convertir fecha si viene como String
            java.time.LocalDate fechaPago;
            if (requestBody.get("fechaPago") instanceof String) {
                fechaPago = java.time.LocalDate.parse((String) requestBody.get("fechaPago"));
            } else {
                fechaPago = (java.time.LocalDate) requestBody.get("fechaPago");
            }
            
            String referencia = (String) requestBody.getOrDefault("referencia", null);
            String notas = (String) requestBody.getOrDefault("notas", null);
            
            PagosComisionesService.PagoComisionesDTO resultado = 
                    pagosService.registrarPagoComisiones(empleadoId, anio, mes, fechaPago, referencia, notas);
            
            return ResponseEntity.ok(resultado);
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(
                    new PagosComisionesService.PagoComisionesDTO(null, e.getMessage(), null)
            );
        }
    }

    // PUT /api/pagos-comisiones/{id}/estado - Actualizar estado de pago
    @PutMapping("/{id}/estado")
    public ResponseEntity<PagosComisionesService.PagoDTO> actualizarEstado(
            @PathVariable Integer id, 
            @RequestBody Map<String, String> requestBody) {
        
        try {
            String nuevoEstado = requestBody.get("estado");
            PagosComisionesService.PagoDTO pagoActualizado = pagosService.updateEstado(id, nuevoEstado);
            return ResponseEntity.ok(pagoActualizado);
            
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // DELETE /api/pagos-comisiones/{id} - Eliminar pago
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarPago(@PathVariable Integer id) {
        try {
            pagosService.deletePago(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // GET /api/pagos-comisiones/resumen/{anio}/{mes} - Resumen de pagos del período
    @GetMapping("/resumen/{anio}/{mes}")
    public ResponseEntity<Map<String, Object>> getResumenPeriodo(
            @PathVariable Integer anio, 
            @PathVariable Integer mes) {
        
        try {
            List<PagosComisionesService.PagoDTO> pagosDTO = pagosService.findByPeriodo(anio, mes);
            List<PagosComisionesService.ComisionesPendientesDTO> pendientes = 
                    pagosService.listarComisionesPendientes(anio, mes);
            
            // Calcular totales
            double totalPagado = pagosDTO.stream()
                    .mapToDouble(dto -> dto.getTotalComisiones().doubleValue())
                    .sum();
            
            double totalPendiente = pendientes.stream()
                    .mapToDouble(dto -> dto.getTotalComisionesPendientes().doubleValue())
                    .sum();
            
            // Crear mapa simple para evitar problemas de serialización
            Map<String, Object> resumen = new HashMap<>();
            resumen.put("anio", anio);
            resumen.put("mes", mes);
            resumen.put("totalPagado", totalPagado);
            resumen.put("totalPendiente", totalPendiente);
            resumen.put("cantidadPagos", pagosDTO.size());
            resumen.put("cantidadPendientes", pendientes.size());
            resumen.put("pagos", pagosDTO);
            resumen.put("pendientes", pendientes);
            
            return ResponseEntity.ok(resumen);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Error al generar resumen: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
}
