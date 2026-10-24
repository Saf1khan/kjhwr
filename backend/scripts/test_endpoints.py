"""
test_endpoints.py
-----------------
Comprehensive test of all FastAPI endpoints using TestClient.
Tests:
- GET /api/health
- GET /api/summary (default, custom date range, custom cutoff_hour)
- GET /api/timeseries (date slice, step vs linear interpolation)
- GET /api/horizon-accuracy (lead-time buckets and diurnal profile)
Prints real January 2026 quantitative evaluation metrics.
"""

import sys
import json
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from starlette.testclient import TestClient
from app.main import app

def run_tests():
    client = TestClient(app)

    print("=" * 70)
    print("1. TESTING /api/health")
    print("=" * 70)
    resp = client.get("/api/health")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    health = resp.json()
    print("Health response:", json.dumps(health, indent=2))
    assert health["status"] == "healthy"
    assert health["cache_exists"] is True

    print("\n" + "=" * 70)
    print("2. TESTING /api/summary (Full Month January 2026, Cutoff=11 UTC)")
    print("=" * 70)
    resp = client.get("/api/summary?start_date=2026-01-01&end_date=2026-01-31&cutoff_hour=11")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    summary = resp.json()
    kpi = summary["kpi"]
    print("REAL JANUARY 2026 QUANTITATIVE METRICS (Day-Ahead 11:00 UTC Gate Closure):")
    print(f" - Evaluated Settlement Periods (N)    : {kpi['sample_count']}")
    print(f" - Mean Absolute Error (MAE)           : {kpi['mae_mw']:.1f} MW")
    print(f" - Root Mean Square Error (RMSE)       : {kpi['rmse_mw']:.1f} MW")
    print(f" - Mean Bias Error (MBE / Bias)        : {kpi['mbe_mw']:+.1f} MW ({'Over-forecast bias' if kpi['mbe_mw'] > 0 else 'Under-forecast bias'})")
    print(f" - Capacity Normalized Error (WAPE)    : {kpi['wape_percent']:.2f}%")
    print(f" - P90 Downside Shortfall Risk         : {kpi['p90_shortfall_mw']:.1f} MW")
    print(f" - P95 Downside Shortfall Risk         : {kpi['p95_shortfall_mw']:.1f} MW (Recommended Thermal Buffer)")
    print(f" - Max Single-Period Wind Shortfall    : {kpi['max_shortfall_mw']:.1f} MW")
    print(f" - Latest/Intraday Forecast MAE        : {kpi['latest_mae_mw']:.1f} MW")
    print(f" - Forecast Accuracy Improvement       : {kpi['forecast_improvement_mw']:.1f} MW (Day-Ahead vs Intraday)")
    print(f" - Total Actual Wind Generation        : {kpi['total_actual_gwh']:.1f} GWh")
    print(f" - Total Day-Ahead Forecasted Wind     : {kpi['total_forecast_gwh']:.1f} GWh")

    print(f"\nHistogram Bins ({len(summary['histogram'])} bins):")
    for b in summary["histogram"][:5]:
        print(f"   [{b['label']}]: {b['count']} periods ({b['percentage']}%)")
    print("   ...")

    print(f"\nDaily Breakdown Sample (Total {len(summary['daily'])} days):")
    for d in summary["daily"][:3]:
        print(f"   Date: {d['date']} | MAE: {d['mae_mw']} MW | Bias: {d['bias_mw']} MW | WAPE: {d['wape_percent']}% | P95 Shortfall: {d['p95_shortfall_mw']} MW")

    print("\n" + "=" * 70)
    print("3. TESTING /api/timeseries (Week 1: Jan 02 to Jan 08)")
    print("=" * 70)
    resp = client.get("/api/timeseries?start_date=2026-01-02&end_date=2026-01-08&cutoff_hour=11&interpolation=step")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    ts_data = resp.json()
    ts_series = ts_data["timeseries"]
    print(f"Total time-series points returned: {len(ts_series)}")
    assert len(ts_series) == 7 * 48  # 7 days * 48 half-hours = 336
    sample_pt = ts_series[0]
    print("Sample time-series point:")
    print(json.dumps(sample_pt, indent=2))

    # Test linear interpolation mode
    resp_lin = client.get("/api/timeseries?start_date=2026-01-02&end_date=2026-01-03&cutoff_hour=11&interpolation=linear")
    assert resp_lin.status_code == 200
    print(f"Linear interpolation mode tested successfully ({len(resp_lin.json()['timeseries'])} points).")

    print("\n" + "=" * 70)
    print("4. TESTING /api/horizon-accuracy")
    print("=" * 70)
    resp = client.get("/api/horizon-accuracy?cutoff_hour=11")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    horizon_data = resp.json()
    print("Horizon Degradation Curve:")
    for h in horizon_data["horizon_degradation"]:
        print(f"   [{h['horizon_bucket']} | Avg Lead: {h['avg_lead_time_hours']}h]: Count={h['count']}, MAE={h['mae_mw']:.1f} MW, WAPE={h['wape_percent']:.2f}%, P95={h['p95_shortfall_mw']:.1f} MW")

    diurnal = horizon_data["diurnal_profile"]
    print(f"\nDiurnal Profile Sample ({len(diurnal)} settlement periods):")
    for dp in diurnal[:4]:
        print(f"   SP {dp['settlementPeriod']} ({dp['time_of_day']}): Avg Actual={dp['avg_actual_mw']} MW, Avg Forecast={dp['avg_forecast_mw']} MW, MAE={dp['mae_mw']} MW")

    print("\n" + "=" * 70)
    print("ALL API ENDPOINTS VALIDATED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
