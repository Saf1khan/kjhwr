import {
  HealthResponse,
  HorizonAccuracyResponse,
  SummaryResponse,
  TimeSeriesResponse,
} from '../types/api';

// In production on Vercel, requests use relative paths (''); in local development fallback to 'http://127.0.0.1:8000'
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

async function fetchJson<T>(url: string): Promise<T> {
  const fullUrl = `${API_BASE_URL}${url}`;
  const response = await fetch(fullUrl, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export async function getHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>('/api/health');
}

export async function getSummary(params: {
  start_date: string;
  end_date: string;
  cutoff_hour: number;
  interpolation: 'step' | 'linear';
}): Promise<SummaryResponse> {
  const qs = new URLSearchParams({
    start_date: params.start_date,
    end_date: params.end_date,
    cutoff_hour: params.cutoff_hour.toString(),
    interpolation: params.interpolation,
  });
  return fetchJson<SummaryResponse>(`/api/summary?${qs.toString()}`);
}

export async function getTimeseries(params: {
  start_date: string;
  end_date: string;
  cutoff_hour: number;
  interpolation: 'step' | 'linear';
}): Promise<TimeSeriesResponse> {
  const qs = new URLSearchParams({
    start_date: params.start_date,
    end_date: params.end_date,
    cutoff_hour: params.cutoff_hour.toString(),
    interpolation: params.interpolation,
  });
  return fetchJson<TimeSeriesResponse>(`/api/timeseries?${qs.toString()}`);
}

export async function getHorizonAccuracy(params: {
  cutoff_hour: number;
  start_date: string;
  end_date: string;
  interpolation: 'step' | 'linear';
}): Promise<HorizonAccuracyResponse> {
  const qs = new URLSearchParams({
    cutoff_hour: params.cutoff_hour.toString(),
    start_date: params.start_date,
    end_date: params.end_date,
    interpolation: params.interpolation,
  });
  return fetchJson<HorizonAccuracyResponse>(`/api/horizon-accuracy?${qs.toString()}`);
}
