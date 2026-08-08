import re

with open('0.BaseDeDatos/DB/01_sistema_vehicular.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the broken section from the start of the insert trigger to just before the next one
start_marker = "-- Trigger para generar código de repuesto"
end_marker = "-- Inserta un repuesto sin vehículo origen, generando código único por generación y registrando el egreso automáticamente."

new_triggers = """-- Trigger para generar código de repuesto
DELIMITER //
CREATE TRIGGER tr_generar_codigo_repuesto
BEFORE INSERT ON inventario_repuestos
FOR EACH ROW
BEGIN
    DECLARE gen_inicio INT;
    DECLARE gen_fin INT;
    DECLARE contador INT;
    DECLARE var_generacion_id INT;
    DECLARE var_marca VARCHAR(50);

    -- ✅ Solo genera el código si NO viene definido
    IF NEW.codigo_repuesto IS NULL OR NEW.codigo_repuesto = '' THEN
        IF NEW.vehiculo_origen_id IS NOT NULL THEN
            SELECT generacion_id INTO var_generacion_id FROM vehiculos WHERE id = NEW.vehiculo_origen_id;
        ELSEIF NEW.generacion_id IS NOT NULL THEN
            SET var_generacion_id = NEW.generacion_id;
        END IF;

        IF var_generacion_id IS NOT NULL THEN
            -- Obtener rango de años y marca de la generación
            SELECT g.anio_inicio, g.anio_fin, m.nombre
            INTO gen_inicio, gen_fin, var_marca
            FROM generaciones g
            JOIN modelos mo ON g.modelo_id = mo.id
            JOIN marcas m ON mo.marca_id = m.id
            WHERE g.id = var_generacion_id;

            -- Contar repuestos asociados a esa generación
            SELECT COUNT(*) + 1 INTO contador
            FROM inventario_repuestos ir
            LEFT JOIN vehiculos v2 ON ir.vehiculo_origen_id = v2.id
            WHERE (ir.generacion_id = var_generacion_id) OR (v2.generacion_id = var_generacion_id);

            SET NEW.codigo_repuesto = CONCAT('REP-', REPLACE(var_marca, ' ', ''), '-', gen_inicio, '-', gen_fin, '-', LPAD(contador, 4, '0'));
        ELSE
            -- Código temporal por año/mes
            SELECT COUNT(*) + 1 INTO contador
            FROM inventario_repuestos
            WHERE anio_registro = NEW.anio_registro AND mes_registro = NEW.mes_registro;

            SET NEW.codigo_repuesto = CONCAT('REP-TEMP-', NEW.anio_registro, '-', LPAD(NEW.mes_registro, 2, '0'), '-', LPAD(contador, 4, '0'));
        END IF;
    END IF;
END;
//
DELIMITER ;

-- Trigger para actualizar código de repuesto si cambia la generación
DELIMITER //
CREATE TRIGGER tr_actualizar_codigo_repuesto
BEFORE UPDATE ON inventario_repuestos
FOR EACH ROW
BEGIN
    DECLARE gen_inicio INT;
    DECLARE gen_fin INT;
    DECLARE contador INT;
    DECLARE var_generacion_id INT;
    DECLARE var_marca VARCHAR(50);

    -- Si se asignó una generación nueva o si era un código temporal y ahora tiene generación
    IF (NEW.generacion_id IS NOT NULL AND (OLD.generacion_id IS NULL OR NEW.generacion_id != OLD.generacion_id)) 
       OR (NEW.codigo_repuesto LIKE 'REP-TEMP-%' AND NEW.generacion_id IS NOT NULL) THEN

        SET var_generacion_id = NEW.generacion_id;

        -- Obtener rango de años y marca de la generación
        SELECT g.anio_inicio, g.anio_fin, m.nombre
        INTO gen_inicio, gen_fin, var_marca
        FROM generaciones g
        JOIN modelos mo ON g.modelo_id = mo.id
        JOIN marcas m ON mo.marca_id = m.id
        WHERE g.id = var_generacion_id;

        -- Contar repuestos asociados a esa generación
        SELECT COUNT(*) + 1 INTO contador
        FROM inventario_repuestos ir
        LEFT JOIN vehiculos v2 ON ir.vehiculo_origen_id = v2.id
        WHERE ((ir.generacion_id = var_generacion_id) OR (v2.generacion_id = var_generacion_id))
          AND ir.id != NEW.id;

        SET NEW.codigo_repuesto = CONCAT('REP-', REPLACE(var_marca, ' ', ''), '-', gen_inicio, '-', gen_fin, '-', LPAD(contador, 4, '0'));
    END IF;
END;
//
DELIMITER ;

"""

# Find indices
start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + new_triggers + content[end_idx:]
    with open('0.BaseDeDatos/DB/01_sistema_vehicular.sql', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fix applied.")
else:
    print("Markers not found.")

