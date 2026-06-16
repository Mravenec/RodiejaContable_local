package com.rodiejacontable.rodiejacontable.controller;

import org.jooq.DSLContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import static com.rodiejacontable.database.jooq.tables.Users.USERS;
import static com.rodiejacontable.database.jooq.tables.PersonalData.PERSONAL_DATA;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    @Autowired
    private DSLContext dsl;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PutMapping
    @Transactional
    public ResponseEntity<?> updateProfile(Authentication authentication, @RequestBody Map<String, String> payload) {
        String email = authentication.getName();
        String newName = payload.get("nombre");
        String newPassword = payload.get("password");

        var userRecord = dsl.select(USERS.ID)
                .from(USERS)
                .where(USERS.EMAIL.eq(email))
                .fetchOne();

        if (userRecord == null) {
            return ResponseEntity.badRequest().body("Usuario no encontrado");
        }
        
        Integer userId = userRecord.get(USERS.ID);

        // Update name in personal_data
        if (newName != null && !newName.trim().isEmpty()) {
            int updated = dsl.update(PERSONAL_DATA)
               .set(PERSONAL_DATA.FULL_NAME, newName.trim())
               .where(PERSONAL_DATA.USER_ID.eq(userId))
               .execute();
               
            // Si el usuario fue creado sin el trigger o no tenía registro, insertarlo
            if (updated == 0) {
                dsl.insertInto(PERSONAL_DATA, PERSONAL_DATA.USER_ID, PERSONAL_DATA.FULL_NAME)
                   .values(userId, newName.trim())
                   .execute();
            }
        }

        // Update password using the stored procedure
        if (newPassword != null && !newPassword.trim().isEmpty()) {
            String hash = passwordEncoder.encode(newPassword);
            dsl.execute("CALL spUpdateUserPassword({0}, {1})", email, hash);
        }

        return ResponseEntity.ok(Map.of("message", "Perfil actualizado correctamente"));
    }
}
