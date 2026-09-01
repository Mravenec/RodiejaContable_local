package com.rodiejacontable.rodiejacontable.integration.audatex.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rodiejacontable.database.jooq.tables.pojos.AudatexPedidos;
import com.rodiejacontable.rodiejacontable.integration.audatex.service.AudatexExcelExportService;
import com.rodiejacontable.rodiejacontable.integration.audatex.service.AudatexService;
import com.rodiejacontable.rodiejacontable.integration.audatex.support.SseStreamSupport;
import jakarta.servlet.http.HttpServletResponse;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/audatex")
@CrossOrigin(origins = {
        "https://contabilidad.tuprimernegocio.org"
})
public class AudatexController {

    private static final Logger log = LoggerFactory.getLogger(AudatexController.class);
    private static final ObjectMapper SSE_MAPPER = new ObjectMapper();

    private final AudatexService audatexService;
    private final AudatexExcelExportService excelService;
    private final com.rodiejacontable.rodiejacontable.integration.audatex.service.AudatexSyncWorker syncWorker;

    public AudatexController(AudatexService audatexService, AudatexExcelExportService excelService, com.rodiejacontable.rodiejacontable.integration.audatex.service.AudatexSyncWorker syncWorker) {
        this.audatexService = audatexService;
        this.excelService = excelService;
        this.syncWorker = syncWorker;
    }

    /**
     * @deprecated Usar POST /oportunidades/sync/incremental (30 días, async).
     */
    @Deprecated
    @GetMapping("/oportunidades/sync/force")
    public org.springframework.http.ResponseEntity<String> forceSync() {
        log.warn("[Audatex] GET /oportunidades/sync/force está deprecado — usar POST /oportunidades/sync/incremental");
        new Thread(() -> {
            try {
                syncWorker.syncHotZone();
                syncWorker.syncWarmZone();
                syncWorker.syncColdZone();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
        return org.springframework.http.ResponseEntity.ok("Sincronización total (Hot, Warm, Cold) iniciada en segundo plano.");
    }

    /**
     * @deprecated Usar GET /oportunidades/sync para leer desde BD.
     */
    @Deprecated
    @GetMapping("/oportunidades")
    public ResponseEntity<?> obtenerOportunidades(
            @RequestParam(required = false) String armadora,
            @RequestParam(required = false) String aseguradora,
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(required = false) Integer minPendientes) {

        try {
            List<Map<String, Object>> resultado = audatexService.buscarConFiltros(
                    armadora, aseguradora, desde, hasta, minPendientes);

            log.info("[Audatex] GET /oportunidades → {} resultados (filtros: armadora={}, aseguradora={})",
                    resultado.size(), armadora, aseguradora);

            return ResponseEntity.ok(Map.of(
                    "total", resultado.size(),
                    "oportunidades", resultado
            ));
        } catch (Exception e) {
            log.error("[Audatex] Error consultando oportunidades: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno: " + e.getMessage()));
        }
    }

    @GetMapping("/oportunidades/sync")
    public ResponseEntity<?> obtenerOportunidadesSync(
            @RequestParam(required = false) String armadora,
            @RequestParam(required = false) String aseguradora,
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(required = false) Integer minPendientes) {
        try {
            List<Map<String, Object>> resultado = audatexService.getOportunidadesFromDb(
                    armadora, aseguradora, desde, hasta, minPendientes);
            log.info("[Audatex] GET /oportunidades/sync → {} resultados desde BD local", resultado.size());
            return ResponseEntity.ok(Map.of(
                    "total", resultado.size(),
                    "oportunidades", resultado
            ));
        } catch (Exception e) {
            log.error("[Audatex] Error leyendo oportunidades BD: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno: " + e.getMessage()));
        }
    }

    @PostMapping("/oportunidades/sync/incremental")
    public ResponseEntity<?> syncIncremental() {
        boolean iniciado = audatexService.iniciarSyncIncremental();
        if (!iniciado) {
            return ResponseEntity.ok(Map.of(
                    "mensaje", "Sincronización incremental ya en curso",
                    "enCurso", true,
                    "dias", 30
            ));
        }
        return ResponseEntity.accepted().body(Map.of(
                "mensaje", "Sincronización incremental de 30 días iniciada en background",
                "enCurso", true,
                "dias", 30
        ));
    }


    @PostMapping("/pedidos/sync/incremental")
    public ResponseEntity<?> syncIncrementalPedidos() {
        boolean iniciado = audatexService.iniciarSyncPedidosIncremental();
        if (!iniciado) {
            return ResponseEntity.ok(Map.of("mensaje", "Sincronización incremental ya en curso", "enCurso", true));
        }
        return ResponseEntity.accepted().body(Map.of("mensaje", "Sincronización incremental iniciada en background", "enCurso", true));
    }

    private static final java.util.List<SseEmitter> pedidosEmitters = new java.util.concurrent.CopyOnWriteArrayList<>();

    @GetMapping(value = "/pedidos/sync/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamPedidosSyncDeltas(HttpServletResponse response) {
        return SseStreamSupport.registerPassiveStream(pedidosEmitters, response, "pedidos/sync/stream");
    }

    public static void emitirDeltaPedido(Map<String, Object> pedido) {
        if (pedidosEmitters.isEmpty()) return;
        java.util.List<SseEmitter> muertos = new java.util.ArrayList<>();
        for (SseEmitter emitter : pedidosEmitters) {
            try {
                String json = SSE_MAPPER.writeValueAsString(pedido);
                emitter.send(SseEmitter.event().name("deltaPedido").data(json));
            } catch (Exception e) {
                muertos.add(emitter);
            }
        }
        pedidosEmitters.removeAll(muertos);
    }

    private static final java.util.List<SseEmitter> deltaEmitters = new java.util.concurrent.CopyOnWriteArrayList<>();

    @GetMapping(value = "/oportunidades/sync/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamSyncDeltas(HttpServletResponse response) {
        return SseStreamSupport.registerPassiveStream(deltaEmitters, response, "oportunidades/sync/stream");
    }

    public static void emitirDelta(Map<String, Object> oportunidad) {
        if (deltaEmitters.isEmpty()) return;
        
        java.util.List<SseEmitter> muertos = new java.util.ArrayList<>();
        for (SseEmitter emitter : deltaEmitters) {
            try {
                String json = SSE_MAPPER.writeValueAsString(oportunidad);
                emitter.send(SseEmitter.event().name("delta").data(json));
            } catch (Exception e) {
                muertos.add(emitter);
            }
        }
        deltaEmitters.removeAll(muertos);
    }

    /**
     * @deprecated El frontend debe usar GET /oportunidades/sync + POST /sync/incremental + SSE /sync/stream.
     */
    @Deprecated
    @GetMapping(value = "/oportunidades/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamOportunidades(
            @RequestParam(required = false) String armadora,
            @RequestParam(required = false) String aseguradora,
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(required = false) Integer minPendientes) {

        log.warn("[Audatex] GET /oportunidades/stream está deprecado — usar sync incremental + /sync/stream");
        SseEmitter emitter = new SseEmitter(3_600_000L);
        log.info("[Audatex] SSE /oportunidades/stream — armadora={}, aseguradora={}, desde={}, hasta={}",
                armadora, aseguradora, desde, hasta);
        audatexService.streamOportunidades(armadora, aseguradora, desde, hasta, minPendientes, emitter);
        return emitter;
    }

    @GetMapping("/oportunidades/por-repuesto/{repuestoId}")
    public ResponseEntity<?> obtenerOportunidadesPorRepuesto(@PathVariable Integer repuestoId) {
        try {
            Map<String, Object> resultado = audatexService.obtenerOportunidadesPorRepuesto(repuestoId);

            if (Boolean.TRUE.equals(resultado.get("notFound"))) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Repuesto no encontrado"));
            }

            log.info("[Audatex] GET /oportunidades/por-repuesto/{} → {} resultados",
                    repuestoId, resultado.get("total"));

            return ResponseEntity.ok(resultado);
        } catch (IOException e) {
            log.error("[Audatex] Error consultando oportunidades por repuesto: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Portal Audatex no disponible: " + e.getMessage()));
        } catch (Exception e) {
            log.error("[Audatex] Error inesperado en /oportunidades/por-repuesto: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno: " + e.getMessage()));
        }
    }

    @GetMapping("/pedidos/sync-entregados-items")
    public ResponseEntity<?> syncEntregadosItems() {
        try {
            log.info("[Audatex] Manual sync of historical Entregados items requested");
            audatexService.syncItemsParaEntregados();
            return ResponseEntity.ok(Map.of("mensaje", "Sync started in background"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/oportunidades/batch")
    public ResponseEntity<?> obtenerOportunidadesBatch() {
        try {
            log.info("[Audatex] GET /oportunidades/batch");
            Map<Integer, Long> counts = audatexService.obtenerOportunidadesBatch();
            return ResponseEntity.ok(Map.of("counts", counts));
        } catch (Exception e) {
            log.error("[Audatex] Error consultando oportunidades batch: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno: " + e.getMessage()));
        }
    }

    @PostMapping("/pedidos")
    @RateLimiter(name = "audatexEnvios", fallbackMethod = "enviarCotizacionRateLimitFallback")
    public ResponseEntity<?> registrarPedido(@RequestBody java.util.Map<String, Object> payload) {
        try {
            log.info("[Audatex] POST /pedidos - cotización {}", payload.get("cotizacionId"));
            AudatexPedidos guardado = audatexService.registrarPedido(payload);
            return ResponseEntity.ok(Map.of(
                    "mensaje", "Pedido registrado exitosamente",
                    "pedido", guardado,
                    "estado", guardado.getEstado()
            ));
        } catch (Exception e) {
            log.error("[Audatex] Error registrando pedido: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno: " + e.getMessage()));
        }
    }

    private ResponseEntity<?> enviarCotizacionRateLimitFallback(java.util.Map<String, Object> envio, Exception exception) {
        log.warn("[Audatex] Rate limit excedido en registrarPedido - usando fallback");
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("error", "Demasiados envíos. Por favor espere un momento antes de intentar nuevamente."));
    }

    @PostMapping("/pedidos/facturar")
    public ResponseEntity<?> facturarPedido(@RequestBody Map<String, Object> payload) {
        try {
            Integer pedidoId = (Integer) payload.get("pedidoId");
            log.info("[Audatex] POST /pedidos/facturar - pedidoId {}", pedidoId);
            AudatexPedidos facturado = audatexService.facturarPedido(pedidoId);
            return ResponseEntity.ok(Map.of(
                    "mensaje", "Pedido facturado exitosamente",
                    "pedido", facturado
            ));
        } catch (Exception e) {
            log.error("[Audatex] Error facturando pedido: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno: " + e.getMessage()));
        }
    }

    @GetMapping("/oportunidades/{wan}/detalle")
    public ResponseEntity<?> obtenerDetalleOportunidad(@PathVariable String wan) {
        try {
            log.info("[Audatex] GET /oportunidades/{}/detalle", wan);
            Map<String, Object> detalle = audatexService.obtenerDetalleOportunidad(wan);
            return ResponseEntity.ok(detalle);
        } catch (Exception e) {
            log.error("[Audatex] Error obteniendo detalle de oportunidad {}: {}", wan, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error consultando detalle en Audatex: " + e.getMessage()));
        }
    }

    @GetMapping("/pedidos")
    public ResponseEntity<?> obtenerPedidos() {
        try {
            log.info("[Audatex] GET /pedidos");
            java.util.List<java.util.Map<String, Object>> pedidos = audatexService.obtenerPedidosConItems();
            return ResponseEntity.ok(java.util.Map.of("total", pedidos.size(), "pedidos", pedidos));
        } catch (Exception e) {
            log.error("[Audatex] Error consultando pedidos: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno: " + e.getMessage()));
        }
    }

    /**
     * @deprecated El frontend ahora exporta a Excel localmente desde los datos de BD.
     */
    @Deprecated
    @GetMapping("/oportunidades/export")
    public ResponseEntity<byte[]> exportarExcel(
            @RequestParam(required = false) String armadora,
            @RequestParam(required = false) String aseguradora,
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(required = false) Integer minPendientes) {

        try {
            List<Map<String, Object>> datos = audatexService.buscarConFiltros(
                    armadora, aseguradora, desde, hasta, minPendientes);
            byte[] excelBytes = excelService.generarExcel(datos);

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmm"));
            String filename = "oportunidades_inpart_" + timestamp + ".xlsx";

            log.info("[Audatex] Excel exportado: {} filas → {}", datos.size(), filename);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                    .contentType(MediaType.parseMediaType(
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(excelBytes);
        } catch (IOException e) {
            log.error("[Audatex] Error generando Excel: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(null);
        }
    }

    @PostMapping("/cache/invalidar")
    public ResponseEntity<?> invalidarCache() {
        audatexService.invalidarCache();
        return ResponseEntity.ok(Map.of("mensaje", "Caché invalidado. El próximo request consultará el portal."));
    }

    @GetMapping("/status")
    public ResponseEntity<?> status() {
        return ResponseEntity.ok(Map.of(
                "integracion", "Audatex InPart",
                "estado", "activo",
                "timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        ));
    }
}
