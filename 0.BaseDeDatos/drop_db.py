import subprocess

def run_db_drop():
    container_name = "SistemaPrincipal"
    user = "root"
    password = "123456"

    databases = ["sistema_vehicular"]

    print("=" * 60)
    print(f"⚠️  PELIGRO: Se van a ELIMINAR {len(databases)} base(s) de datos")
    print(f"Contenedor: {container_name}")
    print("=" * 60)

    confirm = input("¿Estás seguro de que deseas borrar TODO? (s/n): ")
    if confirm.lower() != "s":
        print("Operación cancelada.")
        return

    try:
        drop_commands = " ".join([f"DROP DATABASE IF EXISTS {db};" for db in databases])

        print("⚙️ Eliminando base de datos en Docker...")

        command = f'docker exec -i {container_name} mariadb -u {user} -p{password} -e "{drop_commands}"'

        process = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )

        if process.returncode == 0:
            print("\n✅ La base de datos ha sido eliminada correctamente.")
        else:
            print("\n❌ ERROR AL ELIMINAR BASE DE DATOS")
            print("-" * 30)
            print(process.stderr)

    except Exception as e:
        print(f"\n❌ Error de Docker: {e}")


if __name__ == "__main__":
    run_db_drop()
