import pymysql
import json

try:
    conn = pymysql.connect(host="127.0.0.1", port=3306, user="root", password="123456", database="sistema_vehicular", cursorclass=pymysql.cursors.DictCursor)
    with conn.cursor() as cursor:
        cursor.execute("SELECT numero_pedido, estado, json_length(detalle_json) as jlen, detalle_json FROM audatex_pedidos WHERE numero_pedido='14925' OR wan='fDfWyDK3YNg='")
        row = cursor.fetchone()
        if row:
            print(f"Order: {row['numero_pedido']}")
            dj = json.loads(row['detalle_json'])
            if 'items' in dj:
                print(f"Has {len(dj['items'])} items")
                for item in dj['items']:
                    print(item)
            else:
                print("NO ITEMS IN JSON")
        else:
            print("ORDER NOT FOUND")
except Exception as e:
    print(e)
