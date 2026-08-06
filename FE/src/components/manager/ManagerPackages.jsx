import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { showToast } from '@/lib/toast';
import useSSE from '@/hooks/useSSE';
import { MagnifyingGlass, X, ArrowClockwise, PencilSimple, Trash, ClockCountdown, Car, Package } from '@phosphor-icons/react';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${getStoredToken()}`, 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
}

function formatCurrency(v) {
  return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`;
}

const VEHICLE_LABELS = { sedan: 'Sedan', suv: 'SUV', pickup: 'Pickup', van: 'Van' };

const EMPTY_FORM = {
  name: '', description: '', price: '', duration: '', category: 'external', vehicleTypes: [],
  subServices: [],
};
const EMPTY_SUB = { name: '', price: '', duration: '', isOptional: true };
const CATEGORIES = [
  { value: 'external', label: 'Rửa ngoại thất' },
  { value: 'internal', label: 'Vệ sinh nội thất' },
  { value: 'full', label: 'Toàn bộ' },
];
const VEHICLE_TYPES = ['sedan', 'suv', 'pickup', 'van'];
const inp = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors';
const PAGE_SIZE = 9;

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

function PackageForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    price: initial?.price ? String(initial.price) : '',
    duration: initial?.duration ? String(initial.duration) : '',
    image: initial?.image || '',
    category: initial?.category || 'full',
    status: initial?.status || 'active',
    vehicleTypes: initial?.vehicleTypes || [],
    subServices: (initial?.subServices || []).map((s) => ({
      name: s.name || '',
      price: s.price ? String(s.price) : '0',
      duration: s.duration ? String(s.duration) : '',
      isOptional: s.isOptional !== false,
    })),
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  const toggleVehicle = (val) => {
    setForm((f) => ({
      ...f,
      vehicleTypes: f.vehicleTypes.includes(val) ? f.vehicleTypes.filter((v) => v !== val) : [...f.vehicleTypes, val],
    }));
  };

  const addSubService = () => {
    setForm((f) => ({ ...f, subServices: [...f.subServices, { name: '', price: '', duration: '', isOptional: true }] }));
  };

  const updateSub = (idx, key, val) => {
    setForm((f) => {
      const subs = [...f.subServices];
      if (key === 'isOptional' && val === false) {
        subs[idx] = { ...subs[idx], isOptional: false, price: '0' };
      } else {
        subs[idx] = { ...subs[idx], [key]: val };
      }
      return { ...f, subServices: subs };
    });
    setErrors((e) => {
      if (!e.subServices) return e;
      const subErrs = [...e.subServices];
      if (subErrs[idx]) {
        subErrs[idx] = { ...subErrs[idx], [key]: '' };
        if (key === 'isOptional' && val === false) {
          subErrs[idx].price = '';
        }
      }
      return { ...e, subServices: subErrs };
    });
  };

  const removeSub = (idx) => {
    setForm((f) => ({ ...f, subServices: f.subServices.filter((_, i) => i !== idx) }));
    setErrors((e) => {
      if (!e.subServices) return e;
      return { ...e, subServices: e.subServices.filter((_, i) => i !== idx) };
    });
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Vui lòng nhập tên gói';

    const numericPrice = Number(form.price);
    if (!form.price || isNaN(numericPrice) || numericPrice <= 1000) {
      e.price = 'Giá gói phải lớn hơn 1.000 VNĐ';
    }

    if (!form.duration || Number(form.duration) <= 0) {
      e.duration = 'Thời lượng phải lớn hơn 0 phút';
    }

    const subErrors = [];
    let hasSubError = false;

    (form.subServices || []).forEach((sub, idx) => {
      const sErr = {};
      if (!sub.name || !sub.name.trim()) {
        sErr.name = 'Vui lòng nhập tên dịch vụ nhỏ';
        hasSubError = true;
      }
      if (!sub.duration || Number(sub.duration) <= 0) {
        sErr.duration = 'Vui lòng nhập thời gian';
        hasSubError = true;
      }
      if (sub.isOptional) {
        const subPriceNum = Number(sub.price);
        if (!sub.price || isNaN(subPriceNum) || subPriceNum <= 1000) {
          sErr.price = 'Giá phụ thu phải > 1.000 VNĐ';
          hasSubError = true;
        }
      }
      subErrors[idx] = sErr;
    });

    if (hasSubError) {
      e.subServices = subErrors;
    }

    return e;
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);
    onSave({
      name: form.name.trim(),
      description: (form.description || '').trim(),
      price: Number(form.price),
      duration: Number(form.duration),
      image: form.image || '',
      category: form.category,
      status: form.status,
      vehicleTypes: form.vehicleTypes,
      subServices: (form.subServices || []).map(s => ({
        name: s.name.trim(),
        price: s.isOptional ? Number(s.price) || 0 : 0,
        duration: Number(s.duration) || 0,
        isOptional: s.isOptional,
      })),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Tên gói" required error={errors.name}>
          <input className={inp} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Rửa xe cao cấp" />
        </Field>
        <Field label="Danh mục">
          <select className={inp} value={form.category} onChange={(e) => set('category', e.target.value)}>
            <option value="full">Tổng thể</option>
            <option value="external">Ngoại thất</option>
            <option value="internal">Nội thất</option>
          </select>
        </Field>
      </div>

      <Field label="Mô tả" error={errors.description}>
        <textarea rows={2} className={inp + ' resize-none'} value={form.description}
          onChange={(e) => set('description', e.target.value)} placeholder="Mô tả gói dịch vụ..." />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Giá gói (VNĐ)" required error={errors.price}>
          <input type="text" inputMode="numeric" className={inp} value={form.price}
            onChange={(e) => set('price', e.target.value)} placeholder="80000" />
        </Field>
        <Field label="Thời lượng (phút)" required error={errors.duration}>
          <input type="number" min="1" className={inp} value={form.duration}
            onChange={(e) => set('duration', e.target.value)} placeholder="60" />
        </Field>
        <Field label="Trạng thái">
          <select className={inp} value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="active">Hoạt động</option>
            <option value="inactive">Ngừng</option>
          </select>
        </Field>
      </div>

      <Field label="Loại xe áp dụng">
        <div className="flex flex-wrap gap-2">
          {[{ value: 'sedan', label: 'Sedan' }, { value: 'suv', label: 'SUV' }, { value: 'pickup', label: 'Pickup' }, { value: 'van', label: 'Van' }].map((o) => (
            <button key={o.value} type="button" onClick={() => toggleVehicle(o.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${form.vehicleTypes.includes(o.value) ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </Field>

      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div>
            <label className="text-xs font-bold text-slate-700 block">Các dịch vụ nhỏ trong gói (Sub-services)</label>
            <span className="text-[11px] text-slate-400">Các công đoạn chi tiết được thực hiện trong gói</span>
          </div>
          <button type="button" onClick={addSubService}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors">
            + Thêm dịch vụ nhỏ
          </button>
        </div>

        <div className="space-y-3 mt-3">
          {form.subServices.map((sub, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => updateSub(idx, 'isOptional', false)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                      !sub.isOptional 
                        ? 'bg-emerald-500 text-white shadow-xs' 
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Đã bao gồm
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSub(idx, 'isOptional', true)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                      sub.isOptional 
                        ? 'bg-indigo-500 text-white shadow-xs' 
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Tùy chọn
                  </button>
                </div>
                <button type="button" onClick={() => removeSub(idx)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Xóa">
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-1">
                  <label className="text-[10px] font-medium text-slate-500 block mb-1">
                    Tên dịch vụ nhỏ <span className="text-red-500">*</span>
                  </label>
                  <input placeholder="VD: Phun bọt tuyết, Lau khô..." className={inp + ' text-xs'} value={sub.name}
                    onChange={(e) => updateSub(idx, 'name', e.target.value)} />
                  {errors.subServices?.[idx]?.name && (
                    <p className="mt-1 text-[11px] text-red-500">{errors.subServices[idx].name}</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-500 block mb-1">
                    Giá phụ thu (VNĐ) {sub.isOptional ? <span className="text-red-500">*</span> : <span className="text-slate-400">(Miễn phí)</span>}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={!sub.isOptional ? "0đ (Đã bao gồm)" : "VD: 20000"}
                    disabled={!sub.isOptional}
                    className={`${inp} text-xs ${!sub.isOptional ? 'bg-slate-100/90 text-slate-400 cursor-not-allowed border-slate-200' : ''}`}
                    value={!sub.isOptional ? '0' : sub.price}
                    onChange={(e) => updateSub(idx, 'price', e.target.value)}
                  />
                  {errors.subServices?.[idx]?.price && (
                    <p className="mt-1 text-[11px] text-red-500">{errors.subServices[idx].price}</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-500 block mb-1">
                    Thời gian (phút) <span className="text-red-500">*</span>
                  </label>
                  <input type="number" min="1" placeholder="5" className={inp + ' text-xs'} value={sub.duration}
                    onChange={(e) => updateSub(idx, 'duration', e.target.value)} />
                  {errors.subServices?.[idx]?.duration && (
                    <p className="mt-1 text-[11px] text-red-500">{errors.subServices[idx].duration}</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {form.subServices.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center">
              <p className="text-xs text-slate-400">Chưa có dịch vụ nhỏ nào trong gói này.</p>
              <button type="button" onClick={addSubService} className="mt-1 text-xs font-semibold text-blue-600 hover:underline">
                + Thêm dịch vụ nhỏ ngay
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
        <button type="button" onClick={onCancel} disabled={saving}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          Hủy
        </button>
        <button type="submit" disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 transition-colors">
          {saving && <ArrowClockwise size={14} className="animate-spin text-white" />}
          {initial?._id || initial?.id ? 'Cập nhật gói' : 'Tạo gói'}
        </button>
      </div>
    </form>
  );
}

export default function ManagerPackages({ user }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPkg, setEditPkg] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [branchId, setBranchId] = useState(user?.branchId || null);
  const [currentSortOrder, setCurrentSortOrder] = useState('price_asc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [confirmToggleId, setConfirmToggleId] = useState(null);
  const [templates, setTemplates] = useState({});
  const debounce = useRef(null);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await api('/packages/templates/sub-services');
        const d = await res.json();
        if (d?.data) setTemplates(d.data);
      } catch (e) { /* silent */ }
    }
    loadTemplates();
  }, []);

  useEffect(() => {
    if (!branchId) return;
    api(`/branches/${branchId}`)
      .then(res => res.json())
      .then(payload => {
        const b = payload?.data ?? payload;
        if (b?.packageSortOrder) {
          setCurrentSortOrder(b.packageSortOrder);
        }
      })
      .catch(() => {});
  }, [branchId]);

  const handleSortOrderChange = async (newSortOrder) => {
    setCurrentSortOrder(newSortOrder);
    try {
      const res = await api(`/branches/${branchId}`, {
        method: 'PUT',
        body: JSON.stringify({ packageSortOrder: newSortOrder }),
      });
      if (!res.ok) throw new Error('Lỗi cập nhật kiểu sắp xếp');

      setPackages((prev) => {
        const list = [...prev];
        if (newSortOrder === 'price_asc') {
          list.sort((a, b) => (a.price || 0) - (b.price || 0));
        } else if (newSortOrder === 'price_desc') {
          list.sort((a, b) => (b.price || 0) - (a.price || 0));
        } else if (newSortOrder === 'booking_count') {
          list.sort((a, b) => (b.bookingCount || 0) - (a.bookingCount || 0));
        }
        return list;
      });

      const label = newSortOrder === 'price_asc' ? 'Giá thấp → cao' : newSortOrder === 'price_desc' ? 'Giá cao → thấp' : 'Lượt đặt nhiều nhất';
      showToast(`Đã đổi kiểu sắp xếp gói: ${label}`);
    } catch (err) {
      showToast(err.message || 'Lỗi cập nhật kiểu sắp xếp', 'error');
    }
  };

  const loadPackages = useCallback(async (bId, q, pg) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ branchId: bId, includeDeleted: 'true' });
      if (q) params.append('search', q);
      params.append('page', pg);
      params.append('limit', PAGE_SIZE);
      const res = await api(`/packages?${params}`);
      const p = await res.json();
      const data = p?.data ?? [];
      setPackages(Array.isArray(data) ? data : []);
      const pag = p?.pagination;
      setTotalPages(pag?.totalPages || 1);
      setTotal(pag?.total || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      let bId = user?.branchId;

      if (!bId) {
        try {
          const res = await api('/branches');
          const p = await res.json();
          const data = p?.data ?? p;
          if (Array.isArray(data) && data.length > 0) {
            bId = data[0]._id;
          }
        } catch { /* silent */ }
      }

      if (cancelled) return;
      setBranchId(bId);
      if (bId) loadPackages(bId, '', 1);
      else setLoading(false);
    }

    init();
    return () => { cancelled = true; };
  }, [user, loadPackages]);

  const handleSearch = (v) => {
    setSearch(v);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setPage(1);
      loadPackages(branchId, v, 1);
    }, 380);
  };

  const handlePage = (pg) => {
    setPage(pg);
    loadPackages(branchId, search, pg);
  };

  function openCreate() {
    setEditPkg(null);
    setShowModal(true);
  }

  function openEdit(pkg) {
    setEditPkg(pkg);
    setShowModal(true);
  }

  async function handleSavePackage(formData) {
    setSaving(true);
    try {
      const body = {
        ...formData,
        branchId,
      };
      const res = editPkg
        ? await api(`/packages/${editPkg._id || editPkg.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : await api('/packages', { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lưu gói dịch vụ');
      setShowModal(false);
      showToast(editPkg ? 'Cập nhật gói thành công!' : 'Tạo gói thành công!');
      loadPackages(branchId, search, page);
    } catch (err) {
      showToast(err.message || 'Lỗi lưu gói dịch vụ', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(pkg) {
    const newStatus = pkg.status === 'active' ? 'inactive' : 'active';
    setConfirmToggleId(null);
    try {
      await api(`/packages/${pkg._id || pkg.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
      showToast(newStatus === 'active' ? 'Đã kích hoạt gói dịch vụ!' : 'Đã tạm dừng gói dịch vụ!');
      loadPackages(branchId, search, page);
    } catch { /* silent */ }
  }

  const [blockedMsg, setBlockedMsg] = useState('');
  const [blockedPkg, setBlockedPkg] = useState(null);

  async function handleDelete(id) {
    try {
      const res = await api(`/packages/${id}`, { method: 'DELETE' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(payload.message || payload.error || 'Không thể xóa gói dịch vụ', 'error');
        setDeleteId(null);
        return;
      }
      setDeleteId(null);
      showToast('Đã xóa mềm gói dịch vụ thành công!');
      loadPackages(branchId, search, page);
    } catch (err) {
      showToast(err.message || 'Không thể xóa gói dịch vụ', 'error');
      setDeleteId(null);
    }
  }

  async function handleDeactivateBlockedPkg() {
    if (!blockedPkg) return;
    const targetId = blockedPkg._id || blockedPkg.id;
    try {
      await api(`/packages/${targetId}`, { method: 'PUT', body: JSON.stringify({ status: 'inactive' }) });
      showToast(`Đã chuyển gói "${blockedPkg.name}" sang "Tạm dừng"!`);
      setBlockedMsg('');
      setBlockedPkg(null);
      loadPackages(branchId, search, page);
    } catch (err) {
      showToast(err.message || 'Cập nhật thất bại', 'error');
    }
  }

  useSSE(getStoredToken(), 'branch_sort_order_updated', useCallback((data) => {
    if (branchId && String(data?.branchId) === String(branchId)) {
      if (data?.packageSortOrder) setCurrentSortOrder(data.packageSortOrder);
      loadPackages(branchId, search, page);
    }
  }, [branchId, search, page, loadPackages]));

  function toggleVehicleType(vt) {
    setForm(prev => ({
      ...prev,
      vehicleTypes: prev.vehicleTypes.includes(vt)
        ? prev.vehicleTypes.filter(x => x !== vt)
        : [...prev.vehicleTypes, vt],
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-xl">
          <div className="relative flex-1">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Tìm gói dịch vụ..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors" />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1); loadPackages(branchId, '', 1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-2xs">
            <span className="text-slate-500 font-medium">Sắp xếp:</span>
            <select
              value={currentSortOrder}
              onChange={(e) => handleSortOrderChange(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="price_asc">Giá từ thấp → cao</option>
              <option value="price_desc">Giá từ cao → thấp</option>
              <option value="booking_count">Theo lượt đặt nhiều nhất</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-400">{total} gói</p>
          <button onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors">
            + Thêm gói
          </button>
        </div>
      </div>

      {!branchId ? (
        <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm">Tài khoản chưa được phân công chi nhánh. Vui lòng liên hệ admin.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm"><ArrowClockwise size={18} className="animate-spin mr-2" />Đang tải...</div>
      ) : packages.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
          <span className="text-4xl">📦</span>
          <p className="text-sm">{search ? 'Không tìm thấy gói dịch vụ nào.' : 'Chi nhánh chưa có gói dịch vụ nào.'}</p>
          {!search && <button onClick={openCreate} className="text-sm text-emerald-600 underline">Tạo gói đầu tiên</button>}
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {packages.map((pkg) => {
            const id = pkg._id || pkg.id;
            const isActive = pkg.status === 'active';
            return (
              <div
                key={id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all duration-200 group"
              >
                <div>
                  {/* Card Header: Category & Actions */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 uppercase tracking-wide border border-blue-100">
                        {pkg.category === 'external' ? 'Ngoại thất' : pkg.category === 'internal' ? 'Nội thất' : 'Tổng thể'}
                      </span>
                      <span className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold border ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {isActive ? '● Hoạt động' : '○ Ngừng'}
                      </span>
                      <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200/80 flex items-center gap-1">
                        {pkg.bookingCount || 0} lượt đặt
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(pkg)}
                        title="Chỉnh sửa"
                        className="flex h-7.5 w-7.5 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        <PencilSimple size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmToggleId(pkg)}
                        title={isActive ? "Tạm dừng gói" : "Kích hoạt gói"}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                          isActive
                            ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {isActive ? 'Tạm dừng' : 'Kích hoạt'}
                      </button>
                      <button
                        onClick={() => setDeleteId(id)}
                        title="Xóa gói"
                        className="flex h-7.5 w-7.5 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Title & Price Header */}
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {pkg.name}
                    </h4>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-extrabold text-emerald-600">
                        {Number(pkg.price).toLocaleString('vi-VN')}₫
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {pkg.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                      {pkg.description}
                    </p>
                  )}

                  {/* Duration & Vehicle Types */}
                  <div className="flex flex-wrap items-center gap-2 py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 mb-3">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                      <ClockCountdown size={14} className="text-amber-500" />
                      {pkg.duration} phút
                    </span>
                    {pkg.vehicleTypes?.length > 0 && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                          <Car size={14} className="text-blue-500" />
                          {pkg.vehicleTypes.map((vt) => VEHICLE_LABELS[vt] || vt).join(', ')}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Sub-services Checklist */}
                  {pkg.subServices && pkg.subServices.length > 0 && (
                    <div className="space-y-2.5 pt-3 border-t border-slate-100">
                      {/* Included subservices */}
                      {pkg.subServices.filter((s) => !s.isOptional).length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <span className="text-emerald-500 font-bold">✓</span> Quy trình ({pkg.subServices.filter((s) => !s.isOptional).length} công đoạn)
                          </p>
                          <div className="grid grid-cols-1 gap-1">
                            {pkg.subServices.filter((s) => !s.isOptional).map((sub, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs text-slate-700 bg-emerald-50/50 px-2.5 py-1 rounded-lg border border-emerald-100/60">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <span className="text-emerald-600 font-bold text-xs">✓</span> {sub.name}
                                </span>
                                {sub.duration > 0 && (
                                  <span className="text-[10px] text-slate-400 font-mono">({sub.duration}p)</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Optional add-ons */}
                      {pkg.subServices.filter((s) => s.isOptional).length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <span className="text-indigo-500 font-bold">+</span> Nâng cấp tùy chọn ({pkg.subServices.filter((s) => s.isOptional).length})
                          </p>
                          <div className="grid grid-cols-1 gap-1">
                            {pkg.subServices.filter((s) => s.isOptional).map((sub, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs text-slate-700 bg-indigo-50/40 px-2.5 py-1 rounded-lg border border-indigo-100/60">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <span className="text-indigo-500 font-bold text-xs">+</span> {sub.name}
                                </span>
                                {sub.price > 0 && (
                                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100/70 px-1.5 py-0.2 rounded">
                                    +{formatCurrency(sub.price)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button disabled={page <= 1} onClick={() => handlePage(page - 1)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              ‹ Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => handlePage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  page === p
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}>{p}</button>
            ))}
            <button disabled={page >= totalPages} onClick={() => handlePage(page + 1)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              Sau ›
            </button>
          </div>
        )}
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <h2 className="font-semibold text-slate-800 text-base">{editPkg ? 'Sửa gói dịch vụ' : 'Thêm gói dịch vụ mới'}</h2>
              <button onClick={() => setShowModal(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[78vh]">
              <PackageForm
                initial={editPkg || { category: 'full', vehicleTypes: [] }}
                onSave={handleSavePackage}
                onCancel={() => setShowModal(false)}
                saving={saving}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center space-y-4">
            <span className="text-4xl">🗑️</span>
            <p className="text-slate-700 font-semibold">Xác nhận xoá mềm gói dịch vụ này?</p>
            <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 leading-relaxed">
              Gói dịch vụ sẽ được chuyển sang trạng thái "Ngừng hoạt động" và ẩn đối với khách hàng. Lịch sử đơn hàng trước đây vẫn được bảo lưu an toàn.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Huỷ
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors">
                Xoá mềm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Confirm */}
      {confirmToggleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center space-y-4">
            <span className="text-4xl">{confirmToggleId.status === 'active' ? '⏸️' : '▶️'}</span>
            <p className="text-slate-700 font-medium">
              {confirmToggleId.status === 'active'
                ? 'Xác nhận tạm dừng gói dịch vụ này?'
                : 'Xác nhận kích hoạt lại gói dịch vụ này?'}
            </p>
            <p className="text-xs text-slate-400">
              {confirmToggleId.status === 'active'
                ? 'Khách hàng sẽ không thể đặt gói này cho đến khi được kích hoạt lại.'
                : 'Gói dịch vụ sẽ hiển thị trở lại cho khách hàng.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmToggleId(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Huỷ
              </button>
              <button onClick={() => handleToggle(confirmToggleId)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors ${
                  confirmToggleId.status === 'active'
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}>
                {confirmToggleId.status === 'active' ? 'Tạm dừng' : 'Kích hoạt'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Blocked Delete Modal */}
      {blockedMsg && (() => {
        const match = blockedMsg.match(/^(.*?)\((.*?)\)\.(.*)$/s);
        const header = match ? match[1].trim() : blockedMsg;
        const itemsRaw = match ? match[2].trim().split(/,\s*/) : [];
        const footer = match ? match[3].trim() : '';

        const items = itemsRaw.map((item) => {
          let icon = '📌';
          if (item.includes('lịch đặt')) icon = '📅';
          else if (item.includes('gói lượt')) icon = '🎫';
          else if (item.includes('voucher') || item.includes('mã ưu đãi')) icon = '🏷️';
          else if (item.includes('khách hàng đặt') || item.includes('sử dụng')) icon = '👥';
          return { icon, text: item };
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
              <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200/70">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 mt-0.5 font-bold shadow-xs">
                  ⚠️
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-amber-900">Bảo vệ liên kết dữ liệu hệ thống</h4>
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">{header}</p>
                </div>
              </div>

              {items.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                    Dữ liệu đang liên kết hoạt động:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.map((it, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 shadow-2xs hover:bg-amber-50 transition-colors"
                      >
                        <span className="text-base shrink-0">{it.icon}</span>
                        <span className="text-xs font-semibold text-slate-800 leading-tight">{it.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {footer && (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-xs text-slate-600 flex items-start gap-2">
                  <span className="text-amber-500 shrink-0 mt-0.5">💡</span>
                  <p className="leading-relaxed">{footer}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setBlockedMsg(''); setBlockedPkg(null); }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Đóng
                </button>
                {blockedPkg && (
                  <button
                    type="button"
                    onClick={handleDeactivateBlockedPkg}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors shadow-xs"
                  >
                    Chuyển sang "Tạm dừng"
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
