import React from 'react';
import { KpiSummary } from '../types/api';

interface KpiBentoStripProps {
  kpi: KpiSummary | null;
  cutoffHour: number;
}

export const KpiBentoStrip: React.FC<KpiBentoStripProps> = ({ kpi, cutoffHour }) => {
  if (!kpi) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 surface-card p-4" />
        ))}
      </div>
    );
  }

  const netDeficitGwh = Number((kpi.total_forecast_gwh - kpi.total_actual_gwh).toFixed(1));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Forecast Error (MAE) */}
      <div className="surface-card p-4 flex flex-col justify-between transition-all hover:border-white/[0.12]">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-medium text-[#8A8F98]">Forecast Error (MAE)</span>
          <span className="font-mono text-[11px] text-[#5E626A]">D-1 {cutoffHour}H</span>
        </div>
        <div className="my-2.5 flex items-baseline">
          <span className="metric-value text-[28px] font-semibold text-[#F4F4F6] leading-none">
            {kpi.mae_mw.toLocaleString()}
          </span>
          <span className="text-[13px] font-normal text-[#6E737D] ml-1.5">MW</span>
        </div>
        <div className="flex items-center text-[12px] text-[#8A8F98]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] inline-block mr-1.5 flex-shrink-0" />
          <span>{kpi.wape_percent.toFixed(1)}% WAPE · {kpi.latest_mae_mw.toLocaleString()} MW intraday</span>
        </div>
      </div>

      {/* 2. Forecast Bias (MBE) */}
      <div className="surface-card p-4 flex flex-col justify-between transition-all hover:border-white/[0.12]">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-medium text-[#8A8F98]">Forecast Bias (MBE)</span>
          <span className="font-mono text-[11px] text-[#5E626A]">SYSTEMATIC</span>
        </div>
        <div className="my-2.5 flex items-baseline">
          <span className="metric-value text-[28px] font-semibold text-[#F4F4F6] leading-none">
            +{kpi.mbe_mw.toLocaleString()}
          </span>
          <span className="text-[13px] font-normal text-[#6E737D] ml-1.5">MW</span>
        </div>
        <div className="flex items-center text-[12px] text-[#8A8F98]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] inline-block mr-1.5 flex-shrink-0" />
          <span>Consistent over-forecast bias</span>
        </div>
      </div>

      {/* 3. P95 Thermal Buffer */}
      <div className="surface-card p-4 flex flex-col justify-between transition-all hover:border-white/[0.12]">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-medium text-[#8A8F98]">P95 Thermal Buffer</span>
          <span className="font-mono text-[11px] text-[#5E626A]">TAIL RISK</span>
        </div>
        <div className="my-2.5 flex items-baseline">
          <span className="metric-value text-[28px] font-semibold text-[#F4F4F6] leading-none">
            {kpi.p95_shortfall_mw.toLocaleString()}
          </span>
          <span className="text-[13px] font-normal text-[#6E737D] ml-1.5">MW</span>
        </div>
        <div className="flex items-center text-[12px] text-[#8A8F98]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#818CF8] inline-block mr-1.5 flex-shrink-0" />
          <span>P90: {kpi.p90_shortfall_mw.toLocaleString()} MW · Max: {kpi.max_shortfall_mw.toLocaleString()} MW</span>
        </div>
      </div>

      {/* 4. Monthly Volume */}
      <div className="surface-card p-4 flex flex-col justify-between transition-all hover:border-white/[0.12]">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-medium text-[#8A8F98]">Monthly Volume (Jan 2026)</span>
          <span className="font-mono text-[11px] text-[#5E626A]">ACTUAL</span>
        </div>
        <div className="my-2.5 flex items-baseline">
          <span className="metric-value text-[28px] font-semibold text-[#F4F4F6] leading-none">
            {kpi.total_actual_gwh.toLocaleString()}
          </span>
          <span className="text-[13px] font-normal text-[#6E737D] ml-1.5">GWh</span>
        </div>
        <div className="flex items-center text-[12px] text-[#8A8F98]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] inline-block mr-1.5 flex-shrink-0" />
          <span>Forecast: {kpi.total_forecast_gwh.toLocaleString()} GWh (-{netDeficitGwh.toLocaleString()} GWh gap)</span>
        </div>
      </div>
    </div>
  );
};
