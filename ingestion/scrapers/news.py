import os
import requests

def scrape(ticker: str, company_name: str) -> list[dict]:
    api_key = os.getenv("NEWS_API_KEY", "")
    if not api_key:
        print("  [NewsAPI] No API key, skipping")
        return []

    limit = int(os.getenv("NEWS_LIMIT", "10"))
    docs = []
    query = f'"{company_name}" (harassment OR discrimination OR lawsuit OR settlement)'
    try:
        resp = requests.get(
            "https://newsapi.org/v2/everything",
            params={"q": query, "sortBy": "relevancy", "pageSize": limit, "apiKey": api_key},
            timeout=30
        )
        if resp.status_code in (401, 426, 429):
            print(f"  [NewsAPI] API limit/auth error ({resp.status_code}), skipping")
            return []
        resp.raise_for_status()
        articles = resp.json().get("articles", [])

        for a in articles:
            content = f"{a.get('title', '')}\n\n{a.get('description', '')}\n\n{a.get('content', '')}"
            if len(content.strip()) < 50:
                continue
            docs.append({
                "company_ticker": ticker,
                "company_name": company_name,
                "source_type": "news_article",
                "source_url": a.get("url", ""),
                "document_date": (a.get("publishedAt") or "")[:10] or None,
                "title": a.get("title", "News Article"),
                "content": content[:8000]
            })
    except requests.exceptions.HTTPError as e:
        print(f"  [NewsAPI] HTTP error: {e}")
    except Exception as e:
        print(f"  [NewsAPI] Error: {e}")

    print(f"  [NewsAPI] Found {len(docs)} documents for {ticker}")
    return docs
