import React from 'react';
import { KpiSummary } from '../types/api';

interface KpiBentoStripProps {
  kpi: KpiSummary | null;
  cutoffHour: number;
}

export const KpiBentoStrip: React.FC<KpiBentoStripProps> = ({ kpi }) => {
  if (!kpi) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[1px] bg-zinc-800/80 border border-zinc-800/80 rounded-md overflow-hidden animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-[#111113] p-5" />
        ))}
      </div>
    );
  }

  const netDeficitGwh = Number((kpi.total_forecast_gwh - kpi.total_actual_gwh).toFixed(1));

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-[1px] bg-zinc-800/80 border border-zinc-800/80 rounded-md overflow-hidden shadow-sm">
      {/* 1. Forecast Error (MAE) */}
      <div className="bg-[#111113] hover:bg-[#151518] p-5 transition-colors flex flex-col justify-between">
        <div>
          <div className="text-xs font-sans text-zinc-400 font-medium">
            Forecast Error (MAE)
          </div>
          <div className="mt-2 flex items-baseline">
            <span className="font-mono text-2xl lg:text-3xl font-semibold tracking-tight text-[#FAFAFA] tabular-nums">
              {kpi.mae_mw.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500 font-normal ml-1.5">MW</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-zinc-400 font-sans">
          {kpi.wape_percent.toFixed(1)}% WAPE · {kpi.latest_mae_mw.toLocaleString()} MW intraday
        </div>
      </div>

      {/* 2. Forecast Bias */}
      <div className="bg-[#111113] hover:bg-[#151518] p-5 transition-colors flex flex-col justify-between">
        <div>
          <div className="text-xs font-sans text-zinc-400 font-medium">
            Forecast Bias
          </div>
          <div className="mt-2 flex items-baseline">
            <span className="font-mono text-2xl lg:text-3xl font-semibold tracking-tight text-[#FAFAFA] tabular-nums">
              +{kpi.mbe_mw.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500 font-normal ml-1.5">MW</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-zinc-400 font-sans flex items-center">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block mr-1.5 flex-shrink-0" />
          <span>Consistent over-forecast</span>
        </div>
      </div>

      {/* 3. P95 Thermal Buffer */}
      <div className="bg-[#111113] hover:bg-[#151518] p-5 transition-colors flex flex-col justify-between">
        <div>
          <div className="text-xs font-sans text-zinc-400 font-medium">
            P95 Thermal Buffer
          </div>
          <div className="mt-2 flex items-baseline">
            <span className="font-mono text-2xl lg:text-3xl font-semibold tracking-tight text-[#FAFAFA] tabular-nums">
              {kpi.p95_shortfall_mw.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500 font-normal ml-1.5">MW</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-zinc-400 font-sans">
          P90: {kpi.p90_shortfall_mw.toLocaleString()} MW · Max miss: {kpi.max_shortfall_mw.toLocaleString()} MW
        </div>
      </div>

      {/* 4. Monthly Volume (Jan 2026) */}
      <div className="bg-[#111113] hover:bg-[#151518] p-5 transition-colors flex flex-col justify-between">
        <div>
          <div className="text-xs font-sans text-zinc-400 font-medium">
            Monthly Volume (Jan 2026)
          </div>
          <div className="mt-2 flex items-baseline">
            <span className="font-mono text-2xl lg:text-3xl font-semibold tracking-tight text-[#FAFAFA] tabular-nums">
              {kpi.total_actual_gwh.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500 font-normal ml-1.5">GWh</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-zinc-400 font-sans">
          Forecast: {kpi.total_forecast_gwh.toLocaleString()} GWh (-{netDeficitGwh.toLocaleString()} GWh gap)
        </div>
      </div>
    </div>
  );
};
