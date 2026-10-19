package com.rodiejacontable.rodiejacontable.controller;

import com.rodiejacontable.rodiejacontable.dto.InsPedidoDTO;
import com.rodiejacontable.rodiejacontable.service.InsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/ins")
@CrossOrigin(origins = {
    "https://contabilidad.tuprimernegocio.org"
})
public class InsController {

    @Autowired
    private InsService insService;

    /**
     * GET /api/ins/pedidos
     * Listar todos los pedidos INS
     */
    @GetMapping("/pedidos")
    public ResponseEntity<List<InsPedidoDTO>> obtenerPedidos(
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) Integer empleadoId) {

        List<InsPedidoDTO> pedidos;
        if (estado != null) {
            pedidos = insService.obtenerPedidosPorEstado(estado);
        } else if (empleadoId != null) {
            pedidos = insService.obtenerPedidosPorEmpleado(empleadoId);
        } else {
            pedidos = insService.obtenerTodosLosPedidos();
        }

        return ResponseEntity.ok(pedidos);
    }

    /**
     * GET /api/ins/pedidos/{id}
     * Obtener un pedido específico por ID
     */
    @GetMapping("/pedidos/{id}")
    public ResponseEntity<InsPedidoDTO> obtenerPedidoPorId(@PathVariable Integer id) {
        Optional<InsPedidoDTO> pedido = insService.obtenerPedidoPorId(id);
        return pedido.map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
    }

    /**
     * POST /api/ins/pedidos
     * Crear un nuevo pedido INS
     */
    @PostMapping("/pedidos")
    public ResponseEntity<InsPedidoDTO> crearPedido(@RequestBody InsPedidoDTO dto) {
        try {
            InsPedidoDTO nuevoPedido = insService.crearPedido(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(nuevoPedido);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * PUT /api/ins/pedidos/{id}
     * Actualizar un pedido INS existente
     */
    @PutMapping("/pedidos/{id}")
    public ResponseEntity<InsPedidoDTO> actualizarPedido(
            @PathVariable Integer id,
            @RequestBody InsPedidoDTO dto) {
        dto.setId(id);
        try {
            InsPedidoDTO pedidoActualizado = insService.actualizarPedido(dto);
            if (pedidoActualizado != null) {
                return ResponseEntity.ok(pedidoActualizado);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * PUT /api/ins/pedidos/{id}/entregar
     * Marcar un pedido como entregado (registra fecha_entrega y calcula comisión)
     */
    @PutMapping("/pedidos/{id}/entregar")
    public ResponseEntity<InsPedidoDTO> marcarComoEntregado(@PathVariable Integer id) {
        try {
            InsPedidoDTO pedido = insService.marcarComoEntregado(id);
            if (pedido != null) {
                return ResponseEntity.ok(pedido);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/ins/comisiones
     * Obtener comisiones por empleado
     * Query params: anio, mes (opcionales)
     */
    @GetMapping("/comisiones")
    public ResponseEntity<List<Map<String, Object>>> obtenerComisiones(
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) Integer mes) {

        List<Map<String, Object>> comisiones = insService.obtenerComisionesPorEmpleado(anio, mes);
        return ResponseEntity.ok(comisiones);
    }

    /**
     * GET /api/ins/comisiones/estadisticas
     * Obtener estadísticas generales de comisiones
     * Query params: anio, mes (opcionales)
     */
    @GetMapping("/comisiones/estadisticas")
    public ResponseEntity<Map<String, Object>> obtenerEstadisticas(
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) Integer mes) {

        Map<String, Object> estadisticas = insService.obtenerEstadisticasGenerales(anio, mes);
        return ResponseEntity.ok(estadisticas);
    }

    /**
     * DELETE /api/ins/pedidos/{id}
     * Eliminar un pedido INS (opcional, si se necesita)
     */
    @DeleteMapping("/pedidos/{id}")
    public ResponseEntity<Void> eliminarPedido(@PathVariable Integer id) {
        // Por ahora no implementamos eliminación física
        // Se podría implementar eliminación lógica (marcar como inactivo)
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).build();
    }
}
