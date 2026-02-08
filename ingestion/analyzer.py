import json
import snowflake.connector
import os
from dotenv import load_dotenv
from loader import get_connection

load_dotenv()

HIGH_AUTHORITY = {"sec_8k", "sec_10k", "sec_proxy", "court_opinion"}
MEDIUM_AUTHORITY = {"news_article", "eeoc_release"}
LOW_AUTHORITY = {"reddit_post", "glassdoor_proxy", "social_news", "wikipedia"}

ANALYSIS_PROMPT = """You are analyzing workplace accountability for {company_name} ({ticker}).

Documents from SEC filings, court records, news, EEOC, Reddit, Wikipedia, and other sources:
{formatted_docs}

Additional signals:
- Reddit sentiment score (average across {reddit_count} posts): {avg_sentiment} (-1 to 1 scale, where -1=very negative, 1=very positive)
- Data sources available: {source_types}
- Total documents analyzed: {doc_count}

Weight your analysis appropriately:
- SEC filings and court records are highest authority
- EEOC press releases are high authority
- News articles are medium authority
- Reddit posts and social media coverage are lower authority but useful for pattern detection
- Wikipedia is useful for historical context
- If only low-authority sources are available, note this in your summary and widen your confidence interval on the score

Return ONLY valid JSON (no markdown, no explanation):
{{
  "accountability_score": <1-10, where 1-3=serious unresolved issues, 4-6=incomplete response, 7-8=well-handled, 9-10=excellent record>,
  "summary": "<one concise sentence summarizing the company's accountability record>",
  "data_quality": "<high|medium|low>",
  "data_quality_detail": "<short sentence explaining what sources were available>",
  "issues": [
    {{
      "type": "<sexual_harassment|discrimination|assault|retaliation|pay_gap|hostile_work_environment>",
      "date": "YYYY-MM-DD",
      "status": "<settled|ongoing|dismissed|unknown>",
      "settlement_amount": <integer or null>,
      "affected_parties": <integer or null>,
      "description": "<2-3 sentences>",
      "source_urls": []
    }}
  ],
  "response": {{
    "actions_taken": ["<specific action the company took>"],
    "gaps": ["<specific gap in their response>"]
  }},
  "timeline": [
    {{"date": "YYYY-MM-DD", "event": "<description>"}}
  ],
  "score_breakdown": {{
    "severity": "<high|medium|low>",
    "response_quality": <1-10>,
    "transparency": <1-10>,
    "speed": "<fast|moderate|slow>",
    "current_status": "<resolved|monitoring|ongoing>",
    "pattern_analysis": "<one sentence about whether issues are systemic or isolated>"
  }},
  "sources": [
    {{"url": "<source_url>", "title": "<title>", "type": "<source_type>", "date": "<date>"}}
  ]
}}

Data quality rules:
- "high" = SEC filings or court records are present
- "medium" = News articles or EEOC data present but no court/SEC filings
- "low" = Only Reddit, Wikipedia, social media, or general knowledge

If the documents contain no relevant workplace accountability issues, return a score of 8-10 and empty issues array. Be thorough but fair.

Keep your response under 4000 tokens."""


def _get_sentiment(cur, ticker: str) -> tuple[float, int]:
    try:
        cur.execute("""
            SELECT AVG(SNOWFLAKE.CORTEX.SENTIMENT(content)) as avg_sent, COUNT(*) as cnt
            FROM raw_documents
            WHERE company_ticker = %s AND source_type = 'reddit_post'
              AND content IS NOT NULL AND LENGTH(content) > 50
        """, (ticker,))
        row = cur.fetchone()
        if row and row[0] is not None:
            return round(float(row[0]), 3), int(row[1])
    except Exception as e:
        print(f"  Sentiment query failed (non-critical): {e}")
    return 0.0, 0


def _get_source_types(cur, ticker: str) -> list[str]:
    try:
        cur.execute(
            "SELECT DISTINCT source_type FROM raw_documents WHERE company_ticker = %s",
            (ticker,)
        )
        return [row[0] for row in cur.fetchall()]
    except Exception:
        return []


def analyze(ticker: str, company_name: str) -> dict | None:
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM company_analyses WHERE company_ticker = %s AND expires_at > CURRENT_TIMESTAMP() ORDER BY analyzed_at DESC LIMIT 1",
            (ticker,)
        )
        row = cur.fetchone()
        if row:
            print(f"  Using cached analysis for {ticker}")
            return _row_to_dict(cur.description, row)

        # Query Cortex Search (may not be ready if freshly created)
        docs_text = ""
        results = None
        try:
            cur.execute(f"""
                SELECT PARSE_JSON(
                    SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
                        'hera_doc_search',
                        '{{"query": "{company_name} workplace harassment discrimination", "columns": ["content", "company_ticker", "source_type", "title", "source_url"], "filter": {{"@eq": {{"company_ticker": "{ticker}"}}}}, "limit": 20}}'
                    )
                )['results'] as results
            """)
            search_results = cur.fetchone()

            if search_results and search_results[0]:
                results = json.loads(search_results[0]) if isinstance(search_results[0], str) else search_results[0]
                docs_text = _format_docs(results)
        except Exception as e:
            print(f"  Cortex Search query failed (may not be ready): {e}")

        # Fallback: raw_documents
        if not docs_text:
            print(f"  No results from Cortex Search for {ticker}, trying raw_documents...")
            cur.execute("""
                SELECT content, company_ticker, source_type, title, source_url, document_date
                FROM raw_documents
                WHERE company_ticker = %s AND content IS NOT NULL AND LENGTH(content) > 50
                ORDER BY document_date DESC NULLS LAST
                LIMIT 20
            """, (ticker,))
            rows = cur.fetchall()
            if rows:
                colnames = [d[0].lower() for d in cur.description]
                results = [dict(zip(colnames, row)) for row in rows]
                docs_text = _format_docs(results)
                print(f"  Using {len(results)} documents from raw_documents")
            if not docs_text:
                print(f"  No documents found for {ticker}")
                return None

        # Get multi-signal context
        avg_sentiment, reddit_count = _get_sentiment(cur, ticker)
        source_types = _get_source_types(cur, ticker)
        doc_count = len(results) if results else 0

        prompt = ANALYSIS_PROMPT.format(
            company_name=company_name,
            ticker=ticker,
            formatted_docs=docs_text,
            reddit_count=reddit_count,
            avg_sentiment=avg_sentiment,
            source_types=", ".join(source_types) if source_types else "none",
            doc_count=doc_count,
        )

        # Call Cortex COMPLETE (simple two-argument form)
        cur.execute(
            "SELECT SNOWFLAKE.CORTEX.COMPLETE(%s, %s) as analysis",
            ('claude-4-sonnet', prompt)
        )
        result = cur.fetchone()
        if not result or not result[0]:
            print(f"  Cortex COMPLETE returned empty for {ticker}")
            return None

        raw = result[0]
        analysis = _parse_json(raw)
        if not analysis:
            retry_prompt = f"Fix this invalid JSON and return ONLY valid JSON:\n{raw}"
            cur.execute(
                "SELECT SNOWFLAKE.CORTEX.COMPLETE(%s, %s) as analysis",
                ('claude-4-sonnet', retry_prompt)
            )
            result = cur.fetchone()
            analysis = _parse_json(result[0]) if result else None

        if not analysis:
            print(f"  Failed to parse analysis JSON for {ticker}")
            return None

        # Ensure data_quality exists
        if "data_quality" not in analysis:
            st_set = set(source_types)
            if st_set & HIGH_AUTHORITY:
                analysis["data_quality"] = "high"
            elif st_set & MEDIUM_AUTHORITY:
                analysis["data_quality"] = "medium"
            else:
                analysis["data_quality"] = "low"
            analysis["data_quality_detail"] = f"Based on {', '.join(source_types)}" if source_types else "Limited data"

        # Insert analysis (use SELECT with PARSE_JSON since VALUES clause can't call functions)
        score_breakdown_full = {
            **analysis.get("score_breakdown", {}),
            "data_quality": analysis.get("data_quality", "unknown"),
            "data_quality_detail": analysis.get("data_quality_detail", ""),
        }
        cur.execute("""
            INSERT INTO company_analyses (company_ticker, company_name, accountability_score, summary, issues, response, timeline, score_breakdown, sources, document_count)
            SELECT %s, %s, %s, %s, PARSE_JSON(%s), PARSE_JSON(%s), PARSE_JSON(%s), PARSE_JSON(%s), PARSE_JSON(%s), %s
        """, (
            ticker, company_name,
            analysis["accountability_score"],
            analysis["summary"],
            json.dumps(analysis.get("issues", [])),
            json.dumps(analysis.get("response", {})),
            json.dumps(analysis.get("timeline", [])),
            json.dumps(score_breakdown_full),
            json.dumps(analysis.get("sources", [])),
            doc_count,
        ))

        # Upsert companies
        cur.execute("""
            MERGE INTO companies t USING (SELECT %s as ticker, %s as name) s
            ON t.ticker = s.ticker
            WHEN NOT MATCHED THEN INSERT (ticker, name) VALUES (s.ticker, s.name)
        """, (ticker, company_name))

        conn.commit()
        print(f"  Analysis complete for {ticker}: score={analysis['accountability_score']} quality={analysis.get('data_quality')}")
        return analysis
    finally:
        conn.close()


def _format_docs(docs: list[dict]) -> str:
    out = ""
    for i, doc in enumerate(docs):
        out += f"\n--- Document {i+1} [{doc.get('source_type', 'unknown')}] ---\n"
        out += f"Title: {doc.get('title', 'N/A')}\n"
        out += f"Source: {doc.get('source_url', 'N/A')}\n"
        out += f"{doc.get('content', '')[:3000]}\n"
    return out


def _parse_json(raw: str) -> dict | None:
    if not raw:
        return None
    try:
        if isinstance(raw, str):
            raw = raw.strip()
            # Strip markdown code fences (```json ... ``` or ``` ... ```)
            if raw.startswith("```"):
                # Remove opening fence (with optional language tag)
                raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
                if raw.endswith("```"):
                    raw = raw[:-3]
                elif "```" in raw:
                    raw = raw.rsplit("```", 1)[0]
                raw = raw.strip()
            return json.loads(raw)
        return raw
    except json.JSONDecodeError:
        # Try extracting the first JSON object
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(raw[start:end])
            except json.JSONDecodeError:
                return None
        return None


def _row_to_dict(description, row):
    return {desc[0].lower(): val for desc, val in zip(description, row)}
