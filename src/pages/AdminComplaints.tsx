import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Image as ImageIcon, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import Field from '../components/Field';
import { useApp } from '../context/AppContext';
import { STATUSES } from '../data/mock';
import type { Complaint, Status } from '../types';

function DetailPanel({ c, onClose }: { c: Complaint; onClose: () => void }) {
  const { updateComplaint, toast } = useApp();
  const [status, setStatus] = useState<Status>(c.status);
  const [remark, setRemark] = useState(c.adminRemark);
  const save = () => { updateComplaint(c.id, status, remark.trim()); toast('Complaint updated successfully.'); onClose(); };
  return (
    <Modal title={`Manage ${c.id}`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p className="font-medium">{c.title}</p><p className="text-muted">{c.description}</p>
        <dl className="grid grid-cols-2 gap-2">
          {([['Citizen', c.citizen], ['Category', c.category], ['Location', c.location], ['Priority', c.priority], ['Date', c.date]] as const).map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd>{v}</dd></div>)}
        </dl>
        {c.photo ? <img src={c.photo} alt="Reported issue" className="h-36 rounded-lg border border-line object-cover" />
          : <div className="flex h-20 items-center justify-center gap-2 rounded-lg bg-light text-muted"><ImageIcon size={18} />No photo</div>}
        <Field label="Status"><select className="input" value={status} onChange={(e) => setStatus(e.target.value as Status)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Admin remarks"><textarea rows={3} className="input" value={remark} onChange={(e) => setRemark(e.target.value)} /></Field>
        <button className="btn-primary w-full" onClick={save}>Save Update</button>
      </div>
    </Modal>
  );
}

export default function AdminComplaints() {
  const { complaints } = useApp();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [flt, setFlt] = useState<'All' | Status>('All');
  const [openId, setOpenId] = useState<string | null>(params.get('open'));
  useEffect(() => { if (params.get('open')) setParams({}, { replace: true }); }, [params, setParams]);
  const list = complaints.filter((c) => (flt === 'All' || c.status === flt) && `${c.id} ${c.citizen}`.toLowerCase().includes(q.toLowerCase()));
  const open = complaints.find((c) => c.id === openId);
  return (
    <div>
      <PageHeader title="All Complaints" subtitle="Search, review and update complaint status." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-muted" />
          <input className="input pl-9" placeholder="Search by complaint ID or citizen name" aria-label="Search complaints" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="input sm:w-48" aria-label="Filter by status" value={flt} onChange={(e) => setFlt(e.target.value as 'All' | Status)}>
          <option>All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {list.length === 0 ? <EmptyState title="No complaints found" /> : (
        <div className="space-y-3">{list.map((c) => (
          <div key={c.id} className="card flex flex-col gap-3 !p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-primary">{c.id}</span><StatusBadge status={c.status} /><span className="text-xs text-muted">{c.priority} priority</span></div>
              <p className="mt-1 truncate font-medium">{c.title}</p>
              <p className="text-xs text-muted">{c.citizen} · {c.category} · {c.location} · {c.date}</p>
            </div>
            <button className="btn-outline shrink-0" onClick={() => setOpenId(c.id)}>Manage</button>
          </div>))}</div>
      )}
      {open && <DetailPanel key={open.id} c={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}
