import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Complaint, NewComplaint, Status, ToastMsg, User } from '../types';
import { INITIAL_POINTS, initialComplaints } from '../data/mock';
import { nextId, today } from '../utils';
import Toast from '../components/Toast';

const KEY = 'enagrik-demo-v1';
interface Saved { user: User | null; complaints: Complaint[]; points: number; quizDone: boolean }
const fresh = (): Saved => ({ user: null, complaints: initialComplaints, points: INITIAL_POINTS, quizDone: false });
function load(): Saved {
  try { const raw = localStorage.getItem(KEY); return raw ? { ...fresh(), ...JSON.parse(raw) } : fresh(); } catch { return fresh(); }
}

interface Store extends Saved {
  login: (u: User) => void; logout: () => void;
  addComplaint: (d: NewComplaint) => Complaint;
  updateComplaint: (id: string, status: Status, remark: string) => void;
  awardQuiz: () => boolean; reset: () => void; toast: (text: string, type?: ToastMsg['type']) => void;
}
const Ctx = createContext<Store | null>(null);
export const useApp = () => { const c = useContext(Ctx); if (!c) throw new Error('AppProvider missing'); return c; };

export function AppProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Saved>(load);
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage full */ } }, [s]);

  const store: Store = {
    ...s,
    login: (user) => setS((p) => ({ ...p, user })),
    logout: () => setS((p) => ({ ...p, user: null })),
    addComplaint: (d) => {
      const c: Complaint = { ...d, id: nextId(s.complaints), citizen: s.user?.name ?? 'Aarav Sharma', status: 'Submitted', date: today(), adminRemark: 'Pending review.' };
      setS((p) => ({ ...p, complaints: [c, ...p.complaints], points: p.points + 5 }));
      return c;
    },
    updateComplaint: (id, status, adminRemark) =>
      setS((p) => ({ ...p, complaints: p.complaints.map((c) => (c.id === id ? { ...c, status, adminRemark } : c)) })),
    awardQuiz: () => {
      if (s.quizDone) return false;
      setS((p) => ({ ...p, points: p.points + 15, quizDone: true }));
      return true;
    },
    reset: () => setS((p) => ({ ...fresh(), user: p.user })),
    toast: (text, type = 'success') => setMsg({ text, type }),
  };
  return <Ctx.Provider value={store}>{children}<Toast toast={msg} onClose={() => setMsg(null)} /></Ctx.Provider>;
}
