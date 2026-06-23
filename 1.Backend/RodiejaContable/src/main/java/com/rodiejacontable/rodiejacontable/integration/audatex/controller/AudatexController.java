package com.rodiejacontable.rodiejacontable.integration.audatex.controller;

import com.rodiejacontable.database.jooq.tables.InventarioRepuestos;
import com.rodiejacontable.database.jooq.tables.Vehiculos;
import com.rodiejacontable.database.jooq.tables.records.VehiculosRecord;
import com.rodiejacontable.database.jooq.tables.AudatexEnvios;
import com.rodiejacontable.database.jooq.tables.Generaciones;
import com.rodiejacontable.database.jooq.tables.Modelos;
import com.rodiejacontable.database.jooq.tables.Marcas;
import com.rodiejacontable.rodiejacontable.integration.audatex.dto.AudatexEnvioDTO;
import com.rodiejacontable.rodiejacontable.integration.audatex.dto.AudatexFiltroDTO;
import com.rodiejacontable.rodiejacontable.integration.audatex.dto.AudatexOportunidadDTO;
import com.rodiejacontable.rodiejacontable.integration.audatex.service.AudatexExcelExportService;
import com.rodiejacontable.rodiejacontable.integration.audatex.service.AudatexService;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import org.jooq.DSLContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * ROD-13 / ROD-14 / ROD-20 / ROD-26 / ROD-24 — REST Controller para la integración Audatex InPart.
 *
 * Endpoints:
 *   GET  /api/audatex/oportunidades            — lista con filtros opcionales
 *   GET  /api/audatex/oportunidades/export     — descarga Excel XLSX
 *   GET  /api/audatex/oportunidades/por-repuesto/{id} — oportunidades para un repuesto específico
 *   GET  /api/audatex/envios/por-repuesto/{id} — envíos de cotizaciones para un repuesto específico
 *   POST /api/audatex/cotizar                  — envía una cotización al portal
 *   POST /api/audatex/cache/invalidar          — fuerza refetch (botón Sincronizar)
 *   GET  /api/audatex/status                   — estado de la integración
 */
@RestController
@RequestMapping("/api/audatex")
@CrossOrigin(origins = "*")
public class AudatexController {

    private static final Logger log = LoggerFactory.getLogger(AudatexController.class);

    private final AudatexService audatexService;
    private final AudatexExcelExportService excelService;
    private final DSLContext dsl;

    public AudatexController(AudatexService audatexService,
                              AudatexExcelExportService excelService,
                              DSLContext dsl) {
        this.audatexService = audatexService;
        this.excelService = excelService;
        this.dsl = dsl;
    }

    // ── ROD-13: GET /api/audatex/oportunidades ───────────────────────────────

    /**
     * Lista todas las oportunidades activas, opcionalmente filtradas.
     *
     * Query params (todos opcionales):
     *   armadora    — filtra por texto en marca/modelo
     *   aseguradora — filtra por aseguradora
     *   desde       — fecha mínima (aaaa-MM-dd)
     *   hasta       — fecha máxima (aaaa-MM-dd)
     *   minPendientes — solo cotizaciones con N+ piezas pendientes
     */
    @GetMapping("/oportunidades")
    public ResponseEntity<?> obtenerOportunidades(
            @RequestParam(required = false) String armadora,
            @RequestParam(required = false) String aseguradora,
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(required = false) Integer minPendientes) {

        try {
            AudatexFiltroDTO filtro = new AudatexFiltroDTO();
            filtro.setArmadora(armadora);
            filtro.setAseguradora(aseguradora);
            filtro.setDesde(desde);
            filtro.setHasta(hasta);
            filtro.setMinPendientes(minPendientes);

            List<AudatexOportunidadDTO> resultado = audatexService.buscarConFiltros(filtro);

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

    // ── ROD-20: GET /api/audatex/oportunidades/por-repuesto/{id} ───────────────

    /**
     * Obtiene oportunidades de Audatex para un repuesto específico.
     * Infiere la marca y modelo del vehículo origen del repuesto y filtra las oportunidades.
     *
     * @param repuestoId ID del repuesto en inventario_repuestos
     * @return Lista de oportunidades de Audatex que coinciden con el vehículo origen
     */
    @GetMapping("/oportunidades/por-repuesto/{repuestoId}")
    public ResponseEntity<?> obtenerOportunidadesPorRepuesto(@PathVariable Integer repuestoId) {
        try {
            // 1. Obtener el repuesto y su vehículo origen
            var repuesto = dsl.selectFrom(InventarioRepuestos.INVENTARIO_REPUESTOS)
                    .where(InventarioRepuestos.INVENTARIO_REPUESTOS.ID.eq(repuestoId))
                    .fetchOne();

            if (repuesto == null) {
                log.warn("[Audatex] Repuesto no encontrado: {}", repuestoId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Repuesto no encontrado"));
            }

            Integer vehiculoOrigenId = repuesto.getVehiculoOrigenId();
            if (vehiculoOrigenId == null) {
                log.warn("[Audatex] Repuesto sin vehículo origen: {}", repuestoId);
                return ResponseEntity.ok(Map.of(
                        "total", 0,
                        "oportunidades", List.of(),
                        "mensaje", "Repuesto sin vehículo origen"
                ));
            }

            // 2. Obtener el vehículo origen para inferir marca y modelo
            VehiculosRecord vehiculo = dsl.selectFrom(Vehiculos.VEHICULOS)
                    .where(Vehiculos.VEHICULOS.ID.eq(vehiculoOrigenId))
                    .fetchOne();

            if (vehiculo == null) {
                log.warn("[Audatex] Vehículo origen no encontrado: {}", vehiculoOrigenId);
                return ResponseEntity.ok(Map.of(
                        "total", 0,
                        "oportunidades", List.of(),
                        "mensaje", "Vehículo origen no encontrado"
                ));
            }

            // 3. Inferir marca y modelo del vehículo (normalizar para Audatex)
            String armadora = normalizarArmadoraParaAudatex(vehiculo);

            // 4. Buscar oportunidades con filtro de armadora
            AudatexFiltroDTO filtro = new AudatexFiltroDTO();
            filtro.setArmadora(armadora);

            List<AudatexOportunidadDTO> resultado = audatexService.buscarConFiltros(filtro);

            log.info("[Audatex] GET /oportunidades/por-repuesto/{} → {} resultados (armadora inferida: {})",
                    repuestoId, resultado.size(), armadora);

            return ResponseEntity.ok(Map.of(
                    "total", resultado.size(),
                    "oportunidades", resultado,
                    "vehiculoOrigen", Map.of(
                            "id", vehiculo.getId(),
                            "codigo", vehiculo.getCodigoVehiculo(),
                            "armadoraInferida", armadora
                    )
            ));

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

    /**
     * Obtiene la cantidad de oportunidades activas para todos los repuestos en stock.
     * Llamada en batch usada por el inventario (ROD-21) para evitar consultas N+1.
     */
    @GetMapping("/oportunidades/batch")
    public ResponseEntity<?> obtenerOportunidadesBatch() {
        try {
            log.info("[Audatex] GET /oportunidades/batch");

            // 1. Obtener todas las oportunidades activas
            List<AudatexOportunidadDTO> todasOportunidades = audatexService.obtenerTodasOportunidades();
            if (todasOportunidades.isEmpty()) {
                return ResponseEntity.ok(Map.of("counts", Map.of()));
            }

            // 2. Obtener todos los repuestos en stock con marca y modelo del vehículo
            var repuestos = dsl.select(
                            InventarioRepuestos.INVENTARIO_REPUESTOS.ID,
                            Marcas.MARCAS.NOMBRE.as("marca_nombre"),
                            Modelos.MODELOS.NOMBRE.as("modelo_nombre")
                    )
                    .from(InventarioRepuestos.INVENTARIO_REPUESTOS)
                    .join(Vehiculos.VEHICULOS).on(InventarioRepuestos.INVENTARIO_REPUESTOS.VEHICULO_ORIGEN_ID.eq(Vehiculos.VEHICULOS.ID))
                    .join(Generaciones.GENERACIONES).on(Vehiculos.VEHICULOS.GENERACION_ID.eq(Generaciones.GENERACIONES.ID))
                    .join(Modelos.MODELOS).on(Generaciones.GENERACIONES.MODELO_ID.eq(Modelos.MODELOS.ID))
                    .join(Marcas.MARCAS).on(Modelos.MODELOS.MARCA_ID.eq(Marcas.MARCAS.ID))
                    .where(InventarioRepuestos.INVENTARIO_REPUESTOS.ESTADO.ne(com.rodiejacontable.database.jooq.enums.InventarioRepuestosEstado.VENDIDO))
                    .fetch();

            java.util.Map<Integer, Long> counts = new java.util.HashMap<>();

            for (var r : repuestos) {
                Integer id = r.get(InventarioRepuestos.INVENTARIO_REPUESTOS.ID);
                String marca = r.get("marca_nombre", String.class);
                String modelo = r.get("modelo_nombre", String.class);

                long count = todasOportunidades.stream()
                        .filter(o -> {
                            if (o.getArmadora() == null) return false;
                            String oArmadora = o.getArmadora().toLowerCase();
                            return oArmadora.contains(marca.toLowerCase()) && 
                                   (modelo == null || oArmadora.contains(modelo.toLowerCase()));
                        })
                        .count();

                if (count > 0) {
                    counts.put(id, count);
                }
            }

            return ResponseEntity.ok(Map.of("counts", counts));

        } catch (Exception e) {
            log.error("[Audatex] Error consultando oportunidades batch: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno: " + e.getMessage()));
        }
    }

    /**
     * Normaliza la marca/modelo del vehículo para que coincida con el formato de Audatex.
     * Audatex usa formatos como "Toyota", "Honda", "Nissan", etc.
     */
    private String normalizarArmadoraParaAudatex(VehiculosRecord vehiculo) {
        // Obtener marca y modelo del vehículo a través de la generación
        var generacion = dsl.selectFrom(Generaciones.GENERACIONES)
                .where(Generaciones.GENERACIONES.ID.eq(vehiculo.getGeneracionId()))
                .fetchOne();

        if (generacion == null) {
            return "";
        }

        var modelo = dsl.selectFrom(Modelos.MODELOS)
                .where(Modelos.MODELOS.ID.eq(generacion.getModeloId()))
                .fetchOne();

        var marca = dsl.selectFrom(Marcas.MARCAS)
                .where(Marcas.MARCAS.ID.eq(modelo.getMarcaId()))
                .fetchOne();

        if (marca == null) {
            return "";
        }

        // Normalizar: primera letra mayúscula, resto minúsculas
        String marcaNormalizada = marca.getNombre().trim();
        String modeloNormalizado = modelo.getNombre().trim();

        // Combinar marca y modelo para búsqueda en Audatex
        // Audatex suele usar formato "Marca Modelo" o solo "Marca"
        return (marcaNormalizada + " " + modeloNormalizado).trim();
    }

    // ── ROD-26: POST /api/audatex/cotizar ─────────────────────────────────────

    /**
     * Envía una cotización al portal Audatex InPart.
     * ROD-28: Aplica rate limiting (max 10 envíos/min) para evitar sobrecarga del portal.
     *
     * @param envio Datos de la cotización a enviar (repuestoId, cotizacionId, precio, tiempo, condicion)
     * @return Respuesta con el resultado del envío
     */
    @PostMapping("/cotizar")
    @RateLimiter(name = "audatexEnvios", fallbackMethod = "enviarCotizacionRateLimitFallback")
    public ResponseEntity<?> enviarCotizacion(@RequestBody AudatexEnvioDTO envio) {
        try {
            log.info("[Audatex] POST /cotizar - {}", envio);

            // Validar datos de entrada
            if (envio.getRepuestoId() == null || envio.getCotizacionId() == null || 
                envio.getPrecio() == null || envio.getTiempo() == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Datos incompletos: repuestoId, cotizacionId, precio y tiempo son requeridos"));
            }

            boolean exito = audatexService.enviarCotizacion(envio);

            if (exito) {
                return ResponseEntity.ok(Map.of(
                        "mensaje", "Cotización enviada exitosamente",
                        "envio", envio,
                        "estado", "ENVIADA"
                ));
            } else {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(Map.of("error", "El portal Audatex rechazó la cotización o falló el envío"));
            }

        } catch (Exception e) {
            log.error("[Audatex] Error enviando cotización: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno: " + e.getMessage()));
        }
    }

    /**
     * Fallback method para RateLimiter.
     * Se ejecuta cuando se excede el límite de envíos por minuto.
     */
    private ResponseEntity<?> enviarCotizacionRateLimitFallback(AudatexEnvioDTO envio, Exception exception) {
        log.warn("[Audatex] Rate limit excedido en enviarCotizacion - usando fallback");
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("error", "Demasiados envíos. Por favor espere un momento antes de intentar nuevamente."));
    }

    // ── ROD-24: GET /api/audatex/envios/por-repuesto/{id} ───────────────────────

    /**
     * Obtiene los envíos de cotizaciones a Audatex para un repuesto específico.
     *
     * @param repuestoId ID del repuesto en inventario_repuestos
     * @return Lista de envíos de cotizaciones para el repuesto
     */
    @GetMapping("/envios/por-repuesto/{repuestoId}")
    public ResponseEntity<?> obtenerEnviosPorRepuesto(@PathVariable Integer repuestoId) {
        try {
            log.info("[Audatex] GET /envios/por-repuesto/{}", repuestoId);

            // Consultar envíos desde la tabla audatex_envios
            var envios = dsl.selectFrom(AudatexEnvios.AUDATEX_ENVIOS)
                    .where(AudatexEnvios.AUDATEX_ENVIOS.REPUESTO_ID.eq(repuestoId))
                    .orderBy(AudatexEnvios.AUDATEX_ENVIOS.FECHA_ENVIO.desc())
                    .fetch();

            log.info("[Audatex] {} envíos encontrados para repuesto {}", envios.size(), repuestoId);

            return ResponseEntity.ok(Map.of(
                    "total", envios.size(),
                    "envios", envios.map(r -> Map.of(
                            "id", r.getId(),
                            "cotizacionId", r.getCotizacionId(),
                            "wan", r.getWan() != null ? r.getWan() : "N/A",
                            "precioOfrecido", r.getPrecioOfrecido(),
                            "tiempoEntrega", r.getTiempoEntrega(),
                            "condicionPieza", r.getCondicionPieza() != null ? r.getCondicionPieza() : "N/A",
                            "estado", r.getEstado() != null ? r.getEstado() : "PENDIENTE",
                            "fechaEnvio", r.getFechaEnvio() != null ? r.getFechaEnvio() : "N/A",
                            "usuarioEnvio", r.getUsuarioEnvio() != null ? r.getUsuarioEnvio() : "N/A"
                    ))
            ));
        } catch (Exception e) {
            log.error("[Audatex] Error consultando envíos por repuesto: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno: " + e.getMessage()));
        }
    }

    // ── ROD-14: GET /api/audatex/oportunidades/export ───────────────────────

    /**
     * Descarga un archivo Excel XLSX con todas las oportunidades filtradas.
     * El nombre del archivo incluye la fecha de generación.
     */
    @GetMapping("/oportunidades/export")
    public ResponseEntity<byte[]> exportarExcel(
            @RequestParam(required = false) String armadora,
            @RequestParam(required = false) String aseguradora,
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(required = false) Integer minPendientes) {

        try {
            AudatexFiltroDTO filtro = new AudatexFiltroDTO();
            filtro.setArmadora(armadora);
            filtro.setAseguradora(aseguradora);
            filtro.setDesde(desde);
            filtro.setHasta(hasta);
            filtro.setMinPendientes(minPendientes);

            List<AudatexOportunidadDTO> datos = audatexService.buscarConFiltros(filtro);
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

    // ── Invalidar caché ──────────────────────────────────────────────────────

    /**
     * Limpia el caché y fuerza re-sincronización en la próxima llamada.
     * Equivale al botón "Sincronizar oportunidades" del frontend.
     */
    @PostMapping("/cache/invalidar")
    public ResponseEntity<?> invalidarCache() {
        audatexService.invalidarCache();
        return ResponseEntity.ok(Map.of("mensaje", "Caché invalidado. El próximo request consultará el portal."));
    }

    // ── Status ───────────────────────────────────────────────────────────────

    /**
     * Endpoint de diagnóstico — verifica que la integración está activa.
     */
    @GetMapping("/status")
    public ResponseEntity<?> status() {
        return ResponseEntity.ok(Map.of(
                "integracion", "Audatex InPart",
                "estado", "activo",
                "timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        ));
    }
}
