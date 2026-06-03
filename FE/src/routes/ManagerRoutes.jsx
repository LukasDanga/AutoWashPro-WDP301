import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import ManagerLayout from '@/components/manager/ManagerLayout';
import ManagerOverview from '@/components/manager/ManagerOverview';
import ManagerBookings from '@/components/manager/ManagerBookings';
import ManagerCheckins from '@/components/manager/ManagerCheckins';
import ManagerBranch from '@/components/manager/ManagerBranch';
import ManagerVouchers from '@/components/manager/ManagerVouchers';
import ManagerProfile from '@/components/manager/ManagerProfile';
import { clearSession, fetchProfile, getApiBaseUrl, getStoredToken } from '@/lib/authStorage';

export default function ManagerRoutes() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const token = getStoredToken();
      if (!token) {
        if (!cancelled) { setAuthError('Chưa đăng nhập'); setLoading(false); }
        return;
      }
      try {
        const profile = await fetchProfile(token);
        if (profile?.role !== 'manager') {
          if (!cancelled) { setAuthError('Tài khoản không có quyền quản lý chi nhánh'); setLoading(false); }
          return;
        }
        if (!cancelled) { setUser(profile); setLoading(false); }
      } catch (error) {
        clearSession();
        if (!cancelled) { setAuthError(error.message || 'Phiên đăng nhập không hợp lệ'); setLoading(false); }
      }
    }

    verify();
    return () => { cancelled = true; };
  }, []);

  async function handleLogout() {
    const token = getStoredToken();
    const apiBase = getApiBaseUrl();
    try {
      if (token) {
        await fetch(`${apiBase}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch { /* ignore */ }
    finally {
      clearSession();
      navigate('/', { replace: true });
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Đang xác thực quyền quản lý…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace state={{ adminAuthError: authError }} />;
  }

  return (
    <Routes>
      <Route element={<ManagerLayout user={user} onLogout={handleLogout} />}>
        <Route index element={<ManagerOverview user={user} />} />
        <Route path="bookings" element={<ManagerBookings user={user} />} />
        <Route path="checkins" element={<ManagerCheckins user={user} />} />
        <Route path="branch" element={<ManagerBranch user={user} />} />
        <Route path="vouchers" element={<ManagerVouchers user={user} />} />
        <Route path="profile" element={<ManagerProfile user={user} />} />
        <Route path="*" element={<Navigate to="/manager" replace />} />
      </Route>
    </Routes>
  );
}
