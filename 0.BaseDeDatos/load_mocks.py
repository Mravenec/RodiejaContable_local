"""Deprecated alias — use load_data.py. Kept so old commands still work."""
from load_data import run

if __name__ == "__main__":
    print("NOTE: load_mocks.py is deprecated; prefer load_data.py (real data).")
    run()
