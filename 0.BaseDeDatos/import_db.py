"""Import a .sql / .sql.gz dump into local Docker MariaDB.

Modes:
  --file path.sql[.gz] --full   : DROP + apply full dump (schema+data), then refresh 04_datos.sql
  --file path.sql --data        : write as DB/04_datos.sql, then DROP + setup_db + load_data (CLI)
  --rebuild                     : DROP + setup_db + load_data (uses existing project SQL) (CLI)
"""
import argparse
import gzip
import os
import shutil
import subprocess
import sys
import tempfile

CONTAINER_NAME = "SistemaPrincipal"
DB_NAME = "sistema_vehicular"
USER = "root"
PASSWORD = "123456"


def _base_dir():
    return os.path.dirname(os.path.abspath(__file__))


def _drop_silent():
    cmd = (
        f'docker exec -i {CONTAINER_NAME} mariadb -u {USER} -p{PASSWORD} '
        f'-e "DROP DATABASE IF EXISTS {DB_NAME};"'
    )
    proc = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr or proc.stdout)


def _apply_sql_file(local_path):
    with open(local_path, "rb") as f:
        subprocess.run(
            ["docker", "exec", "-i", CONTAINER_NAME, "mariadb", f"-u{USER}", f"-p{PASSWORD}"],
            stdin=f,
            check=True,
        )


def _resolve_sql_path(path):
    """Return a path to a plain .sql file; decompress .gz to a temp file if needed."""
    lower = path.lower()
    if lower.endswith(".sql.gz") or lower.endswith(".gz"):
        fd, tmp = tempfile.mkstemp(suffix=".sql", prefix="import_")
        os.close(fd)
        print(f"Decompressing {path} -> {tmp}")
        with gzip.open(path, "rb") as f_in, open(tmp, "wb") as f_out:
            shutil.copyfileobj(f_in, f_out)
        return tmp, True
    return path, False


def _run_python(script_name):
    script = os.path.join(_base_dir(), script_name)
    env = os.environ.copy()
    env.setdefault("PYTHONIOENCODING", "utf-8")
    subprocess.run([sys.executable, script], check=True, cwd=_base_dir(), env=env)


def rebuild_from_project_files():
    print("DROP -> setup_db -> load_data ...")
    _drop_silent()
    _run_python("setup_db.py")
    _run_python("load_data.py")
    print("Rebuild complete.")


def import_data_sql(sql_path):
    dest = os.path.join(_base_dir(), "DB", "04_datos.sql")
    print(f"Copying data SQL -> {dest}")
    shutil.copy2(sql_path, dest)
    rebuild_from_project_files()


def import_full_sql(sql_path):
    resolved, is_temp = _resolve_sql_path(sql_path)
    try:
        print(f"DROP + apply full dump: {sql_path}")
        _drop_silent()
        _apply_sql_file(resolved)
        from export_db import export_all
        export_all()
        print("Full import complete; 04_datos.sql refreshed from live DB.")
    finally:
        if is_temp:
            try:
                os.remove(resolved)
            except OSError:
                pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", help="Path to .sql or .sql.gz to import")
    parser.add_argument("--full", action="store_true", help="Treat file as full dump")
    parser.add_argument("--data", action="store_true", help="Treat file as data-only INSERTs (CLI)")
    parser.add_argument("--rebuild", action="store_true", help="Only DROP+setup+load_data (CLI)")
    parser.add_argument("--yes", action="store_true", help="Required confirmation flag")
    args = parser.parse_args()

    if not args.yes:
        print("Refusing: pass --yes to confirm destructive import.")
        sys.exit(1)

    if args.rebuild:
        rebuild_from_project_files()
    elif args.file and args.full:
        import_full_sql(os.path.abspath(args.file))
    elif args.file and args.data:
        import_data_sql(os.path.abspath(args.file))
    else:
        parser.error("Use --rebuild, or --file with --full/--data, plus --yes")
