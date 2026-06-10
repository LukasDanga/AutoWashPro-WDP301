import React, { useEffect, useMemo, useState } from 'react';

export default function BookingsHistory({ apiBase, token }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${apiBase}/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Không thể tải lịch sử đặt chỗ');
        const payload = await res.json();
        const data = payload?.data || payload;
        if (mounted) setBookings(Array.isArray(data) ? data : []);
      } catch (err) {
        if (mounted) setError(err.message || 'Lỗi tải lịch sử');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [apiBase, token]);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter !== 'all' && (b.status || '').toLowerCase() !== statusFilter) return false;
      if (!text) return true;
      return [b.vehiclePlate, b.vehicleName, b.serviceName, b.bookingCode].some((f) => (f || '').toString().toLowerCase().includes(text));
    });
  }, [bookings, q, statusFilter]);

  async function loadDetail(id) {
    setSelected(null);
    try {
      const res = await fetch(`${apiBase}/bookings/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Không thể tải chi tiết');
      const payload = await res.json();
      setSelected(payload?.data || payload);
    } catch (err) {
      setError(err.message || 'Lỗi tải chi tiết');
    }
  }

  function clearSearch() {
    setQ('');
    setStatusFilter('all');
  }

  async function handleCancelGroup(groupId) {
    if (!window.confirm('Bạn có chắc muốn hủy TOÀN BỘ lịch hẹn chưa diễn ra trong chuỗi định kỳ này?')) return;
    try {
      const res = await fetch(`${apiBase}/bookings/recurring/${groupId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Không thể hủy chuỗi');
      alert('Đã hủy chuỗi định kỳ thành công.');
      
      // Tải lại lịch sử
      const resRefresh = await fetch(`${apiBase}/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await resRefresh.json();
      const data = payload?.data || payload;
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div>
      <div className="aw-card-section">
        <div className="aw-step-title"><span>•</span> LỊCH SỬ RỬA XE & TÌNH TRẠNG HÓA ĐƠN</div>
        <p className="aw-muted">Giám sát các đơn đặt phục vụ, viết đánh giá cho kỹ thuật viên.</p>

        <div className="aw-history-filters">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nhập biển số xe, tên dịch vụ..." />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option style={{ color: 'rgba(11,17,36,0.96)' }} value="all">Tất Cả Trạng Thái</option>
            <option style={{ color: 'rgba(11,17,36,0.96)' }} value="confirmed">Đã xác nhận</option>
            <option style={{ color: 'rgba(11,17,36,0.96)' }} value="pending">Chờ thanh toán</option>
            <option style={{ color: 'rgba(11,17,36,0.96)' }} value="cancelled">Đã hủy</option>
          </select>
          <button type="button" className="aw-clear" onClick={clearSearch}>Xóa Tìm Kiếm</button>
        </div>

        {loading ? <div className="aw-empty-state">Đang tải lịch sử...</div> : null}
        {error ? <div className="aw-auth-message error">{error}</div> : null}

        {!loading && filtered.length === 0 ? (
          <div className="aw-empty-state">
            <strong>Không tìm thấy đơn hàng.</strong>
            <p>Thử thay đổi từ khóa tìm kiếm hoặc tạo đơn mới.</p>
          </div>
        ) : null}

        {filtered.map((b) => (
          <div key={b._id || b.id} className="aw-history-card">
            <div className="aw-history-header">
              <div>
                <div className="aw-history-code">MÃ ĐƠN: <span>{b.bookingCode}</span></div>
                <div className="aw-history-branch">Gặp tại trung tâm: {b.branchName}</div>
              </div>
              <div className="aw-history-status">
                <div className={`aw-pill ${b.status === 'confirmed' ? 'pill-confirmed' : b.status === 'cancelled' ? 'pill-cancel' : b.status === 'paid' ? 'pill-paid' : b.status === 'completed' ? 'pill-completed' : 'pill-pending'}`}>{b.status?.toUpperCase() === 'CONFIRMED' ? 'Đã xác nhận' : b.status?.toUpperCase() === 'CANCELLED' ? 'Đã hủy' : b.status?.toUpperCase() === 'PAID' ? 'Đã thanh toán' : b.status?.toUpperCase() === 'COMPLETED' ? 'Đã hoàn thành' : 'Chờ xác nhận'}</div>
              </div>
            </div>

            <div className="aw-history-body">
              <div className="aw-history-grid">
                <div className="aw-history-col">
                  <small>KHUNG GIỜ HẸN</small>
                  <div className="aw-history-strong">{String(b.bookingDate).slice(0,10)} • {b.timeSlot}</div>
                </div>
                <div className="aw-history-col">
                  <small>BIỂN SỐ ĐĂNG KÝ</small>
                  <div className="aw-history-strong">{b.vehiclePlate}</div>
                </div>
                <div className="aw-history-col">
                  <small>GÓI DỊCH VỤ</small>
                  <div className="aw-history-strong">{b.serviceName}</div>
                </div>
                <div className="aw-history-col">
                  <small>TỔNG CHI TRẢ</small>
                  <div className="aw-history-strong amount">{b.totalAmount ? new Intl.NumberFormat('vi-VN').format(b.totalAmount) + 'đ' : ''}</div>
                </div>
              </div>
            </div>

            <div className="aw-history-footer">
              <div className="aw-history-pay">Phương thức t.toán: <strong>Tại quầy</strong> • Trạng thái: <strong className="text-highlight">{b.status === 'pending' ? 'Chờ thanh toán' : b.status === 'confirmed' ? 'Đã xác nhận' : b.status === 'paid' ? 'Đã thanh toán' : b.status === 'completed' ? 'Đã hoàn thành' : 'Chờ xác nhận'}</strong> • <span className="text-muted">tích lũy +{b.pointsEarned || 0} điểm</span></div>
              <div>
                <button className="aw-btn-cancel" type="button">Hủy đặt lịch</button>
                {b.bookingType === 'recurring' && b.recurringGroupId && ['pending', 'confirmed'].includes(b.status) && (
                  <button className="aw-btn-cancel" style={{ marginLeft: 8, borderColor: '#ef4444', color: '#ef4444' }} type="button" onClick={() => handleCancelGroup(b.recurringGroupId)}>Hủy toàn bộ chuỗi</button>
                )}
                {/* <button className="aw-btn-detail" type="button" onClick={() => loadDetail(b._id || b.id)}>Xem chi tiết</button> */}
              </div>
            </div>

            {selected && (selected._id === b._id || selected.id === b.id) ? (
              <div className="aw-booking-detail">
                <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(selected, null, 2)}</pre>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
