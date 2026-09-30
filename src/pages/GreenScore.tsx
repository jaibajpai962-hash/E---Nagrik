import { useState } from 'react';
import { Award, ClipboardCheck, FileText, Recycle, Users } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import QuizModal from '../components/QuizModal';
import { useApp } from '../context/AppContext';
import { tips } from '../data/mock';
import { BADGES, getBadge } from '../utils';
const earn = [
  { t: 'Report a valid waste issue', p: 5, i: FileText }, { t: 'Complete segregation quiz', p: 15, i: ClipboardCheck },
  { t: 'Verified correct segregation', p: 20, i: Recycle }, { t: 'Community clean-up activity', p: 25, i: Users },
];
export default function GreenScore() {
  const { points, quizDone } = useApp();
  const [quiz, setQuiz] = useState(false);
  const { badge, next, goal, toNext } = getBadge(points);
  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-primary p-5 text-white sm:p-8" aria-label="Green score">
        <h1 className="text-lg font-medium opacity-90">My Green Score</h1>
        <p className="mt-1 text-5xl font-bold">{points} <span className="text-2xl font-medium">Points</span></p>
        <div className="my-4 max-w-xl"><ProgressBar value={points} max={goal} onDark /><p className="mt-1 text-sm opacity-90">{points} / {goal}</p></div>
        <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium"><Award size={16} />{badge.name}</p>
        <p className="mt-2 text-sm">{next ? `Earn ${toNext} more points to become ${next.name}.` : 'You are a Green Champion. Keep it up!'}</p>
        <button className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-light" onClick={() => setQuiz(true)}>Take Segregation Quiz</button>
        <p className="mt-1 text-xs opacity-80">{quizDone ? 'Quiz reward already claimed.' : 'Quiz dekar 15 points kamayein.'}</p>
      </section>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="card"><h2 className="mb-3 font-semibold">How to earn points</h2>
          <ul className="space-y-2">{earn.map(({ t, p, i: Icon }) => (
            <li key={t} className="flex items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2"><Icon size={16} className="text-accent" />{t}</span><b className="text-primary">+{p}</b></li>))}</ul>
        </section>
        <section className="card"><h2 className="mb-3 font-semibold">Badge levels</h2>
          <ul className="space-y-2">{BADGES.map((b) => (
            <li key={b.name} className={`flex justify-between rounded-lg px-3 py-1.5 text-sm ${b.name === badge.name ? 'bg-light font-semibold text-primary' : 'text-muted'}`}><span>{b.name}</span><span>{b.range}</span></li>))}</ul>
        </section>
      </div>
      <section aria-label="Waste segregation tips"><h2 className="mb-1 font-semibold">Waste Segregation Tips</h2>
        <p className="hint mb-3 mt-0">Kachre ko sahi tarah alag karein.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tips.map((t) => <div key={t.title} className="card !p-4"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${t.color}`}>{t.title}</span><p className="mt-2 text-sm">{t.text}</p></div>)}
        </div>
      </section>
      {quiz && <QuizModal onClose={() => setQuiz(false)} />}
    </div>
  );
}
