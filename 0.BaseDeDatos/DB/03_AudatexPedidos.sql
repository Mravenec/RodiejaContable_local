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
    notas TEXT,
    detalle_json JSON COMMENT 'Datos crudos de Audatex InPart',
    ultima_vez_visto DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_audatex_pedidos_wan (wan),
    INDEX idx_audatex_pedidos_cotizacion (cotizacion_id),
    INDEX idx_audatex_pedidos_estado (estado)
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

-- Mocks iniciales (para pruebas locales)
INSERT INTO audatex_pedidos (numero_pedido, cotizacion_id, siniestro, aseguradora, vehiculo, vin, total_pedido, estado, notas) VALUES 
('PED-9001', 'COT-12345', 'SIN-888', 'Axa Seguros', 'Nissan Versa 2021', '3N1CN8V2XLL123', 1500.00, 'Entregado', 'Prueba Facturado'),
(NULL, 'COT-12346', 'SIN-889', 'GNP Seguros', 'Ford Figo 2018', '3FADP4G22JM123', 800.00, 'Aguardando Confirmación', 'Solo cotización enviada');

INSERT INTO audatex_pedido_items (pedido_id, repuesto_id, precio_ofrecido, cantidad) VALUES 
(1, 1, 1500.00, 1),
(2, 2, 800.00, 1);
