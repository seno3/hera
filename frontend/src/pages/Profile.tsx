import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import AnalysisLoader from '../components/AnalysisLoader';
import {
  User,
  CreditCard,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Sparkles,
  ChevronRight,
  Wallet,
  ArrowLeft,
  Play,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────

interface Customer {
  _id: string;
  first_name: string;
  last_name: string;
  address?: any;
}

interface Account {
  id: string;
  type: string;
  nickname: string;
  balance: number;
  rewards: number;
}

interface Holding {
  merchant_name: string;
  ticker: string;
  total_invested: number;
  num_purchases: number;
  has_analysis: boolean;
  score: number | null;
  severity: string | null;
  summary: string | null;
}

interface ProfileData {
  customer: { id: string; first_name: string; last_name: string };
  total_invested: number;
  accounts: Account[];
  holdings: Holding[];
  total_purchases: number;
  unresolved_merchants: string[];
}

// ── Helpers ────────────────────────────────────────────

function scoreColor(score: number | null) {
  if (score === null) return 'text-white/40';
  if (score <= 5) return 'text-rose-flag';
  if (score <= 6) return 'text-amber-warn';
  return 'text-teal-clean';
}

function scoreBg(score: number | null) {
  if (score === null) return 'bg-white/5';
  if (score <= 5) return 'bg-rose-flag/10';
  if (score <= 6) return 'bg-amber-warn/10';
  return 'bg-teal-clean/10';
}

function severityColor(severity: string | null) {
  if (!severity) return { bg: 'bg-white/10', text: 'text-white/40' };
  const s = severity.toLowerCase();
  if (s === 'high' || s === 'critical') return { bg: 'bg-rose-flag/15', text: 'text-rose-flag' };
  if (s === 'medium' || s === 'moderate') return { bg: 'bg-amber-warn/15', text: 'text-amber-warn' };
  return { bg: 'bg-teal-clean/15', text: 'text-teal-clean' };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function accountIcon(type: string) {
  switch (type?.toLowerCase()) {
    case 'checking':
      return <Wallet className="w-4 h-4" />;
    case 'savings':
      return <TrendingUp className="w-4 h-4" />;
    case 'credit card':
      return <CreditCard className="w-4 h-4" />;
    default:
      return <CreditCard className="w-4 h-4" />;
  }
}

// ── Component ──────────────────────────────────────────

export default function Profile() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [analyzingTickers, setAnalyzingTickers] = useState<string[]>([]);
  const [settingUpDemo, setSettingUpDemo] = useState(false);
  const [error, setError] = useState('');

  // Fetch all customers on mount
  useEffect(() => {
    api.nessieCustomers()
      .then((data) => {
        setCustomers(data || []);
        setLoadingCustomers(false);
      })
      .catch((e) => {
        console.error(e);
        setError('Failed to load customers. Check your connection.');
        setLoadingCustomers(false);
      });
  }, []);

  // Fetch profile when customer is selected
  useEffect(() => {
    if (!selectedCustomerId) return;
    setLoadingProfile(true);
    setProfile(null);
    setAnalyzingTickers([]);

    api.nessieProfile(selectedCustomerId)
      .then((data) => {
        setProfile(data);
        setLoadingProfile(false);
      })
      .catch((e) => {
        console.error(e);
        setError('Failed to load profile.');
        setLoadingProfile(false);
      });
  }, [selectedCustomerId]);

  const handleSetupDemo = async () => {
    setSettingUpDemo(true);
    try {
      const result = await api.nessieSetupDemo();
      setSelectedCustomerId(result.customerId);
    } catch (e: any) {
      console.error(e);
      setError('Failed to set up demo data.');
    } finally {
      setSettingUpDemo(false);
    }
  };

  const handleAnalyzeAll = async () => {
    if (!selectedCustomerId) return;
    setAnalyzingAll(true);
    try {
      const result = await api.nessieAnalyzeAll(selectedCustomerId);
      if (result.triggered.length > 0) {
        setAnalyzingTickers(result.triggered);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzingAll(false);
    }
  };

  const handleAnalysisDone = (ticker: string) => {
    setAnalyzingTickers(prev => prev.filter(t => t !== ticker));
    // Refresh profile to get updated data
    if (selectedCustomerId) {
      api.nessieProfile(selectedCustomerId)
        .then(setProfile)
        .catch(() => {});
    }
  };

  const handleAnalyzeSingle = async (ticker: string) => {
    try {
      await api.triggerAnalysis(ticker);
      navigate(`/company/${ticker}`);
    } catch (e) {
      console.error(e);
    }
  };

  // ── Error State ──────────────────────────────────────

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <p className="text-white/50 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-pink text-white rounded-lg text-sm font-medium hover:bg-pink/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  // ── Analysis Loaders ─────────────────────────────────

  if (analyzingTickers.length > 0) {
    const currentTicker = analyzingTickers[0];
    return (
      <AnalysisLoader
        ticker={currentTicker}
        checkStatus={() => api.checkAnalysisStatus(currentTicker)}
        onComplete={() => handleAnalysisDone(currentTicker)}
        onError={() => handleAnalysisDone(currentTicker)}
      />
    );
  }

  // ── Customer Selector ────────────────────────────────

  if (!selectedCustomerId) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-3xl mx-auto px-6 pt-24 pb-16">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="text-center mb-12">
            <h1 className="font-serif text-3xl md:text-4xl text-white mb-3">
              Profiles
            </h1>
            <p className="text-white/50 text-sm max-w-md mx-auto">
              Select a customer to view their spending portfolio and accountability insights.
            </p>
          </div>

          {/* Setup Demo Button */}
          <div className="flex justify-center mb-8">
            <button
              onClick={handleSetupDemo}
              disabled={settingUpDemo}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-pink/30 text-pink text-sm font-medium hover:bg-pink/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {settingUpDemo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {settingUpDemo ? 'Setting up demo...' : 'Setup Demo Portfolio'}
            </button>
          </div>

          {loadingCustomers ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-pink animate-spin" />
              <span className="ml-3 text-white/50 text-sm">Loading customers...</span>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-20">
              <User className="w-10 h-10 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 text-sm">No customers found in Nessie sandbox.</p>
              <p className="text-white/20 text-xs mt-2">Click "Setup Demo Portfolio" to create one.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {customers.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setSelectedCustomerId(c._id)}
                  className="group flex items-center justify-between w-full px-5 py-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-pink/30 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-pink/10 flex items-center justify-center text-pink text-sm font-medium">
                      {c.first_name?.[0]}{c.last_name?.[0]}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">
                        {c.first_name} {c.last_name}
                      </p>
                      <p className="text-white/30 text-xs font-mono">{c._id}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-pink transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── Loading Profile ──────────────────────────────────

  if (loadingProfile || !profile) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <Loader2 className="w-8 h-8 text-pink animate-spin mx-auto mb-4" />
          <p className="text-white/50 text-sm">Building your spending portfolio...</p>
        </div>
      </main>
    );
  }

  // ── Profile View ─────────────────────────────────────

  const analyzedCount = profile.holdings.filter(h => h.has_analysis).length;
  const notAnalyzedCount = profile.holdings.filter(h => !h.has_analysis).length;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        {/* Back */}
        <button
          onClick={() => { setSelectedCustomerId(null); setProfile(null); }}
          className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Switch customer
        </button>

        {/* Welcome Header */}
        <h1 className="font-serif text-3xl md:text-4xl text-white mb-8">
          Welcome, {profile.customer.first_name}
        </h1>

        {/* ── Summary Card ──────────────────────────────── */}
        <div className="px-6 py-5 rounded-xl border border-white/10 bg-white/[0.02] mb-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Total Portfolio</p>
              <p className="text-white font-mono text-2xl font-semibold">
                {formatCurrency(profile.total_invested)}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-white font-mono text-lg font-medium">{profile.accounts.length}</p>
                <p className="text-white/40 text-xs">Accounts</p>
              </div>
              <div className="text-center">
                <p className="text-white font-mono text-lg font-medium">{profile.holdings.length}</p>
                <p className="text-white/40 text-xs">Holdings</p>
              </div>
              <div className="text-center">
                <p className="text-teal-clean font-mono text-lg font-medium">{analyzedCount}</p>
                <p className="text-white/40 text-xs">Analyzed</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Accounts ────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="font-serif text-xl text-white mb-4">Accounts</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {profile.accounts.map((acc) => (
              <div
                key={acc.id}
                className="px-5 py-4 rounded-xl border border-white/10 bg-white/[0.02]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-pink">{accountIcon(acc.type)}</div>
                  <span className="text-white/60 text-xs uppercase tracking-wider">{acc.type}</span>
                </div>
                <p className="text-white font-mono text-lg font-medium">{formatCurrency(acc.balance)}</p>
                <p className="text-white/30 text-xs mt-1">{acc.nickname || 'Account'}</p>
              </div>
            ))}
            {profile.accounts.length === 0 && (
              <p className="text-white/30 text-sm col-span-full">No accounts found.</p>
            )}
          </div>
        </section>

        {/* ── Holdings Grid ───────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-serif text-xl text-white mb-1">Holdings</h2>
              <p className="text-white/40 text-xs">
                {profile.holdings.length} companies &middot; {formatCurrency(profile.total_invested)} invested &middot; {profile.total_purchases} purchases
              </p>
            </div>
            {notAnalyzedCount > 0 && (
              <button
                onClick={handleAnalyzeAll}
                disabled={analyzingAll}
                className="flex items-center gap-2 px-4 py-2 bg-pink text-white rounded-lg text-sm font-medium hover:bg-pink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {analyzingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Analyze Entire Portfolio ({notAnalyzedCount})
              </button>
            )}
          </div>

          {profile.holdings.length === 0 ? (
            <div className="text-center py-16 border border-white/5 rounded-xl">
              <ShieldCheck className="w-10 h-10 text-white/10 mx-auto mb-4" />
              <p className="text-white/30 text-sm">No recognized companies in purchase history.</p>
              <p className="text-white/20 text-xs mt-1">Purchases from known companies will appear here with accountability scores.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {profile.holdings.map((item) => {
                const sev = severityColor(item.severity);
                return (
                  <div
                    key={item.ticker}
                    className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-pink/20 transition-colors"
                  >
                    <div className="px-5 py-4">
                      {/* Top row: merchant + score */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-medium text-sm truncate">{item.merchant_name}</p>
                          <p className="text-white/40 text-xs font-mono mt-0.5">{item.ticker}</p>
                        </div>
                        {item.has_analysis && item.score !== null ? (
                          <button
                            onClick={() => navigate(`/company/${item.ticker}`)}
                            className={`shrink-0 ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${scoreBg(item.score)} transition-colors hover:opacity-80`}
                          >
                            {item.score <= 5 ? (
                              <ShieldAlert className={`w-3.5 h-3.5 ${scoreColor(item.score)}`} />
                            ) : (
                              <ShieldCheck className={`w-3.5 h-3.5 ${scoreColor(item.score)}`} />
                            )}
                            <span className={`font-mono text-lg font-semibold ${scoreColor(item.score)}`}>
                              {item.score}
                            </span>
                            <span className="text-white/30 text-xs">/10</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAnalyzeSingle(item.ticker)}
                            className="shrink-0 ml-3 px-3 py-1.5 rounded-lg border border-pink/30 text-pink text-xs font-medium hover:bg-pink/10 transition-colors"
                          >
                            Analyze
                          </button>
                        )}
                      </div>

                      {/* Severity badge */}
                      {item.has_analysis && item.severity && (
                        <div className="mb-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium ${sev.bg} ${sev.text}`}>
                            {item.severity}
                          </span>
                        </div>
                      )}

                      {/* Stats row */}
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-white/50">
                          <span className="text-white font-medium">{formatCurrency(item.total_invested)}</span> invested
                        </span>
                        <span className="text-white/50">
                          <span className="text-white font-medium">{item.num_purchases}</span> purchases
                        </span>
                      </div>

                      {/* Summary if analyzed */}
                      {item.has_analysis && item.summary && (
                        <p className="text-white/40 text-xs mt-3 line-clamp-2 leading-relaxed">
                          {item.summary}
                        </p>
                      )}

                      {/* Not analyzed label */}
                      {!item.has_analysis && (
                        <p className="text-white/20 text-xs mt-3 italic">Not yet analyzed</p>
                      )}
                    </div>

                    {/* Bottom bar — click to view full analysis */}
                    {item.has_analysis && (
                      <button
                        onClick={() => navigate(`/company/${item.ticker}`)}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/[0.03] border-t border-white/5 text-white/40 text-xs hover:text-pink hover:bg-pink/5 transition-colors"
                      >
                        View full report
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Unresolved merchants */}
          {profile.unresolved_merchants.length > 0 && (
            <div className="mt-6 px-4 py-3 rounded-lg border border-white/5 bg-white/[0.01]">
              <p className="text-white/30 text-xs mb-1">
                {profile.unresolved_merchants.length} merchants could not be mapped to public companies:
              </p>
              <p className="text-white/20 text-xs font-mono">
                {profile.unresolved_merchants.join(', ')}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
