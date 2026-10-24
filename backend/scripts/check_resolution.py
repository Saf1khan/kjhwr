import urllib.request
import urllib.parse
import json

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"

def check_windfor():
    params = {"publishDateTimeFrom": "2026-01-01T00:00:00Z", "publishDateTimeTo": "2026-01-02T00:00:00Z"}
    qs = urllib.parse.urlencode(params)
    url = f"{BASE_URL}/datasets/WINDFOR/stream?{qs}"
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "EnergyPilot/1.0"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    
    start_times = [r["startTime"] for r in data if "startTime" in r]
    minutes = {st.split("T")[1].split(":")[1] for st in start_times}
    print("WINDFOR start minute values:", minutes)
    print("Sample WINDFOR start times:", sorted(list(set(start_times)))[:10])

check_windfor()
