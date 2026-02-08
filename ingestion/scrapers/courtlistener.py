import os
import requests

API_BASE = "https://www.courtlistener.com/api/rest/v4"

def scrape(ticker: str, company_name: str) -> list[dict]:
    token = os.getenv("COURTLISTENER_API_TOKEN", "")
    if not token:
        print("  [CourtListener] No API token, skipping")
        return []

    limit = int(os.getenv("COURTLISTENER_LIMIT", "5"))
    docs = []
    query = f'"{company_name}" (harassment OR discrimination OR retaliation OR "Title VII")'
    try:
        resp = requests.get(
            f"{API_BASE}/search/",
            params={"q": query, "type": "o"},
            headers={"Authorization": f"Token {token}"},
            timeout=30
        )
        if resp.status_code == 429:
            print("  [CourtListener] Rate limited, skipping")
            return []
        resp.raise_for_status()
        results = resp.json().get("results", [])[:limit]

        for r in results:
            content = r.get("snippet", "") or r.get("text", "")
            if not content:
                continue
            docs.append({
                "company_ticker": ticker,
                "company_name": company_name,
                "source_type": "court_opinion",
                "source_url": f"https://www.courtlistener.com{r.get('absolute_url', '')}",
                "document_date": r.get("dateFiled") or r.get("date_created", "")[:10] or None,
                "title": r.get("caseName", "Court Opinion"),
                "content": content[:8000]
            })
    except Exception as e:
        print(f"  [CourtListener] Error: {e}")

    print(f"  [CourtListener] Found {len(docs)} documents for {ticker}")
    return docs
