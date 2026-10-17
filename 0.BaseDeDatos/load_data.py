"""Load real seed data (formerly mocks) into MariaDB Docker.

Uses DB/04_datos.sql — production/local snapshot data, not demo fixtures.
"""
import subprocess
import os

CONTAINER_NAME = "SistemaPrincipal"
SQL_FILES = ["DB/04_datos.sql"]


def run():
    print("============================================================")
    print("Loading REAL data into MariaDB (Docker) — DB/04_datos.sql")
    print("============================================================")

    base_dir = os.path.dirname(os.path.abspath(__file__))

    for sql_file in SQL_FILES:
        local_path = os.path.join(base_dir, sql_file.replace("/", os.sep))

        if not os.path.exists(local_path):
            print(f"ERROR: file not found: {local_path}")
            continue

        print(f"Executing {sql_file}...")

        try:
            with open(local_path, "rb") as f:
                subprocess.run(
                    ["docker", "exec", "-i", CONTAINER_NAME, "mariadb", "-u", "root", "-p123456"],
                    stdin=f,
                    check=True,
                )
            print(f"OK: {os.path.basename(sql_file)} loaded.")
        except subprocess.CalledProcessError:
            print(f"ERROR: failed to execute {sql_file}")
        except Exception as e:
            print(f"ERROR: {str(e)}")

    print("\nData load finished.")


if __name__ == "__main__":
    run()
