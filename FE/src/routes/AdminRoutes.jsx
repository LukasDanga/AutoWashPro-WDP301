import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import BranchManagement from '@/components/admin/BranchManagement';
import AdminRewards from '@/components/admin/AdminRewards';
import AdminSystemConfig from '@/components/admin/AdminSystemConfig';
import AdminPointHistoryDetail from '@/components/admin/AdminPointHistoryDetail';
import UserManagement from '@/components/admin/UserManagement';
import AdminOverview from '@/components/admin/AdminOverview';
import FeaturePlaceholder from '@/components/admin/FeaturePlaceholder';
import AdminProfile from '@/components/admin/AdminProfile';
import AdminReviews from '@/components/admin/AdminReviews';
import AdminBookings from '@/components/admin/AdminBookings';
import AdminActivity from '@/components/admin/AdminActivity';
import AdminSlotPacks from '@/components/admin/AdminSlotPacks';
import AdminPaymentsPage from '@/components/admin/AdminPaymentsPage';
import PaymentDetailPage from '@/components/admin/PaymentDetailPage';
import RefundDetailPage from '@/components/shared/RefundDetailPage';
import AdminPolicies from '@/components/admin/AdminPolicies';
import { ADMIN_PAGE_META } from '@/config/adminMenu';
import { clearSession, fetchProfile, getApiBaseUrl, getStoredToken } from '@/lib/authStorage';

export default function AdminRoutes() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const token = getStoredToken();
      if (!token) {
        if (!cancelled) {
          setAuthError('Chưa đăng nhập');
          setLoading(false);
        }
        return;
      }

      try {
        const profile = await fetchProfile(token);
        if (profile?.role !== 'admin') {
          if (!cancelled) {
            setAuthError('Tài khoản không có quyền quản trị');
            setLoading(false);
          }
          return;
        }
        if (!cancelled) {
          setUser(profile);
          setLoading(false);
        }
      } catch (error) {
        clearSession();
        if (!cancelled) {
          setAuthError(error.message || 'Phiên đăng nhập không hợp lệ');
          setLoading(false);
        }
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
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
    } catch {
      // Ignore transport errors.
    } finally {
      clearSession();
      navigate('/', { replace: true });
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Đang xác thực quyền quản trị...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace state={{ adminAuthError: authError }} />;
  }

  return (
    <Routes>
      <Route element={<AdminLayout user={user} onLogout={handleLogout} />}>
        <Route index element={<AdminOverview />} />
        <Route path="branches" element={<BranchManagement />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route
          path="rewards"
          element={<AdminRewards />}
        />
        <Route
          path="system-config"
          element={<AdminSystemConfig />}
        />
        <Route
          path="rewards/history/:id"
          element={<AdminPointHistoryDetail />}
        />
        <Route path="activity" element={<AdminActivity />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="payments" element={<AdminPaymentsPage />} />
        <Route path="payments/refunds" element={<Navigate to="/admin/payments?tab=refunds" replace />} />
        <Route path="payments/refunds/:id" element={<RefundDetailPage basePath="/admin/payments?tab=refunds" />} />
        <Route path="payments/:id" element={<PaymentDetailPage basePath="/admin/payments" />} />
        <Route path="refund-requests" element={<Navigate to="/admin/payments?tab=refunds" replace />} />
        <Route path="slot-packs" element={<AdminSlotPacks />} />
        <Route path="policies" element={<AdminPolicies />} />
        <Route path="profile" element={<AdminProfile user={user} />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
