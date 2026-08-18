package com.rodiejacontable.rodiejacontable.repository;

import org.jooq.DSLContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import static com.rodiejacontable.database.jooq.tables.Users.USERS;
import static com.rodiejacontable.database.jooq.tables.Roles.ROLES;
import static com.rodiejacontable.database.jooq.tables.PersonalData.PERSONAL_DATA;

import java.util.List;
import com.rodiejacontable.rodiejacontable.dto.UserListDTO;

@Repository
public class UsersRepository {

    @Autowired
    private DSLContext dsl;

    public boolean existsByEmail(String email) {
        return dsl.fetchExists(
            dsl.selectFrom(USERS).where(USERS.EMAIL.eq(email))
        );
    }

    public Integer findRoleIdByName(String roleName) {
        var record = dsl.select(ROLES.ID)
                .from(ROLES)
                .where(ROLES.NOMBRE.eq(roleName))
                .fetchOne();
        return record != null ? record.get(ROLES.ID) : null;
    }

    public Integer insertUser(String email, String passwordHash, Integer rolId, Byte isActive) {
        var record = dsl.insertInto(USERS, USERS.EMAIL, USERS.PASSWORD_HASH, USERS.ROL_ID, USERS.IS_ACTIVE)
                .values(email, passwordHash, rolId, isActive)
                .returning(USERS.ID)
                .fetchOne();
        return record != null ? record.get(USERS.ID) : null;
    }

    public void updatePersonalDataFullName(Integer userId, String fullName) {
        dsl.update(PERSONAL_DATA)
           .set(PERSONAL_DATA.FULL_NAME, fullName)
           .where(PERSONAL_DATA.USER_ID.eq(userId))
           .execute();
    }

    public List<UserListDTO> findAllUsers() {
        return dsl.select(
                USERS.ID,
                PERSONAL_DATA.FULL_NAME,
                USERS.EMAIL,
                ROLES.NOMBRE,
                USERS.IS_ACTIVE
            )
            .from(USERS)
            .leftJoin(ROLES).on(USERS.ROL_ID.eq(ROLES.ID))
            .leftJoin(PERSONAL_DATA).on(USERS.ID.eq(PERSONAL_DATA.USER_ID))
            .fetch(record -> {
                UserListDTO dto = new UserListDTO();
                dto.setId(record.get(USERS.ID));
                dto.setNombre(record.get(PERSONAL_DATA.FULL_NAME));
                dto.setEmail(record.get(USERS.EMAIL));
                dto.setRol(record.get(ROLES.NOMBRE));
                
                Byte activeByte = record.get(USERS.IS_ACTIVE);
                dto.setActivo(activeByte != null && activeByte > 0);
                
                dto.setUltimoAcceso(null);
                return dto;
            });
    }

    public boolean deleteUser(Integer id) {
        // Prevent deleting admin role user
        Integer roleId = dsl.select(USERS.ROL_ID).from(USERS).where(USERS.ID.eq(id)).fetchOneInto(Integer.class);
        if (roleId != null) {
            String roleName = dsl.select(ROLES.NOMBRE).from(ROLES).where(ROLES.ID.eq(roleId)).fetchOneInto(String.class);
            if ("ADMIN".equalsIgnoreCase(roleName)) {
                return false;
            }
        }
        
        int deleted = dsl.deleteFrom(USERS).where(USERS.ID.eq(id)).execute();
        return deleted > 0;
    }
}
