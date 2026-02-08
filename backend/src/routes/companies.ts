import { Router, Request, Response } from 'express';
import { query, parseVariant } from '../services/snowflake';
import { startAnalysis, getJobByTicker } from '../services/analysis';

const router = Router();

const DISCLAIMER = "This analysis is AI-generated from public sources including SEC filings, court records, news articles, and EEOC press releases. It is not legal or financial advice. Data may be incomplete or contain inaccuracies. Always verify information independently before making investment decisions.";

function formatAnalysis(row: any) {
  return {
    id: row.ID,
    company_ticker: row.COMPANY_TICKER,
    company_name: row.COMPANY_NAME,
    accountability_score: row.ACCOUNTABILITY_SCORE,
    summary: row.SUMMARY,
    issues: parseVariant(row.ISSUES),
    response: parseVariant(row.RESPONSE),
    timeline: parseVariant(row.TIMELINE),
    score_breakdown: parseVariant(row.SCORE_BREAKDOWN),
    sources: parseVariant(row.SOURCES),
    document_count: row.DOCUMENT_COUNT,
    model_used: row.MODEL_USED,
    analyzed_at: row.ANALYZED_AT,
    expires_at: row.EXPIRES_AT,
    industry: row.INDUSTRY || null,
    market_cap: row.MARKET_CAP || null,
    disclaimer: DISCLAIMER,
  };
}

router.get('/:ticker', async (req: Request, res: Response) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const rows = await query(
      `SELECT a.*, c.industry, c.market_cap FROM company_analyses a
       LEFT JOIN companies c ON a.company_ticker = c.ticker
       WHERE a.company_ticker = ? AND a.expires_at > CURRENT_TIMESTAMP()
       ORDER BY a.analyzed_at DESC LIMIT 1`,
      [ticker]
    );
    if (!rows.length) {
      res.status(404).json({ error: 'Not analyzed' });
      return;
    }
    res.json(formatAnalysis(rows[0]));
  } catch (err) {
    console.error('[companies] GET /:ticker error:', err);
    res.status(500).json({ error: 'Failed to fetch company data' });
  }
});

router.post('/analyze/:ticker', async (req: Request, res: Response) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const jobId = startAnalysis(ticker);
    res.json({ jobId, ticker });
  } catch (err) {
    console.error('[companies] POST /analyze/:ticker error:', err);
    res.status(500).json({ error: 'Failed to start analysis' });
  }
});

router.get('/analyze/:ticker/status', async (req: Request, res: Response) => {
  try {
    const ticker = req.params.ticker.toUpperCase();

    // First check if we have a completed analysis in Snowflake
    const rows = await query(
      `SELECT a.*, c.industry, c.market_cap FROM company_analyses a
       LEFT JOIN companies c ON a.company_ticker = c.ticker
       WHERE a.company_ticker = ? AND a.expires_at > CURRENT_TIMESTAMP()
       ORDER BY a.analyzed_at DESC LIMIT 1`,
      [ticker]
    );
    if (rows.length) {
      res.json({ status: 'complete', result: formatAnalysis(rows[0]) });
      return;
    }

    // Check in-memory job status for errors
    const job = getJobByTicker(ticker);
    if (job?.status === 'error') {
      res.json({ status: 'error', error: job.error || 'Analysis failed' });
      return;
    }

    res.json({ status: 'processing' });
  } catch (err) {
    console.error('[companies] GET /analyze/:ticker/status error:', err);
    // If Snowflake query fails, check job status as fallback
    const job = getJobByTicker(req.params.ticker.toUpperCase());
    if (job?.status === 'error') {
      res.json({ status: 'error', error: job.error || 'Analysis failed' });
    } else if (job?.status === 'complete') {
      // Job completed but Snowflake query failed — likely a DB read issue
      res.json({ status: 'error', error: 'Analysis completed but failed to read results' });
    } else {
      res.json({ status: 'processing' });
    }
  }
});

router.get('/:ticker/alternatives', async (req: Request, res: Response) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const company = await query(
      `SELECT c.industry, c.market_cap FROM companies c WHERE c.ticker = ?`,
      [ticker]
    );
    if (!company.length || !company[0].INDUSTRY) {
      res.json([]);
      return;
    }
    const { INDUSTRY, MARKET_CAP } = company[0];
    const minCap = (MARKET_CAP || 0) * 0.3;
    const maxCap = (MARKET_CAP || 1e15) * 3;

    const alts = await query(
      `SELECT a.company_ticker, a.company_name, a.accountability_score, a.summary, c.industry, c.market_cap
       FROM company_analyses a
       JOIN companies c ON a.company_ticker = c.ticker
       WHERE c.industry = ? AND a.company_ticker != ? AND a.accountability_score >= 7
         AND a.expires_at > CURRENT_TIMESTAMP()
         AND (c.market_cap IS NULL OR (c.market_cap >= ? AND c.market_cap <= ?))
       ORDER BY a.accountability_score DESC LIMIT 5`,
      [INDUSTRY, ticker, minCap, maxCap]
    );
    res.json(alts.map(r => ({
      ticker: r.COMPANY_TICKER,
      name: r.COMPANY_NAME,
      score: r.ACCOUNTABILITY_SCORE,
      summary: r.SUMMARY,
      industry: r.INDUSTRY,
      market_cap: r.MARKET_CAP,
    })));
  } catch (err) {
    console.error('[companies] GET /:ticker/alternatives error:', err);
    res.json([]);
  }
});

export default router;
