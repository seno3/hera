export default function ImpactStatement({ statement }: { statement: string }) {
  if (!statement) return null;
  return (
    <div className="border-l-4 border-rose-flag bg-rose-flag/5 px-5 py-4 rounded-r-lg my-8">
      <p className="text-sm text-body leading-relaxed">{statement}</p>
    </div>
  );
}
