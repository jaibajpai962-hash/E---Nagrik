import type { Complaint } from '../types';
import { commonIssuesBase, initialComplaints } from '../data/mock';

export const BADGES = [
  { name: 'Beginner', min: 0, range: '0–24' },
  { name: 'Clean Citizen', min: 25, range: '25–49' },
  { name: 'Eco Contributor', min: 50, range: '50–99' },
  { name: 'Waste Warrior', min: 100, range: '100–199' },
  { name: 'Green Champion', min: 200, range: '200+' },
];
export function getBadge(points: number) {
  let i = 0;
  BADGES.forEach((b, idx) => { if (points >= b.min) i = idx; });
  const next = BADGES[i + 1];
  const goal = points < 100 ? 100 : points < 200 ? 200 : points;
  return { badge: BADGES[i], next, goal, toNext: next ? next.min - points : 0 };
}
export const today = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
export const nextId = (list: Complaint[]) =>
  `EN-2026-${Math.max(1000, ...list.map((c) => parseInt(c.id.split('-')[2], 10) || 0)) + 1}`;
export const isPending = (c: Complaint) => c.status === 'Submitted' || c.status === 'Under Review';

const diff = (cur: Complaint[], f: (c: Complaint) => boolean) => cur.filter(f).length - initialComplaints.filter(f).length;
/** Admin numbers start from the demo baseline (28/8/6/14) and move with real changes. */
export function adminStats(cur: Complaint[]) {
  return {
    total: 28 + diff(cur, () => true), pending: 8 + diff(cur, isPending),
    progress: 6 + diff(cur, (c) => c.status === 'In Progress'), resolved: 14 + diff(cur, (c) => c.status === 'Resolved'),
  };
}
export function commonIssues(cur: Complaint[]) {
  return Object.entries(commonIssuesBase).map(([name, base]) => [name, base + diff(cur, (c) => c.category === name)] as const);
}
