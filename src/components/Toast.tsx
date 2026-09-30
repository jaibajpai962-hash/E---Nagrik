import { useEffect } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { ToastMsg } from '../types';
export default function Toast({ toast, onClose }: { toast: ToastMsg | null; onClose: () => void }) {
  useEffect(() => { if (!toast) return; const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [toast, onClose]);
  if (!toast) return null;
  const ok = toast.type === 'success';
  return (
    <div role="status" aria-live="polite" className={`fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${ok ? 'bg-primary' : 'bg-danger'}`}>
      {ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}{toast.text}
    </div>
  );
}
