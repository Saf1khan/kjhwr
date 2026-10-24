# GridPulse UK (`kjhwr`) // Wholesale Power Procurement Intelligence

> **Production Deployment:** `https://kjhwr-energy-pilot.vercel.app` *(or your Vercel deployment URL)*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

---

## 1. Executive Summary & Problem Context

In the **Great Britain Wholesale Electricity Market**, power suppliers and industrial utilities face a critical balancing challenge. To balance consumer demand and schedule dispatchable thermal/non-renewable generators for physical delivery day $D$, trading desks must commit purchase contracts on decision day $D-1$ prior to the **Day-Ahead Auction Gate Closure (typically 11:00 UTC / GMT)**.

Because wind generation varies with meteorological volatility, trading desks rely heavily on Day-Ahead wind forecasts published by National Grid ESO (Elexon BMRS `WINDFOR`). If the trader assumes a wind forecast that fails to materialize, the utility faces a **Wind Shortfall / Imbalance Deficit** and is exposed to penal balancing cash-out market prices.

**GridPulse UK** provides trading desks with:
1. **Strict Zero-Lookahead Alignment:** For any half-hourly settlement period on delivery day $D$, the system evaluates strictly the latest forecast available prior to decision gate closure on $D-1$ (`publishTime <= D-1 cutoff_time`).
2. **Empirical Risk Quantification:** Computes MAE, RMSE, Directional Bias (MBE), Capacity-Normalized WAPE, and **P90/P95 Downside Shortfall Risk Bounds**.
3. **Thermal Procurement Sizing Calculator:** An interactive decision simulator computing the exact thermal backup reserve required to guarantee 95% protection against balancing penalty spikes.

---

## 2. Empirical Findings: January 2026 Evaluation

Evaluating all **1,488 half-hourly settlement periods** across the complete 31 days of **January 2026** against live National Grid ESO / Elexon data yields crucial commercial insights:

| Quantitative Metric | January 2026 Empirical Value | Commercial Trading Desk Impact |
| :--- | :--- | :--- |
| **Evaluated Settlement Periods ($N$)** | `1,488` | All 31 delivery days of January 2026 (48 periods/day). |
| **Mean Absolute Error (MAE)** | `2,126.1 MW` | Average absolute magnitude of Day-Ahead forecast error. |
| **Root Mean Square Error (RMSE)** | `2,620.8 MW` | High volatility miss penalty reflecting severe forecast deviations. |
| **Systematic Directional Bias (MBE)** | **`+1,840.3 MW`** | **Severe Over-Forecasting:** National Grid ESO forecasts systematically overestimated wind output by an average of 1.84 GW throughout January 2026. |
| **Capacity-Normalized Error (WAPE)** | `18.36%` | Fleet-wide relative error across Great Britain wind farms. |
| **P90 Downside Shortfall Risk** | `4,346.9 MW` | 90% confidence wind deficit boundary. |
| **P95 Downside Shortfall Risk** | **`5,378.1 MW`** | **Recommended Thermal Buffer:** Procuring a **+5.38 GW** thermal reserve covers wind deficit 95% of the time. |
| **Peak Single-Period Deficit** | `6,857.0 MW` | Maximum 30-min emergency balancing shortfall event. |
| **Latest Intraday Forecast MAE** | `1,804.0 MW` | Intraday continuous forecasting recovers **322.1 MW** in accuracy over Day-Ahead gate closure. |
| **Total Actual vs Forecast Energy** | `8,616.1 GWh` vs `9,985.2 GWh` | A net monthly over-forecast of **1,369.1 GWh** (~1.37 TWh). |

---

## 3. Architecture & Domain Methodology

```
┌─────────────────────────────────────────────────────────┐
│                     Elexon BMRS API                     │
│  Actuals: datasets/FUELHH/stream (fuelType == 'WIND')   │
│  Forecasts: datasets/WINDFOR/stream                     │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│           Data Caching & Ingestion Engine               │
│   backend/app/services/elexon_client.py                 │
│   Local Store: backend/data/jan2026_wind_cache.json     │
│   (1,536 Actual Settlement Periods / 19,272 Forecasts)  │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│             Day-Ahead Alignment Engine                  │
│   backend/app/services/forecast_engine.py               │
│   - D-1 Cutoff: max(publishTime) <= D-1 at 11:00 UTC    │
│   - Resolution: 60-min WINDFOR -> 30-min FUELHH (Step)  │
│   - Latest Benchmark: max(publishTime) < delivery start │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│              FastAPI REST Analytics API                 │
│   GET /api/health                                       │
│   GET /api/summary (MAE, RMSE, MBE, WAPE, P95, Hist)    │
│   GET /api/timeseries (Aligned 30-min settlement series)│
│   GET /api/horizon-accuracy (Lead-time degradation)     │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│        Institutional React Carbon Dashboard             │
│   Linear/Bloomberg-inspired obsidian interface          │
│   Hairline Bento KPIs • Recharts Gradient Curves        │
│   Interactive Thermal Procurement Decision Calculator   │
└─────────────────────────────────────────────────────────┘
```

### Settlement Period Resolution Alignment
- **`FUELHH` (Actuals):** Published at 30-minute settlement period resolution (`HH:00` and `HH:30`).
- **`WINDFOR` (Forecasts):** Published at 60-minute resolution (`HH:00`).
- **Alignment:** Our engine implements step forward-fill attribution (attributing the hourly forecast to both `HH:00` and `HH:30` settlement periods, which is standard wholesale market practice as National Grid forecasts represent average hourly capacity) with optional linear interpolation support.

---

## 4. Repository Structure

```
.
├── api/
│   └── index.py                     # Vercel serverless entry point (ASGI bridge)
├── backend/
│   ├── Dockerfile                   # Python 3.11 container definition
│   ├── requirements.txt             # FastAPI, Uvicorn, Pydantic, HTTPX
│   ├── data/
│   │   └── jan2026_wind_cache.json  # 2.73 MB cached January 2026 dataset (tracked)
│   ├── app/
│   │   ├── main.py                  # FastAPI application & CORS routing
│   │   ├── config.py                # File paths & domain defaults
│   │   └── services/
│   │       ├── elexon_client.py     # Ingestion & caching service
│   │       ├── forecast_engine.py   # Day-Ahead D-1 alignment & resolution mapping
│   │       └── metrics_engine.py    # Statistical risk & error quantification
│   └── scripts/
│       ├── explore_elexon.py        # Lightweight data verification script
│       ├── prefetch_data.py         # Full January 2026 dataset fetcher
│       └── test_endpoints.py        # Automated test suite
├── frontend/
│   ├── Dockerfile                   # Multi-stage build (Node 20 -> Nginx)
│   ├── nginx.conf                   # Reverse proxy configuration
│   ├── package.json                 # React 18, Vite 6, Tailwind CSS, Recharts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── src/
│       ├── components/
│       │   ├── Header.tsx           # 2-tier command bar & trading toolbar
│       │   ├── KpiBentoStrip.tsx    # Seamless 1px hairline Bento Grid
│       │   └── tabs/
│       │       ├── TradingViewTab.tsx    # Dual-series generation & deficit track
│       │       ├── RiskAnalyticsTab.tsx  # Error histogram & horizon degradation
│       │       └── SimulatorTab.tsx      # Thermal procurement decision calculator
│       ├── services/api.ts          # Type-safe API client
│       ├── types/api.ts             # TypeScript data contracts
│       ├── App.tsx                  # Main workspace shell
│       └── main.tsx
├── docker-compose.yml               # Unified multi-container orchestration
├── memory.md                        # Single source of truth & architectural log
├── requirements.txt                 # Root Python dependencies for Vercel
├── vercel.json                      # Unified Vercel full-stack deployment config
└── README.md
```

---

## 5. Getting Started & Running Locally

### Option A: Running with Docker Compose (Recommended)

Make sure Docker is running on your machine:

```bash
docker compose up --build
```

- **Frontend Dashboard:** `http://localhost:3000`
- **FastAPI Documentation & Swagger:** `http://localhost:8000/docs`
- **Health Check:** `http://localhost:8000/api/health`

---

### Option B: Running Local Development (Without Docker)

#### 1. Backend (Python 3.11+)

```powershell
# Navigate to backend and install dependencies
cd backend
pip install -r requirements.txt

# Run the test suite to verify endpoints and cache
python scripts/test_endpoints.py

# Start the FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be available at `http://127.0.0.1:8000`.

#### 2. Frontend (Node.js 20+)

In a separate terminal:

```powershell
# Navigate to frontend and install packages
cd frontend
npm install

# Run the Vite development server
npm run dev
```

The dashboard will open at `http://127.0.0.1:5173`.

---

## 6. Vercel Single-Project Deployment

This repository is pre-configured to deploy as a unified full-stack application on Vercel:
- **`vercel.json`** triggers `cd frontend && npm install && npm run build`, routes `/api/(.*)` to `@vercel/python` serverless handler `api/index.py`, and serves static assets from `frontend/dist`.
- **`api/index.py`** resolves `backend/` and exposes the FastAPI app with access to `backend/data/jan2026_wind_cache.json`.

Deploy using the Vercel CLI or by connecting the repository to Vercel:

```bash
vercel
```

---

## 7. AI Tools Disclosure

In accordance with transparent software engineering evaluation standards:
- **AI Tools Used:** Google Antigravity IDE and LLM pair-programming assistants were utilized during the development of this repository.
- **Scope of AI Assistance:** Rapid scaffolding of initial API boilerplate, exploratory querying of the Elexon BMRS endpoint stream, drafting TypeScript interfaces, and accelerating Tailwind CSS styling for the dark carbon aesthetic.
- **Human Verification & Engineering:** All domain modeling (UK Day-Ahead $D-1$ 11:00 UTC auction gate closure logic, half-hourly settlement period alignment, directional bias and P95 downside risk mathematical formulas), data verification, testing, and UI architecture were directed, reviewed, and validated by the author.
