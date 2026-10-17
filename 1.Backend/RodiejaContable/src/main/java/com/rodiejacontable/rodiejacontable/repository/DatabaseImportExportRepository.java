package com.rodiejacontable.rodiejacontable.repository;

import com.rodiejacontable.rodiejacontable.repository.interfaces.IDatabaseImportExportRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Invokes Python scripts under {@code 0.BaseDeDatos} (Docker MariaDB).
 */
@Repository
public class DatabaseImportExportRepository implements IDatabaseImportExportRepository {

    private static final Logger log = LoggerFactory.getLogger(DatabaseImportExportRepository.class);
    private static final long TIMEOUT_MINUTES = 30;

    private final Path baseDir;
    private final String pythonCmd;

    public DatabaseImportExportRepository(
            @Value("${rodieja.db.base-dir:../../0.BaseDeDatos}") String baseDirProp,
            @Value("${rodieja.db.python:python}") String pythonCmd) {
        this.baseDir = Paths.get(baseDirProp).toAbsolutePath().normalize();
        this.pythonCmd = pythonCmd;
    }

    @Override
    public Path getBaseDir() {
        return baseDir;
    }

    @Override
    public Map<String, String> runExport() {
        runPython("export_db.py");
        Map<String, String> result = new HashMap<>();
        result.put("data", baseDir.resolve("DB/04_datos.sql").toString());
        result.put("schema", baseDir.resolve("DB/_schema_from_live.sql").toString());
        Path exports = baseDir.resolve("exports");
        try {
            if (Files.isDirectory(exports)) {
                try (var stream = Files.list(exports)) {
                    stream.filter(p -> {
                                String name = p.getFileName().toString();
                                return name.startsWith("sistema_vehicular_") && name.endsWith(".sql.gz");
                            })
                            .max(Path::compareTo)
                            .ifPresent(p -> result.put("full", p.toString()));
                }
            }
        } catch (IOException e) {
            log.warn("Could not list exports dir: {}", e.getMessage());
        }
        return result;
    }

    @Override
    public void runImportFullSql(Path sqlFile) {
        runPython("import_db.py", "--file", sqlFile.toAbsolutePath().toString(), "--full", "--yes");
    }

    @Override
    public Path saveUpload(byte[] content, String originalFilename) {
        try {
            Path uploads = baseDir.resolve("exports").resolve("uploads");
            Files.createDirectories(uploads);
            String safe = (originalFilename == null || originalFilename.isBlank())
                    ? "upload.sql.gz"
                    : Paths.get(originalFilename).getFileName().toString().replaceAll("[^a-zA-Z0-9._-]", "_");
            String stamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            Path dest = uploads.resolve(stamp + "_" + safe);
            Files.write(dest, content);
            return dest;
        } catch (IOException e) {
            throw new IllegalStateException("Failed to save upload: " + e.getMessage(), e);
        }
    }

    private void runPython(String script, String... extraArgs) {
        if (!Files.isDirectory(baseDir)) {
            throw new IllegalStateException("0.BaseDeDatos not found at: " + baseDir
                    + " — set rodieja.db.base-dir in application.properties");
        }
        Path scriptPath = baseDir.resolve(script);
        if (!Files.isRegularFile(scriptPath)) {
            throw new IllegalStateException("Script missing: " + scriptPath);
        }

        ProcessBuilder pb = new ProcessBuilder();
        pb.directory(baseDir.toFile());
        pb.redirectErrorStream(true);
        pb.environment().put("PYTHONIOENCODING", "utf-8");
        java.util.List<String> cmd = new java.util.ArrayList<>();
        cmd.add(pythonCmd);
        cmd.add(scriptPath.toString());
        for (String a : extraArgs) {
            cmd.add(a);
        }
        pb.command(cmd);

        log.info("[DB ImportExport] Running: {}", String.join(" ", cmd));
        try {
            Process process = pb.start();
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    log.info("[DB ImportExport] {}", line);
                    output.append(line).append('\n');
                }
            }
            boolean finished = process.waitFor(TIMEOUT_MINUTES, TimeUnit.MINUTES);
            if (!finished) {
                process.destroyForcibly();
                throw new IllegalStateException("Script timed out after " + TIMEOUT_MINUTES + " min: " + script);
            }
            if (process.exitValue() != 0) {
                throw new IllegalStateException("Script failed (" + process.exitValue() + "): " + script
                        + "\n" + output);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while running " + script + ": " + e.getMessage(), e);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to run " + script + ": " + e.getMessage(), e);
        }
    }
}
