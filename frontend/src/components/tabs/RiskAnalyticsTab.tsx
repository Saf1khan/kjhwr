import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  DailyBreakdownItem,
  DiurnalProfileItem,
  HistogramBucket,
  HorizonDegradationBucket,
  KpiSummary,
} from '../../types/api';
import { ArrowUpDown, ArrowRight } from 'lucide-react';

interface RiskAnalyticsTabProps {
  histogram: HistogramBucket[];
  daily: DailyBreakdownItem[];
  horizonDegradation: HorizonDegradationBucket[];
  diurnalProfile: DiurnalProfileItem[];
  kpi: KpiSummary | null;
  onSelectDayForSimulation?: (date: string) => void;
  theme?: 'dark' | 'light';
}

export const RiskAnalyticsTab: React.FC<RiskAnalyticsTabProps> = ({
  histogram,
  daily,
  horizonDegradation,
  diurnalProfile,
  kpi,
  onSelectDayForSimulation,
  theme = 'dark',
}) => {
  const [sortField, setSortField] = useState<keyof DailyBreakdownItem>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const isLight = theme === 'light';
  const gridColor = isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.04)';
  const axisColor = isLight ? '#94A3B8' : '#5E626A';
  const maeColor = isLight ? '#2563EB' : '#38BDF8';
  const p95Color = isLight ? '#6366F1' : '#818CF8';
  const actualColor = isLight ? '#059669' : '#10B981';

  const handleSort = (field: keyof DailyBreakdownItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedDaily = useMemo(() => {
    return [...daily].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }, [daily, sortField, sortAsc]);

  const maxDeficit = useMemo(() => {
    if (!daily || daily.length === 0) return 6857;
    return Math.max(...daily.map((d) => d.max_shortfall_mw), 6857);
  }, [daily]);

  const formatHorizonBucket = (bucketStr: string) => {
    if (bucketStr.includes('00-14h')) return '0–14h';
    if (bucketStr.includes('14-18h')) return '14–18h';
    if (bucketStr.includes('18-24h')) return '18–24h';
    if (bucketStr.includes('24-30h')) return '24–30h';
    if (bucketStr.includes('30-36h')) return '30–36h';
    if (bucketStr.includes('>36h')) return '>36h';
    return bucketStr;
  };

  return (
    <div className="flex flex-col bg-[#0A0B0E]">
      {/* Top Row: Histogram & Horizon Degradation side-by-side with 1px hairline divide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.07] border-b border-white/[0.07]">
        {/* Error Distribution Histogram */}
        <div className="flex flex-col">
          <div className="h-11 px-6 border-b border-white/[0.07] flex items-center justify-between bg-[#0C0D12]">
            <span className="font-sans font-medium text-[13px] text-[#EDEDEF]">
              Forecast Error Distribution
            </span>
            <span className="text-[11px] text-[#8A8F98] font-sans">
              Bin Centers (MW) · {histogram.length} bins
            </span>
          </div>

          <div className="p-6">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={histogram}
                  margin={{ top: 12, right: 15, left: -20, bottom: 5 }}
                  barCategoryGap="18%"
                >
                  <defs>
                    <linearGradient id="histOverGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.75} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.2} />
                    </linearGradient>
                    <linearGradient id="histUnderGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#64748B" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#64748B" stopOpacity={0.12} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="center_mw"
                    stroke={axisColor}
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}`}
                    fontFamily="JetBrains Mono"
                  />
                  <YAxis
                    stroke={axisColor}
                    fontSize={11}
                    tickLine={false}
                    fontFamily="JetBrains Mono"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const b: HistogramBucket = payload[0].payload;
                      return (
                        <div className="bg-[#121316] border border-white/[0.12] p-2.5 rounded-lg shadow-xl text-xs font-mono space-y-1">
                          <div className="text-[#EDEDEF] font-semibold font-sans">{b.label}</div>
                          <div className="text-sky-400">Count: {b.count} periods</div>
                          <div className="text-[#8A8F98]">Share: {b.percentage}% of month</div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine x={0} stroke="#3F3F46" strokeWidth={1} />
                  {kpi && (
                    <ReferenceLine
                      x={kpi.mbe_mw}
                      stroke="#F59E0B"
                      strokeDasharray="3 3"
                      label={{
                        value: `MBE (+${kpi.mbe_mw} MW)`,
                        fill: '#F59E0B',
                        fontSize: 10,
                        position: 'top',
                        fontFamily: 'JetBrains Mono',
                      }}
                    />
                  )}
                  <Bar
                    dataKey="count"
                    name="Settlement Periods"
                    maxBarSize={28}
                    isAnimationActive={false}
                    shape={(props: any) => {
                      const { x, y, width, height, payload } = props;
                      const isDeficit = payload.center_mw > 0;
                      return (
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={isDeficit ? 'url(#histOverGradient)' : 'url(#histUnderGradient)'}
                          rx={3}
                          ry={3}
                        />
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Horizon Degradation Chart */}
        <div className="flex flex-col">
          <div className="h-11 px-6 border-b border-white/[0.07] flex items-center justify-between bg-[#0C0D12]">
            <span className="font-sans font-medium text-[13px] text-[#EDEDEF]">
              Error by Forecast Horizon
            </span>
            {/* Custom Header Legend Pills (No Recharts -o- icon) */}
            <div className="flex items-center gap-3 text-xs font-sans">
              <div className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2 h-2 rounded-[2px] bg-[#38BDF8]" />
                <span className="text-[11px]">MAE</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2 h-2 rounded-[2px] bg-[#818CF8]" />
                <span className="text-[11px]">P95 Shortfall Buffer</span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={horizonDegradation}
                  margin={{ top: 12, right: 25, left: -10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="maeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="p95Gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818CF8" stopOpacity={0.10} />
                      <stop offset="100%" stopColor="#818CF8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="horizon_bucket"
                    tickFormatter={formatHorizonBucket}
                    padding={{ left: 24, right: 24 }}
                    stroke={axisColor}
                    fontSize={10}
                    tickLine={false}
                    fontFamily="JetBrains Mono"
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
                      const h: HorizonDegradationBucket = payload[0].payload;
                      return (
                        <div className="bg-[#121316] border border-white/[0.12] p-2.5 rounded-lg shadow-xl text-xs font-mono space-y-1">
                          <div className="text-[#EDEDEF] font-semibold font-sans">{h.horizon_bucket}</div>
                          <div className="text-[#8A8F98]">Avg Lead: {h.avg_lead_time_hours}h</div>
                          <div className="text-sky-400">MAE: {h.mae_mw.toLocaleString()} MW</div>
                          <div className="text-indigo-400">P95 Buffer: {h.p95_shortfall_mw.toLocaleString()} MW</div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="mae_mw"
                    name="MAE"
                    stroke={maeColor}
                    strokeWidth={1.75}
                    fill="url(#maeGradient)"
                    dot={{ r: 3, fill: '#0E0F12', stroke: maeColor, strokeWidth: 1.5 }}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="p95_shortfall_mw"
                    name="P95 Shortfall Buffer"
                    stroke={p95Color}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="url(#p95Gradient)"
                    dot={{ r: 3, fill: '#0E0F12', stroke: p95Color, strokeWidth: 1.5 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Diurnal Settlement Period Profile (SP 1 to 48) */}
      <div className="flex flex-col border-b border-white/[0.07]">
        <div className="h-11 px-6 border-b border-white/[0.07] flex items-center justify-between bg-[#0C0D12]">
          <span className="font-sans font-medium text-[13px] text-[#EDEDEF]">
            Diurnal Generation & Risk (SP 1–48)
          </span>
          {/* Custom Header Legend Pills (No Recharts -o- icon) */}
          <div className="flex items-center gap-3 text-xs font-sans">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: actualColor }} />
              <span className="text-[11px]">Actual Wind</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: maeColor }} />
              <span className="text-[11px]">Day-Ahead Forecast</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: p95Color }} />
              <span className="text-[11px]">P95 Shortfall Buffer</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={diurnalProfile}
                margin={{ top: 12, right: 15, left: -10, bottom: 5 }}
              >
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="time_of_day"
                  stroke={axisColor}
                  fontSize={10}
                  tickLine={false}
                  interval={3}
                  fontFamily="JetBrains Mono"
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
                    const dp: DiurnalProfileItem = payload[0].payload;
                    return (
                      <div className="bg-[#121316] border border-white/[0.12] p-2.5 rounded-lg shadow-xl text-xs font-mono space-y-1">
                        <div className="text-[#EDEDEF] font-semibold font-sans">
                          SP {dp.settlementPeriod} ({dp.time_of_day} UTC)
                        </div>
                        <div className="text-emerald-400">Actual Wind: {dp.avg_actual_mw.toLocaleString()} MW</div>
                        <div className="text-sky-400">Day-Ahead Fcst: {dp.avg_forecast_mw.toLocaleString()} MW</div>
                        <div className="text-amber-400">MAE: {dp.mae_mw} MW</div>
                        <div className="text-indigo-400">P95 Deficit: {dp.p95_shortfall_mw} MW</div>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avg_actual_mw"
                  name="Actual Wind"
                  stroke={actualColor}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="avg_forecast_mw"
                  name="Day-Ahead Forecast"
                  stroke={maeColor}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="p95_shortfall_mw"
                  name="P95 Shortfall Buffer"
                  stroke={p95Color}
                  strokeWidth={1.25}
                  strokeDasharray="3 3"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Daily Procurement & Risk Log */}
      <div className="flex flex-col">
        <div className="h-11 px-6 border-b border-white/[0.07] flex items-center justify-between bg-[#0C0D12]">
          <div className="flex items-center gap-2">
            <span className="font-sans font-medium text-[13px] text-[#EDEDEF]">
              Daily Procurement & Risk Log
            </span>
            <span className="text-[#5E626A]">·</span>
            <span className="text-[11px] text-[#8A8F98] font-sans">
              Click any delivery day to open in Procurement Simulator
            </span>
          </div>
          <span className="text-[11px] text-[#8A8F98] font-sans">
            January 2026 · {daily.length} days
          </span>
        </div>

        <div className="overflow-x-auto max-h-[380px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0E1015] text-[#8A8F98] sticky top-0 border-b border-white/[0.07] text-xs font-sans font-medium z-10">
              <tr>
                <th
                  onClick={() => handleSort('date')}
                  className="px-6 py-2.5 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1 font-medium">Date <ArrowUpDown className="w-3 h-3 text-[#5E626A]" /></div>
                </th>
                <th
                  onClick={() => handleSort('avg_actual_mw')}
                  className="px-4 py-2.5 cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1 font-medium">Actual (MW) <ArrowUpDown className="w-3 h-3 text-[#5E626A]" /></div>
                </th>
                <th
                  onClick={() => handleSort('avg_forecast_mw')}
                  className="px-4 py-2.5 cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1 font-medium">Forecast (MW) <ArrowUpDown className="w-3 h-3 text-[#5E626A]" /></div>
                </th>
                <th
                  onClick={() => handleSort('mae_mw')}
                  className="px-4 py-2.5 cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1 font-medium">MAE (MW) <ArrowUpDown className="w-3 h-3 text-[#5E626A]" /></div>
                </th>
                <th
                  onClick={() => handleSort('bias_mw')}
                  className="px-4 py-2.5 cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1 font-medium">Bias (MW) <ArrowUpDown className="w-3 h-3 text-[#5E626A]" /></div>
                </th>
                <th
                  onClick={() => handleSort('wape_percent')}
                  className="px-4 py-2.5 cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1 font-medium">WAPE (%) <ArrowUpDown className="w-3 h-3 text-[#5E626A]" /></div>
                </th>
                <th
                  onClick={() => handleSort('p95_shortfall_mw')}
                  className="px-4 py-2.5 cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1 font-medium">P95 Buffer <ArrowUpDown className="w-3 h-3 text-[#5E626A]" /></div>
                </th>
                <th
                  onClick={() => handleSort('max_shortfall_mw')}
                  className="px-6 py-2.5 cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1 font-medium">Peak Deficit <ArrowUpDown className="w-3 h-3 text-[#5E626A]" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] font-mono text-xs">
              {sortedDaily.map((row) => (
                <tr
                  key={row.date}
                  onClick={() => onSelectDayForSimulation?.(row.date)}
                  className="cursor-pointer hover:bg-white/[0.03] transition-colors group"
                >
                  <td className="px-6 py-2.5 font-medium text-zinc-200 font-sans">
                    {row.date}
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-300 tabular-nums">
                    {row.avg_actual_mw.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-300 tabular-nums">
                    {row.avg_forecast_mw.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-300 tabular-nums">
                    {row.mae_mw.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-amber-400/90 tabular-nums">
                    +{row.bias_mw.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">
                    {row.wape_percent}%
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-300 tabular-nums">
                    {row.p95_shortfall_mw.toLocaleString()}
                  </td>
                  <td className="px-6 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      <span className="text-zinc-200 font-medium tabular-nums">
                        {row.max_shortfall_mw.toLocaleString()}
                      </span>
                      {/* Visual inline mini progress bar relative to monthly max */}
                      <div className="w-14 h-1.5 bg-white/[0.06] rounded-full overflow-hidden flex-shrink-0">
                        <div
                          className="h-full bg-amber-400/80 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.round((row.max_shortfall_mw / maxDeficit) * 100))}%`,
                          }}
                        />
                      </div>
                      {/* Subtle hover action hint */}
                      <span className="text-[11px] text-sky-400 font-sans opacity-0 group-hover:opacity-100 transition-opacity pl-1 flex items-center gap-0.5 flex-shrink-0">
                        Simulate <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

