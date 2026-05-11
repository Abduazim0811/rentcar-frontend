import { Link } from 'react-router-dom';
import { Gauge, Users } from 'lucide-react';
import type { Car, Rental } from '../types';
import { money, shortDate, cn } from '../lib/utils';
import { Card, LinkButton } from './ui';

const badge: Record<string, string> = {
  available: 'bg-green-50 text-green-700 ring-green-200',
  rented: 'bg-blue-50 text-blue-700 ring-blue-200',
  maintenance: 'bg-amber-50 text-amber-700 ring-amber-200',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
  requested: 'bg-blue-50 text-blue-700 ring-blue-200',
  approved: 'bg-green-50 text-green-700 ring-green-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
  pending_payment: 'bg-amber-50 text-amber-700 ring-amber-200',
  confirmed: 'bg-green-50 text-green-700 ring-green-200',
  active: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  completed: 'bg-slate-100 text-slate-700 ring-slate-200',
  cancelled: 'bg-red-50 text-red-700 ring-red-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  paid: 'bg-green-50 text-green-700 ring-green-200',
  failed: 'bg-red-50 text-red-700 ring-red-200',
  refunded: 'bg-blue-50 text-blue-700 ring-blue-200',
  issued: 'bg-amber-50 text-amber-700 ring-amber-200',
  void: 'bg-slate-100 text-slate-600 ring-slate-200',
  scheduled: 'bg-blue-50 text-blue-700 ring-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 ring-amber-200',
  none: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export const DEFAULT_CAR_IMAGE = 'https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=1200&q=80';
export function StatusBadge({ value }: { value: string }) { return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1', badge[value] ?? badge.inactive)}>{value.replace('_', ' ')}</span>; }
export function CarCard({ car }: { car: Car }) { return <Card className="overflow-hidden"><div className="aspect-[16/10] bg-slate-200"><img src={car.image ?? DEFAULT_CAR_IMAGE} alt={car.brand + ' ' + car.model} className="h-full w-full object-cover" /></div><div className="space-y-4 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{car.brand} {car.model}</h3><p className="text-sm text-muted">{car.year} • {car.plate_number}</p></div><StatusBadge value={car.status} /></div><div className="flex gap-4 text-sm text-slate-600"><span className="flex items-center gap-1"><Users className="h-4 w-4" />{car.seats ?? 5}</span><span className="flex items-center gap-1"><Gauge className="h-4 w-4" />{car.transmission ?? 'Auto'}</span></div><div className="flex items-center justify-between"><strong>{money(car.daily_rate)}<span className="text-sm font-normal text-muted">/day</span></strong><LinkButton href={'/cars/' + car.id} variant="secondary">Details</LinkButton></div></div></Card>; }

function PaymentCell({ rental }: { rental: Rental }) {
  if (!rental.payment) return <StatusBadge value="none" />;
  return <div className="space-y-1"><StatusBadge value={rental.payment.status} /><p className="text-xs capitalize text-muted">{rental.payment.method.replace('_', ' ')}</p></div>;
}

export function RentalTable({ rentals, admin = false }: { rentals: Rental[]; admin?: boolean }) {
  if (rentals.length === 0) return <Card className="p-6 text-sm text-muted">No rentals found.</Card>;

  return <div className="overflow-hidden rounded-lg border border-line bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Rental</th><th className="px-4 py-3">Car</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-line">{rentals.map((r) => <tr key={r.id}><td className="px-4 py-3 font-semibold">#{r.id}</td><td className="px-4 py-3">{r.car ? r.car.brand + ' ' + r.car.model : 'Car #' + r.car_id}</td><td className="px-4 py-3">{shortDate(r.start_date)} - {shortDate(r.end_date)}</td><td className="px-4 py-3">{money(r.total_amount)}</td><td className="px-4 py-3"><PaymentCell rental={r} /></td><td className="px-4 py-3"><StatusBadge value={r.status} /></td><td className="px-4 py-3"><Link className="font-semibold text-brand-600" to={admin ? '/admin/rentals/' + r.id : '/dashboard/rentals/' + r.id}>View</Link></td></tr>)}</tbody></table></div>;
}
