package com.rodiejacontable.rodiejacontable.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class EmailTemplateService {

    private static final Logger logger = LoggerFactory.getLogger(EmailTemplateService.class);
    private final NumberFormat currencyFormat;
    private final ObjectMapper objectMapper;

    public EmailTemplateService() {
        this.currencyFormat = NumberFormat.getCurrencyInstance(new Locale("es", "CR"));
        this.currencyFormat.setMaximumFractionDigits(0);
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Construye un cuerpo de correo en HTML estilizado para el reporte de repuestos (versión básica).
     */
    public String generarHtmlReporteRepuestos(
            String periodo,
            Double ingresos,
            Double egresos,
            Double comisiones,
            Double balanceNeto,
            Integer cantidadMovimientos,
            String mensajePersonalizado) {

        return generarHtmlReporteRepuestos(
                periodo, ingresos, egresos, comisiones, balanceNeto,
                cantidadMovimientos, null, mensajePersonalizado
        );
    }

    /**
     * Construye un cuerpo de correo en HTML estilizado para el reporte de repuestos y operaciones,
     * incluyendo el dashboard de indicadores financieros y el detalle de gastos operativos (Salarios, Mantenimiento, Servicios).
     */
    public String generarHtmlReporteRepuestos(
            String periodo,
            Double ingresos,
            Double egresos,
            Double comisiones,
            Double balanceNeto,
            Integer cantidadMovimientos,
            String gastosOperativosJson,
            String mensajePersonalizado) {

        String seccionOperativosHtml = construirSeccionGastosOperativos(gastosOperativosJson);

        return construirPlantillaFinanciera(
                "Reporte Oficial de Movimientos de Repuestos y Operaciones",
                "A continuación se presenta el resumen financiero consolidado de repuestos y operaciones para este periodo:",
                periodo,
                "Ingresos por Ventas",
                ingresos,
                "Egresos Operativos",
                egresos,
                "Comisiones Pagadas",
                comisiones,
                "Balance Neto",
                balanceNeto,
                "Total de movimientos procesados",
                cantidadMovimientos,
                seccionOperativosHtml,
                "Se adjunta el reporte detallado en formato Excel (.xlsx) con el desglose completo de repuestos y transacciones.",
                mensajePersonalizado
        );
    }

    /**
     * Construye un cuerpo de correo en HTML estilizado para el reporte de vehículos (versión básica).
     */
    public String generarHtmlReporteVehiculos(
            String periodo,
            Double ingresos,
            Double egresos,
            Double comisiones,
            Double balanceNeto,
            Integer cantidadVehiculos,
            String mensajePersonalizado) {

        return generarHtmlReporteVehiculos(
                periodo, ingresos, egresos, comisiones, balanceNeto,
                cantidadVehiculos, null, null, null, mensajePersonalizado
        );
    }

    /**
     * Construye un cuerpo de correo en HTML estilizado para el reporte de vehículos,
     * incluyendo el dashboard de indicadores financieros y el detalle completo de vehículos vendidos.
     */
    public String generarHtmlReporteVehiculos(
            String periodo,
            Double ingresos,
            Double egresos,
            Double comisiones,
            Double balanceNeto,
            Integer cantidadVehiculos,
            Integer cantidadVehiculosVendidos,
            Double gananciaVehiculosVendidos,
            String vehiculosVendidosJson,
            String mensajePersonalizado) {

        String seccionVendidosHtml = construirSeccionVehiculosVendidos(
                cantidadVehiculosVendidos, gananciaVehiculosVendidos, vehiculosVendidosJson
        );

        return construirPlantillaFinanciera(
                "Reporte Oficial de Operaciones de Vehículos",
                "A continuación se presenta el balance financiero de vehículos, compras y ventas para este periodo:",
                periodo,
                "Ingresos por Ventas",
                ingresos,
                "Inversión / Compras",
                egresos,
                "Comisiones Pagadas",
                comisiones,
                "Ganancia Neta",
                balanceNeto,
                "Total de vehículos procesados",
                cantidadVehiculos,
                seccionVendidosHtml,
                "Se adjunta el reporte detallado en formato Excel (.xlsx) con la trazabilidad y datos de vehículos.",
                mensajePersonalizado
        );
    }

    /**
     * Construye un cuerpo de correo en HTML estilizado para el reporte de ventas.
     */
    public String generarHtmlReporteVentas(
            String periodo,
            Double totalVentas,
            Double totalComisiones,
            Double balanceNeto,
            Integer cantidadVentas,
            String mensajePersonalizado) {

        return construirPlantillaFinanciera(
                "Reporte Oficial de Ventas y Comisiones",
                "A continuación se presenta el consolidado de ventas por empleado y equipo para este periodo:",
                periodo,
                "Total Ventas",
                totalVentas,
                "Comisiones Equipo",
                totalComisiones,
                "Margen Bruto",
                balanceNeto,
                "Balance Neto Estimado",
                balanceNeto,
                "Total de operaciones registradas",
                cantidadVentas,
                "Se adjunta el reporte detallado en formato Excel (.xlsx) con las ventas por vendedor y comisiones.",
                mensajePersonalizado
        );
    }

    /**
     * Construye un cuerpo de correo en HTML estilizado para el reporte jerárquico de generaciones y rentabilidad.
     */
    public String generarHtmlReporteJerarquia(
            String periodo,
            Integer totalGeneraciones,
            Long totalVehiculos,
            Long totalRepuestos,
            Double totalInversion,
            Double totalIngresos,
            Double balanceNeto,
            String mensajePersonalizado) {

        return construirPlantillaFinanciera(
                "Reporte Jerárquico de Rentabilidad por Generación",
                "A continuación se presenta el balance jerárquico consolidado de marcas, modelos y generaciones:",
                periodo,
                "Inversión Total",
                totalInversion,
                "Ingresos Generados",
                totalIngresos,
                "Vehículos en Stock",
                totalVehiculos != null ? totalVehiculos.doubleValue() : 0.0,
                "Balance Neto",
                balanceNeto,
                "Total de generaciones activas analizadas",
                totalGeneraciones,
                "Se adjunta el reporte detallado en formato Excel (.xlsx) con el desglose jerárquico por Marca, Modelo y Generación con sus indicadores de retorno.",
                mensajePersonalizado
        );
    }

    /**
     * Construye un cuerpo de correo en HTML estilizado para el reporte de oportunidades de Audatex.
     */
    public String generarHtmlReporteAudatex(
            String periodo,
            String marcaFiltro,
            Integer totalOportunidades,
            String mensajePersonalizado) {

        String fechaEmision = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));

        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'>");
        sb.append("<meta name='viewport' content='width=device-width, initial-scale=1.0'>");
        sb.append("<title>Reporte de Oportunidades Audatex</title>");
        sb.append("<style>");
        sb.append("* { box-sizing: border-box; }");
        sb.append("body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 15px; color: #262626; -webkit-font-smoothing: antialiased; }");
        sb.append(".container { width: 100%; max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e8e8e8; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }");
        sb.append(".header { background: #001529; color: #ffffff; padding: 24px 30px; text-align: left; }");
        sb.append(".header h1 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px; }");
        sb.append(".header p { margin: 6px 0 0; color: #bfbfbf; font-size: 13px; }");
        sb.append(".content { padding: 30px; }");
        sb.append(".period-badge { display: inline-block; background: #e6f7ff; color: #096dd9; border: 1px solid #91d5ff; border-radius: 4px; padding: 4px 12px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }");
        sb.append(".custom-message { background: #fafafa; border-left: 4px solid #1890ff; padding: 12px 16px; margin-bottom: 24px; border-radius: 0 4px 4px 0; font-size: 14px; color: #595959; font-style: italic; }");
        sb.append(".info-box { background: #fafafa; border: 1px solid #f0f0f0; border-radius: 6px; padding: 18px; margin-bottom: 24px; }");
        sb.append(".attachment-note { background: #f6ffed; border: 1px solid #b7eb8f; border-radius: 6px; padding: 14px 18px; margin-top: 20px; font-size: 13px; color: #389e0d; line-height: 1.5; }");
        sb.append(".footer { background: #fafafa; border-top: 1px solid #f0f0f0; padding: 16px 30px; text-align: center; font-size: 12px; color: #8c8c8c; line-height: 1.5; }");
        sb.append("@media only screen and (max-width: 600px) {");
        sb.append("  body { padding: 8px !important; }");
        sb.append("  .container { width: 100% !important; border-radius: 6px !important; }");
        sb.append("  .header { padding: 18px 20px !important; }");
        sb.append("  .content { padding: 20px 16px !important; }");
        sb.append("  .footer { padding: 14px 16px !important; }");
        sb.append("}");
        sb.append("</style></head><body>");

        sb.append("<div class='container'>");
        sb.append("<div class='header'>");
        sb.append("<h1>Rodieja Contable</h1>");
        sb.append("<p>Reporte de Oportunidades InPart (Audatex)</p>");
        sb.append("</div>");

        sb.append("<div class='content'>");
        sb.append("<div class='period-badge'>Rango: ").append(periodo).append("</div>");

        if (mensajePersonalizado != null && !mensajePersonalizado.trim().isEmpty()) {
            sb.append("<div class='custom-message'>&ldquo;").append(escapeHtml(mensajePersonalizado)).append("&rdquo;</div>");
        }

        sb.append("<div class='info-box'>");
        sb.append("<p style='margin: 0 0 8px 0; font-size: 14px;'><strong>Filtro de Marca / Armadora:</strong> ")
                .append(marcaFiltro != null && !marcaFiltro.trim().isEmpty() ? escapeHtml(marcaFiltro) : "Todas las marcas").append("</p>");
        if (totalOportunidades != null && totalOportunidades > 0) {
            sb.append("<p style='margin: 0; font-size: 14px;'><strong>Total de oportunidades exportadas:</strong> ").append(totalOportunidades).append("</p>");
        }
        sb.append("</div>");

        sb.append("<div class='attachment-note'>");
        sb.append("Se adjunta el libro Excel (.xlsx) con el listado detallado de oportunidades sincronizadas desde InPart / Audatex.");
        sb.append("</div>");

        sb.append("</div>"); // Fin Content

        sb.append("<div class='footer'>");
        sb.append("Generado automáticamente por el Sistema RodiejaContable el ").append(fechaEmision).append(".<br/>");
        sb.append("Este correo contiene información confidencial destinada exclusivamente al destinatario.");
        sb.append("</div></div></body></html>");

        return sb.toString();
    }

    private String construirPlantillaFinanciera(
            String tituloSub,
            String descripcionIntro,
            String periodo,
            String labelKpi1,
            Double valKpi1,
            String labelKpi2,
            Double valKpi2,
            String labelKpi3,
            Double valKpi3,
            String labelKpi4,
            Double valKpi4,
            String labelTotalRegistros,
            Integer cantidadRegistros,
            String textoAdjunto,
            String mensajePersonalizado) {

        return construirPlantillaFinanciera(
                tituloSub, descripcionIntro, periodo,
                labelKpi1, valKpi1, labelKpi2, valKpi2,
                labelKpi3, valKpi3, labelKpi4, valKpi4,
                labelTotalRegistros, cantidadRegistros,
                null, textoAdjunto, mensajePersonalizado
        );
    }

    private String construirPlantillaFinanciera(
            String tituloSub,
            String descripcionIntro,
            String periodo,
            String labelKpi1,
            Double valKpi1,
            String labelKpi2,
            Double valKpi2,
            String labelKpi3,
            Double valKpi3,
            String labelKpi4,
            Double valKpi4,
            String labelTotalRegistros,
            Integer cantidadRegistros,
            String contenidoAdicionalHtml,
            String textoAdjunto,
            String mensajePersonalizado) {

        String fechaEmision = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));

        String strKpi1 = currencyFormat.format(valKpi1 != null ? valKpi1 : 0.0);
        String strKpi2 = currencyFormat.format(valKpi2 != null ? valKpi2 : 0.0);
        String strKpi3 = currencyFormat.format(valKpi3 != null ? valKpi3 : 0.0);
        String strKpi4 = currencyFormat.format(valKpi4 != null ? valKpi4 : 0.0);
        String colorKpi4 = (valKpi4 != null && valKpi4 >= 0) ? "#237804" : "#cf1322";

        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'>");
        sb.append("<meta name='viewport' content='width=device-width, initial-scale=1.0'>");
        sb.append("<title>").append(escapeHtml(tituloSub)).append("</title>");
        sb.append("<style>");
        sb.append("* { box-sizing: border-box; }");
        sb.append("body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 15px; color: #262626; -webkit-font-smoothing: antialiased; }");
        sb.append(".container { width: 100%; max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e8e8e8; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }");
        sb.append(".header { background: #001529; color: #ffffff; padding: 24px 30px; text-align: left; }");
        sb.append(".header h1 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px; }");
        sb.append(".header p { margin: 6px 0 0; color: #bfbfbf; font-size: 13px; }");
        sb.append(".content { padding: 30px; }");
        sb.append(".period-badge { display: inline-block; background: #e6f7ff; color: #096dd9; border: 1px solid #91d5ff; border-radius: 4px; padding: 4px 12px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }");
        sb.append(".custom-message { background: #fafafa; border-left: 4px solid #1890ff; padding: 12px 16px; margin-bottom: 24px; border-radius: 0 4px 4px 0; font-size: 14px; color: #595959; font-style: italic; }");
        sb.append(".kpi-grid { display: table; width: 100%; border-collapse: separate; border-spacing: 12px; margin-bottom: 24px; }");
        sb.append(".kpi-row { display: table-row; }");
        sb.append(".kpi-card { display: table-cell; width: 50%; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 6px; padding: 16px; text-align: center; vertical-align: top; }");
        sb.append(".kpi-label { font-size: 12px; color: #8c8c8c; text-transform: uppercase; margin-bottom: 6px; font-weight: 500; }");
        sb.append(".kpi-value { font-size: 20px; font-weight: bold; }");
        sb.append(".attachment-note { background: #f6ffed; border: 1px solid #b7eb8f; border-radius: 6px; padding: 14px 18px; margin-top: 20px; font-size: 13px; color: #389e0d; line-height: 1.5; }");
        sb.append(".footer { background: #fafafa; border-top: 1px solid #f0f0f0; padding: 16px 30px; text-align: center; font-size: 12px; color: #8c8c8c; line-height: 1.5; }");
        sb.append("@media only screen and (max-width: 600px) {");
        sb.append("  body { padding: 8px !important; }");
        sb.append("  .container { width: 100% !important; border-radius: 6px !important; }");
        sb.append("  .header { padding: 18px 20px !important; }");
        sb.append("  .content { padding: 20px 16px !important; }");
        sb.append("  .kpi-grid { display: block !important; border-spacing: 0 !important; margin-bottom: 16px !important; }");
        sb.append("  .kpi-row { display: block !important; }");
        sb.append("  .kpi-card { display: block !important; width: 100% !important; margin-bottom: 10px !important; }");
        sb.append("  .kpi-value { font-size: 18px !important; }");
        sb.append("  .footer { padding: 14px 16px !important; }");
        sb.append("}");
        sb.append("</style></head><body>");

        sb.append("<div class='container'>");
        sb.append("<div class='header'>");
        sb.append("<h1>Rodieja Contable</h1>");
        sb.append("<p>").append(escapeHtml(tituloSub)).append("</p>");
        sb.append("</div>");

        sb.append("<div class='content'>");
        sb.append("<div class='period-badge'>Periodo: ").append(periodo).append("</div>");

        if (mensajePersonalizado != null && !mensajePersonalizado.trim().isEmpty()) {
            sb.append("<div class='custom-message'>&ldquo;").append(escapeHtml(mensajePersonalizado)).append("&rdquo;</div>");
        }

        sb.append("<p style='font-size: 14px; color: #595959; margin-bottom: 20px;'>").append(escapeHtml(descripcionIntro)).append("</p>");

        // Grid 2x2
        sb.append("<div class='kpi-grid'>");
        
        sb.append("<div class='kpi-row'>");
        sb.append("<div class='kpi-card'>");
        sb.append("<div class='kpi-label'>").append(escapeHtml(labelKpi1)).append("</div>");
        sb.append("<div class='kpi-value' style='color: #237804;'>").append(strKpi1).append("</div>");
        sb.append("</div>");
        sb.append("<div class='kpi-card'>");
        sb.append("<div class='kpi-label'>").append(escapeHtml(labelKpi2)).append("</div>");
        sb.append("<div class='kpi-value' style='color: #cf1322;'>").append(strKpi2).append("</div>");
        sb.append("</div>");
        sb.append("</div>");

        sb.append("<div class='kpi-row'>");
        sb.append("<div class='kpi-card'>");
        sb.append("<div class='kpi-label'>").append(escapeHtml(labelKpi3)).append("</div>");
        sb.append("<div class='kpi-value' style='color: #fa8c16;'>").append(strKpi3).append("</div>");
        sb.append("</div>");
        sb.append("<div class='kpi-card'>");
        sb.append("<div class='kpi-label'>").append(escapeHtml(labelKpi4)).append("</div>");
        sb.append("<div class='kpi-value' style='color: ").append(colorKpi4).append(";'>").append(strKpi4).append("</div>");
        sb.append("</div>");
        sb.append("</div>");

        sb.append("</div>"); // Fin KPI grid

        if (cantidadRegistros != null && cantidadRegistros > 0) {
            sb.append("<p style='font-size: 13px; color: #8c8c8c;'>").append(escapeHtml(labelTotalRegistros))
                    .append(": <strong>").append(cantidadRegistros).append("</strong></p>");
        }

        // Bloque de contenido adicional (por ejemplo, detalle de vehículos vendidos)
        if (contenidoAdicionalHtml != null && !contenidoAdicionalHtml.trim().isEmpty()) {
            sb.append(contenidoAdicionalHtml);
        }

        sb.append("<div class='attachment-note'>");
        sb.append(escapeHtml(textoAdjunto));
        sb.append("</div>");

        sb.append("</div>"); // Fin Content

        sb.append("<div class='footer'>");
        sb.append("Generado automáticamente por el Sistema RodiejaContable el ").append(fechaEmision).append(".<br/>");
        sb.append("Este correo contiene información confidencial destinada exclusivamente al destinatario.");
        sb.append("</div></div></body></html>");

        return sb.toString();
    }

    /**
     * Construye la sección HTML de Vehículos Vendidos con métricas globales y tabla detallada.
     */
    private String construirSeccionVehiculosVendidos(
            Integer cantidadVendidos,
            Double gananciaVendidos,
            String vehiculosVendidosJson) {

        List<Map<String, Object>> listaVendidos = null;
        if (vehiculosVendidosJson != null && !vehiculosVendidosJson.trim().isEmpty()) {
            try {
                listaVendidos = objectMapper.readValue(vehiculosVendidosJson, new TypeReference<List<Map<String, Object>>>() {});
            } catch (Exception e) {
                logger.warn("No se pudo deserializar vehiculosVendidosJson para el correo: {}", e.getMessage());
            }
        }

        int totalCount = (listaVendidos != null) ? listaVendidos.size() : (cantidadVendidos != null ? cantidadVendidos : 0);

        StringBuilder sb = new StringBuilder();
        sb.append("<div style='margin-top: 28px; margin-bottom: 24px; border-top: 2px solid #f0f0f0; padding-top: 20px;'>");

        // Header
        sb.append("<div style='margin-bottom: 14px;'>");
        sb.append("<h2 style='margin: 0; font-size: 16px; font-weight: 700; color: #001529; display: inline-block;'>🚗 Vehículos Vendidos en el Periodo</h2>");
        sb.append("<span style='background: #52c41a; color: #ffffff; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 12px; margin-left: 10px; vertical-align: middle;'>")
          .append(totalCount).append(totalCount == 1 ? " vendido" : " vendidos")
          .append("</span>");
        sb.append("</div>");

        if (listaVendidos == null || listaVendidos.isEmpty()) {
            sb.append("<div style='background: #fafafa; border: 1px dashed #d9d9d9; border-radius: 6px; padding: 14px; text-align: center; color: #8c8c8c; font-size: 13px;'>");
            sb.append("No se registraron ventas de vehículos en este periodo.");
            sb.append("</div>");
            sb.append("</div>");
            return sb.toString();
        }

        // Totales de vendidos
        double sumaInversion = 0.0;
        double sumaVenta = 0.0;
        double sumaGanancia = 0.0;

        for (Map<String, Object> v : listaVendidos) {
            double inv = parseDoubleSafe(v.get("inversionTotal"));
            double ven = parseDoubleSafe(v.get("precioVenta"));
            double gan = parseDoubleSafe(v.get("ganancia"));
            if (gan == 0.0 && ven > 0) {
                gan = ven - inv;
            }
            sumaInversion += inv;
            sumaVenta += ven;
            sumaGanancia += gan;
        }

        double roiGlobal = sumaInversion > 0 ? (sumaGanancia / sumaInversion) * 100.0 : 0.0;
        String colorGananciaGlobal = sumaGanancia >= 0 ? "#237804" : "#cf1322";

        // Mini KPI cards para vehículos vendidos
        sb.append("<div style='display: table; width: 100%; border-collapse: separate; border-spacing: 8px; margin-bottom: 16px;'>");
        sb.append("<div style='display: table-row;'>");

        // Card Inversión
        sb.append("<div style='display: table-cell; width: 33.3%; background: #fcfcfc; border: 1px solid #f0f0f0; border-radius: 6px; padding: 10px; text-align: center; vertical-align: middle;'>");
        sb.append("<div style='font-size: 10px; color: #8c8c8c; text-transform: uppercase; font-weight: 600;'>Inversión Total</div>");
        sb.append("<div style='font-size: 13px; font-weight: bold; color: #595959; margin-top: 3px;'>").append(currencyFormat.format(sumaInversion)).append("</div>");
        sb.append("</div>");

        // Card Ventas
        sb.append("<div style='display: table-cell; width: 33.3%; background: #fcfcfc; border: 1px solid #f0f0f0; border-radius: 6px; padding: 10px; text-align: center; vertical-align: middle;'>");
        sb.append("<div style='font-size: 10px; color: #8c8c8c; text-transform: uppercase; font-weight: 600;'>Total Ventas</div>");
        sb.append("<div style='font-size: 13px; font-weight: bold; color: #1890ff; margin-top: 3px;'>").append(currencyFormat.format(sumaVenta)).append("</div>");
        sb.append("</div>");

        // Card Ganancia Neta
        sb.append("<div style='display: table-cell; width: 33.3%; background: #f6ffed; border: 1px solid #b7eb8f; border-radius: 6px; padding: 10px; text-align: center; vertical-align: middle;'>");
        sb.append("<div style='font-size: 10px; color: #389e0d; text-transform: uppercase; font-weight: 600;'>Ganancia Neta (ROI)</div>");
        sb.append("<div style='font-size: 13px; font-weight: bold; color: ").append(colorGananciaGlobal).append("; margin-top: 3px;'>")
          .append(sumaGanancia >= 0 ? "+" : "").append(currencyFormat.format(sumaGanancia))
          .append(" <span style='font-size: 11px; font-weight: 600;'>(").append(String.format(Locale.US, "%.1f%%", roiGlobal)).append(")</span>")
          .append("</div>");
        sb.append("</div>");

        sb.append("</div></div>");

        // Tabla detallada de vehículos vendidos
        sb.append("<div style='overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid #e8e8e8; border-radius: 6px;'>");
        sb.append("<table style='width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;'>");
        sb.append("<thead>");
        sb.append("<tr style='background: #fafafa; border-bottom: 2px solid #f0f0f0;'>");
        sb.append("<th style='padding: 8px 10px; font-weight: 600; color: #595959;'>Código</th>");
        sb.append("<th style='padding: 8px 10px; font-weight: 600; color: #595959;'>Vehículo</th>");
        sb.append("<th style='padding: 8px 10px; font-weight: 600; color: #595959;'>Fecha Venta</th>");
        sb.append("<th style='padding: 8px 10px; font-weight: 600; color: #595959; text-align: right;'>Inversión</th>");
        sb.append("<th style='padding: 8px 10px; font-weight: 600; color: #595959; text-align: right;'>P. Venta</th>");
        sb.append("<th style='padding: 8px 10px; font-weight: 600; color: #595959; text-align: right;'>Ganancia</th>");
        sb.append("<th style='padding: 8px 10px; font-weight: 600; color: #595959; text-align: right;'>ROI</th>");
        sb.append("</tr>");
        sb.append("</thead>");
        sb.append("<tbody>");

        int rowIndex = 0;
        for (Map<String, Object> v : listaVendidos) {
            String bg = (rowIndex % 2 == 0) ? "#ffffff" : "#fafafa";
            String codigo = escapeHtml(String.valueOf(v.getOrDefault("codigoVehiculo", "")));
            String marca = escapeHtml(String.valueOf(v.getOrDefault("marca", "")));
            String modelo = escapeHtml(String.valueOf(v.getOrDefault("modelo", "")));
            String anioStr = v.get("anio") != null ? String.valueOf(v.get("anio")) : "";
            String vehiculoDesc = (marca + " " + modelo + " " + anioStr).trim();
            if (vehiculoDesc.isEmpty()) vehiculoDesc = "Vehículo #" + codigo;

            String fechaVenta = escapeHtml(String.valueOf(v.getOrDefault("fechaVenta", "")));
            if (fechaVenta.length() > 10) fechaVenta = fechaVenta.substring(0, 10);

            double inv = parseDoubleSafe(v.get("inversionTotal"));
            double ven = parseDoubleSafe(v.get("precioVenta"));
            double gan = parseDoubleSafe(v.get("ganancia"));
            if (gan == 0.0 && ven > 0) {
                gan = ven - inv;
            }
            double roi = inv > 0 ? (gan / inv) * 100.0 : 0.0;
            String colorGan = gan >= 0 ? "#237804" : "#cf1322";

            sb.append("<tr style='background: ").append(bg).append("; border-bottom: 1px solid #f0f0f0;'>");
            sb.append("<td style='padding: 8px 10px; font-family: monospace; font-weight: 600; color: #096dd9;'>").append(codigo).append("</td>");
            sb.append("<td style='padding: 8px 10px; font-weight: 500; color: #262626;'>").append(vehiculoDesc).append("</td>");
            sb.append("<td style='padding: 8px 10px; color: #8c8c8c;'>").append(fechaVenta.isEmpty() ? "-" : fechaVenta).append("</td>");
            sb.append("<td style='padding: 8px 10px; text-align: right; color: #595959;'>").append(currencyFormat.format(inv)).append("</td>");
            sb.append("<td style='padding: 8px 10px; text-align: right; font-weight: 500; color: #262626;'>").append(currencyFormat.format(ven)).append("</td>");
            sb.append("<td style='padding: 8px 10px; text-align: right; font-weight: bold; color: ").append(colorGan).append(";'>")
              .append(gan >= 0 ? "+" : "").append(currencyFormat.format(gan)).append("</td>");
            sb.append("<td style='padding: 8px 10px; text-align: right; font-weight: 600; color: ").append(colorGan).append(";'>")
              .append(roi >= 0 ? "+" : "").append(String.format(Locale.US, "%.1f%%", roi)).append("</td>");
            sb.append("</tr>");

            rowIndex++;
        }

        // Fila de Totales
        sb.append("<tr style='background: #f0f5ff; border-top: 2px solid #d6e4ff; font-weight: bold;'>");
        sb.append("<td colspan='3' style='padding: 9px 10px; color: #002766;'>TOTAL VENDIDOS (").append(totalCount).append(")</td>");
        sb.append("<td style='padding: 9px 10px; text-align: right; color: #595959;'>").append(currencyFormat.format(sumaInversion)).append("</td>");
        sb.append("<td style='padding: 9px 10px; text-align: right; color: #002766;'>").append(currencyFormat.format(sumaVenta)).append("</td>");
        sb.append("<td style='padding: 9px 10px; text-align: right; color: ").append(colorGananciaGlobal).append(";'>")
          .append(sumaGanancia >= 0 ? "+" : "").append(currencyFormat.format(sumaGanancia)).append("</td>");
        sb.append("<td style='padding: 9px 10px; text-align: right; color: ").append(colorGananciaGlobal).append(";'>")
          .append(roiGlobal >= 0 ? "+" : "").append(String.format(Locale.US, "%.1f%%", roiGlobal)).append("</td>");
        sb.append("</tr>");

        sb.append("</tbody></table></div>");
        sb.append("</div>"); // Fin contenedor vendidos

        return sb.toString();
    }

    private String construirSeccionGastosOperativos(String gastosOperativosJson) {
        if (gastosOperativosJson == null || gastosOperativosJson.trim().isEmpty()) {
            return null;
        }

        Map<String, Object> data = null;
        try {
            data = objectMapper.readValue(gastosOperativosJson, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            logger.warn("No se pudo deserializar gastosOperativosJson para el correo: {}", e.getMessage());
            return null;
        }

        if (data == null || data.isEmpty()) {
            return null;
        }

        double salarios = parseDoubleSafe(data.get("salarios"));
        double mantenimiento = parseDoubleSafe(data.get("mantenimiento"));
        double serviciosPublicos = parseDoubleSafe(data.get("serviciosPublicos"));
        double otros = parseDoubleSafe(data.get("otros"));
        double total = parseDoubleSafe(data.get("total"));
        if (total == 0.0) {
            total = salarios + mantenimiento + serviciosPublicos + otros;
        }

        if (total == 0.0 && salarios == 0.0 && mantenimiento == 0.0 && serviciosPublicos == 0.0 && otros == 0.0) {
            return null;
        }

        double pctSalarios = total > 0 ? (salarios / total) * 100.0 : 0.0;
        double pctMantenimiento = total > 0 ? (mantenimiento / total) * 100.0 : 0.0;
        double pctServicios = total > 0 ? (serviciosPublicos / total) * 100.0 : 0.0;
        double pctOtros = total > 0 ? (otros / total) * 100.0 : 0.0;

        StringBuilder sb = new StringBuilder();
        sb.append("<div style='margin-top: 28px; margin-bottom: 24px; border-top: 2px solid #f0f0f0; padding-top: 20px;'>");

        // Header
        sb.append("<div style='margin-bottom: 14px;'>");
        sb.append("<h2 style='margin: 0; font-size: 16px; font-weight: 700; color: #001529; display: inline-block;'>💼 Gastos Operativos y Administrativos</h2>");
        sb.append("<span style='background: #fa8c16; color: #ffffff; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 12px; margin-left: 10px; vertical-align: middle;'>")
          .append("Total: ").append(currencyFormat.format(total))
          .append("</span>");
        sb.append("</div>");

        // 4 Mini KPI cards
        sb.append("<div style='display: table; width: 100%; border-collapse: separate; border-spacing: 8px; margin-bottom: 16px;'>");
        sb.append("<div style='display: table-row;'>");

        // Salarios
        sb.append("<div style='display: table-cell; width: 25%; background: #fffbe6; border: 1px solid #ffe58f; border-radius: 6px; padding: 10px; text-align: center; vertical-align: middle;'>");
        sb.append("<div style='font-size: 10px; color: #d46b08; text-transform: uppercase; font-weight: 600;'>💼 Salarios</div>");
        sb.append("<div style='font-size: 13px; font-weight: bold; color: #ad4e00; margin-top: 3px;'>").append(currencyFormat.format(salarios)).append("</div>");
        sb.append("<div style='font-size: 10px; color: #8c8c8c; margin-top: 2px;'>").append(String.format(Locale.US, "%.1f%%", pctSalarios)).append("</div>");
        sb.append("</div>");

        // Mantenimiento Local
        sb.append("<div style='display: table-cell; width: 25%; background: #f6ffed; border: 1px solid #b7eb8f; border-radius: 6px; padding: 10px; text-align: center; vertical-align: middle;'>");
        sb.append("<div style='font-size: 10px; color: #389e0d; text-transform: uppercase; font-weight: 600;'>🔧 Mantenimiento</div>");
        sb.append("<div style='font-size: 13px; font-weight: bold; color: #237804; margin-top: 3px;'>").append(currencyFormat.format(mantenimiento)).append("</div>");
        sb.append("<div style='font-size: 10px; color: #8c8c8c; margin-top: 2px;'>").append(String.format(Locale.US, "%.1f%%", pctMantenimiento)).append("</div>");
        sb.append("</div>");

        // Servicios Públicos
        sb.append("<div style='display: table-cell; width: 25%; background: #e6f7ff; border: 1px solid #91d5ff; border-radius: 6px; padding: 10px; text-align: center; vertical-align: middle;'>");
        sb.append("<div style='font-size: 10px; color: #096dd9; text-transform: uppercase; font-weight: 600;'>💡 Servicios</div>");
        sb.append("<div style='font-size: 13px; font-weight: bold; color: #0050b3; margin-top: 3px;'>").append(currencyFormat.format(serviciosPublicos)).append("</div>");
        sb.append("<div style='font-size: 10px; color: #8c8c8c; margin-top: 2px;'>").append(String.format(Locale.US, "%.1f%%", pctServicios)).append("</div>");
        sb.append("</div>");

        // Otros Operativos
        sb.append("<div style='display: table-cell; width: 25%; background: #fcfcfc; border: 1px solid #f0f0f0; border-radius: 6px; padding: 10px; text-align: center; vertical-align: middle;'>");
        sb.append("<div style='font-size: 10px; color: #595959; text-transform: uppercase; font-weight: 600;'>📦 Otros Gastos</div>");
        sb.append("<div style='font-size: 13px; font-weight: bold; color: #262626; margin-top: 3px;'>").append(currencyFormat.format(otros)).append("</div>");
        sb.append("<div style='font-size: 10px; color: #8c8c8c; margin-top: 2px;'>").append(String.format(Locale.US, "%.1f%%", pctOtros)).append("</div>");
        sb.append("</div>");

        sb.append("</div></div>");

        // Tabla detallada de movimientos operativos si existen
        Object detallesObj = data.get("detalles");
        if (detallesObj instanceof List) {
            List<?> rawList = (List<?>) detallesObj;
            if (!rawList.isEmpty()) {
                sb.append("<div style='overflow-x: auto; border: 1px solid #f0f0f0; border-radius: 6px;'>");
                sb.append("<table style='width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;'>");
                sb.append("<thead><tr style='background: #fafafa; border-bottom: 2px solid #e8e8e8;'>");
                sb.append("<th style='padding: 8px 10px; color: #595959; font-weight: 600;'>Fecha</th>");
                sb.append("<th style='padding: 8px 10px; color: #595959; font-weight: 600;'>Concepto</th>");
                sb.append("<th style='padding: 8px 10px; color: #595959; font-weight: 600;'>Descripción / Ref</th>");
                sb.append("<th style='padding: 8px 10px; text-align: right; color: #595959; font-weight: 600;'>Monto</th>");
                sb.append("</tr></thead><tbody>");

                int rowIndex = 0;
                int maxItems = Math.min(rawList.size(), 15);
                for (int i = 0; i < maxItems; i++) {
                    Object item = rawList.get(i);
                    if (item instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> d = (Map<String, Object>) item;
                        String bg = (rowIndex % 2 == 0) ? "#ffffff" : "#fafafa";
                        String fecha = d.get("fecha") != null ? d.get("fecha").toString() : "-";
                        String tipo = d.get("tipoTransaccion") != null ? d.get("tipoTransaccion").toString() : (d.get("concepto") != null ? d.get("concepto").toString() : "Operativo");
                        String desc = d.get("descripcion") != null ? d.get("descripcion").toString() : (d.get("referencia") != null ? d.get("referencia").toString() : "");
                        double m = parseDoubleSafe(d.get("monto"));

                        sb.append("<tr style='background: ").append(bg).append("; border-bottom: 1px solid #f0f0f0;'>");
                        sb.append("<td style='padding: 7px 10px; color: #8c8c8c;'>").append(escapeHtml(fecha)).append("</td>");
                        sb.append("<td style='padding: 7px 10px; font-weight: 500; color: #262626;'>").append(escapeHtml(tipo)).append("</td>");
                        sb.append("<td style='padding: 7px 10px; color: #595959;'>").append(escapeHtml(desc)).append("</td>");
                        sb.append("<td style='padding: 7px 10px; text-align: right; font-weight: 600; color: #f5222d;'>")
                          .append(currencyFormat.format(m)).append("</td>");
                        sb.append("</tr>");
                        rowIndex++;
                    }
                }
                if (rawList.size() > maxItems) {
                    sb.append("<tr style='background: #fafafa;'><td colspan='4' style='padding: 8px 10px; text-align: center; color: #8c8c8c; font-style: italic;'>");
                    sb.append("Y ").append(rawList.size() - maxItems).append(" movimientos operativos adicionales disponibles en el archivo Excel adjunto.");
                    sb.append("</td></tr>");
                }
                sb.append("</tbody></table></div>");
            }
        }

        sb.append("</div>");
        return sb.toString();
    }

    private double parseDoubleSafe(Object obj) {
        if (obj == null) return 0.0;
        if (obj instanceof Number) return ((Number) obj).doubleValue();
        try {
            return Double.parseDouble(obj.toString());
        } catch (Exception e) {
            return 0.0;
        }
    }

    /**
     * Construye una plantilla HTML responsiva para el restablecimiento de contraseñas.
     */
    public String generarHtmlPasswordReset(String nombreUsuario, String enlaceReset) {
        String fechaEmision = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        String nombreSeguro = escapeHtml((nombreUsuario != null && !nombreUsuario.trim().isEmpty()) ? nombreUsuario : "Usuario");
        String enlaceSeguro = escapeHtml(enlaceReset);

        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html><head><meta charset='UTF-8'>");
        sb.append("<meta name='viewport' content='width=device-width, initial-scale=1.0'>");
        sb.append("<title>Restablecimiento de Contraseña - Rodieja Contable</title>");
        sb.append("<style>");
        sb.append("body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333333; }");
        sb.append(".email-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e8e8e8; }");
        sb.append(".header { background: #001529; color: #ffffff; padding: 28px 24px; text-align: center; }");
        sb.append(".header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }");
        sb.append(".header p { margin: 6px 0 0; font-size: 13px; color: #8c8c8c; }");
        sb.append(".content { padding: 32px 28px; line-height: 1.6; }");
        sb.append(".saludo { font-size: 16px; font-weight: 600; color: #262626; margin-bottom: 12px; }");
        sb.append(".btn-container { text-align: center; margin: 30px 0; }");
        sb.append(".btn { display: inline-block; background-color: #1890ff; color: #ffffff !important; padding: 14px 32px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px; box-shadow: 0 2px 6px rgba(24,144,255,0.35); }");
        sb.append(".alert-box { background-color: #e6f7ff; border-left: 4px solid #1890ff; padding: 14px 16px; border-radius: 4px; margin: 24px 0; font-size: 13px; color: #003a8c; line-height: 1.5; }");
        sb.append(".url-fallback { font-size: 12px; color: #8c8c8c; margin-top: 20px; word-break: break-all; }");
        sb.append(".url-fallback a { color: #1890ff; text-decoration: underline; }");
        sb.append(".footer { background: #fafafa; padding: 20px 24px; text-align: center; font-size: 11px; color: #8c8c8c; border-top: 1px solid #f0f0f0; line-height: 1.5; }");
        sb.append("@media only screen and (max-width: 600px) { body { padding: 8px; } .content { padding: 20px 16px; } .btn { width: 100%; box-sizing: border-box; text-align: center; } }");
        sb.append("</style></head><body>");

        sb.append("<div class='email-container'>");
        sb.append("<div class='header'>");
        sb.append("<h1>Rodieja Contable</h1>");
        sb.append("<p>Seguridad y Control de Acceso</p>");
        sb.append("</div>");

        sb.append("<div class='content'>");
        sb.append("<div class='saludo'>Hola, ").append(nombreSeguro).append(":</div>");
        sb.append("<p>Hemos recibido una solicitud para restablecer la contraseña de acceso a tu cuenta en <strong>Rodieja Contable</strong>.</p>");
        sb.append("<p>Para definir una nueva contraseña, haz clic en el siguiente botón:</p>");

        sb.append("<div class='btn-container'>");
        sb.append("<a href='").append(enlaceSeguro).append("' class='btn' target='_blank'>Restablecer mi Contraseña</a>");
        sb.append("</div>");

        sb.append("<div class='alert-box'>");
        sb.append("⏰ <strong>Validez del enlace:</strong> Por motivos de seguridad, este enlace es de uso único y expirará en <strong>15 minutos</strong>.");
        sb.append("</div>");

        sb.append("<p style='font-size: 13px; color: #595959;'>Si tú no realizaste esta solicitud, puedes ignorar este mensaje de forma segura. Tu contraseña actual no cambiará hasta que accedas al enlace y confirmes una nueva.</p>");

        sb.append("<div class='url-fallback'>");
        sb.append("¿No puedes hacer clic en el botón? Copia y pega esta dirección en tu navegador:<br/>");
        sb.append("<a href='").append(enlaceSeguro).append("'>").append(enlaceSeguro).append("</a>");
        sb.append("</div>");

        sb.append("</div>"); // Fin Content

        sb.append("<div class='footer'>");
        sb.append("Mensaje enviado por Rodieja Contable el ").append(fechaEmision).append(".<br/>");
        sb.append("Este es un correo automático de seguridad, por favor no respondas a este mensaje.");
        sb.append("</div></div></body></html>");

        return sb.toString();
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&#39;");
    }
}
