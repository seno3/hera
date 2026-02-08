import { useState } from 'react';
import { api } from '../services/api';
import { ShieldCheck, Mail, KeyRound, X } from 'lucide-react';

interface Props {
  onVerified: (token: string, userId: string, verifiedFor: string) => void;
  onClose: () => void;
}

export default function EmployeeVerification({ onVerified, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyTicker, setCompanyTicker] = useState('');
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestCode = async () => {
    if (!email.includes('@')) {
      setError('Enter a valid work email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.requestVerification(email);
      setCompanyName(res.company_name);
      setCompanyTicker(res.company_ticker);
      if (res.code) setDemoCode(res.code);
      setStep(2);
    } catch (e: any) {
      console.error('[Verification] Error:', e);
      // Show the actual backend error message
      setError(e.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.verifyCode(code);
      setStep(3);
      setTimeout(() => onVerified(res.token, res.user_id, res.verified_for), 1500);
    } catch {
      setError('Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-black border border-white/10 rounded-2xl w-full max-w-md mx-4 p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 w-10 rounded-full ${step >= s ? 'bg-pink' : 'bg-white/10'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-pink/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-pink" />
            </div>
            <h2 className="text-xl font-serif text-white mb-2">Verify Your Employment</h2>
            <p className="text-white/50 text-sm mb-6">
              Enter your work email. We'll send a code to verify you work at the company. Your identity remains completely anonymous.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRequestCode()}
              placeholder="you@company.com"
              className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:outline-none focus:border-pink text-sm mb-3"
            />
            {error && <p className="text-rose-flag text-xs mb-3">{error}</p>}
            <button
              onClick={handleRequestCode}
              disabled={loading}
              className="w-full py-3 bg-pink text-white rounded-lg text-sm font-medium hover:bg-pink/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
            <p className="text-white/30 text-xs mt-4">
              Your email is never stored permanently. It is deleted immediately after verification.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-pink/10 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-7 h-7 text-pink" />
            </div>
            <h2 className="text-xl font-serif text-white mb-2">Enter Code</h2>
            <p className="text-white/50 text-sm mb-2">
              We sent a 6-digit code to <span className="text-white/70">{email}</span>
            </p>
            <p className="text-white/40 text-xs mb-4">
              Verified for: <span className="text-pink">{companyName}</span> ({companyTicker})
            </p>
            {demoCode && (
              <div className="bg-teal-clean/10 border border-teal-clean/20 rounded-lg px-4 py-2 mb-4">
                <p className="text-teal-clean text-xs">Demo mode — your code is: <span className="font-mono font-bold text-sm">{demoCode}</span></p>
              </div>
            )}
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white text-center font-mono text-2xl tracking-[0.5em] placeholder:text-white/20 focus:outline-none focus:border-pink mb-3"
            />
            {error && <p className="text-rose-flag text-xs mb-3">{error}</p>}
            <button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="w-full py-3 bg-pink text-white rounded-lg text-sm font-medium hover:bg-pink/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-teal-clean/10 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-7 h-7 text-teal-clean" />
            </div>
            <h2 className="text-xl font-serif text-white mb-2">Verified!</h2>
            <p className="text-white/50 text-sm">
              You're verified as an employee of <span className="text-pink font-medium">{companyName}</span>. Opening review form...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
