import React, { useState } from 'react';
import './styles.css';

export default function LoginRegister() {
  const [tab, setTab] = useState('login');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');

  return (
    <div className="aw-frame">
      <div className="aw-card">
        <div className="aw-brand">
          <div className="aw-logo">💧</div>
          <h1>AUTOWASH APP</h1>
          <p className="aw-tag">Tích điểm rửa xe cao cấp bọt khí sạch, đồng bộ tức thời dịch vụ cho xế yêu.</p>
        </div>

        <div className="aw-tabs">
          <button className={tab==='login'? 'aw-tab active':'aw-tab'} onClick={()=>setTab('login')}>ĐĂNG NHẬP</button>
          <button className={tab==='register'? 'aw-tab active':'aw-tab'} onClick={()=>setTab('register')}>ĐĂNG KÝ</button>
        </div>

        {tab === 'login' && (
          <div className="aw-panel">
            <label className="aw-label">Số điện thoại khách hàng</label>
            <div className="aw-input"><span className="aw-icon">📞</span><input value={loginPhone} onChange={e=>setLoginPhone(e.target.value)} placeholder="Mẫu : 0901234567"/></div>

            <label className="aw-label">Mật khẩu truy cập</label>
            <div className="aw-input"><span className="aw-icon">🔒</span><input type="password" value={loginPass} onChange={e=>setLoginPass(e.target.value)} placeholder="Nhập 8+ ký tự..."/></div>

            <button className="aw-primary" onClick={()=>alert('Đăng nhập demo: '+loginPhone)}>ĐĂNG NHẬP →</button>
          </div>
        )}

        {tab === 'register' && (
          <div className="aw-panel">
            <label className="aw-label">Tên thành viên</label>
            <div className="aw-input"><span className="aw-icon">👤</span><input value={regName} onChange={e=>setRegName(e.target.value)} placeholder="Tên của bạn..."/></div>

            <label className="aw-label">Số điện thoại khách hàng</label>
            <div className="aw-input"><span className="aw-icon">📞</span><input value={regPhone} onChange={e=>setRegPhone(e.target.value)} placeholder="Mẫu : 0901234567"/></div>

            <label className="aw-label">Địa chỉ Email nhận phiếu thu</label>
            <div className="aw-input"><span className="aw-icon">✉️</span><input value={regEmail} onChange={e=>setRegEmail(e.target.value)} placeholder="Mẫu: khachhang@mail.com"/></div>

            <label className="aw-label">Mật khẩu truy cập</label>
            <div className="aw-input"><span className="aw-icon">🔒</span><input type="password" value={regPass} onChange={e=>setRegPass(e.target.value)} placeholder="Nhập 8+ ký tự..."/></div>

            <button className="aw-primary" onClick={()=>alert('Đăng ký demo: '+regName)}>KÍCH HOẠT TÀI KHOẢN →</button>
          </div>
        )}

      </div>
    </div>
  );
}
