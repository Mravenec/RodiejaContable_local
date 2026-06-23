package com.rodiejacontable.rodiejacontable.integration.audatex.service;

import com.rodiejacontable.rodiejacontable.integration.audatex.dto.AudatexOportunidadDTO;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * ROD-14 — Genera archivos Excel XLSX con Apache POI.
 *
 * Formato de columnas:
 *   A: Aseguradora | B: CotizaciónId | C: Taller | D: Póliza | E: Siniestro
 *   F: Matrícula   | G: Armadora     | H: Fecha   | I: Pendientes
 */
@Service
public class AudatexExcelExportService {

    private static final String[] HEADERS = {
            "Aseguradora", "Cotización ID", "Taller Mecánico", "Póliza / Documento",
            "Siniestro", "Matrícula", "Armadora / Modelo", "Fecha Cotización", "Pendientes"
    };

    /**
     * Genera el XLSX como array de bytes listo para ser enviado como response.
     *
     * @param oportunidades lista de oportunidades a incluir
     * @return bytes del archivo XLSX
     */
    public byte[] generarExcel(List<AudatexOportunidadDTO> oportunidades) throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Oportunidades InPart");

            // ── Estilo encabezado ─────────────────────────────────────────────
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 11);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.CORNFLOWER_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);

            // ── Fila de encabezado ────────────────────────────────────────────
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(HEADERS[i]);
                cell.setCellStyle(headerStyle);
            }

            // ── Estilo alternado para filas de datos ──────────────────────────
            CellStyle altStyle = workbook.createCellStyle();
            altStyle.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            altStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // ── Filas de datos ────────────────────────────────────────────────
            int rowNum = 1;
            for (AudatexOportunidadDTO dto : oportunidades) {
                Row row = sheet.createRow(rowNum);
                CellStyle rowStyle = (rowNum % 2 == 0) ? altStyle : null;

                agregarCelda(row, 0, dto.getAseguradora(), rowStyle);
                agregarCelda(row, 1, dto.getCotizacionId(), rowStyle);
                agregarCelda(row, 2, dto.getTaller(), rowStyle);
                agregarCelda(row, 3, dto.getPoliza(), rowStyle);
                agregarCelda(row, 4, dto.getSiniestro(), rowStyle);
                agregarCelda(row, 5, dto.getMatricula(), rowStyle);
                agregarCelda(row, 6, dto.getArmadora(), rowStyle);
                agregarCelda(row, 7, dto.getFechaCotizacion(), rowStyle);

                Cell pendientesCell = row.createCell(8);
                pendientesCell.setCellValue(dto.getPendientes());
                if (rowStyle != null) pendientesCell.setCellStyle(rowStyle);

                rowNum++;
            }

            // ── Pie con metadata ──────────────────────────────────────────────
            rowNum++; // fila vacía
            Row metaRow = sheet.createRow(rowNum);
            metaRow.createCell(0).setCellValue(
                    "Exportado: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                    + " | Total: " + oportunidades.size() + " oportunidades | Sistema: RodiejaContable"
            );

            // ── Auto-size columnas ────────────────────────────────────────────
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
}
