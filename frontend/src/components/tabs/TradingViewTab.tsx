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
} from 'recharts';
import { TimeSeriesPoint } from '../../types/api';
import { Check } from 'lucide-react';

interface TradingViewTabProps {
  timeseries: TimeSeriesPoint[];
  p95Buffer: number;
  cutoffHour: number;
  theme?: 'dark' | 'light';
}

export const TradingViewTab: React.FC<TradingViewTabProps> = ({
  timeseries,
  p95Buffer,
  cutoffHour,
  theme = 'dark',
}) => {
  const [showLatest, setShowLatest] = useState(true);
  const [showBufferLine, setShowBufferLine] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<TimeSeriesPoint | null>(null);

  const isLight = theme === 'light';
  const actualColor = isLight ? '#059669' : '#10B981';
  const forecastColor = isLight ? '#2563EB' : '#60A5FA';
  const deficitColor = isLight ? '#D97706' : '#F59E0B';
  const gridColor = isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255,255,255,0.04)';
  const axisColor = isLight ? '#94A3B8' : '#5E626A';

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

  // Custom Rich Tooltip (Clean, Editorial, No Clutter, Light/Dark adaptive)
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const pt: TimeSeriesPoint = payload[0].payload;
    const isShortfall = pt.shortfall_mw > 0;

    return (
      <div
        className={`p-3 rounded-lg shadow-2xl text-xs font-mono max-w-xs space-y-2 ${
          isLight
            ? 'bg-white border border-slate-200 text-slate-800 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)]'
            : 'bg-[#121316] border border-white/[0.12] text-zinc-200'
        }`}
      >
        <div
          className={`pb-1.5 flex items-center justify-between text-[11px] border-b ${
            isLight ? 'border-slate-100' : 'border-white/[0.08]'
          }`}
        >
          <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-[#EDEDEF]'}`}>
            {pt.settlementDate} · SP {pt.settlementPeriod}
          </span>
          <span className={isLight ? 'text-slate-500' : 'text-[#8A8F98]'}>
            {formatXAxis(pt.startTime)} UTC
          </span>
        </div>

        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5 font-sans" style={{ color: actualColor }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: actualColor }} />
              Actual Wind (FUELHH):
            </span>
            <span className={`font-bold tabular-nums ${isLight ? 'text-slate-900' : 'text-[#F4F4F6]'}`}>
              {pt.actual_mw.toLocaleString()} MW
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5 font-sans" style={{ color: forecastColor }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: forecastColor }} />
              Day-Ahead (D-1 {cutoffHour}h):
            </span>
            <span className={`font-bold tabular-nums ${isLight ? 'text-slate-900' : 'text-[#F4F4F6]'}`}>
              {pt.day_ahead_forecast_mw.toLocaleString()} MW
            </span>
          </div>

          {showLatest && (
            <div className="flex justify-between items-center">
              <span className={`flex items-center gap-1.5 font-sans ${isLight ? 'text-slate-500' : 'text-[#8A8F98]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-slate-400' : 'bg-[#8A8F98]'}`} />
                Latest Forecast:
              </span>
              <span className={`tabular-nums ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                {pt.latest_forecast_mw.toLocaleString()} MW
              </span>
            </div>
          )}

          <div
            className={`pt-1.5 flex justify-between items-center font-sans border-t ${
              isLight ? 'border-slate-100 text-slate-500' : 'border-white/[0.08] text-[#8A8F98]'
            }`}
          >
            <span>Imbalance (Fcst - Act):</span>
            <span
              className={`font-mono font-bold ${
                isShortfall ? (isLight ? 'text-amber-600' : 'text-amber-400') : (isLight ? 'text-emerald-600' : 'text-emerald-400')
              }`}
            >
              {pt.error_mw > 0 ? `+${pt.error_mw}` : pt.error_mw} MW
            </span>
          </div>

          {isShortfall && (
            <div className="flex items-center justify-between text-[11px] font-sans pt-0.5">
              <span className={`font-medium ${isLight ? 'text-amber-600' : 'text-amber-400/90'}`}>
                Thermal Deficit:
              </span>
              <span className={`font-mono font-bold ${isLight ? 'text-amber-600' : 'text-amber-300'}`}>
                +{pt.shortfall_mw} MW
              </span>
            </div>
          )}
        </div>

        <div
          className={`pt-1 border-t text-[10px] flex items-center justify-between ${
            isLight ? 'border-slate-100 text-slate-400' : 'border-white/[0.08] text-[#5E626A]'
          }`}
        >
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
            <div
              className={`flex items-center gap-3 px-2.5 py-1 rounded-md border ${
                isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-[#090A0D] border-white/[0.08]'
              }`}
            >
              <span className={isLight ? 'text-slate-500 hidden sm:inline' : 'text-zinc-400 hidden sm:inline'}>
                {formatXAxis(hoveredPoint.startTime)} UTC
              </span>
              <span className="flex items-center gap-1.5" style={{ color: actualColor }}>
                Actual: {hoveredPoint.actual_mw.toLocaleString()} MW
              </span>
              <span className="flex items-center gap-1.5" style={{ color: forecastColor }}>
                DA: {hoveredPoint.day_ahead_forecast_mw.toLocaleString()} MW
              </span>
              <span
                className={`flex items-center gap-1.5 ${
                  hoveredPoint.error_mw > 0
                    ? isLight
                      ? 'text-amber-600'
                      : 'text-amber-400'
                    : isLight
                    ? 'text-slate-500'
                    : 'text-zinc-400'
                }`}
              >
                {hoveredPoint.error_mw > 0
                  ? `Shortfall: +${hoveredPoint.shortfall_mw.toLocaleString()} MW`
                  : `Surplus: ${Math.abs(hoveredPoint.error_mw).toLocaleString()} MW`}
              </span>
            </div>
          ) : (
            <div
              className={`flex items-center gap-3 px-2.5 py-1 rounded-md border ${
                isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-[#090A0D] border-white/[0.08]'
              }`}
            >
              <span
                className={`font-sans text-[11px] uppercase tracking-wider hidden sm:inline ${
                  isLight ? 'text-slate-400' : 'text-[#5E626A]'
                }`}
              >
                Period Avg:
              </span>
              <span className="flex items-center gap-1.5" style={{ color: actualColor }}>
                Actual: {averages.actual.toLocaleString()} MW
              </span>
              <span className="flex items-center gap-1.5" style={{ color: forecastColor }}>
                DA: {averages.forecast.toLocaleString()} MW
              </span>
              <span
                className={`flex items-center gap-1.5 ${
                  isLight ? 'text-amber-600' : 'text-amber-400'
                }`}
              >
                Deficit: +{averages.shortfall.toLocaleString()} MW
              </span>
            </div>
          )}
        </div>

        {/* Custom Pill Toggle Buttons */}
        <div className="flex items-center gap-2 text-xs font-sans">
          <button
            type="button"
            onClick={() => setShowLatest(!showLatest)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border ${
              showLatest
                ? isLight
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                  : 'bg-white/10 border-white/20 text-[#EDEDEF]'
                : isLight
                ? 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'
                : 'bg-[#0C0D0F] border-white/[0.05] text-[#5E626A] hover:text-[#8A8F98]'
            }`}
          >
            {showLatest && <Check className="w-3 h-3 text-current" />}
            <span>Intraday</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBufferLine(!showBufferLine)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border ${
              showBufferLine
                ? isLight
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                  : 'bg-white/10 border-white/20 text-[#EDEDEF]'
                : isLight
                ? 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'
                : 'bg-[#0C0D0F] border-white/[0.05] text-[#5E626A] hover:text-[#8A8F98]'
            }`}
          >
            {showBufferLine && <Check className="w-3 h-3 text-current" />}
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
                  <stop offset="0%" stopColor={actualColor} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={actualColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="startTime"
                tickFormatter={formatXAxis}
                stroke={axisColor}
                fontSize={10}
                tickLine={false}
                minTickGap={45}
                padding={{ left: 12, right: 24 }}
                fontFamily="JetBrains Mono"
              />
              <YAxis
                stroke={axisColor}
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => (val === 0 ? '0' : `${Math.round(val / 1000)}k`)}
                domain={[0, 'auto']}
                fontFamily="JetBrains Mono"
              />
              <Tooltip content={<CustomTooltip />} position={{ y: 16 }} />

              {/* Actual Wind Generation Area */}
              <Area
                type="monotone"
                dataKey="actual_mw"
                name="Actual Wind Generation"
                stroke={actualColor}
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
                stroke={forecastColor}
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
        <div className="h-9 px-6 border-b border-white/[0.05] flex items-center justify-between text-xs bg-[#0C0D12]">
          <div className="flex items-center gap-2">
            <span className="font-sans font-medium text-[12px] text-[#EDEDEF]">
              Forecast Error & Imbalance
            </span>
            <span className={isLight ? 'text-slate-400' : 'text-zinc-600'}>·</span>
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
              <span className={`w-2 h-2 rounded-[1px] ${isLight ? 'bg-slate-400' : 'bg-[#3F3F46]'}`} />
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
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="startTime"
                  tickFormatter={formatXAxis}
                  stroke={axisColor}
                  fontSize={10}
                  tickLine={false}
                  minTickGap={45}
                  padding={{ left: 12, right: 24 }}
                  fontFamily="JetBrains Mono"
                />
                <YAxis
                  stroke={axisColor}
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => {
                    if (val === 0) return '0';
                    const sign = val > 0 ? '+' : '';
                    return `${sign}${Math.round(val / 1000)}k`;
                  }}
                  fontFamily="JetBrains Mono"
                />
                {/* Single Tooltip Fix: Bottom chart only syncs cursor crosshair, does not show duplicate popup box */}
                <Tooltip content={() => null} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <ReferenceLine y={0} stroke={isLight ? '#CBD5E1' : '#3F3F46'} strokeWidth={1} />

                {showBufferLine && (
                  <ReferenceLine
                    y={p95Buffer}
                    stroke={deficitColor}
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
                    const fillColor = isShortfall ? deficitColor : (isLight ? '#94A3B8' : '#3F3F46');
                    const fillOpacity = isShortfall ? 0.8 : 0.6;
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
