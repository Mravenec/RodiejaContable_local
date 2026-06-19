import subprocess
import os

def run_db_setup():
    container_name = "SistemaPrincipal"
    user = "root"
    password = "123456"

    local_db_dir = os.path.dirname(os.path.abspath(__file__))

    print("=" * 60)
    print(f"🚀 Iniciando Instalación en Docker: {container_name}")
    print("=" * 60)

    try:
        print("📁 Copiando archivos SQL al contenedor...")
        subprocess.run(f'docker exec {container_name} mkdir -p /tmp/sql', shell=True, check=True)
        subprocess.run(f'docker cp "{local_db_dir}/." {container_name}:/tmp/sql/', shell=True, check=True)

        print("⚙️ Ejecutando script maestro en MariaDB (Docker)...")
        sql_command = f"mariadb -u {user} -p{password} -v < /tmp/sql/00_run_all.sql"
        full_command = f'docker exec -i -w /tmp/sql {container_name} sh -c "{sql_command}"'

        process = subprocess.run(
            full_command,
            shell=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )

        if process.returncode == 0:
            print("\n✅ BASE DE DATOS CREADA EXITOSAMENTE EN DOCKER")
            print("-" * 30)
            output_lines = process.stdout.strip().split("\n")
            for line in output_lines[-15:]:
                print(line)
        else:
            print("\n❌ ERROR DURANTE LA INSTALACIÓN EN DOCKER")
            print("-" * 30)
            print(process.stderr)
            if not process.stderr:
                print(process.stdout)

        print("\n🧹 Limpiando archivos temporales del contenedor...")
        subprocess.run(f'docker exec {container_name} rm -rf /tmp/sql', shell=True)

    except Exception as e:
        print(f"\n❌ Error de Docker: {e}")
        print("💡 Asegúrate de que el contenedor 'SistemaPrincipal' esté corriendo.")


if __name__ == "__main__":
    run_db_setup()
