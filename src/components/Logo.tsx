import { Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';
export default function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 font-bold text-primary text-lg" aria-label="E Nagrik home">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white"><Leaf size={18} /></span>E Nagrik
    </Link>
  );
}
