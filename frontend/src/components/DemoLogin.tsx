import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, Beaker } from 'lucide-react';

interface Props {
  ticker: string;
  onLogin: (token: string, userId: string) => void;
  onClose: () => void;
}

export default function DemoLogin({ ticker, onLogin, onClose }: Props) {
  const [companies, setCompanies] = useState<{ ticker: string; company_name: string }[]>([]);
  const [selectedTicker, setSelectedTicker] = useState(ticker);
  const [demoName, setDemoName] = useState('Demo Employee');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCompanyDomains().then(setCompanies).catch(() => {});
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.demoLogin(selectedTicker, demoName);
      onLogin(res.token, res.user_id);
    } catch {
      setError('Demo mode may not be enabled on the server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-black border border-white/10 rounded-2xl w-full max-w-sm mx-4 p-8">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white"><X className="w-5 h-5" /></button>

        <div className="w-14 h-14 rounded-full bg-pink/10 flex items-center justify-center mx-auto mb-4">
          <Beaker className="w-7 h-7 text-pink" />
        </div>
        <h2 className="text-xl font-serif text-white mb-1 text-center">Demo Login</h2>
        <p className="text-white/40 text-xs text-center mb-6">Test mode — no email verification required</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Company</label>
            <select
              value={selectedTicker}
              onChange={(e) => setSelectedTicker(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-pink appearance-none"
            >
              <option value={ticker}>{ticker}</option>
              {companies.filter((c) => c.ticker !== ticker).map((c) => (
                <option key={c.ticker} value={c.ticker}>{c.ticker} — {c.company_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Demo Name</label>
            <input
              type="text"
              value={demoName}
              onChange={(e) => setDemoName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pink"
            />
          </div>

          {error && <p className="text-rose-flag text-xs">{error}</p>}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 bg-pink text-white rounded-lg text-sm font-medium hover:bg-pink/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Connecting...' : 'Login as Demo Employee'}
          </button>

          <p className="text-white/20 text-[10px] text-center">
            Uses a temporary session. No real data is shared.
          </p>
        </div>
      </div>
    </div>
  );
}
