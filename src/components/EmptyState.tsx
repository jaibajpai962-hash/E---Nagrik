import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
export default function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center py-10 text-center">
      <Inbox className="text-muted" size={32} />
      <p className="mt-2 font-medium">{title}</p>
      {text && <p className="text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
