package com.rodiejacontable.rodiejacontable.service;

import org.springframework.stereotype.Service;

import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class EmailTemplateService {

    private final NumberFormat currencyFormat;

    public EmailTemplateService() {
        this.currencyFormat = NumberFormat.getCurrencyInstance(new Locale("es", "CR"));
        this.currencyFormat.setMaximumFractionDigits(0);
    }

    /**
     * Construye un cuerpo de correo en HTML estilizado para el reporte de repuestos.
     */
    public String generarHtmlReporteRepuestos(
            String periodo,
            Double ingresos,
            Double egresos,
            Double comisiones,
            Double balanceNeto,
            Integer cantidadMovimientos,
            String mensajePersonalizado) {

        return construirPlantillaFinanciera(
                "Reporte Oficial de Movimientos de Repuestos",
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
                "Se adjunta el reporte detallado en formato Excel (.xlsx) con el desglose completo de repuestos y transacciones.",
                mensajePersonalizado
        );
    }

    /**
     * Construye un cuerpo de correo en HTML estilizado para el reporte de vehículos.
     */
    public String generarHtmlReporteVehiculos(
            String periodo,
            Double ingresos,
            Double egresos,
            Double comisiones,
            Double balanceNeto,
            Integer cantidadVehiculos,
            String mensajePersonalizado) {

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

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&#39;");
    }
}
