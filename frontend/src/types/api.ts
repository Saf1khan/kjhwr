export interface KpiSummary {
  sample_count: number;
  mae_mw: number;
  rmse_mw: number;
  mbe_mw: number;
  wape_percent: number;
  mape_percent: number;
  latest_mae_mw: number;
  latest_rmse_mw: number;
  latest_mbe_mw: number;
  forecast_improvement_mw: number;
  p90_shortfall_mw: number;
  p95_shortfall_mw: number;
  recommended_thermal_buffer_mw: number;
  max_shortfall_mw: number;
  max_surplus_mw: number;
  total_actual_gwh: number;
  total_forecast_gwh: number;
}

export interface HistogramBucket {
  bin_index: number;
  min_mw: number;
  max_mw: number;
  center_mw: number;
  label: string;
  count: number;
  percentage: number;
}

export interface DailyBreakdownItem {
  date: string;
  periods: number;
  avg_actual_mw: number;
  avg_forecast_mw: number;
  mae_mw: number;
  rmse_mw: number;
  bias_mw: number;
  wape_percent: number;
  p95_shortfall_mw: number;
  max_shortfall_mw: number;
}

export interface SummaryResponse {
  query: {
    start_date: string;
    end_date: string;
    cutoff_hour: number;
    interpolation: string;
    alignment_rule: string;
  };
  kpi: KpiSummary;
  histogram: HistogramBucket[];
  daily: DailyBreakdownItem[];
}

export interface TimeSeriesPoint {
  startTime: string;
  settlementDate: string;
  settlementPeriod: number;
  actual_mw: number;
  day_ahead_forecast_mw: number;
  day_ahead_publish_time: string;
  day_ahead_lead_time_hours: number;
  latest_forecast_mw: number;
  latest_publish_time: string;
  error_mw: number;
  abs_error_mw: number;
  shortfall_mw: number;
  surplus_mw: number;
  latest_error_mw: number;
  latest_abs_error_mw: number;
}

export interface TimeSeriesResponse {
  query: {
    start_date: string;
    end_date: string;
    cutoff_hour: number;
    interpolation: string;
    count: number;
  };
  recommended_thermal_buffer_mw: number;
  p95_shortfall_mw: number;
  timeseries: TimeSeriesPoint[];
}

export interface HorizonDegradationBucket {
  horizon_bucket: string;
  count: number;
  avg_lead_time_hours: number;
  mae_mw: number;
  rmse_mw: number;
  bias_mw: number;
  wape_percent: number;
  p95_shortfall_mw: number;
}

export interface DiurnalProfileItem {
  settlementPeriod: number;
  time_of_day: string;
  sample_count: number;
  avg_actual_mw: number;
  avg_forecast_mw: number;
  mae_mw: number;
  bias_mw: number;
  p95_shortfall_mw: number;
}

export interface HorizonAccuracyResponse {
  query: {
    start_date: string;
    end_date: string;
    cutoff_hour: number;
    sample_count: number;
  };
  horizon_degradation: HorizonDegradationBucket[];
  diurnal_profile: DiurnalProfileItem[];
}

export interface HealthResponse {
  status: string;
  cache_exists: boolean;
  cache_in_memory: boolean;
  cached_records: {
    actuals: number;
    forecasts: number;
  };
  metadata: Record<string, any>;
}
