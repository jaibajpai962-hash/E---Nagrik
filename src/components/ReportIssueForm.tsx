import { useState, type FormEvent } from 'react';
import type { NewComplaint, Priority } from '../types';
import { CATEGORIES } from '../data/mock';
import Field from './Field';
import ImageUploadPreview from './ImageUploadPreview';
export default function ReportIssueForm({ onSubmit, onError }: { onSubmit: (d: NewComplaint) => void; onError: (m: string) => void }) {
  const [f, setF] = useState<NewComplaint>({ category: '', title: '', description: '', location: '', priority: 'Medium', photo: undefined });
  const [err, setErr] = useState<Record<string, string>>({});
  const set = <K extends keyof NewComplaint>(k: K, v: NewComplaint[K]) => setF((p) => ({ ...p, [k]: v }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const x: Record<string, string> = {};
    if (!f.category) x.category = 'Select a category';
    if (f.title.trim().length < 5) x.title = 'Enter a title (min 5 characters)';
    if (f.description.trim().length < 10) x.description = 'Describe the issue (min 10 characters)';
    if (!f.location.trim()) x.location = 'Enter the location or area';
    setErr(x);
    if (Object.keys(x).length === 0) onSubmit({ ...f, title: f.title.trim(), description: f.description.trim(), location: f.location.trim() });
  };
  return (
    <form onSubmit={submit} className="card space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Issue Category *" error={err.category}>
          <select className="input" value={f.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">Select category</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select className="input" value={f.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
            {['Low', 'Medium', 'High'].map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Issue Title *" error={err.title}><input className="input" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Bin overflowing near park" /></Field>
      <Field label="Description *" error={err.description}><textarea rows={4} className="input" value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
      <Field label="Location / Area *" error={err.location}><input className="input" value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Sector 12 Park" /></Field>
      <div><span className="mb-1 block text-sm font-medium">Photo (optional)</span><ImageUploadPreview value={f.photo} onChange={(v) => set('photo', v)} onError={onError} /></div>
      <div>
        <button className="btn-primary w-full sm:w-auto" type="submit">Submit Report</button>
        <p className="hint">Kachre ki problem ki details bharkar report submit karein.</p>
      </div>
    </form>
  );
}
