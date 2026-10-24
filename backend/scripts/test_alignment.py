import json
import datetime
from dateutil import parser

# Load windfor sample from earlier
# Let's inspect alignment for 2026-01-02
with open("backend/scripts/test_chunk.py") as f:
    pass

import urllib.request, urllib.parse

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"

def fetch(endpoint, params):
    qs = urllib.parse.urlencode(params)
    url = f"{BASE_URL}/{endpoint}?{qs}"
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "EnergyPilot/1.0"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

print("Fetching sample for 2026-01-01 and 2026-01-02...")
fuels = fetch("datasets/FUELHH/stream", {"settlementDateFrom": "2026-01-01", "settlementDateTo": "2026-01-02"})
wind_actuals = {r["startTime"]: r["generation"] for r in fuels if r.get("fuelType") == "WIND"}

forecasts = fetch("datasets/WINDFOR/stream", {"publishDateTimeFrom": "2025-12-31T00:00:00Z", "publishDateTimeTo": "2026-01-02T23:59:59Z"})

# Group forecasts by target startTime
wf_by_st = {}
for r in forecasts:
    st = r["startTime"]
    wf_by_st.setdefault(st, []).append(r)

# For each target startTime, sort by publishTime
for st in wf_by_st:
    wf_by_st[st].sort(key=lambda x: x["publishTime"])

print(f"Total target startTimes in forecast sample: {len(wf_by_st)}")

# Let's test alignment for delivery on 2026-01-02
cutoff_hour = 11
matches = 0
for st_actual, actual_mw in sorted(wind_actuals.items()):
    actual_dt = parser.isoparse(st_actual)
    if actual_dt.date() != datetime.date(2026, 1, 2):
        continue
    
    # Day D is 2026-01-02. Decision Day D-1 is 2026-01-01.
    d_minus_1 = actual_dt.date() - datetime.timedelta(days=1)
    cutoff_dt = datetime.datetime.combine(d_minus_1, datetime.time(cutoff_hour, 0), tzinfo=datetime.timezone.utc)
    cutoff_iso = cutoff_dt.isoformat().replace("+00:00", "Z")
    
    # Find forecast hourly bucket (st_actual rounded down to hour)
    hourly_st = actual_dt.replace(minute=0, second=0).isoformat().replace("+00:00", "Z")
    
    candidates = wf_by_st.get(hourly_st, [])
    # DA forecast: publishTime <= cutoff_iso
    da_candidates = [c for c in candidates if c["publishTime"] <= cutoff_iso]
    da_forecast = da_candidates[-1] if da_candidates else None
    
    # Latest forecast: publishTime < st_actual
    latest_candidates = [c for c in candidates if c["publishTime"] < st_actual]
    latest_forecast = latest_candidates[-1] if latest_candidates else None
    
    if da_forecast:
        matches += 1
        if matches <= 3 or matches == 48:
            lead_time_hrs = (actual_dt - parser.isoparse(da_forecast["publishTime"])).total_seconds() / 3600.0
            print(f"Target: {st_actual} | Actual: {actual_mw} MW | DA Forecast: {da_forecast['generation']} MW (Pub: {da_forecast['publishTime']}, Lead: {lead_time_hrs:.1f}h) | Latest: {latest_forecast['generation'] if latest_forecast else 'N/A'} MW")

print(f"\n2026-01-02 aligned settlement periods with Day-Ahead forecast: {matches} / 48")
