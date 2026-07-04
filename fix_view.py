import pymysql

conn = pymysql.connect(host='localhost', user='root', password='123456', database='sistema_vehicular')
cursor = conn.cursor()

# Get the current view definition
query = """
CREATE OR REPLACE VIEW vista_inventario_completo AS
SELECT
    ir.id,
    ir.codigo_repuesto,
    ir.codigo_ubicacion,
    ir.parte_vehiculo_id,
    pv.nombre AS parte_vehiculo,
    ir.descripcion,
    ir.precio_costo,
    ir.precio_venta,
    ir.precio_mayoreo,
    ir.formula_15,
    ir.formula_30,
    ir.estado,
    ir.anio_registro,
    ir.mes_registro,
    ir.cantidad,
    v.codigo_vehiculo,
    vvc.marca,
    vvc.modelo,
    vvc.generacion,
    vvc.anio AS anio_vehiculo,
    vvc.clave_generacion
FROM inventario_repuestos ir
LEFT JOIN vehiculos v ON ir.vehiculo_origen_id = v.id
LEFT JOIN parte_vehiculo pv ON ir.parte_Vehiculo_id = pv.id
LEFT JOIN vista_vehiculos_completa vvc ON v.id = vvc.id;
"""

try:
    cursor.execute(query)
    conn.commit()
    print("View updated successfully!")
    
    # Check id 5
    cursor.execute("SELECT id, codigo_repuesto, cantidad FROM vista_inventario_completo WHERE id = 5")
    print(cursor.fetchall())
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
