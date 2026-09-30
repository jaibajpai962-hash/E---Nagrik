import { Navigate, Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import { useApp } from '../context/AppContext';
export default function AdminLayout() {
  const { user } = useApp();
  if (user?.role !== 'admin') return <Navigate to="/login" replace />;
  return <div className="flex min-h-screen flex-col md:flex-row"><AdminSidebar /><main className="min-w-0 flex-1 p-4 sm:p-6"><Outlet /></main></div>;
}
