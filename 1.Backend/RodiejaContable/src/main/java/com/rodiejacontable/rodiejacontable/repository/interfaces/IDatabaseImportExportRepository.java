package com.rodiejacontable.rodiejacontable.repository.interfaces;

import java.nio.file.Path;
import java.util.Map;

/**
 * Persistence/filesystem operations for database export and import scripts.
 */
public interface IDatabaseImportExportRepository {

    /** Absolute path to {@code 0.BaseDeDatos}. */
    Path getBaseDir();

    /**
     * Run {@code export_db.py}; returns paths of generated files.
     * Key {@code full} is the portable {@code .sql.gz}.
     */
    Map<String, String> runExport();

    /** Run {@code import_db.py --file ... --full --yes} (accepts .sql or .sql.gz). */
    void runImportFullSql(Path sqlFile);

    /** Write uploaded bytes to a temp file under {@code exports/uploads}. */
    Path saveUpload(byte[] content, String originalFilename);
}
