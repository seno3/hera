import os
import requests
import re

HEADERS = {"User-Agent": "hera:v1.0 (accountability research)"}
SECTION_KEYWORDS = ["controvers", "criticism", "lawsuit", "legal issue", "legal proceed", "litigation", "scandal"]

def scrape(ticker: str, company_name: str) -> list[dict]:
    if os.getenv("WIKIPEDIA_ENABLED", "true").lower() not in ("true", "1", "yes"):
        print("  [Wikipedia] Disabled via WIKIPEDIA_ENABLED, skipping")
        return []

    docs = []

    # Get page summary to find the canonical title
    try:
        resp = requests.get(
            f"https://en.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(company_name)}",
            headers=HEADERS, timeout=15
        )
        if resp.status_code != 200:
            print(f"  [Wikipedia] No page found for '{company_name}'")
            return docs
        summary = resp.json()
        title = summary.get("title", company_name)
        page_url = summary.get("content_urls", {}).get("desktop", {}).get("page", "")
    except Exception as e:
        print(f"  [Wikipedia] Error: {e}")
        return docs

    # Get sections list
    try:
        resp = requests.get(
            "https://en.wikipedia.org/w/api.php",
            params={"action": "parse", "page": title, "prop": "sections", "format": "json"},
            headers=HEADERS, timeout=15
        )
        sections = resp.json().get("parse", {}).get("sections", [])
    except Exception:
        sections = []

    # Find controversy/legal sections
    target_indices = []
    for s in sections:
        line = s.get("line", "").lower()
        if any(kw in line for kw in SECTION_KEYWORDS):
            target_indices.append(s.get("index"))

    if target_indices:
        for idx in target_indices[:3]:
            try:
                resp = requests.get(
                    "https://en.wikipedia.org/w/api.php",
                    params={"action": "parse", "page": title, "prop": "wikitext", "section": idx, "format": "json"},
                    headers=HEADERS, timeout=15
                )
                wikitext = resp.json().get("parse", {}).get("wikitext", {}).get("*", "")
                clean = _clean_wikitext(wikitext)
                if len(clean) > 100:
                    section_name = next((s["line"] for s in sections if s.get("index") == idx), "Controversies")
                    docs.append({
                        "company_ticker": ticker,
                        "company_name": company_name,
                        "source_type": "wikipedia",
                        "source_url": page_url,
                        "document_date": None,
                        "title": f"Wikipedia: {title} — {section_name}",
                        "content": clean[:8000],
                    })
            except Exception:
                continue
    else:
        # No controversy section — grab the full article text
        try:
            resp = requests.get(
                "https://en.wikipedia.org/w/api.php",
                params={"action": "parse", "page": title, "prop": "wikitext", "format": "json"},
                headers=HEADERS, timeout=15
            )
            wikitext = resp.json().get("parse", {}).get("wikitext", {}).get("*", "")
            clean = _clean_wikitext(wikitext)
            if len(clean) > 100:
                docs.append({
                    "company_ticker": ticker,
                    "company_name": company_name,
                    "source_type": "wikipedia",
                    "source_url": page_url,
                    "document_date": None,
                    "title": f"Wikipedia: {title}",
                    "content": clean[:10000],
                })
        except Exception:
            pass

    print(f"  [Wikipedia] Found {len(docs)} sections for {ticker}")
    return docs


def _clean_wikitext(text: str) -> str:
    text = re.sub(r'\{\{[^}]*\}\}', '', text)
    text = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', text)
    text = re.sub(r"'{2,}", '', text)
    text = re.sub(r'<ref[^>]*>.*?</ref>', '', text, flags=re.DOTALL)
    text = re.sub(r'<ref[^/]*/>', '', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()
