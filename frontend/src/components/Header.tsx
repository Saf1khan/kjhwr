import React from 'react';
import { Calendar, Clock, Layers } from 'lucide-react';

interface HeaderProps {
  startDate: string;
  endDate: string;
  cutoffHour: number;
  interpolation: 'step' | 'linear';
  activeTab: 'trading' | 'analytics' | 'simulator';
  isHealthy: boolean;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onCutoffHourChange: (hour: number) => void;
  onInterpolationChange: (mode: 'step' | 'linear') => void;
  onTabChange: (tab: 'trading' | 'analytics' | 'simulator') => void;
}

export const Header: React.FC<HeaderProps> = ({
  startDate,
  endDate,
  cutoffHour,
  interpolation,
  activeTab,
  isHealthy,
  onStartDateChange,
  onEndDateChange,
  onCutoffHourChange,
  onInterpolationChange,
  onTabChange,
}) => {
  const PRESETS = [
    { label: 'Jan Full', start: '2026-01-01', end: '2026-01-31' },
    { label: 'W1', start: '2026-01-01', end: '2026-01-07' },
    { label: 'W2', start: '2026-01-08', end: '2026-01-14' },
    { label: 'W3', start: '2026-01-15', end: '2026-01-21' },
    { label: 'W4', start: '2026-01-22', end: '2026-01-31' },
  ];

  const CUTOFF_OPTIONS = [
    { hour: 6, label: '06:00 UTC (Early)' },
    { hour: 9, label: '09:00 UTC (Pre-Auction)' },
    { hour: 11, label: '11:00 UTC (UK DA Gate Closure)' },
    { hour: 14, label: '14:00 UTC (Post-Auction)' },
    { hour: 17, label: '17:00 UTC (Evening Fix)' },
    { hour: 21, label: '21:00 UTC (Night)' },
    { hour: 23, label: '23:00 UTC (Pre-Midnight)' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#09090B]/95 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
        {/* Tier 1: Top Navigation Bar (h-14) */}
        <div className="h-14 flex items-center justify-between border-b border-zinc-800/60">
          {/* Brand & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="font-sans text-base font-semibold tracking-tight text-zinc-100">
                GridPulse
              </span>
              <span className="text-xs text-zinc-400 font-sans hidden sm:inline">
                UK Day-Ahead Wind & Thermal Desk
              </span>
            </div>

            <div className="h-3 w-[1px] bg-zinc-800 hidden sm:block" />

            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-sans">
              <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>Elexon BMRS Stream</span>
              <span>·</span>
              <span className="font-mono text-[11px] text-zinc-400">Jan 2026</span>
            </div>
          </div>

          {/* Segmented Workspace Tabs (Human sentence-case without numbers) */}
          <nav className="flex items-center gap-1">
            <button
              onClick={() => onTabChange('trading')}
              className={`px-3 py-1.5 text-xs font-sans font-medium transition-all rounded ${
                activeTab === 'trading'
                  ? 'bg-zinc-800 text-white border border-zinc-700/80 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              Forecast Monitor
            </button>
            <button
              onClick={() => onTabChange('analytics')}
              className={`px-3 py-1.5 text-xs font-sans font-medium transition-all rounded ${
                activeTab === 'analytics'
                  ? 'bg-zinc-800 text-white border border-zinc-700/80 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              Accuracy & Risk
            </button>
            <button
              onClick={() => onTabChange('simulator')}
              className={`px-3 py-1.5 text-xs font-sans font-medium transition-all rounded ${
                activeTab === 'simulator'
                  ? 'bg-zinc-800 text-white border border-zinc-700/80 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              Procurement Simulator
            </button>
          </nav>
        </div>

        {/* Tier 2: Compact Trading Control Toolbar (h-11) */}
        <div className="h-11 flex items-center justify-between text-xs font-sans overflow-x-auto">
          {/* Left: Presets & Date Inputs */}
          <div className="flex items-center gap-3">
            {/* Quick Presets */}
            <div className="flex items-center gap-1 bg-zinc-900/90 p-0.5 rounded border border-zinc-800">
              {PRESETS.map((p) => {
                const isSelected = startDate === p.start && endDate === p.end;
                return (
                  <button
                    key={p.label}
                    onClick={() => {
                      onStartDateChange(p.start);
                      onEndDateChange(p.end);
                    }}
                    className={`px-2 py-0.5 text-[11px] font-sans font-medium rounded transition-all ${
                      isSelected
                        ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div className="h-4 w-[1px] bg-zinc-800" />

            {/* Custom Date Inputs */}
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <input
                type="date"
                value={startDate}
                min="2026-01-01"
                max="2026-01-31"
                onChange={(e) => onStartDateChange(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-200 px-2 py-0.5 rounded outline-none focus:border-zinc-600 font-mono text-[11px]"
              />
              <span className="text-zinc-600">→</span>
              <input
                type="date"
                value={endDate}
                min="2026-01-01"
                max="2026-01-31"
                onChange={(e) => onEndDateChange(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-200 px-2 py-0.5 rounded outline-none focus:border-zinc-600 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Right: D-1 Cutoff & Resolution Toggle */}
          <div className="flex items-center gap-3">
            <div className="h-4 w-[1px] bg-zinc-800" />

            {/* D-1 Cutoff Selector */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-400">D-1 Cutoff:</span>
              <select
                value={cutoffHour}
                onChange={(e) => onCutoffHourChange(Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-800 text-zinc-200 px-2 py-0.5 rounded outline-none focus:border-zinc-600 font-mono text-[11px] cursor-pointer"
              >
                {CUTOFF_OPTIONS.map((opt) => (
                  <option key={opt.hour} value={opt.hour} className="bg-zinc-900 text-zinc-200">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-4 w-[1px] bg-zinc-800" />

            {/* Alignment Resolution Segmented Toggle */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-zinc-400">Resolution:</span>
              <div className="flex items-center bg-zinc-900 p-0.5 rounded border border-zinc-800">
                <button
                  onClick={() => onInterpolationChange('step')}
                  className={`px-2 py-0.5 rounded text-[10px] font-sans transition-all ${
                    interpolation === 'step'
                      ? 'bg-zinc-800 text-zinc-100 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title="Step forward-fill 60-min WINDFOR to 30-min settlement intervals"
                >
                  Step
                </button>
                <button
                  onClick={() => onInterpolationChange('linear')}
                  className={`px-2 py-0.5 rounded text-[10px] font-sans transition-all ${
                    interpolation === 'linear'
                      ? 'bg-zinc-800 text-zinc-100 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title="Linear interpolation between hourly forecasts for :30 settlement periods"
                >
                  Linear
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
