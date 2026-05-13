import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { HomePage, CarsPage, CarDetailPage, RentPage } from './pages/PublicPages';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { DashboardPage, MyRentalsPage, NotificationsPage, ProfilePage, RentalDetailPage } from './pages/DashboardPages';
import { AdminAuditLogsPage, AdminCarsPage, AdminDashboard, AdminMaintenancePage, AdminRentalDetailPage, AdminRentalsPage, AdminReportsPage, AdminUsersPage, EditCarPage, NewCarPage } from './pages/AdminPages';
import { accessToken, currentUser, logout } from './lib/auth';
import type { UserRole } from './types';

function hasAdminAccess(role?: UserRole) { return role === 'admin' || role === 'super_admin'; }

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const user = currentUser();
  if (!user || !accessToken()) {
    logout();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const user = currentUser();
  if (!user || !accessToken()) {
    logout();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return hasAdminAccess(user?.role) ? children : <Navigate to="/dashboard" replace />;
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const user = currentUser();
  if (!user || !accessToken()) {
    logout();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return user?.role === 'super_admin' ? children : <Navigate to="/admin" replace />;
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
