import React, { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';

interface HeaderProps {
  activeTab: 'trading' | 'analytics' | 'simulator';
  isHealthy: boolean;
  onTabChange: (tab: 'trading' | 'analytics' | 'simulator') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  isHealthy,
  onTabChange,
}) => {
  return (
    <header className="h-13 border-b border-white/[0.06] bg-[#08090A]/85 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-[1400px] h-full mx-auto px-4 lg:px-6 flex items-center justify-between">
        {/* Left: Geometric Logo Mark & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#121316] border border-white/[0.08] flex items-center justify-center shadow-inner">
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-[#EDEDEF]"
              >
                <path
                  d="M1.5 8.5H4L6 3.5L10 12.5L12 8.5H14.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-[14px] font-semibold tracking-[-0.01em] text-[#EDEDEF] font-sans">
              GridPulse
            </span>
            <span className="text-[#5E626A] text-[13px] font-normal">/</span>
            <span className="text-[13px] text-[#8A8F98] font-sans hidden sm:inline">
              UK Day-Ahead Desk
            </span>
          </div>

          <div className="h-3.5 w-[1px] bg-white/[0.08] hidden md:block" />

          {/* Status Indicator */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#8A8F98] font-sans">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>Elexon BMRS Stream</span>
            <span>·</span>
            <span className="font-mono text-[11px] text-[#6E737D]">Jan 2026</span>
          </div>
        </div>

        {/* Center/Right: Clean Vercel-style Recessed Segmented Control */}
        <nav className="flex items-center bg-[#0C0D0F] p-0.5 rounded-lg border border-white/[0.06]">
          <button
            onClick={() => onTabChange('trading')}
            className={`px-3 py-1 text-[13px] font-sans font-medium rounded-md transition-all ${
              activeTab === 'trading'
                ? 'bg-[#18191E] text-[#EDEDEF] shadow-sm border border-white/[0.08]'
                : 'text-[#8A8F98] hover:text-[#EDEDEF]'
            }`}
          >
            Forecast Monitor
          </button>
          <button
            onClick={() => onTabChange('analytics')}
            className={`px-3 py-1 text-[13px] font-sans font-medium rounded-md transition-all ${
              activeTab === 'analytics'
                ? 'bg-[#18191E] text-[#EDEDEF] shadow-sm border border-white/[0.08]'
                : 'text-[#8A8F98] hover:text-[#EDEDEF]'
            }`}
          >
            Accuracy & Risk
          </button>
          <button
            onClick={() => onTabChange('simulator')}
            className={`px-3 py-1 text-[13px] font-sans font-medium rounded-md transition-all ${
              activeTab === 'simulator'
                ? 'bg-[#18191E] text-[#EDEDEF] shadow-sm border border-white/[0.08]'
                : 'text-[#8A8F98] hover:text-[#EDEDEF]'
            }`}
          >
            Procurement Simulator
          </button>
        </nav>
      </div>
    </header>
  );
};

interface ContextualControlBarProps {
  startDate: string;
  endDate: string;
  cutoffHour: number;
  interpolation: 'step' | 'linear';
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onCutoffHourChange: (hour: number) => void;
  onInterpolationChange: (mode: 'step' | 'linear') => void;
}

export const ContextualControlBar: React.FC<ContextualControlBarProps> = ({
  startDate,
  endDate,
  cutoffHour,
  interpolation,
  onStartDateChange,
  onEndDateChange,
  onCutoffHourChange,
  onInterpolationChange,
}) => {
  const [showCustomDates, setShowCustomDates] = useState(false);

  const PERIOD_PRESETS = [
    { label: 'Full Month · Jan 2026', start: '2026-01-01', end: '2026-01-31' },
    { label: 'Week 1 (1–7)', start: '2026-01-01', end: '2026-01-07' },
    { label: 'Week 2 (8–14)', start: '2026-01-08', end: '2026-01-14' },
    { label: 'Week 3 (15–21)', start: '2026-01-15', end: '2026-01-21' },
    { label: 'Week 4 (22–31)', start: '2026-01-22', end: '2026-01-31' },
  ];

  const CUTOFF_OPTIONS = [
    { hour: 6, label: '06:00 UTC (Early)' },
    { hour: 9, label: '09:00 UTC (Pre-Auction)' },
    { hour: 11, label: '11:00 UTC (UK DA Gate)' },
    { hour: 14, label: '14:00 UTC (Post-Auction)' },
    { hour: 17, label: '17:00 UTC (Evening Fix)' },
    { hour: 21, label: '21:00 UTC (Night)' },
    { hour: 23, label: '23:00 UTC (Pre-Midnight)' },
  ];

  const activePreset = PERIOD_PRESETS.find(
    (p) => p.start === startDate && p.end === endDate
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-1">
      {/* Left: Clean Segmented Period Selector */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center bg-[#0C0D0F] p-0.5 rounded-lg border border-white/[0.06]">
          {PERIOD_PRESETS.map((p) => {
            const isSelected = activePreset?.label === p.label && !showCustomDates;
            return (
              <button
                key={p.label}
                onClick={() => {
                  setShowCustomDates(false);
                  onStartDateChange(p.start);
                  onEndDateChange(p.end);
                }}
                className={`px-2.5 py-1 text-[12px] font-sans font-medium rounded-md transition-all ${
                  isSelected
                    ? 'bg-[#18191E] text-[#EDEDEF] shadow-sm border border-white/[0.08]'
                    : 'text-[#8A8F98] hover:text-[#EDEDEF]'
                }`}
              >
                {p.label}
              </button>
            );
          })}

          <button
            onClick={() => setShowCustomDates(!showCustomDates)}
            className={`px-2.5 py-1 text-[12px] font-sans font-medium rounded-md transition-all flex items-center gap-1.5 ${
              showCustomDates || !activePreset
                ? 'bg-[#18191E] text-[#EDEDEF] shadow-sm border border-white/[0.08]'
                : 'text-[#8A8F98] hover:text-[#EDEDEF]'
            }`}
          >
            <Calendar className="w-3 h-3 text-[#6E737D]" />
            <span>Custom</span>
          </button>
        </div>

        {/* Hidden or Tucked Custom Date Inputs */}
        {showCustomDates && (
          <div className="flex items-center gap-1.5 bg-[#121316] border border-white/[0.08] px-2.5 py-1 rounded-md text-[12px] animate-fadeIn">
            <input
              type="date"
              value={startDate}
              min="2026-01-01"
              max="2026-01-31"
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-transparent text-[#EDEDEF] outline-none font-mono text-[11px] cursor-pointer"
            />
            <span className="text-[#5E626A]">→</span>
            <input
              type="date"
              value={endDate}
              min="2026-01-01"
              max="2026-01-31"
              onChange={(e) => onEndDateChange(e.target.value)}
              className="bg-transparent text-[#EDEDEF] outline-none font-mono text-[11px] cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Right: Compact Custom-Styled Pill Selectors */}
      <div className="flex items-center gap-2">
        {/* Gate Cutoff Pill */}
        <div className="flex items-center gap-1.5 bg-[#121316] border border-white/[0.08] rounded-md px-2.5 py-1 text-[12px] text-[#EDEDEF] hover:border-white/[0.14] transition-all">
          <Clock className="w-3 h-3 text-[#8A8F98]" />
          <span className="text-[#8A8F98] text-[12px]">Gate Cutoff:</span>
          <select
            value={cutoffHour}
            onChange={(e) => onCutoffHourChange(Number(e.target.value))}
            className="bg-transparent text-[#EDEDEF] outline-none font-mono text-[11px] cursor-pointer"
          >
            {CUTOFF_OPTIONS.map((opt) => (
              <option key={opt.hour} value={opt.hour} className="bg-[#121316] text-[#EDEDEF]">
                D-1 {opt.hour}:00 UTC
              </option>
            ))}
          </select>
        </div>

        {/* Alignment Resolution Pill */}
        <div className="flex items-center bg-[#121316] border border-white/[0.08] rounded-md p-0.5 text-[12px] text-[#EDEDEF]">
          <span className="text-[#8A8F98] px-2 text-[12px]">Alignment:</span>
          <div className="flex items-center bg-[#0C0D0F] p-0.5 rounded border border-white/[0.05]">
            <button
              onClick={() => onInterpolationChange('step')}
              className={`px-2 py-0.5 rounded text-[11px] font-sans transition-all ${
                interpolation === 'step'
                  ? 'bg-[#18191E] text-[#EDEDEF] font-medium border border-white/[0.08]'
                  : 'text-[#6E737D] hover:text-[#EDEDEF]'
              }`}
              title="Step forward-fill 60-min WINDFOR to 30-min settlement intervals"
            >
              Step
            </button>
            <button
              onClick={() => onInterpolationChange('linear')}
              className={`px-2 py-0.5 rounded text-[11px] font-sans transition-all ${
                interpolation === 'linear'
                  ? 'bg-[#18191E] text-[#EDEDEF] font-medium border border-white/[0.08]'
                  : 'text-[#6E737D] hover:text-[#EDEDEF]'
              }`}
              title="Linear interpolation between hourly forecasts for :30 settlement periods"
            >
              Linear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
