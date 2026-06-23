package com.rodiejacontable.rodiejacontable.integration.audatex.dto;

/**
 * ROD-11/13 — DTO que representa una cotización abierta en el portal Audatex InPart.
 * Mapeado directamente desde la tabla ctl00_cphBody_gdvResult.
 */
public class AudatexOportunidadDTO {

    /** Column 0: Aseguradora / Origen del Cotización */
    private String aseguradora;

    /** Column 1: ID de la cotización en InPart */
    private String cotizacionId;

    /** Column 2: Nombre del taller mecánico */
    private String taller;

    /** Column 3: Número de póliza / documento */
    private String poliza;

    /** Column 4: ID del siniestro (WAN-like) */
    private String siniestro;

    /** Column 5: Matrícula del vehículo */
    private String matricula;

    /** Column 6: Marca y modelo del vehículo (Armadora) */
    private String armadora;

    /** Column 7: Fecha/hora de creación de la cotización */
    private String fechaCotizacion;

    /** Column 8: Número de piezas pendientes de cotizar */
    private int pendientes;

    /** Calculado: URL directa al detalle de esta cotización */
    private String urlDetalle;

    // ── Constructors ──────────────────────────────────────────────────────────

    public AudatexOportunidadDTO() {}

    // ── Getters y Setters ─────────────────────────────────────────────────────

    public String getAseguradora() { return aseguradora; }
    public void setAseguradora(String aseguradora) { this.aseguradora = aseguradora; }

    public String getCotizacionId() { return cotizacionId; }
    public void setCotizacionId(String cotizacionId) { this.cotizacionId = cotizacionId; }

    public String getTaller() { return taller; }
    public void setTaller(String taller) { this.taller = taller; }

    public String getPoliza() { return poliza; }
    public void setPoliza(String poliza) { this.poliza = poliza; }

    public String getSiniestro() { return siniestro; }
    public void setSiniestro(String siniestro) { this.siniestro = siniestro; }

    public String getMatricula() { return matricula; }
    public void setMatricula(String matricula) { this.matricula = matricula; }

    public String getArmadora() { return armadora; }
    public void setArmadora(String armadora) { this.armadora = armadora; }

    public String getFechaCotizacion() { return fechaCotizacion; }
    public void setFechaCotizacion(String fechaCotizacion) { this.fechaCotizacion = fechaCotizacion; }

    public int getPendientes() { return pendientes; }
    public void setPendientes(int pendientes) { this.pendientes = pendientes; }

    public String getUrlDetalle() { return urlDetalle; }
    public void setUrlDetalle(String urlDetalle) { this.urlDetalle = urlDetalle; }

    @Override
    public String toString() {
        return "AudatexOportunidadDTO{" +
                "cotizacionId='" + cotizacionId + '\'' +
                ", armadora='" + armadora + '\'' +
                ", aseguradora='" + aseguradora + '\'' +
                ", pendientes=" + pendientes +
                ", fechaCotizacion='" + fechaCotizacion + '\'' +
                '}';
    }
}
