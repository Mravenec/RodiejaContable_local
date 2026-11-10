package com.rodiejacontable.rodiejacontable.controller;

import com.rodiejacontable.rodiejacontable.repository.UsersRepository;
import com.rodiejacontable.rodiejacontable.service.EmailService;
import com.rodiejacontable.rodiejacontable.service.EmailTemplateService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@RestController
@RequestMapping("/api/reportes/email")
public class ReportesEmailController {

    private static final Logger logger = LoggerFactory.getLogger(ReportesEmailController.class);

    @org.springframework.beans.factory.annotation.Value("${reportes.email.test-only-kimberly:false}")
    private boolean modoPruebaDestinatarioUnico;

    @org.springframework.beans.factory.annotation.Value("${reportes.email.test-address:kimfh1996@gmail.com}")
    private String correoPrueba;

    @Autowired
    private EmailService emailService;

    @Autowired
    private EmailTemplateService emailTemplateService;

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private com.rodiejacontable.rodiejacontable.service.reportes.ReportesMensualesScheduler reportesMensualesScheduler;

    /**
     * Endpoint administrativo para disparar manualmente la generación y envío de los
     * reportes mensuales automáticos (ideal para pruebas o re-envío bajo demanda).
     */
    @PostMapping("/disparar-mensuales-ahora")
    public ResponseEntity<Map<String, Object>> dispararReportesMensuales(
            @RequestParam(value = "periodo", required = false) String periodoStr
    ) {
        try {
            java.time.YearMonth targetPeriodo = null;
            if (periodoStr != null && !periodoStr.trim().isEmpty()) {
                targetPeriodo = java.time.YearMonth.parse(periodoStr.trim());
            }

            Map<String, Object> resultado = reportesMensualesScheduler.ejecutarReportesMensuales(targetPeriodo, null);
            return ResponseEntity.ok(resultado);
        } catch (Exception e) {
            logger.error("Error al disparar reportes mensuales: {}", e.getMessage(), e);
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    /**
     * Endpoint para obtener los correos de todos los usuarios activos con rol ADMIN.
     */
    @GetMapping("/destinatarios-admin")
    public ResponseEntity<List<String>> getDestinatariosAdmin() {
        try {
            if (modoPruebaDestinatarioUnico) {
                return ResponseEntity.ok(Collections.singletonList(correoPrueba));
            }
            List<String> adminEmails = usersRepository.findActiveAdminEmails();
            return ResponseEntity.ok(adminEmails != null ? adminEmails : Collections.emptyList());
        } catch (Exception e) {
            logger.error("Error al obtener correos de administradores: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
        }
    }

    /**
     * Endpoint para enviar un correo de prueba y verificar la conexión SMTP.
     */
    @PostMapping("/prueba")
    public ResponseEntity<Map<String, Object>> enviarPrueba(@RequestParam("email") String email) {
        Map<String, Object> response = new HashMap<>();
        try {
            String asunto = "Rodieja Contable - Prueba de Conexión de Correo";
            String cuerpo = "<div style='font-family: Arial, sans-serif; padding: 20px;'>"
                    + "<h2 style='color: #001529;'>Rodieja Contable</h2>"
                    + "<p>Esta es una confirmación de que el servicio de correo electrónico está configurado y funcionando correctamente.</p>"
                    + "<p style='color: #8c8c8c; font-size: 12px;'>Fecha de envío: " + new Date() + "</p>"
                    + "</div>";

            emailService.sendHtmlEmail(new String[]{email.trim()}, asunto, cuerpo);

            response.put("success", true);
            response.put("message", "Correo de prueba enviado exitosamente a " + email);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error al enviar correo de prueba: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("error", formatErrorMessage(e));
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Endpoint para enviar el reporte de repuestos por correo.
     */
    @PostMapping(value = "/repuestos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> enviarReporteRepuestos(
            @RequestParam(value = "destinatarios", required = false) String destinatariosStr,
            @RequestParam("periodo") String periodo,
            @RequestParam(value = "asunto", required = false) String asunto,
            @RequestParam(value = "mensaje", required = false) String mensaje,
            @RequestParam(value = "ingresos", required = false, defaultValue = "0") Double ingresos,
            @RequestParam(value = "egresos", required = false, defaultValue = "0") Double egresos,
            @RequestParam(value = "comisiones", required = false, defaultValue = "0") Double comisiones,
            @RequestParam(value = "balanceNeto", required = false, defaultValue = "0") Double balanceNeto,
            @RequestParam(value = "cantidadMovimientos", required = false, defaultValue = "0") Integer cantidadMovimientos,
            @RequestParam(value = "archivo", required = false) MultipartFile archivo
    ) {
        String asuntoFinal = (asunto != null && !asunto.trim().isEmpty())
                ? asunto.trim()
                : "Rodieja Contable - Reporte de Repuestos (" + periodo + ")";

        String htmlContent = emailTemplateService.generarHtmlReporteRepuestos(
                periodo, ingresos, egresos, comisiones, balanceNeto, cantidadMovimientos, mensaje
        );

        String defaultFilename = "Reporte_Repuestos_" + periodo.replace(" ", "_") + ".xlsx";

        return procesarYEnviarCorreo(destinatariosStr, asuntoFinal, htmlContent, archivo, defaultFilename);
    }

    /**
     * Endpoint para enviar el reporte de vehículos por correo.
     */
    @PostMapping(value = "/vehiculos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> enviarReporteVehiculos(
            @RequestParam(value = "destinatarios", required = false) String destinatariosStr,
            @RequestParam("periodo") String periodo,
            @RequestParam(value = "asunto", required = false) String asunto,
            @RequestParam(value = "mensaje", required = false) String mensaje,
            @RequestParam(value = "ingresos", required = false, defaultValue = "0") Double ingresos,
            @RequestParam(value = "egresos", required = false, defaultValue = "0") Double egresos,
            @RequestParam(value = "comisiones", required = false, defaultValue = "0") Double comisiones,
            @RequestParam(value = "balanceNeto", required = false, defaultValue = "0") Double balanceNeto,
            @RequestParam(value = "cantidadVehiculos", required = false, defaultValue = "0") Integer cantidadVehiculos,
            @RequestParam(value = "archivo", required = false) MultipartFile archivo
    ) {
        String asuntoFinal = (asunto != null && !asunto.trim().isEmpty())
                ? asunto.trim()
                : "Rodieja Contable - Reporte de Vehículos (" + periodo + ")";

        String htmlContent = emailTemplateService.generarHtmlReporteVehiculos(
                periodo, ingresos, egresos, comisiones, balanceNeto, cantidadVehiculos, mensaje
        );

        String defaultFilename = "Reporte_Vehiculos_" + periodo.replace(" ", "_") + ".xlsx";

        return procesarYEnviarCorreo(destinatariosStr, asuntoFinal, htmlContent, archivo, defaultFilename);
    }

    /**
     * Endpoint para enviar el reporte de ventas por correo.
     */
    @PostMapping(value = "/ventas", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> enviarReporteVentas(
            @RequestParam(value = "destinatarios", required = false) String destinatariosStr,
            @RequestParam("periodo") String periodo,
            @RequestParam(value = "asunto", required = false) String asunto,
            @RequestParam(value = "mensaje", required = false) String mensaje,
            @RequestParam(value = "totalVentas", required = false, defaultValue = "0") Double totalVentas,
            @RequestParam(value = "totalComisiones", required = false, defaultValue = "0") Double totalComisiones,
            @RequestParam(value = "balanceNeto", required = false, defaultValue = "0") Double balanceNeto,
            @RequestParam(value = "cantidadVentas", required = false, defaultValue = "0") Integer cantidadVentas,
            @RequestParam(value = "archivo", required = false) MultipartFile archivo
    ) {
        String asuntoFinal = (asunto != null && !asunto.trim().isEmpty())
                ? asunto.trim()
                : "Rodieja Contable - Reporte de Ventas (" + periodo + ")";

        String htmlContent = emailTemplateService.generarHtmlReporteVentas(
                periodo, totalVentas, totalComisiones, balanceNeto, cantidadVentas, mensaje
        );

        String defaultFilename = "Reporte_Ventas_" + periodo.replace(" ", "_") + ".xlsx";

        return procesarYEnviarCorreo(destinatariosStr, asuntoFinal, htmlContent, archivo, defaultFilename);
    }

    /**
     * Endpoint para enviar el reporte de oportunidades de Audatex por correo.
     */
    @PostMapping(value = "/audatex", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> enviarReporteAudatex(
            @RequestParam(value = "destinatarios", required = false) String destinatariosStr,
            @RequestParam("periodo") String periodo,
            @RequestParam(value = "marcaFiltro", required = false) String marcaFiltro,
            @RequestParam(value = "asunto", required = false) String asunto,
            @RequestParam(value = "mensaje", required = false) String mensaje,
            @RequestParam(value = "totalOportunidades", required = false, defaultValue = "0") Integer totalOportunidades,
            @RequestParam(value = "archivo", required = false) MultipartFile archivo
    ) {
        String asuntoFinal = (asunto != null && !asunto.trim().isEmpty())
                ? asunto.trim()
                : "Rodieja Contable - Reporte de Oportunidades Audatex (" + periodo + ")";

        String htmlContent = emailTemplateService.generarHtmlReporteAudatex(
                periodo, marcaFiltro, totalOportunidades, mensaje
        );

        String defaultFilename = "Oportunidades_InPart_" + periodo.replace(" ", "_") + ".xlsx";

        return procesarYEnviarCorreo(destinatariosStr, asuntoFinal, htmlContent, archivo, defaultFilename);
    }

    private ResponseEntity<Map<String, Object>> procesarYEnviarCorreo(
            String destinatariosStr,
            String asuntoFinal,
            String htmlContent,
            MultipartFile archivo,
            String defaultFilename) {

        Map<String, Object> response = new HashMap<>();

        try {
            String[] destinatarios = resolverDestinatarios(destinatariosStr);

            if (destinatarios.length == 0) {
                response.put("success", false);
                response.put("error", "No se encontraron usuarios administradores activos ni se proporcionaron destinatarios válidos");
                return ResponseEntity.badRequest().body(response);
            }

            // Procesar archivo adjunto si existe
            byte[] attachmentData = null;
            String attachmentName = null;
            String mimeType = null;

            if (archivo != null && !archivo.isEmpty()) {
                attachmentData = archivo.getBytes();
                attachmentName = (archivo.getOriginalFilename() != null && !archivo.getOriginalFilename().isEmpty())
                        ? archivo.getOriginalFilename()
                        : defaultFilename;
                mimeType = archivo.getContentType() != null
                        ? archivo.getContentType()
                        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            }

            // Enviar correo
            emailService.sendEmailWithAttachment(
                    destinatarios,
                    asuntoFinal,
                    htmlContent,
                    attachmentData,
                    attachmentName,
                    mimeType
            );

            response.put("success", true);
            response.put("message", "Reporte enviado exitosamente a " + Arrays.toString(destinatarios));
            response.put("destinatarios", destinatarios);
            return ResponseEntity.ok(response);

        } catch (IOException e) {
            logger.error("Error al leer el archivo adjunto: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("error", "Error al procesar el archivo adjunto: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        } catch (Exception e) {
            logger.error("Error al enviar el reporte por correo: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("error", formatErrorMessage(e));
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    private String[] resolverDestinatarios(String destinatariosStr) {
        if (modoPruebaDestinatarioUnico) {
            return new String[]{correoPrueba};
        }

        List<String> validRecipients = new ArrayList<>();
        if (destinatariosStr != null && !destinatariosStr.trim().isEmpty()) {
            Arrays.stream(destinatariosStr.split("[,;\\s]+"))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty() && s.contains("@"))
                    .forEach(validRecipients::add);
        }

        if (validRecipients.isEmpty()) {
            List<String> adminEmails = usersRepository.findActiveAdminEmails();
            if (adminEmails != null) {
                validRecipients.addAll(adminEmails);
            }
        }
        return validRecipients.toArray(String[]::new);
    }

    private String formatErrorMessage(Exception e) {
        String msg = e.getMessage() != null ? e.getMessage() : "Error desconocido";
        if (msg.contains("Authentication failed") || msg.contains("BadCredentials") || msg.contains("535")) {
            return "Error de autenticación con el servidor de correo Gmail (535 Bad Credentials). Verifique las credenciales de correo.";
        }
        return msg;
    }
}
