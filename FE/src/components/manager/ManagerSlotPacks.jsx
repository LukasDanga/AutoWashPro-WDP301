import { useEffect, useState, useCallback } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${getStoredToken()}`, ...opts.headers },
    ...opts,
  });
}

function formatCurrency(v) {
  return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`;
}

const STATUS_MAP = {
  active:    { label: 'Còn hiệu lực', cls: 'bg-emerald-50 text-emerald-700' },
  exhausted: { label: 'Đã dùng hết',  cls: 'bg-slate-100 text-slate-500' },
  expired:   { label: 'Hết hạn',      cls: 'bg-amber-50 text-amber-600' },
  cancelled: { label: 'Đã hủy',       cls: 'bg-red-50 text-red-500' },
};

const STATUS_TABS = [
  { key: '',           label: 'Tất cả' },
  { key: 'active',    label: 'Còn hiệu lực' },
  { key: 'exhausted', label: 'Đã dùng hết' },
  { key: 'expired',   label: 'Hết hạn' },
  { key: 'cancelled', label: 'Đã hủy' },
];

function SlotBar({ total, remaining }) {
  const pct = total > 0 ? (remaining / total) * 100 : 0;
  const color = pct > 50 ? '#10b981' : pct > 20 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
        <span>Còn lại</span>
        <span className="font-medium text-slate-600">{remaining}/{total} lượt</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full transition-all" />
      </div>
    </div>
  );
}

export default function ManagerSlotPacks({ user }) {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  const branchId = user?.branchId;

  const loadPacks = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ branchId });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api(`/slot-packs?${params}`);
      const data = await res.json();
      setPacks(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [branchId, statusFilter]);

  useEffect(() => { loadPacks(); }, [loadPacks]);

  async function handleLookup() {
    if (!lookupCode.trim()) return;
    setLookupLoading(true);
    setLookupResult(null);
    setLookupError('');
    try {
      const res = await api(`/slot-packs/code/${lookupCode.trim().toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không tìm thấy gói slot');
      setLookupResult(data.data || data);
    } catch (err) {
      setLookupError(err.message);
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleUseSlot(packId) {
    try {
      const res = await api(`/slot-packs/${packId}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi sử dụng slot');
      setLookupResult(data.data || data);
      loadPacks();
    } catch (err) {
      setLookupError(err.message);
    }
  }

  const filtered = packs;

  return (
    <div className="space-y-6">

      {/* Lookup by packCode */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Tra cứu gói theo mã</h3>
        <div className="flex gap-2">
          <input
            value={lookupCode}
            onChange={e => setLookupCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
            placeholder="Nhập mã gói (VD: SP-ABCD12)"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
          />
          <button onClick={handleLookup} disabled={lookupLoading || !lookupCode.trim()}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors disabled:opacity-50">
            {lookupLoading ? '...' : 'Tra cứu'}
          </button>
        </div>

        {lookupError && <p className="mt-2 text-sm text-red-500">{lookupError}</p>}

        {lookupResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-mono font-bold text-slate-800 text-base">{lookupResult.packCode}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {lookupResult.userId?.name || 'Khách hàng'} · {lookupResult.userId?.phone || ''}
                </div>
              </div>
              <span className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${STATUS_MAP[lookupResult.status]?.cls || 'bg-slate-100 text-slate-500'}`}>
                {STATUS_MAP[lookupResult.status]?.label || lookupResult.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-xs text-slate-400 block">Gói dịch vụ</span>
                <span className="font-medium text-slate-700">{lookupResult.packageId?.name || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Xe</span>
                <span className="font-medium text-slate-700">{lookupResult.vehicleId?.licensePlate || 'Tất cả xe'}</span>
              </div>
            </div>
            <SlotBar total={lookupResult.totalSlots} remaining={lookupResult.remainingSlots} />
            {lookupResult.status === 'active' && lookupResult.remainingSlots > 0 && (
              <button onClick={() => handleUseSlot(lookupResult._id)}
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors">
                Dùng 1 lượt (còn {lookupResult.remainingSlots})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter + List */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map(tab => (
            <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                statusFilter === tab.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
              }`}>
              {tab.label}
            </button>
          ))}
          <button onClick={loadPacks}
            className="shrink-0 ml-auto px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition-colors">
            Làm mới
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <span className="text-4xl">🎫</span>
            <p className="text-sm">Không có gói slot nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map(pack => {
              const st = STATUS_MAP[pack.status] || { label: pack.status, cls: 'bg-slate-100 text-slate-500' };
              return (
                <div key={pack._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-slate-800 text-sm">{pack.packCode}</div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        {pack.userId?.name || 'Khách hàng'}
                      </div>
                    </div>
                    <span className={`shrink-0 text-[11px] font-semibold rounded-full px-2 py-0.5 ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 space-y-0.5">
                    <div>Gói: <span className="font-medium text-slate-700">{pack.packageId?.name || '—'}</span></div>
                    <div>Xe: <span className="font-medium text-slate-700">{pack.vehicleId?.licensePlate || 'Tất cả xe'}</span></div>
                    <div>Giá: <span className="font-medium text-emerald-600">{formatCurrency(pack.finalPriceAfterVoucher ?? pack.finalPrice)}</span></div>
                    {pack.discountPercent > 0 && <div>Chiết khấu: <span className="font-medium text-emerald-600">-{pack.discountPercent}%</span></div>}
                  </div>

                  <SlotBar total={pack.totalSlots} remaining={pack.remainingSlots} />

                  <button onClick={() => setDetail(pack)}
                    className="w-full rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    Xem chi tiết
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setDetail(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 font-mono">{detail.packCode}</h2>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              {[
                ['Khách hàng', detail.userId?.name || '—'],
                ['Số điện thoại', detail.userId?.phone || '—'],
                ['Email', detail.userId?.email || '—'],
                ['Gói dịch vụ', detail.packageId?.name || '—'],
                ['Chi nhánh', detail.branchId?.name || '—'],
                ['Xe', detail.vehicleId?.licensePlate || 'Tất cả xe'],
                ['Tổng lượt', String(detail.totalSlots)],
                ['Đã dùng', String(detail.usedSlots)],
                ['Còn lại', String(detail.remainingSlots)],
                ['Thanh toán', detail.paymentStatus === 'paid' ? '✓ Đã thanh toán' : '⏳ Chờ thanh toán'],
                ['Giá cuối', formatCurrency(detail.finalPriceAfterVoucher ?? detail.finalPrice)],
                ['Hết hạn', detail.expiresAt ? new Date(detail.expiresAt).toLocaleDateString('vi-VN') : 'Không hết hạn'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 py-1.5 border-b border-slate-50">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-medium text-slate-700 text-right">{v}</span>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setDetail(null)}
                className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
