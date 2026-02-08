import os
from edgar import Company

def scrape(ticker: str) -> list[dict]:
    limit = int(os.getenv("SEC_FILING_LIMIT", "3"))
    docs = []
    try:
        company = Company(ticker)
        name = company.name
        if not name or "Entity" in name:
            return docs
    except Exception:
        return docs

    # 8-K filings
    try:
        filings_8k = company.get_filings(form="8-K").latest(limit)
        for f in filings_8k:
            try:
                text = f.text()[:8000]
                relevant_items = any(item in text.lower() for item in [
                    "item 5.02", "item 8.01", "item 2.06",
                    "harassment", "discrimination", "settlement", "termination"
                ])
                if relevant_items or len(docs) < 2:
                    docs.append({
                        "company_ticker": ticker,
                        "company_name": name,
                        "source_type": "sec_8k",
                        "source_url": f.homepage_url or f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={ticker}&type=8-K",
                        "document_date": str(f.filing_date) if f.filing_date else None,
                        "title": f"8-K Filing - {f.filing_date}",
                        "content": text
                    })
            except Exception:
                continue
    except Exception:
        pass

    # 10-K Risk Factors + Legal Proceedings
    try:
        filing_10k = company.get_filings(form="10-K").latest(1)
        if filing_10k:
            f = filing_10k[0] if hasattr(filing_10k, '__getitem__') else filing_10k
            try:
                text = f.text()[:15000]
                sections = []
                for keyword in ["risk factors", "legal proceedings", "human capital"]:
                    idx = text.lower().find(keyword)
                    if idx >= 0:
                        sections.append(text[max(0, idx - 100):idx + 5000])
                content = "\n\n---\n\n".join(sections) if sections else text[:8000]
                docs.append({
                    "company_ticker": ticker,
                    "company_name": name,
                    "source_type": "sec_10k",
                    "source_url": f.homepage_url or f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={ticker}&type=10-K",
                    "document_date": str(f.filing_date) if f.filing_date else None,
                    "title": f"10-K Annual Report - {f.filing_date}",
                    "content": content
                })
            except Exception:
                pass
    except Exception:
        pass

    # DEF 14A Proxy Statement
    try:
        filing_proxy = company.get_filings(form="DEF 14A").latest(1)
        if filing_proxy:
            f = filing_proxy[0] if hasattr(filing_proxy, '__getitem__') else filing_proxy
            try:
                text = f.text()[:15000]
                sections = []
                for keyword in ["human capital", "diversity", "harassment", "workplace", "employee"]:
                    idx = text.lower().find(keyword)
                    if idx >= 0:
                        sections.append(text[max(0, idx - 100):idx + 3000])
                if sections:
                    docs.append({
                        "company_ticker": ticker,
                        "company_name": name,
                        "source_type": "sec_proxy",
                        "source_url": f.homepage_url or f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={ticker}&type=DEF+14A",
                        "document_date": str(f.filing_date) if f.filing_date else None,
                        "title": f"DEF 14A Proxy Statement - {f.filing_date}",
                        "content": "\n\n---\n\n".join(sections)
                    })
            except Exception:
                pass
    except Exception:
        pass

    print(f"  [SEC EDGAR] Found {len(docs)} documents for {ticker}")
    return docs
