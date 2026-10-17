package com.rodiejacontable.rodiejacontable.controller;

import com.rodiejacontable.rodiejacontable.controller.interfaces.IDatabaseImportExportController;
import com.rodiejacontable.rodiejacontable.service.interfaces.IDatabaseImportExportService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * REST endpoints for portable DB export/import ({@code .sql.gz}).
 */
@RestController
@RequestMapping("/api/database")
@CrossOrigin(origins = {
        "http://localhost:3000",
        "https://contabilidad.tuprimernegocio.org"
})
public class DatabaseImportExportController implements IDatabaseImportExportController {

    private final IDatabaseImportExportService service;

    public DatabaseImportExportController(IDatabaseImportExportService service) {
        this.service = service;
    }

    @Override
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok(service.status());
    }

    @Override
    @GetMapping("/export")
    public ResponseEntity<Resource> exportDownload() {
        Resource resource = service.exportDownload();
        String filename = resource.getFilename() != null ? resource.getFilename() : "sistema_vehicular.sql.gz";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/gzip"))
                .body(resource);
    }

    @Override
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> importSql(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(service.importSql(file));
    }
}
