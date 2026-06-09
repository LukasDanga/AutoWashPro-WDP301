import React, { useMemo, useState } from 'react';
import '../styles.css';

export default function LoginRegister() {
    const [tab, setTab] = useState('login');
    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [showLoginPass, setShowLoginPass] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [loginSuccess, setLoginSuccess] = useState('');

    const [regEmail, setRegEmail] = useState('');
    const [regPass, setRegPass] = useState('');
    const [showRegPass, setShowRegPass] = useState(false);
    const [registerLoading, setRegisterLoading] = useState(false);
    const [registerError, setRegisterError] = useState('');
    const [registerSuccess, setRegisterSuccess] = useState('');

    const apiBase = useMemo(() => {
        return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    }, []);



    function quickFill() {
        setLoginIdentifier('0901234567');
        setLoginPass('password123');
        setLoginError('');
        setLoginSuccess('');
    }

    async function readError(response) {
        try {
            const payload = await response.json();
            return payload?.message || payload?.error || 'Request failed';
        } catch {
            return 'Request failed';
        }
    }

    async function handleLogin() {
        setLoginLoading(true);
        setLoginError('');
        setLoginSuccess('');

        try {
            const response = await fetch(`${apiBase}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: loginIdentifier, password: loginPass }),
            });

            if (!response.ok) {
                throw new Error(await readError(response));
            }

            const payload = await response.json();
            const data = payload?.data || payload;
            if (data?.accessToken) {
                localStorage.setItem('aw_accessToken', data.accessToken);
                localStorage.setItem('aw_refreshToken', data.refreshToken || '');
            }
            setLoginSuccess('Đăng nhập thành công.');
        } catch (error) {
            setLoginError(error.message || 'Đăng nhập thất bại');
        } finally {
            setLoginLoading(false);
        }
    }

    async function handleRegister() {
        setRegisterLoading(true);
        setRegisterError('');
        setRegisterSuccess('');

        try {
            const registerResponse = await fetch(`${apiBase}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: regEmail,
                    password: regPass,
                }),
            });

            if (!registerResponse.ok) {
                throw new Error(await readError(registerResponse));
            }

            const registerPayload = await registerResponse.json();
            const registerData = registerPayload?.data || registerPayload;
            const accessToken = registerData?.accessToken;
            if (accessToken) {
                localStorage.setItem('aw_accessToken', accessToken);
                localStorage.setItem('aw_refreshToken', registerData?.refreshToken || '');
            }

            setRegisterSuccess('Đăng ký tài khoản thành công.');
        } catch (error) {
            setRegisterError(error.message || 'Đăng ký thất bại');
        } finally {
            setRegisterLoading(false);
        }
    }

    return (
        <div className="aw-frame">
            <div className="aw-card">
                <div className="aw-brand">
                    <div className="aw-logo">💧</div>
                    <h1>AUTOWASH APP</h1>
                    <p className="aw-tag">Tích điểm rửa xe cao cấp bọt khí sạch, đồng bộ tức thời dịch vụ cho xế yêu.</p>
                </div>

                <div className="aw-tabs">
                    <button className={tab === 'login' ? 'aw-tab active' : 'aw-tab'} onClick={() => setTab('login')}>ĐĂNG NHẬP</button>
                    <button className={tab === 'register' ? 'aw-tab active' : 'aw-tab'} onClick={() => setTab('register')}>ĐĂNG KÝ</button>
                </div>

                {tab === 'login' && (
                    <div className="aw-panel">
                        <label className="aw-label">Số điện thoại hoặc Email</label>
                        <div className="aw-input"><span className="aw-icon">📞</span><input value={loginIdentifier} onChange={e => setLoginIdentifier(e.target.value)} placeholder="0901234567 hoặc mail@..." /></div>

                        <label className="aw-label">Mật khẩu truy cập</label>
                        <div className="aw-input"><span className="aw-icon">🔒</span>
                            <input type={showLoginPass ? 'text' : 'password'} value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="Nhập 8+ ký tự..." />
                            <button className="eye" onClick={() => setShowLoginPass(s => !s)}>{showLoginPass ? '🙈' : '👁️'}</button>
                        </div>

                        {loginError ? <div className="aw-message error">{loginError}</div> : null}
                        {loginSuccess ? <div className="aw-message success">{loginSuccess}</div> : null}

                        <button className="aw-primary" onClick={handleLogin} disabled={loginLoading}>
                            {loginLoading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP →'}
                        </button>

                        <div className="quick" style={{ marginTop: 16 }}>
                            <div className="quick-title">ĐĂNG NHẬP NHANH (QUICK FILL)</div>
                            <div className="quick-card">
                                <div>
                                    <div className="q-title">Khách VIP: Bảo Khang</div>
                                    <div className="q-sub">SĐT : 0901234567</div>
                                </div>
                                <button className="outline" onClick={quickFill}>Thử nghiệm</button>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'register' && (
                    <div className="aw-panel">
                        <label className="aw-label">Địa chỉ Email</label>
                        <div className="aw-input"><span className="aw-icon">✉️</span><input value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="Mẫu: khachhang@mail.com" /></div>

                        <label className="aw-label">Mật khẩu truy cập</label>
                        <div className="aw-input"><span className="aw-icon">🔒</span>
                            <input type={showRegPass ? 'text' : 'password'} value={regPass} onChange={e => setRegPass(e.target.value)} placeholder="Nhập 8+ ký tự..." />
                            <button className="eye" onClick={() => setShowRegPass(s => !s)}>{showRegPass ? '🙈' : '👁️'}</button>
                        </div>

                        {registerError ? <div className="aw-message error">{registerError}</div> : null}
                        {registerSuccess ? <div className="aw-message success">{registerSuccess}</div> : null}

                        <button className="aw-primary" onClick={handleRegister} disabled={registerLoading}>
                            {registerLoading ? 'ĐANG XỬ LÝ...' : 'KÍCH HOẠT TÀI KHOẢN →'}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
