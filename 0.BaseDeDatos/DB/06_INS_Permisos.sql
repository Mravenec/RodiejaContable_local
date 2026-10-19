-- ============================================================
-- 06_INS_Permisos.sql
-- Migración de permisos para el módulo INS (LINZ)
-- ============================================================

USE sistema_vehicular;

-- ==========================================
-- 1. Insertar módulo INS
-- ==========================================
INSERT INTO modulos (nombre, clave, icono) VALUES
('INS', 'ins', 'SendOutlined')
ON DUPLICATE KEY UPDATE nombre=nombre, clave=clave, icono=icono;

-- ==========================================
-- 2. Insertar submódulos INS
-- ==========================================
INSERT INTO submodulos (modulo_id, nombre, clave) VALUES
((SELECT id FROM modulos WHERE clave='ins'), 'Pedidos INS', 'ins_pedidos'),
((SELECT id FROM modulos WHERE clave='ins'), 'Ventas Empleados INS', 'ins_ventas_empleados'),
((SELECT id FROM modulos WHERE clave='ins'), 'Crear Pedido INS', 'ins_crear_pedido'),
((SELECT id FROM modulos WHERE clave='ins'), 'Entregar Pedido INS', 'ins_entregar_pedido'),
((SELECT id FROM modulos WHERE clave='ins'), 'Pagar Comisiones INS', 'ins_pagar_comisiones')
ON DUPLICATE KEY UPDATE nombre=nombre, clave=clave;

-- ==========================================
-- 3. Asignar permisos a rol ADMIN
-- ==========================================
INSERT INTO rol_permisos (rol_id, submodulo_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, s.id, TRUE, TRUE, TRUE, TRUE
FROM roles r, submodulos s
WHERE r.nombre = 'ADMIN' AND s.modulo_id = (SELECT id FROM modulos WHERE clave='ins')
ON DUPLICATE KEY UPDATE can_view=TRUE, can_create=TRUE, can_edit=TRUE, can_delete=TRUE;

-- ==========================================
-- 4. Asignar permisos a rol CONTADOR
-- ==========================================
-- Contador: puede ver pedidos, ver ventas empleados, pagar comisiones
INSERT INTO rol_permisos (rol_id, submodulo_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, s.id,
    CASE WHEN s.clave IN ('ins_pedidos', 'ins_ventas_empleados', 'ins_pagar_comisiones') THEN TRUE ELSE FALSE END,
    CASE WHEN s.clave = 'ins_pagar_comisiones' THEN TRUE ELSE FALSE END,
    FALSE,
    FALSE
FROM roles r, submodulos s
WHERE r.nombre = 'CONTADOR' AND s.modulo_id = (SELECT id FROM modulos WHERE clave='ins')
ON DUPLICATE KEY UPDATE
    can_view=CASE WHEN s.clave IN ('ins_pedidos', 'ins_ventas_empleados', 'ins_pagar_comisiones') THEN TRUE ELSE FALSE END,
    can_create=CASE WHEN s.clave = 'ins_pagar_comisiones' THEN TRUE ELSE FALSE END,
    can_edit=FALSE,
    can_delete=FALSE;

-- ==========================================
-- 5. Asignar permisos a rol COLABORADOR
-- ==========================================
-- Colaborador: puede ver pedidos, crear pedidos, entregar pedidos
INSERT INTO rol_permisos (rol_id, submodulo_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, s.id,
    CASE WHEN s.clave IN ('ins_pedidos', 'ins_ventas_empleados') THEN TRUE ELSE FALSE END,
    CASE WHEN s.clave IN ('ins_crear_pedido', 'ins_entregar_pedido') THEN TRUE ELSE FALSE END,
    FALSE,
    FALSE
FROM roles r, submodulos s
WHERE r.nombre = 'COLABORADOR' AND s.modulo_id = (SELECT id FROM modulos WHERE clave='ins')
ON DUPLICATE KEY UPDATE
    can_view=CASE WHEN s.clave IN ('ins_pedidos', 'ins_ventas_empleados') THEN TRUE ELSE FALSE END,
    can_create=CASE WHEN s.clave IN ('ins_crear_pedido', 'ins_entregar_pedido') THEN TRUE ELSE FALSE END,
    can_edit=FALSE,
    can_delete=FALSE;
