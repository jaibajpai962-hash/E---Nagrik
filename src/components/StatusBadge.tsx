import type { Status } from '../types';
const styles: Record<Status, string> = {
  Submitted: 'bg-blue-50 text-blue-700', 'Under Review': 'bg-yellow-50 text-yellow-700',
  'In Progress': 'bg-orange-50 text-orange-700', Resolved: 'bg-light text-primary',
};
export default function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>{status}</span>;
}
