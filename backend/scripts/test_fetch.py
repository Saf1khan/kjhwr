import urllib.request
import urllib.parse
import json

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"

def test_query(endpoint, params):
    qs = urllib.parse.urlencode(params)
    url = f"{BASE_URL}/{endpoint}?{qs}"
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "EnergyPilot/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"Endpoint: {endpoint} -> Status: {resp.status}, Total records: {len(data)}")
            if data:
                print(f"Sample: {data[0]}")
                print(f"Last record: {data[-1]}")
            return data
    except Exception as e:
        print(f"Error {endpoint}: {e}")
        return []

print("--- Testing FUELHH with settlementDate ---")
test_query("datasets/FUELHH/stream", {"settlementDateFrom": "2026-01-01", "settlementDateTo": "2026-01-02"})

print("\n--- Testing FUELHH with publishDateTime ---")
test_query("datasets/FUELHH/stream", {"publishDateTimeFrom": "2026-01-01T00:00:00Z", "publishDateTimeTo": "2026-01-02T00:00:00Z"})

print("\n--- Testing WINDFOR with publishDateTime ---")
windfor_data = test_query("datasets/WINDFOR/stream", {"publishDateTimeFrom": "2025-12-31T00:00:00Z", "publishDateTimeTo": "2026-01-01T12:00:00Z"})
if windfor_data:
    st_list = sorted(list({r.get("startTime") for r in windfor_data if "startTime" in r}))
    print(f"WINDFOR startTimes ({len(st_list)} total): {st_list[:3]} ... {st_list[-3:]}")
