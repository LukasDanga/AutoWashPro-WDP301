import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthScreen from './components/AuthScreen.jsx';
import LandingPage from './components/landing/pages/LandingPage.jsx';
import AboutPage from './components/landing/pages/AboutPage.jsx';
import BookingPage from './components/landing/pages/BookingPage.jsx';
import PackagesPage from './components/landing/pages/PackagesPage.jsx';
import GiftStorePage from './components/landing/pages/GiftStorePage.jsx';
import MapPage from './components/landing/pages/MapPage.jsx';
import BranchDetailPage from './components/landing/pages/BranchDetailPage.jsx';
import CustomerProfilePage from './components/customer/pages/CustomerProfilePage.jsx';
import CustomerWalletPage from './components/customer/pages/wallet/CustomerWalletPage.jsx';
import CustomerWalletDetailPage from './components/customer/pages/wallet/CustomerWalletDetailPage.jsx';
import CustomerHistoryPage from './components/customer/pages/history/CustomerHistoryPage.jsx';
import CustomerBookingDetail from './components/customer/pages/history/CustomerBookingDetail.jsx';
import CustomerPaymentHistoryPage from './components/customer/pages/CustomerPaymentHistoryPage.jsx';
import CustomerPaymentDetailPage from './components/customer/pages/CustomerPaymentDetailPage.jsx';
import CustomerNotificationsPage from './components/customer/pages/CustomerNotificationsPage.jsx';
import CustomerLayout from './components/customer/layout/CustomerLayout.jsx';
import CustomerRewardsPage from './components/customer/pages/rewards/CustomerRewardsPage.jsx';
import CustomerPointHistoryDetail from './components/customer/pages/rewards/CustomerPointHistoryDetail.jsx';
import PolicyPage from './components/landing/pages/PolicyPage.jsx';
import {
  clearSession as clearStoredSession,
  getApiBaseUrl,
  persistSession,
  readApiError,
  storageKeys,
} from './lib/authStorage.js';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const [token, setToken] = useState(() => localStorage.getItem(storageKeys.accessToken) || '');
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem(storageKeys.refreshToken) || '');
  const [authLoading, setAuthLoading] = useState(Boolean(token));
  const [authError, setAuthError] = useState('');
  const [user, setUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [pendingBooking, setPendingBooking] = useState(null);

  function handleUserUpdate(updated) {
    if (!updated) return;
    setUser((prev) => {
      // Guard: prev có thể null nếu user vừa logout mà component con chưa unmount.
      if (!prev) return prev;
      return { ...prev, ...updated };
    });
  }

  function handleVehicleCreated(newVehicle) {
    setVehicles(prev => {
      if (prev.some(v => (v._id || v.id) === (newVehicle._id || newVehicle.id))) return prev;
      return [newVehicle, ...prev];
    });
  }

  const loadSession = useCallback(async (accessToken, opts = {}) => {
    if (!accessToken) return;

    if (!opts.skipLoadingState) {
      setAuthLoading(true);
    }
    setAuthError('');

    try {
      const profileResponse = await fetch(`${apiBase}/auth/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!profileResponse.ok) {
        throw new Error(await readApiError(profileResponse));
      }

      const profilePayload = await profileResponse.json();
      const profile = profilePayload?.data ?? profilePayload;
      setUser(profile);

      if (profile?.role !== 'admin') {
        const vehiclesResponse = await fetch(`${apiBase}/vehicles`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!vehiclesResponse.ok) {
          throw new Error(await readApiError(vehiclesResponse));
        }

        const vehiclesPayload = await vehiclesResponse.json();
        setVehicles(
          Array.isArray(vehiclesPayload?.data) ? vehiclesPayload.data : vehiclesPayload?.data || [],
        );
      } else {
        setVehicles([]);
      }

      return profile;
    } catch (error) {
      clearSession();
      setAuthError(error.message || 'Không thể tải phiên đăng nhập');
    } finally {
      if (!opts.skipLoadingState) {
        setAuthLoading(false);
      }
    }
  }, [apiBase]);

  function applySession(nextAccessToken, nextRefreshToken) {
    setToken(nextAccessToken);
    setRefreshToken(nextRefreshToken || '');
    persistSession(nextAccessToken, nextRefreshToken);
  }

  function clearSession() {
    setToken('');
    setRefreshToken('');
    setUser(null);
    setVehicles([]);
    clearStoredSession();
  }

  function redirectByRole(profile) {
    if (profile?.role === 'admin') {
      navigate('/admin', { replace: true });
    } else if (profile?.role === 'manager') {
      navigate('/manager', { replace: true });
    }
  }

  useEffect(() => {
    if (!token) {
      setAuthLoading(false);
      return;
    }

    async function initSession() {
      const profile = await loadSession(token);
      if (profile && (profile.role === 'admin' || profile.role === 'manager')) {
        if (location.pathname === '/' || location.pathname === '/auth') {
          redirectByRole(profile);
        }
      }
    }

    initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // VNPay return routing: provisional payments redirect to /? →
  // detect rebook vs regular booking and route accordingly
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const vnpayResult = params.get('vnpay_result');
    if (!vnpayResult) return;
    if (location.pathname.startsWith('/profile')) return;
    const rebookDraft = sessionStorage.getItem('aw_rebookVnpayDraft');
    if (rebookDraft) {
      // Already on /history — no redirect needed (Handled by HistoryPage)
      if (location.pathname.startsWith('/history')) return;
      // Rebook flow → save result for HistoryPage, navigate to /history
      sessionStorage.setItem('aw_rebookVnpayResult', vnpayResult);
      navigate('/history?rebook_vnpay=true', { replace: true });
    } else {
      // Already on /booking or /history — no redirect needed
      if (location.pathname.startsWith('/booking')) return;
      if (location.pathname.startsWith('/history')) return;
      // Regular booking flow → forward to /booking where BookingWidget handles it
      navigate('/booking?vnpay_result=' + encodeURIComponent(vnpayResult), { replace: true });
    }
  }, [location]);

  async function loginWithCredentials(identifier, password, expectedRole) {
    // SECURITY: do NOT log credentials — keeps plaintext password out of browser console,
    // DevTools, and any extension that scrapes logs (Sentry, etc.).
    const response = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response));
    }

    const payload = await response.json();
    const data = payload?.data || payload;
    applySession(data?.accessToken, data?.refreshToken);
    const profile = await loadSession(data?.accessToken, { skipLoadingState: true });
    
    if (expectedRole && profile?.role !== expectedRole) {
      throw new Error(`Tài khoản không có quyền ${expectedRole === 'admin' ? 'quản trị' : 'quản lý chi nhánh'}.`);
    }
    
    if (profile?.role === 'admin' || profile?.role === 'manager') {
      redirectByRole(profile);
    } else {
      navigate('/', { replace: true });
    }
    
    return profile;
  }

  async function registerUser(data) {
    const registerResponse = await fetch(`${apiBase}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
      }),
    });

    if (!registerResponse.ok) {
      throw new Error(await readApiError(registerResponse));
    }

    const registerPayload = await registerResponse.json();
    const registerData = registerPayload?.data || registerPayload;
    applySession(registerData?.accessToken, registerData?.refreshToken);

    const profile = await loadSession(registerData?.accessToken, { skipLoadingState: true });
    if (profile?.role === 'admin' || profile?.role === 'manager') {
      redirectByRole(profile);
    } else {
      navigate('/', { replace: true });
    }
  }

  async function handleGoogleLoginSuccess(accessToken, refreshToken) {
    applySession(accessToken, refreshToken);
    const profile = await loadSession(accessToken, { skipLoadingState: true });
    
    if (profile?.role === 'admin' || profile?.role === 'manager') {
      redirectByRole(profile);
    } else {
      navigate('/', { replace: true });
    }
  }

  async function handleLogout() {
    try {
      if (token) {
        await fetch(`${apiBase}/auth/logout`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Ignore transport errors and clear local state anyway.
    } finally {
      clearSession();
      navigate('/', { replace: true });
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="text-sm font-semibold text-slate-500">Đang kiểm tra phiên đăng nhập...</p>
        </div>
      </div>
    );
  }

  const path = location.pathname;

  if (path === '/auth') {
    return <AuthScreen authLoading={authLoading} onLogin={loginWithCredentials} onRegister={registerUser} onGoogleLoginSuccess={handleGoogleLoginSuccess} onBack={() => navigate('/')} />;
  }

  const customerNavProps = {
    user,
    apiBase,
    token,
    onLogout: handleLogout,
    onOpenAuth: () => navigate('/auth'),
    onGoToProfile: () => navigate('/profile'),
    onGoToWallet: () => navigate('/wallet'),
    onGoToHistory: () => navigate('/history'),
    onGoToPayments: () => navigate('/payments'),
    onGoToNotifications: () => navigate('/notifications'),
    onGoToRewards: () => navigate('/rewards'),
  };

  if (path === '/profile' && token && user) {
    return (
      <CustomerLayout {...customerNavProps}>
        <CustomerProfilePage user={user} vehicles={vehicles} onLogout={handleLogout} apiBase={apiBase} token={token} onBack={() => navigate('/')} onUserUpdate={handleUserUpdate} />
      </CustomerLayout>
    );
  }

  if (path === '/wallet' && token && user) {
    return (
      <CustomerLayout {...customerNavProps}>
        <CustomerWalletPage apiBase={apiBase} token={token} user={user} onUserUpdate={handleUserUpdate} />
      </CustomerLayout>
    );
  }

  if (path.startsWith('/wallet/') && token && user) {
    return (
      <CustomerLayout {...customerNavProps}>
        <CustomerWalletDetailPage apiBase={apiBase} token={token} user={user} />
      </CustomerLayout>
    );
  }

  if (path === '/history' && token && user) {
    return (
      <CustomerLayout {...customerNavProps}>
        <CustomerHistoryPage onBack={() => navigate('/')} apiBase={apiBase} token={token} vehicles={vehicles} user={user} onUserUpdate={handleUserUpdate} />
      </CustomerLayout>
    );
  }

  if (path.startsWith('/history/') && token && user) {
    return (
      <CustomerLayout {...customerNavProps}>
        <CustomerBookingDetail apiBase={apiBase} token={token} user={user} onUserUpdate={handleUserUpdate} />
      </CustomerLayout>
    );
  }

  const handleGoToHistory = (param) => {
    if (typeof param === 'string' && param.startsWith('/')) {
      navigate(param);
    } else if (param === 'slot_packs') {
      navigate('/history?view=slot_packs');
    } else if (param) {
      navigate(`/history?bookingId=${param}`);
    } else {
      navigate('/history');
    }
  };

  if ((path === '/payments' || path.startsWith('/payments/')) && token && user) {
    const isDetail = path !== '/payments';
    return (
      <CustomerLayout {...customerNavProps}>
        {isDetail
          ? <CustomerPaymentDetailPage />
          : <CustomerPaymentHistoryPage onBack={() => navigate('/')} apiBase={apiBase} token={token} />
        }
      </CustomerLayout>
    );
  }

  if (path === '/notifications' && token && user) {
    return (
      <CustomerLayout {...customerNavProps}>
        <CustomerNotificationsPage onBack={() => navigate('/')} apiBase={apiBase} token={token} />
      </CustomerLayout>
    );
  }

  if (path === '/rewards' && token && user) {
    return (
      <CustomerLayout {...customerNavProps}>
        <CustomerRewardsPage user={user} refreshUser={() => {
          fetch(`${apiBase}/auth/profile`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(d => { if (d?.data) handleUserUpdate(d.data); }).catch(() => {});
        }} />
      </CustomerLayout>
    );
  }

  if (path.startsWith('/rewards/history/') && token && user) {
    return (
      <CustomerLayout {...customerNavProps}>
        <CustomerPointHistoryDetail />
      </CustomerLayout>
    );
  }

  if (path === '/booking') {
    return <BookingPage onOpenAuth={() => navigate('/auth')} user={user} vehicles={vehicles} apiBase={apiBase} token={token} onLogout={handleLogout} onGoToProfile={() => navigate('/profile')} onGoToHistory={handleGoToHistory} onGoToPayments={() => navigate('/payments')} onGoToNotifications={() => navigate('/notifications')} pendingBooking={pendingBooking} onSetPendingBooking={setPendingBooking} onVehicleCreated={handleVehicleCreated} onUserUpdate={handleUserUpdate} />;
  }

  if (path === '/packages') {
    return <PackagesPage onOpenAuth={() => navigate('/auth')} user={user} onLogout={handleLogout} onGoToProfile={() => navigate('/profile')} onGoToHistory={handleGoToHistory} onGoToPayments={() => navigate('/payments')} onGoToNotifications={() => navigate('/notifications')} />;
  }

  if (path === '/gifts') {
    return <GiftStorePage onOpenAuth={() => navigate('/auth')} user={user} onLogout={handleLogout} onGoToProfile={() => navigate('/profile')} onGoToHistory={handleGoToHistory} onGoToPayments={() => navigate('/payments')} onGoToNotifications={() => navigate('/notifications')} />;
  }

  if (path === '/map') {
    return <MapPage onOpenAuth={() => navigate('/auth')} user={user} onLogout={handleLogout} onGoToProfile={() => navigate('/profile')} onGoToHistory={handleGoToHistory} onGoToPayments={() => navigate('/payments')} onGoToNotifications={() => navigate('/notifications')} />;
  }

  if (path.startsWith('/branch/')) {
    return <BranchDetailPage onOpenAuth={() => navigate('/auth')} user={user} onLogout={handleLogout} onGoToProfile={() => navigate('/profile')} onGoToHistory={handleGoToHistory} onGoToPayments={() => navigate('/payments')} onGoToNotifications={() => navigate('/notifications')} />;
  }

  if (path === '/about') {
    return <AboutPage onOpenAuth={() => navigate('/auth')} user={user} onLogout={handleLogout} onGoToProfile={() => navigate('/profile')} onGoToHistory={handleGoToHistory} onGoToPayments={() => navigate('/payments')} onGoToNotifications={() => navigate('/notifications')} />;
  }

  if (path === '/policies') {
    return <PolicyPage onOpenAuth={() => navigate('/auth')} user={user} onLogout={handleLogout} onGoToProfile={() => navigate('/profile')} onGoToHistory={handleGoToHistory} onGoToPayments={() => navigate('/payments')} onGoToNotifications={() => navigate('/notifications')} />;
  }

  return <LandingPage onOpenAuth={() => navigate('/auth')} user={user} vehicles={vehicles} onLogout={handleLogout} apiBase={apiBase} token={token} onGoToProfile={() => navigate('/profile')} onGoToHistory={handleGoToHistory} onGoToPayments={() => navigate('/payments')} onGoToNotifications={() => navigate('/notifications')} pendingBooking={pendingBooking} onSetPendingBooking={setPendingBooking} onVehicleCreated={handleVehicleCreated} />;
}
