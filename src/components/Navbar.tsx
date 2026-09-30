import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import Logo from './Logo';
import ResetDemoButton from './ResetDemoButton';
import { useApp } from '../context/AppContext';
const links = [['Dashboard', '/citizen/dashboard'], ['Report Issue', '/citizen/report-issue'], ['My Complaints', '/citizen/complaints'], ['Green Score', '/citizen/green-score']];
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { logout } = useApp();
  const nav = useNavigate();
  const cls = ({ isActive }: { isActive: boolean }) => `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-light text-primary' : 'text-muted hover:text-ink'}`;
  const out = () => { logout(); nav('/login'); };
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Logo to="/citizen/dashboard" />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map(([l, to]) => <NavLink key={to} to={to} className={cls}>{l}</NavLink>)}
          <ResetDemoButton className="ml-2 flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-muted hover:text-ink" />
          <button onClick={out} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-danger"><LogOut size={16} />Logout</button>
        </nav>
        <button className="md:hidden" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && (
        <nav className="flex flex-col gap-1 border-t border-line px-4 py-3 md:hidden" aria-label="Mobile" onClick={() => setOpen(false)}>
          {links.map(([l, to]) => <NavLink key={to} to={to} className={cls}>{l}</NavLink>)}
          <ResetDemoButton className="flex items-center gap-1 px-3 py-2 text-sm text-muted" />
          <button onClick={out} className="flex items-center gap-1 px-3 py-2 text-left text-sm text-danger"><LogOut size={16} />Logout</button>
        </nav>
      )}
    </header>
  );
}
