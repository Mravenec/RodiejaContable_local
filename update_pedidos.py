import json
import mysql.connector

try:
    conn = mysql.connector.connect(host='localhost', user='root', password='123456', database='sistema_vehicular')
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT id, detalle_json FROM audatex_pedidos WHERE detalle_json IS NOT NULL;")
    rows = cursor.fetchall()
    
    for row in rows:
        try:
            detalle = json.loads(row['detalle_json'])
            siniestro = detalle.get('siniestro', '')
            aseguradora = detalle.get('aseguradora', '')
            cotizacion_id = detalle.get('cotizacionId', '')
            
            update_cursor = conn.cursor()
            update_cursor.execute(
                "UPDATE audatex_pedidos SET siniestro=%s, aseguradora=%s, cotizacion_id=%s WHERE id=%s",
                (siniestro, aseguradora, cotizacion_id, row['id'])
            )
            update_cursor.close()
        except Exception as e:
            print(f"Error parsing row {row['id']}: {e}")
            
    conn.commit()
    cursor.close()
    conn.close()
    print("Database update complete!")
except Exception as e:
    print(f"Error connecting to DB: {e}")
