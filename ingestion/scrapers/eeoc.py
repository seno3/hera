import os
import requests
from bs4 import BeautifulSoup

BASE = "https://www.eeoc.gov"

def scrape(ticker: str, company_name: str) -> list[dict]:
    limit = int(os.getenv("EEOC_LIMIT", "3"))
    docs = []
    try:
        resp = requests.get(
            f"{BASE}/newsroom/search",
            params={"keys": company_name},
            timeout=30,
            headers={"User-Agent": "Mozilla/5.0 (Hera Research Bot)"}
        )
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        links = []
        for a in soup.select("a[href*='/newsroom/']"):
            href = a.get("href", "")
            if href and "/search" not in href and href not in links:
                links.append(href)
            if len(links) >= limit:
                break

        for href in links:
            url = href if href.startswith("http") else f"{BASE}{href}"
            try:
                page = requests.get(url, timeout=20, headers={"User-Agent": "Mozilla/5.0 (Hera Research Bot)"})
                page.raise_for_status()
                page_soup = BeautifulSoup(page.text, "html.parser")
                title_el = page_soup.select_one("h1") or page_soup.select_one("title")
                title = title_el.get_text(strip=True) if title_el else "EEOC Press Release"
                body_el = page_soup.select_one("article") or page_soup.select_one(".field--name-body") or page_soup.select_one("main")
                body = body_el.get_text(separator="\n", strip=True) if body_el else ""
                date_el = page_soup.select_one("time") or page_soup.select_one(".date-display-single")
                date = None
                if date_el:
                    raw = date_el.get("datetime", date_el.get_text(strip=True))
                    date = raw[:10] if raw else None

                if len(body) > 50:
                    docs.append({
                        "company_ticker": ticker,
                        "company_name": company_name,
                        "source_type": "eeoc_release",
                        "source_url": url,
                        "document_date": date,
                        "title": title,
                        "content": body[:8000]
                    })
            except Exception:
                continue
    except Exception as e:
        print(f"  [EEOC] Error: {e}")

    print(f"  [EEOC] Found {len(docs)} documents for {ticker}")
    return docs
