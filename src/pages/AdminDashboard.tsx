import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, FileText, Loader } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SummaryCard from '../components/SummaryCard';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { adminStats, commonIssues } from '../utils';
export default function AdminDashboard() {
  const { complaints } = useApp();
  const s = adminStats(complaints);
  return (
    <div>
      <PageHeader title="Waste Management Overview" subtitle="Municipal Admin" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Total Complaints" value={s.total} icon={FileText} tone="bg-blue-50 text-blue-700" />
        <SummaryCard label="Pending" value={s.pending} icon={Clock} tone="bg-yellow-50 text-yellow-700" />
        <SummaryCard label="In Progress" value={s.progress} icon={Loader} tone="bg-orange-50 text-orange-700" />
        <SummaryCard label="Resolved" value={s.resolved} icon={CheckCircle2} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className="card min-w-0 lg:col-span-2"><h2 className="mb-3 font-semibold">Recent Complaints</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-muted"><tr>{['ID', 'Citizen', 'Category', 'Area', 'Priority', 'Status', ''].map((h) => <th key={h} className="pb-2 pr-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{complaints.slice(0, 5).map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="py-2 pr-3 font-medium text-primary">{c.id}</td><td className="pr-3">{c.citizen}</td><td className="pr-3">{c.category}</td>
                <td className="pr-3">{c.location}</td><td className="pr-3">{c.priority}</td><td className="pr-3"><StatusBadge status={c.status} /></td>
                <td><Link to={`/admin/complaints?open=${c.id}`} className="btn-outline !px-3 !py-1">Manage</Link></td>
              </tr>))}</tbody>
          </table></div>
        </section>
        <section className="card"><h2 className="mb-3 font-semibold">Common Issues</h2>
          <ul className="space-y-2">{commonIssues(complaints).map(([n, v]) => <li key={n} className="flex justify-between text-sm"><span>{n}</span><b>{v}</b></li>)}</ul>
        </section>
      </div>
    </div>
  );
}
