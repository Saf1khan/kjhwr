import React, { useState, useMemo, useEffect } from 'react';
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

interface SimulatorTabProps {
  timeseries: TimeSeriesPoint[];
  kpi: KpiSummary | null;
  cutoffHour: number;
  selectedDate?: string;
}

export const SimulatorTab: React.FC<SimulatorTabProps> = ({
  timeseries,
  kpi,
  cutoffHour,
  selectedDate,
}) => {
  // Simulator State
  const [targetDate, setTargetDate] = useState<string>(selectedDate || '2026-01-05');
  const [demandMw, setDemandMw] = useState<number>(35000);
  const [riskPolicy, setRiskPolicy] = useState<'naive' | 'bias' | 'p90' | 'p95'>('p95');

  // Sync targetDate when selectedDate prop changes (e.g. clicked from Tab 2)
  useEffect(() => {
    if (selectedDate) {
      setTargetDate(selectedDate);
    }
  }, [selectedDate]);

  // Filter timeseries for selected delivery date
  const dayPoints = useMemo(() => {
    return timeseries.filter((pt) => pt.settlementDate === targetDate);
  }, [timeseries, targetDate]);

  // Unique delivery dates available in timeseries
  const availableDates = useMemo(() => {
    return Array.from(new Set(timeseries.map((pt) => pt.settlementDate))).sort();
  }, [timeseries]);

  // Risk policy configurations
  const policyBuffer = useMemo(() => {
    if (!kpi) return 0;
    switch (riskPolicy) {
      case 'naive':
        return 0;
      case 'bias':
        return kpi.mbe_mw;
      case 'p90':
        return kpi.p90_shortfall_mw;
      case 'p95':
        return kpi.p95_shortfall_mw;
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
            {/* Header info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <h2 className="text-[14px] font-semibold text-[#EDEDEF] font-sans tracking-tight">
                  Procurement Controls
                </h2>
              </div>
              <p className="text-xs text-[#8A8F98] font-sans mt-1">
                Calibrate D-1 commitments before {cutoffHour}:00 UTC gate closure against physical settlement outturn.
              </p>
            </div>

            {/* Delivery Date Selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300 font-sans flex items-center justify-between">
                <span>Delivery Date (D)</span>
                <span className="text-[11px] text-[#8A8F98] font-mono">{targetDate}</span>
              </label>
              <select
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-[#121316] border border-white/[0.08] hover:border-white/[0.16] text-[#EDEDEF] px-3 py-2 rounded-lg outline-none focus:border-sky-500 font-mono text-xs transition-colors cursor-pointer"
              >
                {availableDates.map((d) => (
                  <option key={d} value={d} className="bg-[#121316] text-[#EDEDEF]">
                    {d} {d === '2026-01-28' ? '· Extreme Deficit (6,857 MW)' : ''}
                  </option>
                ))}
              </select>
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
              <div className="space-y-2">
                {/* 1. Naive Forecast */}
                <button
                  type="button"
                  onClick={() => setRiskPolicy('naive')}
                  className={`w-full p-3 rounded-lg text-left transition-all border flex items-center justify-between ${
                    riskPolicy === 'naive'
                      ? 'bg-sky-500/[0.08] border-sky-500/50 shadow-[inset_0_1px_0_0_rgba(56,189,248,0.2)]'
                      : 'bg-[#121316] border-white/[0.06] hover:border-white/[0.12] hover:bg-[#16171C]'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-[#EDEDEF]">Naive Forecast</div>
                    <div className="text-[11px] text-[#8A8F98]">Trust raw wind · 0 MW buffer</div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      riskPolicy === 'naive' ? 'border-sky-400' : 'border-white/20'
                    }`}
                  >
                    {riskPolicy === 'naive' && <span className="w-2 h-2 rounded-full bg-sky-400" />}
                  </div>
                </button>

                {/* 2. Bias-Adjusted */}
                <button
                  type="button"
                  onClick={() => setRiskPolicy('bias')}
                  className={`w-full p-3 rounded-lg text-left transition-all border flex items-center justify-between ${
                    riskPolicy === 'bias'
                      ? 'bg-sky-500/[0.08] border-sky-500/50 shadow-[inset_0_1px_0_0_rgba(56,189,248,0.2)]'
                      : 'bg-[#121316] border-white/[0.06] hover:border-white/[0.12] hover:bg-[#16171C]'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-[#EDEDEF]">Bias-Adjusted</div>
                    <div className="text-[11px] text-[#8A8F98]">
                      Subtract MBE · -{kpi?.mbe_mw || 1840} MW
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      riskPolicy === 'bias' ? 'border-sky-400' : 'border-white/20'
                    }`}
                  >
                    {riskPolicy === 'bias' && <span className="w-2 h-2 rounded-full bg-sky-400" />}
                  </div>
                </button>

                {/* 3. P90 Buffer */}
                <button
                  type="button"
                  onClick={() => setRiskPolicy('p90')}
                  className={`w-full p-3 rounded-lg text-left transition-all border flex items-center justify-between ${
                    riskPolicy === 'p90'
                      ? 'bg-sky-500/[0.08] border-sky-500/50 shadow-[inset_0_1px_0_0_rgba(56,189,248,0.2)]'
                      : 'bg-[#121316] border-white/[0.06] hover:border-white/[0.12] hover:bg-[#16171C]'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-[#EDEDEF]">P90 Buffer</div>
                    <div className="text-[11px] text-[#8A8F98]">
                      +{kpi?.p90_shortfall_mw || 4347} MW buffer
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      riskPolicy === 'p90' ? 'border-sky-400' : 'border-white/20'
                    }`}
                  >
                    {riskPolicy === 'p90' && <span className="w-2 h-2 rounded-full bg-sky-400" />}
                  </div>
                </button>

                {/* 4. P95 Institutional Buffer */}
                <button
                  type="button"
                  onClick={() => setRiskPolicy('p95')}
                  className={`w-full p-3 rounded-lg text-left transition-all border flex items-center justify-between ${
                    riskPolicy === 'p95'
                      ? 'bg-sky-500/[0.08] border-sky-500/50 shadow-[inset_0_1px_0_0_rgba(56,189,248,0.2)]'
                      : 'bg-[#121316] border-white/[0.06] hover:border-white/[0.12] hover:bg-[#16171C]'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-[#EDEDEF]">P95 Institutional Buffer</div>
                    <div className="text-[11px] text-sky-400 font-medium">
                      +{kpi?.p95_shortfall_mw || 5378} MW buffer
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      riskPolicy === 'p95' ? 'border-sky-400' : 'border-white/20'
                    }`}
                  >
                    {riskPolicy === 'p95' && <span className="w-2 h-2 rounded-full bg-sky-400" />}
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
              <div className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2.5 h-[2px] bg-amber-400" />
                <span className="text-[11px]">Demand ({Math.round(demandMw / 1000)}k MW)</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2 h-2 rounded-[2px] bg-[#10B981]" />
                <span className="text-[11px]">Actual Wind</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2 h-2 rounded-[2px] bg-[#F97316]" />
                <span className="text-[11px]">Thermal</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2 h-2 rounded-[2px] bg-[#38BDF8]" />
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
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="settlementPeriod"
                    stroke="#5E626A"
                    fontSize={10}
                    tickLine={false}
                    fontFamily="JetBrains Mono"
                    label={{
                      value: 'Settlement Period (1 to 48)',
                      position: 'insideBottom',
                      offset: -10,
                      fill: '#71717A',
                      fontSize: 10,
                      fontFamily: 'Inter, sans-serif',
                    }}
                  />
                  <YAxis
                    stroke="#5E626A"
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
                        <div className="bg-[#121316] border border-white/[0.12] p-3 rounded-lg shadow-xl text-xs font-mono space-y-1">
                          <div className="text-[#EDEDEF] font-semibold font-sans border-b border-white/[0.08] pb-1">
                            {d.settlementDate} • SP {d.settlementPeriod} ({d.startTime?.split('T')[1]?.substring(0, 5)} UTC)
                          </div>
                          <div className="text-[#8A8F98]">Demand: {d.demand_mw.toLocaleString()} MW</div>
                          <div className="text-emerald-400">Actual Wind: {d.actual_mw.toLocaleString()} MW</div>
                          <div className="text-amber-400">Procured Thermal: {d.thermal_procured_mw.toLocaleString()} MW</div>
                          <div className="text-sky-400">Total Generation: {d.total_generation_mw.toLocaleString()} MW</div>
                          <div
                            className={`pt-1 border-t border-white/[0.08] font-semibold ${
                              d.margin_mw >= 0 ? 'text-emerald-400' : 'text-rose-400'
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
                    stroke="#F59E0B"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />

                  <Line
                    type="monotone"
                    dataKey="actual_mw"
                    name="Actual Wind"
                    stroke="#10B981"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="thermal_procured_mw"
                    name="Procured Thermal"
                    stroke="#F97316"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="total_generation_mw"
                    name="Total Generation"
                    stroke="#38BDF8"
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

