USE sistema_vehicular;

-- Eliminar tablas si existen (útil para pruebas, cuidado en producción)
DROP TABLE IF EXISTS rol_permisos;
DROP TABLE IF EXISTS submodulos;
DROP TABLE IF EXISTS modulos;
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

-- 4. Insertar un usuario contador por defecto
-- La contraseña es 'Contador123!' encriptada con BCrypt (Costo 10)
INSERT INTO users (email, password_hash, rol_id, is_active) 
VALUES (
    'contador@rodieja.com', 
    '$2a$10$Mhs/gXgxWKAZrKTS4iXuEuhfmFbcbi/0FJWzm5O3P8B3Ff5/9muW2', -- BCrypt hash para 'Contador123!'
    (SELECT id FROM roles WHERE nombre = 'CONTADOR'),
    TRUE
);

-- Actualizar el nombre del contador por defecto
UPDATE personal_data SET full_name = 'Contador' WHERE user_id = (SELECT id FROM users WHERE email = 'contador@rodieja.com');

-- 5. Módulos y Submódulos
CREATE TABLE modulos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    clave VARCHAR(50) NOT NULL UNIQUE,
    icono VARCHAR(50)
);

CREATE TABLE submodulos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    modulo_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    clave VARCHAR(50) NOT NULL UNIQUE,
    FOREIGN KEY (modulo_id) REFERENCES modulos(id) ON DELETE CASCADE
);

-- 6. Permisos por Rol
CREATE TABLE rol_permisos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rol_id INT NOT NULL,
    submodulo_id INT NOT NULL,
    can_view BOOLEAN DEFAULT FALSE,
    can_create BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    UNIQUE KEY uk_rol_submodulo (rol_id, submodulo_id),
    FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (submodulo_id) REFERENCES submodulos(id) ON DELETE CASCADE
);

-- Inserción de Módulos (basados en Sidebar)
INSERT INTO modulos (nombre, clave, icono) VALUES 
('Inicio', 'inicio', 'HomeOutlined'),
('Vehículos', 'vehiculos', 'CarOutlined'),
('Inventario', 'inventario', 'ToolOutlined'),
('Finanzas', 'finanzas', 'DollarOutlined'),
('Reportes', 'reportes', 'BarChartOutlined'),
('Cotizaciones InPart', 'audatex', 'SendOutlined'),
('Configuración', 'configuracion', 'SettingOutlined');

-- Inserción de Submódulos
-- Inicio
INSERT INTO submodulos (modulo_id, nombre, clave) VALUES 
((SELECT id FROM modulos WHERE clave = 'inicio'), 'Dashboard', 'inicio_dashboard');
-- Vehículos
INSERT INTO submodulos (modulo_id, nombre, clave) VALUES 
((SELECT id FROM modulos WHERE clave = 'vehiculos'), 'Lista de Vehículos', 'vehiculos_lista'),
((SELECT id FROM modulos WHERE clave = 'vehiculos'), 'Generaciones', 'vehiculos_jerarquia');
-- Inventario
INSERT INTO submodulos (modulo_id, nombre, clave) VALUES 
((SELECT id FROM modulos WHERE clave = 'inventario'), 'Lista de Repuestos', 'inventario_lista');
-- Finanzas
INSERT INTO submodulos (modulo_id, nombre, clave) VALUES 
((SELECT id FROM modulos WHERE clave = 'finanzas'), 'Transacciones', 'finanzas_lista');
-- Reportes
INSERT INTO submodulos (modulo_id, nombre, clave) VALUES 
((SELECT id FROM modulos WHERE clave = 'reportes'), 'Reporte General', 'reportes_general'),
((SELECT id FROM modulos WHERE clave = 'reportes'), 'Ventas Empleados', 'reportes_ventas'),
((SELECT id FROM modulos WHERE clave = 'reportes'), 'Reportes Vehículos', 'reportes_vehiculos'),
((SELECT id FROM modulos WHERE clave = 'reportes'), 'Reportes Repuestos', 'reportes_repuestos');
-- Audatex
INSERT INTO submodulos (modulo_id, nombre, clave) VALUES 
((SELECT id FROM modulos WHERE clave = 'audatex'), 'Oportunidades', 'audatex_oportunidades'),
-- ((SELECT id FROM modulos WHERE clave = 'audatex'), 'Jerarquía InPart', 'audatex_jerarquia'),
((SELECT id FROM modulos WHERE clave = 'audatex'), 'Pedidos', 'audatex_pedidos');
-- Configuracion
INSERT INTO submodulos (modulo_id, nombre, clave) VALUES 
((SELECT id FROM modulos WHERE clave = 'configuracion'), 'Ajustes de Privacidad', 'configuracion_ajustes');

-- Inicializar Permisos
-- Admin tiene todo
INSERT INTO rol_permisos (rol_id, submodulo_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, s.id, TRUE, TRUE, TRUE, TRUE 
FROM roles r CROSS JOIN submodulos s
WHERE r.nombre = 'ADMIN';

-- Contador tiene solo vista de algunos
INSERT INTO rol_permisos (rol_id, submodulo_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, s.id, TRUE, FALSE, FALSE, FALSE 
FROM roles r CROSS JOIN submodulos s
WHERE r.nombre = 'CONTADOR' 
  AND s.clave IN ('inicio_dashboard', 'vehiculos_lista', 'inventario_lista', 'finanzas_lista', 'reportes_general');
