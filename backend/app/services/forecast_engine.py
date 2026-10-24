"""
forecast_engine.py
------------------
Time-series alignment and Day-Ahead forecast selection engine.
Implements:
1. UK Day-Ahead D-1 auction gate closure cutoff rule (default 11:00 UTC).
2. Latest / Intraday available forecast alignment.
3. 60-min WINDFOR to 30-min FUELHH settlement resolution alignment (step forward-fill & linear interpolation).
4. Error, shortfall (deficit), and lead-time calculations.
"""

import datetime
from typing import Any, Dict, List, Optional, Tuple
from dateutil import parser


def build_forecast_index(forecasts: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Index WINDFOR forecast records by their target startTime (hourly string).
    Each bucket contains records sorted chronologically by publishTime.
    """
    index: Dict[str, List[Dict[str, Any]]] = {}
    for f in forecasts:
        st = f["startTime"]
        index.setdefault(st, []).append(f)

    for st in index:
        index[st].sort(key=lambda r: r["publishTime"])
    return index


def _get_forecast_for_hour(
    revisions: List[Dict[str, Any]],
    cutoff_iso: str,
    before_delivery_iso: str,
) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """
    Given a list of forecast revisions for a specific hour:
    1. Returns Day-Ahead revision (latest publishTime <= cutoff_iso).
    2. Returns Latest revision (latest publishTime < before_delivery_iso).
    """
    da_candidates = [r for r in revisions if r["publishTime"] <= cutoff_iso]
    da_rev = da_candidates[-1] if da_candidates else None

    latest_candidates = [r for r in revisions if r["publishTime"] < before_delivery_iso]
    latest_rev = latest_candidates[-1] if latest_candidates else None

    # Fallback for DA if cutoff was earlier than first publish but still before delivery
    if da_rev is None and latest_candidates:
        da_rev = latest_candidates[0]

    return da_rev, latest_rev


def align_actuals_and_forecasts(
    actuals: List[Dict[str, Any]],
    forecasts: List[Dict[str, Any]],
    cutoff_hour_utc: int = 11,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    interpolation_mode: str = "step",  # "step" or "linear"
) -> List[Dict[str, Any]]:
    """
    Align 30-min FUELHH settlement records with corresponding Day-Ahead and Latest WINDFOR forecasts.
    
    - Target Delivery Day D corresponds to Decision Day D-1.
    - Auction cutoff occurs at D-1 {cutoff_hour_utc}:00:00Z.
    - WINDFOR is published on hourly boundaries (HH:00:00Z).
      * HH:00 is matched directly with the forecast for that hour.
      * HH:30 is matched via step (same as HH:00) or linear interpolation between HH:00 and (HH+1):00.
    """
    forecast_index = build_forecast_index(forecasts)
    aligned_series: List[Dict[str, Any]] = []

    start_filter_dt = datetime.date.fromisoformat(start_date) if start_date else None
    end_filter_dt = datetime.date.fromisoformat(end_date) if end_date else None

    for actual in actuals:
        st_str = actual["startTime"]
        actual_dt = parser.isoparse(st_str)
        delivery_date = actual_dt.date()

        # Date range filtering (by delivery date)
        if start_filter_dt and delivery_date < start_filter_dt:
            continue
        if end_filter_dt and delivery_date > end_filter_dt:
            continue

        actual_mw = float(actual["generation"])
        sp = actual.get("settlementPeriod", 0)

        # Day D-1 Decision cutoff
        decision_date = delivery_date - datetime.timedelta(days=1)
        cutoff_dt = datetime.datetime.combine(
            decision_date,
            datetime.time(cutoff_hour_utc, 0),
            tzinfo=datetime.timezone.utc,
        )
        cutoff_iso = cutoff_dt.isoformat().replace("+00:00", "Z")
        before_delivery_iso = actual_dt.isoformat().replace("+00:00", "Z")

        # Base hourly target startTime (rounded down to top of hour)
        base_hour_dt = actual_dt.replace(minute=0, second=0)
        base_hour_iso = base_hour_dt.isoformat().replace("+00:00", "Z")
        base_revisions = forecast_index.get(base_hour_iso, [])

        da_rev_base, latest_rev_base = _get_forecast_for_hour(
            base_revisions, cutoff_iso, before_delivery_iso
        )

        da_forecast_mw: Optional[float] = None
        da_publish_time: Optional[str] = None
        da_lead_time_hrs: Optional[float] = None

        latest_forecast_mw: Optional[float] = None
        latest_publish_time: Optional[str] = None

        # Check if this settlement period is on the half-hour (:30)
        is_half_hour = actual_dt.minute == 30

        if not is_half_hour or interpolation_mode == "step" or not da_rev_base:
            # Direct step assignment
            if da_rev_base:
                da_forecast_mw = float(da_rev_base["generation"])
                da_publish_time = da_rev_base["publishTime"]
                pub_dt = parser.isoparse(da_publish_time)
                da_lead_time_hrs = round((actual_dt - pub_dt).total_seconds() / 3600.0, 2)

            if latest_rev_base:
                latest_forecast_mw = float(latest_rev_base["generation"])
                latest_publish_time = latest_rev_base["publishTime"]
        else:
            # Linear interpolation for :30 between base hour and next hour
            next_hour_dt = base_hour_dt + datetime.timedelta(hours=1)
            next_hour_iso = next_hour_dt.isoformat().replace("+00:00", "Z")
            next_revisions = forecast_index.get(next_hour_iso, [])

            da_rev_next, latest_rev_next = _get_forecast_for_hour(
                next_revisions, cutoff_iso, before_delivery_iso
            )

            # Interpolate Day-Ahead
            if da_rev_base and da_rev_next:
                da_forecast_mw = round(
                    0.5 * (float(da_rev_base["generation"]) + float(da_rev_next["generation"])), 1
                )
                da_publish_time = da_rev_base["publishTime"]
                pub_dt = parser.isoparse(da_publish_time)
                da_lead_time_hrs = round((actual_dt - pub_dt).total_seconds() / 3600.0, 2)
            elif da_rev_base:
                da_forecast_mw = float(da_rev_base["generation"])
                da_publish_time = da_rev_base["publishTime"]
                pub_dt = parser.isoparse(da_publish_time)
                da_lead_time_hrs = round((actual_dt - pub_dt).total_seconds() / 3600.0, 2)

            # Interpolate Latest
            if latest_rev_base and latest_rev_next:
                latest_forecast_mw = round(
                    0.5 * (float(latest_rev_base["generation"]) + float(latest_rev_next["generation"])), 1
                )
                latest_publish_time = latest_rev_base["publishTime"]
            elif latest_rev_base:
                latest_forecast_mw = float(latest_rev_base["generation"])
                latest_publish_time = latest_rev_base["publishTime"]

        # If no forecast found, skip or flag
        if da_forecast_mw is None:
            continue

        if latest_forecast_mw is None:
            latest_forecast_mw = da_forecast_mw
            latest_publish_time = da_publish_time

        error_mw = round(da_forecast_mw - actual_mw, 1)
        abs_error_mw = round(abs(error_mw), 1)
        # Wind Shortfall (deficit): When forecast > actual, buyer procured too little backup thermal
        shortfall_mw = round(max(0.0, da_forecast_mw - actual_mw), 1)
        # Wind Surplus: When actual > forecast, wind spilled or excess generation
        surplus_mw = round(max(0.0, actual_mw - da_forecast_mw), 1)

        latest_error_mw = round(latest_forecast_mw - actual_mw, 1)
        latest_abs_error_mw = round(abs(latest_error_mw), 1)

        aligned_series.append({
            "startTime": st_str,
            "settlementDate": delivery_date.isoformat(),
            "settlementPeriod": sp,
            "actual_mw": round(actual_mw, 1),
            "day_ahead_forecast_mw": da_forecast_mw,
            "day_ahead_publish_time": da_publish_time,
            "day_ahead_lead_time_hours": da_lead_time_hrs,
            "latest_forecast_mw": latest_forecast_mw,
            "latest_publish_time": latest_publish_time,
            "error_mw": error_mw,
            "abs_error_mw": abs_error_mw,
            "shortfall_mw": shortfall_mw,
            "surplus_mw": surplus_mw,
            "latest_error_mw": latest_error_mw,
            "latest_abs_error_mw": latest_abs_error_mw,
        })

    return aligned_series
