package com.rodiejacontable.rodiejacontable.service.reportes.tasks;

import com.rodiejacontable.database.jooq.tables.pojos.VistaTransaccionesCompletas;
import com.rodiejacontable.rodiejacontable.repository.VistaTransaccionesCompletasRepository;
import com.rodiejacontable.rodiejacontable.service.EmailService;
import com.rodiejacontable.rodiejacontable.service.EmailTemplateService;
import com.rodiejacontable.rodiejacontable.service.reportes.ReporteExcelGeneratorService;
import com.rodiejacontable.rodiejacontable.service.reportes.ReporteMensualTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Tarea mensual para generar y enviar el Reporte de Repuestos y Operaciones.
 */
@Component
public class ReporteRepuestosMensualTask implements ReporteMensualTask {

    private static final Logger log = LoggerFactory.getLogger(ReporteRepuestosMensualTask.class);

    private final VistaTransaccionesCompletasRepository transaccionesRepository;
    private final ReporteExcelGeneratorService excelGeneratorService;
    private final EmailTemplateService emailTemplateService;
    private final EmailService emailService;

    @Value("${reportes.mensuales.repuestos.enabled:true}")
    private boolean habilitado;

    public ReporteRepuestosMensualTask(
            VistaTransaccionesCompletasRepository transaccionesRepository,
            ReporteExcelGeneratorService excelGeneratorService,
            EmailTemplateService emailTemplateService,
            EmailService emailService) {
        this.transaccionesRepository = transaccionesRepository;
        this.excelGeneratorService = excelGeneratorService;
        this.emailTemplateService = emailTemplateService;
        this.emailService = emailService;
    }

    @Override
    public String getNombre() {
        return "Reporte Mensual de Repuestos";
    }

    @Override
    public String getClave() {
        return "repuestos";
    }

    @Override
    public boolean isHabilitado() {
        return habilitado;
    }

    @Override
    public void generarYEnviar(YearMonth periodo, String[] destinatarios) throws Exception {
        log.info("[ReporteRepuestosMensualTask] Iniciando generación para el período: {}", periodo);

        LocalDate fechaInicio = periodo.atDay(1);
        LocalDate fechaFin = periodo.atEndOfMonth();

        String nombreMes = periodo.getMonth().getDisplayName(TextStyle.FULL, new Locale("es", "CR"));
        nombreMes = nombreMes.substring(0, 1).toUpperCase() + nombreMes.substring(1);
        String periodoNombre = nombreMes + " " + periodo.getYear();

        List<VistaTransaccionesCompletas> todasTransacciones = transaccionesRepository.findByFechaBetween(fechaInicio, fechaFin);
        List<VistaTransaccionesCompletas> repuestosMovimientos = new ArrayList<>();

        double ingresos = 0.0;
        double egresos = 0.0;
        double comisiones = 0.0;

        for (VistaTransaccionesCompletas t : todasTransacciones) {
            String tipoLower = (t.getTipoTransaccion() != null ? t.getTipoTransaccion() : "").toLowerCase();
            boolean esMantenimiento = tipoLower.contains("mantenimiento");
            boolean esServiciosPublicos = tipoLower.contains("servicio") && (tipoLower.contains("public") || tipoLower.contains("públic"));
            boolean esSalario = tipoLower.contains("salario");
            boolean esGastoOperativo = esMantenimiento || esServiciosPublicos || esSalario;

            boolean esRepuesto = tipoLower.contains("repuesto") || tipoLower.contains("mayoreo")
                    || (t.getCodigoRepuesto() != null && !tipoLower.contains("veh"));

            if (!esRepuesto && !esGastoOperativo) {
                continue;
            }

            repuestosMovimientos.add(t);

            double monto = t.getMonto() != null ? t.getMonto().doubleValue() : 0.0;
            String cat = t.getCategoria() != null ? t.getCategoria().name().toUpperCase() : "";

            boolean comPagada = t.getComisionPagada() != null && t.getComisionPagada() > 0;
            double com = (comPagada && t.getComisionEmpleado() != null) ? t.getComisionEmpleado().doubleValue() : 0.0;

            if ("INGRESO".equals(cat) || "VENTA".equals(cat)) {
                ingresos += monto;
            } else if ("EGRESO".equals(cat) || "GASTO".equals(cat)) {
                egresos += monto;
            }
            comisiones += com;
        }

        double balanceNeto = ingresos - egresos - comisiones;

        // 1. Generar Excel de 2 hojas con Apache POI
        byte[] excelBytes = excelGeneratorService.generarExcelRepuestos(
                periodoNombre, ingresos, egresos, comisiones, balanceNeto, repuestosMovimientos
        );

        // 2. Generar Plantilla HTML
        String htmlContent = emailTemplateService.generarHtmlReporteRepuestos(
                periodoNombre, ingresos, egresos, comisiones, balanceNeto, repuestosMovimientos.size(),
                "Envío automático mensual correspondiente al cierre del mes anterior."
        );

        // 3. Enviar Correo
        String asunto = "Rodieja Contable - Reporte Oficial de Repuestos (" + periodoNombre + ")";
        String filename = "Reporte_Repuestos_" + periodo.getYear() + "_" + String.format("%02d", periodo.getMonthValue()) + ".xlsx";

        emailService.sendEmailWithAttachment(
                destinatarios,
                asunto,
                htmlContent,
                excelBytes,
                filename,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        log.info("[ReporteRepuestosMensualTask] Correo enviado exitosamente a {} con {} transacciones adjuntas.",
                destinatarios.length, repuestosMovimientos.size());
    }
}
