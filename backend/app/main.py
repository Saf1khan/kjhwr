"""
main.py
-------
FastAPI REST API server for the UK Day-Ahead Wind Forecast Evaluation Platform.
Provides endpoints for summary KPIs, time-series alignment, histogram distributions,
and horizon degradation analysis.
"""

from contextlib import asynccontextmanager
import logging
from typing import Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import (
    DEFAULT_CUTOFF_HOUR_UTC,
    DEFAULT_END_DATE,
    DEFAULT_START_DATE,
    CACHE_FILE_PATH,
)
from app.services.elexon_client import (
    fetch_and_cache_jan2026,
    get_cached_or_live_data,
)
from app.services.forecast_engine import align_actuals_and_forecasts
from app.services.metrics_engine import (
    compute_daily_breakdown,
    compute_error_histogram,
    compute_horizon_degradation,
    compute_kpi_summary,
    compute_settlement_period_diurnal,
)

logger = logging.getLogger("api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

# Global in-memory cache
_APP_DATA = {"cache": None}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load cache if available on disk; do not block startup if fetch needed
    logger.info("Initializing UK Wind Power Evaluation API...")
    if CACHE_FILE_PATH.exists():
        try:
            _APP_DATA["cache"] = get_cached_or_live_data()
            logger.info("Loaded pre-warmed January 2026 cache successfully.")
        except Exception as e:
            logger.warning(f"Could not load cache at startup: {e}")
    else:
        logger.info("Cache file not yet created. Can be populated via pre-fetch script or API call.")
    yield
    logger.info("Shutting down API server.")


app = FastAPI(
    title="UK Day-Ahead Wind Forecast Evaluation API",
    description="Quantitative evaluation of National Grid ESO Day-Ahead wind generation forecasts for wholesale market procurement.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local Vite dev server and production deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_data():
    if _APP_DATA["cache"] is None:
        _APP_DATA["cache"] = get_cached_or_live_data()
    return _APP_DATA["cache"]


@app.get("/api/health", tags=["System"])
def get_health():
    """Health check and cache status."""
    data = _get_data()
    cache_ready = CACHE_FILE_PATH.exists()
    cached_records = {
        "actuals": len(data.get("actuals", [])),
        "forecasts": len(data.get("forecasts", [])),
    }
    metadata = data.get("metadata", {})
    return {
        "status": "healthy",
        "cache_exists": cache_ready,
        "cache_in_memory": True,
        "cached_records": cached_records,
        "metadata": metadata,
    }


@app.post("/api/cache/refresh", tags=["System"])
def refresh_cache(force: bool = True):
    """Force refresh of January 2026 dataset from Elexon BMRS API."""
    try:
        data = fetch_and_cache_jan2026(force=force)
        _APP_DATA["cache"] = data
        return {
            "status": "success",
            "message": "January 2026 dataset successfully updated and cached.",
            "actuals_count": len(data.get("actuals", [])),
            "forecasts_count": len(data.get("forecasts", [])),
        }
    except Exception as e:
        logger.error(f"Failed to refresh cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/summary", tags=["Analytics"])
def get_summary(
    start_date: str = Query(DEFAULT_START_DATE, description="Delivery start date YYYY-MM-DD"),
    end_date: str = Query(DEFAULT_END_DATE, description="Delivery end date YYYY-MM-DD"),
    cutoff_hour: int = Query(DEFAULT_CUTOFF_HOUR_UTC, ge=0, le=23, description="Decision cutoff hour UTC on D-1"),
    interpolation: str = Query("step", pattern="^(step|linear)$", description="Resolution alignment mode"),
):
    """
    Returns high-level KPI metrics (MAE, RMSE, MBE, WAPE, P90/P95 Shortfall risk),
    error distribution histogram bins, and daily aggregated breakdowns.
    """
    data = _get_data()
    actuals = data.get("actuals", [])
    forecasts = data.get("forecasts", [])

    aligned = align_actuals_and_forecasts(
        actuals=actuals,
        forecasts=forecasts,
        cutoff_hour_utc=cutoff_hour,
        start_date=start_date,
        end_date=end_date,
        interpolation_mode=interpolation,
    )

    kpis = compute_kpi_summary(aligned)
    histogram = compute_error_histogram(aligned, num_bins=15)
    daily = compute_daily_breakdown(aligned)

    return {
        "query": {
            "start_date": start_date,
            "end_date": end_date,
            "cutoff_hour": cutoff_hour,
            "interpolation": interpolation,
            "alignment_rule": f"Latest WINDFOR publishTime <= D-1 at {cutoff_hour:02d}:00 UTC",
        },
        "kpi": kpis,
        "histogram": histogram,
        "daily": daily,
    }


@app.get("/api/timeseries", tags=["Time Series"])
def get_timeseries(
    start_date: str = Query("2026-01-02", description="Delivery start date YYYY-MM-DD"),
    end_date: str = Query("2026-01-08", description="Delivery end date YYYY-MM-DD"),
    cutoff_hour: int = Query(DEFAULT_CUTOFF_HOUR_UTC, ge=0, le=23, description="Decision cutoff hour UTC on D-1"),
    interpolation: str = Query("step", pattern="^(step|linear)$", description="Resolution alignment mode"),
):
    """
    Returns aligned 30-min settlement intervals with actuals, Day-Ahead forecasts,
    Latest forecasts, error residuals, wind shortfalls, and recommended thermal buffer.
    """
    data = _get_data()
    actuals = data.get("actuals", [])
    forecasts = data.get("forecasts", [])

    aligned = align_actuals_and_forecasts(
        actuals=actuals,
        forecasts=forecasts,
        cutoff_hour_utc=cutoff_hour,
        start_date=start_date,
        end_date=end_date,
        interpolation_mode=interpolation,
    )

    kpis = compute_kpi_summary(aligned)

    return {
        "query": {
            "start_date": start_date,
            "end_date": end_date,
            "cutoff_hour": cutoff_hour,
            "interpolation": interpolation,
            "count": len(aligned),
        },
        "recommended_thermal_buffer_mw": kpis["recommended_thermal_buffer_mw"],
        "p95_shortfall_mw": kpis["p95_shortfall_mw"],
        "timeseries": aligned,
    }


@app.get("/api/horizon-accuracy", tags=["Analytics"])
def get_horizon_accuracy(
    cutoff_hour: int = Query(DEFAULT_CUTOFF_HOUR_UTC, ge=0, le=23, description="Decision cutoff hour UTC on D-1"),
    start_date: str = Query(DEFAULT_START_DATE, description="Delivery start date YYYY-MM-DD"),
    end_date: str = Query(DEFAULT_END_DATE, description="Delivery end date YYYY-MM-DD"),
    interpolation: str = Query("step", pattern="^(step|linear)$", description="Resolution alignment mode"),
):
    """
    Returns forecast error degradation by lead time (horizon) and
    diurnal / settlement-period profile across the day.
    """
    data = _get_data()
    actuals = data.get("actuals", [])
    forecasts = data.get("forecasts", [])

    aligned = align_actuals_and_forecasts(
        actuals=actuals,
        forecasts=forecasts,
        cutoff_hour_utc=cutoff_hour,
        start_date=start_date,
        end_date=end_date,
        interpolation_mode=interpolation,
    )

    horizon_degradation = compute_horizon_degradation(aligned)
    diurnal = compute_settlement_period_diurnal(aligned)

    return {
        "query": {
            "start_date": start_date,
            "end_date": end_date,
            "cutoff_hour": cutoff_hour,
            "sample_count": len(aligned),
        },
        "horizon_degradation": horizon_degradation,
        "diurnal_profile": diurnal,
    }
