import { useCallback, useEffect, useState } from 'react';
import {
  Warning,
  FloppyDisk,
  ArrowCounterClockwise,
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

export default function SystemConfigGeneric({ categories = [] }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      // Admin API to fetch all configs
      const res = await api('/configs?scope=global');
      if (!res.ok) throw new Error('Không thể tải cấu hình');
      const json = await res.json();
      
      if (json.success && json.data) {
        // Filter by requested categories (e.g., 'booking', 'general')
        const filtered = json.data.filter(c => categories.includes(c.category));
        
        setConfigs(filtered);
        
        // Initialize form
        const initialForm = {};
        filtered.forEach(c => {
          initialForm[c.key] = c.type === 'json' ? JSON.stringify(c.value, null, 2) : c.value;
        });
        setFormValues(initialForm);
        setHasChanges(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [categories]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleChange = (key, val) => {
    const newForm = { ...formValues, [key]: val };
    setFormValues(newForm);
    
    // Check if changed
    let changed = false;
    configs.forEach(c => {
      if (c.type === 'json') {
        try {
          if (JSON.stringify(JSON.parse(newForm[c.key])) !== JSON.stringify(c.value)) changed = true;
        } catch(e) { changed = true; }
      } else {
        if (newForm[c.key] !== c.value) changed = true;
      }
    });
    setHasChanges(changed);
  };

  const handleSave = async () => {
    const changes = configs.filter(c => {
      if (c.type === 'json') {
        try {
          return JSON.stringify(JSON.parse(formValues[c.key])) !== JSON.stringify(c.value);
        } catch(e) { return false; } // Ignore invalid JSON on save
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
        // Save each change sequentially (simple approach)
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
    configs.forEach(c => {
      initialForm[c.key] = c.type === 'json' ? JSON.stringify(c.value, null, 2) : c.value;
    });
    setFormValues(initialForm);
    setHasChanges(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={24} /></div>;
  if (error) return (
    <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-red-600 m-6">
      <Warning size={20} /><span className="text-sm">{error}</span>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 pb-24">
      <div className="space-y-6">
        {configs.length === 0 ? (
          <p className="text-sm text-slate-500 py-10 text-center">Không có cấu hình nào trong danh mục này.</p>
        ) : (
          configs.map(config => {
            const unit = getConfigUnit(config.key, config.description);
            return (
              <div key={config.key} className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-slate-800">{config.key}</label>
                    {unit && (
                      <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        Đơn vị: {unit}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider">{config.type}</span>
                </div>
                <p className="text-xs text-slate-500 mb-2">{config.description || 'Không có mô tả'}</p>
                
                {config.type === 'boolean' ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input 
                      type="checkbox" 
                      checked={formValues[config.key] === true || formValues[config.key] === 'true'}
                      onChange={(e) => handleChange(config.key, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    <span className="text-sm font-medium text-slate-700">Kích hoạt</span>
                  </div>
                ) : config.type === 'json' ? (
                  <textarea
                    value={formValues[config.key] ?? ''}
                    onChange={(e) => handleChange(config.key, e.target.value)}
                    className="w-full max-w-2xl rounded-lg border-slate-200 text-sm font-mono outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-2.5 bg-slate-50 min-h-[150px]"
                  />
                ) : config.type === 'number' ? (
                  <div className="relative flex items-center max-w-sm">
                    <input
                      type="number"
                      step="any"
                      value={formValues[config.key] ?? ''}
                      onChange={(e) => handleChange(config.key, Number(e.target.value))}
                      className={`w-full rounded-xl border border-slate-200 text-sm font-semibold outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 py-2.5 pl-3.5 bg-slate-50/70 text-slate-800 ${
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
                      className={`w-full rounded-xl border border-slate-200 text-sm font-semibold outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 py-2.5 pl-3.5 bg-slate-50/70 text-slate-800 ${
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

      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 ml-[120px] flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-slate-200">
          <div className="flex items-center gap-2 border-r border-slate-100 pr-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Warning size={16} weight="fill" />
            </div>
            <p className="text-sm font-medium text-slate-700">Có thay đổi chưa lưu</p>
          </div>
          <button
            disabled={saving}
            onClick={handleDiscard}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <ArrowCounterClockwise size={16} />Hủy thay đổi
          </button>
          <button
            disabled={saving}
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
