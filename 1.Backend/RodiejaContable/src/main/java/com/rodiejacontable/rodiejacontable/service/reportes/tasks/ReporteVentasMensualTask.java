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
import java.util.*;

/**
 * Tarea mensual para generar y enviar el Reporte de Ventas por Empleado y Comisiones.
 */
@Component
public class ReporteVentasMensualTask implements ReporteMensualTask {

    private static final Logger log = LoggerFactory.getLogger(ReporteVentasMensualTask.class);

    private final VistaTransaccionesCompletasRepository transaccionesRepository;
    private final ReporteExcelGeneratorService excelGeneratorService;
    private final EmailTemplateService emailTemplateService;
    private final EmailService emailService;

    @Value("${reportes.mensuales.ventas.enabled:true}")
    private boolean habilitado;

    public ReporteVentasMensualTask(
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
        return "Reporte Mensual de Ventas por Empleado";
    }

    @Override
    public String getClave() {
        return "ventas";
    }

    @Override
    public boolean isHabilitado() {
        return habilitado;
    }

    @Override
    public void generarYEnviar(YearMonth periodo, String[] destinatarios) throws Exception {
        log.info("[ReporteVentasMensualTask] Iniciando generación para el período: {}", periodo);

        LocalDate fechaInicio = periodo.atDay(1);
        LocalDate fechaFin = periodo.atEndOfMonth();

        String nombreMes = periodo.getMonth().getDisplayName(TextStyle.FULL, new Locale("es", "CR"));
        nombreMes = nombreMes.substring(0, 1).toUpperCase() + nombreMes.substring(1);
        String periodoNombre = nombreMes + " " + periodo.getYear();

        List<VistaTransaccionesCompletas> todasTransacciones = transaccionesRepository.findByFechaBetween(fechaInicio, fechaFin);
        List<VistaTransaccionesCompletas> ventasFiltradas = new ArrayList<>();

        Map<String, Map<String, Object>> ventasPorEmpleado = new LinkedHashMap<>();

        double totalVentas = 0.0;
        double totalComisiones = 0.0;

        for (VistaTransaccionesCompletas t : todasTransacciones) {
            String cat = t.getCategoria() != null ? t.getCategoria().name().toUpperCase() : "";
            boolean esIngreso = "INGRESO".equals(cat) || "VENTA".equals(cat);
            boolean tieneEmpleado = t.getEmpleado() != null && !t.getEmpleado().trim().isEmpty();

            if (!esIngreso || !tieneEmpleado) {
                continue;
            }

            ventasFiltradas.add(t);

            double monto = t.getMonto() != null ? t.getMonto().doubleValue() : 0.0;
            double com = t.getComisionEmpleado() != null ? t.getComisionEmpleado().doubleValue() : 0.0;

            totalVentas += monto;
            totalComisiones += com;

            String emp = t.getEmpleado().trim();
            ventasPorEmpleado.putIfAbsent(emp, new HashMap<>());
            Map<String, Object> mapEmp = ventasPorEmpleado.get(emp);
            mapEmp.put("empleado", emp);
            mapEmp.put("cantidadVentas", ((int) mapEmp.getOrDefault("cantidadVentas", 0)) + 1);
            mapEmp.put("totalVentas", ((double) mapEmp.getOrDefault("totalVentas", 0.0)) + monto);
            mapEmp.put("totalComisiones", ((double) mapEmp.getOrDefault("totalComisiones", 0.0)) + com);
        }

        double balanceNeto = totalVentas - totalComisiones;
        List<Map<String, Object>> listaResumenVentas = new ArrayList<>(ventasPorEmpleado.values());

        // 1. Generar Excel de 2 hojas con Apache POI
        byte[] excelBytes = excelGeneratorService.generarExcelVentas(
                periodoNombre, listaResumenVentas, ventasFiltradas
        );

        // 2. Generar Plantilla HTML
        String htmlContent = emailTemplateService.generarHtmlReporteVentas(
                periodoNombre, totalVentas, totalComisiones, balanceNeto, ventasFiltradas.size(),
                "Envío automático mensual correspondiente al rendimiento de ventas y comisiones del mes anterior."
        );

        // 3. Enviar Correo
        String asunto = "Rodieja Contable - Reporte Oficial de Ventas y Comisiones (" + periodoNombre + ")";
        String filename = "Reporte_Ventas_" + periodo.getYear() + "_" + String.format("%02d", periodo.getMonthValue()) + ".xlsx";

        emailService.sendEmailWithAttachment(
                destinatarios,
                asunto,
                htmlContent,
                excelBytes,
                filename,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        log.info("[ReporteVentasMensualTask] Correo enviado exitosamente a {} con {} ventas registradas.",
                destinatarios.length, ventasFiltradas.size());
    }
}
