"""
Application Configuration
"""

import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
CACHE_FILE_PATH = DATA_DIR / "jan2026_wind_cache.json"

# Ensure data directory exists
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Elexon API Endpoints
ELEXON_BASE_URL = os.getenv("ELEXON_BASE_URL", "https://data.elexon.co.uk/bmrs/api/v1")
FUELHH_STREAM_ENDPOINT = f"{ELEXON_BASE_URL}/datasets/FUELHH/stream"
WINDFOR_STREAM_ENDPOINT = f"{ELEXON_BASE_URL}/datasets/WINDFOR/stream"

# Domain Boundaries (January 2026 purchase decisions and target delivery periods)
DEFAULT_START_DATE = "2026-01-01"
DEFAULT_END_DATE = "2026-01-31"
TARGET_DELIVERY_END_DATE = "2026-02-01"  # Decision on Jan 31 delivers on Feb 1

# Standard UK Day-Ahead Cutoff (11:00 UTC)
DEFAULT_CUTOFF_HOUR_UTC = 11
