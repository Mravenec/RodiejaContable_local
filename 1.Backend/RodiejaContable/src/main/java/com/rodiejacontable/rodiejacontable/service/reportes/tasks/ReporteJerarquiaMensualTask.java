package com.rodiejacontable.rodiejacontable.service.reportes.tasks;

import com.rodiejacontable.database.jooq.tables.pojos.VistaResumenGeneraciones;
import com.rodiejacontable.rodiejacontable.repository.VistaResumenGeneracionesRepository;
import com.rodiejacontable.rodiejacontable.service.EmailService;
import com.rodiejacontable.rodiejacontable.service.EmailTemplateService;
import com.rodiejacontable.rodiejacontable.service.reportes.ReporteExcelGeneratorService;
import com.rodiejacontable.rodiejacontable.service.reportes.ReporteMensualTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * Tarea mensual para generar y enviar el Reporte Jerárquico de Rentabilidad y Stock por Generación.
 * Estructura jerárquica: Marca -> Modelo -> Generación.
 */
@Component
public class ReporteJerarquiaMensualTask implements ReporteMensualTask {

    private static final Logger log = LoggerFactory.getLogger(ReporteJerarquiaMensualTask.class);

    private final VistaResumenGeneracionesRepository generacionesRepository;
    private final ReporteExcelGeneratorService excelGeneratorService;
    private final EmailTemplateService emailTemplateService;
    private final EmailService emailService;

    @Value("${reportes.mensuales.jerarquia.enabled:true}")
    private boolean habilitado;

    public ReporteJerarquiaMensualTask(
            VistaResumenGeneracionesRepository generacionesRepository,
            ReporteExcelGeneratorService excelGeneratorService,
            EmailTemplateService emailTemplateService,
            EmailService emailService) {
        this.generacionesRepository = generacionesRepository;
        this.excelGeneratorService = excelGeneratorService;
        this.emailTemplateService = emailTemplateService;
        this.emailService = emailService;
    }

    @Override
    public String getNombre() {
        return "Reporte Jerárquico de Rentabilidad por Generación";
    }

    @Override
    public String getClave() {
        return "jerarquia";
    }

    @Override
    public boolean isHabilitado() {
        return habilitado;
    }

    @Override
    public void generarYEnviar(YearMonth periodo, String[] destinatarios) throws Exception {
        log.info("[ReporteJerarquiaMensualTask] Iniciando generación para el período: {}", periodo);

        String nombreMes = periodo.getMonth().getDisplayName(TextStyle.FULL, new Locale("es", "CR"));
        nombreMes = nombreMes.substring(0, 1).toUpperCase() + nombreMes.substring(1);
        String periodoNombre = nombreMes + " " + periodo.getYear();

        List<VistaResumenGeneraciones> generaciones = generacionesRepository.findAll();

        // Ordenar jerárquicamente: Marca ASC, Modelo ASC, Generación ASC
        generaciones.sort(Comparator
                .comparing((VistaResumenGeneraciones g) -> g.getMarca() != null ? g.getMarca() : "")
                .thenComparing(g -> g.getModelo() != null ? g.getModelo() : "")
                .thenComparing(g -> g.getGeneracion() != null ? g.getGeneracion() : "")
        );

        long totalVehiculos = 0;
        long totalRepuestos = 0;
        double totalInversion = 0.0;
        double totalIngresos = 0.0;
        double balanceNeto = 0.0;

        for (VistaResumenGeneraciones g : generaciones) {
            if (g.getTotalVehiculos() != null) totalVehiculos += g.getTotalVehiculos();
            if (g.getTotalRepuestos() != null) totalRepuestos += g.getTotalRepuestos();
            if (g.getTotalInversion() != null) totalInversion += g.getTotalInversion().doubleValue();
            if (g.getTotalIngresos() != null) totalIngresos += g.getTotalIngresos().doubleValue();
            if (g.getBalanceNeto() != null) balanceNeto += g.getBalanceNeto().doubleValue();
        }

        // 1. Generar Excel Jerárquico (Hoja 1: Resumen por Marca, Hoja 2: Jerarquía Detallada)
        byte[] excelBytes = excelGeneratorService.generarExcelJerarquia(periodoNombre, generaciones);

        // 2. Generar Plantilla HTML Corporativa y Responsiva
        String htmlContent = emailTemplateService.generarHtmlReporteJerarquia(
                periodoNombre,
                generaciones.size(),
                totalVehiculos,
                totalRepuestos,
                totalInversion,
                totalIngresos,
                balanceNeto,
                "Envío automático mensual correspondiente al rendimiento y rentabilidad jerárquica de vehículos y repuestos por generación."
        );

        // 3. Enviar Correo
        String asunto = "Rodieja Contable - Reporte Jerárquico de Generaciones y Rentabilidad (" + periodoNombre + ")";
        String filename = "Reporte_Jerarquia_Generaciones_" + periodo.getYear() + "_" + String.format("%02d", periodo.getMonthValue()) + ".xlsx";

        emailService.sendEmailWithAttachment(
                destinatarios,
                asunto,
                htmlContent,
                excelBytes,
                filename,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        log.info("[ReporteJerarquiaMensualTask] Correo enviado exitosamente a {} con {} generaciones analizadas.",
                destinatarios.length, generaciones.size());
    }
}
