import { clsx, type ClassValue } from 'clsx';
export function cn(...values: ClassValue[]) { return clsx(values); }
export function money(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value); }
export function shortDate(value: string) { return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)); }
export function rentalDays(start: string, end: string) { return Math.max(1, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1); }
