package com.rodiejacontable.rodiejacontable.repository;

import org.jooq.DSLContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import static com.rodiejacontable.database.jooq.tables.Users.USERS;
import static com.rodiejacontable.database.jooq.tables.Roles.ROLES;
import static com.rodiejacontable.database.jooq.tables.PersonalData.PERSONAL_DATA;

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
}
