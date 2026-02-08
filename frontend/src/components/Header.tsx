import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePlaidLink } from 'react-plaid-link';
import { api, type ResolvedTicker } from '../services/api';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ChevronDown, Landmark, User } from 'lucide-react';

const RESOLVE_DEBOUNCE_MS = 300;

type LoginProvider = 'plaid' | 'nessie';

export default function Header() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [recommendations, setRecommendations] = useState<ResolvedTicker[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // --- Auth state ---
  const [connectedProvider, setConnectedProvider] = useState<LoginProvider | null>(null);
  const [connectedName, setConnectedName] = useState('');
  const [loginMenuOpen, setLoginMenuOpen] = useState(false);
  const loginMenuRef = useRef<HTMLDivElement>(null);

  // --- Nessie login modal ---
  const [nessieModalOpen, setNessieModalOpen] = useState(false);
  const [nessieFirst, setNessieFirst] = useState('');
  const [nessieLast, setNessieLast] = useState('');
  const [nessieLoading, setNessieLoading] = useState(false);
  const [nessieError, setNessieError] = useState('');

  // --- Plaid state ---
  const [linkToken, setLinkToken] = useState<string | null>(null);

  useEffect(() => {
    api.getPlaidLinkToken()
      .then((res) => setLinkToken(res.linkToken))
      .catch(() => setLinkToken(null));
  }, []);

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken) => {
      api.exchangePlaidToken(publicToken)
        .then(() => {
          setConnectedProvider('plaid');
          setConnectedName('Bank Account');
          setLoginMenuOpen(false);
        })
        .catch(console.error);
    },
    onExit: () => {},
  });

  // --- Nessie login handler ---
  const handleNessieLogin = async () => {
    if (!nessieFirst.trim() || !nessieLast.trim()) {
      setNessieError('Enter first and last name');
      return;
    }
    setNessieLoading(true);
    setNessieError('');
    try {
      const res = await api.nessieLogin(nessieFirst.trim(), nessieLast.trim());
      setConnectedProvider('nessie');
      setConnectedName(`${res.customer.first_name} ${res.customer.last_name}`);
      setNessieModalOpen(false);
      setLoginMenuOpen(false);
    } catch (e: any) {
      setNessieError('Login failed. Check backend / API key.');
    } finally {
      setNessieLoading(false);
    }
  };

  // --- Close menus on outside click ---
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (loginMenuRef.current && !loginMenuRef.current.contains(e.target as Node)) {
        setLoginMenuOpen(false);
        setNessieModalOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Search logic ---
  const runResolve = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setRecommendations([]);
      return;
    }
    setLoading(true);
    try {
      const results = await api.resolve([trimmed]);
      setRecommendations(results);
      setDropdownOpen(true);
    } catch {
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setRecommendations([]);
      setDropdownOpen(false);
      return;
    }
    const t = setTimeout(() => runResolve(query), RESOLVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, runResolve]);

  const pickClosest = useCallback(() => {
    const withTicker = recommendations.find((r) => r.ticker);
    if (withTicker?.ticker) {
      setQuery('');
      setRecommendations([]);
      setDropdownOpen(false);
      navigate(`/company/${withTicker.ticker}`);
    }
  }, [recommendations, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      pickClosest();
    }
  };

  const handleSelect = (r: ResolvedTicker) => {
    if (r.ticker) {
      setQuery('');
      setRecommendations([]);
      setDropdownOpen(false);
      navigate(`/company/${r.ticker}`);
    }
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-50 bg-transparent font-serif">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-6 flex-wrap">
        <Link to="/" className="text-2xl text-white shrink-0 hover:text-pink transition-colors">Hera.</Link>
        <div ref={wrapperRef} className="relative flex-1 min-w-0 max-w-md">
          <div className="relative">
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => recommendations.length > 0 && setDropdownOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search company (e.g. Apple, AAPL)..."
              className="w-full pr-10 border-white/20 bg-white/10 text-white placeholder:text-white/50 focus-visible:ring-pink/50 focus-visible:border-pink"
            />
            <Search
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50"
              size={18}
            />
            {loading && (
              <span className="absolute right-10 top-1/2 -translate-y-1/2 text-white/50 text-sm">
                ...
              </span>
            )}
          </div>
          {dropdownOpen && recommendations.length > 0 && (
            <ScrollArea className="absolute top-full left-0 right-0 mt-1 max-h-60 rounded-lg border border-white/20 bg-black/90 backdrop-blur-sm shadow-xl z-50">
              <div className="py-1">
                {recommendations.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelect(r)}
                    className="w-full px-4 py-2.5 text-left text-white/90 hover:bg-white/10 focus:bg-white/10 focus:outline-none flex items-center gap-2 text-base"
                  >
                    {r.ticker && (
                      <span className="text-pink text-sm shrink-0">{r.ticker}</span>
                    )}
                    <span className="truncate">
                      {r.company_name || r.input}
                      {!r.ticker && (
                        <span className="text-white/50 text-sm ml-1">(no match)</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        <nav className="flex items-center gap-6 text-base md:text-lg text-white">
          <Link to="/profile" className="hover:text-white/90 transition-colors">Profile</Link>

          {/* Login / Connected state */}
          <div ref={loginMenuRef} className="relative">
            {connectedProvider ? (
              <button
                type="button"
                onClick={() => setLoginMenuOpen(!loginMenuOpen)}
                className="flex items-center gap-1.5 text-teal-clean text-sm font-medium"
              >
                <span className="w-2 h-2 rounded-full bg-teal-clean" />
                {connectedName}
                <ChevronDown className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setLoginMenuOpen(!loginMenuOpen)}
                className="flex items-center gap-1 hover:text-white/90 transition-colors"
              >
                Login
                <ChevronDown className="w-4 h-4" />
              </button>
            )}

            {/* Login dropdown */}
            {loginMenuOpen && !connectedProvider && !nessieModalOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-white/20 bg-black/95 backdrop-blur-sm shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-xs text-white/50 uppercase tracking-wide font-medium">Connect with</p>
                </div>

                {/* Plaid option */}
                <button
                  type="button"
                  onClick={() => { openPlaid(); setLoginMenuOpen(false); }}
                  disabled={!plaidReady || !linkToken}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/5 transition-colors disabled:opacity-40"
                >
                  <div className="w-8 h-8 rounded-lg bg-pink/20 flex items-center justify-center">
                    <Landmark className="w-4 h-4 text-pink" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Plaid</div>
                    <div className="text-xs text-white/50">Link your bank account</div>
                  </div>
                </button>

                {/* Nessie option */}
                <button
                  type="button"
                  onClick={() => setNessieModalOpen(true)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/5 transition-colors border-t border-white/5"
                >
                  <div className="w-8 h-8 rounded-lg bg-teal-clean/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-teal-clean" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Nessie</div>
                    <div className="text-xs text-white/50">Capital One sandbox</div>
                  </div>
                </button>
              </div>
            )}

            {/* Nessie login form */}
            {loginMenuOpen && nessieModalOpen && !connectedProvider && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-white/20 bg-black/95 backdrop-blur-sm shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <p className="text-xs text-white/50 uppercase tracking-wide font-medium">Nessie Login</p>
                  <button
                    type="button"
                    onClick={() => setNessieModalOpen(false)}
                    className="text-white/40 hover:text-white text-xs"
                  >
                    Back
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <input
                    type="text"
                    value={nessieFirst}
                    onChange={(e) => setNessieFirst(e.target.value)}
                    placeholder="First name"
                    className="w-full px-3 py-2 rounded-md border border-white/20 bg-white/5 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-teal-clean"
                  />
                  <input
                    type="text"
                    value={nessieLast}
                    onChange={(e) => setNessieLast(e.target.value)}
                    placeholder="Last name"
                    onKeyDown={(e) => e.key === 'Enter' && handleNessieLogin()}
                    className="w-full px-3 py-2 rounded-md border border-white/20 bg-white/5 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-teal-clean"
                  />
                  {nessieError && (
                    <p className="text-xs text-rose-flag">{nessieError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleNessieLogin}
                    disabled={nessieLoading}
                    className="w-full py-2 rounded-md bg-teal-clean text-white text-sm font-medium hover:bg-teal-clean/90 disabled:opacity-50 transition-colors"
                  >
                    {nessieLoading ? 'Connecting...' : 'Connect'}
                  </button>
                  <p className="text-[10px] text-white/30 leading-snug">
                    Uses Capital One's Nessie sandbox API. Creates or finds a customer by name.
                  </p>
                </div>
              </div>
            )}

            {/* Connected — disconnect option */}
            {loginMenuOpen && connectedProvider && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-white/20 bg-black/95 backdrop-blur-sm shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-xs text-white/50 uppercase tracking-wide font-medium">
                    Connected via {connectedProvider === 'plaid' ? 'Plaid' : 'Nessie'}
                  </p>
                  <p className="text-sm text-white mt-1">{connectedName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConnectedProvider(null);
                    setConnectedName('');
                    setLoginMenuOpen(false);
                    setNessieFirst('');
                    setNessieLast('');
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-rose-flag hover:bg-white/5 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
