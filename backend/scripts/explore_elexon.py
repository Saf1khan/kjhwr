#!/usr/bin/env python3
"""
explore_elexon.py
-----------------
Lightweight exploration script to test the Elexon BMRS API endpoints:
1. Actual generation: /datasets/FUELHH/stream (filtered for fuelType == "WIND")
2. Forecast generation: /datasets/WINDFOR/stream

Fetches a 2-day sample from January 2026 (2026-01-01 to 2026-01-03),
detects whether response is NDJSON or JSON array, and prints:
- HTTP Status & headers
- Total records received
- Sample record schema and types
- Timestamp formats (startTime, publishTime)
- Generation value ranges (MW)
"""

import json
import sys
import urllib.parse
import urllib.request
from typing import Any, Dict, List

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"

def fetch_elexon_stream(endpoint: str, params: Dict[str, str]) -> List[Dict[str, Any]]:
    query_str = urllib.parse.urlencode(params)
    url = f"{BASE_URL}/{endpoint}?{query_str}"
    print(f"\n[GET] Requesting: {url}")

    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json, application/x-ndjson, text/plain, */*",
            "User-Agent": "EnergyPilot-DataExplorer/1.0",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            content_type = resp.headers.get("Content-Type", "")
            status_code = resp.status
            print(f"Status Code: {status_code} | Content-Type: {content_type}")
            raw_data = resp.read().decode("utf-8")
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return []

    if not raw_data.strip():
        print("Warning: Received empty response.")
        return []

    # Attempt parsing as standard JSON
    try:
        parsed = json.loads(raw_data)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict) and "data" in parsed:
            return parsed["data"]
        return [parsed]
    except json.JSONDecodeError:
        # Fall back to Newline-Delimited JSON (NDJSON)
        records = []
        for line in raw_data.strip().split("\n"):
            line = line.strip()
            if line:
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        return records


def explore_fuelhh_wind():
    print("=" * 70)
    print("1. EXPLORING FUELHH (Actual Generation - WIND)")
    print("=" * 70)

    # 2-day sample in Jan 2026
    params = {
        "publishDateTimeFrom": "2026-01-01T00:00:00Z",
        "publishDateTimeTo": "2026-01-03T00:00:00Z",
    }
    records = fetch_elexon_stream("datasets/FUELHH/stream", params)
    print(f"Total raw FUELHH records fetched: {len(records)}")

    if not records:
        print("No records retrieved for FUELHH.")
        return

    # Filter for fuelType == 'WIND'
    wind_records = [r for r in records if str(r.get("fuelType", "")).upper() == "WIND"]
    print(f"Total WIND records: {len(wind_records)}")

    # Distinct fuel types present
    fuel_types = sorted(list({r.get("fuelType") for r in records if "fuelType" in r}))
    print(f"Fuel types in raw sample: {fuel_types[:10]}...")

    if wind_records:
        sample = wind_records[0]
        print("\nSample FUELHH (WIND) record:")
        print(json.dumps(sample, indent=2))

        print("\nKey Field Verification:")
        print(f" - 'startTime': {sample.get('startTime')} (type: {type(sample.get('startTime')).__name__})")
        print(f" - 'fuelType': {sample.get('fuelType')}")
        print(f" - 'generation': {sample.get('generation')} MW (type: {type(sample.get('generation')).__name__})")
        if "settlementDate" in sample:
            print(f" - 'settlementDate': {sample.get('settlementDate')}")
        if "settlementPeriod" in sample:
            print(f" - 'settlementPeriod': {sample.get('settlementPeriod')}")
        
        # Generation stats in sample
        generations = [r["generation"] for r in wind_records if "generation" in r and r["generation"] is not None]
        if generations:
            print(f" - Generation range: min={min(generations)} MW, max={max(generations)} MW, count={len(generations)}")


def explore_windfor():
    print("\n" + "=" * 70)
    print("2. EXPLORING WINDFOR (Forecast Generation)")
    print("=" * 70)

    # 2-day sample in Jan 2026
    params = {
        "publishDateTimeFrom": "2026-01-01T00:00:00Z",
        "publishDateTimeTo": "2026-01-03T00:00:00Z",
    }
    records = fetch_elexon_stream("datasets/WINDFOR/stream", params)
    print(f"Total WINDFOR records fetched: {len(records)}")

    if not records:
        print("No records retrieved for WINDFOR.")
        return

    sample = records[0]
    print("\nSample WINDFOR record:")
    print(json.dumps(sample, indent=2))

    print("\nKey Field Verification:")
    print(f" - 'startTime': {sample.get('startTime')} (type: {type(sample.get('startTime')).__name__})")
    print(f" - 'publishTime': {sample.get('publishTime')} (type: {type(sample.get('publishTime')).__name__})")
    print(f" - 'generation': {sample.get('generation')} MW (type: {type(sample.get('generation')).__name__})")

    # Check for multiple publishTimes for the same startTime
    start_times: Dict[str, List[str]] = {}
    for r in records:
        st = r.get("startTime")
        pt = r.get("publishTime")
        if st and pt:
            start_times.setdefault(st, []).append(pt)

    multi_publish = {k: v for k, v in start_times.items() if len(v) > 1}
    print(f"\nUnique target startTimes in sample: {len(start_times)}")
    print(f"StartTimes with multiple published revisions in sample: {len(multi_publish)}")
    if multi_publish:
        first_multi_st = next(iter(multi_publish))
        print(f"Example target startTime '{first_multi_st}' has {len(multi_publish[first_multi_st])} published forecasts:")
        for pt in multi_publish[first_multi_st][:5]:
            print(f"   -> publishTime: {pt}")


if __name__ == "__main__":
    print("Connecting to Elexon BMRS API for January 2026 sample exploration...")
    explore_fuelhh_wind()
    explore_windfor()
    print("\nExploration completed successfully.")
