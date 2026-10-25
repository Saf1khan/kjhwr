import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  DailyBreakdownItem,
  DiurnalProfileItem,
  HistogramBucket,
  HorizonDegradationBucket,
  KpiSummary,
} from '../../types/api';
import { ArrowUpDown } from 'lucide-react';

interface RiskAnalyticsTabProps {
  histogram: HistogramBucket[];
  daily: DailyBreakdownItem[];
  horizonDegradation: HorizonDegradationBucket[];
  diurnalProfile: DiurnalProfileItem[];
  kpi: KpiSummary | null;
}

export const RiskAnalyticsTab: React.FC<RiskAnalyticsTabProps> = ({
  histogram,
  daily,
  horizonDegradation,
  diurnalProfile,
  kpi,
}) => {
  const [sortField, setSortField] = useState<keyof DailyBreakdownItem>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (field: keyof DailyBreakdownItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedDaily = [...daily].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
  });

  const formatHorizonBucket = (bucketStr: string) => {
    if (bucketStr.includes('00-14h')) return '0–14h (Near)';
    if (bucketStr.includes('14-18h')) return '14–18h (Pre-Gate)';
    if (bucketStr.includes('18-24h')) return '18–24h (DA Gate)';
    if (bucketStr.includes('24-30h')) return '24–30h (DA Early)';
    if (bucketStr.includes('30-36h')) return '30–36h (DA Night)';
    if (bucketStr.includes('>36h')) return '>36h (Extended)';
    return bucketStr;
  };

  return (
    <div className="space-y-4">
      {/* Top Row: Histogram & Horizon Degradation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Error Distribution Histogram */}
        <div className="bg-[#111113] border border-zinc-800/80 rounded-md overflow-hidden">
          <div className="h-10 px-4 border-b border-zinc-800/80 flex items-center justify-between">
            <span className="font-sans font-medium text-sm text-zinc-100 tracking-normal">
              Forecast Error Distribution (MW)
            </span>
            <span className="text-xs text-zinc-500 font-mono">{histogram.length} bins</span>
          </div>

          <div className="p-4 pt-2">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogram} margin={{ top: 12, right: 15, left: -10, bottom: 15 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="center_mw"
                    stroke="#52525B"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}`}
                    fontFamily="JetBrains Mono"
                  />
                  <YAxis
                    stroke="#52525B"
                    fontSize={10}
                    tickLine={false}
                    fontFamily="JetBrains Mono"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const b: HistogramBucket = payload[0].payload;
                      return (
                        <div className="bg-[#111113] border border-zinc-700/80 p-2.5 rounded shadow-xl text-xs font-mono space-y-1">
                          <div className="text-zinc-200 font-semibold font-sans">{b.label}</div>
                          <div className="text-sky-400">Count: {b.count} periods</div>
                          <div className="text-zinc-400">Share: {b.percentage}% of month</div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine x={0} stroke="#52525B" strokeWidth={1} />
                  {kpi && (
                    <ReferenceLine
                      x={kpi.mbe_mw}
                      stroke="#F59E0B"
                      strokeDasharray="3 3"
                      label={{ value: `Mean Bias (+${kpi.mbe_mw} MW)`, fill: '#F59E0B', fontSize: 10, position: 'top', fontFamily: 'JetBrains Mono' }}
                    />
                  )}
                  <Bar
                    dataKey="count"
                    name="Settlement Periods"
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
                          fill={isDeficit ? '#6366F1' : '#52525B'}
                          opacity={0.85}
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
        <div className="bg-[#111113] border border-zinc-800/80 rounded-md overflow-hidden">
          <div className="h-10 px-4 border-b border-zinc-800/80 flex items-center justify-between">
            <span className="font-sans font-medium text-sm text-zinc-100 tracking-normal">
              Error by Forecast Horizon
            </span>
            <span className="text-xs text-zinc-500 font-sans">Lead time degradation</span>
          </div>

          <div className="p-4 pt-2">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={horizonDegradation} margin={{ top: 12, right: 32, left: 5, bottom: 15 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="horizon_bucket"
                    tickFormatter={formatHorizonBucket}
                    padding={{ left: 24, right: 28 }}
                    stroke="#52525B"
                    fontSize={10}
                    tickLine={false}
                    fontFamily="JetBrains Mono"
                  />
                  <YAxis
                    stroke="#52525B"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => `${val} MW`}
                    fontFamily="JetBrains Mono"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const h: HorizonDegradationBucket = payload[0].payload;
                      return (
                        <div className="bg-[#111113] border border-zinc-700/80 p-2.5 rounded shadow-xl text-xs font-mono space-y-1">
                          <div className="text-zinc-100 font-semibold font-sans">{h.horizon_bucket}</div>
                          <div className="text-zinc-400">Avg Lead: {h.avg_lead_time_hours}h</div>
                          <div className="text-sky-400">MAE: {h.mae_mw} MW</div>
                          <div className="text-indigo-400">P95 Buffer: {h.p95_shortfall_mw} MW</div>
                        </div>
                      );
                    }}
                  />
                  <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter, sans-serif' }} />
                  <Line
                    type="monotone"
                    dataKey="mae_mw"
                    name="MAE (MW)"
                    stroke="#38BDF8"
                    strokeWidth={1.75}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="p95_shortfall_mw"
                    name="P95 Shortfall Buffer (MW)"
                    stroke="#818CF8"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Diurnal Settlement Period Profile (SP 1 to 48) */}
      <div className="bg-[#111113] border border-zinc-800/80 rounded-md overflow-hidden">
        <div className="h-10 px-4 border-b border-zinc-800/80 flex items-center justify-between">
          <span className="font-sans font-medium text-sm text-zinc-100 tracking-normal">
            Diurnal Generation & Risk (SP 1–48)
          </span>
          <span className="text-xs text-zinc-500 font-sans">30-min settlement aggregate</span>
        </div>

        <div className="p-4 pt-2">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={diurnalProfile} margin={{ top: 12, right: 15, left: 0, bottom: 5 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="time_of_day"
                  stroke="#52525B"
                  fontSize={10}
                  tickLine={false}
                  interval={3}
                  fontFamily="JetBrains Mono"
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
                    const dp: DiurnalProfileItem = payload[0].payload;
                    return (
                      <div className="bg-[#111113] border border-zinc-700/80 p-2.5 rounded shadow-xl text-xs font-mono space-y-1">
                        <div className="text-zinc-100 font-semibold font-sans">
                          SP {dp.settlementPeriod} ({dp.time_of_day} UTC)
                        </div>
                        <div className="text-emerald-400">Actual Wind: {dp.avg_actual_mw.toLocaleString()} MW</div>
                        <div className="text-sky-400">Day-Ahead Fcst: {dp.avg_forecast_mw.toLocaleString()} MW</div>
                        <div className="text-amber-400">MAE: {dp.mae_mw} MW</div>
                        <div className="text-rose-400">P95 Deficit: {dp.p95_shortfall_mw} MW</div>
                      </div>
                    );
                  }}
                />
                <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter, sans-serif' }} />
                <Line
                  type="monotone"
                  dataKey="avg_actual_mw"
                  name="Actual Wind"
                  stroke="#10B981"
                  strokeWidth={1.75}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="avg_forecast_mw"
                  name="Day-Ahead Forecast"
                  stroke="#38BDF8"
                  strokeWidth={1.75}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="p95_shortfall_mw"
                  name="P95 Shortfall Risk"
                  stroke="#F43F5E"
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

      {/* Daily Breakdown Table */}
      <div className="bg-[#111113] border border-zinc-800/80 rounded-md overflow-hidden">
        <div className="h-10 px-4 border-b border-zinc-800/80 flex items-center justify-between">
          <span className="font-sans font-medium text-sm text-zinc-100 tracking-normal">
            Daily Procurement & Risk Log
          </span>
          <span className="text-xs text-zinc-500 font-sans">January 2026 · {daily.length} days</span>
        </div>

        <div className="overflow-x-auto max-h-[360px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#151518] text-zinc-400 sticky top-0 border-b border-zinc-800 text-xs font-sans font-medium">
              <tr>
                <th
                  onClick={() => handleSort('date')}
                  className="px-4 py-2.5 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1 font-medium">Date <ArrowUpDown className="w-3 h-3 text-zinc-600" /></div>
                </th>
                <th
                  onClick={() => handleSort('avg_actual_mw')}
                  className="px-4 py-2.5 cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1 font-medium">Actual (MW) <ArrowUpDown className="w-3 h-3 text-zinc-600" /></div>
                </th>
                <th
                  onClick={() => handleSort('avg_forecast_mw')}
                  className="px-4 py-2.5 cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1 font-medium">Forecast (MW) <ArrowUpDown className="w-3 h-3 text-zinc-600" /></div>
                </th>
                <th
                  onClick={() => handleSort('mae_mw')}
                  className="px-4 py-2.5 cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1 font-medium">MAE (MW) <ArrowUpDown className="w-3 h-3 text-zinc-600" /></div>
                </th>
                <th
                  onClick={() => handleSort('bias_mw')}
                  className="px-4 py-2.5 cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1 font-medium">Bias (MW) <ArrowUpDown className="w-3 h-3 text-zinc-600" /></div>
                </th>
                <th
                  onClick={() => handleSort('wape_percent')}
                  className="px-4 py-2.5 cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1 font-medium">WAPE (%) <ArrowUpDown className="w-3 h-3 text-zinc-600" /></div>
                </th>
                <th
                  onClick={() => handleSort('p95_shortfall_mw')}
                  className="px-4 py-2.5 cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1 font-medium">P95 Buffer <ArrowUpDown className="w-3 h-3 text-zinc-600" /></div>
                </th>
                <th
                  onClick={() => handleSort('max_shortfall_mw')}
                  className="px-4 py-2.5 cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1 font-medium">Peak Deficit <ArrowUpDown className="w-3 h-3 text-zinc-600" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
              {sortedDaily.map((row) => (
                <tr key={row.date} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-2 font-medium text-zinc-300 font-sans">{row.date}</td>
                  <td className="px-4 py-2 text-right text-emerald-400 tabular-nums">{row.avg_actual_mw.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-sky-400 tabular-nums">{row.avg_forecast_mw.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-zinc-100 font-semibold tabular-nums">{row.mae_mw.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-amber-300 tabular-nums">+{row.bias_mw.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-zinc-400 tabular-nums">{row.wape_percent}%</td>
                  <td className="px-4 py-2 text-right text-rose-300 tabular-nums">{row.p95_shortfall_mw.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-rose-400 font-bold tabular-nums">{row.max_shortfall_mw.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
