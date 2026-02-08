interface Issue {
  type: string;
  date: string;
  status: string;
  settlement_amount: number | null;
  affected_parties: number | null;
  description: string;
  source_urls: string[];
}

interface Props {
  companyName: string;
  ticker: string;
  issues: Issue[];
  analyzedAt: string;
}

function formatType(t: string) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatMoney(n: number | null) {
  if (!n) return 'N/A';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

export default function CompanyReceipt({ companyName, ticker, issues, analyzedAt }: Props) {
  const date = new Date(analyzedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const totalSettlements = issues.reduce((s, i) => s + (i.settlement_amount || 0), 0);
  const unresolved = issues.filter(i => i.status === 'ongoing' || i.status === 'unknown').length;
  const dots = '· '.repeat(20);
  const dashes = '─ '.repeat(18);

  return (
    <div className="receipt-tear bg-white/5 border border-white/10 max-w-md mx-auto px-6 pt-8 pb-12 font-mono text-xs leading-relaxed text-white">
      <div className="text-center text-white/30 mb-1">{dots}</div>
      <div className="text-center space-y-0.5 mb-1">
        <div className="text-sm font-medium tracking-widest text-white">ACCOUNTABILITY RECEIPT</div>
        <div className="text-white/80">{companyName} ({ticker})</div>
        <div className="text-white/50">hera · {date}</div>
      </div>
      <div className="text-center text-white/30 mb-4">{dots}</div>

      {issues.length === 0 ? (
        <div className="text-center text-teal-clean py-4">No incidents on record</div>
      ) : (
        issues.map((issue, i) => (
          <div key={i} className="mb-4">
            <div className="flex justify-between"><span className="text-white/50">INCIDENT</span><span className="text-white/90">{formatType(issue.type)}</span></div>
            <div className="flex justify-between"><span className="text-white/50">DATE</span><span className="text-white/90">{issue.date || 'Unknown'}</span></div>
            <div className="flex justify-between">
              <span className="text-white/50">STATUS</span>
              <span className={issue.status === 'settled' || issue.status === 'dismissed' ? 'text-teal-clean' : 'text-rose-flag'}>{issue.status?.toUpperCase()}</span>
            </div>
            {issue.settlement_amount && (
              <div className="flex justify-between"><span className="text-white/50">AMOUNT</span><span className="text-white/90">{formatMoney(issue.settlement_amount)}</span></div>
            )}
            {issue.affected_parties && (
              <div className="flex justify-between"><span className="text-white/50">AFFECTED</span><span className="text-white/90">{issue.affected_parties.toLocaleString()}+ employees</span></div>
            )}
            <div className="mt-1 text-white/60 leading-snug indent-8">{issue.description}</div>
            {issue.source_urls?.map((url, j) => (
              <div key={j} className="mt-0.5">
                <span className="text-white/50">SOURCE</span>{' '}
                <a href={url} target="_blank" rel="noopener" className="text-pink hover:underline break-all">{url.length > 40 ? url.slice(0, 40) + '...' : url}</a>
              </div>
            ))}
            {i < issues.length - 1 && <div className="text-center text-white/20 mt-3">{dashes}</div>}
          </div>
        ))
      )}

      <div className="text-center text-white/30 mt-4 mb-2">{dots}</div>
      <div className="space-y-0.5">
        <div className="flex justify-between font-medium text-white"><span>TOTAL INCIDENTS</span><span>{issues.length}</span></div>
        <div className="flex justify-between font-medium text-white"><span>TOTAL SETTLEMENTS</span><span>{formatMoney(totalSettlements)}</span></div>
        <div className="flex justify-between font-medium text-white"><span>UNRESOLVED</span><span className={unresolved > 0 ? 'text-rose-flag' : 'text-teal-clean'}>{unresolved}</span></div>
      </div>
      <div className="text-center text-white/30 mt-2">{dots}</div>
    </div>
  );
}
