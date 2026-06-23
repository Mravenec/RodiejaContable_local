package com.rodiejacontable.rodiejacontable.controller;

import com.rodiejacontable.rodiejacontable.security.JwtTokenProvider;
import org.jooq.DSLContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import static com.rodiejacontable.database.jooq.tables.Users.USERS;
import static com.rodiejacontable.database.jooq.tables.Roles.ROLES;
import static com.rodiejacontable.database.jooq.tables.PersonalData.PERSONAL_DATA;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private DSLContext dsl;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");

        if (email == null || password == null || email.isBlank() || password.isBlank()) {
            return ResponseEntity.badRequest().body("Email y contraseña son requeridos");
        }

        email = email.trim();
        password = password.trim();

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password)
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            var userRecord = dsl.select(ROLES.NOMBRE, PERSONAL_DATA.FULL_NAME)
                    .from(USERS)
                    .join(ROLES).on(USERS.ROL_ID.eq(ROLES.ID))
                    .leftJoin(PERSONAL_DATA).on(USERS.ID.eq(PERSONAL_DATA.USER_ID))
                    .where(USERS.EMAIL.eq(email))
                    .fetchOne();

            String role = userRecord != null ? userRecord.get(ROLES.NOMBRE) : "UNKNOWN";
            String nombre = userRecord != null && userRecord.get(PERSONAL_DATA.FULL_NAME) != null
                    ? userRecord.get(PERSONAL_DATA.FULL_NAME)
                    : "Usuario";

            String jwt = tokenProvider.generateToken(authentication, role);

            return ResponseEntity.ok(Map.of(
                    "token", jwt,
                    "email", email,
                    "rol", role,
                    "nombre", nombre
            ));
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Credenciales incorrectas o cuenta deshabilitada");
        }
    }
}
