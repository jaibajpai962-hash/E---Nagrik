import type { LucideIcon } from 'lucide-react';
export default function SummaryCard({ label, value, icon: Icon, tone = 'text-primary bg-light' }: { label: string; value: number | string; icon: LucideIcon; tone?: string }) {
  return (
    <div className="card flex items-center gap-3 !p-4">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={20} /></span>
      <div><p className="text-xl font-bold leading-tight">{value}</p><p className="text-xs text-muted">{label}</p></div>
    </div>
  );
}
