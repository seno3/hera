import os
import requests

def scrape(ticker: str, company_name: str) -> list[dict]:
    api_key = os.getenv("NEWS_API_KEY", "")
    if not api_key:
        print("  [Social News] No NEWS_API_KEY, skipping")
        return []

    docs = []
    query = f'"{company_name}" (twitter OR social media) (backlash OR outcry OR viral OR employees OR protest OR walkout)'
    try:
        resp = requests.get(
            "https://newsapi.org/v2/everything",
            params={"q": query, "sortBy": "relevancy", "pageSize": 10, "apiKey": api_key},
            timeout=20,
        )
        if resp.status_code in (401, 426, 429):
            print(f"  [Social News] API limit/auth error ({resp.status_code}), skipping")
            return []
        resp.raise_for_status()
        for a in resp.json().get("articles", []):
            content = f"{a.get('title', '')}\n\n{a.get('description', '')}\n\n{a.get('content', '')}"
            if len(content.strip()) < 50:
                continue
            docs.append({
                "company_ticker": ticker,
                "company_name": company_name,
                "source_type": "social_news",
                "source_url": a.get("url", ""),
                "document_date": (a.get("publishedAt") or "")[:10] or None,
                "title": a.get("title", "Social Media News Coverage"),
                "content": content[:8000],
            })
    except requests.exceptions.HTTPError as e:
        print(f"  [Social News] HTTP error: {e}")
    except Exception as e:
        print(f"  [Social News] Error: {e}")

    print(f"  [Social News] Found {len(docs)} articles for {ticker}")
    return docs
