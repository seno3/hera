CREATE DATABASE IF NOT EXISTS hera_db;
USE DATABASE hera_db;
CREATE SCHEMA IF NOT EXISTS public;
USE SCHEMA public;
CREATE OR REPLACE WAREHOUSE hera_wh WITH WAREHOUSE_SIZE='X-SMALL' AUTO_SUSPEND=60 AUTO_RESUME=TRUE;

CREATE OR REPLACE TABLE raw_documents (
    id STRING DEFAULT UUID_STRING(),
    company_ticker STRING NOT NULL,
    company_name STRING,
    source_type STRING NOT NULL,
    source_url STRING,
    document_date DATE,
    title STRING,
    content TEXT NOT NULL,
    metadata VARIANT,
    ingested_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE OR REPLACE TABLE company_analyses (
    id STRING DEFAULT UUID_STRING(),
    company_ticker STRING NOT NULL,
    company_name STRING NOT NULL,
    accountability_score INT NOT NULL,
    summary TEXT NOT NULL,
    issues VARIANT NOT NULL,
    response VARIANT NOT NULL,
    timeline VARIANT NOT NULL,
    score_breakdown VARIANT NOT NULL,
    sources VARIANT NOT NULL,
    document_count INT,
    model_used STRING DEFAULT 'claude-4-sonnet',
    analyzed_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    expires_at TIMESTAMP_NTZ DEFAULT DATEADD('day', 7, CURRENT_TIMESTAMP())
);

CREATE OR REPLACE TABLE companies (
    ticker STRING PRIMARY KEY,
    name STRING NOT NULL,
    industry STRING,
    market_cap FLOAT,
    logo_url STRING,
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE OR REPLACE TABLE user_actions (
    id STRING DEFAULT UUID_STRING(),
    user_name STRING NOT NULL,
    action_type STRING NOT NULL,
    company_ticker STRING NOT NULL,
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE OR REPLACE TABLE portfolio_scans (
    id STRING DEFAULT UUID_STRING(),
    tickers VARIANT NOT NULL,
    results VARIANT,
    scanned_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);
