import { Navigate, Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useApp } from '../context/AppContext';
export default function CitizenLayout() {
  const { user } = useApp();
  if (user?.role !== 'citizen') return <Navigate to="/login" replace />;
  return <div className="min-h-screen"><Navbar /><main className="mx-auto max-w-6xl px-4 py-6"><Outlet /></main></div>;
}
