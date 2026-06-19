import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BookingFlow from './components/BookingFlow.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import LandingPage from './components/landing/LandingPage.jsx';
import ProfilePage from './components/landing/ProfilePage.jsx';
import HistoryPage from './components/landing/HistoryPage.jsx';
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
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);

  function handleUserUpdate(updated) {
    setUser(prev => ({ ...prev, ...updated }));
  }

  function handleVehicleCreated(newVehicle) {
    setVehicles(prev => {
      if (prev.some(v => (v._id || v.id) === (newVehicle._id || newVehicle.id))) return prev;
      return [newVehicle, ...prev];
    });
  }

  async function loadSession(accessToken) {
    if (!accessToken) return;

    setAuthLoading(true);
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
      setAuthLoading(false);
    }
  }

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

    loadSession(token).then((profile) => {
      if (profile?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (profile?.role === 'manager') {
        navigate('/manager', { replace: true });
      }
    });
  }, []);

  async function loginWithCredentials(identifier, password, expectedRole) {
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
    const profile = await loadSession(data?.accessToken);
    
    if (expectedRole && profile?.role !== expectedRole) {
      throw new Error(`Tài khoản không có quyền ${expectedRole === 'admin' ? 'quản trị' : 'quản lý chi nhánh'}.`);
    }
    
    if (profile?.role === 'admin' || profile?.role === 'manager') {
      redirectByRole(profile);
    }
    
    return profile;
  }

  async function registerUser(data) {
    const registerResponse = await fetch(`${apiBase}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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

    await loadSession(registerData?.accessToken);
  }

  async function handleLogout() {
    try {
      if (token) {
        await fetch(`${apiBase}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Ignore transport errors and clear local state anyway.
    } finally {
      clearSession();
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

  if (!token || !user) {
    if (showAuth) {
      return (
        <AuthScreen 
          authLoading={authLoading}
          onLogin={loginWithCredentials}
          onRegister={registerUser}
          onBack={() => setShowAuth(false)}
        />
      );
    }

    return <LandingPage onOpenAuth={() => setShowAuth(true)} onGoToProfile={() => setShowProfile(true)} onGoToHistory={() => setShowHistory(true)} pendingBooking={pendingBooking} onSetPendingBooking={setPendingBooking} onVehicleCreated={handleVehicleCreated} />;
  }

  if (showHistory) {
    return <HistoryPage onBack={() => setShowHistory(false)} apiBase={apiBase} token={token} />;
  }

  if (showProfile) {
    return <ProfilePage user={user} vehicles={vehicles} onLogout={handleLogout} apiBase={apiBase} token={token} onBack={() => setShowProfile(false)} onUserUpdate={handleUserUpdate} />;
  }

  return <LandingPage onOpenAuth={() => setShowAuth(true)} user={user} vehicles={vehicles} onLogout={handleLogout} apiBase={apiBase} token={token} onGoToProfile={() => setShowProfile(true)} onGoToHistory={() => setShowHistory(true)} pendingBooking={pendingBooking} onSetPendingBooking={setPendingBooking} onVehicleCreated={handleVehicleCreated} />;
}