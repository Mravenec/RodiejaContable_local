-- ============================================================
-- 04_AudatexSync.sql — Vista Materializada para Sincronización
-- ============================================================

CREATE TABLE IF NOT EXISTS audatex_oportunidades_sync (
    wan VARCHAR(255) PRIMARY KEY,
    aseguradora VARCHAR(255),
    cotizacion_id VARCHAR(100),
    taller VARCHAR(255),
    poliza VARCHAR(100),
    siniestro VARCHAR(100),
    matricula VARCHAR(100),
    armadora VARCHAR(100),
    modelo VARCHAR(100),
    anio VARCHAR(50),
    fecha_cotizacion VARCHAR(100),
    pendientes INT DEFAULT 0,
    
    estado ENUM('ACTIVA', 'CERRADA') DEFAULT 'ACTIVA',
    ultima_vez_visto DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    detalle_json JSON,
    
    INDEX idx_estado (estado),
    INDEX idx_armadora (armadora),
    INDEX idx_ultima_vez_visto (ultima_vez_visto)
);
