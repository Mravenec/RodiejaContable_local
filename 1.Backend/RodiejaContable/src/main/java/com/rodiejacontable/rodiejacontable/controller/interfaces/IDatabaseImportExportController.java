package com.rodiejacontable.rodiejacontable.controller.interfaces;

import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * HTTP API for database export / import (ADMIN tooling) — ddev-style.
 */
public interface IDatabaseImportExportController {

    ResponseEntity<Map<String, Object>> status();

    /** Export live DB and download portable {@code .sql.gz}. */
    ResponseEntity<Resource> exportDownload();

    /** Import {@code .sql} / {@code .sql.gz} (full restore). */
    ResponseEntity<Map<String, String>> importSql(MultipartFile file);
}
