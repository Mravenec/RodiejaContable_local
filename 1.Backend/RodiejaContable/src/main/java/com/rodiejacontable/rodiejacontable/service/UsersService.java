package com.rodiejacontable.rodiejacontable.service;

import com.rodiejacontable.rodiejacontable.repository.UsersRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UsersService {

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public boolean existsByEmail(String email) {
        return usersRepository.existsByEmail(email);
    }

    public Integer getRoleId(String roleName) {
        return usersRepository.findRoleIdByName(roleName);
    }

    @Transactional
    public boolean createUser(String email, String password, Integer rolId, String nombre) {
        String encodedPassword = passwordEncoder.encode(password);
        
        Integer newUserId = usersRepository.insertUser(email, encodedPassword, rolId, (byte) 1);
        
        if (newUserId != null) {
            // The database trigger will have created the profile records, we just update the name
            usersRepository.updatePersonalDataFullName(newUserId, nombre);
            return true;
        }
        return false;
    }
}
