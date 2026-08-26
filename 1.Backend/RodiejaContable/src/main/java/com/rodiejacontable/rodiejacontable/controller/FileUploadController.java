package com.rodiejacontable.rodiejacontable.controller;

import com.rodiejacontable.rodiejacontable.service.FileUploadService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/upload")
public class FileUploadController {

    @Autowired
    private FileUploadService fileUploadService;

    @PostMapping("/vehiculo")
    public ResponseEntity<Map<String, String>> uploadVehiculoImage(@RequestParam("file") MultipartFile file) {
        try {
            String fileUrl = fileUploadService.guardarImagenVehiculo(file);
            Map<String, String> response = new HashMap<>();
            response.put("url", fileUrl);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (IOException e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Error al procesar el archivo: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
