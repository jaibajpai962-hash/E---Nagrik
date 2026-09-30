import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import ReportIssueForm from '../components/ReportIssueForm';
import SuccessModal from '../components/SuccessModal';
import { useApp } from '../context/AppContext';
export default function ReportIssue() {
  const { addComplaint, toast } = useApp();
  const nav = useNavigate();
  const [id, setId] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Report Waste Issue" subtitle="Kachre ki problem report karein." />
      <ReportIssueForm onSubmit={(d) => setId(addComplaint(d).id)} onError={(m) => toast(m, 'error')} />
      {id && <SuccessModal id={id} onList={() => nav('/citizen/complaints')} onDash={() => nav('/citizen/dashboard')} />}
    </div>
  );
}
