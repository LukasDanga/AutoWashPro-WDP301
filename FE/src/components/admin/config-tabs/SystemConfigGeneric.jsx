import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Warning,
  FloppyDisk,
  ArrowCounterClockwise,
  MagnifyingGlass,
  Plus,
  Trash,
} from '@phosphor-icons/react';
import { showToast } from '@/lib/toast';
import { confirmDialog } from '@/lib/confirm';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getStoredToken()}`, ...opts.headers },
  });
}

function Spinner({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" className="animate-spin" aria-hidden>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

const ADVANCE_TIERS = [
  { key: 'bronze', label: 'Đồng', color: 'bg-orange-50 border-orange-200 text-orange-800' },
  { key: 'silver', label: 'Bạc', color: 'bg-slate-100 border-slate-300 text-slate-700' },
  { key: 'gold', label: 'Vàng', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  { key: 'diamond', label: 'Kim cương', color: 'bg-blue-50 border-blue-200 text-blue-800' },
  { key: 'Ruby', label: 'Hồng ngọc', color: 'bg-purple-50 border-purple-200 text-purple-800' },
];

const CATEGORY_LABELS = {
  booking: 'Vận hành & Booking',
  general: 'Cấu hình chung',
  payment: 'Thanh toán & Huỷ',
  promotion: 'Khuyến mãi & Ưu đãi',
  loyalty: 'Hạng thành viên & Điểm',
};

// Config keys that represent percentages (0–100)
const PERCENT_KEYS = new Set([
  'DEPOSIT_RATE',
  'VAT_PERCENT',
  'LATE_CANCEL_PENALTY_FULL_PERCENT',
  'LATE_CANCEL_PENALTY_DEPOSIT_PERCENT',
  'LOYALTY_BASE_EARNING_RATE',
  'SLOT_PACK_VIP_BONUS_DISCOUNTS',
  'BIRTHDAY_VOUCHER_PERCENT',
  'SLOT_PACK_DISCOUNTS',
]);

function clampPercent(key, rawValue) {
  if (PERCENT_KEYS.has(key)) {
    const v = Number(rawValue);
    if (isNaN(v)) return '';
    return Math.max(0, Math.min(100, Math.round(v)));
  }
  const v = Number(rawValue);
  if (isNaN(v)) return '';
  return Math.max(0, Math.round(v));
}

function getConfigUnit(key, description = '') {
  const k = (key || '').toUpperCase();
  const d = (description || '').toLowerCase();

  if (k === 'AUTO_CANCEL_GRACE_MINUTES') return 'phút';
  if (k === 'GRACE_EXTENSION_STEP_MINUTES') return 'phút';
  if (k === 'LATE_WARNING_OFFSET_MINUTES') return 'phút';
  if (k === 'MAX_GRACE_EXTENSION_MINUTES') return 'phút';
  if (k === 'MIN_ADVANCE_BOOKING_MINUTES') return 'phút';
  if (k === 'BIRTHDAY_VOUCHER_MAX_AMOUNT') return 'VNĐ';
  if (k === 'BIRTHDAY_VOUCHER_PERCENT') return '%';
  if (k === 'VAT_PERCENT') return '% (tỉ lệ)';
  if (k === 'BIRTHDAY_VOUCHER_VALIDITY_DAYS') return 'ngày';
  if (k === 'DEFAULT_BRANCH_CAPACITY') return 'xe';
  if (k === 'DEPOSIT_RATE') return '% (tỉ lệ)';
  if (k === 'SYSTEM_CANCEL_BONUS_POINTS') return 'điểm';

  if (k.includes('MINUTES') || d.includes('(phút)') || d.includes('số phút') || d.includes('thời gian')) return 'phút';
  if (k.includes('PERCENT') || d.includes('phần trăm') || d.includes('tỷ lệ') || d.includes('tỉ lệ')) return '%';
  if (k.includes('AMOUNT') || k.includes('PRICE') || k.includes('MONEY') || d.includes('số tiền') || d.includes('giá')) return 'VNĐ';
  if (k.includes('POINTS') || d.includes('điểm')) return 'điểm';
  if (k.includes('CAPACITY') || d.includes('sức chứa') || d.includes('số xe')) return 'xe';
  if (k.includes('SLOTS') || k.includes('COUNT') || d.includes('số lần') || d.includes('lượt')) return 'lượt';
  if (k.includes('HOURS') || d.includes('giờ')) return 'giờ';
  if (k.includes('DAYS') || d.includes('ngày')) return 'ngày';

  return null;
}

function normalizeValue(config) {
  return config.type === 'json' ? JSON.stringify(config.value, null, 2) : config.value;
}

// ---- Dedicated editor: SLOT_PACK_DISCOUNTS (array of { minSlots, discountPercent }) ----
function SlotPackDiscountsEditor({ config, formValues, updateJsonField, readOnly }) {
  const rows = useMemo(() => {
    try {
      const v = JSON.parse(formValues[config.key] || '[]');
      return Array.isArray(v) ? v : [];
    } catch { return []; }
  }, [config.key, formValues]);

  const setRow = (index, field, value) => {
    const next = rows.map((r, i) => (i === index ? { ...r, [field]: Number(value) || 0 } : r));
    updateJsonField(config.key, next);
  };

  const addRow = () => updateJsonField(config.key, [...rows, { minSlots: 0, discountPercent: 0 }]);
  const removeRow = (index) => updateJsonField(config.key, rows.filter((_, i) => i !== index));

  return (
    <div className="mt-1 space-y-2">
      {rows.map((row, idx) => (
        <div key={idx} className="flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="relative flex items-center">
            <input
              type="number"
              min="1"
              value={row.minSlots ?? ''}
              onChange={(e) => setRow(idx, 'minSlots', e.target.value)}
              disabled={readOnly}
              className="w-28 rounded-xl border border-slate-200 text-sm font-semibold outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 py-2 pl-3.5 pr-14 bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
            />
            <span className="absolute right-2.5 text-xs font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-lg pointer-events-none border border-slate-300/50">
              lượt
            </span>
          </div>
          <span className="text-sm font-bold text-slate-400">→</span>
          <div className="relative flex items-center">
            <input
              type="number"
              min="0"
              max="100"
              value={row.discountPercent ?? ''}
              onChange={(e) => setRow(idx, 'discountPercent', e.target.value)}
              disabled={readOnly}
              className="w-32 rounded-xl border border-slate-200 text-sm font-semibold outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 py-2 pl-3.5 pr-12 bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
            />
            <span className="absolute right-2.5 text-xs font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-lg pointer-events-none border border-slate-300/50">
              %
            </span>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => removeRow(idx)}
              disabled={rows.length <= 1}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
            >
              <Trash size={14} /> Xóa
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors"
        >
          <Plus size={14} weight="bold" /> Thêm mức chiết khấu
        </button>
      )}
    </div>
  );
}

// ---- Dedicated editor: SLOT_PACK_VIP_BONUS_DISCOUNTS (map tier -> percent) ----
function MapEditor({ config, formValues, updateJsonField, readOnly }) {
  const entries = useMemo(() => {
    try {
      const v = JSON.parse(formValues[config.key] || '{}');
      return Object.entries(v || {});
    } catch { return []; }
  }, [config.key, formValues]);

  const setEntry = (index, key, value) => {
    const next = entries.map(([k, v], i) => (i === index ? [key, Number(value) || 0] : [k, v]));
    updateJsonField(config.key, Object.fromEntries(next));
  };

  const addEntry = () => updateJsonField(config.key, { ...Object.fromEntries(entries), bronze: 0 });
  const removeEntry = (index) => {
    const next = entries.filter((_, i) => i !== index);
    updateJsonField(config.key, Object.fromEntries(next));
  };

  return (
    <div className="mt-1 space-y-2">
      {entries.map(([tierKey, value], idx) => (
        <div key={idx} className="flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <input
            type="text"
            value={tierKey}
            onChange={(e) => setEntry(idx, e.target.value, value)}
            disabled={readOnly}
            className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
            placeholder="tier id"
          />
          <div className="relative flex items-center">
            <input
              type="number"
              min="0"
              max="100"
              value={value ?? ''}
              onChange={(e) => setEntry(idx, tierKey, e.target.value)}
              disabled={readOnly}
              className="w-32 rounded-xl border border-slate-200 text-sm font-semibold outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 py-2 pl-3.5 pr-12 bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
            />
            <span className="absolute right-2.5 text-xs font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-lg pointer-events-none border border-slate-300/50">
              %
            </span>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => removeEntry(idx)}
              disabled={entries.length <= 1}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
            >
              <Trash size={14} /> Xóa
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <button
          type="button"
          onClick={addEntry}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors"
        >
          <Plus size={14} weight="bold" /> Thêm hạng VIP
        </button>
      )}
    </div>
  );
}

const DEFAULT_CATEGORIES = [];
const DEFAULT_EXCLUDE_KEYS = [];

export default function SystemConfigGeneric({ categories = DEFAULT_CATEGORIES, keys = null, excludeKeys = DEFAULT_EXCLUDE_KEYS, readOnly = false }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [invalidJson, setInvalidJson] = useState({});
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [search, setSearch] = useState('');

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api('/configs?scope=global');
      if (!res.ok) throw new Error('Không thể tải cấu hình');
      const json = await res.json();

      if (json.success && json.data) {
        let filtered = json.data.filter(c => categories.includes(c.category));
        if (Array.isArray(keys) && keys.length > 0) {
          filtered = filtered.filter(c => keys.includes(c.key));
        }
        if (Array.isArray(excludeKeys) && excludeKeys.length > 0) {
          filtered = filtered.filter(c => !excludeKeys.includes(c.key));
        }

        setConfigs(filtered);

        const initialForm = {};
        filtered.forEach(c => { initialForm[c.key] = normalizeValue(c); });
        setFormValues(initialForm);
        setInvalidJson({});
        setHasChanges(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [categories, keys, excludeKeys]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleChange = (key, val, tier) => {
    let nextVal = val;
    if (tier && key === 'ADVANCE_BOOKING_LIMITS') {
      try {
        const obj = formValues[key] ? JSON.parse(formValues[key]) : {};
        obj[tier] = Number(val);
        nextVal = JSON.stringify(obj, null, 2);
      } catch (e) {
        nextVal = val;
      }
    }
    const newForm = { ...formValues, [key]: nextVal };
    setFormValues(newForm);

    // Validate JSON for json-type configs
    const nextInvalid = { ...invalidJson };
    const cfg = configs.find(c => c.key === key);
    if (cfg && cfg.type === 'json') {
      try {
        JSON.parse(nextVal);
        delete nextInvalid[key];
      } catch (e) {
        nextInvalid[key] = true;
      }
    }
    setInvalidJson(nextInvalid);

    // Check if changed
    let changed = false;
    configs.forEach(c => {
      if (c.type === 'json') {
        try {
          if (JSON.stringify(JSON.parse(newForm[c.key])) !== JSON.stringify(c.value)) changed = true;
        } catch (e) { changed = true; }
      } else {
        if (newForm[c.key] !== c.value) changed = true;
      }
    });
    setHasChanges(changed);
  };

  const updateJsonField = (key, parsedValue) => {
    handleChange(key, JSON.stringify(parsedValue, null, 2));
  };

  const hasInvalidJson = () => Object.keys(invalidJson).some(k => invalidJson[k]);

  const handleSave = async () => {
    if (hasInvalidJson()) {
      showToast({ message: 'Có cấu hình JSON chưa hợp lệ. Vui lòng kiểm tra lại các ô được tô đỏ.', type: 'error' });
      return;
    }

    const changes = configs.filter(c => {
      if (c.type === 'json') {
        try {
          return JSON.stringify(JSON.parse(formValues[c.key])) !== JSON.stringify(c.value);
        } catch (e) { return false; }
      }
      return formValues[c.key] !== c.value;
    }).map(c => ({
      key: c.key,
      value: c.type === 'json' ? JSON.parse(formValues[c.key]) : formValues[c.key],
      type: c.type,
      category: c.category,
      scope: c.scope,
      isPublic: c.isPublic,
      description: c.description
    }));

    if (changes.length === 0) return;

    const isConfirmed = await confirmDialog({
      title: 'Lưu cấu hình',
      message: `Bạn đang cập nhật ${changes.length} giá trị cấu hình. Tiếp tục?`,
      confirmLabel: 'Lưu thay đổi',
      cancelLabel: 'Hủy'
    });

    if (isConfirmed) {
      try {
        setSaving(true);
        for (const change of changes) {
          const res = await api('/configs/update', {
            method: 'POST',
            body: JSON.stringify({ ...change, reason: 'Admin cập nhật qua System Config UI' })
          });
          if (!res.ok) throw new Error(`Lỗi cập nhật ${change.key}`);
        }
        showToast('Cập nhật thành công!');
        await fetchConfigs();
      } catch (err) {
        showToast({ message: err.message || 'Lỗi khi lưu cấu hình', type: 'error' });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDiscard = () => {
    const initialForm = {};
    configs.forEach(c => { initialForm[c.key] = normalizeValue(c); });
    setFormValues(initialForm);
    setInvalidJson({});
    setHasChanges(false);
  };

  const visibleConfigs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return configs;
    return configs.filter(c =>
      (c.key || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q) ||
      ((CATEGORY_LABELS[c.category] || '') || '').toLowerCase().includes(q)
    );
  }, [configs, search]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={24} /></div>;
  if (error) return (
    <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-red-600 m-6">
      <Warning size={20} /><span className="text-sm">{error}</span>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 pb-24">
      {/* Search bar */}
      <div className="mb-5">
        <div className="relative max-w-md">
          <MagnifyingGlass size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm cấu hình theo tên hoặc mô tả..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="space-y-6">
        {visibleConfigs.length === 0 ? (
          <p className="text-sm text-slate-500 py-10 text-center">
            {search ? 'Không tìm thấy cấu hình phù hợp.' : 'Không có cấu hình nào trong danh mục này.'}
          </p>
        ) : (
          visibleConfigs.map(config => {
            const unit = getConfigUnit(config.key, config.description);
            const isInvalid = !!invalidJson[config.key];
            return (
              <div key={config.key} className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-sm font-semibold text-slate-800">{config.key}</label>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider">
                      {CATEGORY_LABELS[config.category] || config.category || 'general'}
                    </span>
                    {unit && (
                      <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        Đơn vị: {unit}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider">{config.type}</span>
                </div>
                <p className="text-xs text-slate-500 mb-2">{config.description || 'Không có mô tả'}</p>

                {isInvalid && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5 text-[11px] font-bold text-rose-600">
                    <Warning size={13} weight="fill" /> JSON không hợp lệ — chưa thể lưu cho đến khi sửa
                  </div>
                )}

                {config.key === 'ADVANCE_BOOKING_LIMITS' ? (
                  (() => {
                    let obj = {};
                    try { obj = formValues[config.key] ? JSON.parse(formValues[config.key]) : {}; } catch (e) { obj = {}; }
                    return (
                      <div className="mt-1">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                          {ADVANCE_TIERS.map(tier => (
                            <div key={tier.key} className="flex flex-col gap-1.5">
                              <span className={`inline-flex self-start items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${tier.color}`}>
                                {tier.label}
                              </span>
                              <div className="relative flex items-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={obj[tier.key] ?? ''}
                                  onChange={(e) => handleChange(config.key, e.target.value, tier.key)}
                                  disabled={readOnly}
                                  className="w-full rounded-xl border border-slate-200 text-sm font-semibold outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 py-2 pl-3.5 pr-12 bg-slate-50/70 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                                />
                                <span className="absolute right-2.5 text-xs font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-lg pointer-events-none uppercase tracking-wider border border-slate-300/50">
                                  ngày
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2">
                          Fallback khi hạng chưa khai báo "Đặt trước tối đa". Nên quản lý tại tab "Hạng thành viên & Điểm".
                        </p>
                      </div>
                    );
                  })()
                ) : config.key === 'SLOT_PACK_DISCOUNTS' ? (
                  <SlotPackDiscountsEditor config={config} formValues={formValues} updateJsonField={updateJsonField} readOnly={readOnly} />
                ) : config.key === 'SLOT_PACK_VIP_BONUS_DISCOUNTS' ? (
                  <MapEditor config={config} formValues={formValues} updateJsonField={updateJsonField} readOnly={readOnly} />
                ) : config.type === 'boolean' ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      checked={formValues[config.key] === true || formValues[config.key] === 'true'}
                      onChange={(e) => handleChange(config.key, e.target.checked)}
                      disabled={readOnly}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 disabled:opacity-50"
                    />
                    <span className="text-sm font-medium text-slate-700">Kích hoạt</span>
                  </div>
                ) : config.type === 'json' ? (
                  <textarea
                    value={formValues[config.key] ?? ''}
                    onChange={(e) => handleChange(config.key, e.target.value)}
                    disabled={readOnly}
                    className={`w-full max-w-2xl rounded-lg border text-sm font-mono outline-none transition-colors focus:ring-1 p-2.5 bg-slate-50 min-h-[150px] ${
                      isInvalid
                        ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500 focus:ring-rose-100'
                        : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500'
                    } disabled:bg-slate-100 disabled:text-slate-500`}
                  />
                ) : config.type === 'number' ? (
                  <div className="relative flex items-center max-w-sm">
                    <input
                      type="number"
                      step="any"
                      value={formValues[config.key] ?? ''}
                      onChange={(e) => handleChange(config.key, clampPercent(config.key, e.target.value))}
                      disabled={readOnly}
                      className={`w-full rounded-xl border border-slate-200 text-sm font-semibold outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 py-2.5 pl-3.5 bg-slate-50/70 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 ${
                        unit ? 'pr-24' : 'pr-3.5'
                      }`}
                    />
                    {unit && (
                      <span className="absolute right-2.5 text-xs font-bold text-slate-600 bg-slate-200/80 px-2.5 py-1 rounded-lg pointer-events-none uppercase tracking-wider border border-slate-300/50">
                        {unit}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="relative flex items-center max-w-sm">
                    <input
                      type="text"
                      value={formValues[config.key] ?? ''}
                      onChange={(e) => handleChange(config.key, e.target.value)}
                      disabled={readOnly}
                      className={`w-full rounded-xl border border-slate-200 text-sm font-semibold outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 py-2.5 pl-3.5 bg-slate-50/70 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 ${
                        unit ? 'pr-24' : 'pr-3.5'
                      }`}
                    />
                    {unit && (
                      <span className="absolute right-2.5 text-xs font-bold text-slate-600 bg-slate-200/80 px-2.5 py-1 rounded-lg pointer-events-none uppercase tracking-wider border border-slate-300/50">
                        {unit}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {hasChanges && !readOnly && (
        <div className="fixed bottom-6 left-1/2 ml-[120px] flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-slate-200">
          <div className="flex items-center gap-2 border-r border-slate-100 pr-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Warning size={16} weight="fill" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              Có thay đổi chưa lưu{hasInvalidJson() && <span className="text-rose-600"> (có JSON lỗi)</span>}
            </p>
          </div>
          <button
            disabled={saving}
            onClick={handleDiscard}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <ArrowCounterClockwise size={16} />Hủy thay đổi
          </button>
          <button
            disabled={saving || hasInvalidJson()}
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Spinner size={16} /> : <FloppyDisk size={18} weight="bold" />}
            Lưu cấu hình
          </button>
        </div>
      )}
    </div>
  );
}
