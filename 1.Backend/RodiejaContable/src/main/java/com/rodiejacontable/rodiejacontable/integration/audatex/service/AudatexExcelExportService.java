package com.rodiejacontable.rodiejacontable.integration.audatex.service;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * ROD-14 — Genera archivos Excel XLSX con Apache POI.
 */
@Service
public class AudatexExcelExportService {

    private static final String[] HEADERS = {
            "Aseguradora", "Cotización ID", "Taller Mecánico", "Póliza / Documento",
            "Siniestro", "Matrícula", "Armadora / Modelo", "Fecha Cotización", "Pendientes"
    };

    public byte[] generarExcel(List<Map<String, Object>> oportunidades) throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Oportunidades InPart");

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 11);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.CORNFLOWER_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(HEADERS[i]);
                cell.setCellStyle(headerStyle);
            }

            CellStyle altStyle = workbook.createCellStyle();
            altStyle.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            altStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            int rowNum = 1;
            for (Map<String, Object> oportunidad : oportunidades) {
                Row row = sheet.createRow(rowNum);
                CellStyle rowStyle = (rowNum % 2 == 0) ? altStyle : null;

                agregarCelda(row, 0, texto(oportunidad, "aseguradora"), rowStyle);
                agregarCelda(row, 1, texto(oportunidad, "cotizacionId"), rowStyle);
                agregarCelda(row, 2, texto(oportunidad, "taller"), rowStyle);
                agregarCelda(row, 3, texto(oportunidad, "poliza"), rowStyle);
                agregarCelda(row, 4, texto(oportunidad, "siniestro"), rowStyle);
                agregarCelda(row, 5, texto(oportunidad, "matricula"), rowStyle);
                agregarCelda(row, 6, texto(oportunidad, "armadora"), rowStyle);
                agregarCelda(row, 7, texto(oportunidad, "fechaCotizacion"), rowStyle);

                Cell pendientesCell = row.createCell(8);
                pendientesCell.setCellValue(pendientes(oportunidad));
                if (rowStyle != null) pendientesCell.setCellStyle(rowStyle);

                rowNum++;
            }

            rowNum++;
            Row metaRow = sheet.createRow(rowNum);
            metaRow.createCell(0).setCellValue(
                    "Exportado: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                    + " | Total: " + oportunidades.size() + " oportunidades | Sistema: RodiejaContable"
            );

            for (int i = 0; i < HEADERS.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    private void agregarCelda(Row row, int col, String value, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value != null ? value : "");
        if (style != null) cell.setCellStyle(style);
    }

    private static String texto(Map<String, Object> o, String key) {
        Object value = o.get(key);
        return value != null ? value.toString() : null;
    }

    private static int pendientes(Map<String, Object> o) {
        Object value = o.get("pendientes");
        return value instanceof Number ? ((Number) value).intValue() : 0;
    }
}
