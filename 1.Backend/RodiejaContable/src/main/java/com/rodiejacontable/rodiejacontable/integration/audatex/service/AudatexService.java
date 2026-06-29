package com.rodiejacontable.rodiejacontable.integration.audatex.service;

import com.rodiejacontable.database.jooq.enums.AudatexEnviosEstado;
import com.rodiejacontable.database.jooq.enums.InventarioRepuestosEstado;
import com.rodiejacontable.database.jooq.tables.pojos.AudatexEnvios;
import com.rodiejacontable.database.jooq.tables.pojos.Generaciones;
import com.rodiejacontable.database.jooq.tables.pojos.InventarioRepuestos;
import com.rodiejacontable.database.jooq.tables.pojos.Marcas;
import com.rodiejacontable.database.jooq.tables.pojos.Modelos;
import com.rodiejacontable.database.jooq.tables.pojos.Vehiculos;
import com.rodiejacontable.rodiejacontable.integration.audatex.client.AudatexClient;
import com.rodiejacontable.rodiejacontable.repository.AudatexEnviosRepository;
import com.rodiejacontable.rodiejacontable.repository.GeneracionesRepository;
import com.rodiejacontable.rodiejacontable.repository.InventarioRepuestosRepository;
import com.rodiejacontable.rodiejacontable.repository.MarcasRepository;
import com.rodiejacontable.rodiejacontable.repository.ModelosRepository;
import com.rodiejacontable.rodiejacontable.repository.VehiculosRepository;
import org.jooq.DSLContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import static com.rodiejacontable.database.jooq.Tables.GENERACIONES;
import static com.rodiejacontable.database.jooq.Tables.INVENTARIO_REPUESTOS;
import static com.rodiejacontable.database.jooq.Tables.MARCAS;
import static com.rodiejacontable.database.jooq.Tables.MODELOS;
import static com.rodiejacontable.database.jooq.Tables.VEHICULOS;

@Service
public class AudatexService {

    private static final Logger log = LoggerFactory.getLogger(AudatexService.class);

    private final AudatexClient client;
    private final AudatexEnviosRepository audatexEnviosRepository;
    private final InventarioRepuestosRepository inventarioRepuestosRepository;
    private final VehiculosRepository vehiculosRepository;
    private final GeneracionesRepository generacionesRepository;
    private final ModelosRepository modelosRepository;
    private final MarcasRepository marcasRepository;
    private final DSLContext dsl;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    @Lazy
    private AudatexService self;

    public AudatexService(
            AudatexClient client,
            AudatexEnviosRepository audatexEnviosRepository,
            InventarioRepuestosRepository inventarioRepuestosRepository,
            VehiculosRepository vehiculosRepository,
            GeneracionesRepository generacionesRepository,
            ModelosRepository modelosRepository,
            MarcasRepository marcasRepository,
            DSLContext dsl) {
        this.client = client;
        this.audatexEnviosRepository = audatexEnviosRepository;
        this.inventarioRepuestosRepository = inventarioRepuestosRepository;
        this.vehiculosRepository = vehiculosRepository;
        this.generacionesRepository = generacionesRepository;
        this.modelosRepository = modelosRepository;
        this.marcasRepository = marcasRepository;
        this.dsl = dsl;
    }

    @Cacheable(value = "audatexOportunidades", key = "'todas'")
    public List<Map<String, Object>> obtenerTodasOportunidades() throws IOException {
        log.info("[AudatexService] Cache MISS — fetching desde portal");
        return client.buscarTodasOportunidades();
    }

    @Cacheable(value = "audatexOportunidades", key = "(#desde != null ? #desde : '') + '_' + (#hasta != null ? #hasta : '')")
    public List<Map<String, Object>> obtenerTodasOportunidades(String desde, String hasta) throws IOException {
        log.info("[AudatexService] Cache MISS — fetching desde portal para desde={}, hasta={}", desde, hasta);
        return client.buscarTodasOportunidades(desde, hasta);
    }

    public List<Map<String, Object>> buscarConFiltros(
            String armadora,
            String aseguradora,
            String desde,
            String hasta,
            Integer minPendientes) throws IOException {

        List<Map<String, Object>> todas = self.obtenerTodasOportunidades(desde, hasta);

        log.info("[AudatexService] buscarConFiltros - filtro armadora={}, aseguradora={}, desde={}, hasta={}, minPendientes={}",
                armadora, aseguradora, desde, hasta, minPendientes);
        log.info("[AudatexService] buscarConFiltros - total recuperadas: {}", todas.size());

        java.time.LocalDate desdeDate = parseFilterDate(desde);
        java.time.LocalDate hastaDate = parseFilterDate(hasta);

        List<Map<String, Object>> res = todas.stream()
                .filter(o -> filtroTexto(armadora, texto(o, "armadora")))
                .filter(o -> filtroTexto(aseguradora, texto(o, "aseguradora")))
                .filter(o -> minPendientes == null || pendientes(o) >= minPendientes)
                .filter(o -> {
                    if (desdeDate == null) return true;
                    java.time.LocalDate fecha = parsePortalDate(texto(o, "fechaCotizacion"));
                    return fecha != null && !fecha.isBefore(desdeDate);
                })
                .filter(o -> {
                    if (hastaDate == null) return true;
                    java.time.LocalDate fecha = parsePortalDate(texto(o, "fechaCotizacion"));
                    return fecha != null && !fecha.isAfter(hastaDate);
                })
                .collect(Collectors.toList());

        log.info("[AudatexService] buscarConFiltros - total final: {}", res.size());
        return res;
    }

    /**
     * Versión SSE: emite cada oportunidad individualmente conforme se scrapea el portal.
     * El caller (controller) retorna el SseEmitter antes de que arranque este hilo.
     * Cuando finaliza emite el evento "done" con el total y completa el emitter.
     */
    public void streamOportunidades(
            String armadora, String aseguradora,
            String desde, String hasta,
            Integer minPendientes,
            SseEmitter emitter) {

        java.time.LocalDate desdeDate = parseFilterDate(desde);
        java.time.LocalDate hastaDate = parseFilterDate(hasta);

        // Flag que el loop de scraping consulta antes de cada página.
        // Se activa cuando el cliente cierra la conexión (onCompletion/onTimeout/onError).
        AtomicBoolean cancelled = new AtomicBoolean(false);
        emitter.onCompletion(() -> {
            if (cancelled.compareAndSet(false, true))
                log.info("[AudatexService][Stream] Emitter completado — loop de scraping se detendrá");
        });
        emitter.onTimeout(() -> {
            if (cancelled.compareAndSet(false, true))
                log.warn("[AudatexService][Stream] Emitter timeout — loop de scraping se detendrá");
        });
        emitter.onError(ex -> {
            if (cancelled.compareAndSet(false, true))
                log.warn("[AudatexService][Stream] Emitter error ({}) — loop de scraping se detendrá", ex.getMessage());
        });

        new Thread(() -> {
            AtomicInteger totalEnviado = new AtomicInteger(0);
            Set<String> cotizacionIdsVistos = new HashSet<>();
            try {
                client.buscarTodasOportunidadesStreaming(desde, hasta, pagina -> {
                    // Si el cliente cerró la conexión, lanzar para cortar el loop de paginación
                    if (cancelled.get()) {
                        throw new RuntimeException("cliente desconectado");
                    }

                    List<Map<String, Object>> filtrada = pagina.stream()
                            .filter(o -> filtroTexto(armadora, texto(o, "armadora")))
                            .filter(o -> filtroTexto(aseguradora, texto(o, "aseguradora")))
                            .filter(o -> minPendientes == null || pendientes(o) >= minPendientes)
                            .filter(o -> {
                                if (desdeDate == null) return true;
                                java.time.LocalDate fecha = parsePortalDate(texto(o, "fechaCotizacion"));
                                return fecha != null && !fecha.isBefore(desdeDate);
                            })
                            .filter(o -> {
                                if (hastaDate == null) return true;
                                java.time.LocalDate fecha = parsePortalDate(texto(o, "fechaCotizacion"));
                                return fecha != null && !fecha.isAfter(hastaDate);
                            })
                            .filter(o -> {
                                String id = texto(o, "cotizacionId");
                                return id != null && cotizacionIdsVistos.add(id);
                            })
                            .collect(Collectors.toList());

                    for (Map<String, Object> oportunidad : filtrada) {
                        if (cancelled.get()) {
                            throw new RuntimeException("cliente desconectado");
                        }
                        try {
                            // Obtener repuestos inline antes de emitir
                            String wan = texto(oportunidad, "wan");
                            if (wan != null && !wan.isEmpty()) {
                                java.util.Map<String, Object> detalles = client.obtenerDetallesDeCotizacion(wan);
                                java.util.List<java.util.Map<String, String>> repuestos = (java.util.List<java.util.Map<String, String>>) detalles.get("repuestos");
                                oportunidad.put("repuestos", repuestos);
                                oportunidad.put("datosCotizacion", detalles.get("datosCotizacion"));
                                
                                if (detalles.get("datosCotizacion") instanceof java.util.Map) {
                                    java.util.Map<String, String> dt = (java.util.Map<String, String>) detalles.get("datosCotizacion");
                                    if (dt.containsKey("Marca")) oportunidad.put("marca", dt.get("Marca"));
                                    if (dt.containsKey("Modelo")) oportunidad.put("modelo", dt.get("Modelo"));
                                    if (dt.containsKey("Año Modelo")) oportunidad.put("anio", dt.get("Año Modelo"));
                                    if (dt.containsKey("Matricula")) oportunidad.put("matricula", dt.get("Matricula"));
                                    if (dt.containsKey("Chasis")) oportunidad.put("chasis", dt.get("Chasis"));
                                }
                                
                                log.debug("[AudatexService][Stream] WAN {} → {} repuesto(s)", wan, repuestos.size());
                            } else {
                                oportunidad.put("repuestos", java.util.List.of());
                            }

                            emitter.send(SseEmitter.event()
                                    .name("oportunidad")
                                    .data(objectMapper.writeValueAsString(oportunidad)));
                            int total = totalEnviado.incrementAndGet();
                            if (total % 10 == 0) {
                                log.info("[AudatexService][Stream] {} oportunidades emitidas", total);
                            }
                        } catch (Exception ex) {
                            cancelled.set(true);
                            throw new RuntimeException("error enviando SSE: " + ex.getMessage(), ex);
                        }
                    }
                });

                if (!cancelled.get()) {
                    emitter.send(SseEmitter.event()
                            .name("done")
                            .data("{\"total\":" + totalEnviado.get() + "}"));
                    emitter.complete();
                    log.info("[AudatexService][Stream] Completado. Total emitido: {}", totalEnviado.get());
                }

            } catch (RuntimeException e) {
                if (cancelled.get()) {
                    log.info("[AudatexService][Stream] Stream cancelado (cliente desconectado). Filas antes de cancelar: {}",
                            totalEnviado.get());
                } else {
                    log.error("[AudatexService][Stream] Error durante streaming: {}", e.getMessage(), e);
                    try {
                        emitter.send(SseEmitter.event()
                                .name("error")
                                .data("{\"error\":\"" + e.getMessage().replace("\"", "'") + "\"}"));
                    } catch (Exception ignored) {}
                    emitter.completeWithError(e);
                }
            } catch (Exception e) {
                log.error("[AudatexService][Stream] Error durante streaming: {}", e.getMessage(), e);
                try {
                    emitter.send(SseEmitter.event()
                            .name("error")
                            .data("{\"error\":\"" + e.getMessage().replace("\"", "'") + "\"}"));
                } catch (Exception ignored) {}
                emitter.completeWithError(e);
            }
        }, "audatex-stream").start();
    }

    public Map<String, Object> obtenerOportunidadesPorRepuesto(Integer repuestoId) throws IOException {
        InventarioRepuestos repuesto = inventarioRepuestosRepository.findById(repuestoId).orElse(null);
        if (repuesto == null) {
            return Map.of("notFound", true);
        }

        Integer vehiculoOrigenId = repuesto.getVehiculoOrigenId();
        if (vehiculoOrigenId == null) {
            return Map.of(
                    "total", 0,
                    "oportunidades", List.of(),
                    "mensaje", "Repuesto sin vehículo origen"
            );
        }

        Vehiculos vehiculo = vehiculosRepository.findById(vehiculoOrigenId).orElse(null);
        if (vehiculo == null) {
            return Map.of(
                    "total", 0,
                    "oportunidades", List.of(),
                    "mensaje", "Vehículo origen no encontrado"
            );
        }

        String armadora = normalizarArmadoraParaAudatex(vehiculo);
        List<Map<String, Object>> resultado = buscarConFiltros(armadora, null, null, null, null);

        return Map.of(
                "total", resultado.size(),
                "oportunidades", resultado,
                "vehiculoOrigen", Map.of(
                        "id", vehiculo.getId(),
                        "codigo", vehiculo.getCodigoVehiculo(),
                        "armadoraInferida", armadora
                )
        );
    }

    public Map<Integer, Long> obtenerOportunidadesBatch() throws IOException {
        List<Map<String, Object>> todasOportunidades = self.obtenerTodasOportunidades();
        if (todasOportunidades.isEmpty()) {
            return Map.of();
        }

        var repuestos = dsl.select(
                        INVENTARIO_REPUESTOS.ID,
                        MARCAS.NOMBRE.as("marca_nombre"),
                        MODELOS.NOMBRE.as("modelo_nombre")
                )
                .from(INVENTARIO_REPUESTOS)
                .join(VEHICULOS).on(INVENTARIO_REPUESTOS.VEHICULO_ORIGEN_ID.eq(VEHICULOS.ID))
                .join(GENERACIONES).on(VEHICULOS.GENERACION_ID.eq(GENERACIONES.ID))
                .join(MODELOS).on(GENERACIONES.MODELO_ID.eq(MODELOS.ID))
                .join(MARCAS).on(MODELOS.MARCA_ID.eq(MARCAS.ID))
                .where(INVENTARIO_REPUESTOS.ESTADO.ne(InventarioRepuestosEstado.VENDIDO))
                .fetch();

        Map<Integer, Long> counts = new HashMap<>();
        for (var r : repuestos) {
            Integer id = r.get(INVENTARIO_REPUESTOS.ID);
            String marca = r.get("marca_nombre", String.class);
            String modelo = r.get("modelo_nombre", String.class);

            long count = todasOportunidades.stream()
                    .filter(o -> {
                        String oArmadora = texto(o, "armadora");
                        if (oArmadora == null) return false;
                        String lower = oArmadora.toLowerCase();
                        return lower.contains(marca.toLowerCase())
                                && (modelo == null || lower.contains(modelo.toLowerCase()));
                    })
                    .count();

            if (count > 0) {
                counts.put(id, count);
            }
        }
        return counts;
    }

    public Map<String, Object> obtenerDetalleOportunidad(String wan) throws IOException {
        return client.obtenerDetalleCotizacion(wan);
    }

    public List<AudatexEnvios> obtenerEnviosPorRepuesto(Integer repuestoId) {
        return audatexEnviosRepository.findByRepuestoId(repuestoId);
    }

    @CacheEvict(value = "audatexOportunidades", allEntries = true)
    public void invalidarCache() {
        log.info("[AudatexService] Caché de oportunidades invalidado manualmente");
    }

    @CacheEvict(value = "audatexOportunidades", allEntries = true)
    public AudatexEnvios enviarCotizacion(AudatexEnvios envio) throws IOException {
        log.info("[AudatexService] Enviando cotización para repuesto {} - Cotización {}",
                envio.getRepuestoId(), envio.getCotizacionId());

        boolean exito = client.enviarCotizacion(
                envio.getCotizacionId(),
                envio.getPrecioOfrecido().toString(),
                envio.getTiempoEntrega(),
                envio.getCondicionPieza()
        );

        envio.setWan(envio.getCotizacionId());
        envio.setEstado(exito ? AudatexEnviosEstado.ENVIADA : AudatexEnviosEstado.PENDIENTE);
        envio.setUsuarioEnvio("dvenegas");
        envio.setNotas(exito ? "Envío exitoso" : "Fallo en envío");

        return audatexEnviosRepository.save(envio);
    }

    private String normalizarArmadoraParaAudatex(Vehiculos vehiculo) {
        Generaciones generacion = generacionesRepository.findById(vehiculo.getGeneracionId()).orElse(null);
        if (generacion == null) {
            return "";
        }

        Modelos modelo = modelosRepository.findById(generacion.getModeloId()).orElse(null);
        if (modelo == null) {
            return "";
        }

        Marcas marca = marcasRepository.findById(modelo.getMarcaId()).orElse(null);
        if (marca == null) {
            return "";
        }

        return (marca.getNombre().trim() + " " + modelo.getNombre().trim()).trim();
    }

    private static String texto(Map<String, Object> o, String key) {
        Object value = o.get(key);
        return value != null ? value.toString() : null;
    }

    private static int pendientes(Map<String, Object> o) {
        Object value = o.get("pendientes");
        return value instanceof Number ? ((Number) value).intValue() : 0;
    }

    private static boolean filtroTexto(String filtro, String valor) {
        return filtro == null || filtro.trim().isEmpty()
                || (valor != null && valor.toLowerCase().contains(filtro.toLowerCase()));
    }

    private java.time.LocalDate parsePortalDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return null;
        }
        try {
            String datePart = dateStr.trim().split("\\s+")[0];
            String[] parts = datePart.split("/");
            if (parts.length == 3) {
                int day = Integer.parseInt(parts[0]);
                int month = Integer.parseInt(parts[1]);
                int year = Integer.parseInt(parts[2]);
                return java.time.LocalDate.of(year, month, day);
            }
        } catch (Exception e) {
            log.warn("[AudatexService] No se pudo parsear la fecha del portal '{}': {}", dateStr, e.getMessage());
        }
        return null;
    }

    private java.time.LocalDate parseFilterDate(String isoDate) {
        if (isoDate == null || isoDate.trim().isEmpty()) {
            return null;
        }
        try {
            return java.time.LocalDate.parse(isoDate.trim());
        } catch (Exception e) {
            log.warn("[AudatexService] No se pudo parsear la fecha de filtro '{}': {}", isoDate, e.getMessage());
        }
        return null;
    }

    public void syncRange(String desde, String hasta) {
        log.info("[AudatexService] Sincronizando rango desde={} hasta={}...", desde, hasta);
        try {
            List<Map<String, Object>> ops = client.buscarTodasOportunidades(desde, hasta);
            int insertadas = 0;
            int actualizadas = 0;
            
            for (Map<String, Object> op : ops) {
                String wan = texto(op, "wan");
                if (wan == null || wan.isEmpty()) continue;
                
                String armadora = texto(op, "armadora");
                String aseguradora = texto(op, "aseguradora");
                String cotizacionId = texto(op, "cotizacionId");
                String taller = texto(op, "taller");
                String poliza = texto(op, "poliza");
                String siniestro = texto(op, "siniestro");
                String matricula = texto(op, "matricula");
                String fechaCotizacion = texto(op, "fechaCotizacion");
                Integer pendientes = pendientes(op);
                
                // Fetch detalle para modelo y año (opcional para sync rápido)
                java.util.Map<String, Object> detalles = client.obtenerDetallesDeCotizacion(wan);
                String modelo = null;
                String anio = null;
                String repuestosJson = null;
                
                if (detalles != null) {
                    if (detalles.get("datosCotizacion") instanceof java.util.Map) {
                        java.util.Map<String, String> dt = (java.util.Map<String, String>) detalles.get("datosCotizacion");
                        if (dt.containsKey("Modelo")) modelo = dt.get("Modelo");
                        if (dt.containsKey("Año Modelo")) anio = dt.get("Año Modelo");
                    }
                    try {
                        repuestosJson = objectMapper.writeValueAsString(detalles);
                    } catch (Exception e) {}
                }

                // JOOQ Upsert
                int affected = dsl.insertInto(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC)
                    .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.WAN, wan)
                    .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.ASEGURADORA, aseguradora)
                    .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.COTIZACION_ID, cotizacionId)
                    .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.TALLER, taller)
                    .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.POLIZA, poliza)
                    .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.SINIESTRO, siniestro)
                    .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.MATRICULA, matricula)
                    .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.ARMADORA, armadora)
                    .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.MODELO, modelo)
                    .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.ANIO, anio)
                    .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.FECHA_COTIZACION, fechaCotizacion)
                    .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.PENDIENTES, pendientes)
                    .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.ESTADO, com.rodiejacontable.database.jooq.enums.AudatexOportunidadesSyncEstado.ACTIVA)
                    .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.ULTIMA_VEZ_VISTO, java.time.LocalDateTime.now())
                    .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.DETALLE_JSON, repuestosJson)
                    .onDuplicateKeyUpdate()
                    .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.ULTIMA_VEZ_VISTO, java.time.LocalDateTime.now())
                    .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.PENDIENTES, pendientes)
                    .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.DETALLE_JSON, repuestosJson)
                    .execute();
                
                if (affected == 1) insertadas++;
                else if (affected == 2) actualizadas++;
                
                if (affected > 0) {
                    java.util.Map<String, Object> delta = new java.util.HashMap<>(op);
                    delta.put("modelo", modelo);
                    delta.put("anio", anio);
                    if (detalles != null && detalles.get("repuestos") != null) {
                        delta.put("repuestos", detalles.get("repuestos"));
                    }
                    com.rodiejacontable.rodiejacontable.integration.audatex.controller.AudatexController.emitirDelta(delta);
                }
            }
            log.info("[AudatexService] Sync finalizado. Insertadas: {}, Actualizadas: {}", insertadas, actualizadas);
        } catch (Exception e) {
            log.error("[AudatexService] Error en syncRange: {}", e.getMessage(), e);
        }
    }

    public int markStaleAsClosed(int hours) {
        return dsl.update(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC)
            .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.ESTADO, com.rodiejacontable.database.jooq.enums.AudatexOportunidadesSyncEstado.CERRADA)
            .where(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.ESTADO.eq(com.rodiejacontable.database.jooq.enums.AudatexOportunidadesSyncEstado.ACTIVA))
            .and(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.ULTIMA_VEZ_VISTO.lt(java.time.LocalDateTime.now().minusHours(hours)))
            .execute();
    }

    public List<Map<String, Object>> getOportunidadesFromDb() {
        List<Map<String, Object>> records = dsl.selectFrom(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC)
            .where(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.ESTADO.eq(com.rodiejacontable.database.jooq.enums.AudatexOportunidadesSyncEstado.ACTIVA))
            .orderBy(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.ULTIMA_VEZ_VISTO.desc())
            .fetchMaps();
            
        List<Map<String, Object>> mapped = new java.util.ArrayList<>();
        for (Map<String, Object> r : records) {
            Map<String, Object> m = new java.util.HashMap<>();
            m.put("wan", r.get("wan"));
            m.put("aseguradora", r.get("aseguradora"));
            m.put("cotizacionId", r.get("cotizacion_id"));
            m.put("taller", r.get("taller"));
            m.put("poliza", r.get("poliza"));
            m.put("siniestro", r.get("siniestro"));
            m.put("matricula", r.get("matricula"));
            m.put("armadora", r.get("armadora"));
            m.put("marca", r.get("armadora")); // fallback for frontend
            m.put("modelo", r.get("modelo"));
            m.put("anio", r.get("anio"));
            m.put("fechaCotizacion", r.get("fecha_cotizacion"));
            m.put("pendientes", r.get("pendientes"));
            m.put("estado", r.get("estado") != null ? r.get("estado").toString() : null);
            m.put("ultima_vez_visto", r.get("ultima_vez_visto"));
            
            Object json = r.get("detalle_json");
            if (json != null) {
                try {
                    Map<String, Object> detalles = objectMapper.readValue(json.toString(), new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
                    m.put("repuestos", detalles.get("repuestos"));
                    m.put("datosCotizacion", detalles.get("datosCotizacion"));
                } catch(Exception e) {
                    m.put("repuestos", java.util.List.of());
                    m.put("datosCotizacion", java.util.Map.of());
                }
            } else {
                m.put("repuestos", java.util.List.of());
                m.put("datosCotizacion", java.util.Map.of());
            }
            mapped.add(m);
        }
        return mapped;
    }
}
