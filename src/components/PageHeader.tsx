import type { ReactNode } from 'react';
export default function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">{title}</h1>{subtitle && <p className="text-sm text-muted">{subtitle}</p>}</div>
      {action}
    </div>
  );
}
