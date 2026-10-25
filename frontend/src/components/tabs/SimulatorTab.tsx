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
      <div className="bg-[#111113] border border-zinc-800/80 rounded-md p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 font-sans tracking-normal">
              Day-Ahead Thermal Procurement Simulator
            </h2>
            <p className="text-xs text-zinc-500 font-sans mt-0.5">
              Simulate procurement commitments on Day D-1 before {cutoffHour}:00 UTC gate closure against physical settlement outturn
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-sans">
            <span className="text-zinc-400">Delivery Date (D):</span>
            <select
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 px-2.5 py-1 rounded outline-none focus:border-zinc-600 font-mono text-xs cursor-pointer"
            >
              {availableDates.map((d) => (
                <option key={d} value={d} className="bg-zinc-900 text-zinc-200">
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Parameter Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Demand Slider */}
          <div className="bg-[#151518] p-3.5 rounded border border-zinc-800/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400 font-sans">Total Demand:</span>
              <span className="text-zinc-100 font-bold tabular-nums font-mono">{demandMw.toLocaleString()} MW</span>
            </div>
            <input
              type="range"
              min={15000}
              max={50000}
              step={1000}
              value={demandMw}
              onChange={(e) => setDemandMw(Number(e.target.value))}
              className="w-full accent-zinc-200 cursor-pointer h-1 bg-zinc-800 rounded"
            />
            <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
              <span>15 GW</span>
              <span>35 GW</span>
              <span>50 GW</span>
            </div>
          </div>

          {/* Risk Policy Selector */}
          <div className="bg-[#151518] p-3.5 rounded border border-zinc-800/80 md:col-span-2 space-y-2">
            <div className="text-xs text-zinc-400 font-sans">
              Risk Appetite & Thermal Buffer Policy:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => setRiskPolicy('naive')}
                className={`p-2.5 rounded border text-left transition-all ${
                  riskPolicy === 'naive'
                    ? 'bg-zinc-800 border-zinc-500 text-white shadow-sm'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="text-xs font-semibold font-sans">Naive Forecast</div>
                <div className="text-[11px] text-zinc-500 font-sans mt-0.5">Trust raw wind · 0 MW</div>
              </button>

              <button
                onClick={() => setRiskPolicy('bias')}
                className={`p-2.5 rounded border text-left transition-all ${
                  riskPolicy === 'bias'
                    ? 'bg-zinc-800 border-zinc-500 text-white shadow-sm'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="text-xs font-semibold font-sans">Bias-Adjusted</div>
                <div className="text-[11px] text-zinc-500 font-sans mt-0.5">Subtract MBE · -{kpi?.mbe_mw || 1840} MW</div>
              </button>

              <button
                onClick={() => setRiskPolicy('p90')}
                className={`p-2.5 rounded border text-left transition-all ${
                  riskPolicy === 'p90'
                    ? 'bg-zinc-800 border-zinc-500 text-white shadow-sm'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="text-xs font-semibold font-sans">P90 Buffer</div>
                <div className="text-[11px] text-zinc-500 font-sans mt-0.5">+{kpi?.p90_shortfall_mw || 4347} MW buffer</div>
              </button>

              <button
                onClick={() => setRiskPolicy('p95')}
                className={`p-2.5 rounded border text-left transition-all ${
                  riskPolicy === 'p95'
                    ? 'bg-zinc-800 border-zinc-500 text-white shadow-sm'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="text-xs font-semibold font-sans text-sky-400">P95 Buffer (Recommended)</div>
                <div className="text-[11px] text-zinc-400 font-sans mt-0.5">+{kpi?.p95_shortfall_mw || 5378} MW buffer</div>
              </button>
            </div>
          </div>
        </div>

        {/* Outcome Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-zinc-800/80 border border-zinc-800/80 rounded overflow-hidden">
          <div className="bg-[#111113] p-3.5">
            <span className="text-xs text-zinc-400 font-sans">Avg Wind Forecast</span>
            <div className="text-lg font-bold text-[#FAFAFA] font-mono tabular-nums mt-0.5">
              {avgWindForecast.toLocaleString()} <span className="text-xs text-zinc-400 font-normal">MW</span>
            </div>
          </div>

          <div className="bg-[#111113] p-3.5">
            <span className="text-xs text-zinc-400 font-sans">Thermal Buffer</span>
            <div className="text-lg font-bold text-[#FAFAFA] font-mono tabular-nums mt-0.5">
              +{policyBuffer.toLocaleString()} <span className="text-xs text-zinc-400 font-normal">MW</span>
            </div>
          </div>

          <div className="bg-[#111113] p-3.5">
            <span className="text-xs text-zinc-400 font-sans">Required Thermal</span>
            <div className="text-lg font-bold text-[#FAFAFA] font-mono tabular-nums mt-0.5">
              {avgThermalProcured.toLocaleString()} <span className="text-xs text-zinc-400 font-normal">MW</span>
            </div>
          </div>

          <div className="bg-[#111113] p-3.5 flex flex-col justify-between">
            <span className="text-xs text-zinc-400 font-sans">Periods Protected</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg font-bold text-[#FAFAFA] font-mono tabular-nums">
                {protectionPercent}%
              </span>
              <span className="text-xs text-zinc-400 font-sans">
                ({protectedCount}/{simulationData.length} SPs)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dispatch Timeline Chart */}
      <div className="bg-[#111113] border border-zinc-800/80 rounded-md overflow-hidden">
        <div className="h-10 px-4 border-b border-zinc-800/80 flex items-center justify-between">
          <span className="font-sans font-medium text-sm text-zinc-100 tracking-normal">
            Dispatch Balance Timeline
          </span>
          <span className="text-xs text-zinc-400 font-sans">
            Delivery Day {targetDate} · Policy: <strong className="text-zinc-200">{riskPolicy.toUpperCase()}</strong> (+{policyBuffer} MW)
          </span>
        </div>

        <div className="p-4 pt-2">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={simulationData}
                margin={{ top: 12, right: 36, left: 10, bottom: 26 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="settlementPeriod"
                  stroke="#52525B"
                  fontSize={10}
                  tickLine={false}
                  fontFamily="JetBrains Mono"
                  label={{ value: 'Settlement Period (1 to 48)', position: 'insideBottom', offset: -10, fill: '#71717A', fontSize: 10, fontFamily: 'Inter, sans-serif' }}
                />
                <YAxis
                  stroke="#52525B"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(val) => `${(val / 1000).toFixed(1)}k MW`}
                  fontFamily="JetBrains Mono"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#111113] border border-zinc-700/80 p-3 rounded shadow-xl text-xs font-mono space-y-1">
                        <div className="text-zinc-200 font-semibold font-sans border-b border-zinc-800 pb-1">
                          {d.settlementDate} • SP {d.settlementPeriod} ({d.startTime?.split('T')[1]?.substring(0, 5)} UTC)
                        </div>
                        <div className="text-zinc-400">Demand: {d.demand_mw.toLocaleString()} MW</div>
                        <div className="text-emerald-400">Actual Wind: {d.actual_mw.toLocaleString()} MW</div>
                        <div className="text-amber-400">Procured Thermal: {d.thermal_procured_mw.toLocaleString()} MW</div>
                        <div className="text-sky-400">Total Generation: {d.total_generation_mw.toLocaleString()} MW</div>
                        <div className={`pt-1 border-t border-zinc-800 font-semibold ${d.margin_mw >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {d.margin_mw >= 0 ? `+${d.margin_mw} MW Surplus` : `${d.margin_mw} MW Shortfall`}
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter, sans-serif' }} />

                <ReferenceLine
                  y={demandMw}
                  stroke="#F59E0B"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{ value: `Demand: ${(demandMw/1000).toFixed(0)}k MW`, fill: '#F59E0B', fontSize: 10, position: 'insideTopRight', fontFamily: 'JetBrains Mono' }}
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
      <div className="text-center py-2 text-xs text-zinc-500 font-sans">
        D-1 11:00 UTC auction cutoff · Calibrated on 1,488 settlement periods (Jan 2026) · P95 hedge protects against balancing mechanism cash-out penalties
      </div>
    </div>
  );
};
