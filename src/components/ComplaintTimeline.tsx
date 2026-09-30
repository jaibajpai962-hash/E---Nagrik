import { Check } from 'lucide-react';
import type { Status } from '../types';
import { STATUSES } from '../data/mock';
export default function ComplaintTimeline({ status }: { status: Status }) {
  const current = STATUSES.indexOf(status);
  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:justify-between" aria-label="Complaint status timeline">
      {STATUSES.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s} className="flex items-center gap-2 sm:flex-col sm:text-center" aria-current={i === current ? 'step' : undefined}>
            <span className={`grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-semibold ${done ? 'border-accent bg-accent text-white' : 'border-line text-muted'} ${i === current ? 'ring-4 ring-light' : ''}`}>
              {done ? <Check size={16} /> : i + 1}
            </span>
            <span className={`text-sm ${done ? 'font-medium' : 'text-muted'}`}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
