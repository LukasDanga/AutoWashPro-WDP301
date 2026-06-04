import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import FeaturePlaceholder from '@/components/admin/FeaturePlaceholder';
import BranchManagement from '@/components/admin/BranchManagement';
import ManagerVouchers from '@/components/manager/ManagerVouchers';
import UserManagement from '@/components/admin/UserManagement';
import AdminProfile from '@/components/admin/AdminProfile';
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
        <Route index element={<FeaturePlaceholder title={ADMIN_PAGE_META.overview.title} description={ADMIN_PAGE_META.overview.description} />} />
        <Route path="branches" element={<BranchManagement />} />
        <Route path="users" element={<UserManagement />} />
        <Route
          path="reviews"
          element={
            <FeaturePlaceholder
              title={ADMIN_PAGE_META.reviews.title}
              description={ADMIN_PAGE_META.reviews.description}
            />
          }
        />
        <Route
          path="rewards"
          element={<ManagerVouchers />}
        />
        <Route
          path="activity"
          element={
            <FeaturePlaceholder
              title={ADMIN_PAGE_META.activity.title}
              description={ADMIN_PAGE_META.activity.description}
            />
          }
        />
        <Route path="profile" element={<AdminProfile user={user} />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
