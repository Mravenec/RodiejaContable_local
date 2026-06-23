package com.rodiejacontable.rodiejacontable.integration.audatex.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * ROD-12 — Configuración del caché Caffeine con TTL configurable.
 * Nombres de caché:
 *   "audatexOportunidades"  — lista de cotizaciones por marca/modelo
 *   "audatexDetalle"        — detalle de un WAN específico
 */
@Configuration
@EnableCaching
public class AudatexCacheConfig {

    @Autowired
    private AudatexProperties props;

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager(
                "audatexOportunidades",
                "audatexDetalle",
                "vehiculosHierarchy"
        );
        manager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(500)
                .expireAfterWrite(props.getCacheTtlMin(), TimeUnit.MINUTES)
                .recordStats());
        return manager;
    }
}
