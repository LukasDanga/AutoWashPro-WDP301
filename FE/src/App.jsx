import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BookingFlow from './components/BookingFlow.jsx';
import {
  clearSession as clearStoredSession,
  getApiBaseUrl,
  persistSession,
  readApiError,
  storageKeys,
} from './lib/authStorage.js';

const ADMIN_QUICK_LOGIN = {
  identifier: 'admin@washpro.vn',
  password: 'Admin123!',
};

const MANAGER_QUICK_LOGIN = {
  identifier: 'manager@washpro.vn',
  password: 'Manager123!',
};

function normalizePlate(value) {
  return value.replace(/[^0-9A-Za-z.-]/g, '').toUpperCase();
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const [token, setToken] = useState(() => localStorage.getItem(storageKeys.accessToken) || '');
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem(storageKeys.refreshToken) || '');
  const [authLoading, setAuthLoading] = useState(Boolean(token));
  const [authError, setAuthError] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [user, setUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [regPlate, setRegPlate] = useState('59F2-999.99');
  const [regVehicleType, setRegVehicleType] = useState('motorcycle');
  const [regBrand, setRegBrand] = useState('Honda');
  const [regModel, setRegModel] = useState('SH 150i');
  const [regColor, setRegColor] = useState('Đen');
  const [statusMessage, setStatusMessage] = useState('');

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

  async function loginWithCredentials(identifier, password) {
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
    return profile;
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoginLoading(true);
    setAuthError('');
    setStatusMessage('');

    try {
      const profile = await loginWithCredentials(loginPhone, loginPass);
      if (profile?.role === 'admin') {
        redirectByRole(profile);
        return;
      }
      setStatusMessage('Đăng nhập thành công.');
    } catch (error) {
      setAuthError(error.message || 'Đăng nhập thất bại');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleQuickAdminLogin() {
    setLoginPhone(ADMIN_QUICK_LOGIN.identifier);
    setLoginPass(ADMIN_QUICK_LOGIN.password);
    setLoginLoading(true);
    setAuthError('');
    setStatusMessage('');

    try {
      const profile = await loginWithCredentials(
        ADMIN_QUICK_LOGIN.identifier,
        ADMIN_QUICK_LOGIN.password,
      );
      if (profile?.role === 'admin') {
        redirectByRole(profile);
        return;
      }
      setAuthError('Tài khoản không có quyền quản trị.');
    } catch (error) {
      setAuthError(error.message || 'Đăng nhập admin thất bại. Chạy seed backend trước.');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleQuickManagerLogin() {
    setLoginPhone(MANAGER_QUICK_LOGIN.identifier);
    setLoginPass(MANAGER_QUICK_LOGIN.password);
    setLoginLoading(true);
    setAuthError('');
    setStatusMessage('');

    try {
      const profile = await loginWithCredentials(
        MANAGER_QUICK_LOGIN.identifier,
        MANAGER_QUICK_LOGIN.password,
      );
      if (profile?.role === 'manager') {
        redirectByRole(profile);
        return;
      }
      setAuthError('Tài khoản không có quyền quản lý chi nhánh.');
    } catch (error) {
      setAuthError(error.message || 'Đăng nhập manager thất bại. Chạy seed-manager.js trước.');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setRegisterLoading(true);
    setAuthError('');
    setStatusMessage('');

    try {
      const registerResponse = await fetch(`${apiBase}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          phone: regPhone,
          password: regPass,
        }),
      });

      if (!registerResponse.ok) {
        throw new Error(await readApiError(registerResponse));
      }

      const registerPayload = await registerResponse.json();
      const registerData = registerPayload?.data || registerPayload;
      applySession(registerData?.accessToken, registerData?.refreshToken);

      const normalizedPlate = normalizePlate(regPlate);
      if (normalizedPlate && registerData?.accessToken) {
        const vehicleResponse = await fetch(`${apiBase}/vehicles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${registerData.accessToken}`,
          },
          body: JSON.stringify({
            licensePlate: normalizedPlate,
            vehicleType: regVehicleType,
            brand: regBrand,
            model: regModel,
            color: regColor,
            isDefault: true,
          }),
        });

        if (!vehicleResponse.ok) {
          throw new Error(await readApiError(vehicleResponse));
        }
      }

      await loadSession(registerData?.accessToken);
      setStatusMessage('Đăng ký thành công, đang mở luồng đặt lịch.');
    } catch (error) {
      setAuthError(error.message || 'Đăng ký thất bại');
    } finally {
      setRegisterLoading(false);
    }
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
    return <div className="aw-auth-shell"><div className="aw-auth-card aw-auth-loading">Đang kiểm tra phiên đăng nhập...</div></div>;
  }

  if (!token || !user) {
    return (
      <div className="aw-auth-shell">
        <div className="aw-auth-backdrop aw-auth-backdrop-left" />
        <div className="aw-auth-backdrop aw-auth-backdrop-right" />

        <section className="aw-auth-card">
          <div className="aw-auth-brand">
            <div className="aw-auth-logo">💧</div>
            <div>
              <div className="aw-auth-title-row">
                <h1>AUTOWASH PORTAL WEB</h1>
                <span>CLIENT HUB</span>
              </div>
              <p>Đăng nhập hoặc đăng ký trước, sau đó mới vào luồng đặt lịch trực tuyến.</p>
            </div>
          </div>

          <div className="aw-auth-tabs">
            <button type="button" className={authMode === 'login' ? 'aw-auth-tab active' : 'aw-auth-tab'} onClick={() => setAuthMode('login')}>Đăng nhập</button>
            <button type="button" className={authMode === 'register' ? 'aw-auth-tab active' : 'aw-auth-tab'} onClick={() => setAuthMode('register')}>Đăng ký</button>
          </div>

          {location.state?.adminAuthError ? (
            <div className="aw-auth-message error">{location.state.adminAuthError}</div>
          ) : null}
          {authError ? <div className="aw-auth-message error">{authError}</div> : null}
          {statusMessage ? <div className="aw-auth-message success">{statusMessage}</div> : null}

          {authMode === 'login' ? (
            <form className="aw-auth-form" onSubmit={handleLogin}>
              <label>
                Số điện thoại hoặc email
                <input value={loginPhone} onChange={(event) => setLoginPhone(event.target.value)} placeholder="0901234567 hoặc user@mail.com" />
              </label>

              <label>
                Mật khẩu
                <div className="aw-auth-password">
                  <input type={showLoginPass ? 'text' : 'password'} value={loginPass} onChange={(event) => setLoginPass(event.target.value)} placeholder="Nhập mật khẩu" />
                  <button type="button" onClick={() => setShowLoginPass((value) => !value)}>{showLoginPass ? 'Ẩn' : 'Hiện'}</button>
                </div>
              </label>

              <button className="aw-auth-primary" type="submit" disabled={loginLoading}>
                {loginLoading ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'}
              </button>

              <div className="aw-auth-quick">
                <p className="aw-auth-quick-label">Đăng nhập nhanh (kiểm thử)</p>
                <button
                  type="button"
                  className="aw-auth-quick-btn"
                  disabled={loginLoading}
                  onClick={handleQuickAdminLogin}
                >
                  {loginLoading ? 'ĐANG XỬ LÝ...' : '🔑 Admin (admin@washpro.vn)'}
                </button>
                <button
                  type="button"
                  className="aw-auth-quick-btn"
                  disabled={loginLoading}
                  onClick={handleQuickManagerLogin}
                  style={{ marginTop: '8px' }}
                >
                  {loginLoading ? 'ĐANG XỬ LÝ...' : '🏪 Manager (manager@washpro.vn)'}
                </button>
                <p className="aw-auth-quick-hint">
                  Admin: admin@washpro.vn / Admin123! &nbsp;|&nbsp; Manager: manager@washpro.vn / Manager123!
                </p>
              </div>
            </form>
          ) : (
            <form className="aw-auth-form" onSubmit={handleRegister}>
              <div className="aw-auth-two-col">
                <label>
                  Tên thành viên
                  <input value={regName} onChange={(event) => setRegName(event.target.value)} placeholder="Bảo Khang" />
                </label>

                <label>
                  Số điện thoại
                  <input value={regPhone} onChange={(event) => setRegPhone(event.target.value)} placeholder="0901234567" />
                </label>
              </div>

              <label>
                Email
                <input value={regEmail} onChange={(event) => setRegEmail(event.target.value)} placeholder="khachhang@mail.com" />
              </label>

              <label>
                Mật khẩu
                <div className="aw-auth-password">
                  <input type={showRegPass ? 'text' : 'password'} value={regPass} onChange={(event) => setRegPass(event.target.value)} placeholder="Nhập mật khẩu" />
                  <button type="button" onClick={() => setShowRegPass((value) => !value)}>{showRegPass ? 'Ẩn' : 'Hiện'}</button>
                </div>
              </label>

              <div className="aw-auth-vehicle-box">
                <div className="aw-auth-vehicle-title">Tạo xe mặc định sau khi đăng ký</div>
                <div className="aw-auth-two-col">
                  <label>
                    Biển số
                    <input value={regPlate} onChange={(event) => setRegPlate(normalizePlate(event.target.value))} placeholder="59F2-999.99" />
                  </label>

                  <label>
                    Hãng xe
                    <input value={regBrand} onChange={(event) => setRegBrand(event.target.value)} placeholder="Honda" />
                  </label>
                </div>

                <div className="aw-auth-two-col">
                  <label>
                    Dòng xe
                    <input value={regModel} onChange={(event) => setRegModel(event.target.value)} placeholder="SH 150i" />
                  </label>

                  <label>
                    Màu xe
                    <input value={regColor} onChange={(event) => setRegColor(event.target.value)} placeholder="Đen" />
                  </label>
                </div>

                <label>
                  Phân loại xe
                  <select value={regVehicleType} onChange={(event) => setRegVehicleType(event.target.value)}>
                    <option value="motorcycle">Xe máy</option>
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="pickup">Pickup</option>
                    <option value="van">Van</option>
                  </select>
                </label>
              </div>

              <button className="aw-auth-primary" type="submit" disabled={registerLoading}>
                {registerLoading ? 'ĐANG ĐĂNG KÝ...' : 'ĐĂNG KÝ VÀ VÀO LUỒNG ĐẶT LỊCH'}
              </button>
            </form>
          )}
        </section>
      </div>
    );
  }

  return <BookingFlow user={user} vehicles={vehicles} onLogout={handleLogout} apiBase={apiBase} token={token} />;
}