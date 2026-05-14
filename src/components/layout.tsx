import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BarChart3, Car, ClipboardList, FileClock, LogOut, User as UserIcon, Users, Wrench } from 'lucide-react';
import { getUnreadNotificationCount } from '../lib/api';
import { accessToken, currentUser, isAdminRole, isSuperAdminRole, logout } from '../lib/auth';
import { NOTIFICATIONS_CHANGED_EVENT } from '../lib/events';

export function SiteHeader() {
  const user = currentUser();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let alive = true;

    async function loadUnreadCount() {
      if (!currentUser() || !accessToken()) {
        setUnreadCount(0);
        return;
      }
      try {
        const result = await getUnreadNotificationCount();
        if (alive) setUnreadCount(result.count);
      } catch {
        if (alive) setUnreadCount(0);
      }
    }

    loadUnreadCount();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, loadUnreadCount);
    const interval = window.setInterval(loadUnreadCount, 30000);
    return () => {
      alive = false;
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, loadUnreadCount);
      window.clearInterval(interval);
    };
  }, [user?.id]);

  function signOut() {
    logout();
    navigate('/login');
  }

  return <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"><Link to="/" className="flex items-center gap-2 font-bold"><Car className="h-5 w-5 text-brand-600" />RentCar</Link><nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex"><NavLink to="/cars">Browse Cars</NavLink>{user && <NavLink to="/dashboard">Dashboard</NavLink>}{user && <NavLink to="/dashboard/notifications" className="relative inline-flex items-center">Notifications{unreadCount > 0 && <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold leading-none text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}</NavLink>}{isAdminRole(user?.role) && <NavLink to="/admin">Admin</NavLink>}</nav><div className="flex items-center gap-2">{user ? <><Link to="/dashboard/profile" className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-slate-50"><UserIcon className="h-4 w-4" />{user.name}</Link><button type="button" onClick={signOut} className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"><LogOut className="h-4 w-4" />Logout</button></> : <><Link to="/login" className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-slate-50">Login</Link><Link to="/register" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Register</Link></>}</div></div></header>;
}

const links = [{ href: '/admin', label: 'Dashboard', icon: BarChart3 }, { href: '/admin/cars', label: 'Cars', icon: Car }, { href: '/admin/rentals', label: 'Rentals', icon: ClipboardList }, { href: '/admin/reports', label: 'Reports', icon: BarChart3 }, { href: '/admin/maintenance', label: 'Maintenance', icon: Wrench }, { href: '/admin/users', label: 'Users', icon: Users }, { href: '/admin/audit-logs', label: 'Audit logs', icon: FileClock, superOnly: true }];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const user = currentUser();
  const visibleLinks = links.filter((item) => !item.superOnly || isSuperAdminRole(user?.role));
  return <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[260px_1fr]"><aside className="border-r border-line bg-white p-4"><Link to="/" className="mb-2 flex items-center gap-2 text-lg font-bold"><Car className="h-5 w-5 text-brand-600" />RentCar Admin</Link><p className="mb-8 text-xs font-semibold uppercase tracking-wide text-slate-500">{user?.role?.replace('_', ' ') ?? 'guest'}</p><nav className="space-y-1">{visibleLinks.map((item) => <NavLink key={item.href} to={item.href} end={item.href === '/admin'} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-700"><item.icon className="h-4 w-4" />{item.label}</NavLink>)}</nav></aside><main className="p-4 sm:p-6 lg:p-8">{children}</main></div>;
}
