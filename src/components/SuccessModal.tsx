import { CheckCircle2 } from 'lucide-react';
import Modal from './Modal';
interface Props { id: string; onList: () => void; onDash: () => void }
export default function SuccessModal({ id, onList, onDash }: Props) {
  return (
    <Modal title="Issue reported successfully" onClose={onDash}>
      <div className="text-center">
        <CheckCircle2 className="mx-auto text-accent" size={44} />
        <p className="mt-3 text-sm">Complaint ID: <b>{id}</b></p>
        <p className="mt-1 text-sm font-medium text-primary">You earned +5 Green Points.</p>
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button className="btn-primary flex-1" onClick={onList}>Go to My Complaints</button>
        <button className="btn-outline flex-1" onClick={onDash}>Go to Dashboard</button>
      </div>
    </Modal>
  );
}
