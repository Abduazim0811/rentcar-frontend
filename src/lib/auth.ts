import type { User } from '../types';

export function currentUser(): User | null {
  try {
    const raw = localStorage.getItem('rent_car_user');
    return raw ? JSON.parse(raw) as User : null;
  } catch {
    return null;
  }
}

export function isAdminRole(role?: string) {
  return role === 'admin' || role === 'super_admin';
}

export function isSuperAdminRole(role?: string) {
  return role === 'super_admin';
}

export function accessToken() {
  return localStorage.getItem('rent_car_token');
}

export function refreshToken() {
  return localStorage.getItem('rent_car_refresh_token');
}

export function saveSession(token: string, user: User, refresh?: string) {
  localStorage.setItem('rent_car_token', token);
  localStorage.removeItem('rent_car_refresh_token');
  if (refresh) localStorage.setItem('rent_car_refresh_token', refresh);
  localStorage.setItem('rent_car_user', JSON.stringify(user));
}

export function saveUser(user: User) {
  localStorage.setItem('rent_car_user', JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem('rent_car_token');
  localStorage.removeItem('rent_car_refresh_token');
  localStorage.removeItem('rent_car_user');
}
