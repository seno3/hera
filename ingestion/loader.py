import snowflake.connector
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    return snowflake.connector.connect(
        account=os.getenv("SNOWFLAKE_ACCOUNT"),
        user=os.getenv("SNOWFLAKE_USER"),
        password=os.getenv("SNOWFLAKE_PASSWORD"),
        database=os.getenv("SNOWFLAKE_DATABASE", "hera_db"),
        schema=os.getenv("SNOWFLAKE_SCHEMA", "public"),
        warehouse=os.getenv("SNOWFLAKE_WAREHOUSE", "hera_wh"),
    )

def load_documents(docs: list[dict]):
    if not docs:
        print("  No documents to load")
        return 0

    conn = get_connection()
    try:
        existing = set()
        cur = conn.cursor()
        tickers = list({d["company_ticker"] for d in docs})
        placeholders = ",".join(["%s"] * len(tickers))
        cur.execute(f"SELECT source_url FROM raw_documents WHERE company_ticker IN ({placeholders})", tickers)
        existing = {row[0] for row in cur.fetchall()}

        new_docs = [d for d in docs if d.get("source_url") and d["source_url"] not in existing]
        if not new_docs:
            print("  All documents already loaded")
            return 0

        df = pd.DataFrame(new_docs)
        for col in ["company_ticker", "company_name", "source_type", "source_url", "document_date", "title", "content"]:
            if col not in df.columns:
                df[col] = None

        # Ensure document_date column can hold None values (use object dtype to avoid NaT issues)
        df["document_date"] = df["document_date"].astype(object).where(df["document_date"].notna(), None)

        # Snowflake expects uppercase unquoted identifiers
        df = df[["company_ticker", "company_name", "source_type", "source_url", "document_date", "title", "content"]]
        df.columns = [c.upper() for c in df.columns]

        from snowflake.connector.pandas_tools import write_pandas
        success, nchunks, nrows, _ = write_pandas(
            conn, df,
            "RAW_DOCUMENTS",
            auto_create_table=False,
            quote_identifiers=False
        )
        print(f"  Loaded {nrows} new documents into Snowflake")
        return nrows
    finally:
        conn.close()
