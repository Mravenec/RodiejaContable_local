package com.rodiejacontable.rodiejacontable.service.reportes;

import com.rodiejacontable.rodiejacontable.repository.UsersRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

/**
 * Planificador y orquestador central para la generación y envío automático de reportes mensuales.
 * Se ejecuta automáticamente el día 1 de cada mes a las 6:00 AM (hora Costa Rica).
 * Aplica el patrón Strategy para iterar sobre todas las tareas {@link ReporteMensualTask} registradas.
 */
@Service
public class ReportesMensualesScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReportesMensualesScheduler.class);

    private final List<ReporteMensualTask> reportesTasks;
    private final UsersRepository usersRepository;

    @Value("${reportes.email.test-only-kimberly:true}")
    private boolean testOnlyKimberly;

    @Value("${reportes.email.test-address:kimfh1996@gmail.com}")
    private String testAddress;

    public ReportesMensualesScheduler(List<ReporteMensualTask> reportesTasks, UsersRepository usersRepository) {
        this.reportesTasks = reportesTasks != null ? reportesTasks : Collections.emptyList();
        this.usersRepository = usersRepository;
    }

    /**
     * Tarea programada que se dispara a las 6:00 AM el día 1 de cada mes (Zona Costa Rica).
     * Toma el mes inmediatamente anterior (mes cerrado) y ejecuta todos los reportes habilitados.
     */
    @Scheduled(cron = "0 0 6 1 * ?", zone = "America/Costa_Rica")
    public void ejecutarTareaProgramada() {
        log.info("[ReportesMensualesScheduler] Disparando cron automático mensual del día 1...");
        // El reporte del día 1 corresponde al cierre del mes anterior
        YearMonth mesAnterior = YearMonth.from(LocalDate.now().minusMonths(1));
        ejecutarReportesMensuales(mesAnterior, null);
    }

    /**
     * Orquesta la ejecución de todos los reportes mensuales.
     * Puede ser invocado tanto por el scheduler automático como manualmente desde un endpoint REST.
     *
     * @param periodo                Período a procesar (si es null, usa el mes anterior).
     * @param destinatariosOverride  Destinatarios explícitos (si es null, resuelve según rol ADMIN / modo test).
     * @return Resumen detallado del resultado de cada reporte ejecutado.
     */
    public Map<String, Object> ejecutarReportesMensuales(YearMonth periodo, String[] destinatariosOverride) {
        YearMonth targetPeriodo = (periodo != null) ? periodo : YearMonth.from(LocalDate.now().minusMonths(1));
        String[] destinatariosFinales = (destinatariosOverride != null && destinatariosOverride.length > 0)
                ? destinatariosOverride
                : resolverDestinatarios();

        log.info("[ReportesMensualesScheduler] Iniciando ejecución de reportes para el período: {} hacia: {}",
                targetPeriodo, Arrays.toString(destinatariosFinales));

        Map<String, Object> resultadoGlobal = new LinkedHashMap<>();
        resultadoGlobal.put("periodo", targetPeriodo.toString());
        resultadoGlobal.put("destinatarios", destinatariosFinales);
        resultadoGlobal.put("fechaEjecucion", new Date());

        List<Map<String, Object>> detalleReportes = new ArrayList<>();
        int exitosos = 0;
        int fallidos = 0;
        int omitidos = 0;

        for (ReporteMensualTask task : reportesTasks) {
            Map<String, Object> itemResultado = new LinkedHashMap<>();
            itemResultado.put("reporte", task.getNombre());
            itemResultado.put("clave", task.getClave());

            if (!task.isHabilitado()) {
                itemResultado.put("estado", "OMITIDO");
                itemResultado.put("mensaje", "La tarea se encuentra deshabilitada por configuración");
                detalleReportes.add(itemResultado);
                omitidos++;
                log.info("[ReportesMensualesScheduler] Reporte '{}' omitido (deshabilitado).", task.getNombre());
                continue;
            }

            try {
                task.generarYEnviar(targetPeriodo, destinatariosFinales);
                itemResultado.put("estado", "EXITOSO");
                itemResultado.put("mensaje", "Generado y enviado correctamente");
                exitosos++;
                log.info("[ReportesMensualesScheduler] Reporte '{}' completado con éxito.", task.getNombre());
            } catch (Exception e) {
                fallidos++;
                itemResultado.put("estado", "ERROR");
                itemResultado.put("error", e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
                log.error("[ReportesMensualesScheduler] Error al procesar reporte '{}': {}", task.getNombre(), e.getMessage(), e);
            }

            detalleReportes.add(itemResultado);
        }

        resultadoGlobal.put("exitosos", exitosos);
        resultadoGlobal.put("fallidos", fallidos);
        resultadoGlobal.put("omitidos", omitidos);
        resultadoGlobal.put("reportes", detalleReportes);

        log.info("[ReportesMensualesScheduler] Finalizado. Éxitos: {}, Fallos: {}, Omitidos: {}", exitosos, fallidos, omitidos);
        return resultadoGlobal;
    }

    private String[] resolverDestinatarios() {
        if (testOnlyKimberly) {
            log.info("[ReportesMensualesScheduler] Modo Pruebas Activo: Enviando únicamente a {}", testAddress);
            return new String[]{testAddress};
        }

        try {
            List<String> adminEmails = usersRepository.findActiveAdminEmails();
            if (adminEmails != null && !adminEmails.isEmpty()) {
                return adminEmails.toArray(String[]::new);
            }
        } catch (Exception e) {
            log.error("[ReportesMensualesScheduler] Error obteniendo correos de administradores: {}", e.getMessage(), e);
        }

        return new String[]{testAddress};
    }
}
