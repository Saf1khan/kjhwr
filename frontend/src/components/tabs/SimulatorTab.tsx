import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { KpiSummary, TimeSeriesPoint } from '../../types/api';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { getTimeseries } from '../../services/api';

interface SimulatorTabProps {
  timeseries: TimeSeriesPoint[];
  kpi: KpiSummary | null;
  cutoffHour: number;
  selectedDate?: string;
  theme?: 'dark' | 'light';
}

export const SimulatorTab: React.FC<SimulatorTabProps> = ({
  timeseries,
  kpi,
  cutoffHour,
  selectedDate,
  theme = 'dark',
}) => {
  // Simulator State
  const [targetDate, setTargetDate] = useState<string>(selectedDate || '2026-01-28');
  const [demandMw, setDemandMw] = useState<number>(35000);
  const [riskPolicy, setRiskPolicy] = useState<'naive' | 'bias' | 'p90' | 'p95'>('p95');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [fetchedDayPoints, setFetchedDayPoints] = useState<TimeSeriesPoint[]>([]);
  const [isLoadingDay, setIsLoadingDay] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  const isLight = theme === 'light';
  const gridColor = isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.04)';
  const axisColor = isLight ? '#94A3B8' : '#5E626A';
  const actualColor = isLight ? '#059669' : '#10B981';
  const thermalColor = isLight ? '#D97706' : '#F97316';
  const totalGenColor = isLight ? '#2563EB' : '#38BDF8';

  // Sync targetDate when selectedDate prop changes (e.g. clicked from Tab 2)
  useEffect(() => {
    if (selectedDate) {
      setTargetDate(selectedDate);
    }
  }, [selectedDate]);

  // Click outside listener for date popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setIsDateDropdownOpen(false);
      }
    };
    if (isDateDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDateDropdownOpen]);

  // Check if targetDate is already available in the passed timeseries prop
  const matchedPropPoints = useMemo(() => {
    return timeseries.filter((pt) => pt.settlementDate === targetDate);
  }, [timeseries, targetDate]);

  // Guarantee that every date from 2026-01-01 to 2026-01-31 always has all 48 SPs
  useEffect(() => {
    if (matchedPropPoints.length > 0) {
      setFetchedDayPoints(matchedPropPoints);
      return;
    }

    let isMounted = true;
    setIsLoadingDay(true);
    getTimeseries({
      start_date: targetDate,
      end_date: targetDate,
      cutoff_hour: cutoffHour,
      interpolation: 'linear',
    })
      .then((res) => {
        if (isMounted && res?.timeseries && res.timeseries.length > 0) {
          setFetchedDayPoints(res.timeseries);
        }
      })
      .catch((err) => {
        console.error('Failed to load target date for simulator:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDay(false);
      });

    return () => {
      isMounted = false;
    };
  }, [targetDate, cutoffHour, matchedPropPoints]);

  const dayPoints = matchedPropPoints.length > 0 ? matchedPropPoints : fetchedDayPoints;

  // Complete list of January 2026 delivery dates
  const availableDates = useMemo(() => {
    return Array.from({ length: 31 }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`);
  }, []);

  // Risk policy configurations (fallback to calibrated Jan 2026 values if kpi is null)
  const policyBuffer = useMemo(() => {
    const mbe = kpi?.mbe_mw ?? 1840.3;
    const p90 = kpi?.p90_shortfall_mw ?? 4346.9;
    const p95 = kpi?.p95_shortfall_mw ?? 5378.1;
    switch (riskPolicy) {
      case 'naive':
        return 0;
      case 'bias':
        return mbe;
      case 'p90':
        return p90;
      case 'p95':
        return p95;
      default:
        return 0;
    }
  }, [riskPolicy, kpi]);

  // Calculate day-specific simulation data
  const simulationData = useMemo(() => {
    return dayPoints.map((pt) => {
      let expectedWind = pt.day_ahead_forecast_mw;
      if (riskPolicy === 'bias') {
        expectedWind = Math.max(0, pt.day_ahead_forecast_mw - policyBuffer);
      }

      let thermalNeeded = demandMw - expectedWind;
      if (riskPolicy === 'p90' || riskPolicy === 'p95') {
        thermalNeeded += policyBuffer;
      }
      thermalNeeded = Math.max(0, Math.round(thermalNeeded));

      const totalActualGen = pt.actual_mw + thermalNeeded;
      const isShortfall = totalActualGen < demandMw;
      const marginMw = Math.round(totalActualGen - demandMw);

      return {
        ...pt,
        demand_mw: demandMw,
        thermal_procured_mw: thermalNeeded,
        total_generation_mw: totalActualGen,
        margin_mw: marginMw,
        is_shortfall: isShortfall,
      };
    });
  }, [dayPoints, demandMw, riskPolicy, policyBuffer]);

  const protectedCount = simulationData.filter((d) => !d.is_shortfall).length;
  const protectionPercent = simulationData.length > 0
    ? Math.round((protectedCount / simulationData.length) * 100)
    : 0;

  const avgThermalProcured = simulationData.length > 0
    ? Math.round(simulationData.reduce((acc, d) => acc + d.thermal_procured_mw, 0) / simulationData.length)
    : 0;

  const avgWindForecast = simulationData.length > 0
    ? Math.round(simulationData.reduce((acc, d) => acc + d.day_ahead_forecast_mw, 0) / simulationData.length)
    : 0;

  return (
    <div className="flex flex-col bg-[#0A0B0E]">
      {/* 12-Column Side-by-Side Zero-Scroll Split Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.07]">
        {/* Left Pane (lg:col-span-4): Reactive Interactive Controls */}
        <div className="lg:col-span-4 p-6 bg-[#0C0D12] flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* Header info (without blue dot) */}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-semibold text-[#EDEDEF] font-sans tracking-tight">
                  Procurement Controls
                </h2>
              </div>
              <p className="text-xs text-[#8A8F98] font-sans mt-1">
                Calibrate D-1 commitments before {cutoffHour}:00 UTC gate closure against physical settlement outturn.
              </p>
            </div>

            {/* Delivery Date Selector with Custom Framer Motion Popover */}
            <div className="space-y-2 relative" ref={dateDropdownRef}>
              <label className="text-xs font-medium text-zinc-300 font-sans flex items-center justify-between">
                <span>Delivery Date (D)</span>
                <span className="text-[11px] text-[#8A8F98] font-mono">{targetDate}</span>
              </label>

              <button
                type="button"
                onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                className="w-full bg-[#121316] border border-white/[0.08] hover:border-white/[0.16] text-[#EDEDEF] px-3 py-2 rounded-lg outline-none font-mono text-xs transition-colors cursor-pointer flex items-center justify-between shadow-sm"
              >
                <span>
                  {targetDate} {targetDate === '2026-01-28' ? '· Extreme Deficit (6,857 MW)' : ''}
                </span>
                <div className="flex items-center gap-1.5">
                  {isLoadingDay && <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                      isDateDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              <AnimatePresence>
                {isDateDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-1.5 w-full z-50 bg-[#121316] border border-white/[0.1] rounded-xl shadow-2xl py-1.5 max-h-60 overflow-y-auto"
                  >
                    {availableDates.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setTargetDate(d);
                          setIsDateDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-1.5 text-left text-xs font-mono flex items-center justify-between transition-colors ${
                          d === targetDate
                            ? 'bg-sky-500/10 text-sky-400 font-semibold'
                            : 'text-zinc-300 hover:bg-white/[0.04]'
                        }`}
                      >
                        <span>
                          {d} {d === '2026-01-28' ? '· Extreme Deficit (6,857 MW)' : ''}
                        </span>
                        {d === targetDate && <Check className="w-3.5 h-3.5 text-sky-400" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Demand Slider */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-300 font-medium font-sans">System Consumer Demand</span>
                <span className="text-[#EDEDEF] font-bold tabular-nums font-mono">
                  {demandMw.toLocaleString()} MW
                </span>
              </div>
              <input
                type="range"
                min={15000}
                max={50000}
                step={1000}
                value={demandMw}
                onChange={(e) => setDemandMw(Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer h-1.5 bg-[#18191E] rounded"
              />
              <div className="flex justify-between text-[10px] text-[#5E626A] font-mono">
                <span>15 GW</span>
                <span>35 GW (Base)</span>
                <span>50 GW (Peak)</span>
              </div>
            </div>

            {/* Risk Policy Selector */}
            <div className="space-y-2.5">
              <div className="text-xs font-medium text-zinc-300 font-sans">
                Risk Policy & Thermal Buffer:
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Naive Forecast */}
                <button
                  type="button"
                  onClick={() => setRiskPolicy('naive')}
                  className={`p-2.5 rounded-lg text-left transition-all border flex items-center justify-between ${
                    riskPolicy === 'naive'
                      ? isLight
                        ? 'bg-sky-50 border-sky-400 shadow-sm'
                        : 'bg-sky-500/[0.08] border-sky-500/50 shadow-[inset_0_1px_0_0_rgba(56,189,248,0.2)]'
                      : isLight
                        ? 'bg-white border-slate-200 hover:border-slate-300'
                        : 'bg-[#121316] border-white/[0.06] hover:border-white/[0.12] hover:bg-[#16171C]'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0 pr-1">
                    <div className={`text-xs font-medium truncate ${isLight ? 'text-slate-900' : 'text-[#EDEDEF]'}`}>
                      Naive Forecast
                    </div>
                    <div className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-[#8A8F98]'}`}>
                      0 MW buffer
                    </div>
                  </div>
                  <div
                    className={`w-3.5 h-3.5 flex-shrink-0 rounded-full border flex items-center justify-center ${
                      riskPolicy === 'naive' ? 'border-sky-500' : (isLight ? 'border-slate-300' : 'border-white/20')
                    }`}
                  >
                    {riskPolicy === 'naive' && <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />}
                  </div>
                </button>

                {/* 2. Bias-Adjusted */}
                <button
                  type="button"
                  onClick={() => setRiskPolicy('bias')}
                  className={`p-2.5 rounded-lg text-left transition-all border flex items-center justify-between ${
                    riskPolicy === 'bias'
                      ? isLight
                        ? 'bg-sky-50 border-sky-400 shadow-sm'
                        : 'bg-sky-500/[0.08] border-sky-500/50 shadow-[inset_0_1px_0_0_rgba(56,189,248,0.2)]'
                      : isLight
                        ? 'bg-white border-slate-200 hover:border-slate-300'
                        : 'bg-[#121316] border-white/[0.06] hover:border-white/[0.12] hover:bg-[#16171C]'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0 pr-1">
                    <div className={`text-xs font-medium truncate ${isLight ? 'text-slate-900' : 'text-[#EDEDEF]'}`}>
                      Bias-Adjusted
                    </div>
                    <div className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-[#8A8F98]'}`}>
                      -{kpi?.mbe_mw || 1840} MW
                    </div>
                  </div>
                  <div
                    className={`w-3.5 h-3.5 flex-shrink-0 rounded-full border flex items-center justify-center ${
                      riskPolicy === 'bias' ? 'border-sky-500' : (isLight ? 'border-slate-300' : 'border-white/20')
                    }`}
                  >
                    {riskPolicy === 'bias' && <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />}
                  </div>
                </button>

                {/* 3. P90 Buffer */}
                <button
                  type="button"
                  onClick={() => setRiskPolicy('p90')}
                  className={`p-2.5 rounded-lg text-left transition-all border flex items-center justify-between ${
                    riskPolicy === 'p90'
                      ? isLight
                        ? 'bg-sky-50 border-sky-400 shadow-sm'
                        : 'bg-sky-500/[0.08] border-sky-500/50 shadow-[inset_0_1px_0_0_rgba(56,189,248,0.2)]'
                      : isLight
                        ? 'bg-white border-slate-200 hover:border-slate-300'
                        : 'bg-[#121316] border-white/[0.06] hover:border-white/[0.12] hover:bg-[#16171C]'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0 pr-1">
                    <div className={`text-xs font-medium truncate ${isLight ? 'text-slate-900' : 'text-[#EDEDEF]'}`}>
                      P90 Buffer
                    </div>
                    <div className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-[#8A8F98]'}`}>
                      +{kpi?.p90_shortfall_mw || 4347} MW
                    </div>
                  </div>
                  <div
                    className={`w-3.5 h-3.5 flex-shrink-0 rounded-full border flex items-center justify-center ${
                      riskPolicy === 'p90' ? 'border-sky-500' : (isLight ? 'border-slate-300' : 'border-white/20')
                    }`}
                  >
                    {riskPolicy === 'p90' && <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />}
                  </div>
                </button>

                {/* 4. P95 Institutional Buffer */}
                <button
                  type="button"
                  onClick={() => setRiskPolicy('p95')}
                  className={`p-2.5 rounded-lg text-left transition-all border flex items-center justify-between ${
                    riskPolicy === 'p95'
                      ? isLight
                        ? 'bg-sky-50 border-sky-400 shadow-sm'
                        : 'bg-sky-500/[0.08] border-sky-500/50 shadow-[inset_0_1px_0_0_rgba(56,189,248,0.2)]'
                      : isLight
                        ? 'bg-white border-slate-200 hover:border-slate-300'
                        : 'bg-[#121316] border-white/[0.06] hover:border-white/[0.12] hover:bg-[#16171C]'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0 pr-1">
                    <div className={`text-xs font-medium truncate ${isLight ? 'text-slate-900' : 'text-[#EDEDEF]'}`}>
                      P95 Buffer
                    </div>
                    <div className={`text-[10px] truncate font-medium ${isLight ? 'text-sky-600' : 'text-sky-400'}`}>
                      +{kpi?.p95_shortfall_mw || 5378} MW
                    </div>
                  </div>
                  <div
                    className={`w-3.5 h-3.5 flex-shrink-0 rounded-full border flex items-center justify-center ${
                      riskPolicy === 'p95' ? 'border-sky-500' : (isLight ? 'border-slate-300' : 'border-white/20')
                    }`}
                  >
                    {riskPolicy === 'p95' && <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />}
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#5E626A] font-mono border-t border-white/[0.06] pt-4">
            D-1 Gate 11:00 UTC · 48 SPs
          </div>
        </div>

        {/* Right Pane (lg:col-span-8): Top Metric Strip + Live Dispatch Balance Chart */}
        <div className="lg:col-span-8 flex flex-col bg-[#0A0B0E]">
          {/* Top 4-Metric Strip with 1px hairlines */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/[0.07] border-b border-white/[0.07] bg-[#0E1015]">
            <div className="p-4 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-[#8A8F98] font-sans">Expected Wind</span>
              <div className="metric-value text-[20px] font-semibold text-[#F4F4F6] my-0.5">
                {avgWindForecast.toLocaleString()} <span className="text-[12px] font-normal text-[#6E737D]">MW</span>
              </div>
              <span className="text-[10px] text-[#5E626A] font-mono">D-1 FORECAST</span>
            </div>

            <div className="p-4 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-[#8A8F98] font-sans">Safety Buffer</span>
              <div className="metric-value text-[20px] font-semibold text-[#F4F4F6] my-0.5">
                +{policyBuffer.toLocaleString()} <span className="text-[12px] font-normal text-[#6E737D]">MW</span>
              </div>
              <span className="text-[10px] text-sky-400/90 font-mono">{riskPolicy.toUpperCase()} POLICY</span>
            </div>

            <div className="p-4 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-[#8A8F98] font-sans">Required Thermal</span>
              <div className="metric-value text-[20px] font-semibold text-[#F4F4F6] my-0.5">
                {avgThermalProcured.toLocaleString()} <span className="text-[12px] font-normal text-[#6E737D]">MW</span>
              </div>
              <span className="text-[10px] text-[#5E626A] font-mono">D-1 COMMITTED</span>
            </div>

            <div className="p-4 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-[#8A8F98] font-sans">Periods Protected</span>
              <div className="metric-value text-[20px] font-semibold text-[#F4F4F6] my-0.5">
                {protectionPercent}%
              </div>
              <span className="text-[10px] text-[#8A8F98] font-mono">
                {protectedCount}/{simulationData.length} SPs
              </span>
            </div>
          </div>

          {/* Chart Header Bar */}
          <div className="h-11 px-6 border-b border-white/[0.07] flex items-center justify-between flex-wrap gap-2 bg-[#0C0D12]">
            <div className="flex items-center gap-3">
              <span className="font-sans font-medium text-[13px] text-[#EDEDEF]">
                Dispatch Balance Timeline
              </span>
              <span className="text-[#5E626A]">·</span>
              <span className="text-xs text-[#8A8F98] font-sans">
                Day {targetDate} · <strong className="text-zinc-200">{riskPolicy.toUpperCase()}</strong> (+{policyBuffer} MW)
              </span>
            </div>

            {/* Custom Header Legend Pills (No Recharts -o- icon) */}
            <div className="flex items-center gap-3 text-xs font-sans">
              <div className="flex items-center gap-1.5 text-[#8A8F98]">
                <span className="w-2.5 h-[2px] bg-amber-500" />
                <span className="text-[11px]">Demand ({Math.round(demandMw / 1000)}k MW)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#8A8F98]">
                <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: actualColor }} />
                <span className="text-[11px]">Actual Wind</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#8A8F98]">
                <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: thermalColor }} />
                <span className="text-[11px]">Thermal</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#8A8F98]">
                <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: totalGenColor }} />
                <span className="text-[11px]">Total Gen</span>
              </div>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="p-6 flex-1">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={simulationData}
                  margin={{ top: 12, right: 25, left: -10, bottom: 20 }}
                >
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="settlementPeriod"
                    stroke={axisColor}
                    fontSize={10}
                    tickLine={false}
                    fontFamily="JetBrains Mono"
                    label={{
                      value: 'Settlement Period (1 to 48)',
                      position: 'insideBottom',
                      offset: -10,
                      fill: axisColor,
                      fontSize: 10,
                      fontFamily: 'Inter, sans-serif',
                    }}
                  />
                  <YAxis
                    stroke={axisColor}
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => (val === 0 ? '0' : `${Math.round(val / 1000)}k`)}
                    fontFamily="JetBrains Mono"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className={`p-3 rounded-lg shadow-xl text-xs font-mono space-y-1 ${
                          isLight
                            ? 'bg-white border border-slate-200 text-slate-800'
                            : 'bg-[#121316] border border-white/[0.12] text-zinc-200'
                        }`}>
                          <div className={`font-semibold font-sans border-b pb-1 ${
                            isLight ? 'border-slate-100 text-slate-900' : 'border-white/[0.08] text-[#EDEDEF]'
                          }`}>
                            {d.settlementDate} • SP {d.settlementPeriod} ({d.startTime?.split('T')[1]?.substring(0, 5)} UTC)
                          </div>
                          <div className={isLight ? 'text-slate-500' : 'text-[#8A8F98]'}>Demand: {d.demand_mw.toLocaleString()} MW</div>
                          <div style={{ color: actualColor }}>Actual Wind: {d.actual_mw.toLocaleString()} MW</div>
                          <div style={{ color: thermalColor }}>Procured Thermal: {d.thermal_procured_mw.toLocaleString()} MW</div>
                          <div style={{ color: totalGenColor }}>Total Generation: {d.total_generation_mw.toLocaleString()} MW</div>
                          <div
                            className={`pt-1 border-t font-semibold ${
                              isLight ? 'border-slate-100' : 'border-white/[0.08]'
                            } ${
                              d.margin_mw >= 0 ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400')
                            }`}
                          >
                            {d.margin_mw >= 0 ? `+${d.margin_mw} MW Surplus` : `${d.margin_mw} MW Shortfall`}
                          </div>
                        </div>
                      );
                    }}
                  />

                  <ReferenceLine
                    y={demandMw}
                    stroke={isLight ? '#D97706' : '#F59E0B'}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />

                  <Line
                    type="monotone"
                    dataKey="actual_mw"
                    name="Actual Wind"
                    stroke={actualColor}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="thermal_procured_mw"
                    name="Procured Thermal"
                    stroke={thermalColor}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="total_generation_mw"
                    name="Total Generation"
                    stroke={totalGenColor}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Methodology Compact Single-Line Hairline Footer */}
      <div className="border-t border-white/[0.07] px-6 py-2.5 text-center text-xs text-[#6E737D] font-sans bg-[#08090B]">
        D-1 11:00 UTC auction cutoff · Calibrated on 1,488 settlement periods (Jan 2026) · P95 hedge protects against balancing mechanism cash-out penalties
      </div>
    </div>
  );
};

