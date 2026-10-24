import React from 'react';
import { KpiSummary } from '../types/api';

interface KpiBentoStripProps {
  kpi: KpiSummary | null;
  cutoffHour: number;
}

export const KpiBentoStrip: React.FC<KpiBentoStripProps> = ({ kpi }) => {
  if (!kpi) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-[1px] bg-zinc-800/80 border border-zinc-800/80 rounded-md overflow-hidden animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-28 bg-[#111113] p-4" />
        ))}
      </div>
    );
  }

  const netDeficitGwh = Number((kpi.total_forecast_gwh - kpi.total_actual_gwh).toFixed(1));

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-[1px] bg-zinc-800/80 border border-zinc-800/80 rounded-md overflow-hidden shadow-sm">
      {/* 1. Day-Ahead MAE */}
      <div className="bg-[#111113] hover:bg-[#151518] p-4 transition-colors flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-mono tracking-wider text-zinc-500 uppercase font-medium">
            DAY-AHEAD MAE
          </div>
          <div className="mt-1 flex items-baseline">
            <span className="font-mono text-2xl font-semibold tracking-tight text-[#FAFAFA] tabular-nums">
              {kpi.mae_mw.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500 font-normal ml-1.5">MW</span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono">
          <span className="text-zinc-500">INTRADAY:</span>
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            -{kpi.forecast_improvement_mw} MW
          </span>
        </div>
      </div>

      {/* 2. Systematic Bias (MBE) */}
      <div className="bg-[#111113] hover:bg-[#151518] p-4 transition-colors flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-mono tracking-wider text-zinc-500 uppercase font-medium">
            SYSTEMATIC BIAS (MBE)
          </div>
          <div className="mt-1 flex items-baseline">
            <span className="font-mono text-2xl font-semibold tracking-tight text-[#FAFAFA] tabular-nums">
              +{kpi.mbe_mw.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500 font-normal ml-1.5">MW</span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono">
          <span className="text-zinc-500">DIRECTION:</span>
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
            OVER-FORECAST
          </span>
        </div>
      </div>

      {/* 3. WAPE & RMSE */}
      <div className="bg-[#111113] hover:bg-[#151518] p-4 transition-colors flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-mono tracking-wider text-zinc-500 uppercase font-medium">
            CAPACITY ERROR (WAPE)
          </div>
          <div className="mt-1 flex items-baseline">
            <span className="font-mono text-2xl font-semibold tracking-tight text-[#FAFAFA] tabular-nums">
              {kpi.wape_percent.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono">
          <span className="text-zinc-500">RMSE:</span>
          <span className="text-zinc-300 font-medium">{kpi.rmse_mw.toLocaleString()} MW</span>
        </div>
      </div>

      {/* 4. Recommended Thermal Buffer (P95 Shortfall) */}
      <div className="bg-[#111113] hover:bg-[#151518] p-4 transition-colors flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-mono tracking-wider text-zinc-500 uppercase font-medium">
            P95 THERMAL BUFFER
          </div>
          <div className="mt-1 flex items-baseline">
            <span className="font-mono text-2xl font-semibold tracking-tight text-[#FAFAFA] tabular-nums">
              {kpi.p95_shortfall_mw.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500 font-normal ml-1.5">MW</span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono">
          <span className="text-zinc-500">P90 BUFFER:</span>
          <span className="text-zinc-400">{kpi.p90_shortfall_mw.toLocaleString()} MW</span>
        </div>
      </div>

      {/* 5. Peak Single-Period Deficit */}
      <div className="bg-[#111113] hover:bg-[#151518] p-4 transition-colors flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-mono tracking-wider text-zinc-500 uppercase font-medium">
            PEAK DEFICIT SPIKE
          </div>
          <div className="mt-1 flex items-baseline">
            <span className="font-mono text-2xl font-semibold tracking-tight text-[#FAFAFA] tabular-nums">
              {kpi.max_shortfall_mw.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500 font-normal ml-1.5">MW</span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono">
          <span className="text-zinc-500">TAIL EVENT:</span>
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
            MAX 30-MIN MISS
          </span>
        </div>
      </div>

      {/* 6. Net Monthly Energy Imbalance */}
      <div className="bg-[#111113] hover:bg-[#151518] p-4 transition-colors flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-mono tracking-wider text-zinc-500 uppercase font-medium">
            NET WIND IMBALANCE
          </div>
          <div className="mt-1 flex items-baseline">
            <span className="font-mono text-2xl font-semibold tracking-tight text-[#FAFAFA] tabular-nums">
              -{netDeficitGwh.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500 font-normal ml-1.5">GWh</span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono">
          <span className="text-zinc-500">ACTUAL:</span>
          <span className="text-zinc-300 font-medium">{kpi.total_actual_gwh.toLocaleString()} GWh</span>
        </div>
      </div>
    </div>
  );
};
