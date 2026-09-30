import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import type { Complaint } from '../types';
import StatusBadge from './StatusBadge';
export default function ComplaintCard({ c }: { c: Complaint }) {
  return (
    <div className="card flex flex-col gap-3 !p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-primary">{c.id}</span><StatusBadge status={c.status} /></div>
        <p className="mt-1 truncate font-medium">{c.category}</p>
        <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted">
          <span className="flex items-center gap-1"><MapPin size={12} />{c.location}</span>
          <span className="flex items-center gap-1"><Calendar size={12} />{c.date}</span>
        </p>
      </div>
      <Link to={`/citizen/complaints/${c.id}`} className="btn-outline shrink-0">View</Link>
    </div>
  );
}
