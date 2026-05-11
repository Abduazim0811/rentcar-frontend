import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Timer } from 'lucide-react';
import { SiteHeader } from '../components/layout';
import { Button, Card, Input, LinkButton, Select } from '../components/ui';
import { CarCard, DEFAULT_CAR_IMAGE, StatusBadge } from '../components/domain';
import { cars as fallback } from '../lib/data';
import { checkCarAvailability, createRental, getAvailabilityCalendar, getCar, listCars, listCarsPage } from '../lib/api';
import { currentUser, isAdminRole } from '../lib/auth';
import { money, rentalDays } from '../lib/utils';
import { useAsync } from '../hooks/useAsync';
import type { AvailabilityCalendar, CarAvailability, CarStatus, PaginatedCars } from '../types';

const dayMs = 24 * 60 * 60 * 1000;
function toDateInput(date: Date) { return date.toISOString().slice(0, 10); }
function dateAfter(days: number) { return toDateInput(new Date(Date.now() + days * dayMs)); }
function currentMonth() { return new Date().toISOString().slice(0, 7); }

export function HomePage() {
  const user = currentUser();
  const { data: cars } = useAsync(listCars, fallback);
  const showAdminHint = isAdminRole(user?.role);

  return <><SiteHeader /><main><section className="bg-white"><div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-16"><div className="space-y-6"><h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Rent the right car without the counter drama.</h1><p className="max-w-2xl text-lg text-slate-600">Browse available cars, confirm dates, and manage rentals from a clean dashboard.</p><div className="flex gap-3"><LinkButton href="/cars">Browse cars</LinkButton>{user ? <LinkButton href="/dashboard" variant="secondary">My dashboard</LinkButton> : <LinkButton href="/login" variant="secondary">Login</LinkButton>}</div></div><Card className="grid gap-4 p-5"><Info icon={<Search />} title="Fast search" text="Filter inventory quickly." /><Info icon={<Timer />} title="Date-based rental" text="Pick dates and see totals." />{showAdminHint && <Info icon={<SlidersHorizontal />} title="Admin control" text="Manage fleet and rentals." />}</Card></div></section><section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="mb-6 flex items-center justify-between"><h2 className="text-2xl font-bold">Featured cars</h2><LinkButton href="/cars" variant="secondary">View all</LinkButton></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{cars.slice(0, 3).map((car) => <CarCard key={car.id} car={car} />)}</div></section></main></>;
}

function Info({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="flex items-center gap-3 text-brand-600"><div className="h-5 w-5">{icon}</div><div className="text-ink"><strong>{title}</strong><p className="text-sm text-muted">{text}</p></div></div>; }

export function CarsPage() {
  const [result, setResult] = useState<PaginatedCars>({ items: fallback, total: fallback.length, page: 1, page_size: 9, total_pages: 1 });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | CarStatus>('all');
  const [minRate, setMinRate] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    listCarsPage({
      q: query.trim() || undefined,
      status,
      min_rate: minRate ? Number(minRate) : undefined,
      max_rate: maxRate ? Number(maxRate) : undefined,
      page,
      page_size: 9,
    }).then(setResult).catch((err) => setError(err instanceof Error ? err.message : 'Could not load cars')).finally(() => setLoading(false));
  }, [query, status, minRate, maxRate, page]);

  function resetFilters() { setQuery(''); setStatus('all'); setMinRate(''); setMaxRate(''); setPage(1); }

  return <><SiteHeader /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><h1 className="text-3xl font-bold">Browse cars</h1><p className="mb-6 text-muted">Search inventory and choose an available car.</p><div className="grid gap-6 lg:grid-cols-[280px_1fr]"><Card className="h-fit space-y-4 p-4"><div className="flex items-center gap-2 font-semibold"><SlidersHorizontal className="h-4 w-4" />Filters</div><Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search brand, model or plate" /><Select value={status} onChange={(event) => { setStatus(event.target.value as 'all' | CarStatus); setPage(1); }}><option value="all">All statuses</option><option value="available">Available</option><option value="maintenance">Maintenance</option><option value="inactive">Inactive</option></Select><div className="grid grid-cols-2 gap-2"><Input type="number" min={0} value={minRate} onChange={(event) => { setMinRate(event.target.value); setPage(1); }} placeholder="Min price" /><Input type="number" min={0} value={maxRate} onChange={(event) => { setMaxRate(event.target.value); setPage(1); }} placeholder="Max price" /></div><Button type="button" variant="secondary" className="w-full" onClick={resetFilters}>Reset filters</Button><p className="text-sm text-muted">{loading ? 'Loading cars...' : result.total + ' cars found'}</p>{error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}</Card><div className="space-y-5"><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{result.items.map((car) => <CarCard key={car.id} car={car} />)}{result.items.length === 0 && <Card className="p-6 text-sm text-muted md:col-span-2 xl:col-span-3">No cars match these filters.</Card>}</div><div className="flex items-center justify-between"><Button type="button" variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button><span className="text-sm text-muted">Page {result.page} of {Math.max(result.total_pages, 1)}</span><Button type="button" variant="secondary" disabled={page >= result.total_pages || loading} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div></div></main></>;
}

export function CarDetailPage() {
  const { id = '1' } = useParams();
  const { data: car } = useAsync(() => getCar(Number(id)), fallback[0]);
  const [month, setMonth] = useState(currentMonth());
  const [calendar, setCalendar] = useState<AvailabilityCalendar | null>(null);

  useEffect(() => {
    getAvailabilityCalendar(Number(id), month).then(setCalendar).catch(() => setCalendar(null));
  }, [id, month]);

  return <><SiteHeader /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div className="grid gap-8 lg:grid-cols-[1fr_360px]"><div className="space-y-6"><div className="aspect-[16/9] overflow-hidden rounded-lg bg-slate-200"><img src={car.image ?? DEFAULT_CAR_IMAGE} alt={car.brand} className="h-full w-full object-cover" /></div><Card className="p-5"><h1 className="text-3xl font-bold">{car.brand} {car.model}</h1><p className="mt-2 text-muted">{car.year} model • plate {car.plate_number}</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><strong>{car.seats ?? 5} seats</strong><strong>{car.fuel ?? 'Petrol'}</strong><strong>{car.transmission ?? 'Automatic'}</strong></div></Card><Card className="p-5"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-bold">Availability calendar</h2><Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></div><div className="grid grid-cols-7 gap-2 text-center text-xs">{Array.from({ length: 31 }, (_, index) => { const day = String(index + 1).padStart(2, '0'); const date = month + '-' + day; const blocked = calendar?.blocked_days.includes(date); return <span key={date} className={blocked ? 'rounded-md bg-red-50 px-2 py-2 font-semibold text-red-700' : 'rounded-md bg-green-50 px-2 py-2 text-green-700'}>{index + 1}</span>; })}</div><p className="mt-3 text-xs text-muted">Red days are blocked by approved/requested bookings or maintenance.</p></Card></div><Card className="h-fit p-5"><div className="mb-4 flex items-center justify-between"><strong className="text-2xl">{money(car.daily_rate)}<span className="text-sm font-normal text-muted">/day</span></strong><StatusBadge value={car.status} /></div><p className="mb-5 text-sm text-muted">Booking requests are reviewed by admin before payment.</p><LinkButton href={'/rent/' + car.id} className="w-full">Request booking</LinkButton></Card></div></main></>;
}

export function RentPage() {
  const { carId = '1' } = useParams();
  const nav = useNavigate();
  const { data: car } = useAsync(() => getCar(Number(carId)), fallback[0]);
  const minDate = toDateInput(new Date());
  const [start, setStartValue] = useState(dateAfter(1));
  const [end, setEndValue] = useState(dateAfter(3));
  const [availability, setAvailability] = useState<CarAvailability | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fallbackDays = rentalDays(start, end);
  const days = availability?.days ?? fallbackDays;
  const total = availability?.total_amount ?? days * car.daily_rate;

  function setStart(value: string) { setStartValue(value); if (end && value && new Date(end) < new Date(value)) setEndValue(value); setAvailability(null); setError(''); setSuccess(''); }
  function setEnd(value: string) { setEndValue(value); setAvailability(null); setError(''); setSuccess(''); }

  async function checkAvailability() {
    setChecking(true);
    setError('');
    setSuccess('');
    try {
      const result = await checkCarAvailability(car.id, start, end);
      setAvailability(result);
      if (!result.available) setError(result.reason ?? 'This car is not available for selected dates.');
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not check availability';
      setError(message);
      return null;
    } finally {
      setChecking(false);
    }
  }

  async function confirm() {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const result = availability ?? await checkAvailability();
      if (!result?.available) return;
      await createRental({ car_id: car.id, start_date: start, end_date: end });
      setSuccess('Booking request created. Admin approval is required before payment.');
      setTimeout(() => nav('/dashboard/rentals'), 700);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create booking');
    } finally {
      setSubmitting(false);
    }
  }

  const cannotRent = car.status === 'maintenance' || car.status === 'inactive';
  const canConfirm = !cannotRent && Boolean(start && end) && !checking && !submitting;

  return <><SiteHeader /><main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_400px] lg:px-8"><div><h1 className="text-3xl font-bold">Request this car</h1><p className="mt-2 text-muted">Choose dates, check availability, then send the request to admin.</p><Card className="mt-6 overflow-hidden"><div className="aspect-[16/9] bg-slate-200"><img src={car.image ?? DEFAULT_CAR_IMAGE} alt={car.brand + ' ' + car.model} className="h-full w-full object-cover" /></div><div className="p-5"><h2 className="text-xl font-bold">{car.brand} {car.model}</h2><p className="text-muted">{car.year} • {car.plate_number}</p><div className="mt-4 flex items-center justify-between"><StatusBadge value={car.status} /><strong>{money(car.daily_rate)} / day</strong></div></div></Card></div><Card className="p-5"><div className="space-y-4"><label className="text-sm font-semibold">Pickup date<Input type="date" min={minDate} value={start} onChange={(e) => setStart(e.target.value)} /></label><label className="text-sm font-semibold">Return date<Input type="date" min={start || minDate} value={end} onChange={(e) => setEnd(e.target.value)} /></label><Button type="button" variant="secondary" className="w-full" onClick={checkAvailability} disabled={checking || cannotRent}>{checking ? 'Checking...' : 'Check availability'}</Button>{cannotRent && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">This car is not rent-ready right now.</p>}{availability && <p className={availability.available ? 'rounded-md bg-green-50 px-3 py-2 text-sm text-green-700' : 'rounded-md bg-red-50 px-3 py-2 text-sm text-red-700'}>{availability.available ? 'Available for selected dates.' : availability.reason}</p>}<div className="rounded-md bg-slate-50 p-4 text-sm"><div className="flex justify-between"><span>Daily price</span><strong>{money(car.daily_rate)}</strong></div><div className="mt-2 flex justify-between"><span>Duration</span><strong>{days} days</strong></div><div className="mt-2 border-t border-line pt-2 flex justify-between text-base"><span>Total</span><strong>{money(total)}</strong></div></div><p className="text-xs text-muted">After admin approval, open rental details to create the payment request.</p>{error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}{success && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>}<Button className="w-full" onClick={confirm} disabled={!canConfirm}>{submitting ? 'Creating request...' : availability?.available ? 'Send booking request' : 'Check dates and request'}</Button></div></Card></main></>;
}
