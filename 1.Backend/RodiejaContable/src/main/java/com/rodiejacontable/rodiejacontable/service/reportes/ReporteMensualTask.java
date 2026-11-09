package com.rodiejacontable.rodiejacontable.service.reportes;

import java.time.YearMonth;

/**
 * Contrato base para las tareas de generación y envío automático de reportes mensuales.
 * Implementa el patrón Strategy para permitir que nuevos reportes a futuro se agreguen
 * sin modificar la lógica del planificador (Principio Open/Closed de SOLID).
 */
public interface ReporteMensualTask {

    /**
     * Nombre descriptivo del reporte para logs y trazabilidad.
     */
    String getNombre();

    /**
     * Identificador clave para configuración (ej: "repuestos", "vehiculos", "ventas").
     */
    String getClave();

    /**
     * Indica si esta tarea está habilitada para ejecutarse automáticamente.
     */
    boolean isHabilitado();

    /**
     * Genera los cálculos, el Excel y envía el correo correspondiente al período indicado.
     *
     * @param periodo       Mes y año del reporte (usualmente el mes cerrado anterior).
     * @param destinatarios Destinatarios del correo electrónico.
     * @throws Exception en caso de fallo durante el cálculo o envío.
     */
    void generarYEnviar(YearMonth periodo, String[] destinatarios) throws Exception;
}
