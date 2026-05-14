import type { AuditFilters, AvailabilityCalendar, AuthResponse, Car, CarAvailability, CarFilters, EmailVerificationResponse, Invoice, Maintenance, MaintenanceFilters, Notification, PaginatedAuditLogs, PaginatedCars, PaginatedMaintenance, PaginatedRentals, PaginatedUsers, Payment, PaymentMethod, Rental, RentalFilters, RentalStatus, ReportSummary, User, UserFilters, UserRole } from '../types';
import { accessToken, logout as clearSession, refreshToken, saveSession } from './auth';
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1';
type Envelope<T> = { data?: T; error?: string };
export type UploadedImage = { object_name: string; url: string; content_type: string; size: number };
async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = accessToken();
  if (token) headers.set('Authorization', 'Bearer ' + token);
  const res = await fetch(API + path, { ...init, headers, credentials: 'include' });
  if (res.status === 401 && retry && await refreshSession()) return request<T>(path, init, false);
  const body = await parseEnvelope<T>(res);
  if (!res.ok) throw new Error(body.error ?? 'Request failed');
  return body.data as T;
}
async function refreshSession() {
  const token = refreshToken();
  try {
    const init: RequestInit = {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) init.body = JSON.stringify({ refresh_token: token });
    const res = await fetch(API + '/auth/refresh', init);
    const body = await parseEnvelope<AuthResponse>(res);
    if (!res.ok || !body.data) throw new Error(body.error ?? 'Refresh failed');
    saveSession(body.data.access_token || body.data.token, body.data.user, body.data.refresh_token);
    return true;
  } catch {
    clearSession();
    return false;
  }
}
async function parseEnvelope<T>(res: Response): Promise<Envelope<T>> {
  const text = await res.text();
  if (!text) return {};
  return JSON.parse(text) as Envelope<T>;
}
function carQuery(filters: CarFilters = {}) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.min_year) params.set('min_year', String(filters.min_year));
  if (filters.max_year) params.set('max_year', String(filters.max_year));
  if (filters.min_rate) params.set('min_rate', String(filters.min_rate));
  if (filters.max_rate) params.set('max_rate', String(filters.max_rate));
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  const query = params.toString();
  return query ? '?' + query : '';
}
function rentalQuery(filters: RentalFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.payment_status && filters.payment_status !== 'all') params.set('payment_status', filters.payment_status);
  if (filters.user_id) params.set('user_id', String(filters.user_id));
  if (filters.car_id) params.set('car_id', String(filters.car_id));
  if (filters.start_from) params.set('start_from', filters.start_from);
  if (filters.end_to) params.set('end_to', filters.end_to);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  const query = params.toString();
  return query ? '?' + query : '';
}
function userQuery(filters: UserFilters = {}) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.role && filters.role !== 'all') params.set('role', filters.role);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  const query = params.toString();
  return query ? '?' + query : '';
}
function maintenanceQuery(filters: MaintenanceFilters = {}) {
  const params = new URLSearchParams();
  if (filters.car_id) params.set('car_id', String(filters.car_id));
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  const query = params.toString();
  return query ? '?' + query : '';
}
function auditQuery(filters: AuditFilters = {}) {
  const params = new URLSearchParams();
  if (filters.actor_id) params.set('actor_id', String(filters.actor_id));
  if (filters.entity_type) params.set('entity_type', filters.entity_type);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  const query = params.toString();
  return query ? '?' + query : '';
}
export function listCarsPage(filters: CarFilters = {}) { return request<PaginatedCars>('/cars' + carQuery(filters)); }
export async function listCars(filters: CarFilters = {}) { const page = await listCarsPage(filters); return page.items; }
export function checkCarAvailability(carId: number, startDate: string, endDate: string) { return request<CarAvailability>('/availability/cars/' + carId + '?start_date=' + encodeURIComponent(startDate) + '&end_date=' + encodeURIComponent(endDate)); }
export function getAvailabilityCalendar(carId: number, month: string) { return request<AvailabilityCalendar>('/availability/cars/' + carId + '/calendar?month=' + encodeURIComponent(month)); }
export function getCar(id: number) { return request<Car>('/cars/' + id); }
export function login(email: string, password: string) { return request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); }
export function register(name: string, email: string, phone: string, password: string) { return request<EmailVerificationResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, phone, password }) }); }
export function verifyEmail(email: string, code: string) { return request<AuthResponse>('/auth/verify-email', { method: 'POST', body: JSON.stringify({ email, code }) }); }
export function resendVerification(email: string) { return request<EmailVerificationResponse>('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }); }
export function logoutSession() {
  const token = refreshToken();
  return request<{ logged_out: boolean }>('/auth/logout', {
    method: 'POST',
    body: token ? JSON.stringify({ refresh_token: token }) : undefined,
  }, false);
}
export function getProfile() { return request<User>('/users/me'); }
export function updateProfile(input: { name: string; email: string; phone: string }) { return request<User>('/users/me', { method: 'PATCH', body: JSON.stringify(input) }); }
export function logoutAllSessions() { return request<{ logged_out: boolean }>('/users/logout-all', { method: 'POST' }); }
export function createPayment(input: { rental_id: number; method: PaymentMethod }) { return request<Payment>('/payments', { method: 'POST', body: JSON.stringify(input) }); }
export function confirmPayment(id: number) { return request<{ paid: boolean }>('/admin/payments/' + id + '/confirm', { method: 'POST' }); }
export function failPayment(id: number) { return request<{ failed: boolean }>('/admin/payments/' + id + '/fail', { method: 'POST' }); }
export function refundPayment(id: number) { return request<{ refunded: boolean }>('/admin/payments/' + id + '/refund', { method: 'POST' }); }
export function createRental(input: { car_id: number; start_date: string; end_date: string }) { return request<Rental>('/rentals', { method: 'POST', body: JSON.stringify(input) }); }
export function myRentals() { return request<Rental[]>('/rentals/me'); }
export function getRental(id: number) { return request<Rental>('/rentals/' + id); }
export function cancelRental(id: number) { return request<{ cancelled: boolean }>('/rentals/' + id + '/cancel', { method: 'POST' }); }
export function getInvoice(rentalId: number) { return request<Invoice>('/rentals/' + rentalId + '/invoice'); }
export function listNotifications(unreadOnly = false) { return request<Notification[]>('/notifications' + (unreadOnly ? '?unread=true' : '')); }
export function getUnreadNotificationCount() { return request<{ count: number }>('/notifications/unread-count'); }
export function markNotificationRead(id: number) { return request<{ read: boolean }>('/notifications/' + id + '/read', { method: 'POST' }); }

export async function uploadCarImage(file: File) {
  const form = new FormData();
  form.append('image', file);
  const headers = new Headers();
  const token = localStorage.getItem('rent_car_token');
  if (token) headers.set('Authorization', 'Bearer ' + token);
  const res = await fetch(API + '/admin/uploads/images', { method: 'POST', headers, body: form, credentials: 'include' });
  const body = await parseEnvelope<UploadedImage>(res);
  if (!res.ok) throw new Error(body.error ?? 'Image upload failed');
  return body.data as UploadedImage;
}

export function createCar(input: Partial<Car>) { return request<Car>('/admin/cars', { method: 'POST', body: JSON.stringify(input) }); }
export function updateCar(id: number, input: Partial<Car>) { return request<Car>('/admin/cars/' + id, { method: 'PUT', body: JSON.stringify(input) }); }
export function deleteCar(id: number) { return request<{ deleted: boolean }>('/admin/cars/' + id, { method: 'DELETE' }); }

export function listAdminRentalsPage(filters: RentalFilters = {}) { return request<PaginatedRentals>('/admin/rentals' + rentalQuery(filters)); }
export async function listAdminRentals(filters: RentalFilters = {}) { const page = await listAdminRentalsPage({ page_size: 100, ...filters }); return page.items; }
export function updateRentalStatus(id: number, status: RentalStatus) { return request<{ updated: boolean }>('/admin/rentals/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status }) }); }
export function approveRental(id: number) { return request<Rental>('/admin/rentals/' + id + '/approve', { method: 'POST' }); }
export function rejectRental(id: number) { return request<Rental>('/admin/rentals/' + id + '/reject', { method: 'POST' }); }

export function getReportSummary(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  const query = params.toString();
  return request<ReportSummary>('/admin/reports/summary' + (query ? '?' + query : ''));
}

export function listMaintenance(filters: MaintenanceFilters = {}) { return request<PaginatedMaintenance>('/admin/maintenance' + maintenanceQuery(filters)); }
export function createMaintenance(input: Partial<Maintenance>) { return request<Maintenance>('/admin/maintenance', { method: 'POST', body: JSON.stringify(input) }); }
export function updateMaintenance(id: number, input: Partial<Maintenance>) { return request<Maintenance>('/admin/maintenance/' + id, { method: 'PUT', body: JSON.stringify(input) }); }
export function deleteMaintenance(id: number) { return request<{ deleted: boolean }>('/admin/maintenance/' + id, { method: 'DELETE' }); }
export function listAuditLogs(filters: AuditFilters = {}) { return request<PaginatedAuditLogs>('/admin/audit-logs' + auditQuery(filters)); }

export function listUsersPage(filters: UserFilters = {}) { return request<PaginatedUsers>('/admin/users' + userQuery(filters)); }
export async function listUsers(filters: UserFilters = {}) { const page = await listUsersPage({ page_size: 100, ...filters }); return page.items; }
export function updateUserRole(id: number, role: UserRole) { return request<{ updated: boolean }>('/admin/users/' + id + '/role', { method: 'PATCH', body: JSON.stringify({ role }) }); }
