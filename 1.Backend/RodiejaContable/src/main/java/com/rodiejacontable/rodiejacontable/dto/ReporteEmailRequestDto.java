package com.rodiejacontable.rodiejacontable.dto;

import java.util.List;

public class ReporteEmailRequestDto {

    private List<String> destinatarios;
    private String asunto;
    private String periodo;
    private String mensajePersonalizado;
    private Double ingresos;
    private Double egresos;
    private Double comisiones;
    private Double balanceNeto;
    private Integer cantidadMovimientos;

    public ReporteEmailRequestDto() {}

    public List<String> getDestinatarios() {
        return destinatarios;
    }

    public void setDestinatarios(List<String> destinatarios) {
        this.destinatarios = destinatarios;
    }

    public String getAsunto() {
        return asunto;
    }

    public void setAsunto(String asunto) {
        this.asunto = asunto;
    }

    public String getPeriodo() {
        return periodo;
    }

    public void setPeriodo(String periodo) {
        this.periodo = periodo;
    }

    public String getMensajePersonalizado() {
        return mensajePersonalizado;
    }

    public void setMensajePersonalizado(String mensajePersonalizado) {
        this.mensajePersonalizado = mensajePersonalizado;
    }

    public Double getIngresos() {
        return ingresos;
    }

    public void setIngresos(Double ingresos) {
        this.ingresos = ingresos;
    }

    public Double getEgresos() {
        return egresos;
    }

    public void setEgresos(Double egresos) {
        this.egresos = egresos;
    }

    public Double getComisiones() {
        return comisiones;
    }

    public void setComisiones(Double comisiones) {
        this.comisiones = comisiones;
    }

    public Double getBalanceNeto() {
        return balanceNeto;
    }

    public void setBalanceNeto(Double balanceNeto) {
        this.balanceNeto = balanceNeto;
    }

    public Integer getCantidadMovimientos() {
        return cantidadMovimientos;
    }

    public void setCantidadMovimientos(Integer cantidadMovimientos) {
        this.cantidadMovimientos = cantidadMovimientos;
    }

    @Override
    public String toString() {
        return "ReporteEmailRequestDto{" +
                "destinatarios=" + destinatarios +
                ", asunto='" + asunto + '\'' +
                ", periodo='" + periodo + '\'' +
                ", ingresos=" + ingresos +
                ", egresos=" + egresos +
                ", balanceNeto=" + balanceNeto +
                '}';
    }
}
