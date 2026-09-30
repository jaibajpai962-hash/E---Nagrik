import { useState } from 'react';
import { Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ComplaintCard from '../components/ComplaintCard';
import EmptyState from '../components/EmptyState';
import { useApp } from '../context/AppContext';
import { isPending } from '../utils';
const filters = ['All', 'Pending', 'In Progress', 'Resolved'] as const;
export default function MyComplaints() {
  const { user, complaints } = useApp();
  const [q, setQ] = useState('');
  const [flt, setFlt] = useState<(typeof filters)[number]>('All');
  const list = complaints.filter((c) => c.citizen === user?.name)
    .filter((c) => flt === 'All' || (flt === 'Pending' ? isPending(c) : c.status === flt))
    .filter((c) => `${c.id} ${c.category} ${c.location} ${c.title}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader title="My Complaints" subtitle="Track the status of every issue you reported." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-muted" />
          <input className="input pl-9" placeholder="Search by ID, category or location" aria-label="Search complaints" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {filters.map((f) => <button key={f} aria-pressed={flt === f} onClick={() => setFlt(f)} className={`btn ${flt === f ? 'bg-primary text-white' : 'border border-line bg-white'}`}>{f}</button>)}
        </div>
      </div>
      <div className="space-y-3">{list.length ? list.map((c) => <ComplaintCard key={c.id} c={c} />) : <EmptyState title="No complaints found" text="Try a different search or filter." />}</div>
    </div>
  );
}
