import React, { useEffect, useRef, useState } from 'react';
import { KpiSummary } from '../types/api';

interface KpiBentoStripProps {
  kpi: KpiSummary | null;
  cutoffHour: number;
}

export const AnimatedNumber: React.FC<{
  value: number;
  decimals?: number;
  prefix?: string;
}> = ({ value, decimals = 0, prefix = '' }) => {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prevValueRef = useRef<number>(value);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    prevValueRef.current = value;

    if (startValue === endValue) {
      setDisplayValue(endValue);
      return;
    }

    const duration = 300; // 300ms smooth tween
    const startTime = performance.now();
    let animationFrameId: number;

    const updateNumber = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * ease;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateNumber);
      } else {
        setDisplayValue(endValue);
      }
    };

    animationFrameId = requestAnimationFrame(updateNumber);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value]);

  const formatted =
    decimals > 0
      ? displayValue.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : Math.round(displayValue).toLocaleString();

  return (
    <>
      {prefix}
      {formatted}
    </>
  );
};

export const KpiBentoStrip: React.FC<KpiBentoStripProps> = ({ kpi, cutoffHour }) => {
  if (!kpi) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.07] border-b border-white/[0.08] bg-[#0E1015] animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="px-6 py-5 h-28" />
        ))}
      </div>
    );
  }

  const netDeficitGwh = Number((kpi.total_forecast_gwh - kpi.total_actual_gwh).toFixed(1));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.07] border-b border-white/[0.08] bg-[#0E1015]">
      {/* 1. Forecast Error (MAE) */}
      <div className="px-6 py-5 transition-colors hover:bg-white/[0.015] flex flex-col justify-between">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-medium text-zinc-400">Forecast Error (MAE)</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            D-1 {cutoffHour}H
          </span>
        </div>
        <div className="my-2.5 flex items-baseline">
          <span className="font-sans tabular-nums tracking-[-0.03em] text-[28px] font-semibold text-[#F4F4F6] leading-none">
            <AnimatedNumber value={kpi.mae_mw} decimals={1} />
          </span>
          <span className="text-[13px] font-normal text-zinc-500 ml-1.5">MW</span>
        </div>
        <div className="flex items-center text-[12px] text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] inline-block mr-2 flex-shrink-0" />
          <span>
            {kpi.wape_percent.toFixed(1)}% WAPE · {kpi.latest_mae_mw.toLocaleString()} MW intraday
          </span>
        </div>
      </div>

      {/* 2. Forecast Bias (MBE) */}
      <div className="px-6 py-5 transition-colors hover:bg-white/[0.015] flex flex-col justify-between">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-medium text-zinc-400">Forecast Bias (MBE)</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            SYSTEMATIC
          </span>
        </div>
        <div className="my-2.5 flex items-baseline">
          <span className="font-sans tabular-nums tracking-[-0.03em] text-[28px] font-semibold text-[#F4F4F6] leading-none">
            <AnimatedNumber value={kpi.mbe_mw} decimals={1} prefix="+" />
          </span>
          <span className="text-[13px] font-normal text-zinc-500 ml-1.5">MW</span>
        </div>
        <div className="flex items-center text-[12px] text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] inline-block mr-2 flex-shrink-0" />
          <span>Consistent over-forecast bias</span>
        </div>
      </div>

      {/* 3. P95 Thermal Buffer */}
      <div className="px-6 py-5 transition-colors hover:bg-white/[0.015] flex flex-col justify-between">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-medium text-zinc-400">P95 Thermal Buffer</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            TAIL RISK
          </span>
        </div>
        <div className="my-2.5 flex items-baseline">
          <span className="font-sans tabular-nums tracking-[-0.03em] text-[28px] font-semibold text-[#F4F4F6] leading-none">
            <AnimatedNumber value={kpi.p95_shortfall_mw} decimals={1} />
          </span>
          <span className="text-[13px] font-normal text-zinc-500 ml-1.5">MW</span>
        </div>
        <div className="flex items-center text-[12px] text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-[#818CF8] inline-block mr-2 flex-shrink-0" />
          <span>
            P90: {kpi.p90_shortfall_mw.toLocaleString()} MW · Max: {kpi.max_shortfall_mw.toLocaleString()} MW
          </span>
        </div>
      </div>

      {/* 4. Monthly Volume */}
      <div className="px-6 py-5 transition-colors hover:bg-white/[0.015] flex flex-col justify-between">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-medium text-zinc-400">Monthly Volume</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            JAN 2026
          </span>
        </div>
        <div className="my-2.5 flex items-baseline">
          <span className="font-sans tabular-nums tracking-[-0.03em] text-[28px] font-semibold text-[#F4F4F6] leading-none">
            <AnimatedNumber value={kpi.total_actual_gwh} decimals={1} />
          </span>
          <span className="text-[13px] font-normal text-zinc-500 ml-1.5">GWh</span>
        </div>
        <div className="flex items-center text-[12px] text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] inline-block mr-2 flex-shrink-0" />
          <span>
            Fcst: {kpi.total_forecast_gwh.toLocaleString()} GWh (-{netDeficitGwh.toLocaleString()} GWh)
          </span>
        </div>
      </div>
    </div>
  );
};
