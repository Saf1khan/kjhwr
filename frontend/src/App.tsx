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
  // Global Filters State
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-01-31');
  const [activePreset, setActivePreset] = useState<PresetType>('full');
  const [cutoffHour, setCutoffHour] = useState<number>(11);
  const [interpolation, setInterpolation] = useState<'step' | 'linear'>('step');
  const [activeTab, setActiveTab] = useState<'trading' | 'analytics' | 'simulator'>('trading');
  const [selectedSimulatorDate, setSelectedSimulatorDate] = useState<string>('2026-01-28');

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
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
        {/* Contextual Control Bar */}
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
        <div className="rounded-xl border border-white/[0.08] bg-[#0A0B0E] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.7)] overflow-hidden">
          {/* Flush 4-column Structural KPI Ledger */}
          <KpiBentoStrip
            kpi={summaryData?.kpi || null}
            cutoffHour={cutoffHour}
          />

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
                    />
                  )}

                  {activeTab === 'simulator' && timeseriesData && (
                    <SimulatorTab
                      timeseries={timeseriesData.timeseries}
                      kpi={summaryData?.kpi || null}
                      cutoffHour={cutoffHour}
                      selectedDate={selectedSimulatorDate}
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
