import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import ComplaintTimeline from '../components/ComplaintTimeline';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { useApp } from '../context/AppContext';
export default function ComplaintDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const { complaints } = useApp();
  const c = complaints.find((x) => x.id === id);
  if (!c) return <EmptyState title="Complaint not found" action={<Link to="/citizen/complaints" className="btn-primary">Back to My Complaints</Link>} />;
  const rows: [string, string][] = [['Category', c.category], ['Location', c.location], ['Priority', c.priority], ['Submitted', c.date]];
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <button className="btn-outline" onClick={() => nav(-1)}><ArrowLeft size={16} />Back</button>
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><p className="text-xs font-semibold text-primary">{c.id}</p><h1 className="text-xl font-bold">{c.title}</h1></div>
          <StatusBadge status={c.status} />
        </div>
        <p className="text-sm">{c.description}</p>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {rows.map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>)}
        </dl>
        {c.photo ? <img src={c.photo} alt="Uploaded issue" className="h-48 rounded-lg border border-line object-cover" />
          : <div className="grid h-32 place-items-center rounded-lg bg-light text-muted"><span className="flex items-center gap-2 text-sm"><ImageIcon size={20} />No photo uploaded</span></div>}
        <div className="rounded-lg bg-canvas p-3 text-sm"><span className="text-xs text-muted">Admin remark</span><p>{c.adminRemark}</p></div>
      </div>
      <div className="card"><h2 className="mb-4 font-semibold">Status Timeline</h2><ComplaintTimeline status={c.status} /></div>
      {c.status === 'Resolved' && (
        <div className="card flex items-center gap-3 border-accent bg-light">
          <CheckCircle2 className="text-primary" /><div><p className="font-semibold text-primary">Resolution completed</p><p className="text-sm">Thank you for helping keep the city clean.</p></div>
        </div>
      )}
    </div>
  );
}
