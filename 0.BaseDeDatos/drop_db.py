import argparse
import subprocess
import sys

def run_db_drop(auto_yes=False):
    container_name = "SistemaPrincipal"
    user = "root"
    password = "123456"

    databases = ["sistema_vehicular"]

    print("=" * 60)
    print(f"WARNING: Will DROP {len(databases)} database(s)")
    print(f"Container: {container_name}")
    print("=" * 60)

    if not auto_yes:
        confirm = input("Type 's' to confirm DROP: ")
        if confirm.lower() != "s":
            print("Cancelled.")
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
    parser = argparse.ArgumentParser()
    parser.add_argument("--yes", action="store_true", help="Skip interactive confirm")
    args = parser.parse_args()
    run_db_drop(auto_yes=args.yes)
