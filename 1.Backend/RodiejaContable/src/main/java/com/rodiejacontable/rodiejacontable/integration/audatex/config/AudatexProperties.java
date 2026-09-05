package com.rodiejacontable.rodiejacontable.integration.audatex.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * ROD-10 / ROD-11 — Type-safe binding de las propiedades audatex.*
 * Valores leídos desde application.properties, sin Jasypt en MVP.
 */
@Component
@ConfigurationProperties(prefix = "audatex")
public class AudatexProperties {

    private String username;
    private String password;
    /** Usuario alterno si el principal falla (sesión concurrente, credenciales ocupadas). */
    private String usernameFallback;
    private String passwordFallback;
    private String portalUrl;
    private String quotationSearchUrl;

    /** Minutos antes de re-autenticar la sesión */
    private int sessionTtlMin = 30;

    /** Minutos de TTL del caché Caffeine */
    private int cacheTtlMin = 5;

    /** Requests por minuto máx para no levantar alertas */
    private int maxRequestsPerMin = 30;

    /** Delay simulado entre acciones (ms) */
    private long humanDelayMs = 800;

    // ── Getters y setters ──────────────────────────────────────────────────────

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getUsernameFallback() { return usernameFallback; }
    public void setUsernameFallback(String usernameFallback) { this.usernameFallback = usernameFallback; }

    public String getPasswordFallback() { return passwordFallback; }
    public void setPasswordFallback(String passwordFallback) { this.passwordFallback = passwordFallback; }

    /** Cadena de credenciales a probar en orden (principal → fallback). */
    public List<AudatexCredential> loginCredentialChain() {
        List<AudatexCredential> chain = new ArrayList<>();
        if (username != null && !username.isBlank() && password != null) {
            chain.add(new AudatexCredential(username, password));
        }
        if (usernameFallback != null && !usernameFallback.isBlank()) {
            String fallbackPassword = passwordFallback != null && !passwordFallback.isBlank()
                    ? passwordFallback
                    : password;
            boolean duplicate = chain.stream().anyMatch(c -> c.username().equalsIgnoreCase(usernameFallback));
            if (!duplicate && fallbackPassword != null) {
                chain.add(new AudatexCredential(usernameFallback, fallbackPassword));
            }
        }
        return chain;
    }

    public record AudatexCredential(String username, String password) {}

    public String getPortalUrl() { return portalUrl; }
    public void setPortalUrl(String portalUrl) { this.portalUrl = portalUrl; }

    public String getQuotationSearchUrl() { return quotationSearchUrl; }
    public void setQuotationSearchUrl(String quotationSearchUrl) { this.quotationSearchUrl = quotationSearchUrl; }

    public int getSessionTtlMin() { return sessionTtlMin; }
    public void setSessionTtlMin(int sessionTtlMin) { this.sessionTtlMin = sessionTtlMin; }

    public int getCacheTtlMin() { return cacheTtlMin; }
    public void setCacheTtlMin(int cacheTtlMin) { this.cacheTtlMin = cacheTtlMin; }

    public int getMaxRequestsPerMin() { return maxRequestsPerMin; }
    public void setMaxRequestsPerMin(int maxRequestsPerMin) { this.maxRequestsPerMin = maxRequestsPerMin; }

    public long getHumanDelayMs() { return humanDelayMs; }
    public void setHumanDelayMs(long humanDelayMs) { this.humanDelayMs = humanDelayMs; }
}
