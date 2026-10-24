"""
prefetch_data.py
----------------
Prefetches all January 2026 actuals (FUELHH - WIND) and forecasts (WINDFOR)
from the live Elexon BMRS API and caches them to backend/data/jan2026_wind_cache.json.
"""

import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.elexon_client import fetch_and_cache_jan2026
from app.config import CACHE_FILE_PATH

if __name__ == "__main__":
    print(f"Starting pre-fetch for January 2026 into: {CACHE_FILE_PATH}")
    data = fetch_and_cache_jan2026(force=True)
    actuals_count = len(data.get("actuals", []))
    forecasts_count = len(data.get("forecasts", []))
    file_size_mb = CACHE_FILE_PATH.stat().st_size / (1024 * 1024)
    print("\n" + "=" * 60)
    print("PREFETCH COMPLETE!")
    print(f"Cache File: {CACHE_FILE_PATH}")
    print(f"File Size: {file_size_mb:.2f} MB")
    print(f"FUELHH (WIND) actual periods: {actuals_count}")
    print(f"WINDFOR forecast revisions: {forecasts_count}")
    print("=" * 60)
