import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Phone,
  LockKey,
  User,
  Envelope,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import Label from '@/components/ui/label';
import { cn } from '@/lib/utils';

const ADMIN_QUICK_LOGIN = { identifier: 'admin@washpro.vn', password: 'Admin123!' };
const MANAGER_QUICK_LOGIN = { identifier: 'manager@washpro.vn', password: 'Manager123!' };

function BottomGradient() {
  return (
    <>
      <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
      <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
    </>
  );
}

function LabelInputContainer({ children, className }) {
  return <div className={cn('flex w-full flex-col space-y-2', className)}>{children}</div>;
}

export default function AuthScreen({ authLoading, onLogin, onRegister, onBack }) {
  const location = useLocation();
  const [authMode, setAuthMode] = useState('login');
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);

  async function handleLogin(event) {
    if (event) event.preventDefault();
    setLoginLoading(true); setAuthError(''); setStatusMessage('');
    try { await onLogin(loginPhone, loginPass); setStatusMessage('Đăng nhập thành công.'); }
    catch (error) { setAuthError(error.message || 'Đăng nhập thất bại'); }
    finally { setLoginLoading(false); }
  }

  async function handleQuickAdminLogin() {
    setLoginLoading(true); setAuthError(''); setStatusMessage('');
    try { await onLogin(ADMIN_QUICK_LOGIN.identifier, ADMIN_QUICK_LOGIN.password, 'admin'); }
    catch (error) { setAuthError(error.message || 'Đăng nhập admin thất bại.'); }
    finally { setLoginLoading(false); }
  }

  async function handleQuickManagerLogin() {
    setLoginLoading(true); setAuthError(''); setStatusMessage('');
    try { await onLogin(MANAGER_QUICK_LOGIN.identifier, MANAGER_QUICK_LOGIN.password, 'manager'); }
    catch (error) { setAuthError(error.message || 'Đăng nhập manager thất bại.'); }
    finally { setLoginLoading(false); }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setRegisterLoading(true); setAuthError(''); setStatusMessage('');
    try {
      await onRegister({ email: regEmail, password: regPass });
      setStatusMessage('Đăng ký thành công, đang mở luồng đặt lịch.');
    } catch (error) { setAuthError(error.message || 'Đăng ký thất bại'); }
    finally { setRegisterLoading(false); }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-800 border-t-emerald-500" />
          <p className="text-sm font-semibold text-neutral-400">Đang kiểm tra phiên đăng nhập...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <div className="hidden w-1/2 flex-col justify-between p-12 lg:flex relative overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-emerald-600/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-emerald-400/10 blur-[120px]" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-3xl shadow-lg shadow-emerald-500/30">
            🚗
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest text-neutral-100">AUTOWASH PRO</h1>
            <span className="inline-block mt-1 rounded-full bg-emerald-500/20 px-3 py-0.5 border border-emerald-500/30 text-[10px] font-bold tracking-widest text-emerald-300">
              CLIENT HUB
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-5xl font-extrabold leading-tight tracking-tight">
            Dịch vụ chăm sóc xe <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">thế hệ mới.</span>
          </h2>
          <p className="mt-6 text-lg text-neutral-500 leading-relaxed">
            Trải nghiệm đặt lịch nhanh chóng, quản lý phương tiện thông minh và nhận các ưu đãi độc quyền dành riêng cho bạn.
          </p>
        </div>

        <div className="relative z-10 text-sm font-medium text-neutral-700">
          &copy; 2026 AutoWash Pro. All rights reserved.
        </div>
      </div>

      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-20 xl:px-32 relative">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xl shadow-md">
              🚗
            </div>
            <h1 className="text-xl font-bold tracking-widest text-neutral-100">AUTOWASH PRO</h1>
          </div>

          {onBack && (
            <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Quay lại
            </button>
          )}

          <div className="shadow-input mx-auto w-full max-w-md rounded-2xl bg-neutral-900/50 border border-neutral-800 p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-neutral-100">
              {authMode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản'}
            </h2>
            <p className="mt-2 max-w-sm text-sm text-neutral-400">
              {authMode === 'login' ? 'Đăng nhập để tiếp tục đặt lịch.' : 'Đăng ký nhanh để trải nghiệm dịch vụ.'}
            </p>

            <div className="my-6 flex rounded-lg bg-neutral-800/50 p-1">
              <button
                type="button"
                className={cn('flex-1 rounded-lg py-2 text-sm font-semibold transition-all', authMode === 'login' ? 'bg-neutral-700 text-neutral-100 shadow-sm' : 'text-neutral-400 hover:text-neutral-200')}
                onClick={() => { setAuthMode('login'); setAuthError(''); setStatusMessage(''); }}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className={cn('flex-1 rounded-lg py-2 text-sm font-semibold transition-all', authMode === 'register' ? 'bg-neutral-700 text-neutral-100 shadow-sm' : 'text-neutral-400 hover:text-neutral-200')}
                onClick={() => { setAuthMode('register'); setAuthError(''); setStatusMessage(''); }}
              >
                Đăng ký
              </button>
            </div>

            {location.state?.adminAuthError && (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{location.state.adminAuthError}</div>
            )}
            {authError && (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{authError}</div>
            )}
            {statusMessage && (
              <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">{statusMessage}</div>
            )}

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <LabelInputContainer>
                  <Label htmlFor="login-phone">Tài khoản</Label>
                  <Input
                    id="login-phone"
                    placeholder="Số điện thoại hoặc Email"
                    type="text"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                  />
                </LabelInputContainer>
                <LabelInputContainer>
                  <Label htmlFor="login-pass">Mật khẩu</Label>
                  <div className="relative">
                    <Input
                      id="login-pass"
                      placeholder="••••••••"
                      type={showLoginPass ? 'text' : 'password'}
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPass(!showLoginPass)}
                      className="absolute inset-y-0 right-3 flex items-center text-neutral-500 hover:text-emerald-400 transition-colors z-10"
                    >
                      {showLoginPass ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </LabelInputContainer>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-emerald-600 to-emerald-800 font-medium text-white shadow-[0px_1px_0px_0px_#ffffff20_inset,0px_-1px_0px_0px_#ffffff20_inset] hover:from-emerald-500 hover:to-emerald-700 transition-all disabled:opacity-60"
                >
                  {loginLoading ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP →'}
                  <BottomGradient />
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5">
                <LabelInputContainer>
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    placeholder="khachhang@mail.com"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                </LabelInputContainer>
                <LabelInputContainer>
                  <Label htmlFor="reg-pass">Mật khẩu</Label>
                  <div className="relative">
                    <Input
                      id="reg-pass"
                      placeholder="••••••••"
                      type={showRegPass ? 'text' : 'password'}
                      value={regPass}
                      onChange={(e) => setRegPass(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPass(!showRegPass)}
                      className="absolute inset-y-0 right-3 flex items-center text-neutral-500 hover:text-emerald-400 transition-colors z-10"
                    >
                      {showRegPass ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </LabelInputContainer>
                <button
                  type="submit"
                  disabled={registerLoading}
                  className="group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-emerald-600 to-emerald-800 font-medium text-white shadow-[0px_1px_0px_0px_#ffffff20_inset,0px_-1px_0px_0px_#ffffff20_inset] hover:from-emerald-500 hover:to-emerald-700 transition-all disabled:opacity-60"
                >
                  {registerLoading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG KÝ →'}
                  <BottomGradient />
                </button>
              </form>
            )}

            <div className="my-6 h-[1px] w-full bg-gradient-to-r from-transparent via-neutral-700 to-transparent" />

            <div className="space-y-3">
              <p className="text-xs text-neutral-500 text-center">Đăng nhập nhanh</p>
              <button
                onClick={handleQuickAdminLogin}
                disabled={loginLoading}
                className="group/btn shadow-input relative flex h-10 w-full items-center justify-center space-x-2 rounded-md bg-neutral-800 px-4 text-sm font-medium text-neutral-300 hover:bg-neutral-700 transition-colors disabled:opacity-60"
              >
                <span>Đăng nhập Admin</span>
                <BottomGradient />
              </button>
              <button
                onClick={handleQuickManagerLogin}
                disabled={loginLoading}
                className="group/btn shadow-input relative flex h-10 w-full items-center justify-center space-x-2 rounded-md bg-neutral-800 px-4 text-sm font-medium text-neutral-300 hover:bg-neutral-700 transition-colors disabled:opacity-60"
              >
                <span>Đăng nhập Manager</span>
                <BottomGradient />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
