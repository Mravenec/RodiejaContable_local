package com.rodiejacontable.rodiejacontable.service;

import com.rodiejacontable.rodiejacontable.repository.interfaces.IDatabaseImportExportRepository;
import com.rodiejacontable.rodiejacontable.service.interfaces.IDatabaseImportExportService;
import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.sql.DataSource;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Orchestrates database export/import via {@link IDatabaseImportExportRepository}.
 */
@Service
public class DatabaseImportExportService implements IDatabaseImportExportService {

    private static final Logger log = LoggerFactory.getLogger(DatabaseImportExportService.class);

    private final IDatabaseImportExportRepository repository;
    private final DataSource dataSource;

    public DatabaseImportExportService(IDatabaseImportExportRepository repository, DataSource dataSource) {
        this.repository = repository;
        this.dataSource = dataSource;
    }

    @Override
    public Resource exportDownload() {
        Map<String, String> paths = repository.runExport();
        String full = paths.get("full");
        if (full == null || full.isBlank()) {
            throw new IllegalStateException("Export did not produce a .sql.gz file");
        }
        Path path = Path.of(full);
        if (!Files.isRegularFile(path)) {
            throw new IllegalStateException("Full dump missing: " + path);
        }
        return new FileSystemResource(path);
    }

    @Override
    @CacheEvict(value = "vehiculosHierarchy", allEntries = true)
    public Map<String, String> importSql(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("SQL file is required");
        }
        String name = file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload.sql.gz";
        String lower = name.toLowerCase(Locale.ROOT);
        if (!(lower.endsWith(".sql") || lower.endsWith(".sql.gz") || lower.endsWith(".gz"))) {
            throw new IllegalArgumentException("Only .sql or .sql.gz files are accepted");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new IllegalStateException("Cannot read upload: " + e.getMessage(), e);
        }
        Path saved = repository.saveUpload(bytes, name);
        repository.runImportFullSql(saved);
        // DROP DATABASE invalidates open pooled connections — refresh so screens see restored data
        refreshConnectionPool();
        Map<String, String> result = new LinkedHashMap<>();
        result.put("mode", "full");
        result.put("uploaded", saved.toString());
        result.put("mensaje", "Import completed");
        result.put("poolRefreshed", "true");
        return result;
    }

    @Override
    public Map<String, Object> status() {
        Path base = repository.getBaseDir();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("baseDir", base.toString());
        out.put("baseDirExists", Files.isDirectory(base));
        out.put("datosSql", fileInfo(base.resolve("DB/04_datos.sql")));
        out.put("schemaSnapshot", fileInfo(base.resolve("DB/_schema_from_live.sql")));
        out.put("exportDbPy", Files.isRegularFile(base.resolve("export_db.py")));
        out.put("importDbPy", Files.isRegularFile(base.resolve("import_db.py")));
        out.put("loadDataPy", Files.isRegularFile(base.resolve("load_data.py")));
        return out;
    }

    /**
     * After DROP + restore, Hikari may keep dead connections to the old schema.
     * Soft-evict and validate with a fresh connection.
     */
    private void refreshConnectionPool() {
        try {
            HikariDataSource hikari = dataSource.unwrap(HikariDataSource.class);
            HikariPoolMXBean pool = hikari.getHikariPoolMXBean();
            if (pool != null) {
                pool.softEvictConnections();
                log.info("[DB ImportExport] Hikari softEvictConnections() after import");
            }
        } catch (SQLException e) {
            log.warn("[DB ImportExport] Could not unwrap HikariDataSource: {}", e.getMessage());
        }
        try (Connection c = dataSource.getConnection()) {
            c.createStatement().execute("SELECT 1");
        } catch (SQLException e) {
            log.warn("[DB ImportExport] Post-import connectivity check failed: {}", e.getMessage());
        }
    }

    private Map<String, Object> fileInfo(Path path) {
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("path", path.toString());
        info.put("exists", Files.isRegularFile(path));
        try {
            if (Files.isRegularFile(path)) {
                info.put("bytes", Files.size(path));
                info.put("modified", Files.getLastModifiedTime(path).toString());
            }
        } catch (IOException ignored) {
            // leave partial info
        }
        return info;
    }
}
