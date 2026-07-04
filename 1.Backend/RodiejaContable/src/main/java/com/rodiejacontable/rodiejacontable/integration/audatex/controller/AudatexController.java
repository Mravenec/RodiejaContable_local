package com.rodiejacontable.rodiejacontable.integration.audatex.controller;

import com.rodiejacontable.database.jooq.tables.pojos.AudatexEnvios;
import com.rodiejacontable.rodiejacontable.integration.audatex.service.AudatexExcelExportService;
import com.rodiejacontable.rodiejacontable.integration.audatex.service.AudatexService;
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
@CrossOrigin(origins = "*")
public class AudatexController {

    private static final Logger log = LoggerFactory.getLogger(AudatexController.class);

    private final AudatexService audatexService;
    private final AudatexExcelExportService excelService;
    private final com.rodiejacontable.rodiejacontable.integration.audatex.service.AudatexSyncWorker syncWorker;

    public AudatexController(AudatexService audatexService, AudatexExcelExportService excelService, com.rodiejacontable.rodiejacontable.integration.audatex.service.AudatexSyncWorker syncWorker) {
        this.audatexService = audatexService;
        this.excelService = excelService;
        this.syncWorker = syncWorker;
    }

    @GetMapping("/oportunidades/sync/force")
    public org.springframework.http.ResponseEntity<String> forceSync() {
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
        } catch (IOException e) {
            log.error("[Audatex] Error consultando oportunidades: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Portal Audatex no disponible: " + e.getMessage()));
        }
    }

    @GetMapping("/oportunidades/sync")
    public ResponseEntity<?> obtenerOportunidadesSync() {
        try {
            List<Map<String, Object>> resultado = audatexService.getOportunidadesFromDb();
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

    private static final java.util.List<SseEmitter> deltaEmitters = new java.util.concurrent.CopyOnWriteArrayList<>();

    @GetMapping("/oportunidades/sync/stream")
    public SseEmitter streamSyncDeltas() {
        SseEmitter emitter = new SseEmitter(3600_000L); // 1 hora de timeout
        deltaEmitters.add(emitter);
        emitter.onCompletion(() -> deltaEmitters.remove(emitter));
        emitter.onTimeout(() -> deltaEmitters.remove(emitter));
        emitter.onError((e) -> deltaEmitters.remove(emitter));
        
        return emitter;
    }

    public static void emitirDelta(Map<String, Object> oportunidad) {
        if (deltaEmitters.isEmpty()) return;
        
        java.util.List<SseEmitter> muertos = new java.util.ArrayList<>();
        for (SseEmitter emitter : deltaEmitters) {
            try {
                emitter.send(SseEmitter.event().name("delta").data(oportunidad));
            } catch (Exception e) {
                muertos.add(emitter);
            }
        }
        deltaEmitters.removeAll(muertos);
    }

    /**
     * SSE: emite las oportunidades página a página conforme se scraping el portal.
     * El cliente React consume con fetch() + ReadableStream para carga progresiva.
     * Timeout: 5 minutos (300 000 ms) para portales con muchas páginas.
     */
    @GetMapping(value = "/oportunidades/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamOportunidades(
            @RequestParam(required = false) String armadora,
            @RequestParam(required = false) String aseguradora,
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(required = false) Integer minPendientes) {

        // El streaming de múltiples días puede tomar bastante tiempo en Audatex. 
        // 3600_000L = 1 hora de timeout para la conexión SSE.
        SseEmitter emitter = new SseEmitter(3600_000L);
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

    @PostMapping("/cotizar")
    @RateLimiter(name = "audatexEnvios", fallbackMethod = "enviarCotizacionRateLimitFallback")
    public ResponseEntity<?> enviarCotizacion(@RequestBody AudatexEnvios envio) {
        try {
            log.info("[Audatex] POST /cotizar - repuesto {} cotización {}", envio.getRepuestoId(), envio.getCotizacionId());

            if (envio.getRepuestoId() == null || envio.getCotizacionId() == null
                    || envio.getPrecioOfrecido() == null || envio.getTiempoEntrega() == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Datos incompletos: repuestoId, cotizacionId, precioOfrecido y tiempoEntrega son requeridos"));
            }

            AudatexEnvios guardado = audatexService.enviarCotizacion(envio);

            if (com.rodiejacontable.database.jooq.enums.AudatexEnviosEstado.ENVIADA.equals(guardado.getEstado())) {
                return ResponseEntity.ok(Map.of(
                        "mensaje", "Cotización enviada exitosamente",
                        "envio", guardado,
                        "estado", "ENVIADA"
                ));
            }

            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "El portal Audatex rechazó la cotización o falló el envío"));
        } catch (Exception e) {
            log.error("[Audatex] Error enviando cotización: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno: " + e.getMessage()));
        }
    }

    private ResponseEntity<?> enviarCotizacionRateLimitFallback(AudatexEnvios envio, Exception exception) {
        log.warn("[Audatex] Rate limit excedido en enviarCotizacion - usando fallback");
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("error", "Demasiados envíos. Por favor espere un momento antes de intentar nuevamente."));
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

    @GetMapping("/envios/por-repuesto/{repuestoId}")
    public ResponseEntity<?> obtenerEnviosPorRepuesto(@PathVariable Integer repuestoId) {
        try {
            log.info("[Audatex] GET /envios/por-repuesto/{}", repuestoId);
            List<AudatexEnvios> envios = audatexService.obtenerEnviosPorRepuesto(repuestoId);
            log.info("[Audatex] {} envíos encontrados para repuesto {}", envios.size(), repuestoId);
            return ResponseEntity.ok(Map.of("total", envios.size(), "envios", envios));
        } catch (Exception e) {
            log.error("[Audatex] Error consultando envíos por repuesto: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno: " + e.getMessage()));
        }
    }

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
