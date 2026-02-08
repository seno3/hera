import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, Sparkles } from 'lucide-react';
import NeuralBackground from '@/components/ui/flow-field-background';
import Blogs from '@/components/ui/blogs';

import ImpactStatement from '../components/ImpactStatement';
import { api } from '../services/api';

function scoreColor(score: number | null) {
  if (score === null) return 'text-muted';
  if (score <= 5) return 'text-rose-flag';
  if (score <= 6) return 'text-amber-warn';
  return 'text-teal-clean';
}

function severityPill(severity: string | null) {
  if (!severity) return null;
  const colors: Record<string, string> = {
    high: 'bg-rose-flag/10 text-rose-flag',
    medium: 'bg-amber-warn/10 text-amber-warn',
    low: 'bg-teal-clean/10 text-teal-clean',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[severity] || 'bg-gray-100 text-muted'}`}>
      {severity}
    </span>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async (tickers: string[]) => {
    setLoading(true);
    try {
      const res = await api.scanPortfolio(tickers);
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (ticker: string) => {
    try {
      await api.triggerAnalysis(ticker);
    } catch {}
    navigate(`/company/${ticker}`);
  };

  const scannerRef = useRef<HTMLDivElement>(null);

  return (
    <main>
      {/* Hero with flow field background */}
      <section className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden bg-body">
        <NeuralBackground
          color="#f9a8c9"
          trailOpacity={0.1}
          speed={0.8}
          particleCount={600}
          className="absolute inset-0"
        />
        <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
          <p className="font-serif text-6xl md:text-8xl lg:text-9xl text-white mb-4 md:mb-6 leading-none tracking-tight">
            Hera.
          </p>
          <h1 className="font-serif text-4xl md:text-6xl text-white mb-6 leading-tight">
            For those who care.
          </h1>
          <p className="text-pink-light/90 text-lg md:text-xl leading-relaxed mb-10">
            Your guide to fair pay, safe workplaces, and companies that value women.
          </p>


        </div>
      </section>
      {/* Results */}
    </main>
  );
}
