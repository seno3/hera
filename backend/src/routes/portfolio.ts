import { Router, Request, Response } from 'express';
import { query, parseVariant } from '../services/snowflake';

const router = Router();

router.post('/scan', async (req: Request, res: Response) => {
  const { tickers } = req.body as { tickers: string[] };
  if (!tickers?.length) return res.status(400).json({ error: 'tickers required' });

  const upperTickers = tickers.map(t => t.trim().toUpperCase());
  const placeholders = upperTickers.map(() => '?').join(',');

  const rows = await query(
    `SELECT a.company_ticker, a.company_name, a.accountability_score, a.summary,
            a.issues, a.score_breakdown
     FROM company_analyses a
     WHERE a.company_ticker IN (${placeholders}) AND a.expires_at > CURRENT_TIMESTAMP()
     QUALIFY ROW_NUMBER() OVER (PARTITION BY a.company_ticker ORDER BY a.analyzed_at DESC) = 1`,
    upperTickers
  );

  const analyzed = new Map(rows.map(r => [r.COMPANY_TICKER, r]));

  const holdings = upperTickers.map(t => {
    const row = analyzed.get(t);
    if (!row) return { ticker: t, name: t, accountability_score: null, severity: null, summary: null, analyzed: false };
    const breakdown = parseVariant(row.SCORE_BREAKDOWN);
    return {
      ticker: t,
      name: row.COMPANY_NAME,
      accountability_score: row.ACCOUNTABILITY_SCORE,
      severity: breakdown?.severity || null,
      summary: row.SUMMARY,
      analyzed: true,
    };
  });

  const flagged = holdings.filter(h => h.analyzed && h.accountability_score !== null && h.accountability_score <= 5);
  const clean = holdings.filter(h => h.analyzed && h.accountability_score !== null && h.accountability_score > 5);
  const notAnalyzed = holdings.filter(h => !h.analyzed);

  let totalIncidents = 0;
  let totalAffected = 0;
  for (const row of rows) {
    if (row.ACCOUNTABILITY_SCORE <= 5) {
      const issues = parseVariant(row.ISSUES) || [];
      totalIncidents += issues.length;
      for (const issue of issues) {
        totalAffected += issue.affected_parties || 0;
      }
    }
  }

  const impact = flagged.length > 0
    ? `Your portfolio includes ${flagged.length} compan${flagged.length === 1 ? 'y' : 'ies'} with unresolved accountability issues affecting an estimated ${totalAffected.toLocaleString()} employees across ${totalIncidents} incident${totalIncidents === 1 ? '' : 's'}.`
    : '';

  res.json({
    total: upperTickers.length,
    flagged: flagged.length,
    clean: clean.length,
    not_analyzed: notAnalyzed.length,
    holdings,
    impact_statement: impact,
  });
});

export default router;
