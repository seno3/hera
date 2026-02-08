import { useState } from 'react';
import { api } from '../services/api';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';

interface Props {
  token: string;
  companyTicker: string;
  onClose: () => void;
  onSubmitted: () => void;
}

const ISSUE_TYPE_LABELS: Record<string, string> = {
  sexual_harassment: 'Sexual Harassment',
  discrimination: 'Discrimination',
  assault: 'Assault',
  retaliation: 'Retaliation',
  pay_gap: 'Pay Gap',
  hostile_environment: 'Hostile Work Environment',
};

const RESPONSE_LABELS: Record<string, string> = {
  investigation: 'Investigation conducted',
  disciplinary_action: 'Disciplinary action taken',
  policy_changes: 'Policy changes made',
  no_action: 'No action taken',
  retaliation: 'Retaliation against reporter',
};

export default function ReviewSubmissionForm({ token, companyTicker, onClose, onSubmitted }: Props) {
  const [witnessed, setWitnessed] = useState<string>('');
  const [issueTypes, setIssueTypes] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState('');
  const [reported, setReported] = useState('');
  const [companyResponse, setCompanyResponse] = useState<string[]>([]);
  const [wouldRecommend, setWouldRecommend] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const toggleCheckbox = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const handleSubmit = async () => {
    if (!witnessed || !timeframe || !reported || !wouldRecommend) {
      setError('Please answer all required questions');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.submitReview(token, companyTicker, {
        witnessed_issues: witnessed,
        issue_types: issueTypes,
        timeframe,
        reported,
        reported_to: [],
        company_response: companyResponse,
        would_recommend: wouldRecommend,
        optional_comment: comment.slice(0, 200),
      });
      setSuccess(true);
      setTimeout(onSubmitted, 2000);
    } catch (e: any) {
      setError(e.message?.includes('429') ? 'You already reviewed this company recently' : 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-black border border-white/10 rounded-2xl w-full max-w-md mx-4 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-teal-clean/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-teal-clean" />
          </div>
          <h2 className="text-xl font-serif text-white mb-2">Review Submitted</h2>
          <p className="text-white/50 text-sm">Your anonymous review has been recorded. Thank you for helping others make informed decisions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8">
      <div className="relative bg-black border border-white/10 rounded-2xl w-full max-w-lg mx-4 p-6 my-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white"><X className="w-5 h-5" /></button>

        <h2 className="text-xl font-serif text-white mb-1">Share Your Experience</h2>
        <p className="text-white/40 text-xs mb-6">Reviewing <span className="text-pink font-mono">{companyTicker}</span> — your identity is anonymous</p>

        <div className="bg-amber-warn/5 border border-amber-warn/20 rounded-lg px-4 py-2.5 mb-6 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-warn shrink-0 mt-0.5" />
          <p className="text-amber-warn/80 text-xs">Don't include identifying details like your name, team, or specific dates.</p>
        </div>

        <div className="space-y-6">
          {/* Witnessed issues */}
          <fieldset>
            <legend className="text-sm text-white/70 mb-2 font-medium">Have you witnessed workplace issues? *</legend>
            {[
              { value: 'yes_direct', label: 'Yes, experienced directly' },
              { value: 'yes_witnessed', label: 'Yes, witnessed others' },
              { value: 'no', label: 'No' },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2.5 py-1.5 cursor-pointer">
                <input type="radio" name="witnessed" value={opt.value} checked={witnessed === opt.value} onChange={() => setWitnessed(opt.value)}
                  className="w-4 h-4 accent-pink" />
                <span className="text-sm text-white/80">{opt.label}</span>
              </label>
            ))}
          </fieldset>

          {/* Issue types */}
          {(witnessed === 'yes_direct' || witnessed === 'yes_witnessed') && (
            <fieldset>
              <legend className="text-sm text-white/70 mb-2 font-medium">Issue types (select all that apply)</legend>
              {Object.entries(ISSUE_TYPE_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2.5 py-1.5 cursor-pointer">
                  <input type="checkbox" checked={issueTypes.includes(key)} onChange={() => toggleCheckbox(issueTypes, key, setIssueTypes)}
                    className="w-4 h-4 accent-pink" />
                  <span className="text-sm text-white/80">{label}</span>
                </label>
              ))}
            </fieldset>
          )}

          {/* Timeframe */}
          <fieldset>
            <legend className="text-sm text-white/70 mb-2 font-medium">When did this occur? *</legend>
            {[
              { value: 'last_6_months', label: 'Last 6 months' },
              { value: '6_12_months', label: '6-12 months ago' },
              { value: '1_2_years', label: '1-2 years ago' },
              { value: 'over_2_years', label: 'Over 2 years ago' },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2.5 py-1.5 cursor-pointer">
                <input type="radio" name="timeframe" value={opt.value} checked={timeframe === opt.value} onChange={() => setTimeframe(opt.value)}
                  className="w-4 h-4 accent-pink" />
                <span className="text-sm text-white/80">{opt.label}</span>
              </label>
            ))}
          </fieldset>

          {/* Reported */}
          <fieldset>
            <legend className="text-sm text-white/70 mb-2 font-medium">Did you report it? *</legend>
            {[
              { value: 'yes_hr', label: 'Yes, to HR' },
              { value: 'yes_management', label: 'Yes, to management' },
              { value: 'yes_external', label: 'Yes, externally' },
              { value: 'no', label: 'No' },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2.5 py-1.5 cursor-pointer">
                <input type="radio" name="reported" value={opt.value} checked={reported === opt.value} onChange={() => setReported(opt.value)}
                  className="w-4 h-4 accent-pink" />
                <span className="text-sm text-white/80">{opt.label}</span>
              </label>
            ))}
          </fieldset>

          {/* Company response */}
          {reported !== 'no' && reported !== '' && (
            <fieldset>
              <legend className="text-sm text-white/70 mb-2 font-medium">Company response (select all that apply)</legend>
              {Object.entries(RESPONSE_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2.5 py-1.5 cursor-pointer">
                  <input type="checkbox" checked={companyResponse.includes(key)} onChange={() => toggleCheckbox(companyResponse, key, setCompanyResponse)}
                    className="w-4 h-4 accent-pink" />
                  <span className="text-sm text-white/80">{label}</span>
                </label>
              ))}
            </fieldset>
          )}

          {/* Would recommend */}
          <fieldset>
            <legend className="text-sm text-white/70 mb-2 font-medium">Would you recommend this workplace? *</legend>
            {[
              { value: 'yes', label: 'Yes' },
              { value: 'with_reservations', label: 'With reservations' },
              { value: 'no', label: 'No' },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2.5 py-1.5 cursor-pointer">
                <input type="radio" name="recommend" value={opt.value} checked={wouldRecommend === opt.value} onChange={() => setWouldRecommend(opt.value)}
                  className="w-4 h-4 accent-pink" />
                <span className="text-sm text-white/80">{opt.label}</span>
              </label>
            ))}
          </fieldset>

          {/* Comment */}
          <div>
            <label className="text-sm text-white/70 mb-2 font-medium block">Optional comment ({200 - comment.length} chars left)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 200))}
              placeholder="Brief, non-identifying comment..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pink resize-none"
            />
          </div>

          {error && <p className="text-rose-flag text-xs">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 bg-pink text-white rounded-lg text-sm font-medium hover:bg-pink/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit Anonymous Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
