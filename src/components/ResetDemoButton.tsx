import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import { useApp } from '../context/AppContext';
export default function ResetDemoButton({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { reset, toast } = useApp();
  return (
    <>
      <button className={className} onClick={() => setOpen(true)}><RotateCcw size={16} /> Reset Demo Data</button>
      {open && <ConfirmDialog title="Reset demo data?" message="All complaints, Green Points and quiz progress will return to their starting values." confirmText="Reset"
        onCancel={() => setOpen(false)} onConfirm={() => { reset(); setOpen(false); toast('Demo data reset.'); }} />}
    </>
  );
}
