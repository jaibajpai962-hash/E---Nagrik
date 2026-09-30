import { Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProgressBar from './ProgressBar';
import { getBadge } from '../utils';
export default function GreenScoreCard({ points }: { points: number }) {
  const { badge, goal } = getBadge(points);
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div><p className="text-sm text-muted">Green Score</p><p className="text-2xl font-bold text-primary">{points} Points</p></div>
        <span className="flex items-center gap-1 rounded-full bg-light px-3 py-1 text-xs font-medium text-primary"><Award size={14} />{badge.name}</span>
      </div>
      <div className="my-3"><ProgressBar value={points} max={goal} /><p className="hint">{points} / {goal}</p></div>
      <Link to="/citizen/green-score" className="btn-outline w-full">Open Green Score</Link>
    </div>
  );
}
