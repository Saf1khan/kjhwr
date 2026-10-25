import React, { useState } from 'react';
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

  if (!timeseries || timeseries.length === 0) {
    return (
      <div className="surface-card p-12 text-center text-[#8A8F98] font-sans text-xs">
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

  // Custom Rich Institutional Tooltip
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
              <span className="text-amber-300">Thermal Deficit Procured:</span>
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
    <div className="space-y-4">
      {/* Main Dual-Series Generation Chart */}
      <div className="surface-card overflow-hidden">
        {/* Integrated Chart Header Bar in Human Sentence-Case */}
        <div className="h-12 px-5 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h2 className="font-sans font-medium text-[13px] text-[#EDEDEF]">
              Actual vs. Day-Ahead Wind Generation
            </h2>
            <span className="h-3 w-[1px] bg-white/[0.08]" />
            <span className="text-xs text-[#8A8F98] font-sans hidden sm:inline">
              30-min settlement resolution · D-1 {cutoffHour}:00 UTC cutoff (MW)
            </span>
            <span className="text-[#5E626A] hidden sm:inline">·</span>
            <span className="text-xs text-[#6E737D] font-mono hidden sm:inline">{timeseries.length} SPs</span>
          </div>

          {/* Integrated Controls & Custom Pill Toggles */}
          <div className="flex items-center gap-3 text-xs font-sans">
            {/* Legend indicators */}
            <div className="flex items-center gap-3 hidden md:flex">
              <span className="flex items-center gap-1.5 text-[#EDEDEF]">
                <span className="w-2.5 h-[2px] bg-emerald-400" />
                Actual
              </span>
              <span className="flex items-center gap-1.5 text-[#EDEDEF]">
                <span className="w-2.5 h-[2px] bg-sky-400" />
                Day-Ahead
              </span>
            </div>

            <span className="h-3.5 w-[1px] bg-white/[0.08] hidden md:block" />

            {/* Custom Clickable Pill Toggle Buttons */}
            <button
              type="button"
              onClick={() => setShowLatest(!showLatest)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border ${
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
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border ${
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

        {/* Chart Viewport */}
        <div className="p-4 pt-2">
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={timeseries}
                margin={{ top: 8, right: 24, left: 0, bottom: 4 }}
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

                {/* Actual Area with 1.5px stroke and vertical gradient fill */}
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

                {/* Day-Ahead Line with 1.5px stroke */}
                <Line
                  type="stepAfter"
                  dataKey="day_ahead_forecast_mw"
                  name="Day-Ahead Forecast"
                  stroke="#38BDF8"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />

                {/* Latest Intraday Line: subtle 1px dashed line */}
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

      {/* Imbalance & Wind Shortfall Bar Track */}
      <div className="surface-card overflow-hidden">
        <div className="h-11 px-5 border-b border-white/[0.06] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <h3 className="font-sans font-medium text-[13px] text-[#EDEDEF]">
              Forecast Error & Imbalance
            </h3>
            <span className="text-[#5E626A] hidden sm:inline">·</span>
            <span className="text-xs text-[#8A8F98] font-sans hidden sm:inline">
              Positive values indicate wind shortfalls requiring thermal power (MW)
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-sans text-[#8A8F98]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-[1px] bg-[#F59E0B]" />
              Wind Shortfall (Deficit)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-[1px] bg-[#3F3F46]" />
              Wind Surplus
            </span>
          </div>
        </div>

        <div className="p-4 pt-2">
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={timeseries}
                margin={{ top: 8, right: 24, left: 0, bottom: 4 }}
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
                    label={{
                      value: `P95 Buffer: +${p95Buffer.toLocaleString()} MW`,
                      fill: '#F59E0B',
                      fontSize: 10,
                      position: 'top',
                      fontFamily: 'JetBrains Mono',
                    }}
                  />
                )}

                <Bar
                  dataKey="error_mw"
                  name="Forecast Error"
                  isAnimationActive={false}
                  shape={(props: any) => {
                    const { x, y, width, height, value } = props;
                    const isShortfall = value > 0;
                    // Soft amber at 0.75 opacity for shortfall, subtle cool slate for surplus
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
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
