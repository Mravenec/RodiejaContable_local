USE sistema_vehicular;

-- Eliminar tablas si existen (útil para pruebas, cuidado en producción)
DROP TABLE IF EXISTS user_profilePicture;
DROP TABLE IF EXISTS phones;
DROP TABLE IF EXISTS address;
DROP TABLE IF EXISTS personal_data;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

-- 1. Crear tabla de Roles
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

-- Insertar roles iniciales según solicitud del usuario
INSERT INTO roles (nombre) VALUES ('ADMIN');
INSERT INTO roles (nombre) VALUES ('CONTADOR');

-- 2. Crear tabla de Usuarios (independiente de empleados)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_rol FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE RESTRICT
);

-- Tablas de Perfil de Usuario (adaptadas de users.sql)
CREATE TABLE personal_data (
    user_id INT NOT NULL,
    full_name VARCHAR(255),
    PRIMARY KEY (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE address (
    user_id INT NOT NULL PRIMARY KEY,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    province VARCHAR(255),
    canton VARCHAR(255),
    postal_code VARCHAR(10),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE phones (
    user_id INT NOT NULL PRIMARY KEY,
    whatsapp VARCHAR(20),
    other_numbers VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_profilePicture (
    user_id INT NOT NULL,
    profile_picture BLOB,
    PRIMARY KEY (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Triggers para inicializar datos de perfil al crear un usuario
DELIMITER //
CREATE TRIGGER after_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO personal_data (user_id, full_name) VALUES (NEW.id, 'Usuario Nuevo');
    INSERT INTO address (user_id) VALUES (NEW.id);
    INSERT INTO phones (user_id) VALUES (NEW.id);
    INSERT INTO user_profilePicture (user_id) VALUES (NEW.id);
END;
//
DELIMITER ;

-- Procedimiento Almacenado para actualizar contraseña
DROP PROCEDURE IF EXISTS spUpdateUserPassword;
DELIMITER //
CREATE PROCEDURE spUpdateUserPassword(IN p_email VARCHAR(255), IN p_new_password_hash VARCHAR(255))
BEGIN
    DECLARE v_user_id INT;
    DECLARE rows_affected INT;

    SELECT id INTO v_user_id FROM users WHERE email = p_email;

    IF v_user_id IS NOT NULL THEN
        UPDATE users 
        SET password_hash = p_new_password_hash
        WHERE id = v_user_id;

        SET rows_affected = ROW_COUNT();

        IF rows_affected = 0 THEN
            SELECT 'No se actualizó ninguna contraseña. La contraseña es la misma.' AS message;
        ELSE
            SELECT 'Contraseña actualizada correctamente.' AS message;
        END IF;
    ELSE
        SELECT 'No se encontró ningún usuario con ese correo electrónico.' AS message;
    END IF;
END;
//
DELIMITER ;

-- 3. Insertar un usuario administrador por defecto
-- La contraseña es 'Admin123!' encriptada con BCrypt (Costo 10)
INSERT INTO users (email, password_hash, rol_id, is_active) 
VALUES (
    'admin@rodieja.com', 
    '$2a$10$poZvLjrn9Rm8tIJDo0x.Suv.3XD7FwNaiEmHmpgBpFplq9oP6E0.e', -- BCrypt hash para 'Admin123!'
    (SELECT id FROM roles WHERE nombre = 'ADMIN'),
    TRUE
);

-- Actualizar el nombre del administrador por defecto
UPDATE personal_data SET full_name = 'Administrador del Sistema' WHERE user_id = (SELECT id FROM users WHERE email = 'admin@rodieja.com');
