# hera

Workplace accountability scoring platform. Analyzes SEC filings, court records, news, EEOC data, and employee reviews to rate companies on a 1–10 accountability scale.

## Architecture

```
Python scrapers → Snowflake → Cortex Search → Cortex COMPLETE (Claude Sonnet) → Express API → React UI
```

```
privateclaudetest-main/
├── ingestion/       # Python data scrapers + Snowflake loader
├── backend/         # Express + TypeScript REST API
├── frontend/        # React + Vite + TypeScript SPA
└── snowflake/       # SQL setup scripts (tables, search service)
```

## Prerequisites

- Node.js 18+
- Python 3.8+
- Snowflake account with Cortex enabled
- MongoDB Atlas cluster
- API keys: NewsAPI, CourtListener, Plaid (sandbox), Resend, Nessie

## Setup

### 1. Snowflake

Run these in your Snowflake worksheet in order:

```sql
-- Creates database, warehouse, and tables
snowflake/01_setup.sql

-- Creates Cortex Search service for hybrid vector + keyword search
snowflake/02_search_service.sql
```

### 2. Ingestion Pipeline

```bash
cd ingestion
cp .env.example .env  # fill in credentials
pip install -r requirements.txt
```

```bash
# Single company
python run.py --ticker TSLA

# Multiple companies
python run.py --tickers TSLA,UBER,MSFT
```

**Environment variables** (`ingestion/.env`):

| Variable | Description |
|----------|-------------|
| `SNOWFLAKE_ACCOUNT` | Snowflake account identifier |
| `SNOWFLAKE_USER` | Snowflake username |
| `SNOWFLAKE_PASSWORD` | Snowflake password |
| `SNOWFLAKE_DATABASE` | Default: `hera_db` |
| `SNOWFLAKE_SCHEMA` | Default: `public` |
| `SNOWFLAKE_WAREHOUSE` | Default: `hera_wh` |
| `NEWS_API_KEY` | [NewsAPI](https://newsapi.org/) key |
| `COURTLISTENER_API_TOKEN` | [CourtListener](https://www.courtlistener.com/api/) token |
| `NESSIE_API_KEY` | Capital One Nessie API key |
| `SEC_FILING_LIMIT` | Max SEC filings per ticker (default: 3) |
| `COURTLISTENER_LIMIT` | Max court opinions per ticker (default: 5) |
| `NEWS_LIMIT` | Max news articles per ticker (default: 10) |
| `EEOC_LIMIT` | Max EEOC releases per ticker (default: 3) |
| `REDDIT_POST_LIMIT` | Max Reddit posts per ticker (default: 5) |
| `REDDIT_COMMENT_LIMIT` | Max comments per post (default: 3) |
| `WIKIPEDIA_ENABLED` | Enable Wikipedia scraping (default: true) |

### 3. Backend

```bash
cd backend
cp .env.example .env  # fill in credentials
npm install
npm run dev            # runs on http://localhost:3001
```

**Environment variables** (`backend/.env`):

| Variable | Description |
|----------|-------------|
| `SNOWFLAKE_ACCOUNT` | Snowflake account identifier |
| `SNOWFLAKE_USER` | Snowflake username |
| `SNOWFLAKE_PASSWORD` | Snowflake password |
| `SNOWFLAKE_DATABASE` | Default: `hera_db` |
| `SNOWFLAKE_SCHEMA` | Default: `public` |
| `SNOWFLAKE_WAREHOUSE` | Default: `hera_wh` |
| `PORT` | Server port (default: 3001) |
| `PLAID_CLIENT_ID` | Plaid client ID (sandbox) |
| `PLAID_SECRET` | Plaid secret key |
| `PLAID_ENV` | Plaid environment (default: `sandbox`) |
| `NESSIE_API_KEY` | Capital One Nessie API key |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `EMAIL_HASH_SALT` | Salt for hashing employee emails |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `DEMO_MODE_ENABLED` | Enable demo mode for testing (default: `true`) |
| `RESEND_API_KEY` | [Resend](https://resend.com/) API key for verification emails |
| `RESEND_FROM_EMAIL` | Sender address for verification emails |

### 4. Frontend

```bash
cd frontend
npm install
npm run dev            # runs on http://localhost:5173
```

The Vite dev server proxies `/api` requests to `localhost:3001`.

## Data Flow

1. User enters a ticker in the UI (or runs the CLI)
2. Backend spawns `python run.py --ticker <TICKER>` as a subprocess
3. Scrapers pull from SEC EDGAR, CourtListener, NewsAPI, EEOC, Reddit, Glassdoor, Wikipedia, and Twitter
4. Documents are deduplicated and loaded into the Snowflake `raw_documents` table
5. Cortex Search indexes documents (hybrid vector + keyword)
6. Cortex COMPLETE (Claude Sonnet) generates a structured accountability analysis
7. Results are cached in `company_analyses` for 7 days
8. Express API serves results to the React frontend

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/companies/:ticker` | Get analysis for a company |
| `POST` | `/api/analyze/:ticker` | Trigger a new analysis |
| `GET` | `/api/analyze/:ticker/status` | Poll analysis progress |
| `POST` | `/api/portfolio/scan` | Scan multiple tickers at once |
| `GET` | `/api/companies/:ticker/alternatives` | Find higher-scoring alternatives |
| `GET` | `/api/resolve/:query` | Resolve company name to ticker |
| `POST` | `/api/reviews/auth/request-verification` | Send email verification code |
| `POST` | `/api/reviews/auth/verify` | Verify employee email |
| `POST` | `/api/reviews/submit` | Submit an employee review |
| `GET` | `/api/reviews/company/:ticker/aggregate` | Get aggregated employee reviews |
| `GET` | `/api/plaid/link-token` | Create Plaid Link session |
| `POST` | `/api/plaid/exchange-token` | Exchange Plaid public token |
| `GET/POST` | `/api/nessie/*` | Bank simulation (Capital One Nessie) |
| `POST` | `/api/community/action` | Log a user action |
| `GET` | `/api/community/activity` | Get recent community activity |

## Data Sources

| Source | Data Collected | Authority Weight |
|--------|---------------|-----------------|
| SEC EDGAR | 8-K, 10-K, Proxy filings | Highest |
| CourtListener | Court opinions on workplace issues | Highest |
| EEOC | Press releases on settlements | High |
| NewsAPI | Company news articles | Medium |
| Reddit | Employee sentiment and discussions | Lower |
| Glassdoor | Employee reviews (proxy) | Lower |
| Wikipedia | Company history and context | Context |
| Twitter | Social media mentions | Lower |

## Key Features

- **Accountability scoring** — 1–10 scale based on severity, response quality, transparency, and pattern analysis
- **Issue tracking** — sexual harassment, discrimination, retaliation, pay gap, hostile environment, assault
- **Employee reviews** — verified via email, anonymous (SHA-256 hashed), weighted by recency
- **Portfolio scanning** — paste tickers or connect via Plaid to flag problematic holdings
- **Alternative recommendations** — same industry, similar market cap, higher accountability scores
- **Banking simulation** — Nessie integration for demo portfolio tracking

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Recharts, React Router |
| Backend | Node.js, Express, TypeScript, JWT, Mongoose |
| Data | Snowflake (warehouse + Cortex AI), MongoDB Atlas (reviews) |
| Ingestion | Python, BeautifulSoup, edgartools, pandas |
| Integrations | Plaid, Resend, Capital One Nessie, NewsAPI, CourtListener |

## Scripts

### Backend

| Script | Command |
|--------|---------|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Production | `npm start` |

### Frontend

| Script | Command |
|--------|---------|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Preview build | `npm run preview` |
