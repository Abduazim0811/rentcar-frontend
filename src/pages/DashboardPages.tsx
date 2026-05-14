import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SiteHeader } from '../components/layout';
import { Button, Card, Input, LinkButton, Select } from '../components/ui';
import { CarIdentity, RentalTable, StatusBadge } from '../components/domain';
import { cancelRental, createPayment, getInvoice, getProfile, getRental, listCars, listNotifications, logoutSession, markNotificationRead, myRentals, updateProfile } from '../lib/api';
import { currentUser, logout, saveUser } from '../lib/auth';
import { NOTIFICATIONS_CHANGED_EVENT } from '../lib/events';
import { money, shortDate } from '../lib/utils';
import { useAsync } from '../hooks/useAsync';
import type { Car, Invoice, Notification, PaymentMethod, Rental } from '../types';
import { CalendarDays, Mail, Phone, ShieldCheck, UserCircle } from 'lucide-react';

export function DashboardPage() { const { data: rentals } = useAsync(myRentals, [] as Rental[]); const { data: cars } = useAsync(listCars, [] as Car[]); return <><SiteHeader /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div className="mb-6 flex items-center justify-between"><div><h1 className="text-3xl font-bold">User dashboard</h1><p className="text-muted">Track active rentals, payment status, and find your next car.</p></div><LinkButton href="/cars">Browse cars</LinkButton></div><div className="mb-6 grid gap-4 md:grid-cols-4"><Card className="p-5"><p className="text-sm text-muted">Active rentals</p><strong className="text-3xl">{rentals.filter((r) => r.status === 'confirmed').length}</strong></Card><Card className="p-5"><p className="text-sm text-muted">Pending payments</p><strong className="text-3xl">{rentals.filter((r) => r.payment?.status === 'pending').length}</strong></Card><Card className="p-5"><p className="text-sm text-muted">Total rentals</p><strong className="text-3xl">{rentals.length}</strong></Card><Card className="p-5"><p className="text-sm text-muted">Available cars</p><strong className="text-3xl">{cars.filter((c) => c.status === 'available').length}</strong></Card></div><RentalTable rentals={rentals} /></main></>; }
export function MyRentalsPage() { const { data: rentals } = useAsync(myRentals, [] as Rental[]); return <><SiteHeader /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><h1 className="mb-2 text-3xl font-bold">My rentals</h1><p className="mb-6 text-muted">All rentals with booking and payment status.</p><RentalTable rentals={rentals} /></main></>; }
export function RentalDetailPage() {
  const { id = '0' } = useParams();
  const [rental, setRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getRental(Number(id)).then(setRental).catch((err) => setError(err instanceof Error ? err.message : 'Could not load rental')).finally(() => setLoading(false));
  }, [id]);

  async function cancel() {
    if (!rental || !window.confirm('Cancel this rental?')) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await cancelRental(rental.id);
      setRental({ ...rental, status: 'cancelled' });
      setMessage('Rental cancelled.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel rental');
    } finally {
      setSaving(false);
    }
  }

  if (!rental) return <><SiteHeader /><main className="mx-auto max-w-4xl px-4 py-8"><Card className="p-6 text-sm text-muted">{loading ? 'Loading rental...' : error || 'Rental not found.'}</Card></main></>;

  const hasOpenPayment = rental.payment?.status === 'pending' || rental.payment?.status === 'paid';
  const canCancel = (rental.status === 'requested' || rental.status === 'approved') && !hasOpenPayment;
  const canCreatePayment = rental.status === 'approved' && !rental.payment;

  async function pay() {
    if (!rental) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payment = await createPayment({ rental_id: rental.id, method: paymentMethod });
      setRental({ ...rental, status: 'pending_payment', payment });
      setMessage('Payment request created. Admin confirmation is pending.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create payment');
    } finally {
      setSaving(false);
    }
  }

  async function loadInvoice() {
    if (!rental) return;
    setError('');
    try {
      setInvoice(await getInvoice(rental.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load invoice');
    }
  }

  return <><SiteHeader /><main className="mx-auto max-w-4xl px-4 py-8"><Card className="p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Rental #{rental.id}</h1>{loading && <p className="text-sm text-muted">Refreshing rental details...</p>}</div><StatusBadge value={rental.status} /></div>{error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}{message && <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}<div className="mt-6 grid gap-4 md:grid-cols-2"><div><span className="block text-sm text-muted">Car</span><CarIdentity car={rental.car} carId={rental.car_id} /></div><p><span className="block text-sm text-muted">Total</span><strong>{money(rental.total_amount)}</strong></p><p><span className="block text-sm text-muted">Pickup</span><strong>{shortDate(rental.start_date)}</strong></p><p><span className="block text-sm text-muted">Return</span><strong>{shortDate(rental.end_date)}</strong></p><p><span className="block text-sm text-muted">Payment</span><strong>{rental.payment ? rental.payment.status.replace('_', ' ') : 'Payment not started'}</strong></p></div>{canCreatePayment && <div className="mt-6 rounded-md border border-line bg-slate-50 p-4"><label className="text-sm font-semibold">Payment method<Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option></Select></label><Button className="mt-3" type="button" disabled={saving} onClick={pay}>{saving ? 'Creating...' : 'Create payment request'}</Button></div>}{invoice && <div className="mt-6 rounded-md border border-line p-4"><p className="text-sm text-muted">Invoice</p><strong>{invoice.invoice_number}</strong><div className="mt-2 flex flex-wrap gap-4 text-sm"><span>{money(invoice.amount)}</span><StatusBadge value={invoice.status} /><span>{shortDate(invoice.issued_at)}</span></div></div>}<div className="mt-6 flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={loadInvoice}>Load invoice</Button><Button type="button" variant="secondary" onClick={() => window.print()}>Print receipt</Button>{canCancel && <Button type="button" variant="danger" disabled={saving} onClick={cancel}>{saving ? 'Cancelling...' : 'Cancel rental'}</Button>}</div></Card></main></>;
}

export function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    listNotifications().then(setItems).catch((err) => setError(err instanceof Error ? err.message : 'Could not load notifications'));
  }, []);

  async function markRead(item: Notification) {
    await markNotificationRead(item.id).catch(() => undefined);
    setItems((current) => current.map((next) => next.id === item.id ? { ...next, read_at: new Date().toISOString() } : next));
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
  }

  return <><SiteHeader /><main className="mx-auto max-w-4xl px-4 py-8"><h1 className="text-3xl font-bold">Notifications</h1><p className="mb-6 text-muted">Booking, payment and admin updates.</p>{error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<div className="space-y-3">{items.map((item) => <Card key={item.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{item.title}</h2><p className="text-sm text-muted">{item.message}</p><p className="mt-2 text-xs text-muted">{shortDate(item.created_at)}</p></div>{!item.read_at && <Button type="button" variant="secondary" onClick={() => markRead(item)}>Mark read</Button>}</div></Card>)}{items.length === 0 && <Card className="p-6 text-sm text-muted">No notifications yet.</Card>}</div></main></>;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const storedUser = currentUser();
  const [profile, setProfile] = useState(storedUser);
  const [name, setName] = useState(storedUser?.name ?? '');
  const [email, setEmail] = useState(storedUser?.email ?? '');
  const [phone, setPhone] = useState(storedUser?.phone ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile().then((user) => {
      saveUser(user);
      setProfile(user);
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone ?? '');
    }).catch(() => undefined);
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const user = await updateProfile({ name, email, phone });
      saveUser(user);
      setProfile(user);
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update profile');
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await logoutSession().catch(() => undefined);
    logout();
    navigate('/login');
  }

  const initials = (profile?.name || 'User').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return <><SiteHeader /><main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8"><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Profile settings</h1><p className="text-muted">Keep your contact details ready for rental approvals and handover calls.</p></div><Button type="button" variant="secondary" onClick={signOut}>Logout</Button></div><div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]"><Card className="p-5"><div className="flex items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white">{initials}</div><div className="min-w-0"><h2 className="truncate text-xl font-bold">{profile?.name ?? 'User'}</h2><p className="text-sm capitalize text-muted">{(profile?.role ?? 'customer').replace('_', ' ')}</p></div></div><div className="mt-6 space-y-4 text-sm"><div className="flex gap-3"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /><div className="min-w-0"><p className="font-semibold">Email</p><p className="break-all text-muted">{profile?.email ?? email}</p></div></div><div className="flex gap-3"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /><div><p className="font-semibold">Phone</p><p className="text-muted">{profile?.phone || 'Not provided'}</p></div></div><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /><div><p className="font-semibold">Email status</p><p className="text-muted">{profile?.email_verified_at ? 'Verified' : 'Pending verification'}</p></div></div><div className="flex gap-3"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /><div><p className="font-semibold">Account</p><p className="text-muted">Ready for bookings and notifications</p></div></div></div></Card><Card className="p-5"><div className="mb-5 flex items-center gap-3"><UserCircle className="h-5 w-5 text-brand-600" /><div><h2 className="font-bold">Contact information</h2><p className="text-sm text-muted">Admins use this phone number when confirming rentals.</p></div></div><form onSubmit={save} className="grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold">Full name<Input value={name} onChange={(event) => setName(event.target.value)} required /></label><label className="text-sm font-semibold">Phone number<Input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" placeholder="+998 90 123 45 67" /></label><label className="text-sm font-semibold md:col-span-2">Email<Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required /></label>{message && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 md:col-span-2">{message}</p>}{error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{error}</p>}<div className="flex flex-wrap gap-2 md:col-span-2"><Button disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button><Button type="button" variant="secondary" onClick={() => { setName(profile?.name ?? ''); setEmail(profile?.email ?? ''); setPhone(profile?.phone ?? ''); }}>Reset</Button></div></form></Card></div></main></>;
}
