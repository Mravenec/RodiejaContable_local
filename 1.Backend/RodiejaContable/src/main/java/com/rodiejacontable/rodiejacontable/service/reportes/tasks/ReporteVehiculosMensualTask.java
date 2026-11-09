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
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Tarea mensual para generar y enviar el Reporte de Vehículos y Operaciones de Compra-Venta.
 */
@Component
public class ReporteVehiculosMensualTask implements ReporteMensualTask {

    private static final Logger log = LoggerFactory.getLogger(ReporteVehiculosMensualTask.class);

    private final VistaTransaccionesCompletasRepository transaccionesRepository;
    private final ReporteExcelGeneratorService excelGeneratorService;
    private final EmailTemplateService emailTemplateService;
    private final EmailService emailService;

    @Value("${reportes.mensuales.vehiculos.enabled:true}")
    private boolean habilitado;

    public ReporteVehiculosMensualTask(
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
        return "Reporte Mensual de Vehículos";
    }

    @Override
    public String getClave() {
        return "vehiculos";
    }

    @Override
    public boolean isHabilitado() {
        return habilitado;
    }

    @Override
    public void generarYEnviar(YearMonth periodo, String[] destinatarios) throws Exception {
        log.info("[ReporteVehiculosMensualTask] Iniciando generación para el período: {}", periodo);

        LocalDate fechaInicio = periodo.atDay(1);
        LocalDate fechaFin = periodo.atEndOfMonth();

        String nombreMes = periodo.getMonth().getDisplayName(TextStyle.FULL, new Locale("es", "CR"));
        nombreMes = nombreMes.substring(0, 1).toUpperCase() + nombreMes.substring(1);
        String periodoNombre = nombreMes + " " + periodo.getYear();

        List<VistaTransaccionesCompletas> todasTransacciones = transaccionesRepository.findByFechaBetween(fechaInicio, fechaFin);
        List<VistaTransaccionesCompletas> vehiculosMovimientos = new ArrayList<>();
        Set<String> vehiculosContados = new HashSet<>();

        double ingresos = 0.0;
        double egresos = 0.0;
        double comisiones = 0.0;

        for (VistaTransaccionesCompletas t : todasTransacciones) {
            String tipoLower = (t.getTipoTransaccion() != null ? t.getTipoTransaccion() : "").toLowerCase();
            boolean tieneVehiculo = (t.getCodigoVehiculo() != null && !t.getCodigoVehiculo().trim().isEmpty())
                    || (t.getMarca() != null && !t.getMarca().trim().isEmpty())
                    || tipoLower.contains("vehículo") || tipoLower.contains("vehiculo");

            // Excluir si es exclusivamente de repuestos sin vehículo
            if (!tieneVehiculo) {
                continue;
            }

            vehiculosMovimientos.add(t);
            if (t.getCodigoVehiculo() != null) {
                vehiculosContados.add(t.getCodigoVehiculo());
            }

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
        byte[] excelBytes = excelGeneratorService.generarExcelVehiculos(
                periodoNombre, ingresos, egresos, comisiones, balanceNeto, vehiculosMovimientos
        );

        // 2. Generar Plantilla HTML
        int cantidadVehiculos = vehiculosContados.isEmpty() ? vehiculosMovimientos.size() : vehiculosContados.size();
        String htmlContent = emailTemplateService.generarHtmlReporteVehiculos(
                periodoNombre, ingresos, egresos, comisiones, balanceNeto, cantidadVehiculos,
                "Envío automático mensual correspondiente al balance de operaciones de vehículos del mes anterior."
        );

        // 3. Enviar Correo
        String asunto = "Rodieja Contable - Reporte Oficial de Vehículos (" + periodoNombre + ")";
        String filename = "Reporte_Vehiculos_" + periodo.getYear() + "_" + String.format("%02d", periodo.getMonthValue()) + ".xlsx";

        emailService.sendEmailWithAttachment(
                destinatarios,
                asunto,
                htmlContent,
                excelBytes,
                filename,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        log.info("[ReporteVehiculosMensualTask] Correo enviado exitosamente a {} con {} transacciones adjuntas.",
                destinatarios.length, vehiculosMovimientos.size());
    }
}
