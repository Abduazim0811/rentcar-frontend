import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
export function Button({ className, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const map = { primary: 'bg-brand-600 text-white hover:bg-brand-700', secondary: 'border border-line bg-white text-ink hover:bg-slate-50', danger: 'bg-danger text-white hover:bg-red-700' };
  return <button className={cn('focus-ring inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition', map[variant], className)} {...props} />;
}
export function LinkButton({ href, children, variant = 'primary', className }: { href: string; children: React.ReactNode; variant?: 'primary' | 'secondary'; className?: string }) {
  const map = { primary: 'bg-brand-600 text-white hover:bg-brand-700', secondary: 'border border-line bg-white text-ink hover:bg-slate-50' };
  return <Link to={href} className={cn('focus-ring inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition', map[variant], className)}>{children}</Link>;
}
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('rounded-lg border border-line bg-white shadow-sm', className)} {...props} />; }
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input className="focus-ring w-full rounded-md border border-line bg-white px-3 py-2 text-sm" {...props} />; }
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select className="focus-ring w-full rounded-md border border-line bg-white px-3 py-2 text-sm" {...props} />; }
