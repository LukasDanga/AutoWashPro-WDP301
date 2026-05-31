import React, { useMemo, useState } from 'react';
import '../styles.css';

export default function LoginRegister() {
    const [tab, setTab] = useState('login');
    const [loginPhone, setLoginPhone] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [showLoginPass, setShowLoginPass] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [loginSuccess, setLoginSuccess] = useState('');

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
    const [registerLoading, setRegisterLoading] = useState(false);
    const [registerError, setRegisterError] = useState('');
    const [registerSuccess, setRegisterSuccess] = useState('');

    const apiBase = useMemo(() => {
        return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    }, []);

    const normalizedPlate = regPlate
        .replace(/\s+/g, '')
        .toUpperCase();

    function quickFill() {
        setLoginPhone('0901234567');
        setLoginPass('password123');
        setLoginError('');
        setLoginSuccess('');
    }

    function formatPlate(value) {
        return value
            .replace(/[^0-9A-Za-z.-]/g, '')
            .toUpperCase();
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
                body: JSON.stringify({ identifier: loginPhone, password: loginPass }),
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
                    name: regName,
                    email: regEmail,
                    phone: regPhone,
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

            if (normalizedPlate) {
                const vehicleResponse = await fetch(`${apiBase}/vehicles`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
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
                    throw new Error(await readError(vehicleResponse));
                }
            }

            setRegisterSuccess('Đăng ký và tạo xe thành công.');
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
                        <label className="aw-label">Số điện thoại khách hàng</label>
                        <div className="aw-input"><span className="aw-icon">📞</span><input value={loginPhone} onChange={e => setLoginPhone(e.target.value)} placeholder="Mẫu : 0901234567" /></div>

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
                        <label className="aw-label">Tên thành viên</label>
                        <div className="aw-input"><span className="aw-icon">👤</span><input value={regName} onChange={e => setRegName(e.target.value)} placeholder="Tên của bạn..." /></div>

                        <label className="aw-label">Số điện thoại khách hàng</label>
                        <div className="aw-input"><span className="aw-icon">📞</span><input value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="Mẫu : 0901234567" /></div>

                        <label className="aw-label">Địa chỉ Email nhận phiếu thu</label>
                        <div className="aw-input"><span className="aw-icon">✉️</span><input value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="Mẫu: khachhang@mail.com" /></div>

                        <div className="plate-block">
                            <div className="plate-title">MÔ PHỎNG BIỂN XE MÁY SỐ HIỆU</div>
                            <div className="plate-preview">
                                <div className="plate-top">
                                    <span>T. PHỐ</span>
                                    <span className="plate-vn">★ VIỆT NAM</span>
                                </div>
                                <div className="plate-num">{normalizedPlate || '59F2-999.99'}</div>
                            </div>
                        </div>

                        <label className="aw-label">Mã số biển số</label>
                        <div className="aw-input"><span className="aw-icon">#</span><input value={regPlate} onChange={e => setRegPlate(formatPlate(e.target.value))} placeholder="59F2-999.99" /></div>

                        <div>
                            <label className="aw-label">Dòng xe máy</label>
                            <div className="aw-input"><span className="aw-icon">🛵</span><input value={regModel} onChange={e => setRegModel(e.target.value)} placeholder="SH 150i" /></div>
                        </div>
                        <div>
                            <label className="aw-label">Hãng sản xuất</label>
                            <div className="aw-input"><span className="aw-icon">🏍️</span><input value={regBrand} onChange={e => setRegBrand(e.target.value)} placeholder="Honda" /></div>
                        </div>

                        <div className="aw-grid-two">
                            <div>
                                <label className="aw-label">Phân loại xe</label>
                                <div className="aw-input"><span className="aw-icon">⚙️</span><select className="aw-select" value={regVehicleType} onChange={e => setRegVehicleType(e.target.value)}><option value="motorcycle">Tay ga</option><option value="sedan">Sedan</option><option value="suv">SUV</option><option value="pickup">Pickup</option><option value="van">Van</option></select></div>
                            </div>
                            <div>
                                <label className="aw-label">Màu xe</label>
                                <div className="aw-input"><span className="aw-icon">🎨</span><input value={regColor} onChange={e => setRegColor(e.target.value)} placeholder="Đen" /></div>
                            </div>
                        </div>

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
