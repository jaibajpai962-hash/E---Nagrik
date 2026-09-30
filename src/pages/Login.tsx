import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Field from '../components/Field';
import { useApp } from '../context/AppContext';
import { adminUser, citizenUser } from '../data/mock';
export default function Login() {
  const { login, toast } = useApp();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const go = (role: 'citizen' | 'admin') => {
    login(role === 'admin' ? adminUser : citizenUser);
    toast(`Logged in as ${role === 'admin' ? 'Admin' : 'Citizen'}`);
    nav(role === 'admin' ? '/admin/dashboard' : '/citizen/dashboard');
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pw) return setErr('Enter your email and password.');
    go(email.toLowerCase().startsWith('admin') ? 'admin' : 'citizen');
  };
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="card w-full max-w-sm space-y-4">
        <div className="text-center"><div className="flex justify-center"><Logo /></div>
          <p className="mt-2 text-sm font-medium">Report. Track. Segregate. Keep Your City Clean.</p></div>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <Field label="Email"><input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
          <Field label="Password"><input type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></Field>
          {err && <p role="alert" className="text-xs text-danger">{err}</p>}
          <button className="btn-primary w-full" type="submit">Login</button>
        </form>
        <p className="text-center text-sm"><Link to="/register" className="text-primary underline">New user? Create account</Link></p>
        <div className="space-y-2 border-t border-line pt-4">
          <button className="btn-outline w-full" onClick={() => go('citizen')}>Login as Citizen</button>
          <button className="btn-outline w-full" onClick={() => go('admin')}>Login as Admin</button>
          <p className="hint text-center">Demo ke liye direct login karein.</p>
        </div>
      </div>
    </div>
  );
}
