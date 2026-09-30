import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Field from '../components/Field';
import { useApp } from '../context/AppContext';
export default function Register() {
  const { login, toast } = useApp();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', mobile: '', password: '', area: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const x: Record<string, string> = {};
    if (f.name.trim().length < 2) x.name = 'Enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) x.email = 'Enter a valid email';
    if (!/^\d{10}$/.test(f.mobile)) x.mobile = 'Enter a 10-digit mobile number';
    if (f.password.length < 6) x.password = 'Password must be at least 6 characters';
    if (!f.area.trim()) x.area = 'Enter your area or address';
    setErr(x);
    if (Object.keys(x).length) return;
    login({ name: f.name.trim(), email: f.email.trim(), role: 'citizen' });
    toast('Account created successfully');
    nav('/citizen/dashboard');
  };
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} noValidate className="card w-full max-w-md space-y-3">
        <div className="flex justify-center"><Logo /></div>
        <div className="text-center"><p className="text-sm">Report waste issues and track action in one place.</p>
          <p className="hint">Kachre ki problem report karein aur uska status track karein.</p></div>
        <Field label="Full Name" error={err.name}><input className="input" value={f.name} onChange={set('name')} autoComplete="name" /></Field>
        <Field label="Email" error={err.email}><input type="email" className="input" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
        <Field label="Mobile Number" error={err.mobile}><input inputMode="numeric" maxLength={10} className="input" value={f.mobile} onChange={set('mobile')} /></Field>
        <Field label="Password" error={err.password}><input type="password" className="input" value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
        <Field label="Area / Address" error={err.area}><input className="input" value={f.area} onChange={set('area')} /></Field>
        <button className="btn-primary w-full" type="submit">Register</button>
        <p className="text-center text-sm"><Link to="/login" className="text-primary underline">Already have an account? Login</Link></p>
      </form>
    </div>
  );
}
