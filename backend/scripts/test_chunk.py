import urllib.request
import urllib.parse
import json
import time

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"

def fetch_chunk(endpoint, params):
    t0 = time.time()
    qs = urllib.parse.urlencode(params)
    url = f"{BASE_URL}/{endpoint}?{qs}"
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "EnergyPilot/1.0"})
    with urllib.request.urlopen(req, timeout=40) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    dur = time.time() - t0
    print(f"Fetched {len(data)} items from {endpoint} in {dur:.2f}s")
    return data

print("Testing FUELHH 5 days...")
fuel_sample = fetch_chunk("datasets/FUELHH/stream", {"settlementDateFrom": "2026-01-01", "settlementDateTo": "2026-01-05"})
wind_only = [r for r in fuel_sample if r.get("fuelType") == "WIND"]
print(f"WIND records count: {len(wind_only)}")

print("Testing WINDFOR 5 days...")
wind_sample = fetch_chunk("datasets/WINDFOR/stream", {"publishDateTimeFrom": "2025-12-31T00:00:00Z", "publishDateTimeTo": "2026-01-05T23:59:59Z"})
print(f"WINDFOR records count: {len(wind_sample)}")
