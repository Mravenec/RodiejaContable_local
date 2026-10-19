"""Export live MariaDB -> project SQL files + gzip download artifact.

- DB/04_datos.sql          : data-only (INSERTs) for load_data.py
- DB/_schema_from_live.sql : schema-only snapshot (diff vs numbered schema files)
- exports/*.sql.gz         : full dump (schema + data) for backup / import elsewhere
"""
import argparse
import gzip
import os
import subprocess
from datetime import datetime

CONTAINER_NAME = "SistemaPrincipal"
DB_NAME = "sistema_vehicular"
USER = "root"
PASSWORD = "123456"


def _base_dir():
    return os.path.dirname(os.path.abspath(__file__))


def _run_dump(args_extra, dest_path):
    cmd = [
        "docker", "exec", CONTAINER_NAME,
        "mariadb-dump",
        f"-u{USER}", f"-p{PASSWORD}",
        "--single-transaction",
        "--routines",
        "--triggers",
        "--databases", DB_NAME,
        *args_extra,
    ]
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    with open(dest_path, "wb") as out:
        proc = subprocess.run(cmd, stdout=out, stderr=subprocess.PIPE)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.decode("utf-8", errors="replace"))
    return dest_path


def _gzip_file(src_path, dest_gz):
    with open(src_path, "rb") as f_in, gzip.open(dest_gz, "wb") as f_out:
        while True:
            chunk = f_in.read(1024 * 1024)
            if not chunk:
                break
            f_out.write(chunk)
    return dest_gz


def export_all():
    base = _base_dir()
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    exports_dir = os.path.join(base, "exports")
    os.makedirs(exports_dir, exist_ok=True)

    full_sql = os.path.join(exports_dir, f"sistema_vehicular_full_{stamp}.sql")
    full_gz = os.path.join(exports_dir, f"sistema_vehicular_{stamp}.sql.gz")
    data_path = os.path.join(base, "DB", "04_datos.sql")
    schema_path = os.path.join(base, "DB", "_schema_from_live.sql")

    print("=" * 60)
    print("Exporting live database -> project files")
    print("=" * 60)

    print("1/4 Full dump (schema + data)...")
    _run_dump([], full_sql)
    print(f"   -> {full_sql}")

    print("2/4 Compress full dump -> .sql.gz ...")
    _gzip_file(full_sql, full_gz)
    # Keep only the gzip as the portable artifact; remove uncompressed twin
    try:
        os.remove(full_sql)
    except OSError:
        pass
    print(f"   -> {full_gz}")

    print("3/4 Data-only -> DB/04_datos.sql ...")
    header = (
        "-- ============================================================\n"
        "-- 04_datos.sql — REAL DATA snapshot (not mocks)\n"
        f"-- Generated: {datetime.now().isoformat(timespec='seconds')}\n"
        "-- Loaded by: load_data.py (after setup_db.py)\n"
        "-- ============================================================\n"
        "SET FOREIGN_KEY_CHECKS = 0;\n"
        f"USE `{DB_NAME}`;\n\n"
    ).encode("utf-8")
    cmd_data = [
        "docker", "exec", CONTAINER_NAME,
        "mariadb-dump",
        f"-u{USER}", f"-p{PASSWORD}",
        "--single-transaction",
        "--no-create-info",
        "--complete-insert",
        "--skip-triggers",
        DB_NAME,
    ]
    with open(data_path, "wb") as out:
        out.write(header)
        proc = subprocess.run(cmd_data, stdout=out, stderr=subprocess.PIPE)
        if proc.returncode != 0:
            raise RuntimeError(proc.stderr.decode("utf-8", errors="replace"))
        out.write(b"\nSET FOREIGN_KEY_CHECKS = 1;\n")
    print(f"   -> {data_path}")

    print("4/4 Schema-only snapshot -> DB/_schema_from_live.sql ...")
    _run_dump(["--no-data"], schema_path)
    print(f"   -> {schema_path}")
    print("   (Merge structural diffs into 01/02/03/04 schema files manually when needed.)")

    print("\nExport finished.")
    return {
        "full": full_gz,
        "data": data_path,
        "schema": schema_path,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export sistema_vehicular from Docker MariaDB")
    parser.parse_args()
    export_all()
