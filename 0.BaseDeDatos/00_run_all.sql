-- ============================================================
-- 00_run_all.sql — SCRIPT MAESTRO DE INSTALACIÓN
-- Sistema Rodieja Contable — Gestión Vehicular
--
-- EJECUTAR EN ESTE ORDEN EXACTO contra MariaDB como root:
--   mysql -u root -p < 00_run_all.sql
--
-- Requiere: MariaDB 10.6+ con usuario root con todos los permisos
-- Tiempo estimado: ~30 segundos
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = '';

-- ─────────────────────────────────────────────────────────────────
-- PASO 1: Esquema principal (tablas, vistas, triggers, SPs)
-- ─────────────────────────────────────────────────────────────────
SOURCE sistema_vehicular.sql;

-- ─────────────────────────────────────────────────────────────────
-- PASO 2: Módulo de autenticación y usuarios
--         Depende de: sistema_vehicular
-- ─────────────────────────────────────────────────────────────────
SOURCE 04_UsersAuth.sql;

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
