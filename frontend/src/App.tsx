import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, ContextualControlBar, PresetType } from './components/Header';
import { KpiBentoStrip } from './components/KpiBentoStrip';
import { TradingViewTab } from './components/tabs/TradingViewTab';
import { RiskAnalyticsTab } from './components/tabs/RiskAnalyticsTab';
import { SimulatorTab } from './components/tabs/SimulatorTab';
import {
  getHealth,
  getHorizonAccuracy,
  getSummary,
  getTimeseries,
} from './services/api';
import {
  HealthResponse,
  HorizonAccuracyResponse,
  SummaryResponse,
  TimeSeriesResponse,
} from './types/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  // Global Filters State (Defaulting to Week 1 for clean, readable initial rendering)
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-01-07');
  const [activePreset, setActivePreset] = useState<PresetType>('w1');
  const [cutoffHour, setCutoffHour] = useState<number>(11);
  const [interpolation, setInterpolation] = useState<'step' | 'linear'>('linear');
  const [activeTab, setActiveTab] = useState<'trading' | 'analytics' | 'simulator'>('trading');
  const [selectedSimulatorDate, setSelectedSimulatorDate] = useState<string>('2026-01-28');

  // Dual-Theme System (Dark default, persisted in localStorage)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('gridpulse-theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('gridpulse-theme', theme);
    } catch {}
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Keyboard Shortcuts: 1, 2, 3 for tabs, T for theme toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === '1') {
        setActiveTab('trading');
      } else if (e.key === '2') {
        setActiveTab('analytics');
      } else if (e.key === '3') {
        setActiveTab('simulator');
      } else if (e.key === 't' || e.key === 'T') {
        toggleTheme();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTheme]);

  // Callback to seamlessly switch to simulator with preloaded day from analytics log
  const handleSelectDayForSimulation = useCallback((date: string) => {
    setSelectedSimulatorDate(date);
    setActiveTab('simulator');
  }, []);

  // API Data State
  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null);
  const [timeseriesData, setTimeseriesData] = useState<TimeSeriesResponse | null>(null);
  const [horizonData, setHorizonData] = useState<HorizonAccuracyResponse | null>(null);
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Atomic date range update handler to eliminate preset race conditions
  const handleDateRangeChange = useCallback(
    (start: string, end: string, preset: PresetType) => {
      setStartDate(start);
      setEndDate(end);
      setActivePreset(preset);
    },
    []
  );

  // Check health on load
  useEffect(() => {
    getHealth()
      .then((h) => setHealthData(h))
      .catch((e) => console.warn('Health check warning:', e));
  }, []);

  // Fetch data on filter change
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, tsRes, horRes] = await Promise.all([
        getSummary({
          start_date: startDate,
          end_date: endDate,
          cutoff_hour: cutoffHour,
          interpolation,
        }),
        getTimeseries({
          start_date: startDate,
          end_date: endDate,
          cutoff_hour: cutoffHour,
          interpolation,
        }),
        getHorizonAccuracy({
          cutoff_hour: cutoffHour,
          start_date: startDate,
          end_date: endDate,
          interpolation,
        }),
      ]);

      setSummaryData(sumRes);
      setTimeseriesData(tsRes);
      setHorizonData(horRes);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err?.message || 'Failed to connect to backend API server on port 8000.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, cutoffHour, interpolation]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div className="min-h-screen bg-[#08090A] text-[#EDEDEF] flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Top Single-Tier Navigation Bar */}
      <Header
        activeTab={activeTab}
        isHealthy={healthData?.status === 'healthy'}
        onTabChange={setActiveTab}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
        {/* Contextual Control Bar - only for trading & analytics */}
        {activeTab !== 'simulator' && (
          <ContextualControlBar
            startDate={startDate}
            endDate={endDate}
            activePreset={activePreset}
            cutoffHour={cutoffHour}
            interpolation={interpolation}
            onDateRangeChange={handleDateRangeChange}
            onCutoffHourChange={setCutoffHour}
            onInterpolationChange={setInterpolation}
          />
        )}

        {/* Error Banner */}
        {error && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-200 p-3.5 rounded flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadDashboardData}
              className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 border border-rose-700 rounded text-xs flex items-center gap-1 transition-all"
            >
              <RefreshCw className="w-3 h-3" />
              RETRY
            </button>
          </div>
        )}

        {/* Unified Architectural Frame (KPI Ledger + Active Workspace fused together) */}
        <div
          className={`rounded-xl border transition-all overflow-hidden ${
            theme === 'light'
              ? 'border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_-4px_rgba(15,23,42,0.04)]'
              : 'border-white/[0.08] bg-[#0A0B0E] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)]'
          }`}
        >
          {/* Flush 4-column Structural KPI Ledger - hidden on simulator tab to prevent scrolling */}
          {activeTab !== 'simulator' && (
            <KpiBentoStrip
              kpi={summaryData?.kpi || null}
              cutoffHour={cutoffHour}
            />
          )}

          {/* Active Tab Workspace with Smooth Spring/Opacity Transition */}
          <div className="relative">
            {loading && !timeseriesData ? (
              <div className="p-20 flex flex-col items-center justify-center gap-3 text-zinc-400 font-sans text-xs">
                <RefreshCw className="w-5 h-5 text-zinc-400 animate-spin" />
                <div className="font-medium text-zinc-300">
                  Computing Day-Ahead D-1 time-series alignment...
                </div>
                <div className="text-[11px] text-zinc-500">Querying Elexon BMRS dataset engine</div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                >
                  {activeTab === 'trading' && timeseriesData && (
                    <TradingViewTab
                      timeseries={timeseriesData.timeseries}
                      p95Buffer={timeseriesData.p95_shortfall_mw}
                      cutoffHour={cutoffHour}
                      theme={theme}
                    />
                  )}

                  {activeTab === 'analytics' && summaryData && horizonData && (
                    <RiskAnalyticsTab
                      histogram={summaryData.histogram}
                      daily={summaryData.daily}
                      horizonDegradation={horizonData.horizon_degradation}
                      diurnalProfile={horizonData.diurnal_profile}
                      kpi={summaryData.kpi}
                      onSelectDayForSimulation={handleSelectDayForSimulation}
                      theme={theme}
                    />
                  )}

                  {activeTab === 'simulator' && timeseriesData && (
                    <SimulatorTab
                      timeseries={timeseriesData.timeseries}
                      kpi={summaryData?.kpi || null}
                      cutoffHour={cutoffHour}
                      selectedDate={selectedSimulatorDate}
                      theme={theme}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </main>

      {/* Terminal Footer */}
      <footer className="border-t border-white/[0.06] bg-[#08090A] py-3.5 text-xs font-sans text-[#8A8F98] mt-auto">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#EDEDEF]">GridPulse</span>
            <span className="text-[#5E626A]">·</span>
            <span>UK Day-Ahead Wind & Thermal Desk</span>
            <span className="text-[#5E626A]">·</span>
            <span className="font-mono text-[#6E737D] text-[11px]">1,488 settlement intervals</span>
          </div>
          <div className="flex items-center gap-2 text-[#8A8F98]">
            <span>Elexon BMRS Stream</span>
            <span className="text-[#5E626A]">·</span>
            <span>January 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
