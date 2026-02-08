interface Props {
  actions_taken: string[];
  gaps: string[];
}

export default function ResponseAnalysis({ actions_taken, gaps }: Props) {
  return (
    <div className="my-10">
      <h3 className="font-serif text-xl mb-6 text-white">Company Response</h3>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-teal-clean mb-3">Actions Taken</h4>
          {actions_taken?.length ? (
            <ul className="space-y-2">
              {actions_taken.map((a, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-teal-clean mt-0.5">✓</span>
                  <span className="text-white/80">{a}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-white/50">None documented.</p>
          )}
        </div>
        <div>
          <h4 className="text-sm font-medium text-rose-flag mb-3">Gaps</h4>
          {gaps?.length ? (
            <ul className="space-y-2">
              {gaps.map((g, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-rose-flag mt-0.5">✕</span>
                  <span className="text-white/80">{g}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-white/50">None documented.</p>
          )}
        </div>
      </div>
    </div>
  );
}
