package com.rodiejacontable.rodiejacontable.controller;

import com.rodiejacontable.rodiejacontable.service.UsersService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UsersService usersService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> payload) {
        String nombre = payload.get("nombre");
        String email = payload.get("email");
        String password = payload.get("password");
        String rolNombre = payload.get("rol");

        if (email == null || password == null || rolNombre == null || nombre == null ||
            email.trim().isEmpty() || password.trim().isEmpty() || rolNombre.trim().isEmpty() || nombre.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Todos los campos son obligatorios."));
        }

        if (usersService.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("message", "El correo electrónico ya está registrado."));
        }

        Integer rolId = usersService.getRoleId(rolNombre);
        if (rolId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Rol inválido."));
        }

        boolean success = usersService.createUser(email, password, rolId, nombre.trim());
        
        if (success) {
            return ResponseEntity.ok(Map.of("message", "Usuario creado exitosamente"));
        }

        return ResponseEntity.internalServerError().body(Map.of("message", "Error al crear el usuario."));
    }
}
