USE DATABASE hera_db;
USE SCHEMA public;

CREATE OR REPLACE CORTEX SEARCH SERVICE hera_doc_search
  ON content
  ATTRIBUTES company_ticker, source_type, document_date, title, source_url
  WAREHOUSE = hera_wh
  TARGET_LAG = '1 hour'
  AS (
    SELECT content, company_ticker, source_type, document_date, title, source_url
    FROM raw_documents
    WHERE content IS NOT NULL AND LENGTH(content) > 50
  );
