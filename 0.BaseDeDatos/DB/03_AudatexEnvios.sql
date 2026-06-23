-- ========================================
-- ROD-25: Tabla audatex_envios (03 — integración Audatex InPart)
-- ========================================
-- Esta tabla registra los envíos de cotizaciones a Audatex InPart
-- Es la única tabla nueva para la integración Audatex en todo el proyecto

USE sistema_vehicular;

-- Eliminar tabla si existe (para regenerar con el esquema correcto)
DROP TABLE IF EXISTS audatex_envios;

-- Tabla de envíos de cotizaciones a Audatex
CREATE TABLE audatex_envios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Referencia al repuesto que se cotizó
    repuesto_id INT NOT NULL,
    
    -- Datos de la oportunidad en Audatex
    cotizacion_id VARCHAR(50) NOT NULL,  -- ID de la cotización en InPart
    wan VARCHAR(50),                     -- ID del siniestro (WAN-like)
    
    -- Datos del envío
    precio_ofrecido DECIMAL(12,2) NOT NULL,
    tiempo_entrega VARCHAR(50) NOT NULL,
    condicion_pieza VARCHAR(100),
    
    -- Estado del envío
    estado ENUM('ENVIADA', 'GANADA', 'PERDIDA', 'PENDIENTE') DEFAULT 'ENVIADA',
    
    -- Timestamps
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Auditoría
    usuario_envio VARCHAR(100),
    notas TEXT,
    
    -- Foreign key
    FOREIGN KEY (repuesto_id) REFERENCES inventario_repuestos(id) ON DELETE CASCADE,
    
    -- Índices
    INDEX idx_repuesto_id (repuesto_id),
    INDEX idx_cotizacion_id (cotizacion_id),
    INDEX idx_wan (wan),
    INDEX idx_estado (estado),
    INDEX idx_fecha_envio (fecha_envio),
    INDEX idx_repuesto_estado (repuesto_id, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
