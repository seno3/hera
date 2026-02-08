import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';

interface Breakdown {
  severity: string;
  response_quality: number;
  transparency: number;
  speed: string;
  current_status: string;
  pattern_analysis: string;
}

const speedToNum: Record<string, number> = { fast: 9, moderate: 6, slow: 3 };

export default function ScoreBreakdown({ breakdown }: { breakdown: Breakdown }) {
  const chartData = [
    { metric: 'Response', value: breakdown.response_quality || 5 },
    { metric: 'Transparency', value: breakdown.transparency || 5 },
    { metric: 'Speed', value: speedToNum[breakdown.speed] || 5 },
    { metric: 'Severity', value: breakdown.severity === 'low' ? 9 : breakdown.severity === 'medium' ? 5 : 2 },
  ];

  return (
    <div className="my-10">
      <h3 className="font-serif text-xl mb-6 text-white">Score Breakdown</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Severity', value: breakdown.severity },
          { label: 'Response Quality', value: `${breakdown.response_quality}/10` },
          { label: 'Transparency', value: `${breakdown.transparency}/10` },
          { label: 'Speed', value: breakdown.speed },
          { label: 'Status', value: breakdown.current_status },
        ].map(m => (
          <div key={m.label} className="border border-white/10 rounded-lg p-4">
            <div className="text-xs text-white/50 mb-1">{m.label}</div>
            <div className="text-sm font-medium capitalize text-white">{m.value}</div>
          </div>
        ))}
      </div>
      <div className="h-64 max-w-sm mx-auto">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.5)' }} />
            <Radar dataKey="value" stroke="#f9a8c9" fill="#f9a8c9" fillOpacity={0.3} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
