import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Brush,
} from 'recharts';
import { TimeSeriesPoint } from '../../types/api';

interface TradingViewTabProps {
  timeseries: TimeSeriesPoint[];
  p95Buffer: number;
  cutoffHour: number;
}

export const TradingViewTab: React.FC<TradingViewTabProps> = ({
  timeseries,
  p95Buffer,
  cutoffHour,
}) => {
  const [showLatest, setShowLatest] = useState(true);
  const [showBufferLine, setShowBufferLine] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<TimeSeriesPoint | null>(null);

  // Period averages for live header fallback
  const averages = useMemo(() => {
    if (!timeseries || timeseries.length === 0) return { actual: 0, forecast: 0, shortfall: 0 };
    const actual = Math.round(timeseries.reduce((acc, p) => acc + p.actual_mw, 0) / timeseries.length);
    const forecast = Math.round(timeseries.reduce((acc, p) => acc + p.day_ahead_forecast_mw, 0) / timeseries.length);
    const shortfall = Math.round(timeseries.reduce((acc, p) => acc + (p.shortfall_mw || 0), 0) / timeseries.length);
    return { actual, forecast, shortfall };
  }, [timeseries]);

  if (!timeseries || timeseries.length === 0) {
    return (
      <div className="p-12 text-center text-[#8A8F98] font-sans text-xs">
        Loading settlement intervals...
      </div>
    );
  }

  // Format short date for X-Axis tick
  const formatXAxis = (tickStr: string) => {
    try {
      const d = new Date(tickStr);
      const day = d.getUTCDate();
      const month = d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
      const hour = String(d.getUTCHours()).padStart(2, '0');
      const min = String(d.getUTCMinutes()).padStart(2, '0');
      return `${day} ${month} ${hour}:${min}`;
    } catch {
      return tickStr;
    }
  };

  const handleMouseMove = (state: any) => {
    if (state && state.activePayload && state.activePayload.length) {
      setHoveredPoint(state.activePayload[0].payload as TimeSeriesPoint);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  // Custom Rich Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const pt: TimeSeriesPoint = payload[0].payload;
    const isShortfall = pt.shortfall_mw > 0;

    return (
      <div className="bg-[#121316] border border-white/[0.12] p-3 rounded-lg shadow-2xl text-xs font-mono max-w-xs space-y-2">
        <div className="border-b border-white/[0.08] pb-1.5 flex items-center justify-between text-[11px]">
          <span className="font-semibold text-[#EDEDEF]">
            {pt.settlementDate} · SP {pt.settlementPeriod}
          </span>
          <span className="text-[#8A8F98]">
            {formatXAxis(pt.startTime)} UTC
          </span>
        </div>

        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between items-center">
            <span className="text-emerald-400 flex items-center gap-1.5 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Actual Wind (FUELHH):
            </span>
            <span className="text-[#F4F4F6] font-bold tabular-nums">{pt.actual_mw.toLocaleString()} MW</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sky-400 flex items-center gap-1.5 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              Day-Ahead (D-1 {cutoffHour}h):
            </span>
            <span className="text-[#F4F4F6] font-bold tabular-nums">{pt.day_ahead_forecast_mw.toLocaleString()} MW</span>
          </div>

          {showLatest && (
            <div className="flex justify-between items-center">
              <span className="text-[#8A8F98] flex items-center gap-1.5 font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8A8F98]" />
                Latest Forecast:
              </span>
              <span className="text-zinc-300 tabular-nums">{pt.latest_forecast_mw.toLocaleString()} MW</span>
            </div>
          )}

          <div className="border-t border-white/[0.08] pt-1.5 flex justify-between items-center font-sans">
            <span className="text-[#8A8F98]">Imbalance (Fcst - Act):</span>
            <span className={`font-mono font-bold ${isShortfall ? 'text-amber-400' : 'text-emerald-400'}`}>
              {pt.error_mw > 0 ? `+${pt.error_mw}` : pt.error_mw} MW
            </span>
          </div>

          {isShortfall && (
            <div className="bg-amber-950/20 border border-amber-800/40 p-1.5 rounded flex items-center justify-between text-[10px] font-sans">
              <span className="text-amber-300">Thermal Deficit:</span>
              <span className="text-amber-200 font-mono font-bold">+{pt.shortfall_mw} MW</span>
            </div>
          )}
        </div>

        <div className="pt-1 border-t border-white/[0.08] text-[10px] text-[#5E626A] flex items-center justify-between">
          <span>Pub: {pt.day_ahead_publish_time?.split('T')[1]?.substring(0, 5)} UTC</span>
          <span>Lead: {pt.day_ahead_lead_time_hours}h</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col bg-[#0A0B0E]">
      {/* 1. Live Interactive Header Bar with Telemetry Readout Strip */}
      <div className="h-12 px-6 border-b border-white/[0.07] flex items-center justify-between flex-wrap gap-3 bg-[#0C0D12]">
        <div className="flex items-center gap-3">
          <h2 className="font-sans font-medium text-[13px] text-[#EDEDEF]">
            Actual vs. Day-Ahead Wind Generation
          </h2>
          <span className="text-xs text-[#8A8F98] font-sans hidden xl:inline">
            (MW · D-1 {cutoffHour}:00 UTC cutoff)
          </span>
        </div>

        {/* Live Interactive Telemetry Strip */}
        <div className="flex items-center gap-4 text-xs font-mono">
          {hoveredPoint ? (
            <>
              <span className="text-zinc-400 hidden sm:inline">
                {formatXAxis(hoveredPoint.startTime)} UTC
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Actual: {hoveredPoint.actual_mw.toLocaleString()} MW
              </span>
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                DA: {hoveredPoint.day_ahead_forecast_mw.toLocaleString()} MW
              </span>
              <span
                className={`flex items-center gap-1.5 ${
                  hoveredPoint.error_mw > 0 ? 'text-amber-400' : 'text-zinc-400'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    hoveredPoint.error_mw > 0 ? 'bg-amber-400' : 'bg-zinc-500'
                  }`}
                />
                {hoveredPoint.error_mw > 0
                  ? `Shortfall: +${hoveredPoint.shortfall_mw.toLocaleString()} MW`
                  : `Surplus: ${Math.abs(hoveredPoint.error_mw).toLocaleString()} MW`}
              </span>
            </>
          ) : (
            <>
              <span className="text-[#5E626A] font-sans text-[11px] uppercase tracking-wider hidden sm:inline">
                Period Avg:
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400/90">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
                Actual: {averages.actual.toLocaleString()} MW
              </span>
              <span className="flex items-center gap-1.5 text-sky-400/90">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400/70" />
                DA: {averages.forecast.toLocaleString()} MW
              </span>
              <span className="flex items-center gap-1.5 text-amber-400/90">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70" />
                Deficit: +{averages.shortfall.toLocaleString()} MW
              </span>
            </>
          )}
        </div>

        {/* Custom Pill Toggle Buttons */}
        <div className="flex items-center gap-2 text-xs font-sans">
          <button
            type="button"
            onClick={() => setShowLatest(!showLatest)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all border ${
              showLatest
                ? 'bg-[#18191E] border-white/[0.12] text-[#EDEDEF]'
                : 'bg-[#0C0D0F] border-white/[0.05] text-[#5E626A] hover:text-[#8A8F98]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full transition-opacity ${
                showLatest ? 'bg-[#8A8F98] opacity-100' : 'bg-[#5E626A] opacity-30'
              }`}
            />
            <span>Intraday</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBufferLine(!showBufferLine)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all border ${
              showBufferLine
                ? 'bg-[#18191E] border-white/[0.12] text-[#EDEDEF]'
                : 'bg-[#0C0D0F] border-white/[0.05] text-[#5E626A] hover:text-[#8A8F98]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full transition-opacity ${
                showBufferLine ? 'bg-[#F59E0B] opacity-100' : 'bg-[#F59E0B] opacity-30'
              }`}
            />
            <span>P95 Buffer</span>
          </button>
        </div>
      </div>

      {/* 2. Main Generation Viewport (height={310}, syncId="windMonitor") */}
      <div className="p-6 pb-2">
        <div className="h-[310px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              syncId="windMonitor"
              data={timeseries}
              margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="startTime"
                tickFormatter={formatXAxis}
                stroke="#5E626A"
                fontSize={10}
                tickLine={false}
                minTickGap={45}
                padding={{ left: 12, right: 24 }}
                fontFamily="JetBrains Mono"
              />
              <YAxis
                stroke="#5E626A"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => (val === 0 ? '0' : `${Math.round(val / 1000)}k`)}
                domain={[0, 'auto']}
                fontFamily="JetBrains Mono"
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Actual Wind Generation Area */}
              <Area
                type="monotone"
                dataKey="actual_mw"
                name="Actual Wind Generation"
                stroke="#10B981"
                strokeWidth={1.5}
                fill="url(#actualGradient)"
                dot={false}
                isAnimationActive={false}
              />

              {/* Day-Ahead Forecast Line */}
              <Line
                type="stepAfter"
                dataKey="day_ahead_forecast_mw"
                name="Day-Ahead Forecast"
                stroke="#38BDF8"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />

              {/* Latest Intraday Line */}
              {showLatest && (
                <Line
                  type="stepAfter"
                  dataKey="latest_forecast_mw"
                  name="Latest Forecast"
                  stroke="#8A8F98"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Synced Imbalance Track (height={145}, syncId="windMonitor", edge-to-edge hairline divider) */}
      <div className="border-t border-white/[0.07] bg-[#0A0B0E]">
        <div className="h-9 px-6 border-b border-white/[0.05] flex items-center justify-between text-xs bg-[#0C0D12]/60">
          <div className="flex items-center gap-2">
            <span className="font-sans font-medium text-[12px] text-[#EDEDEF]">
              Forecast Error & Imbalance
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-[11px] text-[#8A8F98] font-sans">
              Positive values indicate wind shortfalls (MW)
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-sans text-[#8A8F98]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-[1px] bg-[#F59E0B]" />
              Shortfall Deficit
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-[1px] bg-[#3F3F46]" />
              Surplus
            </span>
          </div>
        </div>

        <div className="p-6 pt-2 pb-4">
          <div className="h-[145px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                syncId="windMonitor"
                data={timeseries}
                margin={{ top: 8, right: 24, left: 0, bottom: 4 }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="startTime"
                  tickFormatter={formatXAxis}
                  stroke="#5E626A"
                  fontSize={10}
                  tickLine={false}
                  minTickGap={45}
                  padding={{ left: 12, right: 24 }}
                  fontFamily="JetBrains Mono"
                />
                <YAxis
                  stroke="#5E626A"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => {
                    if (val === 0) return '0';
                    const sign = val > 0 ? '+' : '';
                    return `${sign}${Math.round(val / 1000)}k`;
                  }}
                  fontFamily="JetBrains Mono"
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#3F3F46" strokeWidth={1} />

                {showBufferLine && (
                  <ReferenceLine
                    y={p95Buffer}
                    stroke="#F59E0B"
                    strokeDasharray="4 4"
                    strokeWidth={1.25}
                  />
                )}

                <Bar
                  dataKey="error_mw"
                  name="Forecast Error"
                  isAnimationActive={false}
                  shape={(props: any) => {
                    const { x, y, width, height, value } = props;
                    const isShortfall = value > 0;
                    const fillColor = isShortfall ? '#F59E0B' : '#3F3F46';
                    const fillOpacity = isShortfall ? 0.75 : 0.8;
                    return (
                      <rect
                        x={x}
                        y={y}
                        width={Math.max(width - 1, 1)}
                        height={height}
                        fill={fillColor}
                        opacity={fillOpacity}
                        rx={0.5}
                      />
                    );
                  }}
                />

                {/* Dark timeline scrubber */}
                <Brush
                  dataKey="startTime"
                  height={20}
                  stroke="rgba(255,255,255,0.12)"
                  fill="#090A0D"
                  travellerWidth={8}
                  tickFormatter={() => ""}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
