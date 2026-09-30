import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ClipboardList, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import Logo from './Logo';
import ResetDemoButton from './ResetDemoButton';
import { useApp } from '../context/AppContext';
export default function AdminSidebar() {
  const [open, setOpen] = useState(false);
  const { logout } = useApp();
  const nav = useNavigate();
  const cls = ({ isActive }: { isActive: boolean }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-light text-primary' : 'text-muted hover:text-ink'}`;
  const menu = (
    <nav className="flex flex-col gap-1" aria-label="Admin" onClick={() => setOpen(false)}>
      <NavLink to="/admin/dashboard" className={cls}><LayoutDashboard size={16} />Overview</NavLink>
      <NavLink to="/admin/complaints" className={cls}><ClipboardList size={16} />Complaints</NavLink>
      <ResetDemoButton className="flex items-center gap-2 px-3 py-2 text-sm text-muted hover:text-ink" />
      <button onClick={() => { logout(); nav('/login'); }} className="flex items-center gap-2 px-3 py-2 text-sm text-danger"><LogOut size={16} />Logout</button>
    </nav>
  );
  return (
    <>
      <aside className="hidden w-56 shrink-0 flex-col gap-6 border-r border-line bg-white p-4 md:flex">
        <Logo to="/admin/dashboard" />
        <p className="rounded-lg bg-canvas px-3 py-2 text-sm"><span className="block text-xs text-muted">Signed in as</span>Municipal Admin</p>
        {menu}
      </aside>
      <header className="border-b border-line bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo to="/admin/dashboard" />
          <button aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        </div>
        {open && <div className="border-t border-line px-4 py-3"><p className="mb-2 text-xs text-muted">Municipal Admin</p>{menu}</div>}
      </header>
    </>
  );
}
