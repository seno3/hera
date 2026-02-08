interface Event {
  date: string;
  event: string;
}

export default function Timeline({ events }: { events: Event[] }) {
  if (!events?.length) return null;

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  const dotColor = (evt: string) => {
    const lower = evt.toLowerCase();
    if (lower.includes('settled') || lower.includes('resolved') || lower.includes('appointed')) return 'bg-teal-clean';
    if (lower.includes('filed') || lower.includes('alleged') || lower.includes('lawsuit') || lower.includes('harassment')) return 'bg-rose-flag';
    return 'bg-pink';
  };

  return (
    <div className="my-10">
      <h3 className="font-serif text-xl mb-6 text-white">Timeline</h3>
      <div className="relative pl-6 border-l border-white/10">
        {sorted.map((e, i) => (
          <div key={i} className="mb-6 relative">
            <div className={`absolute -left-[25px] top-1.5 w-3 h-3 rounded-full ${dotColor(e.event)}`} />
            <div className="text-xs text-white/50 mb-1">{e.date}</div>
            <div className="text-sm text-white/80">{e.event}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
