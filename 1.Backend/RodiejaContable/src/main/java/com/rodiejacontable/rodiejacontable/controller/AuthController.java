package com.rodiejacontable.rodiejacontable.controller;

import com.rodiejacontable.rodiejacontable.security.JwtTokenProvider;
import com.rodiejacontable.rodiejacontable.service.EmailService;
import com.rodiejacontable.rodiejacontable.service.EmailTemplateService;
import jakarta.servlet.http.HttpServletRequest;
import org.jooq.DSLContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import static com.rodiejacontable.database.jooq.tables.Users.USERS;
import static com.rodiejacontable.database.jooq.tables.Roles.ROLES;
import static com.rodiejacontable.database.jooq.tables.PersonalData.PERSONAL_DATA;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private DSLContext dsl;

    @Autowired
    private EmailService emailService;

    @Autowired
    private EmailTemplateService emailTemplateService;

    @Autowired
    private PasswordEncoder passwordEncoder;

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

            var userRecord = dsl.select(USERS.ID, ROLES.NOMBRE, PERSONAL_DATA.FULL_NAME, USERS.ROL_ID)
                    .from(USERS)
                    .join(ROLES).on(USERS.ROL_ID.eq(ROLES.ID))
                    .leftJoin(PERSONAL_DATA).on(USERS.ID.eq(PERSONAL_DATA.USER_ID))
                    .where(USERS.EMAIL.eq(email))
                    .fetchOne();

            Integer userId = userRecord != null ? userRecord.get(USERS.ID) : null;
            String role = userRecord != null ? userRecord.get(ROLES.NOMBRE) : "UNKNOWN";
            Integer rolId = userRecord != null ? userRecord.get(USERS.ROL_ID) : null;
            String nombre = userRecord != null && userRecord.get(PERSONAL_DATA.FULL_NAME) != null
                    ? userRecord.get(PERSONAL_DATA.FULL_NAME)
                    : "Usuario";

            String jwt = tokenProvider.generateToken(authentication, role);

            return ResponseEntity.ok(Map.of(
                    "token", jwt,
                    "id", userId != null ? userId : 0,
                    "userId", userId != null ? userId : 0,
                    "email", email,
                    "rol", role,
                    "nombre", nombre,
                    "rolId", rolId != null ? String.valueOf(rolId) : ""
            ));
        } catch (Exception ex) {
            logger.error("Error al autenticar usuario {}: {}", email, ex.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Credenciales incorrectas o cuenta deshabilitada");
        }
    }

    /**
     * Inicia el proceso de recuperación de contraseña generando un token temporal y enviando el correo.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        String email = payload.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "El correo electrónico es requerido"));
        }
        email = email.trim();

        try {
            // Verificar si el usuario existe
            var userRecord = dsl.select(USERS.ID, PERSONAL_DATA.FULL_NAME)
                    .from(USERS)
                    .leftJoin(PERSONAL_DATA).on(USERS.ID.eq(PERSONAL_DATA.USER_ID))
                    .where(USERS.EMAIL.eq(email))
                    .fetchOne();

            if (userRecord == null) {
                // Por seguridad y buenas prácticas OWASP, retornamos respuesta genérica exitosa
                logger.warn("Solicitud de recuperación para correo inexistente: {}", email);
                return ResponseEntity.ok(Map.of(
                        "message", "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos."
                ));
            }

            String nombre = userRecord.get(PERSONAL_DATA.FULL_NAME);
            if (nombre == null || nombre.isBlank()) {
                nombre = "Usuario";
            }

            // Generar token JWT con propósito 'passwordReset' válido por 15 minutos
            String token = tokenProvider.generatePasswordResetToken(email);

            // Determinar la URL base del frontend
            String frontendUrl = payload.get("frontendUrl");
            if (frontendUrl == null || frontendUrl.isBlank()) {
                String origin = request.getHeader("Origin");
                if (origin != null && !origin.isBlank()) {
                    frontendUrl = origin;
                } else {
                    String referer = request.getHeader("Referer");
                    if (referer != null && !referer.isBlank()) {
                        try {
                            java.net.URI uri = java.net.URI.create(referer);
                            frontendUrl = uri.getScheme() + "://" + uri.getAuthority();
                        } catch (Exception ignored) {
                            frontendUrl = "http://localhost:3000";
                        }
                    } else {
                        frontendUrl = "http://localhost:3000";
                    }
                }
            }

            if (frontendUrl.endsWith("/")) {
                frontendUrl = frontendUrl.substring(0, frontendUrl.length() - 1);
            }

            String resetLink = frontendUrl + "/restablecer-contrasena?token=" + token;

            String htmlBody = emailTemplateService.generarHtmlPasswordReset(nombre, resetLink);
            try {
                emailService.sendHtmlEmail(email, "Restablecimiento de Contraseña - Rodieja Contable", htmlBody);
                logger.info("Correo de restablecimiento enviado exitosamente a {}", email);
            } catch (Exception ex) {
                logger.warn("Fallo al enviar correo HTML a {}, intentando texto plano: {}", email, ex.getMessage());
                emailService.sendSimpleEmail(email, "Restablecimiento de Contraseña - Rodieja Contable",
                        "Hola " + nombre + ",\n\nHaz clic en el siguiente enlace para restablecer tu contraseña:\n"
                                + resetLink + "\n\nEste enlace expira en 15 minutos.");
            }

            return ResponseEntity.ok(Map.of(
                    "message", "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos."
            ));
        } catch (Exception ex) {
            logger.error("Error en forgot-password para {}: {}", email, ex.getMessage(), ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error al procesar la solicitud de recuperación. Por favor intenta de nuevo."));
        }
    }

    /**
     * Valida el token de recuperación y actualiza la contraseña del usuario.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> payload) {
        String token = payload.get("token");
        String newPassword = payload.get("newPassword");

        if (token == null || token.isBlank() || newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Token y nueva contraseña son requeridos"));
        }

        token = token.trim();
        newPassword = newPassword.trim();

        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("message", "La contraseña debe tener al menos 6 caracteres"));
        }

        if (!tokenProvider.validatePasswordResetToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "El enlace de recuperación es inválido o ha expirado. Por favor solicita uno nuevo."));
        }

        String email = tokenProvider.getEmailFromPasswordResetToken(token);
        if (email == null || email.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Token de recuperación inválido"));
        }

        try {
            String hash = passwordEncoder.encode(newPassword);
            dsl.execute("CALL spUpdateUserPassword({0}, {1})", email, hash);
            logger.info("Contraseña actualizada exitosamente mediante reset token para {}", email);

            return ResponseEntity.ok(Map.of("message", "Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión."));
        } catch (Exception ex) {
            logger.error("Error al actualizar contraseña para {}: {}", email, ex.getMessage(), ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error al actualizar la contraseña en el sistema"));
        }
    }
}
