package com.rodiejacontable.rodiejacontable.service.reportes;

import com.rodiejacontable.database.jooq.tables.pojos.VistaResumenGeneraciones;
import com.rodiejacontable.database.jooq.tables.pojos.VistaTransaccionesCompletas;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
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
                    "Vehículo", "Impacto Financiero", "Monto", "Comisión", "Comisión Pagada"
            };

            Row dHRow = sheetDetalle.createRow(0);
            for (int i = 0; i < headersDetalle.length; i++) {
                Cell c = dHRow.createCell(i);
                c.setCellValue(headersDetalle[i]);
                c.setCellStyle(styles.headerStyle);
            }

            int rowIdx = 1;
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

                // Impacto
                boolean isIngreso = t.getCategoria() != null && "INGRESO".equalsIgnoreCase(t.getCategoria().name());
                Cell cImp = row.createCell(5);
                cImp.setCellValue(isIngreso ? "Ingreso (+)" : "Egreso (-)");
                cImp.setCellStyle(isAlt ? styles.altTextCenterStyle : styles.textCenterStyle);

                // Monto
                double montoVal = t.getMonto() != null ? t.getMonto().doubleValue() : 0.0;
                crearCeldaMoneda(row, 6, montoVal, currStyle);

                // Comisión
                double comVal = t.getComisionEmpleado() != null ? t.getComisionEmpleado().doubleValue() : 0.0;
                crearCeldaMoneda(row, 7, comVal, currStyle);

                // Comisión Pagada
                boolean comPagada = t.getComisionPagada() != null && t.getComisionPagada() > 0;
                Cell cPag = row.createCell(8);
                cPag.setCellValue(comPagada ? "Sí" : "No");
                cPag.setCellStyle(isAlt ? styles.altTextCenterStyle : styles.textCenterStyle);
            }

            ajustarAnchos(sheetDetalle, new int[]{14, 18, 20, 38, 30, 18, 16, 16, 16});

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
                    "Origen", "Impacto Financiero", "Monto", "Comisión", "Comisión Pagada"
            };

            Row dHRow = sheetDetalle.createRow(0);
            for (int i = 0; i < headersDetalle.length; i++) {
                Cell c = dHRow.createCell(i);
                c.setCellValue(headersDetalle[i]);
                c.setCellStyle(styles.headerStyle);
            }

            int rowIdx = 1;
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

                // Impacto
                boolean isIngreso = t.getCategoria() != null && "INGRESO".equalsIgnoreCase(t.getCategoria().name());
                Cell cImp = row.createCell(6);
                cImp.setCellValue(isIngreso ? "Ingreso (+)" : "Egreso (-)");
                cImp.setCellStyle(isAlt ? styles.altTextCenterStyle : styles.textCenterStyle);

                // Monto
                double montoVal = t.getMonto() != null ? t.getMonto().doubleValue() : 0.0;
                crearCeldaMoneda(row, 7, montoVal, currStyle);

                // Comisión
                double comVal = t.getComisionEmpleado() != null ? t.getComisionEmpleado().doubleValue() : 0.0;
                crearCeldaMoneda(row, 8, comVal, currStyle);

                // Comisión Pagada
                boolean comPagada = t.getComisionPagada() != null && t.getComisionPagada() > 0;
                Cell cPag = row.createCell(9);
                cPag.setCellValue(comPagada ? "Sí" : "No");
                cPag.setCellStyle(isAlt ? styles.altTextCenterStyle : styles.textCenterStyle);
            }

            ajustarAnchos(sheetDetalle, new int[]{14, 18, 22, 18, 38, 28, 18, 16, 16, 16});

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
                crearCeldaMoneda(row, 5, montoVal, currStyle);

                double comVal = t.getComisionEmpleado() != null ? t.getComisionEmpleado().doubleValue() : 0.0;
                crearCeldaMoneda(row, 6, comVal, currStyle);
            }

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
                double mBal = lista.stream().mapToDouble(g -> g.getBalanceNeto() != null ? g.getBalanceNeto().doubleValue() : 0.0).sum();
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
                double bal = g.getBalanceNeto() != null ? g.getBalanceNeto().doubleValue() : 0.0;
                double ret = g.getPorcentajeRetorno() != null ? g.getPorcentajeRetorno().doubleValue() : 0.0;

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
        }
    }
}
