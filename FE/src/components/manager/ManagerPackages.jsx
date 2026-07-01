import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { showToast } from '@/lib/toast';
import { MagnifyingGlass, X, ArrowClockwise } from '@phosphor-icons/react';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${getStoredToken()}`, 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
}

function formatCurrency(v) {
  return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`;
}

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
const VEHICLE_TYPES = ['sedan', 'suv', 'pickup', 'van', 'motorcycle'];
const inp = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400';
const PAGE_SIZE = 9;

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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [confirmToggleId, setConfirmToggleId] = useState(null);
  const debounce = useRef(null);

  const loadPackages = useCallback(async (bId, q, pg) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ branchId: bId });
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
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  }

  function openEdit(pkg) {
    setEditPkg(pkg);
    setForm({
      name: pkg.name || '',
      description: pkg.description || '',
      price: String(pkg.price || ''),
      duration: String(pkg.duration || ''),
      category: pkg.category || 'external',
      vehicleTypes: pkg.vehicleTypes || [],
      subServices: (pkg.subServices || []).map(s => ({
        name: s.name || '',
        price: String(s.price || '0'),
        duration: String(s.duration || '0'),
        isOptional: s.isOptional !== false,
      })),
    });
    setError('');
    setShowModal(true);
  }

  function addSubService() {
    setForm(f => ({ ...f, subServices: [...f.subServices, { ...EMPTY_SUB }] }));
  }

  function removeSubService(idx) {
    setForm(f => ({ ...f, subServices: f.subServices.filter((_, i) => i !== idx) }));
  }

  function updateSub(idx, field, value) {
    setForm(f => ({
      ...f,
      subServices: f.subServices.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price || !form.duration) {
      setError('Vui lòng điền tên, giá và thời gian.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        duration: Number(form.duration),
        category: form.category,
        vehicleTypes: form.vehicleTypes,
        subServices: form.subServices
          .filter(s => s.name.trim())
          .map(s => ({
            name: s.name.trim(),
            price: Number(s.price) || 0,
            duration: Number(s.duration) || 0,
            isOptional: s.isOptional,
          })),
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
      setError(err.message);
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

  async function handleDelete(id) {
    try {
      await api(`/packages/${id}`, { method: 'DELETE' });
      setDeleteId(null);
      showToast('Xóa gói dịch vụ thành công!');
      loadPackages(branchId, search, page);
    } catch { /* silent */ }
  }

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
        <div className="relative flex-1 min-w-[200px] max-w-md">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {packages.map(pkg => {
            const id = pkg._id || pkg.id;
            const isActive = pkg.status === 'active';
            const subCount = (pkg.subServices || []).length;
            return (
              <div key={id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{pkg.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2" title={pkg.description || ''}>{pkg.description || '—'}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {isActive ? 'Hoạt động' : 'Tạm dừng'}
                  </span>
                </div>

                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-slate-400 text-xs block">Giá</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(pkg.price)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">Thời gian</span>
                    <span className="font-medium text-slate-700">{pkg.duration} phút</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">Loại</span>
                    <span className="font-medium text-slate-700 capitalize">{pkg.category || '—'}</span>
                  </div>
                </div>

                {subCount > 0 && (
                  <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">DV chọn thêm ({subCount})</p>
                    <div className="space-y-1">
                      {(pkg.subServices || []).map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">{s.name} {s.isOptional ? '' : '(bắt buộc)'}</span>
                          <span className="text-emerald-600 font-medium">{s.price > 0 ? `+${formatCurrency(s.price)}` : 'Miễn phí'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button onClick={() => openEdit(pkg)}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    Sửa
                  </button>
                  <button onClick={() => setConfirmToggleId(pkg)}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'border border-amber-200 text-amber-600 hover:bg-amber-50'
                        : 'border border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                    }`}>
                    {isActive ? 'Tạm dừng' : 'Kích hoạt'}
                  </button>
                  <button onClick={() => setDeleteId(id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors">
                    Xoá
                  </button>
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
                    ? 'bg-blue-600 text-white shadow-sm'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">{editPkg ? 'Sửa gói dịch vụ' : 'Thêm gói dịch vụ'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Tên gói *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className={inp} placeholder="VD: Rửa xe cơ bản" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Mô tả</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2} className={`${inp} resize-none`} placeholder="Mô tả ngắn về gói dịch vụ" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Giá (đ) *</label>
                    <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      className={inp} placeholder="150000" min="0" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Thời gian (phút) *</label>
                    <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                      className={inp} placeholder="30" min="1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Danh mục</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className={inp}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-2">Loại xe áp dụng</label>
                  <div className="flex flex-wrap gap-2">
                    {VEHICLE_TYPES.map(vt => (
                      <button key={vt} type="button" onClick={() => toggleVehicleType(vt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          form.vehicleTypes.includes(vt)
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}>
                        {vt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dịch vụ chọn thêm</label>
                  <button type="button" onClick={addSubService}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                    + Thêm
                  </button>
                </div>

                {form.subServices.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-xs text-slate-400">
                    Chưa có dịch vụ chọn thêm.
                    <button type="button" onClick={addSubService} className="ml-1 text-emerald-500 underline">Thêm ngay</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.subServices.map((sub, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50">
                        <div className="flex items-center gap-2">
                          <input value={sub.name} onChange={e => updateSub(idx, 'name', e.target.value)}
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            placeholder="Tên dịch vụ (VD: Dán phim, Hút bụi)" />
                          <button type="button" onClick={() => removeSubService(idx)}
                            className="text-red-400 hover:text-red-600 text-lg shrink-0 px-1">×</button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Giá thêm (đ)</label>
                            <input type="number" value={sub.price} onChange={e => updateSub(idx, 'price', e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                              placeholder="0" min="0" />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Thêm (phút)</label>
                            <input type="number" value={sub.duration} onChange={e => updateSub(idx, 'duration', e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                              placeholder="0" min="0" />
                          </div>
                          <div className="flex items-end pb-1.5">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox" checked={sub.isOptional}
                                onChange={e => updateSub(idx, 'isOptional', e.target.checked)}
                                className="accent-emerald-600" />
                              <span className="text-xs text-slate-500">Tùy chọn</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Huỷ
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50">
                {saving ? 'Đang lưu...' : editPkg ? 'Cập nhật' : 'Tạo gói'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center space-y-4">
            <span className="text-4xl">🗑️</span>
            <p className="text-slate-700 font-medium">Xác nhận xoá gói dịch vụ này?</p>
            <p className="text-xs text-slate-400">Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Huỷ
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors">
                Xoá
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
    </div>
  );
}
