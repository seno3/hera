import sys
import json
import edgar
edgar.set_identity("Hera Research hera@example.com")

def looks_like_ticker(s: str) -> bool:
    return bool(s) and len(s) <= 5 and s.isalpha() and s == s.upper()

def resolve(input_str: str) -> dict:
    from edgar import Company, find
    clean = input_str.strip()

    # If it looks like a ticker (e.g. MSFT, AAPL), try Company() directly
    if looks_like_ticker(clean.upper()):
        try:
            c = Company(clean.upper())
            if c.name and "Entity" not in c.name:
                ticker = c.tickers[0] if c.tickers else clean.upper()
                return {"input": input_str, "ticker": ticker.upper(), "company_name": c.name}
        except Exception:
            pass

    # Search by name using edgar's find()
    try:
        results = find(clean)
        if results and len(results) > 0:
            company = results[0]
            ticker = company.tickers[0] if company.tickers else None
            name = company.name
            if ticker:
                return {"input": input_str, "ticker": ticker.upper(), "company_name": name}
    except Exception:
        pass

    return {"input": input_str, "ticker": None, "company_name": None}

if __name__ == "__main__":
    inputs = json.loads(sys.argv[1])
    results = [resolve(i) for i in inputs]
    print(json.dumps(results))
