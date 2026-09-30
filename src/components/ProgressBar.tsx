export default function ProgressBar({ value, max, onDark = false }: { value: number; max: number; onDark?: boolean }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} className={`h-3 w-full overflow-hidden rounded-full ${onDark ? 'bg-white/25' : 'bg-light'}`}>
      <div className={`h-full rounded-full ${onDark ? 'bg-white' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
