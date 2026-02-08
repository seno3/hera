import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import AnalysisLoader from '../components/AnalysisLoader';
import CompanyReceipt from '../components/CompanyReceipt';
import ScoreBreakdown from '../components/ScoreBreakdown';
import ResponseAnalysis from '../components/ResponseAnalysis';
import Timeline from '../components/Timeline';
import Sources from '../components/Sources';
import Alternatives from '../components/Alternatives';
import EmployeePerspective from '../components/EmployeePerspective';

function scoreColor(score: number) {
  if (score <= 5) return 'text-rose-flag';
  if (score <= 6) return 'text-amber-warn';
  return 'text-teal-clean';
}

function looksLikeTicker(s: string) {
  return /^[A-Z]{1,5}$/.test(s);
}

export default function Company() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const [resolvedTicker, setResolvedTicker] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const rawInput = ticker || '';
  const upperInput = rawInput.toUpperCase();
  const activeTicker = resolvedTicker || (looksLikeTicker(upperInput) ? upperInput : null);

  // Resolve non-ticker input (e.g. "Apple" → "AAPL")
  useEffect(() => {
    setData(null);
    setError('');
    setAnalyzing(false);
    setLoading(true);

    if (looksLikeTicker(upperInput)) {
      setResolvedTicker(upperInput);
      return;
    }
    api.resolve([rawInput]).then((results) => {
      const resolved = results[0];
      if (resolved?.ticker) {
        setResolvedTicker(resolved.ticker);
        navigate(`/company/${resolved.ticker}`, { replace: true });
      } else {
        setError(`Could not resolve "${rawInput}" to a ticker`);
        setLoading(false);
      }
    }).catch(() => {
      setError(`Could not resolve "${rawInput}"`);
      setLoading(false);
    });
  }, [rawInput]);

  const checkStatus = useCallback(
    () => activeTicker ? api.checkAnalysisStatus(activeTicker) : Promise.resolve({ status: 'processing' }),
    [activeTicker]
  );

  // Fetch existing analysis or trigger a new one
  useEffect(() => {
    if (!activeTicker) return;
    setLoading(true);

    api.getCompany(activeTicker)
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(async (e) => {
        if (e.message === 'NOT_FOUND' || e.message === 'Not analyzed' || (e as any).status === 404) {
          // No existing analysis — trigger one and switch to polling mode
          setAnalyzing(true);
          setLoading(false);
          try {
            await api.triggerAnalysis(activeTicker);
          } catch (triggerErr) {
            console.error('[Company] Failed to trigger analysis:', triggerErr);
            setError('Failed to start analysis. Please try again.');
            setAnalyzing(false);
          }
        } else {
          console.error('[Company] Failed to load company:', e);
          setError('Failed to load company data. Check your connection and try again.');
          setLoading(false);
        }
      });
  }, [activeTicker]);

  const handleAnalysisComplete = useCallback((result: any) => {
    setData(result);
    setAnalyzing(false);
  }, []);

  const handleAnalysisError = useCallback((errMsg: string) => {
    setError(errMsg);
    setAnalyzing(false);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <p className="text-white/50 mb-6">{error}</p>
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

  if (analyzing && !data && activeTicker) {
    return (
      <AnalysisLoader
        ticker={activeTicker}
        checkStatus={checkStatus}
        onComplete={handleAnalysisComplete}
        onError={handleAnalysisError}
      />
    );
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-white/10 rounded mx-auto mb-4" />
            <div className="h-12 w-20 bg-white/10 rounded mx-auto mb-4" />
            <div className="h-4 w-64 bg-white/5 rounded mx-auto" />
          </div>
          <p className="text-white/30 text-sm mt-8">Loading company data...</p>
        </div>
      </div>
    );
  }

  const date = new Date(data.analyzed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const patternAnalysis = data.score_breakdown?.pattern_analysis;
  const isSystemic = patternAnalysis?.toLowerCase().includes('systemic') || patternAnalysis?.toLowerCase().includes('pattern');
  const dataQuality = data.score_breakdown?.data_quality || data.data_quality || null;
  const dataQualityDetail = data.score_breakdown?.data_quality_detail || data.data_quality_detail || null;

  return (
    <main className="bg-black text-white min-h-screen">
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="font-serif text-3xl md:text-4xl mb-2 text-white">{data.company_name}</h1>
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="font-mono text-xs bg-white/10 text-white/70 px-2 py-1 rounded">{data.company_ticker}</span>
          <span className={`font-mono text-4xl font-medium ${scoreColor(data.accountability_score)}`}>
            {data.accountability_score}
          </span>
          <span className="text-white/40 text-sm">/10</span>
        </div>
        <p className="text-white/60 max-w-lg mx-auto">{data.summary}</p>
        <p className="text-xs text-white/30 mt-3">Analyzed {date}</p>
        {dataQuality && (
          <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs ${
            dataQuality === 'high' ? 'bg-teal-clean/10 text-teal-clean' :
            dataQuality === 'medium' ? 'bg-amber-warn/10 text-amber-warn' :
            'bg-rose-flag/10 text-rose-flag'
          }`}>
            <span className="font-medium">Analysis confidence: {dataQuality.charAt(0).toUpperCase() + dataQuality.slice(1)}</span>
            {dataQualityDetail && <span className="text-inherit/70">— {dataQualityDetail}</span>}
          </div>
        )}
      </div>

      {/* Receipt */}
      <CompanyReceipt
        companyName={data.company_name}
        ticker={data.company_ticker}
        issues={data.issues || []}
        analyzedAt={data.analyzed_at}
      />

      {/* Pattern Analysis Callout */}
      {patternAnalysis && (
        <div className={`border-l-4 ${isSystemic ? 'border-rose-flag bg-rose-flag/10' : 'border-teal-clean bg-teal-clean/10'} px-5 py-4 rounded-r-lg my-10`}>
          <div className="text-xs text-white/50 mb-1 uppercase tracking-wide">Pattern Analysis</div>
          <p className="text-sm text-white/80">{patternAnalysis}</p>
        </div>
      )}
      <Sources sources={data.sources} />
      <ScoreBreakdown breakdown={data.score_breakdown} />
      <ResponseAnalysis actions_taken={data.response?.actions_taken} gaps={data.response?.gaps} />
      <Timeline events={data.timeline} />
      <Alternatives ticker={activeTicker || ''} />

      {/* Employee Perspective */}
      <EmployeePerspective ticker={activeTicker || ''} />

      {/* Disclaimer */}
      <div className="mt-16 pt-6 border-t border-white/10">
        <p className="text-xs text-white/40 leading-relaxed">{data.disclaimer}</p>
      </div>
      </div>
    </main>
  );
}
