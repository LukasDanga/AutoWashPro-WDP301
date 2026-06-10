import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Phone,
  LockKey,
  User,
  Envelope,
  CarProfile,
  Eye,
  EyeSlash,
  Storefront,
  IdentificationBadge,
  Crown,
  Diamond,
} from '@phosphor-icons/react';

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

export default function AuthScreen({ authLoading, onLogin, onRegister, onBack }) {
  const location = useLocation();
  const [authMode, setAuthMode] = useState('login');
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  const [authError, setAuthError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Login form state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Register form state
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);

  async function handleLogin(event) {
    if (event) event.preventDefault();
    setLoginLoading(true);
    setAuthError('');
    setStatusMessage('');

    try {
      await onLogin(loginPhone, loginPass);
      setStatusMessage('Đăng nhập thành công.');
    } catch (error) {
      setAuthError(error.message || 'Đăng nhập thất bại');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleQuickAdminLogin() {
    setLoginLoading(true);
    setAuthError('');
    setStatusMessage('');

    try {
      await onLogin(ADMIN_QUICK_LOGIN.identifier, ADMIN_QUICK_LOGIN.password, 'admin');
    } catch (error) {
      setAuthError(error.message || 'Đăng nhập admin thất bại. Chạy seed backend trước.');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleQuickManagerLogin() {
    setLoginLoading(true);
    setAuthError('');
    setStatusMessage('');

    try {
      await onLogin(MANAGER_QUICK_LOGIN.identifier, MANAGER_QUICK_LOGIN.password, 'manager');
    } catch (error) {
      setAuthError(error.message || 'Đăng nhập manager thất bại. Chạy seed-manager.js trước.');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleQuickCustomerLogin(phone, pass) {
    setLoginPhone(phone);
    setLoginPass(pass);
    setLoginLoading(true);
    setAuthError('');
    setStatusMessage('');

    try {
      await onLogin(phone, pass);
      setStatusMessage('Đăng nhập thành công.');
    } catch (error) {
      setAuthError(error.message || 'Đăng nhập thất bại');
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
      const data = {
        email: regEmail,
        password: regPass,
      };

      await onRegister(data);
      setStatusMessage('Đăng ký thành công, đang mở luồng đặt lịch.');
    } catch (error) {
      setAuthError(error.message || 'Đăng ký thất bại');
    } finally {
      setRegisterLoading(false);
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

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* ── Left Side: Brand Showcase ── */}
      <div className="hidden w-1/2 flex-col justify-between bg-slate-950 p-12 text-white lg:flex relative overflow-hidden">
        {/* Decorative Gradients */}
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-purple-600/20 blur-[100px]" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-3xl shadow-lg shadow-blue-500/40">
            💧
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest text-slate-100">AUTOWASH PRO</h1>
            <span className="inline-block mt-1 rounded-full bg-blue-500/20 px-3 py-0.5 border border-blue-500/30 text-[10px] font-bold tracking-widest text-blue-300">
              CLIENT HUB
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-5xl font-extrabold leading-tight tracking-tight">
            Dịch vụ chăm sóc xe <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">thế hệ mới.</span>
          </h2>
          <p className="mt-6 text-lg text-slate-400 leading-relaxed">
            Trải nghiệm đặt lịch nhanh chóng, quản lý phương tiện thông minh và nhận các ưu đãi độc quyền dành riêng cho bạn.
          </p>
        </div>

        <div className="relative z-10 text-sm font-medium text-slate-600">
          &copy; 2026 AutoWash Pro. All rights reserved.
        </div>
      </div>

      {/* ── Right Side: Form Container ── */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-20 xl:px-32 relative">
        <div className="mx-auto w-full max-w-md">

          {/* Mobile Header */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl shadow-md">
              💧
            </div>
            <h1 className="text-xl font-bold tracking-widest text-slate-800">AUTOWASH PRO</h1>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="mb-6 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Quay lại
            </button>
          )}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900">
              {authMode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản'}
            </h2>
            <p className="mt-2 text-slate-500">
              {authMode === 'login' ? 'Vui lòng đăng nhập để tiếp tục đặt lịch.' : 'Đăng ký nhanh để trải nghiệm dịch vụ.'}
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-8 flex rounded-xl bg-slate-200/50 p-1">
            <button
              type="button"
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${authMode === 'login' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setAuthMode('login'); setAuthError(''); setStatusMessage(''); }}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${authMode === 'register' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setAuthMode('register'); setAuthError(''); setStatusMessage(''); }}
            >
              Đăng ký
            </button>
          </div>

          {/* Alerts */}
          {location.state?.adminAuthError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {location.state.adminAuthError}
            </div>
          )}
          {authError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {authError}
            </div>
          )}
          {statusMessage && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-600">
              {statusMessage}
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tài khoản</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                    <User size={20} weight="duotone" />
                  </div>
                  <input
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    placeholder="Số điện thoại hoặc Email"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Mật khẩu</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                    <LockKey size={20} weight="duotone" />
                  </div>
                  <input
                    type={showLoginPass ? 'text' : 'password'}
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-sm text-slate-800 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass(!showLoginPass)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showLoginPass ? <EyeSlash size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="mt-2 w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-700 hover:shadow-blue-600/40 focus:ring-4 focus:ring-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loginLoading ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                    <Envelope size={20} weight="duotone" />
                  </div>
                  <input
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="khachhang@mail.com"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Mật khẩu</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                    <LockKey size={20} weight="duotone" />
                  </div>
                  <input
                    type={showRegPass ? 'text' : 'password'}
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-sm text-slate-800 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPass(!showRegPass)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showRegPass ? <EyeSlash size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={registerLoading}
                className="mt-2 w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-700 hover:shadow-blue-600/40 focus:ring-4 focus:ring-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {registerLoading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG KÝ'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
