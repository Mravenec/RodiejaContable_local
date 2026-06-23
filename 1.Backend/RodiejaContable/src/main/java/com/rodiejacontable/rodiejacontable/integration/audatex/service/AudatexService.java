package com.rodiejacontable.rodiejacontable.integration.audatex.service;

import com.rodiejacontable.rodiejacontable.integration.audatex.client.AudatexClient;
import com.rodiejacontable.rodiejacontable.integration.audatex.dto.AudatexFiltroDTO;
import com.rodiejacontable.rodiejacontable.integration.audatex.dto.AudatexOportunidadDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * ROD-12 — Servicio de negocio para oportunidades Audatex.
 *
 * Envuelve al AudatexClient con:
 *  - Caché Caffeine (TTL 5 min, configurable) via @Cacheable
 *  - Filtrado en memoria por marca/aseguradora/fechas/pendientes
 *  - Eviction manual del caché (para el botón "Sincronizar")
 */
@Service
public class AudatexService {

    private static final Logger log = LoggerFactory.getLogger(AudatexService.class);

    private final AudatexClient client;
    private final org.jooq.DSLContext dsl;

    @Autowired
    @Lazy
    private AudatexService self;

    public AudatexService(AudatexClient client, org.jooq.DSLContext dsl) {
        this.client = client;
        this.dsl = dsl;
    }

    /**
     * Devuelve todas las oportunidades sin filtrar, con caché de 5 min.
     * Clave de caché: "todas"
     */
    @Cacheable(value = "audatexOportunidades", key = "'todas'")
    public List<AudatexOportunidadDTO> obtenerTodasOportunidades() throws IOException {
        log.info("[AudatexService] Cache MISS — fetching desde portal");
        return client.buscarTodasOportunidades();
    }

    /**
     * Devuelve todas las oportunidades sin filtrar para un rango de fechas, con caché de 5 min.
     */
    @Cacheable(value = "audatexOportunidades", key = "(#desde != null ? #desde : '') + '_' + (#hasta != null ? #hasta : '')")
    public List<AudatexOportunidadDTO> obtenerTodasOportunidades(String desde, String hasta) throws IOException {
        log.info("[AudatexService] Cache MISS — fetching desde portal para desde={}, hasta={}", desde, hasta);
        return client.buscarTodasOportunidades(desde, hasta);
    }

    /**
     * Devuelve oportunidades aplicando los filtros del DTO.
     * Primero obtiene (o recupera del caché) la lista completa para las fechas dadas, luego filtra en memoria.
     */
    public List<AudatexOportunidadDTO> buscarConFiltros(AudatexFiltroDTO filtro) throws IOException {
        List<AudatexOportunidadDTO> todas = self.obtenerTodasOportunidades(filtro.getDesde(), filtro.getHasta());

        log.info("[AudatexService] buscarConFiltros - filtro armadora={}, aseguradora={}, desde={}, hasta={}, minPendientes={}", 
                 filtro.getArmadora(), filtro.getAseguradora(), filtro.getDesde(), filtro.getHasta(), filtro.getMinPendientes());
        log.info("[AudatexService] buscarConFiltros - total recuperadas: {}", todas.size());

        java.time.LocalDate desdeDate = parseFilterDate(filtro.getDesde());
        java.time.LocalDate hastaDate = parseFilterDate(filtro.getHasta());

        log.info("[AudatexService] buscarConFiltros - parsed desdeDate={}, hastaDate={}", desdeDate, hastaDate);

        List<AudatexOportunidadDTO> res = todas.stream()
                .filter(o -> {
                    boolean match = filtro.getArmadora() == null || filtro.getArmadora().trim().isEmpty()
                            || (o.getArmadora() != null && o.getArmadora().toLowerCase().contains(filtro.getArmadora().toLowerCase()));
                    log.debug("[AudatexService] Filtrando armadora '{}' contra '{}' -> {}", o.getArmadora(), filtro.getArmadora(), match);
                    return match;
                })
                .filter(o -> {
                    boolean match = filtro.getAseguradora() == null || filtro.getAseguradora().trim().isEmpty()
                            || (o.getAseguradora() != null && o.getAseguradora().toLowerCase().contains(filtro.getAseguradora().toLowerCase()));
                    log.debug("[AudatexService] Filtrando aseguradora '{}' contra '{}' -> {}", o.getAseguradora(), filtro.getAseguradora(), match);
                    return match;
                })
                .filter(o -> {
                    boolean match = filtro.getMinPendientes() == null
                            || o.getPendientes() >= filtro.getMinPendientes();
                    log.debug("[AudatexService] Filtrando minPendientes '{}' contra '{}' -> {}", o.getPendientes(), filtro.getMinPendientes(), match);
                    return match;
                })
                .filter(o -> {
                    if (desdeDate == null) return true;
                    java.time.LocalDate fecha = parsePortalDate(o.getFechaCotizacion());
                    boolean match = fecha != null && !fecha.isBefore(desdeDate);
                    log.debug("[AudatexService] Filtrando desdeDate: fecha cotizacion '{}' (parsed '{}') >= desde '{}' -> {}", o.getFechaCotizacion(), fecha, desdeDate, match);
                    return match;
                })
                .filter(o -> {
                    if (hastaDate == null) return true;
                    java.time.LocalDate fecha = parsePortalDate(o.getFechaCotizacion());
                    boolean match = fecha != null && !fecha.isAfter(hastaDate);
                    log.debug("[AudatexService] Filtrando hastaDate: fecha cotizacion '{}' (parsed '{}') <= hasta '{}' -> {}", o.getFechaCotizacion(), fecha, hastaDate, match);
                    return match;
                })
                .collect(Collectors.toList());

        log.info("[AudatexService] buscarConFiltros - total final: {}", res.size());
        return res;
    }

    /**
     * Evicta el caché y fuerza un refetch en la siguiente llamada.
     * Usado por el botón "Sincronizar oportunidades" en el frontend.
     */
    @CacheEvict(value = "audatexOportunidades", allEntries = true)
    public void invalidarCache() {
        log.info("[AudatexService] Caché de oportunidades invalidado manualmente");
    }

    /**
     * Envía una cotización y registra la transacción en la base de datos.
     */
    @CacheEvict(value = "audatexOportunidades", allEntries = true)
    public boolean enviarCotizacion(com.rodiejacontable.rodiejacontable.integration.audatex.dto.AudatexEnvioDTO dto) throws IOException {
        log.info("[AudatexService] Enviando cotización para repuesto {} - Cotización {}", dto.getRepuestoId(), dto.getCotizacionId());

        boolean exito = client.enviarCotizacion(
                dto.getCotizacionId(), // WAN
                dto.getPrecio().toString(),
                dto.getTiempo(),
                dto.getCondicion()
        );

        // Guardar el envío en la base de datos
        dsl.insertInto(com.rodiejacontable.database.jooq.tables.AudatexEnvios.AUDATEX_ENVIOS)
                .set(com.rodiejacontable.database.jooq.tables.AudatexEnvios.AUDATEX_ENVIOS.REPUESTO_ID, dto.getRepuestoId())
                .set(com.rodiejacontable.database.jooq.tables.AudatexEnvios.AUDATEX_ENVIOS.COTIZACION_ID, dto.getCotizacionId())
                .set(com.rodiejacontable.database.jooq.tables.AudatexEnvios.AUDATEX_ENVIOS.WAN, dto.getCotizacionId())
                .set(com.rodiejacontable.database.jooq.tables.AudatexEnvios.AUDATEX_ENVIOS.PRECIO_OFRECIDO, dto.getPrecio())
                .set(com.rodiejacontable.database.jooq.tables.AudatexEnvios.AUDATEX_ENVIOS.TIEMPO_ENTREGA, dto.getTiempo())
                .set(com.rodiejacontable.database.jooq.tables.AudatexEnvios.AUDATEX_ENVIOS.CONDICION_PIEZA, dto.getCondicion())
                .set(com.rodiejacontable.database.jooq.tables.AudatexEnvios.AUDATEX_ENVIOS.ESTADO, exito 
                        ? com.rodiejacontable.database.jooq.enums.AudatexEnviosEstado.ENVIADA 
                        : com.rodiejacontable.database.jooq.enums.AudatexEnviosEstado.PENDIENTE)
                .set(com.rodiejacontable.database.jooq.tables.AudatexEnvios.AUDATEX_ENVIOS.USUARIO_ENVIO, "dvenegas")
                .set(com.rodiejacontable.database.jooq.tables.AudatexEnvios.AUDATEX_ENVIOS.NOTAS, exito ? "Envío exitoso" : "Fallo en envío")
                .execute();

        return exito;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

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
}
