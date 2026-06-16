package com.rodiejacontable.rodiejacontable.security;

import com.rodiejacontable.database.jooq.tables.records.UsersRecord;
import org.jooq.DSLContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

import static com.rodiejacontable.database.jooq.tables.Users.USERS;
import static com.rodiejacontable.database.jooq.tables.Roles.ROLES;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private DSLContext dsl;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        
        var userRecord = dsl.select(USERS.EMAIL, USERS.PASSWORD_HASH, USERS.IS_ACTIVE, ROLES.NOMBRE)
                .from(USERS)
                .join(ROLES).on(USERS.ROL_ID.eq(ROLES.ID))
                .where(USERS.EMAIL.eq(email))
                .fetchOne();

        if (userRecord == null) {
            throw new UsernameNotFoundException("User not found with email: " + email);
        }

        Byte isActive = userRecord.get(USERS.IS_ACTIVE);
        if (isActive == null || isActive == 0) {
            throw new UsernameNotFoundException("User account is disabled");
        }

        String roleName = userRecord.get(ROLES.NOMBRE);

        return new User(
                userRecord.get(USERS.EMAIL),
                userRecord.get(USERS.PASSWORD_HASH),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + roleName))
        );
    }
}
