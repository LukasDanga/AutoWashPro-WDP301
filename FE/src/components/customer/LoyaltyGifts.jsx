import React, { useState, useEffect } from 'react';
import { Gift, Coins, CaretRight, Star, Tag, Ticket, CheckCircle } from '@phosphor-icons/react';
import { confirmDialog } from '@/lib/confirm';

export default function LoyaltyGifts({ apiBase, token, user, refreshUser }) {
  const [vouchers, setVouchers] = useState([]);
  const [myVouchers, setMyVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('exchange');

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const resTpl = await fetch(`${apiBase}/vouchers/available`, { headers: { Authorization: `Bearer ${token}` } });
      const dataTpl = await resTpl.json();
      const allVouchers = dataTpl.data || [];
      const templates = allVouchers.filter(v => v.isTemplate && v.requiredPoints > 0);
      setVouchers(templates);
      const resMy = await fetch(`${apiBase}/vouchers/me`, { headers: { Authorization: `Bearer ${token}` } });
      const dataMy = await resMy.json();
      setMyVouchers(dataMy.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVouchers(); }, [apiBase, token]);

  const handleRedeem = async (templateId) => {
    if (!(await confirmDialog({ title: 'Đổi điểm lấy voucher', message: 'Bạn có chắc chắn muốn đổi điểm lấy voucher này?', confirmLabel: 'Đổi điểm' }))) return;
    setRedeemLoading(true); setMessage('');
    try {
      const res = await fetch(`${apiBase}/vouchers/redeem-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ templateId })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Lỗi đổi điểm');
      setMessage('✅ Đổi Voucher thành công!');
      fetchVouchers();
      if (refreshUser) refreshUser();
    } catch (err) { setMessage(`❌ ${err.message}`); }
    finally { setRedeemLoading(false); setTimeout(() => setMessage(''), 5000); }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val) + 'đ';

  const getTierColor = (tier) => {
    switch (tier) {
      case 'bronze': return '#b45309';
      case 'silver': return '#64748b';
      case 'gold': return '#b45309';
      case 'diamond': return '#0891b2';
      default: return '#b45309';
    }
  };

  const getNextTier = (tier) => {
    switch (tier) {
      case 'bronze': return { name: 'Bạc', points: 100000 };
      case 'silver': return { name: 'Vàng', points: 500000 };
      case 'gold': return { name: 'Kim Cương', points: 1000000 };
      case 'diamond': return { name: 'Tối đa', points: 1000000 };
      default: return { name: 'Bạc', points: 100000 };
    }
  };

  const nextTier = getNextTier(user?.tier);
  const progress = user?.tier === 'diamond' ? 100 : Math.min(100, ((user?.lifetimePoints || 0) / nextTier.points) * 100);

  return (
    <div className="aw-loyalty-container" style={{ padding: '24px' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .tier-card {
          background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
          border-radius: 16px; padding: 24px; color: #1e293b;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06); position: relative; overflow: hidden;
          margin-bottom: 32px; border: 1px solid rgba(16,185,129,0.15);
        }
        .tier-card::before {
          content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(circle, rgba(16,185,129,0.04), transparent 60%); transform: rotate(30deg);
        }
        .tier-header { display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 2; }
        .tier-badge {
          display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; border-radius: 30px;
          background: #f0fdf4; border: 1px solid rgba(16,185,129,0.2);
          font-weight: 700; text-transform: uppercase; font-size: 0.9rem;
        }
        .points-display { font-size: 3rem; font-weight: 800; margin: 16px 0 8px; letter-spacing: -1px; display: flex; align-items: baseline; gap: 8px; position: relative; z-index: 2; }
        .points-label { font-size: 1rem; color: #64748b; font-weight: 500; }
        .progress-container { margin-top: 24px; position: relative; z-index: 2; }
        .progress-bar-bg { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
        .progress-bar-fill { height: 100%; border-radius: 4px; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); }
        .progress-text { display: flex; justify-content: space-between; font-size: 0.85rem; color: #64748b; }
        .tabs { display: flex; gap: 16px; margin-bottom: 24px; border-bottom: 1px solid rgba(16,185,129,0.15); padding-bottom: 16px; }
        .tab-btn {
          background: transparent; border: none; color: #64748b; font-size: 1.1rem; font-weight: 600;
          cursor: pointer; padding: 8px 16px; border-radius: 8px; transition: all 0.2s;
        }
        .tab-btn.active { color: #10b981; background: rgba(16,185,129,0.08); }
        .tab-btn:hover:not(.active) { color: #1e293b; }
        .voucher-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
        .v-card {
          background: #ffffff; border-radius: 12px; border: 1px solid rgba(16,185,129,0.15);
          padding: 20px; display: flex; flex-direction: column; gap: 12px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .v-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); border-color: #10b981; }
        .v-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .v-title { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
        .v-code { font-size: 0.8rem; color: #10b981; background: rgba(16,185,129,0.08); padding: 4px 8px; border-radius: 4px; font-weight: 700; }
        .v-desc { color: #64748b; font-size: 0.9rem; line-height: 1.5; flex-grow: 1; }
        .v-meta { display: flex; gap: 12px; font-size: 0.8rem; color: #94a3b8; margin-top: auto; }
        .v-meta div { display: flex; align-items: center; gap: 4px; }
        .v-btn {
          width: 100%; padding: 12px; border-radius: 8px; font-weight: 700; border: none;
          cursor: pointer; transition: all 0.2s; display: flex; justify-content: center; align-items: center; gap: 8px;
        }
        .v-btn-primary { background: #10b981; color: white; }
        .v-btn-primary:hover:not(:disabled) { background: #059669; }
        .v-btn-primary:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; }
        .v-btn-secondary { background: rgba(16,185,129,0.08); color: #1e293b; }
        .v-btn-secondary:hover { background: rgba(16,185,129,0.15); }
        .toast-msg {
          position: fixed; bottom: 24px; right: 24px; background: #ffffff; border: 1px solid rgba(16,185,129,0.2);
          color: #059669; padding: 16px 24px; border-radius: 8px; font-weight: 600;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1); z-index: 9999; animation: slideUp 0.3s;
        }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {message && <div className="toast-msg">{message}</div>}

      <div className="tier-card">
        <div className="tier-header">
          <div className="tier-badge" style={{ color: getTierColor(user?.tier) }}>
            <Star weight="fill" /> Hạng {user?.tier?.toUpperCase()}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
            <Gift weight="duotone" size={20} style={{ verticalAlign: 'middle', marginRight: 4 }}/> Cửa hàng quà tặng
          </div>
        </div>
        <div className="points-display">
          {new Intl.NumberFormat('vi-VN').format(user?.loyaltyPoints || 0)}
          <span className="points-label">AW Points</span>
        </div>
        <div className="progress-container">
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progress}%`, background: '#10b981' }} />
          </div>
          <div className="progress-text">
            <span>Đã tích lũy: {formatCurrency(user?.lifetimePoints || 0)}</span>
            {user?.tier !== 'diamond' && (
              <span>Cần thêm {formatCurrency(nextTier.points - (user?.lifetimePoints || 0))} để lên hạng {nextTier.name}</span>
            )}
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'exchange' ? 'active' : ''}`} onClick={() => setActiveTab('exchange')}>Đổi Điểm Lấy Quà</button>
        <button className={`tab-btn ${activeTab === 'my-vouchers' ? 'active' : ''}`} onClick={() => setActiveTab('my-vouchers')}>Quà Tặng Của Tôi</button>
      </div>

      {loading ? (
        <div style={{ color: '#64748b', padding: '40px 0', textAlign: 'center' }}>Đang tải dữ liệu...</div>
      ) : activeTab === 'exchange' ? (
        <div className="voucher-grid">
          {vouchers.length === 0 ? (
            <div style={{ color: '#94a3b8', gridColumn: '1 / -1' }}>Chưa có voucher nào khả dụng để đổi điểm lúc này.</div>
          ) : (
            vouchers.map(v => (
              <div key={v._id} className="v-card">
                <div className="v-header">
                  <div>
                    <div className="v-title">{v.name}</div>
                    <div className="v-code">{v.code}</div>
                  </div>
                  <div style={{ background: 'rgba(16,185,129,0.08)', padding: '6px 12px', borderRadius: '20px', fontWeight: '700', color: '#10b981', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Coins weight="fill" /> {new Intl.NumberFormat('vi-VN').format(v.requiredPoints)}
                  </div>
                </div>
                <div className="v-desc">{v.description}</div>
                <div className="v-meta">
                  {v.applicableTiers?.length > 0 && <div><Star /> Dành cho: {v.applicableTiers.join(', ')}</div>}
                  <div><Ticket /> Còn lại: {v.remaining}</div>
                </div>
                <button className="v-btn v-btn-primary"
                  disabled={redeemLoading || (user?.loyaltyPoints || 0) < v.requiredPoints || v.remaining <= 0}
                  onClick={() => handleRedeem(v._id)}>
                  {(user?.loyaltyPoints || 0) < v.requiredPoints ? 'Không Đủ Điểm' : redeemLoading ? 'Đang Xử Lý...' : 'Đổi Ngay'} <CaretRight weight="bold" />
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="voucher-grid">
          {myVouchers.length === 0 ? (
            <div style={{ color: '#94a3b8', gridColumn: '1 / -1' }}>Bạn chưa có Voucher nào.</div>
          ) : (
            myVouchers.map(uv => {
              const v = uv.voucherId;
              if (!v) return null;
              return (
                <div key={uv._id} className="v-card" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
                  <div className="v-header">
                    <div>
                      <div className="v-title">{v.name}</div>
                      <div className="v-code" style={{ fontSize: '1rem' }}>{v.code}</div>
                    </div>
                    <CheckCircle weight="fill" size={24} color="#10b981" />
                  </div>
                  <div className="v-desc">{v.description}</div>
                  <div className="v-meta">
                    <div><Tag /> HSD: {new Date(v.endDate).toLocaleDateString('vi-VN')}</div>
                  </div>
                  <button className="v-btn v-btn-secondary" onClick={() => {
                    navigator.clipboard.writeText(v.code);
                    setMessage('Đã copy mã voucher!');
                    setTimeout(() => setMessage(''), 2000);
                  }}>Copy Mã Khuyến Mãi</button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
