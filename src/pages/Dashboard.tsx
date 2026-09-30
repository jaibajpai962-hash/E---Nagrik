import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, FileText, Leaf } from 'lucide-react';
import SummaryCard from '../components/SummaryCard';
import ComplaintCard from '../components/ComplaintCard';
import GreenScoreCard from '../components/GreenScoreCard';
import EmptyState from '../components/EmptyState';
import { useApp } from '../context/AppContext';
import { isPending } from '../utils';
export default function Dashboard() {
  const { user, complaints, points } = useApp();
  const mine = complaints.filter((c) => c.citizen === user?.name);
  return (
    <div>
      <h1 className="text-2xl font-bold">Hello, {user?.name.split(' ')[0]}!</h1>
      <p className="mb-5 text-sm text-muted">Help us keep your neighbourhood clean.</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Total Complaints" value={mine.length} icon={FileText} tone="bg-blue-50 text-blue-700" />
        <SummaryCard label="Pending" value={mine.filter(isPending).length} icon={Clock} tone="bg-yellow-50 text-yellow-700" />
        <SummaryCard label="Resolved" value={mine.filter((c) => c.status === 'Resolved').length} icon={CheckCircle2} />
        <SummaryCard label="Green Points" value={points} icon={Leaf} />
      </div>
      <div className="my-5 flex flex-col gap-2 sm:flex-row">
        <Link to="/citizen/report-issue" className="btn-primary">Report Waste Issue</Link>
        <Link to="/citizen/complaints" className="btn-outline">View My Complaints</Link>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2" aria-label="Recent complaints">
          <h2 className="font-semibold">Recent Complaints</h2>
          {mine.length === 0 ? <EmptyState title="No complaints yet" text="Report your first issue to get started." /> : mine.slice(0, 3).map((c) => <ComplaintCard key={c.id} c={c} />)}
        </section>
        <GreenScoreCard points={points} />
      </div>
    </div>
  );
}
