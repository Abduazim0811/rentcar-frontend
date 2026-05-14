import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { HomePage, CarsPage, CarDetailPage, RentPage } from './pages/PublicPages';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { DashboardPage, MyRentalsPage, NotificationsPage, ProfilePage, RentalDetailPage } from './pages/DashboardPages';
import { AdminAuditLogsPage, AdminCarsPage, AdminDashboard, AdminMaintenancePage, AdminRentalDetailPage, AdminRentalsPage, AdminReportsPage, AdminUsersPage, EditCarPage, NewCarPage } from './pages/AdminPages';
import { getProfile } from './lib/api';
import { accessToken, currentUser, logout, saveUser } from './lib/auth';
import type { User, UserRole } from './types';

function hasAdminAccess(role?: UserRole) { return role === 'admin' || role === 'super_admin'; }

function RequireRole({ children, admin = false, superAdmin = false }: { children: React.ReactNode; admin?: boolean; superAdmin?: boolean }) {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(currentUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!accessToken()) {
      logout();
      setLoading(false);
      setUser(null);
      return;
    }

    getProfile()
      .then((profile) => {
        if (!alive) return;
        saveUser(profile);
        setUser(profile);
      })
      .catch(() => {
        if (!alive) return;
        logout();
        setUser(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, [location.pathname]);

  if (!accessToken()) {
    logout();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (loading) return <div className="mx-auto max-w-7xl px-4 py-10 text-slate-600">Checking session...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (superAdmin && user.role !== 'super_admin') return <Navigate to="/admin" replace />;
  if (admin && !hasAdminAccess(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  return <RequireRole>{children}</RequireRole>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  return <RequireRole admin>{children}</RequireRole>;
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  return <RequireRole superAdmin>{children}</RequireRole>;
}

export default function App() {
  return <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/cars" element={<CarsPage />} />
    <Route path="/cars/:id" element={<CarDetailPage />} />
    <Route path="/rent/:carId" element={<RequireAuth><RentPage /></RequireAuth>} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
    <Route path="/dashboard/rentals" element={<RequireAuth><MyRentalsPage /></RequireAuth>} />
    <Route path="/dashboard/rentals/:id" element={<RequireAuth><RentalDetailPage /></RequireAuth>} />
    <Route path="/dashboard/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
    <Route path="/dashboard/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
    <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
    <Route path="/admin/cars" element={<RequireAdmin><AdminCarsPage /></RequireAdmin>} />
    <Route path="/admin/cars/new" element={<RequireAdmin><NewCarPage /></RequireAdmin>} />
    <Route path="/admin/cars/:id/edit" element={<RequireAdmin><EditCarPage /></RequireAdmin>} />
    <Route path="/admin/rentals" element={<RequireAdmin><AdminRentalsPage /></RequireAdmin>} />
    <Route path="/admin/rentals/:id" element={<RequireAdmin><AdminRentalDetailPage /></RequireAdmin>} />
    <Route path="/admin/reports" element={<RequireAdmin><AdminReportsPage /></RequireAdmin>} />
    <Route path="/admin/maintenance" element={<RequireAdmin><AdminMaintenancePage /></RequireAdmin>} />
    <Route path="/admin/audit-logs" element={<RequireSuperAdmin><AdminAuditLogsPage /></RequireSuperAdmin>} />
    <Route path="/admin/users" element={<RequireAdmin><AdminUsersPage /></RequireAdmin>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
