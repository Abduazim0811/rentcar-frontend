import type { Car, Rental, User } from '../types';
export const cars: Car[] = [
  { id: 1, brand: 'Toyota', model: 'Camry', year: 2023, plate_number: '01A777AA', daily_rate: 58, status: 'available', seats: 5, fuel: 'Hybrid', transmission: 'Automatic', image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1200&q=80' },
  { id: 2, brand: 'BMW', model: 'X5', year: 2022, plate_number: '01B505BB', daily_rate: 115, status: 'available', seats: 5, fuel: 'Petrol', transmission: 'Automatic', image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80' },
  { id: 3, brand: 'Hyundai', model: 'Elantra', year: 2021, plate_number: '01H221HA', daily_rate: 42, status: 'available', seats: 5, fuel: 'Petrol', transmission: 'Automatic', image: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=80' },
  { id: 4, brand: 'Mercedes', model: 'C-Class', year: 2023, plate_number: '01M909MA', daily_rate: 96, status: 'maintenance', seats: 5, fuel: 'Petrol', transmission: 'Automatic', image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80' }
];
export const user: User = { id: 7, name: 'Demo Customer', email: 'customer@example.com', phone: '+998 90 123 45 67', role: 'customer' };
export const admin: User = { id: 1, name: 'Admin User', email: 'admin@example.com', phone: '+998 90 777 11 22', role: 'admin' };
export const superAdmin: User = { id: 2, name: 'Super Admin', email: 'superadmin@rentcar.local', phone: '+998 90 999 00 11', role: 'super_admin' };
export const rentals: Rental[] = [
  { id: 1001, user_id: 7, car_id: 1, start_date: '2026-05-08T00:00:00Z', end_date: '2026-05-11T00:00:00Z', total_amount: 232, status: 'confirmed', payment: { id: 501, rental_id: 1001, amount: 232, method: 'card', status: 'paid', paid_at: '2026-05-07T10:00:00Z', created_at: '2026-05-07T09:55:00Z', updated_at: '2026-05-07T10:00:00Z' }, car: cars[0], user },
  { id: 1002, user_id: 7, car_id: 3, start_date: '2026-04-18T00:00:00Z', end_date: '2026-04-20T00:00:00Z', total_amount: 126, status: 'completed', payment: { id: 502, rental_id: 1002, amount: 126, method: 'cash', status: 'paid', paid_at: '2026-04-18T08:00:00Z', created_at: '2026-04-17T16:00:00Z', updated_at: '2026-04-18T08:00:00Z' }, car: cars[2], user }
];
