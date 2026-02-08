import os
import requests
import time

HEADERS = {"User-Agent": "hera:v1.0 (accountability research)"}

def scrape(ticker: str, company_name: str) -> list[dict]:
    post_limit = int(os.getenv("REDDIT_POST_LIMIT", "5"))
    comment_limit = int(os.getenv("REDDIT_COMMENT_LIMIT", "3"))
    docs = []
    query = f'"{company_name}" (harassment OR discrimination OR toxic OR lawsuit OR workplace)'

    # Global search
    try:
        resp = requests.get(
            "https://www.reddit.com/search.json",
            params={"q": query, "sort": "relevance", "limit": post_limit},
            headers=HEADERS, timeout=15
        )
        if resp.status_code == 429:
            print("  [Reddit] Rate limited on global search, skipping")
            return docs
        if resp.status_code == 200:
            _extract_posts(resp.json(), ticker, company_name, docs)
        time.sleep(1)
    except Exception as e:
        print(f"  [Reddit] Global search error: {e}")

    # Subreddit searches — only r/news and r/technology for speed
    for sub in ["news", "technology"]:
        try:
            resp = requests.get(
                f"https://www.reddit.com/r/{sub}/search.json",
                params={"q": f'"{company_name}"', "restrict_sr": "on", "limit": post_limit},
                headers=HEADERS, timeout=15
            )
            if resp.status_code == 429:
                print(f"  [Reddit] Rate limited on r/{sub}, stopping subreddit searches")
                break
            if resp.status_code == 200:
                _extract_posts(resp.json(), ticker, company_name, docs)
            time.sleep(1)
        except Exception:
            continue

    # Fetch top comments for high-scoring posts
    seen_ids = set()
    comments_fetched = 0
    for doc in docs[:post_limit]:
        if comments_fetched >= comment_limit:
            break
        post_id = doc.get("_post_id")
        if not post_id or post_id in seen_ids:
            continue
        seen_ids.add(post_id)
        if doc.get("_score", 0) < 10:
            continue
        try:
            resp = requests.get(
                f"https://www.reddit.com/comments/{post_id}.json",
                headers=HEADERS, timeout=15
            )
            if resp.status_code == 429:
                break
            if resp.status_code == 200:
                data = resp.json()
                if len(data) > 1:
                    comments = []
                    for child in data[1].get("data", {}).get("children", [])[:5]:
                        body = child.get("data", {}).get("body", "")
                        if body and body != "[deleted]":
                            comments.append(body)
                    if comments:
                        doc["content"] += "\n\n--- Top Comments ---\n" + "\n---\n".join(comments)
                        comments_fetched += 1
            time.sleep(1)
        except Exception:
            continue

    # Clean internal fields
    for doc in docs:
        doc.pop("_post_id", None)
        doc.pop("_score", None)

    # Dedupe by URL
    seen_urls = set()
    unique = []
    for doc in docs:
        if doc["source_url"] not in seen_urls:
            seen_urls.add(doc["source_url"])
            unique.append(doc)

    print(f"  [Reddit] Found {len(unique)} posts for {ticker}")
    return unique


def _extract_posts(data: dict, ticker: str, company_name: str, docs: list):
    children = data.get("data", {}).get("children", [])
    for child in children:
        post = child.get("data", {})
        title = post.get("title", "")
        selftext = post.get("selftext", "")
        if not title:
            continue
        content = f"{title}\n\n{selftext}".strip()
        if len(content) < 30:
            continue
        permalink = post.get("permalink", "")
        docs.append({
            "company_ticker": ticker,
            "company_name": company_name,
            "source_type": "reddit_post",
            "source_url": f"https://www.reddit.com{permalink}" if permalink else "",
            "document_date": None,
            "title": title[:500],
            "content": content[:8000],
            "_post_id": post.get("id"),
            "_score": post.get("score", 0),
        })
