"""
metrics_engine.py
-----------------
Quantitative error evaluation, statistical risk quantification,
and horizon degradation engine for UK Day-Ahead wind power trading.
"""

import math
from typing import Any, Dict, List, Tuple


def _percentile(values: List[float], p: float) -> float:
    """Calculate the p-th percentile (0 <= p <= 100) using linear interpolation."""
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    k = (len(sorted_vals) - 1) * (p / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return float(sorted_vals[int(k)])
    d0 = sorted_vals[int(f)] * (c - k)
    d1 = sorted_vals[int(c)] * (k - f)
    return round(float(d0 + d1), 1)


def compute_kpi_summary(aligned_series: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compute overall KPI metrics across the given aligned time series."""
    n = len(aligned_series)
    if n == 0:
        return {
            "sample_count": 0,
            "mae_mw": 0.0,
            "rmse_mw": 0.0,
            "mbe_mw": 0.0,
            "wape_percent": 0.0,
            "mape_percent": 0.0,
            "latest_mae_mw": 0.0,
            "latest_rmse_mw": 0.0,
            "latest_mbe_mw": 0.0,
            "p90_shortfall_mw": 0.0,
            "p95_shortfall_mw": 0.0,
            "recommended_thermal_buffer_mw": 0.0,
            "max_shortfall_mw": 0.0,
            "max_surplus_mw": 0.0,
            "total_actual_gwh": 0.0,
            "total_forecast_gwh": 0.0,
            "forecast_improvement_mw": 0.0,
        }

    errors = [row["error_mw"] for row in aligned_series]
    abs_errors = [row["abs_error_mw"] for row in aligned_series]
    shortfalls = [row["shortfall_mw"] for row in aligned_series]
    surpluses = [row["surplus_mw"] for row in aligned_series]
    actuals = [row["actual_mw"] for row in aligned_series]
    forecasts = [row["day_ahead_forecast_mw"] for row in aligned_series]

    latest_errors = [row.get("latest_error_mw", 0.0) for row in aligned_series]
    latest_abs_errors = [row.get("latest_abs_error_mw", 0.0) for row in aligned_series]

    # Metrics
    mae = sum(abs_errors) / n
    rmse = math.sqrt(sum(e * e for e in errors) / n)
    mbe = sum(errors) / n  # positive = over-forecast, negative = under-forecast

    sum_actual = sum(actuals)
    wape = (sum(abs_errors) / sum_actual * 100.0) if sum_actual > 0 else 0.0

    # Guarded MAPE
    mape_terms = [
        (abs(row["error_mw"]) / row["actual_mw"] * 100.0)
        for row in aligned_series
        if row["actual_mw"] > 50  # Filter out trivial denominators < 50 MW
    ]
    mape = (sum(mape_terms) / len(mape_terms)) if mape_terms else 0.0

    # Latest forecast metrics
    latest_mae = sum(latest_abs_errors) / n
    latest_rmse = math.sqrt(sum(e * e for e in latest_errors) / n)
    latest_mbe = sum(latest_errors) / n

    # Percentiles for Downside Shortfall (when forecast > actual, thermal backup needed)
    p90_shortfall = _percentile(shortfalls, 90.0)
    p95_shortfall = _percentile(shortfalls, 95.0)

    # Total energy in GWh (30 min = 0.5 hour)
    total_actual_gwh = sum(actuals) * 0.5 / 1000.0
    total_forecast_gwh = sum(forecasts) * 0.5 / 1000.0

    improvement = round(mae - latest_mae, 1)

    return {
        "sample_count": n,
        "mae_mw": round(mae, 1),
        "rmse_mw": round(rmse, 1),
        "mbe_mw": round(mbe, 1),
        "wape_percent": round(wape, 2),
        "mape_percent": round(mape, 2),
        "latest_mae_mw": round(latest_mae, 1),
        "latest_rmse_mw": round(latest_rmse, 1),
        "latest_mbe_mw": round(latest_mbe, 1),
        "forecast_improvement_mw": improvement,
        "p90_shortfall_mw": p90_shortfall,
        "p95_shortfall_mw": p95_shortfall,
        "recommended_thermal_buffer_mw": p95_shortfall,
        "max_shortfall_mw": round(max(shortfalls) if shortfalls else 0.0, 1),
        "max_surplus_mw": round(max(surpluses) if surpluses else 0.0, 1),
        "total_actual_gwh": round(total_actual_gwh, 1),
        "total_forecast_gwh": round(total_forecast_gwh, 1),
    }


def compute_error_histogram(
    aligned_series: List[Dict[str, Any]], num_bins: int = 15
) -> List[Dict[str, Any]]:
    """Build histogram buckets for the forecast error (forecast - actual) distribution."""
    if not aligned_series:
        return []

    errors = [row["error_mw"] for row in aligned_series]
    min_err = min(errors)
    max_err = max(errors)

    # Pad boundaries slightly to include edge points
    span = max_err - min_err
    if span <= 0:
        span = 1.0
    bin_width = span / num_bins

    buckets = []
    for i in range(num_bins):
        low = min_err + i * bin_width
        high = low + bin_width
        center = (low + high) / 2.0
        # Include right boundary in last bin
        count = sum(
            1 for e in errors
            if (low <= e < high) or (i == num_bins - 1 and low <= e <= high)
        )
        pct = round(count / len(errors) * 100.0, 1)
        buckets.append({
            "bin_index": i,
            "min_mw": round(low, 0),
            "max_mw": round(high, 0),
            "center_mw": round(center, 0),
            "label": f"{int(round(low))} to {int(round(high))} MW",
            "count": count,
            "percentage": pct,
        })

    return buckets


def compute_daily_breakdown(aligned_series: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Compute day-by-day aggregated metrics across delivery dates."""
    by_date: Dict[str, List[Dict[str, Any]]] = {}
    for row in aligned_series:
        d = row["settlementDate"]
        by_date.setdefault(d, []).append(row)

    daily_list = []
    for d in sorted(by_date.keys()):
        rows = by_date[d]
        n = len(rows)
        errors = [r["error_mw"] for r in rows]
        abs_errors = [r["abs_error_mw"] for r in rows]
        shortfalls = [r["shortfall_mw"] for r in rows]
        actuals = [r["actual_mw"] for r in rows]
        forecasts = [r["day_ahead_forecast_mw"] for r in rows]

        mae = sum(abs_errors) / n
        rmse = math.sqrt(sum(e * e for e in errors) / n)
        bias = sum(errors) / n
        sum_act = sum(actuals)
        wape = (sum(abs_errors) / sum_act * 100.0) if sum_act > 0 else 0.0
        p95 = _percentile(shortfalls, 95.0)

        daily_list.append({
            "date": d,
            "periods": n,
            "avg_actual_mw": round(sum(actuals) / n, 1),
            "avg_forecast_mw": round(sum(forecasts) / n, 1),
            "mae_mw": round(mae, 1),
            "rmse_mw": round(rmse, 1),
            "bias_mw": round(bias, 1),
            "wape_percent": round(wape, 2),
            "p95_shortfall_mw": p95,
            "max_shortfall_mw": round(max(shortfalls) if shortfalls else 0.0, 1),
        })

    return daily_list


def compute_horizon_degradation(aligned_series: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Bucket forecast errors by lead time (hours between publishTime and delivery startTime).
    Demonstrates error degradation as forecast horizon increases.
    """
    bins = [
        {"name": "00-14h (Near Term)", "min": 0.0, "max": 14.0},
        {"name": "14-18h (Evening Prior)", "min": 14.0, "max": 18.0},
        {"name": "18-24h (Auction Close)", "min": 18.0, "max": 24.0},
        {"name": "24-30h (Day-Ahead Early)", "min": 24.0, "max": 30.0},
        {"name": "30-36h (Day-Ahead Night)", "min": 30.0, "max": 36.0},
        {"name": ">36h (Extended Horizon)", "min": 36.0, "max": 999.0},
    ]

    results = []
    for b in bins:
        rows = [
            r for r in aligned_series
            if r.get("day_ahead_lead_time_hours") is not None
            and b["min"] <= r["day_ahead_lead_time_hours"] < b["max"]
        ]
        n = len(rows)
        if n == 0:
            continue

        errors = [r["error_mw"] for r in rows]
        abs_errors = [r["abs_error_mw"] for r in rows]
        shortfalls = [r["shortfall_mw"] for r in rows]
        actuals = [r["actual_mw"] for r in rows]

        mae = sum(abs_errors) / n
        rmse = math.sqrt(sum(e * e for e in errors) / n)
        bias = sum(errors) / n
        sum_act = sum(actuals)
        wape = (sum(abs_errors) / sum_act * 100.0) if sum_act > 0 else 0.0
        p95 = _percentile(shortfalls, 95.0)

        results.append({
            "horizon_bucket": b["name"],
            "count": n,
            "avg_lead_time_hours": round(sum(r["day_ahead_lead_time_hours"] for r in rows) / n, 1),
            "mae_mw": round(mae, 1),
            "rmse_mw": round(rmse, 1),
            "bias_mw": round(bias, 1),
            "wape_percent": round(wape, 2),
            "p95_shortfall_mw": p95,
        })

    return results


def compute_settlement_period_diurnal(aligned_series: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Diurnal profile: Group errors across all days by settlement period 1 to 48.
    Helps traders pinpoint specific hours of the day with peak error or risk.
    """
    by_sp: Dict[int, List[Dict[str, Any]]] = {}
    for r in aligned_series:
        sp = r.get("settlementPeriod", 1)
        by_sp.setdefault(sp, []).append(r)

    diurnal = []
    for sp in sorted(by_sp.keys()):
        rows = by_sp[sp]
        n = len(rows)
        actuals = [r["actual_mw"] for r in rows]
        forecasts = [r["day_ahead_forecast_mw"] for r in rows]
        abs_errors = [r["abs_error_mw"] for r in rows]
        errors = [r["error_mw"] for r in rows]
        shortfalls = [r["shortfall_mw"] for r in rows]

        # Calculate time string (e.g. SP 1 is 00:00 - 00:30)
        start_min_total = (sp - 1) * 30
        h_start = start_min_total // 60
        m_start = start_min_total % 60
        time_str = f"{h_start:02d}:{m_start:02d}"

        diurnal.append({
            "settlementPeriod": sp,
            "time_of_day": time_str,
            "sample_count": n,
            "avg_actual_mw": round(sum(actuals) / n, 1),
            "avg_forecast_mw": round(sum(forecasts) / n, 1),
            "mae_mw": round(sum(abs_errors) / n, 1),
            "bias_mw": round(sum(errors) / n, 1),
            "p95_shortfall_mw": _percentile(shortfalls, 95.0),
        })

    return diurnal
