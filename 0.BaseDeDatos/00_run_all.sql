-- ============================================================
-- 00_run_all.sql — SCRIPT MAESTRO DE INSTALACIÓN
-- Sistema Rodieja Contable — Gestión Vehicular
--
-- EJECUTAR EN ESTE ORDEN EXACTO contra MariaDB como root:
--   mysql -u root -p < 00_run_all.sql
--
-- Requiere: MariaDB 10.6+ con usuario root con todos los permisos
-- Tiempo estimado: ~30 segundos
--
-- Scripts numerados en DB/:
--   01_sistema_vehicular.sql  — esquema principal (tablas, vistas, triggers, SPs)
--   02_UsersAuth.sql          — autenticación y usuarios
--   03_AudatexEnvios.sql      — integración Audatex InPart (envíos)
--   04_AudatexSync.sql        — sincronización oportunidades Audatex (vista materializada)
--   04_datos.sql              — mocks (vía load_mocks.py, no incluido aquí)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = '';

-- ─────────────────────────────────────────────────────────────────
-- PASO 1: Esquema principal (tables, vistas, triggers, SPs)
-- ─────────────────────────────────────────────────────────────────
SOURCE DB/01_sistema_vehicular.sql;

-- ─────────────────────────────────────────────────────────────────
-- PASO 2: Módulo de autenticación y usuarios
--         Depende de: 01_sistema_vehicular
-- ─────────────────────────────────────────────────────────────────
SOURCE DB/02_UsersAuth.sql;

-- ─────────────────────────────────────────────────────────────────
-- PASO 3: Integración Audatex — envíos de cotizaciones InPart
--         Depende de: inventario_repuestos (01)
-- ─────────────────────────────────────────────────────────────────
SOURCE DB/03_AudatexEnvios.sql;

-- ─────────────────────────────────────────────────────────────────
-- PASO 4: Sincronización Audatex — Vista Materializada
-- ─────────────────────────────────────────────────────────────────
SOURCE DB/04_AudatexSync.sql;

SET FOREIGN_KEY_CHECKS = 1;

-- ─────────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ─────────────────────────────────────────────────────────────────
SELECT
    SCHEMA_NAME AS base_de_datos,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = SCHEMA_NAME) AS tablas
FROM INFORMATION_SCHEMA.SCHEMATA
WHERE SCHEMA_NAME = 'sistema_vehicular';

SELECT '✅ Sistema Rodieja Contable instalado exitosamente' AS mensaje, NOW() AS fecha;
