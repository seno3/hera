/**
 * In dev: Vite proxies /api to localhost:3001.
 * In prod: Must point to deployed backend (set VITE_API_URL in Vercel env vars).
 */
const BASE = import.meta.env.VITE_API_URL || '/api';

async function fetcher<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    let message = `API error: ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {}
    const err = new Error(message);
    (err as any).status = res.status;
    throw err;
  }
  return res.json();
}

export interface ResolvedTicker {
  input: string;
  ticker: string | null;
  company_name: string | null;
}

export const api = {
  resolve: (inputs: string[]) =>
    fetcher<ResolvedTicker[]>('/resolve', {
      method: 'POST',
      body: JSON.stringify({ inputs }),
    }),

  getCompany: (ticker: string) => fetcher<any>(`/companies/${ticker}`),

  triggerAnalysis: (ticker: string) =>
    fetcher<{ jobId: string; ticker: string }>(`/analyze/${ticker}`, { method: 'POST' }),

  checkAnalysisStatus: (ticker: string) =>
    fetcher<{ status: string; result?: any }>(`/analyze/${ticker}/status`),

  scanPortfolio: (tickers: string[]) =>
    fetcher<any>('/portfolio/scan', {
      method: 'POST',
      body: JSON.stringify({ tickers }),
    }),

  getAlternatives: (ticker: string) => fetcher<any[]>(`/companies/${ticker}/alternatives`),

  postAction: (user_name: string, action_type: string, company_ticker: string) =>
    fetcher<any>('/community/action', {
      method: 'POST',
      body: JSON.stringify({ user_name, action_type, company_ticker }),
    }),

  getActivity: () => fetcher<any[]>('/community/activity'),

  getPlaidLinkToken: () =>
    fetcher<{ linkToken: string | null }>('/plaid/link-token'),

  exchangePlaidToken: (publicToken: string) =>
    fetcher<{ success: boolean }>('/plaid/exchange-token', {
      method: 'POST',
      body: JSON.stringify({ public_token: publicToken }),
    }),

  // --- Nessie ---
  nessieLogin: (first_name: string, last_name: string) =>
    fetcher<{ customer: any; created: boolean }>('/nessie/login', {
      method: 'POST',
      body: JSON.stringify({ first_name, last_name }),
    }),

  nessieSetupDemo: () =>
    fetcher<{ customerId: string; accountId: string; merchants_created: number; purchases_created: number }>(
      '/nessie/setup-demo',
      { method: 'POST' }
    ),

  nessieCustomers: () =>
    fetcher<any[]>('/nessie/customers'),

  nessieAccounts: (customerId: string) =>
    fetcher<any[]>(`/nessie/customers/${customerId}/accounts`),

  nessieCreateAccount: (customerId: string, type = 'Checking', nickname = 'Hera Account', balance = 1000) =>
    fetcher<any>(`/nessie/accounts/${customerId}`, {
      method: 'POST',
      body: JSON.stringify({ type, nickname, balance }),
    }),

  nessiePurchases: (accountId: string) =>
    fetcher<any[]>(`/nessie/accounts/${accountId}/purchases`),

  nessieProfile: (customerId: string) =>
    fetcher<{
      customer: { id: string; first_name: string; last_name: string };
      total_invested: number;
      accounts: { id: string; type: string; nickname: string; balance: number; rewards: number }[];
      holdings: {
        merchant_name: string;
        ticker: string;
        total_invested: number;
        num_purchases: number;
        has_analysis: boolean;
        score: number | null;
        severity: string | null;
        summary: string | null;
      }[];
      total_purchases: number;
      unresolved_merchants: string[];
    }>(`/nessie/profile/${customerId}`),

  nessieAnalyzeAll: (customerId: string) =>
    fetcher<{ triggered: string[]; already_analyzed: string[]; total_tickers: number }>(
      `/nessie/profile/${customerId}/analyze-all`,
      { method: 'POST' }
    ),

  // --- Employee Reviews ---
  requestVerification: (email: string) =>
    fetcher<{ success: boolean; company_ticker: string; company_name: string; code?: string }>('/reviews/auth/request-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyCode: (code: string) =>
    fetcher<{ success: boolean; token: string; user_id: string; verified_for: string }>('/reviews/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  demoLogin: (company_ticker: string, demo_user_name: string) =>
    fetcher<{ success: boolean; token: string; user_id: string; verified_for: string }>('/reviews/auth/login-demo', {
      method: 'POST',
      body: JSON.stringify({ company_ticker, demo_user_name }),
    }),

  submitReview: (token: string, company_ticker: string, review_data: any) =>
    fetcher<{ success: boolean; review_id: string }>('/reviews/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ company_ticker, review_data }),
    }),

  getReviewAggregate: (ticker: string) =>
    fetcher<{
      company_ticker: string;
      total_reviews: number;
      aggregated_data: any;
      employee_perspective_score: number | null;
    }>(`/reviews/company/${ticker}/aggregate`),

  getCompanyDomains: () =>
    fetcher<{ ticker: string; company_name: string }[]>('/reviews/company-domains'),
};
