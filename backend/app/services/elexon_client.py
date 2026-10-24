"""
elexon_client.py
----------------
Ingestion, filtering, chunking, and disk-caching service for Elexon BMRS datasets:
1. FUELHH (Actual generation - filtered strictly for fuelType == "WIND")
2. WINDFOR (Forecast generation - all revisions published for Jan 2026 decisions)
"""

import datetime
import json
import logging
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional
from dateutil import parser

from app.config import (
    CACHE_FILE_PATH,
    DATA_DIR,
    FUELHH_STREAM_ENDPOINT,
    WINDFOR_STREAM_ENDPOINT,
)

logger = logging.getLogger("elexon_client")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


def _http_get_json(url: str, params: Dict[str, str], timeout: int = 45) -> List[Dict[str, Any]]:
    """Helper to query Elexon API endpoint with query parameters and parse JSON/NDJSON."""
    qs = urllib.parse.urlencode(params)
    full_url = f"{url}?{qs}"
    req = urllib.request.Request(
        full_url,
        headers={
            "Accept": "application/json, application/x-ndjson, text/plain, */*",
            "User-Agent": "UK-DayAhead-EnergyPilot/1.0",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw_text = resp.read().decode("utf-8")
    
    if not raw_text.strip():
        return []

    try:
        data = json.loads(raw_text)
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "data" in data:
            return data["data"]
        return [data]
    except json.JSONDecodeError:
        # Fallback for NDJSON
        records = []
        for line in raw_text.strip().split("\n"):
            line = line.strip()
            if line:
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        return records


def fetch_fuelhh_wind_range(start_date: str = "2026-01-01", end_date: str = "2026-02-01") -> List[Dict[str, Any]]:
    """
    Fetch FUELHH settlement records in 5-day chunks and filter strictly for fuelType == 'WIND'.
    Dates in YYYY-MM-DD format.
    """
    start_dt = datetime.date.fromisoformat(start_date)
    end_dt = datetime.date.fromisoformat(end_date)
    
    all_wind_records: List[Dict[str, Any]] = []
    current_dt = start_dt
    chunk_days = 5

    logger.info(f"Fetching FUELHH (WIND) from {start_date} to {end_date}...")
    while current_dt <= end_dt:
        chunk_end = min(current_dt + datetime.timedelta(days=chunk_days - 1), end_dt)
        params = {
            "settlementDateFrom": current_dt.isoformat(),
            "settlementDateTo": chunk_end.isoformat(),
        }
        logger.info(f"  FUELHH chunk: {params['settlementDateFrom']} -> {params['settlementDateTo']}")
        try:
            records = _http_get_json(FUELHH_STREAM_ENDPOINT, params)
            wind_records = [
                {
                    "startTime": r["startTime"],
                    "settlementDate": r.get("settlementDate"),
                    "settlementPeriod": r.get("settlementPeriod"),
                    "fuelType": "WIND",
                    "generation": float(r.get("generation", 0)),
                }
                for r in records
                if str(r.get("fuelType", "")).upper() == "WIND" and r.get("generation") is not None
            ]
            all_wind_records.extend(wind_records)
            logger.info(f"    Retrieved {len(wind_records)} WIND records (from {len(records)} raw)")
        except Exception as e:
            logger.error(f"Failed fetching FUELHH chunk {params}: {e}")

        current_dt = chunk_end + datetime.timedelta(days=1)

    # Sort deterministically by startTime
    all_wind_records.sort(key=lambda x: x["startTime"])
    # Deduplicate by startTime if overlapping chunks
    unique_records = {}
    for r in all_wind_records:
        unique_records[r["startTime"]] = r
    result = list(unique_records.values())
    logger.info(f"Completed FUELHH (WIND): {len(result)} total unique settlement periods.")
    return result


def fetch_windfor_range(
    publish_from: str = "2025-12-31T00:00:00Z",
    publish_to: str = "2026-02-02T00:00:00Z"
) -> List[Dict[str, Any]]:
    """
    Fetch WINDFOR forecast records in 5-day chunks based on publishDateTime.
    Captures all forecasts published before or during January 2026.
    """
    start_dt = parser.isoparse(publish_from)
    end_dt = parser.isoparse(publish_to)
    
    all_forecast_records: List[Dict[str, Any]] = []
    current_dt = start_dt
    chunk_days = 5

    logger.info(f"Fetching WINDFOR forecasts published from {publish_from} to {publish_to}...")
    while current_dt < end_dt:
        chunk_end = min(current_dt + datetime.timedelta(days=chunk_days), end_dt)
        params = {
            "publishDateTimeFrom": current_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "publishDateTimeTo": chunk_end.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        logger.info(f"  WINDFOR chunk: {params['publishDateTimeFrom']} -> {params['publishDateTimeTo']}")
        try:
            records = _http_get_json(WINDFOR_STREAM_ENDPOINT, params)
            cleaned = [
                {
                    "startTime": r["startTime"],
                    "publishTime": r["publishTime"],
                    "generation": float(r.get("generation", 0)),
                }
                for r in records
                if r.get("startTime") and r.get("publishTime") and r.get("generation") is not None
            ]
            all_forecast_records.extend(cleaned)
            logger.info(f"    Retrieved {len(cleaned)} WINDFOR forecast revisions")
        except Exception as e:
            logger.error(f"Failed fetching WINDFOR chunk {params}: {e}")

        current_dt = chunk_end

    # Deduplicate by (startTime, publishTime)
    unique_dict = {}
    for r in all_forecast_records:
        key = (r["startTime"], r["publishTime"])
        unique_dict[key] = r
    result = list(unique_dict.values())
    result.sort(key=lambda x: (x["startTime"], x["publishTime"]))
    logger.info(f"Completed WINDFOR: {len(result)} total unique forecast revisions.")
    return result


def fetch_and_cache_jan2026(force: bool = False) -> Dict[str, Any]:
    """
    Fetch January 2026 datasets and persist to local cache.
    If cache already exists and force=False, returns loaded cache.
    """
    if not force and CACHE_FILE_PATH.exists():
        logger.info(f"Loading existing cache from {CACHE_FILE_PATH}...")
        try:
            with open(CACHE_FILE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to read cache file ({e}), refetching...")

    logger.info("Building January 2026 Wind Cache from live Elexon BMRS API...")
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Actuals: Delivery dates 2026-01-01 to 2026-02-01
    actuals = fetch_fuelhh_wind_range(start_date="2026-01-01", end_date="2026-02-01")

    # 2. Forecasts: Published between 2025-12-31 and 2026-02-02
    forecasts = fetch_windfor_range(
        publish_from="2025-12-31T00:00:00Z",
        publish_to="2026-02-02T00:00:00Z",
    )

    cache_data = {
        "metadata": {
            "dataset_scope": "January 2026 UK Wind Actuals & Day-Ahead Forecasts",
            "cached_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "fuelhh_actuals_count": len(actuals),
            "windfor_forecasts_count": len(forecasts),
            "date_range": {
                "decision_dates": "2026-01-01 to 2026-01-31",
                "delivery_dates": "2026-01-01 to 2026-02-01",
            },
        },
        "actuals": actuals,
        "forecasts": forecasts,
    }

    with open(CACHE_FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache_data, f, indent=2)

    logger.info(f"Successfully cached dataset to {CACHE_FILE_PATH} ({len(actuals)} actuals, {len(forecasts)} forecasts).")
    return cache_data


def get_cached_or_live_data() -> Dict[str, Any]:
    """Retrieve data from cache, or fetch and cache if missing."""
    return fetch_and_cache_jan2026(force=False)
