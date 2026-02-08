import { useState } from 'react';
import { api, ResolvedTicker } from '../services/api';

interface Props {
  onScan: (tickers: string[]) => void;
  loading: boolean;
}

export default function PortfolioScanner({ onScan, loading }: Props) {
  const [input, setInput] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<ResolvedTicker[] | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputs = input.split(/[,]+/).map(t => t.trim()).filter(Boolean);
    if (!inputs.length) return;

    setResolving(true);
    setResolved(null);
    try {
      const results = await api.resolve(inputs);
      setResolved(results);

      const validTickers = results.filter(r => r.ticker).map(r => r.ticker!);
      if (validTickers.length) {
        // Brief pause to show resolved names, then auto-scan
        setTimeout(() => onScan(validTickers), 1200);
      }
    } catch {
      // Fallback: treat raw input as tickers
      const tickers = inputs.map(t => t.toUpperCase());
      onScan(tickers);
    } finally {
      setResolving(false);
    }
  };

  const isLoading = loading || resolving;

  return (
    <div className="max-w-lg mx-auto">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setResolved(null); }}
          placeholder="AAPL, Tesla, Microsoft..."
          className="flex-1 px-4 py-3 rounded-lg border border-pink-border bg-white text-body placeholder:text-muted/50 focus:outline-none focus:border-pink focus:ring-1 focus:ring-pink/30 font-sans text-sm"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 bg-pink text-white rounded-lg font-sans text-sm font-medium hover:bg-pink/90 disabled:opacity-50 transition-colors"
        >
          {resolving ? 'Resolving...' : loading ? 'Scanning...' : 'Scan'}
        </button>
      </form>

      {resolved && (
        <div className="mt-4 space-y-1.5 animate-fade-up" style={{ animationDelay: '0.05s' }}>
          {resolved.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-muted">{r.input}</span>
              <span className="text-muted/40">→</span>
              {r.ticker ? (
                <>
                  <span className="font-mono font-medium">{r.ticker}</span>
                  {r.company_name && <span className="text-muted text-xs">({r.company_name})</span>}
                  <span className="text-teal-clean text-xs">✓</span>
                </>
              ) : (
                <span className="text-rose-flag text-xs">Could not resolve</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
