-- ============================================================
-- 05_INS_Pedidos.sql
-- Integración con INS (LINZ) - Gestión de Pedidos y Comisiones
-- ============================================================

USE sistema_vehicular;

-- ==========================================
-- TABLA: ins_pedidos_repuestos
-- ==========================================
CREATE TABLE IF NOT EXISTS ins_pedidos_repuestos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    numero_pedido VARCHAR(50) NOT NULL COMMENT 'Número de caso/pedido de LINZ',
    repuesto VARCHAR(200) NOT NULL COMMENT 'Nombre del repuesto (ej: parrilla)',
    tipo_vehiculo VARCHAR(100) COMMENT 'Tipo de vehículo (ej: Cheryl Esquadro)',
    anio_vehiculo INT COMMENT 'Año del vehículo',

    -- Precios
    precio_compra DECIMAL(12,2) DEFAULT 0.00 COMMENT 'Costo de compra del repuesto',
    precio_venta DECIMAL(12,2) DEFAULT 0.00 COMMENT 'Precio que paga LINZ',

    -- Estado de entrega
    estado ENUM('PENDIENTE_ENTREGA', 'ENTREGADO') DEFAULT 'PENDIENTE_ENTREGA',
    fecha_entrega DATETIME COMMENT 'Fecha y hora cuando se entregó',

    -- Información de cotización
    empleado_id INT COMMENT 'Empleado que hizo la cotización',
    hora_solicitud TIME COMMENT 'Hora de la solicitud (del WhatsApp)',
    fecha_solicitud DATE COMMENT 'Fecha de la solicitud',

    -- Metadatos
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Índices
    INDEX idx_numero_pedido (numero_pedido),
    INDEX idx_estado (estado),
    INDEX idx_empleado (empleado_id),
    INDEX idx_fecha_solicitud (fecha_solicitud),

    -- Foreign key
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- VISTA: vista_ins_comisiones_empleados
-- ==========================================
CREATE OR REPLACE VIEW vista_ins_comisiones_empleados AS
SELECT
    e.id AS empleado_id,
    e.nombre AS empleado,
    COUNT(ipr.id) AS total_pedidos,
    SUM(ipr.precio_venta - ipr.precio_compra) AS total_utilidad,
    SUM(CASE
        WHEN TIME(ipr.hora_solicitud) BETWEEN '07:30:00' AND '17:00:00'
        THEN (ipr.precio_venta - ipr.precio_compra) * 0.03
        ELSE (ipr.precio_venta - ipr.precio_compra) * 0.05
    END) AS total_comision,
    GROUP_CONCAT(ipr.numero_pedido ORDER BY ipr.fecha_creacion SEPARATOR ', ') AS pedidos
FROM ins_pedidos_repuestos ipr
JOIN empleados e ON ipr.empleado_id = e.id
WHERE ipr.estado = 'ENTREGADO'
GROUP BY e.id, e.nombre;

-- ==========================================
-- MOCKS INICIALES (para pruebas locales)
-- ==========================================
-- INSERT INTO ins_pedidos_repuestos (numero_pedido, repuesto, tipo_vehiculo, anio_vehiculo, precio_compra, precio_venta, estado, empleado_id, hora_solicitud, fecha_solicitud) VALUES
-- ('CAS-001', 'Parrilla delantera', 'Cheryl Esquadro', 2018, 30000.00, 45000.00, 'PENDIENTE_ENTREGA', 1, '14:30:00', CURDATE()),
-- ('CAS-002', 'Espejo lateral izquierdo', 'Nissan Versa', 2021, 15000.00, 22000.00, 'ENTREGADO', 1, '18:45:00', CURDATE() - INTERVAL 1 DAY);
