import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Check } from 'lucide-react';

export type PresetType = 'full' | 'w1' | 'w2' | 'w3' | 'w4' | 'custom';

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
  const tabs: { id: 'trading' | 'analytics' | 'simulator'; label: string }[] = [
    { id: 'trading', label: 'Forecast Monitor' },
    { id: 'analytics', label: 'Accuracy & Risk' },
    { id: 'simulator', label: 'Procurement Simulator' },
  ];

  return (
    <header className="h-14 border-b border-white/[0.06] bg-[#08090A]/85 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-[1400px] h-full mx-auto px-4 lg:px-6 flex items-center justify-between">
        {/* Left: Bespoke Geometric SVG Mark & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            {/* Bespoke Parallel Vector Bars */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="flex-shrink-0"
            >
              <path
                d="M4.5 15.5L9.5 4.5"
                stroke="#38BDF8"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M10.5 15.5L15.5 4.5"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-white font-sans">
              GridPulse
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-zinc-400 border border-white/[0.07] hidden sm:inline">
              GB · BMRS
            </span>
          </div>

          <div className="h-3.5 w-[1px] bg-white/[0.08] hidden md:block" />

          {/* Status Indicator */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-zinc-400 font-sans">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>Elexon BMRS Stream</span>
            <span>·</span>
            <span className="font-mono text-[11px] text-zinc-500">Jan 2026</span>
          </div>
        </div>

        {/* Center/Right: Recessed Segmented Dock with Spring Layout Animation */}
        <nav className="flex items-center bg-[#0D0E12] p-1 rounded-lg border border-white/[0.07]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative px-3.5 py-1 text-[13px] font-sans font-medium rounded-md transition-colors ${
                  isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="workspaceTabPill"
                    className="absolute inset-0 bg-[#1A1D24] border border-white/[0.1] rounded-md shadow-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

interface ContextualControlBarProps {
  startDate: string;
  endDate: string;
  activePreset: PresetType;
  cutoffHour: number;
  interpolation: 'step' | 'linear';
  onDateRangeChange: (start: string, end: string, preset: PresetType) => void;
  onCutoffHourChange: (hour: number) => void;
  onInterpolationChange: (mode: 'step' | 'linear') => void;
}

export const ContextualControlBar: React.FC<ContextualControlBarProps> = ({
  startDate,
  endDate,
  activePreset,
  cutoffHour,
  interpolation,
  onDateRangeChange,
  onCutoffHourChange,
  onInterpolationChange,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomStart(startDate);
    setCustomEnd(endDate);
  }, [startDate, endDate]);

  // Click outside listener for the anchored popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPopoverOpen]);

  const PRESET_OPTIONS: { id: PresetType; label: string; start: string; end: string }[] = [
    { id: 'full', label: 'Full Month · Jan 2026', start: '2026-01-01', end: '2026-01-31' },
    { id: 'w1', label: 'Week 1 (1–7)', start: '2026-01-01', end: '2026-01-07' },
    { id: 'w2', label: 'Week 2 (8–14)', start: '2026-01-08', end: '2026-01-14' },
    { id: 'w3', label: 'Week 3 (15–21)', start: '2026-01-15', end: '2026-01-21' },
    { id: 'w4', label: 'Week 4 (22–31)', start: '2026-01-22', end: '2026-01-31' },
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

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStart && customEnd) {
      onDateRangeChange(customStart, customEnd, 'custom');
      setIsPopoverOpen(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-1">
      {/* Left: Clean Segmented Period Selector with Spring Pill */}
      <div className="flex items-center bg-[#0C0D0F] p-0.5 rounded-lg border border-white/[0.06]">
        {PRESET_OPTIONS.map((p) => {
          const isSelected = activePreset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                onDateRangeChange(p.start, p.end, p.id);
                setIsPopoverOpen(false);
              }}
              className={`relative px-2.5 py-1 text-[12px] font-sans font-medium rounded-md transition-colors ${
                isSelected ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="activePresetPill"
                  className="absolute inset-0 bg-[#18191E] border border-white/[0.08] rounded-md shadow-sm"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10">{p.label}</span>
            </button>
          );
        })}

        {/* Custom Button with Anchored Floating Popover (Zero Toolbar Layout Shift) */}
        <div className="relative" ref={popoverRef}>
          <button
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            className={`relative px-2.5 py-1 text-[12px] font-sans font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activePreset === 'custom' || isPopoverOpen
                ? 'text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {(activePreset === 'custom' || isPopoverOpen) && (
              <motion.div
                layoutId="activePresetPill"
                className="absolute inset-0 bg-[#18191E] border border-white/[0.08] rounded-md shadow-sm"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <Calendar className="w-3 h-3 text-zinc-400 relative z-10" />
            <span className="relative z-10">
              {activePreset === 'custom' ? `${startDate.slice(5)} → ${endDate.slice(5)}` : 'Custom'}
            </span>
          </button>

          {/* Floating Popover */}
          <AnimatePresence>
            {isPopoverOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 mt-2 z-50 w-72 p-4 rounded-xl bg-[#13151C] border border-white/[0.12] shadow-2xl backdrop-blur-xl space-y-3"
              >
                <div className="text-xs font-semibold text-white font-sans flex items-center justify-between border-b border-white/[0.08] pb-2">
                  <span>Custom Delivery Range</span>
                  <span className="font-mono text-[10px] text-zinc-500">JAN 2026</span>
                </div>

                <form onSubmit={handleApplyCustom} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 font-sans block">Start Date</label>
                    <input
                      type="date"
                      value={customStart}
                      min="2026-01-01"
                      max="2026-01-31"
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full bg-[#0B0C0F] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono focus:border-sky-500 transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 font-sans block">End Date</label>
                    <input
                      type="date"
                      value={customEnd}
                      min="2026-01-01"
                      max="2026-01-31"
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full bg-[#0B0C0F] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono focus:border-sky-500 transition-colors"
                      required
                    />
                  </div>

                  <div className="pt-1 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPopoverOpen(false)}
                      className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-[#38BDF8] text-black font-semibold text-xs rounded-md shadow hover:bg-sky-400 transition-colors flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Apply Range
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right: Compact Custom-Styled Pill Selectors */}
      <div className="flex items-center gap-2">
        {/* Gate Cutoff Pill */}
        <div className="flex items-center gap-1.5 bg-[#121316] border border-white/[0.08] rounded-md px-2.5 py-1 text-[12px] text-[#EDEDEF] hover:border-white/[0.14] transition-all">
          <Clock className="w-3 h-3 text-zinc-400" />
          <span className="text-zinc-400 text-[12px]">Gate Cutoff:</span>
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
          <span className="text-zinc-400 px-2 text-[12px]">Alignment:</span>
          <div className="flex items-center bg-[#0C0D0F] p-0.5 rounded border border-white/[0.05]">
            <button
              onClick={() => onInterpolationChange('step')}
              className={`px-2 py-0.5 rounded text-[11px] font-sans transition-all ${
                interpolation === 'step'
                  ? 'bg-[#18191E] text-[#EDEDEF] font-medium border border-white/[0.08]'
                  : 'text-zinc-500 hover:text-[#EDEDEF]'
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
                  : 'text-zinc-500 hover:text-[#EDEDEF]'
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
