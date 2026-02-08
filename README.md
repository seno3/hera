# hera ●

Analysis of SEC filings, court records, news, and EEOC data to score workplace accountability.

## Architecture

```
Python scrapers → Snowflake → Cortex Search → Cortex COMPLETE (claude-4-sonnet) → Express API (Render) → React UI
```

## Setup

### 1. Snowflake
Run `snowflake/01_setup.sql` then `snowflake/02_search_service.sql` in your Snowflake worksheet.

### 2. Ingestion Pipeline
```bash
cd ingestion
cp .env.example .env  # fill in credentials
pip install -r requirements.txt
python run.py --ticker TSLA
python run.py --tickers TSLA,UBER,MSFT
```

### 3. Backend
```bash
cd backend
cp .env.example .env  # fill in Snowflake credentials
npm install
npm run dev
```

### 4. Frontend
```bash
cd frontend 
npm install
npm run dev
```

Open http://localhost:5173

## Data Flow

1. Enter tickers in the UI or run the CLI
2. Scrapers pull from SEC EDGAR, CourtListener, NewsAPI, EEOC
3. Documents loaded into Snowflake `raw_documents`
4. Cortex Search indexes documents (hybrid vector + keyword)
5. Cortex COMPLETE generates structured accountability analysis
6. Results cached in `company_analyses` for 7 days
7. Express API serves results to React frontend
