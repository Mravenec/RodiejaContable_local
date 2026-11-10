package com.rodiejacontable.rodiejacontable.service.reportes;

import com.rodiejacontable.database.jooq.tables.pojos.VistaResumenGeneraciones;
import com.rodiejacontable.database.jooq.tables.pojos.VistaTransaccionesCompletas;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Servicio utilitario para construir libros Excel (.xlsx) de 2 hojas
 * (Resumen Financiero + Detalle Movimientos) utilizando Apache POI.
 */
@Service
public class ReporteExcelGeneratorService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /**
     * Genera el libro Excel para el Reporte de Vehículos con 2 hojas:
     * 1. Resumen Financiero
     * 2. Detalle Movimientos
     */
    public byte[] generarExcelVehiculos(
            String periodoNombre,
            double ingresos,
            double egresos,
            double comisiones,
            double balanceNeto,
            List<VistaTransaccionesCompletas> transacciones) throws IOException {

        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            StylesHelper styles = new StylesHelper(wb);

            // ==================== HOJA 1: RESUMEN FINANCIERO ====================
            Sheet sheetResumen = wb.createSheet("Resumen Financiero");
            String[] headersResumen = {"Período", "Ingresos por Ventas", "Inversión y Reparación", "Comisiones", "Ganancia Neta Real"};

            Row hRow = sheetResumen.createRow(0);
            for (int i = 0; i < headersResumen.length; i++) {
                Cell c = hRow.createCell(i);
                c.setCellValue(headersResumen[i]);
                c.setCellStyle(styles.headerStyle);
            }

            // Fila de datos del período
            Row rRow = sheetResumen.createRow(1);
            rRow.createCell(0).setCellValue(periodoNombre);
            rRow.getCell(0).setCellStyle(styles.textCenterStyle);

            crearCeldaMoneda(rRow, 1, ingresos, styles.currencyStyle);
            crearCeldaMoneda(rRow, 2, egresos, styles.currencyStyle);
            crearCeldaMoneda(rRow, 3, comisiones, styles.currencyStyle);
            crearCeldaMoneda(rRow, 4, balanceNeto, balanceNeto >= 0 ? styles.currencyPositiveStyle : styles.currencyNegativeStyle);

            // Fila de TOTALES
            Row tRow = sheetResumen.createRow(2);
            Cell tCell = tRow.createCell(0);
            tCell.setCellValue("TOTALES");
            tCell.setCellStyle(styles.totalHeaderStyle);

            crearCeldaMoneda(tRow, 1, ingresos, styles.totalCurrencyStyle);
            crearCeldaMoneda(tRow, 2, egresos, styles.totalCurrencyStyle);
            crearCeldaMoneda(tRow, 3, comisiones, styles.totalCurrencyStyle);
            crearCeldaMoneda(tRow, 4, balanceNeto, styles.totalCurrencyStyle);

            ajustarAnchos(sheetResumen, new int[]{22, 24, 24, 20, 24});

            // ==================== HOJA 2: DETALLE MOVIMIENTOS ====================
            Sheet sheetDetalle = wb.createSheet("Detalle Movimientos");
            String[] headersDetalle = {
                    "Fecha", "Clasificación", "Referencia", "Descripción",
                    "Vehículo", "Ingresos (₡)", "Egresos (₡)", "Comisión", "Comisión Pagada"
            };

            Row dHRow = sheetDetalle.createRow(0);
            for (int i = 0; i < headersDetalle.length; i++) {
                Cell c = dHRow.createCell(i);
                c.setCellValue(headersDetalle[i]);
                c.setCellStyle(styles.headerStyle);
            }

            int rowIdx = 1;
            double totalIngresosDetalle = 0.0;
            double totalEgresosDetalle = 0.0;
            double totalComisionesDetalle = 0.0;

            for (VistaTransaccionesCompletas t : transacciones) {
                Row row = sheetDetalle.createRow(rowIdx++);
                boolean isAlt = (rowIdx % 2 == 0);
                CellStyle textStyle = isAlt ? styles.altTextStyle : styles.textStyle;
                CellStyle currStyle = isAlt ? styles.altCurrencyStyle : styles.currencyStyle;

                // Fecha
                Cell cFecha = row.createCell(0);
                cFecha.setCellValue(t.getFecha() != null ? t.getFecha().format(DATE_FORMATTER) : "");
                cFecha.setCellStyle(isAlt ? styles.altTextCenterStyle : styles.textCenterStyle);

                // Clasificación
                Cell cClas = row.createCell(1);
                cClas.setCellValue(t.getTipoTransaccion() != null ? t.getTipoTransaccion() : (t.getCategoria() != null ? t.getCategoria().name() : ""));
                cClas.setCellStyle(textStyle);

                // Referencia
                Cell cRef = row.createCell(2);
                cRef.setCellValue(t.getReferencia() != null ? t.getReferencia() : (t.getCodigoTransaccion() != null ? t.getCodigoTransaccion() : ""));
                cRef.setCellStyle(textStyle);

                // Descripción
                Cell cDesc = row.createCell(3);
                cDesc.setCellValue(t.getDescripcion() != null ? t.getDescripcion() : "");
                cDesc.setCellStyle(textStyle);

                // Vehículo
                String infoVehiculo = "";
                if (t.getMarca() != null || t.getModelo() != null) {
                    infoVehiculo = (t.getMarca() != null ? t.getMarca() + " " : "")
                            + (t.getModelo() != null ? t.getModelo() + " " : "")
                            + (t.getCodigoVehiculo() != null ? "(" + t.getCodigoVehiculo() + ")" : "");
                } else if (t.getCodigoVehiculo() != null) {
                    infoVehiculo = "Vehículo: " + t.getCodigoVehiculo();
                }
                Cell cVeh = row.createCell(4);
                cVeh.setCellValue(infoVehiculo.trim());
                cVeh.setCellStyle(textStyle);

                // Montos separados en Ingresos y Egresos (alineado con la lógica de negocio oficial)
                boolean isIngreso = (t.getCategoria() != null)
                        ? "INGRESO".equalsIgnoreCase(t.getCategoria().name())
                        : ("INGRESO".equalsIgnoreCase(t.getTipoTransaccion()) || "VENTA".equalsIgnoreCase(t.getTipoTransaccion()));

                double montoVal = t.getMonto() != null ? t.getMonto().doubleValue() : 0.0;
                double ingVal = isIngreso ? montoVal : 0.0;
                double egrVal = !isIngreso ? montoVal : 0.0;

                totalIngresosDetalle += ingVal;
                totalEgresosDetalle += egrVal;

                crearCeldaMoneda(row, 5, ingVal, currStyle);
                crearCeldaMoneda(row, 6, egrVal, currStyle);

                // Comisión
                boolean comPagada = t.getComisionPagada() != null && t.getComisionPagada() > 0;
                double comVal = t.getComisionEmpleado() != null ? t.getComisionEmpleado().doubleValue() : 0.0;
                if (comPagada) {
                    totalComisionesDetalle += comVal;
                }
                crearCeldaMoneda(row, 7, comVal, currStyle);

                // Comisión Pagada
                Cell cPag = row.createCell(8);
                cPag.setCellValue(comPagada ? "Sí" : "No");
                cPag.setCellStyle(isAlt ? styles.altTextCenterStyle : styles.textCenterStyle);
            }

            // Fila de Sumatoria de Totales
            Row sumRow = sheetDetalle.createRow(rowIdx++);
            Cell lblSum = sumRow.createCell(0);
            lblSum.setCellValue("TOTALES / SUMATORIA");
            lblSum.setCellStyle(styles.totalHeaderStyle);
            sheetDetalle.addMergedRegion(new CellRangeAddress(rowIdx - 1, rowIdx - 1, 0, 4));
            for (int c = 1; c <= 4; c++) {
                Cell emp = sumRow.createCell(c);
                emp.setCellStyle(styles.totalHeaderStyle);
            }
            crearCeldaMoneda(sumRow, 5, totalIngresosDetalle, styles.totalCurrencyStyle);
            crearCeldaMoneda(sumRow, 6, totalEgresosDetalle, styles.totalCurrencyStyle);
            crearCeldaMoneda(sumRow, 7, totalComisionesDetalle, styles.totalCurrencyStyle);
            Cell emptyEnd = sumRow.createCell(8);
            emptyEnd.setCellValue("");
            emptyEnd.setCellStyle(styles.totalHeaderStyle);

            // Fila de Balance Neto
            Row balRow = sheetDetalle.createRow(rowIdx++);
            Cell lblBal = balRow.createCell(0);
            lblBal.setCellValue("BALANCE NETO (INGRESOS - EGRESOS - COMISIONES PAGADAS)");
            lblBal.setCellStyle(styles.totalHeaderStyle);
            sheetDetalle.addMergedRegion(new CellRangeAddress(rowIdx - 1, rowIdx - 1, 0, 4));
            for (int c = 1; c <= 4; c++) {
                Cell emp = balRow.createCell(c);
                emp.setCellStyle(styles.totalHeaderStyle);
            }
            double balNetoDetalle = totalIngresosDetalle - totalEgresosDetalle - totalComisionesDetalle;
            crearCeldaMoneda(balRow, 5, balNetoDetalle, styles.totalCurrencyStyle);
            sheetDetalle.addMergedRegion(new CellRangeAddress(rowIdx - 1, rowIdx - 1, 5, 8));
            for (int c = 6; c <= 8; c++) {
                Cell emp = balRow.createCell(c);
                emp.setCellStyle(styles.totalCurrencyStyle);
            }

            ajustarAnchos(sheetDetalle, new int[]{14, 18, 20, 38, 30, 18, 18, 16, 16});

            wb.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Genera el libro Excel para el Reporte de Repuestos con 2 hojas:
     * 1. Resumen Financiero
     * 2. Detalle Movimientos
     */
    public byte[] generarExcelRepuestos(
            String periodoNombre,
            double ingresos,
            double egresos,
            double comisiones,
            double balanceNeto,
            List<VistaTransaccionesCompletas> transacciones) throws IOException {

        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            StylesHelper styles = new StylesHelper(wb);

            // ==================== HOJA 1: RESUMEN FINANCIERO ====================
            Sheet sheetResumen = wb.createSheet("Resumen Financiero");
            String[] headersResumen = {"Período", "Ingresos", "Egresos", "Comisiones", "Balance Neto"};

            Row hRow = sheetResumen.createRow(0);
            for (int i = 0; i < headersResumen.length; i++) {
                Cell c = hRow.createCell(i);
                c.setCellValue(headersResumen[i]);
                c.setCellStyle(styles.headerStyle);
            }

            Row rRow = sheetResumen.createRow(1);
            rRow.createCell(0).setCellValue(periodoNombre);
            rRow.getCell(0).setCellStyle(styles.textCenterStyle);

            crearCeldaMoneda(rRow, 1, ingresos, styles.currencyStyle);
            crearCeldaMoneda(rRow, 2, egresos, styles.currencyStyle);
            crearCeldaMoneda(rRow, 3, comisiones, styles.currencyStyle);
            crearCeldaMoneda(rRow, 4, balanceNeto, balanceNeto >= 0 ? styles.currencyPositiveStyle : styles.currencyNegativeStyle);

            Row tRow = sheetResumen.createRow(2);
            Cell tCell = tRow.createCell(0);
            tCell.setCellValue("TOTALES");
            tCell.setCellStyle(styles.totalHeaderStyle);

            crearCeldaMoneda(tRow, 1, ingresos, styles.totalCurrencyStyle);
            crearCeldaMoneda(tRow, 2, egresos, styles.totalCurrencyStyle);
            crearCeldaMoneda(tRow, 3, comisiones, styles.totalCurrencyStyle);
            crearCeldaMoneda(tRow, 4, balanceNeto, styles.totalCurrencyStyle);

            ajustarAnchos(sheetResumen, new int[]{22, 22, 22, 20, 22});

            // ==================== HOJA 2: DETALLE MOVIMIENTOS ====================
            Sheet sheetDetalle = wb.createSheet("Detalle Movimientos");
            String[] headersDetalle = {
                    "Fecha", "Clasificación", "Pieza / Concepto", "Referencia", "Descripción",
                    "Origen", "Ingresos (₡)", "Egresos (₡)", "Comisión", "Comisión Pagada"
            };

            Row dHRow = sheetDetalle.createRow(0);
            for (int i = 0; i < headersDetalle.length; i++) {
                Cell c = dHRow.createCell(i);
                c.setCellValue(headersDetalle[i]);
                c.setCellStyle(styles.headerStyle);
            }

            int rowIdx = 1;
            double totalIngresosDetalle = 0.0;
            double totalEgresosDetalle = 0.0;
            double totalComisionesDetalle = 0.0;

            for (VistaTransaccionesCompletas t : transacciones) {
                Row row = sheetDetalle.createRow(rowIdx++);
                boolean isAlt = (rowIdx % 2 == 0);
                CellStyle textStyle = isAlt ? styles.altTextStyle : styles.textStyle;
                CellStyle currStyle = isAlt ? styles.altCurrencyStyle : styles.currencyStyle;

                // Fecha
                Cell cFecha = row.createCell(0);
                cFecha.setCellValue(t.getFecha() != null ? t.getFecha().format(DATE_FORMATTER) : "");
                cFecha.setCellStyle(isAlt ? styles.altTextCenterStyle : styles.textCenterStyle);

                // Clasificación
                Cell cClas = row.createCell(1);
                cClas.setCellValue(t.getTipoTransaccion() != null ? t.getTipoTransaccion() : (t.getCategoria() != null ? t.getCategoria().name() : ""));
                cClas.setCellStyle(textStyle);

                // Pieza / Concepto
                String concepto = t.getCodigoRepuesto() != null ? t.getCodigoRepuesto() : (t.getCodigoVehiculo() != null ? "Vehículo " + t.getCodigoVehiculo() : "General");
                Cell cConc = row.createCell(2);
                cConc.setCellValue(concepto);
                cConc.setCellStyle(textStyle);

                // Referencia
                Cell cRef = row.createCell(3);
                cRef.setCellValue(t.getReferencia() != null ? t.getReferencia() : "");
                cRef.setCellStyle(textStyle);

                // Descripción
                Cell cDesc = row.createCell(4);
                cDesc.setCellValue(t.getDescripcion() != null ? t.getDescripcion() : "");
                cDesc.setCellStyle(textStyle);

                // Origen
                String origen = "General / Sin Vehículo";
                if (t.getCodigoVehiculo() != null || t.getMarca() != null) {
                    origen = (t.getMarca() != null ? t.getMarca() + " " : "") + (t.getCodigoVehiculo() != null ? "(" + t.getCodigoVehiculo() + ")" : "");
                }
                Cell cOrig = row.createCell(5);
                cOrig.setCellValue(origen.trim());
                cOrig.setCellStyle(textStyle);

                // Montos separados en Ingresos y Egresos
                boolean isIngreso = (t.getCategoria() != null)
                        ? "INGRESO".equalsIgnoreCase(t.getCategoria().name())
                        : ("INGRESO".equalsIgnoreCase(t.getTipoTransaccion()) || "VENTA".equalsIgnoreCase(t.getTipoTransaccion()));
                double montoVal = t.getMonto() != null ? t.getMonto().doubleValue() : 0.0;
                double ingVal = isIngreso ? montoVal : 0.0;
                double egrVal = !isIngreso ? montoVal : 0.0;

                totalIngresosDetalle += ingVal;
                totalEgresosDetalle += egrVal;

                crearCeldaMoneda(row, 6, ingVal, currStyle);
                crearCeldaMoneda(row, 7, egrVal, currStyle);

                // Comisión
                boolean comPagada = t.getComisionPagada() != null && t.getComisionPagada() > 0;
                double comVal = t.getComisionEmpleado() != null ? t.getComisionEmpleado().doubleValue() : 0.0;
                if (comPagada) {
                    totalComisionesDetalle += comVal;
                }
                crearCeldaMoneda(row, 8, comVal, currStyle);

                // Comisión Pagada
                Cell cPag = row.createCell(9);
                cPag.setCellValue(comPagada ? "Sí" : "No");
                cPag.setCellStyle(isAlt ? styles.altTextCenterStyle : styles.textCenterStyle);
            }

            // Fila de Sumatoria de Totales
            Row sumRow = sheetDetalle.createRow(rowIdx++);
            Cell lblSum = sumRow.createCell(0);
            lblSum.setCellValue("TOTALES / SUMATORIA");
            lblSum.setCellStyle(styles.totalHeaderStyle);
            sheetDetalle.addMergedRegion(new CellRangeAddress(rowIdx - 1, rowIdx - 1, 0, 5));
            for (int c = 1; c <= 5; c++) {
                Cell emp = sumRow.createCell(c);
                emp.setCellStyle(styles.totalHeaderStyle);
            }
            crearCeldaMoneda(sumRow, 6, totalIngresosDetalle, styles.totalCurrencyStyle);
            crearCeldaMoneda(sumRow, 7, totalEgresosDetalle, styles.totalCurrencyStyle);
            crearCeldaMoneda(sumRow, 8, totalComisionesDetalle, styles.totalCurrencyStyle);
            Cell emptyEnd = sumRow.createCell(9);
            emptyEnd.setCellValue("");
            emptyEnd.setCellStyle(styles.totalHeaderStyle);

            // Fila de Balance Neto
            Row balRow = sheetDetalle.createRow(rowIdx++);
            Cell lblBal = balRow.createCell(0);
            lblBal.setCellValue("BALANCE NETO (INGRESOS - EGRESOS - COMISIONES PAGADAS)");
            lblBal.setCellStyle(styles.totalHeaderStyle);
            sheetDetalle.addMergedRegion(new CellRangeAddress(rowIdx - 1, rowIdx - 1, 0, 5));
            for (int c = 1; c <= 5; c++) {
                Cell emp = balRow.createCell(c);
                emp.setCellStyle(styles.totalHeaderStyle);
            }
            double balNetoDetalle = totalIngresosDetalle - totalEgresosDetalle - totalComisionesDetalle;
            crearCeldaMoneda(balRow, 6, balNetoDetalle, styles.totalCurrencyStyle);
            sheetDetalle.addMergedRegion(new CellRangeAddress(rowIdx - 1, rowIdx - 1, 6, 9));
            for (int c = 7; c <= 9; c++) {
                Cell emp = balRow.createCell(c);
                emp.setCellStyle(styles.totalCurrencyStyle);
            }

            ajustarAnchos(sheetDetalle, new int[]{14, 18, 22, 18, 38, 28, 18, 18, 16, 16});

            wb.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Genera el libro Excel para el Reporte de Ventas con 2 hojas:
     * 1. Ventas por Empleado
     * 2. Detalle de Ventas
     */
    public byte[] generarExcelVentas(
            String periodoNombre,
            List<Map<String, Object>> ventasAgrupadas,
            List<VistaTransaccionesCompletas> transacciones) throws IOException {

        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            StylesHelper styles = new StylesHelper(wb);

            // ==================== HOJA 1: RESUMEN POR EMPLEADO ====================
            Sheet sheetResumen = wb.createSheet("Ventas por Empleado");
            String[] headersResumen = {"Empleado", "Cantidad de Ventas", "Total Ventas", "Total Comisiones"};

            Row hRow = sheetResumen.createRow(0);
            for (int i = 0; i < headersResumen.length; i++) {
                Cell c = hRow.createCell(i);
                c.setCellValue(headersResumen[i]);
                c.setCellStyle(styles.headerStyle);
            }

            int rIdx = 1;
            double sumTotalVentas = 0.0;
            double sumTotalComisiones = 0.0;
            int sumCantidad = 0;

            for (Map<String, Object> v : ventasAgrupadas) {
                Row row = sheetResumen.createRow(rIdx++);
                boolean isAlt = (rIdx % 2 == 0);
                CellStyle textStyle = isAlt ? styles.altTextStyle : styles.textStyle;
                CellStyle currStyle = isAlt ? styles.altCurrencyStyle : styles.currencyStyle;

                String emp = v.get("empleado") != null ? v.get("empleado").toString() : "Sin asignar";
                int cant = v.get("cantidadVentas") != null ? ((Number) v.get("cantidadVentas")).intValue() : 0;
                double totV = v.get("totalVentas") != null ? ((Number) v.get("totalVentas")).doubleValue() : 0.0;
                double totC = v.get("totalComisiones") != null ? ((Number) v.get("totalComisiones")).doubleValue() : 0.0;

                sumCantidad += cant;
                sumTotalVentas += totV;
                sumTotalComisiones += totC;

                Cell cEmp = row.createCell(0);
                cEmp.setCellValue(emp);
                cEmp.setCellStyle(textStyle);

                Cell cCant = row.createCell(1);
                cCant.setCellValue(cant);
                cCant.setCellStyle(isAlt ? styles.altTextCenterStyle : styles.textCenterStyle);

                crearCeldaMoneda(row, 2, totV, currStyle);
                crearCeldaMoneda(row, 3, totC, currStyle);
            }

            // Totales de Ventas por Empleado
            Row tRow = sheetResumen.createRow(rIdx);
            Cell tCell = tRow.createCell(0);
            tCell.setCellValue("TOTALES");
            tCell.setCellStyle(styles.totalHeaderStyle);

            Cell tCant = tRow.createCell(1);
            tCant.setCellValue(sumCantidad);
            tCant.setCellStyle(styles.totalHeaderStyle);

            crearCeldaMoneda(tRow, 2, sumTotalVentas, styles.totalCurrencyStyle);
            crearCeldaMoneda(tRow, 3, sumTotalComisiones, styles.totalCurrencyStyle);

            ajustarAnchos(sheetResumen, new int[]{28, 20, 22, 22});

            // ==================== HOJA 2: DETALLE DE VENTAS ====================
            Sheet sheetDetalle = wb.createSheet("Detalle de Ventas");
            String[] headersDetalle = {
                    "Fecha", "Vendedor", "Referencia", "Descripción", "Producto / Ítem", "Monto Venta", "Comisión"
            };

            Row dHRow = sheetDetalle.createRow(0);
            for (int i = 0; i < headersDetalle.length; i++) {
                Cell c = dHRow.createCell(i);
                c.setCellValue(headersDetalle[i]);
                c.setCellStyle(styles.headerStyle);
            }

            int rowIdx = 1;
            double totalVentasMonto = 0.0;
            double totalComisionesMonto = 0.0;

            for (VistaTransaccionesCompletas t : transacciones) {
                Row row = sheetDetalle.createRow(rowIdx++);
                boolean isAlt = (rowIdx % 2 == 0);
                CellStyle textStyle = isAlt ? styles.altTextStyle : styles.textStyle;
                CellStyle currStyle = isAlt ? styles.altCurrencyStyle : styles.currencyStyle;

                Cell cFecha = row.createCell(0);
                cFecha.setCellValue(t.getFecha() != null ? t.getFecha().format(DATE_FORMATTER) : "");
                cFecha.setCellStyle(isAlt ? styles.altTextCenterStyle : styles.textCenterStyle);

                Cell cVend = row.createCell(1);
                cVend.setCellValue(t.getEmpleado() != null ? t.getEmpleado() : "Sin Vendedor");
                cVend.setCellStyle(textStyle);

                Cell cRef = row.createCell(2);
                cRef.setCellValue(t.getReferencia() != null ? t.getReferencia() : (t.getCodigoTransaccion() != null ? t.getCodigoTransaccion() : ""));
                cRef.setCellStyle(textStyle);

                Cell cDesc = row.createCell(3);
                cDesc.setCellValue(t.getDescripcion() != null ? t.getDescripcion() : "");
                cDesc.setCellStyle(textStyle);

                String producto = t.getCodigoRepuesto() != null ? "Repuesto: " + t.getCodigoRepuesto()
                        : (t.getCodigoVehiculo() != null ? "Vehículo: " + t.getCodigoVehiculo() : "Servicio/General");
                Cell cProd = row.createCell(4);
                cProd.setCellValue(producto);
                cProd.setCellStyle(textStyle);

                double montoVal = t.getMonto() != null ? t.getMonto().doubleValue() : 0.0;
                totalVentasMonto += montoVal;
                crearCeldaMoneda(row, 5, montoVal, currStyle);

                double comVal = t.getComisionEmpleado() != null ? t.getComisionEmpleado().doubleValue() : 0.0;
                totalComisionesMonto += comVal;
                crearCeldaMoneda(row, 6, comVal, currStyle);
            }

            // Fila de Sumatoria de Totales
            Row sumRow = sheetDetalle.createRow(rowIdx++);
            Cell lblSum = sumRow.createCell(0);
            lblSum.setCellValue("TOTALES / SUMATORIA");
            lblSum.setCellStyle(styles.totalHeaderStyle);
            sheetDetalle.addMergedRegion(new CellRangeAddress(rowIdx - 1, rowIdx - 1, 0, 4));
            for (int c = 1; c <= 4; c++) {
                Cell emp = sumRow.createCell(c);
                emp.setCellStyle(styles.totalHeaderStyle);
            }
            crearCeldaMoneda(sumRow, 5, totalVentasMonto, styles.totalCurrencyStyle);
            crearCeldaMoneda(sumRow, 6, totalComisionesMonto, styles.totalCurrencyStyle);

            ajustarAnchos(sheetDetalle, new int[]{14, 24, 20, 38, 28, 18, 18});

            wb.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Genera el libro Excel para el Reporte Jerárquico de Rentabilidad por Generación:
     * Hoja 1: Resumen por Marca
     * Hoja 2: Jerarquía Detallada (Marca -> Modelo -> Generación)
     */
    public byte[] generarExcelJerarquia(
            String periodoNombre,
            List<VistaResumenGeneraciones> generaciones) throws IOException {

        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            StylesHelper styles = new StylesHelper(wb);

            // Agrupar por Marca para Hoja 1
            Map<String, List<VistaResumenGeneraciones>> porMarca = new LinkedHashMap<>();
            for (VistaResumenGeneraciones g : generaciones) {
                String marca = (g.getMarca() != null && !g.getMarca().trim().isEmpty()) ? g.getMarca().trim() : "Sin Marca";
                porMarca.computeIfAbsent(marca, k -> new ArrayList<>()).add(g);
            }

            // ==================== HOJA 1: RESUMEN POR MARCA ====================
            Sheet sheetMarca = wb.createSheet("Resumen por Marca");
            String[] headersMarca = {
                    "Marca", "Generaciones", "Total Vehículos", "Total Repuestos",
                    "Inversión Total", "Ingresos Totales", "Balance Neto", "% Retorno"
            };

            Row hRow = sheetMarca.createRow(0);
            for (int i = 0; i < headersMarca.length; i++) {
                Cell c = hRow.createCell(i);
                c.setCellValue(headersMarca[i]);
                c.setCellStyle(styles.headerStyle);
            }

            int mIdx = 1;
            long tVehiculos = 0;
            long tRepuestos = 0;
            double tInversion = 0.0;
            double tIngresos = 0.0;
            double tBalance = 0.0;

            for (Map.Entry<String, List<VistaResumenGeneraciones>> entry : porMarca.entrySet()) {
                String marca = entry.getKey();
                List<VistaResumenGeneraciones> lista = entry.getValue();

                long mVeh = lista.stream().mapToLong(g -> g.getTotalVehiculos() != null ? g.getTotalVehiculos() : 0).sum();
                long mRep = lista.stream().mapToLong(g -> g.getTotalRepuestos() != null ? g.getTotalRepuestos() : 0).sum();
                double mInv = lista.stream().mapToDouble(g -> g.getTotalInversion() != null ? g.getTotalInversion().doubleValue() : 0.0).sum();
                double mIng = lista.stream().mapToDouble(g -> g.getTotalIngresos() != null ? g.getTotalIngresos().doubleValue() : 0.0).sum();
                double mBal = mIng - mInv;
                double mRet = (mInv > 0) ? ((mBal / mInv) * 100.0) : 0.0;

                tVehiculos += mVeh;
                tRepuestos += mRep;
                tInversion += mInv;
                tIngresos += mIng;
                tBalance += mBal;

                Row row = sheetMarca.createRow(mIdx++);
                boolean isAlt = (mIdx % 2 == 0);
                CellStyle textStyle = isAlt ? styles.altTextStyle : styles.textStyle;
                CellStyle currStyle = isAlt ? styles.altCurrencyStyle : styles.currencyStyle;

                Cell cMarca = row.createCell(0);
                cMarca.setCellValue(marca);
                cMarca.setCellStyle(textStyle);

                Cell cGen = row.createCell(1);
                cGen.setCellValue(lista.size());
                cGen.setCellStyle(isAlt ? styles.altTextCenterStyle : styles.textCenterStyle);

                Cell cVeh = row.createCell(2);
                cVeh.setCellValue(mVeh);
                cVeh.setCellStyle(isAlt ? styles.altTextCenterStyle : styles.textCenterStyle);

                Cell cRep = row.createCell(3);
                cRep.setCellValue(mRep);
                cRep.setCellStyle(isAlt ? styles.altTextCenterStyle : styles.textCenterStyle);

                crearCeldaMoneda(row, 4, mInv, currStyle);
                crearCeldaMoneda(row, 5, mIng, currStyle);
                crearCeldaMoneda(row, 6, mBal, currStyle);

                Cell cRet = row.createCell(7);
                cRet.setCellValue(String.format("%.1f%%", mRet));
                cRet.setCellStyle(isAlt ? styles.altTextCenterStyle : styles.textCenterStyle);
            }

            // Fila de TOTALES Marca
            Row tRow = sheetMarca.createRow(mIdx);
            Cell tCell = tRow.createCell(0);
            tCell.setCellValue("TOTALES");
            tCell.setCellStyle(styles.totalHeaderStyle);

            Cell tGen = tRow.createCell(1);
            tGen.setCellValue(generaciones.size());
            tGen.setCellStyle(styles.totalHeaderStyle);

            Cell tVeh = tRow.createCell(2);
            tVeh.setCellValue(tVehiculos);
            tVeh.setCellStyle(styles.totalHeaderStyle);

            Cell tRep = tRow.createCell(3);
            tRep.setCellValue(tRepuestos);
            tRep.setCellStyle(styles.totalHeaderStyle);

            crearCeldaMoneda(tRow, 4, tInversion, styles.totalCurrencyStyle);
            crearCeldaMoneda(tRow, 5, tIngresos, styles.totalCurrencyStyle);
            crearCeldaMoneda(tRow, 6, tBalance, styles.totalCurrencyStyle);

            double globalRet = (tInversion > 0) ? ((tBalance / tInversion) * 100.0) : 0.0;
            Cell tRet = tRow.createCell(7);
            tRet.setCellValue(String.format("%.1f%%", globalRet));
            tRet.setCellStyle(styles.totalHeaderStyle);

            ajustarAnchos(sheetMarca, new int[]{22, 16, 18, 18, 22, 22, 22, 16});

            // ==================== HOJA 2: JERARQUÍA DETALLADA ====================
            Sheet sheetDetalle = wb.createSheet("Jerarquía Detallada");
            String[] headersDetalle = {
                    "Marca", "Modelo", "Generación", "Años", "Clave",
                    "Vehículos", "Repuestos", "Inversión Total", "Ingresos", "Balance Neto", "% Retorno"
            };

            Row dHRow = sheetDetalle.createRow(0);
            for (int i = 0; i < headersDetalle.length; i++) {
                Cell c = dHRow.createCell(i);
                c.setCellValue(headersDetalle[i]);
                c.setCellStyle(styles.headerStyle);
            }

            int dIdx = 1;
            for (VistaResumenGeneraciones g : generaciones) {
                Row row = sheetDetalle.createRow(dIdx++);
                boolean isAlt = (dIdx % 2 == 0);
                CellStyle textStyle = isAlt ? styles.altTextStyle : styles.textStyle;
                CellStyle currStyle = isAlt ? styles.altCurrencyStyle : styles.currencyStyle;

                Cell cMar = row.createCell(0);
                cMar.setCellValue(g.getMarca() != null ? g.getMarca() : "");
                cMar.setCellStyle(textStyle);

                Cell cMod = row.createCell(1);
                cMod.setCellValue(g.getModelo() != null ? g.getModelo() : "");
                cMod.setCellStyle(textStyle);

                Cell cGen = row.createCell(2);
                cGen.setCellValue(g.getGeneracion() != null ? g.getGeneracion() : "");
                cGen.setCellStyle(textStyle);

                String anios = (g.getAnioInicio() != null ? g.getAnioInicio().toString() : "")
                        + (g.getAnioFin() != null ? " - " + g.getAnioFin() : "");
                Cell cAnio = row.createCell(3);
                cAnio.setCellValue(anios);
                cAnio.setCellStyle(isAlt ? styles.altTextCenterStyle : styles.textCenterStyle);

                Cell cClv = row.createCell(4);
                cClv.setCellValue(g.getClaveGeneracion() != null ? g.getClaveGeneracion() : "");
                cClv.setCellStyle(textStyle);

                Cell cVeh = row.createCell(5);
                cVeh.setCellValue(g.getTotalVehiculos() != null ? g.getTotalVehiculos() : 0);
                cVeh.setCellStyle(isAlt ? styles.altTextCenterStyle : styles.textCenterStyle);

                Cell cRep = row.createCell(6);
                cRep.setCellValue(g.getTotalRepuestos() != null ? g.getTotalRepuestos() : 0);
                cRep.setCellStyle(isAlt ? styles.altTextCenterStyle : styles.textCenterStyle);

                double inv = g.getTotalInversion() != null ? g.getTotalInversion().doubleValue() : 0.0;
                double ing = g.getTotalIngresos() != null ? g.getTotalIngresos().doubleValue() : 0.0;
                double bal = ing - inv;
                double ret = (inv > 0) ? ((bal / inv) * 100.0) : 0.0;

                crearCeldaMoneda(row, 7, inv, currStyle);
                crearCeldaMoneda(row, 8, ing, currStyle);
                crearCeldaMoneda(row, 9, bal, currStyle);

                Cell cRet = row.createCell(10);
                cRet.setCellValue(String.format("%.1f%%", ret));
                cRet.setCellStyle(isAlt ? styles.altTextCenterStyle : styles.textCenterStyle);
            }

            // Agrupar filas colapsables por Marca en la hoja detallada
            if (generaciones.size() > 1) {
                int startRow = 1;
                String currentMarca = generaciones.get(0).getMarca() != null ? generaciones.get(0).getMarca() : "";
                for (int i = 0; i < generaciones.size(); i++) {
                    String m = generaciones.get(i).getMarca() != null ? generaciones.get(i).getMarca() : "";
                    if (!m.equals(currentMarca)) {
                        if (i > startRow) {
                            sheetDetalle.groupRow(startRow + 1, i);
                        }
                        startRow = i;
                        currentMarca = m;
                    }
                }
                if (generaciones.size() > startRow + 1) {
                    sheetDetalle.groupRow(startRow + 1, generaciones.size());
                }
                sheetDetalle.setRowSumsBelow(false);
            }

            ajustarAnchos(sheetDetalle, new int[]{18, 20, 22, 16, 20, 14, 14, 20, 20, 20, 16});

            wb.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Genera el libro Excel para el Reporte Jerárquico completo basado en el árbol consolidado
     * (con 3 hojas: Jerarquía Colapsable, Resumen por Modelo, Detalle de Vehículos) utilizando Apache POI.
     */
    public byte[] generarExcelJerarquiaDesdeArbol(
            String periodoNombre,
            List<Map<String, Object>> marcasTree) throws IOException {

        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            StylesHelper styles = new StylesHelper(wb);

            // ==================== HOJA 1: JERARQUÍA COLAPSABLE ====================
            Sheet s1 = wb.createSheet("Jerarquía Colapsable");
            String[] headersS1 = {
                    "Estructura Jerárquica", "Año", "Estado", "Repuestos Extraídos",
                    "Inversión Base", "Gastos Adicionales", "Inversión Total",
                    "Ingresos / Recuperado", "Balance Neto", "% Retorno"
            };

            Row h1Row = s1.createRow(0);
            h1Row.setHeightInPoints(26);
            for (int i = 0; i < headersS1.length; i++) {
                Cell c = h1Row.createCell(i);
                c.setCellValue(headersS1[i]);
                c.setCellStyle(styles.headerStyle);
            }

            int s1RowIdx = 1;
            long totalVehiculos = 0;
            long totalRepuestos = 0;
            double totalInversion = 0.0;
            double totalRecuperado = 0.0;
            double totalBalanceNeto = 0.0;

            for (Map<String, Object> marca : marcasTree) {
                String nomMarca = toStr(marca.get("nombre"), "Sin Marca");
                double mInv = toDouble(marca.get("total_inversion"));
                double mIng = toDouble(marca.get("total_ingresos"));
                double mBal = toDouble(marca.get("balance_neto"));
                long mRep = toLong(marca.get("total_repuestos"));
                double mRoi = (mInv > 0) ? ((mBal / mInv) * 100.0) : 0.0;

                totalInversion += mInv;
                totalRecuperado += mIng;
                totalBalanceNeto += mBal;
                totalRepuestos += mRep;

                Row rMarca = s1.createRow(s1RowIdx++);
                rMarca.setHeightInPoints(24);
                rMarca.createCell(0).setCellValue("  MARCA: " + nomMarca.toUpperCase());
                rMarca.getCell(0).setCellStyle(styles.marcaStyle);

                rMarca.createCell(1).setCellValue("");
                rMarca.getCell(1).setCellStyle(styles.marcaStyle);

                rMarca.createCell(2).setCellValue("");
                rMarca.getCell(2).setCellStyle(styles.marcaStyle);

                rMarca.createCell(3).setCellValue(mRep);
                rMarca.getCell(3).setCellStyle(styles.marcaCenterStyle);

                rMarca.createCell(4).setCellValue("");
                rMarca.getCell(4).setCellStyle(styles.marcaStyle);

                rMarca.createCell(5).setCellValue("");
                rMarca.getCell(5).setCellStyle(styles.marcaStyle);

                crearCeldaMoneda(rMarca, 6, mInv, styles.marcaCurrencyStyle);
                crearCeldaMoneda(rMarca, 7, mIng, styles.marcaCurrencyStyle);
                crearCeldaMoneda(rMarca, 8, mBal, styles.marcaCurrencyStyle);

                rMarca.createCell(9).setCellValue(String.format("%.1f%%", mRoi));
                rMarca.getCell(9).setCellStyle(styles.marcaCenterStyle);

                int marcaStartRow = s1RowIdx;

                List<Map<String, Object>> modelos = toList(marca.get("modelos"));
                for (Map<String, Object> modelo : modelos) {
                    String nomModelo = toStr(modelo.get("nombre"), "Sin Modelo");
                    double modInv = toDouble(modelo.get("total_inversion"));
                    double modIng = toDouble(modelo.get("total_ingresos"));
                    double modBal = toDouble(modelo.get("balance_neto"));
                    long modRep = toLong(modelo.get("total_repuestos"));
                    double modRoi = (modInv > 0) ? ((modBal / modInv) * 100.0) : 0.0;

                    Row rModelo = s1.createRow(s1RowIdx++);
                    rModelo.setHeightInPoints(22);
                    rModelo.createCell(0).setCellValue("       MODELO: " + nomModelo);
                    rModelo.getCell(0).setCellStyle(styles.modeloStyle);

                    rModelo.createCell(1).setCellValue("");
                    rModelo.getCell(1).setCellStyle(styles.modeloStyle);

                    rModelo.createCell(2).setCellValue("");
                    rModelo.getCell(2).setCellStyle(styles.modeloStyle);

                    rModelo.createCell(3).setCellValue(modRep);
                    rModelo.getCell(3).setCellStyle(styles.modeloCenterStyle);

                    rModelo.createCell(4).setCellValue("");
                    rModelo.getCell(4).setCellStyle(styles.modeloStyle);

                    rModelo.createCell(5).setCellValue("");
                    rModelo.getCell(5).setCellStyle(styles.modeloStyle);

                    crearCeldaMoneda(rModelo, 6, modInv, styles.modeloCurrencyStyle);
                    crearCeldaMoneda(rModelo, 7, modIng, styles.modeloCurrencyStyle);
                    crearCeldaMoneda(rModelo, 8, modBal, styles.modeloCurrencyStyle);

                    rModelo.createCell(9).setCellValue(String.format("%.1f%%", modRoi));
                    rModelo.getCell(9).setCellStyle(styles.modeloCenterStyle);

                    int modeloStartRow = s1RowIdx;

                    List<Map<String, Object>> generaciones = toList(modelo.get("generaciones"));
                    for (Map<String, Object> gen : generaciones) {
                        String nomGen = toStr(gen.get("nombre"), "Sin Generación");
                        String aIni = toStr(gen.get("anio_inicio"), "");
                        String aFin = toStr(gen.get("anio_fin"), "");
                        String aniosGen = aIni + (!aFin.isEmpty() ? " - " + aFin : "");
                        List<Map<String, Object>> vehiculos = toList(gen.get("vehiculos"));

                        double genInv = toDouble(gen.get("total_inversion"));
                        double genIng = toDouble(gen.get("total_ingresos"));
                        double genBal = toDouble(gen.get("balance_neto"));
                        long genRep = toLong(gen.get("total_repuestos"));
                        double genRoi = (genInv > 0) ? ((genBal / genInv) * 100.0) : 0.0;

                        Row rGen = s1.createRow(s1RowIdx++);
                        rGen.setHeightInPoints(20);
                        rGen.createCell(0).setCellValue("            GEN: " + nomGen);
                        rGen.getCell(0).setCellStyle(styles.genStyle);

                        rGen.createCell(1).setCellValue(aniosGen);
                        rGen.getCell(1).setCellStyle(styles.genCenterStyle);

                        rGen.createCell(2).setCellValue(vehiculos.size() + " veh");
                        rGen.getCell(2).setCellStyle(styles.genCenterStyle);

                        rGen.createCell(3).setCellValue(genRep);
                        rGen.getCell(3).setCellStyle(styles.genCenterStyle);

                        rGen.createCell(4).setCellValue("");
                        rGen.getCell(4).setCellStyle(styles.genStyle);

                        rGen.createCell(5).setCellValue("");
                        rGen.getCell(5).setCellStyle(styles.genStyle);

                        crearCeldaMoneda(rGen, 6, genInv, styles.genCurrencyStyle);
                        crearCeldaMoneda(rGen, 7, genIng, styles.genCurrencyStyle);
                        crearCeldaMoneda(rGen, 8, genBal, styles.genCurrencyStyle);

                        rGen.createCell(9).setCellValue(String.format("%.1f%%", genRoi));
                        rGen.getCell(9).setCellStyle(styles.genCenterStyle);

                        int genStartRow = s1RowIdx;

                        for (Map<String, Object> v : vehiculos) {
                            totalVehiculos++;
                            String anio = toStr(v.get("anio"), "-");
                            String estado = toStr(v.get("estado"), "Registrado");
                            double invBase = toDouble(v.get("precio_compra"));
                            double invTotal = toDouble(v.get("inversion_total"));
                            double gastos = Math.max(0, invTotal - invBase);
                            double recuperado = toDouble(v.get("costo_recuperado"));
                            double neto = toDouble(v.get("balance_neto"));
                            long cantRep = toLong(v.get("total_repuestos"));
                            if (cantRep == 0 && v.get("repuestos") instanceof List) {
                                cantRep = ((List<?>) v.get("repuestos")).size();
                            }
                            double vRoi = (invTotal > 0) ? ((neto / invTotal) * 100.0) : 0.0;

                            Row rVeh = s1.createRow(s1RowIdx++);
                            rVeh.setHeightInPoints(18);

                            rVeh.createCell(0).setCellValue("               • Vehículo (" + anio + " - " + estado + ")");
                            rVeh.getCell(0).setCellStyle(styles.textStyle);

                            rVeh.createCell(1).setCellValue(anio);
                            rVeh.getCell(1).setCellStyle(styles.textCenterStyle);

                            rVeh.createCell(2).setCellValue(estado);
                            rVeh.getCell(2).setCellStyle(styles.textCenterStyle);

                            rVeh.createCell(3).setCellValue(cantRep);
                            rVeh.getCell(3).setCellStyle(styles.textCenterStyle);

                            crearCeldaMoneda(rVeh, 4, invBase, styles.currencyStyle);
                            crearCeldaMoneda(rVeh, 5, gastos, styles.currencyStyle);
                            crearCeldaMoneda(rVeh, 6, invTotal, styles.currencyStyle);
                            crearCeldaMoneda(rVeh, 7, recuperado, styles.currencyStyle);
                            crearCeldaMoneda(rVeh, 8, neto, neto >= 0 ? styles.currencyPositiveStyle : styles.currencyNegativeStyle);

                            rVeh.createCell(9).setCellValue(String.format("%.1f%%", vRoi));
                            rVeh.getCell(9).setCellStyle(styles.textCenterStyle);
                        }

                        if (!vehiculos.isEmpty()) {
                            s1.groupRow(genStartRow, s1RowIdx - 1);
                        }
                    }

                    if (!generaciones.isEmpty()) {
                        s1.groupRow(modeloStartRow, s1RowIdx - 1);
                    }
                }

                if (!modelos.isEmpty()) {
                    s1.groupRow(marcaStartRow, s1RowIdx - 1);
                }
            }

            // Fila de TOTAL GENERAL en Hoja 1
            Row rTotalS1 = s1.createRow(s1RowIdx++);
            rTotalS1.setHeightInPoints(26);
            rTotalS1.createCell(0).setCellValue("TOTAL GENERAL DE FLOTA");
            rTotalS1.getCell(0).setCellStyle(styles.totalHeaderStyle);

            rTotalS1.createCell(1).setCellValue("");
            rTotalS1.getCell(1).setCellStyle(styles.totalHeaderStyle);

            rTotalS1.createCell(2).setCellValue(totalVehiculos + " Vehículos");
            rTotalS1.getCell(2).setCellStyle(styles.totalHeaderStyle);

            rTotalS1.createCell(3).setCellValue(totalRepuestos);
            rTotalS1.getCell(3).setCellStyle(styles.totalHeaderStyle);

            rTotalS1.createCell(4).setCellValue("");
            rTotalS1.getCell(4).setCellStyle(styles.totalHeaderStyle);

            rTotalS1.createCell(5).setCellValue("");
            rTotalS1.getCell(5).setCellStyle(styles.totalHeaderStyle);

            crearCeldaMoneda(rTotalS1, 6, totalInversion, styles.totalCurrencyStyle);
            crearCeldaMoneda(rTotalS1, 7, totalRecuperado, styles.totalCurrencyStyle);
            crearCeldaMoneda(rTotalS1, 8, totalBalanceNeto, styles.totalCurrencyStyle);

            double totalRoi = (totalInversion > 0) ? ((totalBalanceNeto / totalInversion) * 100.0) : 0.0;
            rTotalS1.createCell(9).setCellValue(String.format("%.1f%%", totalRoi));
            rTotalS1.getCell(9).setCellStyle(styles.totalHeaderStyle);

            ajustarAnchos(s1, new int[]{38, 14, 16, 18, 18, 18, 18, 22, 18, 14});

            // ==================== HOJA 2: RESUMEN POR MODELO ====================
            Sheet s2 = wb.createSheet("Resumen por Modelo");
            String[] headersS2 = {
                    "Marca", "Modelo", "Generaciones", "Total Vehículos", "Total Repuestos",
                    "Inversión Total", "Ingresos / Recuperado", "Balance Neto", "% Retorno"
            };

            Row h2Row = s2.createRow(0);
            h2Row.setHeightInPoints(24);
            for (int i = 0; i < headersS2.length; i++) {
                Cell c = h2Row.createCell(i);
                c.setCellValue(headersS2[i]);
                c.setCellStyle(styles.headerStyle);
            }

            int s2RowIdx = 1;
            for (Map<String, Object> marca : marcasTree) {
                String nomMarca = toStr(marca.get("nombre"), "Sin Marca");
                List<Map<String, Object>> modelos = toList(marca.get("modelos"));
                for (Map<String, Object> mod : modelos) {
                    boolean isAlt = (s2RowIdx % 2 == 0);
                    CellStyle txtSt = isAlt ? styles.altTextStyle : styles.textStyle;
                    CellStyle cntSt = isAlt ? styles.altTextCenterStyle : styles.textCenterStyle;
                    CellStyle curSt = isAlt ? styles.altCurrencyStyle : styles.currencyStyle;

                    String nomModelo = toStr(mod.get("nombre"), "Sin Modelo");
                    List<Map<String, Object>> gens = toList(mod.get("generaciones"));
                    long totVeh = toLong(mod.get("total_vehiculos"));
                    long totRep = toLong(mod.get("total_repuestos"));
                    double totInv = toDouble(mod.get("total_inversion"));
                    double totIng = toDouble(mod.get("total_ingresos"));
                    double balNet = toDouble(mod.get("balance_neto"));
                    double roi = (totInv > 0) ? ((balNet / totInv) * 100.0) : 0.0;

                    Row rMod = s2.createRow(s2RowIdx++);
                    rMod.setHeightInPoints(20);

                    rMod.createCell(0).setCellValue(nomMarca);
                    rMod.getCell(0).setCellStyle(txtSt);

                    rMod.createCell(1).setCellValue(nomModelo);
                    rMod.getCell(1).setCellStyle(txtSt);

                    rMod.createCell(2).setCellValue(gens.size());
                    rMod.getCell(2).setCellStyle(cntSt);

                    rMod.createCell(3).setCellValue(totVeh);
                    rMod.getCell(3).setCellStyle(cntSt);

                    rMod.createCell(4).setCellValue(totRep);
                    rMod.getCell(4).setCellStyle(cntSt);

                    crearCeldaMoneda(rMod, 5, totInv, curSt);
                    crearCeldaMoneda(rMod, 6, totIng, curSt);
                    crearCeldaMoneda(rMod, 7, balNet, curSt);

                    rMod.createCell(8).setCellValue(String.format("%.1f%%", roi));
                    rMod.getCell(8).setCellStyle(cntSt);
                }
            }

            // Fila de TOTALES en Hoja 2
            Row rTotalS2 = s2.createRow(s2RowIdx++);
            rTotalS2.setHeightInPoints(22);
            rTotalS2.createCell(0).setCellValue("TOTALES");
            rTotalS2.getCell(0).setCellStyle(styles.totalHeaderStyle);

            rTotalS2.createCell(1).setCellValue("");
            rTotalS2.getCell(1).setCellStyle(styles.totalHeaderStyle);

            rTotalS2.createCell(2).setCellValue("");
            rTotalS2.getCell(2).setCellStyle(styles.totalHeaderStyle);

            rTotalS2.createCell(3).setCellValue(totalVehiculos);
            rTotalS2.getCell(3).setCellStyle(styles.totalHeaderStyle);

            rTotalS2.createCell(4).setCellValue(totalRepuestos);
            rTotalS2.getCell(4).setCellStyle(styles.totalHeaderStyle);

            crearCeldaMoneda(rTotalS2, 5, totalInversion, styles.totalCurrencyStyle);
            crearCeldaMoneda(rTotalS2, 6, totalRecuperado, styles.totalCurrencyStyle);
            crearCeldaMoneda(rTotalS2, 7, totalBalanceNeto, styles.totalCurrencyStyle);

            rTotalS2.createCell(8).setCellValue(String.format("%.1f%%", totalRoi));
            rTotalS2.getCell(8).setCellStyle(styles.totalHeaderStyle);

            ajustarAnchos(s2, new int[]{18, 20, 14, 16, 16, 18, 22, 18, 14});

            // ==================== HOJA 3: DETALLE DE VEHÍCULOS ====================
            Sheet s3 = wb.createSheet("Detalle de Vehículos");
            String[] headersS3 = {
                    "Marca", "Modelo", "Generación", "Año", "Estado",
                    "Inversión Base", "Gastos / Reparación", "Inversión Total",
                    "Ingresos / Recuperado", "Balance Neto", "Repuestos Extraídos"
            };

            Row h3Row = s3.createRow(0);
            h3Row.setHeightInPoints(24);
            for (int i = 0; i < headersS3.length; i++) {
                Cell c = h3Row.createCell(i);
                c.setCellValue(headersS3[i]);
                c.setCellStyle(styles.headerStyle);
            }

            int s3RowIdx = 1;
            for (Map<String, Object> marca : marcasTree) {
                String nomMarca = toStr(marca.get("nombre"), "Sin Marca");
                List<Map<String, Object>> modelos = toList(marca.get("modelos"));
                for (Map<String, Object> mod : modelos) {
                    String nomModelo = toStr(mod.get("nombre"), "Sin Modelo");
                    List<Map<String, Object>> gens = toList(mod.get("generaciones"));
                    for (Map<String, Object> gen : gens) {
                        String nomGen = toStr(gen.get("nombre"), "Sin Generación");
                        List<Map<String, Object>> vehiculos = toList(gen.get("vehiculos"));
                        for (Map<String, Object> v : vehiculos) {
                            boolean isAlt = (s3RowIdx % 2 == 0);
                            CellStyle txtSt = isAlt ? styles.altTextStyle : styles.textStyle;
                            CellStyle cntSt = isAlt ? styles.altTextCenterStyle : styles.textCenterStyle;
                            CellStyle curSt = isAlt ? styles.altCurrencyStyle : styles.currencyStyle;

                            String anio = toStr(v.get("anio"), "-");
                            String estado = toStr(v.get("estado"), "-");
                            double invBase = toDouble(v.get("precio_compra"));
                            double invTotal = toDouble(v.get("inversion_total"));
                            double gastos = Math.max(0, invTotal - invBase);
                            double recuperado = toDouble(v.get("costo_recuperado"));
                            double neto = toDouble(v.get("balance_neto"));
                            long cantRep = toLong(v.get("total_repuestos"));
                            if (cantRep == 0 && v.get("repuestos") instanceof List) {
                                cantRep = ((List<?>) v.get("repuestos")).size();
                            }

                            Row rVeh = s3.createRow(s3RowIdx++);
                            rVeh.setHeightInPoints(19);

                            rVeh.createCell(0).setCellValue(nomMarca);
                            rVeh.getCell(0).setCellStyle(txtSt);

                            rVeh.createCell(1).setCellValue(nomModelo);
                            rVeh.getCell(1).setCellStyle(txtSt);

                            rVeh.createCell(2).setCellValue(nomGen);
                            rVeh.getCell(2).setCellStyle(txtSt);

                            rVeh.createCell(3).setCellValue(anio);
                            rVeh.getCell(3).setCellStyle(cntSt);

                            rVeh.createCell(4).setCellValue(estado);
                            rVeh.getCell(4).setCellStyle(cntSt);

                            crearCeldaMoneda(rVeh, 5, invBase, curSt);
                            crearCeldaMoneda(rVeh, 6, gastos, curSt);
                            crearCeldaMoneda(rVeh, 7, invTotal, curSt);
                            crearCeldaMoneda(rVeh, 8, recuperado, curSt);
                            crearCeldaMoneda(rVeh, 9, neto, neto >= 0 ? styles.currencyPositiveStyle : styles.currencyNegativeStyle);

                            rVeh.createCell(10).setCellValue(cantRep);
                            rVeh.getCell(10).setCellStyle(cntSt);
                        }
                    }
                }
            }

            ajustarAnchos(s3, new int[]{16, 18, 22, 10, 14, 16, 18, 16, 20, 16, 18});

            wb.write(out);
            return out.toByteArray();
        }
    }

    private double toDouble(Object val) {
        if (val == null) return 0.0;
        if (val instanceof Number) return ((Number) val).doubleValue();
        try {
            return Double.parseDouble(val.toString());
        } catch (Exception e) {
            return 0.0;
        }
    }

    private long toLong(Object val) {
        if (val == null) return 0L;
        if (val instanceof Number) return ((Number) val).longValue();
        try {
            return Long.parseLong(val.toString());
        } catch (Exception e) {
            return 0L;
        }
    }

    private String toStr(Object val, String def) {
        return (val != null) ? val.toString() : def;
    }

    @SuppressWarnings("unchecked")
    private <T> List<T> toList(Object val) {
        if (val instanceof List) return (List<T>) val;
        return java.util.Collections.emptyList();
    }

    private String normalizarNombre(String nombre) {
        if (nombre == null || nombre.isBlank()) return "Sin asignar";
        String[] partes = nombre.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String p : partes) {
            if (p.isBlank()) continue;
            if (sb.length() > 0) sb.append(" ");
            sb.append(Character.toUpperCase(p.charAt(0)));
            if (p.length() > 1) {
                sb.append(p.substring(1).toLowerCase());
            }
        }
        return sb.toString();
    }

    /**
     * Genera el Reporte de Ventas y Comisiones INS (Audatex) en formato Excel XLSX.
     * Hoja 1: Resumen por Colaborador (Total Ventas, Comisiones Ganadas, Comisiones Pagadas, Saldo Pendiente)
     * Hoja 2: Detalle de Pedidos INS (Número, Cotización, Siniestro, Vehículo, Colaborador, Montos, Estado Comisión)
     */
    public byte[] generarReporteVentasInsExcel(
            List<Map<String, Object>> pedidos,
            Integer anioFiltro,
            Integer mesFiltro
    ) throws IOException {
        try (Workbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            StylesHelper styles = new StylesHelper(wb);

            // Hoja 1: Resumen por Colaborador
            Sheet sheetResumen = wb.createSheet("Resumen por Colaborador");
            sheetResumen.setDisplayGridlines(true);

            String[] headersResumen = {
                    "Colaborador",
                    "Pedidos Entregados",
                    "Total Ventas",
                    "Comisiones Ganadas",
                    "Comisiones Pagadas",
                    "Saldo Pendiente",
                    "% Comisión Promedio"
            };

            Row hRow = sheetResumen.createRow(0);
            for (int i = 0; i < headersResumen.length; i++) {
                Cell c = hRow.createCell(i);
                c.setCellValue(headersResumen[i]);
                c.setCellStyle(styles.headerStyle);
            }

            Map<String, double[]> totalesPorEmpleado = new LinkedHashMap<>();
            Map<String, int[]> conteoPorEmpleado = new LinkedHashMap<>();

            for (Map<String, Object> p : pedidos) {
                String estado = p.get("estado") != null ? p.get("estado").toString() : "";
                if (!"Entregado".equalsIgnoreCase(estado)) {
                    continue;
                }

                String fechaStr = p.get("fecha") != null ? p.get("fecha").toString() : (p.get("fechaCreacion") != null ? p.get("fechaCreacion").toString() : "");
                if (anioFiltro != null && !fechaStr.isBlank() && !fechaStr.contains(String.valueOf(anioFiltro))) {
                    continue;
                }

                String emp = p.get("empleadoNombre") != null ? p.get("empleadoNombre").toString() :
                             (p.get("usuarioNombre") != null ? p.get("usuarioNombre").toString() : "Sin asignar");
                emp = normalizarNombre(emp);

                double total = p.get("totalPedido") != null ? ((Number) p.get("totalPedido")).doubleValue() : 0.0;
                double comision = p.get("comisionCalculada") != null ? ((Number) p.get("comisionCalculada")).doubleValue() : (total * 0.03);
                boolean pagada = Boolean.TRUE.equals(p.get("comisionPagada"));
                double comPagada = pagada ? comision : 0.0;
                double comPendiente = pagada ? 0.0 : comision;

                double[] vals = totalesPorEmpleado.computeIfAbsent(emp, k -> new double[4]);
                vals[0] += total;
                vals[1] += comision;
                vals[2] += comPagada;
                vals[3] += comPendiente;

                int[] counts = conteoPorEmpleado.computeIfAbsent(emp, k -> new int[1]);
                counts[0] += 1;
            }

            int rIdx = 1;
            double sumVentas = 0.0;
            double sumComGanadas = 0.0;
            double sumComPagadas = 0.0;
            double sumSaldoPendiente = 0.0;
            int sumPedidos = 0;

            for (Map.Entry<String, double[]> entry : totalesPorEmpleado.entrySet()) {
                String emp = entry.getKey();
                double[] vals = entry.getValue();
                int cant = conteoPorEmpleado.get(emp)[0];

                sumPedidos += cant;
                sumVentas += vals[0];
                sumComGanadas += vals[1];
                sumComPagadas += vals[2];
                sumSaldoPendiente += vals[3];

                Row row = sheetResumen.createRow(rIdx++);
                boolean isAlt = (rIdx % 2 == 0);
                CellStyle textStyle = isAlt ? styles.altTextStyle : styles.textStyle;
                CellStyle currStyle = isAlt ? styles.altCurrencyStyle : styles.currencyStyle;

                Cell cEmp = row.createCell(0);
                cEmp.setCellValue(emp);
                cEmp.setCellStyle(textStyle);

                Cell cCant = row.createCell(1);
                cCant.setCellValue(cant);
                cCant.setCellStyle(isAlt ? styles.altTextCenterStyle : styles.textCenterStyle);

                crearCeldaMoneda(row, 2, vals[0], currStyle);
                crearCeldaMoneda(row, 3, vals[1], currStyle);
                crearCeldaMoneda(row, 4, vals[2], currStyle);
                crearCeldaMoneda(row, 5, vals[3], currStyle);

                double pct = vals[0] > 0 ? (vals[1] / vals[0]) * 100.0 : 0.0;
                Cell cPct = row.createCell(6);
                cPct.setCellValue(String.format(Locale.US, "%.1f%%", pct));
                cPct.setCellStyle(isAlt ? styles.altTextCenterStyle : styles.textCenterStyle);
            }

            // Fila de TOTALES Resumen
            Row tRow = sheetResumen.createRow(rIdx);
            Cell tCell = tRow.createCell(0);
            tCell.setCellValue("TOTALES");
            tCell.setCellStyle(styles.totalHeaderStyle);

            Cell tCant = tRow.createCell(1);
            tCant.setCellValue(sumPedidos);
            tCant.setCellStyle(styles.totalHeaderStyle);

            crearCeldaMoneda(tRow, 2, sumVentas, styles.totalCurrencyStyle);
            crearCeldaMoneda(tRow, 3, sumComGanadas, styles.totalCurrencyStyle);
            crearCeldaMoneda(tRow, 4, sumComPagadas, styles.totalCurrencyStyle);
            crearCeldaMoneda(tRow, 5, sumSaldoPendiente, styles.totalCurrencyStyle);

            double sumPct = sumVentas > 0 ? (sumComGanadas / sumVentas) * 100.0 : 0.0;
            Cell tPct = tRow.createCell(6);
            tPct.setCellValue(String.format(Locale.US, "%.1f%%", sumPct));
            tPct.setCellStyle(styles.totalHeaderStyle);

            // Hoja 2: Detalle de Pedidos INS
            Sheet sheetDetalle = wb.createSheet("Detalle Pedidos INS");
            sheetDetalle.setDisplayGridlines(true);

            String[] headersDetalle = {
                    "Pedido #",
                    "Cotización ID",
                    "Siniestro",
                    "Vehículo",
                    "Aseguradora",
                    "Colaborador",
                    "Fecha",
                    "Total Venta",
                    "% Com.",
                    "Comisión",
                    "Estado Comisión",
                    "Fecha Pago",
                    "Comprobante / Ref.",
                    "Notas"
            };

            Row dRow = sheetDetalle.createRow(0);
            for (int i = 0; i < headersDetalle.length; i++) {
                Cell c = dRow.createCell(i);
                c.setCellValue(headersDetalle[i]);
                c.setCellStyle(styles.headerStyle);
            }

            int dIdx = 1;
            for (Map<String, Object> p : pedidos) {
                String estado = p.get("estado") != null ? p.get("estado").toString() : "";
                if (!"Entregado".equalsIgnoreCase(estado)) continue;

                Row row = sheetDetalle.createRow(dIdx++);
                boolean isAlt = (dIdx % 2 == 0);
                CellStyle textStyle = isAlt ? styles.altTextStyle : styles.textStyle;
                CellStyle currStyle = isAlt ? styles.altCurrencyStyle : styles.currencyStyle;
                CellStyle centerStyle = isAlt ? styles.altTextCenterStyle : styles.textCenterStyle;

                String numPed = p.get("numeroPedido") != null ? p.get("numeroPedido").toString() : ("ID-" + p.get("id"));
                String cotId = p.get("cotizacionId") != null ? p.get("cotizacionId").toString() : "";
                String sin = p.get("siniestro") != null ? p.get("siniestro").toString() : "";
                String veh = p.get("vehiculo") != null ? p.get("vehiculo").toString() : (p.get("armadora") != null ? p.get("armadora").toString() : "");
                String aseg = p.get("aseguradora") != null ? p.get("aseguradora").toString() : "INS";
                String emp = p.get("empleadoNombre") != null ? p.get("empleadoNombre").toString() :
                             (p.get("usuarioNombre") != null ? p.get("usuarioNombre").toString() : "Sin asignar");
                emp = normalizarNombre(emp);
                String fec = p.get("fecha") != null ? p.get("fecha").toString() : (p.get("fechaCreacion") != null ? p.get("fechaCreacion").toString() : "");

                double tot = p.get("totalPedido") != null ? ((Number) p.get("totalPedido")).doubleValue() : 0.0;
                int pct = p.get("porcentajeComision") != null ? ((Number) p.get("porcentajeComision")).intValue() : 3;
                double com = p.get("comisionCalculada") != null ? ((Number) p.get("comisionCalculada")).doubleValue() : (tot * pct / 100.0);
                boolean pag = Boolean.TRUE.equals(p.get("comisionPagada"));
                String estCom = pag ? "PAGADA" : "PENDIENTE";
                String fecPago = p.get("fechaPagoComision") != null ? p.get("fechaPagoComision").toString() : "";
                String refPago = p.get("referenciaPagoComision") != null ? p.get("referenciaPagoComision").toString() : "";
                String notasPago = p.get("notasPagoComision") != null ? p.get("notasPagoComision").toString() : "";

                Cell c0 = row.createCell(0); c0.setCellValue(numPed); c0.setCellStyle(centerStyle);
                Cell c1 = row.createCell(1); c1.setCellValue(cotId); c1.setCellStyle(centerStyle);
                Cell c2 = row.createCell(2); c2.setCellValue(sin); c2.setCellStyle(textStyle);
                Cell c3 = row.createCell(3); c3.setCellValue(veh); c3.setCellStyle(textStyle);
                Cell c4 = row.createCell(4); c4.setCellValue(aseg); c4.setCellStyle(textStyle);
                Cell c5 = row.createCell(5); c5.setCellValue(emp); c5.setCellStyle(textStyle);
                Cell c6 = row.createCell(6); c6.setCellValue(fec); c6.setCellStyle(centerStyle);

                crearCeldaMoneda(row, 7, tot, currStyle);
                Cell c8 = row.createCell(8); c8.setCellValue(pct + "%"); c8.setCellStyle(centerStyle);
                crearCeldaMoneda(row, 9, com, currStyle);

                Cell c10 = row.createCell(10); c10.setCellValue(estCom); c10.setCellStyle(centerStyle);
                Cell c11 = row.createCell(11); c11.setCellValue(fecPago); c11.setCellStyle(centerStyle);
                Cell c12 = row.createCell(12); c12.setCellValue(refPago); c12.setCellStyle(textStyle);
                Cell c13 = row.createCell(13); c13.setCellValue(notasPago); c13.setCellStyle(textStyle);
            }

            for (int i = 0; i < headersResumen.length; i++) {
                sheetResumen.autoSizeColumn(i);
                sheetResumen.setColumnWidth(i, Math.max(sheetResumen.getColumnWidth(i) + 1000, 3800));
            }
            for (int i = 0; i < headersDetalle.length; i++) {
                sheetDetalle.autoSizeColumn(i);
                sheetDetalle.setColumnWidth(i, Math.max(sheetDetalle.getColumnWidth(i) + 800, 3500));
            }

            wb.write(out);
            return out.toByteArray();
        }
    }

    private void crearCeldaMoneda(Row row, int colIndex, double value, CellStyle style) {
        Cell cell = row.createCell(colIndex);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    private void ajustarAnchos(Sheet sheet, int[] anchos) {
        for (int i = 0; i < anchos.length; i++) {
            sheet.setColumnWidth(i, anchos[i] * 256);
        }
    }

    /**
     * Estilos visuales consistentes con la paleta de Rodieja Contable.
     */
    private static class StylesHelper {
        final CellStyle headerStyle;
        final CellStyle totalHeaderStyle;
        final CellStyle totalCurrencyStyle;
        final CellStyle textStyle;
        final CellStyle altTextStyle;
        final CellStyle textCenterStyle;
        final CellStyle altTextCenterStyle;
        final CellStyle currencyStyle;
        final CellStyle altCurrencyStyle;
        final CellStyle currencyPositiveStyle;
        final CellStyle currencyNegativeStyle;
        final CellStyle marcaStyle;
        final CellStyle marcaCenterStyle;
        final CellStyle marcaCurrencyStyle;
        final CellStyle modeloStyle;
        final CellStyle modeloCenterStyle;
        final CellStyle modeloCurrencyStyle;
        final CellStyle genStyle;
        final CellStyle genCenterStyle;
        final CellStyle genCurrencyStyle;

        StylesHelper(Workbook wb) {
            DataFormat df = wb.createDataFormat();
            short currencyFormat = df.getFormat("₡#,##0.00;[Red]-₡#,##0.00");

            Font fontBold = wb.createFont();
            fontBold.setBold(true);
            fontBold.setFontHeightInPoints((short) 10);

            Font fontHeader = wb.createFont();
            fontHeader.setBold(true);
            fontHeader.setFontHeightInPoints((short) 11);
            fontHeader.setColor(IndexedColors.WHITE.getIndex());

            // Header (Azul Corporativo #001529 / DARK_BLUE)
            headerStyle = wb.createCellStyle();
            headerStyle.setFont(fontHeader);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);

            // Total Header
            totalHeaderStyle = wb.createCellStyle();
            totalHeaderStyle.setFont(fontBold);
            totalHeaderStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            totalHeaderStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            totalHeaderStyle.setBorderTop(BorderStyle.DOUBLE);
            totalHeaderStyle.setBorderBottom(BorderStyle.THIN);

            // Total Currency
            totalCurrencyStyle = wb.createCellStyle();
            totalCurrencyStyle.setFont(fontBold);
            totalCurrencyStyle.setDataFormat(currencyFormat);
            totalCurrencyStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            totalCurrencyStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            totalCurrencyStyle.setBorderTop(BorderStyle.DOUBLE);
            totalCurrencyStyle.setBorderBottom(BorderStyle.THIN);

            // Regular text
            textStyle = wb.createCellStyle();
            textStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            altTextStyle = wb.createCellStyle();
            altTextStyle.setFillForegroundColor(IndexedColors.LEMON_CHIFFON.getIndex());
            altTextStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            altTextStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            // Centered text
            textCenterStyle = wb.createCellStyle();
            textCenterStyle.setAlignment(HorizontalAlignment.CENTER);
            textCenterStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            altTextCenterStyle = wb.createCellStyle();
            altTextCenterStyle.setAlignment(HorizontalAlignment.CENTER);
            altTextCenterStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            altTextCenterStyle.setFillForegroundColor(IndexedColors.LEMON_CHIFFON.getIndex());
            altTextCenterStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Currencies
            currencyStyle = wb.createCellStyle();
            currencyStyle.setDataFormat(currencyFormat);
            currencyStyle.setAlignment(HorizontalAlignment.RIGHT);
            currencyStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            altCurrencyStyle = wb.createCellStyle();
            altCurrencyStyle.setDataFormat(currencyFormat);
            altCurrencyStyle.setAlignment(HorizontalAlignment.RIGHT);
            altCurrencyStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            altCurrencyStyle.setFillForegroundColor(IndexedColors.LEMON_CHIFFON.getIndex());
            altCurrencyStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            currencyPositiveStyle = wb.createCellStyle();
            currencyPositiveStyle.setDataFormat(currencyFormat);
            currencyPositiveStyle.setFont(fontBold);
            currencyPositiveStyle.setAlignment(HorizontalAlignment.RIGHT);

            currencyNegativeStyle = wb.createCellStyle();
            currencyNegativeStyle.setDataFormat(currencyFormat);
            currencyNegativeStyle.setFont(fontBold);
            currencyNegativeStyle.setAlignment(HorizontalAlignment.RIGHT);

            // Marca (Azul claro suave)
            marcaStyle = wb.createCellStyle();
            marcaStyle.setFont(fontBold);
            marcaStyle.setFillForegroundColor(IndexedColors.PALE_BLUE.getIndex());
            marcaStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            marcaStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            marcaStyle.setBorderBottom(BorderStyle.THIN);

            marcaCenterStyle = wb.createCellStyle();
            marcaCenterStyle.cloneStyleFrom(marcaStyle);
            marcaCenterStyle.setAlignment(HorizontalAlignment.CENTER);

            marcaCurrencyStyle = wb.createCellStyle();
            marcaCurrencyStyle.cloneStyleFrom(marcaStyle);
            marcaCurrencyStyle.setDataFormat(currencyFormat);
            marcaCurrencyStyle.setAlignment(HorizontalAlignment.RIGHT);

            // Modelo (Lavanda suave / Gris azulado)
            modeloStyle = wb.createCellStyle();
            modeloStyle.setFont(fontBold);
            modeloStyle.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            modeloStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            modeloStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            modeloStyle.setBorderBottom(BorderStyle.THIN);

            modeloCenterStyle = wb.createCellStyle();
            modeloCenterStyle.cloneStyleFrom(modeloStyle);
            modeloCenterStyle.setAlignment(HorizontalAlignment.CENTER);

            modeloCurrencyStyle = wb.createCellStyle();
            modeloCurrencyStyle.cloneStyleFrom(modeloStyle);
            modeloCurrencyStyle.setDataFormat(currencyFormat);
            modeloCurrencyStyle.setAlignment(HorizontalAlignment.RIGHT);

            // Generación (Gris muy tenue)
            genStyle = wb.createCellStyle();
            genStyle.setFont(fontBold);
            genStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            genStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            genStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            genStyle.setBorderBottom(BorderStyle.THIN);

            genCenterStyle = wb.createCellStyle();
            genCenterStyle.cloneStyleFrom(genStyle);
            genCenterStyle.setAlignment(HorizontalAlignment.CENTER);

            genCurrencyStyle = wb.createCellStyle();
            genCurrencyStyle.cloneStyleFrom(genStyle);
            genCurrencyStyle.setDataFormat(currencyFormat);
            genCurrencyStyle.setAlignment(HorizontalAlignment.RIGHT);
        }
    }
}
