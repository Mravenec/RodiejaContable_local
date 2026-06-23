package com.rodiejacontable.rodiejacontable.integration.audatex.dto;

/**
 * ROD-13 — Filtros de búsqueda de oportunidades Audatex.
 * Todos los campos son opcionales — null = sin filtro.
 */
public class AudatexFiltroDTO {

    /** Filtrar por texto libre en el campo Armadora (marca/modelo del vehículo) */
    private String armadora;

    /** Filtrar por aseguradora */
    private String aseguradora;

    /** Fecha desde (formato yyy-MM-dd) */
    private String desde;

    /** Fecha hasta (formato yyyy-MM-dd) */
    private String hasta;

    /** Solo cotizaciones con este mínimo de piezas pendientes */
    private Integer minPendientes;

    // ── Getters y setters ─────────────────────────────────────────────────────

    public String getArmadora() { return armadora; }
    public void setArmadora(String armadora) { this.armadora = armadora; }

    public String getAseguradora() { return aseguradora; }
    public void setAseguradora(String aseguradora) { this.aseguradora = aseguradora; }

    public String getDesde() { return desde; }
    public void setDesde(String desde) { this.desde = desde; }

    public String getHasta() { return hasta; }
    public void setHasta(String hasta) { this.hasta = hasta; }

    public Integer getMinPendientes() { return minPendientes; }
    public void setMinPendientes(Integer minPendientes) { this.minPendientes = minPendientes; }
}
