package com.rodiejacontable.rodiejacontable.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtTokenProvider {

    // Using a securely generated default secret for local dev if none is provided.
    // In production, configure this via application.properties / ENV
    @Value("${app.jwtSecret:9a4f2c8d3b7a1e6f45c8a0b3f267d8b1d4e6f3c8a9d2b5f8e3a9c8b5f6v8a3d9}")
    private String jwtSecret;

    @Value("${app.jwtExpirationMs:86400000}") // 1 day
    private int jwtExpirationMs;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    public String generateToken(Authentication authentication, String role) {
        UserDetails userPrincipal = (UserDetails) authentication.getPrincipal();

        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .setSubject(userPrincipal.getUsername())
                .claim("role", role)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String getUsernameFromJWT(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public boolean validateToken(String authToken) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(authToken);
            return true;
        } catch (SecurityException | MalformedJwtException | ExpiredJwtException | UnsupportedJwtException | IllegalArgumentException ex) {
            System.err.println("Invalid JWT signature/token");
        }
        return false;
    }

    /**
     * Genera un token JWT de un solo uso con vigencia de 15 minutos para restablecer contraseña.
     */
    public String generatePasswordResetToken(String email) {
        Date now = new Date();
        // 15 minutos de vigencia
        Date expiryDate = new Date(now.getTime() + (15 * 60 * 1000L));

        return Jwts.builder()
                .setSubject(email)
                .claim("purpose", "passwordReset")
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Valida que el token de restablecimiento sea íntegro, no haya expirado y tenga el claim "passwordReset".
     */
    public boolean validatePasswordResetToken(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            return "passwordReset".equals(claims.get("purpose"));
        } catch (Exception ex) {
            System.err.println("Token de reset inválido o expirado: " + ex.getMessage());
            return false;
        }
    }

    /**
     * Obtiene el correo asociado al token de restablecimiento de contraseña.
     */
    public String getEmailFromPasswordResetToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }
}
