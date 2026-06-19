import subprocess
import os

CONTAINER_NAME = "SistemaPrincipal"
SQL_FILES = ["datos.sql"]

def run():
    print("============================================================")
    print("🚀 Cargando Mocks y Semillas en MariaDB (Docker)")
    print("============================================================")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    for sql_file in SQL_FILES:
        local_path = os.path.join(base_dir, "0.BaseDeDatos", sql_file.replace("/", os.sep))

        if not os.path.exists(local_path):
            print(f"❌ No se encontró el archivo: {local_path}")
            continue

        print(f"⚙️ Ejecutando {sql_file}...")

        try:
            with open(local_path, "rb") as f:
                subprocess.run(
                    ["docker", "exec", "-i", CONTAINER_NAME, "mariadb", "-u", "root", "-p123456"],
                    stdin=f,
                    check=True,
                )
            print(f"✅ {os.path.basename(sql_file)} cargado con éxito.")
        except subprocess.CalledProcessError:
            print(f"❌ Error al ejecutar {sql_file}")
        except Exception as e:
            print(f"❌ Error inesperado: {str(e)}")

    print("\n✨ Proceso de carga de datos finalizado.")


if __name__ == "__main__":
    run()
