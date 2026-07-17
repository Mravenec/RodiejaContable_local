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
import com.rodiejacontable.rodiejacontable.repository.AudatexOportunidadesSyncRepository;
import com.rodiejacontable.rodiejacontable.repository.TransaccionesFinancierasRepository;
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
    private final AudatexOportunidadesSyncRepository audatexOportunidadesSyncRepository;
    private final TransaccionesFinancierasRepository transaccionesFinancierasRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final java.util.concurrent.atomic.AtomicBoolean syncIncrementalEnCurso = new java.util.concurrent.atomic.AtomicBoolean(
            false);

    private static final int SYNC_INCREMENTAL_DIAS = 30;

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
            AudatexOportunidadesSyncRepository audatexOportunidadesSyncRepository,
            TransaccionesFinancierasRepository transaccionesFinancierasRepository) {
        this.client = client;
        this.audatexEnviosRepository = audatexEnviosRepository;
        this.inventarioRepuestosRepository = inventarioRepuestosRepository;
        this.vehiculosRepository = vehiculosRepository;
        this.generacionesRepository = generacionesRepository;
        this.modelosRepository = modelosRepository;
        this.marcasRepository = marcasRepository;
        this.audatexOportunidadesSyncRepository = audatexOportunidadesSyncRepository;
        this.transaccionesFinancierasRepository = transaccionesFinancierasRepository;
    }

    /**
     * @deprecated Usar getOportunidadesFromDb y la tabla materializada en BD.
     */
    @Deprecated
    @Cacheable(value = "audatexOportunidades", key = "'todas'")
    public List<Map<String, Object>> obtenerTodasOportunidades() throws IOException {
        log.info("[AudatexService] Cache MISS — fetching desde portal");
        return client.buscarTodasOportunidades();
    }

    /**
     * @deprecated Usar getOportunidadesFromDb y la tabla materializada en BD.
     */
    @Deprecated
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
            Integer minPendientes) {

        List<Map<String, Object>> todas = getOportunidadesFromDb(armadora, aseguradora, desde, hasta, minPendientes);

        log.info(
                "[AudatexService] buscarConFiltros - filtro armadora={}, aseguradora={}, desde={}, hasta={}, minPendientes={}",
                armadora, aseguradora, desde, hasta, minPendientes);
        log.info("[AudatexService] buscarConFiltros - total desde BD: {}", todas.size());
        return todas;
    }

    /**
     * Versión SSE: emite cada oportunidad individualmente conforme se scrapea el
     * portal.
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
        // Se activa cuando el cliente cierra la conexión
        // (onCompletion/onTimeout/onError).
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
                                if (desdeDate == null)
                                    return true;
                                java.time.LocalDate fecha = parsePortalDate(texto(o, "fechaCotizacion"));
                                return fecha != null && !fecha.isBefore(desdeDate);
                            })
                            .filter(o -> {
                                if (hastaDate == null)
                                    return true;
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
                                java.util.List<java.util.Map<String, String>> repuestos = (java.util.List<java.util.Map<String, String>>) detalles
                                        .get("repuestos");
                                oportunidad.put("repuestos", repuestos);
                                oportunidad.put("datosCotizacion", detalles.get("datosCotizacion"));

                                if (detalles.get("datosCotizacion") instanceof java.util.Map) {
                                    java.util.Map<String, String> dt = (java.util.Map<String, String>) detalles
                                            .get("datosCotizacion");
                                    if (dt.containsKey("Marca"))
                                        oportunidad.put("marca", dt.get("Marca"));
                                    if (dt.containsKey("Modelo") && !dt.get("Modelo").trim().isEmpty()) {
                                        oportunidad.put("modelo", dt.get("Modelo"));
                                    } else if (dt.containsKey("Descripción") && !dt.get("Descripción").trim().isEmpty()) {
                                        oportunidad.put("modelo", dt.get("Descripción"));
                                    }
                                    
                                    if (dt.containsKey("Año Modelo"))
                                        oportunidad.put("anio", dt.get("Año Modelo"));
                                    if (dt.containsKey("Matricula"))
                                        oportunidad.put("matricula", dt.get("Matricula"));
                                    if (dt.containsKey("Chasis"))
                                        oportunidad.put("chasis", dt.get("Chasis"));
                                }

                                // Guardar en BD al instante
                                String modeloStr = oportunidad.get("modelo") != null
                                        ? oportunidad.get("modelo").toString()
                                        : null;
                                String anioStr = oportunidad.get("anio") != null ? oportunidad.get("anio").toString()
                                        : null;
                                String repJson = null;
                                try {
                                    repJson = objectMapper.writeValueAsString(detalles);
                                } catch (Exception ignored) {
                                }
                                upsertOportunidad(oportunidad, modeloStr, anioStr, repJson);

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
                    log.info(
                            "[AudatexService][Stream] Stream cancelado (cliente desconectado). Filas antes de cancelar: {}",
                            totalEnviado.get());
                } else {
                    log.error("[AudatexService][Stream] Error durante streaming: {}", e.getMessage(), e);
                    try {
                        emitter.send(SseEmitter.event()
                                .name("error")
                                .data("{\"error\":\"" + e.getMessage().replace("\"", "'") + "\"}"));
                    } catch (Exception ignored) {
                    }
                    emitter.completeWithError(e);
                }
            } catch (Exception e) {
                log.error("[AudatexService][Stream] Error durante streaming: {}", e.getMessage(), e);
                try {
                    emitter.send(SseEmitter.event()
                            .name("error")
                            .data("{\"error\":\"" + e.getMessage().replace("\"", "'") + "\"}"));
                } catch (Exception ignored) {
                }
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
        Integer generacionId = null;
        String marcaStr = null;
        String modeloStr = null;
        Integer anioExacto = null;
        Integer anioInicio = null;
        Integer anioFin = null;
        String codigoVehiculoStr = "Genérico";

        if (vehiculoOrigenId != null) {
            Vehiculos vehiculo = vehiculosRepository.findById(vehiculoOrigenId).orElse(null);
            if (vehiculo != null) {
                generacionId = vehiculo.getGeneracionId();
                codigoVehiculoStr = vehiculo.getCodigoVehiculo();
                anioExacto = vehiculo.getAnio();
            }
        } else {
            // Es repuesto genérico, obtener generación de la transacción original
            Integer genId = transaccionesFinancierasRepository.findGeneracionIdByRepuestoId(repuestoId);
            if (genId != null) {
                generacionId = genId;
            }
        }

        if (generacionId == null) {
            return Map.of(
                    "total", 0,
                    "oportunidades", List.of(),
                    "mensaje", "Repuesto sin vehículo origen ni generación asignada");
        }

        Generaciones generacion = generacionesRepository.findById(generacionId).orElse(null);
        Modelos modelo = generacion != null ? modelosRepository.findById(generacion.getModeloId()).orElse(null) : null;
        Marcas marca = modelo != null ? marcasRepository.findById(modelo.getMarcaId()).orElse(null) : null;

        if (marca != null)
            marcaStr = marca.getNombre();
        if (modelo != null)
            modeloStr = modelo.getNombre();
        if (generacion != null && vehiculoOrigenId == null) {
            // Solo usar rango si es genérico
            anioInicio = (int) generacion.getAnioInicio();
            anioFin = (int) generacion.getAnioFin();
        }

        final String fMarca = marcaStr;
        final String fModelo = modeloStr;
        final Integer fAnioExacto = anioExacto;
        final Integer fInicio = anioInicio;
        final Integer fFin = anioFin;
        final boolean esGenerico = (vehiculoOrigenId == null);

        List<Map<String, Object>> todas = self.getOportunidadesFromDb();
        List<Map<String, Object>> resultado = todas.stream()
                .filter(o -> {
                    if (esGenerico) {
                        return coincideVehiculoRango(o, fMarca, fModelo, fInicio, fFin);
                    } else {
                        return coincideVehiculo(o, fMarca, fModelo, fAnioExacto);
                    }
                })
                .collect(Collectors.toList());

        return Map.of(
                "total", resultado.size(),
                "oportunidades", resultado,
                "vehiculoOrigen", Map.of(
                        "id", vehiculoOrigenId != null ? vehiculoOrigenId : 0,
                        "codigo", codigoVehiculoStr,
                        "armadoraInferida",
                        (marcaStr != null ? marcaStr : "") + " " + (modeloStr != null ? modeloStr : "")));
    }

    public Map<Integer, Long> obtenerOportunidadesBatch() throws IOException {
        List<Map<String, Object>> todasOportunidades = self.getOportunidadesFromDb();
        if (todasOportunidades.isEmpty()) {
            return Map.of();
        }

        Map<Integer, Long> counts = new HashMap<>();

        // 1. Repuestos CON vehículo origen (año exacto)
        var repuestosConVehiculo = inventarioRepuestosRepository.getRepuestosConVehiculoOrigen();

        for (var r : repuestosConVehiculo) {
            Integer id = (Integer) r.get("id");
            String marca = (String) r.get("marca_nombre");
            String modelo = (String) r.get("modelo_nombre");
            Integer anioExacto = (Integer) r.get("anio_exacto");

            long count = todasOportunidades.stream()
                    .filter(o -> coincideVehiculo(o, marca, modelo, anioExacto))
                    .count();

            if (count > 0) {
                counts.put(id, count);
            }
        }

        // 2. Repuestos SIN vehículo origen (rango de generación)
        var repuestosGenericos = inventarioRepuestosRepository.getRepuestosGenericos();

        for (var r : repuestosGenericos) {
            Integer id = (Integer) r.get("id");
            String marca = (String) r.get("marca_nombre");
            String modelo = (String) r.get("modelo_nombre");
            Number anioInNum = (Number) r.get("anio_inicio");
            Short anioIn = anioInNum != null ? anioInNum.shortValue() : null;
            Number anioFiNum = (Number) r.get("anio_fin");
            Short anioFi = anioFiNum != null ? anioFiNum.shortValue() : null;

            Integer aIn = anioIn != null ? (int) anioIn : null;
            Integer aFi = anioFi != null ? (int) anioFi : null;

            long count = todasOportunidades.stream()
                    .filter(o -> coincideVehiculoRango(o, marca, modelo, aIn, aFi))
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
                envio.getCondicionPieza());

        envio.setWan(envio.getCotizacionId());
        envio.setEstado(exito ? AudatexEnviosEstado.ENVIADA : AudatexEnviosEstado.PENDIENTE);
        envio.setUsuarioEnvio("dvenegas");
        envio.setNotas(exito ? "Envío exitoso" : "Fallo en envío");

        return audatexEnviosRepository.save(envio);
    }

    private boolean coincideVehiculo(Map<String, Object> o, String marca, String modelo, Integer anio) {
        StringBuilder sb = new StringBuilder();
        sb.append(texto(o, "armadora")).append(" ");
        sb.append(texto(o, "modelo")).append(" ");
        sb.append(texto(o, "anio")).append(" ");

        Object datosObj = o.get("datosCotizacion");
        if (datosObj instanceof Map) {
            Map<?, ?> datos = (Map<?, ?>) datosObj;
            sb.append(datos.get("Descripción")).append(" ");
            sb.append(datos.get("Armadora")).append(" ");
            sb.append(datos.get("Año Modelo")).append(" ");
            sb.append(datos.get("Año Fabricación")).append(" ");
        }

        String textoCombinado = normalizarTexto(sb.toString());

        if (marca != null && !marca.trim().isEmpty() && !textoCombinado.contains(normalizarTexto(marca)))
            return false;
        if (modelo != null && !modelo.trim().isEmpty() && !textoCombinado.contains(normalizarTexto(modelo)))
            return false;
        if (anio != null && !textoCombinado.contains(anio.toString()))
            return false;

        return true;
    }

    private boolean coincideVehiculoRango(Map<String, Object> o, String marca, String modelo, Integer anioInicio,
            Integer anioFin) {
        StringBuilder sb = new StringBuilder();
        sb.append(texto(o, "armadora")).append(" ");
        sb.append(texto(o, "modelo")).append(" ");
        sb.append(texto(o, "anio")).append(" ");

        Object datosObj = o.get("datosCotizacion");
        if (datosObj instanceof Map) {
            Map<?, ?> datos = (Map<?, ?>) datosObj;
            sb.append(datos.get("Descripción")).append(" ");
            sb.append(datos.get("Armadora")).append(" ");
            sb.append(datos.get("Año Modelo")).append(" ");
            sb.append(datos.get("Año Fabricación")).append(" ");
        }

        String textoCombinado = normalizarTexto(sb.toString());

        if (marca != null && !marca.trim().isEmpty() && !textoCombinado.contains(normalizarTexto(marca)))
            return false;
        if (modelo != null && !modelo.trim().isEmpty() && !textoCombinado.contains(normalizarTexto(modelo)))
            return false;

        if (anioInicio != null && anioFin != null) {
            boolean coincideAnio = false;
            for (int i = anioInicio; i <= anioFin; i++) {
                if (textoCombinado.contains(String.valueOf(i))) {
                    coincideAnio = true;
                    break;
                }
            }
            if (!coincideAnio)
                return false;
        }

        return true;
    }

    private String normalizarTexto(String texto) {
        if (texto == null)
            return "";
        // Convertir a minúsculas
        String lower = texto.toLowerCase().trim();
        // Normalizar para separar los caracteres de sus tildes/diacríticos
        String normalizado = java.text.Normalizer.normalize(lower, java.text.Normalizer.Form.NFD);
        // Eliminar todos los caracteres diacríticos (marcas de acentos)
        return normalizado.replaceAll("\\p{M}", "");
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
        java.time.LocalDateTime syncInicio = java.time.LocalDateTime.now();
        try {
            List<Map<String, Object>> ops = client.buscarTodasOportunidades(desde, hasta);
            int insertadas = 0;
            int actualizadas = 0;

            for (Map<String, Object> op : ops) {
                try {
                    String wan = texto(op, "wan");
                    if (wan == null || wan.isEmpty())
                        continue;

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
                            java.util.Map<String, String> dt = (java.util.Map<String, String>) detalles
                                    .get("datosCotizacion");
                            if (dt.containsKey("Modelo") && !dt.get("Modelo").trim().isEmpty()) {
                                modelo = dt.get("Modelo");
                            } else if (dt.containsKey("Descripción") && !dt.get("Descripción").trim().isEmpty()) {
                                modelo = dt.get("Descripción");
                            }
                            if (dt.containsKey("Año Modelo"))
                                anio = dt.get("Año Modelo");
                        }
                        try {
                            repuestosJson = objectMapper.writeValueAsString(detalles);
                        } catch (Exception e) {
                        }
                    }

                    // JOOQ Upsert con try-catch individual para evitar abortar el batch por
                    // DataTruncation
                    try {
                        int affected = upsertOportunidad(op, modelo, anio, repuestosJson);

                        if (affected == 1)
                            insertadas++;
                        else if (affected == 2)
                            actualizadas++;

                        if (affected > 0) {
                            java.util.Map<String, Object> delta = new java.util.HashMap<>(op);
                            delta.put("modelo", modelo);
                            delta.put("anio", anio);
                            boolean isCerrada = pendientes != null && pendientes == 0;
                            delta.put("estado", isCerrada ? "CERRADA" : "ACTIVA");
                            delta.put("cerrada", isCerrada);
                            if (detalles != null) {
                                if (detalles.get("repuestos") != null) {
                                    delta.put("repuestos", detalles.get("repuestos"));
                                }
                                if (detalles.get("datosCotizacion") != null) {
                                    delta.put("datosCotizacion", detalles.get("datosCotizacion"));
                                }
                            }
                            enrichConMatchInventario(java.util.List.of(delta));
                            com.rodiejacontable.rodiejacontable.integration.audatex.controller.AudatexController
                                    .emitirDelta(delta);
                        }
                    } catch (Exception dbEx) {
                        log.warn("[AudatexService] Error guardando oportunidad WAN {}: {}", wan, dbEx.getMessage());
                    }
                } catch (Exception exFila) {
                    log.warn("[AudatexService] Error procesando oportunidad en syncRange: {}", exFila.getMessage());
                }
            }
            int cerrados = markStaleAsClosed(24);
            int cerradosEnRango = markStaleInRangeNotSeenSince(syncInicio, desde, hasta);
            log.info(
                    "[AudatexService] Sync finalizado. Insertadas: {}, Actualizadas: {}, CERRADA stale: {}, CERRADA en rango: {}",
                    insertadas, actualizadas, cerrados, cerradosEnRango);
        } catch (Exception e) {
            log.error("[AudatexService] Error en syncRange: {}", e.getMessage(), e);
        }
    }

    /**
     * Dispara sync de 30 días en background. Retorna de inmediato si no hay otro
     * sync en curso.
     */
    public boolean iniciarSyncIncremental() {
        if (!syncIncrementalEnCurso.compareAndSet(false, true)) {
            log.info("[AudatexService] Sync incremental ya en curso — ignorando solicitud duplicada");
            return false;
        }
        java.time.LocalDate hoy = java.time.LocalDate.now();
        java.time.LocalDate desde = hoy.minusDays(SYNC_INCREMENTAL_DIAS);
        java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String desdeStr = desde.format(fmt);
        String hastaStr = hoy.format(fmt);

        Thread t = new Thread(() -> {
            try {
                log.info("[AudatexService] Sync incremental 30d iniciado ({} → {})", desdeStr, hastaStr);
                syncRange(desdeStr, hastaStr);
            } finally {
                syncIncrementalEnCurso.set(false);
            }
        }, "audatex-sync-incremental");
        t.setDaemon(true);
        t.start();
        return true;
    }

    public boolean isSyncIncrementalEnCurso() {
        return syncIncrementalEnCurso.get();
    }

    /**
     * Tras un sync de rango: cierra ACTIVAS en ventana de fechas que no fueron
     * vistas en esta pasada.
     */
    private int markStaleInRangeNotSeenSince(java.time.LocalDateTime syncInicio, String desde, String hasta) {
        java.time.LocalDate desdeDate = parsePortalDate(desde);
        java.time.LocalDate hastaDate = parsePortalDate(hasta);
        if (desdeDate == null && desde != null)
            desdeDate = parseFilterDateFromDdMmYyyy(desde);
        if (hastaDate == null && hasta != null)
            hastaDate = parseFilterDateFromDdMmYyyy(hasta);

        List<Map<String, Object>> candidatas = audatexOportunidadesSyncRepository.findCandidatasStale(syncInicio);

        int cerrados = 0;
        for (Map<String, Object> row : candidatas) {
            String fechaCot = row.get("fecha_cotizacion") != null ? row.get("fecha_cotizacion").toString() : null;
            java.time.LocalDate fecha = parsePortalDate(fechaCot);
            if (fecha == null)
                continue;
            if (desdeDate != null && fecha.isBefore(desdeDate))
                continue;
            if (hastaDate != null && fecha.isAfter(hastaDate))
                continue;

            String wan = row.get("wan").toString();
            int n = audatexOportunidadesSyncRepository.markAsClosed(wan);
            if (n > 0) {
                cerrados++;
                java.util.Map<String, Object> delta = new java.util.HashMap<>();
                delta.put("wan", wan);
                delta.put("cotizacionId", row.get("cotizacion_id"));
                delta.put("estado", "CERRADA");
                delta.put("cerrada", true);
                com.rodiejacontable.rodiejacontable.integration.audatex.controller.AudatexController.emitirDelta(delta);
            }
        }
        return cerrados;
    }

    private java.time.LocalDate parseFilterDateFromDdMmYyyy(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty())
            return null;
        try {
            java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
            return java.time.LocalDate.parse(dateStr.trim().split("\\s+")[0], fmt);
        } catch (Exception e) {
            return null;
        }
    }

    private int upsertOportunidad(Map<String, Object> op, String modelo, String anio, String repuestosJson) {
        String wan = texto(op, "wan");
        String armadora = texto(op, "armadora");
        String aseguradora = texto(op, "aseguradora");
        String cotizacionId = texto(op, "cotizacionId");
        String taller = texto(op, "taller");
        String poliza = texto(op, "poliza");
        String siniestro = texto(op, "siniestro");
        String matricula = texto(op, "matricula");
        String fechaCotizacion = texto(op, "fechaCotizacion");
        Integer pendientes = pendientes(op);

        return audatexOportunidadesSyncRepository.upsertOportunidad(
                wan, armadora, aseguradora, cotizacionId, taller, poliza, siniestro,
                matricula, modelo, anio, fechaCotizacion, pendientes, repuestosJson);
    }

    public int markStaleAsClosed(int hours) {
        return audatexOportunidadesSyncRepository.markStaleAsClosed(hours);
    }

    public List<Map<String, Object>> getOportunidadesFromDb() {
        return getOportunidadesFromDb(null, null, null, null, null);
    }

    public List<Map<String, Object>> getOportunidadesFromDb(
            String armadora,
            String aseguradora,
            String desde,
            String hasta,
            Integer minPendientes) {

        java.time.LocalDate desdeDate = parseFilterDate(desde);
        java.time.LocalDate hastaDate = parseFilterDate(hasta);
        if (desdeDate == null && desde != null)
            desdeDate = parseFilterDateFromDdMmYyyy(desde);
        if (hastaDate == null && hasta != null)
            hastaDate = parseFilterDateFromDdMmYyyy(hasta);

        List<Map<String, Object>> records = audatexOportunidadesSyncRepository.getOportunidadesActivas(armadora, aseguradora, minPendientes);

        List<Map<String, Object>> mapped = new java.util.ArrayList<>();
        for (Map<String, Object> r : records) {
            String fechaCot = r.get("fecha_cotizacion") != null ? r.get("fecha_cotizacion").toString() : null;
            java.time.LocalDate fecha = parsePortalDate(fechaCot);
            if (desdeDate != null && (fecha == null || fecha.isBefore(desdeDate)))
                continue;
            if (hastaDate != null && (fecha == null || fecha.isAfter(hastaDate)))
                continue;

            Map<String, Object> m = mapDbRowToOportunidad(r);
            mapped.add(m);
        }
        enrichConMatchInventario(mapped);
        return mapped;
    }

    private Map<String, Object> mapDbRowToOportunidad(Map<String, Object> r) {
        Map<String, Object> m = new java.util.HashMap<>();
        m.put("wan", r.get("wan"));
        m.put("aseguradora", r.get("aseguradora"));
        m.put("cotizacionId", r.get("cotizacion_id"));
        m.put("taller", r.get("taller"));
        m.put("poliza", r.get("poliza"));
        m.put("siniestro", r.get("siniestro"));
        m.put("matricula", r.get("matricula"));
        m.put("armadora", r.get("armadora"));
        m.put("marca", r.get("armadora"));
        m.put("modelo", r.get("modelo"));
        m.put("anio", r.get("anio"));
        m.put("fechaCotizacion", r.get("fecha_cotizacion"));
        m.put("pendientes", r.get("pendientes"));
        m.put("estado", r.get("estado") != null ? r.get("estado").toString() : null);
        m.put("ultima_vez_visto", r.get("ultima_vez_visto"));

        Object json = r.get("detalle_json");
        if (json != null) {
            try {
                Map<String, Object> detalles = objectMapper.readValue(json.toString(),
                        new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {
                        });
                m.put("repuestos", detalles.get("repuestos"));
                m.put("datosCotizacion", detalles.get("datosCotizacion"));
            } catch (Exception e) {
                log.error("[AudatexService] Error parseando detalle_json para WAN {}: {}", r.get("wan"), e.getMessage());
                m.put("repuestos", java.util.List.of());
                m.put("datosCotizacion", java.util.Map.of());
            }
        } else {
            m.put("repuestos", java.util.List.of());
            m.put("datosCotizacion", java.util.Map.of());
        }
        return m;
    }

    private List<Map<String, Object>> cacheRepVehiculo = null;
    private List<Map<String, Object>> cacheRepGenerico = null;
    private long lastCacheLoad = 0;

    private void loadInventarioCache() {
        if (System.currentTimeMillis() - lastCacheLoad > 60000 || cacheRepVehiculo == null) {
            cacheRepVehiculo = inventarioRepuestosRepository.getRepuestosConVehiculoOrigen();
            cacheRepGenerico = inventarioRepuestosRepository.getRepuestosGenericos();
            lastCacheLoad = System.currentTimeMillis();
        }
    }

    private void enrichConMatchInventario(List<Map<String, Object>> oportunidades) {
        if (oportunidades == null || oportunidades.isEmpty())
            return;

        loadInventarioCache();

        // Convertir a mapas para búsqueda O(1)
        Set<String> exactosSet = new java.util.HashSet<>();
        for (var r : cacheRepVehiculo) {
            String k = ((String) r.get("marca_nombre")).toLowerCase() + "|" 
                     + ((String) r.get("modelo_nombre")).toLowerCase() + "|" 
                     + r.get("anio_exacto");
            exactosSet.add(k);
        }

        Map<String, List<int[]>> genericosMap = new java.util.HashMap<>();
        for (var r : cacheRepGenerico) {
            String k = ((String) r.get("marca_nombre")).toLowerCase() + "|" 
                     + ((String) r.get("modelo_nombre")).toLowerCase();
            Number aInNum = (Number) r.get("anio_inicio");
            Number aFiNum = (Number) r.get("anio_fin");
            int aIn = aInNum != null ? aInNum.intValue() : 0;
            int aFi = aFiNum != null ? aFiNum.intValue() : 9999;
            genericosMap.computeIfAbsent(k, x -> new java.util.ArrayList<>()).add(new int[]{aIn, aFi});
        }

        for (Map<String, Object> o : oportunidades) {
            boolean hasMatch = false;
            
            String opMarca = (texto(o, "marca") != null ? texto(o, "marca") : texto(o, "armadora"));
            String opModelo = texto(o, "modelo");
            Integer opAnio = -1;
            try {
                opAnio = Integer.parseInt(texto(o, "anio"));
            } catch (Exception e) {}

            if (opMarca != null && opModelo != null) {
                String kExact = opMarca.toLowerCase() + "|" + opModelo.toLowerCase() + "|" + opAnio;
                if (exactosSet.contains(kExact)) {
                    hasMatch = true;
                } else {
                    String kGen = opMarca.toLowerCase() + "|" + opModelo.toLowerCase();
                    List<int[]> rangos = genericosMap.get(kGen);
                    if (rangos != null) {
                        for (int[] rango : rangos) {
                            if (opAnio >= rango[0] && opAnio <= rango[1]) {
                                hasMatch = true;
                                break;
                            }
                        }
                    }
                }
            }
            
            // Si no funcionó con los campos directos, intentar con coincideVehiculo() antiguo como fallback
            if (!hasMatch) {
                for (var r : cacheRepVehiculo) {
                    if (coincideVehiculo(o, (String) r.get("marca_nombre"), (String) r.get("modelo_nombre"), (Integer) r.get("anio_exacto"))) {
                        hasMatch = true;
                        break;
                    }
                }
                if (!hasMatch) {
                    for (var r : cacheRepGenerico) {
                        Number aInNum = (Number) r.get("anio_inicio");
                        Number aFiNum = (Number) r.get("anio_fin");
                        Integer aIn = aInNum != null ? aInNum.intValue() : null;
                        Integer aFi = aFiNum != null ? aFiNum.intValue() : null;
                        if (coincideVehiculoRango(o, (String) r.get("marca_nombre"), (String) r.get("modelo_nombre"), aIn, aFi)) {
                            hasMatch = true;
                            break;
                        }
                    }
                }
            }

            o.put("matchInventario", hasMatch);
        }
    }
}
