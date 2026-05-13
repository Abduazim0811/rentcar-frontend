import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AdminShell } from '../components/layout';
import { Button, Card, Input, LinkButton, Select } from '../components/ui';
import { RentalTable, StatusBadge } from '../components/domain';
import { approveRental, confirmPayment, createCar, createMaintenance, deleteCar, deleteMaintenance, failPayment, getCar, getRental, getReportSummary, listAdminRentals, listAdminRentalsPage, listAuditLogs, listCars, listMaintenance, listUsersPage, refundPayment, rejectRental, updateCar, updateMaintenance, updateRentalStatus, updateUserRole, uploadCarImage } from '../lib/api';
import { cars as fallbackCars, rentals as fallbackRentals, admin, superAdmin, user } from '../lib/data';
import { money, shortDate } from '../lib/utils';
import { useAsync } from '../hooks/useAsync';
import { currentUser } from '../lib/auth';
import type { AuditLog, Maintenance, MaintenanceStatus, PaginatedAuditLogs, PaginatedMaintenance, PaginatedRentals, PaginatedUsers, PaymentStatus, Rental, RentalStatus, ReportSummary, User, UserRole, Car, CarStatus } from '../types';

const rentalStatusOptions: RentalStatus[] = ['requested', 'approved', 'rejected', 'pending_payment', 'confirmed', 'active', 'cancelled', 'completed'];
const paymentStatusOptions: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded'];
const carStatusOptions: CarStatus[] = ['available', 'maintenance', 'inactive'];
const userRoleOptions: UserRole[] = ['customer', 'admin', 'super_admin'];
const maintenanceStatusOptions: MaintenanceStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled'];

type CarFormState = {
  brand: string;
  model: string;
  year: string;
  plate_number: string;
  daily_rate: string;
  status: CarStatus;
  image: string;
};

const emptyCarForm: CarFormState = {
  brand: '',
  model: '',
  year: '2024',
  plate_number: '',
  daily_rate: '50',
  status: 'available',
  image: '', 
};

function toCarForm(car: Car): CarFormState {
  return {
    brand: car.brand,
    model: car.model,
    year: String(car.year),
    plate_number: car.plate_number,
    daily_rate: String(car.daily_rate),
    status: car.status,
    image: car.image ?? '', 
  };
}

export function AdminDashboard() {
  const { data: cars } = useAsync(listCars, fallbackCars);
  const { data: rentals } = useAsync(listAdminRentals, fallbackRentals);

  return <AdminShell>
    <div className="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold">Admin dashboard</h1>
        <p className="text-muted">Manage fleet availability and rental activity.</p>
      </div>
      <LinkButton href="/admin/cars/new">Add car</LinkButton>
    </div>
    <div className="mb-6 grid gap-4 md:grid-cols-4">
      <Card className="p-5"><p className="text-sm text-muted">Total cars</p><strong className="text-3xl">{cars.length}</strong></Card>
      <Card className="p-5"><p className="text-sm text-muted">Available</p><strong className="text-3xl">{cars.filter((c) => c.status === 'available').length}</strong></Card>
      <Card className="p-5"><p className="text-sm text-muted">Rentals</p><strong className="text-3xl">{rentals.length}</strong></Card>
      <Card className="p-5"><p className="text-sm text-muted">Pending</p><strong className="text-3xl">{rentals.filter((r) => r.status === 'pending_payment').length}</strong></Card>
    </div>
    <RentalTable rentals={rentals.slice(0, 5)} admin />
  </AdminShell>;
}

export function AdminCarsPage() {
  const [cars, setCars] = useState<Car[]>(fallbackCars);
  const [error, setError] = useState('');

  useEffect(() => { listCars().then(setCars).catch((err) => setError(err instanceof Error ? err.message : 'Could not load cars')); }, []);

  async function remove(id: number) {
    if (!window.confirm('Delete this car?')) return;
    try {
      await deleteCar(id);
      setCars((items) => items.filter((car) => car.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete car');
    }
  }

  return <AdminShell>
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 className="text-3xl font-bold">Manage cars</h1>
      <LinkButton href="/admin/cars/new">Add car</LinkButton>
    </div>
    {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr><th className="px-4 py-3">Car</th><th className="px-4 py-3">Plate</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {cars.map((car) => <tr key={car.id}>
            <td className="px-4 py-3 font-semibold">{car.brand} {car.model}</td>
            <td className="px-4 py-3">{car.plate_number}</td>
            <td className="px-4 py-3">{money(car.daily_rate)}</td>
            <td className="px-4 py-3"><StatusBadge value={car.status} /></td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-2">
                <Link className="font-semibold text-brand-600" to={'/admin/cars/' + car.id + '/edit'}>Edit</Link>
                <button className="font-semibold text-red-700" type="button" onClick={() => remove(car.id)}>Delete</button>
              </div>
            </td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </AdminShell>;
}

function CarForm({ mode }: { mode: 'new' | 'edit' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<CarFormState>(emptyCarForm);
  const [loading, setLoading] = useState(mode === 'edit');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    setLoading(true);
    getCar(Number(id)).then((car) => setForm(toCarForm(car))).catch((err) => setError(err instanceof Error ? err.message : 'Could not load car')).finally(() => setLoading(false));
  }, [id, mode]);

  function update<K extends keyof CarFormState>(key: K, value: CarFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const uploaded = await uploadCarImage(file);
      update('image', uploaded.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload image');
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const payload = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: Number(form.year),
      plate_number: form.plate_number.trim(),
      daily_rate: Number(form.daily_rate),
      status: form.status,
      image: form.image.trim(),
    };

    try {
      if (mode === 'edit' && id) await updateCar(Number(id), payload);
      else await createCar(payload);
      navigate('/admin/cars');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save car');
    }
  }

  return <Card className="p-5">
    {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <label className="text-sm font-semibold">Brand<Input value={form.brand} onChange={(e) => update('brand', e.target.value)} placeholder="Toyota" required disabled={loading} /></label>
      <label className="text-sm font-semibold">Model<Input value={form.model} onChange={(e) => update('model', e.target.value)} placeholder="Camry" required disabled={loading} /></label>
      <label className="text-sm font-semibold">Year<Input type="number" min={1900} value={form.year} onChange={(e) => update('year', e.target.value)} required disabled={loading} /></label>
      <label className="text-sm font-semibold">Plate number<Input value={form.plate_number} onChange={(e) => update('plate_number', e.target.value.toUpperCase())} placeholder="01A777AA" required disabled={loading} /></label>
      <label className="text-sm font-semibold">Daily rate<Input type="number" min={1} step="0.01" value={form.daily_rate} onChange={(e) => update('daily_rate', e.target.value)} required disabled={loading} /></label>
      <label className="text-sm font-semibold">Status<Select value={form.status} onChange={(e) => update('status', e.target.value as CarStatus)} disabled={loading}>{carStatusOptions.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</Select></label>
      <label className="text-sm font-semibold md:col-span-2">Car image<Input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => uploadImage(e.target.files?.[0])} disabled={loading || uploading} /><span className="mt-1 block text-xs font-normal text-muted">{uploading ? 'Uploading image...' : 'JPG, PNG, WebP or GIF, max 5 MB'}</span></label>
      <label className="text-sm font-semibold md:col-span-2">Image URL<Input value={form.image} onChange={(e) => update('image', e.target.value)} placeholder="Upload an image or paste URL" disabled={loading || uploading} /></label>
      {form.image && <div className="md:col-span-2 overflow-hidden rounded-lg border border-line bg-slate-100"><img src={form.image} alt="Car preview" className="h-56 w-full object-cover" /></div>}
      <div className="flex justify-end gap-2 md:col-span-2">
        <Button type="button" variant="secondary" onClick={() => navigate('/admin/cars')}>Cancel</Button>
        <Button type="submit" disabled={loading || uploading}>{uploading ? 'Uploading...' : mode === 'edit' ? 'Save changes' : 'Save car'}</Button>
      </div>
    </form>
  </Card>;
}

export function NewCarPage() { return <AdminShell><h1 className="mb-6 text-3xl font-bold">Add car</h1><CarForm mode="new" /></AdminShell>; }
export function EditCarPage() { return <AdminShell><h1 className="mb-6 text-3xl font-bold">Edit car</h1><CarForm mode="edit" /></AdminShell>; }

export function AdminRentalsPage() {
  const [result, setResult] = useState<PaginatedRentals>({ items: fallbackRentals, total: fallbackRentals.length, page: 1, page_size: 10, total_pages: 1 });
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [status, setStatusFilter] = useState<'all' | RentalStatus>('all');
  const [paymentStatus, setPaymentStatus] = useState<'all' | PaymentStatus>('all');
  const [userId, setUserId] = useState('');
  const [carId, setCarId] = useState('');
  const [startFrom, setStartFrom] = useState('');
  const [endTo, setEndTo] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    listAdminRentalsPage({
      status,
      payment_status: paymentStatus,
      user_id: userId ? Number(userId) : undefined,
      car_id: carId ? Number(carId) : undefined,
      start_from: startFrom || undefined,
      end_to: endTo || undefined,
      page,
      page_size: 10,
    }).then(setResult).catch((err) => setError(err instanceof Error ? err.message : 'Could not load rentals')).finally(() => setLoading(false));
  }, [status, paymentStatus, userId, carId, startFrom, endTo, page]);

  function resetFilters() {
    setStatusFilter('all');
    setPaymentStatus('all');
    setUserId('');
    setCarId('');
    setStartFrom('');
    setEndTo('');
    setPage(1);
  }

  async function changeStatus(rental: Rental, status: RentalStatus) {
    setSavingId(rental.id);
    setError('');
    try {
      await updateRentalStatus(rental.id, status);
      setResult((current) => ({ ...current, items: current.items.map((item) => item.id === rental.id ? { ...item, status } : item) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update rental');
    } finally {
      setSavingId(null);
    }
  }

  async function settlePayment(rental: Rental, action: 'confirm' | 'fail' | 'refund') {
    if (!rental.payment) {
      setError('This rental does not have a payment request yet.');
      return;
    }
    setSavingId(rental.id);
    setError('');
    try {
      if (action === 'confirm') await confirmPayment(rental.payment.id);
      else if (action === 'fail') await failPayment(rental.payment.id);
      else await refundPayment(rental.payment.id);
      setResult((current) => ({ ...current, items: current.items.map((item) => item.id === rental.id ? {
        ...item,
        status: action === 'confirm' ? 'confirmed' : 'cancelled',
        payment: item.payment ? { ...item.payment, status: action === 'confirm' ? 'paid' : action === 'refund' ? 'refunded' : 'failed', paid_at: action === 'confirm' ? new Date().toISOString() : item.payment.paid_at } : item.payment,
      } : item) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update payment');
    } finally {
      setSavingId(null);
    }
  }

  async function reviewRental(rental: Rental, action: 'approve' | 'reject') {
    setSavingId(rental.id);
    setError('');
    try {
      const updated = action === 'approve' ? await approveRental(rental.id) : await rejectRental(rental.id);
      setResult((current) => ({ ...current, items: current.items.map((item) => item.id === rental.id ? { ...item, status: updated.status } : item) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not review rental');
    } finally {
      setSavingId(null);
    }
  }

  return <AdminShell>
    <h1 className="mb-2 text-3xl font-bold">Manage rentals</h1>
    <p className="mb-6 text-muted">Review rentals, payment status, and booking status.</p>
    <Card className="mb-4 grid gap-3 p-4 md:grid-cols-6">
      <Select value={status} onChange={(e) => { setStatusFilter(e.target.value as 'all' | RentalStatus); setPage(1); }}><option value="all">All rental statuses</option>{rentalStatusOptions.map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}</Select>
      <Select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value as 'all' | PaymentStatus); setPage(1); }}><option value="all">All payment statuses</option>{paymentStatusOptions.map((value) => <option key={value} value={value}>{value}</option>)}</Select>
      <Input value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1); }} type="number" min={1} placeholder="User ID" />
      <Input value={carId} onChange={(e) => { setCarId(e.target.value); setPage(1); }} type="number" min={1} placeholder="Car ID" />
      <Input value={startFrom} onChange={(e) => { setStartFrom(e.target.value); setPage(1); }} type="date" />
      <Input value={endTo} onChange={(e) => { setEndTo(e.target.value); setPage(1); }} type="date" />
      <div className="flex items-center justify-between gap-2 md:col-span-6"><p className="text-sm text-muted">{loading ? 'Loading rentals...' : result.total + ' rentals found'}</p><Button type="button" variant="secondary" onClick={resetFilters}>Reset filters</Button></div>
    </Card>
    {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr><th className="px-4 py-3">Rental</th><th className="px-4 py-3">Car</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {result.items.map((rental) => <tr key={rental.id}>
            <td className="px-4 py-3 font-semibold">#{rental.id}</td>
            <td className="px-4 py-3">{rental.car ? rental.car.brand + ' ' + rental.car.model : 'Car #' + rental.car_id}</td>
            <td className="px-4 py-3">{shortDate(rental.start_date)} - {shortDate(rental.end_date)}</td>
            <td className="px-4 py-3">{money(rental.total_amount)}</td>
            <td className="px-4 py-3">{rental.payment ? <div className="space-y-1"><StatusBadge value={rental.payment.status} /><p className="text-xs capitalize text-muted">{rental.payment.method.replace('_', ' ')}</p></div> : <StatusBadge value="none" />}</td>
            <td className="px-4 py-3"><Select value={rental.status} onChange={(e) => changeStatus(rental, e.target.value as RentalStatus)} disabled={savingId === rental.id}>{rentalStatusOptions.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</Select></td>
            <td className="px-4 py-3"><div className="flex flex-wrap items-center gap-2"><Link className="font-semibold text-brand-600" to={'/admin/rentals/' + rental.id}>View</Link>{rental.status === 'requested' && <><button className="font-semibold text-green-700 disabled:text-slate-400" type="button" disabled={savingId === rental.id} onClick={() => reviewRental(rental, 'approve')}>Approve</button><button className="font-semibold text-red-700 disabled:text-slate-400" type="button" disabled={savingId === rental.id} onClick={() => reviewRental(rental, 'reject')}>Reject</button></>}{rental.payment?.status === 'pending' && <><button className="font-semibold text-green-700 disabled:text-slate-400" type="button" disabled={savingId === rental.id} onClick={() => settlePayment(rental, 'confirm')}>Confirm</button><button className="font-semibold text-red-700 disabled:text-slate-400" type="button" disabled={savingId === rental.id} onClick={() => settlePayment(rental, 'fail')}>Fail</button></>}{rental.payment?.status === 'paid' && <button className="font-semibold text-blue-700 disabled:text-slate-400" type="button" disabled={savingId === rental.id} onClick={() => settlePayment(rental, 'refund')}>Refund</button>}</div></td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <div className="mt-4 flex items-center justify-between"><Button type="button" variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button><span className="text-sm text-muted">Page {result.page} of {Math.max(result.total_pages, 1)}</span><Button type="button" variant="secondary" disabled={page >= result.total_pages || loading} onClick={() => setPage((value) => value + 1)}>Next</Button></div>
  </AdminShell>;
}

export function AdminRentalDetailPage() {
  const { id = '0' } = useParams();
  const [rental, setRental] = useState<Rental | null>(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getRental(Number(id)).then(setRental).catch((err) => setError(err instanceof Error ? err.message : 'Could not load rental'));
  }, [id]);

  const actions = useMemo(() => rentalStatusOptions.filter((status) => status !== rental?.status), [rental]);

  async function setStatus(status: RentalStatus) {
    if (!rental) return;
    try {
      await updateRentalStatus(rental.id, status);
      setRental({ ...rental, status });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update rental');
    }
  }

  async function review(action: 'approve' | 'reject') {
    if (!rental) return;
    setError('');
    try {
      const updated = action === 'approve' ? await approveRental(rental.id) : await rejectRental(rental.id);
      setRental({ ...rental, status: updated.status });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not review rental');
    }
  }

  async function settlePayment(action: 'confirm' | 'fail' | 'refund') {
    if (!rental?.payment) {
      setError('This rental does not have a payment request yet.');
      return;
    }
    setSavingPayment(true);
    setError('');
    try {
      if (action === 'confirm') await confirmPayment(rental.payment.id);
      else if (action === 'fail') await failPayment(rental.payment.id);
      else await refundPayment(rental.payment.id);
      setRental({
        ...rental,
        status: action === 'confirm' ? 'confirmed' : 'cancelled',
        payment: { ...rental.payment, status: action === 'confirm' ? 'paid' : action === 'refund' ? 'refunded' : 'failed', paid_at: action === 'confirm' ? new Date().toISOString() : rental.payment.paid_at },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update payment');
    } finally {
      setSavingPayment(false);
    }
  }

  if (!rental) return <AdminShell><Card className="p-6"><p className="text-muted">{error || 'Rental not found.'}</p><Button className="mt-4" type="button" variant="secondary" onClick={() => navigate('/admin/rentals')}>Back to rentals</Button></Card></AdminShell>;

  return <AdminShell>
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Rental review #{rental.id}</h1>
        <StatusBadge value={rental.status} />
      </div>
      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <strong>User #{rental.user_id}</strong>
        <strong>{rental.car ? rental.car.brand + ' ' + rental.car.model : 'Car #' + rental.car_id}</strong>
        <strong>{shortDate(rental.start_date)} - {shortDate(rental.end_date)}</strong>
        <strong>{money(rental.total_amount)}</strong>
      </div>
      <div className="mt-6 rounded-md border border-line bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Payment</p>
            {rental.payment ? <div className="mt-2 flex flex-wrap items-center gap-3"><StatusBadge value={rental.payment.status} /><span className="text-sm capitalize text-muted">{rental.payment.method.replace('_', ' ')}</span><strong>{money(rental.payment.amount)}</strong></div> : <p className="mt-1 text-sm text-muted">No payment request yet.</p>}
          </div>
          {rental.payment?.status === 'pending' && <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={savingPayment} onClick={() => settlePayment('confirm')}>{savingPayment ? 'Saving...' : 'Confirm payment'}</Button><Button type="button" variant="danger" disabled={savingPayment} onClick={() => settlePayment('fail')}>Reject payment</Button></div>}
          {rental.payment?.status === 'paid' && <Button type="button" variant="secondary" disabled={savingPayment} onClick={() => settlePayment('refund')}>{savingPayment ? 'Saving...' : 'Refund payment'}</Button>}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {rental.status === 'requested' && <><Button type="button" variant="secondary" onClick={() => review('approve')}>Approve request</Button><Button type="button" variant="danger" onClick={() => review('reject')}>Reject request</Button></>}
        {actions.map((status) => <Button key={status} type="button" variant={status === 'cancelled' ? 'danger' : 'secondary'} onClick={() => setStatus(status)}>{status.replace('_', ' ')}</Button>)}
      </div>
    </Card>
  </AdminShell>;
}

export function AdminUsersPage() {
  const viewer = currentUser();
  const canManageRoles = viewer?.role === 'super_admin';
  const [result, setResult] = useState<PaginatedUsers>({ items: [superAdmin, admin, user], total: 3, page: 1, page_size: 10, total_pages: 1 });
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<'all' | UserRole>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    listUsersPage({
      q: query.trim() || undefined,
      role,
      page,
      page_size: 10,
    }).then(setResult).catch((err) => setError(err instanceof Error ? err.message : 'Only super admin can manage users')).finally(() => setLoading(false));
  }, [query, role, page]);

  function resetFilters() {
    setQuery('');
    setRole('all');
    setPage(1);
  }

  async function changeRole(target: User, role: UserRole) {
    if (!canManageRoles) return;
    setSavingId(target.id);
    setError('');
    try {
      await updateUserRole(target.id, role);
      setResult((current) => ({ ...current, items: current.items.map((item) => item.id === target.id ? { ...item, role } : item) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update role');
    } finally {
      setSavingId(null);
    }
  }

  return <AdminShell>
    <div className="mb-6">
      <h1 className="text-3xl font-bold">Manage users</h1>
      <p className="text-muted">Review customer contact details and account access.</p>
    </div>
    <Card className="mb-4 grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
      <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search name, email or phone" />
      <Select value={role} onChange={(e) => { setRole(e.target.value as 'all' | UserRole); setPage(1); }}>
        <option value="all">All roles</option>
        {userRoleOptions.map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}
      </Select>
      <Button type="button" variant="secondary" onClick={resetFilters}>Reset</Button>
      <p className="text-sm text-muted md:col-span-3">{loading ? 'Loading users...' : result.total + ' users found'}</p>
    </Card>
    {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Access</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {result.items.map((u) => <tr key={u.id}>
            <td className="px-4 py-3 font-semibold">{u.name}</td>
            <td className="px-4 py-3"><div className="space-y-1"><p className="break-all">{u.email}</p><p className="text-xs text-muted">{u.phone || 'No phone number'}</p></div></td>
            <td className="px-4 py-3"><Select value={u.role} onChange={(e) => changeRole(u, e.target.value as UserRole)} disabled={!canManageRoles || savingId === u.id}>{userRoleOptions.map((role) => <option key={role} value={role}>{role.replace('_', ' ')}</option>)}</Select></td>
            <td className="px-4 py-3"><StatusBadge value={u.role === 'customer' ? 'inactive' : 'available'} /></td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <div className="mt-4 flex items-center justify-between">
      <Button type="button" variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
      <span className="text-sm text-muted">Page {result.page} of {Math.max(result.total_pages, 1)}</span>
      <Button type="button" variant="secondary" disabled={page >= result.total_pages || loading} onClick={() => setPage((value) => value + 1)}>Next</Button>
    </div>
  </AdminShell>;
}

export function AdminReportsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getReportSummary().then(setSummary).catch((err) => setError(err instanceof Error ? err.message : 'Could not load report'));
  }, []);

  async function load() {
    setError('');
    try {
      setSummary(await getReportSummary(startDate || undefined, endDate || undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load report');
    }
  }

  return <AdminShell><div className="mb-6"><h1 className="text-3xl font-bold">Reports</h1><p className="text-muted">Revenue, rental activity, and top cars.</p></div><Card className="mb-4 grid gap-3 p-4 md:grid-cols-[180px_180px_auto]"><Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /><Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /><Button type="button" onClick={load}>Apply</Button></Card>{error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}{summary && <><div className="mb-6 grid gap-4 md:grid-cols-4"><Card className="p-5"><p className="text-sm text-muted">Revenue</p><strong className="text-3xl">{money(summary.revenue)}</strong></Card><Card className="p-5"><p className="text-sm text-muted">Rentals</p><strong className="text-3xl">{summary.total_rentals}</strong></Card><Card className="p-5"><p className="text-sm text-muted">Active</p><strong className="text-3xl">{summary.active_rentals}</strong></Card><Card className="p-5"><p className="text-sm text-muted">Pending payments</p><strong className="text-3xl">{summary.pending_payments}</strong></Card></div><Card className="p-5"><h2 className="mb-4 font-bold">Top cars</h2><div className="space-y-3">{summary.top_cars.map((car) => <div key={car.car_id} className="flex items-center justify-between border-b border-line pb-2 text-sm"><span>{car.label}</span><strong>{car.rental_count} rentals - {money(car.revenue)}</strong></div>)}{summary.top_cars.length === 0 && <p className="text-sm text-muted">No data for this period.</p>}</div></Card></>}</AdminShell>;
}

export function AdminMaintenancePage() {
  const [result, setResult] = useState<PaginatedMaintenance>({ items: [], total: 0, page: 1, page_size: 10, total_pages: 1 });
  const [form, setForm] = useState({ car_id: '', start_date: '', end_date: '', reason: '', status: 'scheduled' as MaintenanceStatus, notes: '' });
  const [editing, setEditing] = useState<Maintenance | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      setResult(await listMaintenance({ page_size: 50 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load maintenance');
    }
  }

  useEffect(() => { load(); }, []);

  function edit(item: Maintenance) {
    setEditing(item);
    setForm({ car_id: String(item.car_id), start_date: String(item.start_date).slice(0, 10), end_date: String(item.end_date).slice(0, 10), reason: item.reason, status: item.status, notes: item.notes });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const payload = { car_id: Number(form.car_id), start_date: form.start_date, end_date: form.end_date, reason: form.reason, status: form.status, notes: form.notes };
    try {
      if (editing) await updateMaintenance(editing.id, payload);
      else await createMaintenance(payload);
      setEditing(null);
      setForm({ car_id: '', start_date: '', end_date: '', reason: '', status: 'scheduled', notes: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save maintenance');
    }
  }

  async function remove(id: number) {
    if (!window.confirm('Delete maintenance record?')) return;
    await deleteMaintenance(id).catch((err) => setError(err instanceof Error ? err.message : 'Could not delete maintenance'));
    await load();
  }

  return <AdminShell><h1 className="mb-2 text-3xl font-bold">Maintenance</h1><p className="mb-6 text-muted">Schedule maintenance windows and block availability.</p>{error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<Card className="mb-6 p-5"><form onSubmit={submit} className="grid gap-3 md:grid-cols-3"><Input value={form.car_id} onChange={(event) => setForm({ ...form, car_id: event.target.value })} type="number" min={1} placeholder="Car ID" required /><Input value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} type="date" required /><Input value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} type="date" required /><Input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Reason" required /><Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as MaintenanceStatus })}>{maintenanceStatusOptions.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</Select><Input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes" /><div className="flex gap-2 md:col-span-3"><Button>{editing ? 'Save maintenance' : 'Add maintenance'}</Button>{editing && <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel edit</Button>}</div></form></Card><div className="overflow-hidden rounded-lg border border-line bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Car</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-line">{result.items.map((item) => <tr key={item.id}><td className="px-4 py-3">Car #{item.car_id}</td><td className="px-4 py-3">{shortDate(item.start_date)} - {shortDate(item.end_date)}</td><td className="px-4 py-3">{item.reason}</td><td className="px-4 py-3"><StatusBadge value={item.status} /></td><td className="px-4 py-3"><div className="flex gap-2"><button className="font-semibold text-brand-600" onClick={() => edit(item)} type="button">Edit</button><button className="font-semibold text-red-700" onClick={() => remove(item.id)} type="button">Delete</button></div></td></tr>)}</tbody></table></div></AdminShell>;
}

export function AdminAuditLogsPage() {
  const [result, setResult] = useState<PaginatedAuditLogs>({ items: [], total: 0, page: 1, page_size: 20, total_pages: 1 });
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    listAuditLogs({ entity_type: entityType || undefined, page, page_size: 20 }).then(setResult).catch((err) => setError(err instanceof Error ? err.message : 'Could not load audit logs'));
  }, [entityType, page]);

  return <AdminShell><h1 className="mb-2 text-3xl font-bold">Audit logs</h1><p className="mb-6 text-muted">Track admin actions across the system.</p><Card className="mb-4 grid gap-3 p-4 md:grid-cols-[240px_auto]"><Input value={entityType} onChange={(event) => { setEntityType(event.target.value); setPage(1); }} placeholder="entity_type: car, rental, payment" /><p className="text-sm text-muted">{result.total} logs found</p></Card>{error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<div className="overflow-hidden rounded-lg border border-line bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Date</th></tr></thead><tbody className="divide-y divide-line">{result.items.map((item: AuditLog) => <tr key={item.id}><td className="px-4 py-3 font-semibold">{item.action}</td><td className="px-4 py-3">{item.entity_type} #{item.entity_id ?? '-'}</td><td className="px-4 py-3">{item.actor_id ?? '-'}</td><td className="px-4 py-3">{shortDate(item.created_at)}</td></tr>)}</tbody></table></div><div className="mt-4 flex items-center justify-between"><Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button><span className="text-sm text-muted">Page {result.page} of {Math.max(result.total_pages, 1)}</span><Button type="button" variant="secondary" disabled={page >= result.total_pages} onClick={() => setPage((value) => value + 1)}>Next</Button></div></AdminShell>;
}
