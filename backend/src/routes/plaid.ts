import { Router, Request, Response } from 'express';
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

const router = Router();

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID || '';
const PLAID_SECRET = process.env.PLAID_SECRET || '';
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';

const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV] || PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

/**
 * Create a Plaid Link token so the frontend can open Plaid Link.
 */
router.get('/link-token', async (_req: Request, res: Response) => {
  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    return res.json({ linkToken: null });
  }

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'hera-user-' + Date.now() },
      client_name: 'Hera',
      products: [Products.Transactions, Products.Investments],
      country_codes: [CountryCode.Us],
      language: 'en',
    });
    res.json({ linkToken: response.data.link_token });
  } catch (e: any) {
    console.error('Plaid link-token error:', e?.response?.data || e.message);
    res.status(500).json({ linkToken: null, error: e?.response?.data?.error_message || 'Failed to create link token' });
  }
});

/**
 * Exchange public_token for access_token after user completes Plaid Link.
 */
router.post('/exchange-token', async (req: Request, res: Response) => {
  const { public_token: publicToken } = req.body || {};
  if (!publicToken) {
    return res.status(400).json({ error: 'public_token required' });
  }

  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;
    // TODO: persist accessToken + itemId per user in your database
    console.log('Plaid token exchanged — item:', itemId);
    res.json({ success: true, itemId });
  } catch (e: any) {
    console.error('Plaid exchange error:', e?.response?.data || e.message);
    res.status(500).json({ success: false, error: e?.response?.data?.error_message || 'Exchange failed' });
  }
});

export default router;
