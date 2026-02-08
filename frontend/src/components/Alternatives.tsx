import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function Alternatives({ ticker }: { ticker: string }) {
  const [alts, setAlts] = useState<any[]>([]);

  useEffect(() => {
    api.getAlternatives(ticker).then(setAlts).catch(() => {});
  }, [ticker]);

  if (!alts.length) {
    return (
      <div className="my-10">
        <h3 className="font-serif text-xl mb-4 text-white">Alternatives</h3>
        <p className="text-sm text-white/50">No alternatives analyzed yet in this industry.</p>
      </div>
    );
  }

  return (
    <div className="my-10">
      <h3 className="font-serif text-xl mb-6 text-white">Better Alternatives</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {alts.map(a => (
          <Link key={a.ticker} to={`/company/${a.ticker}`} className="border border-white/10 rounded-lg p-4 hover:border-pink transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm text-white">{a.name}</span>
              <span className="text-teal-clean font-mono text-sm font-medium">{a.score}/10</span>
            </div>
            <p className="text-xs text-white/50 line-clamp-2">{a.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
