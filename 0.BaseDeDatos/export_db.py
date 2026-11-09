"""Export live MariaDB -> project SQL files + gzip download artifact.

Modes (env RODIEJA_DB_MODE):
  docker (default) : docker exec SistemaPrincipal mariadb-dump  (Local)
  direct           : mariadb-dump/mysqldump to host (EC2 -> RDS)

- DB/04_datos.sql          : data-only (INSERTs) for load_data.py
- DB/_schema_from_live.sql : schema-only snapshot
- exports/*.sql.gz         : full dump for download
"""
import argparse
import gzip
import os
import shutil
import subprocess
from datetime import datetime

CONTAINER_NAME = "SistemaPrincipal"
DB_NAME = os.environ.get("RODIEJA_DB_NAME", "sistema_vehicular")
USER = os.environ.get("RODIEJA_DB_USER", "root")
PASSWORD = os.environ.get("RODIEJA_DB_PASSWORD", "123456")
HOST = os.environ.get("RODIEJA_DB_HOST", "")
PORT = os.environ.get("RODIEJA_DB_PORT", "3306")


def _base_dir():
    return os.path.dirname(os.path.abspath(__file__))


def _mode():
    return os.environ.get("RODIEJA_DB_MODE", "docker").strip().lower()


def _dump_binary():
    for name in ("mariadb-dump", "mysqldump"):
        path = shutil.which(name)
        if path:
            return path
    raise RuntimeError(
        "Neither mariadb-dump nor mysqldump found on PATH. "
        "Install MariaDB client tools on EC2 (e.g. sudo dnf install -y mariadb)."
    )


def _dump_cmd(args_extra, database_flag=True):
    """Build dump command for docker (local) or direct (RDS)."""
    common = ["--single-transaction", "--routines", "--triggers"]
    if _mode() == "direct":
        if not HOST:
            raise RuntimeError("RODIEJA_DB_MODE=direct requires RODIEJA_DB_HOST")
        cmd = [
            _dump_binary(),
            f"-h{HOST}",
            f"-P{PORT}",
            f"-u{USER}",
            f"-p{PASSWORD}",
            *common,
        ]
        if database_flag:
            cmd.extend(["--databases", DB_NAME])
        else:
            cmd.append(DB_NAME)
        cmd.extend(args_extra)
        return cmd

    cmd = [
        "docker", "exec", CONTAINER_NAME,
        "mariadb-dump",
        f"-u{USER}", f"-p{PASSWORD}",
        *common,
    ]
    if database_flag:
        cmd.extend(["--databases", DB_NAME])
    else:
        cmd.append(DB_NAME)
    cmd.extend(args_extra)
    return cmd


def _run_dump(args_extra, dest_path):
    cmd = _dump_cmd(args_extra, database_flag=True)
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
    schema_path = os.path.join(base, "DB", "_schema_from_live.sql")

    print("=" * 60)
    print(f"Exporting live database -> .sql.gz (mode={_mode()})")
    print("=" * 60)

    print("1/2 Full dump (schema + data)...")
    _run_dump([], full_sql)
    print(f"   -> {full_sql}")

    print("2/2 Compress full dump -> .sql.gz ...")
    _gzip_file(full_sql, full_gz)
    try:
        os.remove(full_sql)
    except OSError:
        pass
    print(f"   -> {full_gz}")

    print("\nExport finished.")
    return {
        "full": full_gz,
        "schema": schema_path,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export sistema_vehicular (Docker local or direct RDS)")
    parser.parse_args()
    export_all()
