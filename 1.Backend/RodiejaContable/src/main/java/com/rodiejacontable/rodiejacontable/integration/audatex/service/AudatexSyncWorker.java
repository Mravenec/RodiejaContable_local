package com.rodiejacontable.rodiejacontable.integration.audatex.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
public class AudatexSyncWorker {

    private static final Logger log = LoggerFactory.getLogger(AudatexSyncWorker.class);
    private final AudatexService audatexService;

    public AudatexSyncWorker(AudatexService audatexService) {
        this.audatexService = audatexService;
    }

    // Hot Zone: Últimos 3 días, cada 30 minutos
    @Scheduled(fixedDelayString = "1800000")
    public void syncHotZone() {
        log.info("[AudatexSyncWorker] Sincronizando Hot Zone (últimos 3 días)...");
        LocalDate today = LocalDate.now();
        String desde = today.minusDays(3).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        String hasta = today.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        
        audatexService.syncRange(desde, hasta);
    }

    // Warm Zone: Días 4 al 15, cada 6 horas
    @Scheduled(fixedDelayString = "21600000")
    public void syncWarmZone() {
        log.info("[AudatexSyncWorker] Sincronizando Warm Zone (días 4 al 15)...");
        LocalDate today = LocalDate.now();
        String desde = today.minusDays(15).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        String hasta = today.minusDays(4).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        
        audatexService.syncRange(desde, hasta);
    }

    // Cold Zone: Días 16 al 30, cada 24 horas (ej. a las 3:00 AM)
    @Scheduled(cron = "0 0 3 * * ?")
    public void syncColdZone() {
        log.info("[AudatexSyncWorker] Sincronizando Cold Zone (días 16 al 30)...");
        LocalDate today = LocalDate.now();
        String desde = today.minusDays(30).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        String hasta = today.minusDays(16).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        
        audatexService.syncRange(desde, hasta);
    }

    // Barredora: Oportunidades no vistas en 24h se marcan cerradas (cada 12h)
    @Scheduled(fixedDelayString = "43200000")
    public void pruneStaleRecords() {
        log.info("[AudatexSyncWorker] Ejecutando limpieza de registros huérfanos...");
        int cerrados = audatexService.markStaleAsClosed(24);
        log.info("[AudatexSyncWorker] Se marcaron {} registros como CERRADOS", cerrados);
    }
}
