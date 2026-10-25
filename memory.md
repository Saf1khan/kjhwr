# Project Memory & Architecture Blueprint

- **Production Deployment:** [https://kjhwr-delta.vercel.app](https://kjhwr-delta.vercel.app)
- **Repository URL:** [https://github.com/Saf1khan/kjhwr](https://github.com/Saf1khan/kjhwr)

## 1. Project Summary & Domain Context
- **Client & Persona:** UK Energy Utility Day-Ahead Wholesale Trading Desk.
- **Problem Statement:** To balance demand and determine thermal/non-renewable power procurement for delivery day $D$, traders must commit capital on decision day $D-1$ before gate closure. Accurately assessing day-ahead wind generation forecasts available at decision time and quantifying their forecast error bounds is critical to minimize imbalance penalty charges and avoid costly emergency power purchases.
- **Decision Window & Gate Closure:**
  - Day $D$: Delivery Day (every 30-minute settlement period in January 2026).
  - Day $D-1$: Decision Day.
  - Standard UK Day-Ahead Auction Cutoff: Typically 11:00 AM UK local time (GMT) on $D-1$.
  - Forecast Alignment Rule: For any settlement period `startTime` on day $D$, traders only had access to forecasts published prior to decision cutoff. The relevant forecast is the latest record where `publishTime <= D-1 cutoff_time`. We also allow dynamic cutoff comparison (e.g., 11:00 AM vs 17:00 PM vs latest available prior to midnight).
- **Time Scope:** January 2026 (`2026-01-01T00:00:00Z` to `2026-01-31T23:30:00Z`).

---

## 2. Elexon BMRS API Endpoints & Field Mappings
- **API Base URL:** `https://data.elexon.co.uk/bmrs/api/v1`

### A. Actual Generation (`datasets/FUELHH/stream`)
- **Endpoint:** `GET /datasets/FUELHH/stream`
- **Query Params:** `publishDateTimeFrom`, `publishDateTimeTo` (or `settlementDateFrom`, `settlementDateTo`).
- **Filter Rule:** Filter records where `fuelType == "WIND"`.
- **Key Fields:**
  - `startTime`: ISO-8601 timestamp for start of 30-min settlement period.
  - `settlementDate`: YYYY-MM-DD.
  - `settlementPeriod`: 1 to 48 (or 50 during clock changes).
  - `fuelType`: Filter for `"WIND"`.
  - `generation`: Actual national wind generation in MW.

### B. Forecasted Generation (`datasets/WINDFOR/stream`)
- **Endpoint:** `GET /datasets/WINDFOR/stream`
- **Query Params:** `publishDateTimeFrom`, `publishDateTimeTo`
- **Key Fields:**
  - `startTime`: Target delivery settlement start time.
  - `publishTime`: Timestamp when this specific forecast was generated/published by National Grid ESO.
  - `generation`: Forecasted wind generation in MW.
- **Alignment Contract:**
  - Group by `startTime`.
  - For each target delivery day $D$ and decision cutoff $T_{cutoff}$ on $D-1$, filter for records with `publishTime <= T_{cutoff}` and select `max(publishTime)`.

---

## 3. Quantitative Evaluation Metrics
Let $A_t$ be Actual Generation (MW) and $F_t$ be Forecast Generation (MW) for settlement period $t$, with error $e_t = F_t - A_t$ (or $A_t - F_t$ depending on convention; standardized as Forecast Error $e_t = F_t - A_t$ where positive means Over-forecasting and negative means Under-forecasting):

1. **Mean Absolute Error (MAE):**
   $$\text{MAE} = \frac{1}{N} \sum_{t=1}^N |F_t - A_t|$$
2. **Root Mean Square Error (RMSE):**
   $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{t=1}^N (F_t - A_t)^2}$$
3. **Mean Bias Error (MBE / Directional Bias):**
   $$\text{MBE} = \frac{1}{N} \sum_{t=1}^N (F_t - A_t)$$
   - Positive MBE: Systematic over-forecast (risk of wind shortfall, requiring unhedged thermal dispatch).
   - Negative MBE: Systematic under-forecast (surplus wind, risk of curtailment or downward spill).
4. **Weighted Absolute Percentage Error (WAPE / Capacity-Normalized Error):**
   $$\text{WAPE} = \frac{\sum |F_t - A_t|}{\sum A_t} \times 100\%$$
   *(Prevents division-by-zero distortion caused by near-zero wind periods in standard MAPE).*
5. **Tail Risk & Error Percentiles:**
   - 90th & 95th Percentile Under-forecast Error (MW): Downside tail risk sizing for thermal backup reserves.
   - Error Distribution Histogram: Normal vs skewed heavy-tail wind risk profile.

---

## 4. Planned Tech Stack & Architecture

```
kjhwr-energy-pilot/
├── memory.md                           # Single source of truth & architectural log
├── docker-compose.yml                  # Unified orchestration for frontend & backend
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt                # fastapi, uvicorn, pandas, numpy, httpx, pydantic
│   ├── app/
│   │   ├── main.py                     # FastAPI entry point & CORS
│   │   ├── config.py                   # API URLs, default cutoffs, constants
│   │   ├── services/
│   │   │   ├── elexon_client.py        # Ingestion & caching of FUELHH and WINDFOR
│   │   │   ├── alignment_engine.py     # Day-ahead D-1 cutoff matching logic
│   │   │   └── metrics_engine.py       # MAE, RMSE, MBE, WAPE, Percentiles computation
│   │   └── routers/
│   │       ├── forecast.py             # Forecast vs Actual time-series endpoint
│   │       └── analytics.py            # Quantitative error metrics & distributions
│   └── scripts/
│       └── explore_elexon.py           # Standalone verification script
└── frontend/
    ├── Dockerfile
    ├── package.json                    # React, Vite, TypeScript, Tailwind CSS
    ├── tsconfig.json
    ├── tailwind.config.js
    └── src/
        ├── components/
        │   ├── Header.tsx              # Market status, decision cutoff selector, date range
        │   ├── MetricsSummary.tsx      # MAE, RMSE, MBE, P95 tail risk KPI cards
        │   ├── TimeSeriesChart.tsx     # Actual vs Forecast dual-series plot (Recharts)
        │   ├── ErrorAnalysis.tsx       # Residuals, error bands, and bias distribution
        │   └── CutoffSimulator.tsx     # Compare 11:00 AM vs 17:00 PM vs latest
        ├── services/
        │   └── api.ts                  # Axios/fetch calls to backend
        └── App.tsx
```

---

### C. Verified Live Data Contracts & Cache Strategy
- **Actuals (`FUELHH`):** 1,536 half-hourly settlement periods cached (32 days $\times$ 48 SPs covering 2026-01-01 through 2026-02-01). Filtered strictly for `fuelType == "WIND"`.
- **Forecasts (`WINDFOR`):** 19,272 multi-revision forecast records cached (published between 2025-12-31 and 2026-02-02).
- **Resolution Alignment:** `WINDFOR` is published at hourly resolution (`HH:00:00Z`). `FUELHH` is half-hourly (`HH:00` and `HH:30`). Our engine implements step forward-fill attribution as the primary standard, with linear interpolation support for `:30` periods.
- **Cache Location:** `backend/data/jan2026_wind_cache.json` (2.73 MB, sub-millisecond local queries, automatic fallback to live Elexon stream).

---

## 4. Empirical Findings: January 2026 UK Day-Ahead Wind Evaluation
*(Computed over 1,488 settlement periods in January 2026 with default D-1 11:00 UTC Gate Closure)*

| Metric | Empirical Value | Trading Desk Impact & Procurement Implication |
| :--- | :--- | :--- |
| **Evaluated Periods ($N$)** | `1,488` | Complete 31 delivery days of January 2026. |
| **Mean Absolute Error (MAE)** | `2,126.1 MW` | Average absolute magnitude of Day-Ahead forecast error. |
| **Root Mean Square Error (RMSE)** | `2,620.8 MW` | Significant penalty for severe outlier forecast misses. |
| **Mean Bias Error (MBE / Bias)** | `+1,840.3 MW` | **Extreme Systematic Over-Forecasting:** National Grid ESO forecasts consistently overestimated wind output by an average of 1.84 GW throughout January 2026. |
| **Capacity Normalized Error (WAPE)** | `18.36%` | Relative forecast error across the national wind fleet. |
| **P90 Downside Shortfall Risk** | `4,346.9 MW` | 90% confidence wind deficit boundary. |
| **P95 Downside Shortfall Risk** | `5,378.1 MW` | **Recommended Thermal Buffer:** Traders must procure a ~5.38 GW thermal backup buffer to cover wind generation deficits 95% of the time. |
| **Max Single-Period Shortfall** | `6,857.0 MW` | Worst-case sudden wind drop event in January 2026. |
| **Latest/Intraday Forecast MAE** | `1,804.0 MW` | Intraday updates recover `322.1 MW` of accuracy over Day-Ahead gate closure. |
| **Total Actual vs Forecast Energy** | `8,616.1 GWh` vs `9,985.2 GWh` | A net national over-forecast of **1,369.1 GWh** (~1.37 TWh) in a single month. |

---

## 5. Backend REST API Endpoints

1. `GET /api/health`
   - Returns service status, cache readiness, and record counts.
2. `GET /api/summary?start_date=2026-01-01&end_date=2026-01-31&cutoff_hour=11&interpolation=step`
   - Returns overall KPI metrics, error distribution histogram (15 bins), and daily breakdowns.
3. `GET /api/timeseries?start_date=2026-01-02&end_date=2026-01-08&cutoff_hour=11&interpolation=step`
   - Returns aligned 30-min settlement intervals (`startTime`, `actual_mw`, `day_ahead_forecast_mw`, `day_ahead_publish_time`, `day_ahead_lead_time_hours`, `latest_forecast_mw`, `error_mw`, `shortfall_mw`, `surplus_mw`, `latest_error_mw`).
4. `GET /api/horizon-accuracy?cutoff_hour=11&start_date=2026-01-01&end_date=2026-01-31`
   - Returns lead-time error degradation buckets (0-14h, 14-18h, 18-24h, 24-30h, 30-36h, >36h) and diurnal settlement profile (SPs 1-48).
5. `POST /api/cache/refresh?force=true`
   - Force re-fetches live data from Elexon BMRS API and updates the local cache.

---

## 6. Phase Tracker & Milestones

- [x] **Phase 1: Requirements Anchoring & Data Exploration**
  - [x] Create `memory.md` with domain rules, data contracts, and metrics.
  - [x] Create `backend/scripts/explore_elexon.py` to inspect real Elexon response structure.
  - [x] Validate live Elexon data schema for Jan 2026 against `FUELHH` and `WINDFOR`.
- [x] **Phase 2: Backend Ingestion, Alignment Engine & Quantitative Metrics**
  - [x] Build `backend/app/services/elexon_client.py` with chunked streaming and disk cache (`backend/data/jan2026_wind_cache.json`).
  - [x] Prefetch and cache 1,536 `FUELHH` actuals and 19,272 `WINDFOR` forecast revisions.
  - [x] Build `backend/app/services/forecast_engine.py` with Day-Ahead $D-1$ cutoff logic, latest forecast alignment, and step/linear resolution matching.
  - [x] Build `backend/app/services/metrics_engine.py` computing MAE, RMSE, MBE, WAPE, P90/P95 Shortfall risk, histograms, daily breakdown, and horizon degradation.
  - [x] Build FastAPI REST application with CORS (`backend/app/main.py`).
  - [x] Build and pass automated endpoint test suite (`backend/scripts/test_endpoints.py`).
- [x] **Phase 3: Frontend Trading Desk Dashboard (React + Vite + TypeScript + Tailwind)**
  - [x] Scaffold React + Vite + TypeScript + Tailwind CSS application (`/frontend`).
  - [x] Complete Institutional UI/UX Refinement Pass (Linear / Vercel / Bloomberg inspired):
    - True neutral carbon palette (`#09090B` background, `#111113` surface panels, `1px` hairline borders).
    - Seamless 1px hairline Bento Grid for 6 KPIs with high-contrast off-white `JetBrains Mono` values, muted units, and semantic micro-badges (removed cliché corner icons).
    - Compact 2-tier command bar (Row 1: `GRIDPULSE // UK-BM` + live stream dot + segmented tabs; Row 2: presets + date inputs + D-1 cutoff + resolution toggle).
    - Institutional Recharts with integrated header bars, smooth area gradient fills, and subtle dashed gridlines (`rgba(255,255,255,0.05)`).
  - [x] Interactive Dual-Series Time-Series Chart with $D-1$ cutoff toggle, Latest Intraday forecast comparison, and half-hourly imbalance deficit track.
  - [x] Risk Analytics tab with error distribution histogram, lead-time horizon degradation, diurnal SP profile, and sortable daily breakdown table.
  - [x] Day-Ahead Thermal Procurement Simulator with demand slider, 4 risk policies (Naive, Bias-Corrected, P90, P95), and commercial pitch card.
  - [x] Verified zero TypeScript errors (`tsc && vite build` passed cleanly in 21s).
  - [x] Verified full live stack running locally (FastAPI port 8000 + Vite port 5173) with browser subagent.
- [x] **Phase 4: Packaging, Containerization & Documentation**
  - [x] Create multi-stage `backend/Dockerfile` (Python 3.11 with healthcheck) and `frontend/Dockerfile` (Node 20 Alpine -> Nginx Alpine reverse proxy).
  - [x] Create root `docker-compose.yml` orchestrating backend and frontend services.
  - [x] Create root `.gitignore` ignoring build artifacts while explicitly keeping `backend/data/jan2026_wind_cache.json` tracked.
  - [x] Create unified Vercel serverless deployment setup: `api/index.py`, root `requirements.txt`, and `vercel.json`.
  - [x] Fix Recharts SVG clipping on Horizon Degradation chart and Procurement Simulator demand reference line.
  - [x] Create comprehensive, anonymous `README.md` with problem context, empirical January 2026 findings table, architecture, setup instructions, and AI tools disclosure.
  - [x] Verified Vercel entry point (`python -c "import api.index"`) and clean production build (`npm run build`).
- [x] **Phase 5: Minimalist Editorial UI Polish**
  - [x] Refactored `KpiBentoStrip.tsx`: Reduced strip from 6 cramped cards with colored pill boxes to 4 spacious, breathable cards (`Forecast Error (MAE)`, `Forecast Bias`, `P95 Thermal Buffer`, `Monthly Volume (Jan 2026)`), removing internal horizontal dividers and badges in favor of whitespace and clean zinc typography.
  - [x] Clean human sentence-case typography (`Inter` font): Replaced `//` and ALL-CAPS monospace titles across `Header.tsx`, `TradingViewTab.tsx`, `RiskAnalyticsTab.tsx`, and `SimulatorTab.tsx` with clean `Inter` headers (`font-sans font-medium text-sm text-zinc-100 tracking-normal`), reserving `JetBrains Mono` strictly for numbers, timestamps, and axis ticks.
  - [x] De-cluttered chart palettes:
    - In `RiskAnalyticsTab.tsx`: Changed histogram from neon green/red to sophisticated cool slate (`#52525B`) and steel-blue/indigo (`#6366F1` at `0.85`), with clean reference lines for `0 MW` and Mean Bias.
    - In `RiskAnalyticsTab.tsx`: Reduced horizon degradation chart to 2 crystal-clear series (solid MAE `#38BDF8` and soft indigo dashed P95 `#818CF8`), removing the redundant 3rd yellow series.
    - In `TradingViewTab.tsx`: Toned down deficit/surplus imbalance bars to soft muted slate (`#3F3F46`) and soft amber (`#F59E0B` at `0.75`).
  - [x] Streamlined `SimulatorTab.tsx`: Removed `1.`, `2.`, `3.`, `4.` numbering from policy buttons (`Naive Forecast`, `Bias-Adjusted`, `P90 Buffer`, `P95 Buffer (Recommended)`), unified outcome summary metrics in crisp white (`#FAFAFA`), and condensed the wordy 3-column methodology card into a clean 1-line muted footer note.
  - [x] Verified zero TypeScript or build errors (`npm run build` passed cleanly in 18.2s).
- [x] **Phase 6: Linear, Fey & Vercel Design Engineering Elevation**
  - [x] Typography system (`.metric-value` in `index.css`): Inter with OpenType tabular numerals (`tnum`, `zero`, `cv01`, `-0.03em` tracking) for large KPI numbers; reserved `JetBrains Mono` strictly for ticks, UTC timestamps, and table cells.
  - [x] 4-Tier neutral carbon surface hierarchy: Canvas `#08090A`, recessed well `#0C0D0F`, `.surface-card` gradient with hairline micro-contrast border and inset rim light, and `.surface-button`.
  - [x] Single-tier Top Navigation Bar (`Header.tsx`): 16px geometric pulse/grid logo, `GridPulse / UK Day-Ahead Desk`, quiet live indicator, and Vercel-style recessed segmented tab switcher.
  - [x] In-page Contextual Control Bar: Segmented presets (`Full Month · Jan 2026`, `Week 1–4`) with custom date picker hidden behind clean `Custom` pill toggle, avoiding raw browser input clutter in default view.
  - [x] Architectural 4-tile KPI Strip (`KpiBentoStrip.tsx`): Discrete `.surface-card` tiles, `.metric-value` 28px typography, context tags, and 6px semantic indicator dots.
  - [x] Chart precision engineering:
    - Fixed Y-axis label wrapping across all charts: Formatted as clean single-line numbers (`20k`, `15k`, etc.) and stated `(MW)` once in subtitles.
    - `TradingViewTab.tsx`: Custom pill toggle buttons for Intraday & P95 Buffer (replacing native checkboxes); 1.5px actual generation stroke with vertical gradient fill.
    - `RiskAnalyticsTab.tsx`: Slender architectural histogram bars (`maxBarSize={28}`, `barCategoryGap="18%"`) with vertical SVG gradients and rounded caps; horizon chart with subtle area fills and visible node dots.
    - `SimulatorTab.tsx`: Policy selection cards styled as `.surface-card` radio tiles with active indicator dots and single-line Y-axis ticks.
  - [x] Verified zero TypeScript or build errors (`tsc && vite build` in 14.38s).
  - [x] Verified in browser with full visual regression testing across all 3 tabs.


