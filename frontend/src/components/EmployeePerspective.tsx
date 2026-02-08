import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Users, ShieldCheck, MessageSquare } from 'lucide-react';
import EmployeeVerification from './EmployeeVerification';
import ReviewSubmissionForm from './ReviewSubmissionForm';
import DemoLogin from './DemoLogin';

interface Props {
  ticker: string;
}

const ISSUE_LABELS: Record<string, string> = {
  sexual_harassment: 'Sexual Harassment',
  discrimination: 'Discrimination',
  assault: 'Assault',
  retaliation: 'Retaliation',
  pay_gap: 'Pay Gap',
  hostile_environment: 'Hostile Environment',
};

const RESPONSE_LABELS: Record<string, string> = {
  investigation: 'Investigation',
  disciplinary_action: 'Disciplinary Action',
  policy_changes: 'Policy Changes',
  no_action: 'No Action',
  retaliation: 'Retaliation',
};

function scoreColor(score: number) {
  if (score <= 4) return 'text-rose-flag';
  if (score <= 6) return 'text-amber-warn';
  return 'text-teal-clean';
}

function barColor(key: string) {
  if (['retaliation', 'no_action', 'sexual_harassment', 'assault'].includes(key)) return 'bg-rose-flag';
  if (['discrimination', 'pay_gap', 'hostile_environment'].includes(key)) return 'bg-amber-warn';
  return 'bg-teal-clean';
}

export default function EmployeePerspective({ ticker }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showVerify, setShowVerify] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    api.getReviewAggregate(ticker)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [ticker]);

  const handleVerified = (token: string) => {
    setAuthToken(token);
    setShowVerify(false);
    setShowReview(true);
  };

  const handleDemoLogin = (token: string) => {
    setAuthToken(token);
    setShowDemo(false);
    setShowReview(true);
  };

  const handleSubmitted = () => {
    setShowReview(false);
    setAuthToken(null);
    fetchData();
  };

  if (loading) return null;

  const hasData = data && data.total_reviews > 0 && data.aggregated_data;

  return (
    <section className="mt-12">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-pink" />
        <h2 className="font-serif text-xl text-white">Employee Perspective</h2>
      </div>

      {!hasData ? (
        <div className="border border-white/10 rounded-xl p-8 text-center">
          <MessageSquare className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/50 text-sm mb-4">No employee reviews yet for this company.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setShowVerify(true)} className="px-5 py-2.5 bg-pink text-white rounded-lg text-sm font-medium hover:bg-pink/90 transition-colors">
              Verify & Review
            </button>
            <button onClick={() => setShowDemo(true)} className="px-5 py-2.5 bg-white/5 text-white/70 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors">
              Demo Login
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-white/10 rounded-xl p-6">
          {/* Score header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`font-mono text-4xl font-medium ${scoreColor(data.employee_perspective_score)}`}>
                  {data.employee_perspective_score}
                </span>
                <span className="text-white/40 text-sm">/10</span>
              </div>
              <p className="text-white/50 text-xs mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Based on {data.total_reviews} verified review{data.total_reviews !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowVerify(true)} className="px-4 py-2 bg-pink text-white rounded-lg text-xs font-medium hover:bg-pink/90 transition-colors">
                Share Your Experience
              </button>
              <button onClick={() => setShowDemo(true)} className="px-4 py-2 bg-white/5 text-white/50 border border-white/10 rounded-lg text-xs hover:bg-white/10 transition-colors">
                Demo
              </button>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Witnessed issues */}
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Witnessed Issues</p>
              <div className="flex items-end gap-2">
                <span className={`text-2xl font-mono font-medium ${data.aggregated_data.witnessed_issues_percent > 50 ? 'text-rose-flag' : data.aggregated_data.witnessed_issues_percent > 25 ? 'text-amber-warn' : 'text-teal-clean'}`}>
                  {data.aggregated_data.witnessed_issues_percent}%
                </span>
                <span className="text-white/30 text-xs mb-1">of respondents</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full mt-2">
                <div className={`h-full rounded-full ${data.aggregated_data.witnessed_issues_percent > 50 ? 'bg-rose-flag' : 'bg-amber-warn'}`}
                  style={{ width: `${data.aggregated_data.witnessed_issues_percent}%` }} />
              </div>
            </div>

            {/* Reported */}
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Reported Issues</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-mono font-medium text-white">
                  {data.aggregated_data.reported_percent}%
                </span>
                <span className="text-white/30 text-xs mb-1">of those who witnessed</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full mt-2">
                <div className="h-full rounded-full bg-pink" style={{ width: `${data.aggregated_data.reported_percent}%` }} />
              </div>
            </div>

            {/* Issue type breakdown */}
            {Object.keys(data.aggregated_data.issue_type_breakdown || {}).length > 0 && (
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Issue Types</p>
                <div className="space-y-2">
                  {Object.entries(data.aggregated_data.issue_type_breakdown)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([key, pct]) => (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-white/60">{ISSUE_LABELS[key] || key}</span>
                          <span className="text-white/40 font-mono">{pct as number}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full">
                          <div className={`h-full rounded-full ${barColor(key)}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Company response breakdown */}
            {Object.keys(data.aggregated_data.company_response_breakdown || {}).length > 0 && (
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Company Response</p>
                <div className="space-y-2">
                  {Object.entries(data.aggregated_data.company_response_breakdown)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([key, pct]) => (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-white/60">{RESPONSE_LABELS[key] || key}</span>
                          <span className="text-white/40 font-mono">{pct as number}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full">
                          <div className={`h-full rounded-full ${barColor(key)}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Would recommend */}
            <div className="sm:col-span-2">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Would Recommend</p>
              <div className="flex gap-4">
                {Object.entries(data.aggregated_data.would_recommend || {}).map(([key, pct]) => {
                  const color = key === 'yes' ? 'text-teal-clean' : key === 'no' ? 'text-rose-flag' : 'text-amber-warn';
                  const label = key === 'with_reservations' ? 'With Reservations' : key.charAt(0).toUpperCase() + key.slice(1);
                  return (
                    <div key={key} className="text-center flex-1">
                      <span className={`text-2xl font-mono font-medium ${color}`}>{pct as number}%</span>
                      <p className="text-white/40 text-xs mt-1">{label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="text-white/20 text-[10px] mt-6 text-center">
            Based on anonymous reports from verified employees. Individual experiences are not shown.
          </p>
        </div>
      )}

      {/* Modals */}
      {showVerify && (
        <EmployeeVerification onVerified={handleVerified} onClose={() => setShowVerify(false)} />
      )}
      {showReview && authToken && (
        <ReviewSubmissionForm token={authToken} companyTicker={ticker} onClose={() => { setShowReview(false); setAuthToken(null); }} onSubmitted={handleSubmitted} />
      )}
      {showDemo && (
        <DemoLogin ticker={ticker} onLogin={handleDemoLogin} onClose={() => setShowDemo(false)} />
      )}
    </section>
  );
}
