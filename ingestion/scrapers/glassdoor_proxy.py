import os
import requests

def scrape(ticker: str, company_name: str) -> list[dict]:
    api_key = os.getenv("NEWS_API_KEY", "")
    if not api_key:
        print("  [Glassdoor Proxy] No NEWS_API_KEY, skipping")
        return []

    docs = []

    # Try NewsAPI with glassdoor.com domain filter
    for query in [
        f'"{company_name}" glassdoor review workplace culture',
        f'"{company_name}" glassdoor harassment discrimination',
    ]:
        try:
            resp = requests.get(
                "https://newsapi.org/v2/everything",
                params={
                    "q": query,
                    "sortBy": "relevancy",
                    "pageSize": 10,
                    "apiKey": api_key,
                },
                timeout=20,
            )
            if resp.status_code in (401, 426, 429):
                print(f"  [Glassdoor Proxy] API limit/auth error ({resp.status_code}), skipping")
                return docs
            resp.raise_for_status()
            for a in resp.json().get("articles", []):
                content = f"{a.get('title', '')}\n\n{a.get('description', '')}\n\n{a.get('content', '')}"
                if len(content.strip()) < 50:
                    continue
                docs.append({
                    "company_ticker": ticker,
                    "company_name": company_name,
                    "source_type": "glassdoor_proxy",
                    "source_url": a.get("url", ""),
                    "document_date": (a.get("publishedAt") or "")[:10] or None,
                    "title": a.get("title", "Glassdoor Related Article"),
                    "content": content[:8000],
                })
        except requests.exceptions.HTTPError as e:
            print(f"  [Glassdoor Proxy] HTTP error: {e}")
        except Exception as e:
            print(f"  [Glassdoor Proxy] Error: {e}")

    # Dedupe
    seen = set()
    unique = [d for d in docs if d["source_url"] not in seen and not seen.add(d["source_url"])]

    print(f"  [Glassdoor Proxy] Found {len(unique)} articles for {ticker}")
    return unique
