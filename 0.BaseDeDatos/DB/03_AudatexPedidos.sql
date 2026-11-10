-- ============================================================
-- 03_AudatexPedidos.sql
-- Integración con Audatex InPart - Gestión de Pedidos y Cotizaciones
-- ============================================================

USE sistema_vehicular;

-- Eliminar tabla antigua si existiera
DROP TABLE IF EXISTS audatex_pedido_items;
DROP TABLE IF EXISTS audatex_pedidos;
DROP TABLE IF EXISTS audatex_envios;

-- ==========================================
-- TABLA: audatex_pedidos
-- ==========================================
CREATE TABLE audatex_pedidos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    numero_pedido VARCHAR(50) UNIQUE DEFAULT NULL COMMENT 'Null cuando es solo cotización, se llena al convertirse en pedido',
    cotizacion_id VARCHAR(50) NOT NULL,
    siniestro VARCHAR(50) COMMENT 'Anteriormente wan',
    wan VARCHAR(255) COMMENT 'Para sincronización incremental de Pedidos InPart',
    aseguradora VARCHAR(100),
    vehiculo VARCHAR(100),
    vin VARCHAR(100),
    total_pedido DECIMAL(12,2) DEFAULT 0.00,
    estado ENUM('Aguardando Confirmación', 'En procesamiento', 'Cancelado', 'Entregado', 'Recibido') DEFAULT 'Aguardando Confirmación',
    user_id INT DEFAULT NULL COMMENT 'ID del usuario del sistema responsable (users.id)',
    transaccion_id INT DEFAULT NULL,
    comision_calculada DECIMAL(12,2) DEFAULT NULL,
    porcentaje_comision TINYINT DEFAULT NULL,
    comision_pagada TINYINT(1) DEFAULT 0,
    fecha_pago_comision DATE DEFAULT NULL,
    referencia_pago_comision VARCHAR(100) DEFAULT NULL,
    notas_pago_comision TEXT DEFAULT NULL,
    notas TEXT,
    detalle_json JSON COMMENT 'Datos crudos de Audatex InPart',
    ultima_vez_visto DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (transaccion_id) REFERENCES transacciones_financieras(id) ON DELETE SET NULL,
    INDEX idx_audatex_pedidos_wan (wan),
    INDEX idx_audatex_pedidos_cotizacion (cotizacion_id),
    INDEX idx_audatex_pedidos_estado (estado),
    INDEX idx_audatex_pedidos_user (user_id),
    INDEX idx_audatex_pedidos_transaccion (transaccion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- TABLA: audatex_pedido_items
-- ==========================================
CREATE TABLE audatex_pedido_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pedido_id INT NOT NULL,
    repuesto_id INT NOT NULL,
    precio_ofrecido DECIMAL(12,2) NOT NULL,
    cantidad INT DEFAULT 1,
    descripcion VARCHAR(255),
    tipo_pieza VARCHAR(50),
    dias_entrega INT,
    FOREIGN KEY (pedido_id) REFERENCES audatex_pedidos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mocks iniciales para pruebas locales de Pedidos e INS
INSERT INTO audatex_pedidos (numero_pedido, cotizacion_id, siniestro, aseguradora, vehiculo, vin, total_pedido, estado, detalle_json) VALUES 
('PED-INS-8001', 'COT-INS-101', 'SIN-7701', 'INS', 'Toyota Corolla 2022', 'JTDFN4CE4N1234567', 350000.00, 'En procesamiento', '{"fecha":"20/10/2026 10:30","armadora":"Toyota","modelo":"Corolla","anio":"2022","matricula":"BDG-101","aseguradora":"INS","taller":"Taller Central La Uruca","siniestro":"SIN-7701"}'),
('PED-INS-8002', 'COT-INS-102', 'SIN-7702', 'INS', 'Hyundai Tucson 2021', 'KM8J33A48MU987654', 480000.00, 'En procesamiento', '{"fecha":"20/10/2026 19:15","armadora":"Hyundai","modelo":"Tucson","anio":"2021","matricula":"CLM-202","aseguradora":"INS","taller":"Carrocerías del Este","siniestro":"SIN-7702"}'),
('PED-INS-8003', 'COT-INS-103', 'SIN-7703', 'INS', 'Nissan Kicks 2023', '3N1CP5CU8PL112233', 210000.00, 'Cancelado', '{"fecha":"19/10/2026 14:00","armadora":"Nissan","modelo":"Kicks","anio":"2023","matricula":"PKS-303","aseguradora":"INS","taller":"Taller Rápido Alajuela","siniestro":"SIN-7703"}');

INSERT INTO audatex_pedido_items (pedido_id, repuesto_id, precio_ofrecido, cantidad, descripcion, tipo_pieza, dias_entrega) VALUES 
(1, 1, 350000.00, 1, 'Bumper Delantero Original', 'Original', 2),
(2, 2, 480000.00, 1, 'Faro Delantero Izquierdo LED', 'Original', 3),
(3, 1, 210000.00, 1, 'Guardafango Derecho', 'Genérica', 1);
