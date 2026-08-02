import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '@/lib/toast';
import {
  ArrowLeft,
  CheckCircle,
  Coin,
  Plus,
  FloppyDisk,
  Trophy,
  Trash,
  Warning,
  XCircle,
  MagnifyingGlass,
  X,
  Palette,
  Clock,
  ShieldCheck,
  PencilSimple,
  Info,
} from '@phosphor-icons/react';
import TierBadge, { COLOR_PALETTE, ICON_CATALOG, RenderIcon } from '@/components/ui/TierBadge';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getStoredToken()}`, ...opts.headers },
  });
}

async function readErr(res) {
  try { const j = await res.json(); return j?.message || `Lỗi ${res.status}`; } catch { return `Lỗi ${res.status}`; }
}

function Spinner({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" className="animate-spin" aria-hidden>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function IconPickerModal({ isOpen, onClose, onSelect, currentIcon }) {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredIcons = ICON_CATALOG.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 relative border border-slate-100 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-amber-500" weight="fill" />
            <h3 className="text-base font-extrabold text-slate-800">Thư viện Biểu tượng Hạng (Icon Catalog)</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative">
          <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm icon (vd: Vương miện, Kim cương, Cúp...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {filteredIcons.map((item) => {
              const isSelected = currentIcon === item.name;
              const IconComp = item.icon;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    onSelect(item.name);
                    onClose();
                  }}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-center transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/80 text-blue-700 font-bold ring-2 ring-blue-400/20'
                      : 'border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-700'}`}>
                    <IconComp size={22} weight="fill" />
                  </div>
                  <span className="text-[11px] truncate w-full font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function computeDiff(initialForm, form) {
  if (!initialForm) return { isBaseRateChanged: false, isExpirationChanged: false, tierDiffs: [], hasAnyChanges: false };

  const isBaseRateChanged = Number(initialForm.baseEarningRate) !== Number(form.baseEarningRate);
  const isExpirationChanged = Number(initialForm.pointExpirationMonths) !== Number(form.pointExpirationMonths);

  const initialTiersMap = new Map((initialForm.tiers || []).map((t) => [t.id, t]));
  const currentTiersMap = new Map((form.tiers || []).map((t) => [t.id, t]));

  const tierDiffs = [];

  // Check added & modified tiers
  (form.tiers || []).forEach((t) => {
    const initT = initialTiersMap.get(t.id);
    if (!initT) {
      tierDiffs.push({
        status: 'added',
        tier: t,
        label: 'Hạng mới thêm',
      });
    } else {
      const changes = [];
      if (initT.name !== t.name) changes.push(`Tên hiển thị: "${initT.name}" → "${t.name}"`);
      if (Number(initT.minPoints) !== Number(t.minPoints))
        changes.push(`Mốc thăng hạng: ${Number(initT.minPoints).toLocaleString('vi-VN')} điểm → ${Number(t.minPoints).toLocaleString('vi-VN')} điểm`);
      if (Number(initT.multiplier) !== Number(t.multiplier)) changes.push(`Hệ số nhân: x${initT.multiplier} → x${t.multiplier}`);
      if (Number(initT.advanceDays) !== Number(t.advanceDays)) changes.push(`Đặt trước tối đa: ${initT.advanceDays} ngày → ${t.advanceDays} ngày`);
      if (initT.icon !== t.icon) changes.push(`Icon biểu tượng: ${initT.icon} → ${t.icon}`);
      if (initT.colorTheme !== t.colorTheme) changes.push(`Màu sắc: ${initT.colorTheme} → ${t.colorTheme}`);
      if ((initT.benefitsText || '').trim() !== (t.benefitsText || '').trim()) changes.push(`Danh sách đặc quyền đã điều chỉnh`);

      if (changes.length > 0) {
        tierDiffs.push({
          status: 'modified',
          tier: t,
          initTier: initT,
          changes,
          label: 'Chỉnh sửa',
        });
      }
    }
  });

  // Check deleted tiers
  (initialForm.tiers || []).forEach((initT) => {
    if (!currentTiersMap.has(initT.id)) {
      tierDiffs.push({
        status: 'deleted',
        tier: initT,
        label: 'Đã xóa hạng',
      });
    }
  });

  const hasAnyChanges = isBaseRateChanged || isExpirationChanged || tierDiffs.length > 0;

  return {
    isBaseRateChanged,
    isExpirationChanged,
    tierDiffs,
    hasAnyChanges,
  };
}

function ConfirmSaveModal({ isOpen, onClose, onConfirm, saving, initialForm, form }) {
  if (!isOpen) return null;

  const diff = computeDiff(initialForm, form);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl space-y-5 relative border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <ShieldCheck size={24} weight="fill" />
            <h3 className="text-base font-extrabold text-slate-800">Xác nhận Thay đổi Cấu hình</h3>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Dưới đây là danh sách <strong>các thông tin đã thay đổi</strong> so với cấu hình hiện tại trong CSDL.
          </p>

          {!diff.hasAnyChanges ? (
            <div className="rounded-2xl p-6 bg-slate-50 border border-slate-200 text-center space-y-2">
              <Info size={28} className="mx-auto text-slate-400" />
              <p className="text-xs font-bold text-slate-600">Không phát hiện thay đổi nào!</p>
              <p className="text-[11px] text-slate-400">Các thông số hiện tại giống hệt với dữ liệu đã lưu.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {/* Changed Base Earning Rate */}
              {diff.isBaseRateChanged && (
                <div className="rounded-2xl bg-blue-50/80 p-3.5 border border-blue-200/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Tỷ lệ Tích điểm Cơ bản</span>
                    <span className="text-[10px] font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Thay đổi</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
                    <span className="text-slate-400 line-through">{initialForm?.baseEarningRate}%</span>
                    <span>→</span>
                    <span className="text-blue-700 text-sm">{form.baseEarningRate}% giá trị hóa đơn</span>
                  </div>
                </div>
              )}

              {/* Changed Point Expiration Months */}
              {diff.isExpirationChanged && (
                <div className="rounded-2xl bg-amber-50/80 p-3.5 border border-amber-200/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Thời hạn Hiệu lực Điểm</span>
                    <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">Thay đổi</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
                    <span className="text-slate-400 line-through">{initialForm?.pointExpirationMonths} tháng</span>
                    <span>→</span>
                    <span className="text-amber-800 text-sm">{form.pointExpirationMonths} tháng</span>
                  </div>
                </div>
              )}

              {/* Tier Changes */}
              {diff.tierDiffs.length > 0 && (
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-2.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Thay đổi ở Hạng thành viên ({diff.tierDiffs.length} hạng):
                  </span>
                  <div className="space-y-2">
                    {diff.tierDiffs.map((d, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                          d.status === 'added'
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : d.status === 'deleted'
                            ? 'bg-rose-50/60 border-rose-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TierBadge tier={{ id: d.tier.id, name: d.tier.name, icon: d.tier.icon, colorTheme: d.tier.colorTheme }} />
                            <span className="font-bold text-slate-800">{d.tier.name}</span>
                          </div>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              d.status === 'added'
                                ? 'bg-emerald-100 text-emerald-800'
                                : d.status === 'deleted'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {d.label}
                          </span>
                        </div>

                        {d.status === 'added' && (
                          <div className="text-[11px] text-slate-600 flex items-center gap-3">
                            <span>Mốc thăng hạng: <strong className="text-amber-700">{Number(d.tier.minPoints).toLocaleString('vi-VN')} điểm</strong></span>
                            <span>Hệ số nhân: <strong className="text-emerald-700">x{d.tier.multiplier}</strong></span>
                          </div>
                        )}

                        {d.status === 'modified' && d.changes && (
                          <ul className="text-[11px] text-slate-600 space-y-0.5 list-disc list-inside">
                            {d.changes.map((c, cIdx) => (
                              <li key={cIdx} className="font-semibold">{c}</li>
                            ))}
                          </ul>
                        )}

                        {d.status === 'deleted' && (
                          <p className="text-[11px] text-rose-600 font-semibold">Hạng thành viên này sẽ bị xóa khỏi danh sách.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal action buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving || !diff.hasAnyChanges}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
          >
            {saving ? <Spinner size={15} /> : <CheckCircle size={16} weight="bold" />}
            Xác nhận Lưu Cấu Hình
          </button>
        </div>
      </div>
    </div>
  );
}

const PRESET_TIER_ICONS = {
  bronze: 'Circle',
  silver: 'Medal',
  gold: 'Crown',
  diamond: 'Diamond',
};

function getTierIcon(t) {
  const idLower = (t?.id || '').toLowerCase();
  if (t?.icon && (t.icon !== 'Circle' || idLower === 'bronze')) {
    return t.icon;
  }
  return PRESET_TIER_ICONS[idLower] || 'Star';
}

export default function LoyaltyConfigTab() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pickingIconForIndex, setPickingIconForIndex] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [initialForm, setInitialForm] = useState(null);
  const [form, setForm] = useState({
    baseEarningRate: 5,
    pointExpirationMonths: 6,
    tiers: [],
  });

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/loyalty/config');
      if (!res.ok) throw new Error(await readErr(res));
      const json = await res.json();
      const data = json?.data ?? json;
      const loadedForm = {
        baseEarningRate: data?.baseEarningRate ?? 5,
        pointExpirationMonths: data?.pointExpirationMonths ?? 6,
        tiers: Array.isArray(data?.tiers)
          ? data.tiers.map((t) => ({
              id: t.id || '',
              name: t.name || '',
              minPoints: t.minPoints ?? 0,
              multiplier: t.multiplier ?? 1.0,
              advanceDays: t.advanceDays ?? 14,
              icon: getTierIcon(t),
              colorTheme: t.colorTheme || t.id || 'bronze',
              benefitsText: Array.isArray(t.benefits) ? t.benefits.join('\n') : '',
            }))
          : [],
      };
      setForm(loadedForm);
      setInitialForm(loadedForm);
    } catch (err) {
      setError(err.message || 'Không thể tải cấu hình tích điểm');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleTierChange = (index, field, value) => {
    setForm((prev) => {
      const nextTiers = [...prev.tiers];
      nextTiers[index] = { ...nextTiers[index], [field]: value };
      return { ...prev, tiers: nextTiers };
    });
  };

  const handleAddTier = () => {
    setForm((prev) => ({
      ...prev,
      tiers: [
        ...prev.tiers,
        {
          id: `tier_${Date.now()}`,
          name: 'Hạng mới',
          minPoints: 100000,
          multiplier: 1.5,
          icon: 'Star',
          colorTheme: 'purple',
          benefitsText: 'Tích lũy điểm thưởng từ mỗi hóa đơn...',
        },
      ],
    }));
  };

  const handleRemoveTier = (index) => {
    setForm((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== index),
    }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const executeSave = async () => {
    setSaving(true);
    setError('');

    const payloadTiers = form.tiers.map((t) => {
      const paletteTheme = COLOR_PALETTE.find((c) => c.id === (t.colorTheme || t.id || 'bronze').toLowerCase()) || COLOR_PALETTE[0];
      return {
        id: t.id.trim(),
        name: t.name.trim(),
        minPoints: Number(t.minPoints) || 0,
        multiplier: Number(t.multiplier) || 1,
        advanceDays: Number(t.advanceDays) || 14,
        icon: t.icon || 'Circle',
        colorTheme: paletteTheme.id,
        bg: paletteTheme.bg,
        border: paletteTheme.border,
        color: paletteTheme.color,
        benefits: t.benefitsText
          ? t.benefitsText
              .split('\n')
              .map((b) => b.trim())
              .filter(Boolean)
          : [],
      };
    });

    try {
      const res = await api('/loyalty/config', {
        method: 'PUT',
        body: JSON.stringify({
          baseEarningRate: Number(form.baseEarningRate),
          pointExpirationMonths: Number(form.pointExpirationMonths),
          tiers: payloadTiers,
        }),
      });

      if (!res.ok) throw new Error(await readErr(res));

      showToast.success('Đã lưu thành công cấu hình điểm thưởng & Hạng thành viên!');
      setShowConfirmModal(false);
      setInitialForm(JSON.parse(JSON.stringify(form)));
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu cấu hình');
      showToast.error(err.message || 'Không thể lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Spinner size={30} />
        <p className="mt-3 text-xs font-semibold text-slate-500">Đang tải trang cấu hình điểm thưởng...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Page Title & Intro Header Banner */}
      <div className="rounded-2xl p-6 shadow-sm border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ background: 'linear-gradient(135deg,#ecfdf5,#f0fdf4)' }}>
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shrink-0">
            <Coin size={26} weight="duotone" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">Cấu hình Chương trình Điểm thưởng & Hạng thành viên</h1>
            <p className="text-xs text-slate-600 mt-1">
              Tùy chỉnh tỷ lệ phần trăm tích điểm cơ bản, thời hạn điểm tích lũy, màu sắc hiển thị, mốc thăng hạng và biểu tượng icon toàn hệ thống.
            </p>
          </div>
        </div>

        <button
          type="submit"
          form="loyalty-page-form"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 shrink-0 cursor-pointer"
        >
          {saving ? <Spinner size={16} /> : <FloppyDisk size={16} weight="bold" />}
          Lưu thay đổi cấu hình
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-600">
          <Warning size={18} weight="fill" />
          {error}
        </div>
      )}

      {/* Main Form */}
      <form id="loyalty-page-form" onSubmit={handleFormSubmit} className="space-y-6">
        {/* Section 1: General Settings */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <Coin size={18} className="text-blue-600" weight="fill" />
            1. Cấu hình Tích điểm Cơ bản & Thời hạn
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
              <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider">
                Tỷ lệ tích điểm cơ bản (% giá trị hóa đơn)
              </label>
              <div className="relative max-w-xs">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={form.baseEarningRate}
                  onChange={(e) => setForm({ ...form, baseEarningRate: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-base font-extrabold text-blue-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">%</span>
              </div>
              <p className="text-xs text-slate-600">
                Công thức: <code>Điểm nhận = (Tổng tiền × {form.baseEarningRate}%) × Hệ số nhân hạng</code>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 space-y-2">
              <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider">
                Thời hạn hiệu lực của điểm tích lũy (tháng)
              </label>
              <div className="relative max-w-xs">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={form.pointExpirationMonths}
                  onChange={(e) => setForm({ ...form, pointExpirationMonths: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base font-extrabold text-amber-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  required
                />
              </div>
              <p className="text-xs text-slate-600">
                Điểm tích lũy sẽ tự động hết hạn sau <strong>{form.pointExpirationMonths} tháng</strong> kể từ ngày cộng.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Tier Configuration */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Trophy size={18} className="text-amber-500" weight="fill" />
                2. Danh sách & Ngưỡng nâng hạng thành viên
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Điều chỉnh tên hạng, icon biểu tượng, màu sắc hiển thị, mốc thăng hạng và đặc quyền</p>
            </div>
            <button
              type="button"
              onClick={handleAddTier}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-sm"
            >
              <Plus size={14} weight="bold" /> Thêm hạng thành viên
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {form.tiers.map((tier, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4 hover:border-blue-300 transition-all"
              >
                {/* Header row */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-xs font-extrabold text-slate-700">
                      #{idx + 1}
                    </span>
                    <TierBadge tier={{ id: tier.id, name: tier.name, icon: tier.icon, colorTheme: tier.colorTheme }} />
                    <span className="text-sm font-bold text-slate-800">{tier.name}</span>
                  </div>
                  {form.tiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTier(idx)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                      title="Xóa hạng này"
                    >
                      <Trash size={16} /> Xóa hạng
                    </button>
                  )}
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mã ID Hạng</label>
                    <input
                      type="text"
                      value={tier.id}
                      onChange={(e) => handleTierChange(idx, 'id', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-blue-400 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Hạng Hiển Thị</label>
                    <input
                      type="text"
                      value={tier.name}
                      onChange={(e) => handleTierChange(idx, 'name', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-400 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Icon Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Icon Biểu Tượng</label>
                    <button
                      type="button"
                      onClick={() => setPickingIconForIndex(idx)}
                      className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:bg-slate-50 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <RenderIcon name={tier.icon || 'Circle'} size={14} />
                        </div>
                        <span className="text-xs font-bold text-slate-800">{tier.icon || 'Circle'}</span>
                      </div>
                      <span className="text-[11px] font-bold text-blue-600 hover:underline">Đổi Icon</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Điểm Thăng Hạng</label>
                    <input
                      type="number"
                      min="0"
                      value={tier.minPoints}
                      onChange={(e) => handleTierChange(idx, 'minPoints', e.target.value)}
                      className="w-full rounded-xl border border-amber-200 bg-amber-50/30 px-3 py-2 text-xs font-extrabold text-amber-800 focus:border-amber-400 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Hệ Số Nhân Điểm</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10"
                      value={tier.multiplier}
                      onChange={(e) => handleTierChange(idx, 'multiplier', e.target.value)}
                      className="w-full rounded-xl border border-emerald-200 bg-emerald-50/30 px-3 py-2 text-xs font-extrabold text-emerald-700 focus:border-emerald-400 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Đặt Trước Tối Đa <span className="font-normal text-slate-400">(ngày)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={tier.advanceDays}
                      onChange={(e) => handleTierChange(idx, 'advanceDays', e.target.value)}
                      className="w-full rounded-xl border border-sky-200 bg-sky-50/30 px-3 py-2 text-xs font-extrabold text-sky-700 focus:border-sky-400 focus:outline-none"
                      title="Số ngày tối đa hạng này được đặt lịch trước"
                    />
                  </div>
                </div>

                {/* Color Palette Selector */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Palette size={15} className="text-purple-600" /> Màu Sắc Hiển Thị Hạng:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {COLOR_PALETTE.map((c) => {
                      const currentTheme = (tier.colorTheme || tier.id || 'bronze').toLowerCase();
                      const isSelected = currentTheme === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleTierChange(idx, 'colorTheme', c.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border transition-all ${
                            isSelected
                              ? 'ring-2 ring-blue-500 ring-offset-1 scale-105 shadow-sm'
                              : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{ background: c.bg, borderColor: c.border, color: c.color }}
                        >
                          <span className="h-2 w-2 rounded-full" style={{ background: c.preview }} />
                          <span>{c.label.split(' ')[1] || c.id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Benefits */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Danh sách Đặc Quyền & Ưu Đãi (Mỗi dòng là 1 ưu đãi)
                  </label>
                  <textarea
                    rows={3}
                    value={tier.benefitsText}
                    onChange={(e) => handleTierChange(idx, 'benefitsText', e.target.value)}
                    placeholder="Tích lũy điểm thưởng từ mỗi hóa đơn..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-700 focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Save Action Bar */}
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Spinner size={16} /> : <FloppyDisk size={16} weight="bold" />}
            Lưu thay đổi cấu hình
          </button>
        </div>
      </form>

      {/* Icon Picker Modal */}
      <IconPickerModal
        isOpen={pickingIconForIndex !== null}
        onClose={() => setPickingIconForIndex(null)}
        currentIcon={pickingIconForIndex !== null ? form.tiers[pickingIconForIndex]?.icon : ''}
        onSelect={(iconName) => {
          if (pickingIconForIndex !== null) {
            handleTierChange(pickingIconForIndex, 'icon', iconName);
          }
        }}
      />

      {/* Confirmation Modal Before Saving with Selective Diff Rendering */}
      <ConfirmSaveModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={executeSave}
        saving={saving}
        initialForm={initialForm}
        form={form}
      />
    </div>
  );
}
