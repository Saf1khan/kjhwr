import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { KpiSummary, TimeSeriesPoint } from '../../types/api';

interface SimulatorTabProps {
  timeseries: TimeSeriesPoint[];
  kpi: KpiSummary | null;
  cutoffHour: number;
}

export const SimulatorTab: React.FC<SimulatorTabProps> = ({
  timeseries,
  kpi,
  cutoffHour,
}) => {
  // Simulator State
  const [targetDate, setTargetDate] = useState<string>('2026-01-05');
  const [demandMw, setDemandMw] = useState<number>(35000);
  const [riskPolicy, setRiskPolicy] = useState<'naive' | 'bias' | 'p90' | 'p95'>('p95');

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
    <div className="space-y-4">
      {/* Top Configuration Bar */}
      <div className="surface-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3.5">
          <div>
            <h2 className="text-[14px] font-semibold text-[#EDEDEF] font-sans tracking-normal">
              Day-Ahead Thermal Procurement Simulator
            </h2>
            <p className="text-xs text-[#8A8F98] font-sans mt-0.5">
              Simulate commitments on Day D-1 before {cutoffHour}:00 UTC gate closure against physical settlement outturn
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-sans">
            <span className="text-[#8A8F98]">Delivery Date (D):</span>
            <select
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-[#121316] border border-white/[0.08] text-[#EDEDEF] px-2.5 py-1 rounded-md outline-none focus:border-white/[0.14] font-mono text-[11px] cursor-pointer"
            >
              {availableDates.map((d) => (
                <option key={d} value={d} className="bg-[#121316] text-[#EDEDEF]">
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Parameter Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Demand Slider */}
          <div className="surface-well p-3.5 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#8A8F98] font-sans">Total Demand:</span>
              <span className="text-[#EDEDEF] font-bold tabular-nums font-mono">{demandMw.toLocaleString()} MW</span>
            </div>
            <input
              type="range"
              min={15000}
              max={50000}
              step={1000}
              value={demandMw}
              onChange={(e) => setDemandMw(Number(e.target.value))}
              className="w-full accent-[#38BDF8] cursor-pointer h-1 bg-[#18191E] rounded"
            />
            <div className="flex justify-between text-[10px] text-[#5E626A] font-mono">
              <span>15 GW</span>
              <span>35 GW</span>
              <span>50 GW</span>
            </div>
          </div>

          {/* Risk Policy Selector */}
          <div className="surface-well p-3.5 rounded-lg md:col-span-2 space-y-2">
            <div className="text-xs text-[#8A8F98] font-sans">
              Risk Appetite & Thermal Buffer Policy:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setRiskPolicy('naive')}
                className={`relative p-2.5 rounded-lg text-left transition-all ${
                  riskPolicy === 'naive'
                    ? 'surface-card border-[#38BDF8] shadow-[inset_0_1px_0_0_rgba(56,189,248,0.2)]'
                    : 'bg-[#0C0D0F] border border-white/[0.06] hover:border-white/[0.12] hover:bg-[#121316]'
                }`}
              >
                {riskPolicy === 'naive' && (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
                )}
                <div className="text-xs font-semibold font-sans text-[#EDEDEF]">Naive Forecast</div>
                <div className="text-[11px] text-[#8A8F98] font-sans mt-0.5">Trust raw wind · 0 MW</div>
              </button>

              <button
                type="button"
                onClick={() => setRiskPolicy('bias')}
                className={`relative p-2.5 rounded-lg text-left transition-all ${
                  riskPolicy === 'bias'
                    ? 'surface-card border-[#38BDF8] shadow-[inset_0_1px_0_0_rgba(56,189,248,0.2)]'
                    : 'bg-[#0C0D0F] border border-white/[0.06] hover:border-white/[0.12] hover:bg-[#121316]'
                }`}
              >
                {riskPolicy === 'bias' && (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
                )}
                <div className="text-xs font-semibold font-sans text-[#EDEDEF]">Bias-Adjusted</div>
                <div className="text-[11px] text-[#8A8F98] font-sans mt-0.5">Subtract MBE · -{kpi?.mbe_mw || 1840} MW</div>
              </button>

              <button
                type="button"
                onClick={() => setRiskPolicy('p90')}
                className={`relative p-2.5 rounded-lg text-left transition-all ${
                  riskPolicy === 'p90'
                    ? 'surface-card border-[#38BDF8] shadow-[inset_0_1px_0_0_rgba(56,189,248,0.2)]'
                    : 'bg-[#0C0D0F] border border-white/[0.06] hover:border-white/[0.12] hover:bg-[#121316]'
                }`}
              >
                {riskPolicy === 'p90' && (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
                )}
                <div className="text-xs font-semibold font-sans text-[#EDEDEF]">P90 Buffer</div>
                <div className="text-[11px] text-[#8A8F98] font-sans mt-0.5">+{kpi?.p90_shortfall_mw || 4347} MW buffer</div>
              </button>

              <button
                type="button"
                onClick={() => setRiskPolicy('p95')}
                className={`relative p-2.5 rounded-lg text-left transition-all ${
                  riskPolicy === 'p95'
                    ? 'surface-card border-[#38BDF8] shadow-[inset_0_1px_0_0_rgba(56,189,248,0.2)]'
                    : 'bg-[#0C0D0F] border border-white/[0.06] hover:border-white/[0.12] hover:bg-[#121316]'
                }`}
              >
                {riskPolicy === 'p95' && (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
                )}
                <div className="text-xs font-semibold font-sans text-[#EDEDEF]">P95 Buffer</div>
                <div className="text-[11px] text-[#38BDF8] font-sans mt-0.5">+{kpi?.p95_shortfall_mw || 5378} MW buffer</div>
              </button>
            </div>
          </div>
        </div>

        {/* Outcome Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
          <div className="surface-well p-3.5 rounded-lg flex flex-col justify-between">
            <span className="text-[12px] font-medium text-[#8A8F98] font-sans">Avg Wind Forecast</span>
            <div className="metric-value text-[24px] font-semibold text-[#F4F4F6] my-1">
              {avgWindForecast.toLocaleString()} <span className="text-[13px] font-normal text-[#6E737D]">MW</span>
            </div>
            <span className="text-[11px] text-[#5E626A] font-mono">DAY-AHEAD</span>
          </div>

          <div className="surface-well p-3.5 rounded-lg flex flex-col justify-between">
            <span className="text-[12px] font-medium text-[#8A8F98] font-sans">Thermal Buffer</span>
            <div className="metric-value text-[24px] font-semibold text-[#F4F4F6] my-1">
              +{policyBuffer.toLocaleString()} <span className="text-[13px] font-normal text-[#6E737D]">MW</span>
            </div>
            <span className="text-[11px] text-[#5E626A] font-mono">{riskPolicy.toUpperCase()} POLICY</span>
          </div>

          <div className="surface-well p-3.5 rounded-lg flex flex-col justify-between">
            <span className="text-[12px] font-medium text-[#8A8F98] font-sans">Required Thermal</span>
            <div className="metric-value text-[24px] font-semibold text-[#F4F4F6] my-1">
              {avgThermalProcured.toLocaleString()} <span className="text-[13px] font-normal text-[#6E737D]">MW</span>
            </div>
            <span className="text-[11px] text-[#5E626A] font-mono">D-1 COMMITTED</span>
          </div>

          <div className="surface-well p-3.5 rounded-lg flex flex-col justify-between">
            <span className="text-[12px] font-medium text-[#8A8F98] font-sans">Periods Protected</span>
            <div className="metric-value text-[24px] font-semibold text-[#F4F4F6] my-1">
              {protectionPercent}%
            </div>
            <span className="text-[11px] text-[#8A8F98] font-sans">({protectedCount}/{simulationData.length} SPs covered)</span>
          </div>
        </div>
      </div>

      {/* Dispatch Timeline Chart */}
      <div className="surface-card overflow-hidden">
        <div className="h-11 px-5 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="font-sans font-medium text-[13px] text-[#EDEDEF]">
              Dispatch Balance Timeline
            </span>
            <span className="text-[#5E626A]">·</span>
            <span className="text-xs text-[#8A8F98] font-sans">
              Delivery Day {targetDate} · Policy: <strong className="text-[#EDEDEF]">{riskPolicy.toUpperCase()}</strong> (+{policyBuffer} MW)
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-sans text-amber-400">
            <span className="w-3 h-0 border-b border-dashed border-amber-400 inline-block" />
            <span>System Demand ({demandMw.toLocaleString()} MW)</span>
          </div>
        </div>

        <div className="p-4 pt-2">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={simulationData}
                margin={{ top: 12, right: 36, left: -10, bottom: 26 }}
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
                        <div className={`pt-1 border-t border-white/[0.08] font-semibold ${d.margin_mw >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {d.margin_mw >= 0 ? `+${d.margin_mw} MW Surplus` : `${d.margin_mw} MW Shortfall`}
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={28}
                  wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter, sans-serif' }}
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

      {/* Methodology Compact Footer Note */}
      <div className="text-center py-2 text-xs text-[#6E737D] font-sans">
        D-1 11:00 UTC auction cutoff · Calibrated on 1,488 settlement periods (Jan 2026) · P95 hedge protects against balancing mechanism cash-out penalties
      </div>
    </div>
  );
};
