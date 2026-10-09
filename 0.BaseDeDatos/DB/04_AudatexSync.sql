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
    estado_interaccion ENUM('NUEVA', 'PENDIENTE', 'REVISADA', 'COTIZACION_ENVIADA') DEFAULT 'NUEVA',
    ultima_vez_visto DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    detalle_json JSON,
    
    INDEX idx_estado (estado),
    INDEX idx_armadora (armadora),
    INDEX idx_ultima_vez_visto (ultima_vez_visto)
);

-- ============================================================
-- TRIGGERS DE SINCRONIZACION DE ESTADOS
-- ============================================================

DELIMITER //

DROP TRIGGER IF EXISTS tr_oportunidades_sync_estado //
CREATE TRIGGER tr_oportunidades_sync_estado
BEFORE INSERT ON audatex_oportunidades_sync
FOR EACH ROW
BEGIN
    IF EXISTS (SELECT 1 FROM audatex_pedidos WHERE cotizacion_id = NEW.cotizacion_id) THEN
        SET NEW.estado_interaccion = 'COTIZACION_ENVIADA';
    END IF;
END//

DROP TRIGGER IF EXISTS tr_oportunidades_sync_estado_upd //
CREATE TRIGGER tr_oportunidades_sync_estado_upd
BEFORE UPDATE ON audatex_oportunidades_sync
FOR EACH ROW
BEGIN
    IF EXISTS (SELECT 1 FROM audatex_pedidos WHERE cotizacion_id = NEW.cotizacion_id) THEN
        SET NEW.estado_interaccion = 'COTIZACION_ENVIADA';
    END IF;
END//

DROP TRIGGER IF EXISTS tr_pedidos_update_oportunidad //
CREATE TRIGGER tr_pedidos_update_oportunidad
AFTER INSERT ON audatex_pedidos
FOR EACH ROW
BEGIN
    UPDATE audatex_oportunidades_sync 
    SET estado_interaccion = 'COTIZACION_ENVIADA' 
    WHERE cotizacion_id = NEW.cotizacion_id;
END//

DELIMITER ;
