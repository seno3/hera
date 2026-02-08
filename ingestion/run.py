import argparse
import time
import edgar
edgar.set_identity("Hera Research hera@example.com")

from scrapers import sec_edgar, courtlistener, news, eeoc, reddit, wikipedia, glassdoor_proxy, twitter
from loader import load_documents
from analyzer import analyze
from dotenv import load_dotenv
from edgar import Company

load_dotenv()

SCRAPERS = [
    ("SEC EDGAR", lambda t, n: sec_edgar.scrape(t)),
    ("CourtListener", lambda t, n: courtlistener.scrape(t, n)),
    ("NewsAPI", lambda t, n: news.scrape(t, n)),
    ("EEOC", lambda t, n: eeoc.scrape(t, n)),
    ("Reddit", lambda t, n: reddit.scrape(t, n)),
    ("Wikipedia", lambda t, n: wikipedia.scrape(t, n)),
    ("Glassdoor Proxy", lambda t, n: glassdoor_proxy.scrape(t, n)),
    ("Social News", lambda t, n: twitter.scrape(t, n)),
]

def get_company_name(ticker: str) -> str:
    try:
        c = Company(ticker)
        if c.name and "Entity" not in c.name:
            return c.name
    except Exception:
        pass
    return ticker

def process_ticker(ticker: str):
    ticker = ticker.strip().upper()
    print(f"\n{'='*50}")
    print(f"Processing {ticker}")
    print(f"{'='*50}")

    name = get_company_name(ticker)
    print(f"Company: {name}")

    print(f"\n[1/4] Scraping {len(SCRAPERS)} sources...")
    all_docs = []
    for label, scraper_fn in SCRAPERS:
        try:
            docs = scraper_fn(ticker, name)
            all_docs.extend(docs)
        except Exception as e:
            print(f"  [{label}] Failed: {e}")

    print(f"\n[2/4] Loading {len(all_docs)} documents into Snowflake...")
    load_documents(all_docs)

    print("\n[3/4] Waiting 10s for Cortex Search indexing...")
    time.sleep(10)

    print("\n[4/4] Running AI analysis...")
    result = analyze(ticker, name)

    if result:
        score = result.get("accountability_score", "?")
        summary = result.get("summary", "No summary")
        dq = result.get("data_quality", "unknown")
        print(f"\nDone! Score: {score}/10 (data quality: {dq})")
        print(f"Summary: {summary}")
    else:
        print(f"\nAnalysis failed or no data for {ticker}")

def main():
    parser = argparse.ArgumentParser(description="Hera Ingestion Pipeline")
    parser.add_argument("--ticker", type=str, help="Single ticker to process")
    parser.add_argument("--tickers", type=str, help="Comma-separated tickers")
    args = parser.parse_args()

    tickers = []
    if args.ticker:
        tickers = [args.ticker]
    elif args.tickers:
        tickers = [t.strip() for t in args.tickers.split(",")]
    else:
        parser.print_help()
        return

    for t in tickers:
        process_ticker(t)

    print(f"\nAll done! Processed {len(tickers)} ticker(s).")

if __name__ == "__main__":
    main()
