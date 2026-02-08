import { FileText, Scale, Newspaper, Shield, Building2, Globe } from 'lucide-react';

interface Source {
  url: string;
  title: string;
  type: string;
  date: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string; bg: string }> = {
  sec_8k:        { label: 'SEC 8-K Filings',      icon: FileText,  color: 'text-blue-400',   bg: 'bg-blue-400' },
  sec_10k:       { label: 'SEC 10-K Reports',      icon: FileText,  color: 'text-blue-300',   bg: 'bg-blue-300' },
  sec_proxy:     { label: 'Proxy Statements',       icon: Building2, color: 'text-indigo-400', bg: 'bg-indigo-400' },
  court_opinion: { label: 'Court Opinions',          icon: Scale,     color: 'text-amber-400',  bg: 'bg-amber-400' },
  news_article:  { label: 'News Articles',           icon: Newspaper, color: 'text-pink',       bg: 'bg-pink' },
  eeoc_release:  { label: 'EEOC Press Releases',     icon: Shield,    color: 'text-teal-clean', bg: 'bg-teal-clean' },
};

const DEFAULT_CONFIG = { label: 'Other', icon: Globe, color: 'text-white/60', bg: 'bg-white/40' };

export default function Sources({ sources }: { sources: Source[] }) {
  if (!sources?.length) return null;

  const grouped = sources.reduce<Record<string, Source[]>>((acc, s) => {
    const key = s.type || 'other';
    (acc[key] ||= []).push(s);
    return acc;
  }, {});

  const entries = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
  const maxCount = Math.max(...entries.map(([, items]) => items.length));

  return (
    <div className="my-10">
      <h3 className="font-serif text-xl mb-6 text-white">Sources</h3>

      {/* Visual breakdown */}
      <div className="mb-8 space-y-3">
        {entries.map(([type, items]) => {
          const config = TYPE_CONFIG[type] || { ...DEFAULT_CONFIG, label: type };
          const Icon = config.icon;
          const pct = maxCount > 0 ? (items.length / maxCount) * 100 : 0;
          return (
            <div key={type} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/60 truncate">{config.label}</span>
                  <span className="text-xs text-white/40 tabular-nums ml-2">{items.length}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${config.bg} transition-all duration-700 ease-out`}
                    style={{ width: `${pct}%`, opacity: 0.7 }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total pill */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs text-white/30">{sources.length} sources across {entries.length} categories</span>
      </div>

      {/* Detailed source list */}
      <div className="space-y-6">
        {entries.map(([type, items]) => {
          const config = TYPE_CONFIG[type] || { ...DEFAULT_CONFIG, label: type };
          const Icon = config.icon;
          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                <h4 className="text-xs text-white/50 font-medium uppercase tracking-wide">{config.label}</h4>
              </div>
              <ul className="space-y-1.5 pl-5">
                {items.map((s, i) => (
                  <li key={i} className="text-sm">
                    <a href={s.url} target="_blank" rel="noopener" className="text-pink hover:underline">
                      {s.title || s.url}
                    </a>
                    {s.date && <span className="text-white/40 ml-2 text-xs">{s.date}</span>}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
