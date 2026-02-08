import { useState, useEffect, useRef, useCallback } from 'react';

const STEPS = [
  'Searching SEC filings...',
  'Scanning court records...',
  'Reviewing news coverage...',
  'Running AI analysis...',
  'Building profile...',
];

const POLL_INTERVAL = 3000;
const TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

interface Props {
  ticker: string;
  onComplete: (result: any) => void;
  onError?: (error: string) => void;
  checkStatus: () => Promise<{ status: string; result?: any; error?: string }>;
}

export default function AnalysisLoader({ ticker, onComplete, onError, checkStatus }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const doneRef = useRef(false);

  // Stable callback refs to avoid stale closures
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const checkStatusRef = useRef(checkStatus);
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;
  checkStatusRef.current = checkStatus;

  const handleDone = useCallback((result: any) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setCompletedSteps([0, 1, 2, 3, 4]);
    setTimeout(() => onCompleteRef.current(result), 600);
  }, []);

  const handleError = useCallback((msg: string) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setError(msg);
    onErrorRef.current?.(msg);
  }, []);

  useEffect(() => {
    // Step animation timer
    const stepTimer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < STEPS.length - 1) {
          setCompletedSteps(cs => [...cs, prev]);
          return prev + 1;
        }
        return prev;
      });
    }, 2500);

    // Poll for completion
    const pollTimer = setInterval(async () => {
      if (doneRef.current) return;
      try {
        const res = await checkStatusRef.current();
        if (res.status === 'complete' && res.result) {
          handleDone(res.result);
        } else if (res.status === 'error') {
          handleError(res.error || 'Analysis failed. Please try again.');
        }
      } catch (err) {
        console.error('[AnalysisLoader] poll error:', err);
        // Don't error on a single poll failure — backend might be momentarily busy
      }
    }, POLL_INTERVAL);

    // Timeout
    const timeoutTimer = setTimeout(() => {
      if (!doneRef.current) {
        setTimedOut(true);
        handleError('Analysis is taking longer than expected. The data may still be processing — try refreshing in a minute.');
      }
    }, TIMEOUT_MS);

    return () => {
      clearInterval(stepTimer);
      clearInterval(pollTimer);
      clearTimeout(timeoutTimer);
    };
  }, [handleDone, handleError]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="text-rose-flag text-4xl mb-4">{timedOut ? '⏳' : '✕'}</div>
          <h2 className="font-serif text-2xl text-white mb-3">
            {timedOut ? 'Taking Longer Than Expected' : 'Analysis Failed'}
          </h2>
          <p className="text-white/50 text-sm mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-pink text-white rounded-lg text-sm font-medium hover:bg-pink/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <h2 className="font-serif text-3xl text-white mb-2">Analyzing {ticker}</h2>
        <p className="text-white/50 text-sm mb-10">This may take a minute</p>
        <div className="space-y-4 text-left max-w-xs mx-auto">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="animate-fade-up flex items-center gap-3 text-sm"
              style={{ animationDelay: `${i * 1.5}s` }}
            >
              {completedSteps.includes(i) ? (
                <span className="text-teal-clean">✓</span>
              ) : i === currentStep ? (
                <span className="text-pink animate-pulse">⟳</span>
              ) : (
                <span className="text-white/20">○</span>
              )}
              <span className={completedSteps.includes(i) ? 'text-white' : i === currentStep ? 'text-white' : 'text-white/30'}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
