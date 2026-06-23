package com.rodiejacontable.rodiejacontable.integration.audatex.dto;

import java.math.BigDecimal;

/**
 * ROD-26 — DTO para el envío de cotizaciones a Audatex InPart.
 *
 * Contiene los datos necesarios para enviar una cotización al portal:
 * - ID del repuesto en inventario
 * - ID de la cotización en Audatex (WAN)
 * - Precio ofrecido
 * - Tiempo de entrega
 * - Condición de la pieza
 */
public class AudatexEnvioDTO {

    private Integer repuestoId;
    private String cotizacionId;  // WAN o ID de la cotización en Audatex
    private BigDecimal precio;
    private String tiempo;
    private String condicion;

    public AudatexEnvioDTO() {
    }

    public AudatexEnvioDTO(Integer repuestoId, String cotizacionId, BigDecimal precio, String tiempo, String condicion) {
        this.repuestoId = repuestoId;
        this.cotizacionId = cotizacionId;
        this.precio = precio;
        this.tiempo = tiempo;
        this.condicion = condicion;
    }

    public Integer getRepuestoId() {
        return repuestoId;
    }

    public void setRepuestoId(Integer repuestoId) {
        this.repuestoId = repuestoId;
    }

    public String getCotizacionId() {
        return cotizacionId;
    }

    public void setCotizacionId(String cotizacionId) {
        this.cotizacionId = cotizacionId;
    }

    public BigDecimal getPrecio() {
        return precio;
    }

    public void setPrecio(BigDecimal precio) {
        this.precio = precio;
    }

    public String getTiempo() {
        return tiempo;
    }

    public void setTiempo(String tiempo) {
        this.tiempo = tiempo;
    }

    public String getCondicion() {
        return condicion;
    }

    public void setCondicion(String condicion) {
        this.condicion = condicion;
    }

    @Override
    public String toString() {
        return "AudatexEnvioDTO{" +
                "repuestoId=" + repuestoId +
                ", cotizacionId='" + cotizacionId + '\'' +
                ", precio=" + precio +
                ", tiempo='" + tiempo + '\'' +
                ", condicion='" + condicion + '\'' +
                '}';
    }
}
