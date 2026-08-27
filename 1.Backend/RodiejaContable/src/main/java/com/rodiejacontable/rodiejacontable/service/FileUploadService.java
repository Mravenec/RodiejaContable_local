package com.rodiejacontable.rodiejacontable.service;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileUploadService {

    private final String uploadDir = "uploads/vehiculos";

    public String guardarImagenVehiculo(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("No se puede subir un archivo vacío");
        }

        // Crear el directorio si no existe
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Obtener la extensión original
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "");
        String extension = "";
        if (originalFileName.contains(".")) {
            extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }

        // Generar un nombre único usando UUID para evitar sobreescritura
        String newFileName = UUID.randomUUID().toString() + extension;

        // Copiar el archivo al directorio de destino (reemplazando si existiera uno con mismo nombre)
        Path targetLocation = uploadPath.resolve(newFileName);
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        // Retornar la ruta relativa que se guardará en la base de datos
        // Empezará con /uploads/vehiculos/ para que sirva como ruta pública
        return "/uploads/vehiculos/" + newFileName;
    }

    public String guardarImagenRepuesto(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("No se puede subir un archivo vacío");
        }

        // Crear el directorio si no existe
        String repuestosUploadDir = "uploads/repuestos";
        Path uploadPath = Paths.get(repuestosUploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Obtener la extensión original
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "");
        String extension = "";
        if (originalFileName.contains(".")) {
            extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }

        // Generar un nombre único usando UUID para evitar sobreescritura
        String newFileName = UUID.randomUUID().toString() + extension;

        // Copiar el archivo al directorio de destino (reemplazando si existiera uno con mismo nombre)
        Path targetLocation = uploadPath.resolve(newFileName);
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        // Retornar la ruta relativa que se guardará en la base de datos
        return "/uploads/repuestos/" + newFileName;
    }
}
