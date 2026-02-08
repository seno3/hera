import { Router, Request, Response } from 'express';
import { query } from '../services/snowflake';
import { startAnalysis } from '../services/analysis';

const router = Router();

const NESSIE_API_KEY = process.env.NESSIE_API_KEY || '';
const NESSIE_BASE = 'http://api.nessieisreal.com';

// ──────────────────────────────────────────────────────
//  Merchant → Ticker mapping (~30 common merchants)
// ──────────────────────────────────────────────────────

const MERCHANT_TICKER_MAP: Record<string, string> = {
  // Tech
  apple: 'AAPL',
  'apple store': 'AAPL',
  amazon: 'AMZN',
  'amazon.com': 'AMZN',
  'amazon prime': 'AMZN',
  'whole foods': 'AMZN',
  google: 'GOOGL',
  'google cloud': 'GOOGL',
  microsoft: 'MSFT',
  meta: 'META',
  facebook: 'META',
  instagram: 'META',
  netflix: 'NFLX',
  spotify: 'SPOT',
  uber: 'UBER',
  'uber eats': 'UBER',
  lyft: 'LYFT',
  tesla: 'TSLA',
  adobe: 'ADBE',
  salesforce: 'CRM',
  nvidia: 'NVDA',
  'nvidia corp': 'NVDA',

  // Retail
  walmart: 'WMT',
  target: 'TGT',
  costco: 'COST',
  'home depot': 'HD',
  lowes: 'LOW',
  "lowe's": 'LOW',
  nike: 'NKE',
  'nike store': 'NKE',
  starbucks: 'SBUX',
  'mcdonald\'s': 'MCD',
  mcdonalds: 'MCD',
  chipotle: 'CMG',
  'chick-fil-a': 'CFA',

  // Finance / Services
  'at&t': 'T',
  att: 'T',
  verizon: 'VZ',
  't-mobile': 'TMUS',
  comcast: 'CMCSA',
  disney: 'DIS',
  'walt disney': 'DIS',
  'disney+': 'DIS',
  'johnson & johnson': 'JNJ',
  'procter & gamble': 'PG',
  'coca-cola': 'KO',
  'coca cola': 'KO',
  pepsi: 'PEP',
  pepsico: 'PEP',

  // Airlines / Travel
  delta: 'DAL',
  'delta airlines': 'DAL',
  united: 'UAL',
  'united airlines': 'UAL',
  american: 'AAL',
  'american airlines': 'AAL',
  southwest: 'LUV',
  'southwest airlines': 'LUV',
  airbnb: 'ABNB',
  booking: 'BKNG',
  'booking.com': 'BKNG',

  // Other
  'activision blizzard': 'ATVI',
  activision: 'ATVI',
  paypal: 'PYPL',
  visa: 'V',
  mastercard: 'MA',
};

function resolveMerchantToTicker(merchantName: string): string | null {
  const normalized = merchantName.toLowerCase().trim();
  // Direct match
  if (MERCHANT_TICKER_MAP[normalized]) return MERCHANT_TICKER_MAP[normalized];
  // Partial match (merchant name contains a key)
  for (const [key, ticker] of Object.entries(MERCHANT_TICKER_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return ticker;
  }
  return null;
}

// ──────────────────────────────────────────────────────
//  Helper: Fetch from Nessie with key
// ──────────────────────────────────────────────────────

async function nessieFetch(path: string, options?: RequestInit) {
  const separator = path.includes('?') ? '&' : '?';
  const url = `${NESSIE_BASE}${path}${separator}key=${NESSIE_API_KEY}`;
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Nessie API ${res.status}: ${body}`);
  }
  const text = await res.text();
  if (!text) return {};
  return JSON.parse(text);
}

// ──────────────────────────────────────────────────────
//  POST /setup-demo — Create demo data in Nessie
// ──────────────────────────────────────────────────────

const DEMO_MERCHANTS = [
  'Apple Inc',
  'Tesla Inc',
  'Microsoft Corp',
  'Uber Technologies',
  'Activision Blizzard',
  'NVIDIA Corp',
  'Salesforce Inc',
  'Adobe Inc',
];

router.post('/setup-demo', async (_req: Request, res: Response) => {
  if (!NESSIE_API_KEY) return res.status(500).json({ error: 'NESSIE_API_KEY not configured' });

  try {
    // 1. Check for existing Demo User and delete them
    const existingCustomers: any[] = await nessieFetch('/customers');
    for (const c of existingCustomers) {
      if (c.first_name === 'Demo' && c.last_name === 'User') {
        try {
          // Delete accounts (and their purchases) for this customer
          const accounts: any[] = await nessieFetch(`/customers/${c._id}/accounts`);
          for (const acc of accounts) {
            try { await nessieFetch(`/accounts/${acc._id}`, { method: 'DELETE' }); } catch {}
          }
          await nessieFetch(`/customers/${c._id}`, { method: 'DELETE' });
        } catch {
          // Best-effort cleanup
        }
      }
    }

    // 2. Create customer
    const customerResult = await nessieFetch('/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: 'Demo',
        last_name: 'User',
        address: {
          street_number: '123',
          street_name: 'Main St',
          city: 'Arlington',
          state: 'VA',
          zip: '22201',
        },
      }),
    });
    const customerId = customerResult.objectCreated?._id || customerResult._id;

    // 3. Create account
    const accountResult = await nessieFetch(`/customers/${customerId}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'Credit Card',
        nickname: 'Investment Portfolio',
        rewards: 0,
        balance: 50000,
      }),
    });
    const accountId = accountResult.objectCreated?._id || accountResult._id;

    // 4. Create merchants
    const merchantIds: { name: string; id: string }[] = [];
    for (const name of DEMO_MERCHANTS) {
      const result = await nessieFetch('/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          address: {
            street_number: '1',
            street_name: 'Market St',
            city: 'San Francisco',
            state: 'CA',
            zip: '94105',
          },
          geocode: { lat: 37.7749, lng: -122.4194 },
        }),
      });
      merchantIds.push({ name, id: result.objectCreated?._id || result._id });
    }

    // 5. Create purchases (1-3 per merchant)
    let purchasesCreated = 0;
    const purchaseDates = ['2024-06-15', '2024-07-20', '2024-08-10'];
    for (const merchant of merchantIds) {
      const count = 1 + Math.floor(Math.random() * 3); // 1-3
      for (let i = 0; i < count; i++) {
        const amount = Math.round((1000 + Math.random() * 14000) * 100) / 100;
        await nessieFetch(`/accounts/${accountId}/purchases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchant_id: merchant.id,
            medium: 'balance',
            purchase_date: purchaseDates[i % purchaseDates.length],
            amount,
            description: `Stock purchase - ${merchant.name}`,
          }),
        });
        purchasesCreated++;
      }
    }

    res.json({
      customerId,
      accountId,
      merchants_created: merchantIds.length,
      purchases_created: purchasesCreated,
    });
  } catch (e: any) {
    console.error('Nessie setup-demo error:', e.message);
    res.status(500).json({ error: 'Failed to set up demo data: ' + e.message });
  }
});

// ──────────────────────────────────────────────────────
//  Existing endpoints (kept for backward compat)
// ──────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
  if (!NESSIE_API_KEY) return res.status(500).json({ error: 'NESSIE_API_KEY not configured' });
  const { first_name, last_name } = req.body || {};
  if (!first_name || !last_name) return res.status(400).json({ error: 'first_name and last_name required' });

  try {
    const customers: any[] = await nessieFetch('/customers');
    const found = customers.find(
      (c: any) =>
        c.first_name?.toLowerCase() === first_name.toLowerCase() &&
        c.last_name?.toLowerCase() === last_name.toLowerCase()
    );
    if (found) return res.json({ customer: found, created: false });

    const result = await nessieFetch('/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name,
        last_name,
        address: { street_number: '1', street_name: 'Main St', city: 'New York', state: 'NY', zip: '10001' },
      }),
    });
    res.json({ customer: result.objectCreated || result, created: true });
  } catch (e: any) {
    console.error('Nessie login error:', e.message);
    res.status(500).json({ error: 'Nessie API error' });
  }
});

// ──────────────────────────────────────────────────────
//  GET /customers — list all Nessie customers
// ──────────────────────────────────────────────────────

router.get('/customers', async (_req: Request, res: Response) => {
  if (!NESSIE_API_KEY) return res.status(500).json({ error: 'NESSIE_API_KEY not configured' });
  try {
    const customers = await nessieFetch('/customers');
    res.json(customers);
  } catch (e: any) {
    console.error('Nessie customers error:', e.message);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// ──────────────────────────────────────────────────────
//  GET /customers/:customerId/accounts
// ──────────────────────────────────────────────────────

router.get('/customers/:customerId/accounts', async (req: Request, res: Response) => {
  if (!NESSIE_API_KEY) return res.status(500).json({ error: 'NESSIE_API_KEY not configured' });
  try {
    const accounts = await nessieFetch(`/customers/${req.params.customerId}/accounts`);
    res.json(accounts);
  } catch (e: any) {
    console.error('Nessie accounts error:', e.message);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Keep old route for backward compat
router.get('/accounts/:customerId', async (req: Request, res: Response) => {
  if (!NESSIE_API_KEY) return res.status(500).json({ error: 'NESSIE_API_KEY not configured' });
  try {
    const accounts = await nessieFetch(`/customers/${req.params.customerId}/accounts`);
    res.json(accounts);
  } catch (e: any) {
    console.error('Nessie accounts error:', e.message);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// ──────────────────────────────────────────────────────
//  GET /accounts/:accountId/purchases
// ──────────────────────────────────────────────────────

router.get('/accounts/:accountId/purchases', async (req: Request, res: Response) => {
  if (!NESSIE_API_KEY) return res.status(500).json({ error: 'NESSIE_API_KEY not configured' });
  try {
    const purchases = await nessieFetch(`/accounts/${req.params.accountId}/purchases`);
    res.json(purchases);
  } catch (e: any) {
    console.error('Nessie purchases error:', e.message);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// Keep old route for backward compat
router.get('/purchases/:accountId', async (req: Request, res: Response) => {
  if (!NESSIE_API_KEY) return res.status(500).json({ error: 'NESSIE_API_KEY not configured' });
  try {
    const purchases = await nessieFetch(`/accounts/${req.params.accountId}/purchases`);
    res.json(purchases);
  } catch (e: any) {
    console.error('Nessie purchases error:', e.message);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// ──────────────────────────────────────────────────────
//  POST /accounts/:customerId — create account (kept)
// ──────────────────────────────────────────────────────

router.post('/accounts/:customerId', async (req: Request, res: Response) => {
  if (!NESSIE_API_KEY) return res.status(500).json({ error: 'NESSIE_API_KEY not configured' });
  const { type = 'Checking', nickname = 'Hera Account', balance = 1000 } = req.body || {};
  try {
    const result = await nessieFetch(`/customers/${req.params.customerId}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, nickname, rewards: 0, balance }),
    });
    res.json(result.objectCreated || result);
  } catch (e: any) {
    console.error('Nessie create account error:', e.message);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// ──────────────────────────────────────────────────────
//  GET /profile/:customerId — Full profile with portfolio
// ──────────────────────────────────────────────────────

router.get('/profile/:customerId', async (req: Request, res: Response) => {
  if (!NESSIE_API_KEY) return res.status(500).json({ error: 'NESSIE_API_KEY not configured' });

  try {
    const { customerId } = req.params;

    // 1. Fetch customer info
    const customer = await nessieFetch(`/customers/${customerId}`);

    // 2. Fetch all accounts
    const accounts: any[] = await nessieFetch(`/customers/${customerId}/accounts`);

    // 3. Fetch all purchases across all accounts
    const allPurchases: any[] = [];
    for (const account of accounts) {
      try {
        const purchases = await nessieFetch(`/accounts/${account._id}/purchases`);
        if (Array.isArray(purchases)) {
          allPurchases.push(...purchases.map((p: any) => ({ ...p, account_id: account._id })));
        }
      } catch {
        // Some accounts may not support purchases
      }
    }

    // 4. Resolve merchant IDs to names via Nessie API
    const merchantNameCache = new Map<string, string>();
    for (const p of allPurchases) {
      const mid = p.merchant_id;
      if (mid && !merchantNameCache.has(mid)) {
        try {
          const merchant = await nessieFetch(`/merchants/${mid}`);
          merchantNameCache.set(mid, merchant.name || mid);
        } catch {
          merchantNameCache.set(mid, p.description || mid);
        }
      }
    }

    // 5. Aggregate by merchant name
    const merchantMap = new Map<string, { total_invested: number; num_purchases: number }>();
    for (const p of allPurchases) {
      const name = merchantNameCache.get(p.merchant_id) || p.description || 'Unknown';
      const existing = merchantMap.get(name) || { total_invested: 0, num_purchases: 0 };
      existing.total_invested += p.amount || 0;
      existing.num_purchases += 1;
      merchantMap.set(name, existing);
    }

    // 6. Resolve merchants to tickers and check Snowflake for analyses
    const holdings: any[] = [];
    const tickersToCheck = new Set<string>();
    const merchantEntries: { merchant_name: string; ticker: string | null; total_invested: number; num_purchases: number }[] = [];

    for (const [merchantName, stats] of merchantMap) {
      const ticker = resolveMerchantToTicker(merchantName);
      merchantEntries.push({
        merchant_name: merchantName,
        ticker,
        total_invested: Math.round(stats.total_invested * 100) / 100,
        num_purchases: stats.num_purchases,
      });
      if (ticker) tickersToCheck.add(ticker);
    }

    // Batch check which tickers have analyses in Snowflake
    const analysisMap = new Map<string, { score: number; severity: string | null; summary: string }>();
    if (tickersToCheck.size > 0) {
      try {
        const placeholders = Array.from(tickersToCheck).map(() => '?').join(',');
        const rows = await query(
          `SELECT company_ticker, accountability_score, summary, score_breakdown
           FROM company_analyses
           WHERE company_ticker IN (${placeholders})
             AND expires_at > CURRENT_TIMESTAMP()
           ORDER BY analyzed_at DESC`,
          Array.from(tickersToCheck)
        );
        for (const row of rows) {
          if (!analysisMap.has(row.COMPANY_TICKER)) {
            let severity: string | null = null;
            try {
              const breakdown = typeof row.SCORE_BREAKDOWN === 'string'
                ? JSON.parse(row.SCORE_BREAKDOWN)
                : row.SCORE_BREAKDOWN;
              severity = breakdown?.severity || null;
            } catch {}
            analysisMap.set(row.COMPANY_TICKER, {
              score: row.ACCOUNTABILITY_SCORE,
              severity,
              summary: row.SUMMARY,
            });
          }
        }
      } catch (err) {
        console.error('[Nessie] Snowflake query error:', err);
      }
    }

    // 7. Build holdings array
    for (const entry of merchantEntries) {
      if (!entry.ticker) continue; // Skip merchants we can't resolve
      const analysis = analysisMap.get(entry.ticker);
      holdings.push({
        merchant_name: entry.merchant_name,
        ticker: entry.ticker,
        total_invested: entry.total_invested,
        num_purchases: entry.num_purchases,
        has_analysis: !!analysis,
        score: analysis?.score ?? null,
        severity: analysis?.severity ?? null,
        summary: analysis?.summary ?? null,
      });
    }

    // Sort: analyzed first (by score ascending — worse = more attention), then unanalyzed
    holdings.sort((a, b) => {
      if (a.has_analysis !== b.has_analysis) return a.has_analysis ? -1 : 1;
      if (a.score !== null && b.score !== null) return a.score - b.score;
      return b.total_invested - a.total_invested;
    });

    const total_invested = holdings.reduce((sum, h) => sum + h.total_invested, 0);

    res.json({
      customer: {
        id: customer._id,
        first_name: customer.first_name,
        last_name: customer.last_name,
      },
      total_invested: Math.round(total_invested * 100) / 100,
      accounts: accounts.map((a: any) => ({
        id: a._id,
        type: a.type,
        nickname: a.nickname,
        balance: a.balance,
        rewards: a.rewards,
      })),
      holdings,
      total_purchases: allPurchases.length,
      unresolved_merchants: merchantEntries.filter(e => !e.ticker).map(e => e.merchant_name),
    });
  } catch (e: any) {
    console.error('Nessie profile error:', e.message);
    res.status(500).json({ error: 'Failed to build profile' });
  }
});

// ──────────────────────────────────────────────────────
//  POST /profile/:customerId/analyze-all
// ──────────────────────────────────────────────────────

router.post('/profile/:customerId/analyze-all', async (req: Request, res: Response) => {
  if (!NESSIE_API_KEY) return res.status(500).json({ error: 'NESSIE_API_KEY not configured' });

  try {
    const { customerId } = req.params;

    // Fetch accounts & purchases
    const accounts: any[] = await nessieFetch(`/customers/${customerId}/accounts`);
    const allPurchases: any[] = [];
    for (const account of accounts) {
      try {
        const purchases = await nessieFetch(`/accounts/${account._id}/purchases`);
        if (Array.isArray(purchases)) allPurchases.push(...purchases);
      } catch {}
    }

    // Resolve merchant IDs to names, then to tickers
    const merchantNameCache = new Map<string, string>();
    for (const p of allPurchases) {
      const mid = p.merchant_id;
      if (mid && !merchantNameCache.has(mid)) {
        try {
          const merchant = await nessieFetch(`/merchants/${mid}`);
          merchantNameCache.set(mid, merchant.name || mid);
        } catch {
          merchantNameCache.set(mid, p.description || mid);
        }
      }
    }

    const tickerSet = new Set<string>();
    for (const p of allPurchases) {
      const name = merchantNameCache.get(p.merchant_id) || p.description || '';
      const ticker = resolveMerchantToTicker(name);
      if (ticker) tickerSet.add(ticker);
    }

    // Check which already have analyses
    const tickersArray = Array.from(tickerSet);
    const alreadyAnalyzed = new Set<string>();

    if (tickersArray.length > 0) {
      try {
        const placeholders = tickersArray.map(() => '?').join(',');
        const rows = await query(
          `SELECT DISTINCT company_ticker FROM company_analyses
           WHERE company_ticker IN (${placeholders}) AND expires_at > CURRENT_TIMESTAMP()`,
          tickersArray
        );
        for (const row of rows) alreadyAnalyzed.add(row.COMPANY_TICKER);
      } catch (err) {
        console.error('[Nessie] Snowflake query error:', err);
      }
    }

    // Trigger analysis for unanalyzed tickers
    const triggered: string[] = [];
    for (const ticker of tickersArray) {
      if (!alreadyAnalyzed.has(ticker)) {
        try {
          startAnalysis(ticker);
          triggered.push(ticker);
        } catch (err) {
          console.error(`[Nessie] Failed to trigger analysis for ${ticker}:`, err);
        }
      }
    }

    res.json({
      triggered,
      already_analyzed: Array.from(alreadyAnalyzed),
      total_tickers: tickersArray.length,
    });
  } catch (e: any) {
    console.error('Nessie analyze-all error:', e.message);
    res.status(500).json({ error: 'Failed to trigger analyses' });
  }
});

export default router;
