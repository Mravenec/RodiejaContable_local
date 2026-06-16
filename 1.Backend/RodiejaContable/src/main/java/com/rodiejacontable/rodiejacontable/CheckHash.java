package com.rodiejacontable.rodiejacontable;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class CheckHash {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        boolean matches = encoder.matches("password", "$2a$10$8.UnVuG9HLPoy1eI0N4jJ.31Y1k5n0F0K4f9rJbK6nO9P.41z3Z2q");
        System.out.println("Matches password: " + matches);
        
        System.out.println("New hash for password: " + encoder.encode("password"));
    }
}
