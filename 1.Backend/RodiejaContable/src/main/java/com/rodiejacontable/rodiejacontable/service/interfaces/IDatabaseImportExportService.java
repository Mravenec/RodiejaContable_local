package com.rodiejacontable.rodiejacontable.service.interfaces;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Export live DB as portable {@code .sql.gz}; import dump to restore local MariaDB.
 */
public interface IDatabaseImportExportService {

    /**
     * Dump live MariaDB, refresh project SQL side effects, return gzip as downloadable resource.
     */
    Resource exportDownload();

    /**
     * Import uploaded {@code .sql} or {@code .sql.gz} (full DROP + restore).
     */
    Map<String, String> importSql(MultipartFile file);

    /** Status of script directory and key files. */
    Map<String, Object> status();
}
